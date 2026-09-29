/**
 * Servicio de Sincronización Automática Offline-First
 * Gestiona el detector de conectividad, la precarga de datos en IndexedDB,
 * la reserva de paquetes de consecutivos y el vaciado de la cola hacia Supabase.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  guardarArticulosLote,
  guardarClientesLote,
  guardarFacturasLote,
  obtenerColaSincronizacion,
  eliminarItemCola,
  contarItemsPendientesSincronizar,
  guardarReservaConsecutivo,
  obtenerReservaConsecutivo,
  OfflineArticulo,
  OfflineCliente,
  OfflineFactura,
  OfflineCampoFactura,
  OfflineAbono,
  SyncQueueItem,
  actualizarIdFacturaOffline,
} from "./offlineDbService";
import { indexarArticulosEnMemoria, indexarClientesEnMemoria } from "./posService";
import { saveLocalAccesorios } from "./accesoriosService";

export interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: Date;
  error?: string;
}

type SyncListener = (state: SyncState) => void;
const listeners = new Set<SyncListener>();

let currentState: SyncState = {
  isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
};

function notifyListeners() {
  for (const listener of listeners) {
    listener({ ...currentState });
  }
}

export function subscribeSyncState(listener: SyncListener): () => void {
  listeners.add(listener);
  listener({ ...currentState });
  return () => listeners.delete(listener);
}

// =========================================================================
// PRECARGA INTELIGENTE Y ACTUALIZACIÓN EN SEGUNDO PLANO
// =========================================================================

// Función auxiliar para descargar tablas completas con paginación automática (superando límite de 1000 de Supabase)
async function descargarTablaPaginada(
  nombreTabla: string,
  ordenColumna = "ID" + nombreTabla,
  batchSize = 1000,
  maxLimite = 50000
): Promise<any[]> {
  const todos: any[] = [];
  let from = 0;

  while (from < maxLimite) {
    const to = from + batchSize - 1;
    let query = supabase.from(nombreTabla as any).select("*").range(from, to);

    try {
      query = query.order(ordenColumna, { ascending: true });
    } catch {}

    const { data, error } = await query;
    if (error) {
      console.warn(`Aviso descargando ${nombreTabla} (bloque ${from}-${to}):`, error.message);
      break;
    }
    if (!data || data.length === 0) break;

    todos.push(...data);
    if (data.length < batchSize) break;
    from += batchSize;
  }

  return todos;
}

let _precargaEnCurso = false;
let _precargaDiferidaEnCurso = false;
let _timerDiferido: any = null;

/**
 * FASE 1 (ESENCIAL / ULTRA-RÁPIDA):
 * Descarga de inmediato solo los Artículos, Accesorios y bloque de consecutivos.
 * Permite que el POS abra y comience a vender en menos de 1 segundo.
 */
