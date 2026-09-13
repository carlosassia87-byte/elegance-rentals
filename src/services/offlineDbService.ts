/**
 * Base de Datos IndexedDB de Alta Capacidad para Elegance Rentals POS
 * Soporta almacenamiento masivo local de Artículos, Clientes, Facturas, Abonos
 * y Cola de Sincronización Offline con reserva de bloques de consecutivos.
 */

const DB_NAME = "ElegancePOS_OfflineDB";
const DB_VERSION = 1;

export interface OfflineArticulo {
  IDARTICULO: number;
  BARRAS: string;
  DESCRIPCION: string;
  TALLA?: string;
  VALORALQUILER?: number;
  VALORVENTA?: number;
  VALORDEPOSITO?: number;
  ESTADO?: string;
  ESTADOCLIENTE?: string;
  ACCESORIOS?: string;
  COLOR?: string;
  CATEGORIA?: string;
  FOTO?: string;
  [key: string]: any;
}

export interface OfflineCliente {
  IDCLIENTES: number;
  CEDULA: number;
  NOMBRE: string;
  TELEFONO?: string;
  TELEFONO1?: string;
  DIRECCION?: string;
  CIUDAD?: string;
  EMAIL?: string;
  [key: string]: any;
}

export interface OfflineFactura {
  IDFACTURA: number;
  NUMEROFACT: string;
  FECHASALIDA: string;
  FECHAENTRADA?: string;
  CCEDULA: number;
  CCLIENTE: string;
  CTELEFONO?: string;
  CDIRECCION?: string;
  FTOTALALQUILER?: number;
  FTOTALDEPOSITO?: number;
  FTOTALVENTADEPOSITO?: number;
  PAGOCONEFECTIVO?: number;
  PAGOCONTRANFERENCIA?: number;
  TOTAL_SALDO?: number;
  ESTADO?: string;
  ESTADOCLIENTE?: string;
  MODO?: string;
  VENDEDOR?: string;
  HORA?: string;
  sincronizado?: boolean;
  [key: string]: any;
}

export interface OfflineCampoFactura {
  IDCAMPOSFACTURA: number;
  NUMEROFACT: string;
  BARRAS: string;
  DESCRIPCION: string;
  TALLA?: string;
  CANTIDAD: number;
  VALORALQUILER?: number;
  VALORDEPOSITO?: number;
  ESTADOCLIENTE?: string;
  [key: string]: any;
}

export interface OfflineAbono {
  IDABONO_CLIENTE: number;
  AFACTURA: string;
  ACEDULA: number;
  ACLIENTE: string;
  AFECHA: string;
  AHORA: string;
  AVALOR: number;
  ASALDO_ACTUAL: number;
  ASALDO_NUEVO: number;
  ASALDO_INICIAL: number;
  ATOTAL_VENTA: number;
  ATIPO_PAGO?: string;
  sincronizado?: boolean;
  [key: string]: any;
}

export interface SyncQueueItem {
  id: string;
  tipo: "NUEVA_FACTURA" | "NUEVO_ABONO" | "DEVOLUCION_TRAJE" | "NUEVO_CLIENTE";
  timestamp: number;
  datos: any;
  intentos: number;
  ultimoError?: string;
}

export interface ConsecutivoReserva {
  cajaId: string;
  prefijo: string; // ej. "G"
  rangoInicio: number;
  rangoFin: number;
  siguienteNumero: number;
  fechaReserva: string;
}

