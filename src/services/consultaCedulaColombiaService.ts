import { supabase } from "@/integrations/supabase/client";
import type { Cliente } from "@/types/database.types";
import { buscarClientePorCedula } from "./posService";

export interface ResultadoConsultaCedula {
  encontrado: boolean;
  origen: "LOCAL_DB" | "RUT_DIAN" | "API_EXTERNA" | "NO_ENCONTRADO";
  cliente?: Partial<Cliente>;
  nombreCompleto?: string;
  digitoVerificacion?: string;
  estado?: string;
  ciudad?: string;
  mensaje?: string;
}

// Clave para guardar configuración opcional de API externa personalizada
const KEY_API_CONFIG = "elegance_api_cedula_colombia_config";

export interface ApiCedulaConfig {
  proveedor: "AUTOMATICO" | "VERIFIK" | "PLACAPI" | "APITUDE" | "DIRECTO";
  apiKey?: string;
}

export function obtenerConfigApiCedula(): ApiCedulaConfig {
  try {
    const raw = localStorage.getItem(KEY_API_CONFIG);
    return raw ? JSON.parse(raw) : { proveedor: "AUTOMATICO" };
  } catch {
    return { proveedor: "AUTOMATICO" };
  }
}

export function guardarConfigApiCedula(cfg: ApiCedulaConfig) {
  try {
    localStorage.setItem(KEY_API_CONFIG, JSON.stringify(cfg));
  } catch (e) {
    console.warn("Error guardando config api cedula:", e);
  }
}

/**
 * Consulta un número de cédula o NIT en Colombia:
 * 1. Primero busca en la base de datos interna de clientes (Supabase / Local).
 * 2. Si no existe, consulta servicios de verificación de RUT / DIAN / RUES / APIs colombianas.
 */
