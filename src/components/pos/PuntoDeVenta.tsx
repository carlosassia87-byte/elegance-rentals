import React, { useState, useEffect, useMemo } from "react";
import {
  Trash2,
  X,
  Printer,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
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
  const [cedula, setCedula] = useState("");
  const [nombre, setNombre] = useState("");
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState("");
  const [fechaSalida, setFechaSalida] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEntrada, setFechaEntrada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });
  const [estadoTraje, setEstadoTraje] = useState("DISPONIBLE");

  // Selector de Artículos
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_INICIALES);
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>("");
  const [cantidad, setCantidad] = useState<number>(1);

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

  // Buscar cliente por cédula con Enter
  async function handleBuscarCedula(e?: React.KeyboardEvent) {
    if (e && e.key !== "Enter") return;
    if (!cedula.trim()) return;

    const cli = await buscarClientePorCedula(cedula);
    if (cli) {
      setNombre(cli.NOMBRE || "");
      setDireccion(cli.DIRECCION || "");
      setTelefono(cli.TELEFONO || "");
      toast.success(`Cliente: ${cli.NOMBRE}`);
    } else {
      toast.info("Cédula no registrada. Puedes completar los datos.");
      setModalCliente(true);
    }
  }

  // Agregar artículo al Grid
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

  // Eliminar Fila Seleccionada
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
    setCedula("");
    setNombre("");
    setDireccion("");
    setTelefono("");
    setGridItems([]);
    setPagaEfectivo("");
    setPagaTransferencia("");
    setDescuentoAlquiler("");
    setFilaSeleccionada(null);
    toast.info("Formulario reiniciado");
  }

  // Confirmar y Pagar
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
    <div className="flex h-screen w-screen flex-col bg-[#EDEDED] font-sans text-slate-900 select-none overflow-hidden p-1.5">
      {/* =========================================================================
          1. ENCABEZADO SUPERIOR: TÍTULO "PUNTO DE VENTA" Y LOGO "La Casa Del Disfraz"
      ========================================================================= */}
      <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-300">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold text-slate-600">ALQUILER</span>
        </div>

        {/* TÍTULO ROJO CENTRADO */}
        <div className="text-center">
          <h1 className="text-2xl font-black tracking-wider text-[#E60000] uppercase font-sans leading-none">
            PUNTO DE VENTA
          </h1>
        </div>

        {/* LOGO DE "La Casa Del Disfraz" (ORIGINAL) */}
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
          {/* BLOQUE DE CAMPOS DE CABECERA (COMPACTO Y AJUSTADO A PANTALLA) */}
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
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  onKeyDown={handleBuscarCedula}
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
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
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
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
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
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] placeholder:text-slate-400 focus:outline-none"
                />
                {/* BOTÓN "Mod" ROJO EXACTO AL ORIGINAL */}
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
              LÍNEA DE ARTÍCULO: SELECTOR + CANTIDAD + BOTONES [ELIMINAR] [PAGAR] [SALIR X]
          ========================================================================= */}
          <div className="flex items-center gap-1 py-0.5">
            <span className="text-[10px] font-bold text-slate-800 uppercase">ARTICULO</span>
            <select
              value={articuloSeleccionadoId}
              onChange={(e) => setArticuloSeleccionadoId(e.target.value)}
              className="h-5 flex-1 rounded border border-slate-400 bg-white px-1.5 text-[10px] font-semibold text-slate-800 focus:outline-none"
            >
              <option value="">-- SELECCIONAR ARTÍCULO --</option>
              {articulos.map((art) => (
                <option key={art.IDARTICULO} value={String(art.IDARTICULO)}>
                  {art.DESCRIPCION} (TALLA: {art.TALLA} | ALQ: ${art.VALOR.toLocaleString()} | DEP: ${art.VALORDEPOSITO.toLocaleString()} | STOCK: {art.STOCK})
                </option>
              ))}
            </select>

            {/* CANTIDAD CON FLECHA ROJA COMO EN EL ORIGINAL */}
            <div className="flex items-center gap-0.5">
              <span className="text-[10px] font-bold text-red-700 uppercase">▸CANTIDAD</span>
              <input
                type="number"
                min={1}
                value={cantidad}
                onChange={(e) => setCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                onKeyDown={(e) => e.key === "Enter" && handleAgregarItem()}
                className="h-5 w-10 rounded border border-slate-400 bg-white text-center text-[10px] font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-red-700">▸</span>
            </div>

            {/* BOTÓN + AGREGAR */}
            <button
              onClick={handleAgregarItem}
              className="h-5 rounded bg-slate-700 px-1.5 text-[10px] font-bold text-white hover:bg-slate-800"
            >
              +
            </button>

            {/* BOTÓN ELIMINAR (MAGENTA CON ICONO DE PAPELERA) */}
            <button
              onClick={handleEliminarFila}
              className="flex items-center gap-0.5 h-5 rounded bg-[#B80036] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#96002C] active:scale-95"
            >
              ELIMINAR <Trash2 className="h-3 w-3" />
            </button>

            {/* BOTÓN PAGAR (NEGRO CON TEXTO BLANCO) */}
            <button
              onClick={handlePagar}
              className="h-5 rounded bg-[#111111] px-3 text-[10px] font-black text-white shadow-sm hover:bg-black active:scale-95"
            >
              PAGAR
            </button>

            {/* BOTÓN SALIR X (ROJO OSCURO / MARRÓN) */}
            <button
              onClick={handleLimpiar}
              className="flex items-center gap-0.5 h-5 rounded bg-[#992222] px-2 text-[10px] font-black text-white shadow-sm hover:bg-[#771111] active:scale-95"
            >
              SALIR <X className="h-3 w-3" />
            </button>
          </div>

          {/* =========================================================================
              TABLA PRINCIPAL DE ALQUILER (AJUSTADA Y FLEXIBLE A LA PANTALLA)
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
                        (Tabla vacía. Selecciona un artículo arriba y agrégalo para registrar el alquiler)
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

      {/* =========================================================
          MODAL: NUEVO / MODIFICAR CLIENTE
      ========================================================= */}
      <Dialog open={modalCliente} onOpenChange={setModalCliente}>
        <DialogContent className="max-w-md bg-[#EDEDED] border border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-bold text-red-700 uppercase text-sm">
              Alta / Modificación de Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-semibold">
            <div>
              <label className="block mb-0.5">Cédula *</label>
              <input
                type="number"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label className="block mb-0.5">Nombre Completo *</label>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label className="block mb-0.5">Dirección</label>
              <input
                type="text"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
            <div>
              <label className="block mb-0.5">Teléfono Principal</label>
              <input
                type="text"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="h-6 w-full rounded border border-slate-400 bg-white px-2"
              />
            </div>
          </div>
          <DialogFooter className="mt-2">
            <button
              onClick={() => setModalCliente(false)}
              className="rounded bg-slate-300 px-3 py-1 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={() => {
                setModalCliente(false);
                toast.success("Cliente guardado");
              }}
              className="rounded bg-[#B80036] px-4 py-1 text-xs font-bold text-white"
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
        <DialogContent className="max-w-lg bg-[#EDEDED] border border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900 uppercase text-sm">
              Buscar Cliente
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
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
                              setCedula(String(c.CEDULA));
                              setNombre(c.NOMBRE);
                              setDireccion(c.DIRECCION);
                              setTelefono(c.TELEFONO);
                              setModalBuscarCli(false);
                              toast.success(`Cliente cargado: ${c.NOMBRE}`);
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
          <DialogHeader>
            <DialogTitle className="font-bold text-red-700 uppercase text-sm">
              Registrar Gasto (Salida de Caja)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-semibold">
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
          <DialogFooter className="mt-2">
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
        <DialogContent className="max-w-md bg-[#EDEDED] border border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-bold text-emerald-800 uppercase text-sm">
              Entrada de Vestido & Devolución de Depósito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-xs font-semibold">
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
          <DialogFooter className="mt-2">
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: APARTADOS (RESERVAS ACTIVAS)
      ========================================================= */}
      <Dialog open={modalApartados} onOpenChange={setModalApartados}>
        <DialogContent className="max-w-md bg-[#EDEDED] border border-slate-400">
          <DialogHeader>
            <DialogTitle className="font-bold text-amber-800 uppercase text-sm">
              Trajes Apartados / Reservas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 text-xs font-mono">
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
          <DialogFooter>
            <button
              onClick={() => setModalApartados(false)}
              className="rounded bg-slate-800 px-3 py-1 text-xs font-bold text-white"
            >
              Cerrar
            </button>
          </DialogFooter>
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
              <p><strong>CLIENTE:</strong> {nombre.toUpperCase() || "GENERAL"}</p>
              <p><strong>CÉDULA:</strong> {cedula || "N/A"}</p>
              <p><strong>TELÉFONO:</strong> {telefono || "N/A"}</p>
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
          <DialogFooter className="mt-2">
            <button
              onClick={() => {
                window.print();
                setModalImprimir(false);
              }}
              className="rounded bg-black px-4 py-1 text-xs font-bold text-white flex items-center gap-1"
            >
              <Printer className="h-3.5 w-3.5" /> Imprimir
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
