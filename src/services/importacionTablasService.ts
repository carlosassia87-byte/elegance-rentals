import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";
import type { ResultadoImportacionExcel } from "./mantenimientoMigracionService";

export type TipoCampo = "texto" | "numero" | "entero" | "fecha" | "booleano";

export interface CampoImportable {
  destino: string;
  alias: string[];
  tipo: TipoCampo;
  ejemplo?: any;
  mayusculas?: boolean;
}

export interface TablaImportable {
  clave: string;
  etiqueta: string;
  tabla: string;
  conflicto?: string;
  campoObligatorio?: string;
  campos: CampoImportable[];
}

export const TABLAS_IMPORTABLES: TablaImportable[] = [
  {
    clave: "ARTICULO",
    etiqueta: "Artículos / Trajes (Inventario)",
    tabla: "ARTICULO",
    conflicto: "CODBARRAS",
    campoObligatorio: "DESCRIPCION",
    campos: [
      { destino: "CODBARRAS", alias: ["CODBARRAS", "CODIGO", "BARCODE", "REF", "REFERENCIA", "CODIGO_BARRAS"], tipo: "texto", ejemplo: "TRAJE-0001" },
      { destino: "DESCRIPCION", alias: ["DESCRIPCION", "NOMBRE", "ARTICULO", "TRAJE", "DETALLE"], tipo: "texto", mayusculas: true, ejemplo: "DISFRAZ PIRATA CABALLERO" },
      { destino: "TALLA", alias: ["TALLA", "SIZE", "TAMANO"], tipo: "texto", mayusculas: true, ejemplo: "M" },
      { destino: "STOCK", alias: ["STOCK", "CANTIDAD", "EXISTENCIA", "CANT"], tipo: "entero", ejemplo: 3 },
      { destino: "VALOR", alias: ["VALOR", "PRECIO", "VALOR_ALQUILER", "ALQUILER"], tipo: "numero", ejemplo: 85000 },
      { destino: "VALORDEPOSITO", alias: ["VALORDEPOSITO", "DEPOSITO", "GARANTIA", "FIANZA"], tipo: "numero", ejemplo: 40000 },
      { destino: "DETALLE", alias: ["DETALLE", "ACCESORIOS", "COMPLEMENTOS", "PIEZAS", "NOTAS"], tipo: "texto", ejemplo: "SOMBRERO, ESPADA, CHALECO" },
      { destino: "ACTIVO", alias: ["ACTIVO", "ESTADO", "HABILITADO"], tipo: "booleano", ejemplo: "SI" },
    ],
  },
  {
    clave: "CLIENTES",
    etiqueta: "Directorio de Clientes",
    tabla: "CLIENTES",
    conflicto: "CEDULA",
    campoObligatorio: "NOMBRE",
    campos: [
      { destino: "CEDULA", alias: ["CEDULA", "DOCUMENTO", "NIT", "IDENTIFICACION", "CC", "DNI", "ID"], tipo: "entero", ejemplo: 1098613309 },
      { destino: "NOMBRE", alias: ["NOMBRE", "CLIENTE", "NOMBRES", "RAZONSOCIAL", "RAZON_SOCIAL", "APELLIDOS"], tipo: "texto", mayusculas: true, ejemplo: "JUAN PEREZ GOMEZ" },
      { destino: "DIRECCION", alias: ["DIRECCION", "DIR", "DOMICILIO", "DIRECCION_RESIDENCIA"], tipo: "texto", mayusculas: true, ejemplo: "CALLE 45 # 23-10 BUCARAMANGA" },
      { destino: "TELEFONO", alias: ["TELEFONO", "CELULAR", "TEL", "MOVIL", "WHATSAPP", "TELEFONO_1"], tipo: "texto", ejemplo: "3001234567" },
      { destino: "TELEFONO2", alias: ["TELEFONO2", "TEL2", "CELULAR2", "TELEFONO_2", "FIJO"], tipo: "texto", ejemplo: "3189876543" },
      { destino: "EMPRESA", alias: ["EMPRESA", "EMPRESA_CLIENTE", "LUGAR_TRABAJO"], tipo: "texto", mayusculas: true, ejemplo: "PUBLICIDAD EXPRESS" },
      { destino: "DIRECCIONEMP", alias: ["DIRECCIONEMP", "DIRECCION_EMPRESA", "DIREMP"], tipo: "texto", mayusculas: true, ejemplo: "CRA 27 # 36-12" },
      { destino: "SALDO", alias: ["SALDO", "DEUDA", "SALDO_PENDIENTE"], tipo: "numero", ejemplo: 0 },
      { destino: "NOTA", alias: ["NOTA", "NOTAS", "OBSERVACION", "OBSERVACIONES"], tipo: "texto", ejemplo: "CLIENTE FRECUENTE" },
    ],
  },
  {
    clave: "ACCESORIOS",
    etiqueta: "Accesorios (complementos de trajes)",
    tabla: "ACCESORIOS",
    conflicto: "CODBARRAS",
    campoObligatorio: "DESCRIPCION",
    campos: [
      { destino: "CODBARRAS", alias: ["CODBARRAS", "CODIGO", "BARCODE", "REF", "REFERENCIA"], tipo: "texto", ejemplo: "ACC-0001" },
      { destino: "DESCRIPCION", alias: ["DESCRIPCION", "NOMBRE", "ACCESORIO", "DETALLE"], tipo: "texto", mayusculas: true, ejemplo: "SOMBRERO DE PIRATA" },
      { destino: "CATEGORIA", alias: ["CATEGORIA", "GRUPO", "TIPO"], tipo: "texto", mayusculas: true, ejemplo: "SOMBREROS" },
      { destino: "TALLA", alias: ["TALLA", "SIZE", "TAMANO"], tipo: "texto", mayusculas: true, ejemplo: "UNICA" },
      { destino: "STOCK", alias: ["STOCK", "CANTIDAD", "EXISTENCIA"], tipo: "entero", ejemplo: 10 },
      { destino: "VALOR", alias: ["VALOR", "PRECIO", "VALOR_ALQUILER"], tipo: "numero", ejemplo: 15000 },
      { destino: "VALORDEPOSITO", alias: ["VALORDEPOSITO", "DEPOSITO", "GARANTIA"], tipo: "numero", ejemplo: 8000 },
      { destino: "NOTAS", alias: ["NOTAS", "NOTA", "OBSERVACIONES"], tipo: "texto", ejemplo: "" },
      { destino: "ACTIVO", alias: ["ACTIVO", "HABILITADO", "ESTADO"], tipo: "booleano", ejemplo: "SI" },
    ],
  },
  {
    clave: "GASTOS",
    etiqueta: "Gastos / salidas de caja",
    tabla: "gastos",
    campoObligatorio: "DESCRIPCIONSALIDA",
    campos: [
      { destino: "NUMEROGASTO", alias: ["NUMEROGASTO", "NUMERO", "CONSECUTIVO", "NRO"], tipo: "texto", ejemplo: "G-0001" },
      { destino: "DESCRIPCIONSALIDA", alias: ["DESCRIPCIONSALIDA", "DESCRIPCION", "CONCEPTO", "DETALLE", "MOTIVO"], tipo: "texto", mayusculas: true, ejemplo: "COMPRA DE INSUMOS DE COSTURA" },
      { destino: "VALORSALIDA", alias: ["VALORSALIDA", "VALOR", "MONTO", "TOTAL"], tipo: "texto", ejemplo: "50000" },
      { destino: "FECHA", alias: ["FECHA", "FECHA_GASTO", "DIA"], tipo: "fecha", ejemplo: "2026-01-15" },
    ],
  },
  {
    clave: "FACTURA",
    etiqueta: "Facturas / alquileres (encabezado)",
    tabla: "FACTURA",
    conflicto: "NUMEROFACT",
    campoObligatorio: "NUMEROFACT",
    campos: [
      { destino: "NUMEROFACT", alias: ["NUMEROFACT", "NUMERO", "FACTURA", "NRO_FACTURA"], tipo: "texto", ejemplo: "FV-1001" },
      { destino: "FECHASALIDA", alias: ["FECHASALIDA", "FECHA_SALIDA", "FECHA"], tipo: "fecha", ejemplo: "2026-01-10" },
      { destino: "FECHAENTRADA", alias: ["FECHAENTRADA", "FECHA_ENTRADA", "FECHA_DEVOLUCION"], tipo: "fecha", ejemplo: "2026-01-13" },
      { destino: "CCLIENTE", alias: ["CCLIENTE", "CLIENTE", "NOMBRE_CLIENTE", "NOMBRE"], tipo: "texto", mayusculas: true, ejemplo: "MARIA RODRIGUEZ" },
      { destino: "CCEDULA", alias: ["CCEDULA", "CEDULA", "DOCUMENTO", "NIT"], tipo: "texto", ejemplo: "1020304050" },
      { destino: "CTELEFONO", alias: ["CTELEFONO", "TELEFONO", "CELULAR"], tipo: "texto", ejemplo: "3101234567" },
      { destino: "CDIRECCION", alias: ["CDIRECCION", "DIRECCION"], tipo: "texto", mayusculas: true, ejemplo: "CALLE 45 # 23-10" },
      { destino: "CEMPRESA", alias: ["CEMPRESA", "EMPRESA"], tipo: "texto", mayusculas: true, ejemplo: "" },
      { destino: "FTOTALALQUILER", alias: ["FTOTALALQUILER", "TOTAL_ALQUILER", "TOTAL", "SUBTOTAL"], tipo: "numero", ejemplo: 120000 },
      { destino: "FTOTALDEPOSITO", alias: ["FTOTALDEPOSITO", "TOTAL_DEPOSITO", "DEPOSITO"], tipo: "numero", ejemplo: 60000 },
      { destino: "DESCUENTO", alias: ["DESCUENTO", "DTO"], tipo: "numero", ejemplo: 0 },
      { destino: "PAGOCONEFECTIVO", alias: ["PAGOCONEFECTIVO", "EFECTIVO", "PAGO_EFECTIVO"], tipo: "numero", ejemplo: 120000 },
      { destino: "PAGOCONTRANFERENCIA", alias: ["PAGOCONTRANFERENCIA", "TRANSFERENCIA", "PAGO_TRANSFERENCIA"], tipo: "numero", ejemplo: 0 },
      { destino: "TOTAL_SALDO", alias: ["TOTAL_SALDO", "SALDO", "DEUDA"], tipo: "numero", ejemplo: 0 },
      { destino: "FORMAPAGO", alias: ["FORMAPAGO", "FORMA_PAGO", "METODO_PAGO"], tipo: "texto", mayusculas: true, ejemplo: "EFECTIVO" },
      { destino: "MODO", alias: ["MODO", "TIPO_OPERACION"], tipo: "texto", mayusculas: true, ejemplo: "ALQUILER" },
      { destino: "VENDEDOR", alias: ["VENDEDOR", "CAJERO", "USUARIO"], tipo: "texto", mayusculas: true, ejemplo: "ADMINISTRADOR" },
      { destino: "ESTADOCLIENTE", alias: ["ESTADOCLIENTE", "ESTADO"], tipo: "texto", mayusculas: true, ejemplo: "ENTREGADO" },
    ],
  },
  {
    clave: "CAMPOFACTURA",
    etiqueta: "Detalle de facturas (líneas)",
    tabla: "CAMPOFACTURA",
    campoObligatorio: "DESCRIPCION",
    campos: [
      { destino: "NUMEROFACT", alias: ["NUMEROFACT", "NUMERO", "FACTURA"], tipo: "texto", ejemplo: "FV-1001" },
      { destino: "BARRAS", alias: ["BARRAS", "CODBARRAS", "CODIGO", "REF"], tipo: "texto", ejemplo: "DISF-0001" },
      { destino: "DESCRIPCION", alias: ["DESCRIPCION", "ARTICULO", "NOMBRE", "DETALLE"], tipo: "texto", mayusculas: true, ejemplo: "TRAJE DE PIRATA" },
      { destino: "CANTIDAD", alias: ["CANTIDAD", "CANT"], tipo: "numero", ejemplo: 1 },
      { destino: "VALOR", alias: ["VALOR", "PRECIO", "VALOR_ALQUILER"], tipo: "numero", ejemplo: 85000 },
      { destino: "VALORDEPOSITO", alias: ["VALORDEPOSITO", "DEPOSITO"], tipo: "numero", ejemplo: 40000 },
      { destino: "TOTAL", alias: ["TOTAL", "TOTAL_LINEA"], tipo: "numero", ejemplo: 85000 },
      { destino: "TOTALALQUILER", alias: ["TOTALALQUILER", "TOTAL_ALQUILER"], tipo: "numero", ejemplo: 85000 },
      { destino: "TOTALDEPOSITO", alias: ["TOTALDEPOSITO", "TOTAL_DEPOSITO"], tipo: "numero", ejemplo: 40000 },
    ],
  },
  {
    clave: "ABONO_CLIENTE",
    etiqueta: "Abonos de clientes",
    tabla: "ABONO_CLIENTE",
    campoObligatorio: "ACLIENTE",
    campos: [
      { destino: "NUMEROABONO", alias: ["NUMEROABONO", "NUMERO", "RECIBO"], tipo: "texto", ejemplo: "AB-0001" },
      { destino: "ACLIENTE", alias: ["ACLIENTE", "CLIENTE", "NOMBRE"], tipo: "texto", mayusculas: true, ejemplo: "MARIA RODRIGUEZ" },
      { destino: "AFACTURA", alias: ["AFACTURA", "FACTURA", "NUMEROFACT"], tipo: "texto", ejemplo: "FV-1001" },
      { destino: "FECHAABONO", alias: ["FECHAABONO", "FECHA"], tipo: "fecha", ejemplo: "2026-01-12" },
      { destino: "PAGOEFECTIVO", alias: ["PAGOEFECTIVO", "EFECTIVO"], tipo: "numero", ejemplo: 50000 },
      { destino: "PAGOTRANFE", alias: ["PAGOTRANFE", "TRANSFERENCIA"], tipo: "numero", ejemplo: 0 },
      { destino: "SALDOANTERIOR", alias: ["SALDOANTERIOR", "SALDO_ANTERIOR"], tipo: "numero", ejemplo: 80000 },
      { destino: "SALDODEBER", alias: ["SALDODEBER", "SALDO", "SALDO_ACTUAL"], tipo: "numero", ejemplo: 30000 },
      { destino: "TOTAL_ABONO", alias: ["TOTAL_ABONO", "TOTAL", "ABONO"], tipo: "numero", ejemplo: 50000 },
    ],
  },
  {
    clave: "DEPOSITOS",
    etiqueta: "Depósitos devueltos",
    tabla: "depositoentregado",
    campoObligatorio: "NUMEROFACTURA",
    campos: [
      { destino: "NUMEROFACTURA", alias: ["NUMEROFACTURA", "NUMEROFACT", "FACTURA", "NUMERO"], tipo: "texto", ejemplo: "FV-1001" },
      { destino: "VALOR", alias: ["VALOR", "MONTO", "DEPOSITO"], tipo: "entero", ejemplo: 40000 },
      { destino: "FECHA", alias: ["FECHA", "FECHA_DEVOLUCION"], tipo: "fecha", ejemplo: "2026-01-14" },
    ],
  },
  {
    clave: "MOVIMIENTOS",
    etiqueta: "Movimientos de inventario (kardex)",
    tabla: "MOVIMIENTOS_INVENTARIO",
    campoObligatorio: "DESCRIPCION",
    campos: [
      { destino: "CODBARRAS", alias: ["CODBARRAS", "CODIGO", "REF"], tipo: "texto", ejemplo: "DISF-0001" },
      { destino: "DESCRIPCION", alias: ["DESCRIPCION", "ARTICULO", "NOMBRE"], tipo: "texto", mayusculas: true, ejemplo: "TRAJE DE PIRATA" },
      { destino: "TALLA", alias: ["TALLA", "SIZE"], tipo: "texto", mayusculas: true, ejemplo: "L" },
      { destino: "TIPO_MOVIMIENTO", alias: ["TIPO_MOVIMIENTO", "TIPO", "MOVIMIENTO"], tipo: "texto", mayusculas: true, ejemplo: "ENTRADA" },
      { destino: "CANTIDAD", alias: ["CANTIDAD", "CANT"], tipo: "entero", ejemplo: 1 },
      { destino: "STOCK_ANTERIOR", alias: ["STOCK_ANTERIOR", "STOCK_ANT"], tipo: "entero", ejemplo: 4 },
      { destino: "STOCK_NUEVO", alias: ["STOCK_NUEVO", "STOCK_FINAL", "STOCK"], tipo: "entero", ejemplo: 5 },
      { destino: "MOTIVO", alias: ["MOTIVO", "CONCEPTO"], tipo: "texto", mayusculas: true, ejemplo: "COMPRA" },
      { destino: "USUARIO", alias: ["USUARIO", "RESPONSABLE"], tipo: "texto", mayusculas: true, ejemplo: "ADMINISTRADOR" },
      { destino: "NOTAS", alias: ["NOTAS", "OBSERVACIONES"], tipo: "texto", ejemplo: "" },
    ],
  },
  {
    clave: "CAJAS",
    etiqueta: "Cajas / resoluciones de facturación",
    tabla: "CAJAS",
    campoObligatorio: "NOMBRECAJA",
    campos: [
      { destino: "NOMBRECAJA", alias: ["NOMBRECAJA", "NOMBRE", "CAJA"], tipo: "texto", mayusculas: true, ejemplo: "CAJA PRINCIPAL" },
      { destino: "RESOLUCION", alias: ["RESOLUCION", "RES", "DIAN"], tipo: "texto", ejemplo: "18764000001234" },
      { destino: "PREFIJO", alias: ["PREFIJO", "SERIE"], tipo: "texto", mayusculas: true, ejemplo: "FV" },
      { destino: "NUMERACION", alias: ["NUMERACION", "CONSECUTIVO", "NUMERO_ACTUAL"], tipo: "entero", ejemplo: 1000 },
    ],
  },
  {
    clave: "LOGIN",
    etiqueta: "Usuarios del punto de venta",
    tabla: "LOGIN",
    campoObligatorio: "INOMBRE",
    campos: [
      { destino: "INOMBRE", alias: ["INOMBRE", "NOMBRE", "NOMBRES"], tipo: "texto", mayusculas: true, ejemplo: "CARLOS" },
      { destino: "IAPELLIDO", alias: ["IAPELLIDO", "APELLIDO", "APELLIDOS"], tipo: "texto", mayusculas: true, ejemplo: "ASSIA" },
      { destino: "ILOGIN", alias: ["ILOGIN", "USUARIO", "CODIGO_USUARIO"], tipo: "entero", ejemplo: 1 },
      { destino: "PASSWORD", alias: ["PASSWORD", "CLAVE", "CONTRASENA"], tipo: "texto", ejemplo: "1234" },
      { destino: "TIPO", alias: ["TIPO", "ADMINISTRADOR", "ES_ADMIN"], tipo: "booleano", ejemplo: "SI" },
      { destino: "ACCESOALMENU", alias: ["ACCESOALMENU", "ACCESO_MENU", "MENU"], tipo: "booleano", ejemplo: "SI" },
    ],
  },
];

