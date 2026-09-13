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

// =========================================================================
// PROCESAMIENTO DE LA COLA DE SINCRONIZACIÓN (SUBIDA A SUPABASE)
// =========================================================================

/**
 * Procesa todas las operaciones que se hayan acumulado sin internet
 * y las inserta en Supabase en orden cronológico estricto.
 */
export async function procesarColaSincronizacion(): Promise<{ exitosas: number; fallidas: number }> {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return { exitosas: 0, fallidas: 0 };
  }

  if (currentState.isSyncing) return { exitosas: 0, fallidas: 0 };

  currentState.isSyncing = true;
  notifyListeners();

  const cola = await obtenerColaSincronizacion();
  let exitosas = 0;
  let fallidas = 0;

  for (const item of cola) {
    try {
      if (item.tipo === "NUEVA_FACTURA") {
        const { factura, items } = item.datos;

        // 1. Insertar Factura
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
              .eq("BARRAS", it.BARRAS);
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
        const { numeroFact, barrasArticulos } = item.datos;

        // Marcar factura como ENTREGADO
        await supabase
          .from("FACTURA" as any)
          .update({ ESTADOCLIENTE: "ENTREGADO", ESTADO: "ENTREGADO" })
          .eq("NUMEROFACT", numeroFact);

        // Devolver prendas a DISPONIBLE
        for (const barras of barrasArticulos || []) {
          await supabase
            .from("ARTICULO" as any)
            .update({ ESTADO: "DISPONIBLE", ESTADOCLIENTE: "ENTREGADO" })
            .eq("BARRAS", barras);
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
// INICIALIZADOR DE EVENTOS GLOBALES (ONLINE / OFFLINE)
// =========================================================================

export function inicializarDetectorOffline(): void {
  if (typeof window === "undefined") return;

  const handleOnline = async () => {
    currentState.isOnline = true;
    notifyListeners();

    // Al regresar la red, procesar cola de inmediato y precargar
    await procesarColaSincronizacion();
    await precargarDatosOffline();
  };

  const handleOffline = async () => {
    currentState.isOnline = false;
    currentState.pendingCount = await contarItemsPendientesSincronizar();
    notifyListeners();
  };

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  // Precarga inicial al abrir la aplicación
  setTimeout(() => {
    if (navigator.onLine) {
      precargarDatosOffline();
      procesarColaSincronizacion();
    }
  }, 1500);

  // Intervalo periódico de sincronización cada 60 segundos
  setInterval(() => {
    if (navigator.onLine && !currentState.isSyncing) {
      procesarColaSincronizacion();
    }
  }, 60000);
}
