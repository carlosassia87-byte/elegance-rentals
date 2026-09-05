import { supabase } from "@/integrations/supabase/client";
import type { Factura } from "@/types/database.types";
import { type PrendaActivaAlquiler } from "./devolucionesService";

export interface ItemRetrasoAlquiler {
  idFactura: number;
  numeroFactura: string;
  clienteNombre: string;
  clienteCedula: string;
  clienteTelefono: string;
  clienteTelefono2?: string;
  clienteDireccion?: string;
  fechaSalida: string;
  fechaEntregaPactada: string;
  diasTranscurridos: number;
  diasPermitidos: number; // 3 días
  diasRetraso: number; // Max(0, diasTranscurridos - 3)
  costoPorDiaRetraso: number; // $7.000 COP
  recargoTotalRetraso: number; // diasRetraso * 7000
  nivelUrgencia: "CRITICO_MORA" | "VENCE_HOY" | "VENCE_MANANA" | "EN_TIEMPO";
  totalDepositoRetenido: number;
  totalAlquiler: number;
  vendedor: string;
  prendas: PrendaActivaAlquiler[];
}

export interface MetricasAlertasRetraso {
  totalTrajesEnMora: number;
  totalClientesEnMora: number;
  totalDineroRecargosMora: number;
  totalDepositosEnRiesgo: number;
  totalVencenHoy: number;
  totalEnTiempo: number;
}

// Consultar todas las facturas y trajes que no han sido devueltos a la tienda
export async function consultarTodosLosRetrasosYAlertas(): Promise<{
  alertas: ItemRetrasoAlquiler[];
  metricas: MetricasAlertasRetraso;
}> {
  const alertas: ItemRetrasoAlquiler[] = [];
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // 1. Overrides de prendas devueltas
  let overrides: Record<string, any> = {};
  try {
    const rawOv = localStorage.getItem("elegance_estados_prendas_override");
    if (rawOv) overrides = JSON.parse(rawOv);
  } catch {}

  // 2. Obtener todas las facturas de Supabase
  let facturas: any[] = [];
  try {
    const { data, error } = await supabase
      .from("FACTURA" as any)
      .select("*")
      .order("IDFACTURA", { ascending: false });

    if (!error && data) {
      facturas = data;
    }
  } catch (e) {
    console.warn("Fallo lectura de facturas en Supabase:", e);
  }

  // 3. Fallback Local
  try {
    const rawLocal = localStorage.getItem("elegance_local_facturas");
    if (rawLocal) {
      const localList: any[] = JSON.parse(rawLocal);
      for (const lf of localList) {
        if (!facturas.some((f) => f.NUMEROFACT === lf.NUMEROFACT)) {
          facturas.push(lf);
        }
      }
    }
  } catch {}

  // 4. Obtener todos los campos de factura
  let todosCampos: any[] = [];
  try {
    const { data: cData } = await supabase.from("CAMPOFACTURA" as any).select("*");
    if (cData && cData.length > 0) todosCampos = cData;
  } catch {}

  // Procesar cada factura
  for (const f of facturas) {
    if (f.MODO === "VENTA" || f.ESTADOCLIENTE === "VENTA") continue;

    const numFact = f.NUMEROFACT || `F-${f.IDFACTURA}`;

    // Obtener prendas de esta factura
    let camposFactura = todosCampos.filter((c) => c.NUMEROFACT === numFact);
    if (camposFactura.length === 0 && f.items && Array.isArray(f.items)) {
      camposFactura = f.items;
    }

    const prendasActivas: PrendaActivaAlquiler[] = [];
    let totalDepActivo = 0;

    for (const c of camposFactura) {
      const cod = c.BARRAS || c.codigoBarras || "";
      const desc = c.DESCRIPCION || c.descripcion || "TRAJE EN ALQUILER";
      const keyOv = `${numFact}_${cod || desc}`;
      const ov = overrides[keyOv];
      const estadoActual = ov ? ov.estado : "EN ALQUILER";

      if (estadoActual === "EN ALQUILER") {
        const cant = Number(c.CANTIDAD || c.cantidad || 1);
        const dep = Number(c.VALORDEPOSITO || c.valorDeposito || c.TOTALDEPOSITO || 0);
        prendasActivas.push({
          codigoBarras: cod,
          descripcion: desc,
          talla: c.TALLA || c.talla || "U",
          cantidad: cant,
          valorDeposito: dep,
        });
        totalDepActivo += dep * cant;
      }
    }

    // Si tiene prendas que aún NO han devuelto a la tienda
    if (prendasActivas.length > 0) {
      const fSalidaStr = f.FECHASALIDA || new Date().toISOString().split("T")[0];
      const fEntradaStr = f.FECHAENTRADA || f.FECHAENTREGA || fSalidaStr;

      const dSalida = new Date(fSalidaStr);
      dSalida.setHours(0, 0, 0, 0);

      // Días transcurridos desde que salió de la tienda
      const diffTime = Math.max(0, hoy.getTime() - dSalida.getTime());
      const diasTranscurridos = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const diasPermitidos = 3;
      const diasRetraso = Math.max(0, diasTranscurridos - diasPermitidos);
      const costoPorDia = 7000;
      const recargoTotal = diasRetraso * costoPorDia;

      let nivelUrgencia: ItemRetrasoAlquiler["nivelUrgencia"] = "EN_TIEMPO";
      if (diasRetraso > 0) {
        nivelUrgencia = "CRITICO_MORA";
      } else if (diasTranscurridos === 3) {
        nivelUrgencia = "VENCE_HOY";
      } else if (diasTranscurridos === 2) {
        nivelUrgencia = "VENCE_MANANA";
      }

      alertas.push({
        idFactura: Number(f.IDFACTURA) || Date.now(),
        numeroFactura: numFact,
        clienteNombre: (f.CCLIENTE || f.NOMBRE || "CLIENTE GENERAL").trim(),
        clienteCedula: String(f.CCEDULA || f.CEDULA || "—"),
        clienteTelefono: f.CTELEFONO || f.TELEFONO || "—",
        clienteTelefono2: f.CTELEFONO1 || f.TELEFONO2 || "",
        clienteDireccion: f.CDIRECCION || f.DIRECCION || "",
        fechaSalida: fSalidaStr,
        fechaEntregaPactada: fEntradaStr,
        diasTranscurridos,
        diasPermitidos,
        diasRetraso,
        costoPorDiaRetraso: costoPorDia,
        recargoTotalRetraso: recargoTotal,
        nivelUrgencia,
        totalDepositoRetenido: totalDepActivo,
        totalAlquiler: Number(f.FTOTALALQUILER || 0),
        vendedor: f.VENDEDOR || "CAJERO",
        prendas: prendasActivas,
      });
    }
  }

  // Ordenar: primero los de mora crítica (mayor retraso primero), luego vencen hoy
  alertas.sort((a, b) => b.diasRetraso - a.diasRetraso || b.diasTranscurridos - a.diasTranscurridos);

  const enMora = alertas.filter((a) => a.nivelUrgencia === "CRITICO_MORA");
  const vencenHoy = alertas.filter((a) => a.nivelUrgencia === "VENCE_HOY");
  const enTiempo = alertas.filter((a) => a.nivelUrgencia === "EN_TIEMPO" || a.nivelUrgencia === "VENCE_MANANA");

  const totalTrajesEnMora = enMora.reduce((acc, a) => acc + a.prendas.reduce((pAcc, p) => pAcc + p.cantidad, 0), 0);
  const totalDineroRecargos = enMora.reduce((acc, a) => acc + a.recargoTotalRetraso, 0);
  const totalDepositosRiesgo = enMora.reduce((acc, a) => acc + a.totalDepositoRetenido, 0);

  return {
    alertas,
    metricas: {
      totalTrajesEnMora,
      totalClientesEnMora: enMora.length,
      totalDineroRecargosMora: totalDineroRecargos,
      totalDepositosEnRiesgo: totalDepositosRiesgo,
      totalVencenHoy: vencenHoy.length,
      totalEnTiempo: enTiempo.length,
    },
  };
}

