import { supabase } from "@/integrations/supabase/client";
import type { Caja } from "@/types/database.types";

// ==========================================
// INTERFACES Y MODELOS
// ==========================================

export interface EmpresaConfig {
  nombreComercial: string;
  razonSocial: string;
  nit: string;
  direccion: string;
  ciudad: string;
  telefono1: string;
  telefono2: string;
  email: string;
  regimen: string;
  mensajePieFactura: string;
  terminosAlquiler: string;
  logoUrl: string;
  moneda: string;
  simboloMoneda: string;
  diasAlquilerDefault: number;
}

export interface CajaDetalle extends Caja {
  DESCRIPCION_UBICACION?: string;
  ACTIVA?: boolean;
}

export interface TerminalConfig {
  idCajaAsignada: number;
  nombreCaja: string;
  prefijo: string;
  nombreEquipo: string;
  tamanoPapel: "80mm" | "58mm" | "carta";
}

export interface ResolucionConfig {
  modo: "compacta" | "estandar" | "hd" | "tactil" | "personalizada";
  escalaPorcentaje: number; // Ej: 85, 90, 100, 110, 125
  forzarPantallaCompleta: boolean;
}

// ==========================================
// VALORES POR DEFECTO
// ==========================================

export const EMPRESA_DEFAULT: EmpresaConfig = {
  nombreComercial: "LA CASA DEL DISFRAZ",
  razonSocial: "LA CASA DEL DISFRAZ S.A.S.",
  nit: "900.123.456-7",
  direccion: "Calle Principal # 10 - 25",
  ciudad: "Cali, Colombia",
  telefono1: "315 123 4567",
  telefono2: "320 765 4321",
  email: "contacto@lacasadeldisfraz.com",
  regimen: "Régimen Simplificado / No Responsable de IVA",
  mensajePieFactura: "¡Gracias por su preferencia! Conserve este recibo para la devolución de su prenda y depósito.",
  terminosAlquiler: "El traje debe ser devuelto en la fecha pactada en perfecto estado. Todo retraso causará cobro adicional por día.",
  logoUrl: "",
  moneda: "COP",
  simboloMoneda: "$",
  diasAlquilerDefault: 3,
};

export const CAJAS_INICIALES: CajaDetalle[] = [
  { IDCAJAS: 1, NOMBRECAJA: "SERVIDOR", NUMERACION: 124, PREFIJO: "G", DESCRIPCION_UBICACION: "Caja Principal / Servidor", ACTIVA: true },
  { IDCAJAS: 2, NOMBRECAJA: "CAJA 2", NUMERACION: 50, PREFIJO: "POS2-", DESCRIPCION_UBICACION: "Mostrador Entrada", ACTIVA: true },
  { IDCAJAS: 3, NOMBRECAJA: "CAJA 3", NUMERACION: 10, PREFIJO: "POS3-", DESCRIPCION_UBICACION: "Mostrador Vestidores / Bodega", ACTIVA: true },
];

export const TERMINAL_DEFAULT: TerminalConfig = {
  idCajaAsignada: 1,
  nombreCaja: "SERVIDOR",
  prefijo: "G",
  nombreEquipo: "PC-PRINCIPAL-01",
  tamanoPapel: "80mm",
};

export const RESOLUCION_DEFAULT: ResolucionConfig = {
  modo: "estandar",
  escalaPorcentaje: 100,
  forzarPantallaCompleta: false,
};

// ==========================================
// CLAVES DE LOCALSTORAGE
// ==========================================
const KEY_EMPRESA = "elegance_empresa_config";
const KEY_CAJAS = "elegance_lista_cajas";
const KEY_TERMINAL_ACTUAL = "elegance_terminal_local_config";
const KEY_RESOLUCION = "elegance_resolucion_config";

// ==========================================
// SERVICIO DE CONFIGURACIÓN DE EMPRESA
// ==========================================

