import { supabase } from "@/integrations/supabase/client";
import type { Factura, CampoFactura, DepositoEntregado } from "@/types/database.types";
import { guardarEstadoPrendaOverride, type EstadoPrenda } from "./movimientosService";

export interface ItemDevolucionInfo {
  id: string | number;
  codigoBarras: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  valorAlquiler: number;
  valorDeposito: number;
  total: number;
  estadoActual: EstadoPrenda;
  seleccionadoParaDevolver: boolean;
  condicionPrenda: "EXCELENTE" | "BUENO" | "MANCHADO" | "DANADO" | "INCOMPLETO";
}

export interface FacturaDevolucionDetalle {
  factura: Factura;
  items: ItemDevolucionInfo[];
  totalAlquiler: number;
  totalDepositoOriginal: number;
  totalDepositoYaDevuelto: number;
  depositoDisponible: number;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteDireccion: string;
  fechaSalida: string;
  fechaEntregaPactada: string;
}

export interface ParamsRegistroDevolucion {
  numeroFactura: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  itemsDevueltos: {
    codigoBarras: string;
    descripcion: string;
    talla: string;
    cantidad: number;
    valorDeposito: number;
    condicion: string;
  }[];
  depositoOriginalItems: number;
  montoDeduccionPenalidad: number;
  motivoDeduccion?: string;
  montoNetoDevuelto: number;
  formaPago: string;
  cajero: string;
  fecha?: string;
}

export interface ComprobanteDevolucionData {
  numeroComprobante: string;
  numeroFactura: string;
  fecha: string;
  hora: string;
  cajero: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  itemsDevueltos: {
    codigoBarras: string;
    descripcion: string;
    talla: string;
    cantidad: number;
    valorDeposito: number;
    condicion: string;
  }[];
  depositoOriginal: number;
  deduccionPenalidad: number;
  motivoDeduccion?: string;
  totalReintegrado: number;
  formaPago: string;
}

const KEY_LOCAL_DEPOSITOS = "elegance_local_depositos_entregados";

