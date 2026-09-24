import { supabase } from "@/integrations/supabase/client";
import type { Factura, CampoFactura, DepositoEntregado } from "@/types/database.types";
import { guardarEstadoPrendaOverride, type EstadoPrenda } from "./movimientosService";
import { emitirEventoRealtime, invalidarCacheArticulos } from "./posService";

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
  esAnulada: boolean;
  motivoAnulacion?: string;
  totalDineroRecibido: number;
  totalDineroYaReintegrado: number;
  saldoPendientePorDevolver: number;
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

    // 1. PRIORIDAD MÁXIMA: Coincidencia EXACTA por número de factura (NUMEROFACT)
    try {
      const { data, error } = await supabase
        .from("FACTURA" as any)
        .select("*")
        .ilike("NUMEROFACT", queryTerm)
        .limit(1);

      if (!error && data && data.length > 0) {
        factura = data[0];
      }
    } catch {}

    // 2. Si el término es numérico (ej. "2" o "15"), buscar coincidencia exacta por IDFACTURA
    if (!factura && !isNaN(Number(queryTerm))) {
      try {
        const { data, error } = await supabase
          .from("FACTURA" as any)
          .select("*")
          .eq("IDFACTURA", Number(queryTerm))
          .limit(1);

        if (!error && data && data.length > 0) {
          factura = data[0];
        }
      } catch {}
    }

    // 3. Coincidencia exacta por CCEDULA del cliente
    if (!factura) {
      try {
        const { data, error } = await supabase
          .from("FACTURA" as any)
          .select("*")
          .eq("CCEDULA", queryTerm)
          .order("IDFACTURA", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          factura = data[0];
        }
      } catch {}
    }

    // 4. Búsqueda secundaria: si no hubo coincidencia exacta, buscar por prefijo o nombre de cliente
    if (!factura) {
      try {
        const { data, error } = await supabase
          .from("FACTURA" as any)
          .select("*")
          .or(`NUMEROFACT.ilike.${queryTerm}%,CCLIENTE.ilike.%${queryTerm}%`)
          .order("IDFACTURA", { ascending: false })
          .limit(1);

        if (!error && data && data.length > 0) {
          factura = data[0];
        }
      } catch {}
    }

    // 5. Fallback Local con la misma jerarquía estricta
    if (!factura) {
      const rawLocal = localStorage.getItem("elegance_local_facturas");
      if (rawLocal) {
        const localList: any[] = JSON.parse(rawLocal);
        const qUpper = queryTerm.toUpperCase();

        // 5.1 Coincidencia exacta por NUMEROFACT
        factura = localList.find(
          (f) => f.NUMEROFACT && f.NUMEROFACT.trim().toUpperCase() === qUpper
        );

        // 5.2 Coincidencia exacta por IDFACTURA
        if (!factura && !isNaN(Number(queryTerm))) {
          factura = localList.find((f) => Number(f.IDFACTURA) === Number(queryTerm));
        }

        // 5.3 Coincidencia exacta por Cédula
        if (!factura) {
          factura = localList.find(
            (f) => String(f.CCEDULA || f.CEDULA || "").trim() === queryTerm
          );
        }

        // 5.4 Búsqueda parcial por prefijo o cliente
        if (!factura) {
          factura = localList.find(
            (f) =>
              (f.NUMEROFACT && f.NUMEROFACT.trim().toUpperCase().startsWith(qUpper)) ||
              (f.CCLIENTE && f.CCLIENTE.trim().toUpperCase().includes(qUpper))
          );
        }
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
        .from("depositoentregado" as any)
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

    // Detectar si la factura fue ANULADA
    const estadoGen = (factura.ESTADO || "").trim().toUpperCase();
    const estadoCli = (factura.ESTADOCLIENTE || "").trim().toUpperCase();
    const modoFact = (factura.MODO || "").trim().toUpperCase();
    const esAnulada =
      estadoGen === "ANULADA" ||
      estadoGen === "ANULADO" ||
      estadoCli === "ANULADA" ||
      estadoCli === "ANULADO" ||
      modoFact === "ANULADO";

    // Calcular cuánto dinero dio el cliente en total (Pago inicial + Abonos registrados)
    const pagoInicial =
      Number(factura.PAGOCONEFECTIVO || 0) + Number(factura.PAGOCONTRANFERENCIA || 0) ||
      Number(factura.PAGACON || 0);

    let totalAbonos = 0;
    try {
      const { data: abonosData } = await supabase
        .from("ABONO_CLIENTE" as any)
        .select("TOTAL_ABONO")
        .eq("AFACTURA", numFact);
      if (abonosData && abonosData.length > 0) {
        totalAbonos = abonosData.reduce((acc: number, a: any) => acc + (Number(a.TOTAL_ABONO) || 0), 0);
      }
    } catch {}

    if (totalAbonos === 0) {
      const rawLocalAbs = localStorage.getItem("elegance_local_abonos");
      if (rawLocalAbs) {
        const listAbs: any[] = JSON.parse(rawLocalAbs);
        totalAbonos = listAbs
          .filter((a) => String(a.AFACTURA || "").trim().toUpperCase() === numFact.toUpperCase())
          .reduce((acc, a) => acc + (Number(a.TOTAL_ABONO) || 0), 0);
      }
    }

    const totalDineroRecibido = pagoInicial + totalAbonos;
    const totalDineroYaReintegrado = totalYaDevuelto;
    const saldoPendientePorDevolver = Math.max(0, totalDineroRecibido - totalDineroYaReintegrado);

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
      let estadoActual: EstadoPrenda = ov ? ov.estado : "EN ALQUILER";
      if (esAnulada) {
        estadoActual = "ANULADO";
      }
      const yaDevuelto = estadoActual === "DEVUELTO A TIENDA" || estadoActual === "ENTREGADO" || esAnulada;

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
        seleccionadoParaDevolver: esAnulada ? false : !yaDevuelto,
        condicionPrenda: "BUENO",
      };
    });

    const totalAlquiler = Number(factura.FTOTALALQUILER || 0);
    const depositoDisponible = esAnulada ? 0 : Math.max(0, totalDepFactura - totalYaDevuelto);

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
      esAnulada,
      motivoAnulacion: factura.GASTOS || "ANULACIÓN DE FACTURA / APARTADO",
      totalDineroRecibido,
      totalDineroYaReintegrado,
      saldoPendientePorDevolver,
    };
  } catch (err) {
    console.error("Error buscando factura para devolución:", err);
    return null;
  }
}