export async function obtenerConfiguracionEmpresa(): Promise<EmpresaConfig> {
  try {
    // 1. Intentar consultar desde Supabase
    const { data, error } = await supabase
      .from("EMPRESA_CONFIG" as any)
      .select("*")
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      const cfg: EmpresaConfig = {
        nombreComercial: (data as any).NOMBRE_COMERCIAL || EMPRESA_DEFAULT.nombreComercial,
        razonSocial: (data as any).RAZON_SOCIAL || EMPRESA_DEFAULT.razonSocial,
        nit: (data as any).NIT || EMPRESA_DEFAULT.nit,
        direccion: (data as any).DIRECCION || EMPRESA_DEFAULT.direccion,
        ciudad: (data as any).CIUDAD || EMPRESA_DEFAULT.ciudad,
        telefono1: (data as any).TELEFONO1 || EMPRESA_DEFAULT.telefono1,
        telefono2: (data as any).TELEFONO2 || EMPRESA_DEFAULT.telefono2,
        email: (data as any).EMAIL || EMPRESA_DEFAULT.email,
        regimen: (data as any).REGIMEN || EMPRESA_DEFAULT.regimen,
        mensajePieFactura: (data as any).MENSAJE_PIE || EMPRESA_DEFAULT.mensajePieFactura,
        terminosAlquiler: (data as any).TERMINOS || EMPRESA_DEFAULT.terminosAlquiler,
        logoUrl: (data as any).LOGO_URL || EMPRESA_DEFAULT.logoUrl,
        moneda: (data as any).MONEDA || EMPRESA_DEFAULT.moneda,
        simboloMoneda: (data as any).SIMBOLO_MONEDA || EMPRESA_DEFAULT.simboloMoneda,
        diasAlquilerDefault: (data as any).DIAS_ALQUILER || EMPRESA_DEFAULT.diasAlquilerDefault,
      };
      localStorage.setItem(KEY_EMPRESA, JSON.stringify(cfg));
      return cfg;
    }
  } catch (e) {
    console.warn("Fallo lectura de empresa en Supabase, usando respaldo local:", e);
  }

  // 2. Respaldo LocalStorage
  try {
    const raw = localStorage.getItem(KEY_EMPRESA);
    if (raw) {
      return { ...EMPRESA_DEFAULT, ...JSON.parse(raw) };
    }
  } catch {}

  return EMPRESA_DEFAULT;
}

export async function guardarConfiguracionEmpresa(cfg: EmpresaConfig): Promise<boolean> {
  try {
    // Guardar en LocalStorage de inmediato
    localStorage.setItem(KEY_EMPRESA, JSON.stringify(cfg));

    // Intentar guardar en Supabase si la tabla existe
    try {
      await supabase.from("EMPRESA_CONFIG" as any).upsert({
        ID: 1,
        NOMBRE_COMERCIAL: cfg.nombreComercial,
        RAZON_SOCIAL: cfg.razonSocial,
        NIT: cfg.nit,
        DIRECCION: cfg.direccion,
        CIUDAD: cfg.ciudad,
        TELEFONO1: cfg.telefono1,
        TELEFONO2: cfg.telefono2,
        EMAIL: cfg.email,
        REGIMEN: cfg.regimen,
        MENSAJE_PIE: cfg.mensajePieFactura,
        TERMINOS: cfg.terminosAlquiler,
        LOGO_URL: cfg.logoUrl,
        MONEDA: cfg.moneda,
        SIMBOLO_MONEDA: cfg.simboloMoneda,
        DIAS_ALQUILER: cfg.diasAlquilerDefault,
      });
    } catch (err) {
      console.warn("No se pudo sincronizar EMPRESA_CONFIG en Supabase:", err);
    }

    return true;
  } catch (e) {
    console.error("Error guardando empresa:", e);
    return false;
  }
}

// ==========================================
// SERVICIO DE MULTI-CAJAS
// ==========================================

