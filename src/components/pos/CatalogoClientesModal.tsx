import React, { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Printer,
  X,
  Phone,
  MessageCircle,
  Building2,
  MapPin,
  FileText,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  UserCheck,
  ChevronRight,
  Save,
  Loader2,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Cliente } from "@/types/database.types";
import {
  listarTodosLosClientes,
  guardarCliente,
  eliminarCliente,
} from "@/services/posService";
import { consultarCedulaColombia } from "@/services/consultaCedulaColombiaService";
import type { EmpresaConfig } from "@/services/empresaCajaService";

interface CatalogoClientesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSeleccionarCliente?: (cliente: Cliente) => void;
  empresa?: EmpresaConfig;
}

export function CatalogoClientesModal({
  open,
  onOpenChange,
  onSeleccionarCliente,
  empresa,
}: CatalogoClientesModalProps) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  // Modal para Crear / Modificar
  const [modalFormulario, setModalFormulario] = useState(false);
  const [form, setForm] = useState<Partial<Cliente>>({
    IDCLIENTES: 0,
    CEDULA: 0,
    NOMBRE: "",
    DIRECCION: "",
    TELEFONO: "",
    TELEFONO2: "",
    EMPRESA: "",
    DIRECCIONEMP: "",
    SALDO: 0,
    NOTA: "",
  });
  const [guardando, setGuardando] = useState(false);
  const [buscandoCedula, setBuscandoCedula] = useState(false);

  const handleBuscarCedulaAutoRelleno = async () => {
    if (!form.CEDULA || form.CEDULA === 0) {
      toast.error("Ingresa la cédula a buscar");
      return;
    }
    setBuscandoCedula(true);
    try {
      const res = await consultarCedulaColombia(form.CEDULA);
      if (res.encontrado && res.cliente) {
        setForm((prev) => ({
          ...prev,
          ...res.cliente,
          NOMBRE: res.cliente.NOMBRE || res.nombreCompleto || prev.NOMBRE,
          DIRECCION: res.cliente.DIRECCION || prev.DIRECCION,
          TELEFONO: res.cliente.TELEFONO || prev.TELEFONO,
          TELEFONO2: res.cliente.TELEFONO2 || prev.TELEFONO2,
          NOTA: res.cliente.NOTA || prev.NOTA,
        }));
        if (res.origen === "LOCAL_DB") {
          toast.success(`✓ Cliente ya existente en catálogo: ${res.nombreCompleto}`);
        } else if (res.origen === "RUT_DIAN") {
          toast.success(`✓ Datos obtenidos de RUT / DIAN: ${res.nombreCompleto}`, { duration: 5000 });
        } else {
          toast.success(`✓ Datos encontrados: ${res.nombreCompleto}`);
        }
      } else {
        toast.info("Cédula no encontrada en bases de datos. Completa los datos manualmente.");
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al consultar la cédula");
    } finally {
      setBuscandoCedula(false);
    }
  };

  const cargarClientes = async () => {
    setCargando(true);
    try {
      const data = await listarTodosLosClientes(busqueda);
      setClientes(data);

      if (data.length > 0) {
        setClienteSeleccionado((prev) => {
          if (!prev) return data[0];
          const found = data.find((c) => c.IDCLIENTES === prev.IDCLIENTES);
          return found || data[0];
        });
      } else {
        setClienteSeleccionado(null);
      }
    } catch (err) {
      console.error("Error cargando clientes:", err);
      toast.error("Error al cargar la lista de clientes");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarClientes();
    }
  }, [open, busqueda]);

  const handleNuevoCliente = () => {
    setForm({
      IDCLIENTES: 0,
      CEDULA: 0,
      NOMBRE: "",
      DIRECCION: "",
      TELEFONO: "",
      TELEFONO2: "",
      EMPRESA: "",
      DIRECCIONEMP: "",
      SALDO: 0,
      NOTA: "",
    });
    setModalFormulario(true);
  };

  const handleEditarCliente = (cli: Cliente) => {
    setForm({ ...cli });
    setModalFormulario(true);
  };

  const handleEliminarCliente = async (cli: Cliente) => {
    if (!cli.IDCLIENTES) return;
    if (confirm(`¿Estás seguro de eliminar al cliente "${cli.NOMBRE}"?`)) {
      const ok = await eliminarCliente(cli.IDCLIENTES);
      if (ok) {
        toast.success(`Cliente "${cli.NOMBRE}" eliminado`);
        await cargarClientes();
      } else {
        toast.error("No se pudo eliminar el cliente");
      }
    }
  };

  const handleGuardarFormulario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.NOMBRE?.trim()) {
      toast.error("El nombre del cliente es obligatorio");
      return;
    }
    if (!form.CEDULA || form.CEDULA <= 0) {
      toast.error("La cédula o documento es obligatorio");
      return;
    }

    setGuardando(true);
    try {
      const res = await guardarCliente(form);
      if (res) {
        toast.success(
          form.IDCLIENTES
            ? `Cliente "${res.NOMBRE}" actualizado con éxito`
            : `Cliente "${res.NOMBRE}" registrado con éxito`
        );
        setModalFormulario(false);
        await cargarClientes();
      }
    } catch (err) {
      toast.error("Ocurrió un error al guardar el cliente");
    } finally {
      setGuardando(false);
    }
  };

  const handleExportarXLS = () => {
    if (clientes.length === 0) {
      toast.warning("No hay clientes para exportar");
      return;
    }

    const headers = ["ID,Cédula,Nombre,Teléfono,Teléfono 2,Dirección,Empresa,Saldo,Nota"];
    const rows = clientes.map((c) =>
      [
        c.IDCLIENTES || "",
        c.CEDULA || "",
        `"${(c.NOMBRE || "").replace(/"/g, '""')}"`,
        `"${c.TELEFONO || ""}"`,
        `"${c.TELEFONO2 || ""}"`,
        `"${(c.DIRECCION || "").replace(/"/g, '""')}"`,
        `"${(c.EMPRESA || "").replace(/"/g, '""')}"`,
        c.SALDO || 0,
        `"${(c.NOTA || "").replace(/"/g, '""')}"`,
      ].join(",")
    );

    const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `directorio_clientes_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Catálogo de clientes exportado exitosamente");
  };

  const abrirWhatsApp = (telefono: string, nombre: string) => {
    const clean = (telefono || "").replace(/\D/g, "");
    if (!clean || clean.length < 7) {
      toast.warning("El cliente no tiene un teléfono válido");
      return;
    }
    const texto = encodeURIComponent(
      `Hola ${nombre}, te saludamos de ${empresa?.nombreComercial || "La Casa del Disfraz"}.`
    );
    window.open(`https://wa.me/57${clean}?text=${texto}`, "_blank");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-[95vw] lg:max-w-7xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900 h-[92vh] flex flex-col">
          {/* =========================================================================
              1. CABECERA PRINCIPAL
          ========================================================================= */}
          <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black tracking-wide uppercase">
                    DIRECTORIO Y CATÁLOGO GENERAL DE CLIENTES
                  </h2>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/30">
                    {clientes.length} Registrados
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Administra la base de datos de clientes, teléfonos, direcciones, empresas asociadas y saldos
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

          {/* =========================================================================
              2. BARRA DE HERRAMIENTAS Y ACCIONES
          ========================================================================= */}
          <div className="bg-white border-b border-slate-200 p-4 space-y-3 shrink-0 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* BOTONES DE ACCIÓN DE CATÁLOGO */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleNuevoCliente}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-black text-white shadow-xs transition-all active:scale-95"
                >
                  <Plus className="h-4 w-4" /> NUEVO CLIENTE
                </button>

                <button
                  type="button"
                  disabled={!clienteSeleccionado}
                  onClick={() => clienteSeleccionado && handleEditarCliente(clienteSeleccionado)}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-900 px-3.5 text-xs font-bold text-white shadow-xs transition-all disabled:opacity-40"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Modificar
                </button>

                <button
                  type="button"
                  disabled={!clienteSeleccionado}
                  onClick={() => clienteSeleccionado && handleEliminarCliente(clienteSeleccionado)}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3.5 text-xs font-bold transition-all disabled:opacity-40"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Eliminar
                </button>

                <div className="h-6 w-px bg-slate-300 mx-1" />

                <button
                  type="button"
                  onClick={handleExportarXLS}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 text-xs font-bold transition-all"
                  title="Exportar a Excel (CSV)"
                >
                  <FileSpreadsheet className="h-4 w-4 text-emerald-700" /> XLS
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 text-xs font-bold transition-all"
                  title="Imprimir Directorio"
                >
                  <Printer className="h-4 w-4 text-slate-600" /> Imprimir
                </button>
              </div>

              {/* BUSCADOR UNIVERSAL EN VIVO */}
              <div className="flex items-center gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Buscar por nombre, cédula, teléfono o empresa..."
                    className="h-9 w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
                  />
                </div>

                <button
                  type="button"
                  onClick={cargarClientes}
                  disabled={cargando}
                  className="flex items-center gap-1.5 h-9 rounded-xl bg-slate-800 hover:bg-slate-900 px-3 text-xs font-bold text-white shadow-xs transition-all active:scale-95 shrink-0"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-emerald-400" : ""}`} />
                </button>
              </div>
            </div>
          </div>

          {/* =========================================================================
              3. TABLA DE CLIENTES (LISTADO PRINCIPAL)
          ========================================================================= */}
          <div className="flex-1 p-4 overflow-hidden flex flex-col">
            <div className="flex-1 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {clientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full p-12 text-center text-slate-400">
                    <Users className="h-12 w-12 text-slate-300 mb-2" />
                    <p className="font-bold text-sm text-slate-700">No se encontraron clientes</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {busqueda ? "Intenta con otro término de búsqueda" : "Haz clic en 'Nuevo Cliente' para registrar uno"}
                    </p>
                  </div>
                ) : (
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-white font-black uppercase text-[11px]">
                      <tr>
                        <th className="p-3">Cédula / NIT</th>
                        <th className="p-3">Nombre Completo</th>
                        <th className="p-3">Teléfono / Celular</th>
                        <th className="p-3">Dirección</th>
                        <th className="p-3">Empresa / Institución</th>
                        <th className="p-3 text-right">Saldo Deber</th>
                        <th className="p-3">Nota / Observación</th>
                        <th className="p-3 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {clientes.map((cli) => {
                        const esSeleccionado = clienteSeleccionado?.IDCLIENTES === cli.IDCLIENTES;
                        const tieneSaldo = Number(cli.SALDO || 0) > 0;

                        return (
                          <tr
                            key={cli.IDCLIENTES || cli.CEDULA}
                            onClick={() => setClienteSeleccionado(cli)}
                            onDoubleClick={() => {
                              setClienteSeleccionado(cli);
                              if (onSeleccionarCliente) {
                                onSeleccionarCliente(cli);
                                onOpenChange(false);
                              } else {
                                handleEditarCliente(cli);
                              }
                            }}
                            className={`cursor-pointer transition-colors ${
                              esSeleccionado
                                ? "bg-emerald-50/90 font-bold border-l-4 border-l-emerald-600 shadow-2xs"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            <td className="p-3 font-mono font-black text-slate-900">
                              <span className="bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {cli.CEDULA}
                              </span>
                            </td>

                            <td className="p-3 font-black text-slate-900 uppercase">
                              {cli.NOMBRE}
                            </td>

                            <td className="p-3 font-semibold text-slate-700">
                              <div className="flex items-center gap-1.5">
                                <span>{cli.TELEFONO || "—"}</span>
                                {cli.TELEFONO && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      abrirWhatsApp(cli.TELEFONO, cli.NOMBRE);
                                    }}
                                    className="p-1 rounded-md text-emerald-600 hover:bg-emerald-50"
                                    title="Enviar WhatsApp"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            <td className="p-3 text-slate-600 font-medium max-w-xs truncate">
                              {cli.DIRECCION || "—"}
                            </td>

                            <td className="p-3 text-slate-700 font-semibold uppercase">
                              {cli.EMPRESA || "—"}
                            </td>

                            <td className="p-3 text-right">
                              {tieneSaldo ? (
                                <span className="font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[10px]">
                                  ${Number(cli.SALDO).toLocaleString("es-CO")}
                                </span>
                              ) : (
                                <span className="font-bold text-emerald-700 text-[10px]">Al día</span>
                              )}
                            </td>

                            <td className="p-3 text-slate-500 font-medium max-w-xs truncate text-[11px]">
                              {cli.NOTA || "—"}
                            </td>

                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {onSeleccionarCliente && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSeleccionarCliente(cli);
                                      onOpenChange(false);
                                    }}
                                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-2.5 py-1 text-[10px] font-black text-white shadow-2xs transition-all active:scale-95"
                                  >
                                    Seleccionar
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditarCliente(cli);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                  title="Editar Cliente"
                                >
                                  <Edit2 className="h-3.5 w-3.5" />
                                </button>

                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEliminarCliente(cli);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                  title="Eliminar Cliente"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* =========================================================================
              4. PIE DEL MODAL CON ACCIÓN DE CIERRE
          ========================================================================= */}
          <div className="flex items-center justify-between bg-slate-50 px-6 py-3.5 border-t border-slate-200 shrink-0">
            <div className="text-xs text-slate-600">
              Total <strong>{clientes.length}</strong> clientes en el catálogo • Doble clic para cargar en el Punto de Venta
            </div>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-6 text-xs font-bold uppercase shadow-2xs transition-all"
            >
              Cerrar Catálogo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* =========================================================================
          MODAL: FORMULARIO DE ALTA / MODIFICACIÓN DE CLIENTE
      ========================================================================= */}
      <Dialog open={modalFormulario} onOpenChange={setModalFormulario}>
        <DialogContent className="max-w-2xl bg-[#F8FAFC] p-0 border border-slate-200 shadow-2xl rounded-2xl overflow-hidden text-slate-900">
          <div className="flex items-center justify-between bg-slate-900 px-5 py-4 text-white">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white font-black shadow-xs">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black tracking-wide uppercase">
                  {form.IDCLIENTES ? `Modificar Cliente: ${form.NOMBRE}` : "Registrar Nuevo Cliente"}
                </h3>
                <p className="text-[11px] text-slate-300">
                  Ingresa o actualiza los datos personales, de contacto y notas del cliente
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalFormulario(false)}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleGuardarFormulario} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
              <div className="grid grid-cols-12 gap-3 text-xs">
                {/* CEDULA */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Cédula / Documento *</label>
                  <div className="mt-1 flex items-center gap-2">
                    <input
                      type="number"
                      required
                      min={1}
                      value={form.CEDULA || ""}
                      onChange={(e) => setForm((p) => ({ ...p, CEDULA: Number(e.target.value) || 0 }))}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleBuscarCedulaAutoRelleno())}
                      placeholder="Ej. 1144123456"
                      className="h-8 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                    />
                    <button
                      type="button"
                      disabled={buscandoCedula}
                      onClick={handleBuscarCedulaAutoRelleno}
                      className="flex items-center gap-1 h-8 rounded-xl bg-slate-900 hover:bg-black text-white px-3 text-xs font-bold shadow-2xs uppercase transition-all disabled:opacity-50"
                      title="Buscar en base de datos o RUT / DIAN"
                    >
                      {buscandoCedula ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                          <span>Buscando...</span>
                        </>
                      ) : (
                        <>
                          <Search className="h-3 w-3" />
                          <span>Buscar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* NOMBRE */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={form.NOMBRE || ""}
                    onChange={(e) => setForm((p) => ({ ...p, NOMBRE: e.target.value.toUpperCase() }))}
                    placeholder="Ej. MARÍA FERNANDA LÓPEZ"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* TELEFONO 1 */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Teléfono / WhatsApp 1</label>
                  <input
                    type="text"
                    value={form.TELEFONO || ""}
                    onChange={(e) => setForm((p) => ({ ...p, TELEFONO: e.target.value }))}
                    placeholder="Ej. 315 123 4567"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* TELEFONO 2 */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Teléfono 2 (Opcional)</label>
                  <input
                    type="text"
                    value={form.TELEFONO2 || ""}
                    onChange={(e) => setForm((p) => ({ ...p, TELEFONO2: e.target.value }))}
                    placeholder="Ej. 320 765 4321"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* DIRECCION */}
                <div className="col-span-12">
                  <label className="font-bold text-slate-700 uppercase">Dirección de Residencia</label>
                  <input
                    type="text"
                    value={form.DIRECCION || ""}
                    onChange={(e) => setForm((p) => ({ ...p, DIRECCION: e.target.value }))}
                    placeholder="Ej. Calle 10 # 25 - 40 Apto 302"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* EMPRESA */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Empresa / Institución / Colegio</label>
                  <input
                    type="text"
                    value={form.EMPRESA || ""}
                    onChange={(e) => setForm((p) => ({ ...p, EMPRESA: e.target.value.toUpperCase() }))}
                    placeholder="Ej. COLEGIO SAN JOSÉ"
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-bold text-slate-900 uppercase focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* SALDO INICIAL */}
                <div className="col-span-12 sm:col-span-6">
                  <label className="font-bold text-slate-700 uppercase">Saldo Pendiente / Deuda</label>
                  <input
                    type="number"
                    min={0}
                    value={form.SALDO || 0}
                    onChange={(e) => setForm((p) => ({ ...p, SALDO: Number(e.target.value) || 0 }))}
                    className="mt-1 h-8 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 font-mono font-bold text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs"
                  />
                </div>

                {/* NOTA */}
                <div className="col-span-12">
                  <label className="font-bold text-slate-700 uppercase">Nota / Observación Especial</label>
                  <textarea
                    rows={2}
                    value={form.NOTA || ""}
                    onChange={(e) => setForm((p) => ({ ...p, NOTA: e.target.value }))}
                    placeholder="Notas sobre depósitos pendientes, cliente preferencial, etc."
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-2xs resize-none"
                  />
                </div>
              </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalFormulario(false)}
                className="h-9 rounded-xl border border-slate-300 bg-slate-100 px-4 text-xs font-bold uppercase text-slate-700 hover:bg-slate-200 shadow-2xs transition-all"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="flex items-center gap-2 h-9 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 px-6 text-xs font-black uppercase tracking-wider text-white shadow-sm hover:from-emerald-700 hover:to-teal-700 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Save className="h-4 w-4" />
                {guardando ? "Guardando..." : "Guardar Cliente"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
