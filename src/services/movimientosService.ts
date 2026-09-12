import { supabase } from "@/integrations/supabase/client";
import type { Articulo, Factura, CampoFactura } from "@/types/database.types";

export type EstadoPrenda =
  | "EN ALQUILER"
  | "ENTREGADO"
  | "EN BODEGA"
  | "VENTA"
  | "ANULADO";

export interface ItemMovimiento {
  id: string | number;
  automatic?: number;
  idFactura: number;
  numeroFact: string;
  codigoBarras: string;
  descripcion: string;
  talla: string;
  cantidad: number;
  valorAlquiler: number;
  valorDeposito: number;
  total: number;
  estadoPrenda: EstadoPrenda;
  fechaSalida?: string;
  fechaEntregaPactada?: string;
  fechaDevolucionReal?: string;
}

export interface OperacionClienteMovimiento {
  idFactura: number;
  numeroFact: string;
  fechaSalida: string;
  fechaEntregaPactada: string;
  hora?: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteDireccion: string;
  tipoOperacion: "ALQUILER" | "VENTA" | "APARTADO / ABONO" | string;
  totalAlquiler: number;
  totalDeposito: number;
  totalVentaDeposito: number;
  pagoEfectivo: number;
  pagoTransferencia: number;
  saldoPendiente: number;
  estadoGeneral: string;
  estadoCliente: "EN ALQUILER" | "ENTREGADO" | "EN BODEGA" | "VENTA" | "ANULADO" | string;
  vendedor?: string;
  items: ItemMovimiento[];
}

export interface FiltrosMovimientos {
  fechaInicio: string;
  fechaFin: string;
  estado: string; // "TODOS" | "EN ALQUILER" | "ENTREGADO" | "EN BODEGA" | "ANULADO"
  busqueda: string;
}

export interface ResumenMetricasMovimientos {
  totalOperaciones: number;
  totalFacturasEnAlquiler: number;
  totalFacturasEntregadas: number;
  totalFacturasEnBodega: number;
  totalFacturasVenta: number;
  totalFacturasAnuladas: number;
  totalPrendasEnAlquiler: number;
  totalPrendasEntregadas: number;
  totalPrendasEnBodega: number;
  totalPrendasVenta: number;
  totalPrendasAnuladas: number;
  totalDineroAlquiler: number;
  totalDineroDepositos: number;
  totalSaldoPorCobrar: number;
}

const KEY_ESTADOS_PRENDAS = "elegance_estados_prendas_override";

