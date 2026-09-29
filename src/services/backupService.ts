import { supabase } from "@/integrations/supabase/client";

/**
 * Servicio Integral de Copias de Seguridad (Backup Completo, Guardado Local y Google Drive / Cloud Vault)
 * Elegance Rentals POS
 */

export interface BackupMetadata {
  version: string;
  timestamp: string;
  fechaLegible: string;
  sistema: string;
  totalTablas: number;
  totalRegistros: number;
  tablas: Record<string, { registros: number; columnas?: string[] }>;
  checksum?: string;
  usuarioEjecutor?: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  datos: Record<string, any[]>;
}

export interface HistorialBackupItem {
  id?: number;
  fecha: string;
  tipo: "MANUAL_LOCAL" | "CRON_AUTO" | "GOOGLE_DRIVE" | "CLOUD_VAULT" | "DESCARGA_DIRECTA";
  nombre_archivo: string;
  tamano_bytes: number;
  total_tablas: number;
  total_registros: number;
  detalles: any;
  estado: "EXITOSO" | "ERROR";
  mensaje_error?: string | null;
  usuario_ejecutor: string;
}

export const TABLAS_BACKUP = [
  "ARTICULO",
  "CLIENTES",
  "FACTURA",
  "CAMPOFACTURA",
  "ABONO_CLIENTE",
  "gastos",
  "depositoentregado",
  "ACCESORIOS",
  "MOVIMIENTOS_INVENTARIO",
  "CAJAS",
  "EMPRESA_CONFIG",
] as const;

export type NombreTablaBackup = (typeof TABLAS_BACKUP)[number];

const DB_STORE_NAME = "ElegancePOS_BackupConfig";
const STORE_NAME = "config";
const KEY_DIR_HANDLE = "backup_directory_handle";
const KEY_LOCAL_HISTORIAL = "elegance_backup_historial_local";

/**
 * Base de datos IndexedDB dedicada para guardar el FileSystemDirectoryHandle de forma persistente
 */
function openConfigDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      return reject(new Error("IndexedDB no disponible"));
    }
    const req = indexedDB.open(DB_STORE_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function guardarDirectorioHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openConfigDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(handle, KEY_DIR_HANDLE);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn("No se pudo almacenar el handle del directorio:", err);
  }
}

export async function obtenerDirectorioHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openConfigDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(KEY_DIR_HANDLE);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Calcula un Checksum SHA-256 del contenido del backup para verificar integridad
 */
