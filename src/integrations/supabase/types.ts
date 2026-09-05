export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ABONO_CLIENTE: {
        Row: {
          ACLIENTE: string | null
          AFACTURA: string | null
          FECHAABONO: string | null
          IDABONO_CLIENTE: number
          NUMEROABONO: string | null
          PAGOEFECTIVO: number | null
          PAGOTRANFE: number | null
          SALDOANTERIOR: number | null
          SALDODEBER: number | null
          TOTAL_ABONO: number | null
        }
        Insert: {
          ACLIENTE?: string | null
          AFACTURA?: string | null
          FECHAABONO?: string | null
          IDABONO_CLIENTE?: number
          NUMEROABONO?: string | null
          PAGOEFECTIVO?: number | null
          PAGOTRANFE?: number | null
          SALDOANTERIOR?: number | null
          SALDODEBER?: number | null
          TOTAL_ABONO?: number | null
        }
        Update: {
          ACLIENTE?: string | null
          AFACTURA?: string | null
          FECHAABONO?: string | null
          IDABONO_CLIENTE?: number
          NUMEROABONO?: string | null
          PAGOEFECTIVO?: number | null
          PAGOTRANFE?: number | null
          SALDOANTERIOR?: number | null
          SALDODEBER?: number | null
          TOTAL_ABONO?: number | null
        }
        Relationships: []
      }
      ARTICULO: {
        Row: {
          CODBARRAS: string | null
          DESCRIPCION: string | null
          IDARTICULO: number
          IDCAMPOFACTURA: number | null
          STOCK: number | null
          TALLA: string | null
          VALOR: number | null
          VALORDEPOSITO: number | null
        }
        Insert: {
          CODBARRAS?: string | null
          DESCRIPCION?: string | null
          IDARTICULO?: number
          IDCAMPOFACTURA?: number | null
          STOCK?: number | null
          TALLA?: string | null
          VALOR?: number | null
          VALORDEPOSITO?: number | null
        }
        Update: {
          CODBARRAS?: string | null
          DESCRIPCION?: string | null
          IDARTICULO?: number
          IDCAMPOFACTURA?: number | null
          STOCK?: number | null
          TALLA?: string | null
          VALOR?: number | null
          VALORDEPOSITO?: number | null
        }
        Relationships: []
      }
      CAJAS: {
        Row: {
          IDCAJAS: number
          NOMBRECAJA: string | null
          NUMERACION: number | null
          PREFIJO: string | null
          RESOLUCION: string | null
        }
        Insert: {
          IDCAJAS?: number
          NOMBRECAJA?: string | null
          NUMERACION?: number | null
          PREFIJO?: string | null
          RESOLUCION?: string | null
        }
        Update: {
          IDCAJAS?: number
          NOMBRECAJA?: string | null
          NUMERACION?: number | null
          PREFIJO?: string | null
          RESOLUCION?: string | null
        }
        Relationships: []
      }
      CAMPOFACTURA: {
        Row: {
          AUTOMATIC: number
          BARRAS: string | null
          CANTIDAD: number | null
          DESCRIPCION: string | null
          IDFACTURA: number | null
          NUMEROFACT: string | null
          TOTAL: number | null
          TOTALALQUILER: number | null
          TOTALDEPOSITO: number | null
          VALOR: number | null
          VALORDEPOSITO: number | null
        }
        Insert: {
          AUTOMATIC?: number
          BARRAS?: string | null
          CANTIDAD?: number | null
          DESCRIPCION?: string | null
          IDFACTURA?: number | null
          NUMEROFACT?: string | null
          TOTAL?: number | null
          TOTALALQUILER?: number | null
          TOTALDEPOSITO?: number | null
          VALOR?: number | null
          VALORDEPOSITO?: number | null
        }
        Update: {
          AUTOMATIC?: number
          BARRAS?: string | null
          CANTIDAD?: number | null
          DESCRIPCION?: string | null
          IDFACTURA?: number | null
          NUMEROFACT?: string | null
          TOTAL?: number | null
          TOTALALQUILER?: number | null
          TOTALDEPOSITO?: number | null
          VALOR?: number | null
          VALORDEPOSITO?: number | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      CLIENTES: {
        Row: {
          CEDULA: number | null
          DIRECCION: string | null
          DIRECCIONEMP: string | null
          EMPRESA: string | null
          IDCLIENTES: number
          NOMBRE: string | null
          NOTA: string | null
          SALDO: number | null
          TELEFONO: string | null
          TELEFONO2: string | null
        }
        Insert: {
          CEDULA?: number | null
          DIRECCION?: string | null
          DIRECCIONEMP?: string | null
          EMPRESA?: string | null
          IDCLIENTES?: number
          NOMBRE?: string | null
          NOTA?: string | null
          SALDO?: number | null
          TELEFONO?: string | null
          TELEFONO2?: string | null
        }
        Update: {
          CEDULA?: number | null
          DIRECCION?: string | null
          DIRECCIONEMP?: string | null
          EMPRESA?: string | null
          IDCLIENTES?: number
          NOMBRE?: string | null
          NOTA?: string | null
          SALDO?: number | null
          TELEFONO?: string | null
          TELEFONO2?: string | null
        }
        Relationships: []
      }
      clientesregistrados: {
        Row: {
          EDIRECCION: string | null
          EMAIL: string | null
          ENOMBRE: string | null
          ETELEFONO: string | null
          ETIPO: string | null
          IDEmpresa: number
          IDnumero_de_serie: number | null
          LOGO: string | null
          MENSAJE: string | null
          NIT: string | null
          RAZOSOCIAL: string | null
          SERIE: string | null
          WEB: string | null
        }
        Insert: {
          EDIRECCION?: string | null
          EMAIL?: string | null
          ENOMBRE?: string | null
          ETELEFONO?: string | null
          ETIPO?: string | null
          IDEmpresa?: number
          IDnumero_de_serie?: number | null
          LOGO?: string | null
          MENSAJE?: string | null
          NIT?: string | null
          RAZOSOCIAL?: string | null
          SERIE?: string | null
          WEB?: string | null
        }
        Update: {
          EDIRECCION?: string | null
          EMAIL?: string | null
          ENOMBRE?: string | null
          ETELEFONO?: string | null
          ETIPO?: string | null
          IDEmpresa?: number
          IDnumero_de_serie?: number | null
          LOGO?: string | null
          MENSAJE?: string | null
          NIT?: string | null
          RAZOSOCIAL?: string | null
          SERIE?: string | null
          WEB?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_clientesregistrados_serie"
            columns: ["IDnumero_de_serie"]
            isOneToOne: false
            referencedRelation: "numero_de_serie"
            referencedColumns: ["IDnumero_de_serie"]
          },
        ]
      }
      contraseñas: {
        Row: {
          BORRADO: string | null
          CONFIGURACIONES: string | null
          IDcontraseñas: number
          PERMISOS: string | null
        }
        Insert: {
          BORRADO?: string | null
          CONFIGURACIONES?: string | null
          IDcontraseñas?: number
          PERMISOS?: string | null
        }
        Update: {
          BORRADO?: string | null
          CONFIGURACIONES?: string | null
          IDcontraseñas?: number
          PERMISOS?: string | null
        }
        Relationships: []
      }
      depositoentregado: {
        Row: {
          FECHA: string | null
          IDdepositoentregado: number
          NUMEROFACTURA: string | null
          VALOR: number | null
        }
        Insert: {
          FECHA?: string | null
          IDdepositoentregado?: number
          NUMEROFACTURA?: string | null
          VALOR?: number | null
        }
        Update: {
          FECHA?: string | null
          IDdepositoentregado?: number
          NUMEROFACTURA?: string | null
          VALOR?: number | null
        }
        Relationships: []
      }
      Empresa: {
        Row: {
          EDIRECCION: string | null
          EMAIL: string | null
          ENOMBRE: string | null
          ETELEFONO: string | null
          ETIPO: string | null
          IDEmpresa: number
          LOGO: string | null
          MENSAJE: string | null
          NIT: string | null
          RAZOSOCIAL: string | null
          SERIE: string | null
          WEB: string | null
        }
        Insert: {
          EDIRECCION?: string | null
          EMAIL?: string | null
          ENOMBRE?: string | null
          ETELEFONO?: string | null
          ETIPO?: string | null
          IDEmpresa?: number
          LOGO?: string | null
          MENSAJE?: string | null
          NIT?: string | null
          RAZOSOCIAL?: string | null
          SERIE?: string | null
          WEB?: string | null
        }
        Update: {
          EDIRECCION?: string | null
          EMAIL?: string | null
          ENOMBRE?: string | null
          ETELEFONO?: string | null
          ETIPO?: string | null
          IDEmpresa?: number
          LOGO?: string | null
          MENSAJE?: string | null
          NIT?: string | null
          RAZOSOCIAL?: string | null
          SERIE?: string | null
          WEB?: string | null
        }
        Relationships: []
      }
      EMPRESA_CONFIG: {
        Row: {
          CIUDAD: string | null
          DIAS_ALQUILER: number | null
          DIRECCION: string | null
          EMAIL: string | null
          ID: number
          LOGO_URL: string | null
          MENSAJE_PIE: string | null
          MONEDA: string | null
          NIT: string | null
          NOMBRE_COMERCIAL: string | null
          RAZON_SOCIAL: string | null
          REGIMEN: string | null
          SIMBOLO_MONEDA: string | null
          TELEFONO1: string | null
          TELEFONO2: string | null
          TERMINOS: string | null
        }
        Insert: {
          CIUDAD?: string | null
          DIAS_ALQUILER?: number | null
          DIRECCION?: string | null
          EMAIL?: string | null
          ID?: number
          LOGO_URL?: string | null
          MENSAJE_PIE?: string | null
          MONEDA?: string | null
          NIT?: string | null
          NOMBRE_COMERCIAL?: string | null
          RAZON_SOCIAL?: string | null
          REGIMEN?: string | null
          SIMBOLO_MONEDA?: string | null
          TELEFONO1?: string | null
          TELEFONO2?: string | null
          TERMINOS?: string | null
        }
        Update: {
          CIUDAD?: string | null
          DIAS_ALQUILER?: number | null
          DIRECCION?: string | null
          EMAIL?: string | null
          ID?: number
          LOGO_URL?: string | null
          MENSAJE_PIE?: string | null
          MONEDA?: string | null
          NIT?: string | null
          NOMBRE_COMERCIAL?: string | null
          RAZON_SOCIAL?: string | null
          REGIMEN?: string | null
          SIMBOLO_MONEDA?: string | null
          TELEFONO1?: string | null
          TELEFONO2?: string | null
          TERMINOS?: string | null
        }
        Relationships: []
      }
      ESTADO_CLI: {
        Row: {
          ESTADOCLI: string
          IDESTADO_CLI: number
        }
        Insert: {
          ESTADOCLI?: string
          IDESTADO_CLI?: number
        }
        Update: {
          ESTADOCLI?: string
          IDESTADO_CLI?: number
        }
        Relationships: []
      }
      ESTADO_TRAJE: {
        Row: {
          ESTADO_TRAJE: number | null
          IDESTADO_TRAJE: number
        }
        Insert: {
          ESTADO_TRAJE?: number | null
          IDESTADO_TRAJE?: number
        }
        Update: {
          ESTADO_TRAJE?: number | null
          IDESTADO_TRAJE?: number
        }
        Relationships: []
      }
      F_PAGO: {
        Row: {
          FDEPAGO: string | null
          IDESTADCLI: number
        }
        Insert: {
          FDEPAGO?: string | null
          IDESTADCLI?: number
        }
        Update: {
          FDEPAGO?: string | null
          IDESTADCLI?: number
        }
        Relationships: []
      }
      FACTURA: {
        Row: {
          AUTOMATIC: number | null
          CAMBIOS: number | null
          CCEDULA: string | null
          CCLIENTE: string | null
          CDIRECCION: string | null
          CEMPRESA: string | null
          CTELEFONO: string | null
          CTELEFONO1: string | null
          DESCUENTO: number | null
          ESTADOCLIENTE: string | null
          FECHA_RECIBO: string | null
          FECHAENTRADA: string | null
          FECHAINGRESO: string | null
          FECHASALIDA: string | null
          FORMAPAGO: string | null
          FPAGOTRANS: string | null
          FTOTALALQUILER: number | null
          FTOTALDEPOSITO: number | null
          FTOTALVENTADEPOSITO: number | null
          GASTOS: string | null
          IDF_PAGO: number | null
          IDFACTURA: number
          IDFCLIENTES: number | null
          MODO: string | null
          NUMEROFACT: string | null
          P_SALDO_EFECTIVO: number | null
          P_SALDO_TRANFERENCIA: number | null
          PAGACON: number | null
          PAGOCONEFECTIVO: number | null
          PAGOCONTRANFERENCIA: number | null
          SALDOA_BONADO: number | null
          TOTAL_SALDO: number | null
          VENDEDOR: string | null
        }
        Insert: {
          AUTOMATIC?: number | null
          CAMBIOS?: number | null
          CCEDULA?: string | null
          CCLIENTE?: string | null
          CDIRECCION?: string | null
          CEMPRESA?: string | null
          CTELEFONO?: string | null
          CTELEFONO1?: string | null
          DESCUENTO?: number | null
          ESTADOCLIENTE?: string | null
          FECHA_RECIBO?: string | null
          FECHAENTRADA?: string | null
          FECHAINGRESO?: string | null
          FECHASALIDA?: string | null
          FORMAPAGO?: string | null
          FPAGOTRANS?: string | null
          FTOTALALQUILER?: number | null
          FTOTALDEPOSITO?: number | null
          FTOTALVENTADEPOSITO?: number | null
          GASTOS?: string | null
          IDF_PAGO?: number | null
          IDFACTURA?: number
          IDFCLIENTES?: number | null
          MODO?: string | null
          NUMEROFACT?: string | null
          P_SALDO_EFECTIVO?: number | null
          P_SALDO_TRANFERENCIA?: number | null
          PAGACON?: number | null
          PAGOCONEFECTIVO?: number | null
          PAGOCONTRANFERENCIA?: number | null
          SALDOA_BONADO?: number | null
          TOTAL_SALDO?: number | null
          VENDEDOR?: string | null
        }
        Update: {
          AUTOMATIC?: number | null
          CAMBIOS?: number | null
          CCEDULA?: string | null
          CCLIENTE?: string | null
          CDIRECCION?: string | null
          CEMPRESA?: string | null
          CTELEFONO?: string | null
          CTELEFONO1?: string | null
          DESCUENTO?: number | null
          ESTADOCLIENTE?: string | null
          FECHA_RECIBO?: string | null
          FECHAENTRADA?: string | null
          FECHAINGRESO?: string | null
          FECHASALIDA?: string | null
          FORMAPAGO?: string | null
          FPAGOTRANS?: string | null
          FTOTALALQUILER?: number | null
          FTOTALDEPOSITO?: number | null
          FTOTALVENTADEPOSITO?: number | null
          GASTOS?: string | null
          IDF_PAGO?: number | null
          IDFACTURA?: number
          IDFCLIENTES?: number | null
          MODO?: string | null
          NUMEROFACT?: string | null
          P_SALDO_EFECTIVO?: number | null
          P_SALDO_TRANFERENCIA?: number | null
          PAGACON?: number | null
          PAGOCONEFECTIVO?: number | null
          PAGOCONTRANFERENCIA?: number | null
          SALDOA_BONADO?: number | null
          TOTAL_SALDO?: number | null
          VENDEDOR?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_factura_automatic"
            columns: ["AUTOMATIC"]
            isOneToOne: false
            referencedRelation: "CAMPOFACTURA"
            referencedColumns: ["AUTOMATIC"]
          },
        ]
      }
      FACTURA1: {
        Row: {
          AUTOMATIC: number | null
          CAMBIOS: number | null
          CCEDULA: string | null
          CCLIENTE: string | null
          CDIRECCION: string | null
          CEMPRESA: string | null
          CTELEFONO: string | null
          CTELEFONO1: string | null
          DESCUENTO: number | null
          ESTADOCLIENTE: string | null
          FECHAENTRADA: string | null
          FECHASALIDA: string | null
          FORMAPAGO: string | null
          FPAGOTRANS: string | null
          FTOTALALQUILER: number | null
          FTOTALDEPOSITO: number | null
          FTOTALVENTADEPOSITO: number | null
          GASTOS: string | null
          IDF_PAGO: number | null
          IDFACTURA: number
          IDFCLIENTES: number | null
          MODO: string | null
          NUMEROFACT: string | null
          PAGACON: number | null
          PAGOCONEFECTIVO: number | null
          PAGOCONTRANFERENCIA: number | null
          VENDEDOR: string | null
        }
        Insert: {
          AUTOMATIC?: number | null
          CAMBIOS?: number | null
          CCEDULA?: string | null
          CCLIENTE?: string | null
          CDIRECCION?: string | null
          CEMPRESA?: string | null
          CTELEFONO?: string | null
          CTELEFONO1?: string | null
          DESCUENTO?: number | null
          ESTADOCLIENTE?: string | null
          FECHAENTRADA?: string | null
          FECHASALIDA?: string | null
          FORMAPAGO?: string | null
          FPAGOTRANS?: string | null
          FTOTALALQUILER?: number | null
          FTOTALDEPOSITO?: number | null
          FTOTALVENTADEPOSITO?: number | null
          GASTOS?: string | null
          IDF_PAGO?: number | null
          IDFACTURA?: number
          IDFCLIENTES?: number | null
          MODO?: string | null
          NUMEROFACT?: string | null
          PAGACON?: number | null
          PAGOCONEFECTIVO?: number | null
          PAGOCONTRANFERENCIA?: number | null
          VENDEDOR?: string | null
        }
        Update: {
          AUTOMATIC?: number | null
          CAMBIOS?: number | null
          CCEDULA?: string | null
          CCLIENTE?: string | null
          CDIRECCION?: string | null
          CEMPRESA?: string | null
          CTELEFONO?: string | null
          CTELEFONO1?: string | null
          DESCUENTO?: number | null
          ESTADOCLIENTE?: string | null
          FECHAENTRADA?: string | null
          FECHASALIDA?: string | null
          FORMAPAGO?: string | null
          FPAGOTRANS?: string | null
          FTOTALALQUILER?: number | null
          FTOTALDEPOSITO?: number | null
          FTOTALVENTADEPOSITO?: number | null
          GASTOS?: string | null
          IDF_PAGO?: number | null
          IDFACTURA?: number
          IDFCLIENTES?: number | null
          MODO?: string | null
          NUMEROFACT?: string | null
          PAGACON?: number | null
          PAGOCONEFECTIVO?: number | null
          PAGOCONTRANFERENCIA?: number | null
          VENDEDOR?: string | null
        }
        Relationships: []
      }
      gastos: {
        Row: {
          DESCRIPCIONSALIDA: string | null
          FECHA: string | null
          IDgastos: number
          NUMEROGASTO: string | null
          VALORSALIDA: string | null
        }
        Insert: {
          DESCRIPCIONSALIDA?: string | null
          FECHA?: string | null
          IDgastos?: number
          NUMEROGASTO?: string | null
          VALORSALIDA?: string | null
        }
        Update: {
          DESCRIPCIONSALIDA?: string | null
          FECHA?: string | null
          IDgastos?: number
          NUMEROGASTO?: string | null
          VALORSALIDA?: string | null
        }
        Relationships: []
      }
      LOGIN: {
        Row: {
          ACCESOALMENU: boolean | null
          IAPELLIDO: string | null
          IDLOGIN: number
          ILOGIN: number | null
          INOMBRE: string | null
          PASSWORD: string | null
          TIPO: boolean | null
        }
        Insert: {
          ACCESOALMENU?: boolean | null
          IAPELLIDO?: string | null
          IDLOGIN?: number
          ILOGIN?: number | null
          INOMBRE?: string | null
          PASSWORD?: string | null
          TIPO?: boolean | null
        }
        Update: {
          ACCESOALMENU?: boolean | null
          IAPELLIDO?: string | null
          IDLOGIN?: number
          ILOGIN?: number | null
          INOMBRE?: string | null
          PASSWORD?: string | null
          TIPO?: boolean | null
        }
        Relationships: []
      }
      MOVIMIENTOS_INVENTARIO: {
        Row: {
          CANTIDAD: number
          CODBARRAS: string | null
          DESCRIPCION: string | null
          FECHA: string | null
          IDARTICULO: number | null
          IDMOVIMIENTO: number
          MOTIVO: string | null
          NOTAS: string | null
          STOCK_ANTERIOR: number | null
          STOCK_NUEVO: number | null
          TALLA: string | null
          TIPO_MOVIMIENTO: string | null
          USUARIO: string | null
        }
        Insert: {
          CANTIDAD?: number
          CODBARRAS?: string | null
          DESCRIPCION?: string | null
          FECHA?: string | null
          IDARTICULO?: number | null
          IDMOVIMIENTO?: number
          MOTIVO?: string | null
          NOTAS?: string | null
          STOCK_ANTERIOR?: number | null
          STOCK_NUEVO?: number | null
          TALLA?: string | null
          TIPO_MOVIMIENTO?: string | null
          USUARIO?: string | null
        }
        Update: {
          CANTIDAD?: number
          CODBARRAS?: string | null
          DESCRIPCION?: string | null
          FECHA?: string | null
          IDARTICULO?: number | null
          IDMOVIMIENTO?: number
          MOTIVO?: string | null
          NOTAS?: string | null
          STOCK_ANTERIOR?: number | null
          STOCK_NUEVO?: number | null
          TALLA?: string | null
          TIPO_MOVIMIENTO?: string | null
          USUARIO?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "MOVIMIENTOS_INVENTARIO_IDARTICULO_fkey"
            columns: ["IDARTICULO"]
            isOneToOne: false
            referencedRelation: "ARTICULO"
            referencedColumns: ["IDARTICULO"]
          },
        ]
      }
      numero_de_serie: {
        Row: {
          IDnumero_de_serie: number
          SERIE: string | null
        }
        Insert: {
          IDnumero_de_serie?: number
          SERIE?: string | null
        }
        Update: {
          IDnumero_de_serie?: number
          SERIE?: string | null
        }
        Relationships: []
      }
      OTRAS_F_PAGO: {
        Row: {
          IDOTRA_F_PAGO: number
          OTRAS_F_PAGO: string | null
        }
        Insert: {
          IDOTRA_F_PAGO?: number
          OTRAS_F_PAGO?: string | null
        }
        Update: {
          IDOTRA_F_PAGO?: number
          OTRAS_F_PAGO?: string | null
        }
        Relationships: []
      }
      rentals: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string | null
          end_date: string
          id: string
          notes: string | null
          size_id: string | null
          start_date: string
          status: string
          suit_id: string
          suit_size_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_email: string
          customer_name: string
          customer_phone?: string | null
          end_date: string
          id?: string
          notes?: string | null
          size_id?: string | null
          start_date: string
          status?: string
          suit_id: string
          suit_size_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string | null
          end_date?: string
          id?: string
          notes?: string | null
          size_id?: string | null
          start_date?: string
          status?: string
          suit_id?: string
          suit_size_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rentals_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_suit_id_fkey"
            columns: ["suit_id"]
            isOneToOne: false
            referencedRelation: "suits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rentals_suit_size_id_fkey"
            columns: ["suit_size_id"]
            isOneToOne: false
            referencedRelation: "suit_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      sizes: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      suit_sizes: {
        Row: {
          created_at: string
          id: string
          size_id: string
          stock: number
          suit_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          size_id: string
          stock?: number
          suit_id: string
        }
        Update: {
          created_at?: string
          id?: string
          size_id?: string
          stock?: number
          suit_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suit_sizes_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "sizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suit_sizes_suit_id_fkey"
            columns: ["suit_id"]
            isOneToOne: false
            referencedRelation: "suits"
            referencedColumns: ["id"]
          },
        ]
      }
      suits: {
        Row: {
          category_id: string | null
          color: string | null
          created_at: string
          description: string | null
          id: string
          images: string[] | null
          name: string
          price_per_day: number
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name: string
          price_per_day?: number
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          images?: string[] | null
          name?: string
          price_per_day?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "suits_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      TRANSACCIONES: {
        Row: {
          IDTRANSACCIONES: number
          TRANSACCIONES_BUSCAR: string
          TRANSACCIONES_Tabla_FACTURA_CCLIENTE: string
          TRANSACCIONES_Tabla_FACTURA_FECHAENTRADA: string
          TRANSACCIONES_Tabla_FACTURA_FECHASALIDA: string
          TRANSACCIONES_Tabla_FACTURA_FORMAPAGO: number
          TRANSACCIONES_Tabla_FACTURA_IDFACTURA: number
          TRANSACCIONES_Tabla_FACTURA_MODO: string
          TRANSACCIONES_Tabla_FACTURA_NUMEROFACT: string
          TRANSACCIONES_Tabla_FACTURA_SUBTOTAL: number
          TRANSACCIONES_Tabla_FACTURA_TOTALVENTA: number
          TRANSACCIONES_Tabla_FACTURA_VENDEDOR: string
        }
        Insert: {
          IDTRANSACCIONES?: number
          TRANSACCIONES_BUSCAR: string
          TRANSACCIONES_Tabla_FACTURA_CCLIENTE: string
          TRANSACCIONES_Tabla_FACTURA_FECHAENTRADA: string
          TRANSACCIONES_Tabla_FACTURA_FECHASALIDA: string
          TRANSACCIONES_Tabla_FACTURA_FORMAPAGO?: number
          TRANSACCIONES_Tabla_FACTURA_IDFACTURA?: number
          TRANSACCIONES_Tabla_FACTURA_MODO: string
          TRANSACCIONES_Tabla_FACTURA_NUMEROFACT: string
          TRANSACCIONES_Tabla_FACTURA_SUBTOTAL?: number
          TRANSACCIONES_Tabla_FACTURA_TOTALVENTA?: number
          TRANSACCIONES_Tabla_FACTURA_VENDEDOR: string
        }
        Update: {
          IDTRANSACCIONES?: number
          TRANSACCIONES_BUSCAR?: string
          TRANSACCIONES_Tabla_FACTURA_CCLIENTE?: string
          TRANSACCIONES_Tabla_FACTURA_FECHAENTRADA?: string
          TRANSACCIONES_Tabla_FACTURA_FECHASALIDA?: string
          TRANSACCIONES_Tabla_FACTURA_FORMAPAGO?: number
          TRANSACCIONES_Tabla_FACTURA_IDFACTURA?: number
          TRANSACCIONES_Tabla_FACTURA_MODO?: string
          TRANSACCIONES_Tabla_FACTURA_NUMEROFACT?: string
          TRANSACCIONES_Tabla_FACTURA_SUBTOTAL?: number
          TRANSACCIONES_Tabla_FACTURA_TOTALVENTA?: number
          TRANSACCIONES_Tabla_FACTURA_VENDEDOR?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "staff"],
    },
  },
} as const
