import React, { useState, useEffect } from "react";
import {
  X,
  Plus,
  Search,
  Edit2,
  Trash2,
  Save,
  Barcode,
  Sparkles,
  Package,
  Layers,
  Filter,
  CheckCircle2,
  RefreshCw,
  Crown,
  Shield,
  Tag,
  DollarSign,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Accesorio } from "@/types/database.types";
import {
  listarAccesorios,
  guardarAccesorio,
  eliminarAccesorio,
  generarCodigoAccesorio,
  CATEGORIAS_ACCESORIOS,
} from "@/services/accesoriosService";

interface GestionAccesoriosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccesorioSeleccionado?: (accesorio: Accesorio) => void;
}

export function GestionAccesoriosModal({
  open,
  onOpenChange,
  onAccesorioSeleccionado,
}: GestionAccesoriosModalProps) {
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODAS");
  const [modoFormulario, setModoFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Formulario
  const [formAccesorio, setFormAccesorio] = useState<Partial<Accesorio>>({
    IDACCESORIO: 0,
    CODBARRAS: "",
    DESCRIPCION: "",
    CATEGORIA: "SOMBREROS Y CORONAS",
    TALLA: "U",
    STOCK: 1,
    VALOR: 10000,
    VALORDEPOSITO: 15000,
    NOTAS: "",
  });

  const cargarLista = async () => {
    setCargando(true);
    try {
      const data = await listarAccesorios(busqueda, categoriaSeleccionada);
      setAccesorios(data);
    } catch {
      toast.error("Error cargando accesorios");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarLista();
    }
  }, [open, busqueda, categoriaSeleccionada]);

  const abrirCrearNuevo = async () => {
    const nuevoCodigo = await generarCodigoAccesorio();
    setFormAccesorio({
      IDACCESORIO: 0,
      CODBARRAS: nuevoCodigo,
      DESCRIPCION: "",
      CATEGORIA: "SOMBREROS Y CORONAS",
      TALLA: "U",
      STOCK: 1,
      VALOR: 10000,
      VALORDEPOSITO: 15000,
      NOTAS: "",
    });
    setModoFormulario(true);
  };

  const abrirEditar = (acc: Accesorio) => {
    setFormAccesorio({ ...acc });
    setModoFormulario(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAccesorio.DESCRIPCION?.trim()) {
      toast.error("La descripción del accesorio es obligatoria");
      return;
    }
    if (!formAccesorio.CODBARRAS?.trim()) {
      toast.error("El código de barras es obligatorio");
      return;
    }

    setGuardando(true);
    try {
      const guardado = await guardarAccesorio(formAccesorio);
      if (guardado) {
        toast.success(
          formAccesorio.IDACCESORIO ? "¡Accesorio actualizado exitosamente!" : "¡Accesorio creado exitosamente!"
        );
        setModoFormulario(false);
        await cargarLista();
      } else {
        toast.error("No se pudo guardar el accesorio");
      }
    } catch {
      toast.error("Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id: number, desc: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el accesorio "${desc}"?`)) {
      const ok = await eliminarAccesorio(id);
      if (ok) {
        toast.success("Accesorio eliminado");
        cargarLista();
      } else {
        toast.error("No se pudo eliminar el accesorio");
      }
    }
  };

  const totalStock = accesorios.reduce((acc, it) => acc + (Number(it.STOCK) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[85vh] p-0 overflow-hidden bg-slate-900 text-slate-100 border-slate-700 flex flex-col">
        {/* Cabecera */}
        <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-5 border-b border-purple-800/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-600/30 border border-purple-400/40 rounded-xl text-purple-300 shadow-inner">
              <Crown className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Catálogo y Gestión de Accesorios
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-500/30 border border-purple-400/40 text-purple-200">
                  {accesorios.length} registrados
                </span>
              </h2>
              <p className="text-xs text-purple-200/70">
                Sombreros, espadas, máscaras, pelucas, capas y piezas para trajes y disfraces
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!modoFormulario && (
              <button
                onClick={abrirCrearNuevo}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-semibold rounded-lg flex items-center gap-2 shadow-lg transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Accesorio
              </button>
            )}
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {modoFormulario ? (
          /* FORMULARIO DE ALTA / EDICIÓN */
          <div className="flex-1 overflow-y-auto p-6 bg-slate-900/90">
            <form onSubmit={handleGuardar} className="max-w-3xl mx-auto space-y-5">
              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Información del Accesorio
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Código de Barras *
                    </label>
                    <div className="relative">
                      <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formAccesorio.CODBARRAS || ""}
                        onChange={(e) =>
                          setFormAccesorio({ ...formAccesorio, CODBARRAS: e.target.value.toUpperCase() })
                        }
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono uppercase focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Categoría del Accesorio *
                    </label>
                    <select
                      value={formAccesorio.CATEGORIA || "SOMBREROS Y CORONAS"}
                      onChange={(e) =>
                        setFormAccesorio({ ...formAccesorio, CATEGORIA: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500"
                    >
                      {CATEGORIAS_ACCESORIOS.filter((c) => c !== "TODAS").map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Descripción / Nombre del Accesorio *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: SOMBRERO PIRATA TRICORNIO CON PLUMA"
                      value={formAccesorio.DESCRIPCION || ""}
                      onChange={(e) =>
                        setFormAccesorio({ ...formAccesorio, DESCRIPCION: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white uppercase focus:ring-2 focus:ring-purple-500 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Precios, Depósito y Stock
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Talla / Medida
                    </label>
                    <input
                      type="text"
                      value={formAccesorio.TALLA || "U"}
                      onChange={(e) =>
                        setFormAccesorio({ ...formAccesorio, TALLA: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Cantidad en Stock *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={formAccesorio.STOCK ?? 1}
                      onChange={(e) =>
                        setFormAccesorio({ ...formAccesorio, STOCK: parseInt(e.target.value, 10) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Precio Alquiler ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formAccesorio.VALOR ?? 0}
                      onChange={(e) =>
                        setFormAccesorio({ ...formAccesorio, VALOR: parseFloat(e.target.value) || 0 })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-emerald-400 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Depósito Garantía ($)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formAccesorio.VALORDEPOSITO ?? 0}
                      onChange={(e) =>
                        setFormAccesorio({
                          ...formAccesorio,
                          VALORDEPOSITO: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-amber-400 font-mono font-bold"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      Notas / Observaciones de cuidado
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Detalles sobre limpieza, material, piezas frágiles..."
                      value={formAccesorio.NOTAS || ""}
                      onChange={(e) => setFormAccesorio({ ...formAccesorio, NOTAS: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModoFormulario(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {guardando ? "Guardando..." : "Guardar Accesorio"}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* LISTA DE ACCESORIOS Y FILTROS */
          <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
            {/* Barra de Filtros y Búsqueda */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              <div className="md:col-span-7 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por código, descripción o categoría..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-4">
                <select
                  value={categoriaSeleccionada}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:ring-2 focus:ring-purple-500"
                >
                  {CATEGORIAS_ACCESORIOS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-1 flex justify-end">
                <button
                  onClick={cargarLista}
                  title="Recargar catálogo"
                  className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${cargando ? "animate-spin text-purple-400" : ""}`} />
                </button>
              </div>
            </div>

            {/* Métricas rápidas */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total Accesorios</div>
                  <div className="text-lg font-bold text-white">{accesorios.length}</div>
                </div>
                <Package className="w-5 h-5 text-purple-400" />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Stock Total Disponible</div>
                  <div className="text-lg font-bold text-emerald-400">{totalStock} unidades</div>
                </div>
                <Layers className="w-5 h-5 text-emerald-400" />
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-400">Categoría Activa</div>
                  <div className="text-xs font-bold text-indigo-300 truncate max-w-[150px]">
                    {categoriaSeleccionada}
                  </div>
                </div>
                <Filter className="w-5 h-5 text-indigo-400" />
              </div>
            </div>

            {/* Tabla de Resultados */}
            <div className="flex-1 overflow-auto border border-slate-700/80 rounded-xl bg-slate-950/60">
              <table className="w-full text-left text-xs text-slate-200">
                <thead className="bg-slate-800 text-slate-400 font-semibold sticky top-0 uppercase text-[11px] tracking-wider z-10">
                  <tr>
                    <th className="p-3">Código</th>
                    <th className="p-3">Descripción</th>
                    <th className="p-3">Categoría</th>
                    <th className="p-3 text-center">Talla</th>
                    <th className="p-3 text-center">Stock</th>
                    <th className="p-3 text-right">Alquiler</th>
                    <th className="p-3 text-right">Depósito</th>
                    <th className="p-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {accesorios.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        {cargando ? "Cargando accesorios..." : "No se encontraron accesorios en el catálogo."}
                      </td>
                    </tr>
                  ) : (
                    accesorios.map((acc) => (
                      <tr
                        key={acc.IDACCESORIO || acc.CODBARRAS}
                        className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                        onDoubleClick={() => {
                          if (onAccesorioSeleccionado) {
                            onAccesorioSeleccionado(acc);
                            onOpenChange(false);
                          } else {
                            abrirEditar(acc);
                          }
                        }}
                      >
                        <td className="p-3 font-mono font-bold text-purple-400">
                          {acc.CODBARRAS}
                        </td>
                        <td className="p-3 font-medium text-white max-w-xs truncate">
                          {acc.DESCRIPCION}
                          {acc.NOTAS && (
                            <div className="text-[10px] text-slate-400 truncate">{acc.NOTAS}</div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 font-medium">
                            {acc.CATEGORIA}
                          </span>
                        </td>
                        <td className="p-3 text-center font-bold text-slate-400">
                          {acc.TALLA || "U"}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded font-bold font-mono text-xs ${
                              (acc.STOCK || 0) > 0
                                ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800/40"
                                : "bg-red-950/60 text-red-400 border border-red-800/40"
                            }`}
                          >
                            {acc.STOCK}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ${(acc.VALOR || 0).toLocaleString("es-CO")}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-amber-400">
                          ${(acc.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {onAccesorioSeleccionado ? (
                              <button
                                onClick={() => {
                                  onAccesorioSeleccionado(acc);
                                  onOpenChange(false);
                                }}
                                className="px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-bold transition-all"
                              >
                                Seleccionar
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => abrirEditar(acc)}
                                  title="Editar accesorio"
                                  className="p-1.5 hover:bg-slate-700 text-indigo-300 hover:text-white rounded transition-colors"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleEliminar(acc.IDACCESORIO!, acc.DESCRIPCION)
                                  }
                                  title="Eliminar accesorio"
                                  className="p-1.5 hover:bg-red-900/40 text-red-400 hover:text-red-200 rounded transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