// Abrir la base de datos IndexedDB
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB no está disponible en este entorno"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: any) => {
      const db: IDBDatabase = event.target.result;

      // 1. Catálogo de Artículos
      if (!db.objectStoreNames.contains("articulos")) {
        const store = db.createObjectStore("articulos", { keyPath: "IDARTICULO" });
        store.createIndex("by_barras", "BARRAS", { unique: false });
        store.createIndex("by_descripcion", "DESCRIPCION", { unique: false });
        store.createIndex("by_estado", "ESTADO", { unique: false });
      }

      // 2. Clientes
      if (!db.objectStoreNames.contains("clientes")) {
        const store = db.createObjectStore("clientes", { keyPath: "IDCLIENTES" });
        store.createIndex("by_cedula", "CEDULA", { unique: false });
        store.createIndex("by_nombre", "NOMBRE", { unique: false });
      }

      // 3. Facturas
      if (!db.objectStoreNames.contains("facturas")) {
        const store = db.createObjectStore("facturas", { keyPath: "NUMEROFACT" });
        store.createIndex("by_id", "IDFACTURA", { unique: false });
        store.createIndex("by_cedula", "CCEDULA", { unique: false });
        store.createIndex("by_fecha", "FECHASALIDA", { unique: false });
        store.createIndex("by_estado_cliente", "ESTADOCLIENTE", { unique: false });
      }

      // 4. Detalle Campos Factura
      if (!db.objectStoreNames.contains("camposFactura")) {
        const store = db.createObjectStore("camposFactura", { keyPath: "IDCAMPOSFACTURA" });
        store.createIndex("by_factura", "NUMEROFACT", { unique: false });
        store.createIndex("by_barras", "BARRAS", { unique: false });
      }

      // 5. Abonos
      if (!db.objectStoreNames.contains("abonos")) {
        const store = db.createObjectStore("abonos", { keyPath: "IDABONO_CLIENTE" });
        store.createIndex("by_factura", "AFACTURA", { unique: false });
        store.createIndex("by_cedula", "ACEDULA", { unique: false });
      }

      // 6. Cola de Sincronización
      if (!db.objectStoreNames.contains("sync_queue")) {
        const store = db.createObjectStore("sync_queue", { keyPath: "id" });
        store.createIndex("by_timestamp", "timestamp", { unique: false });
      }

      // 7. Configuración y Reservas de Consecutivo
      if (!db.objectStoreNames.contains("config")) {
        db.createObjectStore("config", { keyPath: "key" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// =========================================================================
// OPERACIONES POR LOTES (UPSERT MASIVO)
// =========================================================================

export async function guardarArticulosLote(articulos: OfflineArticulo[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("articulos", "readwrite");
    const store = tx.objectStore("articulos");
    for (const art of articulos) {
      if (art && art.IDARTICULO) {
        store.put(art);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function guardarClientesLote(clientes: OfflineCliente[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("clientes", "readwrite");
    const store = tx.objectStore("clientes");
    for (const cli of clientes) {
      if (cli && cli.IDCLIENTES) {
        store.put(cli);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function guardarFacturasLote(
  facturas: OfflineFactura[],
  campos?: OfflineCampoFactura[],
  abonos?: OfflineAbono[]
): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const storeNames = ["facturas"];
    if (campos && campos.length > 0) storeNames.push("camposFactura");
    if (abonos && abonos.length > 0) storeNames.push("abonos");

    const tx = db.transaction(storeNames, "readwrite");
    
    const storeFact = tx.objectStore("facturas");
    for (const f of facturas) {
      if (f && f.NUMEROFACT) storeFact.put(f);
    }

    if (campos && campos.length > 0) {
      const storeCampos = tx.objectStore("camposFactura");
      for (const c of campos) {
        if (c && c.IDCAMPOSFACTURA) storeCampos.put(c);
      }
    }

    if (abonos && abonos.length > 0) {
      const storeAbonos = tx.objectStore("abonos");
      for (const a of abonos) {
        if (a && a.IDABONO_CLIENTE) storeAbonos.put(a);
      }
    }

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// =========================================================================
// OBTENCIÓN MASIVA OFFLINE (FALLBACK PARA LISTADOS COMPLETOS)
// =========================================================================

export async function obtenerTodosLosArticulosOffline(): Promise<OfflineArticulo[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("articulos", "readonly");
      const store = tx.objectStore("articulos");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function obtenerTodosLosClientesOffline(): Promise<OfflineCliente[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("clientes", "readonly");
      const store = tx.objectStore("clientes");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

export async function obtenerTodasLasFacturasOffline(): Promise<OfflineFactura[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction("facturas", "readonly");
      const store = tx.objectStore("facturas");
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

// =========================================================================
// BÚSQUEDAS INDEXADAS OFFLINE RÁPIDAS
// =========================================================================

export async function buscarArticuloPorBarrasOffline(codigoBarras: string): Promise<OfflineArticulo | null> {
  if (!codigoBarras) return null;
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("articulos", "readonly");
    const store = tx.objectStore("articulos");
    const index = store.index("by_barras");
    const req = index.get(codigoBarras.trim());
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function buscarClientePorCedulaOffline(cedula: number | string): Promise<OfflineCliente | null> {
  const numCedula = typeof cedula === "string" ? parseInt(cedula, 10) : cedula;
  if (!numCedula || isNaN(numCedula)) return null;

  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("clientes", "readonly");
    const store = tx.objectStore("clientes");
    const index = store.index("by_cedula");
    const req = index.get(numCedula);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

export async function buscarFacturaPorNumeroOffline(numeroFact: string): Promise<{
  factura: OfflineFactura | null;
  items: OfflineCampoFactura[];
  abonos: OfflineAbono[];
}> {
  if (!numeroFact) return { factura: null, items: [], abonos: [] };
  const db = await openDB();
  const num = numeroFact.trim().toUpperCase();

  const factura: OfflineFactura | null = await new Promise((resolve) => {
    const tx = db.transaction("facturas", "readonly");
    const store = tx.objectStore("facturas");
    const req = store.get(num);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });

  if (!factura) return { factura: null, items: [], abonos: [] };

  const items: OfflineCampoFactura[] = await new Promise((resolve) => {
    const tx = db.transaction("camposFactura", "readonly");
    const store = tx.objectStore("camposFactura");
    const index = store.index("by_factura");
    const req = index.getAll(num);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  const abonos: OfflineAbono[] = await new Promise((resolve) => {
    const tx = db.transaction("abonos", "readonly");
    const store = tx.objectStore("abonos");
    const index = store.index("by_factura");
    const req = index.getAll(num);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });

  return { factura, items, abonos };
}

// =========================================================================
// COLA DE SINCRONIZACIÓN OFFLINE
// =========================================================================

export async function encolarOperacionOffline(
  tipo: SyncQueueItem["tipo"],
  datos: any
): Promise<string> {
  const db = await openDB();
  const id = `SYNC_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const item: SyncQueueItem = {
    id,
    tipo,
    timestamp: Date.now(),
    datos,
    intentos: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    store.put(item);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerColaSincronizacion(): Promise<SyncQueueItem[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("sync_queue", "readonly");
    const store = tx.objectStore("sync_queue");
    const req = store.getAll();
    req.onsuccess = () => {
      const items = (req.result || []).sort((a: SyncQueueItem, b: SyncQueueItem) => a.timestamp - b.timestamp);
      resolve(items);
    };
    req.onerror = () => resolve([]);
  });
}

export async function eliminarItemCola(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("sync_queue", "readwrite");
    const store = tx.objectStore("sync_queue");
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function contarItemsPendientesSincronizar(): Promise<number> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("sync_queue", "readonly");
    const store = tx.objectStore("sync_queue");
    const req = store.count();
    req.onsuccess = () => resolve(req.result || 0);
    req.onerror = () => resolve(0);
  });
}

// =========================================================================
// RESERVA DE CONSECUTIVOS POR BLOQUE (Para evitar choques entre PCs offline)
// =========================================================================

export async function guardarReservaConsecutivo(reserva: ConsecutivoReserva): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("config", "readwrite");
    const store = tx.objectStore("config");
    store.put({ key: "consecutivo_reserva", ...reserva });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function obtenerReservaConsecutivo(): Promise<ConsecutivoReserva | null> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction("config", "readonly");
    const store = tx.objectStore("config");
    const req = store.get("consecutivo_reserva");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Obtiene el siguiente número reservado de forma atómica en modo offline.
 * Garantiza que la numeración siga el formato idéntico `G14001` sin duplicados.
 */
export async function consumirSiguienteNumeroOffline(prefijoDefault = "G"): Promise<string> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("config", "readwrite");
    const store = tx.objectStore("config");
    const req = store.get("consecutivo_reserva");

    req.onsuccess = () => {
      const reserva: ConsecutivoReserva = req.result;
      if (reserva && reserva.siguienteNumero <= reserva.rangoFin) {
        const numActual = reserva.siguienteNumero;
        reserva.siguienteNumero += 1;
        store.put(reserva);
        tx.oncomplete = () => {
          resolve(`${reserva.prefijo || prefijoDefault}${numActual}`);
        };
      } else {
        // Fallback si no había bloque reservado previo
        const fallbackNum = `${prefijoDefault}${Date.now().toString().slice(-5)}`;
        resolve(fallbackNum);
      }
    };
    req.onerror = () => reject(req.error);
  });
}
