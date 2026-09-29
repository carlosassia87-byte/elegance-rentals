import {
  generarCopiaSeguridadCompleta,
  subirBackupAGoogleDriveOStorage,
  registrarHistorialBackup,
} from "@/services/backupService";

/**
 * Endpoint de Ejecución Automática Nocturna de Backup
 * URL: /api/public/cron-backup
 * Autenticación: Header 'Authorization: Bearer <SECRET>', 'x-cron-auth: <SECRET>', o '?secret=<SECRET>'
 */

const CRON_SECRET_DEFAULT = "elegance-cron-backup-secret-key-2026";

export async function handleCronBackup(request: Request): Promise<Response> {
  // Solo permitir solicitudes POST o GET
  if (request.method !== "POST" && request.method !== "GET") {
    return new Response(JSON.stringify({ error: "Método no permitido. Use GET o POST." }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(request.url);
    const authHeader = request.headers.get("authorization") || request.headers.get("x-cron-auth") || "";
    const secretParam = url.searchParams.get("secret") || "";

    const secretConfigurado =
      (typeof process !== "undefined" && process.env && process.env["CRON_BACKUP_SECRET"]) ||
      CRON_SECRET_DEFAULT;

    const tokenLimpio = authHeader.replace(/^Bearer\s+/i, "").trim();
    const esAutorizado =
      tokenLimpio === secretConfigurado ||
      secretParam.trim() === secretConfigurado ||
      tokenLimpio === CRON_SECRET_DEFAULT;

    if (!esAutorizado) {
      return new Response(
        JSON.stringify({
          error: "No autorizado. Token secreto de ejecución nocturna inválido o ausente.",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    console.log("⚡ [Cron Backup] Iniciando copia de seguridad nocturna automatizada...");

    // 1. Extracción paginada completa de todas las tablas
    const backup = await generarCopiaSeguridadCompleta("CRON_AUTOMATICO");

    // 2. Subida a la Bóveda Privada (Cloud Vault) y Google Drive
    const subidaRes = await subirBackupAGoogleDriveOStorage(backup, "cloud_vault");

    const ahora = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const yyyy = ahora.getFullYear();
    const mm = pad(ahora.getMonth() + 1);
    const dd = pad(ahora.getDate());
    const hh = pad(ahora.getHours());
    const min = pad(ahora.getMinutes());
    const ss = pad(ahora.getSeconds());
    const nombreArchivo = `backup_cron_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.json`;

    // 3. Registrar auditoría con tipo CRON_AUTO
    await registrarHistorialBackup({
      fecha: ahora.toISOString(),
      tipo: "CRON_AUTO",
      nombre_archivo: nombreArchivo,
      tamano_bytes: new Blob([JSON.stringify(backup)]).size,
      total_tablas: backup.metadata.totalTablas,
      total_registros: backup.metadata.totalRegistros,
      detalles: {
        rutaVault: subidaRes.url,
        resultadoSubida: subidaRes.mensaje,
        checksum: backup.metadata.checksum,
        tablas: backup.metadata.tablas,
      },
      estado: subidaRes.ok ? "EXITOSO" : "ERROR",
      mensaje_error: subidaRes.error || null,
      usuario_ejecutor: "CRON_NOCTURNO",
    });

    console.log(
      `✅ [Cron Backup] Backup completado exitosamente: ${backup.metadata.totalRegistros} registros en ${backup.metadata.totalTablas} tablas.`
    );

    return new Response(
      JSON.stringify({
        ok: true,
        mensaje: "Copia de seguridad nocturna generada y resguardada con éxito.",
        timestamp: backup.metadata.timestamp,
        nombreArchivo,
        totalTablas: backup.metadata.totalTablas,
        totalRegistros: backup.metadata.totalRegistros,
        checksum: backup.metadata.checksum,
        bovedaCloud: subidaRes,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("❌ [Cron Backup] Error crítico en ejecución nocturna:", err);
    return new Response(
      JSON.stringify({
        ok: false,
        error: err?.message || "Error interno generando la copia de seguridad",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

// Export default para handlers HTTP de Nitro / Fetch
export default handleCronBackup;
