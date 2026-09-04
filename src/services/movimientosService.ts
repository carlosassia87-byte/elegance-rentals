import { supabase } from "@/integrations/supabase/client";
import type { Articulo, Factura, CampoFactura } from "@/types/database.types";

export type EstadoPrenda =
  | "EN ALQUILER"
  | "EN BODEGA"
  | "DEVUELTO A TIENDA"
  | "VENTA"
  | "ABONO / APARTADO";

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
  tipoOperacion: "ALQUILER" | "VENTA" | "APARTADO / ABONO";
  totalAlquiler: number;
  totalDeposito: number;
  totalVentaDeposito: number;
  pagoEfectivo: number;
  pagoTransferencia: number;
  saldoPendiente: number;
  estadoGeneral: string;
  vendedor?: string;
  items: ItemMovimiento[];
}

export interface FiltrosMovimientos {
  fechaInicio: string;
  fechaFin: string;
  estado: string; // "TODOS" | EstadoPrenda
  busqueda: string;
}

export interface ResumenMetricasMovimientos {
  totalOperaciones: number;
  totalPrendasEnAlquiler: number;
  totalPrendasDevueltas: number;
  totalPrendasEnBodega: number;
  totalPrendasVenta: number;
  totalPrendasApartadas: number;
  totalDineroAlquiler: number;
  totalDineroDepositos: number;
  totalSaldoPorCobrar: number;
}

const KEY_ESTADOS_PRENDAS = "elegance_estados_prendas_override";

