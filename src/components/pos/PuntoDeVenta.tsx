import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Trash2,
  X,
  Printer,
  ChevronDown,
  Check,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Articulo, Cliente, ItemAlquilerCarrito, Factura, CampoFactura } from "@/types/database.types";
import {
  buscarClientePorCedula,
  buscarClientesPorNombre,
  guardarCliente,
  listarArticulos,
  generarNumeroFactura,
  registrarAlquilerFactura,
  registrarDevolucionVestido,
  registrarGasto,
} from "@/services/posService";

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
  const [estadoTraje, setEstadoTraje] = useState("DISPONIBLE");

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

  // Autocomplete / Combobox de Artículo con Filtro en Vivo y Teclado
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_INICIALES);
  const [articuloTexto, setArticuloTexto] = useState<string>("");
  const [articuloSeleccionado, setArticuloSeleccionado] = useState<Articulo | null>(null);
  const [mostrarDropdownArt, setMostrarDropdownArt] = useState<boolean>(false);
  const [sugerenciaIndex, setSugerenciaIndex] = useState<number>(0);

  // Cantidad y Refs para Navegación por Teclado
  const [cantidad, setCantidad] = useState<number>(1);
  const articuloInputRef = useRef<HTMLInputElement>(null);
  const cantidadInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Grid / Tabla de Alquiler
  const [gridItems, setGridItems] = useState<ItemAlquilerCarrito[]>([]);
  const [filaSeleccionada, setFilaSeleccionada] = useState<number | null>(null);

  // Panel de Cobro Lateral Derecho (Cyan)
  const [pagaEfectivo, setPagaEfectivo] = useState<string>("");
  const [pagaTransferencia, setPagaTransferencia] = useState<string>("");
  const [descuentoAlquiler, setDescuentoAlquiler] = useState<string>("");

  // Modales
  const [modalCliente, setModalCliente] = useState(false);
  const [modalBuscarCli, setModalBuscarCli] = useState(false);
  const [modalGasto, setModalGasto] = useState(false);
  const [modalDevolucion, setModalDevolucion] = useState(false);
  const [modalApartados, setModalApartados] = useState(false);
  const [modalImprimir, setModalImprimir] = useState(false);

  // Formulario de búsqueda / gastos / devoluciones
  const [busqClienteInput, setBusqClienteInput] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [devFactura, setDevFactura] = useState("");
  const [devMonto, setDevMonto] = useState<number>(0);

  useEffect(() => {
    generarNumeroFactura().then((num) => setNumeroRecibo(num));
    listarArticulos().then((res) => {
      if (res && res.length > 0) setArticulos(res);
    });
  }, []);

  // Filtrado de Artículos en Tiempo Real
  const articulosFiltrados = useMemo(() => {
    if (!articuloTexto.trim()) return articulos;
    const query = articuloTexto.toLowerCase().trim();
    return articulos.filter(
      (a) =>
        a.DESCRIPCION.toLowerCase().includes(query) ||
        a.CODBARRAS.toLowerCase().includes(query) ||
        a.TALLA.toLowerCase().includes(query)
    );
  }, [articulos, articuloTexto]);

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

  const efecNum = parseFloat(pagaEfectivo) || 0;
  const transNum = parseFloat(pagaTransferencia) || 0;
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
      toast.success(`Cliente encontrado: ${cli.NOMBRE}`);
      articuloInputRef.current?.focus();
    } else {
      toast.info("Cédula no encontrada. Puedes registrar sus datos.");
      setModalCliente(true);
    }
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
      articuloInputRef.current?.focus();
    } catch {
      toast.success("Cliente asignado localmente");
      setModalCliente(false);
      articuloInputRef.current?.focus();
    }
  }

  // Selección de Artículo desde el buscador / dropdown
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

  // Manejo de Teclado en CANTIDAD (Enter para bajar a la tabla)
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
    setPagaEfectivo("");
    setPagaTransferencia("");
    setDescuentoAlquiler("");
    setFilaSeleccionada(null);
    toast.info("Formulario reiniciado");
    articuloInputRef.current?.focus();
  }

  // Confirmar y Pagar
  async function handlePagar() {
    if (!clienteForm.NOMBRE || !clienteForm.CEDULA) {
      toast.error("Ingresa la CÉDULA y el NOMBRE del cliente");
      return;
    }
    if (gridItems.length === 0) {
      toast.error("Debes agregar artículos al alquiler");
      return;
    }

    try {
      const factura: Omit<Factura, "IDFACTURA"> = {
        NUMEROFACT: numeroRecibo,
        FECHASALIDA: fechaSalida,
        FECHAENTRADA: fechaEntrada,
        FTOTALDEPOSITO: totalDeposito,
        FTOTALVENTADEPOSITO: totalDepositoMasAlquiler,
        FTOTALALQUILER: totalAlquilerConDesc,
        FORMAPAGO: efecNum > 0 && transNum > 0 ? "MIXTO" : transNum > 0 ? "TRANSFERENCIA" : "EFECTIVO",
        MODO: "ALQUILER",
        VENDEDOR: cajero,
        CCLIENTE: clienteForm.NOMBRE,
        CCEDULA: String(clienteForm.CEDULA),
        CDIRECCION: clienteForm.DIRECCION,
        CTELEFONO: clienteForm.TELEFONO,
        CTELEFONO1: clienteForm.TELEFONO2,
        CEMPRESA: clienteForm.EMPRESA,
        PAGACON: totalPagado,
        PAGOCONEFECTIVO: efecNum,
        PAGOCONTRANFERENCIA: transNum,
        CAMBIOS: Math.max(0, cambioVuelto),
        DESCUENTO: descuentoNum,
        ESTADOCLIENTE: "ALQUILADO",
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
      setModalImprimir(true);
      toast.success("¡Alquiler procesado exitosamente!");
    } catch {
      setModalImprimir(true);
      toast.success("Alquiler procesado (Modo local)");
    }
  }

  return (
    <div className="flex h-screen w-screen flex-col bg-[#EDEDED] font-sans text-slate-900 select-none overflow-hidden p-1.5">
      {/* =========================================================================
          1. ENCABEZADO SUPERIOR: TÍTULO "PUNTO DE VENTA" Y LOGO "La Casa Del Disfraz"
      ========================================================================= */}
      <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600">ALQUILER</span>
        </div>

        <div className="text-center">
          <h1 className="text-2xl font-black tracking-wider text-[#E60000] uppercase font-sans leading-none">
            PUNTO DE VENTA
          </h1>
        </div>

        <div className="flex flex-col items-center text-center">
          <div className="flex items-center gap-1 leading-none">
            <span className="text-sm font-black tracking-tight text-[#1A2B49]">La</span>
            <span className="rounded bg-red-600 px-1 py-0.5 text-xs font-black text-yellow-300 uppercase shadow-sm">
              Casa
            </span>
            <span className="text-xs font-black italic text-[#8B008B]">Del</span>
            <span className="text-sm font-black text-amber-500 uppercase">Disfraz</span>
          </div>
          <span className="text-[9px] font-semibold text-slate-500 italic leading-none mt-0.5">
            Para toda ocasión sin importar tu edad
          </span>
        </div>
      </div>

      {/* =========================================================================
          2. CUERPO PRINCIPAL: FORMULARIO + BOTONES + TABLA + PANEL CYAN
      ========================================================================= */}
      <div className="flex flex-1 pt-1.5 gap-2 overflow-hidden min-h-0">
        {/* LADO IZQUIERDO: FORMULARIO + BOTONES DE ACCIÓN + GRID */}
        <div className="flex flex-1 flex-col gap-1 overflow-hidden min-h-0">
          {/* BLOQUE DE CAMPOS DE CABECERA */}
          <div className="rounded border border-slate-300 bg-[#EDEDED] px-2 py-1 shadow-inner">
            <div className="grid grid-cols-12 gap-x-2 gap-y-1 text-xs">
              {/* FILA 1 */}
              <div className="col-span-3 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">ESTADO</span>
                <select
                  value={estadoCli}
                  onChange={(e) => setEstadoCli(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-medium focus:outline-none"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              <div className="col-span-5 flex items-center gap-1">
                <span className="w-14 font-bold text-slate-800 text-[10px] uppercase">CEDULA</span>
                <input
                  type="text"
                  placeholder="Entrada obligatoria"
                  value={clienteForm.CEDULA || ""}
                  onChange={(e) =>
                    setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta()}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1">
                <span className="w-20 font-bold text-slate-800 text-[10px] uppercase">FECHA SALIDA</span>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-medium focus:outline-none"
                />
              </div>

              {/* FILA 2 */}
              <div className="col-span-3 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">FECHA</span>
                <input
                  type="date"
                  value={fechaHoy}
                  onChange={(e) => setFechaHoy(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-medium focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1">
                <span className="w-14 font-bold text-slate-800 text-[10px] uppercase">NOMBRE</span>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={clienteForm.NOMBRE || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] font-medium placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1">
                <span className="w-20 font-bold text-slate-800 text-[10px] uppercase">FECHA ENTRADA</span>
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={(e) => setFechaEntrada(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-medium focus:outline-none"
                />
              </div>

              {/* FILA 3 */}
              <div className="col-span-3 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">N.RECIBO</span>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-bold text-red-700 focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">DIRECCION</span>
                <input
                  type="text"
                  placeholder="Direccion"
                  value={clienteForm.DIRECCION || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="col-span-4 flex items-center gap-1">
                <span className="w-20 font-bold text-slate-800 text-[10px] uppercase">ESTADO TRAJE</span>
                <select
                  value={estadoTraje}
                  onChange={(e) => setEstadoTraje(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[10px] font-medium focus:outline-none"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="ALQUILADO">ALQUILADO</option>
                  <option value="LAVANDERIA">LAVANDERÍA</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                </select>
              </div>

              {/* FILA 4 */}
              <div className="col-span-3 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">CAJERO</span>
                <input
                  type="text"
                  value={cajero}
                  onChange={(e) => setCajero(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1 text-[8.5px] font-bold uppercase text-slate-700 focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-1">
                <span className="w-14 font-semibold text-slate-700 text-[10px] uppercase">TELEFONO</span>
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={clienteForm.TELEFONO || ""}
                  onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] placeholder:text-slate-400 focus:outline-none"
                />
                {/* BOTÓN "Mod" ROJO QUE ABRE ALTA_DE_CLIENTES */}
                <button
                  type="button"
                  onClick={() => setModalCliente(true)}
                  className="h-5 rounded-full bg-[#B82E1F] px-2 text-[9px] font-bold text-white shadow-sm hover:bg-red-800 active:scale-95"
                >
                  Mod
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              BARRA DE LOS 9 BOTONES PRINCIPALES EN ROJO/MAGENTA (EXACTO A WINDEV)
          ========================================================================= */}
          <div className="flex items-center gap-1 overflow-x-auto py-0.5">
            <button
              onClick={() => setModalCliente(true)}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              NUEVO CLIENTE
            </button>

            <button
              onClick={() => setModalCliente(true)}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              MODIFICAR
            </button>

            <button
              onClick={() => setModalBuscarCli(true)}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              BUSCAR CLIENTE
            </button>

            <button
              onClick={handleLimpiar}
              className="h-5 rounded bg-[#B80036] px-2.5 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              NUEVO
            </button>

            <button
              onClick={handleLimpiar}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              NUEVO ALQUILER
            </button>

            <button
              onClick={() => setModalGasto(true)}
              className="flex items-center gap-1 h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              <span className="text-[8px] text-white">▶</span> GASTO(SALIDA)
            </button>

            <button
              onClick={() => setModalImprimir(true)}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              REIMPRIMIR
            </button>

            <button
              onClick={() => setModalApartados(true)}
              className="h-5 rounded bg-[#B80036] px-2.5 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              APARTADOS
            </button>

            <button
              onClick={() => setModalDevolucion(true)}
              className="h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95 whitespace-nowrap uppercase"
            >
              ENTRADA VESTIDO
            </button>
          </div>

          {/* =========================================================================
              LÍNEA DE ARTÍCULO: AUTOCOMPLETE CON FILTRADO + 1 ENTER A CANTIDAD + ENTER A TABLA
          ========================================================================= */}
          <div className="relative flex items-center gap-1 py-0.5">
            <span className="text-[10px] font-bold text-slate-800 uppercase">ARTICULO</span>
            
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
                  className="h-5 w-full rounded border border-slate-400 bg-white pr-6 pl-1.5 text-[10px] font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-500"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => {
                    setMostrarDropdownArt((p) => !p);
                    articuloInputRef.current?.focus();
                  }}
                  className="absolute right-1 text-slate-500 hover:text-slate-800"
                >
                  <ChevronDown className="h-3 w-3" />
                </button>
              </div>

              {/* LISTA DESPLEGABLE FLOTANTE FILTRADA */}
              {mostrarDropdownArt && articulosFiltrados.length > 0 && (
                <div
                  ref={dropdownRef}
                  className="absolute left-0 top-6 z-50 max-h-52 w-full overflow-auto rounded border border-slate-400 bg-white shadow-lg"
                >
                  {articulosFiltrados.map((art, idx) => {
                    const isHovered = sugerenciaIndex === idx;
                    return (
                      <div
                        key={art.IDARTICULO}
                        onMouseEnter={() => setSugerenciaIndex(idx)}
                        onClick={() => seleccionarArticulo(art)}
                        className={`flex cursor-pointer items-center justify-between border-b border-slate-100 px-2 py-1 text-[10px] transition-colors ${
                          isHovered ? "bg-[#B80036] font-bold text-white" : "hover:bg-slate-100 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] opacity-75">[{art.CODBARRAS}]</span>
                          <span>{art.DESCRIPCION}</span>
                          <span className={`rounded px-1 py-0.2 text-[9px] ${isHovered ? "bg-white/20" : "bg-slate-200"}`}>
                            Talla: {art.TALLA}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>Alq: ${art.VALOR.toLocaleString()}</span>
                          <span className="opacity-90">Dep: ${art.VALORDEPOSITO.toLocaleString()}</span>
                          <span className={`font-mono font-bold ${isHovered ? "text-yellow-200" : "text-emerald-700"}`}>
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
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold text-red-700 uppercase">▸CANTIDAD</span>
              <input
                ref={cantidadInputRef}
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                onKeyDown={handleKeyDownCantidad}
                className="h-5 w-11 rounded border-2 border-red-500 bg-white text-center text-[10px] font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-red-600 shadow-sm"
              />
              <span className="text-[10px] font-bold text-red-700">▸</span>
            </div>

            {/* BOTÓN + AGREGAR */}
            <button
              onClick={handleAgregarItem}
              title="Bajar artículo a la tabla (Enter en cantidad)"
              className="h-5 rounded bg-slate-700 px-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
            >
              +
            </button>

            {/* BOTÓN ELIMINAR */}
            <button
              onClick={handleEliminarFila}
              className="flex items-center gap-0.5 h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95"
            >
              ELIMINAR <Trash2 className="h-3 w-3" />
            </button>

            {/* BOTÓN PAGAR */}
            <button
              onClick={handlePagar}
              className="h-5 rounded bg-[#111111] px-3 text-[10px] font-black text-white shadow-sm hover:bg-black active:scale-95"
            >
              PAGAR
            </button>

            {/* BOTÓN SALIR X */}
            <button
              onClick={handleLimpiar}
              className="flex items-center gap-0.5 h-5 rounded bg-[#992222] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#771111] active:scale-95"
            >
              SALIR <X className="h-3 w-3" />
            </button>
          </div>

          {/* =========================================================================
              TABLA PRINCIPAL DE ALQUILER
          ========================================================================= */}
          <div className="flex-1 rounded border border-slate-400 bg-white overflow-hidden shadow-inner flex flex-col min-h-0">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#000000] text-white font-bold uppercase text-[10px] tracking-wider sticky top-0">
                    <th className="border-r border-slate-700 px-2 py-1">DESCRIPCION</th>
                    <th className="border-r border-slate-700 px-1 py-1 text-center w-14">CANTIDAD</th>
                    <th className="border-r border-slate-700 px-2 py-1 text-right w-24">VALOR ALQUILER</th>
                    <th className="border-r border-slate-700 px-2 py-1 text-right w-24">TOTAL ALQUILER</th>
                    <th className="border-r border-slate-700 px-2 py-1 text-right w-20">DEPOSITO</th>
                    <th className="border-r border-slate-700 px-2 py-1 text-right w-24">TOTAL DEPOSITO</th>
                    <th className="px-2 py-1 text-right w-24">TOT ALQUILER</th>
                  </tr>
                </thead>
                <tbody>
                  {gridItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-slate-400 text-xs font-semibold">
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
                          className={`cursor-pointer border-b border-slate-200 text-[11px] ${
                            isSelected
                              ? "bg-[#FFE066] font-bold text-slate-900"
                              : isEven
                              ? "bg-white"
                              : "bg-[#D6E6F2]"
                          }`}
                        >
                          <td className="px-2 py-0.5 font-semibold text-slate-800 border-r border-slate-200">
                            {item.descripcion} <span className="text-[9px] text-slate-500">(TALLA: {item.talla})</span>
                          </td>
                          <td className="px-1 py-0.5 text-center font-bold border-r border-slate-200">
                            {item.cantidad}
                          </td>
                          <td className="px-2 py-0.5 text-right font-mono border-r border-slate-200">
                            {item.valorAlquiler.toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                            ${item.totalAlquiler.toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-right font-mono border-r border-slate-200">
                            {item.valorDeposito.toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-right font-mono font-bold text-blue-800 border-r border-slate-200">
                            ${item.totalDeposito.toLocaleString()}
                          </td>
                          <td className="px-2 py-0.5 text-right font-mono font-black text-emerald-800">
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
        </div>

        {/* =========================================================================
            3. PANEL DERECHO CYAN / AZUL (PANEL DE COBRO COMPACTO 100% VISIBLE)
        ========================================================================= */}
        <div className="w-[240px] rounded border border-slate-400 bg-[#00A8FF] p-2 text-slate-900 flex flex-col justify-between shadow-sm overflow-hidden">
          <div className="space-y-1">
            {/* 1. PAGA CON EFECTIVO: */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                PAGA CON EFECTIVO:
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={pagaEfectivo}
                onChange={(e) => setPagaEfectivo(e.target.value)}
                className="mt-0.5 h-7 w-full rounded border border-slate-300 bg-white px-2 text-right font-mono text-base font-bold text-slate-900 shadow-inner focus:outline-none"
              />
            </div>

            {/* 2. PAGA CON TRANSFERENCIA: */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                PAGA CON TRANSFERENCIA:
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={pagaTransferencia}
                onChange={(e) => setPagaTransferencia(e.target.value)}
                className="mt-0.5 h-7 w-full rounded border border-slate-300 bg-white px-2 text-right font-mono text-base font-bold text-slate-900 shadow-inner focus:outline-none"
              />
            </div>

            {/* 3. TOTAL DEPOSITO */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                TOTAL DEPOSITO
              </label>
              <div className="mt-0.5 flex h-7 w-full items-center justify-end rounded border border-slate-300 bg-white px-2 font-mono text-base font-bold text-slate-900 shadow-inner">
                {totalDeposito.toLocaleString()}
              </div>
            </div>

            {/* 4. TOTAL ALQUILER */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                TOTAL ALQUILER
              </label>
              <div className="mt-0.5 flex h-7 w-full items-center justify-end rounded border border-slate-300 bg-white px-2 font-mono text-base font-bold text-slate-900 shadow-inner">
                {totalAlquiler.toLocaleString()}
              </div>
            </div>

            {/* 5. DESCUENTO_ALQUILER */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                DESCUENTO_ALQUILER
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={descuentoAlquiler}
                onChange={(e) => setDescuentoAlquiler(e.target.value)}
                className="mt-0.5 h-5 w-full rounded border border-slate-300 bg-white px-1.5 text-right font-mono text-xs font-bold text-slate-900 shadow-inner focus:outline-none"
              />
            </div>

            {/* 6. TOTAL DEPOSITO + ALQUILER */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                TOTAL DEPOSITO + ALQUILER
              </label>
              <div className="mt-0.5 flex h-8 w-full items-center justify-end rounded border border-slate-400 bg-white px-2 font-mono text-lg font-black text-slate-900 shadow-inner">
                {totalDepositoMasAlquiler.toLocaleString()}
              </div>
            </div>

            {/* 7. SU CAMBIO ES */}
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-900 block leading-none">
                SU CAMBIO ES
              </label>
              <div className="mt-0.5 flex h-8 w-full items-center justify-center rounded border border-slate-400 bg-white px-2 font-mono text-base font-black text-emerald-700 shadow-inner">
                {totalPagado > 0 ? `$ ${cambioVuelto.toLocaleString()}` : "+++++"}
              </div>
            </div>
          </div>

          <button
            onClick={handlePagar}
            disabled={gridItems.length === 0}
            className="mt-1.5 w-full rounded bg-[#002D62] py-2 text-center text-xs font-bold uppercase tracking-wider text-white shadow hover:bg-black transition-transform active:scale-95 disabled:opacity-50"
          >
            CONFIRMAR ALQUILER
          </button>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ALTA_DE_CLIENTES (IDÉNTICO A LA CAPTURA WINDEV [ALTA_DE_CLIENTES])
      ========================================================================= */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-2xl bg-[#E8E8E8] p-4 border-2 border-slate-400 shadow-2xl">
          {/* BARRA SUPERIOR DE VENTANA */}
          <div className="flex items-center justify-between pb-1 border-b border-slate-300">
            <span className="text-[11px] font-bold text-slate-700 uppercase">ALTA DE CLIENTES</span>
          </div>

          {/* TÍTULO GRANDE CENTRADO */}
          <div className="text-center py-2">
            <h2 className="text-xl font-black tracking-wider text-slate-900 uppercase">
              INGRESA LOS DATOS DEL CLIENTE
            </h2>
          </div>

          {/* CUADRO PRINCIPAL CON BORDES (EXACTO A WINDEV) */}
          <div className="rounded border-2 border-slate-400 bg-[#E8E8E8] p-4 shadow-inner space-y-2.5">
            {/* 1. ID CLIENTES */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">ID CLIENTES</span>
              <input
                type="text"
                disabled
                value={clienteForm.IDCLIENTES || 0}
                className="h-6 w-28 rounded border border-slate-400 bg-[#E0E0E0] px-2 text-right text-xs font-bold text-slate-700"
              />
            </div>

            {/* 2. CEDULA + BOTÓN BUSCAR AZUL */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">CEDULA</span>
              <input
                type="number"
                placeholder="Cédula / Documento"
                value={clienteForm.CEDULA || ""}
                onChange={(e) =>
                  setClienteForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                className="h-6 w-44 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={() => handleBuscarCedulaDirecta(clienteForm.CEDULA)}
                className="ml-2 h-6 rounded bg-[#004B87] px-4 text-xs font-bold text-white shadow hover:bg-[#003366] active:scale-95"
              >
                Buscar
              </button>
            </div>

            {/* 3. NOMBRE */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">NOMBRE</span>
              <input
                type="text"
                placeholder="Nombre completo"
                value={clienteForm.NOMBRE || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, NOMBRE: e.target.value }))}
                className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 4. DIRECCION */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">DIRECCION</span>
              <input
                type="text"
                placeholder="Dirección de residencia"
                value={clienteForm.DIRECCION || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* 5. TELEFONO */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">TELEFONO</span>
              <input
                type="text"
                placeholder="Teléfono principal"
                value={clienteForm.TELEFONO || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                className="h-6 w-60 rounded border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-900 focus:outline-none"
              />
            </div>

            {/* 6. TELEFONO2 */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">TELEFONO2</span>
              <input
                type="text"
                placeholder="Teléfono secundario / celular"
                value={clienteForm.TELEFONO2 || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, TELEFONO2: e.target.value }))}
                className="h-6 w-60 rounded border border-slate-400 bg-white px-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* 7. EMPRESA */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">EMPRESA</span>
              <input
                type="text"
                placeholder="Nombre de la empresa"
                value={clienteForm.EMPRESA || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, EMPRESA: e.target.value }))}
                className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* 8. DIRECCION EMPRESA */}
            <div className="flex items-center">
              <span className="w-36 text-xs font-bold text-slate-800 uppercase">DIRECCION EMPRESA</span>
              <input
                type="text"
                placeholder="Dirección de la empresa"
                value={clienteForm.DIRECCIONEMP || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, DIRECCIONEMP: e.target.value }))}
                className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs text-slate-900 focus:outline-none"
              />
            </div>

            {/* 9. NOTA */}
            <div className="flex items-start">
              <span className="w-36 pt-1 text-xs font-bold text-slate-800 uppercase">NOTA</span>
              <textarea
                rows={3}
                placeholder="Observaciones o notas especiales del cliente..."
                value={clienteForm.NOTA || ""}
                onChange={(e) => setClienteForm((p) => ({ ...p, NOTA: e.target.value }))}
                className="flex-1 rounded border border-slate-400 bg-white p-2 text-xs text-slate-900 focus:outline-none resize-none"
              />
            </div>

            {/* 10. BOTONES DE ACCIÓN: GUARDAR ✔ / SALIR ✖ (AZULES EXACTOS A WINDEV) */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleGuardarClienteAlta}
                className="flex items-center gap-1.5 rounded-sm bg-[#004B87] px-6 py-1.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95"
              >
                GUARDAR <Check className="h-4 w-4" />
              </button>

              <button
                type="button"
                onClick={() => setModalCliente(false)}
                className="flex items-center gap-1.5 rounded-sm bg-[#004B87] px-6 py-1.5 text-xs font-black text-white shadow-md hover:bg-[#003366] active:scale-95"
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
            <span className="font-bold text-slate-900 uppercase text-xs">
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
                className="h-7 flex-1 rounded border border-slate-400 bg-white px-2 text-xs"
              />
              <button
                onClick={async () => {
                  const clis = await buscarClientesPorNombre(busqClienteInput);
                  setClientesEncontrados(clis);
                }}
                className="rounded bg-[#111111] px-4 text-xs font-bold text-white"
              >
                Buscar
              </button>
            </div>

            <div className="max-h-56 overflow-auto rounded border border-slate-300 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-200 font-bold sticky top-0">
                  <tr>
                    <th className="p-1.5 border-b">Cédula</th>
                    <th className="p-1.5 border-b">Nombre</th>
                    <th className="p-1.5 border-b">Teléfono</th>
                    <th className="p-1.5 border-b text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clientesEncontrados.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400 text-xs">
                        Ingresa un nombre para buscar.
                      </td>
                    </tr>
                  ) : (
                    clientesEncontrados.map((c) => (
                      <tr key={c.IDCLIENTES} className="border-b hover:bg-slate-50">
                        <td className="p-1.5 font-mono font-bold">{c.CEDULA}</td>
                        <td className="p-1.5">{c.NOMBRE}</td>
                        <td className="p-1.5">{c.TELEFONO}</td>
                        <td className="p-1.5 text-right">
                          <button
                            onClick={() => {
                              setClienteForm(c);
                              setModalBuscarCli(false);
                              toast.success(`Cliente cargado: ${c.NOMBRE}`);
                              articuloInputRef.current?.focus();
                            }}
                            className="rounded bg-[#B80036] px-2 py-0.5 text-xs font-bold text-white"
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
            <span className="font-bold text-red-700 uppercase text-xs">
              Registrar Gasto (Salida de Caja)
            </span>
          </div>
          <div className="space-y-2 text-xs font-semibold pt-1">
            <div>
              <label className="block mb-0.5">Descripción del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Lavandería o transporte"
                value={gastoDesc}
                onChange={(e) => setGastoDesc(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label className="block mb-0.5">Valor Salida ($)</label>
              <input
                type="number"
                placeholder="0"
                value={gastoMonto}
                onChange={(e) => setGastoMonto(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setModalGasto(false)}
              className="rounded bg-slate-300 px-3 py-1 text-xs font-bold"
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
              className="rounded bg-red-700 px-4 py-1 text-xs font-bold text-white"
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
            <span className="font-bold text-emerald-800 uppercase text-xs">
              Entrada de Vestido & Devolución de Depósito
            </span>
          </div>
          <div className="space-y-2 text-xs font-semibold pt-1">
            <div>
              <label className="block mb-0.5">N° Factura / Recibo de Alquiler</label>
              <input
                type="text"
                placeholder="Ej. ALQ-000124"
                value={devFactura}
                onChange={(e) => setDevFactura(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2 font-bold"
              />
            </div>
            <div>
              <label className="block mb-0.5">Monto de Depósito a Devolver ($)</label>
              <input
                type="number"
                placeholder="0"
                value={devMonto || ""}
                onChange={(e) => setDevMonto(Number(e.target.value) || 0)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2 font-mono text-base font-bold text-blue-700"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => setModalDevolucion(false)}
              className="rounded bg-slate-300 px-3 py-1 text-xs font-bold"
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
              className="rounded bg-emerald-700 px-4 py-1 text-xs font-bold text-white"
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
            <span className="font-bold text-amber-800 uppercase text-xs">
              Trajes Apartados / Reservas
            </span>
          </div>
          <div className="space-y-1.5 text-xs font-mono pt-1">
            <div className="rounded border border-slate-300 bg-white p-2">
              <div className="flex justify-between border-b pb-1 font-bold">
                <span>RECIBO</span>
                <span>CLIENTE</span>
                <span>FECHAS</span>
                <span>TOTAL</span>
              </div>
              <div className="flex justify-between py-1 border-b text-slate-700">
                <span>ALQ-000120</span>
                <span>JUAN PÉREZ</span>
                <span>03/09 - 06/09</span>
                <span className="font-bold text-emerald-700">$170.000</span>
              </div>
              <div className="flex justify-between py-1 text-slate-700">
                <span>ALQ-000122</span>
                <span>MARÍA RODRÍGUEZ</span>
                <span>04/09 - 07/09</span>
                <span className="font-bold text-emerald-700">$200.000</span>
              </div>
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => setModalApartados(false)}
              className="rounded bg-slate-800 px-3 py-1 text-xs font-bold text-white"
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
              <h2 className="text-sm font-black uppercase">LA CASA DEL DISFRAZ</h2>
              <p className="text-[10px]">Elegance Rentals</p>
              <p className="text-[9px]">Para toda ocasión sin importar tu edad</p>
              <p className="mt-1 font-bold">RECIBO N° {numeroRecibo}</p>
              <p className="text-[9px]">Fecha: {fechaHoy} · Cajero: {cajero}</p>
            </div>

            <div className="py-1.5 text-[10px] space-y-0.5 border-b border-dashed border-slate-400">
              <p><strong>CLIENTE:</strong> {clienteForm.NOMBRE?.toUpperCase() || "GENERAL"}</p>
              <p><strong>CÉDULA:</strong> {clienteForm.CEDULA || "N/A"}</p>
              <p><strong>TELÉFONO:</strong> {clienteForm.TELEFONO || "N/A"}</p>
              <p><strong>SALIDA:</strong> {fechaSalida} | <strong>ENTRADA:</strong> {fechaEntrada}</p>
            </div>

            <div className="py-1.5 border-b border-dashed border-slate-400">
              <div className="flex justify-between font-bold pb-1 text-[10px]">
                <span>ARTÍCULO</span>
                <span>VALOR</span>
              </div>
              {gridItems.map((it, i) => (
                <div key={i} className="flex justify-between py-0.5 text-[10px]">
                  <span>{it.cantidad}x {it.descripcion} ({it.talla})</span>
                  <span>${it.totalAlquiler.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="py-1.5 space-y-0.5 text-right text-[10px]">
              <p>Total Alquiler: ${totalAlquilerConDesc.toLocaleString()}</p>
              <p className="font-bold text-blue-800">Total Depósito (Fianza): ${totalDeposito.toLocaleString()}</p>
              <p className="text-xs font-black border-t pt-0.5">
                TOTAL COBRADO: ${totalDepositoMasAlquiler.toLocaleString()}
              </p>
              <p className="text-emerald-700 font-bold">Cambio / Vuelto: ${Math.max(0, cambioVuelto).toLocaleString()}</p>
            </div>

            <p className="mt-2 text-center text-[9px] text-slate-500 italic">
              Conservar este recibo para la devolución de la prenda y reintegro del depósito.
            </p>
          </div>
          <div className="flex justify-end mt-2">
            <button
              onClick={() => {
                window.print();
                setModalImprimir(false);
              }}
              className="rounded bg-black px-4 py-1 text-xs font-bold text-white flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
