import React, { useState, useEffect } from "react";
import {
  Monitor,
  Plus,
  Trash2,
  Edit2,
  Save,
  X,
  CheckCircle2,
  Laptop,
  Maximize2,
  Printer,
  Hash,
  Sparkles,
  Layers,
  Settings2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  listarCajas,
  guardarCaja,
  eliminarCaja,
  obtenerTerminalConfig,
  guardarTerminalConfig,
  obtenerResolucionConfig,
  aplicarEscalaResolucion,
  type CajaDetalle,
  type TerminalConfig,
  type ResolucionConfig,
} from "@/services/empresaCajaService";

interface ConfiguracionCajasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCajaCambiada?: (terminal: TerminalConfig) => void;
}

export function ConfiguracionCajasModal({
  open,
  onOpenChange,
  onCajaCambiada,
}: ConfiguracionCajasModalProps) {
  const [tabActiva, setTabActiva] = useState<"terminal" | "cajas" | "resolucion">("terminal");

  // Lista de Cajas
  const [cajas, setCajas] = useState<CajaDetalle[]>([]);
  const [cajaEditando, setCajaEditando] = useState<Partial<CajaDetalle> | null>(null);

  // Configuración de esta PC
  const [terminal, setTerminal] = useState<TerminalConfig>(obtenerTerminalConfig());

  // Configuración de Resolución
  const [resolucion, setResolucion] = useState<ResolucionConfig>(obtenerResolucionConfig());

  const cargarDatos = async () => {
    const list = await listarCajas();
    setCajas(list);
    setTerminal(obtenerTerminalConfig());
    setResolucion(obtenerResolucionConfig());
  };

  useEffect(() => {
    if (open) {
      cargarDatos();
    }
  }, [open]);

  // Asignar esta PC a una caja
  const handleGuardarTerminal = () => {
    const cajaSel = cajas.find((c) => c.IDCAJAS === terminal.idCajaAsignada);
    const updatedTerminal: TerminalConfig = {
      ...terminal,
      nombreCaja: cajaSel ? cajaSel.NOMBRECAJA : terminal.nombreCaja,
      prefijo: cajaSel ? cajaSel.PREFIJO : terminal.prefijo,
    };

    guardarTerminalConfig(updatedTerminal);
    setTerminal(updatedTerminal);
    toast.success(`Esta PC fue vinculada con éxito a: ${updatedTerminal.nombreCaja} (Prefijo: ${updatedTerminal.prefijo})`);
    onCajaCambiada?.(updatedTerminal);
  };

  // Guardar Caja individual
  const handleGuardarCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cajaEditando || !cajaEditando.NOMBRECAJA?.trim()) {
      toast.error("El nombre de la caja es obligatorio");
      return;
    }

    const guardada = await guardarCaja(cajaEditando);
    toast.success(`Caja ${guardada.NOMBRECAJA} guardada con éxito`);
    setCajaEditando(null);
    await cargarDatos();
  };

  // Eliminar Caja
  const handleEliminarCaja = async (id: number) => {
    if (cajas.length <= 1) {
      toast.error("Debe existir al menos una caja en el sistema");
      return;
    }
    if (confirm("¿Estás seguro de eliminar esta caja?")) {
      await eliminarCaja(id);
      toast.info("Caja eliminada");
      await cargarDatos();
    }
  };

  // Aplicar Resolución
  const handleAplicarResolucion = (nuevaRes: ResolucionConfig) => {
    setResolucion(nuevaRes);
    aplicarEscalaResolucion(nuevaRes);
    toast.success(`Escala visual aplicada: ${nuevaRes.modo.toUpperCase()} (${nuevaRes.escalaPorcentaje}%)`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wide uppercase">
                ADMINISTRACIÓN MULTI-CAJAS, TERMINALES Y PANTALLAS
              </h2>
              <p className="text-[11px] text-slate-300">
                Configura cada computador (PC), prefijos de numeración y resoluciones de pantalla
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-4 pt-2.5 gap-2">
          <button
            onClick={() => setTabActiva("terminal")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all ${
              tabActiva === "terminal"
                ? "bg-white text-emerald-700 border-t-2 border-x border-slate-200 shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Laptop className="h-4 w-4" /> Asignar Esta PC / Terminal
          </button>

          <button
            onClick={() => setTabActiva("cajas")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all ${
              tabActiva === "cajas"
                ? "bg-white text-emerald-700 border-t-2 border-x border-slate-200 shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Layers className="h-4 w-4" /> Gestión de Multi-Cajas ({cajas.length})
          </button>

          <button
            onClick={() => setTabActiva("resolucion")}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider rounded-t-xl transition-all ${
              tabActiva === "resolucion"
                ? "bg-white text-emerald-700 border-t-2 border-x border-slate-200 shadow-xs"
                : "text-slate-600 hover:bg-slate-200/60"
            }`}
          >
            <Maximize2 className="h-4 w-4" /> Resoluciones y Escala UI
          </button>
        </div>

        {/* CONTENIDO DE PESTAÑAS */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {/* TAB 1: ASIGNAR ESTA PC */}
          {tabActiva === "terminal" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50/40 p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-emerald-600 p-2.5 text-white shadow-xs">
                    <Laptop className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950 uppercase">
                      Configuración de Este Dispositivo / Computador
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Esta configuración se guarda exclusivamente en la memoria de este navegador. Te permite
                      determinar qué Caja atiende este equipo físico para generar sus propias facturas y prefijos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-4">
                <div className="grid grid-cols-12 gap-4">
                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Identificador o Nombre de Esta PC
                    </label>
                    <input
                      type="text"
                      value={terminal.nombreEquipo}
                      onChange={(e) => setTerminal((p) => ({ ...p, nombreEquipo: e.target.value }))}
                      placeholder="Ej. PC-MOSTRADOR-01"
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-black text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    />
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">Nombre para identificar este puesto en la red</p>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide">
                      Caja Asignada a Esta Máquina
                    </label>
                    <select
                      value={terminal.idCajaAsignada}
                      onChange={(e) => {
                        const id = Number(e.target.value);
                        const sel = cajas.find((c) => c.IDCAJAS === id);
                        if (sel) {
                          setTerminal((p) => ({
                            ...p,
                            idCajaAsignada: id,
                            nombreCaja: sel.NOMBRECAJA,
                            prefijo: sel.PREFIJO,
                          }));
                        }
                      }}
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-black text-emerald-700 uppercase focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    >
                      {cajas.map((c) => (
                        <option key={c.IDCAJAS} value={c.IDCAJAS}>
                          {c.NOMBRECAJA} — (Prefijo: {c.PREFIJO} | Consecutivo: #{c.NUMERACION})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1 font-medium">
                      Todas las facturas de este equipo usarán esta caja y su prefijo
                    </p>
                  </div>

                  <div className="col-span-12 md:col-span-6">
                    <label className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Printer className="h-3.5 w-3.5 text-slate-600" /> Formato de Impresora Predeterminado
                    </label>
                    <select
                      value={terminal.tamanoPapel}
                      onChange={(e) =>
                        setTerminal((p) => ({ ...p, tamanoPapel: e.target.value as any }))
                      }
                      className="mt-1.5 h-9 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                    >
                      <option value="80mm">Ticket Térmico 80mm (Estándar POS)</option>
                      <option value="58mm">Ticket Térmico 58mm (Portátil / Mini POS)</option>
                      <option value="carta">Hoja Media Carta / Carta (Impresora Normal)</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6 flex flex-col justify-end">
                    <div className="rounded-xl bg-slate-100/80 p-2.5 border border-slate-200 text-xs flex items-center justify-between">
                      <span className="font-bold text-slate-700">Estado de Vinculación:</span>
                      <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Vinculado a {terminal.nombreCaja}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGuardarTerminal}
                    className="flex items-center gap-2 h-9 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 transition-all"
                  >
                    <Save className="h-4 w-4" /> Guardar Asignación en Esta PC
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GESTIÓN DE MULTI-CAJAS */}
          {tabActiva === "cajas" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                    Catálogo de Cajas y Puntos de Cobro
                  </h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Define las cajas activas, su prefijo de facturación y el último consecutivo
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setCajaEditando({
                      IDCAJAS: 0,
                      NOMBRECAJA: `CAJA ${cajas.length + 1}`,
                      PREFIJO: `POS${cajas.length + 1}-`,
                      NUMERACION: 1,
                      RESOLUCION: "1366x768",
                      DESCRIPCION_UBICACION: "Mostrador",
                    })
                  }
                  className="flex items-center gap-1.5 h-8 rounded-xl bg-emerald-600 px-3.5 text-xs font-black text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" /> NUEVA CAJA
                </button>
              </div>

              {/* Formulario Crear/Editar Caja */}
              {cajaEditando && (
                <form
                  onSubmit={handleGuardarCaja}
                  className="rounded-2xl border border-emerald-300 bg-emerald-50/50 p-4 shadow-sm space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-2">
                    <h4 className="text-xs font-black text-emerald-950 uppercase flex items-center gap-1.5">
                      <Settings2 className="h-4 w-4 text-emerald-700" />
                      {cajaEditando.IDCAJAS ? `Editar ${cajaEditando.NOMBRECAJA}` : "Crear Nueva Caja"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCajaEditando(null)}
                      className="text-slate-500 hover:text-slate-800 text-xs font-bold"
                    >
                      Cancelar
                    </button>
                  </div>

                  <div className="grid grid-cols-12 gap-3 text-xs">
                    <div className="col-span-12 md:col-span-4">
                      <label className="font-bold text-slate-800 uppercase">Nombre de Caja</label>
                      <input
                        type="text"
                        required
                        value={cajaEditando.NOMBRECAJA || ""}
                        onChange={(e) =>
                          setCajaEditando((p) => ({ ...p, NOMBRECAJA: e.target.value }))
                        }
                        placeholder="Ej. CAJA 2 / SERVIDOR"
                        className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-900 uppercase focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="font-bold text-slate-800 uppercase">Prefijo</label>
                      <input
                        type="text"
                        value={cajaEditando.PREFIJO || ""}
                        onChange={(e) =>
                          setCajaEditando((p) => ({ ...p, PREFIJO: e.target.value }))
                        }
                        placeholder="Ej. G o POS2-"
                        className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-black text-emerald-700 uppercase focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-6 md:col-span-2">
                      <label className="font-bold text-slate-800 uppercase">Consecutivo Actual</label>
                      <input
                        type="number"
                        min="1"
                        value={cajaEditando.NUMERACION || 1}
                        onChange={(e) =>
                          setCajaEditando((p) => ({
                            ...p,
                            NUMERACION: Number(e.target.value) || 1,
                          }))
                        }
                        className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-black text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="col-span-12 md:col-span-4">
                      <label className="font-bold text-slate-800 uppercase">Ubicación / Detalle</label>
                      <input
                        type="text"
                        value={cajaEditando.DESCRIPCION_UBICACION || ""}
                        onChange={(e) =>
                          setCajaEditando((p) => ({
                            ...p,
                            DESCRIPCION_UBICACION: e.target.value,
                          }))
                        }
                        placeholder="Ej. Piso 1 / Entrada"
                        className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 h-8 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700 shadow-xs transition-all active:scale-95"
                    >
                      <Save className="h-3.5 w-3.5" /> Guardar Caja
                    </button>
                  </div>
                </form>
              )}

              {/* Tabla de Cajas */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-black uppercase text-[11px]">
                      <th className="p-3">ID</th>
                      <th className="p-3">Nombre de Caja</th>
                      <th className="p-3">Prefijo</th>
                      <th className="p-3">Consecutivo</th>
                      <th className="p-3">Ubicación</th>
                      <th className="p-3 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cajas.map((c) => {
                      const esEstaPC = terminal.idCajaAsignada === c.IDCAJAS;
                      return (
                        <tr key={c.IDCAJAS} className={`hover:bg-slate-50 ${esEstaPC ? "bg-emerald-50/40" : ""}`}>
                          <td className="p-3 font-bold text-slate-500">#{c.IDCAJAS}</td>
                          <td className="p-3 font-black text-slate-900 uppercase flex items-center gap-2">
                            {c.NOMBRECAJA}
                            {esEstaPC && (
                              <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black">
                                Esta PC
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-black text-emerald-700 uppercase">{c.PREFIJO}</td>
                          <td className="p-3 font-bold text-slate-800">
                            {c.PREFIJO}{c.NUMERACION}
                          </td>
                          <td className="p-3 text-slate-600 font-semibold">{c.DESCRIPCION_UBICACION || "—"}</td>
                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCajaEditando(c)}
                                title="Editar Caja"
                                className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarCaja(c.IDCAJAS)}
                                title="Eliminar Caja"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: RESOLUCIONES Y ESCALADO UI */}
          {tabActiva === "resolucion" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-teal-600 p-2.5 text-white shadow-xs">
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-teal-950 uppercase">
                      Adaptación de Resolución y Escala Visual
                    </h3>
                    <p className="text-xs text-teal-800 mt-0.5">
                      Elige el ajuste óptimo para el monitor de este equipo. Puedes agrandar o compactar toda la
                      interfaz para que encaje al 100% en pantallas táctiles, laptops o monitores gigantes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-3.5">
                {/* PRESET 1: COMPACTO */}
                <div
                  onClick={() =>
                    handleAplicarResolucion({
                      modo: "compacta",
                      escalaPorcentaje: 85,
                      forzarPantallaCompleta: false,
                    })
                  }
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    resolucion.modo === "compacta"
                      ? "border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Pantalla Compacta</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1024 × 768 / Laptops 14"</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Escala al 85% para ver todo el formulario sin scroll en pantallas pequeñas.
                  </div>
                  <div className="mt-3 font-black text-xs text-emerald-700">Zoom: 85%</div>
                </div>

                {/* PRESET 2: ESTÁNDAR */}
                <div
                  onClick={() =>
                    handleAplicarResolucion({
                      modo: "estandar",
                      escalaPorcentaje: 100,
                      forzarPantallaCompleta: false,
                    })
                  }
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    resolucion.modo === "estandar"
                      ? "border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Resolución Estándar</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1366 × 768 / 1600 × 900</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Tamaño nativo del 100%. Ideal para la mayoría de monitores comerciales.
                  </div>
                  <div className="mt-3 font-black text-xs text-emerald-700">Zoom: 100%</div>
                </div>

                {/* PRESET 3: HD / MONITORES GRANDES */}
                <div
                  onClick={() =>
                    handleAplicarResolucion({
                      modo: "hd",
                      escalaPorcentaje: 115,
                      forzarPantallaCompleta: false,
                    })
                  }
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    resolucion.modo === "hd"
                      ? "border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Monitores Grandes HD</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1920 × 1080 / 2K Full HD</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Escala al 115% para que los textos y botones se lean con total claridad a distancia.
                  </div>
                  <div className="mt-3 font-black text-xs text-emerald-700">Zoom: 115%</div>
                </div>

                {/* PRESET 4: MODO TÁCTIL */}
                <div
                  onClick={() =>
                    handleAplicarResolucion({
                      modo: "tactil",
                      escalaPorcentaje: 110,
                      forzarPantallaCompleta: false,
                    })
                  }
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                    resolucion.modo === "tactil"
                      ? "border-emerald-600 bg-emerald-50/80 shadow-xs ring-2 ring-emerald-400/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Pantallas Táctiles</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">POS All-in-One Touch</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Botones y tablas amplias para facilitar el toque con los dedos.
                  </div>
                  <div className="mt-3 font-black text-xs text-emerald-700">Zoom: 110%</div>
                </div>
              </div>

              {/* CONTROL DESLIZANTE MANUAL */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase">
                    Ajuste Manual de Escala (%)
                  </label>
                  <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    {resolucion.escalaPorcentaje}%
                  </span>
                </div>

                <input
                  type="range"
                  min="70"
                  max="135"
                  step="5"
                  value={resolucion.escalaPorcentaje}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    handleAplicarResolucion({
                      modo: "personalizada",
                      escalaPorcentaje: val,
                      forzarPantallaCompleta: resolucion.forzarPantallaCompleta,
                    });
                  }}
                  className="w-full accent-emerald-600 cursor-pointer"
                />

                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                  <span>70% (Ultra Compacto)</span>
                  <span>100% (Estándar)</span>
                  <span>135% (Gigante)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del Modal */}
        <div className="flex items-center justify-between bg-slate-50 px-5 py-3.5 border-t border-slate-200">
          <div className="text-xs font-bold text-slate-700">
            Terminal activa: <strong className="text-emerald-700">{terminal.nombreEquipo}</strong> — {terminal.nombreCaja} ({terminal.prefijo})
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-5 text-xs font-bold uppercase shadow-2xs transition-all"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