export async function consultarCedulaColombia(
  cedulaRaw: string | number
): Promise<ResultadoConsultaCedula> {
  const cedulaStr = String(cedulaRaw || "").trim().replace(/\D/g, "");
  if (!cedulaStr || cedulaStr.length < 4) {
    return {
      encontrado: false,
      origen: "NO_ENCONTRADO",
      mensaje: "Número de documento inválido o muy corto",
    };
  }

  const cedulaNum = parseInt(cedulaStr, 10);

  // PASO 1: Buscar en la base de datos interna de la tienda
  try {
    const clienteLocal = await buscarClientePorCedula(cedulaNum);
    if (clienteLocal && clienteLocal.NOMBRE) {
      return {
        encontrado: true,
        origen: "LOCAL_DB",
        cliente: clienteLocal,
        nombreCompleto: clienteLocal.NOMBRE,
        mensaje: `Cliente existente en la tienda: ${clienteLocal.NOMBRE}`,
      };
    }
  } catch (e) {
    console.warn("Error buscando en base de datos local:", e);
  }

  // PASO 2: Si el usuario configuró una API Key de Verifik / PlacApi / Apitude
  const config = obtenerConfigApiCedula();

  if (config.apiKey && config.apiKey.trim() !== "") {
    try {
      if (config.proveedor === "VERIFIK") {
        const resp = await fetch(
          `https://api.verifik.co/v2/co/cedula?documentType=CC&documentNumber=${cedulaStr}`,
          {
            headers: {
              Authorization: `Bearer ${config.apiKey.trim()}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (resp.ok) {
          const json = await resp.json();
          const data = json.data || json;
          const nombreCompleto = (
            data.fullName ||
            `${data.firstName || ""} ${data.middleName || ""} ${data.lastName || ""} ${data.secondLastName || ""}`
          ).trim().toUpperCase();

          if (nombreCompleto) {
            return {
              encontrado: true,
              origen: "API_EXTERNA",
              nombreCompleto,
              ciudad: data.city || data.department || "",
              cliente: {
                CEDULA: cedulaNum,
                NOMBRE: nombreCompleto,
                DIRECCION: data.city ? `${data.city}, ${data.department || ""}`.trim() : "",
                NOTA: "Datos validados vía Verifik",
              },
              mensaje: `Nombre verificado: ${nombreCompleto}`,
            };
          }
        }
      } else if (config.proveedor === "PLACAPI") {
        const resp = await fetch("https://api.placapi.com/v1/colombia/cedula", {
          method: "POST",
          headers: {
            "x-api-key": config.apiKey.trim(),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ documento: cedulaStr }),
        });
        if (resp.ok) {
          const json = await resp.json();
          const nombreCompleto = String(json.nombre_completo || json.nombre || "").trim().toUpperCase();
          if (nombreCompleto) {
            return {
              encontrado: true,
              origen: "API_EXTERNA",
              nombreCompleto,
              cliente: {
                CEDULA: cedulaNum,
                NOMBRE: nombreCompleto,
                NOTA: "Datos validados vía PlacApi",
              },
              mensaje: `Nombre verificado: ${nombreCompleto}`,
            };
          }
        }
      }
    } catch (e) {
      console.warn("Fallo consulta a API externa de identidad:", e);
    }
  }

  // PASO 3: Consulta mediante el servicio de RUES / RUT de Nubixa (utilizado en E:\nubixadian)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    const resp = await fetch("https://api.consultarutxyz.misimpuestosco.com/api/rues/bulk-lookup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ nits: [cedulaStr] }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (resp.ok) {
      const data = await resp.json();
      const info = data.results && data.results[cedulaStr];

      if (info && (info.razonSocial || info.nombre)) {
        const razonSocial = String(info.razonSocial || info.nombre || "").trim().toUpperCase();
        const direccion = String(info.direccion || "").trim().toUpperCase();
        const ciudad = String(info.municipio || info.ciudad || "").trim().toUpperCase();
        const departamento = String(info.departamento || "").trim().toUpperCase();
        const correo = String(info.correo || info.email || "").trim().toLowerCase();
        const telefono = String(info.telefono || "").trim();

        return {
          encontrado: true,
          origen: "RUT_DIAN",
          nombreCompleto: razonSocial,
          ciudad: ciudad ? (departamento ? `${ciudad}, ${departamento}` : ciudad) : undefined,
          cliente: {
            CEDULA: cedulaNum,
            NOMBRE: razonSocial,
            DIRECCION: direccion || (ciudad ? `${ciudad}` : ""),
            TELEFONO: telefono ? parseInt(telefono.replace(/\D/g, ""), 10) : undefined,
            EMAIL: correo || undefined,
            NOTA: `Registro oficial RUES/RUT (${info.categoria || "Consultado en línea"})`,
          },
          mensaje: `Encontrado en RUES / RUT: ${razonSocial}`,
        };
      }
    }
  } catch (e) {
    console.warn("Fallo consulta al servicio RUES / RUT:", e);
  }

  // PASO 4: Fallback adicional a otros endpoints públicos de RUT DIAN
  try {
    const urlDian = `https://api.diancolombia.online/consulta-rut?nit=${cedulaStr}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    try {
      const resp = await fetch(urlDian, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      clearTimeout(timeoutId);

      if (resp.ok) {
        const data = await resp.json();
        const razonSocial = (
          data.razon_social ||
          data.nombre_completo ||
          `${data.primer_nombre || ""} ${data.otros_nombres || ""} ${data.primer_apellido || ""} ${data.segundo_apellido || ""}`
        ).trim().toUpperCase();

        if (razonSocial && razonSocial.length > 2) {
          return {
            encontrado: true,
            origen: "RUT_DIAN",
            nombreCompleto: razonSocial,
            digitoVerificacion: data.dv ? String(data.dv) : undefined,
            estado: data.estado || "ACTIVO",
            cliente: {
              CEDULA: cedulaNum,
              NOMBRE: razonSocial,
              NOTA: "Consultado en registro oficial RUT / DIAN",
            },
            mensaje: `Encontrado en RUT / DIAN: ${razonSocial}`,
          };
        }
      }
    } catch {}
  } catch (e) {
    console.warn("Fallo consulta alternativa DIAN / RUT:", e);
  }

  return {
    encontrado: false,
    origen: "NO_ENCONTRADO",
    cliente: {
      CEDULA: cedulaNum,
    },
    mensaje: "Cédula no encontrada en bases de datos. Digita los datos manualmente.",
  };
}