// Obtener mapa local de estados modificados
function getEstadosPrendasOverride(): Record<string, { estado: EstadoPrenda; fechaDevolucion?: string }> {
  try {
    const raw = localStorage.getItem(KEY_ESTADOS_PRENDAS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// Guardar cambio de estado de una prenda específica
export function guardarEstadoPrendaOverride(
  numeroFact: string,
  codigoBarras: string,
  descripcion: string,
  nuevoEstado: EstadoPrenda
) {
  try {
    const map = getEstadosPrendasOverride();
    const key = `${numeroFact}_${codigoBarras || descripcion}`;
    map[key] = {
      estado: nuevoEstado,
      fechaDevolucion: nuevoEstado === "DEVUELTO A TIENDA" ? new Date().toISOString() : undefined,
    };
    localStorage.setItem(KEY_ESTADOS_PRENDAS, JSON.stringify(map));
  } catch (e) {
    console.warn("Error guardando estado override:", e);
  }
}

// Obtener todas las operaciones y movimientos en un rango de fechas
export async function consultarMovimientos(
  filtros: FiltrosMovimientos
): Promise<{ operaciones: OperacionClienteMovimiento[]; metricas: ResumenMetricasMovimientos }> {
  const overrides = getEstadosPrendasOverride();
  const operacionesMap = new Map<string, OperacionClienteMovimiento>();

  // 1. Obtener Facturas de Supabase
  try {
    let query = supabase.from("FACTURA" as any).select("*").order("IDFACTURA", { ascending: false });

    if (filtros.fechaInicio) {
      query = query.gte("FECHASALIDA", filtros.fechaInicio);
    }
    if (filtros.fechaFin) {
      query = query.lte("FECHASALIDA", filtros.fechaFin);
    }

    const { data: facturasRaw, error } = await query;

    if (!error && facturasRaw && facturasRaw.length > 0) {
      for (const f of facturasRaw as any[]) {
        const numFact = f.NUMEROFACT || `F-${f.IDFACTURA}`;
        const totalVenta = Number(f.FTOTALVENTADEPOSITO || f.FTOTALALQUILER || 0);
        const pagado = Number(f.PAGOCONEFECTIVO || 0) + Number(f.PAGOCONTRANFERENCIA || 0);
        const saldo = Math.max(0, Number(f.TOTAL_SALDO || f.SALDOANTERIOR || (totalVenta - pagado)));

        let tipo: "ALQUILER" | "VENTA" | "APARTADO / ABONO" = "ALQUILER";
        if (f.MODO === "VENTA" || f.ESTADOCLIENTE === "VENTA") {
          tipo = "VENTA";
        } else if (saldo > 0 || f.MODO === "APARTADO" || f.ESTADOCLIENTE === "APARTADO") {
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
          totalAlquiler: Number(f.FTOTALALQUILER || 0),
          totalDeposito: Number(f.FTOTALDEPOSITO || 0),
          totalVentaDeposito: totalVenta,
          pagoEfectivo: Number(f.PAGOCONEFECTIVO || 0),
          pagoTransferencia: Number(f.PAGOCONTRANFERENCIA || 0),
          saldoPendiente: saldo,
          estadoGeneral: f.ESTADO || (saldo > 0 ? "CON SALDO" : "PAGADO"),
          vendedor: f.VENDEDOR || "CAJERO",
          items: [],
        });
      }
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

        // Filtrar por rango si aplica
        if (filtros.fechaInicio && fechaSalida < filtros.fechaInicio) continue;
        if (filtros.fechaFin && fechaSalida > filtros.fechaFin) continue;

        if (!operacionesMap.has(numFact)) {
          const totalVenta = Number(f.FTOTALVENTADEPOSITO || f.FTOTALALQUILER || 0);
          const pagado = Number(f.PAGOCONEFECTIVO || 0) + Number(f.PAGOCONTRANFERENCIA || 0);
          const saldo = Math.max(0, Number(f.TOTAL_SALDO || (totalVenta - pagado)));

          let tipo: "ALQUILER" | "VENTA" | "APARTADO / ABONO" = "ALQUILER";
          if (f.MODO === "VENTA") tipo = "VENTA";
          else if (saldo > 0) tipo = "APARTADO / ABONO";

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
            totalAlquiler: Number(f.FTOTALALQUILER || 0),
            totalDeposito: Number(f.FTOTALDEPOSITO || 0),
            totalVentaDeposito: totalVenta,
            pagoEfectivo: Number(f.PAGOCONEFECTIVO || 0),
            pagoTransferencia: Number(f.PAGOCONTRANFERENCIA || 0),
            saldoPendiente: saldo,
            estadoGeneral: f.ESTADO || (saldo > 0 ? "CON SALDO" : "PAGADO"),
            vendedor: f.VENDEDOR || "CAJERO",
            items: [],
          });
        }
      }
    }
  } catch {}

  // 3. Cargar Items de CAMPOFACTURA de Supabase
  try {
    const { data: camposRaw } = await supabase.from("CAMPOFACTURA" as any).select("*");
    if (camposRaw && camposRaw.length > 0) {
      for (const c of camposRaw as any[]) {
        const numFact = c.NUMEROFACT;
        if (numFact && operacionesMap.has(numFact)) {
          const op = operacionesMap.get(numFact)!;
          const keyOverride = `${numFact}_${c.BARRAS || c.DESCRIPCION}`;
          const override = overrides[keyOverride];

          // Determinar estado de la prenda por defecto
          let estadoPrenda: EstadoPrenda = "EN ALQUILER";
          if (op.tipoOperacion === "VENTA") {
            estadoPrenda = "VENTA";
          } else if (op.saldoPendiente > 0 && op.tipoOperacion === "APARTADO / ABONO") {
            estadoPrenda = "ABONO / APARTADO";
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
              if (op.tipoOperacion === "VENTA") estadoPrenda = "VENTA";
              else if (op.saldoPendiente > 0) estadoPrenda = "ABONO / APARTADO";

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
      if (op.tipoOperacion === "VENTA") estadoPrenda = "VENTA";
      else if (op.saldoPendiente > 0) estadoPrenda = "ABONO / APARTADO";

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
    totalPrendasEnAlquiler: 0,
    totalPrendasDevueltas: 0,
    totalPrendasEnBodega: 0,
    totalPrendasVenta: 0,
    totalPrendasApartadas: 0,
    totalDineroAlquiler: 0,
    totalDineroDepositos: 0,
    totalSaldoPorCobrar: 0,
  };

  todasOperaciones.forEach((op) => {
    metricas.totalDineroAlquiler += op.totalAlquiler;
    metricas.totalDineroDepositos += op.totalDeposito;
    metricas.totalSaldoPorCobrar += op.saldoPendiente;

    op.items.forEach((it) => {
      switch (it.estadoPrenda) {
        case "EN ALQUILER":
          metricas.totalPrendasEnAlquiler += it.cantidad;
          break;
        case "DEVUELTO A TIENDA":
          metricas.totalPrendasDevueltas += it.cantidad;
          break;
        case "EN BODEGA":
          metricas.totalPrendasEnBodega += it.cantidad;
          break;
        case "VENTA":
          metricas.totalPrendasVenta += it.cantidad;
          break;
        case "ABONO / APARTADO":
          metricas.totalPrendasApartadas += it.cantidad;
          break;
      }
    });
  });

  // Aplicar Filtro de Estado
  if (filtros.estado && filtros.estado !== "TODOS") {
    todasOperaciones = todasOperaciones.filter((op) =>
      op.items.some((it) => it.estadoPrenda === filtros.estado)
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

// Marcar un traje/prenda como Devuelto a Tienda y actualizar stock
export async function marcarTrajeDevuelto(
  numeroFact: string,
  codigoBarras: string,
  descripcion: string
): Promise<boolean> {
  try {
    guardarEstadoPrendaOverride(numeroFact, codigoBarras, descripcion, "DEVUELTO A TIENDA");

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