export function obtenerTablaImportable(clave: string): TablaImportable | undefined {
  return TABLAS_IMPORTABLES.find((t) => t.clave === clave);
}

function normalizarClave(k: string) {
  return k.trim().toUpperCase().replace(/[\s_\-#.]/g, "");
}

function extraerValor(fila: any, nombresPosibles: string[]): any {
  const keys = Object.keys(fila);
  for (const nombre of nombresPosibles) {
    const keyMatch = keys.find((k) => normalizarClave(k) === normalizarClave(nombre));
    if (keyMatch && fila[keyMatch] !== undefined && fila[keyMatch] !== "") {
      return fila[keyMatch];
    }
  }
  return undefined;
}

function convertirFecha(valor: any): string | null {
  if (valor === undefined || valor === null || valor === "") return null;
  if (typeof valor === "number") {
    const parsed = XLSX.SSF.parse_date_code(valor);
    if (parsed) {
      const mm = String(parsed.m).padStart(2, "0");
      const dd = String(parsed.d).padStart(2, "0");
      return `${parsed.y}-${mm}-${dd}`;
    }
  }
  const texto = String(valor).trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2]!.padStart(2, "0")}-${dmy[1]!.padStart(2, "0")}`;
  const d = new Date(texto);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function convertirValor(valor: any, campo: CampoImportable): any {
  if (valor === undefined || valor === null || valor === "") {
    if (campo.tipo === "numero" || campo.tipo === "entero") return 0;
    return null;
  }
  switch (campo.tipo) {
    case "entero":
      return parseInt(String(valor).replace(/[^\d\-]/g, ""), 10) || 0;
    case "numero":
      return parseFloat(String(valor).replace(/[^\d.\-]/g, "")) || 0;
    case "fecha":
      return convertirFecha(valor);
    case "booleano": {
      const t = String(valor).trim().toUpperCase();
      return ["SI", "SÍ", "1", "TRUE", "VERDADERO", "X", "ACTIVO"].includes(t);
    }
    default: {
      const t = String(valor).trim();
      return campo.mayusculas ? t.toUpperCase() : t;
    }
  }
}

export function descargarPlantillaTabla(clave: string) {
  const def = obtenerTablaImportable(clave);
  if (!def) return;
  const ejemplo: Record<string, any> = {};
  for (const campo of def.campos) {
    ejemplo[campo.destino] = campo.ejemplo ?? "";
  }
  const ws = XLSX.utils.json_to_sheet([ejemplo]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, def.clave.slice(0, 30));
  XLSX.writeFile(wb, `Plantilla_${def.clave}_LaCasaDelDisfraz.xlsx`);
}

export async function importarLoteTabla(
  clave: string,
  filas: any[],
  modo: "upsert" | "insert" = "upsert"
): Promise<ResultadoImportacionExcel> {
  const resultado: ResultadoImportacionExcel = {
    totalFilas: filas.length,
    insertados: 0,
    actualizados: 0,
    errores: 0,
    detallesErrores: [],
  };

  const def = obtenerTablaImportable(clave);
  if (!def) {
    resultado.errores = filas.length;
    resultado.detallesErrores.push(`Tabla desconocida: ${clave}`);
    return resultado;
  }

  const registros: Record<string, any>[] = [];
  for (let i = 0; i < filas.length; i++) {
    const fila = filas[i];
    const registro: Record<string, any> = {};
    for (const campo of def.campos) {
      const bruto = extraerValor(fila, [campo.destino, ...campo.alias]);
      const valor = convertirValor(bruto, campo);
      if (valor !== null) registro[campo.destino] = valor;
    }

    if (def.campoObligatorio && !registro[def.campoObligatorio]) {
      resultado.errores++;
      resultado.detallesErrores.push(
        `Fila ${i + 1}: falta el dato obligatorio "${def.campoObligatorio}".`
      );
      continue;
    }
    registros.push(registro);
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < registros.length; i += CHUNK_SIZE) {
    const chunk = registros.slice(i, i + CHUNK_SIZE);
    const lote = Math.floor(i / CHUNK_SIZE) + 1;
    try {
      let mensajeError: string | null = null;

      if (modo === "upsert" && def.conflicto) {
        const { error } = await supabase
          .from(def.tabla as any)
          .upsert(chunk as any, { onConflict: def.conflicto });
        if (error) {
          const { error: errInsert } = await supabase.from(def.tabla as any).insert(chunk as any);
          mensajeError = errInsert ? errInsert.message : null;
        }
      } else {
        const { error } = await supabase.from(def.tabla as any).insert(chunk as any);
        mensajeError = error ? error.message : null;
      }

      if (mensajeError) {
        resultado.errores += chunk.length;
        resultado.detallesErrores.push(`Lote ${lote}: ${mensajeError}`);
      } else {
        resultado.insertados += chunk.length;
      }
    } catch (e: any) {
      resultado.errores += chunk.length;
      resultado.detallesErrores.push(`Lote ${lote}: ${e?.message || "Error desconocido"}`);
    }
  }

  return resultado;
}
