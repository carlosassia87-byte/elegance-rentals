// Tipos TypeScript para el esquema WINDEV (CLIENTES.wda) en Supabase / PostgreSQL

export interface Articulo {
  IDARTICULO: number;
  DESCRIPCION: string;
  TALLA: string;
  STOCK: number;
  VALOR: number;
  CODBARRAS: string;
  IDCAMPOFACTURA?: number | undefined;
  VALORDEPOSITO: number;
  IMAGEN_URL?: string | undefined;
  DISPONIBLE?: boolean | undefined;
  CATEGORIA?: string | undefined;
  DESTACADO?: boolean | undefined;
  DESCRIPCION_WEB?: string | undefined;
}

export interface Cliente {
  IDCLIENTES: number;
  CEDULA: number;
  DIRECCION: string;
  TELEFONO: string;
  TELEFONO2?: string | undefined;
  EMPRESA?: string | undefined;
  DIRECCIONEMP?: string | undefined;
  NOMBRE: string;
  SALDO: number;
  NOTA?: string | undefined;
}

export interface Factura {
  IDFACTURA: number;
  NUMEROFACT: string;
  FECHASALIDA?: string | undefined; // YYYY-MM-DD
  FECHAENTRADA?: string | undefined; // YYYY-MM-DD
  FTOTALDEPOSITO: number;
  FTOTALVENTADEPOSITO: number;
  FORMAPAGO: string;
  MODO?: string | undefined;
  VENDEDOR?: string | undefined;
  CCLIENTE: string;
  CAMBIOS?: number | undefined;
  PAGACON?: number | undefined;
  AUTOMATIC?: number | undefined;
  IDFCLIENTES?: number | undefined;
  ESTADOCLIENTE?: string | undefined;
  IDF_PAGO?: number | undefined;
  CDIRECCION?: string | undefined;
  CTELEFONO?: string | undefined;
  CTELEFONO1?: string | undefined;
  CEMPRESA?: string | undefined;
  CCEDULA?: string | undefined;
  GASTOS?: string | undefined;
  PAGOCONEFECTIVO: number;
  PAGOCONTRANFERENCIA: number;
  FTOTALALQUILER: number;
  FPAGOTRANS?: string | undefined;
  DESCUENTO: number;
  P_SALDO_EFECTIVO?: number | undefined;
  P_SALDO_TRANFERENCIA?: number | undefined;
  TOTAL_SALDO?: number | undefined;
  FECHA_RECIBO?: string | undefined;
  SALDOA_BONADO?: number | undefined;
  FECHAINGRESO?: string | undefined;
}

export interface CampoFactura {
  AUTOMATIC?: number | undefined;
  DESCRIPCION: string;
  CANTIDAD: number;
  VALOR: number;
  TOTAL: number;
  BARRAS: string;
  NUMEROFACT: string;
  IDFACTURA: number;
  VALORDEPOSITO: number;
  TOTALALQUILER: number;
  TOTALDEPOSITO: number;
  ES_ACCESORIO?: boolean;
  ID_TRAJE_PADRE?: string;
  PIEZAS_INCLUIDAS?: string;
}

export interface AbonoCliente {
  IDABONO_CLIENTE?: number | undefined;
  NUMEROABONO: string;
  ACLIENTE: string;
  AFACTURA: string;
  PAGOEFECTIVO: number;
  PAGOTRANFE: number;
  FECHAABONO?: string | undefined;
  SALDOANTERIOR: number;
  SALDODEBER: number;
  TOTAL_ABONO: number;
}

export interface DepositoEntregado {
  IDdepositoentregado?: number | undefined;
  NUMEROFACTURA: string;
  VALOR: number;
  FECHA?: string | undefined;
}

export interface Gasto {
  IDgastos?: number | undefined;
  DESCRIPCIONSALIDA: string;
  FECHA?: string | undefined;
  VALORSALIDA: string;
  NUMEROGASTO: string;
}

export interface Caja {
  IDCAJAS: number;
  NOMBRECAJA: string;
  RESOLUCION?: string | undefined;
  NUMERACION: number;
  PREFIJO: string;
}

export interface Accesorio {
  IDACCESORIO?: number;
  CODBARRAS: string;
  DESCRIPCION: string;
  CATEGORIA: string;
  TALLA?: string;
  STOCK: number;
  VALOR: number;
  VALORDEPOSITO: number;
  IDARTICULO_PADRE?: number | null;
  NOTAS?: string;
  ACTIVO?: boolean;
}

export interface ItemAlquilerCarrito {
  idTemp: string;
  articulo?: Articulo | undefined;
  accesorio?: Accesorio | undefined;
  esAccesorio?: boolean;
  idTrajePadre?: string;
  descripcion: string;
  talla: string;
  codigoBarras: string;
  cantidad: number;
  valorAlquiler: number;
  totalAlquiler: number;
  valorDeposito: number;
  totalDeposito: number;
  totalGeneral: number;
  piezasIncluidas?: string[];
}

