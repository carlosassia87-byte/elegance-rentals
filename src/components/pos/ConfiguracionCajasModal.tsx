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
      <DialogContent className="max-w-4xl bg-[#F4F4F5] p-0 border-2 border-slate-400 shadow-2xl rounded-lg overflow-hidden text-slate-900">
        {/* Cabecera */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-3 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-red-600 text-white font-black shadow">
              <Monitor className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-wider uppercase">
                ADMINISTRACIÓN MULTI-CAJAS, TERMINALES Y PANTALLAS
              </h2>
              <p className="text-[11px] text-slate-300">
                Configura cada computador (PC), prefijos de numeración y resoluciones de pantalla
              </p>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Pestañas de Navegación */}
        <div className="flex border-b border-slate-300 bg-slate-200 px-4 pt-2 gap-2">
          <button
            onClick={() => setTabActiva("terminal")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-md transition-all ${
              tabActiva === "terminal"
                ? "bg-white text-red-700 border-t-2 border-x border-slate-300 shadow-sm"
                : "text-slate-600 hover:bg-slate-300/60"
            }`}
          >
            <Laptop className="h-4 w-4" /> Asignar Esta PC / Terminal
          </button>

          <button
            onClick={() => setTabActiva("cajas")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-md transition-all ${
              tabActiva === "cajas"
                ? "bg-white text-red-700 border-t-2 border-x border-slate-300 shadow-sm"
                : "text-slate-600 hover:bg-slate-300/60"
            }`}
          >
            <Layers className="h-4 w-4" /> Gestión de Multi-Cajas ({cajas.length})
          </button>

          <button
            onClick={() => setTabActiva("resolucion")}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-t-md transition-all ${
              tabActiva === "resolucion"
                ? "bg-white text-red-700 border-t-2 border-x border-slate-300 shadow-sm"
                : "text-slate-600 hover:bg-slate-300/60"
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
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/70 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-blue-600 p-2 text-white">
                    <Laptop className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-blue-950 uppercase">
                      Configuración de Este Dispositivo / Computador
                    </h3>
                    <p className="text-xs text-blue-800 mt-0.5">
                      Esta configuración se guarda exclusivamente en la memoria de este navegador. Te permite
                      determinar qué Caja atiende este equipo físico para generar sus propias facturas y prefijos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-300 bg-white p-4 shadow-sm space-y-4">
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
                      className="mt-1.5 h-9 w-full rounded border border-slate-400 bg-slate-50 px-3 text-xs font-black text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Nombre para identificar este puesto en la red</p>
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
                      className="mt-1.5 h-9 w-full rounded border border-slate-400 bg-slate-50 px-3 text-xs font-black text-red-700 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      {cajas.map((c) => (
                        <option key={c.IDCAJAS} value={c.IDCAJAS}>
                          {c.NOMBRECAJA} — (Prefijo: {c.PREFIJO} | Consecutivo: #{c.NUMERACION})
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
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
                      className="mt-1.5 h-9 w-full rounded border border-slate-400 bg-slate-50 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-red-600"
                    >
                      <option value="80mm">Ticket Térmico 80mm (Estándar POS)</option>
                      <option value="58mm">Ticket Térmico 58mm (Portátil / Mini POS)</option>
                      <option value="carta">Hoja Media Carta / Carta (Impresora Normal)</option>
                    </select>
                  </div>

                  <div className="col-span-12 md:col-span-6 flex flex-col justify-end">
                    <div className="rounded bg-slate-100 p-2 border border-slate-300 text-xs flex items-center justify-between">
                      <span className="font-bold text-slate-700">Estado de Vinculación:</span>
                      <span className="inline-flex items-center gap-1 font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Vinculado a {terminal.nombreCaja}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleGuardarTerminal}
                    className="flex items-center gap-2 h-9 rounded bg-[#B80036] px-6 text-xs font-black uppercase tracking-wider text-white shadow-md hover:bg-[#96002C] active:scale-95"
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
                  <p className="text-[11px] text-slate-500">
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
                  className="flex items-center gap-1.5 h-8 rounded bg-emerald-600 px-3 text-xs font-black text-white hover:bg-emerald-700 shadow"
                >
                  <Plus className="h-4 w-4" /> NUEVA CAJA
                </button>
              </div>

              {/* Formulario Crear/Editar Caja */}
              {cajaEditando && (
                <form
                  onSubmit={handleGuardarCaja}
                  className="rounded-lg border-2 border-amber-400 bg-amber-50/80 p-4 shadow-md space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between border-b border-amber-300 pb-2">
                    <h4 className="text-xs font-black text-amber-950 uppercase flex items-center gap-1.5">
                      <Settings2 className="h-4 w-4 text-amber-700" />
                      {cajaEditando.IDCAJAS ? `Editar ${cajaEditando.NOMBRECAJA}` : "Crear Nueva Caja"}
                    </h4>
                    <button
                      type="button"
                      onClick={() => setCajaEditando(null)}
                      className="text-amber-800 hover:text-black text-xs font-bold"
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
                        className="mt-1 h-8 w-full rounded border border-slate-400 bg-white px-2 text-xs font-bold text-slate-900 uppercase"
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
                        className="mt-1 h-8 w-full rounded border border-slate-400 bg-white px-2 text-xs font-black text-red-700 uppercase"
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
                        className="mt-1 h-8 w-full rounded border border-slate-400 bg-white px-2 text-xs font-black text-slate-900"
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
                        className="mt-1 h-8 w-full rounded border border-slate-400 bg-white px-2 text-xs font-semibold text-slate-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="submit"
                      className="flex items-center gap-1.5 h-8 rounded bg-amber-600 px-4 text-xs font-black text-white hover:bg-amber-700 shadow"
                    >
                      <Save className="h-3.5 w-3.5" /> Guardar Caja
                    </button>
                  </div>
                </form>
              )}

              {/* Tabla de Cajas */}
              <div className="rounded-md border border-slate-300 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-black uppercase text-[11px]">
                      <th className="p-2.5">ID</th>
                      <th className="p-2.5">Nombre de Caja</th>
                      <th className="p-2.5">Prefijo</th>
                      <th className="p-2.5">Consecutivo</th>
                      <th className="p-2.5">Ubicación</th>
                      <th className="p-2.5 text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cajas.map((c) => {
                      const esEstaPC = terminal.idCajaAsignada === c.IDCAJAS;
                      return (
                        <tr key={c.IDCAJAS} className={`hover:bg-slate-50 ${esEstaPC ? "bg-red-50/50" : ""}`}>
                          <td className="p-2.5 font-bold text-slate-600">#{c.IDCAJAS}</td>
                          <td className="p-2.5 font-black text-slate-900 uppercase flex items-center gap-2">
                            {c.NOMBRECAJA}
                            {esEstaPC && (
                              <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.2 rounded font-black">
                                Esta PC
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 font-black text-red-700 uppercase">{c.PREFIJO}</td>
                          <td className="p-2.5 font-bold text-slate-800">
                            {c.PREFIJO}{c.NUMERACION}
                          </td>
                          <td className="p-2.5 text-slate-600 font-semibold">{c.DESCRIPCION_UBICACION || "—"}</td>
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setCajaEditando(c)}
                                title="Editar Caja"
                                className="p-1 rounded text-blue-700 hover:bg-blue-100"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminarCaja(c.IDCAJAS)}
                                title="Eliminar Caja"
                                className="p-1 rounded text-red-600 hover:bg-red-100"
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
              <div className="rounded-lg border-2 border-purple-200 bg-purple-50/70 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-purple-600 p-2 text-white">
                    <Maximize2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-purple-950 uppercase">
                      Adaptación de Resolución y Escala Visual
                    </h3>
                    <p className="text-xs text-purple-800 mt-0.5">
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
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-lg border-2 p-3.5 cursor-pointer transition-all ${
                    resolucion.modo === "compacta"
                      ? "border-red-600 bg-red-50/80 shadow-md ring-2 ring-red-400"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Pantalla Compacta</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1024 × 768 / Laptops 14"</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Escala al 85% para ver todo el formulario sin scroll en pantallas pequeñas.
                  </div>
                  <div className="mt-3 font-black text-xs text-red-700">Zoom: 85%</div>
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
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-lg border-2 p-3.5 cursor-pointer transition-all ${
                    resolucion.modo === "estandar"
                      ? "border-red-600 bg-red-50/80 shadow-md ring-2 ring-red-400"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Resolución Estándar</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1366 × 768 / 1600 × 900</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Tamaño nativo del 100%. Ideal para la mayoría de monitores comerciales.
                  </div>
                  <div className="mt-3 font-black text-xs text-red-700">Zoom: 100%</div>
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
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-lg border-2 p-3.5 cursor-pointer transition-all ${
                    resolucion.modo === "hd"
                      ? "border-red-600 bg-red-50/80 shadow-md ring-2 ring-red-400"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Monitores Grandes HD</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">1920 × 1080 / 2K Full HD</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Escala al 115% para que los textos y botones se lean con total claridad a distancia.
                  </div>
                  <div className="mt-3 font-black text-xs text-red-700">Zoom: 115%</div>
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
                  className={`col-span-12 sm:col-span-6 md:col-span-3 rounded-lg border-2 p-3.5 cursor-pointer transition-all ${
                    resolucion.modo === "tactil"
                      ? "border-red-600 bg-red-50/80 shadow-md ring-2 ring-red-400"
                      : "border-slate-300 bg-white hover:border-slate-400"
                  }`}
                >
                  <div className="font-black text-xs text-slate-900 uppercase">Pantallas Táctiles</div>
                  <div className="text-[11px] text-slate-500 font-bold mt-0.5">POS All-in-One Touch</div>
                  <div className="mt-2 text-[10px] text-slate-600 leading-tight">
                    Botones y tablas amplias para facilitar el toque con los dedos.
                  </div>
                  <div className="mt-3 font-black text-xs text-red-700">Zoom: 110%</div>
                </div>
              </div>

              {/* CONTROL DESLIZANTE MANUAL */}
              <div className="rounded-md border border-slate-300 bg-white p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 uppercase">
                    Ajuste Manual de Escala (%)
                  </label>
                  <span className="font-black text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
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
                  className="w-full accent-[#B80036] cursor-pointer"
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
        <div className="flex items-center justify-between bg-slate-200 px-5 py-3 border-t border-slate-300">
          <div className="text-xs font-bold text-slate-700">
            Terminal activa: <strong className="text-red-700">{terminal.nombreEquipo}</strong> — {terminal.nombreCaja} ({terminal.prefijo})
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="h-8 rounded bg-slate-800 px-5 text-xs font-black uppercase text-white hover:bg-black shadow"
          >
            Cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