export async function listarCajas(): Promise<CajaDetalle[]> {
  try {
    // 1. Consultar en Supabase
    const { data, error } = await supabase.from("CAJAS" as any).select("*").order("IDCAJAS");
    if (!error && data && data.length > 0) {
      const cajasSupabase: CajaDetalle[] = (data as any[]).map((c) => ({
        IDCAJAS: c.IDCAJAS,
        NOMBRECAJA: c.NOMBRECAJA || `CAJA ${c.IDCAJAS}`,
        NUMERACION: Number(c.NUMERACION) || 0,
        PREFIJO: c.PREFIJO || "G",
        RESOLUCION: c.RESOLUCION || "1366x768",
        DESCRIPCION_UBICACION: c.DESCRIPCION_UBICACION || `Puesto de atención #${c.IDCAJAS}`,
        ACTIVA: c.ACTIVA !== false,
      }));

      localStorage.setItem(KEY_CAJAS, JSON.stringify(cajasSupabase));
      return cajasSupabase;
    }
  } catch (e) {
    console.warn("Error consultando CAJAS en Supabase:", e);
  }

  // 2. Respaldo LocalStorage
  try {
    const raw = localStorage.getItem(KEY_CAJAS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {}

  // 3. Fallback a Cajas Iniciales
  localStorage.setItem(KEY_CAJAS, JSON.stringify(CAJAS_INICIALES));
  return CAJAS_INICIALES;
}

export async function guardarCaja(caja: Partial<CajaDetalle>): Promise<CajaDetalle> {
  const cajas = await listarCajas();
  let cajaGuardada: CajaDetalle;

  if (caja.IDCAJAS && caja.IDCAJAS > 0) {
    const idx = cajas.findIndex((c) => c.IDCAJAS === caja.IDCAJAS);
    if (idx >= 0) {
      cajas[idx] = { ...cajas[idx], ...caja } as CajaDetalle;
      cajaGuardada = cajas[idx];
    } else {
      cajaGuardada = {
        IDCAJAS: caja.IDCAJAS,
        NOMBRECAJA: caja.NOMBRECAJA || `CAJA ${caja.IDCAJAS}`,
        NUMERACION: caja.NUMERACION ?? 1,
        PREFIJO: caja.PREFIJO || "G",
        ACTIVA: true,
        ...caja,
      };
      cajas.push(cajaGuardada);
    }
  } else {
    const maxId = cajas.reduce((max, c) => Math.max(max, c.IDCAJAS || 0), 0);
    cajaGuardada = {
      IDCAJAS: maxId + 1,
      NOMBRECAJA: caja.NOMBRECAJA || `CAJA ${maxId + 1}`,
      NUMERACION: caja.NUMERACION ?? 1,
      PREFIJO: caja.PREFIJO || `POS${maxId + 1}-`,
      DESCRIPCION_UBICACION: caja.DESCRIPCION_UBICACION || "Puesto nuevo",
      ACTIVA: true,
      ...caja,
    };
    cajas.push(cajaGuardada);
  }

  // Guardar en LocalStorage
  localStorage.setItem(KEY_CAJAS, JSON.stringify(cajas));

  // Intentar sincronizar en Supabase
  try {
    await supabase.from("CAJAS" as any).upsert({
      IDCAJAS: cajaGuardada.IDCAJAS,
      NOMBRECAJA: cajaGuardada.NOMBRECAJA,
      NUMERACION: cajaGuardada.NUMERACION,
      PREFIJO: cajaGuardada.PREFIJO,
      RESOLUCION: cajaGuardada.RESOLUCION || "1366x768",
    });
  } catch (e) {
    console.warn("Fallo sincronizando caja en Supabase:", e);
  }

  return cajaGuardada;
}

export async function eliminarCaja(idCaja: number): Promise<boolean> {
  try {
    const cajas = await listarCajas();
    const filtradas = cajas.filter((c) => c.IDCAJAS !== idCaja);
    localStorage.setItem(KEY_CAJAS, JSON.stringify(filtradas));

    try {
      await supabase.from("CAJAS" as any).delete().eq("IDCAJAS", idCaja);
    } catch {}

    return true;
  } catch (e) {
    console.error("Error eliminando caja:", e);
    return false;
  }
}

// ==========================================
// SERVICIO DE TERMINAL / ASIGNACIÓN DE ESTA PC
// ==========================================

export function obtenerTerminalConfig(): TerminalConfig {
  try {
    const raw = localStorage.getItem(KEY_TERMINAL_ACTUAL);
    if (raw) {
      return { ...TERMINAL_DEFAULT, ...JSON.parse(raw) };
    }
  } catch {}
  return TERMINAL_DEFAULT;
}

export function guardarTerminalConfig(config: TerminalConfig): void {
  try {
    localStorage.setItem(KEY_TERMINAL_ACTUAL, JSON.stringify(config));
  } catch (e) {
    console.error("Error guardando terminal local:", e);
  }
}

// ==========================================
// SERVICIO DE RESOLUCIÓN Y ESCALA DE PANTALLA
// ==========================================

export function obtenerResolucionConfig(): ResolucionConfig {
  try {
    const raw = localStorage.getItem(KEY_RESOLUCION);
    if (raw) {
      return { ...RESOLUCION_DEFAULT, ...JSON.parse(raw) };
    }
  } catch {}
  return RESOLUCION_DEFAULT;
}

export function aplicarEscalaResolucion(config: ResolucionConfig): void {
  try {
    localStorage.setItem(KEY_RESOLUCION, JSON.stringify(config));

    let zoomFactor = 1;
    switch (config.modo) {
      case "compacta":
        zoomFactor = 0.85; // 85% para pantallas de 1024x768 o portátiles pequeños
        break;
      case "estandar":
        zoomFactor = 1.0; // 100% estándar
        break;
      case "hd":
        zoomFactor = 1.15; // 115% para monitores grandes 1080p o 2K/4K
        break;
      case "tactil":
        zoomFactor = 1.1; // 110% con elementos más amplios para touch
        break;
      case "personalizada":
        zoomFactor = Math.max(0.6, Math.min(1.5, (config.escalaPorcentaje || 100) / 100));
        break;
      default:
        zoomFactor = 1.0;
    }

    const root = document.documentElement;
    if (root) {
      // Aplicar zoom en CSS a la raíz para un escalado nítido
      (root.style as any).zoom = `${zoomFactor}`;
      root.style.setProperty("--app-zoom", `${zoomFactor}`);
    }
  } catch (e) {
    console.error("Error aplicando escala de resolución:", e);
  }
}
