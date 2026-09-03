import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trash2,
  X,
  Printer,
  ChevronDown,
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
} from "@/services/posService";
import { LogoCasaDelDisfraz } from "./LogoCasaDelDisfraz";

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

  // Alerta de Nota del Cliente
  const [notaAlertaVisible, setNotaAlertaVisible] = useState(false);

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

  // Estados del Módulo ENTREGA VESTIDO APARTADO (Abonos)
  const [apartadoBusqFactura, setApartadoBusqFactura] = useState("");
  const [apartadoFactura, setApartadoFactura] = useState<Factura | null>(null);
  const [apartadoItems, setApartadoItems] = useState<CampoFactura[]>([]);
  const [apartadoAbonos, setApartadoAbonos] = useState<AbonoCliente[]>([]);
  const [modalSubAbonar, setModalSubAbonar] = useState(false);
  const [abonoPagoEfec, setAbonoPagoEfec] = useState("");
  const [abonoPagoTrans, setAbonoPagoTrans] = useState("");
  const [modalSaldoPendienteAlerta, setModalSaldoPendienteAlerta] = useState(false);
  const [montoAlertaSaldo, setMontoAlertaSaldo] = useState(0);

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

  async function handleConsultarApartado() {
    if (!apartadoBusqFactura.trim()) {
      toast.error("Ingresa el número de factura a consultar");
      return;
    }
    const res = await buscarFacturaApartado(apartadoBusqFactura);
    if (!res.factura) {
      toast.error("Factura no encontrada");
      setApartadoFactura(null);
      setApartadoItems([]);
      setApartadoAbonos([]);
      return;
    }
    setApartadoFactura(res.factura);
    setApartadoItems(res.items);
    setApartadoAbonos(res.abonos);

    // Calcular si tiene saldo pendiente para mostrar la ventanita emergente WINDEV
    const totalVenta = Number(res.factura.FTOTALVENTADEPOSITO) || 0;
    const pagado = Number(res.factura.PAGACON) || 0;
    const sAnterior = Math.max(0, totalVenta - pagado);
    const totAbonos = (res.abonos || []).reduce((acc, it) => acc + (Number(it.TOTAL_ABONO) || 0), 0);
    const sRestante = Math.max(0, sAnterior - totAbonos);

    if (sRestante > 0) {
      setMontoAlertaSaldo(sRestante);
      setModalSaldoPendienteAlerta(true);
    } else {
      toast.success(`Factura ${res.factura.NUMEROFACT} cargada exitosamente`);
    }
  }

  async function handleGuardarAbono() {
    if (!apartadoFactura) return;
    const efec = parseFloat(abonoPagoEfec) || 0;
    const trans = parseFloat(abonoPagoTrans) || 0;
    const totalAbono = efec + trans;

    if (totalAbono <= 0) {
      toast.error("Ingresa un monto válido para el abono");
      return;
    }

    const nuevoSaldo = Math.max(0, apartadoSaldoRestante - totalAbono);

    const abonoGuardado = await registrarAbonoCliente({
      numeroFactura: apartadoFactura.NUMEROFACT,
      cliente: apartadoFactura.CCLIENTE,
      pagoEfectivo: efec,
      pagoTransferencia: trans,
      saldoAnterior: apartadoSaldoRestante,
      saldoDeber: nuevoSaldo,
      totalAbono,
    });

    if (abonoGuardado) {
      toast.success("¡Abono registrado con éxito!");
      setApartadoAbonos((prev) => [...prev, abonoGuardado]);
      setModalSubAbonar(false);
      setAbonoPagoEfec("");
      setAbonoPagoTrans("");
    } else {
      toast.error("Error al registrar el abono");
    }
  }

  useEffect(() => {
    generarNumeroFactura().then((num) => setNumeroRecibo(num));
    cargarArticulos();
  }, []);

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
      if (cli.NOTA && cli.NOTA.trim() !== "") {
        setNotaAlertaVisible(true);
        toast.warning(`⚠️ NOTA DEL CLIENTE: ${cli.NOTA}`, { duration: 7000 });
      } else {
        toast.success(`Cliente: ${cli.NOMBRE}`);
        setModalOperacionVisible(true);
      }
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
        const art = articulosFiltrados[sugerenciaIndex] || articulosFiltrados[0];
        seleccionarArticulo(art);
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

  // Limpiar / Nuevo Alquiler
  function handleLimpiar() {
    generarNumeroFactura().then(setNumeroRecibo);
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
    setModalOperacionVisible(false);
    setEstadoTraje("EN ALQUILER");
    toast.info("Formulario reiniciado");
    articuloInputRef.current?.focus();
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
    if (gridItems.length === 0 || totalDepositoMasAlquiler <= 0) {
      toast.error("DEBE REGITRAR UN PRODUCTO");
      return;
    }

    setCobroEfectivo(String(totalDepositoMasAlquiler));
    setCobroTransferencia("0");
    setModalCobroDetalle(true);
  }

  // Confirmar y Procesar Factura (BOTÓN ACEPTAR EN PAGAR - EXACTO A WINDEV)
  async function handleConfirmarPagoFinal() {
    // 1. Validaciones principales de cabecera
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
    if (gridItems.length === 0 || totalDepositoMasAlquiler <= 0) {
      toast.error("DEBE REGITRAR UN PRODUCTO");
      return;
    }

    // 2. Validaciones de Medios de Pago
    if (totalDepositoMasAlquiler > 0) {
      if (!tipoPagoEfectivo && !formaDePago) {
        toast.error("DEBE SELECCIONAR UN MEDIO DE PAGO");
        return;
      }
      if (efecNum === 0 && transNum === 0 && operacionSeleccionada !== "BONO" && operacionSeleccionada !== "APARTADO") {
        toast.error("coloque el monto total a pagar o de lo contrario es un bono o un apartado");
        return;
      }
    }

    // 3. Prevenir ejecuciones múltiples (bGuardando)
    if (bGuardando) {
      toast.error("La factura ya se está procesando. Espere un momento.");
      return;
    }
    setBGuardando(true);

    try {
      const factura: Omit<Factura, "IDFACTURA"> = {
        NUMEROFACT: numeroRecibo,
        FECHASALIDA: fechaSalida,
        FECHAENTRADA: fechaEntrada,
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
      const resultado = await registrarAlquilerFactura(factura, campos, "SERVIDOR");
      
      if (resultado && resultado.factura) {
        setNumeroRecibo(resultado.factura.NUMEROFACT);
      }

      setModalCobroDetalle(false);
      setModalImprimir(true);
      toast.success("¡Alquiler procesado y factura generada con éxito!");
    } catch (err: any) {
      console.error("Error procesando factura:", err);
      toast.error("Error al procesar la factura. Modo local activo.");
      setModalCobroDetalle(false);
      setModalImprimir(true);
    } finally {
      setBGuardando(false);
    }
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#EDEDED] font-sans text-slate-900 select-none overflow-hidden p-2">
      {/* =========================================================================
          1. SECCIÓN SUPERIOR: FORMULARIO RECOGIDO A LA IZQUIERDA + LOGO A LA DERECHA
      ========================================================================= */}
      <div className="flex items-start gap-3 pb-1">
        {/* LADO IZQUIERDO: TÍTULO "PUNTO DE VENTA" + FORMULARIO COMPACTO DE 3 COLUMNAS */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* TÍTULO PUNTO DE VENTA CENTRADO SOBRE EL FORMULARIO */}
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wider text-slate-700 uppercase">ALQUILER</span>
              <button
                onClick={() => setModalArchivoArticulo(true)}
                className="flex items-center gap-1.5 rounded bg-slate-800 px-3 py-1 text-xs font-bold text-white hover:bg-black shadow-sm"
              >
                <Package className="h-3.5 w-3.5" /> ARCHIVO ARTICULO
              </button>
            </div>

            <h1 className="text-2xl font-black tracking-widest text-[#E60000] uppercase font-sans leading-none drop-shadow-sm">
              PUNTO DE VENTA
            </h1>

            <div className="w-16" />
          </div>

          {/* FORMULARIO DE CABECERA COMPACTO */}
          <div className="rounded border-2 border-slate-400 bg-[#E8E8E8] p-2 shadow-inner space-y-1.5">
            <div className="grid grid-cols-12 gap-x-2.5 gap-y-1.5 text-xs">
              {/* FILA 1 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">ESTADO</span>
                <select
                  value={estadoCli}
                  onChange={(e) => setEstadoCli(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 shadow-inner"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-800 text-xs uppercase">CEDULA</span>
                <input
                  type="text"
                  placeholder="Ingresa cédula y Enter"
                  value={clienteForm.CEDULA || ""}
                  onChange={(e) =>
                    setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta()}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 shadow-inner"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-black text-slate-800 text-xs uppercase">FECHA SALIDA</span>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none shadow-inner"
                />
              </div>

              {/* FILA 2 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">FECHA</span>
                <input
                  type="date"
                  value={fechaHoy}
                  onChange={(e) => setFechaHoy(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none shadow-inner"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-800 text-xs uppercase">NOMBRE</span>
                <input
                  type="text"
                  placeholder="Nombre completo"
                  value={clienteForm.NOMBRE || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none shadow-inner"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-black text-slate-800 text-xs uppercase">FECHA ENTRADA</span>
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={(e) => setFechaEntrada(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none shadow-inner"
                />
              </div>

              {/* FILA 3 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">N.RECIBO</span>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-black text-red-700 focus:outline-none shadow-inner"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">DIRECCION</span>
                <input
                  type="text"
                  placeholder="Dirección"
                  value={clienteForm.DIRECCION || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-inner"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1.5">
                <span className="w-24 font-black text-slate-800 text-xs uppercase">ESTADO TRAJE</span>
                <button
                  type="button"
                  onClick={() => setModalOperacionVisible(true)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-black uppercase text-left text-slate-900 hover:bg-slate-100 flex items-center justify-between shadow-inner"
                >
                  <span className="truncate text-red-700">{estadoTraje}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                </button>
              </div>

              {/* FILA 4 */}
              <div className="col-span-3 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">CAJERO</span>
                <input
                  type="text"
                  value={cajero}
                  onChange={(e) => setCajero(e.target.value)}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-[10px] font-black uppercase text-slate-700 focus:outline-none shadow-inner"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1.5">
                <span className="w-16 font-black text-slate-700 text-xs uppercase">TELEFONO</span>
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={clienteForm.TELEFONO || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                  className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => setModalCliente(true)}
                  className="h-7 rounded bg-[#B82E1F] px-3 text-xs font-black text-white shadow hover:bg-red-800 active:scale-95 whitespace-nowrap"
                >
                  Mod
                </button>
              </div>
            </div>

            {/* BANNER DE NOTA */}
            {clienteForm.NOTA && clienteForm.NOTA.trim() !== "" && (
              <div className="flex items-center justify-between rounded border-2 border-amber-500 bg-amber-100 px-3 py-1 text-xs font-black text-amber-950 shadow-sm animate-pulse">
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="flex items-center gap-1 rounded bg-amber-700 px-1.5 py-0.5 text-[10px] text-white uppercase font-black tracking-wide">
                    <AlertTriangle className="h-3 w-3" /> NOTA CLIENTE:
                  </span>
                  <span className="truncate text-xs font-bold">{clienteForm.NOTA}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotaAlertaVisible(true)}
                  className="ml-2 text-blue-800 underline hover:text-blue-950 whitespace-nowrap text-xs font-black"
                >
                  [Ver Completa]
                </button>
              </div>
            )}
          </div>
        </div>

        {/* LADO DERECHO SUPERIOR: LOGO ORIGINAL "LA CASA DEL DISFRAZ" + "SERVIDOR" */}
        <div className="w-64 flex flex-col items-center justify-center p-2 border-2 border-slate-300 rounded bg-white shadow-sm self-stretch">
          <LogoCasaDelDisfraz />
        </div>
      </div>

      {/* =========================================================================
          2. BARRA DE LOS 9 BOTONES PRINCIPALES EN ROJO/MAGENTA (MÁS GRANDES Y CÓMODOS)
      ========================================================================= */}
      <div className="flex items-center gap-2 overflow-x-auto py-1.5">
        <button
          onClick={() => setModalCliente(true)}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          NUEVO CLIENTE
        </button>

        <button
          onClick={() => setModalCliente(true)}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          MODIFICAR
        </button>

        <button
          onClick={() => setModalBuscarCli(true)}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          BUSCAR CLIENTE
        </button>

        <button
          onClick={handleLimpiar}
          className="h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          NUEVO
        </button>

        <button
          onClick={handleLimpiar}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          NUEVO ALQUILER
        </button>

        <button
          onClick={() => setModalGasto(true)}
          className="flex items-center gap-1.5 h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          <span className="text-[10px] text-white">▶</span> GASTO(SALIDA)
        </button>

        <button
          onClick={() => setModalImprimir(true)}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          REIMPRIMIR
        </button>

        <button
          onClick={() => setModalApartados(true)}
          className="h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          APARTADOS
        </button>

        <button
          onClick={() => setModalDevolucion(true)}
          className="h-8 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase tracking-wider transition-all"
        >
          ENTRADA VESTIDO
        </button>
      </div>

      {/* =========================================================================
          3. LÍNEA DE ARTÍCULO: AUTOCOMPLETE CON FILTRADO + 1 ENTER A CANTIDAD + ENTER A TABLA
      ========================================================================= */}
      <div className="relative flex items-center gap-2 py-1">
        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">ARTICULO</span>

        {/* BOTÓN + PARA CREAR NUEVO ARTÍCULO RÁPIDO */}
        <button
          type="button"
          onClick={abrirCrearArticulo}
          title="Crear nuevo artículo en el catálogo"
          className="flex items-center justify-center h-8 w-8 rounded bg-emerald-600 text-white hover:bg-emerald-700 shadow-md"
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
              className="h-8 w-full rounded border border-slate-400 bg-white pr-8 pl-3 text-xs font-black text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500 shadow-inner"
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                setMostrarDropdownArt((p) => !p);
                articuloInputRef.current?.focus();
              }}
              className="absolute right-2 text-slate-500 hover:text-slate-800"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          {/* LISTA DESPLEGABLE FLOTANTE FILTRADA */}
          {mostrarDropdownArt && articulosFiltrados.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute left-0 top-9 z-50 max-h-64 w-full overflow-auto rounded border border-slate-400 bg-white shadow-xl"
            >
              {articulosFiltrados.map((art, idx) => {
                const isHovered = sugerenciaIndex === idx;
                return (
                  <div
                    key={art.IDARTICULO}
                    onMouseEnter={() => setSugerenciaIndex(idx)}
                    onClick={() => seleccionarArticulo(art)}
                    className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-3 py-2 text-xs transition-colors ${
                      isHovered ? "bg-[#B80036] font-bold text-white" : "hover:bg-slate-100 text-slate-800 font-semibold"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] opacity-75">[{art.CODBARRAS}]</span>
                      <span>{art.DESCRIPCION}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${isHovered ? "bg-white/20" : "bg-slate-200"}`}>
                        Talla: {art.TALLA}
                      </span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>Alq: ${art.VALOR.toLocaleString()}</span>
                      <span className="opacity-90">Dep: ${art.VALORDEPOSITO.toLocaleString()}</span>
                      <span className={`font-mono font-black ${isHovered ? "text-yellow-200" : "text-emerald-700"}`}>
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
        <div className="flex items-center gap-1">
          <span className="text-xs font-black text-red-700 uppercase">▸CANTIDAD</span>
          <input
            ref={cantidadInputRef}
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
            onKeyDown={handleKeyDownCantidad}
            className="h-8 w-14 rounded border-2 border-red-500 bg-white text-center text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
          />
          <span className="text-xs font-black text-red-700">▸</span>
        </div>

        {/* BOTÓN + AGREGAR */}
        <button
          onClick={handleAgregarItem}
          title="Bajar artículo a la tabla (Enter en cantidad)"
          className="h-8 rounded bg-slate-700 px-3 text-sm font-black text-white hover:bg-slate-900 shadow-md"
        >
          +
        </button>

        {/* BOTÓN ELIMINAR */}
        <button
          onClick={handleEliminarFila}
          className="flex items-center gap-1.5 h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow-md hover:bg-[#96002C] active:scale-95 uppercase tracking-wider"
        >
          ELIMINAR <Trash2 className="h-4 w-4" />
        </button>

        {/* BOTÓN PAGAR (LINEA SUPERIOR DE ARTICULO) */}
        <button
          onClick={handleIniciarCobro}
          className="h-8 rounded bg-[#111111] px-5 text-xs font-black text-white shadow-md hover:bg-black active:scale-95 uppercase tracking-wider"
        >
          PAGAR
        </button>

        {/* BOTÓN SALIR X */}
        <button
          onClick={handleLimpiar}
          className="flex items-center gap-1.5 h-8 rounded bg-[#992222] px-4 text-xs font-black text-white shadow-md hover:bg-[#771111] active:scale-95 uppercase tracking-wider"
        >
          SALIR <X className="h-4 w-4" />
        </button>
      </div>

      {/* =========================================================================
          4. TABLA PRINCIPAL DE ALQUILER (ANCHO COMPLETO)
      ========================================================================= */}
      <div className="flex-1 rounded border border-slate-400 bg-white overflow-hidden shadow-inner flex flex-col min-h-0 my-1">
        <div className="overflow-auto flex-1">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-[#000000] text-white font-black uppercase text-xs tracking-wider sticky top-0">
                <th className="border-r border-slate-700 px-3 py-2">DESCRIPCION</th>
                <th className="border-r border-slate-700 px-2 py-2 text-center w-20">CANTIDAD</th>
                <th className="border-r border-slate-700 px-3 py-2 text-right w-36">VALOR ALQUILER</th>
                <th className="border-r border-slate-700 px-3 py-2 text-right w-36">TOTAL ALQUILER</th>
                <th className="border-r border-slate-700 px-3 py-2 text-right w-32">DEPOSITO</th>
                <th className="border-r border-slate-700 px-3 py-2 text-right w-36">TOTAL DEPOSITO</th>
                <th className="px-3 py-2 text-right w-36">TOT DEP+ALQUILER</th>
              </tr>
            </thead>
            <tbody>
              {gridItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-20 text-center text-slate-400 text-xs font-bold">
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
                      className={`cursor-pointer border-b border-slate-200 text-xs ${
                        isSelected
                          ? "bg-[#FFE066] font-black text-slate-900"
                          : isEven
                          ? "bg-white font-semibold"
                          : "bg-[#D6E6F2] font-semibold"
                      }`}
                    >
                      <td className="px-3 py-1.5 text-slate-900 border-r border-slate-200 font-bold">
                        {item.descripcion} <span className="text-[10px] text-slate-600 font-normal">(TALLA: {item.talla})</span>
                      </td>
                      <td className="px-2 py-1.5 text-center font-black border-r border-slate-200">
                        {item.cantidad}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold border-r border-slate-200">
                        ${item.valorAlquiler.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                        ${item.totalAlquiler.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold border-r border-slate-200">
                        ${item.valorDeposito.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-black text-blue-900 border-r border-slate-200">
                        ${item.totalDeposito.toLocaleString()}
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-black text-emerald-800">
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
          5. BARRA INFERIOR DE TARJETAS DE TOTALES (MÁS GRANDES, ALTAS Y NÚMEROS VISIBLES)
      ========================================================================= */}
      <div className="grid grid-cols-12 gap-3 bg-[#E2E8F0] p-2.5 rounded-lg border-2 border-slate-400 shadow-md items-center">
        {/* TARJETA 1: TOTAL DEPOSITO */}
        <div className="col-span-3 h-18 rounded-lg border-2 border-slate-400 bg-white p-2.5 shadow-inner flex flex-col justify-between">
          <span className="text-xs font-black uppercase text-slate-700 tracking-wider block">
            TOTAL DEPOSITO:
          </span>
          <div className="font-mono text-2xl font-black text-blue-900 text-right leading-none">
            ${totalDeposito.toLocaleString()}
          </div>
        </div>

        {/* TARJETA 2: TOTAL ALQUILER */}
        <div className="col-span-3 h-18 rounded-lg border-2 border-slate-400 bg-white p-2.5 shadow-inner flex flex-col justify-between">
          <span className="text-xs font-black uppercase text-slate-700 tracking-wider block">
            TOTAL ALQUILER:
          </span>
          <div className="font-mono text-2xl font-black text-slate-900 text-right leading-none">
            ${totalAlquiler.toLocaleString()}
          </div>
        </div>

        {/* TARJETA 3: DESCUENTO_ALQUILER */}
        <div className="col-span-2 h-18 rounded-lg border-2 border-slate-400 bg-white p-2 shadow-inner flex flex-col justify-between">
          <span className="text-[11px] font-black uppercase text-slate-700 tracking-wider block">
            DESCUENTO_ALQUILER:
          </span>
          <input
            type="number"
            min={0}
            placeholder="0"
            value={descuentoAlquiler}
            onChange={(e) => setDescuentoAlquiler(e.target.value)}
            className="w-full font-mono text-lg font-black text-red-700 text-right focus:outline-none bg-slate-50 rounded border border-slate-300 px-2 py-0.5 shadow-inner"
          />
        </div>

        {/* TARJETA 4: TOTAL DEPOSITO + ALQUILER (GRAN TOTAL DESTACADO) */}
        <div className="col-span-4 h-18 rounded-lg border-2 border-red-600 bg-red-50 p-2.5 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-black uppercase text-red-900 tracking-wider block">
              TOTAL DEP + ALQUILER:
            </span>
            <span className="font-mono text-3xl font-black text-red-700 leading-none drop-shadow-sm">
              ${totalDepositoMasAlquiler.toLocaleString()}
            </span>
          </div>
          <button
            onClick={handleIniciarCobro}
            disabled={gridItems.length === 0}
            className="rounded-lg bg-[#002D62] px-5 py-3 text-sm font-black uppercase tracking-wider text-white shadow-md hover:bg-black active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            <span>PAGAR</span>
            <span className="text-yellow-300">💳</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL: PAGAR (IDÉNTICO A LA CAPTURA WINDEV [PAGAR])
      ========================================================================= */}
      <Dialog open={modalCobroDetalle} onOpenChange={setModalCobroDetalle}>
        <DialogContent className="w-[90vw] max-w-2xl bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md">
          {/* BARRA DE TÍTULO SUPERIOR ESTILO WINDOWS */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-300 select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 font-bold text-xs">❖</span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                PAGAR
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Minus className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800" />
              <Square className="h-3 w-3 cursor-pointer hover:text-slate-800" />
              <button
                onClick={() => setModalCobroDetalle(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-5">
            {/* CONTENEDOR PRINCIPAL CON BORDE GRIS */}
            <div className="rounded border-2 border-slate-400 bg-[#E8E8E8] p-5 shadow-inner">
              <div className="grid grid-cols-12 gap-5">
                {/* COLUMNA IZQUIERDA: PAGOS */}
                <div className="col-span-7 space-y-3.5">
                  {/* PAGO EFECTIVO DROPDOWN */}
                  <div className="flex items-center gap-2">
                    <span className="w-36 text-xs font-black text-slate-800 uppercase">
                      PAGO EFECTIVO
                    </span>
                    <select
                      value={tipoPagoEfectivo}
                      onChange={(e) => setTipoPagoEfectivo(e.target.value)}
                      className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-900 focus:outline-none shadow-inner"
                    >
                      <option value="EFECTIVO">EFECTIVO</option>
                    </select>
                  </div>

                  {/* PAGA CON EFECTIVO: INPUT */}
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 uppercase block">
                      PAGA CON EFECTIVO:
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={cobroEfectivo}
                      onChange={(e) => setCobroEfectivo(e.target.value)}
                      className="h-10 w-full rounded border border-slate-400 bg-white px-3 text-right font-mono text-xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* FORMA DE PAGO DROPDOWN */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="w-36 text-xs font-black text-slate-800 uppercase">
                      FORMA DE PAGO
                    </span>
                    <select
                      value={formaDePago}
                      onChange={(e) => setFormaDePago(e.target.value)}
                      className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-900 focus:outline-none shadow-inner"
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
                    <span className="text-xs font-black text-slate-800 uppercase block">
                      PAGA CON TRANSFERENCIA:
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={cobroTransferencia}
                      onChange={(e) => setCobroTransferencia(e.target.value)}
                      className="h-10 w-full rounded border border-slate-400 bg-white px-3 text-right font-mono text-xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  {/* TOTAL DEPOSITO + ALQUILER */}
                  <div className="space-y-1 pt-2">
                    <span className="text-xs font-black text-slate-800 uppercase block">
                      TOTAL DEPOSITO + ALQUILER
                    </span>
                    <div className="h-14 w-full rounded border-2 border-slate-400 bg-white px-4 flex items-center justify-end font-mono text-3xl font-black text-slate-900 shadow-inner">
                      {totalDepositoMasAlquiler.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* COLUMNA DERECHA: DESCUENTO, RECUADRO AZUL Y CAMBIO Ó SALDO */}
                <div className="col-span-5 flex flex-col justify-between space-y-3">
                  {/* DESCUENTO */}
                  <div className="space-y-1">
                    <span className="text-xs font-black text-slate-800 uppercase block">
                      DESCUENTO
                    </span>
                    <div className="h-14 rounded border border-slate-400 bg-white p-2 shadow-inner flex items-center justify-end">
                      <input
                        type="number"
                        min={0}
                        placeholder="0"
                        value={descuentoAlquiler}
                        onChange={(e) => setDescuentoAlquiler(e.target.value)}
                        className="w-full text-right font-mono text-xl font-black text-slate-900 focus:outline-none bg-transparent"
                      />
                    </div>
                  </div>

                  {/* RECUADRO AZUL CLARO ESTILO WINDEV: EDT_PORCENTAJE */}
                  <div className="h-10 w-28 bg-[#8BB8E8] rounded border border-blue-400 self-center flex items-center justify-center font-mono text-sm font-black text-blue-950 shadow-inner">
                    {edtPorcentaje > 0 ? `${edtPorcentaje.toFixed(1)} %` : "0 %"}
                  </div>

                  {/* CAMBIO Ó SALDO */}
                  <div className="space-y-1">
                    <span className="text-xs font-black uppercase text-red-600 block">
                      CAMBIO Ó SALDO
                    </span>
                    <div className="h-16 w-full rounded border-2 border-red-300 bg-[#FF9999] px-4 flex items-center justify-end font-mono text-4xl font-black text-blue-900 shadow-inner">
                      {cambioVSaldo.toLocaleString()}
                    </div>
                  </div>

                  {/* BOTONES CANCELAR / ACEPTAR */}
                  <div className="flex items-center justify-center gap-4 pt-3">
                    <button
                      type="button"
                      onClick={() => setModalCobroDetalle(false)}
                      className="rounded bg-[#004B87] px-6 py-2 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase tracking-wide transition-all"
                    >
                      Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={handleConfirmarPagoFinal}
                      className="rounded bg-[#B82E1F] px-7 py-2 text-xs font-black text-white shadow-md hover:bg-red-900 active:scale-95 uppercase tracking-wide transition-all"
                    >
                      Aceptar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* FRANJA AZUL INFERIOR */}
          <div className="h-3.5 bg-gradient-to-r from-[#003366] via-[#004B87] to-[#002244] w-full" />
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: ALTA DE ARTICULOS (IDÉNTICO A LA CAPTURA WINDEV [ALTA DE ARTICULOS])
      ========================================================================= */}
      <Dialog open={modalArticuloAlta} onOpenChange={setModalArticuloAlta}>
        <DialogContent className="w-[90vw] max-w-3xl bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-300">
            <div className="flex items-center gap-1.5">
              <Package className="h-4 w-4 text-slate-700" />
              <span className="text-xs font-black text-slate-800 uppercase">
                ALTA DE ARTICULOS
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Minus className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800" />
              <Square className="h-3 w-3 cursor-pointer hover:text-slate-800" />
              <button
                onClick={() => setModalArticuloAlta(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {/* TÍTULO CENTRADO */}
            <div className="text-center pb-5">
              <h2 className="text-2xl font-black tracking-wider text-slate-900 uppercase font-sans">
                INGRESE LOS DATOS DEL ARTICULO
              </h2>
            </div>

            {/* CUERPO PRINCIPAL CON FORMULARIO Y BOTONES A LA DERECHA */}
            <div className="flex items-start gap-5">
              {/* CAJA DEL FORMULARIO */}
              <div className="flex-1 rounded border-2 border-slate-400 bg-[#E8E8E8] p-5 shadow-inner space-y-3">
                {/* 1. ID ARTICULO */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    ID ARTICULO
                  </span>
                  <input
                    type="text"
                    disabled
                    value={articuloForm.IDARTICULO || 0}
                    className="h-7 w-28 rounded border border-slate-400 bg-white px-2 text-right text-xs font-black text-slate-700 shadow-inner"
                  />
                </div>

                {/* 2. ARTICULO (TEXTAREA GRANDE BLANCO PARA DESCRIPCIÓN Y PIEZAS) */}
                <div className="flex items-start">
                  <span className="w-36 pt-1 text-xs font-black text-slate-800 uppercase">
                    ARTICULO
                  </span>
                  <textarea
                    rows={4}
                    required
                    placeholder="TRAJE DE SALSANIÑO:&#10;CAMISA, PANTALÓN"
                    value={articuloForm.DESCRIPCION || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, DESCRIPCION: e.target.value }))}
                    className="flex-1 rounded border border-slate-400 bg-white p-2.5 text-xs font-bold text-slate-900 uppercase focus:outline-none focus:border-blue-600 shadow-inner resize-none font-sans"
                  />
                </div>

                {/* 3. VALOR (ALQUILER) */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    VALOR
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      placeholder="0,00"
                      value={articuloForm.VALOR || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALOR: Number(e.target.value) || 0 }))}
                      className="h-7 w-48 rounded border border-slate-400 bg-white px-2.5 text-right font-mono text-xs font-black text-slate-900 focus:outline-none shadow-inner"
                    />
                    <span className="ml-1.5 text-xs font-bold text-slate-700">$</span>
                  </div>
                </div>

                {/* 4. STOCK */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    STOCK
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={articuloForm.STOCK ?? 0}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, STOCK: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="h-7 w-28 rounded border border-slate-400 bg-white px-2.5 text-right font-mono text-xs font-black text-slate-900 focus:outline-none shadow-inner"
                  />
                </div>

                {/* 5. TALLA */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    TALLA
                  </span>
                  <input
                    type="text"
                    placeholder="Talla"
                    value={articuloForm.TALLA || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, TALLA: e.target.value.toUpperCase() }))}
                    className="h-7 w-48 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold uppercase text-slate-900 focus:outline-none shadow-inner"
                  />
                </div>

                {/* 6. BARRAS */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    BARRAS
                  </span>
                  <input
                    type="text"
                    placeholder="1538"
                    value={articuloForm.CODBARRAS || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, CODBARRAS: e.target.value }))}
                    className="h-7 w-48 rounded border border-slate-400 bg-white px-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none shadow-inner"
                  />
                </div>

                {/* 7. VALOR DEPOSITO */}
                <div className="flex items-center">
                  <span className="w-36 text-xs font-black text-slate-800 uppercase">
                    VALOR DEPOSITO
                  </span>
                  <div className="relative flex items-center">
                    <input
                      type="number"
                      min={0}
                      placeholder="0,00"
                      value={articuloForm.VALORDEPOSITO || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALORDEPOSITO: Number(e.target.value) || 0 }))}
                      className="h-7 w-48 rounded border border-slate-400 bg-white px-2.5 text-right font-mono text-xs font-black text-slate-900 focus:outline-none shadow-inner"
                    />
                    <span className="ml-1.5 text-xs font-bold text-slate-700">$</span>
                  </div>
                </div>
              </div>

              {/* BOTONES A LA DERECHA (GUARDAR ✔ / SALIR ✖) */}
              <div className="flex flex-col gap-3 pt-6">
                <button
                  type="button"
                  onClick={handleGuardarArticuloAlta}
                  className="flex items-center justify-center gap-2 h-9 w-32 rounded bg-[#004B87] text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase tracking-wider transition-all"
                >
                  GUARDAR <Check className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setModalArticuloAlta(false)}
                  className="flex items-center justify-center gap-2 h-9 w-32 rounded bg-[#004B87] text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase tracking-wider transition-all"
                >
                  SALIR <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* FRANJA AZUL INFERIOR */}
          <div className="h-3.5 bg-gradient-to-r from-[#003366] via-[#004B87] to-[#002244] w-full" />
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: ARCHIVO ARTICULO (PANTALLA COMPLETA / AMPLIA Y ESPACIOSA EXACTA A WINDEV)
      ========================================================================= */}
      <Dialog open={modalArchivoArticulo} onOpenChange={setModalArchivoArticulo}>
        <DialogContent className="w-[96vw] max-w-[1600px] h-[92vh] max-h-[92vh] bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md flex flex-col">
          {/* BARRA DE TÍTULO ESTILO WINDOWS */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-300 select-none">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-700" />
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                articulo
              </span>
            </div>
            <div className="flex items-center gap-3 text-slate-500">
              <Minus className="h-4 w-4 cursor-pointer hover:text-slate-800" />
              <Square className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800" />
              <button
                onClick={() => setModalArchivoArticulo(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3">
            {/* TÍTULO CENTRADO ARCHIVO ARTICULO */}
            <div className="text-center py-1">
              <h2 className="text-3xl font-black tracking-widest text-slate-900 uppercase font-sans">
                ARCHIVO ARTICULO
              </h2>
            </div>

            {/* BARRA DE HERRAMIENTAS Y BOTONES GRANDES Y CÓMODOS */}
            <div className="flex items-center justify-between gap-3 overflow-x-auto py-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toast.info("Exportación XLS preparada")}
                  className="h-8 rounded bg-[#004B87] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <FileSpreadsheet className="h-4 w-4" /> xls
                </button>

                <button
                  type="button"
                  onClick={() => toast.info("Ingreso desde archivo")}
                  className="h-8 rounded bg-[#004B87] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  <Upload className="h-4 w-4" /> ingreso desde
                </button>

                <button
                  type="button"
                  onClick={abrirCrearArticulo}
                  className="h-8 rounded bg-[#004B87] px-4 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  NUEVO +
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
                  className="h-8 rounded bg-[#004B87] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  MODIFICAR <Edit className="h-3.5 w-3.5" />
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
                  className="h-8 rounded bg-[#004B87] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  ELIMINAR <Trash2 className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="h-8 rounded bg-[#004B87] px-3.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  Imprimir <Printer className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setModalArchivoArticulo(false)}
                  className="h-8 rounded bg-[#004B87] px-4 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase flex items-center gap-1.5 tracking-wider transition-all"
                >
                  SALIR <X className="h-4 w-4" />
                </button>
              </div>

              {/* FILTRAR ARTICULO */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-800 whitespace-nowrap">
                  FILTRAR ARTICULO:
                </span>
                <input
                  type="text"
                  placeholder="Escribe para buscar..."
                  value={busqArticuloCatalogo}
                  onChange={(e) => setBusqArticuloCatalogo(e.target.value)}
                  className="h-8 w-64 rounded border border-slate-400 bg-white px-3 text-xs font-bold text-slate-900 focus:outline-none shadow-inner"
                />
              </div>
            </div>

            {/* TABLA DE ARTÍCULOS QUE LLENA TODO EL ALTO DISPONIBLE */}
            <div className="flex-1 overflow-auto rounded border-2 border-slate-400 bg-white shadow-inner min-h-0">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-[#004B87] text-white font-black uppercase text-xs tracking-wider sticky top-0">
                  <tr>
                    <th className="p-2.5 border-r border-slate-500 w-14 text-center">N°</th>
                    <th className="p-2.5 border-r border-slate-500">DESCRIPCION ARTICULO</th>
                    <th className="p-2.5 border-r border-slate-500 text-center w-24">TALLA</th>
                    <th className="p-2.5 border-r border-slate-500 text-center w-24">STOCK</th>
                    <th className="p-2.5 border-r border-slate-500 text-right w-36">VALOR</th>
                    <th className="p-2.5 border-r border-slate-500 text-right w-36">VALOR DEPOSITO</th>
                    <th className="p-2.5 text-center w-28">BARRAS</th>
                  </tr>
                </thead>
                <tbody>
                  {articulosCatalogoFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-24 text-center text-slate-400 text-sm font-bold">
                        No se encontraron artículos con ese filtro.
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
                          className={`cursor-pointer border-b border-slate-200 text-xs transition-colors ${
                            isSelected
                              ? "bg-[#FFE066] font-black text-slate-900"
                              : isEven
                              ? "bg-white font-semibold"
                              : "bg-[#D6E6F2] font-semibold"
                          }`}
                        >
                          <td className="p-2.5 text-center font-bold border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 whitespace-pre-line font-bold text-slate-900 border-r border-slate-200">
                            {art.DESCRIPCION}
                          </td>
                          <td className="p-2.5 text-center font-black border-r border-slate-200">
                            {art.TALLA || "-"}
                          </td>
                          <td className="p-2.5 text-center font-black border-r border-slate-200">
                            {art.STOCK}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200">
                            ${Number(art.VALOR).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold border-r border-slate-200">
                            ${Number(art.VALORDEPOSITO).toLocaleString()}
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold">
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

          {/* FRANJA AZUL INFERIOR */}
          <div className="h-3.5 bg-gradient-to-r from-[#003366] via-[#004B87] to-[#002244] w-full" />
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL DE ALERTA: NOTA DESTACADA DEL CLIENTE AL ESCANEAR CÉDULA
      ========================================================================= */}
      <Dialog open={notaAlertaVisible} onOpenChange={setNotaAlertaVisible}>
        <DialogContent className="max-w-md bg-[#FFF9DB] p-5 border-4 border-amber-500 shadow-2xl">
          <div className="flex items-center gap-2 border-b-2 border-amber-300 pb-2 text-amber-900">
            <AlertTriangle className="h-6 w-6 text-amber-600 animate-bounce" />
            <div>
              <h3 className="text-sm font-black uppercase">¡ATENCIÓN! OBSERVACIÓN DEL CLIENTE</h3>
              <p className="text-xs text-amber-800 font-bold">
                Cliente: <strong>{clienteForm.NOMBRE}</strong> (C.C: {clienteForm.CEDULA})
              </p>
            </div>
          </div>

          <div className="my-3 rounded bg-white p-3 border border-amber-300 font-mono text-xs text-slate-900 font-bold leading-relaxed shadow-inner">
            {clienteForm.NOTA}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setNotaAlertaVisible(false);
                setModalCliente(true);
              }}
              className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-300"
            >
              Editar Ficha Cliente
            </button>
            <button
              onClick={() => {
                setNotaAlertaVisible(false);
                setModalOperacionVisible(true);
              }}
              className="rounded bg-amber-600 px-5 py-1.5 text-xs font-black text-white hover:bg-amber-700 shadow"
            >
              ENTENDIDO ✔
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: SELECCIONE LA OPERACION A REALIZAR (EXACTO A LA CAPTURA WINDEV)
      ========================================================================= */}
      <Dialog open={modalOperacionVisible} onOpenChange={setModalOperacionVisible}>
        <DialogContent className="max-w-md bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md">
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-300">
            <span className="text-xs font-black text-slate-700 uppercase">
              SELECCIONE LA OPERACION A REALIZAR
            </span>
            <button
              onClick={() => setModalOperacionVisible(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <div className="text-center">
              <h3 className="text-sm font-black tracking-wider text-[#E65100] uppercase font-sans">
                SELECCIONE LA OPERACIÓN A REALIZAR
              </h3>
            </div>

            <div className="flex items-center justify-center gap-2">
              <label className="text-xs font-black uppercase text-slate-800">
                SELECCIONE :
              </label>
              <select
                ref={selectOperacionRef}
                autoFocus
                value={operacionSeleccionada}
                onChange={(e) => setOperacionSeleccionada(e.target.value as any)}
                onKeyDown={(e) => e.key === "Enter" && handleConfirmarOperacion()}
                className="h-8 w-52 rounded border border-slate-400 bg-white px-2.5 font-bold text-xs text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALQUILER">ALQUILER</option>
                <option value="VENTA">VENTA</option>
                <option value="BONO">BONO</option>
                <option value="APARTADO">APARTADO</option>
              </select>
            </div>

            <div className="flex justify-center pt-1">
              <button
                type="button"
                onClick={handleConfirmarOperacion}
                className="rounded bg-[#004B87] px-8 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow hover:bg-[#003366] active:scale-95"
              >
                SELECCIONAR
              </button>
            </div>

            <div className="pt-2 text-xs font-bold text-slate-700 space-y-0.5">
              <p className="text-slate-900 font-black">* SELECCIONE LA OPERACION A REALIZAR SI ES:</p>
              <p className="pl-2 font-semibold">• ALQUILER</p>
              <p className="pl-2 font-semibold">• VENTA</p>
              <p className="pl-2 font-semibold">• APARTADO</p>
              <p className="pl-2 font-semibold">• BONO</p>
            </div>
          </div>

          <div className="h-2 bg-[#004B87] w-full" />
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ALTA_DE_CLIENTES (IDÉNTICO A LA CAPTURA WINDEV [ALTA_DE_CLIENTES])
      ========================================================= */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-2xl bg-[#E8E8E8] p-4 border-2 border-slate-400 shadow-2xl">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="text-xs font-black text-slate-700 uppercase">ALTA DE CLIENTES</span>
          </div>

          <div className="text-center py-2">
            <h2 className="text-xl font-black tracking-wider text-slate-900 uppercase">
              INGRESA LOS DATOS DEL CLIENTE
            </h2>
          </div>

          <div className="rounded border-2 border-slate-400 bg-[#E8E8E8] p-4 shadow-inner space-y-3">
            {/* 1. ID CLIENTES */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">ID CLIENTES</span>
              <input
                type="text"
                disabled
                value={clienteForm.IDCLIENTES || 0}
                className="h-7 w-28 rounded border border-slate-400 bg-[#E0E0E0] px-2 text-right text-xs font-black text-slate-700"
              />
            </div>

            {/* 2. CEDULA + BOTÓN BUSCAR AZUL */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">CEDULA</span>
              <input
                type="number"
                placeholder="Cédula / Documento"
                value={clienteForm.CEDULA || ""}
                onChange={(e) =>
                  setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                className="h-7 w-48 rounded border border-slate-400 bg-white px-2.5 text-xs font-black text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                className="ml-2 h-7 rounded bg-[#004B87] px-5 text-xs font-black text-white shadow hover:bg-[#003366] active:scale-95 uppercase"
              >
                Buscar
              </button>
            </div>

            {/* 3. NOMBRE */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">NOMBRE</span>
              <input
                type="text"
                placeholder="Nombre completo"
                value={clienteForm.NOMBRE || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 4. DIRECCION */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">DIRECCION</span>
              <input
                type="text"
                placeholder="Dirección de residencia"
                value={clienteForm.DIRECCION || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 5. TELEFONO */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">TELEFONO</span>
              <input
                type="text"
                placeholder="Teléfono principal"
                value={clienteForm.TELEFONO || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                className="h-7 w-64 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 6. TELEFONO2 */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">TELEFONO2</span>
              <input
                type="text"
                placeholder="Teléfono secundario / celular"
                value={clienteForm.TELEFONO2 || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO2: e.target.value }))}
                className="h-7 w-64 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 7. EMPRESA */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">EMPRESA</span>
              <input
                type="text"
                placeholder="Nombre de la empresa"
                value={clienteForm.EMPRESA || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, EMPRESA: e.target.value }))}
                className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 8. DIRECCION EMPRESA */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-black text-slate-800 uppercase">DIRECCION EMPRESA</span>
              <input
                type="text"
                placeholder="Dirección de la empresa"
                value={clienteForm.DIRECCIONEMP || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCIONEMP: e.target.value }))}
                className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 9. NOTA */}
            <div className="flex items-start">
              <span className="w-36 pt-1 text-xs font-black text-slate-800 uppercase">NOTA</span>
              <textarea
                rows={3}
                placeholder="Observaciones o notas especiales del cliente..."
                value={clienteForm.NOTA || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, NOTA: e.target.value }))}
                className="flex-1 rounded border border-slate-400 bg-white p-2.5 text-xs font-bold text-slate-900 focus:outline-none resize-none"
              />
            </div>

            {/* 10. BOTONES DE ACCIÓN: GUARDAR ✔ / SALIR ✖ */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleGuardarClienteAlta}
                className="flex items-center gap-1.5 rounded bg-[#004B87] px-6 py-2 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase tracking-wide"
              >
                GUARDAR <Check className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setModalCliente(false)}
                className="flex items-center gap-1.5 rounded bg-[#004B87] px-6 py-2 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95 uppercase tracking-wide"
              >
                SALIR <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: BUSCAR CLIENTES
      ========================================================= */}
      <Dialog open={modalBuscarCli} onOpenChange={setModalBuscarCli}>
        <DialogContent className="max-w-lg bg-[#EDEDED] border border-slate-400">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="font-black text-slate-900 uppercase text-xs">
              Buscar Cliente
            </span>
          </div>
          <div className="space-y-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Escribe el nombre del cliente..."
                value={busqClienteInput}
                onChange={(e) => setBusqClienteInput(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const clis = await buscarClientesPorNombre(busqClienteInput);
                    setClientesEncontrados(clis);
                  }
                }}
                className="h-8 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold"
              />
              <button
                onClick={async () => {
                  const clis = await buscarClientesPorNombre(busqClienteInput);
                  setClientesEncontrados(clis);
                }}
                className="rounded bg-[#111111] px-4 text-xs font-black text-white uppercase"
              >
                Buscar
              </button>
            </div>

            <div className="max-h-60 overflow-auto rounded border border-slate-300 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-200 font-black sticky top-0 uppercase">
                  <tr>
                    <th className="p-2 border-b">Cédula</th>
                    <th className="p-2 border-b">Nombre</th>
                    <th className="p-2 border-b">Teléfono</th>
                    <th className="p-2 border-b text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesEncontrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 text-xs font-bold">
                        Ingresa un nombre para buscar.
                      </td>
                    </tr>
                  ) : (
                    clientesEncontrados.map((c) => (
                      <tr key={c.IDCLIENTES} className="border-b hover:bg-slate-50 font-medium">
                        <td className="p-2 font-mono font-black">{c.CEDULA}</td>
                        <td className="p-2 font-bold">{c.NOMBRE}</td>
                        <td className="p-2 font-semibold">{c.TELEFONO}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => {
                              setClienteForm(c);
                              setModalBuscarCli(false);
                              if (c.NOTA && c.NOTA.trim() !== "") {
                                setNotaAlertaVisible(true);
                                toast.warning(`⚠️ NOTA: ${c.NOTA}`);
                              } else {
                                toast.success(`Cliente cargado: ${c.NOMBRE}`);
                                setModalOperacionVisible(true);
                              }
                            }}
                            className="rounded bg-[#B80036] px-3 py-1 text-xs font-black text-white uppercase"
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
        <DialogContent className="max-w-sm bg-[#EDEDED] border border-slate-400">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="font-black text-red-700 uppercase text-xs">
              Registrar Gasto (Salida de Caja)
            </span>
          </div>
          <div className="space-y-2 text-xs font-bold pt-1">
            <div>
              <label className="block mb-0.5">Descripción del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Lavandería o transporte"
                value={gastoDesc}
                onChange={(e) => setGastoDesc(e.target.value)}
                className="h-7 w-full rounded border border-slate-400 bg-white px-2 font-bold"
              />
            </div>
            <div>
              <label className="block mb-0.5">Valor Salida ($)</label>
              <input
                type="number"
                placeholder="0"
                value={gastoMonto}
                onChange={(e) => setGastoMonto(e.target.value)}
                className="h-7 w-full rounded border border-slate-400 bg-white px-2 font-black text-red-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setModalGasto(false)}
              className="rounded bg-slate-300 px-3 py-1.5 text-xs font-bold"
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
              className="rounded bg-red-700 px-4 py-1.5 text-xs font-black text-white"
            >
              Guardar Gasto
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ENTRADA VESTIDO / DEVOLUCIÓN
      ========================================================= */}
      <Dialog open={modalDevolucion} onOpenChange={setModalDevolucion}>
        <DialogContent className="max-w-md bg-[#EDEDED] border border-slate-400">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="font-black text-emerald-800 uppercase text-xs">
              Entrada de Vestido & Devolución de Depósito
            </span>
          </div>
          <div className="space-y-2 text-xs font-bold pt-1">
            <div>
              <label className="block mb-0.5">N° Factura / Recibo de Alquiler</label>
              <input
                type="text"
                placeholder="Ej. ALQ-000124"
                value={devFactura}
                onChange={(e) => setDevFactura(e.target.value)}
                className="h-7 w-full rounded border border-slate-400 bg-white px-2.5 font-black text-slate-900"
              />
            </div>
            <div>
              <label className="block mb-0.5">Monto de Depósito a Devolver ($)</label>
              <input
                type="number"
                placeholder="0"
                value={devMonto || ""}
                onChange={(e) => setDevMonto(Number(e.target.value) || 0)}
                className="h-8 w-full rounded border border-slate-400 bg-white px-2.5 font-mono text-base font-black text-blue-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setModalDevolucion(false)}
              className="rounded bg-slate-300 px-3 py-1.5 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                if (!devFactura) {
                  toast.error("Ingresa el número de factura");
                  return;
                }
                await registrarDevolucionVestido({
                  numeroFactura: devFactura,
                  valorDepositoDevuelto: devMonto,
                });
                toast.success("Entrada de vestido procesada");
                setModalDevolucion(false);
                setDevFactura("");
                setDevMonto(0);
              }}
              className="rounded bg-emerald-700 px-4 py-1.5 text-xs font-black text-white"
            >
              Confirmar Devolución
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ENTREGA VESTIDO APARTADO (IDÉNTICO A LA CAPTURA WINDEV)
      ========================================================= */}
      <Dialog open={modalApartados} onOpenChange={setModalApartados}>
        <DialogContent className="w-[96vw] max-w-[1600px] h-[92vh] max-h-[92vh] bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-md flex flex-col">
          {/* BARRA DE TÍTULO SUPERIOR */}
          <div className="flex items-center justify-between px-3 py-1.5 bg-white border-b border-slate-300 select-none">
            <div className="flex items-center gap-1.5">
              <span className="text-amber-500 font-bold text-xs">❖</span>
              <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
                ENTREGA VESTIDO APARTADO
              </span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Minus className="h-3.5 w-3.5 cursor-pointer hover:text-slate-800" />
              <Square className="h-3 w-3 cursor-pointer hover:text-slate-800" />
              <button
                onClick={() => setModalApartados(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="p-4 flex-1 flex flex-col min-h-0 space-y-3 overflow-auto">
            {/* SECCIÓN SUPERIOR: FORMULARIO + BOTONES DE ACCIÓN + CALCULADORA */}
            <div className="flex items-start justify-between gap-4">
              {/* FORMULARIO DE CONSULTA DE FACTURA */}
              <div className="flex-1 rounded border-2 border-slate-400 bg-[#E8E8E8] p-3 shadow-inner space-y-2">
                {/* FILA 1: NUMEROFACT + BUSCAR + CLIENTE */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase">
                    NUMEROFACT
                  </span>
                  <div className="col-span-4 flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="G1 o ALQ-..."
                      value={apartadoBusqFactura}
                      onChange={(e) => setApartadoBusqFactura(e.target.value)}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") handleConsultarApartado();
                      }}
                      className="h-7 flex-1 rounded border border-slate-400 bg-white px-2.5 text-xs font-black text-slate-900 focus:outline-none shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={handleConsultarApartado}
                      className="h-7 rounded bg-[#B80036] px-3.5 text-xs font-black text-white shadow hover:bg-[#96002C] active:scale-95 uppercase tracking-wider"
                    >
                      BUSCAR
                    </button>
                  </div>

                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase text-right pr-2">
                    CLIENTE
                  </span>
                  <input
                    type="text"
                    disabled
                    value={apartadoFactura?.CCLIENTE || ""}
                    placeholder="Nombre del cliente"
                    className="col-span-4 h-7 rounded border border-slate-400 bg-white px-2.5 text-xs font-bold text-slate-900 shadow-inner"
                  />
                </div>

                {/* FILA 2: TOTALALQUILER + TOTAL DEPOSITO + TOTALVENTA+DEPOSITO */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase">
                    TOTALALQUILER
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALALQUILER || 0).toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-slate-900 shadow-inner"
                  />

                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase text-right pr-2">
                    TOTAL DEPOSITO
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALDEPOSITO || 0).toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-blue-900 shadow-inner"
                  />

                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase text-right pr-2">
                    TOTALVENTA+DEPOSITO
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.FTOTALVENTADEPOSITO || 0).toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-red-700 shadow-inner"
                  />
                </div>

                {/* FILA 3: PAGACON + SALDO ANTERIOR + SALDO ABONADO */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase">
                    PAGACON
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${(apartadoFactura?.PAGACON || 0).toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-slate-900 shadow-inner"
                  />

                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase text-right pr-2">
                    SALDO ANTERIOR
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${apartadoSaldoAnterior.toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-slate-900 shadow-inner"
                  />

                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase text-right pr-2">
                    SALDO ABONADO
                  </span>
                  <input
                    type="text"
                    disabled
                    value={`$ ${apartadoTotalAbonado.toLocaleString()}`}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-right font-mono text-xs font-black text-emerald-800 shadow-inner"
                  />
                </div>

                {/* FILA 4: FECHA_RECIBO */}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <span className="col-span-2 text-xs font-black text-slate-800 uppercase">
                    FECHA_RECIBO
                  </span>
                  <input
                    type="date"
                    disabled
                    value={apartadoFactura?.FECHA_RECIBO || fechaHoy}
                    className="col-span-2 h-7 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 shadow-inner"
                  />
                </div>
              </div>

              {/* BOTONES SUPERIORES EN MAGENTA + CALCULADORA */}
              <div className="flex items-center gap-4">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!apartadoFactura) {
                          toast.error("Busca primero una factura de apartado");
                          return;
                        }
                        setModalSubAbonar(true);
                      }}
                      className="h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow hover:bg-[#96002C] active:scale-95 uppercase tracking-wider"
                    >
                      ABONAR
                    </button>

                    <button
                      type="button"
                      onClick={() => setModalApartados(false)}
                      className="flex items-center gap-1 h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow hover:bg-[#96002C] active:scale-95 uppercase tracking-wider"
                    >
                      <X className="h-3.5 w-3.5" /> Cancelar
                    </button>

                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex items-center gap-1 h-8 rounded bg-[#B80036] px-4 text-xs font-black text-white shadow hover:bg-[#96002C] active:scale-95 uppercase tracking-wider"
                    >
                      Imprimir <Printer className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* BOTÓN SALIDA DE VESTIDO CUANDO EL SALDO ES CERO */}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!apartadoFactura) {
                        toast.error("Busca primero la factura");
                        return;
                      }
                      if (apartadoSaldoRestante > 0) {
                        toast.warning(`⚠️ No se puede entregar el vestido. Existe un saldo pendiente de $ ${apartadoSaldoRestante.toLocaleString()}`);
                        return;
                      }
                      const ok = await registrarSalidaVestidoApartado(apartadoFactura.NUMEROFACT);
                      if (ok) {
                        toast.success("¡Salida de vestido registrada con éxito! Prenda entregada.");
                      }
                    }}
                    className="h-9 rounded bg-[#8A0028] px-4 text-xs font-black text-white shadow-md hover:bg-black active:scale-95 uppercase tracking-wider"
                  >
                    SALIDA DE VESTIDO CUANDO EL SALDO ES CERO
                  </button>
                </div>

                {/* ÍCONO ILUSTRATIVO DE CALCULADORA ESTILO WINDEV */}
                <div className="flex items-center justify-center h-24 w-20 rounded-lg border-2 border-slate-400 bg-gradient-to-b from-slate-200 to-slate-300 shadow-md p-1.5 flex-col gap-1">
                  <div className="h-4 w-full bg-slate-400 rounded border border-slate-500 shadow-inner flex items-center justify-end px-1 font-mono text-[9px] font-black text-slate-900">
                    0.00
                  </div>
                  <div className="grid grid-cols-3 gap-1 w-full flex-1">
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-blue-500 rounded border border-blue-600 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-slate-100 rounded border border-slate-400 shadow-sm" />
                    <span className="bg-red-500 rounded border border-red-600 shadow-sm" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN CENTRAL: 2 TABLAS LADO A LADO (ABONOS CLIENTE Y ARTICULOS) */}
            <div className="grid grid-cols-12 gap-4 flex-1 min-h-0">
              {/* TABLA IZQUIERDA: ABONOS CLIENTE */}
              <div className="col-span-7 flex flex-col min-h-0">
                <div className="text-center py-1">
                  <h3 className="text-xl font-black tracking-widest text-[#E60000] uppercase font-sans">
                    ABONOS CLIENTE
                  </h3>
                </div>
                <div className="flex-1 overflow-auto rounded border-2 border-slate-400 bg-white shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#004B87] text-white font-black uppercase text-[11px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2 border-r border-slate-500">NUMERO_ABONO</th>
                        <th className="p-2 border-r border-slate-500">CLIENTE</th>
                        <th className="p-2 border-r border-slate-500">AFACTURA</th>
                        <th className="p-2 border-r border-slate-500 text-right">PAGOEFECTIVO</th>
                        <th className="p-2 border-r border-slate-500 text-right">PAGO TRANSFERENCIA</th>
                        <th className="p-2 border-r border-slate-500 text-center">FECHA</th>
                        <th className="p-2 text-right">TOTAL_ABONO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apartadoAbonos.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-16 text-center text-slate-400 text-xs font-bold">
                            No hay abonos registrados para esta factura.
                          </td>
                        </tr>
                      ) : (
                        apartadoAbonos.map((ab, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-slate-200 text-xs ${
                              idx % 2 === 0 ? "bg-white font-semibold" : "bg-[#D6E6F2] font-semibold"
                            }`}
                          >
                            <td className="p-2 font-mono font-bold border-r border-slate-200">
                              {ab.NUMEROABONO}
                            </td>
                            <td className="p-2 font-bold border-r border-slate-200">
                              {ab.ACLIENTE}
                            </td>
                            <td className="p-2 font-mono font-bold border-r border-slate-200">
                              {ab.AFACTURA}
                            </td>
                            <td className="p-2 text-right font-mono font-bold border-r border-slate-200">
                              ${Number(ab.PAGOEFECTIVO || 0).toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-mono font-bold border-r border-slate-200">
                              ${Number(ab.PAGOTRANFE || 0).toLocaleString()}
                            </td>
                            <td className="p-2 text-center font-bold border-r border-slate-200">
                              {ab.FECHAABONO}
                            </td>
                            <td className="p-2 text-right font-mono font-black text-emerald-800">
                              ${Number(ab.TOTAL_ABONO || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TABLA DERECHA: ARTICULOS */}
              <div className="col-span-5 flex flex-col min-h-0">
                <div className="text-center py-1">
                  <h3 className="text-xl font-black tracking-widest text-[#E60000] uppercase font-sans">
                    ARTICULOS
                  </h3>
                </div>
                <div className="flex-1 overflow-auto rounded border-2 border-slate-400 bg-white shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#004B87] text-white font-black uppercase text-[11px] tracking-wider sticky top-0">
                      <tr>
                        <th className="p-2 border-r border-slate-500">DESCRIPCION</th>
                        <th className="p-2 border-r border-slate-500 text-center w-20">CANTIDAD</th>
                        <th className="p-2 border-r border-slate-500 text-right w-24">VALOR</th>
                        <th className="p-2 text-right w-28">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apartadoItems.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-16 text-center text-slate-400 text-xs font-bold">
                            Sin artículos cargados.
                          </td>
                        </tr>
                      ) : (
                        apartadoItems.map((it, idx) => (
                          <tr
                            key={idx}
                            className={`border-b border-slate-200 text-xs ${
                              idx % 2 === 0 ? "bg-white font-semibold" : "bg-[#D6E6F2] font-semibold"
                            }`}
                          >
                            <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                              {it.DESCRIPCION}
                            </td>
                            <td className="p-2 text-center font-black border-r border-slate-200">
                              {it.CANTIDAD}
                            </td>
                            <td className="p-2 text-right font-mono font-bold border-r border-slate-200">
                              ${Number(it.VALOR || 0).toLocaleString()}
                            </td>
                            <td className="p-2 text-right font-mono font-black text-slate-900">
                              ${Number(it.TOTAL || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* SECCIÓN INFERIOR: SALDO RESTANTE (FONDO SALMÓN) */}
            <div className="flex items-center justify-start gap-4 pt-1">
              <span className="text-xl font-black tracking-wider text-[#E60000] uppercase font-sans">
                SALDO RESTANTE
              </span>
              <div className="h-14 w-80 rounded border-2 border-red-400 bg-[#FF9999] px-4 flex items-center justify-end font-mono text-3xl font-black text-slate-900 shadow-inner">
                {apartadoSaldoRestante.toLocaleString()}
              </div>
            </div>
          </div>

          {/* FRANJA AZUL INFERIOR */}
          <div className="h-3.5 bg-gradient-to-r from-[#003366] via-[#004B87] to-[#002244] w-full" />
        </DialogContent>
      </Dialog>

      {/* SUB-MODAL DE REGISTRO DE ABONO */}
      <Dialog open={modalSubAbonar} onOpenChange={setModalSubAbonar}>
        <DialogContent className="max-w-md bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl rounded-md overflow-hidden">
          <div className="bg-[#B80036] px-4 py-2 text-white flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider">
              REGISTRAR ABONO A FACTURA {apartadoFactura?.NUMEROFACT}
            </h3>
            <button onClick={() => setModalSubAbonar(false)} className="text-white hover:opacity-80">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 text-xs font-bold">
            <div>
              <label className="block text-slate-800 uppercase mb-0.5">PAGO EN EFECTIVO ($):</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={abonoPagoEfec}
                onChange={(e) => setAbonoPagoEfec(e.target.value)}
                className="h-8 w-full rounded border border-slate-400 bg-white px-2.5 text-right font-mono text-base font-black text-slate-900 shadow-inner"
              />
            </div>

            <div>
              <label className="block text-slate-800 uppercase mb-0.5">PAGO EN TRANSFERENCIA ($):</label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={abonoPagoTrans}
                onChange={(e) => setAbonoPagoTrans(e.target.value)}
                className="h-8 w-full rounded border border-slate-400 bg-white px-2.5 text-right font-mono text-base font-black text-slate-900 shadow-inner"
              />
            </div>

            <div className="rounded border border-slate-300 bg-white p-2 text-xs space-y-1">
              <div className="flex justify-between">
                <span>Saldo Anterior:</span>
                <span className="font-mono font-bold">${apartadoSaldoRestante.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-emerald-800 font-bold">
                <span>Total Abono Actual:</span>
                <span className="font-mono">${((parseFloat(abonoPagoEfec) || 0) + (parseFloat(abonoPagoTrans) || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t pt-1 font-black text-red-700">
                <span>Nuevo Saldo Restante:</span>
                <span className="font-mono">
                  ${Math.max(0, apartadoSaldoRestante - ((parseFloat(abonoPagoEfec) || 0) + (parseFloat(abonoPagoTrans) || 0))).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 p-3 bg-slate-200 border-t border-slate-300">
            <button
              type="button"
              onClick={() => setModalSubAbonar(false)}
              className="rounded bg-slate-300 px-3 py-1.5 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleGuardarAbono}
              className="rounded bg-[#B80036] px-5 py-1.5 text-xs font-black text-white uppercase shadow hover:bg-[#96002C]"
            >
              Confirmar Abono
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: COMPROBANTE DE ALQUILER
      ========================================================= */}
      <Dialog open={modalImprimir} onOpenChange={setModalImprimir}>
        <DialogContent className="max-w-md bg-white p-5 border-2 border-slate-800">
          <div className="font-mono text-xs text-slate-900">
            <div className="border-b border-dashed border-slate-400 pb-2 text-center">
              <h2 className="text-base font-black uppercase">LA CASA DEL DISFRAZ</h2>
              <p className="text-xs font-semibold">Elegance Rentals</p>
              <p className="text-[10px]">Para toda ocasión sin importar tu edad</p>
              <p className="mt-1.5 font-black text-sm">RECIBO N° {numeroRecibo}</p>
              <p className="text-[10px]">Fecha: {fechaHoy} · Cajero: {cajero}</p>
            </div>

            <div className="py-2 text-xs space-y-0.5 border-b border-dashed border-slate-400 font-semibold">
              <p><strong>CLIENTE:</strong> {clienteForm.NOMBRE?.toUpperCase() || "GENERAL"}</p>
              <p><strong>CÉDULA:</strong> {clienteForm.CEDULA || "N/A"}</p>
              <p><strong>TELÉFONO:</strong> {clienteForm.TELEFONO || "N/A"}</p>
              <p><strong>SALIDA:</strong> {fechaSalida} | <strong>ENTRADA:</strong> {fechaEntrada}</p>
            </div>

            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-black pb-1 text-xs">
                <span>ARTÍCULO</span>
                <span>VALOR</span>
              </div>
              {gridItems.map((it, i) => (
                <div key={i} className="flex justify-between py-0.5 text-xs font-bold">
                  <span>{it.cantidad}x {it.descripcion} ({it.talla})</span>
                  <span>${it.totalAlquiler.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="py-2 space-y-0.5 text-right text-xs font-bold">
              <p>Total Alquiler: ${totalAlquilerConDesc.toLocaleString()}</p>
              <p className="font-black text-blue-800">Total Depósito (Fianza): ${totalDeposito.toLocaleString()}</p>
              <p className="text-sm font-black border-t pt-1">
                TOTAL COBRADO: ${totalDepositoMasAlquiler.toLocaleString()}
              </p>
              <p className="text-emerald-700 font-black">Cambio / Vuelto: ${Math.max(0, cambioVSaldo).toLocaleString()}</p>
            </div>

            <p className="mt-2 text-center text-[10px] text-slate-500 italic font-semibold">
              Conservar este recibo para la devolución de la prenda y reintegro del depósito.
            </p>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={() => {
                window.print();
                setModalImprimir(false);
              }}
              className="rounded bg-black px-5 py-2 text-xs font-black text-white flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL ALERTA: ESTE CLIENTE TIENE SALDO PENDIENTE (EXACTO A WINDEV)
      ========================================================= */}
      <Dialog open={modalSaldoPendienteAlerta} onOpenChange={setModalSaldoPendienteAlerta}>
        <DialogContent className="max-w-sm bg-white p-0 border-2 border-slate-400 shadow-2xl rounded-sm overflow-hidden z-[99999]">
          {/* BARRA DE TÍTULO */}
          <div className="flex items-center justify-between px-3 py-1 bg-[#F0F0F0] border-b border-slate-300 select-none">
            <span className="text-xs font-semibold text-slate-800">
              ENTREGA VESTIDO APARTADO
            </span>
            <button
              type="button"
              onClick={() => setModalSaldoPendienteAlerta(false)}
              className="text-slate-500 hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* CONTENIDO DE LA ALERTA */}
          <div className="p-5 flex items-start gap-4 bg-white">
            {/* ÍCONO AZUL INFO ( i ) */}
            <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-[#0078D7] text-white shadow-sm">
              <span className="font-serif font-black text-2xl italic leading-none">i</span>
            </div>

            {/* MENSAJE */}
            <div className="space-y-2 pt-1 font-sans text-xs text-slate-800">
              <p className="font-bold uppercase tracking-wide">
                ESTE CLIENTE TIENE SALDO PENDIENTE
              </p>
              <p className="font-black text-sm text-slate-900 font-mono">
                {montoAlertaSaldo.toLocaleString()}
              </p>
            </div>
          </div>

          {/* BOTÓN ACEPTAR */}
          <div className="flex justify-center p-3 bg-[#F0F0F0] border-t border-slate-200">
            <button
              type="button"
              onClick={() => setModalSaldoPendienteAlerta(false)}
              className="min-w-[90px] rounded border border-[#0078D7] bg-white px-5 py-1 text-xs font-bold text-slate-900 hover:bg-[#E5F1FB] active:bg-[#CCE4F7] shadow-sm transition-all focus:outline-none focus:ring-1 focus:ring-[#0078D7]"
            >
              Aceptar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
