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
  Sparkles,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Articulo, Cliente, ItemAlquilerCarrito, Factura, CampoFactura } from "@/types/database.types";
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
} from "@/services/posService";
import { LogoCasaDelDisfraz } from "./LogoCasaDelDisfraz";

const ARTICULOS_INICIALES: Articulo[] = [
  { IDARTICULO: 1, DESCRIPCION: "TRAJE SMOKING NEGRO SLIM FIT COMPLETO", TALLA: "38R", STOCK: 5, VALOR: 120000, CODBARRAS: "7701001", VALORDEPOSITO: 50000 },
  { IDARTICULO: 2, DESCRIPCION: "TRAJE NOVIO AZUL NOCHE ITALIANO", TALLA: "40R", STOCK: 3, VALOR: 150000, CODBARRAS: "7701002", VALORDEPOSITO: 60000 },
  { IDARTICULO: 3, DESCRIPCION: "TRAJE QUINCEAÑERO GRIS PLATA C/CHALECO", TALLA: "36R", STOCK: 4, VALOR: 95000, CODBARRAS: "7701003", VALORDEPOSITO: 40000 },
  { IDARTICULO: 4, DESCRIPCION: "DISFRAZ ÉPOCA MEDIEVAL CABALLERO REY", TALLA: "L", STOCK: 6, VALOR: 85000, CODBARRAS: "7701004", VALORDEPOSITO: 35000 },
  { IDARTICULO: 5, DESCRIPCION: "VESTIDO DE GALA NOCHE SIRENA ROJO", TALLA: "M", STOCK: 2, VALOR: 140000, CODBARRAS: "7701005", VALORDEPOSITO: 60000 },
  { IDARTICULO: 6, DESCRIPCION: "ZAPATOS DE CHAROL NEGRO FORMAL", TALLA: "40", STOCK: 8, VALOR: 40000, CODBARRAS: "7701006", VALORDEPOSITO: 20000 },
  { IDARTICULO: 7, DESCRIPCION: "CHALECO DE SEDA CHAMPAGNE + CORBATÍN", TALLA: "M", STOCK: 10, VALOR: 30000, CODBARRAS: "7701007", VALORDEPOSITO: 15000 },
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
    TALLA: "M",
    STOCK: 1,
    VALOR: 0,
    VALORDEPOSITO: 0,
    CODBARRAS: "",
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
  const [descuentoAlquiler, setDescuentoAlquiler] = useState<string>("");

  // Modal de Cobro al presionar [PAGAR]
  const [modalCobroDetalle, setModalCobroDetalle] = useState(false);
  const [cobroEfectivo, setCobroEfectivo] = useState<string>("");
  const [cobroTransferencia, setCobroTransferencia] = useState<string>("");

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
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [devFactura, setDevFactura] = useState("");
  const [devMonto, setDevMonto] = useState<number>(0);

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

  // Cálculos en tiempo real
  const totalDeposito = useMemo(() => {
    return gridItems.reduce((acc, it) => acc + it.totalDeposito, 0);
  }, [gridItems]);

  const totalAlquiler = useMemo(() => {
    return gridItems.reduce((acc, it) => acc + it.totalAlquiler, 0);
  }, [gridItems]);

  const descuentoNum = parseFloat(descuentoAlquiler) || 0;
  const totalAlquilerConDesc = Math.max(0, totalAlquiler - descuentoNum);
  const totalDepositoMasAlquiler = totalDeposito + totalAlquilerConDesc;

  const efecNum = parseFloat(cobroEfectivo) || 0;
  const transNum = parseFloat(cobroTransferencia) || 0;
  const totalPagado = efecNum + transNum;
  const cambioVuelto = totalPagado > 0 ? totalPagado - totalDepositoMasAlquiler : 0;

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
    const randomBarcode = String(Math.floor(1000 + Math.random() * 9000));
    setArticuloForm({
      IDARTICULO: 0,
      DESCRIPCION: "",
      TALLA: "M",
      STOCK: 1,
      VALOR: 0,
      VALORDEPOSITO: 0,
      CODBARRAS: randomBarcode,
    });
    setModalArticuloAlta(true);
  }

  // Abrir Modal de Editar Artículo
  function abrirEditarArticulo(art: Articulo) {
    setArticuloForm({ ...art });
    setModalArticuloAlta(true);
  }

  // Guardar Artículo en BD
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
        STOCK: Number(articuloForm.STOCK) || 1,
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
          TALLA: articuloForm.TALLA || "M",
          STOCK: Number(articuloForm.STOCK) || 1,
          VALOR: Number(articuloForm.VALOR) || 0,
          VALORDEPOSITO: Number(articuloForm.VALORDEPOSITO) || 0,
          CODBARRAS: articuloForm.CODBARRAS || "1000",
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
    setDescuentoAlquiler("");
    setCobroEfectivo("");
    setCobroTransferencia("");
    setFilaSeleccionada(null);
    setNotaAlertaVisible(false);
    setModalOperacionVisible(false);
    setEstadoTraje("EN ALQUILER");
    toast.info("Formulario reiniciado");
    articuloInputRef.current?.focus();
  }

  // Abrir Modal de Cobro al presionar PAGAR
  function handleIniciarCobro() {
    if (!clienteForm.NOMBRE || !clienteForm.CEDULA) {
      toast.error("Ingresa la CÉDULA y el NOMBRE del cliente");
      return;
    }
    if (gridItems.length === 0) {
      toast.error("Debes agregar artículos al alquiler");
      return;
    }
    setCobroEfectivo(String(totalDepositoMasAlquiler));
    setModalCobroDetalle(true);
  }

  // Confirmar y Procesar Factura
  async function handleConfirmarPagoFinal() {
    try {
      const factura: Omit<Factura, "IDFACTURA"> = {
        NUMEROFACT: numeroRecibo,
        FECHASALIDA: fechaSalida,
        FECHAENTRADA: fechaEntrada,
        FTOTALDEPOSITO: totalDeposito,
        FTOTALVENTADEPOSITO: totalDepositoMasAlquiler,
        FTOTALALQUILER: totalAlquilerConDesc,
        FORMAPAGO: efecNum > 0 && transNum > 0 ? "MIXTO" : transNum > 0 ? "TRANSFERENCIA" : "EFECTIVO",
        MODO: operacionSeleccionada,
        VENDEDOR: cajero,
        CCLIENTE: clienteForm.NOMBRE || "GENERAL",
        CCEDULA: String(clienteForm.CEDULA || 0),
        CDIRECCION: clienteForm.DIRECCION,
        CTELEFONO: clienteForm.TELEFONO,
        CTELEFONO1: clienteForm.TELEFONO2,
        CEMPRESA: clienteForm.EMPRESA,
        PAGACON: totalPagado,
        PAGOCONEFECTIVO: efecNum,
        PAGOCONTRANFERENCIA: transNum,
        CAMBIOS: Math.max(0, cambioVuelto),
        DESCUENTO: descuentoNum,
        ESTADOCLIENTE: estadoTraje,
        TOTAL_SALDO: cambioVuelto < 0 ? Math.abs(cambioVuelto) : 0,
        FECHA_RECIBO: fechaHoy,
      };

      const campos: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[] = gridItems.map((g) => ({
        DESCRIPCION: `${g.descripcion} (TALLA: ${g.talla})`,
        CANTIDAD: g.cantidad,
        VALOR: g.valorAlquiler,
        TOTAL: g.totalGeneral,
        BARRAS: g.codigoBarras || "0",
        NUMEROFACT: numeroRecibo,
        VALORDEPOSITO: g.valorDeposito,
        TOTALALQUILER: g.totalAlquiler,
        TOTALDEPOSITO: g.totalDeposito,
      }));

      await guardarCliente(clienteForm);
      await registrarAlquilerFactura(factura, campos);
      setModalCobroDetalle(false);
      setModalImprimir(true);
      toast.success("¡Alquiler procesado exitosamente!");
    } catch {
      setModalCobroDetalle(false);
      setModalImprimir(true);
      toast.success("Alquiler procesado (Modo local)");
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
                <Package className="h-3.5 w-3.5" /> CATÁLOGO
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

        {/* BOTÓN PAGAR */}
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
          MODAL: VENTANA DE PAGO / COBRO Y LIQUIDACIÓN AL PRESIONAR [PAGAR]
      ========================================================================= */}
      <Dialog open={modalCobroDetalle} onOpenChange={setModalCobroDetalle}>
        <DialogContent className="max-w-md bg-[#EDEDED] p-0 border-2 border-slate-400 shadow-2xl overflow-hidden rounded-lg">
          <div className="bg-[#002D62] px-4 py-2.5 text-white flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider">
              PAGAR / LIQUIDAR ALQUILER
            </h3>
            <span className="font-mono text-xs text-yellow-300 font-bold">
              RECIBO: {numeroRecibo}
            </span>
          </div>

          <div className="p-5 space-y-3 font-sans">
            {/* RESUMEN DEL COBRO */}
            <div className="rounded border border-slate-300 bg-white p-3 shadow-inner space-y-1 text-xs">
              <div className="flex justify-between text-slate-700">
                <span>Cliente:</span>
                <strong className="text-slate-900">{clienteForm.NOMBRE || "GENERAL"}</strong>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Total Alquiler:</span>
                <span className="font-mono font-bold">${totalAlquilerConDesc.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Total Depósito (Garantía):</span>
                <span className="font-mono font-bold text-blue-800">${totalDeposito.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t pt-1 text-slate-900">
                <span>TOTAL A COBRAR:</span>
                <span className="font-mono text-base text-red-700">${totalDepositoMasAlquiler.toLocaleString()}</span>
              </div>
            </div>

            {/* FORMAS DE PAGO */}
            <div className="space-y-2 pt-1">
              <div>
                <label className="text-xs font-black uppercase text-slate-800 block mb-0.5">
                  PAGA CON EFECTIVO:
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cobroEfectivo}
                  onChange={(e) => setCobroEfectivo(e.target.value)}
                  className="h-8 w-full rounded border border-slate-400 bg-white px-3 text-right font-mono text-base font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase text-slate-800 block mb-0.5">
                  PAGA CON TRANSFERENCIA:
                </label>
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cobroTransferencia}
                  onChange={(e) => setCobroTransferencia(e.target.value)}
                  className="h-8 w-full rounded border border-slate-400 bg-white px-3 text-right font-mono text-base font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-600"
                />
              </div>

              {/* SU CAMBIO ES */}
              <div className="rounded border-2 border-slate-400 bg-white p-2 text-center shadow-inner mt-2">
                <span className="text-[11px] font-black uppercase text-slate-600 block">
                  SU CAMBIO / VUELTO ES:
                </span>
                <span className="font-mono text-xl font-black text-emerald-700 block">
                  {totalPagado > 0 ? `$ ${cambioVuelto.toLocaleString()}` : "$ 0"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 p-3 bg-slate-200 border-t border-slate-300">
            <button
              type="button"
              onClick={() => setModalCobroDetalle(false)}
              className="rounded bg-slate-300 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-400"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmarPagoFinal}
              className="rounded bg-[#B80036] px-6 py-2 text-xs font-black uppercase text-white shadow hover:bg-[#96002C] active:scale-95 flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> CONFIRMAR E IMPRIMIR
            </button>
          </div>
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

      {/* =========================================================================
          MODAL: ALTA_DE_ARTICULOS (MODERNO, ELEGANTE Y FIEL A WINDEV)
      ========================================================================= */}
      <Dialog open={modalArticuloAlta} onOpenChange={setModalArticuloAlta}>
        <DialogContent className="max-w-xl bg-[#F4F6F9] p-0 border border-slate-300 shadow-2xl overflow-hidden rounded-xl">
          <div className="bg-gradient-to-r from-[#002D62] via-[#004B87] to-[#0A192F] px-5 py-3 text-white flex items-center justify-between shadow">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 backdrop-blur text-yellow-300">
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-black tracking-wider uppercase">
                  {articuloForm.IDARTICULO ? "MODIFICAR ARTÍCULO" : "ALTA DE ARTÍCULOS"}
                </h2>
                <p className="text-xs text-blue-200">
                  Sistema de Inventario y Control de Prendas
                </p>
              </div>
            </div>
            <span className="rounded-full bg-blue-900/60 px-3 py-0.5 text-xs font-mono font-bold text-cyan-300 border border-cyan-500/30">
              ID: {articuloForm.IDARTICULO || "NUEVO"}
            </span>
          </div>

          <form onSubmit={handleGuardarArticuloAlta} className="p-5 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-black uppercase text-slate-800 tracking-wide flex items-center gap-1">
                    <Package className="h-4 w-4 text-blue-600" /> ARTÍCULO / DESCRIPCIÓN *
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">Nombre, accesorios y piezas</span>
                </div>
                <textarea
                  rows={3}
                  required
                  placeholder="Ej. TRAJE DE SALSANIÑO: CAMISA, PANTALÓN, CINTURÓN"
                  value={articuloForm.DESCRIPCION || ""}
                  onChange={(e) => setArticuloForm((p) => ({ ...p, DESCRIPCION: e.target.value.toUpperCase() }))}
                  className="w-full rounded-md border border-slate-300 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-900 focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 focus:outline-none uppercase transition-all shadow-inner resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-lg bg-emerald-50/60 border border-emerald-200 p-2.5 shadow-sm">
                  <label className="text-xs font-black uppercase text-emerald-900 block mb-1">
                    VALOR ALQUILER ($) *
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-xs font-black text-emerald-700">$</span>
                    <input
                      type="number"
                      min={0}
                      required
                      placeholder="0"
                      value={articuloForm.VALOR || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALOR: Number(e.target.value) || 0 }))}
                      className="h-8 w-full rounded border border-emerald-300 bg-white pl-6 pr-2 text-right font-mono text-sm font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
                </div>

                <div className="rounded-lg bg-blue-50/60 border border-blue-200 p-2.5 shadow-sm">
                  <label className="text-xs font-black uppercase text-blue-900 block mb-1">
                    VALOR DEPÓSITO / FIANZA ($)
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-xs font-black text-blue-700">$</span>
                    <input
                      type="number"
                      min={0}
                      placeholder="0"
                      value={articuloForm.VALORDEPOSITO || ""}
                      onChange={(e) => setArticuloForm((p) => ({ ...p, VALORDEPOSITO: Number(e.target.value) || 0 }))}
                      className="h-8 w-full rounded border border-blue-300 bg-white pl-6 pr-2 text-right font-mono text-sm font-black text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                    TALLA
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 38R, M, L"
                    value={articuloForm.TALLA || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, TALLA: e.target.value.toUpperCase() }))}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center text-xs font-black uppercase text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-700 block mb-1">
                    STOCK / CANTIDAD
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={articuloForm.STOCK ?? 1}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, STOCK: Math.max(0, parseInt(e.target.value) || 0) }))}
                    className="h-8 w-full rounded border border-slate-300 bg-white text-center text-xs font-black text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-black uppercase text-slate-700">
                      BARRAS
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setArticuloForm((p) => ({ ...p, CODBARRAS: String(Math.floor(1000 + Math.random() * 9000)) }))
                      }
                      title="Generar código aleatorio"
                      className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5 font-bold"
                    >
                      <Barcode className="h-3 w-3" /> Auto
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="1538"
                    value={articuloForm.CODBARRAS || ""}
                    onChange={(e) => setArticuloForm((p) => ({ ...p, CODBARRAS: e.target.value }))}
                    className="h-8 w-full rounded border border-slate-300 bg-white px-2 text-center font-mono text-xs font-black text-slate-800 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalArticuloAlta(false)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-100 active:scale-95 transition-all"
              >
                SALIR <X className="h-4 w-4 text-slate-500" />
              </button>

              <button
                type="submit"
                className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[#003366] to-[#005599] px-7 py-2 text-xs font-black text-white shadow-md hover:from-[#002244] hover:to-[#004488] active:scale-95 transition-all"
              >
                GUARDAR <Check className="h-4 w-4 text-emerald-300" />
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: ARCHIVO ARTICULO / CATÁLOGO COMPLETO
      ========================================================================= */}
      <Dialog open={modalArchivoArticulo} onOpenChange={setModalArchivoArticulo}>
        <DialogContent className="max-w-4xl bg-[#F8FAFC] p-4 border border-slate-300 shadow-2xl rounded-xl">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-700" />
              <h2 className="text-base font-black tracking-wide text-slate-900 uppercase">
                ARCHIVO ARTÍCULO — CATÁLOGO E INVENTARIO
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={abrirCrearArticulo}
                className="flex items-center gap-1 rounded bg-[#004B87] px-3.5 py-1.5 text-xs font-black text-white shadow hover:bg-[#003366]"
              >
                <Plus className="h-4 w-4" /> NUEVO ARTÍCULO
              </button>
              <button
                onClick={cargarArticulos}
                title="Refrescar catálogo"
                className="rounded bg-slate-200 p-1.5 text-slate-700 hover:bg-slate-300"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="py-2 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar por nombre, descripción, talla o código de barras..."
                value={busqArticuloCatalogo}
                onChange={(e) => setBusqArticuloCatalogo(e.target.value)}
                className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-xs font-bold focus:outline-none focus:border-blue-600"
              />
            </div>
            <span className="text-xs text-slate-600 font-black whitespace-nowrap">
              {articulosCatalogoFiltrados.length} artículos
            </span>
          </div>

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-300 bg-white shadow-inner">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-[#0A192F] text-white font-black sticky top-0 uppercase text-xs tracking-wider">
                <tr>
                  <th className="p-2.5 border-r border-slate-700 w-20 text-center">ID / CÓD</th>
                  <th className="p-2.5 border-r border-slate-700">DESCRIPCIÓN DEL ARTÍCULO</th>
                  <th className="p-2.5 border-r border-slate-700 text-center w-16">TALLA</th>
                  <th className="p-2.5 border-r border-slate-700 text-center w-16">STOCK</th>
                  <th className="p-2.5 border-r border-slate-700 text-right w-28">VALOR ALQUILER</th>
                  <th className="p-2.5 border-r border-slate-700 text-right w-28">VALOR DEPÓSITO</th>
                  <th className="p-2.5 text-center w-24">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {articulosCatalogoFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs font-semibold">
                      No se encontraron artículos con ese criterio de búsqueda.
                    </td>
                  </tr>
                ) : (
                  articulosCatalogoFiltrados.map((art, idx) => (
                    <tr
                      key={art.IDARTICULO}
                      className={`border-b border-slate-200 transition-colors ${
                        idx % 2 === 0 ? "bg-white hover:bg-blue-50/40" : "bg-slate-50/80 hover:bg-blue-50/40"
                      }`}
                    >
                      <td className="p-2 font-mono text-xs text-center font-black text-slate-600 border-r border-slate-200">
                        {art.CODBARRAS || `#${art.IDARTICULO}`}
                      </td>
                      <td className="p-2 font-bold text-slate-900 border-r border-slate-200">
                        {art.DESCRIPCION}
                      </td>
                      <td className="p-2 text-center font-black text-slate-700 border-r border-slate-200">
                        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-black">
                          {art.TALLA || "U"}
                        </span>
                      </td>
                      <td className="p-2 text-center font-bold border-r border-slate-200">
                        <span
                          className={`rounded px-2 py-0.5 text-xs font-black ${
                            (art.STOCK || 0) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {art.STOCK}
                        </span>
                      </td>
                      <td className="p-2 text-right font-mono font-black text-slate-900 border-r border-slate-200">
                        ${Number(art.VALOR).toLocaleString()}
                      </td>
                      <td className="p-2 text-right font-mono font-black text-blue-800 border-r border-slate-200">
                        ${Number(art.VALORDEPOSITO).toLocaleString()}
                      </td>
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => abrirEditarArticulo(art)}
                            title="Modificar"
                            className="rounded p-1 text-blue-600 hover:bg-blue-100 transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarArticuloCatalogo(art.IDARTICULO)}
                            title="Eliminar"
                            className="rounded p-1 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3">
            <button
              onClick={() => setModalArchivoArticulo(false)}
              className="rounded bg-slate-800 px-5 py-2 text-xs font-black text-white hover:bg-black"
            >
              Cerrar Catálogo
            </button>
          </div>
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
          MODAL: APARTADOS (RESERVAS ACTIVAS)
      ========================================================= */}
      <Dialog open={modalApartados} onOpenChange={setModalApartados}>
        <DialogContent className="max-w-md bg-[#EDEDED] border border-slate-400">
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="font-black text-amber-800 uppercase text-xs">
              Trajes Apartados / Reservas
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono pt-1">
            <div className="rounded border border-slate-300 bg-white p-2.5">
              <div className="flex justify-between border-b pb-1 font-black">
                <span>RECIBO</span>
                <span>CLIENTE</span>
                <span>FECHAS</span>
                <span>TOTAL</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-slate-800 font-bold">
                <span>ALQ-000120</span>
                <span>JUAN PÉREZ</span>
                <span>03/09 - 06/09</span>
                <span className="font-black text-emerald-700">$170.000</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-800 font-bold">
                <span>ALQ-000122</span>
                <span>MARÍA RODRÍGUEZ</span>
                <span>04/09 - 07/09</span>
                <span className="font-black text-emerald-700">$200.000</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setModalApartados(false)}
              className="rounded bg-slate-800 px-4 py-1.5 text-xs font-black text-white"
            >
              Cerrar
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
              <p className="text-emerald-700 font-black">Cambio / Vuelto: ${Math.max(0, cambioVuelto).toLocaleString()}</p>
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
    </div>
  );
}
