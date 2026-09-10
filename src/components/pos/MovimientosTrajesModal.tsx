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
import { imprimirReporte80mmHtml } from "./TicketFactura80mm";
import { DevolucionTrajesModal } from "./DevolucionTrajesModal";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface MovimientosTrajesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: EmpresaConfig;
  cajeroNombre?: string;
}

type SubmoduloTipo = "EN_ALQUILER" | "ENTREGADO" | "EN_BODEGA" | "TODOS" | "VENTA";

export function MovimientosTrajesModal({
  open,
  onOpenChange,
  empresa,
  cajeroNombre = "ADMINISTRADOR",
}: MovimientosTrajesModalProps) {
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  // Submódulo / Estado activo (coincide con los estados reales de Windev)
  const [submoduloActivo, setSubmoduloActivo] = useState<SubmoduloTipo>("EN_ALQUILER");

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
    totalPrendasEntregadas: 0,
    totalPrendasEnBodega: 0,
    totalPrendasVenta: 0,
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

  // Filtrado según ESTADO_CLIENTE del sistema Windev
  const operacionesEnAlquiler = useMemo(() => {
    return operaciones.filter((op) =>
      op.estadoCliente === "EN ALQUILER" || op.items.some((it) => it.estadoPrenda === "EN ALQUILER")
    );
  }, [operaciones]);

  const operacionesEntregados = useMemo(() => {
    return operaciones.filter((op) =>
      op.estadoCliente === "ENTREGADO" || op.estadoCliente === "DEVUELTO" || op.items.some((it) => it.estadoPrenda === "ENTREGADO")
    );
  }, [operaciones]);

  const operacionesEnBodega = useMemo(() => {
    return operaciones.filter((op) =>
      op.estadoCliente === "EN BODEGA" || op.items.some((it) => it.estadoPrenda === "EN BODEGA")
    );
  }, [operaciones]);

  const operacionesVentas = useMemo(() => {
    return operaciones.filter((op) =>
      op.tipoOperacion === "VENTA" || op.estadoCliente === "VENTA" || op.items.some((it) => it.estadoPrenda === "VENTA")
    );
  }, [operaciones]);

  // Operaciones mostradas según la pestaña o filtro seleccionado
  const operacionesFiltradas = useMemo(() => {
    switch (submoduloActivo) {
      case "EN_ALQUILER":
        return operacionesEnAlquiler;
      case "ENTREGADO":
        return operacionesEntregados;
      case "EN_BODEGA":
        return operacionesEnBodega;
      case "VENTA":
        return operacionesVentas;
      case "TODOS":
      default:
        return operaciones;
    }
  }, [submoduloActivo, operacionesEnAlquiler, operacionesEntregados, operacionesEnBodega, operacionesVentas, operaciones]);

  // Depósitos que todavía falta devolver a los clientes (En alquiler)
  const totalDepositosPorDevolver = useMemo(() => {
    let sum = 0;
    operacionesEnAlquiler.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "EN ALQUILER") {
          sum += (it.valorDeposito * it.cantidad);
        }
      });
    });
    return sum;
  }, [operacionesEnAlquiler]);

  // Depósitos ya entregados / liquidados
  const totalDepositosYaDevueltos = useMemo(() => {
    let sum = 0;
    operacionesEntregados.forEach((op) => {
      op.items.forEach((it) => {
        if (it.estadoPrenda === "ENTREGADO") {
          sum += (it.valorDeposito * it.cantidad);
        }
      });
    });
    return sum;
  }, [operacionesEntregados]);

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
                onClick={() => {
                  const itemsList = (submoduloActivo === "POR_DEVOLVER"
                    ? operacionesPorDevolver
                    : submoduloActivo === "DEVUELTOS"
                    ? operacionesDevueltos
                    : submoduloActivo === "VENDIDOS"
                    ? operacionesVendidos
                    : submoduloActivo === "APARTADOS"
                    ? operacionesApartados
                    : operaciones
                  ).slice(0, 50);

                  const htmlMovimientos = `
                    <div style="text-align: center; margin-bottom: 6px;">
                      <img src="/logo_casa_del_disfraz.jpg" alt="Logo" style="width: 80%; max-height: 95px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />
                      <div style="font-weight: 900; font-size: 13px; text-transform: uppercase;">LA CASA DEL DISFRAZ</div>
                      <div style="font-size: 11.5px; font-weight: 800;">CRA 23 #15-34 · BUCARAMANGA</div>
                      <div style="font-size: 11.5px; font-weight: 800;">TEL: 6076963959 - 3202375610</div>
                    </div>
                    <hr />
                    <div style="text-align: center; font-weight: 900; font-size: 13px; margin: 4px 0; text-transform: uppercase;">
                      *** REPORTE: ${submoduloActivo.replace("_", " ")} ***
                    </div>
                    <hr />
                    <div style="font-size: 12px; font-weight: 700; margin: 4px 0;">
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>RANGO:</span>
                        <span style="font-weight: 900;">${fechaInicio || "INICIO"} A ${fechaFin || "HOY"}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>TOTAL FACTURAS:</span>
                        <span style="font-weight: 900;">${itemsList.length}</span>
                      </div>
                      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>FECHA IMPRESIÓN:</span>
                        <span style="font-weight: 800;">${new Date().toLocaleString("es-CO")}</span>
                      </div>
                    </div>
                    <hr />

                    <div style="margin: 6px 0;">
                      <div style="font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 1.5px solid #000; padding-bottom: 2px; margin-bottom: 5px;">
                        LISTADO DE PRENDAS Y CLIENTES
                      </div>
                      ${itemsList.map((op) => `
                        <div style="margin-bottom: 8px; border-bottom: 1px dashed #000; padding-bottom: 4px;">
                          <div style="display: flex; justify-content: space-between; font-size: 12.5px; font-weight: 900;">
                            <span>FACT: ${op.numeroFact}</span>
                            <span>${op.fechaEntregaPactada}</span>
                          </div>
                          <div style="font-size: 12px; font-weight: 800; text-transform: uppercase;">
                            ${op.clienteNombre} (${op.clienteTelefono || "S/T"})
                          </div>
                          <div style="margin-top: 2px; padding-left: 4px;">
                            ${op.items.map((it) => `
                              <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-weight: 700;">
                                <span>• ${it.cantidad}x ${it.descripcion} (${it.talla})</span>
                                <span style="font-weight: 800;">Dep: $${it.valorDeposito.toLocaleString("es-CO")}</span>
                              </div>
                            `).join("")}
                          </div>
                        </div>
                      `).join("")}
                    </div>

                    <div style="margin-top: 10px; font-size: 13px; font-weight: 900; text-align: right; border-top: 2px solid #000; padding-top: 4px;">
                      <div>PRENDAS POR DEVOLVER: ${metricas.totalPrendasEnAlquiler}</div>
                      <div>TOTAL DEPÓSITOS CUSTODIA: $${totalDepositosPorDevolver.toLocaleString("es-CO")}</div>
                    </div>

                    <div style="margin-top: 32px; text-align: center;">
                      <div style="border-top: 1.5px solid #000; width: 80%; margin: 0 auto 3px auto;"></div>
                      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase;">Firma de Verificación / Auditoría</div>
                    </div>
                  `;
                  imprimirReporte80mmHtml(`Reporte-Movimientos-${submoduloActivo}`, htmlMovimientos);
                }}
                className="hidden items-center gap-1.5 h-8 rounded-xl bg-slate-900 hover:bg-black text-white px-3 text-xs font-bold transition-all sm:flex shadow-xs"
                title="Imprimir Reporte 80mm"
              >
                <Printer className="h-4 w-4 text-emerald-400" /> Imprimir 80mm
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
                3. PESTAÑAS Y FILTRO DE ESTADO CLIENTE (IDÉNTICO A WINDEV)
            ========================================================================= */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-t border-slate-200 pt-1">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setSubmoduloActivo("EN_ALQUILER")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    submoduloActivo === "EN_ALQUILER"
                      ? "bg-amber-600 text-white shadow-sm ring-2 ring-amber-400/50"
                      : "bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100"
                  }`}
                >
                  <span>👗 EN ALQUILER</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                      submoduloActivo === "EN_ALQUILER" ? "bg-black/20 text-white" : "bg-amber-200 text-amber-950"
                    }`}
                  >
                    {metricas.totalPrendasEnAlquiler}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmoduloActivo("ENTREGADO")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    submoduloActivo === "ENTREGADO"
                      ? "bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/50"
                      : "bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100"
                  }`}
                >
                  <span>✅ ENTREGADO (DEVUELTO)</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                      submoduloActivo === "ENTREGADO" ? "bg-black/20 text-white" : "bg-emerald-200 text-emerald-950"
                    }`}
                  >
                    {metricas.totalPrendasEntregadas}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmoduloActivo("EN_BODEGA")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    submoduloActivo === "EN_BODEGA"
                      ? "bg-blue-700 text-white shadow-sm ring-2 ring-blue-400/50"
                      : "bg-blue-50 text-blue-900 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  <span>📦 EN BODEGA</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                      submoduloActivo === "EN_BODEGA" ? "bg-black/20 text-white" : "bg-blue-200 text-blue-950"
                    }`}
                  >
                    {metricas.totalPrendasEnBodega}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmoduloActivo("TODOS")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    submoduloActivo === "TODOS"
                      ? "bg-slate-800 text-white shadow-sm ring-2 ring-slate-400/50"
                      : "bg-slate-100 text-slate-800 border border-slate-200 hover:bg-slate-200"
                  }`}
                >
                  <span>📋 TODOS</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                      submoduloActivo === "TODOS" ? "bg-black/20 text-white" : "bg-slate-300 text-slate-900"
                    }`}
                  >
                    {metricas.totalOperaciones}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmoduloActivo("VENTA")}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    submoduloActivo === "VENTA"
                      ? "bg-purple-700 text-white shadow-sm ring-2 ring-purple-400/50"
                      : "bg-purple-50 text-purple-900 border border-purple-200 hover:bg-purple-100"
                  }`}
                >
                  <span>🛍️ VENTAS</span>
                  <span
                    className={`text-[10px] px-2 py-0.2 rounded-full font-black ${
                      submoduloActivo === "VENTA" ? "bg-black/20 text-white" : "bg-purple-200 text-purple-950"
                    }`}
                  >
                    {metricas.totalPrendasVenta}
                  </span>
                </button>
              </div>

              {/* Selector desplegable ESTADO_CLIENTE como en Windev */}
              <div className="flex items-center gap-2 shrink-0 bg-slate-50 border border-slate-300 px-3 py-1 rounded-xl">
                <span className="text-[11px] font-black uppercase text-slate-700">ESTADO_CLIENTE:</span>
                <select
                  value={submoduloActivo}
                  onChange={(e) => setSubmoduloActivo(e.target.value as SubmoduloTipo)}
                  className="bg-transparent text-xs font-black text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="EN_ALQUILER">EN ALQUILER</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="EN_BODEGA">EN BODEGA</option>
                  <option value="TODOS">TODOS</option>
                  <option value="VENTA">VENTA</option>
                </select>
              </div>
            </div>
          </div>

          {/* =========================================================================
              4. CONTENIDO SEGÚN ESTADO DE CLIENTES (TABLA WINDEV EXACTA)
          ========================================================================= */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 sm:overflow-hidden sm:p-3.5">
            {/* Si es EN ALQUILER mostramos ribbon de depósitos pendientes */}
            {submoduloActivo === "EN_ALQUILER" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-amber-50/90 border border-amber-200 p-3 rounded-2xl shadow-2xs shrink-0 mb-3">
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
                    <span className="text-[10px] font-black uppercase text-slate-600">Facturas Pendientes</span>
                    <div className="text-lg font-black text-slate-900">{operacionesEnAlquiler.length} Facturas</div>
                  </div>
                  <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-300">
                    Usa "Devolver" para reintegrar depósito
                  </span>
                </div>
              </div>
            )}

            {/* Si es ENTREGADO mostramos ribbon de depósitos devueltos */}
            {submoduloActivo === "ENTREGADO" && (
              <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-3 rounded-2xl shadow-2xs shrink-0 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-200 text-emerald-900 flex items-center justify-center font-black">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-emerald-800">Prendas Ya Entregadas / Devueltas</span>
                    <div className="text-xl font-black text-emerald-950 font-mono">{metricas.totalPrendasEntregadas} prendas</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-black uppercase text-emerald-800">
                    Total Depósitos Reintegrados
                  </span>
                  <div className="text-xl font-black text-emerald-900 font-mono">
                    ${totalDepositosYaDevueltos.toLocaleString("es-CO")}
                  </div>
                </div>
              </div>
            )}

            {/* TABLA PRINCIPAL DE OPERACIONES & PRENDAS (ESTADO DE CLIENTES) */}
            <div className="grid min-h-0 flex-1 grid-cols-12 gap-3 sm:overflow-hidden">
              <div className="col-span-12 lg:col-span-7 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider">
                    {submoduloActivo === "TODOS" ? "TODAS LAS FACTURAS" : `FACTURAS EN ESTADO: ${submoduloActivo.replace("_", " ")}`} ({operacionesFiltradas.length})
                  </span>
                  <span className="text-[10px] text-slate-300 font-semibold">Selecciona una factura para ver prendas abajo</span>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                  {operacionesFiltradas.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 font-bold text-xs">
                      No hay registros en estado {submoduloActivo.replace("_", " ")} para este período
                    </div>
                  ) : (
                    <table className="min-w-[700px] w-full text-left text-xs border-collapse">
                      <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                        <tr>
                          <th className="p-2">NUMEROFACT</th>
                          <th className="p-2">FECHASALIDA</th>
                          <th className="p-2">FECHAENTRADA</th>
                          <th className="p-2">CCLIENTE</th>
                          <th className="p-2">DIRECCION</th>
                          <th className="p-2 text-right">TOTAL</th>
                          <th className="p-2 text-center">ESTADOCLIENTE</th>
                          <th className="p-2 text-center">ACCIÓN</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {operacionesFiltradas.map((op) => {
                          const esSel = clienteSeleccionado?.numeroFact === op.numeroFact;
                          const ec = (op.estadoCliente || "EN ALQUILER").toUpperCase();

                          return (
                            <tr
                              key={op.numeroFact}
                              onClick={() => setClienteSeleccionado(op)}
                              className={`cursor-pointer transition-colors ${
                                esSel ? "bg-amber-50 font-bold border-l-4 border-l-amber-500" : "hover:bg-slate-50"
                              }`}
                            >
                              <td className="p-2">
                                <span className="font-mono font-black text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                                  {op.numeroFact}
                                </span>
                              </td>
                              <td className="p-2 text-[11px] text-slate-600">{op.fechaSalida}</td>
                              <td className="p-2 text-[11px] font-semibold text-slate-800">{op.fechaEntregaPactada}</td>
                              <td className="p-2">
                                <div className="font-black text-slate-900 uppercase text-[11px] truncate max-w-[140px]">
                                  {op.clienteNombre}
                                </div>
                                <div className="text-[9px] text-slate-500 font-semibold">CC: {op.clienteCedula}</div>
                              </td>
                              <td className="p-2 text-[10px] text-slate-600 truncate max-w-[120px]">
                                {op.clienteDireccion}
                              </td>
                              <td className="p-2 text-right font-mono font-black text-slate-900 text-[11px]">
                                ${op.totalVentaDeposito.toLocaleString("es-CO")}
                              </td>
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase border ${
                                    ec === "ENTREGADO" || ec === "DEVUELTO"
                                      ? "bg-emerald-100 text-emerald-900 border-emerald-300"
                                      : ec === "EN BODEGA"
                                      ? "bg-blue-100 text-blue-900 border-blue-300"
                                      : ec === "VENTA"
                                      ? "bg-purple-100 text-purple-900 border-purple-300"
                                      : "bg-amber-100 text-amber-900 border-amber-300"
                                  }`}
                                >
                                  {ec}
                                </span>
                              </td>
                              <td className="p-2 text-center">
                                {ec === "EN ALQUILER" ? (
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
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-bold">—</span>
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

              {/* TABLA DE DETALLE DE PRENDAS DE LA FACTURA SELECCIONADA (CAMPOFACTURA) */}
              <div className="col-span-12 lg:col-span-5 flex flex-col rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="bg-slate-900 px-4 py-2.5 text-white shrink-0 flex justify-between items-center">
                  <span className="text-xs font-black uppercase tracking-wider">
                    Detalle de Prendas {clienteSeleccionado ? `(#${clienteSeleccionado.numeroFact})` : ""}
                  </span>
                  {clienteSeleccionado && (clienteSeleccionado.estadoCliente === "EN ALQUILER" || clienteSeleccionado.items.some((i) => i.estadoPrenda === "EN ALQUILER")) && (
                    <button
                      type="button"
                      onClick={() => abrirDevolucionFactura(clienteSeleccionado.numeroFact)}
                      className="flex items-center gap-1 h-6 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 px-2.5 text-[10px] font-black transition-all"
                    >
                      <RotateCcw className="h-3 w-3" /> Procesar Devolución
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
                      <thead className="sticky top-0 bg-slate-100 text-slate-700 font-black uppercase text-[10px] border-b">
                        <tr>
                          <th className="p-2">DESCRIPCION</th>
                          <th className="p-2 text-center">CANTIDAD</th>
                          <th className="p-2 text-right">VALOR</th>
                          <th className="p-2 text-right">TOTAL</th>
                          <th className="p-2 text-center">NUMEROFACT</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {clienteSeleccionado.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2">
                              <div className="font-black text-slate-900 uppercase text-[11px]">{item.descripcion}</div>
                              {item.codigoBarras && (
                                <div className="text-[9px] text-slate-500 font-mono font-bold">Cód: {item.codigoBarras} · Talla: {item.talla}</div>
                              )}
                            </td>
                            <td className="p-2 text-center font-black text-slate-900">{item.cantidad}</td>
                            <td className="p-2 text-right font-mono font-bold">${item.valorAlquiler.toLocaleString("es-CO")}</td>
                            <td className="p-2 text-right font-mono font-black text-slate-900">${item.total.toLocaleString("es-CO")}</td>
                            <td className="p-2 text-center font-mono font-bold text-slate-600 text-[10px]">
                              {item.numeroFact}
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
