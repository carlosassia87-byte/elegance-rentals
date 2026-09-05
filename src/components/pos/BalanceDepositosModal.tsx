import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  Calendar,
  Search,
  RefreshCw,
  Printer,
  X,
  DollarSign,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Filter,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  consultarMovimientos,
  type OperacionClienteMovimiento,
  type ResumenMetricasMovimientos,
} from "@/services/movimientosService";
import { DevolucionTrajesModal } from "./DevolucionTrajesModal";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface BalanceDepositosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaConfig;
  cajeroNombre?: string;
}

export function BalanceDepositosModal({
  open,
  onOpenChange,
  empresa,
  cajeroNombre = "ADMINISTRADOR",
}: BalanceDepositosModalProps) {
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Filtros de fecha y búsqueda
  const [fechaInicio, setFechaInicio] = useState(hoyStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);
  const [busqueda, setBusqueda] = useState<string>("");
  const [filtroEstadoDeposito, setFiltroEstadoDeposito] = useState<"TODOS" | "PENDIENTES" | "LIQUIDADOS">("TODOS");
  const [cargando, setCargando] = useState(false);

  // Modal de Devolución integrado
  const [modalDevolucionOpen, setModalDevolucionOpen] = useState(false);
  const [facturaADevolver, setFacturaADevolver] = useState("");

  // Datos
  const [operaciones, setOperaciones] = useState<OperacionClienteMovimiento[]>([]);
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
    } catch (err) {
      console.error("Error consultando balance de depósitos:", err);
      toast.error("Error al cargar el balance de depósitos");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open, fechaInicio, fechaFin]);

  // Presets de fecha
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

  // Cálculos consolidados de depósitos
  const totalDepositosYaDevueltos = useMemo(() => {
    let sum = 0;
    operaciones.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "DEVUELTO A TIENDA") {
          sum += it.valorDeposito * it.cantidad;
        }
      });
    });
    return sum;
  }, [operaciones]);

  const totalDepositosPorDevolver = useMemo(() => {
    let sum = 0;
    operaciones.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "EN ALQUILER") {
          sum += it.valorDeposito * it.cantidad;
        }
      });
    });
    return sum;
  }, [operaciones]);

  // Lista de facturas con cálculo detallado de depósitos
  const facturasProcesadas = useMemo(() => {
    return operaciones.map((op) => {
      const depCobrado = op.totalDeposito;
      const depDevuelto = op.items
        .filter((it) => it.estadoPrenda === "DEVUELTO A TIENDA")
        .reduce((a, b) => a + b.valorDeposito * b.cantidad, 0);
      const depPendiente = Math.max(0, depCobrado - depDevuelto);
      const prendasEnAlquiler = op.items.filter((it) => it.estadoPrenda === "EN ALQUILER").length;
      const prendasDevueltas = op.items.filter((it) => it.estadoPrenda === "DEVUELTO A TIENDA").length;

      return {
        ...op,
        depCobrado,
        depDevuelto,
        depPendiente,
        prendasEnAlquiler,
        prendasDevueltas,
      };
    });
  }, [operaciones]);

  // Filtrado según estado (Todos / Pendientes / Liquidados)
  const facturasFiltradas = useMemo(() => {
    return facturasProcesadas.filter((f) => {
      if (filtroEstadoDeposito === "PENDIENTES") return f.depPendiente > 0;
      if (filtroEstadoDeposito === "LIQUIDADOS") return f.depPendiente === 0 && f.depCobrado > 0;
      return true;
    });
  }, [facturasProcesadas, filtroEstadoDeposito]);

  const abrirDevolucionFactura = (numFact: string) => {
    setFacturaADevolver(numFact);
    setModalDevolucionOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex h-dvh w-screen max-w-none flex-col overflow-hidden rounded-none border-0 bg-[#F8FAFC] p-0 text-slate-900 shadow-2xl sm:h-[92vh] sm:w-[96vw] sm:max-w-[96vw] sm:rounded-2xl sm:border lg:max-w-[1300px]">
          {/* =========================================================================
              1. CABECERA PRINCIPAL
          ========================================================================= */}
          <div className="grid shrink-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 bg-slate-900 px-3 py-3 text-white sm:flex sm:items-center sm:justify-between sm:px-6 sm:py-3.5">
            <div className="flex min-w-0 items-center gap-2 sm:gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-black shadow-xs">
                <Wallet className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="min-w-0 sm:flex sm:items-center sm:gap-2">
                  <h2 className="text-sm font-black tracking-wide uppercase">
                    BALANCE & AUDITORÍA DE DEPÓSITOS Y SALDOS
                  </h2>
                  <span className="hidden rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30 sm:inline-block">
                    Control Financiero
                  </span>
                </div>
                <p className="hidden text-[11px] text-slate-300 sm:block">
                  Control exacto de dinero de depósitos cobrados, montos reintegrados y fianzas pendientes por devolver a clientes
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
                title="Imprimir Balance"
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
              2. BARRA DE FILTROS DE FECHA, PRESETS Y BÚSQUEDA
          ========================================================================= */}
          <div className="shrink-0 space-y-2.5 border-b border-slate-200 bg-white px-3 py-2.5 shadow-2xs sm:px-5 sm:py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Rango de Fechas */}
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

              {/* Buscador y Botón de Recarga */}
              <div className="flex w-full min-w-0 items-center gap-2 sm:max-w-md sm:flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && cargarDatos()}
                    placeholder="Buscar por cliente, cédula o número de recibo..."
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

            {/* Filtros rápidos de estado de fianza */}
            <div className="flex items-center gap-2 overflow-x-auto border-t border-slate-100 pt-1 text-xs">
              <span className="font-bold text-slate-400 text-[10px] uppercase">Filtrar Facturas:</span>
              <button
                type="button"
                onClick={() => setFiltroEstadoDeposito("TODOS")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  filtroEstadoDeposito === "TODOS"
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Todas ({facturasProcesadas.length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstadoDeposito("PENDIENTES")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  filtroEstadoDeposito === "PENDIENTES"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                }`}
              >
                Con Depósito Pendiente ({facturasProcesadas.filter((f) => f.depPendiente > 0).length})
              </button>
              <button
                type="button"
                onClick={() => setFiltroEstadoDeposito("LIQUIDADOS")}
                className={`px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  filtroEstadoDeposito === "LIQUIDADOS"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                }`}
              >
                Completamente Liquidados ({facturasProcesadas.filter((f) => f.depPendiente === 0 && f.depCobrado > 0).length})
              </button>
            </div>
          </div>

          {/* =========================================================================
              3. CUERPO: TARJETAS FINANCIERAS Y TABLA DE AUDITORÍA
          ========================================================================= */}
          <div className="flex-1 min-h-0 space-y-4 overflow-y-auto p-3 sm:p-4 custom-scrollbar">
            {/* 4 Tarjetas Financieras */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                    1. Ingresos por Alquiler
                  </span>
                  <div className="text-2xl font-black text-slate-900 font-mono mt-1">
                    ${metricas.totalDineroAlquiler.toLocaleString("es-CO")}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-semibold mt-2">
                  Total cobrado por servicio de alquiler
                </span>
              </div>

              <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-800 tracking-wider">
                    2. Depósitos Cobrados Inicialmente
                  </span>
                  <div className="text-2xl font-black text-blue-900 font-mono mt-1">
                    ${metricas.totalDineroDepositos.toLocaleString("es-CO")}
                  </div>
                </div>
                <span className="text-[10px] text-blue-700 font-semibold mt-2">
                  Fianzas de garantía ingresadas a caja
                </span>
              </div>

              <div className="bg-emerald-50/90 p-4 rounded-2xl border border-emerald-200 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-900 tracking-wider">
                    3. Depósitos Ya Devueltos a Clientes
                  </span>
                  <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
                    ${totalDepositosYaDevueltos.toLocaleString("es-CO")}
                  </div>
                </div>
                <span className="text-[10px] text-emerald-700 font-semibold mt-2">
                  Dinero ya entregado al retornar los vestidos
                </span>
              </div>

              <div className="bg-gradient-to-br from-amber-500 via-amber-600 to-amber-700 text-white p-4 rounded-2xl shadow-md flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-100 tracking-wider">
                    4. DINERO POR DEVOLVER A CLIENTES
                  </span>
                  <div className="text-2xl font-black font-mono mt-1 text-white">
                    ${totalDepositosPorDevolver.toLocaleString("es-CO")}
                  </div>
                </div>
                <span className="text-[10px] text-amber-100 font-bold mt-2">
                  Fianzas aún en poder de la tienda por trajes prestados
                </span>
              </div>
            </div>

            {/* TABLA DE AUDITORÍA DETALLADA */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col min-h-[350px]">
              <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider">
                  Auditoría Financiera de Depósitos por Factura ({facturasFiltradas.length})
                </span>
                <span className="text-[10px] text-slate-300 font-semibold">
                  Cajero: {cajeroNombre}
                </span>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                {facturasFiltradas.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-bold text-xs space-y-2">
                    <p>No se encontraron facturas para el filtro seleccionado.</p>
                    <p className="text-[11px] text-slate-400">Prueba ajustando el rango de fechas o el término de búsqueda.</p>
                  </div>
                ) : (
                  <table className="min-w-[900px] w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b border-slate-200">
                      <tr>
                        <th className="p-2.5">Factura</th>
                        <th className="p-2.5">Fecha Salida</th>
                        <th className="p-2.5">Cliente</th>
                        <th className="p-2.5 text-center">Prendas Alquiladas</th>
                        <th className="p-2.5 text-right">Alquiler</th>
                        <th className="p-2.5 text-right">Depósito Cobrado</th>
                        <th className="p-2.5 text-right text-emerald-800">Depósito Devuelto</th>
                        <th className="p-2.5 text-right text-amber-900">Depósito Pendiente</th>
                        <th className="p-2.5 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {facturasFiltradas.map((op) => (
                        <tr key={op.numeroFact} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono font-black text-slate-900">
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              #{op.numeroFact}
                            </span>
                          </td>
                          <td className="p-2.5 text-slate-600 font-semibold">{op.fechaSalida}</td>
                          <td className="p-2.5">
                            <div className="font-black text-slate-900 uppercase text-xs">{op.clienteNombre}</div>
                            <div className="text-[10px] text-slate-500">CC: {op.clienteCedula}</div>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200">
                              {op.prendasEnAlquiler} en alquiler · {op.prendasDevueltas} devueltas
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-700">
                            ${op.totalAlquiler.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-blue-900">
                            ${op.depCobrado.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-700">
                            ${op.depDevuelto.toLocaleString("es-CO")}
                          </td>
                          <td className="p-2.5 text-right font-mono font-black">
                            {op.depPendiente > 0 ? (
                              <span className="bg-amber-100 text-amber-950 px-2 py-0.5 rounded border border-amber-300">
                                ${op.depPendiente.toLocaleString("es-CO")}
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                ✓ Liquidado
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">
                            {op.depPendiente > 0 ? (
                              <button
                                type="button"
                                onClick={() => abrirDevolucionFactura(op.numeroFact)}
                                className="flex items-center gap-1 h-6.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white px-2.5 text-[10px] font-black shadow-2xs mx-auto transition-all active:scale-95"
                              >
                                <RotateCcw className="h-3 w-3" /> Devolver
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[10px] font-semibold">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              4. PIE DEL MODAL
          ========================================================================= */}
          <div className="flex items-center justify-between bg-slate-100 px-6 py-2.5 border-t border-slate-200 shrink-0">
            <span className="text-xs text-slate-600 font-medium">
              Total facturas con fianza pendiente de devolución:{" "}
              <strong className="text-amber-900">
                {facturasProcesadas.filter((f) => f.depPendiente > 0).length}
              </strong>
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

      {/* Modal Devolución integrado */}
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
