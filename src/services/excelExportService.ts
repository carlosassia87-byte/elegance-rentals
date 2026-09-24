import * as XLSX from "xlsx";
import type { EmpresaConfig } from "./empresaCajaService";

export interface DatosExportacionCierre {
  fecha: string;
  nombreCaja: string;
  cajeroNombre: string;
  empresa: EmpresaConfig | null;
  totales: {
    alquilerEfectivo: number;
    alquilerTransferencia: number;
    totalAlquileres: number;
    totalDepositosRecibidos: number;
    totalDepositosDevueltos: number;
    totalGastos: number;
    efectivoEnCaja: number;
    transferenciasEnCaja: number;
    totalNetoCaja: number;
    cantidadFacturas: number;
  };
  facturas: any[];
  abonos: any[];
  gastos: any[];
  depositosDevueltos: any[];
}

/**
 * Genera y descarga un archivo Excel (.xlsx) estructurado y profesional con el arqueo y cierre diario
 */
export function exportarCierreCajaExcel(datos: DatosExportacionCierre): void {
  const wb = XLSX.utils.book_new();
  const ahora = new Date().toLocaleString("es-CO");

  // =========================================================================
  // HOJA 1: RESUMEN DE ARQUEO Y CIERRE DE CAJA (REPORTE Z)
  // =========================================================================
  const resumenRows: any[][] = [
    ["LA CASA DEL DISFRAZ - REPORTE DE ARQUEO Y CIERRE DE CAJA"],
    [`EMPRESA: ${datos.empresa?.nombreComercial || (datos.empresa as any)?.NOMBRE_EMPRESA || "LA CASA DEL DISFRAZ"}`],
    [`NIT: ${datos.empresa?.nit || (datos.empresa as any)?.NIT || "6076963959"} · DIRECCIÓN: ${datos.empresa?.direccion || (datos.empresa as any)?.DIRECCION || "Cra 23 #15-34"} · TEL: ${datos.empresa?.telefono1 || (datos.empresa as any)?.TELEFONO || "3202375610"}`],
    [""],
    ["DATOS DEL CIERRE DE CAJA"],
    ["Caja / Terminal:", datos.nombreCaja],
    ["Cajero / Responsable:", datos.cajeroNombre],
    ["Fecha de Operación:", datos.fecha],
    ["Fecha y Hora de Generación:", ahora],
    ["Total Operaciones / Facturas:", datos.totales.cantidadFacturas],
    [""],
    ["================================================================="],
    ["RESUMEN FINANCIERO", "VALOR ($ COP)"],
    ["================================================================="],
    ["1. INGRESOS TOTALES"],
    ["(+) Alquileres Recibidos en Efectivo:", datos.totales.alquilerEfectivo],
    ["(+) Alquileres Recibidos en Transferencia / Tarjeta:", datos.totales.alquilerTransferencia],
    ["(+) Depósitos de Garantía Recibidos:", datos.totales.totalDepositosRecibidos],
    ["TOTAL INGRESOS BRUTOS:", datos.totales.totalAlquileres + datos.totales.totalDepositosRecibidos],
    [""],
    ["2. EGRESOS Y SALIDAS"],
    ["(-) Depósitos Reintegrados a Clientes:", datos.totales.totalDepositosDevueltos],
    ["(-) Gastos y Salidas de Caja:", datos.totales.totalGastos],
    ["TOTAL EGRESOS:", datos.totales.totalDepositosDevueltos + datos.totales.totalGastos],
    [""],
    ["3. DISPONIBILIDAD EN CAJA"],
    ["(=) Efectivo Físico en Gaveta:", datos.totales.efectivoEnCaja],
    ["(=) Bancos / Transferencias / Datáfono:", datos.totales.transferenciasEnCaja],
    ["TOTAL NETO CONCILIADO EN CAJA:", datos.totales.totalNetoCaja],
    [""],
    ["================================================================="],
    ["Firmas de Conformidad:"],
    ["Firma Cajero(a): _______________________", "Firma Administrador(a): _______________________"]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = [{ wch: 45 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen Arqueo (Reporte Z)");

  // =========================================================================
  // HOJA 2: DETALLE DE FACTURAS DEL DÍA
  // =========================================================================
  const facturasHeaders = [
    "Nº Factura",
    "Fecha Salida",
    "Fecha Entrada",
    "Cliente",
    "Cédula",
    "Teléfono",
    "Modo",
    "Total Alquiler",
    "Total Depósito",
    "Gran Total Venta",
    "Pago Efectivo",
    "Pago Transf/Tarjeta",
    "Descuento",
    "Saldo Pendiente",
    "Estado Prenda",
    "Cajero"
  ];

  const facturasData = (datos.facturas || []).map((f) => [
    f.NUMEROFACT || "",
    f.FECHASALIDA || "",
    f.FECHAENTRADA || "",
    f.CCLIENTE || "GENERAL",
    f.CCEDULA || "",
    f.CTELEFONO || "",
    f.MODO || "ALQUILER",
    Number(f.FTOTALALQUILER || 0),
    Number(f.FTOTALDEPOSITO || 0),
    Number(f.FTOTALVENTADEPOSITO || 0),
    Number(f.PAGOCONEFECTIVO || 0),
    Number(f.PAGOCONTRANFERENCIA || 0),
    Number(f.DESCUENTO || 0),
    Number(f.TOTAL_SALDO || 0),
    f.ESTADOCLIENTE || "EN ALQUILER",
    f.VENDEDOR || datos.cajeroNombre
  ]);

  const wsFacturas = XLSX.utils.aoa_to_sheet([facturasHeaders, ...facturasData]);
  wsFacturas["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 26 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 14 },
    { wch: 16 },
    { wch: 12 },
    { wch: 14 },
    { wch: 16 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsFacturas, "Facturas del Día");

  // =========================================================================
  // HOJA 3: ABONOS DE APARTADOS
  // =========================================================================
  const abonosHeaders = [
    "Nº Factura",
    "Fecha Abono",
    "Cliente",
    "Pago Efectivo",
    "Pago Transferencia",
    "Total Abonado",
    "Saldo Anterior",
    "Saldo Deber Restante",
    "Cajero"
  ];

  const abonosData = (datos.abonos || []).map((ab) => [
    ab.NUMEROFACTURA || "",
    ab.FECHAABONO || "",
    ab.CLIENTE || "",
    Number(ab.PAGOEFECTIVO || 0),
    Number(ab.PAGOTRANFE || 0),
    Number(ab.TOTAL_ABONO || 0),
    Number(ab.SALDOANTERIOR || 0),
    Number(ab.SALDODEBER || 0),
    ab.VENDEDOR || datos.cajeroNombre
  ]);

  const wsAbonos = XLSX.utils.aoa_to_sheet([abonosHeaders, ...abonosData]);
  wsAbonos["!cols"] = [
    { wch: 14 },
    { wch: 12 },
    { wch: 26 },
    { wch: 15 },
    { wch: 16 },
    { wch: 15 },
    { wch: 15 },
    { wch: 16 },
    { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsAbonos, "Abonos Apartados");

  // =========================================================================
  // HOJA 4: GASTOS Y REINTEGROS DE DEPÓSITOS
  // =========================================================================
  const egresosHeaders = ["Tipo Egreso", "Referencia / Factura", "Concepto / Detalle", "Fecha", "Valor ($ COP)"];
  const egresosRows: any[][] = [];

  (datos.depositosDevueltos || []).forEach((d) => {
    egresosRows.push(["REINTEGRO DEPÓSITO", d.NUMEROFACTURA || "S/N", "Devolución de garantía de prenda entregada", d.FECHA || datos.fecha, Number(d.VALOR || 0)]);
  });

  (datos.gastos || []).forEach((g) => {
    egresosRows.push(["GASTO OPERACIONAL", "GASTO", g.CONCEPTO || "Gasto de caja menor", g.FECHA || datos.fecha, Number(g.VALORSALIDA || 0)]);
  });

  const wsEgresos = XLSX.utils.aoa_to_sheet([egresosHeaders, ...egresosRows]);
  wsEgresos["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 35 }, { wch: 12 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsEgresos, "Gastos y Devoluciones");

  // Guardar y descargar archivo en el navegador
  const nombreLimpioCaja = (datos.nombreCaja || "CAJA").replace(/\s+/g, "_");
  const nombreArchivo = `Cierre_Caja_${nombreLimpioCaja}_${datos.fecha}.xlsx`;
  XLSX.writeFile(wb, nombreArchivo);
}
