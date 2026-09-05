import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  Phone,
  MessageCircle,
  RotateCcw,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  User,
  Package,
  Calendar,
  ChevronRight,
  Send,
  Copy,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import type { EmpresaConfig } from "@/services/empresaCajaService";
import {
  consultarTodosLosRetrasosYAlertas,
  generarMensajeWhatsAppRetraso,
  generarMensajeWhatsAppRecordatorio,
  type ItemRetrasoAlquiler,
  type MetricasAlertasRetraso,
} from "@/services/alertasRetrasosService";

interface AlertasRetrasosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaConfig;
  cajeroNombre?: string;
  onAbrirDevolucion?: (numeroFactura: string) => void;
}

export function AlertasRetrasosModal({
  open,
  onOpenChange,
  empresa,
  cajeroNombre = "ADMINISTRADOR",
  onAbrirDevolucion,
}: AlertasRetrasosModalProps) {
  const [alertas, setAlertas] = useState<ItemRetrasoAlquiler[]>([]);
  const [metricas, setMetricas] = useState<MetricasAlertasRetraso>({
    totalTrajesEnMora: 0,
    totalClientesEnMora: 0,
    totalDineroRecargosMora: 0,
    totalDepositosEnRiesgo: 0,
    totalVencenHoy: 0,
    totalEnTiempo: 0,
  });

  const [cargando, setCargando] = useState(false);
  const [filtroTab, setFiltroTab] = useState<"MORA" | "VENCE_HOY" | "EN_TIEMPO" | "TODOS">("MORA");
  const [busqueda, setBusqueda] = useState("");
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemRetrasoAlquiler | null>(null);

  // Cargar datos
  const cargarAlertas = async () => {
    setCargando(true);
    try {
      const res = await consultarTodosLosRetrasosYAlertas();
      setAlertas(res.alertas);
      setMetricas(res.metricas);
      if (res.alertas.length > 0) {
        setItemSeleccionado((prev) => {
          if (!prev) return res.alertas[0];
          return res.alertas.find((a) => a.numeroFactura === prev.numeroFactura) || res.alertas[0];
        });
      } else {
        setItemSeleccionado(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error consultando alertas de retraso");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarAlertas();
    }
  }, [open]);

  // Filtrado de alertas
  const alertasFiltradas = useMemo(() => {
    return alertas.filter((it) => {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto =
        !q ||
        it.clienteNombre.toLowerCase().includes(q) ||
        it.clienteCedula.toLowerCase().includes(q) ||
        it.numeroFactura.toLowerCase().includes(q) ||
        it.clienteTelefono.toLowerCase().includes(q) ||
        it.prendas.some((p) => p.descripcion.toLowerCase().includes(q) || p.codigoBarras.toLowerCase().includes(q));

      let coincideTab = true;
      if (filtroTab === "MORA") coincideTab = it.nivelUrgencia === "CRITICO_MORA";
      else if (filtroTab === "VENCE_HOY") coincideTab = it.nivelUrgencia === "VENCE_HOY" || it.nivelUrgencia === "VENCE_MANANA";
      else if (filtroTab === "EN_TIEMPO") coincideTab = it.nivelUrgencia === "EN_TIEMPO";

      return coincideTexto && coincideTab;
    });
  }, [alertas, busqueda, filtroTab]);

  // Enviar mensaje por WhatsApp
  const handleEnviarWhatsApp = (item: ItemRetrasoAlquiler) => {
    let tel = item.clienteTelefono.replace(/[^0-9]/g, "");
    if (!tel) {
      toast.error("El cliente no tiene teléfono registrado");
      return;
    }

    // Prefijo de Colombia si tiene 10 dígitos (ej: 315...)
    if (tel.length === 10 && !tel.startsWith("57")) {
      tel = "57" + tel;
    }

    const mensajeEncoded =
      item.nivelUrgencia === "CRITICO_MORA"
        ? generarMensajeWhatsAppRetraso(item, empresa.nombreComercial)
        : generarMensajeWhatsAppRecordatorio(item, empresa.nombreComercial);

    const url = `https://api.whatsapp.com/send?phone=${tel}&text=${mensajeEncoded}`;
    window.open(url, "_blank");
    toast.success(`Abriendo WhatsApp para ${item.clienteNombre}...`);
  };

  // Copiar mensaje
  const handleCopiarMensaje = (item: ItemRetrasoAlquiler) => {
    const rawMsg =
      item.nivelUrgencia === "CRITICO_MORA"
        ? decodeURIComponent(generarMensajeWhatsAppRetraso(item, empresa.nombreComercial))
        : decodeURIComponent(generarMensajeWhatsAppRecordatorio(item, empresa.nombreComercial));

    navigator.clipboard.writeText(rawMsg);
    toast.success("Mensaje copiado al portapapeles");
  };

  // Abrir devolución de este cliente
  const handleIrADevolucion = (item: ItemRetrasoAlquiler) => {
    onOpenChange(false);
    if (onAbrirDevolucion) {
      onAbrirDevolucion(item.numeroFactura);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => onOpenChange(false)} />

      {/* Modal Container */}
      <div className="relative z-10 flex h-[92vh] w-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 font-sans">
        {/* Cabecera Principal */}
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-rose-50/70 px-6 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-600 to-red-700 text-white shadow-md shadow-rose-600/25">
              <Bell className="h-6 w-6" />
              {metricas.totalClientesEnMora > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-rose-950 border-2 border-white animate-bounce">
                  {metricas.totalClientesEnMora}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Panel de Notificaciones: Trajes por Vencer & Retrasos
                </h2>
                <span className="rounded-md bg-rose-200 px-2 py-0.5 text-[10px] font-black text-rose-900 uppercase">
                  LÍMITE 3 DÍAS · $7.000/DÍA DE MORA
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                Control de prendas pendientes de entrega, cálculo de recargos y cobro por WhatsApp
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cargarAlertas}
              className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold transition-all border border-slate-300 shadow-2xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-rose-600" : ""}`} />
              <span>Actualizar</span>
            </button>

            <button
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 hover:bg-rose-100 hover:text-rose-700 text-slate-600 transition-all shadow-xs"
              title="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Tarjetas KPI de Estado Ejecutivo */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 px-6 py-3 bg-slate-50 border-b border-slate-200/90 text-xs">
          {/* Tarjeta 1: Clientes en Mora */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 border border-rose-200 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700 font-black shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Clientes en Mora</div>
              <div className="text-base font-black text-rose-700">{metricas.totalClientesEnMora} clientes</div>
            </div>
          </div>

          {/* Tarjeta 2: Trajes en Mora */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 border border-rose-200 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-black shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Trajes Retrasados</div>
              <div className="text-base font-black text-rose-900">{metricas.totalTrajesEnMora} prendas</div>
            </div>
          </div>

          {/* Tarjeta 3: Total Recargos por Mora */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 border border-amber-200 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-100 text-amber-800 font-black shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Recargos Mora ($7k/d)</div>
              <div className="text-base font-black text-amber-800">${metricas.totalDineroRecargosMora.toLocaleString("es-CO")}</div>
            </div>
          </div>

          {/* Tarjeta 4: Depósitos en Riesgo */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 border border-blue-200 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700 font-black shrink-0">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Depósitos en Custodia</div>
              <div className="text-base font-black text-blue-800">${metricas.totalDepositosEnRiesgo.toLocaleString("es-CO")}</div>
            </div>
          </div>

          {/* Tarjeta 5: Vencen Hoy */}
          <div className="flex items-center gap-2.5 rounded-2xl bg-white p-2.5 border border-purple-200 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700 font-black shrink-0">
              <Clock className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase font-bold text-slate-400 truncate">Vencen Hoy / Mañana</div>
              <div className="text-base font-black text-purple-800">{metricas.totalVencenHoy} clientes</div>
            </div>
          </div>
        </div>

        {/* Pestañas de Filtro y Buscador */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/70 px-6 py-2.5 text-xs">
          {/* Pestañas */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFiltroTab("MORA")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-black transition-all ${
                filtroTab === "MORA"
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-rose-800 hover:bg-rose-50 border border-rose-200"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>🚨 En Mora Crítica ({metricas.totalClientesEnMora})</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroTab("VENCE_HOY")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition-all ${
                filtroTab === "VENCE_HOY"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-purple-50 border border-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5 text-purple-600" />
              <span>Vencen Hoy / Mañana ({metricas.totalVencenHoy})</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroTab("EN_TIEMPO")}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 font-bold transition-all ${
                filtroTab === "EN_TIEMPO"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-emerald-50 border border-slate-200"
              }`}
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>En Plazo Normal ({metricas.totalEnTiempo})</span>
            </button>

            <button
              type="button"
              onClick={() => setFiltroTab("TODOS")}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all ${
                filtroTab === "TODOS"
                  ? "bg-slate-800 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              Todos ({alertas.length})
            </button>
          </div>

          {/* Buscador */}
          <div className="w-72 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por cliente, cédula, factura o traje..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs font-semibold focus:border-rose-500 focus:outline-none shadow-2xs"
            />
          </div>
        </div>

        {/* Contenido Dividido: Listado a la izquierda (60%) + Panel de Contacto y Liquidación a la derecha (40%) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LADO IZQUIERDO: LISTADO DE CLIENTES CON RETRASO */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 custom-scrollbar border-r border-slate-200">
            {alertasFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <CheckCircle2 className="h-12 w-12 text-emerald-400 mb-2" />
                <p className="font-bold text-sm text-slate-700">¡Excelente! No hay trajes en mora en esta categoría</p>
                <p className="text-xs text-slate-400 mt-1">Todos los alquileres están al día o devueltos a la tienda.</p>
              </div>
            ) : (
              alertasFiltradas.map((item) => {
                const esSeleccionado = itemSeleccionado?.numeroFactura === item.numeroFactura;
                const esCritico = item.nivelUrgencia === "CRITICO_MORA";
                const esVenceHoy = item.nivelUrgencia === "VENCE_HOY";

                return (
                  <div
                    key={item.numeroFactura}
                    onClick={() => setItemSeleccionado(item)}
                    className={`cursor-pointer rounded-2xl p-4 transition-all border ${
                      esSeleccionado
                        ? "bg-rose-50/70 border-rose-400 shadow-sm ring-2 ring-rose-300/60"
                        : esCritico
                        ? "bg-white border-rose-200 hover:border-rose-300 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`flex h-9 w-9 items-center justify-center rounded-xl font-black text-xs ${
                            esCritico
                              ? "bg-rose-600 text-white"
                              : esVenceHoy
                              ? "bg-purple-600 text-white"
                              : "bg-emerald-600 text-white"
                          }`}
                        >
                          {esCritico ? `+${item.diasRetraso}d` : `${item.diasTranscurridos}d`}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-black text-sm text-slate-900">{item.clienteNombre}</h4>
                            <span className="font-mono text-xs font-bold text-cyan-800">#{item.numeroFactura}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2">
                            <span>C.C. {item.clienteCedula}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-700">Tel: {item.clienteTelefono}</span>
                          </div>
                        </div>
                      </div>

                      {/* Badges de Mora */}
                      <div className="text-right">
                        {esCritico ? (
                          <div>
                            <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-xs font-black text-rose-800">
                              <AlertTriangle className="h-3 w-3" /> {item.diasRetraso} DÍAS RETRASO
                            </span>
                            <div className="text-xs font-black text-rose-600 mt-0.5">
                              Mora: +${item.recargoTotalRetraso.toLocaleString("es-CO")}
                            </div>
                          </div>
                        ) : esVenceHoy ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-purple-100 px-2 py-0.5 text-xs font-black text-purple-800">
                            <Clock className="h-3 w-3" /> VENCE HOY (3er Día)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-800">
                            <CheckCircle2 className="h-3 w-3" /> En plazo ({item.diasTranscurridos}/3 días)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Lista de Prendas pendientes */}
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs">
                      <div className="text-slate-600 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="font-bold text-slate-800">{item.prendas.length} prenda(s):</span>
                        <span className="truncate max-w-xs text-[11px] text-slate-500">
                          {item.prendas.map((p) => `${p.cantidad}x ${p.descripcion} (${p.talla})`).join(", ")}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-slate-600">
                        Depósito en custodia:{" "}
                        <strong className="text-blue-700 font-black">
                          ${item.totalDepositoRetenido.toLocaleString("es-CO")}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* LADO DERECHO: PANEL DE CONTACTO DIRECTO, COBRO POR WHATSAPP & DEVOLUCIÓN */}
          <div className="w-full md:w-[450px] bg-slate-50 flex flex-col p-5 overflow-y-auto space-y-4">
            {itemSeleccionado ? (
              <div className="space-y-4">
                {/* Cabecera del Cliente Seleccionado */}
                <div className="rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase text-slate-400">Expediente de Alquiler</span>
                    <span className="rounded-md bg-cyan-50 border border-cyan-200 px-2 py-0.5 text-xs font-mono font-black text-cyan-800">
                      FACTURA #{itemSeleccionado.numeroFactura}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 uppercase">{itemSeleccionado.clienteNombre}</h3>

                  <div className="grid grid-cols-2 gap-2 text-xs font-semibold pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">CÉDULA / NIT:</span>
                      <span className="font-mono font-bold text-slate-800">{itemSeleccionado.clienteCedula}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-bold">TELÉFONO PRINCIPAL:</span>
                      <span className="font-mono font-bold text-slate-800">{itemSeleccionado.clienteTelefono}</span>
                    </div>
                    {itemSeleccionado.clienteTelefono2 && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-bold">TELÉFONO SECUNDARIO:</span>
                        <span className="font-mono font-bold text-slate-800">{itemSeleccionado.clienteTelefono2}</span>
                      </div>
                    )}
                    {itemSeleccionado.clienteDireccion && (
                      <div className="col-span-2">
                        <span className="text-[10px] text-slate-400 block font-bold">DIRECCIÓN:</span>
                        <span className="text-slate-700">{itemSeleccionado.clienteDireccion}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Liquidación de Días y Recargo por Mora */}
                <div
                  className={`rounded-2xl p-4 border space-y-2 ${
                    itemSeleccionado.nivelUrgencia === "CRITICO_MORA"
                      ? "bg-rose-50/90 border-rose-200 text-rose-950"
                      : "bg-purple-50/90 border-purple-200 text-purple-950"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-black uppercase">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4 text-rose-600" />
                      Estado de Días y Penalización:
                    </span>
                    <span className="rounded bg-rose-600 text-white px-2 py-0.5 text-[10px]">
                      {itemSeleccionado.nivelUrgencia.replace(/_/g, " ")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-rose-200/80">
                    <div>
                      <span className="text-[10px] opacity-75 block font-bold">FECHA DE SALIDA:</span>
                      <span className="font-mono font-bold">{itemSeleccionado.fechaSalida}</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block font-bold">DÍAS TRANSCURRIDOS:</span>
                      <span className="font-mono font-black text-sm">{itemSeleccionado.diasTranscurridos} día(s)</span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block font-bold">DÍAS DE RETRASO:</span>
                      <span className="font-mono font-black text-rose-700 text-sm">
                        {itemSeleccionado.diasRetraso > 0 ? `${itemSeleccionado.diasRetraso} día(s)` : "Sin retraso"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] opacity-75 block font-bold">RECARGO MORA ($7.000/d):</span>
                      <span className="font-mono font-black text-rose-700 text-base">
                        ${itemSeleccionado.recargoTotalRetraso.toLocaleString("es-CO")}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-200 flex justify-between items-center text-xs font-black">
                    <span>Depósito en custodia a favor del cliente:</span>
                    <span className="text-blue-800 font-mono text-sm">
                      ${itemSeleccionado.totalDepositoRetenido.toLocaleString("es-CO")}
                    </span>
                  </div>
                </div>

                {/* Lista de Prendas a Devolver */}
                <div className="rounded-2xl bg-white p-4 border border-slate-200 shadow-xs space-y-2">
                  <span className="text-[10px] font-black uppercase text-slate-400">Prendas sin entregar:</span>
                  <div className="divide-y divide-slate-100 text-xs font-semibold">
                    {itemSeleccionado.prendas.map((p, idx) => (
                      <div key={idx} className="py-2 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-slate-900">
                            {p.cantidad}x {p.descripcion}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            Cód: {p.codigoBarras || "S/C"} · Talla: {p.talla}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-amber-700">
                          Dep: ${p.valorDeposito.toLocaleString("es-CO")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones de Acción Inmediata */}
                <div className="space-y-2 pt-1">
                  {/* Botón WhatsApp */}
                  <button
                    type="button"
                    onClick={() => handleEnviarWhatsApp(itemSeleccionado)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3.5 px-4 text-xs uppercase tracking-wider shadow-md shadow-emerald-600/20 active:scale-98 transition-all"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>Enviar Notificación por WhatsApp</span>
                  </button>

                  {/* Botón Devolver y Reintegrar Depósito Directo */}
                  <button
                    type="button"
                    onClick={() => handleIrADevolucion(itemSeleccionado)}
                    className="w-full flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-black py-3 px-4 text-xs uppercase tracking-wider shadow-md shadow-teal-600/20 active:scale-98 transition-all"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Abrir Módulo de Devolución & Reintegro</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleCopiarMensaje(itemSeleccionado)}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-bold py-2 px-3 text-xs border border-slate-300 transition-all shadow-2xs"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-500" />
                      <span>Copiar Texto</span>
                    </button>

                    <a
                      href={`tel:${itemSeleccionado.clienteTelefono}`}
                      className="flex items-center justify-center gap-1.5 rounded-xl bg-white hover:bg-slate-100 text-blue-700 font-bold py-2 px-3 text-xs border border-blue-200 transition-all shadow-2xs"
                    >
                      <Phone className="h-3.5 w-3.5 text-blue-600" />
                      <span>Llamar al Cliente</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <Bell className="h-10 w-10 text-slate-300 mb-2" />
                <p className="font-bold text-xs">Selecciona un cliente del listado</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aquí podrás enviarle el cobro automático por WhatsApp o abrir su liquidación de devolución.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
            <span>Sistema de Auditoría de Retrasos y Mora · Límite contractual: 3 días</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all shadow-xs"
          >
            Cerrar Panel
          </button>
        </footer>
      </div>
    </div>
  );
}
