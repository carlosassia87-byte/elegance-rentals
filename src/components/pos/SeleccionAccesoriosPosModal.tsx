import React, { useState, useEffect } from "react";
import {
  X,
  Search,
  Plus,
  Check,
  Crown,
  Sparkles,
  Package,
  Layers,
  Filter,
  CheckCircle2,
  DollarSign,
  Shield,
  HelpCircle,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import type { Accesorio, ItemAlquilerCarrito, Articulo } from "@/types/database.types";
import {
  listarAccesorios,
  CATEGORIAS_ACCESORIOS,
} from "@/services/accesoriosService";

interface ItemAccesorioSeleccionado {
  accesorio: Accesorio;
  cantidad: number;
  esPiezaIncluida: boolean; // Si es true -> $0 alquiler, registra entrega de pieza
  valorAlquilerCustom: number;
  valorDepositoCustom: number;
}

interface SeleccionAccesoriosPosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trajeReferencia?: Articulo | ItemAlquilerCarrito | null;
  onAgregarAlCarrito: (itemsNuevos: ItemAlquilerCarrito[]) => void;
}

export function SeleccionAccesoriosPosModal({
  open,
  onOpenChange,
  trajeReferencia,
  onAgregarAlCarrito,
}: SeleccionAccesoriosPosModalProps) {
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [cargando, setCargando] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODAS");

  // Accesorios seleccionados en esta sesión del modal
  const [seleccionados, setSeleccionados] = useState<Map<string, ItemAccesorioSeleccionado>>(
    new Map()
  );

  useEffect(() => {
    if (open) {
      cargarCatalogo();
      setSeleccionados(new Map());
    }
  }, [open]);

  const cargarCatalogo = async () => {
    setCargando(true);
    try {
      const data = await listarAccesorios();
      setAccesorios(data);
    } catch {
      toast.error("Error al cargar accesorios");
    } finally {
      setCargando(false);
    }
  };

  const accesoriosFiltrados = accesorios.filter((acc) => {
    const matchCat =
      categoriaSeleccionada === "TODAS" ||
      acc.CATEGORIA?.toUpperCase() === categoriaSeleccionada.toUpperCase();
    const matchQuery =
      !busqueda.trim() ||
      acc.DESCRIPCION?.toLowerCase().includes(busqueda.toLowerCase()) ||
      acc.CODBARRAS?.toLowerCase().includes(busqueda.toLowerCase()) ||
      acc.CATEGORIA?.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchQuery;
  });

  const toggleSeleccion = (acc: Accesorio) => {
    const key = acc.CODBARRAS;
    const nuevoMap = new Map(seleccionados);

    if (nuevoMap.has(key)) {
      nuevoMap.delete(key);
    } else {
      nuevoMap.set(key, {
        accesorio: acc,
        cantidad: 1,
        esPiezaIncluida: false,
        valorAlquilerCustom: Number(acc.VALOR) || 0,
        valorDepositoCustom: Number(acc.VALORDEPOSITO) || 0,
      });
    }
    setSeleccionados(nuevoMap);
  };

  const actualizarItem = (key: string, updates: Partial<ItemAccesorioSeleccionado>) => {
    const nuevoMap = new Map(seleccionados);
    const actual = nuevoMap.get(key);
    if (actual) {
      nuevoMap.set(key, { ...actual, ...updates });
      setSeleccionados(nuevoMap);
    }
  };

  const handleConfirmarAgregar = () => {
    if (seleccionados.size === 0) {
      toast.info("No has seleccionado ningún accesorio");
      return;
    }

    const itemsNuevos: ItemAlquilerCarrito[] = [];

    seleccionados.forEach((sel) => {
      const acc = sel.accesorio;
      const cant = sel.cantidad;
      const vAlquiler = sel.esPiezaIncluida ? 0 : sel.valorAlquilerCustom;
      const vDep = sel.valorDepositoCustom;

      const totAlquiler = vAlquiler * cant;
      const totDep = vDep * cant;
      const totGeneral = totAlquiler + totDep;

      const descPrefix = sel.esPiezaIncluida
        ? `[PIEZA INCLUIDA] ${acc.DESCRIPCION}`
        : `[ACCESORIO] ${acc.DESCRIPCION}`;

      itemsNuevos.push({
        idTemp: `acc_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
        accesorio: acc,
        esAccesorio: true,
        idTrajePadre: trajeReferencia
          ? "IDARTICULO" in trajeReferencia
            ? String(trajeReferencia.IDARTICULO)
            : trajeReferencia.codigoBarras
          : undefined,
        descripcion: descPrefix,
        talla: acc.TALLA || "U",
        codigoBarras: acc.CODBARRAS,
        cantidad: cant,
        valorAlquiler: vAlquiler,
        totalAlquiler: totAlquiler,
        valorDeposito: vDep,
        totalDeposito: totDep,
        totalGeneral: totGeneral,
      });
    });

    onAgregarAlCarrito(itemsNuevos);
    toast.success(`Se agregaron ${itemsNuevos.length} accesorios a la factura`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[85vh] p-0 overflow-hidden bg-slate-900 text-slate-100 border-slate-700 flex flex-col">
        {/* Encabezado */}
        <div className="bg-gradient-to-r from-purple-950 via-indigo-950 to-slate-900 p-4 border-b border-purple-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-600/30 border border-purple-400/40 rounded-lg text-purple-300">
              <Crown className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Agregar Accesorios a la Factura
                {trajeReferencia && (
                  <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                    Para: {"DESCRIPCION" in trajeReferencia ? trajeReferencia.DESCRIPCION : trajeReferencia.descripcion}
                  </span>
                )}
              </h2>
              <p className="text-xs text-purple-200/70">
                Selecciona sombreros, armas, pelucas o complementos para entregar al cliente
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Buscador & Categorías */}
        <div className="p-3 bg-slate-950/80 border-b border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2">
          <div className="md:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar accesorio (ej: sombrero, espada, peluca, máscara)..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="md:col-span-4">
            <select
              value={categoriaSeleccionada}
              onChange={(e) => setCategoriaSeleccionada(e.target.value)}
              className="w-full px-2 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
            >
              {CATEGORIAS_ACCESORIOS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Contenido dividido: Catálogo a la izquierda, Configuración seleccionados a la derecha */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          {/* Lista de Accesorios Disponibles */}
          <div className="md:col-span-7 overflow-y-auto p-3 space-y-2 border-r border-slate-800 bg-slate-900/50">
            {accesoriosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">
                No se encontraron accesorios coincidentes.
              </div>
            ) : (
              accesoriosFiltrados.map((acc) => {
                const isSelected = seleccionados.has(acc.CODBARRAS);
                return (
                  <div
                    key={acc.CODBARRAS}
                    onClick={() => toggleSeleccion(acc)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? "bg-purple-950/50 border-purple-500 text-white shadow-md"
                        : "bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected
                            ? "bg-purple-600 border-purple-400 text-white"
                            : "border-slate-700 bg-slate-900"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>

                      <div>
                        <div className="text-xs font-bold uppercase flex items-center gap-2">
                          <span className="text-purple-400 font-mono">[{acc.CODBARRAS}]</span>
                          {acc.DESCRIPCION}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                            {acc.CATEGORIA}
                          </span>
                          <span>Talla: {acc.TALLA || "U"}</span>
                          <span>Stock: {acc.STOCK}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400 font-mono">
                        ${(acc.VALOR || 0).toLocaleString("es-CO")}
                      </div>
                      <div className="text-[10px] text-amber-400/90 font-mono">
                        Dep: ${(acc.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Panel de Configuración de Accesorios Seleccionados */}
          <div className="md:col-span-5 flex flex-col bg-slate-950/90 p-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <span className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                Accesorios a Incluir ({seleccionados.size})
              </span>
              <span className="text-[11px] text-slate-400">Personalizar valores</span>
            </div>

            {seleccionados.size === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <Crown className="w-10 h-10 mb-2 opacity-30 text-purple-400" />
                <p className="text-xs font-semibold">Ningún accesorio marcado</p>
                <p className="text-[11px] text-slate-600 mt-1">
                  Haz clic en los accesorios de la izquierda para agregarlos a la venta.
                </p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {Array.from(seleccionados.values()).map((sel) => {
                  const key = sel.accesorio.CODBARRAS;
                  return (
                    <div
                      key={key}
                      className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-slate-100 uppercase truncate">
                          {sel.accesorio.DESCRIPCION}
                        </div>
                        <button
                          onClick={() => toggleSeleccion(sel.accesorio)}
                          className="text-slate-500 hover:text-red-400 p-0.5"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Selector de Tipo: Pieza Incluida vs Alquiler Adicional */}
                      <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(key, {
                              esPiezaIncluida: true,
                              valorAlquilerCustom: 0,
                            })
                          }
                          className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                            sel.esPiezaIncluida
                              ? "bg-purple-600 text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          🎁 Pieza Incluida ($0)
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            actualizarItem(key, {
                              esPiezaIncluida: false,
                              valorAlquilerCustom: Number(sel.accesorio.VALOR) || 0,
                            })
                          }
                          className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                            !sel.esPiezaIncluida
                              ? "bg-indigo-600 text-white shadow"
                              : "text-slate-400 hover:text-white"
                          }`}
                        >
                          💰 Alquiler Extra ($)
                        </button>
                      </div>

                      {/* Inputs de Cantidad, Alquiler y Depósito */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Cant.</label>
                          <input
                            type="number"
                            min="1"
                            value={sel.cantidad}
                            onChange={(e) =>
                              actualizarItem(key, {
                                cantidad: Math.max(1, parseInt(e.target.value, 10) || 1),
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-center font-mono font-bold text-white text-xs"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Alquiler ($)</label>
                          <input
                            type="number"
                            min="0"
                            disabled={sel.esPiezaIncluida}
                            value={sel.esPiezaIncluida ? 0 : sel.valorAlquilerCustom}
                            onChange={(e) =>
                              actualizarItem(key, {
                                valorAlquilerCustom: parseFloat(e.target.value) || 0,
                              })
                            }
                            className={`w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-xs ${
                              sel.esPiezaIncluida ? "text-slate-500" : "text-emerald-400"
                            }`}
                          />
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-0.5">Depósito ($)</label>
                          <input
                            type="number"
                            min="0"
                            value={sel.valorDepositoCustom}
                            onChange={(e) =>
                              actualizarItem(key, {
                                valorDepositoCustom: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-right font-mono font-bold text-amber-400 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Botón de Confirmación */}
            <div className="border-t border-slate-800 pt-3 mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmarAgregar}
                disabled={seleccionados.size === 0}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Agregar ({seleccionados.size}) a Factura
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
