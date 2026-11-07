/**
 * Utilidades de fecha y hora normalizadas para Colombia (UTC-5 / America/Bogota).
 * 
 * Evita el problema crítico de usar `new Date().toISOString().split("T")[0]`
 * que después de las 7:00 PM COT (00:00 UTC) salta al día siguiente,
 * corrompiendo cierres de caja y registros de facturación nocturnos.
 */

const TIMEZONE_COLOMBIA = "America/Bogota";

/**
 * Obtiene la fecha actual en Colombia formateada como "YYYY-MM-DD".
 */
export function obtenerFechaActualColombia(): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE_COLOMBIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(new Date());
  } catch {
    // Fallback defensivo si Intl no soporta timeZone en el runtime
    const now = new Date();
    const cotOffsetMs = 5 * 60 * 60 * 1000;
    const cotDate = new Date(now.getTime() - cotOffsetMs);
    return cotDate.toISOString().split("T")[0];
  }
}

/**
 * Obtiene la hora actual en Colombia formateada como "HH:mm:ss" (24h).
 */
export function obtenerHoraActualColombia(): string {
  try {
    const formatter = new Intl.DateTimeFormat("es-CO", {
      timeZone: TIMEZONE_COLOMBIA,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    return formatter.format(new Date());
  } catch {
    return new Date().toLocaleTimeString("es-CO", { hour12: false });
  }
}

/**
 * Suma o resta días a una fecha base (formato "YYYY-MM-DD") y retorna "YYYY-MM-DD".
 */
export function sumarDiasAFecha(fechaBaseStr: string, dias: number): string {
  try {
    const [y, m, d] = fechaBaseStr.split("-").map(Number);
    if (!y || !m || !d) return obtenerFechaActualColombia();
    const fecha = new Date(Date.UTC(y, m - 1, d));
    fecha.setUTCDate(fecha.getUTCDate() + dias);
    return fecha.toISOString().split("T")[0];
  } catch {
    return obtenerFechaActualColombia();
  }
}