export async function precargarEsencialesOffline(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (_precargaEnCurso) return;
  _precargaEnCurso = true;

  try {
    currentState = { ...currentState, isSyncing: true };
    notifyListeners();

    // 1. Descargar catálogo de Artículos (necesario para pistoleo y búsqueda inmediata)
    const articulos = await descargarTablaPaginada("ARTICULO", "IDARTICULO", 1000, 50000);
    if (articulos && articulos.length > 0) {
      await guardarArticulosLote(articulos as unknown as OfflineArticulo[]);
      try {
        indexarArticulosEnMemoria(articulos as any);
      } catch {}
    }

    // 2. Descargar Accesorios
    const accesorios = await descargarTablaPaginada("ACCESORIOS", "IDACCESORIO", 1000, 10000);
    if (accesorios && accesorios.length > 0) {
      try {
        saveLocalAccesorios(accesorios);
      } catch {}
    }

    // 3. Renovar bloque de consecutivos para contingencias offline
    await renovarBloqueConsecutivosOffline();

    const pendientes = await contarItemsPendientesSincronizar();
    currentState = {
      ...currentState,
      isSyncing: false,
      pendingCount: pendientes,
      lastSyncTime: new Date(),
    };
    notifyListeners();

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pos_datos_sincronizados", {
          detail: {
            articulosCount: articulos.length,
            fase: "esencial",
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.warn("Aviso en precarga esencial:", err);
    currentState = { ...currentState, isSyncing: false };
    notifyListeners();
  } finally {
    _precargaEnCurso = false;
  }
}

/**
 * FASE 2 (DIFERIDA / SEGUNDO PLANO):
 * Descarga pesada de los 11.000 Clientes y Facturas históricas (últimos 60 días).
 * Se ejecuta tras un retardo o cuando el navegador esté en reposo (requestIdleCallback).
 */
export async function precargarClientesYFacturasDiferido(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  if (_precargaDiferidaEnCurso) return;
  _precargaDiferidaEnCurso = true;

  try {
    // 1. Descargar catálogo COMPLETO de Clientes (11.000+ registros)
    const clientes = await descargarTablaPaginada("CLIENTES", "IDCLIENTES", 1000, 50000);
    if (clientes && clientes.length > 0) {
      await guardarClientesLote(clientes as unknown as OfflineCliente[]);
      try {
        indexarClientesEnMemoria(clientes as any);
      } catch {}
    }

    // 2. Descargar Facturas de los últimos 60 días
    const hace60Dias = new Date();
    hace60Dias.setDate(hace60Dias.getDate() - 60);
    const fechaStr = hace60Dias.toISOString().split("T")[0];

    const facturas: any[] = [];
    let fromFact = 0;
    while (fromFact < 50000) {
      const { data: batchFact, error: errBatch } = await supabase
        .from("FACTURA" as any)
        .select("*")
        .gte("FECHASALIDA", fechaStr)
        .order("IDFACTURA", { ascending: false })
        .range(fromFact, fromFact + 999);

      if (errBatch) break;
      if (!batchFact || batchFact.length === 0) break;
      facturas.push(...batchFact);
      if (batchFact.length < 1000) break;
      fromFact += 1000;
    }

    if (facturas.length > 0) {
      const numFacts = facturas.map((f) => f.NUMEROFACT).filter(Boolean);

      // Agrupación optimizada: chunks de 200 en lugar de 80 para reducir peticiones HTTP masivas
      const CHUNK_SIZE = 200;
      const camposFactura: OfflineCampoFactura[] = [];
      for (let i = 0; i < numFacts.length; i += CHUNK_SIZE) {
        const chunk = numFacts.slice(i, i + CHUNK_SIZE);
        try {
          const { data: campos } = await supabase
            .from("CAMPOFACTURA" as any)
            .select("*")
            .in("NUMEROFACT", chunk);
          if (campos) camposFactura.push(...(campos as unknown as OfflineCampoFactura[]));
        } catch {}
        // Pequeño descanso para no saturar el canal de red
        await new Promise((r) => setTimeout(r, 40));
      }

      // Descargar abonos relacionados agrupados en chunks de 200
      const abonosFactura: OfflineAbono[] = [];
      for (let i = 0; i < numFacts.length; i += CHUNK_SIZE) {
        const chunk = numFacts.slice(i, i + CHUNK_SIZE);
        try {
          const { data: abonos } = await supabase
            .from("ABONO_CLIENTE" as any)
            .select("*")
            .in("AFACTURA", chunk);
          if (abonos) abonosFactura.push(...(abonos as unknown as OfflineAbono[]));
        } catch {}
        await new Promise((r) => setTimeout(r, 40));
      }

      await guardarFacturasLote(
        facturas as unknown as OfflineFactura[],
        camposFactura,
        abonosFactura
      );
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pos_datos_sincronizados", {
          detail: {
            clientesCount: clientes.length,
            facturasCount: facturas.length,
            fase: "diferida",
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.warn("Aviso en precarga diferida:", err);
  } finally {
    _precargaDiferidaEnCurso = false;
  }
}

/**
 * Agenda la precarga diferida para no interferir con la apertura inicial del POS.
 */
export function agendarPrecargaDiferida(retrasoMs = 4000): void {
  if (typeof window === "undefined") return;
  if (_timerDiferido) clearTimeout(_timerDiferido);
  _timerDiferido = setTimeout(() => {
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(() => {
        precargarClientesYFacturasDiferido().catch(() => {});
      }, { timeout: 8000 });
    } else {
      precargarClientesYFacturasDiferido().catch(() => {});
    }
  }, retrasoMs);
}

/**
 * Descarga y refresca datos offline. Por defecto carga los esenciales de inmediato
 * y difiere la carga pesada para no congelar la pantalla.
 */
export async function precargarDatosOffline(forzarCompleto = false): Promise<void> {
  await precargarEsencialesOffline();
  if (forzarCompleto) {
    await precargarClientesYFacturasDiferido();
  } else {
    agendarPrecargaDiferida(4000);
  }
}

// =========================================================================
// GESTIÓN DE BLOQUES DE CONSECUTIVOS PARA OFFLINE
// =========================================================================

/**
 * Reserva un bloque de números en Supabase de forma que el terminal tenga un
 * rango seguro (ej. 30 números) garantizado en caso de corte de red.
 */
export async function renovarBloqueConsecutivosOffline(tamanoBloque = 30): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    const reservaActual = await obtenerReservaConsecutivo();
    // Si aún tiene más de 10 números disponibles, no es necesario renovar
    if (reservaActual && (reservaActual.rangoFin - reservaActual.siguienteNumero) > 10) {
      return;
    }

    // Consultar el último número de factura en Supabase
    const { data: ultimaFactura } = await supabase
      .from("FACTURA" as any)
      .select("NUMEROFACT, IDFACTURA")
      .order("IDFACTURA", { ascending: false })
      .limit(1)
      .maybeSingle();

    let baseNum = 14000;
    let prefijo = "G";

    if (ultimaFactura && (ultimaFactura as any).NUMEROFACT) {
      const match = String((ultimaFactura as any).NUMEROFACT).match(/^([A-Za-z]*)(\d+)$/);
      if (match) {
        prefijo = match[1] || "G";
        baseNum = parseInt(match[2], 10) || 14000;
      }
    }

    // Si ya había una reserva previa en curso con número más alto, tomar esa como base
    if (reservaActual && reservaActual.rangoFin >= baseNum) {
      baseNum = reservaActual.rangoFin;
    }

    const rangoInicio = baseNum + 1;
    const rangoFin = baseNum + tamanoBloque;

    await guardarReservaConsecutivo({
      cajaId: "TERMINAL_LOCAL",
      prefijo,
      rangoInicio,
      rangoFin,
      siguienteNumero: rangoInicio,
      fechaReserva: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("No se pudo renovar bloque de consecutivos:", err);
  }
}

import { obtenerTerminalConfig } from "./empresaCajaService";

// =========================================================================
// SEMÁFORO DISTRIBUIDO (MUTEX LOCK POR TERMINAL)
// =========================================================================

const SEMAFORO_LOCK_KEY = "elegance_sync_lock_token";
const LOCK_EXPIRACION_MS = 20000; // 20 segundos máximo antes de expirar el lock
const LOCK_SUPABASE_KEY = "SYNC_LOCK_GLOBAL"; // ID del lock en la tabla CAJAS

interface SemaforoLockData {
  cajaId: string | number;
  nombreCaja: string;
  timestamp: number;
}

/**
 * BUG-01 fix: Lock de doble capa para coordinación multi-PC real.
 * Capa 1: Supabase (visible entre PCs — usa upsert en tabla CAJAS como almacén de estado)
 * Capa 2: localStorage (fallback solo dentro del mismo navegador)
 */
async function adquirirLockSupabase(
  cajaId: string | number,
  nombreCaja: string
): Promise<boolean> {
  try {
    const ahora = new Date();
    const expiresMs = LOCK_EXPIRACION_MS;

    // Verificar si hay un lock activo de otra PC
    const { data: lockRow } = await supabase
      .from("CAJAS" as any)
      .select("SYNC_LOCK_AT, SYNC_LOCK_BY")
      .eq("NOMBRECAJA", LOCK_SUPABASE_KEY)
      .maybeSingle();

    if (lockRow) {
      const lockedAt = new Date((lockRow as any).SYNC_LOCK_AT || 0);
      const age = ahora.getTime() - lockedAt.getTime();
      const lockedBy = String((lockRow as any).SYNC_LOCK_BY || "");
      const esMio = lockedBy === String(cajaId);

      if (!esMio && age < expiresMs) {
        // Otro terminal tiene el lock y no ha expirado
        return false;
      }
    }

    // Intentar tomar el lock mediante upsert
    const { error } = await supabase
      .from("CAJAS" as any)
      .upsert(
        {
          NOMBRECAJA: LOCK_SUPABASE_KEY,
          NUMERACION: 0,
          PREFIJO: "LOCK",
          SYNC_LOCK_AT: ahora.toISOString(),
          SYNC_LOCK_BY: String(cajaId),
        },
        { onConflict: "NOMBRECAJA" }
      );

    return !error;
  } catch {
    // Si Supabase no está disponible (offline), confiar en el lock local
    return true;
  }
}

async function liberarLockSupabase(cajaId: string | number): Promise<void> {
  try {
    // Expirar el lock inmediatamente poniendo fecha antigua
    await supabase
      .from("CAJAS" as any)
      .update({ SYNC_LOCK_AT: new Date(0).toISOString() })
      .eq("NOMBRECAJA", LOCK_SUPABASE_KEY)
      .eq("SYNC_LOCK_BY", String(cajaId));
  } catch {}
}

/**
 * Intenta adquirir el semáforo para sincronizar.
 * BUG-01 fix: ahora usa doble capa (Supabase + localStorage).
 * Si otra PC está sincronizando actualmente, espera su turno (Luz Roja).
 */
async function adquirirSemaforo(cajaId: string | number, nombreCaja: string): Promise<boolean> {
  const maxIntentos = 4;

  for (let intento = 0; intento < maxIntentos; intento++) {
    try {
      const ahora = Date.now();

      // --- CAPA 1: Lock en Supabase (multi-PC) ---
      const lockSupabaseLibre = await adquirirLockSupabase(cajaId, nombreCaja);
      if (!lockSupabaseLibre) {
        const tiempoEspera = 1200 + Math.floor(Math.random() * 800);
        await new Promise((r) => setTimeout(r, tiempoEspera));
        continue;
      }

      // --- CAPA 2: Lock en localStorage (misma pestaña / mismo navegador) ---
      const rawLock = localStorage.getItem(SEMAFORO_LOCK_KEY);
      if (rawLock) {
        const lockData: SemaforoLockData = JSON.parse(rawLock);
        if (ahora - lockData.timestamp < LOCK_EXPIRACION_MS && lockData.cajaId !== cajaId) {
          const tiempoEspera = 1200 + Math.floor(Math.random() * 800);
          await new Promise((r) => setTimeout(r, tiempoEspera));
          continue;
        }
      }

      // Luz Verde: tomar ambos locks
      const nuevoLock: SemaforoLockData = { cajaId, nombreCaja, timestamp: ahora };
      localStorage.setItem(SEMAFORO_LOCK_KEY, JSON.stringify(nuevoLock));
      return true;
    } catch {
      return true; // Si hay error, permitir proceder para no bloquear la cola
    }
  }

  return true; // Tras los intentos, permitir proceder para no bloquear indefinidamente
}

/**
 * Libera ambos locks (Supabase + localStorage) para que la siguiente PC/caja pueda sincronizar.
 */
async function liberarSemaforo(cajaId: string | number) {
  // Liberar lock en Supabase
  await liberarLockSupabase(cajaId);

  // Liberar lock local
  try {
    const rawLock = localStorage.getItem(SEMAFORO_LOCK_KEY);
    if (rawLock) {
      const lockData: SemaforoLockData = JSON.parse(rawLock);
      if (lockData.cajaId === cajaId) {
        localStorage.removeItem(SEMAFORO_LOCK_KEY);
      }
    }
  } catch {}
}

// =========================================================================
// PROCESAMIENTO DE LA COLA DE SINCRONIZACIÓN (SUBIDA A SUPABASE CON SEMÁFORO)
// =========================================================================

// Sets de validación de esquemas exactos para evitar errores PGRST204 y 22001 de Supabase
const COLUMNAS_FACTURA = new Set([
  "NUMEROFACT",
  "FECHASALIDA",
  "FECHAENTRADA",
  "FTOTALDEPOSITO",
  "FTOTALVENTADEPOSITO",
  "FORMAPAGO",
  "MODO",
  "VENDEDOR",
  "CCLIENTE",
  "CAMBIOS",
  "PAGACON",
  "AUTOMATIC",
  "IDFCLIENTES",
  "ESTADOCLIENTE",
  "IDF_PAGO",
  "CDIRECCION",
  "CTELEFONO",
  "CTELEFONO1",
  "CEMPRESA",
  "CCEDULA",
  "GASTOS",
  "PAGOCONEFECTIVO",
  "PAGOCONTRANFERENCIA",
  "FTOTALALQUILER",
  "FPAGOTRANS",
  "DESCUENTO",
  "P_SALDO_EFECTIVO",
  "P_SALDO_TRANFERENCIA",
  "TOTAL_SALDO",
  "FECHA_RECIBO",
  "SALDOA_BONADO",
  "FECHAINGRESO",
]);

const VARCHAR_50_FACTURA = new Set([
  "NUMEROFACT",
  "FORMAPAGO",
  "MODO",
  "VENDEDOR",
  "CCLIENTE",
  "ESTADOCLIENTE",
  "CDIRECCION",
  "CTELEFONO",
  "CTELEFONO1",
  "CEMPRESA",
  "CCEDULA",
  "GASTOS",
  "FPAGOTRANS",
]);

const NUMERIC_FACTURA = new Set([
  "FTOTALDEPOSITO",
  "FTOTALVENTADEPOSITO",
  "CAMBIOS",
  "PAGACON",
  "PAGOCONEFECTIVO",
  "PAGOCONTRANFERENCIA",
  "FTOTALALQUILER",
  "DESCUENTO",
  "P_SALDO_EFECTIVO",
  "P_SALDO_TRANFERENCIA",
  "TOTAL_SALDO",
  "SALDOA_BONADO",
]);

const BIGINT_FACTURA = new Set([
  "AUTOMATIC",
  "IDFCLIENTES",
  "IDF_PAGO",
]);

function sanitizarFacturaParaSupabase(factura: any): Record<string, any> {
  if (!factura || typeof factura !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(factura)) {
    if (!COLUMNAS_FACTURA.has(key) || val === undefined) continue;

    if (VARCHAR_50_FACTURA.has(key)) {
      clean[key] = val !== null ? String(val).trim().slice(0, 50) : null;
    } else if (NUMERIC_FACTURA.has(key)) {
      clean[key] = val !== null ? Number(val) || 0 : 0;
    } else if (BIGINT_FACTURA.has(key)) {
      clean[key] = val !== null ? Math.floor(Number(val) || 0) : 0;
    } else if (key.startsWith("FECHA")) {
      clean[key] = val ? String(val).split("T")[0] : null;
    } else {
      clean[key] = val;
    }
  }
  if (!clean["NUMEROFACT"] && factura.NUMEROFACT) {
    clean["NUMEROFACT"] = String(factura.NUMEROFACT).trim().slice(0, 50);
  }
  return clean;
}

const COLUMNAS_CAMPOFACTURA = new Set([
  "DESCRIPCION",
  "CANTIDAD",
  "VALOR",
  "TOTAL",
  "BARRAS",
  "NUMEROFACT",
  "IDFACTURA",
  "VALORDEPOSITO",
  "TOTALALQUILER",
  "TOTALDEPOSITO",
  "ES_ACCESORIO",
  "ID_TRAJE_PADRE",
  "PIEZAS_INCLUIDAS",
]);

const VARCHAR_50_CAMPOFACTURA = new Set(["BARRAS", "NUMEROFACT", "ID_TRAJE_PADRE"]);

function sanitizarItemCampoFactura(item: any): Record<string, any> {
  if (!item || typeof item !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(item)) {
    if (!COLUMNAS_CAMPOFACTURA.has(key) || val === undefined) continue;

    if (key === "DESCRIPCION") {
      clean[key] = val !== null ? String(val).trim().slice(0, 300) : "";
    } else if (key === "PIEZAS_INCLUIDAS") {
      clean[key] = val !== null ? String(val).trim().slice(0, 500) : "";
    } else if (VARCHAR_50_CAMPOFACTURA.has(key)) {
      clean[key] = val !== null ? String(val).trim().slice(0, 50) : "";
    } else if (["CANTIDAD", "VALOR", "TOTAL", "VALORDEPOSITO", "TOTALALQUILER", "TOTALDEPOSITO"].includes(key)) {
      clean[key] = Number(val) || 0;
    } else if (key === "IDFACTURA") {
      clean[key] = Math.floor(Number(val) || 0);
    } else if (key === "ES_ACCESORIO") {
      clean[key] = Boolean(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

const COLUMNAS_CLIENTES = new Set([
  "CEDULA",
  "DIRECCION",
  "TELEFONO",
  "TELEFONO2",
  "EMPRESA",
  "DIRECCIONEMP",
  "NOMBRE",
  "SALDO",
  "NOTA",
]);

function sanitizarClienteParaSupabase(cliente: any): Record<string, any> {
  if (!cliente || typeof cliente !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(cliente)) {
    if (!COLUMNAS_CLIENTES.has(key) || val === undefined) continue;

    if (key === "CEDULA") {
      clean[key] = Number(val) || 0;
    } else if (key === "SALDO") {
      clean[key] = Number(val) || 0;
    } else if (key === "NOTA") {
      clean[key] = val !== null ? String(val).trim().slice(0, 2000) : "";
    } else if (["DIRECCION", "DIRECCIONEMP", "NOMBRE"].includes(key)) {
      clean[key] = val !== null ? String(val).trim().slice(0, 200) : "";
    } else if (["TELEFONO", "TELEFONO2", "EMPRESA"].includes(key)) {
      clean[key] = val !== null ? String(val).trim().slice(0, 50) : "";
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

/**
 * Procesa todas las operaciones que se hayan acumulado sin internet
 * y las inserta en Supabase en orden cronológico estricto respetando el semáforo.
 */
export async function procesarColaSincronizacion(forzarSinEspera = false): Promise<{ exitosas: number; fallidas: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { exitosas: 0, fallidas: 0 };
  }

  if (currentState.isSyncing) return { exitosas: 0, fallidas: 0 };

  const terminal = obtenerTerminalConfig();
  const cajaId = terminal.idCajaAsignada || 1;
  const nombreCaja = terminal.nombreCaja || `CAJA ${cajaId}`;

  // 1. Si no es forzado manualmente, aplicar retardo escalonado (Jitter) según el número de caja
  if (!forzarSinEspera) {
    const retardoEscalonado = Math.max(0, (Number(cajaId) - 1) * 1600) + Math.floor(Math.random() * 400);
    if (retardoEscalonado > 0) {
      await new Promise((r) => setTimeout(r, retardoEscalonado));
    }
  }

  // 2. Adquirir semáforo
  await adquirirSemaforo(cajaId, nombreCaja);

  currentState.isSyncing = true;
  notifyListeners();

  let exitosas = 0;
  let fallidas = 0;

  try {
    const cola = await obtenerColaSincronizacion();

    for (const item of cola) {
      try {
        if (item.tipo === "NUEVA_FACTURA") {
          const { factura, items } = item.datos;
          const cleanFactura = sanitizarFacturaParaSupabase(factura);

          // Remover identificadores de cliente temporales
          delete cleanFactura["AUTOMATIC"];
          delete cleanFactura["IDCAMPOSFACTURA"];

          const numFact = cleanFactura["NUMEROFACT"] || (factura as any)?.NUMEROFACT;
          const { data: factExistente } = await supabase
            .from("FACTURA" as any)
            .select("IDFACTURA")
            .eq("NUMEROFACT", numFact)
            .maybeSingle();

          let realIdFactura: number | null = null;

          if (factExistente && (factExistente as any).IDFACTURA) {
            realIdFactura = Number((factExistente as any).IDFACTURA);
            const { error: errFact } = await supabase
              .from("FACTURA" as any)
              .update(cleanFactura)
              .eq("IDFACTURA", realIdFactura);
            if (errFact) throw errFact;
          } else {
            delete cleanFactura["IDFACTURA"];
            const { data: factCreada, error: errFact } = await supabase
              .from("FACTURA" as any)
              .insert(cleanFactura)
              .select("IDFACTURA")
              .maybeSingle();

            if (errFact && errFact.code !== "23505") throw errFact;
            if (factCreada && (factCreada as any).IDFACTURA) {
              realIdFactura = Number((factCreada as any).IDFACTURA);
            }
          }

          // 2. Insertar Campos Factura (prendas)
          if (items && items.length > 0) {
            const cleanItems = items.map((it: any) => {
              const sanitized = sanitizarItemCampoFactura(it);
              delete sanitized["AUTOMATIC"];
              delete sanitized["IDCAMPOSFACTURA"];
              sanitized["NUMEROFACT"] = numFact;
              if (realIdFactura) {
                sanitized["IDFACTURA"] = realIdFactura;
              }
              return sanitized;
            });

            // Limpiar duplicados previos del mismo número antes de reinsertar
            await supabase
              .from("CAMPOFACTURA" as any)
              .delete()
              .eq("NUMEROFACT", numFact);

            const { error: errItems } = await supabase
              .from("CAMPOFACTURA" as any)
              .insert(cleanItems);
            if (errItems) console.warn("Aviso items sincronizados:", errItems.message);
          }

          // BUG-05 fix: actualizar el IDFACTURA temporal en IndexedDB con el ID real de Supabase
          if (realIdFactura && numFact) {
            actualizarIdFacturaOffline(numFact, realIdFactura).catch(() => {});
          }

          // 3. Descontar stock de artículos en Supabase
          // BUG-03 fix: solo descontar si el stock NO fue descontado al momento de la venta
          if (!item.datos?.stockYaDescontado) {
            for (const it of items || []) {
              if (it.BARRAS) {
                const { data: artExistente } = await supabase
                  .from("ARTICULO" as any)
                  .select("IDARTICULO, STOCK")
                  .eq("CODBARRAS", it.BARRAS)
                  .maybeSingle();

                if (artExistente) {
                  const stockActual = Number((artExistente as any).STOCK) || 0;
                  const cant = Number(it.CANTIDAD) || 1;
                  const nuevoStock = Math.max(0, stockActual - cant);
                  await supabase
                    .from("ARTICULO" as any)
                    .update({
                      STOCK: nuevoStock,
                      DISPONIBLE: nuevoStock > 0,
                    })
                    .eq("IDARTICULO", (artExistente as any).IDARTICULO);
                }
              }
            }
          }
        } else if (item.tipo === "NUEVO_ABONO") {
          const { abono, facturaNumero, nuevoSaldo } = item.datos;

          const { error: errAbono } = await supabase
            .from("ABONO_CLIENTE" as any)
            .insert(abono);

          if (errAbono) throw errAbono;

          // Actualizar saldo de la factura si aplica
          if (facturaNumero && nuevoSaldo !== undefined) {
            await supabase
              .from("FACTURA" as any)
              .update({
                TOTAL_SALDO: Number(nuevoSaldo) || 0,
                ESTADOCLIENTE: nuevoSaldo <= 0 ? "PAGADO" : "CON SALDO",
              })
              .eq("NUMEROFACT", facturaNumero);
          }
        } else if (item.tipo === "DEVOLUCION_TRAJE") {
          const { numeroFact, itemsDevueltos, barrasArticulos, montoNetoDevuelto, fecha } = item.datos;

          // 1. Insertar egreso de reintegro en depositoentregado si hubo valor
          if (montoNetoDevuelto && Number(montoNetoDevuelto) > 0) {
            try {
              await supabase.from("depositoentregado" as any).insert({
                NUMEROFACTURA: numeroFact,
                VALOR: Number(montoNetoDevuelto),
                FECHA: fecha || new Date().toISOString().split("T")[0],
              });

              // BUG-10 fix: marcar el depósito local como sincronizado para evitar doble-conteo
              try {
                const KEY_LOCAL_DEP = "elegance_local_depositos_entregados";
                const rawDeps = localStorage.getItem(KEY_LOCAL_DEP);
                if (rawDeps) {
                  const deps: any[] = JSON.parse(rawDeps);
                  let changed = false;
                  for (const d of deps) {
                    if (
                      d._pendienteSync &&
                      (d.NUMEROFACTURA || "").trim().toUpperCase() === String(numeroFact).trim().toUpperCase() &&
                      Number(d.VALOR) === Number(montoNetoDevuelto)
                    ) {
                      d._pendienteSync = false;
                      changed = true;
                      break; // Solo marcar el primero pendiente que coincida
                    }
                  }
                  if (changed) localStorage.setItem(KEY_LOCAL_DEP, JSON.stringify(deps));
                }
              } catch {}
            } catch (e) {
              console.warn("Aviso insertando depositoentregado sincronizado:", e);
            }
          }

          // 2. Marcar factura como ENTREGADO
          await supabase
            .from("FACTURA" as any)
            .update({ ESTADOCLIENTE: "ENTREGADO" })
            .eq("NUMEROFACT", numeroFact);

          // 3. Devolver prendas / reponer stock
          if (itemsDevueltos && Array.isArray(itemsDevueltos)) {
            for (const it of itemsDevueltos) {
              try {
                let query = supabase.from("ARTICULO" as any).select("IDARTICULO, STOCK");
                if (it.codigoBarras) {
                  query = query.eq("CODBARRAS", it.codigoBarras);
                } else if (it.descripcion) {
                  query = query.eq("DESCRIPCION", it.descripcion);
                }
                const { data: artRaw } = await query.maybeSingle();
                const art = artRaw as any;
                if (art) {
                  const nuevoStock = (Number(art.STOCK) || 0) + (Number(it.cantidad) || 1);
                  await supabase
                    .from("ARTICULO" as any)
                    .update({
                      STOCK: nuevoStock,
                      DISPONIBLE: nuevoStock > 0,
                    })
                    .eq("IDARTICULO", art.IDARTICULO);
                }
              } catch {}
            }
          } else if (barrasArticulos && Array.isArray(barrasArticulos)) {
            for (const barrasItem of barrasArticulos) {
              // barrasItem puede ser string (solo código) o un objeto {barras, cantidad}
              const cod = typeof barrasItem === "string" ? barrasItem : barrasItem.barras;
              // BUG-04 fix: usar la cantidad real del item, no siempre +1
              const cant = typeof barrasItem === "object" && barrasItem.cantidad
                ? Number(barrasItem.cantidad) || 1
                : 1;

              const { data: artRaw } = await supabase
                .from("ARTICULO" as any)
                .select("IDARTICULO, STOCK")
                .eq("CODBARRAS", cod)
                .maybeSingle();
              const art = artRaw as any;
              if (art) {
                const nuevoStock = (Number(art.STOCK) || 0) + cant;
                await supabase
                  .from("ARTICULO" as any)
                  .update({
                    STOCK: nuevoStock,
                    DISPONIBLE: nuevoStock > 0,
                  })
                  .eq("IDARTICULO", art.IDARTICULO);
              }
            }
          }
        } else if (item.tipo === "NUEVO_CLIENTE") {
          const { cliente } = item.datos;
          const cleanCli = sanitizarClienteParaSupabase(cliente);
          const ced = Number(cleanCli["CEDULA"]) || 0;
          if (ced > 0) {
            const { data: existenteCli } = await supabase
              .from("CLIENTES" as any)
              .select("IDCLIENTES")
              .eq("CEDULA", ced)
              .maybeSingle();

            if (existenteCli && (existenteCli as any).IDCLIENTES) {
              await supabase
                .from("CLIENTES" as any)
                .update(cleanCli)
                .eq("IDCLIENTES", (existenteCli as any).IDCLIENTES);
            } else {
              await supabase
                .from("CLIENTES" as any)
                .insert(cleanCli);
            }
          }
        }

        // Si se sincronizó correctamente, eliminar de la cola
        await eliminarItemCola(item.id);
        exitosas++;
      } catch (err: any) {
        console.error(`Error sincronizando elemento ${item.id}:`, err);
        fallidas++;
        item.intentos = (item.intentos || 0) + 1;
        item.ultimoError = err?.message || String(err);
      }
    }
  } finally {
    // 3. Siempre liberar el semáforo al terminar (libera tanto Supabase como localStorage)
    await liberarSemaforo(cajaId);
  }

  const pendientesRestantes = await contarItemsPendientesSincronizar();
  currentState = {
    ...currentState,
    isSyncing: false,
    pendingCount: pendientesRestantes,
    lastSyncTime: new Date(),
  };
  notifyListeners();

  return { exitosas, fallidas };
}

// =========================================================================
// VERIFICACIÓN ACTIVA DE CONECTIVIDAD EN TIEMPO REAL (HEARTBEAT PROBE)
// =========================================================================

let detectorIniciado = false;

/**
 * Comprueba de forma activa si existe salida real a Internet y al servidor Supabase.
 * Detecta caídas de red incluso si el adaptador WiFi/Ethernet sigue conectado.
 */
export async function probarConectividadReal(): Promise<boolean> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  try {
    const { error } = await supabase
      .from("CAJAS" as any)
      .select("IDCAJAS", { count: "exact", head: true })
      .limit(1);
    return !error;
  } catch {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  }
}

// =========================================================================
// INICIALIZADOR DE EVENTOS GLOBALES (ONLINE / OFFLINE)
// =========================================================================

// BUG-16 fix: guardar el ID del intervalo para poder limpiarlo
let _detectorIntervalId: ReturnType<typeof setInterval> | null = null;

export function inicializarDetectorOffline(): void {
  if (typeof window === "undefined" || detectorIniciado) return;
  detectorIniciado = true;

  const verificarEstadoInmediato = async () => {
    const hayInternet = await probarConectividadReal();
    const cambioAOnline = hayInternet && !currentState.isOnline;
    currentState.isOnline = hayInternet;

    const pendientes = await contarItemsPendientesSincronizar();
    currentState.pendingCount = pendientes;
    notifyListeners();

    if (hayInternet && (cambioAOnline || pendientes > 0)) {
      if (!currentState.isSyncing) {
        procesarColaSincronizacion(true).then((res) => {
          if (res.exitosas > 0) {
            precargarDatosOffline();
          }
        });
      }
    }
  };

  const handleOnline = async () => {
    currentState.isOnline = true;
    notifyListeners();
    // BUG-18 fix: no lanzar dos sincronizaciones en paralelo
    // verificarEstadoInmediato ya puede disparar procesarColaSincronizacion internamente
    await verificarEstadoInmediato();
  };

  const handleOffline = async () => {
    currentState.isOnline = false;
    currentState.pendingCount = await contarItemsPendientesSincronizar();
    notifyListeners();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // BUG-16 fix: guardar ID del intervalo para cleanup posterior
  _detectorIntervalId = setInterval(verificarEstadoInmediato, 10000);

  // Precarga y sincronización inteligente:
  // 1. Inmediato (300ms): procesar cola y cargar esenciales (artículos, accesorios, consecutivos)
  // 2. Diferido (4000ms): en segundo plano los 11.000 clientes y facturas históricas
  setTimeout(async () => {
    await verificarEstadoInmediato();
    if (currentState.isOnline) {
      procesarColaSincronizacion(true).then(() => {
        precargarEsencialesOffline().then(() => {
          agendarPrecargaDiferida(4000);
        });
      });
    }
  }, 300);
}

/**
 * BUG-16 fix: Limpia el intervalo y los event listeners del detector offline.
 * útil en entornos con HMR (Vite dev) donde el módulo puede recargarse.
 */
export function destruirDetectorOffline(): void {
  if (_detectorIntervalId !== null) {
    clearInterval(_detectorIntervalId);
    _detectorIntervalId = null;
  }
  detectorIniciado = false;
}

// Auto-inicialización global inmediata al importar el módulo
if (typeof window !== "undefined") {
  // BUG-16 fix: en entornos HMR (Vite), limpiar la instancia previa antes de crear una nueva
  if ((window as any).__eleganceDetectorDestruir) {
    (window as any).__eleganceDetectorDestruir();
  }
  inicializarDetectorOffline();
  (window as any).__eleganceDetectorDestruir = destruirDetectorOffline;
}
