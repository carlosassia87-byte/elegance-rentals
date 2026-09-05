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
  ShoppingBag,
  Wallet,
  AlertTriangle,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  consultarMovimientos,
  type OperacionClienteMovimiento,
  type ItemMovimiento,
  type EstadoPrenda,
  type ResumenMetricasMovimientos,
} from "@/services/movimientosService";
import { DevolucionTrajesModal } from "./DevolucionTrajesModal";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface MovimientosTrajesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaConfig;
  cajeroNombre?: string;
}

type SubmoduloTipo = "POR_DEVOLVER" | "VENDIDOS" | "DEVUELTOS" | "APARTADOS";

export function MovimientosTrajesModal({
  open,
  onOpenChange,
  empresa,
  cajeroNombre = "ADMINISTRADOR",
}: MovimientosTrajesModalProps) {
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Submódulo activo
  const [submoduloActivo, setSubmoduloActivo] = useState<SubmoduloTipo>("POR_DEVOLVER");

  // Filtros de fecha marcando el día en curso por defecto
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [busqueda, setBusqueda] = useState<string>("");
  const [cargando, setCargando] = useState(false);

  // Modal de Devolución integrado
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [facturaADevolver, setFacturaADevolver] = useState("");

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
        estado: "TODOS",
        busqueda,
      });

      setOperaciones(res.operaciones);
      setMetricas(res.metricas);

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
      console.error("Error consultando movimientos:", err);
      toast.error("Error al cargar los movimientos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, fechaInicio, fechaFin]);

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

  // Filtrado por submódulos
  const operacionesPorDevolver = useMemo(() => {
    return operaciones.filter((op) =>
      op.items.some((it) => it.estadoPrenda === "EN ALQUILER")
    );
  }, [operaciones]);

  const operacionesVendidos = useMemo(() => {
    return operaciones.filter(
      (op) => op.tipoOperacion === "VENTA" || op.items.some((it) => it.estadoPrenda === "VENTA")
    );
  }, [operaciones]);

  const operacionesDevueltos = useMemo(() => {
    return operaciones.filter((op) =>
      op.items.some((it) => it.estadoPrenda === "DEVUELTO A TIENDA")
    );
  }, [operaciones]);

  const operacionesApartados = useMemo(() => {
    return operaciones.filter(
      (op) =>
        op.tipoOperacion === "APARTADO / ABONO" ||
        op.items.some((it) => it.estadoPrenda === "ABONO / APARTADO" || it.estadoPrenda === "EN BODEGA")
    );
  }, [operaciones]);

  // Depósitos que todavía falta devolver a los clientes
  const totalDepositosPorDevolver = useMemo(() => {
    let sum = 0;
    operacionesPorDevolver.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "EN ALQUILER") {
          sum += (it.valorDeposito * it.cantidad);
        }
      });
    });
    return sum;
  }, [operacionesPorDevolver]);

  // Depósitos ya devueltos
  const totalDepositosYaDevueltos = useMemo(() => {
    let sum = 0;
    operacionesDevueltos.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "DEVUELTO A TIENDA") {
          sum += (it.valorDeposito * it.cantidad);
        }
      });
    });
    return sum;
  }, [operacionesDevueltos]);

  const abrirDevolucionFactura = (numFact: string) => {
    setFacturaADevolver(numFact);
    setModalDevolucionOpen(true);
  };

  const abrirWhatsApp = (telefono: string, cliente: string, factura: string) => {
    const cleanPhone = telefono.replace(/\D/g, "");
    if (!cleanPhone || cleanPhone.length < 7) {
      toast.warning("El cliente no tiene un teléfono válido registrado");
      return;
    }
    const texto = encodeURIComponent(
      `Hola ${cliente}, te saludamos de ${empresa?.nombreComercial || "La Casa del Disfraz"}. Te escribimos con respecto a tu alquiler con recibo #${factura}.`
    );
    window.open(`https://wa.me/57${cleanPhone}?text=${texto}`, "_blank");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-[#F8FAFC] p-0 text-slate-900 shadow-2xl sm:h-[92vh] sm:w-[96vw] sm:max-w-[96vw] sm:rounded-2xl sm:border lg:max-w-[1400px]">
          {/* =========================================================================
              1. CABECERA PRINCIPAL
          ========================================================================= */}
          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 bg-slate-900 px-3 py-3 text-white sm:flex sm:items-center sm:justify-between sm:px-6">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
                <Activity className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="min-w-0 sm:flex sm:items-center sm:gap-2">
                  <h2 className="text-sm font-black tracking-wide uppercase">
                    AUDITORÍA & CONTROL DE TRAJES POR SUB-MÓDULOS
                  </h2>
                  <span className="hidden rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30 sm:inline-block">
                    Detallado y Clasificado
                  </span>
                </div>
                <p className="hidden text-[11px] text-slate-300 sm:block">
                  Consulta separada de trajes por devolver, vendidos, devueltos y balance de depósitos pendientes
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => {
                  setFacturaADevolver("");
                  setModalDevolucionOpen(true);
                }}
                className="hidden items-center gap-1.5 h-8 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-3.5 text-xs font-black transition-all shadow-xs sm:flex"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Devolución de Traje & Depósito
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="hidden items-center gap-1.5 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 px-3 text-xs font-bold transition-all sm:flex"
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
              2. BARRA DE FILTROS DE FECHA Y BUSCADOR
          ========================================================================= */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-200 bg-white px-3 py-2.5 shadow-2xs sm:px-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* RANGO DE FECHAS */}
              <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
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

                {/* Presets */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={setPresetHoy}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                      fechaInicio === hoyStr && fechaFin === hoyStr
                        ? "bg-emerald-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    Hoy
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
                    Todo
                  </button>
                </div>
              </div>

              {/* BUSCADOR */}
              <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md sm:flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && cargarDatos()}
                    placeholder="Buscar por cliente, cédula, factura o traje..."
                    className="h-8.5 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={cargarDatos}
                  disabled={cargando}
                  className="flex items-center gap-1.5 h-8.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-3 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-emerald-400" : ""}`} />
                  <span>Actualizar</span>
                </button>
              </div>
            </div>

            {/* =========================================================================
                3. PESTAÑAS DE SUB-MÓDULOS BIEN ORGANIZADOS (NO REVUELTO)
            ========================================================================= */}
            <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-200 pt-1">
              <button
                type="button"
                onClick={() => setSubmoduloActivo("POR_DEVOLVER")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  submoduloActivo === "POR_DEVOLVER"
                    ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50"
                    : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                <span>👗 Trajes por Devolver (En Alquiler)</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    submoduloActivo === "POR_DEVOLVER" ? "bg-black/20 text-white" : "bg-amber-200 text-amber-950"
                  }`}
                >
                  {metricas.totalPrendasEnAlquiler}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubmoduloActivo("VENDIDOS")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  submoduloActivo === "VENDIDOS"
                    ? "bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/50"
                    : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
                }`}
              >
                <span>🛍️ Trajes Vendidos</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    submoduloActivo === "VENDIDOS" ? "bg-black/20 text-white" : "bg-purple-200 text-purple-950"
                  }`}
                >
                  {metricas.totalPrendasVenta}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubmoduloActivo("DEVUELTOS")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  submoduloActivo === "DEVUELTOS"
                    ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                <span>✅ Historial de Devueltos a Tienda</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    submoduloActivo === "DEVUELTOS" ? "bg-black/20 text-white" : "bg-emerald-200 text-emerald-950"
                  }`}
                >
                  {metricas.totalPrendasDevueltas}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setSubmoduloActivo("APARTADOS")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                  submoduloActivo === "APARTADOS"
                    ? "bg-orange-600 text-white shadow-sm ring-2 ring-orange-400/50"
                    : "bg-orange-50 text-orange-900 border border-orange-200 hover:bg-orange-100"
                }`}
              >
                <span>⏳ Apartados / En Bodega</span>
                <span
                  className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                    submoduloActivo === "APARTADOS" ? "bg-black/20 text-white" : "bg-orange-200 text-orange-950"
                  }`}
                >
                  {metricas.totalPrendasApartadas}
                </span>
              </button>
            </div>
          </div>

          {/* =========================================================================
              4. CONTENIDO DEL SUB-MÓDULO ACTIVO
          ========================================================================= */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:overflow-hidden sm:p-3.5">
            {/* -------------------------------------------------------------------
                SUB-MÓDULO 1: TRAJES POR DEVOLVER (EN ALQUILER)
            ------------------------------------------------------------------- */}
            {submoduloActivo === "POR_DEVOLVER" && (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                {/* Ribbon informativo de Depósitos que falta devolver */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/90 border border-amber-200 p-3 rounded-2xl shadow-2xs shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-amber-200 text-amber-900 flex items-center justify-center font-black">
                      <Shirt className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-amber-800">Prendas en poder del Cliente</span>
                      <div className="text-xl font-black text-amber-950 font-mono">{metricas.totalPrendasEnAlquiler} prendas</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 border-x border-amber-200/80 px-4">
                    <div className="h-10 w-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-black">
                      <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800">
                        DINERO DE DEPÓSITOS POR DEVOLVER
                      </span>
                      <div className="text-xl font-black text-emerald-900 font-mono">
                        ${totalDepositosPorDevolver.toLocaleString("es-CO")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pl-2">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-600">Clientes Pendientes</span>
                      <div className="text-lg font-black text-slate-900">{operacionesPorDevolver.length} Facturas</div>
                    </div>
                    <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                      Usa el botón "Devolver" para reintegrar depósito
                    </span>
                  </div>
                </div>

                {/* Tabla Dual: Clientes y Prendas */}
                <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 sm:overflow-hidden">
                  <div className="col-span-12 lg:col-span-6 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">
                        Clientes con Alquiler Activo ({operacionesPorDevolver.length})
                      </span>
                      <span className="text-[10px] text-slate-300 font-semibold">Selecciona para ver prendas</span>
                    </div>

                    <div className="flex-1 overflow-auto custom-scrollbar">
                      {operacionesPorDevolver.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">
                          No hay trajes pendientes de devolución en este rango de fecha
                        </div>
                      ) : (
                        <table className="min-w-[620px] w-full text-left text-xs border-collapse">
                          <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                            <tr>
                              <th className="p-2">Factura</th>
                              <th className="p-2">Cliente</th>
                              <th className="p-2">Fecha Pactada</th>
                              <th className="p-2 text-right">Depósito Fianza</th>
                              <th className="p-2 text-center">Acción</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {operacionesPorDevolver.map((op) => {
                              const esSel = clienteSeleccionado?.numeroFact === op.numeroFact;
                              const depOp = op.items
                                .filter((it) => it.estadoPrenda === "EN ALQUILER")
                                .reduce((acc, it) => acc + it.valorDeposito * it.cantidad, 0);

                              return (
                                <tr
                                  key={op.numeroFact}
                                  onClick={() => setClienteSeleccionado(op)}
                                  className={`cursor-pointer transition-colors ${
                                    esSel ? "bg-amber-50 font-bold border-l-4 border-l-amber-500" : "hover:bg-slate-50"
                                  }`}
                                >
                                  <td className="p-2">
                                    <span className="font-black text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded text-[10px]">
                                      {op.numeroFact}
                                    </span>
                                  </td>
                                  <td className="p-2">
                                    <div className="font-black text-slate-900 uppercase text-[11px] truncate max-w-[150px]">
                                      {op.clienteNombre}
                                    </div>
                                    <div className="text-[9px] text-slate-500 font-semibold">CC: {op.clienteCedula}</div>
                                  </td>
                                  <td className="p-2 font-semibold text-slate-700 text-[11px]">{op.fechaEntregaPactada}</td>
                                  <td className="p-2 text-right font-mono font-black text-emerald-800 text-[11px]">
                                    ${depOp.toLocaleString("es-CO")}
                                  </td>
                                  <td className="p-2 text-center">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        abrirDevolucionFactura(op.numeroFact);
                                      }}
                                      className="flex items-center gap-1 h-6 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2 text-[10px] font-black shadow-2xs transition-all mx-auto whitespace-nowrap"
                                    >
                                      <RotateCcw className="h-3 w-3" /> Devolver
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>

                  {/* Tabla 2: Detalle de Prendas que lleva el cliente */}
                  <div className="col-span-12 lg:col-span-6 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                    <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0 flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider">
                        Prendas Prestadas del Cliente {clienteSeleccionado ? `(#${clienteSeleccionado.numeroFact})` : ""}
                      </span>
                      {clienteSeleccionado && (
                        <button
                          type="button"
                          onClick={() => abrirDevolucionFactura(clienteSeleccionado.numeroFact)}
                          className="flex items-center gap-1 h-6 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-2.5 text-[10px] font-black transition-all"
                        >
                          <RotateCcw className="h-3 w-3" /> Procesar Devolución de Factura
                        </button>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {!clienteSeleccionado ? (
                        <div className="p-8 text-center text-slate-400 font-bold text-xs">
                          Selecciona una factura a la izquierda para ver el detalle de sus prendas
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                            <tr>
                              <th className="p-2">Cód</th>
                              <th className="p-2">Descripción</th>
                              <th className="p-2 text-center">Talla</th>
                              <th className="p-2 text-center">Cant</th>
                              <th className="p-2 text-right">Alquiler</th>
                              <th className="p-2 text-right">Depósito Fianza</th>
                              <th className="p-2 text-center">Estado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {clienteSeleccionado.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-2 font-mono text-[10px] text-slate-600 font-bold">{item.codigoBarras || "S/C"}</td>
                                <td className="p-2 font-black text-slate-900 uppercase text-[11px]">{item.descripcion}</td>
                                <td className="p-2 text-center font-bold text-slate-800">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[9px]">{item.talla}</span>
                                </td>
                                <td className="p-2 text-center font-black text-slate-900">{item.cantidad}</td>
                                <td className="p-2 text-right font-mono font-bold">${item.valorAlquiler.toLocaleString("es-CO")}</td>
                                <td className="p-2 text-right font-mono font-black text-teal-800">${item.valorDeposito.toLocaleString("es-CO")}</td>
                                <td className="p-2 text-center">
                                  <span
                                    className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                                      item.estadoPrenda === "EN ALQUILER"
                                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                                        : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                                    }`}
                                  >
                                    {item.estadoPrenda}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------------
                SUB-MÓDULO 2: TRAJES VENDIDOS (VENTA DEFINITIVA)
            ------------------------------------------------------------------- */}
            {submoduloActivo === "VENDIDOS" && (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between bg-purple-50 border border-purple-200 p-3 rounded-2xl shadow-2xs shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-purple-200 text-purple-900 flex items-center justify-center font-black">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-purple-800">Total Trajes / Artículos Vendidos</span>
                      <div className="text-xl font-black text-purple-950 font-mono">{metricas.totalPrendasVenta} unidades vendidas</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-purple-800">Total Ingresos por Ventas</span>
                    <div className="text-xl font-black text-purple-900 font-mono">
                      ${operacionesVendidos.reduce((acc, op) => acc + op.totalVentaDeposito, 0).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider">
                      Detalle de Facturas y Trajes Vendidos ({operacionesVendidos.length})
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {operacionesVendidos.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        No hay ventas registradas en el rango de fechas seleccionado
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                          <tr>
                            <th className="p-2.5">Factura</th>
                            <th className="p-2.5">Fecha</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Prendas Vendidas</th>
                            <th className="p-2.5 text-center">Cant</th>
                            <th className="p-2.5 text-right">Monto Total</th>
                            <th className="p-2.5 text-center">Vendedor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {operacionesVendidos.map((op) => (
                            <tr key={op.numeroFact} className="hover:bg-slate-50 font-semibold">
                              <td className="p-2.5 font-mono font-black text-purple-900">{op.numeroFact}</td>
                              <td className="p-2.5 text-slate-600 font-semibold">{op.fechaSalida}</td>
                              <td className="p-2.5">
                                <div className="font-black text-slate-900 uppercase">{op.clienteNombre}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">CC: {op.clienteCedula}</div>
                              </td>
                              <td className="p-2.5">
                                <div className="space-y-0.5">
                                  {op.items.map((it, i) => (
                                    <div key={i} className="text-slate-800 uppercase text-[11px] font-bold">
                                      • {it.descripcion} ({it.talla})
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-900">
                                {op.items.reduce((a, b) => a + b.cantidad, 0)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-purple-900 text-sm">
                                ${op.totalVentaDeposito.toLocaleString("es-CO")}
                              </td>
                              <td className="p-2.5 text-center text-slate-600 text-[11px]">{op.vendedor}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------------
                SUB-MÓDULO 3: HISTORIAL DE DEVUELTOS A TIENDA
            ------------------------------------------------------------------- */}
            {submoduloActivo === "DEVUELTOS" && (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-2xl shadow-2xs shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-black">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-emerald-800">Prendas Ya Devueltas a Tienda</span>
                      <div className="text-xl font-black text-emerald-950 font-mono">{metricas.totalPrendasDevueltas} prendas</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-emerald-800">
                      Total Depósitos Reintegrados a Clientes
                    </span>
                    <div className="text-xl font-black text-emerald-900 font-mono">
                      ${totalDepositosYaDevueltos.toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider">
                      Registro de Trajes Retornados & Fianza Entregada ({operacionesDevueltos.length})
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {operacionesDevueltos.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        No hay prendas devueltas registradas en este período
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                          <tr>
                            <th className="p-2.5">Factura</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Prendas Devueltas</th>
                            <th className="p-2.5 text-center">Cant</th>
                            <th className="p-2.5 text-right">Depósito Reintegrado</th>
                            <th className="p-2.5 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {operacionesDevueltos.map((op) => (
                            <tr key={op.numeroFact} className="hover:bg-slate-50 font-semibold">
                              <td className="p-2.5 font-mono font-black text-emerald-900">{op.numeroFact}</td>
                              <td className="p-2.5">
                                <div className="font-black text-slate-900 uppercase">{op.clienteNombre}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">CC: {op.clienteCedula}</div>
                              </td>
                              <td className="p-2.5">
                                <div className="space-y-0.5">
                                  {op.items
                                    .filter((it) => it.estadoPrenda === "DEVUELTO A TIENDA")
                                    .map((it, i) => (
                                      <div key={i} className="text-slate-800 uppercase text-[11px] font-bold">
                                        • {it.descripcion} ({it.talla})
                                      </div>
                                    ))}
                                </div>
                              </td>
                              <td className="p-2.5 text-center font-black text-slate-900">
                                {op.items.filter((it) => it.estadoPrenda === "DEVUELTO A TIENDA").reduce((a, b) => a + b.cantidad, 0)}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-emerald-800 text-sm">
                                ${op.items
                                  .filter((it) => it.estadoPrenda === "DEVUELTO A TIENDA")
                                  .reduce((a, b) => a + b.valorDeposito * b.cantidad, 0)
                                  .toLocaleString("es-CO")}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full text-[10px] font-black border border-emerald-300">
                                  DEVUELTO A TIENDA
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* -------------------------------------------------------------------
                SUB-MÓDULO 4: APARTADOS Y RESERVAS
            ------------------------------------------------------------------- */}
            {submoduloActivo === "APARTADOS" && (
              <div className="flex-1 flex flex-col space-y-3 min-h-0">
                <div className="flex items-center justify-between bg-orange-50 border border-orange-200 p-3 rounded-2xl shadow-2xs shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-orange-200 text-orange-900 flex items-center justify-center font-black">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase text-orange-800">Prendas Apartadas / En Bodega</span>
                      <div className="text-xl font-black text-orange-950 font-mono">{metricas.totalPrendasApartadas} prendas</div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] font-black uppercase text-orange-800">Saldo Pendiente por Cobrar</span>
                    <div className="text-xl font-black text-rose-700 font-mono">
                      ${operacionesApartados.reduce((acc, op) => acc + op.saldoPendiente, 0).toLocaleString("es-CO")}
                    </div>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col">
                  <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0">
                    <span className="text-xs font-black uppercase tracking-wider">
                      Listado de Apartados y Reservas Pendientes ({operacionesApartados.length})
                    </span>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {operacionesApartados.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 font-bold text-xs">
                        No hay trajes apartados en este rango de fechas
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                          <tr>
                            <th className="p-2.5">Factura</th>
                            <th className="p-2.5">Fecha Salida</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Prendas Reservadas</th>
                            <th className="p-2.5 text-right">Total Factura</th>
                            <th className="p-2.5 text-right">Saldo Deber</th>
                            <th className="p-2.5 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {operacionesApartados.map((op) => (
                            <tr key={op.numeroFact} className="hover:bg-slate-50 font-semibold">
                              <td className="p-2.5 font-mono font-black text-orange-900">{op.numeroFact}</td>
                              <td className="p-2.5 text-slate-600 font-semibold">{op.fechaSalida}</td>
                              <td className="p-2.5">
                                <div className="font-black text-slate-900 uppercase">{op.clienteNombre}</div>
                                <div className="text-[10px] text-slate-500 font-semibold">CC: {op.clienteCedula}</div>
                              </td>
                              <td className="p-2.5">
                                <div className="space-y-0.5">
                                  {op.items.map((it, i) => (
                                    <div key={i} className="text-slate-800 uppercase text-[11px] font-bold">
                                      • {it.descripcion} ({it.talla})
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-slate-900">
                                ${op.totalVentaDeposito.toLocaleString("es-CO")}
                              </td>
                              <td className="p-2.5 text-right font-mono font-black text-rose-700">
                                ${op.saldoPendiente.toLocaleString("es-CO")}
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="bg-orange-100 text-orange-900 px-2 py-0.5 rounded-full text-[10px] font-black border border-orange-300">
                                  APARTADO
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* =========================================================================
              5. PIE DEL MODAL
          ========================================================================= */}
          <div className="flex items-center justify-between bg-slate-100 px-6 py-2.5 border-t border-slate-200 shrink-0">
            <span className="text-xs text-slate-600 font-medium">
              Sub-módulo activo: <strong>{submoduloActivo.replace("_", " ")}</strong>
            </span>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-8.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 px-5 text-xs font-bold uppercase transition-all"
            >
              Cerrar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL DEVOLUCIÓN DE TRAJES & REINTEGRO DE DEPÓSITO INTEGRADO */}
      <DevolucionTrajesModal
        open={modalDevolucionOpen}
        onOpenChange={setModalDevolucionOpen}
        empresa={empresa}
        facturaPreseleccionada={facturaADevolver}
        cajeroNombre={cajeroNombre}
        onDevolucionExitosa={() => {
          cargarDatos();
        }}
      />
    </>
  );
}
