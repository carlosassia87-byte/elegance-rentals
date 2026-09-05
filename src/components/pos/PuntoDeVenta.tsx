import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trash2,
  X,
  Printer,
  ChevronDown,
  ChevronLeft,
  Check,
  AlertTriangle,
  Plus,
  Edit,
  Package,
  Barcode,
  Search,
  RefreshCw,
  FileSpreadsheet,
  Upload,
  Minus,
  Square,
  Menu,
  Building2,
  Monitor,
  Wallet,
  Settings,
  LogOut,
  Activity,
  Users,
  Bell,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Articulo, Cliente, ItemAlquilerCarrito, Factura, CampoFactura, AbonoCliente } from "@/types/database.types";
import {
  buscarClientePorCedula,
  buscarClientesPorNombre,
  guardarCliente,
  listarArticulos,
  guardarArticulo,
  eliminarArticulo,
  generarNumeroFactura,
  registrarAlquilerFactura,
  registrarDevolucionVestido,
  registrarGasto,
  buscarFacturaApartado,
  registrarAbonoCliente,
  registrarSalidaVestidoApartado,
  type ItemApartadoConEstado,
} from "@/services/posService";
import {
  obtenerTerminalConfig,
  guardarTerminalConfig,
  obtenerConfiguracionEmpresa,
  obtenerResolucionConfig,
  aplicarEscalaResolucion,
  type TerminalConfig,
  type EmpresaConfig,
  EMPRESA_DEFAULT,
  TERMINAL_DEFAULT,
} from "@/services/empresaCajaService";
import {
  obtenerSesionPos,
  logoutPos,
  type UsuarioPos,
} from "@/services/authPosService";
import { LogoCasaDelDisfraz } from "./LogoCasaDelDisfraz";
import { SidebarMenu } from "./SidebarMenu";
import { ConfiguracionEmpresaModal } from "./ConfiguracionEmpresaModal";
import { ConfiguracionCajasModal } from "./ConfiguracionCajasModal";
import { CierreCajaModal } from "./CierreCajaModal";
import { PosLogin } from "./PosLogin";
import { MenuPrincipal } from "./MenuPrincipal";
import { GestionUsuariosModal } from "./GestionUsuariosModal";
import { MovimientosTrajesModal } from "./MovimientosTrajesModal";
import { CatalogoClientesModal } from "./CatalogoClientesModal";
import { DevolucionTrajesModal } from "./DevolucionTrajesModal";
import { BalanceDepositosModal } from "./BalanceDepositosModal";
import { InventarioStockModal } from "./InventarioStockModal";
import { ReimpresionFacturasModal } from "./ReimpresionFacturasModal";
import { AlertasRetrasosModal } from "./AlertasRetrasosModal";
import {
  consultarAlquileresActivosCliente,
  type AlquilerActivoClienteInfo,
} from "@/services/devolucionesService";

const ARTICULOS_INICIALES: Articulo[] = [
  { IDARTICULO: 1, DESCRIPCION: "ALICIA EN EL PAÍS DE LAS MARAVILLAS NIÑA EN ALQUILER VESTIDO TUTU", TALLA: "8", STOCK: 3, VALOR: 75000, CODBARRAS: "1001", VALORDEPOSITO: 35000 },
  { IDARTICULO: 2, DESCRIPCION: "MUSULMÁN BLANCO ALQUI BATA GORRO MUSULMAN CUADROS ROJO CON", TALLA: "M", STOCK: 4, VALOR: 65000, CODBARRAS: "1002", VALORDEPOSITO: 30000 },
  { IDARTICULO: 3, DESCRIPCION: "TRAJE DE SALSANIÑO:\nCAMISA, PANTALÓN", TALLA: "10", STOCK: 5, VALOR: 70000, CODBARRAS: "1003", VALORDEPOSITO: 35000 },
  { IDARTICULO: 4, DESCRIPCION: "TRAJE DE SALSANIÑA:\nVESTIDO, GUANTES, PEINETA", TALLA: "8", STOCK: 2, VALOR: 80000, CODBARRAS: "1004", VALORDEPOSITO: 40000 },
  { IDARTICULO: 5, DESCRIPCION: "PIRATANIÑO:\nPANTALÓN, CAMISA, CHAQUETACINTURÓN, SOBREBOTAS, SOMBRERO, ES", TALLA: "12", STOCK: 4, VALOR: 85000, CODBARRAS: "1538", VALORDEPOSITO: 40000 },
  { IDARTICULO: 6, DESCRIPCION: "MAGO NIÑO:\nPANTALÓN, CAMISA, CHAQUETÍN, CORBATÍN CINTURÓN, CAPA, SOMBRER", TALLA: "10", STOCK: 3, VALOR: 75000, CODBARRAS: "1006", VALORDEPOSITO: 35000 },
  { IDARTICULO: 7, DESCRIPCION: "MAGO DE OZ NIÑO:\nTÚNICA, CORDÓN DE CINTURA, VARITA Y SOMBRERO", TALLA: "8", STOCK: 2, VALOR: 70000, CODBARRAS: "1007", VALORDEPOSITO: 30000 },
  { IDARTICULO: 8, DESCRIPCION: "DRÁCULA NIÑO:\nPANTALÓN, CAMISA, CHAQUETÍN, CORBATÍN CINTURÓN, CAPA, SOMBRER", TALLA: "14", STOCK: 5, VALOR: 90000, CODBARRAS: "1008", VALORDEPOSITO: 45000 },
];