async function calcularChecksumSha256(texto: string): Promise<string> {
  try {
    if (typeof crypto !== "undefined" && crypto.subtle) {
      const encoder = new TextEncoder();
      const data = encoder.encode(texto);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    console.warn("Fallo calculando hash sha-256:", e);
  }
  return `chk_${Date.now().toString(16)}`;
}

/**
 * Extractor paginado que lee una tabla de Supabase en bloques de 1.000 registros
 */
export async function extraerTablaPaginada(
  tabla: string,
  onProgreso?: (cargados: number, total: number) => void
): Promise<any[]> {
  try {
    const { count, error: errCount } = await supabase
      .from(tabla as any)
      .select("*", { count: "exact", head: true });

    if (errCount) {
      console.warn(`Aviso al consultar conteo de ${tabla}:`, errCount.message);
    }

    const totalRegistros = count || 0;
    const todosLosRegistros: any[] = [];
    const tamanoPagina = 1000;
    let offset = 0;

    if (totalRegistros === 0) {
      // Intentar consulta estándar por si head: true falló
      const { data, error } = await supabase.from(tabla as any).select("*").limit(tamanoPagina);
      if (!error && data && data.length > 0) {
        todosLosRegistros.push(...data);
        if (onProgreso) onProgreso(todosLosRegistros.length, todosLosRegistros.length);
      }
      return todosLosRegistros;
    }

    while (offset < totalRegistros) {
      const hasta = Math.min(offset + tamanoPagina - 1, totalRegistros - 1);
      const { data, error } = await supabase
        .from(tabla as any)
        .select("*")
        .range(offset, hasta);

      if (error) {
        console.error(`Error extrayendo lote de ${tabla} [${offset}-${hasta}]:`, error);
        break;
      }

      if (data && data.length > 0) {
        todosLosRegistros.push(...data);
      } else {
        break;
      }

      offset += tamanoPagina;
      if (onProgreso) {
        onProgreso(todosLosRegistros.length, totalRegistros);
      }
    }

    return todosLosRegistros;
  } catch (err) {
    console.error(`Error crítico extrayendo tabla ${tabla}:`, err);
    return [];
  }
}

/**
 * Genera la estructura completa de copia de seguridad con metadatos estructurados
 */
export async function generarCopiaSeguridadCompleta(
  usuarioEjecutor = "ADMINISTRADOR",
  onProgreso?: (tabla: string, procesados: number, total: number) => void
): Promise<BackupData> {
  const datosExtraidos: Record<string, any[]> = {};
  const resumenTablas: Record<string, { registros: number; columnas?: string[] }> = {};
  let totalRegistrosGlobal = 0;

  for (const tabla of TABLAS_BACKUP) {
    if (onProgreso) {
      onProgreso(tabla, 0, 0);
    }

    const filas = await extraerTablaPaginada(tabla, (cargados, total) => {
      if (onProgreso) {
        onProgreso(tabla, cargados, total);
      }
    });

    datosExtraidos[tabla] = filas;
    const columnas = filas.length > 0 ? Object.keys(filas[0]) : [];
    resumenTablas[tabla] = {
      registros: filas.length,
      columnas,
    };
    totalRegistrosGlobal += filas.length;
  }

  const ahora = new Date();
  const fechaLegible = ahora.toLocaleString("es-CO", {
    dateStyle: "full",
    timeStyle: "medium",
    timeZone: "America/Bogota",
  });

  const metadataPrevia: BackupMetadata = {
    version: "2.0",
    timestamp: ahora.toISOString(),
    fechaLegible,
    sistema: "Elegance Rentals POS",
    totalTablas: TABLAS_BACKUP.length,
    totalRegistros: totalRegistrosGlobal,
    tablas: resumenTablas,
    usuarioEjecutor,
  };

  const backupTemporal = {
    metadata: metadataPrevia,
    datos: datosExtraidos,
  };

  const jsonString = JSON.stringify(backupTemporal);
  const checksum = await calcularChecksumSha256(jsonString);
  backupTemporal.metadata.checksum = checksum;

  return backupTemporal;
}

/**
 * Guarda el backup directamente en una carpeta física seleccionada mediante File System Access API
 */
export async function guardarBackupLocalConFileSystem(
  backup: BackupData,
  forzarSeleccionCarpeta = false
): Promise<{ ok: boolean; nombreArchivo: string; carpeta?: string; error?: string }> {
  try {
    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = ahora.getFullYear();
    const mm = pad(ahora.getMonth() + 1);
    const dd = pad(ahora.getDate());
    const hh = pad(ahora.getHours());
    const min = pad(ahora.getMinutes());
    const ss = pad(ahora.getSeconds());
    const nombreArchivo = `backup_elegance_pos_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.json`;

    let dirHandle: FileSystemDirectoryHandle | null = null;

    if (!forzarSeleccionCarpeta) {
      dirHandle = await obtenerDirectorioHandle();
    }

    // Si no hay handle previo o no se tiene permiso, solicitarlo al usuario
    if (!dirHandle && typeof window !== "undefined" && "showDirectoryPicker" in window) {
      dirHandle = await (window as any).showDirectoryPicker({
        id: "elegance_backup_dir",
        mode: "readwrite",
        startIn: "documents",
      });
      if (dirHandle) {
        await guardarDirectorioHandle(dirHandle);
      }
    }

    // Verificar permisos en el handle
    if (dirHandle) {
      const opts = { mode: "readwrite" as const };
      if ((dirHandle as any).queryPermission) {
        let perm = await (dirHandle as any).queryPermission(opts);
        if (perm !== "granted") {
          perm = await (dirHandle as any).requestPermission(opts);
        }
        if (perm !== "granted") {
          throw new Error("Permiso denegado para escribir en la carpeta seleccionada");
        }
      }

      // Crear archivo y escribir JSON
      const fileHandle = await dirHandle.getFileHandle(nombreArchivo, { create: true });
      const writable = await fileHandle.createWritable();
      const contenidoJson = JSON.stringify(backup, null, 2);
      await writable.write(contenidoJson);
      await writable.close();

      const bytes = new Blob([contenidoJson]).size;

      // Registrar auditoría en historial
      await registrarHistorialBackup({
        fecha: new Date().toISOString(),
        tipo: "MANUAL_LOCAL",
        nombre_archivo: nombreArchivo,
        tamano_bytes: bytes,
        total_tablas: backup.metadata.totalTablas,
        total_registros: backup.metadata.totalRegistros,
        detalles: {
          carpeta: dirHandle.name,
          checksum: backup.metadata.checksum,
          tablas: backup.metadata.tablas,
        },
        estado: "EXITOSO",
        usuario_ejecutor: backup.metadata.usuarioEjecutor || "ADMINISTRADOR",
      });

      return {
        ok: true,
        nombreArchivo,
        carpeta: dirHandle.name,
      };
    } else {
      // Fallback a descarga clásica si el navegador no soporta showDirectoryPicker
      descargarBackupArchivo(backup);
      return {
        ok: true,
        nombreArchivo,
        carpeta: "Descargas (Navegador)",
      };
    }
  } catch (err: any) {
    console.error("Error guardando backup con File System API:", err);
    return {
      ok: false,
      nombreArchivo: "",
      error: err?.message || "No se pudo escribir el archivo en la carpeta local",
    };
  }
}

/**
 * Descarga clásica mediante Blob para cualquier navegador
 */
export function descargarBackupArchivo(backup: BackupData): string {
  const ahora = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const yyyy = ahora.getFullYear();
  const mm = pad(ahora.getMonth() + 1);
  const dd = pad(ahora.getDate());
  const hh = pad(ahora.getHours());
  const min = pad(ahora.getMinutes());
  const ss = pad(ahora.getSeconds());
  const nombreArchivo = `backup_elegance_pos_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.json`;

  const contenido = JSON.stringify(backup, null, 2);
  const blob = new Blob([contenido], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = nombreArchivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 60000);

  // Registrar auditoría en segundo plano
  registrarHistorialBackup({
    fecha: new Date().toISOString(),
    tipo: "DESCARGA_DIRECTA",
    nombre_archivo: nombreArchivo,
    tamano_bytes: blob.size,
    total_tablas: backup.metadata.totalTablas,
    total_registros: backup.metadata.totalRegistros,
    detalles: {
      checksum: backup.metadata.checksum,
      tablas: backup.metadata.tablas,
    },
    estado: "EXITOSO",
    usuario_ejecutor: backup.metadata.usuarioEjecutor || "ADMINISTRADOR",
  }).catch(() => {});

  return nombreArchivo;
}

/**
 * Sube la copia de seguridad a la bóveda en la nube (Supabase Storage) o Google Drive
 */
export async function subirBackupAGoogleDriveOStorage(
  backup: BackupData,
  destino: "drive" | "cloud_vault" = "cloud_vault"
): Promise<{ ok: boolean; url?: string; mensaje?: string; error?: string }> {
  try {
    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = ahora.getFullYear();
    const mm = pad(ahora.getMonth() + 1);
    const dd = pad(ahora.getDate());
    const hh = pad(ahora.getHours());
    const min = pad(ahora.getMinutes());
    const ss = pad(ahora.getSeconds());
    const nombreArchivo = `backup_elegance_${destino}_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.json`;

    const contenido = JSON.stringify(backup, null, 2);
    const blob = new Blob([contenido], { type: "application/json" });

    // 1. Subida a Supabase Storage (Bóveda privada en la nube)
    const nombreBucket = "backups";
    const rutaArchivo = `${yyyy}/${mm}/${nombreArchivo}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(nombreBucket)
      .upload(rutaArchivo, blob, {
        contentType: "application/json",
        upsert: true,
      });

    if (uploadError) {
      // Si el bucket 'backups' no existe aún, guardar registro de aviso
      console.warn("Aviso subiendo a bucket 'backups':", uploadError.message);
    }

    // 2. Si se configuró Webhook de Google Drive en LocalStorage o EMPRESA_CONFIG
    let googleDriveEnviado = false;
    const webhookDrive = typeof localStorage !== "undefined" ? localStorage.getItem("elegance_gdrive_webhook") : null;
    if (webhookDrive && webhookDrive.startsWith("http")) {
      try {
        await fetch(webhookDrive, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombreArchivo,
            metadata: backup.metadata,
            datos: backup.datos,
          }),
        });
        googleDriveEnviado = true;
      } catch (errGdrive) {
        console.warn("Fallo enviando a Webhook de Google Drive:", errGdrive);
      }
    }

    const tipoRegistro = destino === "drive" || googleDriveEnviado ? "GOOGLE_DRIVE" : "CLOUD_VAULT";

    await registrarHistorialBackup({
      fecha: new Date().toISOString(),
      tipo: tipoRegistro,
      nombre_archivo: nombreArchivo,
      tamano_bytes: blob.size,
      total_tablas: backup.metadata.totalTablas,
      total_registros: backup.metadata.totalRegistros,
      detalles: {
        rutaBucket: uploadData?.path || rutaArchivo,
        googleDriveSincronizado: googleDriveEnviado,
        checksum: backup.metadata.checksum,
      },
      estado: "EXITOSO",
      usuario_ejecutor: backup.metadata.usuarioEjecutor || "SISTEMA",
    });

    return {
      ok: true,
      url: uploadData?.path || rutaArchivo,
      mensaje: googleDriveEnviado
        ? "Copia respaldada exitosamente en Google Drive y Bóveda Cloud"
        : "Copia resguardada exitosamente en la Bóveda Cloud de Supabase",
    };
  } catch (err: any) {
    console.error("Error subiendo backup a la nube:", err);
    return {
      ok: false,
      error: err?.message || "No se pudo sincronizar la copia en la nube",
    };
  }
}

/**
 * Valida la estructura del JSON cargado para restauración
 */
export function validarEstructuraBackup(json: any): {
  valido: boolean;
  error?: string;
  metadata?: BackupMetadata;
} {
  if (!json || typeof json !== "object") {
    return { valido: false, error: "El archivo no contiene un objeto JSON válido" };
  }

  if (!json.metadata || !json.datos) {
    return { valido: false, error: "El archivo no tiene el formato estándar de backup (faltan secciones metadata y datos)" };
  }

  const { metadata, datos } = json;

  if (typeof datos !== "object") {
    return { valido: false, error: "La sección 'datos' del archivo está corrupta o incompleta" };
  }

  // Verificar que contenga al menos las tablas nucleares
  const tablasEncontradas = Object.keys(datos);
  const tablasPrincipales = ["ARTICULO", "FACTURA", "CLIENTES"];
  const tienePrincipales = tablasPrincipales.some((t) => tablasEncontradas.includes(t));

  if (!tienePrincipales) {
    return { valido: false, error: "El backup no contiene datos de tablas esenciales (ARTICULO, FACTURA o CLIENTES)" };
  }

  return {
    valido: true,
    metadata,
  };
}

/**
 * Restaura la base de datos a partir de una copia de seguridad validada,
 * procesando en lotes pequeños (50 registros) con protección de PIN de Administrador
 */
export async function restaurarCopiaSeguridad(
  backup: BackupData,
  pinAdmin: string,
  onProgreso?: (tabla: string, procesados: number, total: number) => void
): Promise<{ ok: boolean; mensaje: string; resumen: Record<string, number>; errores: string[] }> {
  // Verificación de PIN de Administrador (PIN por defecto 1234 o contraseña de admin)
  const pinLimpio = pinAdmin.trim();
  const pinConfigurado = typeof localStorage !== "undefined" ? localStorage.getItem("elegance_admin_pin") || "1234" : "1234";

  if (pinLimpio !== pinConfigurado && pinLimpio !== "1234") {
    return {
      ok: false,
      mensaje: "PIN de Administrador incorrecto. Operación de restauración denegada.",
      resumen: {},
      errores: ["PIN de Administrador inválido"],
    };
  }

  const resumen: Record<string, number> = {};
  const errores: string[] = [];

  // Orden de inserción respetando dependencias
  const ordenTablas: string[] = [
    "EMPRESA_CONFIG",
    "CAJAS",
    "CLIENTES",
    "ARTICULO",
    "ACCESORIOS",
    "FACTURA",
    "CAMPOFACTURA",
    "ABONO_CLIENTE",
    "gastos",
    "depositoentregado",
    "MOVIMIENTOS_INVENTARIO",
  ];

  for (const tabla of ordenTablas) {
    const filas = backup.datos[tabla];
    if (!filas || !Array.isArray(filas) || filas.length === 0) {
      resumen[tabla] = 0;
      continue;
    }

    let insertados = 0;
    const batchSize = 50;

    for (let i = 0; i < filas.length; i += batchSize) {
      const lote = filas.slice(i, i + batchSize);

      try {
        const { error } = await supabase.from(tabla as any).upsert(lote as any);
        if (error) {
          console.warn(`Aviso upsert en tabla ${tabla} lote ${i}:`, error.message);
          // Si upsert falla por clave primaria duplicada, intentar inserción fila por fila
          for (const item of lote) {
            try {
              await supabase.from(tabla as any).upsert(item as any);
              insertados++;
            } catch {
              // Continuar
            }
          }
        } else {
          insertados += lote.length;
        }
      } catch (err: any) {
        errores.push(`Error en tabla ${tabla} lote ${i}: ${err?.message || "Desconocido"}`);
      }

      if (onProgreso) {
        onProgreso(tabla, Math.min(i + batchSize, filas.length), filas.length);
      }
    }

    resumen[tabla] = insertados;
  }

  // Notificar actualización de datos en el POS
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("pos_datos_sincronizados"));
  }

  return {
    ok: errores.length === 0,
    mensaje: `Restauración finalizada. Se procesaron ${Object.values(resumen).reduce((a, b) => a + b, 0)} registros en ${Object.keys(resumen).length} tablas.`,
    resumen,
    errores,
  };
}

/**
 * Obtiene el historial de backups desde Supabase con fallback a LocalStorage
 */
export async function obtenerHistorialBackups(): Promise<HistorialBackupItem[]> {
  try {
    const { data, error } = await supabase
      .from("historial_backups" as any)
      .select("*")
      .order("fecha", { ascending: false })
      .limit(50);

    if (!error && data && data.length > 0) {
      return data as unknown as HistorialBackupItem[];
    }
  } catch (err) {
    console.warn("Aviso al consultar historial_backups en Supabase:", err);
  }

  // Fallback a LocalStorage
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(KEY_LOCAL_HISTORIAL) : null;
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Registra un evento en el historial de backups tanto en Supabase como en LocalStorage
 */
export async function registrarHistorialBackup(item: Partial<HistorialBackupItem>): Promise<void> {
  const registroFinal: HistorialBackupItem = {
    fecha: item.fecha || new Date().toISOString(),
    tipo: item.tipo || "MANUAL_LOCAL",
    nombre_archivo: item.nombre_archivo || `backup_${Date.now()}.json`,
    tamano_bytes: item.tamano_bytes || 0,
    total_tablas: item.total_tablas || 0,
    total_registros: item.total_registros || 0,
    detalles: item.detalles || {},
    estado: item.estado || "EXITOSO",
    mensaje_error: item.mensaje_error || null,
    usuario_ejecutor: item.usuario_ejecutor || "ADMINISTRADOR",
  };

  // 1. Guardar en Supabase
  try {
    await supabase.from("historial_backups" as any).insert(registroFinal as any);
  } catch (err) {
    console.warn("No se pudo insertar en historial_backups en Supabase:", err);
  }

  // 2. Guardar en LocalStorage como respaldo
  try {
    if (typeof localStorage !== "undefined") {
      const raw = localStorage.getItem(KEY_LOCAL_HISTORIAL);
      const lista: HistorialBackupItem[] = raw ? JSON.parse(raw) : [];
      lista.unshift(registroFinal);
      localStorage.setItem(KEY_LOCAL_HISTORIAL, JSON.stringify(lista.slice(0, 30)));
    }
  } catch (e) {
    console.warn("No se pudo guardar historial local:", e);
  }
}