export function getLocalDepositosEntregados(): DepositoEntregado[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_DEPOSITOS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalDepositoEntregado(dep: DepositoEntregado) {
  try {
    const list = getLocalDepositosEntregados();
    list.unshift(dep);
    localStorage.setItem(KEY_LOCAL_DEPOSITOS, JSON.stringify(list));
  } catch (e) {
    console.warn("Error guardando deposito entregado local:", e);
  }
}

// 1. Buscar factura con desglose detallado de prendas y depósitos
export async function buscarFacturaParaDevolucion(
  termino: string
): Promise<FacturaDevolucionDetalle | null> {
  const queryTerm = termino.trim();
  if (!queryTerm) return null;

  try {
    let factura: any = null;

    // Buscar en Supabase
    try {
      const { data, error } = await supabase
        .from("FACTURA" as any)
        .select("*")
        .or(`NUMEROFACT.ilike.%${queryTerm}%,CCLIENTE.ilike.%${queryTerm}%,CCEDULA.ilike.%${queryTerm}%`)
        .order("IDFACTURA", { ascending: false })
        .limit(1);

      if (!error && data && data.length > 0) {
        factura = data[0];
      }
    } catch {}

    // Fallback Local
    if (!factura) {
      const rawLocal = localStorage.getItem("elegance_local_facturas");
      if (rawLocal) {
        const localList: any[] = JSON.parse(rawLocal);
        const q = queryTerm.toLowerCase();
        factura = localList.find(
          (f) =>
            (f.NUMEROFACT && f.NUMEROFACT.toLowerCase().includes(q)) ||
            (f.CCLIENTE && f.CCLIENTE.toLowerCase().includes(q)) ||
            (f.CCEDULA && String(f.CCEDULA).includes(q))
        );
      }
    }

    if (!factura) return null;

    const numFact = factura.NUMEROFACT;

    // 2. Obtener items de la factura
    let camposRaw: any[] = [];
    try {
      const { data } = await supabase
        .from("CAMPOFACTURA" as any)
        .select("*")
        .eq("NUMEROFACT", numFact);
      if (data && data.length > 0) {
        camposRaw = data;
      }
    } catch {}

    // Fallback items en local
    if (camposRaw.length === 0 && factura.items && Array.isArray(factura.items)) {
      camposRaw = factura.items;
    }

    // 3. Consultar depósitos ya devueltos
    let totalYaDevuelto = 0;
    try {
      const { data: depsRaw } = await supabase
        .from("DEPOSITOENTREGADO" as any)
        .select("*")
        .eq("NUMEROFACTURA", numFact);
      if (depsRaw && depsRaw.length > 0) {
        totalYaDevuelto = depsRaw.reduce((acc, d: any) => acc + (Number(d.VALOR) || 0), 0);
      }
    } catch {}

    // Sumar locales
    const localDeps = getLocalDepositosEntregados().filter((d) => d.NUMEROFACTURA === numFact);
    if (localDeps.length > 0 && totalYaDevuelto === 0) {
      totalYaDevuelto = localDeps.reduce((acc, d) => acc + (Number(d.VALOR) || 0), 0);
    }

    // Leer estados override
    let overrides: Record<string, any> = {};
    try {
      const rawOv = localStorage.getItem("elegance_estados_prendas_override");
      if (rawOv) overrides = JSON.parse(rawOv);
    } catch {}

    const totalDepFactura = Number(factura.FTOTALDEPOSITO || 0);

    const items: ItemDevolucionInfo[] = camposRaw.map((c, idx) => {
      const cod = c.BARRAS || "";
      const desc = c.DESCRIPCION || "PRENDA";
      const keyOv = `${numFact}_${cod || desc}`;
      const ov = overrides[keyOv];
      const estadoActual: EstadoPrenda = ov ? ov.estado : "EN ALQUILER";
      const yaDevuelto = estadoActual === "DEVUELTO A TIENDA";

      return {
        id: c.AUTOMATIC || `${numFact}-${idx}`,
        codigoBarras: cod,
        descripcion: desc,
        talla: c.TALLA || "U",
        cantidad: Number(c.CANTIDAD || 1),
        valorAlquiler: Number(c.VALOR || c.TOTALALQUILER || 0),
        valorDeposito: Number(c.VALORDEPOSITO || c.TOTALDEPOSITO || 0),
        total: Number(c.TOTAL || 0),
        estadoActual,
        seleccionadoParaDevolver: !yaDevuelto,
        condicionPrenda: "BUENO",
      };
    });

    const totalAlquiler = Number(factura.FTOTALALQUILER || 0);
    const depositoDisponible = Math.max(0, totalDepFactura - totalYaDevuelto);

    return {
      factura,
      items,
      totalAlquiler,
      totalDepositoOriginal: totalDepFactura,
      totalDepositoYaDevuelto: totalYaDevuelto,
      depositoDisponible,
      clienteNombre: (factura.CCLIENTE || factura.NOMBRE || "CLIENTE GENERAL").trim(),
      clienteCedula: String(factura.CCEDULA || factura.CEDULA || "—"),
      clienteTelefono: factura.CTELEFONO || factura.CTELEFONO1 || factura.TELEFONO || "—",
      clienteDireccion: factura.CDIRECCION || factura.DIRECCION || "—",
      fechaSalida: factura.FECHASALIDA || new Date().toISOString().split("T")[0],
      fechaEntregaPactada: factura.FECHAENTRADA || factura.FECHAENTREGA || factura.FECHASALIDA || "",
    };
  } catch (err) {
    console.error("Error buscando factura para devolución:", err);
    return null;
  }
}

// 2. Registrar la devolución oficial de prendas y el reintegro de depósito al cliente
export async function registrarDevolucionCompleta(
  params: ParamsRegistroDevolucion
): Promise<{ ok: boolean; comprobante: ComprobanteDevolucionData | null }> {
  try {
    const fechaHoy = params.fecha || new Date().toISOString().split("T")[0];
    const horaActual = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const numComprobante = `DEV-${Date.now().toString().slice(-6)}`;

    // A. Registrar en DEPOSITOENTREGADO (egreso de dinero devuelto al cliente)
    const depData: DepositoEntregado = {
      NUMEROFACTURA: params.numeroFactura,
      VALOR: params.montoNetoDevuelto,
      FECHA: fechaHoy,
    };

    try {
      await supabase.from("DEPOSITOENTREGADO" as any).insert(depData);
    } catch (e) {
      console.warn("Fallo guardando en tabla DEPOSITOENTREGADO Supabase:", e);
    }
    saveLocalDepositoEntregado(depData);

    // B. Actualizar estado de las prendas devueltas a "DEVUELTO A TIENDA" y reponer stock
    for (const item of params.itemsDevueltos) {
      guardarEstadoPrendaOverride(params.numeroFactura, item.codigoBarras, item.descripcion, "DEVUELTO A TIENDA");

      // Reponer Stock en ARTICULO
      try {
        let query = supabase.from("ARTICULO" as any).select("*");
        if (item.codigoBarras) {
          query = query.eq("CODBARRAS", item.codigoBarras);
        } else if (item.descripcion) {
          query = query.eq("DESCRIPCION", item.descripcion);
        }
        const { data: artRaw } = await query.maybeSingle();
        const art = artRaw as any;
        if (art) {
          await supabase
            .from("ARTICULO" as any)
            .update({ STOCK: (Number(art.STOCK) || 0) + item.cantidad })
            .eq("IDARTICULO", art.IDARTICULO);
        }
      } catch {}
    }

    // C. Preparar datos del comprobante de devolución
    const comprobante: ComprobanteDevolucionData = {
      numeroComprobante: numComprobante,
      numeroFactura: params.numeroFactura,
      fecha: fechaHoy,
      hora: horaActual,
      cajero: params.cajero,
      clienteNombre: params.clienteNombre,
      clienteCedula: params.clienteCedula,
      clienteTelefono: params.clienteTelefono,
      itemsDevueltos: params.itemsDevueltos,
      depositoOriginal: params.depositoOriginalItems,
      deduccionPenalidad: params.montoDeduccionPenalidad,
      motivoDeduccion: params.motivoDeduccion,
      totalReintegrado: params.montoNetoDevuelto,
      formaPago: params.formaPago,
    };

    return { ok: true, comprobante };
  } catch (err) {
    console.error("Error al registrar devolución completa:", err);
    return { ok: false, comprobante: null };
  }
}