export function PuntoDeVenta() {
  // Formulario Superior
  const [estadoCli, setEstadoCli] = useState("ACTIVO");
  const [fechaHoy, setFechaHoy] = useState(() => new Date().toISOString().split("T")[0]);
  const [numeroRecibo, setNumeroRecibo] = useState("000124");
  const [cajero, setCajero] = useState("TODO EN MAYUSCULAS, LETRAS, DIGITOS Y SIMBOLOS");
  const [fechaSalida, setFechaSalida] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEntrada, setFechaEntrada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [estadoTraje, setEstadoTraje] = useState("EN ALQUILER");

  // Estado del Cliente (Campos de la tabla CLIENTES)
  const [clienteForm, setClienteForm] = useState<Partial<Cliente>>({
    IDCLIENTES: 0,
    CEDULA: 0,
    NOMBRE: "",
    DIRECCION: "",
    TELEFONO: "",
    TELEFONO2: "",
    EMPRESA: "",
    DIRECCIONEMP: "",
    NOTA: "",
    SALDO: 0,
  });

  // Alerta de Nota del Cliente y Alquileres Activos
  const [notaAlertaVisible, setNotaAlertaVisible] = useState(false);
  const [alquileresActivosCliente, setAlquileresActivosCliente] = useState<AlquilerActivoClienteInfo[]>([]);
  const [facturaDevolucionSeleccionada, setFacturaDevolucionSeleccionada] = useState<string>("");

  // Modal: SELECCIONE LA OPERACION A REALIZAR
  const [modalOperacionVisible, setModalOperacionVisible] = useState(false);
  const [operacionSeleccionada, setOperacionSeleccionada] = useState<"ALQUILER" | "VENTA" | "APARTADO" | "BONO">("ALQUILER");
  const selectOperacionRef = useRef<HTMLSelectElement>(null);

  // Artículos y Autocomplete
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_INICIALES);
  const [articuloTexto, setArticuloTexto] = useState<string>("");
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [mostrarDropdownArt, setMostrarDropdownArt] = useState<boolean>(false);
  const [sugerenciaIndex, setSugerenciaIndex] = useState<number>(0);

  // Formulario de ALTA_DE_ARTICULOS (Crear / Editar)
  const [articuloForm, setArticuloForm] = useState<Partial<Articulo>>({
    IDARTICULO: 0,
    DESCRIPCION: "",
    TALLA: "",
    STOCK: 0,
    VALOR: 0,
    VALORDEPOSITO: 0,
    CODBARRAS: "1538",
  });

  // Cantidad y Refs para Navegación por Teclado
  const [cantidad, setCantidad] = useState<number>(1);
  const articuloInputRef = useRef<HTMLInputElement>(null);
  const cantidadInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Grid / Tabla de Alquiler
  const [gridItems, setGridItems] = useState<ItemAlquilerCarrito[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<number | null>(null);

  // Tarjetas Inferiores: Descuento y Totales
  const [descuentoAlquiler, setDescuentoAlquiler] = useState<string>("0");

  // Modal de Cobro al presionar [PAGAR] (EXACTO A WINDEV)
  const [modalCobroDetalle, setModalCobroDetalle] = useState(false);
  const [tipoPagoEfectivo, setTipoPagoEfectivo] = useState("EFECTIVO");
  const [cobroEfectivo, setCobroEfectivo] = useState<string>("0");
  const [formaDePago, setFormaDePago] = useState("DATAFONO");
  const [cobroTransferencia, setCobroTransferencia] = useState<string>("0");

  // Modales
  const [modalCliente, setModalCliente] = useState(false);
  const [modalBuscarCli, setModalBuscarCli] = useState(false);
  const [modalArticuloAlta, setModalArticuloAlta] = useState(false);
  const [modalArchivoArticulo, setModalArchivoArticulo] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [modalApartados, setModalApartados] = useState(false);
  const [modalImprimir, setModalImprimir] = useState(false);

  // Formulario de búsqueda / gastos / devoluciones / catálogo
  const [busqClienteInput, setBusqClienteInput] = useState("");
  const [busqArticuloCatalogo, setBusqArticuloCatalogo] = useState("");
  const [articuloCatalogoSeleccionado, setArticuloCatalogoSeleccionado] = useState<Articulo | null>(null);
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [devFactura, setDevFactura] = useState("");
  const [devMonto, setDevMonto] = useState<number>(0);

  // Estados del Módulo ENTREGA VESTIDO APARTADO (Abonos & Reservas)
  const [apartadoBusqFactura, setApartadoBusqFactura] = useState("");
  const [apartadoFactura, setApartadoFactura] = useState<Factura | null>(null);
  const [apartadoItems, setApartadoItems] = useState<ItemApartadoConEstado[]>([]);
  const [apartadoAbonos, setApartadoAbonos] = useState<AbonoCliente[]>([]);
  const [apartadoYaDevuelto, setApartadoYaDevuelto] = useState(false);
  const [apartadoTotalDevuelto, setApartadoTotalDevuelto] = useState(0);
  const [modalSubAbonar, setModalSubAbonar] = useState(false);
  const [modalSaldoPendienteAlerta, setModalSaldoPendienteAlerta] = useState(false);
  const [montoAlertaSaldo, setMontoAlertaSaldo] = useState(0);

  // Campos específicos de la ventana emergente ABONO_CLIENTE (WINDEV)
  const [abonoNumero, setAbonoNumero] = useState(`AB-${Date.now().toString().slice(-4)}`);
  const [abonoFecha, setAbonoFecha] = useState(fechaHoy);
  const [abonoTipoEfec, setAbonoTipoEfec] = useState("EFECTIVO");
  const [abonoPagoEfec, setAbonoPagoEfec] = useState("0");
  const [abonoOtrasForma, setAbonoOtrasForma] = useState("DATAFONO");
  const [abonoPagoTrans, setAbonoPagoTrans] = useState("0");
  
  // Modal de confirmación de salida de bodega & Tira 80mm
  const [modalPreguntaSalida, setModalPreguntaSalida] = useState(false);
  const [modalImprimirAbono80mm, setModalImprimirAbono80mm] = useState(false);
  const [ticketAbonoData, setTicketAbonoData] = useState<any>(null);

  // Snapshot de datos de venta para comprobante / recibo
  const [ticketReciboVenta, setTicketReciboVenta] = useState<{
    numeroRecibo: string;
    fechaHoy: string;
    cajero: string;
    cliente: {
      nombre: string;
      cedula: string | number;
      telefono: string;
      direccion?: string;
    };
    fechaSalida: string;
    fechaEntrada: string;
    items: ItemAlquilerCarrito[];
    totalAlquiler: number;
    totalDeposito: number;
    totalGeneral: number;
    cambio: number;
  } | null>(null);

  // Estados del Menú Lateral Hamburguesa y Configuraciones
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [modalEmpresa, setModalEmpresa] = useState(false);
  const [modalCajasConfig, setModalCajasConfig] = useState(false);
  const [modalCierreCaja, setModalCierreCaja] = useState(false);
  const [modalUsuarios, setModalUsuarios] = useState(false);
  const [modalMovimientosTrajes, setModalMovimientosTrajes] = useState(false);
  const [modalBalanceDepositos, setModalBalanceDepositos] = useState(false);
  const [modalCatalogoClientes, setModalCatalogoClientes] = useState(false);
  const [modalInventarioStock, setModalInventarioStock] = useState(false);
  const [modalReimpresionFacturas, setModalReimpresionFacturas] = useState(false);
  const [modalAlertasRetrasos, setModalAlertasRetrasos] = useState(false);
  const [terminalConfig, setTerminalConfig] = useState<TerminalConfig>(obtenerTerminalConfig());
  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>(EMPRESA_DEFAULT);

  // Estados de Navegación de Pantalla y Sesión de Cajero
  const sesionInicial = obtenerSesionPos();
  const [vistaActiva, setVistaActiva] = useState<"login" | "menu" | "pos">(sesionInicial ? "menu" : "login");
  const [usuarioActivo, setUsuarioActivo] = useState<UsuarioPos | null>(sesionInicial?.usuario || null);

  const apartadoTotalAbonado = useMemo(() => {
    return apartadoAbonos.reduce((acc, it) => acc + (Number(it.TOTAL_ABONO) || 0), 0);
  }, [apartadoAbonos]);

  const apartadoSaldoAnterior = useMemo(() => {
    if (!apartadoFactura) return 0;
    const total = Number(apartadoFactura.FTOTALVENTADEPOSITO) || 0;
    const pagado = Number(apartadoFactura.PAGACON) || 0;
    return Math.max(0, total - pagado);
  }, [apartadoFactura]);

  const apartadoSaldoRestante = useMemo(() => {
    return Math.max(0, apartadoSaldoAnterior - apartadoTotalAbonado);
  }, [apartadoSaldoAnterior, apartadoTotalAbonado]);

  // Cálculos dinámicos en ventana ABONO_CLIENTE
  const abonoEfecNum = parseFloat(abonoPagoEfec) || 0;
  const abonoTransNum = parseFloat(abonoPagoTrans) || 0;
  const abonoTotalActual = abonoEfecNum + abonoTransNum;
  const abonoTotalSaldoRestante = Math.max(0, apartadoSaldoRestante - abonoTotalActual);

  async function handleConsultarApartado(factNum?: string) {
    const query = (factNum ?? apartadoBusqFactura).trim();
    if (!query) {
      toast.error("Ingresa el número de factura a consultar");
      return;
    }
    const res = await buscarFacturaApartado(query);
    if (!res.factura) {
      toast.error("Factura no encontrada");
      setApartadoFactura(null);
      setApartadoItems([]);
      setApartadoAbonos([]);
      setApartadoYaDevuelto(false);
      setApartadoTotalDevuelto(0);
      return;
    }
    setApartadoFactura(res.factura);
    setApartadoItems(res.items);
    setApartadoAbonos(res.abonos);
    setApartadoYaDevuelto(res.yaDevuelto);
    setApartadoTotalDevuelto(res.totalDevuelto);

    // Calcular si tiene saldo pendiente para mostrar la ventanita emergente WINDEV
    const totalVenta = Number(res.factura.FTOTALVENTADEPOSITO) || 0;
    const pagado = Number(res.factura.PAGACON) || 0;
    const sAnterior = Math.max(0, totalVenta - pagado);
    const totAbonos = (res.abonos || []).reduce((acc, it) => acc + (Number(it.TOTAL_ABONO) || 0), 0);
    const sRestante = Math.max(0, sAnterior - totAbonos);

    if (res.yaDevuelto) {
      toast.info(`ℹ️ Factura #${res.factura.NUMEROFACT}: ¡Prenda ya fue devuelta a tienda y depósito reintegrado!`, { duration: 5000 });
    } else if (sRestante > 0) {
      setMontoAlertaSaldo(sRestante);
      setModalSaldoPendienteAlerta(true);
    } else {
      toast.success(`Factura ${res.factura.NUMEROFACT} cargada exitosamente`);
    }
  }

  // BOTÓN PAGAR EN VENTANA ABONO_CLIENTE (EXACTO A WINDEV)
  async function handleGuardarAbono() {
    if (!apartadoFactura) return;
    if (abonoTotalActual <= 0) {
      toast.error("Coloque el monto del abono a pagar");
      return;
    }

    const nuevoSaldo = abonoTotalSaldoRestante;

    const abonoGuardado = await registrarAbonoCliente({
      numeroFactura: apartadoFactura.NUMEROFACT,
      cliente: apartadoFactura.CCLIENTE,
      pagoEfectivo: abonoEfecNum,
      pagoTransferencia: abonoTransNum,
      saldoAnterior: apartadoSaldoRestante,
      saldoDeber: nuevoSaldo,
      totalAbono: abonoTotalActual,
      fecha: abonoFecha,
    });

    if (abonoGuardado) {
      toast.success("Abono Realizado");
      setApartadoAbonos((prev) => [...prev, abonoGuardado]);
      setModalSubAbonar(false);

      // Fechas de salida y devolución (3 días hábiles)
      const hoy = new Date().toISOString().split("T")[0];
      const dSalida = new Date(hoy + "T12:00:00");
      const dEntrada = new Date(hoy + "T12:00:00");
      dEntrada.setDate(dEntrada.getDate() + 3);

      const ticket = {
        caja: terminalConfig.nombreCaja || "SERVIDOR",
        cliente: apartadoFactura.CCLIENTE,
        cedula: apartadoFactura.CCEDULA || "",
        direccion: apartadoFactura.CDIRECCION || "cra 23",
        telefono1: apartadoFactura.CTELEFONO || "1",
        telefono2: apartadoFactura.CTELEFONO1 || "1",
        formaPago: abonoTransNum > 0 ? abonoOtrasForma : "EFECTIVO",
        tipo: nuevoSaldo === 0 ? "EN ALQUILER" : "EN BODEGA",
        cajero: cajero,
        recibo: apartadoFactura.NUMEROFACT,
        fecha: abonoFecha,
        items: apartadoItems,
        valorAlquiler: apartadoFactura.FTOTALALQUILER || 0,
        deposito: apartadoFactura.FTOTALDEPOSITO || 0,
        saldoAnterior: apartadoSaldoRestante,
        recibiAbono: abonoTotalActual,
        saldo: nuevoSaldo,
        fechaSalida: dSalida.toLocaleDateString("es-CO"),
        fechaDevolucion: dEntrada.toLocaleDateString("es-CO"),
      };
      setTicketAbonoData(ticket);

      // Si el saldo restante es cero, preguntar automáticamente si entregar al cliente o sigue en bodega
      if (nuevoSaldo === 0) {
        setModalPreguntaSalida(true);
      } else {
        await handleConsultarApartado(apartadoFactura.NUMEROFACT);
        setModalImprimirAbono80mm(true);
      }

      setAbonoPagoEfec("0");
      setAbonoPagoTrans("0");
    } else {
      toast.error("Error al registrar el abono");
    }
  }

  // Confirmar salida de traje de bodega al tener saldo 0 (o desde botón manual)
  async function handleConfirmarSalidaBodega(darSalida: boolean) {
    if (!apartadoFactura) return;
    setModalPreguntaSalida(false);

    if (darSalida) {
      const hoy = new Date().toISOString().split("T")[0];
      const dEntrada = new Date(hoy + "T12:00:00");
      dEntrada.setDate(dEntrada.getDate() + 3);
      const fechaDev = dEntrada.toISOString().split("T")[0];

      const res = await registrarSalidaVestidoApartado(apartadoFactura.NUMEROFACT, hoy, fechaDev);
      if (res.ok) {
        toast.success(
          `👗 ¡PRENDA ENTREGADA AL CLIENTE! Pasa a EN ALQUILER. Comienzan 3 días de plazo hasta el ${dEntrada.toLocaleDateString("es-CO")}.`,
          { duration: 6000 }
        );
      }
    } else {
      toast.info(`📦 Prenda guardada en bodega. Permanecerá hasta que el cliente venga a retirarla.`);
    }

    // Refrescar inmediatamente los datos del apartado
    await handleConsultarApartado(apartadoFactura.NUMEROFACT);
    setModalImprimirAbono80mm(true);
  }

  useEffect(() => {
    // Aplicar escala visual guardada
    aplicarEscalaResolucion(obtenerResolucionConfig());

    // Cargar empresa y terminal
    obtenerConfiguracionEmpresa().then(setEmpresaConfig);
    const term = obtenerTerminalConfig();
    setTerminalConfig(term);

    // Consecutivo según la caja configurada
    generarNumeroFactura(term.nombreCaja, term.prefijo).then((num) => setNumeroRecibo(num));
    cargarArticulos();

    const sesion = obtenerSesionPos();
    if (sesion && sesion.usuario) {
      setUsuarioActivo(sesion.usuario);
      setCajero(sesion.usuario.nombre);
    }
  }, []);

  function handleLogout() {
    logoutPos();
    setUsuarioActivo(null);
    setVistaActiva("login");
    toast.info("Sesión cerrada con éxito");
  }

  function handleMenuAccion(accion: string) {
    switch (accion) {
      case "pos":
        setVistaActiva("pos");
        break;
      case "pos_nuevo":
        handleLimpiar();
        setVistaActiva("pos");
        break;
      case "catalogo_articulos":
        setModalArchivoArticulo(true);
        break;
      case "nuevo_articulo":
        abrirCrearArticulo();
        break;
      case "buscar_cliente":
      case "catalogo_clientes":
        setModalCatalogoClientes(true);
        break;
      case "nuevo_cliente":
        setModalCliente(true);
        break;
      case "apartados":
        setModalApartados(true);
        break;
      case "entrada_vestido":
        setModalDevolucion(true);
        break;
      case "gasto_salida":
        setModalGasto(true);
        break;
      case "inventario_stock":
        setModalInventarioStock(true);
        break;
      case "alertas_retrasos":
        setModalAlertasRetrasos(true);
        break;
      case "reimprimir":
        setModalReimpresionFacturas(true);
        break;
      case "cierre_caja":
        setModalCierreCaja(true);
        break;
      case "movimientos_trajes":
        setModalMovimientosTrajes(true);
        break;
      case "balance_depositos":
        setModalBalanceDepositos(true);
        break;
      case "config_empresa":
        setModalEmpresa(true);
        break;
      case "config_cajas":
      case "config_resoluciones":
        setModalCajasConfig(true);
        break;
      case "gestion_usuarios":
        setModalUsuarios(true);
        break;
      default:
        break;
    }
  }

  async function cargarArticulos() {
    const res = await listarArticulos();
    if (res && res.length > 0) {
      setArticulos(res);
    }
  }

  // Filtrado de Artículos en Tiempo Real
  const articulosFiltrados = useMemo(() => {
    if (!articuloTexto.trim()) return articulos;
    const query = articuloTexto.toLowerCase().trim();
    return articulos.filter(
      (a) =>
        a.DESCRIPCION.toLowerCase().includes(query) ||
        (a.CODBARRAS && a.CODBARRAS.toLowerCase().includes(query)) ||
        (a.TALLA && a.TALLA.toLowerCase().includes(query))
    );
  }, [articulos, articuloTexto]);

  const articulosCatalogoFiltrados = useMemo(() => {
    if (!busqArticuloCatalogo.trim()) return articulos;
    const query = busqArticuloCatalogo.toLowerCase().trim();
    return articulos.filter(
      (a) =>
        a.DESCRIPCION.toLowerCase().includes(query) ||
        (a.CODBARRAS && a.CODBARRAS.toLowerCase().includes(query)) ||
        (a.TALLA && a.TALLA.toLowerCase().includes(query))
    );
  }, [articulos, busqArticuloCatalogo]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        articuloInputRef.current &&
        !articuloInputRef.current.contains(e.target as Node)
      ) {
        setMostrarDropdownArt(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cálculos en tiempo real (EXACTO A WINDEV)
  const totalDeposito = useMemo(() => {
    return gridItems.reduce((acc, it) => acc + it.totalDeposito, 0);
  }, [gridItems]);

  const totalAlquiler = useMemo(() => {
    return gridItems.reduce((acc, it) => acc + it.totalAlquiler, 0);
  }, [gridItems]);

  const totalTotaliza = totalDeposito + totalAlquiler;
  const descuentoNum = parseFloat(descuentoAlquiler) || 0;
  const edtPorcentaje = totalTotaliza > 0 ? (descuentoNum / totalTotaliza) * 100 : 0;
  const totalAlquilerConDesc = Math.max(0, totalAlquiler - descuentoNum);
  const totalDepositoMasAlquiler = totalDeposito + totalAlquilerConDesc;

  const efecNum = parseFloat(cobroEfectivo) || 0;
  const transNum = parseFloat(cobroTransferencia) || 0;
  const totalPagado = efecNum + transNum;
  const cambioVSaldo = totalPagado - totalDepositoMasAlquiler;

  // Verificar si el cliente tiene trajes en alquiler (3 días límite, $7.000/día de retraso) o notas
  async function verificarAlquileresYAlertarCliente(cli: Partial<Cliente>) {
    if (!cli.CEDULA || cli.CEDULA === 0) return;
    try {
      const alqs = await consultarAlquileresActivosCliente(cli.CEDULA);
      setAlquileresActivosCliente(alqs);

      const tieneNota = Boolean(cli.NOTA && cli.NOTA.trim() !== "");
      const tieneAlquileres = alqs.length > 0;

      if (tieneNota || tieneAlquileres) {
        setNotaAlertaVisible(true);
        if (alqs.some((a) => a.tieneRetraso)) {
          const totalMora = alqs.reduce((acc, a) => acc + a.recargoTotalRetraso, 0);
          toast.warning(
            `⚠️ CLIENTE CON RETRASO EN ALQUILER (Mora: $${totalMora.toLocaleString("es-CO")})`,
            { duration: 7000 }
          );
        } else if (tieneAlquileres) {
          toast.info(`ℹ️ El cliente tiene ${alqs.length} traje(s) en alquiler actualmente`);
        }
      } else {
        toast.success(`Cliente: ${cli.NOMBRE}`);
        setModalOperacionVisible(true);
      }
    } catch (e) {
      console.error(e);
      if (cli.NOTA && cli.NOTA.trim() !== "") {
        setNotaAlertaVisible(true);
      } else {
        setModalOperacionVisible(true);
      }
    }
  }

  // Buscar cliente por cédula con Enter o botón Buscar
  async function handleBuscarCedulaDirecta(cedulaValor?: string | number) {
    const cedBuscada = cedulaValor ?? clienteForm.CEDULA;
    if (!cedBuscada) {
      toast.error("Ingresa la cédula a buscar");
      return;
    }

    const cli = await buscarClientePorCedula(cedBuscada);
    if (cli) {
      setClienteForm(cli);
      await verificarAlquileresYAlertarCliente(cli);
    } else {
      toast.info("Cédula no encontrada. Puedes registrar sus datos.");
      setModalCliente(true);
    }
  }

  // Confirmar Selección de Operación
  function handleConfirmarOperacion() {
    let nuevoEstadoTraje = "EN ALQUILER";
    if (operacionSeleccionada === "VENTA") nuevoEstadoTraje = "VENTA";
    else if (operacionSeleccionada === "APARTADO") nuevoEstadoTraje = "APARTADO";
    else if (operacionSeleccionada === "BONO") nuevoEstadoTraje = "BONO";
    else nuevoEstadoTraje = "EN ALQUILER";

    setEstadoTraje(nuevoEstadoTraje);
    setModalOperacionVisible(false);
    toast.success(`Operación fijada: ${nuevoEstadoTraje}`);

    setTimeout(() => {
      articuloInputRef.current?.focus();
    }, 50);
  }

  // Guardar Cliente en BD (ALTA_DE_CLIENTES)
  async function handleGuardarClienteAlta(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!clienteForm.NOMBRE || !clienteForm.CEDULA) {
      toast.error("Cédula y Nombre son obligatorios");
      return;
    }

    try {
      const guardado = await guardarCliente(clienteForm);
      if (guardado) {
        setClienteForm(guardado);
      }
      toast.success("¡Cliente guardado exitosamente!");
      setModalCliente(false);
      setModalOperacionVisible(true);
    } catch {
      toast.success("Cliente asignado localmente");
      setModalCliente(false);
      setModalOperacionVisible(true);
    }
  }

  // Abrir Modal de Crear Artículo
  function abrirCrearArticulo() {
    setArticuloForm({
      IDARTICULO: 0,
      DESCRIPCION: "",
      TALLA: "",
      STOCK: 0,
      VALOR: 0,
      VALORDEPOSITO: 0,
      CODBARRAS: "1538",
    });
    setModalArticuloAlta(true);
  }

  // Abrir Modal de Editar Artículo
  function abrirEditarArticulo(art: Articulo) {
    setArticuloForm({ ...art });
    setModalArticuloAlta(true);
  }

  // Guardar Artículo en BD (ALTA_DE_ARTICULOS EXACTO A WINDEV)
  async function handleGuardarArticuloAlta(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!articuloForm.DESCRIPCION || !articuloForm.DESCRIPCION.trim()) {
      toast.error("Ingresa la descripción del artículo");
      return;
    }

    try {
      const artGuardado = await guardarArticulo({
        ...articuloForm,
        VALOR: Number(articuloForm.VALOR) || 0,
        VALORDEPOSITO: Number(articuloForm.VALORDEPOSITO) || 0,
        STOCK: Number(articuloForm.STOCK) || 0,
      });

      if (artGuardado) {
        setArticulos((prev) => {
          const index = prev.findIndex((a) => a.IDARTICULO === artGuardado.IDARTICULO);
          if (index >= 0) {
            const next = [...prev];
            next[index] = artGuardado;
            return next;
          }
          return [artGuardado, ...prev];
        });
      } else {
        const nuevo: Articulo = {
          IDARTICULO: articuloForm.IDARTICULO || Date.now(),
          DESCRIPCION: articuloForm.DESCRIPCION,
          TALLA: articuloForm.TALLA || "",
          STOCK: Number(articuloForm.STOCK) || 0,
          VALOR: Number(articuloForm.VALOR) || 0,
          VALORDEPOSITO: Number(articuloForm.VALORDEPOSITO) || 0,
          CODBARRAS: articuloForm.CODBARRAS || "1538",
        };
        setArticulos((prev) => [nuevo, ...prev]);
      }

      toast.success("¡Artículo guardado exitosamente!");
      setModalArticuloAlta(false);
      cargarArticulos();
    } catch {
      toast.error("Error guardando artículo");
    }
  }

  // Eliminar Artículo
  async function handleEliminarArticuloCatalogo(id: number) {
    if (confirm("¿Estás seguro de eliminar este artículo del catálogo?")) {
      await eliminarArticulo(id);
      setArticulos((prev) => prev.filter((a) => a.IDARTICULO !== id));
      toast.info("Artículo eliminado");
    }
  }

  // Selección de Artículo
  function seleccionarArticulo(art: Articulo) {
    setArticuloSeleccionado(art);
    setArticuloTexto(art.DESCRIPCION);
    setMostrarDropdownArt(false);
    setTimeout(() => {
      cantidadInputRef.current?.focus();
      cantidadInputRef.current?.select();
    }, 50);
  }

  // Manejo de Teclado en ARTÍCULO
  function handleKeyDownArticulo(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMostrarDropdownArt(true);
      setSugerenciaIndex((prev) => Math.min(prev + 1, articulosFiltrados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSugerenciaIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (articulosFiltrados.length > 0) {
        const art = articulosFiltrados[sugerenciaIndex] ?? articulosFiltrados[0];
        if (art) seleccionarArticulo(art);
      } else {
        toast.error("No se encontró ningún artículo coincidente");
      }
    } else if (e.key === "Escape") {
      setMostrarDropdownArt(false);
    }
  }

  // Manejo de Teclado en CANTIDAD
  function handleKeyDownCantidad(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAgregarItem();
    }
  }

  // Agregar artículo al Grid
  function handleAgregarItem() {
    const art = articuloSeleccionado || articulosFiltrados[0];
    if (!art) {
      toast.error("Escribe o selecciona un artículo");
      articuloInputRef.current?.focus();
      return;
    }

    const cant = Math.max(1, cantidad || 1);
    const item: ItemAlquilerCarrito = {
      idTemp: `${Date.now()}-${Math.random()}`,
      articulo: art,
      descripcion: art.DESCRIPCION,
      talla: art.TALLA,
      codigoBarras: art.CODBARRAS,
      cantidad: cant,
      valorAlquiler: Number(art.VALOR),
      totalAlquiler: Number(art.VALOR) * cant,
      valorDeposito: Number(art.VALORDEPOSITO),
      totalDeposito: Number(art.VALORDEPOSITO) * cant,
      totalGeneral: (Number(art.VALOR) + Number(art.VALORDEPOSITO)) * cant,
    };

    setGridItems((prev) => [...prev, item]);
    setArticuloTexto("");
    setArticuloSeleccionado(null);
    setCantidad(1);
    setMostrarDropdownArt(false);
    setSugerenciaIndex(0);
    toast.success(`Agregado: ${art.DESCRIPCION} (${cant} und)`);

    setTimeout(() => {
      articuloInputRef.current?.focus();
    }, 50);
  }

  // Eliminar Fila
  function handleEliminarFila() {
    if (filaSeleccionada === null || filaSeleccionada < 0) {
      toast.error("Selecciona una fila de la tabla para eliminar");
      return;
    }
    setGridItems((prev) => prev.filter((_, i) => i !== filaSeleccionada));
    setFilaSeleccionada(null);
    toast.info("Artículo eliminado");
  }

  // Limpiar / Nuevo Alquiler / Reset Completo del POS
  function handleLimpiar(silencioso = false) {
    generarNumeroFactura(terminalConfig.nombreCaja, terminalConfig.prefijo).then((nuevoNum) => {
      setNumeroRecibo(nuevoNum);
    });
    setClienteForm({
      IDCLIENTES: 0,
      CEDULA: 0,
      NOMBRE: "",
      DIRECCION: "",
      TELEFONO: "",
      TELEFONO2: "",
      EMPRESA: "",
      DIRECCIONEMP: "",
      NOTA: "",
      SALDO: 0,
    });
    setGridItems([]);
    setArticuloTexto("");
    setArticuloSeleccionado(null);
    setCantidad(1);
    setDescuentoAlquiler("0");
    setCobroEfectivo("0");
    setCobroTransferencia("0");
    setFilaSeleccionada(null);
    setNotaAlertaVisible(false);
    setAlquileresActivosCliente([]);
    setFacturaDevolucionSeleccionada("");
    setModalOperacionVisible(false);
    setEstadoTraje("EN ALQUILER");
    setOperacionSeleccionada("ALQUILER");

    const hoy = new Date().toISOString().split("T")[0];
    setFechaHoy(hoy);
    setFechaSalida(hoy);
    const dEntrada = new Date();
    dEntrada.setDate(dEntrada.getDate() + 3);
    setFechaEntrada(dEntrada.toISOString().split("T")[0]);

    cargarArticulos();
    if (!silencioso) {
      toast.info("Punto de Venta listo para una nueva venta");
    }
    setTimeout(() => {
      articuloInputRef.current?.focus();
    }, 100);
  }

  // Estado de bloqueo para prevenir doble clic (bGuardando)
  const [bGuardando, setBGuardando] = useState(false);

  // Abrir Modal de Cobro al presionar PAGAR
  function handleIniciarCobro() {
    if (!estadoTraje || estadoTraje.trim() === "") {
      toast.error("DEBE SELECCIONAR EL ESTADO");
      return;
    }
    if (!clienteForm.CEDULA || clienteForm.CEDULA === 0) {
      toast.error("DEBE SELECCIONAR EL CLIENTE");
      return;
    }
    if (!fechaSalida || fechaSalida.trim() === "") {
      toast.error("DEBE SELECCIONAR FECHA DE SALIDA");
      return;
    }
    if (!fechaEntrada || fechaEntrada.trim() === "") {
      toast.error("DEBE SELECCIONAR FECHA DE ENTRADA");
      return;
    }
    if (gridItems.length === 0) {
      toast.error("NO HAY ARTÍCULOS EN LA LISTA");
      return;
    }

    setCobroEfectivo(totalDepositoMasAlquiler.toString());
    setCobroTransferencia("0");
    setModalCobroDetalle(true);
  }

  // Confirmar y Registrar Factura Final
  async function handleConfirmarCobro() {
    if (bGuardando) return;
    setBGuardando(true);

    try {
      const factura: Omit<Factura, "IDFACTURA"> = {
        NUMEROFACT: numeroRecibo,
        FECHASALIDA: fechaSalida || new Date().toISOString().split("T")[0],
        FECHAENTRADA: fechaEntrada || new Date().toISOString().split("T")[0],
        FORMAPAGO: tipoPagoEfectivo || "EFECTIVO",
        FPAGOTRANS: formaDePago || "DATAFONO",
        MODO: operacionSeleccionada,
        FTOTALDEPOSITO: totalDeposito,
        FTOTALVENTADEPOSITO: totalDepositoMasAlquiler,
        FTOTALALQUILER: totalAlquilerConDesc,
        VENDEDOR: cajero,
        CCLIENTE: clienteForm.NOMBRE || "GENERAL",
        CAMBIOS: Math.max(0, cambioVSaldo),
        PAGACON: totalPagado,
        CTELEFONO1: clienteForm.TELEFONO2 || "",
        CEMPRESA: clienteForm.EMPRESA || "",
        CCEDULA: String(clienteForm.CEDULA || 0),
        CDIRECCION: clienteForm.DIRECCION || "",
        CTELEFONO: clienteForm.TELEFONO || "",
        PAGOCONEFECTIVO: efecNum,
        PAGOCONTRANFERENCIA: transNum,
        FECHA_RECIBO: fechaHoy,
        DESCUENTO: descuentoNum,
        ESTADOCLIENTE: estadoTraje,
        TOTAL_SALDO: cambioVSaldo < 0 ? Math.abs(cambioVSaldo) : 0,
      };

      const campos: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[] = gridItems.map((g) => ({
        BARRAS: g.codigoBarras || "0",
        CANTIDAD: g.cantidad,
        DESCRIPCION: g.descripcion,
        TOTAL: g.totalGeneral,
        VALOR: g.valorAlquiler,
        VALORDEPOSITO: g.valorDeposito,
        NUMEROFACT: numeroRecibo,
        TOTALALQUILER: g.totalAlquiler,
        TOTALDEPOSITO: g.totalDeposito,
      }));

      await guardarCliente(clienteForm);
      const resultado = await registrarAlquilerFactura(
        factura,
        campos,
        terminalConfig.nombreCaja,
        terminalConfig.prefijo
      );
      
      const numFacturaFinal = (resultado && resultado.factura) ? resultado.factura.NUMEROFACT : numeroRecibo;

      // Guardar snapshot de los datos de la venta para el recibo de impresión
      setTicketReciboVenta({
        numeroRecibo: numFacturaFinal,
        fechaHoy: fechaHoy,
        cajero: cajero,
        cliente: {
          nombre: clienteForm.NOMBRE || "GENERAL",
          cedula: clienteForm.CEDULA || "N/A",
          telefono: clienteForm.TELEFONO || "N/A",
          direccion: clienteForm.DIRECCION || "",
        },
        fechaSalida: fechaSalida || fechaHoy,
        fechaEntrada: fechaEntrada || fechaHoy,
        items: [...gridItems],
        totalAlquiler: totalAlquilerConDesc,
        totalDeposito: totalDeposito,
        totalGeneral: totalDepositoMasAlquiler,
        cambio: Math.max(0, cambioVSaldo),
      });

      setModalCobroDetalle(false);
      setModalImprimir(true);
      toast.success("¡Venta/Alquiler procesado exitosamente!");

      // Limpiar automáticamente el Punto de Venta y generar nuevo consecutivo para la siguiente venta
      handleLimpiar(true);
    } catch (err: any) {
      console.error("Error procesando factura:", err);
      toast.error("Error al procesar la factura. Modo local activo.");

      setTicketReciboVenta({
        numeroRecibo: numeroRecibo,
        fechaHoy: fechaHoy,
        cajero: cajero,
        cliente: {
          nombre: clienteForm.NOMBRE || "GENERAL",
          cedula: clienteForm.CEDULA || "N/A",
          telefono: clienteForm.TELEFONO || "N/A",
          direccion: clienteForm.DIRECCION || "",
        },
        fechaSalida: fechaSalida || fechaHoy,
        fechaEntrada: fechaEntrada || fechaHoy,
        items: [...gridItems],
        totalAlquiler: totalAlquilerConDesc,
        totalDeposito: totalDeposito,
        totalGeneral: totalDepositoMasAlquiler,
        cambio: Math.max(0, cambioVSaldo),
      });

      setModalCobroDetalle(false);
      setModalImprimir(true);
      handleLimpiar(true);
    } finally {
      setBGuardando(false);
    }
  }

  // 1. Si no hay sesión de cajero activa, mostrar Pantalla de Login del POS
  if (vistaActiva === "login" || !usuarioActivo) {
    return (
      <PosLogin
        onLoginSuccess={(user) => {
          setUsuarioActivo(user);
          setCajero(user.nombre);
          setVistaActiva("menu");
        }}
      />
    );
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {vistaActiva === "menu" ? (
        <MenuPrincipal
          usuario={usuarioActivo}
          terminal={terminalConfig}
          empresa={empresaConfig}
          onNavegar={(modulo) => {
            if (modulo === "pos") {
              setVistaActiva("pos");
            } else {
              handleMenuAccion(modulo);
            }
          }}
          onLogout={handleLogout}
        />
      ) : (
        <div className="flex h-screen w-full flex-col bg-[#F8FAFC] font-sans text-slate-800 select-none overflow-hidden p-3 gap-2.5">
          {/* =========================================================================
              1. SECCIÓN SUPERIOR: FORMULARIO RECOGIDO A LA IZQUIERDA + LOGO A LA DERECHA
          ========================================================================= */}
          <div className="flex items-start gap-3">
            {/* LADO IZQUIERDO: TÍTULO "PUNTO DE VENTA" + FORMULARIO COMPACTO DE 3 COLUMNAS */}
            <div className="flex-1 flex flex-col min-w-0">
              {/* TÍTULO PUNTO DE VENTA CENTRADO SOBRE EL FORMULARIO */}
              <div className="flex items-center justify-between px-1 pb-1.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSidebarAbierto(true)}
                    className="flex items-center justify-center rounded-xl bg-slate-900 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                    title="Abrir Menú Lateral de Opciones"
                  >
                    <Menu className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setVistaActiva("menu")}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-900 shadow-xs border border-slate-700 transition-all active:scale-95"
                    title="Regresar a la Pantalla de Menú Principal"
                  >
                    <ChevronLeft className="h-4 w-4 text-emerald-400" />
                    <span className="tracking-wide uppercase">MENÚ PRINCIPAL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalAlertasRetrasos(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all active:scale-95 animate-pulse"
                    title="Panel de Alertas de Trajes con Retraso y Mora (3 Días · $7.000/día)"
                  >
                    <Bell className="h-3.5 w-3.5" /> ALERTAS & MORA
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalInventarioStock(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all active:scale-95"
                    title="Módulo de Inventario, Alimentación de Stock y Kardex de Trajes"
                  >
                    <Package className="h-3.5 w-3.5" /> INVENTARIO & STOCK
                  </button>

                  <button
                    onClick={() => setModalArchivoArticulo(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-slate-700 hover:bg-slate-800 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all"
                  >
                    <Package className="h-3.5 w-3.5 text-blue-400" /> ARCHIVO ARTICULO
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalCatalogoClientes(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95"
                    title="Directorio y Catálogo General de Clientes"
                  >
                    <Users className="h-3.5 w-3.5" /> CATÁLOGO CLIENTES
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalMovimientosTrajes(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-3.5 py-1.5 text-xs font-black text-white shadow-xs transition-all active:scale-95"
                    title="Control de Movimientos y Estado de Trajes por Rango de Fechas"
                  >
                    <Activity className="h-3.5 w-3.5" /> MOVIMIENTOS & ESTADOS
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 uppercase font-sans leading-none">
                    PUNTO DE VENTA & ALQUILER
                  </h1>
                </div>

                <div className="flex items-center gap-2">
                  {/* Selector rápido de Tamaño de Letra / Zoom */}
                  <div className="flex items-center bg-white rounded-xl border border-slate-200 px-1 py-0.5 shadow-2xs">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = obtenerResolucionConfig();
                        const nuevoPorc = Math.max(75, (cur.escalaPorcentaje || 108) - 5);
                        const nueva: ResolucionConfig = { ...cur, modo: "personalizada", escalaPorcentaje: nuevoPorc };
                        aplicarEscalaResolucion(nueva);
                        toast.info(`Tamaño de letra ajustado a: ${nuevoPorc}%`);
                      }}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 font-black text-slate-700 text-xs transition-all active:scale-90"
                      title="Disminuir tamaño de letras (A-)"
                    >
                      A-
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalCajasConfig(true)}
                      className="px-1.5 py-0.5 text-[10px] font-black text-emerald-800 hover:underline"
                      title="Ajustar resolución y escala"
                    >
                      Zoom
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = obtenerResolucionConfig();
                        const nuevoPorc = Math.min(150, (cur.escalaPorcentaje || 108) + 5);
                        const nueva: ResolucionConfig = { ...cur, modo: "personalizada", escalaPorcentaje: nuevoPorc };
                        aplicarEscalaResolucion(nueva);
                        toast.info(`Tamaño de letra ajustado a: ${nuevoPorc}%`);
                      }}
                      className="px-2 py-1 rounded-lg hover:bg-slate-100 font-black text-slate-700 text-xs transition-all active:scale-90"
                      title="Aumentar tamaño de letras (A+)"
                    >
                      A+
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalCajasConfig(true)}
                    className="flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-[11px] font-bold text-slate-700 border border-slate-200 shadow-xs hover:bg-slate-50 transition-all"
                    title="Configuración de Caja, Terminal y Pantalla"
                  >
                    <Monitor className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{terminalConfig.nombreCaja}</span>
                    <span className="text-[10px] text-slate-400">({terminalConfig.prefijo})</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-700 px-2.5 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-200 transition-all"
                    title="Cerrar Turno de Cajero"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

          {/* FORMULARIO DE CABECERA COMPACTO CON ESTILO LIMPIO */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xs space-y-1.5">
            <div className="grid grid-cols-12 gap-x-2.5 gap-y-1.5 text-xs">
              {/* FILA 1 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">ESTADO</span>
                <select
                  value={estadoCli}
                  onChange={(e) => setEstadoCli(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-700 text-xs uppercase">CEDULA</span>
                <input
                  type="text"
                  placeholder="Ingresa cédula y Enter"
                  value={clienteForm.CEDULA || ""}
                  onChange={(e) =>
                    setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta()}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-extrabold text-slate-700 text-xs uppercase">FECHA SALIDA</span>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              {/* FILA 2 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">FECHA</span>
                <input
                  type="date"
                  value={fechaHoy}
                  onChange={(e) => setFechaHoy(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-700 text-xs uppercase">NOMBRE</span>
                <input
                  type="text"
                  placeholder="Nombre completo del cliente"
                  value={clienteForm.NOMBRE || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-extrabold text-slate-700 text-xs uppercase">FECHA ENTRADA</span>
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={(e) => setFechaEntrada(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 text-xs font-bold text-slate-800 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              {/* FILA 3 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">N.RECIBO</span>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-emerald-50/60 px-2.5 text-xs font-black text-emerald-800 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">DIRECCION</span>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={clienteForm.DIRECCION || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-extrabold text-slate-700 text-xs uppercase">ESTADO TRAJE</span>
                <button
                  type="button"
                  onClick={() => setModalOperacionVisible(true)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 text-xs font-bold uppercase text-left text-slate-800 hover:bg-white flex items-center justify-between shadow-2xs"
                >
                  <span className="truncate text-emerald-700 font-extrabold">{estadoTraje}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                </button>
              </div>

              {/* FILA 4 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">CAJERO</span>
                <input
                  type="text"
                  value={cajero}
                  onChange={(e) => setCajero(e.target.value)}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-2.5 text-[10px] font-bold uppercase text-slate-700 focus:bg-white focus:outline-none shadow-2xs"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-extrabold text-slate-600 text-xs uppercase">TELEFONO</span>
                <input
                  type="text"
                  placeholder="Teléfono de contacto"
                  value={clienteForm.TELEFONO || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                  className="h-7.5 flex-1 rounded-xl border border-slate-300 bg-slate-50/60 px-3 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setModalCliente(true)}
                  className="h-7.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 whitespace-nowrap transition-all"
                >
                  Modificar
                </button>
              </div>
            </div>

            {/* BANNER DE NOTA Y TRAJES EN ALQUILER */}
            {((clienteForm.NOTA && clienteForm.NOTA.trim() !== "") || alquileresActivosCliente.length > 0) && (
              <div className="flex items-center justify-between rounded-xl border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-950 shadow-xs">
                <div className="flex items-center gap-2 overflow-hidden flex-1">
                  {alquileresActivosCliente.length > 0 && (
                    <span className="flex items-center gap-1 rounded-md bg-teal-700 px-2 py-0.5 text-[10px] text-white uppercase font-black tracking-wide shrink-0">
                      <Shirt className="h-3 w-3" /> ALQUILER ACTIVO ({alquileresActivosCliente.length})
                    </span>
                  )}

                  {alquileresActivosCliente.some((a) => a.tieneRetraso) && (
                    <span className="flex items-center gap-1 rounded-md bg-rose-600 px-1.5 py-0.5 text-[10px] text-white uppercase font-black tracking-wide shrink-0 animate-pulse">
                      🔴 MORA $7.000/DÍA
                    </span>
                  )}

                  {clienteForm.NOTA && clienteForm.NOTA.trim() !== "" ? (
                    <span className="truncate text-xs font-semibold text-slate-800">
                      <strong>NOTA:</strong> {clienteForm.NOTA}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-slate-800 truncate">
                      Cliente tiene {alquileresActivosCliente.length} traje(s) en alquiler actualmente
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setNotaAlertaVisible(true)}
                  className="ml-2 text-teal-800 underline hover:text-teal-950 whitespace-nowrap text-xs font-bold shrink-0"
                >
                  [Ver Detalle & Devolución]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO SUPERIOR: LOGO "LA CASA DEL DISFRAZ" */}
        <div className="w-64 flex flex-col items-center justify-center p-3 border border-slate-200/90 rounded-2xl bg-white shadow-xs self-stretch">
          <LogoCasaDelDisfraz />
        </div>
      </div>

      {/* =========================================================================
          2. BARRA DE BOTONES DE ACCIÓN RÁPIDA CON PALETA MODERNA
      ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto py-1">
        <button
          onClick={() => setModalCliente(true)}
          className="h-8.5 rounded-xl bg-sky-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-sky-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          NUEVO CLIENTE
        </button>

        <button
          onClick={() => setModalCliente(true)}
          className="h-8.5 rounded-xl bg-indigo-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          MODIFICAR
        </button>

        <button
          onClick={() => setModalBuscarCli(true)}
          className="h-8.5 rounded-xl bg-blue-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          BUSCAR CLIENTE
        </button>

        <button
          onClick={handleLimpiar}
          className="h-8.5 rounded-xl bg-slate-800 px-4 text-xs font-bold text-white shadow-xs hover:bg-slate-900 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          LIMPIAR / NUEVO
        </button>

        <button
          onClick={handleLimpiar}
          className="h-8.5 rounded-xl bg-emerald-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          NUEVO ALQUILER
        </button>

        <button
          onClick={() => setModalGasto(true)}
          className="flex items-center gap-1.5 h-8.5 rounded-xl bg-rose-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          <span>▶</span> GASTO(SALIDA)
        </button>

        <button
          onClick={() => setModalReimpresionFacturas(true)}
          className="h-8.5 rounded-xl bg-cyan-600 px-3.5 text-xs font-black text-white shadow-xs hover:bg-cyan-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all flex items-center gap-1.5"
          title="Consultar facturas por fecha y reimprimir comprobante"
        >
          <Printer className="h-3.5 w-3.5 text-cyan-200" />
          <span>REIMPRIMIR</span>
        </button>

        <button
          onClick={() => setModalApartados(true)}
          className="h-8.5 rounded-xl bg-purple-600 px-4 text-xs font-bold text-white shadow-xs hover:bg-purple-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          APARTADOS / ABONOS
        </button>

        <button
          onClick={() => setModalDevolucion(true)}
          className="h-8.5 rounded-xl bg-teal-600 px-3.5 text-xs font-bold text-white shadow-xs hover:bg-teal-700 active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          DEVOLUCIÓN & DEPÓSITO
        </button>
      </div>

      {/* =========================================================================
          3. LÍNEA DE ARTÍCULO: AUTOCOMPLETE + CANTIDAD + BOTONES DE ACCIÓN
      ========================================================================= */}
      <div className="relative flex items-center gap-2 py-1 bg-white p-2 rounded-2xl border border-slate-200/90 shadow-xs">
        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide pl-1">ARTÍCULO</span>

        {/* BOTÓN + PARA CREAR NUEVO ARTÍCULO RÁPIDO */}
        <button
          type="button"
          onClick={abrirCrearArticulo}
          title="Crear nuevo artículo en el catálogo"
          className="flex items-center justify-center h-8.5 w-8.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
        >
          <Plus className="h-4.5 w-4.5" />
        </button>
        
        {/* COMBOBOX DE BÚSQUEDA Y FILTRADO */}
        <div className="relative flex-1">
          <div className="relative flex items-center">
            <input
              ref={articuloInputRef}
              type="text"
              placeholder="Escribe para filtrar artículo o escanear código de barras... (Enter para seleccionar)"
              value={articuloTexto}
              onChange={(e) => {
                setArticuloTexto(e.target.value);
                setArticuloSeleccionado(null);
                setMostrarDropdownArt(true);
                setSugerenciaIndex(0);
              }}
              onFocus={() => setMostrarDropdownArt(true)}
              onKeyDown={handleKeyDownArticulo}
              className="h-8.5 w-full rounded-xl border border-slate-300 bg-slate-50/60 pr-8 pl-3.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setMostrarDropdownArt((p) => !p);
                articuloInputRef.current?.focus();
              }}
              className="absolute right-2 text-slate-400 hover:text-slate-700"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* LISTA DESPLEGABLE FLOTANTE FILTRADA */}
          {mostrarDropdownArt && articulosFiltrados.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 top-10 z-50 max-h-64 w-full overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              {articulosFiltrados.map((art, idx) => {
                const isHovered = sugerenciaIndex === idx;
                return (
                  <div
                    key={art.IDARTICULO}
                    onMouseEnter={() => setSugerenciaIndex(idx)}
                    onClick={() => seleccionarArticulo(art)}
                    className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3.5 py-2.5 text-xs transition-colors ${
                      isHovered ? "bg-emerald-600 font-bold text-white" : "hover:bg-slate-50 text-slate-800 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] opacity-75">[{art.CODBARRAS}]</span>
                      <span>{art.DESCRIPCION}</span>
                      <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isHovered ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"}`}>
                        Talla: {art.TALLA}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Alq: ${art.VALOR.toLocaleString()}</span>
                      <span className="opacity-90">Dep: ${art.VALORDEPOSITO.toLocaleString()}</span>
                      <span className={`font-mono font-black ${isHovered ? "text-amber-200" : "text-emerald-700"}`}>
                        Stock: {art.STOCK}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CAMPO CANTIDAD */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-extrabold text-emerald-800 uppercase">CANTIDAD</span>
          <input
            ref={cantidadInputRef}
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            onKeyDown={handleKeyDownCantidad}
            className="h-8.5 w-14 rounded-xl border-2 border-emerald-500 bg-white text-center text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-xs"
          />
        </div>

        {/* BOTÓN + AGREGAR */}
        <button
          onClick={handleAgregarItem}
          title="Bajar artículo a la tabla (Enter en cantidad)"
          className="h-8.5 rounded-xl bg-slate-900 px-3.5 text-sm font-black text-white hover:bg-black shadow-xs transition-all"
        >
          +
        </button>

        {/* BOTÓN ELIMINAR */}
        <button
          onClick={handleEliminarFila}
          className="flex items-center gap-1.5 h-8.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-3.5 text-xs font-bold shadow-xs hover:bg-rose-600 hover:text-white active:scale-95 uppercase tracking-wider transition-all"
        >
          ELIMINAR <Trash2 className="h-3.5 w-3.5" />
        </button>

        {/* BOTÓN PAGAR */}
        <button
          onClick={handleIniciarCobro}
          className="h-8.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 text-xs font-black text-white shadow-md shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 active:scale-95 uppercase tracking-wider transition-all"
        >
          PAGAR
        </button>

        {/* BOTÓN SALIR X */}
        <button
          onClick={handleLimpiar}
          className="flex items-center gap-1 h-8.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-red-50 hover:text-red-700 px-3 text-xs font-bold border border-slate-200 shadow-xs active:scale-95 uppercase tracking-wider transition-all"
        >
          LIMPIAR <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* =========================================================================
          4. TABLA PRINCIPAL DE ALQUILER (ANCHO COMPLETO Y MODERNA)
      ========================================================================= */}
      <div className="flex-1 rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-xs flex flex-col min-h-0 my-0.5">
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-extrabold uppercase text-xs tracking-wider sticky top-0">
                <th className="px-3.5 py-2.5">DESCRIPCION</th>
                <th className="px-2 py-2.5 text-center w-20">CANTIDAD</th>
                <th className="px-3 py-2.5 text-right w-36">VALOR ALQUILER</th>
                <th className="px-3 py-2.5 text-right w-36">TOTAL ALQUILER</th>
                <th className="px-3 py-2.5 text-right w-32">DEPOSITO</th>
                <th className="px-3 py-2.5 text-right w-36">TOTAL DEPOSITO</th>
                <th className="px-3.5 py-2.5 text-right w-36 text-emerald-300">TOT DEP+ALQUILER</th>
              </tr>
            </thead>
            <tbody>
              {gridItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 text-xs font-medium">
                    (Escribe o escanea un artículo arriba, presiona Enter para pasar a Cantidad, y Enter para bajarlo a la tabla)
                  </td>
                </tr>
              ) : (
                gridItems.map((item, index) => {
                  const isSelected = filaSeleccionada === index;
                  const isEven = index % 2 === 0;
                  return (
                    <tr
                      key={item.idTemp}
                      onClick={() => setFilaSeleccionada(index)}
                      className={`cursor-pointer border-b border-slate-100 text-xs transition-colors ${
                        isSelected
                          ? "bg-emerald-100/80 font-bold text-emerald-950"
                          : isEven
                          ? "bg-white font-medium hover:bg-slate-50"
                          : "bg-slate-50/50 font-medium hover:bg-slate-50"
                      }`}
                    >
                      <td className="px-3.5 py-2 text-slate-900 font-bold">
                        {item.descripcion} <span className="text-[10px] text-slate-500 font-normal">(TALLA: {item.talla})</span>
                      </td>
                      <td className="px-2 py-2 text-center font-black">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                        ${item.valorAlquiler.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-slate-900">
                        ${item.totalAlquiler.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-slate-600">
                        ${item.valorDeposito.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-black text-blue-700">
                        ${item.totalDeposito.toLocaleString()}
                      </td>
                      <td className="px-3.5 py-2 text-right font-mono font-black text-emerald-700">
                        ${item.totalGeneral.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          5. BARRA INFERIOR DE TARJETAS DE TOTALES CON PALETA MODERNA
      ========================================================================= */}
      <div className="grid grid-cols-12 gap-3 bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs items-center">
        {/* TARJETA 1: TOTAL DEPOSITO */}
        <div className="col-span-3 h-18 rounded-xl border border-blue-200/80 bg-blue-50/50 p-2.5 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-blue-900 tracking-wider block">
            TOTAL DEPOSITO:
          </span>
          <div className="font-mono text-2xl font-black text-blue-800 text-right leading-none">
            ${totalDeposito.toLocaleString()}
          </div>
        </div>

        {/* TARJETA 2: TOTAL ALQUILER */}
        <div className="col-span-3 h-18 rounded-xl border border-slate-200 bg-slate-50/80 p-2.5 flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
            TOTAL ALQUILER:
          </span>
          <div className="font-mono text-2xl font-black text-slate-900 text-right leading-none">
            ${totalAlquiler.toLocaleString()}
          </div>
        </div>

        {/* TARJETA 3: DESCUENTO_ALQUILER */}
        <div className="col-span-2 h-18 rounded-xl border border-amber-200 bg-amber-50/50 p-2 flex flex-col justify-between">
          <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider block">
            DESCUENTO ALQUILER:
          </span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={descuentoAlquiler}
            onChange={(e) => setDescuentoAlquiler(e.target.value)}
            className="w-full font-mono text-lg font-black text-amber-800 text-right focus:outline-none bg-white rounded-lg border border-amber-300 px-2 py-0.5 shadow-2xs"
          />
        </div>

        {/* TARJETA 4: TOTAL DEPOSITO + ALQUILER (GRAN TOTAL DESTACADO) */}
        <div className="col-span-4 h-18 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 p-2.5 shadow-md flex flex-col justify-between text-white">
          <span className="text-xs font-black uppercase text-emerald-100 tracking-wider block">
            TOTAL DEP + ALQUILER:
          </span>
          <div className="font-mono text-3xl font-black text-white text-right leading-none drop-shadow-xs">
            ${totalDepositoMasAlquiler.toLocaleString()}
          </div>
        </div>
      </div>
      </div>
      )}

      {/* =========================================================================
          MODAL: PAGAR (MODERNO, ELEGANTE Y CLARO)
      ========================================================================= */}
      <Dialog open={modalCobroDetalle} onOpenChange={setModalCobroDetalle}>
        <DialogContent className="w-[92vw] max-w-2xl bg-white p-0 border border-slate-200/90 shadow-2xl overflow-hidden rounded-2xl">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white select-none">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">
                $
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                Cobro y Liquidación de Operación
              </span>
            </div>
            <button
              onClick={() => setModalCobroDetalle(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 bg-slate-50/50 space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="grid grid-cols-12 gap-5">
                {/* COLUMNA IZQUIERDA: PAGOS */}
                <div className="col-span-7 space-y-3.5">
                  {/* PAGO EFECTIVO DROPDOWN */}
                  <div className="flex items-center gap-2">
                    <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                      Pago Efectivo
                    </span>
                    <select
                      value={tipoPagoEfectivo}
                      onChange={(e) => setTipoPagoEfectivo(e.target.value)}
                      className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none shadow-2xs"
                    >
                      <option value="EFECTIVO">EFECTIVO</option>
                    </select>
                  </div>

                  {/* PAGA CON EFECTIVO: INPUT */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      Paga Con Efectivo ($)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={cobroEfectivo}
                      onChange={(e) => setCobroEfectivo(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-xl font-black text-slate-900 shadow-2xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  {/* FORMA DE PAGO DROPDOWN */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                      Forma de Pago
                    </span>
                    <select
                      value={formaDePago}
                      onChange={(e) => setFormaDePago(e.target.value)}
                      className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:outline-none shadow-2xs"
                    >
                      <option value="DATAFONO">DATAFONO</option>
                      <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                      <option value="NEQUI">NEQUI</option>
                      <option value="DAVIPLATA">DAVIPLATA</option>
                      <option value="TARJETA DE CRÉDITO">TARJETA DE CRÉDITO</option>
                      <option value="BONO">BONO</option>
                    </select>
                  </div>

                  {/* PAGA CON TRANSFERENCIA: INPUT */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      Paga Con {formaDePago} ($)
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={cobroTransferencia}
                      onChange={(e) => setCobroTransferencia(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-xl font-black text-slate-900 shadow-2xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                    />
                  </div>

                  {/* TOTAL DEPOSITO + ALQUILER */}
                  <div className="space-y-1 pt-2">
                    <span className="text-xs font-extrabold text-emerald-950 uppercase block">
                      Total a Cobrar (Depósito + Alquiler)
                    </span>
                    <div className="h-14 w-full rounded-xl border border-emerald-300 bg-emerald-50/70 px-4 flex items-center justify-end font-mono text-3xl font-black text-emerald-900 shadow-2xs">
                      ${totalDepositoMasAlquiler.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: DESCUENTO, RECUADRO AZUL Y CAMBIO Ó SALDO */}
                <div className="col-span-5 flex flex-col justify-between space-y-3">
                  {/* DESCUENTO */}
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-slate-700 uppercase block">
                      Descuento ($)
                    </span>
                    <div className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-3 shadow-2xs flex items-center justify-end focus-within:bg-white focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={descuentoAlquiler}
                        onChange={(e) => setDescuentoAlquiler(e.target.value)}
                        className="w-full text-right font-mono text-lg font-black text-slate-900 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* DESCUENTO PORCENTUAL */}
                  <div className="h-8 w-28 bg-emerald-100/70 rounded-lg border border-emerald-300/80 self-center flex items-center justify-center font-mono text-xs font-black text-emerald-900 shadow-2xs">
                    {edtPorcentaje > 0 ? `${edtPorcentaje.toFixed(1)} % DESC` : "0 % DESC"}
                  </div>

                  {/* CAMBIO Ó SALDO */}
                  <div className="space-y-1">
                    <span className="text-xs font-extrabold uppercase text-slate-700 block">
                      {cambioVSaldo < 0 ? "Saldo Pendiente" : "Cambio / Vuelto"}
                    </span>
                    <div className={`h-14 w-full rounded-xl border px-4 flex items-center justify-end font-mono text-3xl font-black shadow-2xs ${
                      cambioVSaldo < 0
                        ? "border-rose-300 bg-rose-50 text-rose-700"
                        : "border-slate-800 bg-slate-900 text-emerald-400"
                    }`}>
                      ${Math.abs(cambioVSaldo).toLocaleString()}
                    </div>
                  </div>

                  {/* BOTONES CANCELAR / ACEPTAR */}
                  <div className="flex items-center justify-end gap-2.5 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalCobroDetalle(false)}
                      className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmarCobro}
                      className="rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase tracking-wider transition-all"
                    >
                      Confirmar Cobro
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: ALTA DE ARTICULOS (MODERNO, ELEGANTE Y CLARO)
      ========================================================================= */}
      <Dialog open={modalArticuloAlta} onOpenChange={setModalArticuloAlta}>
        <DialogContent className="w-[92vw] max-w-3xl bg-white p-0 border border-slate-200/90 shadow-2xl overflow-hidden rounded-2xl">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white select-none">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                {articuloForm.IDARTICULO ? "Modificar Prenda / Disfraz" : "Alta de Nueva Prenda / Disfraz"}
              </span>
            </div>
            <button
              onClick={() => setModalArticuloAlta(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 bg-slate-50/50 space-y-4">
            <div className="flex items-start gap-5">
              {/* CAJA DEL FORMULARIO */}
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                {/* 1. ID ARTICULO */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    ID Artículo
                  </span>
                  <input
                    type="text"
                    disabled
                    value={articuloForm.IDARTICULO || "Auto"}
                    className="h-8 w-28 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right text-xs font-bold text-slate-600"
                  />
                </div>

                {/* 2. ARTICULO */}
                <div className="flex items-start">
                  <span className="w-36 pt-1 text-xs font-bold text-slate-700 uppercase">
                    Descripción / Piezas
                  </span>
                  <textarea
                    rows={3}
                    required
                    placeholder="Ej. TRAJE DE SALSA NIÑO: CAMISA, PANTALÓN"
                    value={articuloForm.DESCRIPCION || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, DESCRIPCION: e.target.value }))}
                    className="flex-1 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs resize-none font-sans"
                  />
                </div>

                {/* 3. VALOR (ALQUILER) */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    Valor Alquiler
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={articuloForm.VALOR || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALOR: Number(e.target.value) || 0 }))}
                      className="h-8 w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                    />
                    <span className="ml-2 text-xs font-bold text-slate-600">$</span>
                  </div>
                </div>

                {/* 4. STOCK */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    Stock Disponible
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={articuloForm.STOCK ?? 0}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, STOCK: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="h-8 w-28 rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* 5. TALLA */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    Talla
                  </span>
                  <input
                    type="text"
                    placeholder="Ej. M, 10, L, ÚNICA"
                    value={articuloForm.TALLA || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, TALLA: e.target.value.toUpperCase() }))}
                    className="h-8 w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold uppercase text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* 6. BARRAS */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    Código de Barras
                  </span>
                  <input
                    type="text"
                    placeholder="Código de barras o referencia"
                    value={articuloForm.CODBARRAS || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, CODBARRAS: e.target.value }))}
                    className="h-8 w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                  />
                </div>

                {/* 7. VALOR DEPOSITO */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-bold text-slate-700 uppercase">
                    Valor Depósito (Fianza)
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={articuloForm.VALORDEPOSITO || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALORDEPOSITO: Number(e.target.value) || 0 }))}
                      className="h-8 w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                    />
                    <span className="ml-2 text-xs font-bold text-slate-600">$</span>
                  </div>
                </div>
              </div>

              {/* BOTONES A LA DERECHA */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleGuardarArticuloAlta}
                  className="flex items-center justify-center gap-2 h-10 w-36 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase tracking-wider transition-all"
                >
                  Guardar <Check className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setModalArticuloAlta(false)}
                  className="flex items-center justify-center gap-2 h-10 w-36 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-xs font-bold active:scale-95 uppercase tracking-wider transition-all"
                >
                  Salir <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: ARCHIVO ARTICULO / CATÁLOGO (MODERNO, ELEGANTE Y CLARO)
      ========================================================================= */}
      <Dialog open={modalArchivoArticulo} onOpenChange={setModalArchivoArticulo}>
        <DialogContent className="w-[96vw] max-w-[1600px] h-[92vh] max-h-[92vh] bg-white p-0 border border-slate-200/90 shadow-2xl overflow-hidden rounded-2xl flex flex-col">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white select-none">
            <div className="flex items-center gap-2.5">
              <Package className="h-5 w-5 text-emerald-400" />
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                Catálogo de Artículos & Trajes — La Casa del Disfraz
              </span>
            </div>
            <button
              onClick={() => setModalArchivoArticulo(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col min-h-0 space-y-4 bg-slate-50/50">
            {/* BARRA DE HERRAMIENTAS Y BOTONES */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto py-1 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={abrirCrearArticulo}
                  className="h-9 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <Plus className="h-4 w-4" /> Nuevo Artículo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!articuloCatalogoSeleccionado) {
                      toast.error("Selecciona un artículo de la lista para modificar");
                      return;
                    }
                    abrirEditarArticulo(articuloCatalogoSeleccionado);
                  }}
                  className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 text-xs font-bold active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <Edit className="h-3.5 w-3.5" /> Modificar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!articuloCatalogoSeleccionado) {
                      toast.error("Selecciona un artículo de la lista para eliminar");
                      return;
                    }
                    handleEliminarArticuloCatalogo(articuloCatalogoSeleccionado.IDARTICULO);
                  }}
                  className="h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 text-xs font-bold active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>

                <button
                  type="button"
                  onClick={() => toast.info("Exportación a Excel XLS")}
                  className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 text-xs font-bold active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4" /> XLS
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3.5 text-xs font-bold active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <Printer className="h-3.5 w-3.5" /> Imprimir
                </button>
              </div>

              {/* BUSCADOR DE ARTÍCULOS */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar por nombre, talla o código..."
                    value={busqArticuloCatalogo}
                    onChange={(e) => setBusqArticuloCatalogo(e.target.value)}
                    className="h-9 w-80 rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setModalArchivoArticulo(false)}
                  className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 text-xs font-bold active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  Salir <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* TABLA DE ARTÍCULOS */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs min-h-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="p-3 border-r border-slate-800 w-14 text-center">N°</th>
                    <th className="p-3 border-r border-slate-800">Descripción Prenda / Traje</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">Talla</th>
                    <th className="p-3 border-r border-slate-800 text-center w-24">Stock</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36">Valor Alquiler</th>
                    <th className="p-3 border-r border-slate-800 text-right w-36">Depósito (Fianza)</th>
                    <th className="p-3 text-center w-32">Cód. Barras</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {articulosCatalogoFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-24 text-center text-slate-400 text-sm font-semibold">
                        No se encontraron prendas con ese criterio de búsqueda.
                      </td>
                    </tr>
                  ) : (
                    articulosCatalogoFiltrados.map((art, idx) => {
                      const isSelected = articuloCatalogoSeleccionado?.IDARTICULO === art.IDARTICULO;
                      const isEven = idx % 2 === 0;
                      return (
                        <tr
                          key={art.IDARTICULO}
                          onClick={() => setArticuloCatalogoSeleccionado(art)}
                          onDoubleClick={() => abrirEditarArticulo(art)}
                          className={`cursor-pointer text-xs transition-colors ${
                            isSelected
                              ? "bg-emerald-100/90 font-black text-emerald-950 border-l-4 border-l-emerald-600"
                              : isEven
                              ? "bg-white hover:bg-emerald-50/50 text-slate-800"
                              : "bg-slate-50/70 hover:bg-emerald-50/50 text-slate-800"
                          }`}
                        >
                          <td className="p-3 text-center font-bold text-slate-500 border-r border-slate-100">
                            {idx + 1}
                          </td>
                          <td className="p-3 whitespace-pre-line font-bold text-slate-900 border-r border-slate-100">
                            {art.DESCRIPCION}
                          </td>
                          <td className="p-3 text-center font-black border-r border-slate-100">
                            <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px]">
                              {art.TALLA || "-"}
                            </span>
                          </td>
                          <td className="p-3 text-center font-black border-r border-slate-100">
                            <span className={`inline-block px-2 py-0.5 rounded-md text-[11px] ${
                              art.STOCK > 0
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}>
                              {art.STOCK}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-900 border-r border-slate-100">
                            ${Number(art.VALOR).toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-blue-900 border-r border-slate-100">
                            ${Number(art.VALORDEPOSITO).toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-slate-600">
                            {art.CODBARRAS}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL DE ALERTA: ESTADO DE TRAJES EN ALQUILER & NOTA DEL CLIENTE
      ========================================================================= */}
      <Dialog open={notaAlertaVisible} onOpenChange={setNotaAlertaVisible}>
        <DialogContent className="max-w-lg lg:max-w-xl bg-white p-0 border border-amber-300 shadow-2xl rounded-2xl overflow-hidden max-h-[85vh] flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white shrink-0">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-100 animate-bounce" />
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider">Información Importante del Cliente</h3>
                <p className="text-[11px] text-amber-100 font-bold">
                  {clienteForm.NOMBRE || "CLIENTE"} (C.C: {clienteForm.CEDULA || "—"})
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotaAlertaVisible(false)}
              className="rounded-lg bg-white/10 hover:bg-white/20 p-1 text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-slate-50/60 overflow-y-auto flex-1 custom-scrollbar">
            {/* 1. SECCIÓN DE TRAJES EN ALQUILER (SI TIENE) */}
            {alquileresActivosCliente.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-900">
                    <Shirt className="h-4 w-4 text-teal-600" />
                    <span>Trajes Actualmente en Alquiler ({alquileresActivosCliente.length})</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Plazo límite: 3 días
                  </span>
                </div>

                <div className="space-y-2.5">
                  {alquileresActivosCliente.map((alq, idx) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-xl border transition-all ${
                        alq.tieneRetraso
                          ? "bg-rose-50/70 border-rose-300 shadow-2xs"
                          : "bg-teal-50/60 border-teal-200 shadow-2xs"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-xs text-slate-900">
                            Recibo #{alq.numeroFactura}
                          </span>
                          <span className="text-[10px] text-slate-600 font-semibold">
                            Salida: <strong>{alq.fechaSalida}</strong> ({alq.diasTranscurridos} día{alq.diasTranscurridos === 1 ? "" : "s"})
                          </span>
                        </div>

                        {alq.tieneRetraso ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-600 text-white shadow-2xs">
                            ⚠️ {alq.diasRetraso} día(s) retraso · Mora: ${alq.recargoTotalRetraso.toLocaleString("es-CO")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ En Plazo (Día {alq.diasTranscurridos} de 3)
                          </span>
                        )}
                      </div>

                      {/* Lista de Prendas */}
                      <div className="py-2 space-y-1 text-xs">
                        {alq.prendas.map((p, pIdx) => (
                          <div key={pIdx} className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-800 truncate max-w-[280px]">
                              • {p.cantidad}x {p.descripcion} (Talla: {p.talla})
                            </span>
                            <span className="font-mono text-slate-600 font-semibold shrink-0">
                              Depósito: ${ (p.valorDeposito * p.cantidad).toLocaleString("es-CO") }
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Aviso de costo por retraso ($7.000 / día) */}
                      {alq.tieneRetraso && (
                        <div className="mt-1 p-2 rounded-lg bg-white border border-rose-200 text-[10px] text-rose-900 font-semibold leading-relaxed">
                          📌 <strong>Costo por mora:</strong> $7.000 COP por día transcurrido después de los 3 días permitidos. Se puede descontar del depósito o condonar al recibir el traje.
                        </div>
                      )}

                      {/* Botón directo para devolver */}
                      <div className="pt-2 flex justify-between items-center">
                        <span className="text-[11px] font-black text-teal-900">
                          Depósito en custodia: ${alq.totalDepositoRetenido.toLocaleString("es-CO")}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFacturaDevolucionSeleccionada(alq.numeroFactura);
                            setNotaAlertaVisible(false);
                            setModalDevolucion(true);
                          }}
                          className="rounded-lg bg-teal-700 hover:bg-teal-800 text-white px-3 py-1 text-xs font-black uppercase shadow-xs transition-all active:scale-95 flex items-center gap-1"
                        >
                          <RotateCcw className="h-3 w-3" />
                          Recibir Traje & Reintegrar Depósito
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. OBSERVACIÓN / NOTA MANUAL DEL CLIENTE */}
            {clienteForm.NOTA && clienteForm.NOTA.trim() !== "" && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-black uppercase text-amber-900 flex items-center gap-1">
                  <AlertCircle className="h-3.5 w-3.5 text-amber-600" />
                  Nota / Observación Registrada en Ficha:
                </span>
                <div className="rounded-xl bg-white p-3.5 border border-amber-200 text-xs text-slate-800 font-bold leading-relaxed shadow-2xs">
                  {clienteForm.NOTA}
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setNotaAlertaVisible(false);
                  setModalCliente(true);
                }}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-300 transition-all"
              >
                Editar Ficha
              </button>

              {alquileresActivosCliente.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFacturaDevolucionSeleccionada(alquileresActivosCliente[0].numeroFactura);
                    setNotaAlertaVisible(false);
                    setModalDevolucion(true);
                  }}
                  className="rounded-xl bg-teal-600 hover:bg-teal-700 px-4 py-2 text-xs font-black text-white shadow-xs transition-all"
                >
                  Devolución & Depósito
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setNotaAlertaVisible(false);
                  setModalOperacionVisible(true);
                }}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 px-5 py-2 text-xs font-black text-white shadow-sm transition-all"
              >
                Entendido ✔
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: SELECCIONE LA OPERACION A REALIZAR
      ========================================================================= */}
      <Dialog open={modalOperacionVisible} onOpenChange={setModalOperacionVisible}>
        <DialogContent className="max-w-md bg-white p-0 border border-slate-200/90 shadow-2xl overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              Tipo de Operación a Realizar
            </span>
            <button
              onClick={() => setModalOperacionVisible(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase block">
                  Seleccione el Modo de Facturación :
                </label>
                <select
                  ref={selectOperacionRef}
                  autoFocus
                  value={operacionSeleccionada}
                  onChange={(e) => setOperacionSeleccionada(e.target.value as any)}
                  onKeyDown={(e) => e.key === "Enter" && handleConfirmarOperacion()}
                  className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-black text-sm text-slate-900 shadow-2xs focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                >
                  <option value="ALQUILER">ALQUILER (Contrato + Fianza)</option>
                  <option value="VENTA">VENTA DIRECTA</option>
                  <option value="BONO">BONO DE REGALO / CANJE</option>
                  <option value="APARTADO">APARTADO / RESERVA PREVIA</option>
                </select>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={handleConfirmarOperacion}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-sm active:scale-95 transition-all"
                >
                  Confirmar Selección
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ALTA_DE_CLIENTES (MODERNO, ELEGANTE Y CLARO)
      ========================================================= */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-2xl bg-white p-0 border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              {clienteForm.IDCLIENTES ? "Ficha de Cliente Registrado" : "Nuevo Cliente — La Casa del Disfraz"}
            </span>
            <button
              onClick={() => setModalCliente(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 bg-slate-50/50">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              {/* 1. ID CLIENTES */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">ID Cliente</span>
                <input
                  type="text"
                  disabled
                  value={clienteForm.IDCLIENTES || "Auto"}
                  className="h-8 w-28 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right text-xs font-bold text-slate-600"
                />
              </div>

              {/* 2. CEDULA + BOTÓN BUSCAR */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">Cédula / Documento</span>
                <input
                  type="number"
                  placeholder="Número de cédula"
                  value={clienteForm.CEDULA || ""}
                  onChange={(e) =>
                    setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                  className="h-8 w-48 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                  className="ml-2 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 text-xs font-bold shadow-2xs uppercase transition-all"
                >
                  Buscar
                </button>
              </div>

              {/* 3. NOMBRE */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">Nombre Completo</span>
                <input
                  type="text"
                  placeholder="Nombre y apellidos"
                  value={clienteForm.NOMBRE || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                  className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 4. DIRECCION */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">Dirección</span>
                <input
                  type="text"
                  placeholder="Dirección de residencia"
                  value={clienteForm.DIRECCION || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                  className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 5. TELEFONO */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">Teléfono 1</span>
                <input
                  type="text"
                  placeholder="Teléfono celular principal"
                  value={clienteForm.TELEFONO || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                  className="h-8 w-64 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 6. TELEFONO2 */}
              <div className="flex items-center">
                <span className="w-36 text-xs font-bold text-slate-700 uppercase">Teléfono 2</span>
                <input
                  type="text"
                  placeholder="Teléfono secundario / familiar"
                  value={clienteForm.TELEFONO2 || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO2: e.target.value }))}
                  className="h-8 w-64 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* 7. NOTA */}
              <div className="flex items-start">
                <span className="w-36 pt-1 text-xs font-bold text-slate-700 uppercase">Observación / Nota</span>
                <textarea
                  rows={2}
                  placeholder="Observaciones o notas especiales sobre el cliente..."
                  value={clienteForm.NOTA || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, NOTA: e.target.value }))}
                  className="flex-1 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none resize-none shadow-2xs"
                />
              </div>

              {/* BOTONES DE ACCIÓN */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCliente(false)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleGuardarClienteAlta}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase tracking-wider transition-all"
                >
                  Guardar Cliente <Check className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: BUSCAR CLIENTES (MODERNO, ELEGANTE Y CLARO)
      ========================================================= */}
      <Dialog open={modalBuscarCli} onOpenChange={setModalBuscarCli}>
        <DialogContent className="max-w-xl bg-white p-0 border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
            <span className="font-black text-slate-100 uppercase text-xs tracking-wider">
              Búsqueda Rápida de Clientes
            </span>
            <button
              onClick={() => setModalBuscarCli(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3 bg-slate-50/50">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe el nombre o documento..."
                value={busqClienteInput}
                onChange={(e) => setBusqClienteInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const clis = await buscarClientesPorNombre(busqClienteInput);
                    setClientesEncontrados(clis);
                  }
                }}
                className="h-9 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
              />
              <button
                onClick={async () => {
                  const clis = await buscarClientesPorNombre(busqClienteInput);
                  setClientesEncontrados(clis);
                }}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-5 text-xs font-extrabold text-white uppercase shadow-sm transition-all"
              >
                Buscar
              </button>
            </div>

            <div className="max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px] sticky top-0">
                  <tr>
                    <th className="p-2.5 border-b">Cédula</th>
                    <th className="p-2.5 border-b">Nombre</th>
                    <th className="p-2.5 border-b">Teléfono</th>
                    <th className="p-2.5 border-b text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientesEncontrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-slate-400 text-xs font-semibold">
                        Ingresa un nombre para buscar clientes.
                      </td>
                    </tr>
                  ) : (
                    clientesEncontrados.map((c) => (
                      <tr key={c.IDCLIENTES} className="hover:bg-emerald-50/60 font-medium transition-colors">
                        <td className="p-2.5 font-mono font-black text-slate-900">{c.CEDULA}</td>
                        <td className="p-2.5 font-bold text-slate-800">{c.NOMBRE}</td>
                        <td className="p-2.5 font-semibold text-slate-600">{c.TELEFONO}</td>
                        <td className="p-2.5 text-right">
                          <button
                            onClick={async () => {
                              setClienteForm(c);
                              setModalBuscarCli(false);
                              await verificarAlquileresYAlertarCliente(c);
                            }}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-bold text-white uppercase shadow-2xs transition-all"
                          >
                            Seleccionar
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: GASTO (SALIDA)
      ========================================================= */}
      <Dialog open={modalGasto} onOpenChange={setModalGasto}>
        <DialogContent className="max-w-sm bg-white p-0 border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white">
            <span className="font-black text-rose-400 uppercase text-xs tracking-wider">
              Registrar Gasto (Salida de Caja)
            </span>
            <button
              onClick={() => setModalGasto(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-3 text-xs font-bold bg-slate-50/50">
            <div>
              <label className="block mb-1 text-slate-700">Descripción del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Lavandería o transporte"
                value={gastoDesc}
                onChange={(e) => setGastoDesc(e.target.value)}
                className="h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-700">Valor Salida ($)</label>
              <input
                type="number"
                placeholder="0"
                value={gastoMonto}
                onChange={(e) => setGastoMonto(e.target.value)}
                className="h-9 w-full rounded-xl border border-rose-300 bg-rose-50/60 px-3 font-mono text-base font-black text-rose-700 focus:bg-white focus:border-rose-500 focus:outline-none shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalGasto(false)}
                className="rounded-xl bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 border border-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  if (!gastoDesc || !gastoMonto) {
                    toast.error("Completa descripción y valor");
                    return;
                  }
                  await registrarGasto({
                    DESCRIPCIONSALIDA: gastoDesc,
                    VALORSALIDA: gastoMonto,
                    FECHA: fechaHoy,
                    NUMEROGASTO: `G-${Date.now()}`,
                  });
                  toast.success("Gasto registrado");
                  setModalGasto(false);
                  setGastoDesc("");
                  setGastoMonto("");
                }}
                className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-1.5 text-xs font-black text-white shadow-sm transition-all"
              >
                Guardar Gasto
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: DEVOLUCIÓN DE TRAJES & REINTEGRO DE DEPÓSITOS
      ========================================================= */}
      <DevolucionTrajesModal
        open={modalDevolucion}
        onOpenChange={setModalDevolucion}
        empresa={empresaConfig}
        facturaPreseleccionada={facturaDevolucionSeleccionada}
        cajeroNombre={cajero}
        onDevolucionExitosa={() => {
          if (clienteForm.CEDULA) {
            verificarAlquileresYAlertarCliente(clienteForm);
          } else {
            handleLimpiar(true);
          }
        }}
      />

      {/* =========================================================
          MODAL: ENTREGA VESTIDO APARTADO (IDÉNTICO A LA CAPTURA WINDEV)
      ========================================================= */}
      <Dialog open={modalApartados} onOpenChange={setModalApartados}>
        <DialogContent className="w-[96vw] max-w-[1600px] h-[92vh] max-h-[92vh] bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md flex flex-col">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-6 py-3.5 bg-slate-900 text-white select-none">
            <div className="flex items-center gap-2.5">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs">
                ★
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-slate-100">
                Gestión de Reservas, Apartados & Abonos de Clientes
              </span>
            </div>
            <button
              onClick={() => setModalApartados(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 flex-1 flex flex-col min-h-0 space-y-4 overflow-auto bg-slate-50/50">
            {/* BANNER DINÁMICO DE ESTADO DE LA FACTURA / PRENDA */}
            {apartadoFactura && (
              <div className="rounded-2xl border px-4 py-2.5 shadow-xs flex items-center justify-between text-xs font-black transition-all">
                {apartadoYaDevuelto ? (
                  <div className="flex items-center gap-2.5 text-emerald-800 bg-emerald-50 border border-emerald-300 w-full p-2 rounded-xl">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shrink-0">
                      ✓
                    </span>
                    <div>
                      <span className="font-extrabold uppercase tracking-wide">
                        ¡PRENDA YA DEVUELTA A TIENDA!
                      </span>
                      <p className="text-[11px] font-bold text-emerald-700">
                        Esta factura ya completó su ciclo de devolución y el depósito fue reintegrado al cliente.
                      </p>
                    </div>
                  </div>
                ) : apartadoFactura.ESTADOCLIENTE === "ENTREGADO" || apartadoItems.some((i) => i.estadoPrenda === "EN ALQUILER") ? (
                  <div className="flex items-center gap-2.5 text-indigo-900 bg-indigo-50 border border-indigo-200 w-full p-2 rounded-xl">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-black text-sm shrink-0">
                      👗
                    </span>
                    <div>
                      <span className="font-extrabold uppercase tracking-wide">
                        PRENDA EN ALQUILER (ENTREGADA AL CLIENTE)
                      </span>
                      <p className="text-[11px] font-bold text-indigo-700">
                        Fecha Salida: {apartadoFactura.FECHASALIDA || "Hoy"} • Fecha Límite de Devolución (3 Días): {apartadoFactura.FECHAENTRADA || "En 3 días"}
                      </p>
                    </div>
                  </div>
                ) : apartadoSaldoRestante === 0 ? (
                  <div className="flex items-center gap-2.5 text-emerald-900 bg-emerald-50 border border-emerald-200 w-full p-2 rounded-xl">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white font-black text-sm shrink-0">
                      📦
                    </span>
                    <div>
                      <span className="font-extrabold uppercase tracking-wide">
                        PRENDA PAGADA EN BODEGA (LISTA PARA ENTREGAR AL CLIENTE)
                      </span>
                      <p className="text-[11px] font-bold text-emerald-700">
                        El saldo es $0. Al entregarla al cliente pasará a "EN ALQUILER" y comenzarán a contar los 3 días.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5 text-amber-900 bg-amber-50 border border-amber-200 w-full p-2 rounded-xl">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-600 text-white font-black text-sm shrink-0">
                      ⏳
                    </span>
                    <div>
                      <span className="font-extrabold uppercase tracking-wide">
                        RESERVA / APARTADO CON SALDO PENDIENTE
                      </span>
                      <p className="text-[11px] font-bold text-amber-800">
                        Saldo por liquidar: ${apartadoSaldoRestante.toLocaleString()} • La prenda permanece en bodega.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SECCIÓN SUPERIOR: FORMULARIO + BOTONES DE ACCIÓN */}
            <div className="flex items-start justify-between gap-4">
              {/* FORMULARIO DE CONSULTA DE FACTURA */}
              <div className="flex-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                {/* FILA 1: NUMEROFACT + BUSCAR + CLIENTE */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase">
                    N° Factura / Recibo
                  </span>
                  <div className="col-span-4 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ej. G1 o ALQ-..."
                      value={apartadoBusqFactura}
                      onChange={(e) => setApartadoBusqFactura(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") handleConsultarApartado();
                      }}
                      className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => handleConsultarApartado()}
                      className="h-8 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-4 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase tracking-wider transition-all"
                    >
                      Buscar
                    </button>
                  </div>

                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                    Cliente
                  </span>
                  <input
                    type="text"
                    disabled
                    value={apartadoFactura?.CCLIENTE || ""}
                    placeholder="Nombre del cliente"
                    className="col-span-4 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-900"
                  />
                </div>

                {/* FILA 2: TOTALALQUILER + TOTAL DEPOSITO + TOTALVENTA+DEPOSITO */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase">
                    Valor Alquiler
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALALQUILER || 0).toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-black text-slate-900"
                  />

                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                    Depósito (Fianza)
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALDEPOSITO || 0).toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-black text-blue-900"
                  />

                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                    Total Operación
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALVENTADEPOSITO || 0).toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-black text-slate-900"
                  />
                </div>

                {/* FILA 3: PAGACON + SALDO ANTERIOR + SALDO ABONADO */}
                <div className="grid grid-cols-12 gap-3 items-center">
                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase">
                    Pago Inicial
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.PAGACON || 0).toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-black text-slate-900"
                  />

                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                    Saldo Inicial
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${apartadoSaldoAnterior.toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-black text-slate-900"
                  />

                  <span className="col-span-2 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                    Total Abonado
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${apartadoTotalAbonado.toLocaleString()}`}
                    className="col-span-2 h-8 rounded-xl border border-emerald-300 bg-emerald-50 px-3 text-right font-mono text-xs font-black text-emerald-800"
                  />
                </div>
              </div>

              {/* BOTONES SUPERIORES */}
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={apartadoYaDevuelto}
                    onClick={() => {
                      if (!apartadoFactura) {
                        toast.error("Busca primero una factura de apartado");
                        return;
                      }
                      if (apartadoSaldoRestante <= 0) {
                        toast.info("Esta factura ya tiene saldo $0");
                        return;
                      }
                      setModalSubAbonar(true);
                    }}
                    className={`h-9 rounded-xl px-5 text-xs font-extrabold shadow-sm active:scale-95 uppercase tracking-wider transition-all ${
                      apartadoYaDevuelto || apartadoSaldoRestante <= 0
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white"
                    }`}
                  >
                    + Nuevo Abono
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 text-xs font-bold active:scale-95 uppercase tracking-wider transition-all"
                  >
                    <Printer className="h-3.5 w-3.5" /> Imprimir
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalApartados(false)}
                    className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 text-xs font-bold active:scale-95 uppercase tracking-wider transition-all"
                  >
                    <X className="h-3.5 w-3.5" /> Salir
                  </button>
                </div>

                {/* BOTÓN SALIDA DE VESTIDO CUANDO EL SALDO ES CERO */}
                <button
                  type="button"
                  onClick={() => {
                    if (!apartadoFactura) {
                      toast.error("Busca primero la factura");
                      return;
                    }
                    if (apartadoYaDevuelto) {
                      toast.info("La prenda ya fue devuelta a la tienda");
                      return;
                    }
                    if (apartadoSaldoRestante > 0) {
                      toast.warning(`⚠️ No se puede entregar el vestido. Existe un saldo pendiente de $ ${apartadoSaldoRestante.toLocaleString()}`);
                      return;
                    }
                    setModalPreguntaSalida(true);
                  }}
                  className={`h-10 rounded-xl px-4 text-xs font-extrabold shadow-sm active:scale-95 uppercase tracking-wider transition-all ${
                    apartadoYaDevuelto
                      ? "bg-emerald-100 text-emerald-800 cursor-default border border-emerald-300"
                      : apartadoFactura?.ESTADOCLIENTE === "ENTREGADO" || apartadoItems.some((i) => i.estadoPrenda === "EN ALQUILER")
                      ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                      : apartadoSaldoRestante === 0 && apartadoFactura
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse"
                      : "bg-slate-200 text-slate-500 cursor-not-allowed"
                  }`}
                >
                  {apartadoYaDevuelto
                    ? "✓ Prenda Ya Devuelta"
                    : apartadoFactura?.ESTADOCLIENTE === "ENTREGADO" || apartadoItems.some((i) => i.estadoPrenda === "EN ALQUILER")
                    ? "👗 Prenda En Alquiler (Entregada)"
                    : "Entregar Prenda (Saldo $0)"}
                </button>
              </div>
            </div>

            {/* SECCIÓN CENTRAL: 2 TABLAS LADO A LADO (ABONOS CLIENTE Y ARTICULOS) */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              {/* TABLA IZQUIERDA: ABONOS CLIENTE */}
              <div className="col-span-7 flex flex-col min-h-0">
                <div className="py-1">
                  <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase">
                    Historial de Abonos Registrados
                  </h3>
                </div>
                <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5 border-r border-slate-800">N° Abono</th>
                        <th className="p-2.5 border-r border-slate-800">Cliente</th>
                        <th className="p-2.5 border-r border-slate-800 text-right">Efectivo</th>
                        <th className="p-2.5 border-r border-slate-800 text-right">Transf.</th>
                        <th className="p-2.5 border-r border-slate-800 text-center">Fecha</th>
                        <th className="p-2.5 text-right">Total Abono</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {apartadoAbonos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-16 text-center text-slate-400 text-xs font-semibold">
                            No hay abonos registrados para esta factura.
                          </td>
                        </tr>
                      ) : (
                        apartadoAbonos.map((ab, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/60 font-medium transition-colors">
                            <td className="p-2.5 font-mono font-bold text-slate-900 border-r border-slate-100">
                              {ab.NUMEROABONO}
                            </td>
                            <td className="p-2.5 font-bold text-slate-800 border-r border-slate-100">
                              {ab.ACLIENTE}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold border-r border-slate-100">
                              ${Number(ab.PAGOEFECTIVO || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold border-r border-slate-100">
                              ${Number(ab.PAGOTRANFE || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center font-bold text-slate-600 border-r border-slate-100">
                              {ab.FECHAABONO}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-emerald-800">
                              ${Number(ab.TOTAL_ABONO || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA DERECHA: ARTICULOS CON ESTADO / UBICACIÓN */}
              <div className="col-span-5 flex flex-col min-h-0">
                <div className="py-1">
                  <h3 className="text-xs font-extrabold tracking-wider text-slate-800 uppercase">
                    Prendas en el Apartado
                  </h3>
                </div>
                <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white font-extrabold uppercase text-[11px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2.5 border-r border-slate-800">Descripción</th>
                        <th className="p-2.5 border-r border-slate-800 text-center w-12">Cant</th>
                        <th className="p-2.5 border-r border-slate-800 text-right w-20">Valor</th>
                        <th className="p-2.5 border-r border-slate-800 text-right w-20">Total</th>
                        <th className="p-2.5 text-center w-28">Estado / Ubicación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {apartadoItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-16 text-center text-slate-400 text-xs font-semibold">
                            Sin artículos cargados.
                          </td>
                        </tr>
                      ) : (
                        apartadoItems.map((it, idx) => (
                          <tr key={idx} className="hover:bg-emerald-50/60 font-medium transition-colors">
                            <td className="p-2.5 font-bold text-slate-900 border-r border-slate-100">
                              {it.DESCRIPCION}
                            </td>
                            <td className="p-2.5 text-center font-black border-r border-slate-100">
                              {it.CANTIDAD}
                            </td>
                            <td className="p-2.5 text-right font-mono font-bold border-r border-slate-100">
                              ${Number(it.VALOR || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-right font-mono font-black text-slate-900 border-r border-slate-100">
                              ${Number(it.TOTAL || 0).toLocaleString()}
                            </td>
                            <td className="p-2.5 text-center">
                              {it.estadoPrenda === "DEVUELTO A TIENDA" || apartadoYaDevuelto ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[10px] font-black">
                                  ✓ DEVUELTO
                                </span>
                              ) : it.estadoPrenda === "EN ALQUILER" || apartadoFactura?.ESTADOCLIENTE === "ENTREGADO" ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-black">
                                  👗 EN ALQUILER
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-900 px-2 py-0.5 text-[10px] font-black">
                                  📦 EN BODEGA
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECCIÓN INFERIOR: SALDO RESTANTE */}
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-xs font-black tracking-wider text-slate-700 uppercase">
                Saldo Pendiente de Liquidación :
              </span>
              <div className={`h-12 px-6 rounded-xl border flex items-center justify-end font-mono text-2xl font-black shadow-2xs ${
                apartadoSaldoRestante > 0
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800"
              }`}>
                ${apartadoSaldoRestante.toLocaleString()}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          VENTANA MODAL: ABONO_CLIENTE (MODERNO, ELEGANTE Y CLARO)
      ========================================================= */}
      <Dialog open={modalSubAbonar} onOpenChange={setModalSubAbonar}>
        <DialogContent className="max-w-2xl bg-white p-0 border border-slate-200/90 shadow-2xl rounded-2xl overflow-hidden z-[9999]">
          {/* BARRA DE TÍTULO */}
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white select-none">
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              Registrar Abono a Factura de Apartado
            </span>
            <button
              type="button"
              onClick={() => setModalSubAbonar(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
              {/* FILA 1: N.ABONO + ABONO A FACTURA */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase">
                  N° de Abono
                </span>
                <input
                  type="text"
                  value={abonoNumero}
                  onChange={(e) => setAbonoNumero(e.target.value)}
                  className="col-span-3 h-8 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-mono font-bold text-slate-900"
                />

                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                  Factura
                </span>
                <input
                  type="text"
                  disabled
                  value={apartadoFactura?.NUMEROFACT || ""}
                  className="col-span-3 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-mono font-black text-slate-900"
                />
              </div>

              {/* FILA 2: CLIENTE */}
              <div className="grid grid-cols-12 gap-3 items-center">
                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase">
                  Cliente
                </span>
                <input
                  type="text"
                  disabled
                  value={apartadoFactura?.CCLIENTE || ""}
                  className="col-span-9 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-900"
                />
              </div>

              {/* FILA 3: PAGO CON EFECTIVO */}
              <div className="grid grid-cols-12 gap-3 items-center pt-1">
                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase">
                  Pago Efectivo ($)
                </span>
                <input
                  type="number"
                  min={0}
                  value={abonoPagoEfec}
                  onChange={(e) => setAbonoPagoEfec(e.target.value)}
                  className="col-span-9 h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* FILA 4: OTRAS_F_PAGO */}
              <div className="grid grid-cols-12 gap-3 items-center pt-1">
                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase">
                  Otra Forma de Pago
                </span>
                <select
                  value={abonoOtrasForma}
                  onChange={(e) => setAbonoOtrasForma(e.target.value)}
                  className="col-span-4 h-8 rounded-xl border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold text-slate-900 focus:outline-none"
                >
                  <option value="DATAFONO">DATAFONO</option>
                  <option value="TRANSFERENCIA">TRANSFERENCIA</option>
                  <option value="NEQUI">NEQUI</option>
                  <option value="DAVIPLATA">DAVIPLATA</option>
                  <option value="TARJETA DE CRÉDITO">TARJETA DE CRÉDITO</option>
                  <option value="BONO">BONO</option>
                </select>

                <input
                  type="number"
                  min={0}
                  placeholder="Monto"
                  value={abonoPagoTrans}
                  onChange={(e) => setAbonoPagoTrans(e.target.value)}
                  className="col-span-5 h-9 rounded-xl border border-slate-300 bg-slate-50 px-3 text-right font-mono text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none shadow-2xs"
                />
              </div>

              {/* FILA 5: SALDO A DEBER + TOTAL SALDO RESTANTE */}
              <div className="grid grid-cols-12 gap-3 items-center pt-3 border-t border-slate-200">
                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase">
                  Saldo Actual
                </span>
                <div className="col-span-3 h-8 rounded-xl border border-slate-200 bg-slate-100 px-3 flex items-center justify-end font-mono text-xs font-black text-slate-900">
                  ${apartadoSaldoRestante.toLocaleString()}
                </div>

                <span className="col-span-3 text-xs font-bold text-slate-700 uppercase text-right pr-2">
                  Nuevo Saldo
                </span>
                <div className="col-span-3 h-8 rounded-xl border border-rose-200 bg-rose-50 px-3 flex items-center justify-end font-mono text-xs font-black text-rose-700">
                  ${abonoTotalSaldoRestante.toLocaleString()}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setModalSubAbonar(false)}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-4 py-2 text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarAbono}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 px-6 py-2 text-xs font-extrabold text-white shadow-sm active:scale-95 uppercase tracking-wider transition-all"
                >
                  Registrar Abono
                </button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          DIALOGO DE CONFIRMACIÓN: ¿Desea Darle Salida AL Traje De bodega?
      ========================================================= */}
      {/* =========================================================
          DIALOGO DE CONFIRMACIÓN: ¿Desea Entregar Prenda o Guardar en Bodega?
      ========================================================= */}
      <Dialog open={modalPreguntaSalida} onOpenChange={setModalPreguntaSalida}>
        <DialogContent className="max-w-md bg-white p-0 border border-slate-300 shadow-2xl rounded-2xl overflow-hidden z-[99999]">
          <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white select-none">
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              Confirmar Entrega de Prenda
            </span>
            <button
              type="button"
              onClick={() => handleConfirmarSalidaBodega(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4 bg-slate-50/50">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-emerald-100 text-emerald-700 text-2xl font-black shadow-2xs">
                👗
              </div>

              <div className="space-y-1.5 font-sans text-xs text-slate-800">
                <h4 className="font-black text-sm text-slate-900">
                  ¡El saldo ha quedado en $0!
                </h4>
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  ¿Deseas <strong>entregar la prenda al cliente en este momento</strong> o permanece guardada en bodega?
                </p>
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-[11px] font-bold text-amber-900 leading-snug">
                  ⏰ <strong>Importante:</strong> Si sale ahora, pasará de <strong>BODEGA</strong> a <strong>EN ALQUILER</strong> y empezarán a contar los <strong>3 DÍAS reglamentarios</strong> para su devolución.
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 p-4 bg-white border-t border-slate-200">
            <button
              type="button"
              onClick={() => handleConfirmarSalidaBodega(false)}
              className="rounded-xl border border-slate-300 bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all"
            >
              📦 No, Sigue en Bodega
            </button>
            <button
              type="button"
              onClick={() => handleConfirmarSalidaBodega(true)}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2 text-xs font-black text-white shadow-sm active:scale-95 transition-all"
            >
              👗 Sí, Entregar al Cliente (Inicia 3 Días)
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: TIRA DE ABONO 80mm (REPORTE entregarvestido EXACTO A WINDEV)
      ========================================================= */}
      <Dialog open={modalImprimirAbono80mm} onOpenChange={setModalImprimirAbono80mm}>
        <DialogContent className="max-w-sm bg-white p-5 border-2 border-slate-800 shadow-2xl overflow-y-auto max-h-[90vh]">
          {ticketAbonoData && (
            <div className="font-mono text-xs text-slate-900 space-y-2 select-text">
              {/* LOGO OFICIAL CENTRADO */}
              <div className="flex flex-col items-center border-b border-dashed border-slate-400 pb-2">
                <img
                  src="/logo_casa_del_disfraz.jpg"
                  alt="La Casa Del Disfraz"
                  className="h-16 w-auto object-contain mb-1"
                />
                <p className="text-center font-bold text-[11px] leading-tight">
                  CRA 23 #15-34<br />
                  BUCARAMANGA - SANTANDER<br />
                  6076963959 - 3202375610
                </p>
              </div>

              {/* DATOS DE FACTURA Y CLIENTE */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 pb-2 font-semibold">
                <div className="flex justify-between">
                  <span>CAJA:</span>
                  <span className="font-bold">{ticketAbonoData.caja}</span>
                </div>
                <div className="flex justify-between">
                  <span>CLIENTE:</span>
                  <span className="font-bold">{ticketAbonoData.cliente}</span>
                </div>
                <div className="flex justify-between">
                  <span>CÉDULA:</span>
                  <span>{ticketAbonoData.cedula}</span>
                </div>
                <div className="flex justify-between">
                  <span>DIRECCIÓN:</span>
                  <span>{ticketAbonoData.direccion}</span>
                </div>
                <div className="flex justify-between">
                  <span>TELÉFONO 1:</span>
                  <span>{ticketAbonoData.telefono1}</span>
                </div>
                <div className="flex justify-between">
                  <span>TELÉFONO 2:</span>
                  <span>{ticketAbonoData.telefono2}</span>
                </div>
                <div className="flex justify-between">
                  <span>F_PAGO:</span>
                  <span>{ticketAbonoData.formaPago}</span>
                </div>
                <div className="flex justify-between">
                  <span>TIPO:</span>
                  <span className="font-black text-red-700">{ticketAbonoData.tipo}</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJERO:</span>
                  <span>{ticketAbonoData.cajero}</span>
                </div>
                <div className="flex justify-between">
                  <span>RECIBO:</span>
                  <span className="font-black">{ticketAbonoData.recibo}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>{ticketAbonoData.fecha}</span>
                </div>
              </div>

              {/* TABLA DE ARTÍCULOS */}
              <div className="border-b border-dashed border-slate-400 pb-2 text-[11px]">
                <div className="flex justify-between font-black pb-1 border-b border-slate-300">
                  <span className="w-1/2">DESCRIPCION</span>
                  <span className="text-center w-12">CANT</span>
                  <span className="text-right w-16">VALOR</span>
                  <span className="text-right w-16">TOTAL</span>
                </div>
                {ticketAbonoData.items.map((it: any, i: number) => (
                  <div key={i} className="flex justify-between py-0.5">
                    <span className="w-1/2 truncate font-bold">{it.DESCRIPCION}</span>
                    <span className="text-center w-12 font-bold">{it.CANTIDAD}</span>
                    <span className="text-right w-16 font-mono">${Number(it.VALOR || 0).toLocaleString()}</span>
                    <span className="text-right w-16 font-mono font-bold">${Number(it.TOTAL || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              {/* TOTALES Y SALDOS */}
              <div className="text-[11px] space-y-0.5 border-b border-dashed border-slate-400 pb-2 font-bold text-right">
                <div className="flex justify-between">
                  <span>VALOR ALQUILER:</span>
                  <span className="font-mono">${Number(ticketAbonoData.valorAlquiler).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>DEPOSITO:</span>
                  <span className="font-mono">${Number(ticketAbonoData.deposito).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>SALDO ANTERIOR:</span>
                  <span className="font-mono">${Number(ticketAbonoData.saldoAnterior).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-emerald-800">
                  <span>RECIBI ABONO:</span>
                  <span className="font-mono font-black">${Number(ticketAbonoData.recibiAbono).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-red-700 text-xs border-t pt-1">
                  <span>SALDO:</span>
                  <span className="font-mono font-black">${Number(ticketAbonoData.saldo).toLocaleString()}</span>
                </div>
              </div>

              {/* FECHAS DE SALIDA Y DEVOLUCIÓN */}
              <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-400 pb-2 font-bold">
                <div className="flex justify-between">
                  <span>FECHA DE SALIDA DE TRAJE:</span>
                  <span>{ticketAbonoData.fechaSalida}</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA DE DEVOLUCION TRAJE:</span>
                  <span>{ticketAbonoData.fechaDevolucion}</span>
                </div>
              </div>

              {/* TÉRMINOS Y CONDICIONES EXACTOS */}
              <div className="text-[9px] text-slate-700 leading-tight space-y-1 pt-1">
                <p className="font-bold">Condiciones de servicio:</p>
                <p>- Tiempo de alquiler 3 días hábiles. Por devoluciones hechas después de la fecha se cobrará un recargo de $5.000 por día.</p>
                <p>- Favor conservar este recibo para efectuar la devolución de dinero que ha dejado como depósito.</p>
                <p>- No se hace devolución de dinero una vez elaborado este RECIBO.</p>
                <p className="font-black text-center pt-1">INSTAGRAM: @LACASADELDISFRAZOFICIAL</p>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModalImprimirAbono80mm(false);
                    handleLimpiar(true);
                  }}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300 transition-all"
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    setModalImprimirAbono80mm(false);
                    handleLimpiar(true);
                  }}
                  className="rounded-xl bg-slate-900 hover:bg-black px-5 py-2 text-xs font-black text-white flex items-center gap-1.5 shadow-sm transition-all"
                >
                  <Printer className="h-4 w-4 text-emerald-400" /> Imprimir 80mm
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: COMPROBANTE DE ALQUILER / VENTA
      ========================================================= */}
      <Dialog
        open={modalImprimir}
        onOpenChange={(open) => {
          setModalImprimir(open);
          if (!open) {
            handleLimpiar(true);
          }
        }}
      >
        <DialogContent className="max-w-md bg-white p-6 border border-slate-200/90 shadow-2xl rounded-2xl">
          <div className="font-mono text-xs text-slate-900">
            <div className="border-b border-dashed border-slate-400 pb-3 text-center">
              <h2 className="text-base font-black uppercase tracking-wider text-slate-900">LA CASA DEL DISFRAZ</h2>
              <p className="text-xs font-semibold text-emerald-800">Elegance Rentals</p>
              <p className="text-[10px] text-slate-500">Para toda ocasión sin importar tu edad</p>
              <p className="mt-2 font-black text-sm text-slate-900">
                RECIBO N° {ticketReciboVenta?.numeroRecibo || numeroRecibo}
              </p>
              <p className="text-[10px] text-slate-500">
                Fecha: {ticketReciboVenta?.fechaHoy || fechaHoy} · Cajero: {ticketReciboVenta?.cajero || cajero}
              </p>
            </div>

            <div className="py-2.5 text-xs space-y-1 border-b border-dashed border-slate-400 font-semibold">
              <p>
                <strong>CLIENTE:</strong>{" "}
                {(ticketReciboVenta?.cliente?.nombre || clienteForm.NOMBRE)?.toUpperCase() || "GENERAL"}
              </p>
              <p>
                <strong>CÉDULA:</strong> {ticketReciboVenta?.cliente?.cedula || clienteForm.CEDULA || "N/A"}
              </p>
              <p>
                <strong>TELÉFONO:</strong> {ticketReciboVenta?.cliente?.telefono || clienteForm.TELEFONO || "N/A"}
              </p>
              <p>
                <strong>SALIDA:</strong> {ticketReciboVenta?.fechaSalida || fechaSalida} |{" "}
                <strong>ENTRADA:</strong> {ticketReciboVenta?.fechaEntrada || fechaEntrada}
              </p>
            </div>

            <div className="py-2.5 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-black pb-1 text-xs">
                <span>ARTÍCULO</span>
                <span>VALOR</span>
              </div>
              {(ticketReciboVenta?.items || gridItems).map((it, i) => (
                <div key={i} className="flex justify-between py-0.5 text-xs font-bold">
                  <span>
                    {it.cantidad}x {it.descripcion} ({it.talla})
                  </span>
                  <span>${it.totalAlquiler.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="py-2.5 space-y-1 text-right text-xs font-bold">
              <p>
                Total Alquiler: ${(ticketReciboVenta?.totalAlquiler ?? totalAlquilerConDesc).toLocaleString()}
              </p>
              <p className="font-black text-blue-900">
                Total Depósito (Fianza): ${(ticketReciboVenta?.totalDeposito ?? totalDeposito).toLocaleString()}
              </p>
              <p className="text-sm font-black border-t pt-1.5 text-slate-900">
                TOTAL COBRADO: ${(ticketReciboVenta?.totalGeneral ?? totalDepositoMasAlquiler).toLocaleString()}
              </p>
              <p className="text-emerald-800 font-black">
                Cambio / Vuelto: ${(ticketReciboVenta?.cambio ?? Math.max(0, cambioVSaldo)).toLocaleString()}
              </p>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-500 italic font-semibold">
              Conservar este recibo para la devolución de la prenda y reintegro del depósito.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
            <button
              onClick={() => {
                setModalImprimir(false);
                handleLimpiar(true);
              }}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 border border-slate-300"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                window.print();
                setModalImprimir(false);
                handleLimpiar(true);
              }}
              className="rounded-xl bg-slate-900 hover:bg-black px-5 py-2 text-xs font-black text-white flex items-center gap-1.5 shadow-sm"
            >
              <Printer className="h-4 w-4 text-emerald-400" /> Imprimir Recibo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL ALERTA: ESTE CLIENTE TIENE SALDO PENDIENTE
      ========================================================= */}
      <Dialog open={modalSaldoPendienteAlerta} onOpenChange={setModalSaldoPendienteAlerta}>
        <DialogContent className="max-w-sm bg-white p-0 border border-amber-300 shadow-2xl rounded-2xl overflow-hidden z-[99999]">
          <div className="flex items-center justify-between px-5 py-3.5 bg-amber-500 text-white select-none">
            <span className="text-xs font-bold uppercase tracking-wider">
              Saldo Pendiente
            </span>
            <button
              type="button"
              onClick={() => setModalSaldoPendienteAlerta(false)}
              className="text-amber-100 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 flex items-start gap-4 bg-amber-50/40">
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-xl bg-amber-200 text-amber-900 font-black text-lg">
              !
            </div>

            <div className="space-y-1 font-sans text-xs text-slate-800">
              <p className="font-extrabold uppercase tracking-wide text-amber-950">
                Este Cliente Posee Saldo Pendiente
              </p>
              <p className="font-mono text-xl font-black text-rose-700">
                ${montoAlertaSaldo.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex justify-end p-4 bg-white border-t border-amber-200">
            <button
              type="button"
              onClick={() => setModalSaldoPendienteAlerta(false)}
              className="rounded-xl bg-slate-900 hover:bg-black text-white px-5 py-2 text-xs font-bold shadow-sm transition-all"
            >
              Aceptar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MENÚ LATERAL HAMBURGUESA (DRAWER MODERNO)
      ========================================================= */}
      <SidebarMenu
        isOpen={sidebarAbierto}
        onClose={() => setSidebarAbierto(false)}
        terminal={terminalConfig}
        empresa={empresaConfig}
        usuario={usuarioActivo}
        onAccion={handleMenuAccion}
      />

      {/* =========================================================
          MODAL: CONFIGURACIÓN DE EMPRESA
      ========================================================= */}
      <ConfiguracionEmpresaModal
        open={modalEmpresa}
        onOpenChange={setModalEmpresa}
        onGuardadoExitoso={(cfg) => setEmpresaConfig(cfg)}
      />

      {/* =========================================================
          MODAL: CONFIGURACIÓN MULTI-CAJAS, TERMINALES Y RESOLUCIONES
      ========================================================= */}
      <ConfiguracionCajasModal
        open={modalCajasConfig}
        onOpenChange={setModalCajasConfig}
        onCajaCambiada={(term) => {
          setTerminalConfig(term);
          generarNumeroFactura(term.nombreCaja, term.prefijo).then((num) => setNumeroRecibo(num));
        }}
      />

      {/* =========================================================
          MODAL: ARQUEO Y CIERRE DE CAJA DEL DÍA
      ========================================================= */}
      <CierreCajaModal
        open={modalCierreCaja}
        onOpenChange={setModalCierreCaja}
        cajeroNombre={cajero}
      />

      {/* =========================================================
          MODAL: GESTIÓN DE USUARIOS, CAJEROS, ADMINS Y PERMISOS
      ========================================================= */}
      <GestionUsuariosModal
        open={modalUsuarios}
        onOpenChange={setModalUsuarios}
        usuarioActual={usuarioActivo}
      />

      {/* =========================================================
          MODAL: CONTROL DE MOVIMIENTOS Y ESTADO DE TRAJES
      ========================================================= */}
      <MovimientosTrajesModal
        open={modalMovimientosTrajes}
        onOpenChange={setModalMovimientosTrajes}
        empresa={empresaConfig}
        cajeroNombre={cajero}
      />

      {/* =========================================================
          MODAL: BALANCE & AUDITORÍA FINANCIERA DE DEPÓSITOS Y SALDOS
      ========================================================= */}
      <BalanceDepositosModal
        open={modalBalanceDepositos}
        onOpenChange={setModalBalanceDepositos}
        empresa={empresaConfig}
        cajeroNombre={cajero}
      />

      {/* =========================================================
          MODAL: DIRECTORIO Y CATÁLOGO GENERAL DE CLIENTES
      ========================================================= */}
      <CatalogoClientesModal
        open={modalCatalogoClientes}
        onOpenChange={setModalCatalogoClientes}
        onSeleccionarCliente={async (cli) => {
          setClienteForm(cli);
          await verificarAlquileresYAlertarCliente(cli);
        }}
        empresa={empresaConfig}
      />

      {/* =========================================================
          MODAL: INVENTARIO, ALIMENTACIÓN DE STOCK Y KARDEX
      ========================================================= */}
      <InventarioStockModal
        isOpen={modalInventarioStock}
        onClose={() => {
          setModalInventarioStock(false);
          cargarArticulos();
        }}
        usuarioActivo={usuarioActivo?.nombre || cajero}
        onArticuloSeleccionado={(art) => {
          setArticuloTexto(art.CODBARRAS || art.DESCRIPCION);
          setModalInventarioStock(false);
        }}
      />

      {/* =========================================================
          MODAL: REIMPRESIÓN & HISTORIAL DE FACTURAS POR FECHA
      ========================================================= */}
      <ReimpresionFacturasModal
        open={modalReimpresionFacturas}
        onOpenChange={setModalReimpresionFacturas}
        empresa={empresaConfig}
        cajeroNombre={cajero}
      />

      {/* =========================================================
          MODAL: PANEL DE NOTIFICACIONES: RETRASOS Y COBRO DE MORA
      ========================================================= */}
      <AlertasRetrasosModal
        open={modalAlertasRetrasos}
        onOpenChange={setModalAlertasRetrasos}
        empresa={empresaConfig}
        cajeroNombre={cajero}
        onAbrirDevolucion={(numFact) => {
          setModalDevolucion(true);
        }}
      />
    </div>
  );
}
