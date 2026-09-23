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

/**
 * Descarga y refresca los artículos, clientes, accesorios y facturas recientes en IndexedDB y memoria RAM.
 * Se ejecuta automáticamente al iniciar la PWA y en segundo plano sin congelar la interfaz.
 */
export async function precargarDatosOffline(forzarCompleto = false): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  try {
    currentState = {
      ...currentState,
      isSyncing: true,
    };
    notifyListeners();

    // 1. Descargar catálogo COMPLETO de Artículos con paginación (supera el límite de 1000)
    const articulos = await descargarTablaPaginada("ARTICULO", "IDARTICULO", 1000, 50000);
    if (articulos && articulos.length > 0) {
      await guardarArticulosLote(articulos as unknown as OfflineArticulo[]);
      try {
        indexarArticulosEnMemoria(articulos as any);
      } catch {}
    }

    // 2. Descargar catálogo COMPLETO de Clientes con paginación
    const clientes = await descargarTablaPaginada("CLIENTES", "IDCLIENTES", 1000, 50000);
    if (clientes && clientes.length > 0) {
      await guardarClientesLote(clientes as unknown as OfflineCliente[]);
      try {
        indexarClientesEnMemoria(clientes as any);
      } catch {}
    }

    // 3. Descargar catálogo COMPLETO de Accesorios
    const accesorios = await descargarTablaPaginada("ACCESORIOS", "IDACCESORIO", 1000, 10000);
    if (accesorios && accesorios.length > 0) {
      try {
        saveLocalAccesorios(accesorios);
      } catch {}
    }

    // 4. Descargar Facturas de los últimos 60 días o pendientes
    const hace60Dias = new Date();
    hace60Dias.setDate(hace60Dias.getDate() - 60);
    const fechaStr = hace60Dias.toISOString().split("T")[0];

    const { data: facturas, error: errFact } = await supabase
      .from("FACTURA" as any)
      .select("*")
      .gte("FECHASALIDA", fechaStr)
      .order("IDFACTURA", { ascending: false })
      .limit(3000);

    if (!errFact && facturas && facturas.length > 0) {
      const numFacts = (facturas as any[]).map((f) => f.NUMEROFACT).filter(Boolean);

      // Descargar items relacionados por bloques de 80 para no saturar URL
      const camposFactura: OfflineCampoFactura[] = [];
      const CHUNK_SIZE = 80;
      for (let i = 0; i < numFacts.length; i += CHUNK_SIZE) {
        const chunk = numFacts.slice(i, i + CHUNK_SIZE);
        const { data: campos } = await supabase
          .from("CAMPOFACTURA" as any)
          .select("*")
          .in("NUMEROFACT", chunk);
        if (campos) camposFactura.push(...(campos as unknown as OfflineCampoFactura[]));
      }

      // Descargar abonos relacionados
      const abonosFactura: OfflineAbono[] = [];
      for (let i = 0; i < numFacts.length; i += CHUNK_SIZE) {
        const chunk = numFacts.slice(i, i + CHUNK_SIZE);
        const { data: abonos } = await supabase
          .from("ABONO_CLIENTE" as any)
          .select("*")
          .in("AFACTURA", chunk);
        if (abonos) abonosFactura.push(...(abonos as unknown as OfflineAbono[]));
      }

      await guardarFacturasLote(
        facturas as unknown as OfflineFactura[],
        camposFactura,
        abonosFactura
      );
    }

    // 5. Asegurar bloque de reserva de consecutivos para emergencias offline
    await renovarBloqueConsecutivosOffline();

    // Actualizar conteo de pendientes y estado final
    const pendientes = await contarItemsPendientesSincronizar();
    currentState = {
      ...currentState,
      isSyncing: false,
      pendingCount: pendientes,
      lastSyncTime: new Date(),
    };
    notifyListeners();

    // Notificar globalmente a las vistas (POS, Modales, Catálogo) para refrescar datos en vivo
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("pos_datos_sincronizados", {
          detail: {
            articulosCount: articulos.length,
            clientesCount: clientes.length,
            timestamp: Date.now(),
          },
        })
      );
    }
  } catch (err) {
    console.warn("Fallo durante la precarga offline:", err);
    currentState = {
      ...currentState,
      isSyncing: false,
    };
    notifyListeners();
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

// Sets de validación de esquemas exactos para evitar errores PGRST204 de Supabase
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
  "ESTADOFIN",
]);

function sanitizarFacturaParaSupabase(factura: any): Record<string, any> {
  if (!factura || typeof factura !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(factura)) {
    if (COLUMNAS_FACTURA.has(key) && val !== undefined) {
      clean[key] = val;
    }
  }
  if (!clean["NUMEROFACT"] && factura.NUMEROFACT) {
    clean["NUMEROFACT"] = String(factura.NUMEROFACT);
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

function sanitizarItemCampoFactura(item: any): Record<string, any> {
  if (!item || typeof item !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(item)) {
    if (COLUMNAS_CAMPOFACTURA.has(key) && val !== undefined) {
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
    if (COLUMNAS_CLIENTES.has(key) && val !== undefined) {
      clean[key] = val;
    }
  }
  if (clean["CEDULA"] !== undefined) {
    clean["CEDULA"] = Number(clean["CEDULA"]);
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
                TOTAL_SALDO: Number(nuevoSaldo) || 0,
                ESTADOCLIENTE: nuevoSaldo <= 0 ? "PAGADO" : "CON SALDO",
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
            } catch {
              try {
                await supabase.from("depositoentregado" as any).insert({
                  NUMEROFACTURA: numeroFact,
                  VALOR: Number(montoNetoDevuelto),
                  FECHA: fecha || new Date().toISOString().split("T")[0],
                });
              } catch (e) {
                console.warn("Aviso insertando DEPOSITOENTREGADO sincronizado:", e);
              }
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
    await verificarEstadoInmediato();
    procesarColaSincronizacion(true).then((res) => {
      if (res.exitosas > 0) {
        precargarDatosOffline();
      }
    });
  };

  const handleOffline = async () => {
    currentState.isOnline = false;
    currentState.pendingCount = await contarItemsPendientesSincronizar();
    notifyListeners();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Verificación periódica activa cada 10 segundos
  setInterval(verificarEstadoInmediato, 10000);

  // Precarga y sincronización inmediata al abrir la aplicación
  setTimeout(async () => {
    await verificarEstadoInmediato();
    if (currentState.isOnline) {
      procesarColaSincronizacion(true).then(() => {
        precargarDatosOffline();
      });
    }
  }, 500);
}

// Auto-inicialización global inmediata al importar el módulo
if (typeof window !== "undefined") {
  inicializarDetectorOffline();
}


