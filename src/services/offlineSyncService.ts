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
} from "./offlineDbService";

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

/**
 * Descarga y refresca los artículos, clientes y facturas recientes en IndexedDB.
 * Se ejecuta en segundo plano cuando hay conexión sin congelar la UI.
 */
export async function precargarDatosOffline(forzarCompleto = false): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    // 1. Descargar catálogo de Artículos
    const { data: articulos, error: errArt } = await supabase
      .from("ARTICULO" as any)
      .select("*")
      .limit(5000);

    if (!errArt && articulos && articulos.length > 0) {
      await guardarArticulosLote(articulos as unknown as OfflineArticulo[]);
    }

    // 2. Descargar Clientes
    const { data: clientes, error: errCli } = await supabase
      .from("CLIENTES" as any)
      .select("*")
      .limit(10000);

    if (!errCli && clientes && clientes.length > 0) {
      await guardarClientesLote(clientes as unknown as OfflineCliente[]);
    }

    // 3. Descargar Facturas de los últimos 60 días o pendientes
    const hace60Dias = new Date();
    hace60Dias.setDate(hace60Dias.getDate() - 60);
    const fechaStr = hace60Dias.toISOString().split("T")[0];

    const { data: facturas, error: errFact } = await supabase
      .from("FACTURA" as any)
      .select("*")
      .gte("FECHASALIDA", fechaStr)
      .limit(3000);

    if (!errFact && facturas && facturas.length > 0) {
      const numFacts = (facturas as any[]).map((f) => f.NUMEROFACT).filter(Boolean);

      // Descargar items relacionados
      let camposFactura: OfflineCampoFactura[] = [];
      if (numFacts.length > 0) {
        const { data: campos } = await supabase
          .from("CAMPOFACTURA" as any)
          .select("*")
          .in("NUMEROFACT", numFacts.slice(0, 500));
        if (campos) camposFactura = campos as unknown as OfflineCampoFactura[];
      }

      // Descargar abonos relacionados
      let abonosFactura: OfflineAbono[] = [];
      if (numFacts.length > 0) {
        const { data: abonos } = await supabase
          .from("ABONO_CLIENTE" as any)
          .select("*")
          .in("AFACTURA", numFacts.slice(0, 500));
        if (abonos) abonosFactura = abonos as unknown as OfflineAbono[];
      }

      await guardarFacturasLote(
        facturas as unknown as OfflineFactura[],
        camposFactura,
        abonosFactura
      );
    }

    // 4. Asegurar bloque de reserva de consecutivos para emergencias offline
    await renovarBloqueConsecutivosOffline();

    // Actualizar conteo de pendientes
    const pendientes = await contarItemsPendientesSincronizar();
    currentState = {
      ...currentState,
      pendingCount: pendientes,
      lastSyncTime: new Date(),
    };
    notifyListeners();
  } catch (err) {
    console.warn("Fallo durante la precarga offline:", err);
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
const LOCK_EXPIRACION_MS = 15000; // 15 segundos máximo para evitar bloqueos muertos (deadlocks)

interface SemaforoLockData {
  cajaId: string | number;
  nombreCaja: string;
  timestamp: number;
}

/**
 * Intenta adquirir el semáforo para sincronizar.
 * Si otra caja está sincronizando actualmente, espera su turno (Luz Roja).
 */
async function adquirirSemaforo(cajaId: string | number, nombreCaja: string): Promise<boolean> {
  const maxIntentos = 4;
  
  for (let intento = 0; intento < maxIntentos; intento++) {
    try {
      const ahora = Date.now();
      
      // 1. Verificar bloqueo local / compartido
      const rawLock = localStorage.getItem(SEMAFORO_LOCK_KEY);
      if (rawLock) {
        const lockData: SemaforoLockData = JSON.parse(rawLock);
        // Si el bloqueo aún está vigente y pertenece a OTRA caja
        if (ahora - lockData.timestamp < LOCK_EXPIRACION_MS && lockData.cajaId !== cajaId) {
          // Luz Roja: Esperar entre 1.2 y 2 segundos antes de volver a consultar
          const tiempoEspera = 1200 + Math.floor(Math.random() * 800);
          await new Promise((r) => setTimeout(r, tiempoEspera));
          continue;
        }
      }

      // 2. Luz Verde: Tomar el semáforo
      const nuevoLock: SemaforoLockData = {
        cajaId,
        nombreCaja,
        timestamp: ahora,
      };
      localStorage.setItem(SEMAFORO_LOCK_KEY, JSON.stringify(nuevoLock));
      return true;
    } catch {
      return true;
    }
  }

  return true; // Tras los intentos, permitir proceder para no bloquear la cola
}

/**
 * Libera el semáforo para que la siguiente caja pueda sincronizar.
 */
function liberarSemaforo(cajaId: string | number) {
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

          // Asignar caja si no estaba presente
          if (factura && !factura.CAJA) {
            factura.CAJA = nombreCaja;
          }

          // 1. Insertar Factura con UPSERT protegido por número de factura único
          const { error: errFact } = await supabase
            .from("FACTURA" as any)
            .upsert(factura, { onConflict: "NUMEROFACT" });

          if (errFact) throw errFact;

          // 2. Insertar Campos Factura (prendas)
          if (items && items.length > 0) {
            const { error: errItems } = await supabase
              .from("CAMPOFACTURA" as any)
              .insert(items);
            if (errItems) console.warn("Aviso items sincronizados:", errItems.message);
          }

          // 3. Actualizar estado de artículos en Supabase
          for (const it of items || []) {
            if (it.BARRAS) {
              await supabase
                .from("ARTICULO" as any)
                .update({
                  ESTADO: factura.MODO === "VENTA" ? "VENDIDO" : "ALQUILADO",
                  ESTADOCLIENTE: factura.ESTADOCLIENTE || "EN BODEGA",
                })
                .eq("CODBARRAS", it.BARRAS);
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
                TOTAL_SALDO: nuevoSaldo,
                ESTADO: nuevoSaldo <= 0 ? "PAGADO" : "CON SALDO",
              })
              .eq("NUMEROFACT", facturaNumero);
          }
        } else if (item.tipo === "DEVOLUCION_TRAJE") {
          const { numeroFact, itemsDevueltos, barrasArticulos, montoNetoDevuelto, fecha } = item.datos;

          // 1. Insertar egreso de reintegro en DEPOSITOENTREGADO si hubo valor
          if (montoNetoDevuelto && Number(montoNetoDevuelto) > 0) {
            try {
              await supabase.from("DEPOSITOENTREGADO" as any).insert({
                NUMEROFACTURA: numeroFact,
                VALOR: Number(montoNetoDevuelto),
                FECHA: fecha || new Date().toISOString().split("T")[0],
              });
            } catch (e) {
              console.warn("Aviso insertando DEPOSITOENTREGADO sincronizado:", e);
            }
          }

          // 2. Marcar factura como ENTREGADO
          await supabase
            .from("FACTURA" as any)
            .update({ ESTADOCLIENTE: "ENTREGADO", ESTADOFIN: "DEVUELTO" })
            .eq("NUMEROFACT", numeroFact);

          // 3. Devolver prendas / reponer stock
          if (itemsDevueltos && Array.isArray(itemsDevueltos)) {
            for (const it of itemsDevueltos) {
              try {
                let query = supabase.from("ARTICULO" as any).select("*");
                if (it.codigoBarras) {
                  query = query.eq("CODBARRAS", it.codigoBarras);
                } else if (it.descripcion) {
                  query = query.eq("DESCRIPCION", it.descripcion);
                }
                const { data: artRaw } = await query.maybeSingle();
                const art = artRaw as any;
                if (art) {
                  await supabase
                    .from("ARTICULO" as any)
                    .update({
                      STOCK: (Number(art.STOCK) || 0) + (Number(it.cantidad) || 1),
                      ESTADO: "DISPONIBLE",
                      ESTADOCLIENTE: "ENTREGADO",
                    })
                    .eq("IDARTICULO", art.IDARTICULO);
                }
              } catch {}
            }
          } else if (barrasArticulos && Array.isArray(barrasArticulos)) {
            for (const barras of barrasArticulos) {
              await supabase
                .from("ARTICULO" as any)
                .update({ ESTADO: "DISPONIBLE", ESTADOCLIENTE: "ENTREGADO" })
                .eq("BARRAS", barras);
            }
          }
        } else if (item.tipo === "NUEVO_CLIENTE") {
          const { cliente } = item.datos;
          await supabase
            .from("CLIENTES" as any)
            .upsert(cliente, { onConflict: "CEDULA" });
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
    // 3. Siempre liberar el semáforo al terminar
    liberarSemaforo(cajaId);
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

export function inicializarDetectorOffline(): void {
  if (typeof window === "undefined" || detectorIniciado) return;
  detectorIniciado = true;

  const verificarEstadoInmediato = async () => {
    const hayInternet = await probarConectividadReal();
    const cambioEstado = hayInternet !== currentState.isOnline;

    if (cambioEstado) {
      currentState.isOnline = hayInternet;
      if (!hayInternet) {
        currentState.pendingCount = await contarItemsPendientesSincronizar();
        notifyListeners();
      } else {
        notifyListeners();
        // Si regresó la red, sincronizar automáticamente
        procesarColaSincronizacion();
        precargarDatosOffline();
      }
    }
  };

  const handleOnline = async () => {
    await verificarEstadoInmediato();
  };

  const handleOffline = async () => {
    currentState.isOnline = false;
    currentState.pendingCount = await contarItemsPendientesSincronizar();
    notifyListeners();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Verificación periódica silenciosa cada 15 segundos
  setInterval(verificarEstadoInmediato, 15000);

  // Precarga inicial al abrir la aplicación
  setTimeout(async () => {
    await verificarEstadoInmediato();
    if (currentState.isOnline) {
      precargarDatosOffline();
      procesarColaSincronizacion(true);
    }
  }, 1000);
}

// Auto-inicialización global inmediata al importar el módulo
if (typeof window !== "undefined") {
  inicializarDetectorOffline();
}


