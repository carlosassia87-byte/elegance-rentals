import React, { useState, useEffect, useMemo } from "react";
import {
  Activity,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  Printer,
  X,
  Package,
  CheckCircle2,
  Clock,
  Shirt,
  User,
  Phone,
  ArrowRight,
  TrendingUp,
  DollarSign,
  AlertCircle,
  ExternalLink,
  MessageCircle,
  ShieldAlert,
  CalendarDays,
  Sparkles,
  Layers,
  ArrowDownLeft,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  consultarMovimientos,
  marcarTrajeDevuelto,
  guardarEstadoPrendaOverride,
  type OperacionClienteMovimiento,
  type ItemMovimiento,
  type EstadoPrenda,
  type ResumenMetricasMovimientos,
} from "@/services/movimientosService";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface MovimientosTrajesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaConfig;
}

export function MovimientosTrajesModal({
  open,
  onOpenChange,
  empresa,
}: MovimientosTrajesModalProps) {
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filtros de fecha marcando el día en curso por defecto
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [filtroEstado, setFiltroEstado] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState<string>("");
  const [cargando, setCargando] = useState(false);

  // Datos
  const [operaciones, setOperaciones] = useState<OperacionClienteMovimiento[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<OperacionClienteMovimiento | null>(null);
  const [metricas, setMetricas] = useState<ResumenMetricasMovimientos>({
    totalOperaciones: 0,
    totalPrendasEnAlquiler: 0,
    totalPrendasDevueltas: 0,
    totalPrendasEnBodega: 0,
    totalPrendasVenta: 0,
    totalPrendasApartadas: 0,
    totalDineroAlquiler: 0,
    totalDineroDepositos: 0,
    totalSaldoPorCobrar: 0,
  });

  const cargarDatos = async () => {
    setCargando(true);
    try {
      const res = await consultarMovimientos({
        fechaInicio,
        fechaFin,
        estado: filtroEstado,
        busqueda,
      });

      setOperaciones(res.operaciones);
      setMetricas(res.metricas);

      // Mantener seleccionado o seleccionar el primero
      if (res.operaciones.length > 0) {
        setClienteSeleccionado((prev) => {
          if (!prev) return res.operaciones[0];
          const found = res.operaciones.find((op) => op.numeroFact === prev.numeroFact);
          return found || res.operaciones[0];
        });
      } else {
        setClienteSeleccionado(null);
      }
    } catch (err) {
      console.error("Error consultando movimientos de trajes:", err);
      toast.error("Error al cargar los movimientos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, fechaInicio, fechaFin, filtroEstado]);

  // Manejo de presets rápidos de fecha
  const setPresetHoy = () => {
    setFechaInicio(hoyStr);
    setFechaFin(hoyStr);
  };

  const setPresetSemana = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFechaInicio(d.toISOString().split("T")[0]);
    setFechaFin(hoyStr);
  };

  const setPresetMes = () => {
    const d = new Date();
    d.setDate(1);
    setFechaInicio(d.toISOString().split("T")[0]);
    setFechaFin(hoyStr);
  };

  const setPresetTodo = () => {
    setFechaInicio("");
    setFechaFin("");
  };

  // Acción rápida de devolver traje a tienda
  const handleDevolverTraje = async (item: ItemMovimiento) => {
    const ok = await marcarTrajeDevuelto(item.numeroFact, item.codigoBarras, item.descripcion);
    if (ok) {
      toast.success(`Traje "${item.descripcion}" marcado como DEVUELTO A TIENDA`);
      await cargarDatos();
    } else {
      toast.error("No se pudo actualizar el estado");
    }
  };

  // Cambio manual de estado de una prenda
  const handleCambiarEstadoPrenda = async (item: ItemMovimiento, nuevoEstado: EstadoPrenda) => {
    guardarEstadoPrendaOverride(item.numeroFact, item.codigoBarras, item.descripcion, nuevoEstado);
    toast.info(`Estado cambiado a ${nuevoEstado}`);
    await cargarDatos();
  };

  const getBadgeEstadoPrenda = (estado: EstadoPrenda) => {
    switch (estado) {
      case "EN ALQUILER":
        return "bg-amber-100 text-amber-900 border-amber-300 font-extrabold";
      case "DEVUELTO A TIENDA":
        return "bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold";
      case "EN BODEGA":
        return "bg-sky-100 text-sky-900 border-sky-300 font-extrabold";
      case "VENTA":
        return "bg-purple-100 text-purple-900 border-purple-300 font-extrabold";
      case "ABONO / APARTADO":
        return "bg-orange-100 text-orange-900 border-orange-300 font-extrabold";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300 font-bold";
    }
  };

  const abrirWhatsApp = (telefono: string, cliente: string, factura: string) => {
    const cleanPhone = telefono.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      toast.warning("El cliente no tiene un teléfono válido registrado");
      return;
    }
    const texto = encodeURIComponent(
      `Hola ${cliente}, te saludamos de ${empresa?.nombreComercial || "La Casa del Disfraz"}. Te escribimos con respecto a tu alquiler de traje con recibo #${factura}.`
    );
    window.open(`https://wa.me/57${cleanPhone}?text=${texto}`, "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900 h-[92vh] flex flex-col">
        {/* =========================================================================
            1. CABECERA MODERNA CON TÍTULO Y BADGE
        ========================================================================= */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-wide uppercase">
                  CONTROL DE MOVIMIENTOS Y ESTADO DE TRAJES
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">
                  Auditoría en Tiempo Real
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Consulta y audita el estado de cada prenda (En Alquiler, En Bodega, Venta, Abono o Devuelto) por cliente y rango de fecha
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 px-3 text-xs font-bold transition-all"
              title="Imprimir Reporte"
            >
              <Printer className="h-4 w-4" /> Imprimir
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            2. BARRA DE FILTROS, RANGO DE FECHAS Y BUSCADOR
        ========================================================================= */}
        <div className="bg-white border-b border-slate-200/90 p-4 space-y-3 shrink-0 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* RANGO DE FECHAS */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
                <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700 text-[11px] uppercase">Desde:</span>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  className="bg-transparent font-black text-slate-900 focus:outline-none text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs">
                <Calendar className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-700 text-[11px] uppercase">Hasta:</span>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  className="bg-transparent font-black text-slate-900 focus:outline-none text-xs"
                />
              </div>

              {/* Botones de presets rápidos */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={setPresetHoy}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    fechaInicio === hoyStr && fechaFin === hoyStr
                      ? "bg-emerald-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  Hoy (Día en Curso)
                </button>
                <button
                  type="button"
                  onClick={setPresetSemana}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  7 Días
                </button>
                <button
                  type="button"
                  onClick={setPresetMes}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Este Mes
                </button>
                <button
                  type="button"
                  onClick={setPresetTodo}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                >
                  Historial Completo
                </button>
              </div>
            </div>

            {/* BUSCADOR UNIVERSAL Y BOTÓN RECALCULAR */}
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && cargarDatos()}
                  placeholder="Buscar por cliente, cédula, factura o traje..."
                  className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                />
              </div>

              <button
                type="button"
                onClick={cargarDatos}
                disabled={cargando}
                className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-900 px-3 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-emerald-400" : ""}`} />
                <span>Actualizar</span>
              </button>
            </div>
          </div>

          {/* FILTRO RÁPIDO POR ESTADO (CHIPS / TABS) */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-black uppercase text-slate-500 mr-1 flex items-center gap-1">
              <Filter className="h-3 w-3" /> Filtrar Estado:
            </span>

            {[
              { id: "TODOS", label: "Todos los Estados", badge: operaciones.length },
              { id: "EN ALQUILER", label: "👗 En Alquiler (Prestado)", badge: metricas.totalPrendasEnAlquiler },
              { id: "DEVUELTO A TIENDA", label: "✅ Devuelto a Tienda", badge: metricas.totalPrendasDevueltas },
              { id: "EN BODEGA", label: "🏢 En Bodega / Stock", badge: metricas.totalPrendasEnBodega },
              { id: "ABONO / APARTADO", label: "⏳ Apartado / Abono", badge: metricas.totalPrendasApartadas },
              { id: "VENTA", label: "🛍️ Venta Definitiva", badge: metricas.totalPrendasVenta },
            ].map((tab) => {
              const active = filtroEstado === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFiltroEstado(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black transition-all ${
                    active
                      ? "bg-slate-900 text-white shadow-xs ring-2 ring-emerald-500"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                      active ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* =========================================================================
            3. TARJETAS DE MÉTRICAS / KPIS RESUMEN COMPACTAS
        ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 px-4 py-2 shrink-0 bg-slate-100/80 border-b border-slate-200">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase">Clientes / Ops</span>
            <span className="text-sm font-black text-slate-900">{metricas.totalOperaciones}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-black text-amber-900 uppercase flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" /> En Alquiler
            </span>
            <span className="text-sm font-black text-amber-800">{metricas.totalPrendasEnAlquiler}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-black text-emerald-900 uppercase flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Devueltos
            </span>
            <span className="text-sm font-black text-emerald-800">{metricas.totalPrendasDevueltas}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-orange-50/80 px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-black text-orange-900 uppercase">Apartados</span>
            <span className="text-sm font-black text-orange-800">{metricas.totalPrendasApartadas}</span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-blue-200 bg-blue-50/80 px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-black text-blue-900 uppercase">Alquileres</span>
            <span className="text-xs font-black text-blue-800 font-mono">
              ${metricas.totalDineroAlquiler.toLocaleString("es-CO")}
            </span>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50/80 px-3 py-1.5 shadow-2xs">
            <span className="text-[10px] font-black text-rose-900 uppercase">Por Cobrar</span>
            <span className="text-xs font-black text-rose-700 font-mono">
              ${metricas.totalSaldoPorCobrar.toLocaleString("es-CO")}
            </span>
          </div>
        </div>

        {/* =========================================================================
            4. VISTA DUAL MASTER-DETAIL: TABLA 1 (CLIENTES) & TABLA 2 (TRAJES)
        ========================================================================= */}
        <div className="flex-1 grid grid-cols-12 gap-3 p-3 min-h-0 overflow-hidden">
          {/* TABLA 1: LISTADO DE CLIENTES Y FACTURAS (COL-SPAN-5) */}
          <div className="col-span-12 lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900 px-4 py-2.5 text-white shrink-0">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-emerald-400" />
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Tabla 1: Clientes ({operaciones.length})
                </h3>
              </div>
              <span className="text-[10px] text-slate-300 font-semibold">
                Clic para ver prendas
              </span>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {operaciones.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                  <Shirt className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-slate-600">No hay movimientos en este rango</p>
                  <p className="text-xs text-slate-400 mt-1">Prueba cambiando el rango de fechas o los filtros</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2">Factura</th>
                      <th className="p-2">Fecha</th>
                      <th className="p-2">Cliente</th>
                      <th className="p-2 text-center">Prendas</th>
                      <th className="p-2 text-right">Total</th>
                      <th className="p-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {operaciones.map((op) => {
                      const esSeleccionado = clienteSeleccionado?.numeroFact === op.numeroFact;
                      const tieneSaldo = op.saldoPendiente > 0;
                      const cantPrendas = op.items.reduce((acc, it) => acc + it.cantidad, 0);

                      return (
                        <tr
                          key={op.numeroFact}
                          onClick={() => setClienteSeleccionado(op)}
                          className={`cursor-pointer transition-colors ${
                            esSeleccionado
                              ? "bg-emerald-50/90 font-bold border-l-4 border-l-emerald-600 shadow-2xs"
                              : "hover:bg-slate-50"
                          }`}
                        >
                          <td className="p-2">
                            <span className="font-black text-emerald-800 bg-emerald-100/80 px-1.5 py-0.5 rounded border border-emerald-200 text-[10px]">
                              {op.numeroFact}
                            </span>
                          </td>
                          <td className="p-2 text-slate-600 font-semibold whitespace-nowrap text-[11px]">
                            {op.fechaSalida}
                          </td>
                          <td className="p-2">
                            <div className="font-black text-slate-900 uppercase line-clamp-1 text-[11px]">{op.clienteNombre}</div>
                            <div className="text-[9px] text-slate-500 font-semibold flex items-center gap-1 mt-0.5">
                              <span>CC: {op.clienteCedula}</span>
                              {op.clienteTelefono && op.clienteTelefono !== "—" && (
                                <>
                                  <span>•</span>
                                  <span>{op.clienteTelefono}</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px]">
                              {cantPrendas}
                            </span>
                          </td>
                          <td className="p-2 text-right font-black text-slate-900 text-[11px]">
                            ${op.totalAlquiler.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2 text-right">
                            {tieneSaldo ? (
                              <span className="font-black text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200 text-[9px] whitespace-nowrap">
                                Debe ${op.saldoPendiente.toLocaleString("es-CO")}
                              </span>
                            ) : (
                              <span className="font-bold text-emerald-700 text-[9px]">Al día</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* TABLA 2: DETALLE DE TRAJES QUE LLEVA EL CLIENTE SELECCIONADO EN TABLA CON OPCIONES (COL-SPAN-7) */}
          <div className="col-span-12 lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shirt className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-black uppercase tracking-wider">
                    Tabla 2: Trajes y Estado de Cada Prenda
                  </h3>
                </div>
                {clienteSeleccionado && (
                  <span className="text-[11px] font-black text-emerald-300 uppercase">
                    Recibo #{clienteSeleccionado.numeroFact}
                  </span>
                )}
              </div>

              {clienteSeleccionado && (
                <div className="mt-1.5 pt-1.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-300">Cliente: </span>
                    <strong className="text-white uppercase">{clienteSeleccionado.clienteNombre}</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    {clienteSeleccionado.clienteTelefono && clienteSeleccionado.clienteTelefono !== "—" && (
                      <button
                        type="button"
                        onClick={() =>
                          abrirWhatsApp(
                            clienteSeleccionado.clienteTelefono,
                            clienteSeleccionado.clienteNombre,
                            clienteSeleccionado.numeroFact
                          )
                        }
                        className="flex items-center gap-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 px-2 py-0.5 text-[10px] font-black text-white transition-all shadow-xs"
                      >
                        <MessageCircle className="h-3 w-3" /> WhatsApp
                      </button>
                    )}
                    <span className="text-[10px] text-slate-300">
                      Fecha Entrega: <strong className="text-white">{clienteSeleccionado.fechaEntregaPactada}</strong>
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {!clienteSeleccionado ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                  <Package className="h-12 w-12 text-slate-300 mb-2" />
                  <p className="font-bold text-sm text-slate-600">Selecciona un cliente a la izquierda</p>
                  <p className="text-xs text-slate-400 mt-1">Verás la tabla completa de trajes con opciones de gestión</p>
                </div>
              ) : clienteSeleccionado.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400">
                  <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
                  <p className="font-bold text-sm text-slate-700">Sin prendas detalladas registradas</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                    <tr>
                      <th className="p-2">Cód</th>
                      <th className="p-2">Descripción de la Prenda</th>
                      <th className="p-2 text-center">Talla</th>
                      <th className="p-2 text-center">Cant</th>
                      <th className="p-2 text-right">Alquiler</th>
                      <th className="p-2 text-right">Depósito</th>
                      <th className="p-2 text-center">Estado Prenda</th>
                      <th className="p-2 text-right">Opciones / Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {clienteSeleccionado.items.map((item, idx) => {
                      const estaEnAlquiler = item.estadoPrenda === "EN ALQUILER";

                      return (
                        <tr
                          key={item.id || idx}
                          className="hover:bg-slate-50 transition-colors"
                        >
                          <td className="p-2 font-mono text-[10px] font-bold text-slate-600 whitespace-nowrap">
                            {item.codigoBarras || "S/C"}
                          </td>
                          <td className="p-2 max-w-[220px]">
                            <div className="font-black text-slate-900 uppercase text-[11px] line-clamp-2">
                              {item.descripcion}
                            </div>
                            {item.fechaDevolucionReal && (
                              <div className="text-[9px] text-emerald-700 font-semibold mt-0.5">
                                Devuelto: {new Date(item.fechaDevolucionReal).toLocaleDateString("es-CO")}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center font-black text-slate-800">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-[9px]">
                              {item.talla}
                            </span>
                          </td>
                          <td className="p-2 text-center font-black text-slate-900">
                            {item.cantidad}
                          </td>
                          <td className="p-2 text-right font-black text-slate-900 font-mono text-[11px]">
                            ${item.valorAlquiler.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2 text-right font-black text-emerald-800 font-mono text-[11px]">
                            ${item.valorDeposito.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2 text-center whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] ${getBadgeEstadoPrenda(
                                item.estadoPrenda
                              )}`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-current" />
                              {item.estadoPrenda}
                            </span>
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {estaEnAlquiler && (
                                <button
                                  type="button"
                                  onClick={() => handleDevolverTraje(item)}
                                  title="Marcar como Devuelto a Tienda"
                                  className="flex items-center gap-1 h-6.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2 text-[10px] font-black text-white shadow-2xs transition-all active:scale-95"
                                >
                                  <CheckCircle2 className="h-3 w-3" /> Devolver
                                </button>
                              )}

                              <select
                                value={item.estadoPrenda}
                                onChange={(e) =>
                                  handleCambiarEstadoPrenda(item, e.target.value as EstadoPrenda)
                                }
                                title="Cambiar estado de la prenda"
                                className="h-6.5 rounded-lg border border-slate-300 bg-white px-1.5 text-[9px] font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                              >
                                <option value="EN ALQUILER">EN ALQUILER</option>
                                <option value="DEVUELTO A TIENDA">DEVUELTO A TIENDA</option>
                                <option value="EN BODEGA">EN BODEGA</option>
                                <option value="VENTA">VENTA</option>
                                <option value="ABONO / APARTADO">ABONO / APARTADO</option>
                              </select>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {clienteSeleccionado.items.length > 1 && (
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-black text-slate-800 text-[10px]">
                      <tr>
                        <td colSpan={3} className="p-2 text-right uppercase text-slate-500">
                          Totales de esta Factura:
                        </td>
                        <td className="p-2 text-center">
                          {clienteSeleccionado.items.reduce((a, b) => a + b.cantidad, 0)}
                        </td>
                        <td className="p-2 text-right font-mono">
                          ${clienteSeleccionado.items.reduce((a, b) => a + b.valorAlquiler * b.cantidad, 0).toLocaleString("es-CO")}
                        </td>
                        <td className="p-2 text-right font-mono text-emerald-800">
                          ${clienteSeleccionado.items.reduce((a, b) => a + b.valorDeposito * b.cantidad, 0).toLocaleString("es-CO")}
                        </td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. PIE DEL MODAL CON ACCIÓN DE CIERRE
        ========================================================================= */}
        <div className="flex items-center justify-between bg-slate-50 px-6 py-3.5 border-t border-slate-200 shrink-0">
          <div className="text-xs text-slate-600">
            Mostrando <strong>{operaciones.length}</strong> operaciones registradas en el rango seleccionado
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-6 text-xs font-bold uppercase shadow-2xs transition-all"
          >
            Cerrar Módulo
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
