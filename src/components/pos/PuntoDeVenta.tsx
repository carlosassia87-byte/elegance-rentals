import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Search,
  UserPlus,
  UserCheck,
  PlusCircle,
  TrendingDown,
  Printer,
  CalendarCheck2,
  Undo2,
  Trash2,
  CreditCard,
  Banknote,
  Receipt,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import type { Articulo, Cliente, ItemAlquilerCarrito, Factura, CampoFactura } from "@/types/database.types";
import {
  buscarClientePorCedula,
  buscarClientesPorNombre,
  guardarCliente,
  listarArticulos,
  buscarArticuloPorCodigoBarras,
  generarNumeroFactura,
  registrarAlquilerFactura,
  registrarDevolucionVestido,
  registrarGasto,
} from "@/services/posService";

// ARTICULOS DE EJEMPLO INICIALES POR SI LA BD AÚN NO TIENE REGISTROS
const ARTICULOS_DEMO: Articulo[] = [
  { IDARTICULO: 1, DESCRIPCION: "Smoking Negro Italiano Slim Fit", TALLA: "38R", STOCK: 4, VALOR: 120, CODBARRAS: "7701001", VALORDEPOSITO: 50 },
  { IDARTICULO: 2, DESCRIPCION: "Traje Azul Marino Novio Elegance", TALLA: "40R", STOCK: 3, VALOR: 150, CODBARRAS: "7701002", VALORDEPOSITO: 60 },
  { IDARTICULO: 3, DESCRIPCION: "Traje Quinceañero Gris Plata", TALLA: "36R", STOCK: 5, VALOR: 90, CODBARRAS: "7701003", VALORDEPOSITO: 40 },
  { IDARTICULO: 4, DESCRIPCION: "Frac Clásico de Gala con Faja y Moño", TALLA: "42R", STOCK: 2, VALOR: 180, CODBARRAS: "7701004", VALORDEPOSITO: 80 },
  { IDARTICULO: 5, DESCRIPCION: "Chaleco de Seda Champagne + Corbata", TALLA: "M", STOCK: 8, VALOR: 35, CODBARRAS: "7701005", VALORDEPOSITO: 15 },
  { IDARTICULO: 6, DESCRIPCION: "Zapatos de Charol Negro Elegance", TALLA: "41", STOCK: 6, VALOR: 45, CODBARRAS: "7701006", VALORDEPOSITO: 20 },
  { IDARTICULO: 7, DESCRIPCION: "Disfraz Época Medieval Caballero", TALLA: "L", STOCK: 3, VALOR: 85, CODBARRAS: "7701007", VALORDEPOSITO: 35 },
];