// Generador de mensaje de WhatsApp para cobro de retraso / mora
export function generarMensajeWhatsAppRetraso(
  item: ItemRetrasoAlquiler,
  nombreEmpresa: string = "LA CASA DEL DISFRAZ"
): string {
  const prendasTexto = item.prendas
    .map((p) => `• ${p.cantidad}x ${p.descripcion} (Talla: ${p.talla})`)
    .join("\n");

  const moraFormateada = `$${item.recargoTotalRetraso.toLocaleString("es-CO")}`;
  const depositoFormateado = `$${item.totalDepositoRetenido.toLocaleString("es-CO")}`;

  return encodeURIComponent(
    `🎭 *RECORDATORIO DE DEVOLUCIÓN - ${nombreEmpresa.toUpperCase()}*\n\n` +
      `Estimado(a) *${item.clienteNombre.toUpperCase()}*,\n` +
      `Te saludamos de *${nombreEmpresa}*. Te escribimos para recordarte que el alquiler de las siguientes prendas:\n\n` +
      `${prendasTexto}\n\n` +
      `📅 *Fecha de Salida:* ${item.fechaSalida}\n` +
      `⚠️ *Días de Retraso:* ${item.diasRetraso} día(s) (Límite contractual: 3 días)\n` +
      `💰 *Recargo por Mora Acumulado:* ${moraFormateada} ($7.000/día)\n` +
      `🔒 *Depósito en Custodia:* ${depositoFormateado}\n\n` +
      `Por favor acércate a nuestra tienda lo antes posible para realizar la entrega de la(s) prenda(s) y liquidar el reintegro de tu depósito restante.\n\n` +
      `¡Muchas gracias por tu atención!`
  );
}

// Generador de mensaje de WhatsApp para recordatorio amigable (vence hoy/mañana)
export function generarMensajeWhatsAppRecordatorio(
  item: ItemRetrasoAlquiler,
  nombreEmpresa: string = "LA CASA DEL DISFRAZ"
): string {
  const prendasTexto = item.prendas
    .map((p) => `• ${p.cantidad}x ${p.descripcion} (Talla: ${p.talla})`)
    .join("\n");

  return encodeURIComponent(
    `🎭 *RECORDATORIO AMIGABLE - ${nombreEmpresa.toUpperCase()}*\n\n` +
      `Hola *${item.clienteNombre.toUpperCase()}*,\n` +
      `Esperamos que hayas disfrutado de tu evento con tus trajes:\n\n` +
      `${prendasTexto}\n\n` +
      `Te recordamos que tu plazo de 3 días de alquiler *vence ${item.nivelUrgencia === "VENCE_HOY" ? "HOY" : "MAÑANA"}*.\n` +
      `Te esperamos en la tienda para devolver la prenda en perfecto estado y hacerte la entrega inmediata de tu depósito de fianza.\n\n` +
      `¡Que tengas un excelente día!`
  );
}
