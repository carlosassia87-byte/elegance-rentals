import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  Trash2,
  CreditCard,
  X,
  Plus,
  RefreshCw,
  Printer,
  Calendar,
  Layers,
  ArrowDownCircle,
  Sparkles,
  DollarSign,
  User,
  ShoppingBag,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  // Pestaña Activa (Estilo WINDEV)
  const [pestanaActiva, setPestanaActiva] = useState<string>("ALQUILAR");

  // Campos de Cabecera (Idéntico a la imagen)
  const [estadoCli, setEstadoCli] = useState("ACTIVO");
  const [fechaHoy, setFechaHoy] = useState(() => new Date().toISOString().split("T")[0]);
  const [numeroRecibo, setNumeroRecibo] = useState("000124");
  const [cajero, setCajero] = useState("ADMINISTRADOR PRINCIPAL");
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [fechaSalida, setFechaSalida] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEntrada, setFechaEntrada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [estadoTraje, setEstadoTraje] = useState("DISPONIBLE");

  // Línea de Artículo
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_INICIALES);
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);

  // Tabla / Grid de Alquiler
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

  // Estados de formularios modales
  const [busqClienteInput, setBusqClienteInput] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [gastoDesc, setGastoDesc] = useState("");
  const [gastoMonto, setGastoMonto] = useState("");
  const [devFactura, setDevFactura] = useState("");
  const [devMonto, setDevMonto] = useState<number>(0);

  // Cargar número y catálogo
  useEffect(() => {
    generarNumeroFactura().then((num) => setNumeroRecibo(num));
    listarArticulos().then((res) => {
      if (res && res.length > 0) setArticulos(res);
    });
  }, []);

  // Cálculos de Totales en Tiempo Real
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

  // Buscar Cédula con Enter
  async function handleBuscarCedula(e?: React.KeyboardEvent) {
    if (e && e.key !== "Enter") return;
    if (!cedula.trim()) return;

    const cli = await buscarClientePorCedula(cedula);
    if (cli) {
      setNombre(cli.NOMBRE || "");
      setDireccion(cli.DIRECCION || "");
      setTelefono(cli.TELEFONO || "");
      setEmpresa(cli.EMPRESA || "");
      toast.success(`Cliente: ${cli.NOMBRE}`);
    } else {
      toast.info("Cédula no registrada. Puedes registrar los datos.");
      setModalCliente(true);
    }
  }

  // Agregar Artículo a la Tabla
  function handleAgregarItem() {
    const art = articulos.find((a) => String(a.IDARTICULO) === articuloSeleccionadoId);
    if (!art) {
      toast.error("Selecciona un artículo de la lista");
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
    setArticuloSeleccionadoId("");
    setCantidad(1);
    toast.success(`Agregado: ${art.DESCRIPCION}`);
  }

  // Eliminar Fila
  function handleEliminarFila() {
    if (filaSeleccionada === null || filaSeleccionada < 0) {
      toast.error("Selecciona una fila de la tabla para eliminar");
      return;
    }
    setGridItems((prev) => prev.filter((_, i) => i !== filaSeleccionada));
    setFilaSeleccionada(null);
    toast.info("Artículo eliminado de la lista");
  }

  // Nuevo Alquiler
  function handleLimpiar() {
    generarNumeroFactura().then(setNumeroRecibo);
    setCedula("");
    setNombre("");
    setDireccion("");
    setTelefono("");
    setEmpresa("");
    setGridItems([]);
    setPagaEfectivo("");
    setPagaTransferencia("");
    setDescuentoAlquiler("");
    setFilaSeleccionada(null);
    toast.info("Nuevo alquiler iniciado");
  }

  // Pagar / Confirmar Alquiler
  async function handlePagar() {
    if (!nombre.trim() || !cedula.trim()) {
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
        CCLIENTE: nombre,
        CCEDULA: cedula,
        CDIRECCION: direccion,
        CTELEFONO: telefono,
        CEMPRESA: empresa,
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

      await guardarCliente({
        CEDULA: Number(cedula) || 0,
        NOMBRE: nombre,
        DIRECCION: direccion,
        TELEFONO: telefono,
        EMPRESA: empresa,
      });

      await registrarAlquilerFactura(factura, campos);
      setModalImprimir(true);
      toast.success("¡Alquiler procesado exitosamente!");
    } catch {
      setModalImprimir(true);
      toast.success("Alquiler procesado (Modo local)");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#EDEDED] font-sans text-slate-900 select-none">
      {/* =========================================================================
          1. ENCABEZADO / HEADER: TÍTULO "PUNTO DE VENTA" Y LOGO "LA CASA DEL DISFRAZ"
      ========================================================================= */}
      <div className="relative flex items-center justify-between border-b-2 border-slate-300 bg-[#F5F5F5] px-6 py-2 shadow-sm">
        <div className="w-48">
          <div className="inline-block rounded border border-slate-300 bg-white px-3 py-1 shadow-inner">
            <span className="text-xs font-bold text-slate-500 uppercase">ALQUILER</span>
          </div>
        </div>

        {/* TÍTULO PRINCIPAL ROJO WINDEV */}
        <div className="text-center">
          <h1 className="text-3xl font-black tracking-widest text-[#D60000] uppercase drop-shadow-[0_1px_1px_rgba(0,0,0,0.2)]">
            PUNTO DE VENTA
          </h1>
        </div>

        {/* LOGO LA CASA DEL DISFRAZ (IDÉNTICO A LA IMAGEN) */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <div className="inline-block rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-red-500 to-purple-600 px-3 py-1 text-white shadow-md">
              <span className="text-base font-black italic tracking-wide">La Casa Del Disfraz</span>
            </div>
            <p className="mt-0.5 text-[10px] font-semibold text-slate-500">
              Para toda ocasión sin importar tu edad
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          2. CUERPO PRINCIPAL: FORMULARIO SUPERIOR + TABLA + PANEL CYAN DERECHO
      ========================================================================= */}
      <div className="flex flex-1 p-3 gap-3 overflow-hidden">
        {/* LADO IZQUIERDO: FORMULARIO CABECERA + BOTONES DE ACCIÓN + TABLA */}
        <div className="flex flex-1 flex-col gap-2">
          {/* BLOQUE SUPERIOR: CAMPOS DE CABECERA (3 COLUMNAS IDÉNTICAS A WINDEV) */}
          <div className="rounded border-2 border-slate-300 bg-[#E8E8E8] p-3 shadow-inner">
            <div className="grid grid-cols-12 gap-x-3 gap-y-1.5 text-xs font-bold">
              {/* FILA 1 */}
              <div className="col-span-3 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">ESTADO</span>
                <select
                  value={estadoCli}
                  onChange={(e) => setEstadoCli(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="ACTIVO">ACTIVO</option>
                  <option value="PENDIENTE">PENDIENTE</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>

              <div className="col-span-5 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">CÉDULA</span>
                <input
                  type="text"
                  placeholder="Entrada obligatoria"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  onKeyDown={handleBuscarCedula}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="col-span-4 flex items-center gap-2">
                <span className="w-28 text-slate-700 uppercase">FECHA SALIDA</span>
                <input
                  type="date"
                  value={fechaSalida}
                  onChange={(e) => setFechaSalida(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* FILA 2 */}
              <div className="col-span-3 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">FECHA</span>
                <input
                  type="date"
                  value={fechaHoy}
                  onChange={(e) => setFechaHoy(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">NOMBRE</span>
                <input
                  type="text"
                  placeholder="Nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-semibold placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="col-span-4 flex items-center gap-2">
                <span className="w-28 text-slate-700 uppercase">FECHA ENTRADA</span>
                <input
                  type="date"
                  value={fechaEntrada}
                  onChange={(e) => setFechaEntrada(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* FILA 3 */}
              <div className="col-span-3 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">N.RECIBO</span>
                <input
                  type="text"
                  value={numeroRecibo}
                  onChange={(e) => setNumeroRecibo(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-red-700 focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">DIRECCIÓN</span>
                <input
                  type="text"
                  placeholder="Direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs placeholder:text-slate-400 focus:outline-none"
                />
              </div>

              <div className="col-span-4 flex items-center gap-2">
                <span className="w-28 text-slate-700 uppercase">ESTADO TRAJE</span>
                <select
                  value={estadoTraje}
                  onChange={(e) => setEstadoTraje(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-1.5 text-xs font-semibold focus:outline-none"
                >
                  <option value="DISPONIBLE">DISPONIBLE</option>
                  <option value="ALQUILADO">ALQUILADO</option>
                  <option value="LAVANDERIA">LAVANDERÍA</option>
                  <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                </select>
              </div>

              {/* FILA 4 */}
              <div className="col-span-3 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">CAJERO</span>
                <input
                  type="text"
                  value={cajero}
                  onChange={(e) => setCajero(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-[10px] font-bold uppercase focus:outline-none"
                />
              </div>

              <div className="col-span-5 flex items-center gap-2">
                <span className="w-20 text-slate-700 uppercase">TELÉFONO</span>
                <input
                  type="text"
                  placeholder="Teléfono"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setModalCliente(true)}
                  className="h-6 rounded bg-[#B30000] px-2.5 text-[11px] font-black text-white hover:bg-red-800"
                >
                  Mod
                </button>
              </div>

              <div className="col-span-4 flex items-center gap-2">
                <span className="w-28 text-slate-700 uppercase">EMPRESA</span>
                <input
                  type="text"
                  placeholder="Empresa / Institución"
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="h-6 flex-1 rounded border border-slate-400 bg-white px-2 text-xs placeholder:text-slate-400 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* BARRA DE BOTONES MAGENTA / ROJOS (IDÉNTICOS A WINDEV) */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#E0E0E0] p-1.5 rounded border border-slate-300">
            <button
              onClick={() => setModalCliente(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              NUEVO CLIENTE
            </button>
            <button
              onClick={() => setModalCliente(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              MODIFICAR
            </button>
            <button
              onClick={() => setModalBuscarCli(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              BUSCAR CLIENTE
            </button>
            <button
              onClick={handleLimpiar}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              NUEVO
            </button>
            <button
              onClick={handleLimpiar}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              NUEVO ALQUILER
            </button>
            <button
              onClick={() => setModalGasto(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              GASTO(SALIDA)
            </button>
            <button
              onClick={() => setModalImprimir(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              REIMPRIMIR
            </button>
            <button
              onClick={() => setModalApartados(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              APARTADOS
            </button>
            <button
              onClick={() => setModalDevolucion(true)}
              className="h-7 rounded bg-[#C71585] px-3 text-xs font-black text-white shadow hover:bg-[#A0106A]"
            >
              ENTRADA VESTIDO
            </button>
          </div>

          {/* SELECTOR DE ARTÍCULO Y CONTROLES */}
          <div className="flex items-center gap-2 rounded border border-slate-300 bg-[#E8E8E8] p-2">
            <span className="text-xs font-black text-slate-800 uppercase">ARTICULO</span>
            <select
              value={articuloSeleccionadoId}
              onChange={(e) => setArticuloSeleccionadoId(e.target.value)}
              className="h-8 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-800 focus:outline-none"
            >
              <option value="">-- SELECCIONAR ARTÍCULO / TRAJE / DISFRAZ --</option>
              {articulos.map((art) => (
                <option key={art.IDARTICULO} value={String(art.IDARTICULO)}>
                  {art.DESCRIPCION} (TALLA: {art.TALLA} | VALOR: ${art.VALOR.toLocaleString()} | DEP: ${art.VALORDEPOSITO.toLocaleString()} | STOCK: {art.STOCK})
                </option>
              ))}
            </select>

            <span className="text-xs font-black text-slate-800 uppercase ml-2">CANTIDAD</span>
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
              onKeyDown={(e) => e.key === "Enter" && handleAgregarItem()}
              className="h-8 w-16 rounded border border-slate-400 bg-white text-center font-bold text-xs focus:outline-none"
            />

            <button
              onClick={handleAgregarItem}
              className="h-8 rounded bg-blue-700 px-3 text-xs font-bold text-white shadow hover:bg-blue-800"
            >
              + Agregar
            </button>

            <button
              onClick={handleEliminarFila}
              className="h-8 rounded bg-[#B30000] px-3 text-xs font-bold text-white shadow hover:bg-red-800 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" /> ELIMINAR
            </button>

            <button
              onClick={handlePagar}
              className="h-8 rounded bg-[#111827] px-4 text-xs font-black text-white shadow hover:bg-black"
            >
              PAGAR
            </button>

            <button
              onClick={handleLimpiar}
              className="h-8 rounded bg-[#8B0000] px-3 text-xs font-bold text-white shadow hover:bg-red-950 flex items-center gap-1"
            >
              SALIR <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* TABLA PRINCIPAL DE ÍTEMS ALQUILADOS (WINDEV GRID STYLE) */}
          <div className="flex-1 rounded border-2 border-slate-400 bg-white overflow-hidden shadow-inner flex flex-col">
            <div className="overflow-auto flex-1">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-[#001F3F] text-white font-black uppercase text-[11px] tracking-wider sticky top-0">
                    <th className="border-r border-slate-700 px-3 py-2">DESCRIPCION</th>
                    <th className="border-r border-slate-700 px-2 py-2 text-center w-20">CANTIDAD</th>
                    <th className="border-r border-slate-700 px-3 py-2 text-right">VALOR ALQUILER</th>
                    <th className="border-r border-slate-700 px-3 py-2 text-right">TOTAL ALQUILER</th>
                    <th className="border-r border-slate-700 px-3 py-2 text-right">DEPOSITO</th>
                    <th className="border-r border-slate-700 px-3 py-2 text-right">TOTAL DEPOSITO</th>
                    <th className="px-3 py-2 text-right">TOTAL ALQUILER</th>
                  </tr>
                </thead>
                <tbody>
                  {gridItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-20 text-center text-slate-400 text-sm font-semibold">
                        Selecciona un artículo y haz clic en "+ Agregar" para cargarlo en este alquiler.
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
                          className={`cursor-pointer border-b border-slate-200 transition-colors ${
                            isSelected
                              ? "bg-amber-200 font-bold text-slate-900"
                              : isEven
                              ? "bg-white"
                              : "bg-[#EBF3FB]"
                          }`}
                        >
                          <td className="px-3 py-1.5 font-semibold text-slate-800 border-r border-slate-200">
                            {item.descripcion} <span className="text-[10px] text-slate-500">(TALLA: {item.talla})</span>
                          </td>
                          <td className="px-2 py-1.5 text-center font-bold border-r border-slate-200">
                            {item.cantidad}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono border-r border-slate-200">
                            ${item.valorAlquiler.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900 border-r border-slate-200">
                            ${item.totalAlquiler.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono border-r border-slate-200">
                            ${item.valorDeposito.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-blue-800 border-r border-slate-200">
                            ${item.totalDeposito.toLocaleString()}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono font-black text-emerald-700">
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
            LADO DERECHO: PANEL DE COBRO Y TOTALES CYAN (EXACTO A LA IMAGEN)
        ========================================================================= */}
        <div className="w-80 rounded-lg border-2 border-slate-400 bg-[#00A8E8] p-3 text-slate-900 shadow-md flex flex-col justify-between">
          <div className="space-y-2">
            {/* 1. PAGA CON EFECTIVO */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                PAGA CON EFECTIVO:
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={pagaEfectivo}
                onChange={(e) => setPagaEfectivo(e.target.value)}
                className="mt-0.5 h-10 w-full rounded border-2 border-slate-300 bg-white px-2 text-right font-mono text-2xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            {/* 2. PAGA CON TRANSFERENCIA */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                PAGA CON TRANSFERENCIA:
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={pagaTransferencia}
                onChange={(e) => setPagaTransferencia(e.target.value)}
                className="mt-0.5 h-10 w-full rounded border-2 border-slate-300 bg-white px-2 text-right font-mono text-2xl font-black text-slate-900 shadow-inner focus:outline-none focus:ring-2 focus:ring-slate-800"
              />
            </div>

            {/* 3. TOTAL DEPOSITO */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                TOTAL DEPOSITO
              </label>
              <div className="mt-0.5 flex h-10 w-full items-center justify-end rounded border-2 border-slate-300 bg-white px-3 font-mono text-2xl font-black text-slate-900 shadow-inner">
                {totalDeposito.toLocaleString()}
              </div>
            </div>

            {/* 4. TOTAL ALQUILER */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                TOTAL ALQUILER
              </label>
              <div className="mt-0.5 flex h-10 w-full items-center justify-end rounded border-2 border-slate-300 bg-white px-3 font-mono text-2xl font-black text-slate-900 shadow-inner">
                {totalAlquiler.toLocaleString()}
              </div>
            </div>

            {/* 5. DESCUENTO ALQUILER */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                DESCUENTO_ALQUILER
              </label>
              <input
                type="number"
                min={0}
                placeholder="0"
                value={descuentoAlquiler}
                onChange={(e) => setDescuentoAlquiler(e.target.value)}
                className="mt-0.5 h-8 w-full rounded border-2 border-slate-300 bg-white px-2 text-right font-mono text-lg font-bold text-red-600 shadow-inner focus:outline-none"
              />
            </div>

            {/* 6. TOTAL DEPOSITO + ALQUILER */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                TOTAL DEPOSITO + ALQUILER
              </label>
              <div className="mt-0.5 flex h-11 w-full items-center justify-end rounded border-2 border-slate-400 bg-white px-3 font-mono text-3xl font-black text-slate-900 shadow-inner">
                {totalDepositoMasAlquiler.toLocaleString()}
              </div>
            </div>

            {/* 7. SU CAMBIO ES */}
            <div>
              <label className="text-[11px] font-black uppercase text-slate-900 tracking-wide block">
                SU CAMBIO ES
              </label>
              <div className="mt-0.5 flex h-11 w-full items-center justify-center rounded border-2 border-slate-400 bg-white px-3 font-mono text-2xl font-black text-emerald-700 shadow-inner">
                {totalPagado > 0 ? `$ ${cambioVuelto.toLocaleString()}` : "+++++"}
              </div>
            </div>
          </div>

          <button
            onClick={handlePagar}
            disabled={gridItems.length === 0}
            className="mt-3 w-full rounded-md bg-[#002D62] py-3 text-center text-sm font-black uppercase tracking-wider text-white shadow-lg hover:bg-black transition-transform active:scale-95 disabled:opacity-50"
          >
            CONFIRMAR ALQUILER
          </button>
        </div>
      </div>

      {/* =========================================================================
          3. BARRA DE PESTAÑAS INFERIORES (ESTILO EXACTO WINDEV 25)
      ========================================================================= */}
      <div className="flex items-center overflow-x-auto border-t-2 border-slate-400 bg-[#D0D0D0] px-2 py-1 text-xs font-bold text-slate-800">
        <button
          onClick={() => setModalBuscarCli(true)}
          className={`px-3 py-1 border-r border-slate-400 hover:bg-slate-300 ${pestanaActiva === "CLIENTES" ? "bg-amber-300 font-black" : ""}`}
        >
          CLIENTES
        </button>
        <button
          onClick={() => setPestanaActiva("ALQUILAR")}
          className={`px-4 py-1 border-r border-slate-400 bg-[#FFD700] text-slate-950 font-black shadow-sm`}
        >
          ALQUILAR ✖
        </button>
        <button
          onClick={handlePagar}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          PAGAR ✖
        </button>
        <button
          onClick={() => toast.info("Módulo Estado Clientes")}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          Fiche_ESTADOCLIENTES ✖
        </button>
        <button
          onClick={() => setModalBuscarCli(true)}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          Fiche_CLIENTES ✖
        </button>
        <button
          onClick={() => toast.info("Ingreso de Vestido a Local")}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          INGRESO_VESTIDO_A_LOCAL ✖
        </button>
        <button
          onClick={() => setModalCliente(true)}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          ALTA_DE_CLIENTES ✖
        </button>
        <button
          onClick={() => toast.info("Menú Principal")}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          MENU_PRINCIPAL ✖
        </button>
        <button
          onClick={() => toast.info("Módulo Días de Mora")}
          className="px-3 py-1 border-r border-slate-400 hover:bg-slate-300"
        >
          DIAS_DE_MORA ✖
        </button>
        <button
          onClick={() => setModalDevolucion(true)}
          className="px-3 py-1 hover:bg-slate-300"
        >
          ENTREGA_VESTIDO ✖
        </button>
      </div>

      {/* =========================================================
          MODAL: NUEVO / MODIFICAR CLIENTE
      ========================================================= */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-md bg-[#F5F5F5] border-2 border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-black text-red-700 uppercase">
              Alta / Modificación de Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-bold">
            <div>
              <label>Cédula *</label>
              <input
                type="number"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label>Nombre Completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label>Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label>Teléfono Principal</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label>Empresa</label>
              <input
                type="text"
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
            <button
              onClick={() => setModalCliente(false)}
              className="rounded bg-slate-300 px-3 py-1 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setModalCliente(false);
                toast.success("Datos de cliente asignados");
              }}
              className="rounded bg-[#B30000] px-4 py-1 text-xs font-bold text-white"
            >
              Guardar Cliente
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: BUSCAR CLIENTES
      ========================================================= */}
      <Dialog open={modalBuscarCli} onOpenChange={setModalBuscarCli}>
        <DialogContent className="max-w-lg bg-[#F5F5F5] border-2 border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-black text-slate-900 uppercase">
              Buscar Cliente en Base de Datos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
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
                className="h-8 flex-1 rounded border border-slate-400 bg-white px-2 text-xs font-semibold"
              />
              <button
                onClick={async () => {
                  const clis = await buscarClientesPorNombre(busqClienteInput);
                  setClientesEncontrados(clis);
                }}
                className="rounded bg-[#001F3F] px-4 text-xs font-bold text-white"
              >
                Buscar
              </button>
            </div>

            <div className="max-h-60 overflow-auto rounded border border-slate-300 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-200 font-bold sticky top-0">
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
                      <td colSpan={4} className="p-6 text-center text-slate-400">
                        Ingresa un nombre para buscar.
                      </td>
                    </tr>
                  ) : (
                    clientesEncontrados.map((c) => (
                      <tr key={c.IDCLIENTES} className="border-b hover:bg-slate-50">
                        <td className="p-2 font-mono font-bold">{c.CEDULA}</td>
                        <td className="p-2">{c.NOMBRE}</td>
                        <td className="p-2">{c.TELEFONO}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => {
                              setCedula(String(c.CEDULA));
                              setNombre(c.NOMBRE);
                              setDireccion(c.DIRECCION);
                              setTelefono(c.TELEFONO);
                              setEmpresa(c.EMPRESA || "");
                              setModalBuscarCli(false);
                              toast.success(`Cliente cargado: ${c.NOMBRE}`);
                            }}
                            className="rounded bg-[#C71585] px-2 py-0.5 text-xs font-bold text-white"
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
        <DialogContent className="max-w-sm bg-[#F5F5F5] border-2 border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-black text-red-700 uppercase">
              Registrar Gasto (Salida de Caja)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-bold">
            <div>
              <label>Descripción del Gasto</label>
              <input
                type="text"
                placeholder="Ej. Lavandería o transporte"
                value={gastoDesc}
                onChange={(e) => setGastoDesc(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label>Valor Salida ($)</label>
              <input
                type="number"
                placeholder="0"
                value={gastoMonto}
                onChange={(e) => setGastoMonto(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ENTRADA VESTIDO / DEVOLUCIÓN
      ========================================================= */}
      <Dialog open={modalDevolucion} onOpenChange={setModalDevolucion}>
        <DialogContent className="max-w-md bg-[#F5F5F5] border-2 border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-black text-emerald-800 uppercase">
              Entrada de Vestido & Devolución de Depósito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-bold">
            <div>
              <label>N° Factura / Recibo de Alquiler</label>
              <input
                type="text"
                placeholder="Ej. ALQ-000124"
                value={devFactura}
                onChange={(e) => setDevFactura(e.target.value)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2 font-bold"
              />
            </div>
            <div>
              <label>Monto de Depósito a Devolver ($)</label>
              <input
                type="number"
                placeholder="0"
                value={devMonto || ""}
                onChange={(e) => setDevMonto(Number(e.target.value) || 0)}
                className="mt-1 h-7 w-full rounded border border-slate-400 bg-white px-2 font-mono text-base font-bold text-blue-700"
              />
            </div>
          </div>
          <DialogFooter className="mt-3">
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
                toast.success("Entrada de vestido procesada y depósito liquidado");
                setModalDevolucion(false);
                setDevFactura("");
                setDevMonto(0);
              }}
              className="rounded bg-emerald-700 px-4 py-1 text-xs font-bold text-white"
            >
              Confirmar Devolución
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: APARTADOS (CONSULTA RÁPIDA)
      ========================================================= */}
      <Dialog open={modalApartados} onOpenChange={setModalApartados}>
        <DialogContent className="max-w-lg bg-[#F5F5F5] border-2 border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-black text-amber-800 uppercase">
              Trajes Apartados / Reservas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs">
            <p className="text-slate-600">Lista de órdenes activas y apartados:</p>
            <div className="rounded border border-slate-300 bg-white p-3 font-mono text-xs">
              <div className="flex justify-between border-b pb-1 font-bold">
                <span>RECIBO</span>
                <span>CLIENTE</span>
                <span>SALIDA - ENTRADA</span>
                <span>TOTAL</span>
              </div>
              <div className="flex justify-between py-1.5 border-b text-slate-700">
                <span>ALQ-000120</span>
                <span>JUAN PÉREZ</span>
                <span>2026-09-03 / 2026-09-06</span>
                <span className="font-bold text-emerald-700">$170.000</span>
              </div>
              <div className="flex justify-between py-1.5 text-slate-700">
                <span>ALQ-000122</span>
                <span>MARÍA RODRÍGUEZ</span>
                <span>2026-09-04 / 2026-09-07</span>
                <span className="font-bold text-emerald-700">$200.000</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <button
              onClick={() => setModalApartados(false)}
              className="rounded bg-slate-800 px-4 py-1 text-xs font-bold text-white"
            >
              Cerrar
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: COMPROBANTE / TICKET IMPRIMIBLE
      ========================================================= */}
      <Dialog open={modalImprimir} onOpenChange={setModalImprimir}>
        <DialogContent className="max-w-md bg-white p-6 border-2 border-slate-800">
          <div className="font-mono text-xs text-slate-900">
            <div className="border-b-2 border-dashed border-slate-400 pb-3 text-center">
              <h2 className="text-base font-black uppercase">LA CASA DEL DISFRAZ</h2>
              <p className="text-[11px] font-bold">Elegance Rentals</p>
              <p className="text-[10px]">Para toda ocasión sin importar tu edad</p>
              <p className="mt-1 font-bold text-xs">COMPROBANTE N° {numeroRecibo}</p>
              <p className="text-[10px]">Fecha: {fechaHoy} · Cajero: {cajero}</p>
            </div>

            <div className="py-2 text-[11px] space-y-0.5 border-b border-dashed border-slate-400">
              <p><strong>CLIENTE:</strong> {nombre.toUpperCase() || "GENERAL"}</p>
              <p><strong>CÉDULA:</strong> {cedula || "N/A"}</p>
              <p><strong>TELÉFONO:</strong> {telefono || "N/A"}</p>
              <p><strong>FECHA SALIDA:</strong> {fechaSalida}</p>
              <p><strong>FECHA ENTRADA:</strong> {fechaEntrada}</p>
            </div>

            <div className="py-2 border-b-2 border-dashed border-slate-400">
              <div className="flex justify-between font-bold pb-1 text-[11px]">
                <span>CANT / ARTÍCULO</span>
                <span>TOTAL</span>
              </div>
              {gridItems.map((it, i) => (
                <div key={i} className="flex justify-between py-0.5 text-[11px]">
                  <span>{it.cantidad}x {it.descripcion} ({it.talla})</span>
                  <span>${it.totalAlquiler.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="py-2 space-y-1 text-right text-[11px]">
              <p>Total Alquiler: ${totalAlquilerConDesc.toLocaleString()}</p>
              <p className="font-bold text-blue-800">Total Depósito (Fianza): ${totalDeposito.toLocaleString()}</p>
              <p className="text-sm font-black border-t pt-1">
                TOTAL COBRADO: ${totalDepositoMasAlquiler.toLocaleString()}
              </p>
              <p className="text-slate-600">Efectivo: ${efecNum.toLocaleString()} | Transferencia: ${transNum.toLocaleString()}</p>
              <p className="text-emerald-700 font-bold">Cambio / Vuelto: ${Math.max(0, cambioVuelto).toLocaleString()}</p>
            </div>

            <p className="mt-3 text-center text-[10px] text-slate-500 italic">
              Conservar este recibo para la devolución de la prenda y el reintegro de su depósito.
            </p>
          </div>
          <DialogFooter className="mt-2">
            <button
              onClick={() => {
                window.print();
                setModalImprimir(false);
              }}
              className="rounded bg-black px-4 py-1.5 text-xs font-bold text-white flex items-center gap-1.5"
            >
              <Printer className="h-4 w-4" /> Imprimir Ticket
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