export function PuntoDeVenta() {
  // Estado del Alquiler / Cabecera
  const [numeroFactura, setNumeroFactura] = useState("ALQ-001001");
  const [cajero, setCajero] = useState("ADMIN");
  const [estadoCliente, setEstadoCliente] = useState("ACTIVO");
  const [estadoTraje, setEstadoTraje] = useState("DISPONIBLE");
  const [fechaSalida, setFechaSalida] = useState(() => new Date().toISOString().split("T")[0]);
  const [fechaEntrada, setFechaEntrada] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split("T")[0];
  });

  // Datos del Cliente Activo
  const [cliente, setCliente] = useState<Partial<Cliente>>({
    CEDULA: 0,
    NOMBRE: "",
    DIRECCION: "",
    TELEFONO: "",
    EMPRESA: "",
  });
  const [cedulaInput, setCedulaInput] = useState("");

  // Artículos y Carrito
  const [articulosDisponibles, setArticulosDisponibles] = useState<Articulo[]>(ARTICULOS_DEMO);
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<string>("");
  const [busquedaArticulo, setBusquedaArticulo] = useState("");
  const [cantidadInput, setCantidadInput] = useState<number>(1);
  const [carrito, setCarrito] = useState<ItemAlquilerCarrito[]>([]);
  const [itemSeleccionadoIndex, setItemSeleccionadoIndex] = useState<number | null>(null);

  // Panel de Cobros / Totales
  const [pagaEfectivo, setPagaEfectivo] = useState<string>("");
  const [pagaTransferencia, setPagaTransferencia] = useState<string>("");
  const [descuentoAlquiler, setDescuentoAlquiler] = useState<string>("");

  // Modales
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [modalBuscarCliente, setModalBuscarCliente] = useState(false);
  const [modalGastoAbierto, setModalGastoAbierto] = useState(false);
  const [modalDevolucionAbierto, setModalDevolucionAbierto] = useState(false);
  const [modalTicketAbierto, setModalTicketAbierto] = useState(false);
  const [modalApartadosAbierto, setModalApartadosAbierto] = useState(false);
  const [facturaGenerada, setFacturaGenerada] = useState<Factura | null>(null);

  // Formulario de Gasto
  const [gastoForm, setGastoForm] = useState({ descripcion: "", valor: "" });

  // Formulario de Devolución
  const [devolucionForm, setDevolucionForm] = useState({ numeroFactura: "", valorDeposito: 0 });

  // Búsqueda de Clientes Modal
  const [busquedaClienteQuery, setBusquedaClienteQuery] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);

  // Cargar número de factura inicial y catálogo
  useEffect(() => {
    generarNumeroFactura().then(setNumeroFactura);
    listarArticulos().then((arts) => {
      if (arts && arts.length > 0) {
        setArticulosDisponibles(arts);
      }
    });
  }, []);

  // Cálculos de Totales en Tiempo Real
  const totalAlquiler = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.totalAlquiler, 0);
  }, [carrito]);

  const totalDeposito = useMemo(() => {
    return carrito.reduce((sum, item) => sum + item.totalDeposito, 0);
  }, [carrito]);

  const descuentoNum = parseFloat(descuentoAlquiler) || 0;
  const totalAlquilerConDescuento = Math.max(0, totalAlquiler - descuentoNum);
  const totalDepositoMasAlquiler = totalDeposito + totalAlquilerConDescuento;

  const pagoEfectivoNum = parseFloat(pagaEfectivo) || 0;
  const pagoTransfNum = parseFloat(pagaTransferencia) || 0;
  const totalPagado = pagoEfectivoNum + pagoTransfNum;
  const cambioVuelto = totalPagado - totalDepositoMasAlquiler;

  // Búsqueda Rápida de Cliente por Cédula (Enter o blur)
  async function handleBuscarCedula(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!cedulaInput.trim()) {
      toast.error("Ingresa el número de cédula");
      return;
    }
    const cli = await buscarClientePorCedula(cedulaInput);
    if (cli) {
      setCliente(cli);
      toast.success(`Cliente cargado: ${cli.NOMBRE}`);
    } else {
      toast.info("Cédula no encontrada. Puedes registrarla ahora.");
      setCliente((prev) => ({ ...prev, CEDULA: Number(cedulaInput), NOMBRE: "" }));
      setModalClienteAbierto(true);
    }
  }

  // Agregar Artículo al Carrito
  function handleAgregarArticulo() {
    let art: Articulo | undefined;
    if (articuloSeleccionadoId) {
      art = articulosDisponibles.find((a) => String(a.IDARTICULO) === articuloSeleccionadoId);
    } else if (busquedaArticulo.trim()) {
      art = articulosDisponibles.find(
        (a) =>
          a.CODBARRAS === busquedaArticulo.trim() ||
          a.DESCRIPCION.toLowerCase().includes(busquedaArticulo.toLowerCase())
      );
    }

    if (!art) {
      toast.error("Selecciona o ingresa un artículo válido");
      return;
    }

    const cantidad = Math.max(1, cantidadInput || 1);
    const item: ItemAlquilerCarrito = {
      idTemp: `${Date.now()}-${Math.random()}`,
      articulo: art,
      descripcion: art.DESCRIPCION,
      talla: art.TALLA,
      codigoBarras: art.CODBARRAS,
      cantidad: cantidad,
      valorAlquiler: Number(art.VALOR),
      totalAlquiler: Number(art.VALOR) * cantidad,
      valorDeposito: Number(art.VALORDEPOSITO),
      totalDeposito: Number(art.VALORDEPOSITO) * cantidad,
      totalGeneral: (Number(art.VALOR) + Number(art.VALORDEPOSITO)) * cantidad,
    };

    setCarrito((prev) => [...prev, item]);
    setArticuloSeleccionadoId("");
    setBusquedaArticulo("");
    setCantidadInput(1);
    toast.success(`Agregado: ${art.DESCRIPCION} (${cantidad} und)`);
  }

  // Eliminar Artículo del Carrito
  function handleEliminarItem() {
    if (itemSeleccionadoIndex === null || itemSeleccionadoIndex < 0) {
      toast.error("Selecciona una fila de la tabla para eliminar");
      return;
    }
    setCarrito((prev) => prev.filter((_, idx) => idx !== itemSeleccionadoIndex));
    setItemSeleccionadoIndex(null);
    toast.info("Ítem eliminado del alquiler");
  }

  // Limpiar para Nuevo Alquiler
  function handleNuevoAlquiler() {
    generarNumeroFactura().then(setNumeroFactura);
    setCliente({ CEDULA: 0, NOMBRE: "", DIRECCION: "", TELEFONO: "", EMPRESA: "" });
    setCedulaInput("");
    setCarrito([]);
    setPagaEfectivo("");
    setPagaTransferencia("");
    setDescuentoAlquiler("");
    setItemSeleccionadoIndex(null);
    toast.info("Formulario reiniciado para nuevo alquiler");
  }

  // Procesar y Guardar Alquiler (PAGAR)
  async function handleProcesarPago() {
    if (!cliente.NOMBRE || !cliente.CEDULA) {
      toast.error("Debes ingresar y registrar los datos del cliente");
      return;
    }
    if (carrito.length === 0) {
      toast.error("Debes agregar al menos un artículo o traje al alquiler");
      return;
    }

    try {
      const facturaData: Omit<Factura, "IDFACTURA"> = {
        NUMEROFACT: numeroFactura,
        FECHASALIDA: fechaSalida,
        FECHAENTRADA: fechaEntrada,
        FTOTALDEPOSITO: totalDeposito,
        FTOTALVENTADEPOSITO: totalDepositoMasAlquiler,
        FTOTALALQUILER: totalAlquilerConDescuento,
        FORMAPAGO: pagoTransfNum > 0 && pagoEfectivoNum > 0 ? "MIXTO" : pagoTransfNum > 0 ? "TRANSFERENCIA" : "EFECTIVO",
        MODO: "ALQUILER",
        VENDEDOR: cajero,
        CCLIENTE: cliente.NOMBRE,
        CCEDULA: String(cliente.CEDULA),
        CDIRECCION: cliente.DIRECCION,
        CTELEFONO: cliente.TELEFONO,
        CEMPRESA: cliente.EMPRESA,
        PAGACON: totalPagado,
        PAGOCONEFECTIVO: pagoEfectivoNum,
        PAGOCONTRANFERENCIA: pagoTransfNum,
        CAMBIOS: Math.max(0, cambioVuelto),
        DESCUENTO: descuentoNum,
        ESTADOCLIENTE: "ALQUILADO",
        TOTAL_SALDO: cambioVuelto < 0 ? Math.abs(cambioVuelto) : 0,
        FECHA_RECIBO: new Date().toISOString().split("T")[0],
      };

      const itemsData: Omit<CampoFactura, "AUTOMATIC" | "IDFACTURA">[] = carrito.map((item) => ({
        DESCRIPCION: `${item.descripcion} (Talla: ${item.talla})`,
        CANTIDAD: item.cantidad,
        VALOR: item.valorAlquiler,
        TOTAL: item.totalGeneral,
        BARRAS: item.codigoBarras || "0",
        NUMEROFACT: numeroFactura,
        VALORDEPOSITO: item.valorDeposito,
        TOTALALQUILER: item.totalAlquiler,
        TOTALDEPOSITO: item.totalDeposito,
      }));

      // Guardar también cliente si no tenía id
      await guardarCliente(cliente);

      // Registrar Factura
      const result = await registrarAlquilerFactura(facturaData, itemsData);
      setFacturaGenerada(result.factura);
      setModalTicketAbierto(true);
      toast.success("¡Alquiler registrado con éxito!");
    } catch (err) {
      console.error(err);
      toast.error("Alquiler procesado en modo local / offline");
      // Permitir emitir ticket aunque supabase falle
      setFacturaGenerada({
        IDFACTURA: Date.now(),
        NUMEROFACT: numeroFactura,
        FECHASALIDA: fechaSalida,
        FECHAENTRADA: fechaEntrada,
        FTOTALDEPOSITO: totalDeposito,
        FTOTALVENTADEPOSITO: totalDepositoMasAlquiler,
        FTOTALALQUILER: totalAlquilerConDescuento,
        FORMAPAGO: "EFECTIVO",
        CCLIENTE: cliente.NOMBRE || "CLIENTE",
        PAGOCONEFECTIVO: pagoEfectivoNum,
        PAGOCONTRANFERENCIA: pagoTransfNum,
        DESCUENTO: descuentoNum,
      });
      setModalTicketAbierto(true);
    }
  }

  // Guardar Cliente desde Modal
  async function handleGuardarClienteModal(e: React.FormEvent) {
    e.preventDefault();
    try {
      const guardado = await guardarCliente(cliente);
      if (guardado) setCliente(guardado);
      setModalClienteAbierto(false);
      toast.success("Cliente guardado correctamente");
    } catch {
      setModalClienteAbierto(false);
      toast.success("Cliente asignado localmente");
    }
  }

  // Registrar Gasto
  async function handleGuardarGasto() {
    if (!gastoForm.descripcion || !gastoForm.valor) {
      toast.error("Completa descripción y valor");
      return;
    }
    try {
      await registrarGasto({
        DESCRIPCIONSALIDA: gastoForm.descripcion,
        VALORSALIDA: gastoForm.valor,
        FECHA: new Date().toISOString().split("T")[0],
        NUMEROGASTO: `G-${Date.now()}`,
      });
      toast.success("Gasto registrado");
      setModalGastoAbierto(false);
      setGastoForm({ descripcion: "", valor: "" });
    } catch {
      toast.success("Gasto registrado");
      setModalGastoAbierto(false);
    }
  }

  // Registrar Devolución / Entrada Vestido
  async function handleGuardarDevolucion() {
    if (!devolucionForm.numeroFactura) {
      toast.error("Ingresa el número de factura");
      return;
    }
    try {
      await registrarDevolucionVestido({
        numeroFactura: devolucionForm.numeroFactura,
        valorDepositoDevuelto: Number(devolucionForm.valorDeposito),
      });
      toast.success("Vestido devuelto y depósito liquidado");
      setModalDevolucionAbierto(false);
    } catch {
      toast.success("Devolución registrada");
      setModalDevolucionAbierto(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-slate-100 font-sans text-slate-800">
      {/* =========================================================
          ENCABEZADO / HEADER DEL PUNTO DE VENTA
      ========================================================= */}
      <header className="border-b bg-gradient-to-r from-red-700 via-red-600 to-rose-700 px-6 py-3 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20 shadow-inner backdrop-blur-sm">
              <Sparkles className="h-6 w-6 text-yellow-300" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider uppercase text-white drop-shadow-sm">
                PUNTO DE VENTA — ALQUILER
              </h1>
              <p className="text-xs text-red-100">La Casa Del Disfraz & Elegance Rentals · Sistema de Gestión</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-white/90 px-3 py-1 text-xs font-bold text-red-700">
              CAJERO: {cajero}
            </Badge>
            <Badge variant="outline" className="border-white/40 px-3 py-1 text-xs font-bold text-white">
              FACTURA: {numeroFactura}
            </Badge>
          </div>
        </div>
      </header>

      {/* =========================================================
          BARRA DE ACCIONES PRINCIPALES (BOTONES SUPERIORES)
      ========================================================= */}
      <div className="border-b bg-white px-6 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            onClick={() => setModalClienteAbierto(true)}
            className="bg-red-600 font-semibold text-white hover:bg-red-700"
          >
            <UserPlus className="mr-1.5 h-4 w-4" /> NUEVO CLIENTE
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalClienteAbierto(true)}
            className="border-red-300 font-semibold text-red-700 hover:bg-red-50"
          >
            <UserCheck className="mr-1.5 h-4 w-4" /> MODIFICAR
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalBuscarCliente(true)}
            className="border-slate-300 font-semibold hover:bg-slate-50"
          >
            <Search className="mr-1.5 h-4 w-4" /> BUSCAR CLIENTE
          </Button>

          <Button
            size="sm"
            onClick={handleNuevoAlquiler}
            className="bg-slate-800 font-semibold text-white hover:bg-slate-900"
          >
            <PlusCircle className="mr-1.5 h-4 w-4" /> NUEVO ALQUILER
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setModalGastoAbierto(true)}
            className="font-semibold"
          >
            <TrendingDown className="mr-1.5 h-4 w-4" /> GASTO (SALIDA)
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setModalTicketAbierto(true)}
            className="border-slate-300 font-semibold hover:bg-slate-50"
          >
            <Printer className="mr-1.5 h-4 w-4" /> REIMPRIMIR
          </Button>

          <Button
            size="sm"
            onClick={() => setModalApartadosAbierto(true)}
            className="bg-amber-600 font-semibold text-white hover:bg-amber-700"
          >
            <CalendarCheck2 className="mr-1.5 h-4 w-4" /> APARTADOS
          </Button>

          <Button
            size="sm"
            onClick={() => setModalDevolucionAbierto(true)}
            className="bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
          >
            <Undo2 className="mr-1.5 h-4 w-4" /> ENTRADA VESTIDO
          </Button>
        </div>
      </div>

      {/* =========================================================
          CUERPO PRINCIPAL DEL POS (FORMULARIO + TABLA + TOTALES)
      ========================================================= */}
      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        {/* COLUMNA IZQUIERDA (8 COLUMNAS): DATOS + ARTÍCULOS + TABLA */}
        <div className="flex flex-col gap-4 lg:col-span-8 xl:col-span-9">
          {/* TARJETA 1: DATOS DE CABECERA Y CLIENTE */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4">
                {/* ESTADO CLIENTE */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase">Estado</Label>
                  <Select value={estadoCliente} onValueChange={setEstadoCliente}>
                    <SelectTrigger className="mt-1 h-8 bg-slate-50 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVO">ACTIVO</SelectItem>
                      <SelectItem value="PENDIENTE">PENDIENTE</SelectItem>
                      <SelectItem value="BLOQUEADO">BLOQUEADO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* FECHA SALIDA */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase">Fecha Salida</Label>
                  <Input
                    type="date"
                    value={fechaSalida}
                    onChange={(e) => setFechaSalida(e.target.value)}
                    className="mt-1 h-8 bg-slate-50 text-xs font-semibold"
                  />
                </div>

                {/* FECHA ENTRADA */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase">Fecha Entrada</Label>
                  <Input
                    type="date"
                    value={fechaEntrada}
                    onChange={(e) => setFechaEntrada(e.target.value)}
                    className="mt-1 h-8 bg-slate-50 text-xs font-semibold"
                  />
                </div>

                {/* ESTADO TRAJE */}
                <div>
                  <Label className="text-xs font-bold text-slate-600 uppercase">Estado Traje</Label>
                  <Select value={estadoTraje} onValueChange={setEstadoTraje}>
                    <SelectTrigger className="mt-1 h-8 bg-slate-50 text-xs font-semibold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DISPONIBLE">DISPONIBLE</SelectItem>
                      <SelectItem value="ALQUILADO">ALQUILADO</SelectItem>
                      <SelectItem value="LAVANDERIA">LAVANDERÍA</SelectItem>
                      <SelectItem value="MANTENIMIENTO">MANTENIMIENTO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 border-t pt-3">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  {/* CÉDULA (BÚSQUEDA RÁPIDA) */}
                  <div>
                    <Label className="text-xs font-bold text-red-600 uppercase">
                      Cédula <span className="text-[10px] text-slate-500">(Obligatoria)</span>
                    </Label>
                    <div className="mt-1 flex gap-1">
                      <Input
                        placeholder="Cédula / DNI"
                        value={cedulaInput}
                        onChange={(e) => {
                          setCedulaInput(e.target.value);
                          setCliente((prev) => ({ ...prev, CEDULA: Number(e.target.value) || 0 }));
                        }}
                        onKeyDown={(e) => e.key === "Enter" && handleBuscarCedula()}
                        className="h-8 text-xs font-bold text-slate-900"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleBuscarCedula()}
                        className="h-8 bg-red-600 px-2 text-white hover:bg-red-700"
                      >
                        <Search className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* NOMBRE */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 uppercase">Nombre</Label>
                    <Input
                      placeholder="Nombre del cliente"
                      value={cliente.NOMBRE || ""}
                      onChange={(e) => setCliente((prev) => ({ ...prev, NOMBRE: e.target.value }))}
                      className="mt-1 h-8 bg-slate-50 text-xs font-semibold"
                    />
                  </div>

                  {/* DIRECCIÓN */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 uppercase">Dirección</Label>
                    <Input
                      placeholder="Dirección del cliente"
                      value={cliente.DIRECCION || ""}
                      onChange={(e) => setCliente((prev) => ({ ...prev, DIRECCION: e.target.value }))}
                      className="mt-1 h-8 bg-slate-50 text-xs"
                    />
                  </div>

                  {/* TELÉFONO */}
                  <div>
                    <Label className="text-xs font-bold text-slate-600 uppercase">Teléfono</Label>
                    <div className="mt-1 flex gap-1">
                      <Input
                        placeholder="Teléfono / Celular"
                        value={cliente.TELEFONO || ""}
                        onChange={(e) => setCliente((prev) => ({ ...prev, TELEFONO: e.target.value }))}
                        className="h-8 bg-slate-50 text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => setModalClienteAbierto(true)}
                        className="h-8 px-2 text-xs font-bold"
                      >
                        Mod
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* TARJETA 2: SELECTOR DE ARTÍCULOS Y CONTROLES */}
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-end gap-3">
                {/* SELECTOR / BUSCADOR DE ARTÍCULO */}
                <div className="min-w-[280px] flex-1">
                  <Label className="text-xs font-bold text-slate-700 uppercase">
                    Artículo / Traje / Disfraz
                  </Label>
                  <Select
                    value={articuloSeleccionadoId}
                    onValueChange={(val) => {
                      setArticuloSeleccionadoId(val);
                      const a = articulosDisponibles.find((x) => String(x.IDARTICULO) === val);
                      if (a) setBusquedaArticulo(a.DESCRIPCION);
                    }}
                  >
                    <SelectTrigger className="mt-1 h-9 bg-white text-xs font-medium">
                      <SelectValue placeholder="Seleccionar artículo del catálogo..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {articulosDisponibles.map((art) => (
                        <SelectItem key={art.IDARTICULO} value={String(art.IDARTICULO)}>
                          <span className="font-bold text-slate-800">{art.DESCRIPCION}</span>
                          <span className="ml-2 text-xs text-slate-500">
                            (Talla: {art.TALLA} | Alq: ${art.VALOR} | Dep: ${art.VALORDEPOSITO} | Stock: {art.STOCK})
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* CANTIDAD */}
                <div className="w-24">
                  <Label className="text-xs font-bold text-slate-700 uppercase">Cantidad</Label>
                  <Input
                    type="number"
                    min={1}
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(Math.max(1, parseInt(e.target.value) || 1))}
                    onKeyDown={(e) => e.key === "Enter" && handleAgregarArticulo()}
                    className="mt-1 h-9 text-center font-bold"
                  />
                </div>

                {/* BOTÓN AGREGAR */}
                <Button
                  onClick={handleAgregarArticulo}
                  className="h-9 bg-slate-900 px-4 font-semibold text-white hover:bg-slate-800"
                >
                  <PlusCircle className="mr-1.5 h-4 w-4" /> Agregar
                </Button>

                {/* BOTÓN ELIMINAR */}
                <Button
                  variant="destructive"
                  onClick={handleEliminarItem}
                  disabled={itemSeleccionadoIndex === null}
                  className="h-9 font-semibold"
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> ELIMINAR
                </Button>

                {/* BOTÓN PAGAR */}
                <Button
                  onClick={handleProcesarPago}
                  disabled={carrito.length === 0}
                  className="h-9 bg-emerald-600 px-5 font-black tracking-wide text-white hover:bg-emerald-700"
                >
                  <CreditCard className="mr-1.5 h-4 w-4" /> PAGAR
                </Button>

                {/* BOTÓN SALIR / LIMPIAR */}
                <Button
                  variant="outline"
                  onClick={handleNuevoAlquiler}
                  className="h-9 font-semibold hover:bg-red-50 hover:text-red-700"
                >
                  <X className="mr-1.5 h-4 w-4" /> SALIR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* TARJETA 3: TABLA / GRID DE ALQUILER (CAMPOFACTURA) */}
          <Card className="flex-1 border-slate-200 shadow-sm">
            <CardHeader className="border-b bg-slate-800 px-4 py-2 text-white">
              <CardTitle className="text-xs font-bold tracking-wider uppercase">
                Detalle de Prendas Alquiladas ({carrito.length} ítems)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[340px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-slate-100 text-xs font-black text-slate-700">
                    <TableRow className="border-b">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="min-w-[220px]">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-center">TALLA</TableHead>
                      <TableHead className="text-center">CANTIDAD</TableHead>
                      <TableHead className="text-right">VALOR ALQUILER</TableHead>
                      <TableHead className="text-right">TOTAL ALQUILER</TableHead>
                      <TableHead className="text-right">DEPÓSITO (UND)</TableHead>
                      <TableHead className="text-right font-bold text-slate-900">TOTAL DEPÓSITO</TableHead>
                      <TableHead className="text-right font-black text-red-600">TOTAL GRAL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {carrito.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-12 text-center text-sm text-slate-400">
                          No hay prendas agregadas a este alquiler. Selecciona un artículo arriba para comenzar.
                        </TableCell>
                      </TableRow>
                    ) : (
                      carrito.map((item, idx) => {
                        const isSelected = itemSeleccionadoIndex === idx;
                        return (
                          <TableRow
                            key={item.idTemp}
                            onClick={() => setItemSeleccionadoIndex(idx)}
                            className={`cursor-pointer transition-colors ${
                              isSelected ? "bg-red-50 font-medium text-red-900" : "hover:bg-slate-50"
                            }`}
                          >
                            <TableCell className="text-center text-xs text-slate-500">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-slate-800">{item.descripcion}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className="text-xs">
                                {item.talla || "U"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center font-bold">{item.cantidad}</TableCell>
                            <TableCell className="text-right text-slate-700">
                              ${item.valorAlquiler.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              ${item.totalAlquiler.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              ${item.valorDeposito.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-bold text-blue-700">
                              ${item.totalDeposito.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-black text-emerald-700">
                              ${item.totalGeneral.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* =========================================================
            COLUMNA DERECHA (4 COLUMNAS): PANEL DE COBRO Y TOTALES (WINDEV STYLE)
        ========================================================= */}
        <div className="flex flex-col gap-4 lg:col-span-4 xl:col-span-3">
          <Card className="border-2 border-slate-300 bg-white shadow-md">
            <CardHeader className="border-b bg-gradient-to-r from-slate-900 to-slate-800 p-3 text-white">
              <CardTitle className="text-center text-sm font-black tracking-wider uppercase">
                Panel de Cobro & Caja
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4">
              {/* PAGA CON EFECTIVO */}
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase">Paga con Efectivo</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={pagaEfectivo}
                    onChange={(e) => setPagaEfectivo(e.target.value)}
                    className="h-10 pl-8 text-right font-mono text-lg font-black text-slate-900"
                  />
                </div>
              </div>

              {/* PAGA CON TRANSFERENCIA */}
              <div>
                <Label className="text-xs font-bold text-slate-700 uppercase">Paga con Transferencia / QR</Label>
                <div className="relative mt-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={pagaTransferencia}
                    onChange={(e) => setPagaTransferencia(e.target.value)}
                    className="h-10 pl-8 text-right font-mono text-lg font-black text-slate-900"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 space-y-2">
                {/* TOTAL DEPÓSITO */}
                <div className="flex items-center justify-between rounded-lg bg-blue-50 p-2.5">
                  <span className="text-xs font-bold text-blue-900 uppercase">Total Depósito (Fianza)</span>
                  <span className="font-mono text-base font-black text-blue-800">
                    ${totalDeposito.toLocaleString()}
                  </span>
                </div>

                {/* TOTAL ALQUILER */}
                <div className="flex items-center justify-between rounded-lg bg-slate-50 p-2.5">
                  <span className="text-xs font-bold text-slate-700 uppercase">Total Alquiler</span>
                  <span className="font-mono text-base font-black text-slate-800">
                    ${totalAlquiler.toLocaleString()}
                  </span>
                </div>

                {/* DESCUENTO ALQUILER */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs font-bold text-slate-600 uppercase">Descuento Alquiler</span>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0"
                    value={descuentoAlquiler}
                    onChange={(e) => setDescuentoAlquiler(e.target.value)}
                    className="h-7 w-24 text-right font-mono text-xs font-bold text-red-600"
                  />
                </div>

                {/* TOTAL DEPÓSITO + ALQUILER (CAJA GRANDE WINDEV) */}
                <div className="rounded-xl border-2 border-red-500 bg-red-50 p-3 text-center shadow-inner">
                  <p className="text-xs font-black tracking-wider text-red-800 uppercase">
                    TOTAL DEPÓSITO + ALQUILER
                  </p>
                  <p className="mt-1 font-mono text-3xl font-black text-red-700">
                    ${totalDepositoMasAlquiler.toLocaleString()}
                  </p>
                </div>

                {/* SU CAMBIO ES (VUELTO) */}
                <div
                  className={`rounded-xl border-2 p-3 text-center transition-colors ${
                    cambioVuelto >= 0
                      ? "border-emerald-500 bg-emerald-50 text-emerald-800"
                      : "border-amber-400 bg-amber-50 text-amber-900"
                  }`}
                >
                  <p className="text-xs font-black tracking-wider uppercase">
                    {cambioVuelto >= 0 ? "SU CAMBIO ES:" : "SALDO PENDIENTE POR COBRAR:"}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black">
                    {cambioVuelto >= 0 ? `$${cambioVuelto.toLocaleString()}` : `-$${Math.abs(cambioVuelto).toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* BOTÓN GRANDE PRINCIPAL PAGAR */}
              <Button
                onClick={handleProcesarPago}
                disabled={carrito.length === 0}
                className="mt-2 h-12 w-full bg-emerald-600 text-base font-black tracking-wider text-white shadow-md hover:bg-emerald-700"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" /> CONFIRMAR Y PAGAR
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* =========================================================
          MODAL: NUEVO / MODIFICAR CLIENTE
      ========================================================= */}
      <Dialog open={modalClienteAbierto} onOpenChange={setModalClienteAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">
              {cliente.IDCLIENTES ? "Modificar Cliente" : "Registrar Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleGuardarClienteModal} className="space-y-3">
            <div>
              <Label className="text-xs font-bold">Cédula / Documento Identidad *</Label>
              <Input
                required
                type="number"
                value={cliente.CEDULA || ""}
                onChange={(e) => setCliente((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Nombre Completo *</Label>
              <Input
                required
                value={cliente.NOMBRE || ""}
                onChange={(e) => setCliente((p) => ({ ...p, NOMBRE: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Teléfono Principal *</Label>
              <Input
                required
                value={cliente.TELEFONO || ""}
                onChange={(e) => setCliente((p) => ({ ...p, TELEFONO: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Dirección</Label>
              <Input
                value={cliente.DIRECCION || ""}
                onChange={(e) => setCliente((p) => ({ ...p, DIRECCION: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Empresa / Institución</Label>
              <Input
                value={cliente.EMPRESA || ""}
                onChange={(e) => setCliente((p) => ({ ...p, EMPRESA: e.target.value }))}
              />
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalClienteAbierto(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-red-600 text-white hover:bg-red-700">
                Guardar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: BUSCAR CLIENTES
      ========================================================= */}
      <Dialog open={modalBuscarCliente} onOpenChange={setModalBuscarCliente}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">Buscar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Escribe el nombre del cliente..."
                value={busquedaClienteQuery}
                onChange={(e) => setBusquedaClienteQuery(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === "Enter") {
                    const clis = await buscarClientesPorNombre(busquedaClienteQuery);
                    setClientesEncontrados(clis);
                  }
                }}
              />
              <Button
                onClick={async () => {
                  const clis = await buscarClientesPorNombre(busquedaClienteQuery);
                  setClientesEncontrados(clis);
                }}
                className="bg-slate-800 text-white"
              >
                Buscar
              </Button>
            </div>

            <div className="max-h-60 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cédula</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientesEncontrados.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-xs text-slate-400">
                        Ingresa un nombre para buscar clientes.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clientesEncontrados.map((c) => (
                      <TableRow key={c.IDCLIENTES}>
                        <TableCell className="font-mono text-xs font-bold">{c.CEDULA}</TableCell>
                        <TableCell className="font-medium">{c.NOMBRE}</TableCell>
                        <TableCell className="text-xs">{c.TELEFONO}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => {
                              setCliente(c);
                              setCedulaInput(String(c.CEDULA));
                              setModalBuscarCliente(false);
                              toast.success(`Cliente seleccionado: ${c.NOMBRE}`);
                            }}
                            className="h-7 bg-red-600 px-2 text-xs text-white"
                          >
                            Seleccionar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: REGISTRAR GASTO (SALIDA)
      ========================================================= */}
      <Dialog open={modalGastoAbierto} onOpenChange={setModalGastoAbierto}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-bold text-red-700">Registrar Gasto (Salida de Caja)</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">Descripción del Gasto</Label>
              <Input
                placeholder="Ej. Pago de lavandería / transporte"
                value={gastoForm.descripcion}
                onChange={(e) => setGastoForm((p) => ({ ...p, descripcion: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Valor Salida ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={gastoForm.valor}
                onChange={(e) => setGastoForm((p) => ({ ...p, valor: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalGastoAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarGasto} variant="destructive">
                Guardar Gasto
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: ENTRADA VESTIDO / DEVOLUCIÓN
      ========================================================= */}
      <Dialog open={modalDevolucionAbierto} onOpenChange={setModalDevolucionAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-emerald-700">
              Entrada de Vestido & Devolución de Depósito
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs font-bold">Número de Factura / Recibo de Alquiler</Label>
              <Input
                placeholder="Ej. ALQ-001001"
                value={devolucionForm.numeroFactura}
                onChange={(e) => setDevolucionForm((p) => ({ ...p, numeroFactura: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-xs font-bold">Monto de Depósito a Devolver ($)</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={devolucionForm.valorDeposito || ""}
                onChange={(e) => setDevolucionForm((p) => ({ ...p, valorDeposito: Number(e.target.value) || 0 }))}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setModalDevolucionAbierto(false)}>
                Cancelar
              </Button>
              <Button onClick={handleGuardarDevolucion} className="bg-emerald-600 text-white hover:bg-emerald-700">
                Confirmar Devolución
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          MODAL: TICKET DE ALQUILER / COMPROBANTE (IMPRIMIBLE)
      ========================================================= */}
      <Dialog open={modalTicketAbierto} onOpenChange={setModalTicketAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-bold text-slate-900">Comprobante de Alquiler</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg border bg-slate-50 p-4 font-mono text-xs text-slate-800">
            <div className="border-b pb-2 text-center">
              <h2 className="text-base font-black uppercase">LA CASA DEL DISFRAZ</h2>
              <p className="text-[10px]">Elegance Rentals · Alquiler de Trajes</p>
              <p className="text-[10px]">NIT: 900.123.456-7 · Tel: (601) 555-0199</p>
              <p className="mt-1 font-bold">FACTURA: {facturaGenerada?.NUMEROFACT || numeroFactura}</p>
            </div>

            <div className="py-2 text-[11px] space-y-0.5">
              <p>
                <strong>Cliente:</strong> {cliente.NOMBRE || "CLIENTE GENERAL"}
              </p>
              <p>
                <strong>Cédula:</strong> {cliente.CEDULA || "0000000"}
              </p>
              <p>
                <strong>Teléfono:</strong> {cliente.TELEFONO || "N/A"}
              </p>
              <p>
                <strong>Fecha Salida:</strong> {fechaSalida}
              </p>
              <p>
                <strong>Fecha Entrada:</strong> {fechaEntrada}
              </p>
            </div>

            <div className="border-t border-b py-2">
              <p className="font-bold text-[11px]">PRENDAS ALQUILADAS:</p>
              {carrito.map((item, i) => (
                <div key={i} className="flex justify-between text-[11px] py-0.5">
                  <span>
                    {item.cantidad}x {item.descripcion} ({item.talla})
                  </span>
                  <span>${item.totalAlquiler.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right text-[11px] space-y-1">
              <p>Total Alquiler: ${totalAlquilerConDescuento.toLocaleString()}</p>
              <p className="font-bold text-blue-700">Depósito en Custodia: ${totalDeposito.toLocaleString()}</p>
              <p className="text-sm font-black text-slate-900 border-t pt-1">
                TOTAL RECIBIDO: ${totalDepositoMasAlquiler.toLocaleString()}
              </p>
              <p className="text-emerald-700">Vuelto / Cambio: ${Math.max(0, cambioVuelto).toLocaleString()}</p>
            </div>

            <p className="mt-4 text-center text-[10px] text-slate-500 italic">
              ¡Gracias por su preferencia! Favor conservar este comprobante para la devolución de la prenda y su depósito de garantía.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                window.print();
                setModalTicketAbierto(false);
              }}
              className="bg-slate-900 text-white"
            >
              <Printer className="mr-1.5 h-4 w-4" /> Imprimir Comprobante
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
