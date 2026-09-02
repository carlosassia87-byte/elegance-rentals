// Tipos TypeScript para el esquema WINDEV (CLIENTES.wda) en Supabase / PostgreSQL

export interface Articulo {
  IDARTICULO: number;
  DESCRIPCION: string;
  TALLA: string;
  STOCK: number;
  VALOR: number;
  CODBARRAS: string;
  IDCAMPOFACTURA?: number;
  VALORDEPOSITO: number;
}

export interface Cliente {
  IDCLIENTES: number;
  CEDULA: number;
  DIRECCION: string;
  TELEFONO: string;
  TELEFONO2?: string;
  EMPRESA?: string;
  DIRECCIONEMP?: string;
  NOMBRE: string;
  SALDO: number;
  NOTA?: string;
}

export interface Factura {
  IDFACTURA: number;
  NUMEROFACT: string;
  FECHASALIDA: string; // YYYY-MM-DD
  FECHAENTRADA: string; // YYYY-MM-DD
  FTOTALDEPOSITO: number;
  FTOTALVENTADEPOSITO: number;
  FORMAPAGO: string;
  MODO?: string;
  VENDEDOR?: string;
  CCLIENTE: string;
  CAMBIOS?: number;
  PAGACON?: number;
  AUTOMATIC?: number;
  IDFCLIENTES?: number;
  ESTADOCLIENTE?: string;
  IDF_PAGO?: number;
  CDIRECCION?: string;
  CTELEFONO?: string;
  CTELEFONO1?: string;
  CEMPRESA?: string;
  CCEDULA?: string;
  GASTOS?: string;
  PAGOCONEFECTIVO: number;
  PAGOCONTRANFERENCIA: number;
  FTOTALALQUILER: number;
  FPAGOTRANS?: string;
  DESCUENTO: number;
  P_SALDO_EFECTIVO?: number;
  P_SALDO_TRANFERENCIA?: number;
  TOTAL_SALDO?: number;
  FECHA_RECIBO?: string;
  SALDOA_BONADO?: number;
  FECHAINGRESO?: string;
}

export interface CampoFactura {
  AUTOMATIC?: number;
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
}

export interface AbonoCliente {
  IDABONO_CLIENTE?: number;
  NUMEROABONO: string;
  ACLIENTE: string;
  AFACTURA: string;
  PAGOEFECTIVO: number;
  PAGOTRANFE: number;
  FECHAABONO: string;
  SALDOANTERIOR: number;
  SALDODEBER: number;
  TOTAL_ABONO: number;
}

export interface DepositoEntregado {
  IDdepositoentregado?: number;
  NUMEROFACTURA: string;
  VALOR: number;
  FECHA: string;
}

export interface Gasto {
  IDgastos?: number;
  DESCRIPCIONSALIDA: string;
  FECHA: string;
  VALORSALIDA: string;
  NUMEROGASTO: string;
}

export interface Caja {
  IDCAJAS: number;
  NOMBRECAJA: string;
  RESOLUCION?: string;
  NUMERACION: number;
  PREFIJO: string;
}

export interface ItemAlquilerCarrito {
  idTemp: string;
  articulo?: Articulo;
  descripcion: string;
  talla: string;
  codigoBarras: string;
  cantidad: number;
  valorAlquiler: number;
  totalAlquiler: number;
  valorDeposito: number;
  totalDeposito: number;
  totalGeneral: number;
}