// Obtener mapa local de estados modificados
function getEstadosPrendasOverride(): Record<string, { estado: EstadoPrenda; fechaDevolucion?: string }> {
  try {
    const raw = localStorage.getItem(KEY_ESTADOS_PRENDAS);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

// Guardar cambio de estado de una prenda específica
export function guardarEstadoPrendaOverride(
  numeroFact: string,
  codigoBarras: string,
  descripcion: string,
  nuevoEstado: EstadoPrenda
) {
  try {
    const current = getEstadosPrendasOverride();
    const key = `${numeroFact}_${codigoBarras || descripcion}`;
    current[key] = {
      estado: nuevoEstado,
      fechaDevolucion: nuevoEstado === "ENTREGADO" ? new Date().toISOString().split("T")[0] : undefined,
    };
    localStorage.setItem(KEY_ESTADOS_PRENDAS, JSON.stringify(current));
  } catch {}
}

// Obtener todas las operaciones y movimientos en un rango de fechas
export async function consultarMovimientos(
  filtros: FiltrosMovimientos
): Promise<{ operaciones: OperacionClienteMovimiento[]; metricas: ResumenMetricasMovimientos }> {
  const overrides = getEstadosPrendasOverride();
  const operacionesMap = new Map<string, OperacionClienteMovimiento>();

  // 1. Obtener Facturas de Supabase con paginación por lotes (.range)
  try {
    const BATCH_SIZE = 1000;
    let from = 0;
    const maxLimit = 200000;

    while (from < maxLimit) {
      const to = from + BATCH_SIZE - 1;
      let query = supabase.from("FACTURA" as any).select("*").order("IDFACTURA", { ascending: false }).range(from, to);

      if (filtros.fechaInicio) {
        query = query.gte("FECHASALIDA", filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        query = query.lte("FECHASALIDA", filtros.fechaFin);
      }

      const { data: facturasRaw, error } = await query;
      if (error || !facturasRaw || facturasRaw.length === 0) break;

      for (const f of facturasRaw as any[]) {
        const numFact = f.NUMEROFACT || `F-${f.IDFACTURA}`;
        const alq = Number(f.FTOTALALQUILER || 0);
        const dep = Number(f.FTOTALDEPOSITO || 0);
        let totalVenta = Number(f.FTOTALVENTADEPOSITO || 0);
        if (totalVenta <= 0 || (totalVenta === alq && dep > 0)) {
          totalVenta = alq + dep;
        }
        const pagado = Number(f.PAGOCONEFECTIVO || 0) + Number(f.PAGOCONTRANFERENCIA || 0) || Number(f.PAGACON || 0);
        const totalSaldoDb = f.TOTAL_SALDO !== undefined && f.TOTAL_SALDO !== null ? Number(f.TOTAL_SALDO) : null;
        let saldo = 0;
        if (pagado >= totalVenta && totalVenta > 0) {
          saldo = 0;
        } else if (totalSaldoDb !== null && totalSaldoDb > 0) {
          saldo = totalSaldoDb;
        } else {
          saldo = Math.max(0, totalVenta - pagado);
        }

        // Estado del cliente tal como está en la BD Windev
        const estadoGenRaw = (f.ESTADO || "").trim().toUpperCase();
        let estadoCliRaw = (f.ESTADOCLIENTE || "").trim().toUpperCase();

        if (estadoGenRaw === "ANULADA" || estadoGenRaw === "ANULADO" || estadoCliRaw === "ANULADA" || estadoCliRaw === "ANULADO") {
          estadoCliRaw = "ANULADO";
        } else if (!estadoCliRaw) {
          estadoCliRaw = f.MODO === "VENTA" ? "VENTA" : "EN ALQUILER";
        } else if (estadoCliRaw === "DEVUELTO" || estadoCliRaw === "DEVUELTO A TIENDA") {
          estadoCliRaw = "ENTREGADO";
        }

        let tipo: "ALQUILER" | "VENTA" | "APARTADO / ABONO" | string = f.MODO === "VENTA" || estadoCliRaw === "VENTA" ? "VENTA" : "ALQUILER";
        if (f.MODO === "APARTADO" || estadoCliRaw === "EN BODEGA") {
          tipo = "APARTADO / ABONO";
        }

        operacionesMap.set(numFact, {
          idFactura: Number(f.IDFACTURA),
          numeroFact: numFact,
          fechaSalida: f.FECHASALIDA || new Date().toISOString().split("T")[0],
          fechaEntregaPactada: f.FECHAENTRADA || f.FECHAENTREGA || f.FECHASALIDA || "",
          hora: f.HORA || "",
          clienteNombre: (f.CCLIENTE || f.NOMBRE || "CLIENTE GENERAL").trim(),
          clienteCedula: String(f.CCEDULA || f.CEDULA || "—"),
          clienteTelefono: f.CTELEFONO || f.CTELEFONO1 || f.TELEFONO || "—",
          clienteDireccion: f.CDIRECCION || f.DIRECCION || "—",
          tipoOperacion: tipo,
          totalAlquiler: alq,
          totalDeposito: dep,
          totalVentaDeposito: totalVenta,
          pagoEfectivo: Number(f.PAGOCONEFECTIVO || 0),
          pagoTransferencia: Number(f.PAGOCONTRANFERENCIA || 0),
          saldoPendiente: Math.max(0, saldo),
          estadoGeneral: f.ESTADO || (saldo > 0 ? "CON SALDO" : "PAGADO"),
          estadoCliente: estadoCliRaw,
          vendedor: f.VENDEDOR || "CAJERO",
          items: [],
        });
      }

      if (facturasRaw.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }
  } catch (err) {
    console.warn("Fallo lectura Supabase FACTURA:", err);
  }

  // 2. Obtener Facturas Locales de respaldo
  try {
    const rawLocal = localStorage.getItem("elegance_local_facturas");
    if (rawLocal) {
      const localList: any[] = JSON.parse(rawLocal);
      for (const f of localList) {
        const numFact = f.NUMEROFACT || `F-${f.IDFACTURA}`;
        const fechaSalida = f.FECHASALIDA || new Date().toISOString().split("T")[0];

        if (filtros.fechaInicio && fechaSalida < filtros.fechaInicio) continue;
        if (filtros.fechaFin && fechaSalida > filtros.fechaFin) continue;

        if (!operacionesMap.has(numFact)) {
          const alq = Number(f.FTOTALALQUILER || 0);
          const dep = Number(f.FTOTALDEPOSITO || 0);
          let totalVenta = Number(f.FTOTALVENTADEPOSITO || 0);
          if (totalVenta <= 0 || (totalVenta === alq && dep > 0)) {
            totalVenta = alq + dep;
          }
          const pagado = Number(f.PAGOCONEFECTIVO || 0) + Number(f.PAGOCONTRANFERENCIA || 0) || Number(f.PAGACON || 0);
          const totalSaldoDb = f.TOTAL_SALDO !== undefined && f.TOTAL_SALDO !== null ? Number(f.TOTAL_SALDO) : null;
          let saldo = 0;
          if (pagado >= totalVenta && totalVenta > 0) {
            saldo = 0;
          } else if (totalSaldoDb !== null && totalSaldoDb > 0) {
            saldo = totalSaldoDb;
          } else {
            saldo = Math.max(0, totalVenta - pagado);
          }
          const estadoGenRaw = (f.ESTADO || "").trim().toUpperCase();
          let estadoCliRaw = (f.ESTADOCLIENTE || "").trim().toUpperCase();

          if (estadoGenRaw === "ANULADA" || estadoGenRaw === "ANULADO" || estadoCliRaw === "ANULADA" || estadoCliRaw === "ANULADO") {
            estadoCliRaw = "ANULADO";
          } else if (!estadoCliRaw) {
            estadoCliRaw = f.MODO === "VENTA" ? "VENTA" : "EN ALQUILER";
          } else if (estadoCliRaw === "DEVUELTO" || estadoCliRaw === "DEVUELTO A TIENDA") {
            estadoCliRaw = "ENTREGADO";
          }

          let tipo: "ALQUILER" | "VENTA" | "APARTADO / ABONO" | string = f.MODO === "VENTA" || estadoCliRaw === "VENTA" ? "VENTA" : "ALQUILER";
          if (f.MODO === "APARTADO" || estadoCliRaw === "EN BODEGA") {
            tipo = "APARTADO / ABONO";
          }

          operacionesMap.set(numFact, {
            idFactura: Number(f.IDFACTURA) || Date.now(),
            numeroFact: numFact,
            fechaSalida,
            fechaEntregaPactada: f.FECHAENTRADA || f.FECHAENTREGA || fechaSalida,
            hora: f.HORA || "",
            clienteNombre: (f.CCLIENTE || f.NOMBRE || "CLIENTE GENERAL").trim(),
            clienteCedula: String(f.CCEDULA || f.CEDULA || "—"),
            clienteTelefono: f.CTELEFONO || f.CTELEFONO1 || f.TELEFONO || "—",
            clienteDireccion: f.CDIRECCION || f.DIRECCION || "—",
            tipoOperacion: tipo,
            totalAlquiler: alq,
            totalDeposito: dep,
            totalVentaDeposito: totalVenta,
            pagoEfectivo: Number(f.PAGOCONEFECTIVO || 0),
            pagoTransferencia: Number(f.PAGOCONTRANFERENCIA || 0),
            saldoPendiente: Math.max(0, saldo),
            estadoGeneral: f.ESTADO || (saldo > 0 ? "CON SALDO" : "PAGADO"),
            estadoCliente: estadoCliRaw,
            vendedor: f.VENDEDOR || "CAJERO",
            items: [],
          });
        }
      }
    }
  } catch {}

  // 3. Cargar Items de CAMPOFACTURA de Supabase con paginación
  try {
    const BATCH_SIZE = 1000;
    let from = 0;
    const maxLimit = 200000;

    while (from < maxLimit) {
      const to = from + BATCH_SIZE - 1;
      const { data: camposRaw, error } = await supabase.from("CAMPOFACTURA" as any).select("*").range(from, to);
      if (error || !camposRaw || camposRaw.length === 0) break;

      for (const c of camposRaw as any[]) {
        const numFact = c.NUMEROFACT;
        if (numFact && operacionesMap.has(numFact)) {
          const op = operacionesMap.get(numFact)!;
          const keyOverride = `${numFact}_${c.BARRAS || c.DESCRIPCION}`;
          const override = overrides[keyOverride];

          let estadoPrenda: EstadoPrenda = "EN ALQUILER";
          const ec = op.estadoCliente.toUpperCase();

          if (ec === "ANULADO" || ec === "ANULADA") {
            estadoPrenda = "ANULADO";
          } else if (ec === "ENTREGADO" || ec === "DEVUELTO" || ec === "DEVUELTO A TIENDA") {
            estadoPrenda = "ENTREGADO";
          } else if (ec === "VENTA" || op.tipoOperacion === "VENTA") {
            estadoPrenda = "VENTA";
          } else if (ec === "EN BODEGA") {
            estadoPrenda = "EN BODEGA";
          } else {
            estadoPrenda = "EN ALQUILER";
          }

          if (override) {
            estadoPrenda = override.estado;
          }

          op.items.push({
            id: c.AUTOMATIC || `${numFact}-${c.BARRAS || c.DESCRIPCION}`,
            automatic: c.AUTOMATIC,
            idFactura: Number(c.IDFACTURA) || op.idFactura,
            numeroFact: numFact,
            codigoBarras: c.BARRAS || "",
            descripcion: c.DESCRIPCION || "PRENDA SIN NOMBRE",
            talla: c.TALLA || "U",
            cantidad: Number(c.CANTIDAD || 1),
            valorAlquiler: Number(c.VALOR || c.TOTALALQUILER || 0),
            valorDeposito: Number(c.VALORDEPOSITO || c.TOTALDEPOSITO || 0),
            total: Number(c.TOTAL || c.VALOR || 0),
            estadoPrenda,
            fechaSalida: op.fechaSalida,
            fechaEntregaPactada: op.fechaEntregaPactada,
            fechaDevolucionReal: override?.fechaDevolucion,
          });
        }
      }
      if (camposRaw.length < BATCH_SIZE) break;
      from += BATCH_SIZE;
    }
  } catch {}

  // 4. Si alguna operación no tiene items aún, buscar en local o crear item derivado
  try {
    const rawLocal = localStorage.getItem("elegance_local_facturas");
    if (rawLocal) {
      const localList: any[] = JSON.parse(rawLocal);
      for (const f of localList) {
        const numFact = f.NUMEROFACT;
        if (numFact && operacionesMap.has(numFact)) {
          const op = operacionesMap.get(numFact)!;
          if (op.items.length === 0 && f.items && Array.isArray(f.items)) {
            f.items.forEach((item: any, idx: number) => {
              const keyOverride = `${numFact}_${item.BARRAS || item.DESCRIPCION}`;
              const override = overrides[keyOverride];

              let estadoPrenda: EstadoPrenda = "EN ALQUILER";
              if (op.estadoCliente === "ANULADO") estadoPrenda = "ANULADO";
              else if (op.tipoOperacion === "VENTA") estadoPrenda = "VENTA";
              else if (op.estadoCliente === "ENTREGADO") estadoPrenda = "ENTREGADO";
              else if (op.estadoCliente === "EN BODEGA") estadoPrenda = "EN BODEGA";

              if (override) estadoPrenda = override.estado;

              op.items.push({
                id: `${numFact}-${idx}`,
                automatic: idx + 1,
                idFactura: op.idFactura,
                numeroFact: numFact,
                codigoBarras: item.BARRAS || "",
                descripcion: item.DESCRIPCION || "PRENDA",
                talla: item.TALLA || "U",
                cantidad: Number(item.CANTIDAD || 1),
                valorAlquiler: Number(item.VALOR || 0),
                valorDeposito: Number(item.VALORDEPOSITO || 0),
                total: Number(item.TOTAL || item.VALOR || 0),
                estadoPrenda,
                fechaSalida: op.fechaSalida,
                fechaEntregaPactada: op.fechaEntregaPactada,
                fechaDevolucionReal: override?.fechaDevolucion,
              });
            });
          }
        }
      }
    }
  } catch {}

  // Si aún no hay items, creamos un item representativo para no dejar la factura vacía
  operacionesMap.forEach((op) => {
    if (op.items.length === 0) {
      const keyOverride = `${op.numeroFact}_GENERAL`;
      const override = overrides[keyOverride];

      let estadoPrenda: EstadoPrenda = "EN ALQUILER";
      if (op.estadoCliente === "ANULADO") estadoPrenda = "ANULADO";
      else if (op.tipoOperacion === "VENTA") estadoPrenda = "VENTA";
      else if (op.estadoCliente === "ENTREGADO") estadoPrenda = "ENTREGADO";
      else if (op.estadoCliente === "EN BODEGA") estadoPrenda = "EN BODEGA";

      if (override) estadoPrenda = override.estado;

      op.items.push({
        id: `${op.numeroFact}-default`,
        idFactura: op.idFactura,
        numeroFact: op.numeroFact,
        codigoBarras: "1001",
        descripcion: `TRAJE / DISFRAZ (FACTURA ${op.numeroFact})`,
        talla: "U",
        cantidad: 1,
        valorAlquiler: op.totalAlquiler,
        valorDeposito: op.totalDeposito,
        total: op.totalVentaDeposito,
        estadoPrenda,
        fechaSalida: op.fechaSalida,
        fechaEntregaPactada: op.fechaEntregaPactada,
        fechaDevolucionReal: override?.fechaDevolucion,
      });
    }
  });

  // Convertir a Array y filtrar según los criterios
  let todasOperaciones = Array.from(operacionesMap.values());

  // Calcular Métricas Globales
  const metricas: ResumenMetricasMovimientos = {
    totalOperaciones: todasOperaciones.length,
    totalFacturasEnAlquiler: 0,
    totalFacturasEntregadas: 0,
    totalFacturasEnBodega: 0,
    totalFacturasVenta: 0,
    totalFacturasAnuladas: 0,
    totalPrendasEnAlquiler: 0,
    totalPrendasEntregadas: 0,
    totalPrendasEnBodega: 0,
    totalPrendasVenta: 0,
    totalPrendasAnuladas: 0,
    totalDineroAlquiler: 0,
    totalDineroDepositos: 0,
    totalSaldoPorCobrar: 0,
  };

  todasOperaciones.forEach((op) => {
    metricas.totalDineroAlquiler += op.totalAlquiler;
    metricas.totalDineroDepositos += op.totalDeposito;
    metricas.totalSaldoPorCobrar += op.saldoPendiente;

    const ec = (op.estadoCliente || "").toUpperCase();
    if (ec === "ANULADO" || ec === "ANULADA") {
      metricas.totalFacturasAnuladas++;
    } else if (ec === "EN ALQUILER" || op.items.some((it) => it.estadoPrenda === "EN ALQUILER")) {
      metricas.totalFacturasEnAlquiler++;
    } else if (ec === "ENTREGADO" || ec === "DEVUELTO" || op.items.some((it) => it.estadoPrenda === "ENTREGADO")) {
      metricas.totalFacturasEntregadas++;
    } else if (ec === "EN BODEGA" || op.items.some((it) => it.estadoPrenda === "EN BODEGA")) {
      metricas.totalFacturasEnBodega++;
    } else if (ec === "VENTA" || op.tipoOperacion === "VENTA" || op.items.some((it) => it.estadoPrenda === "VENTA")) {
      metricas.totalFacturasVenta++;
    }

    op.items.forEach((it) => {
      switch (it.estadoPrenda) {
        case "ANULADO":
          metricas.totalPrendasAnuladas += it.cantidad;
          break;
        case "EN ALQUILER":
          metricas.totalPrendasEnAlquiler += it.cantidad;
          break;
        case "ENTREGADO":
          metricas.totalPrendasEntregadas += it.cantidad;
          break;
        case "EN BODEGA":
          metricas.totalPrendasEnBodega += it.cantidad;
          break;
        case "VENTA":
          metricas.totalPrendasVenta += it.cantidad;
          break;
      }
    });
  });

  // Aplicar Filtro de Estado
  if (filtros.estado && filtros.estado !== "TODOS") {
    todasOperaciones = todasOperaciones.filter((op) =>
      op.items.some((it) => it.estadoPrenda === filtros.estado) || op.estadoCliente === filtros.estado
    );
  }

  // Aplicar Filtro de Búsqueda por Texto
  if (filtros.busqueda.trim()) {
    const q = filtros.busqueda.toLowerCase().trim();
    todasOperaciones = todasOperaciones.filter((op) => {
      const matchCliente =
        op.clienteNombre.toLowerCase().includes(q) ||
        op.clienteCedula.toLowerCase().includes(q) ||
        op.numeroFact.toLowerCase().includes(q) ||
        op.clienteTelefono.toLowerCase().includes(q);
      const matchItem = op.items.some(
        (it) =>
          it.descripcion.toLowerCase().includes(q) ||
          it.codigoBarras.toLowerCase().includes(q) ||
          it.talla.toLowerCase().includes(q)
      );
      return matchCliente || matchItem;
    });
  }

  return {
    operaciones: todasOperaciones,
    metricas,
  };
}

// Marcar un traje/prenda como Devuelto a Tienda (ENTREGADO) y actualizar stock
export async function marcarTrajeDevuelto(
  numeroFact: string,
  codigoBarras: string,
  descripcion: string
): Promise<boolean> {
  try {
    guardarEstadoPrendaOverride(numeroFact, codigoBarras, descripcion, "ENTREGADO");

    // Actualizar FACTURA en Supabase si corresponde
    try {
      await supabase
        .from("FACTURA" as any)
        .update({ ESTADOCLIENTE: "ENTREGADO" })
        .eq("NUMEROFACT", numeroFact);
    } catch {}

    // Reincorporar stock en ARTICULO si existe
    try {
      let query = supabase.from("ARTICULO" as any).select("*");
      if (codigoBarras) {
        query = query.eq("CODBARRAS", codigoBarras);
      } else if (descripcion) {
        query = query.eq("DESCRIPCION", descripcion);
      }
      const { data: artRaw } = await query.maybeSingle();
      const art = artRaw as any;
      if (art) {
        await supabase
          .from("ARTICULO" as any)
          .update({ STOCK: (Number(art.STOCK) || 0) + 1 })
          .eq("IDARTICULO", art.IDARTICULO);
      }
    } catch {}

    // Registrar en DEPOSITOENTREGADO si corresponde
    try {
      await supabase.from("DEPOSITOENTREGADO" as any).insert({
        NUMEROFACTURA: numeroFact,
        VALOR: 0,
        FECHA: new Date().toISOString(),
      });
    } catch {}

    return true;
  } catch (err) {
    console.error("Error al marcar traje devuelto:", err);
    return false;
  }
}