/**
 * Registra el reintegro de dinero por una factura ANULADA:
 * Registra el egreso en depositoentregado para cuadrar la caja y genera comprobante oficial.
 */
export async function registrarReembolsoAnulacion(params: {
  numeroFactura: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  montoReembolso: number;
  formaPago: string;
  motivo?: string;
  cajero: string;
}): Promise<{ ok: boolean; comprobante: ComprobanteDevolucionData | null; mensaje: string }> {
  try {
    const fechaHoy = new Date().toISOString().split("T")[0];
    const horaActual = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
    const numComprobante = `REM-${Date.now().toString().slice(-6)}`;

    // Registrar egreso en depositoentregado para cuadrar la caja
    const depData: DepositoEntregado = {
      NUMEROFACTURA: params.numeroFactura,
      VALOR: params.montoReembolso,
      FECHA: fechaHoy,
    };

    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        await supabase.from("depositoentregado" as any).insert(depData);
      }
    } catch (e) {
      console.warn("Aviso insertando reembolso en depositoentregado Supabase:", e);
    }
    saveLocalDepositoEntregado(depData);

    const comprobante: ComprobanteDevolucionData = {
      numeroComprobante: numComprobante,
      numeroFactura: params.numeroFactura,
      fecha: fechaHoy,
      hora: horaActual,
      cajero: params.cajero,
      clienteNombre: params.clienteNombre,
      clienteCedula: params.clienteCedula,
      clienteTelefono: params.clienteTelefono,
      itemsDevueltos: [],
      depositoOriginal: params.montoReembolso,
      deduccionPenalidad: 0,
      motivoDeduccion: params.motivo || "REEMBOLSO POR ANULACIÓN DE FACTURA",
      totalReintegrado: params.montoReembolso,
      formaPago: params.formaPago,
    };

    return {
      ok: true,
      comprobante,
      mensaje: `Reembolso por $${params.montoReembolso.toLocaleString("es-CO")} registrado exitosamente.`,
    };
  } catch (err: any) {
    console.error("Error al registrar reembolso por anulación:", err);
    return {
      ok: false,
      comprobante: null,
      mensaje: err?.message || "Error al registrar el reembolso",
    };
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

    let guardadoEnSupabase = false;
    try {
      if (typeof navigator === "undefined" || navigator.onLine) {
        const { error: errDep } = await supabase.from("depositoentregado" as any).insert(depData);
        if (!errDep) guardadoEnSupabase = true;
      }
    } catch (e) {
      console.warn("Fallo guardando en tabla depositoentregado Supabase:", e);
    }
    saveLocalDepositoEntregado(depData);

    // B. Actualizar estado de las prendas devueltas a "DEVUELTO A TIENDA" y reponer stock
    for (const item of params.itemsDevueltos) {
      guardarEstadoPrendaOverride(params.numeroFactura, item.codigoBarras, item.descripcion, "DEVUELTO A TIENDA");

      // Reponer Stock en ACCESORIOS o ARTICULO en Supabase si hay red
      if (guardadoEnSupabase) {
        try {
          if (item.codigoBarras?.startsWith("ACC-")) {
            // Reponer en tabla ACCESORIOS
            const { data: accRaw } = await supabase
              .from("ACCESORIOS" as any)
              .select("*")
              .eq("CODBARRAS", item.codigoBarras)
              .maybeSingle();

            const acc = accRaw as any;
            if (acc) {
              await supabase
                .from("ACCESORIOS" as any)
                .update({ STOCK: (Number(acc.STOCK) || 0) + item.cantidad })
                .eq("IDACCESORIO", acc.IDACCESORIO);
            }
          } else {
            // Reponer en tabla ARTICULO
            let query = supabase.from("ARTICULO" as any).select("*");
            if (item.codigoBarras) {
              query = query.eq("CODBARRAS", item.codigoBarras);
            } else if (item.descripcion) {
              query = query.eq("DESCRIPCION", item.descripcion);
            }
            const { data: artRaw } = await query.maybeSingle();
            const art = artRaw as any;
            if (art) {
              const nuevoStock = (Number(art.STOCK) || 0) + item.cantidad;
              await supabase
                .from("ARTICULO" as any)
                .update({ STOCK: nuevoStock })
                .eq("IDARTICULO", art.IDARTICULO);

              // Emitir actualización de stock a todos los PCs (<50ms)
              emitirEventoRealtime("ARTICULO_ACTUALIZADO", {
                articulo: { ...art, STOCK: nuevoStock },
              });
            }
          }
        } catch (eStock) {
          console.warn("Aviso reponiendo stock en devolución:", eStock);
        }
      }
    }

    // Invalidar caché RAM local para asegurar datos frescos
    invalidarCacheArticulos();

    // B.2. Actualizar estado en la tabla FACTURA a "ENTREGADO" (Devuelto a tienda)
    if (guardadoEnSupabase) {
      try {
        await supabase
          .from("FACTURA" as any)
          .update({
            ESTADOCLIENTE: "ENTREGADO",
          })
          .eq("NUMEROFACT", params.numeroFactura);
      } catch (e) {
        console.warn("Error actualizando estado en FACTURA Supabase:", e);
      }
    }

    // Si no se pudo guardar en Supabase o estamos offline, encolar para sincronización automática
    if (!guardadoEnSupabase) {
      try {
        const { encolarOperacionOffline } = await import("./offlineDbService");
        await encolarOperacionOffline("DEVOLUCION_TRAJE", {
          numeroFact: params.numeroFactura,
          itemsDevueltos: params.itemsDevueltos,
          montoNetoDevuelto: params.montoNetoDevuelto,
          fecha: fechaHoy,
        });
      } catch (e) {
        console.warn("Error encolando devolucion offline:", e);
      }
    }

    // Actualizar factura en respaldo local si aplica
    try {
      const rawLocal = localStorage.getItem("elegance_local_facturas");
      if (rawLocal) {
        const localList: any[] = JSON.parse(rawLocal);
        const idx = localList.findIndex((f) => f.NUMEROFACT === params.numeroFactura);
        if (idx >= 0 && localList[idx]) {
          localList[idx].ESTADOCLIENTE = "ENTREGADO";
          localStorage.setItem("elegance_local_facturas", JSON.stringify(localList));
        }
      }
    } catch {}

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

// 3. Consultar si un cliente tiene trajes actualmente en alquiler y calcular días de retraso & recargos ($15.000/día tras 3 días)
export interface PrendaActivaAlquiler {
  codigoBarras: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  valorDeposito: number;
}

export interface AlquilerActivoClienteInfo {
  numeroFactura: string;
  fechaSalida: string;
  fechaEntregaPactada: string;
  diasTranscurridos: number;
  diasPermitidos: number; // 3 días
  diasRetraso: number; // Max(0, diasTranscurridos - 3)
  costoPorDiaRetraso: number; // $15.000
  recargoTotalRetraso: number; // diasRetraso * 15000
  tieneRetraso: boolean;
  prendas: PrendaActivaAlquiler[];
  totalDepositoRetenido: number;
}

export async function consultarAlquileresActivosCliente(
  cedula: string | number
): Promise<AlquilerActivoClienteInfo[]> {
  const cedulaStr = String(cedula || "").trim();
  if (!cedulaStr || cedulaStr === "0" || cedulaStr === "—") return [];

  try {
    const alquileresActivos: AlquilerActivoClienteInfo[] = [];
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Leer overrides
    let overrides: Record<string, any> = {};
    try {
      const rawOv = localStorage.getItem("elegance_estados_prendas_override");
      if (rawOv) overrides = JSON.parse(rawOv);
    } catch {}

    // Buscar facturas del cliente
    let facturas: any[] = [];
    try {
      const { data, error } = await supabase
        .from("FACTURA" as any)
        .select("*")
        .eq("CCEDULA", cedulaStr)
        .order("IDFACTURA", { ascending: false });

      if (!error && data) {
        facturas = data;
      }
    } catch {}

    // Fallback local
    const rawLocal = localStorage.getItem("elegance_local_facturas");
    if (rawLocal) {
      const localList: any[] = JSON.parse(rawLocal);
      const matched = localList.filter((f) => String(f.CCEDULA || f.CEDULA) === cedulaStr);
      for (const lf of matched) {
        if (!facturas.some((f) => f.NUMEROFACT === lf.NUMEROFACT)) {
          facturas.push(lf);
        }
      }
    }

    for (const f of facturas) {
      if (f.MODO === "VENTA" || f.ESTADOCLIENTE === "VENTA") continue;

      const numFact = f.NUMEROFACT;

      // Obtener items de esta factura
      let camposRaw: any[] = [];
      try {
        const { data: cData } = await supabase
          .from("CAMPOFACTURA" as any)
          .select("*")
          .eq("NUMEROFACT", numFact);
        if (cData && cData.length > 0) camposRaw = cData;
      } catch {}

      if (camposRaw.length === 0 && f.items && Array.isArray(f.items)) {
        camposRaw = f.items;
      }

      // Filtrar prendas que estén en alquiler (no devueltas)
      const prendasActivas: PrendaActivaAlquiler[] = [];
      let totalDepActivo = 0;

      for (const c of camposRaw) {
        const cod = c.BARRAS || "";
        const desc = c.DESCRIPCION || "TRAJE";
        const keyOv = `${numFact}_${cod || desc}`;
        const ov = overrides[keyOv];
        const estadoActual = ov ? ov.estado : "EN ALQUILER";

        if (estadoActual === "EN ALQUILER") {
          const cant = Number(c.CANTIDAD || 1);
          const dep = Number(c.VALORDEPOSITO || c.TOTALDEPOSITO || 0);
          prendasActivas.push({
            codigoBarras: cod,
            descripcion: desc,
            talla: c.TALLA || "U",
            cantidad: cant,
            valorDeposito: dep,
          });
          totalDepActivo += dep * cant;
        }
      }

      if (prendasActivas.length > 0) {
        const fSalidaStr = f.FECHASALIDA || new Date().toISOString().split("T")[0];
        const fEntradaStr = f.FECHAENTRADA || f.FECHAENTREGA || fSalidaStr;

        const dSalida = new Date(fSalidaStr);
        dSalida.setHours(0, 0, 0, 0);

        // Calcular días transcurridos
        const diffTime = Math.max(0, hoy.getTime() - dSalida.getTime());
        const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const diasPermitidos = 3;
        const diasRetraso = Math.max(0, diasTranscurridos - diasPermitidos);
        const costoPorDia = 15000;
        const recargoTotal = diasRetraso * costoPorDia;

        alquileresActivos.push({
          numeroFactura: numFact,
          fechaSalida: fSalidaStr,
          fechaEntregaPactada: fEntradaStr,
          diasTranscurridos,
          diasPermitidos,
          diasRetraso,
          costoPorDiaRetraso: costoPorDia,
          recargoTotalRetraso: recargoTotal,
          tieneRetraso: diasRetraso > 0,
          prendas: prendasActivas,
          totalDepositoRetenido: totalDepActivo,
        });
      }
    }

    return alquileresActivos;
  } catch (err) {
    console.error("Error al consultar alquileres activos del cliente:", err);
    return [];
  }
}

/**
 * Revierte una devolución realizada por error:
 * 1. Elimina el registro de egreso de depósitoentregado para cuadrar la caja.
 * 2. Revierte el stock añadido a los trajes/accesorios (-cantidad).
 * 3. Cambia el estado de la factura a 'EN ALQUILER'.
 * 4. Actualiza el estado de las prendas a 'EN ALQUILER' en los overrides locales y base de datos.
 */
export async function revertirDevolucionFactura(
  numeroFactura: string
): Promise<{ ok: boolean; mensaje: string }> {
  try {
    const numClean = String(numeroFactura).trim();
    if (!numClean) {
      return { ok: false, mensaje: "Número de factura inválido" };
    }

    // 1. Obtener los ítems de la factura para revertir el stock sumado
    let camposRaw: any[] = [];
    try {
      const { data } = await supabase
        .from("CAMPOFACTURA" as any)
        .select("*")
        .eq("NUMEROFACT", numClean);
      if (data && data.length > 0) camposRaw = data;
    } catch {}

    if (camposRaw.length === 0) {
      const rawCampos = localStorage.getItem("elegance_local_campos");
      if (rawCampos) {
        const all: any[] = JSON.parse(rawCampos);
        camposRaw = all.filter((c) => c.NUMEROFACT === numClean);
      }
    }

    // 2. Revertir stock de cada prenda devuelta (restar la cantidad que se había sumado)
    for (const item of camposRaw) {
      const cant = Number(item.CANTIDAD || 1);
      const cod = item.BARRAS || "";
      const desc = item.DESCRIPCION || "";

      try {
        if (cod.startsWith("ACC-")) {
          const { data: accRaw } = await supabase
            .from("ACCESORIOS" as any)
            .select("*")
            .eq("CODBARRAS", cod)
            .maybeSingle();
          const acc = accRaw as any;
          if (acc) {
            const nuevoStock = Math.max(0, (Number(acc.STOCK) || 0) - cant);
            await supabase
              .from("ACCESORIOS" as any)
              .update({ STOCK: nuevoStock })
              .eq("IDACCESORIO", acc.IDACCESORIO);
          }
        } else if (cod || desc) {
          let query = supabase.from("ARTICULO" as any).select("*");
          if (cod) query = query.eq("CODBARRAS", cod);
          else query = query.eq("DESCRIPCION", desc);

          const { data: artRaw } = await query.maybeSingle();
          const art = artRaw as any;
          if (art) {
            const nuevoStock = Math.max(0, (Number(art.STOCK) || 0) - cant);
            await supabase
              .from("ARTICULO" as any)
              .update({ STOCK: nuevoStock })
              .eq("IDARTICULO", art.IDARTICULO);

            emitirEventoRealtime("ARTICULO_ACTUALIZADO", {
              articulo: { ...art, STOCK: nuevoStock },
            });
          }
        }
      } catch (eStock) {
        console.warn("Aviso al revertir stock de prenda:", eStock);
      }

      // Actualizar override individual a EN ALQUILER
      guardarEstadoPrendaOverride(numClean, cod, desc, "EN ALQUILER");
    }

    // Override general
    guardarEstadoPrendaOverride(numClean, "GENERAL", "GENERAL", "EN ALQUILER");
    invalidarCacheArticulos();

    // 3. Eliminar el registro en depositoentregado (egreso del reintegro de fianza devuelto por error)
    try {
      await supabase
        .from("depositoentregado" as any)
        .delete()
        .eq("NUMEROFACTURA", numClean);
    } catch (eDep) {
      console.warn("Aviso eliminando registro de depositoentregado en Supabase:", eDep);
    }

    // Quitar de localStorage de depósitos entregados
    try {
      const deps = getLocalDepositosEntregados();
      const filtrados = deps.filter((d) => d.NUMEROFACTURA !== numClean);
      localStorage.setItem("elegance_local_depositos_entregados", JSON.stringify(filtrados));
    } catch {}

    // 4. Actualizar estado de la factura a 'EN ALQUILER' en Supabase
    try {
      await supabase
        .from("FACTURA" as any)
        .update({
          ESTADOCLIENTE: "EN ALQUILER",
          MODO: "ALQUILER",
        })
        .eq("NUMEROFACT", numClean);
    } catch (eFact) {
      console.warn("Aviso actualizando factura a EN ALQUILER en Supabase:", eFact);
    }

    // 5. Actualizar en IndexedDB
    try {
      const { obtenerTodasLasFacturasOffline, guardarFacturasLote } = await import("./offlineDbService");
      const facts = await obtenerTodasLasFacturasOffline();
      const target = facts.find((f) => f.NUMEROFACT === numClean);
      if (target) {
        target.ESTADOCLIENTE = "EN ALQUILER";
        target.MODO = "ALQUILER";
        await guardarFacturasLote([target]);
      }
    } catch {}

    // 6. Actualizar en LocalStorage de facturas
    try {
      const rawLocal = localStorage.getItem("elegance_local_facturas");
      if (rawLocal) {
        const list: any[] = JSON.parse(rawLocal);
        const idx = list.findIndex((f) => f.NUMEROFACT === numClean);
        if (idx >= 0 && list[idx]) {
          list[idx].ESTADOCLIENTE = "EN ALQUILER";
          list[idx].MODO = "ALQUILER";
          localStorage.setItem("elegance_local_facturas", JSON.stringify(list));
        }
      }
    } catch {}

    return {
      ok: true,
      mensaje: `Devolución de la Factura #${numClean} revertida correctamente. La prenda vuelve a estar 'EN ALQUILER' y el egreso de depósito fue cancelado.`,
    };
  } catch (err: any) {
    console.error("Error al revertir devolución:", err);
    return {
      ok: false,
      mensaje: err?.message || "Ocurrió un error al revertir la devolución",
    };
  }
}
