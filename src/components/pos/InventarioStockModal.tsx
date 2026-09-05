import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  Package,
  PlusCircle,
  History,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Search,
  Filter,
  RefreshCw,
  Barcode,
  Sparkles,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Printer,
  Edit,
  Trash2,
  Sliders,
  DollarSign,
  Calendar,
  UserCheck,
  Tag,
} from "lucide-react";
import { toast } from "sonner";
import type { Articulo } from "@/types/database.types";
import { listarArticulos, eliminarArticulo } from "@/services/posService";
import {
  alimentarInventario,
  ajustarStockManual,
  listarMovimientosInventario,
  generarCodigoBarrasSugerido,
  type MovimientoInventario,
  type TipoMovimientoInventario,
} from "@/services/inventarioService";

interface InventarioStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  usuarioActivo?: string;
  onArticuloSeleccionado?: (art: Articulo) => void;
}

export function InventarioStockModal({
  isOpen,
  onClose,
  usuarioActivo = "ADMINISTRADOR",
  onArticuloSeleccionado,
}: InventarioStockModalProps) {
  // Pestañas principales
  const [tabActiva, setTabActiva] = useState<"catalogo" | "alimentar" | "movimientos" | "ajustes">("catalogo");

  // Estado de Datos
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoInventario[]>([]);
  const [cargando, setCargando] = useState(false);

  // Filtros Catálogo
  const [busquedaCatalogo, setBusquedaCatalogo] = useState("");
  const [filtroTalla, setFiltroTalla] = useState("TODAS");
  const [filtroStock, setFiltroStock] = useState<"TODOS" | "DISPONIBLE" | "BAJO" | "AGOTADO">("TODOS");

  // Filtros Movimientos / Kardex
  const [busquedaMov, setBusquedaMov] = useState("");
  const [filtroTipoMov, setFiltroTipoMov] = useState<string>("TODOS");
  const [fechaDesde, setFechaDesde] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [fechaHasta, setFechaHasta] = useState(() => new Date().toISOString().split("T")[0]);

  // Formulario de Alimentación de Inventario
  const [modoAlimentar, setModoAlimentar] = useState<"nuevo" | "existente">("nuevo");
  const [articuloSeleccionadoId, setArticuloSeleccionadoId] = useState<number | null>(null);
  const [formCodBarras, setFormCodBarras] = useState("");
  const [formDescripcion, setFormDescripcion] = useState("");
  const [formTalla, setFormTalla] = useState("M");
  const [formCantidad, setFormCantidad] = useState<number>(1);
  const [formValorAlquiler, setFormValorAlquiler] = useState<number>(35000);
  const [formValorDeposito, setFormValorDeposito] = useState<number>(50000);
  const [formTipoEntrada, setFormTipoEntrada] = useState<"ENTRADA_COMPRA" | "ENTRADA_CONFECCION" | "ENTRADA_ALIMENTACION">("ENTRADA_ALIMENTACION");
  const [formMotivo, setFormMotivo] = useState("Ingreso inicial / Compra de trajes");
  const [formNotas, setFormNotas] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Formulario de Ajuste Manual
  const [ajusteArticuloId, setAjusteArticuloId] = useState<number | null>(null);
  const [ajusteNuevoStock, setAjusteNuevoStock] = useState<number>(0);
  const [ajusteTipo, setAjusteTipo] = useState<"AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO" | "SALIDA_BAJA_DANO" | "SALIDA_PERDIDA">("AJUSTE_POSITIVO");
  const [ajusteMotivo, setAjusteMotivo] = useState("Conteo físico de inventario");

  // Cargar datos al abrir
  useEffect(() => {
    if (isOpen) {
      cargarDatos();
    }
  }, [isOpen]);

  async function cargarDatos() {
    setCargando(true);
    try {
      const [arts, movs] = await Promise.all([
        listarArticulos(),
        listarMovimientosInventario({
          fechaDesde,
          fechaHasta,
          tipoMovimiento: filtroTipoMov,
          busqueda: busquedaMov,
        }),
      ]);
      setArticulos(arts);
      setMovimientos(movs);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando inventario");
    } finally {
      setCargando(false);
    }
  }

  // Generar código de barras sugerido para nuevo traje
  async function handleGenerarCodigoAuto() {
    const cod = await generarCodigoBarrasSugerido();
    setFormCodBarras(cod);
    toast.info(`Código sugerido: ${cod}`);
  }

  // Al seleccionar un artículo existente para reponer stock
  function handleSeleccionarParaReponer(art: Articulo) {
    setModoAlimentar("existente");
    setArticuloSeleccionadoId(art.IDARTICULO);
    setFormCodBarras(art.CODBARRAS || "");
    setFormDescripcion(art.DESCRIPCION || "");
    setFormTalla(art.TALLA || "M");
    setFormValorAlquiler(art.VALOR || 0);
    setFormValorDeposito(art.VALORDEPOSITO || 0);
    setFormCantidad(1);
    setFormMotivo(`Reposición / Entrada adicional de existencias`);
    setTabActiva("alimentar");
  }

  // Al seleccionar un artículo para ajuste manual
  function handleAbrirAjusteManual(art: Articulo) {
    setAjusteArticuloId(art.IDARTICULO);
    setAjusteNuevoStock(art.STOCK || 0);
    setTabActiva("ajustes");
  }

  // Guardar Entrada de Inventario (Alimentar)
  async function handleGuardarAlimentarInventario(e: React.FormEvent) {
    e.preventDefault();
    if (!formDescripcion.trim()) {
      toast.error("Ingresa la descripción del traje o prenda");
      return;
    }
    if (formCantidad <= 0) {
      toast.error("La cantidad a ingresar debe ser mayor a 0");
      return;
    }

    setGuardando(true);
    try {
      let cod = formCodBarras.trim();
      if (!cod) {
        cod = await generarCodigoBarrasSugerido();
      }

      await alimentarInventario({
        idArticulo: modoAlimentar === "existente" && articuloSeleccionadoId ? articuloSeleccionadoId : undefined,
        codBarras: cod,
        descripcion: formDescripcion,
        talla: formTalla,
        cantidadIngreso: Number(formCantidad),
        valorAlquiler: Number(formValorAlquiler),
        valorDeposito: Number(formValorDeposito),
        tipoEntrada: formTipoEntrada,
        motivo: formMotivo,
        notas: formNotas,
        usuario: usuarioActivo,
      });

      toast.success(`¡Inventario alimentado con éxito! (+${formCantidad} unds)`);
      
      // Limpiar formulario y recargar
      setFormDescripcion("");
      setFormCodBarras("");
      setFormCantidad(1);
      setFormNotas("");
      setArticuloSeleccionadoId(null);
      setModoAlimentar("nuevo");
      
      await cargarDatos();
      setTabActiva("catalogo");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al alimentar inventario");
    } finally {
      setGuardando(false);
    }
  }

  // Guardar Ajuste Manual de Stock
  async function handleGuardarAjusteManual(e: React.FormEvent) {
    e.preventDefault();
    if (!ajusteArticuloId) {
      toast.error("Selecciona una prenda para ajustar");
      return;
    }

    setGuardando(true);
    try {
      await ajustarStockManual({
        idArticulo: ajusteArticuloId,
        nuevoStock: Number(ajusteNuevoStock),
        tipoAjuste: ajusteTipo,
        motivo: ajusteMotivo,
        usuario: usuarioActivo,
      });

      toast.success("Stock ajustado correctamente");
      setAjusteArticuloId(null);
      await cargarDatos();
      setTabActiva("catalogo");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Error al realizar ajuste de stock");
    } finally {
      setGuardando(false);
    }
  }

  // Eliminar artículo
  async function handleEliminar(id: number, nombre: string) {
    if (!window.confirm(`¿Estás seguro de eliminar "${nombre}" del catálogo e inventario?`)) {
      return;
    }
    const ok = await eliminarArticulo(id);
    if (ok) {
      toast.success("Prenda eliminada");
      cargarDatos();
    } else {
      toast.error("No se pudo eliminar la prenda");
    }
  }

  // Artículos Filtrados en Catálogo
  const articulosFiltrados = useMemo(() => {
    return articulos.filter((art) => {
      const q = busquedaCatalogo.toLowerCase().trim();
      const coincideTexto =
        !q ||
        art.DESCRIPCION?.toLowerCase().includes(q) ||
        art.CODBARRAS?.toLowerCase().includes(q) ||
        art.TALLA?.toLowerCase().includes(q);

      const coincideTalla = filtroTalla === "TODAS" || art.TALLA?.toUpperCase() === filtroTalla;

      const stock = Number(art.STOCK || 0);
      let coincideStock = true;
      if (filtroStock === "DISPONIBLE") coincideStock = stock > 2;
      else if (filtroStock === "BAJO") coincideStock = stock > 0 && stock <= 2;
      else if (filtroStock === "AGOTADO") coincideStock = stock <= 0;

      return coincideTexto && coincideTalla && coincideStock;
    });
  }, [articulos, busquedaCatalogo, filtroTalla, filtroStock]);

  // Totales y Estadísticas de Inventario
  const totalReferencias = articulos.length;
  const totalUnidadesStock = articulos.reduce((acc, a) => acc + (Number(a.STOCK) || 0), 0);
  const totalValorAlquiler = articulos.reduce((acc, a) => acc + (Number(a.VALOR) || 0) * (Number(a.STOCK) || 0), 0);
  const totalValorDepositos = articulos.reduce((acc, a) => acc + (Number(a.VALORDEPOSITO) || 0) * (Number(a.STOCK) || 0), 0);
  const articulosAgotados = articulos.filter((a) => (Number(a.STOCK) || 0) <= 0).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative z-10 flex h-[94vh] w-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800">
        {/* Cabecera Principal */}
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/90 px-6 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-md shadow-blue-500/20">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Módulo de Inventario & Stock
                </h2>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800 uppercase">
                  KARDEX & ALIMENTACIÓN
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Control de existencias, entrada de vestidos/trajes y auditoría de movimientos
              </p>
            </div>
          </div>

          {/* Botón Cerrar */}
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-all shadow-xs"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Barra de Pestañas Superior */}
        <div className="flex items-center border-b border-slate-200 bg-slate-100/60 px-6 py-2 gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTabActiva("catalogo")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              tabActiva === "catalogo"
                ? "bg-white text-blue-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            <Layers className="h-4 w-4 text-blue-600" />
            <span>1. Existencias & Catálogo ({articulosFiltrados.length})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModoAlimentar("nuevo");
              setArticuloSeleccionadoId(null);
              setTabActiva("alimentar");
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              tabActiva === "alimentar"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            <PlusCircle className="h-4 w-4" />
            <span>2. Alimentar Inventario / Entrada</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("movimientos")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              tabActiva === "movimientos"
                ? "bg-white text-purple-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            <History className="h-4 w-4 text-purple-600" />
            <span>3. Kardex & Movimientos de Stock</span>
          </button>

          <button
            type="button"
            onClick={() => setTabActiva("ajustes")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-black transition-all ${
              tabActiva === "ajustes"
                ? "bg-white text-amber-700 shadow-sm border border-slate-200"
                : "text-slate-600 hover:bg-white/60 hover:text-slate-900"
            }`}
          >
            <Sliders className="h-4 w-4 text-amber-600" />
            <span>4. Ajuste Manual & Mermas</span>
          </button>

          <button
            type="button"
            onClick={cargarDatos}
            className="ml-auto flex items-center gap-1.5 rounded-xl bg-slate-200/80 hover:bg-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all"
            title="Refrescar datos"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin text-blue-600" : ""}`} />
            <span>Refrescar</span>
          </button>
        </div>

        {/* Resumen Ejecutivo de Métricas (Tarjetas superiores compactas) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-3 bg-slate-50 border-b border-slate-200/80 text-xs">
          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-black">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Total Referencias</div>
              <div className="text-base font-black text-slate-900">{totalReferencias}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 font-black">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Stock Total en Unidades</div>
              <div className="text-base font-black text-emerald-700">{totalUnidadesStock} unds</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-black">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Capacidad Alquiler</div>
              <div className="text-base font-black text-purple-700">${totalValorAlquiler.toLocaleString("es-CO")}</div>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-white p-2.5 border border-slate-200/80 shadow-2xs">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600 font-black">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Prendas Agotadas</div>
              <div className="text-base font-black text-rose-600">{articulosAgotados}</div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            PESTAÑA 1: CATÁLOGO Y EXISTENCIAS DE INVENTARIO
        ========================================================================= */}
        {tabActiva === "catalogo" && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden space-y-3">
            {/* Barra de Filtros y Búsqueda */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[260px] relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre de traje, código de barras o talla..."
                  value={busquedaCatalogo}
                  onChange={(e) => setBusquedaCatalogo(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-2xs"
                />
              </div>

              {/* Filtro por Estado de Stock */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroStock("TODOS")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroStock === "TODOS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStock("DISPONIBLE")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroStock === "DISPONIBLE" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  En Stock
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStock("BAJO")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroStock === "BAJO" ? "bg-amber-500 text-white shadow-xs" : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  Stock Bajo (≤2)
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroStock("AGOTADO")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroStock === "AGOTADO" ? "bg-rose-600 text-white shadow-xs" : "text-rose-700 hover:bg-rose-50"
                  }`}
                >
                  Agotados
                </button>
              </div>

              {/* Botón Alimentar Rápido */}
              <button
                type="button"
                onClick={() => {
                  setModoAlimentar("nuevo");
                  setArticuloSeleccionadoId(null);
                  setTabActiva("alimentar");
                }}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-black text-white shadow-sm transition-all"
              >
                <PlusCircle className="h-4 w-4" />
                <span>+ Alimentar Stock / Nuevo Traje</span>
              </button>
            </div>

            {/* Tabla de Artículos */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-700 uppercase font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Cód. Barras</th>
                    <th className="px-4 py-3">Descripción de la Prenda</th>
                    <th className="px-3 py-3 text-center">Talla</th>
                    <th className="px-4 py-3 text-right">Stock Físico</th>
                    <th className="px-4 py-3 text-right">Valor Alquiler</th>
                    <th className="px-4 py-3 text-right">Valor Depósito</th>
                    <th className="px-4 py-3 text-center">Estado</th>
                    <th className="px-4 py-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {articulosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Package className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                        <p className="font-bold text-sm">No se encontraron artículos en el inventario</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Haz clic en "Alimentar Inventario" para registrar nuevos vestidos o existencias.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    articulosFiltrados.map((art) => {
                      const stock = Number(art.STOCK || 0);
                      const esAgotado = stock <= 0;
                      const esBajo = stock > 0 && stock <= 2;

                      return (
                        <tr key={art.IDARTICULO} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-700">
                            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 border border-slate-200">
                              <Barcode className="h-3.5 w-3.5 text-slate-500" />
                              {art.CODBARRAS || "S/C"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{art.DESCRIPCION}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className="rounded-lg bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 font-black text-indigo-700">
                              {art.TALLA || "ESTÁNDAR"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-black text-sm">
                            <span
                              className={`px-2.5 py-0.5 rounded-lg ${
                                esAgotado
                                  ? "bg-rose-100 text-rose-800"
                                  : esBajo
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {stock} unds
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-700">
                            ${Number(art.VALOR || 0).toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-700">
                            ${Number(art.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {esAgotado ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-[10px] font-black text-rose-700">
                                <AlertTriangle className="h-3 w-3" /> AGOTADO
                              </span>
                            ) : esBajo ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black text-amber-700">
                                <AlertTriangle className="h-3 w-3" /> STOCK BAJO
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                                <CheckCircle2 className="h-3 w-3" /> DISPONIBLE
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleSeleccionarParaReponer(art)}
                                className="rounded-lg bg-emerald-50 border border-emerald-200 p-1.5 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                                title="Alimentar / Reponer Stock a este traje"
                              >
                                <PlusCircle className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAbrirAjusteManual(art)}
                                className="rounded-lg bg-amber-50 border border-amber-200 p-1.5 text-amber-700 hover:bg-amber-600 hover:text-white transition-all shadow-2xs"
                                title="Ajuste Manual / Mermas"
                              >
                                <Sliders className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEliminar(art.IDARTICULO, art.DESCRIPCION)}
                                className="rounded-lg bg-rose-50 border border-rose-200 p-1.5 text-rose-700 hover:bg-rose-600 hover:text-white transition-all shadow-2xs"
                                title="Eliminar Prenda"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 2: ALIMENTAR INVENTARIO / ENTRADA DE TRAJES
        ========================================================================= */}
        {tabActiva === "alimentar" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-4xl mx-auto w-full">
            <form onSubmit={handleGuardarAlimentarInventario} className="space-y-6">
              {/* Selector de Modo */}
              <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setModoAlimentar("nuevo");
                    setArticuloSeleccionadoId(null);
                    setFormDescripcion("");
                    setFormCodBarras("");
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all ${
                    modoAlimentar === "nuevo"
                      ? "bg-white text-emerald-800 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <PlusCircle className="h-4 w-4 text-emerald-600" />
                  <span>A. Registrar Nuevo Traje / Referencia</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModoAlimentar("existente")}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-black text-xs transition-all ${
                    modoAlimentar === "existente"
                      ? "bg-white text-blue-800 shadow-sm border border-slate-200"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span>B. Entrada / Reponer Stock a Traje Existente</span>
                </button>
              </div>

              {/* Si es modo existente, selector de artículo */}
              {modoAlimentar === "existente" && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                  <label className="text-xs font-black uppercase text-blue-900">
                    Selecciona el Traje a Alimentar Existencias:
                  </label>
                  <select
                    value={articuloSeleccionadoId || ""}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      const encontrado = articulos.find((a) => a.IDARTICULO === id);
                      if (encontrado) handleSeleccionarParaReponer(encontrado);
                    }}
                    className="w-full rounded-xl border border-blue-300 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="">-- Elige un traje del catálogo --</option>
                    {articulos.map((a) => (
                      <option key={a.IDARTICULO} value={a.IDARTICULO}>
                        [{a.CODBARRAS || "S/C"}] {a.DESCRIPCION} - Talla: {a.TALLA} (Stock actual: {a.STOCK || 0} unds)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Campos Principales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Código de Barras */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase text-slate-700">Código de Barras:</label>
                    <button
                      type="button"
                      onClick={handleGenerarCodigoAuto}
                      className="text-[11px] font-black text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Generar Auto
                    </button>
                  </div>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ej: DISF-0015"
                      value={formCodBarras}
                      onChange={(e) => setFormCodBarras(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-mono font-bold focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Talla */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700">Talla:</label>
                  <select
                    value={formTalla}
                    onChange={(e) => setFormTalla(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="XS">XS (Extra Pequeña)</option>
                    <option value="S">S (Pequeña)</option>
                    <option value="M">M (Mediana)</option>
                    <option value="L">L (Grande)</option>
                    <option value="XL">XL (Extra Grande)</option>
                    <option value="XXL">XXL (Doble Extra Grande)</option>
                    <option value="INFANTIL">INFANTIL</option>
                    <option value="JUVENIL">JUVENIL</option>
                    <option value="ESTÁNDAR">ESTÁNDAR / ÚNICA</option>
                  </select>
                </div>
              </div>

              {/* Nombre / Descripción del Traje */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">Descripción / Nombre de la Prenda:</label>
                <input
                  type="text"
                  placeholder="Ej: TRAJE DE PIRATA CARIBEÑO DE LUJO CON SOMBRERO"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value.toUpperCase())}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-bold focus:border-emerald-500 focus:outline-none"
                />
              </div>

              {/* Cantidad y Precios */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-emerald-50/50 p-4 rounded-2xl border border-emerald-200">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-emerald-950">
                    Cantidad a Ingresar (+Stock):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formCantidad}
                    onChange={(e) => setFormCantidad(Math.max(1, parseInt(e.target.value) || 1))}
                    required
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-black text-emerald-800 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-emerald-950">Valor Alquiler ($):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formValorAlquiler}
                    onChange={(e) => setFormValorAlquiler(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-black text-blue-700 focus:border-emerald-600 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-emerald-950">Valor Depósito ($):</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formValorDeposito}
                    onChange={(e) => setFormValorDeposito(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full rounded-xl border border-emerald-300 bg-white px-3 py-2 text-sm font-black text-amber-700 focus:border-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Motivo y Tipo de Entrada */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700">Tipo de Entrada:</label>
                  <select
                    value={formTipoEntrada}
                    onChange={(e) => setFormTipoEntrada(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none"
                  >
                    <option value="ENTRADA_ALIMENTACION">Entrada / Alimentación General</option>
                    <option value="ENTRADA_COMPRA">Compra a Proveedor</option>
                    <option value="ENTRADA_CONFECCION">Confección Propia / Taller</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase text-slate-700">Motivo o Justificación:</label>
                  <input
                    type="text"
                    value={formMotivo}
                    onChange={(e) => setFormMotivo(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none"
                  />
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTabActiva("catalogo")}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{guardando ? "Alimentando..." : "Guardar & Alimentar Inventario"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 3: KARDEX Y MOVIMIENTOS DE INVENTARIO
        ========================================================================= */}
        {tabActiva === "movimientos" && (
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden space-y-3">
            {/* Filtros de Movimientos */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex-1 min-w-[200px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar en historial por prenda, motivo, usuario..."
                  value={busquedaMov}
                  onChange={(e) => setBusquedaMov(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-1.5 text-xs font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-slate-600">Tipo:</span>
                <select
                  value={filtroTipoMov}
                  onChange={(e) => setFiltroTipoMov(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 font-bold focus:outline-none"
                >
                  <option value="TODOS">Todos los Movimientos</option>
                  <option value="ENTRADA_ALIMENTACION">Entradas de Alimentación</option>
                  <option value="ENTRADA_COMPRA">Compras</option>
                  <option value="ENTRADA_DEVOLUCION">Devoluciones de Alquiler</option>
                  <option value="SALIDA_ALQUILER">Salidas por Alquiler</option>
                  <option value="SALIDA_VENTA">Salidas por Venta</option>
                  <option value="AJUSTE_POSITIVO">Ajustes Positivos</option>
                  <option value="AJUSTE_NEGATIVO">Ajustes Negativos</option>
                  <option value="SALIDA_BAJA_DANO">Bajas por Daño</option>
                </select>
              </div>

              <button
                type="button"
                onClick={cargarDatos}
                className="rounded-xl bg-purple-600 hover:bg-purple-700 px-4 py-1.5 text-xs font-bold text-white transition-all shadow-xs"
              >
                Filtrar Kardex
              </button>
            </div>

            {/* Tabla Kardex */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-700 uppercase font-black tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Fecha & Hora</th>
                    <th className="px-4 py-3">Tipo de Movimiento</th>
                    <th className="px-4 py-3">Prenda / Traje</th>
                    <th className="px-3 py-3 text-center">Talla</th>
                    <th className="px-3 py-3 text-center">Cant.</th>
                    <th className="px-4 py-3 text-right">Stock Ant.</th>
                    <th className="px-4 py-3 text-right">Stock Nuevo</th>
                    <th className="px-4 py-3">Motivo / Detalle</th>
                    <th className="px-4 py-3 text-center">Responsable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        <History className="mx-auto h-10 w-10 text-slate-300 mb-2" />
                        <p className="font-bold text-sm">No hay movimientos registrados en este rango</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Cada entrada, alquiler, devolución o ajuste manual quedará registrado en esta bitácora.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((mov) => {
                      const esPositivo = mov.cantidad > 0;
                      return (
                        <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                            {new Date(mov.fecha).toLocaleString("es-CO")}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black uppercase ${
                                esPositivo ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {esPositivo ? <ArrowDownLeft className="h-3 w-3" /> : <ArrowUpRight className="h-3 w-3" />}
                              {mov.tipoMovimiento.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-slate-900">{mov.descripcion}</td>
                          <td className="px-3 py-2.5 text-center font-bold text-indigo-700">{mov.talla}</td>
                          <td className="px-3 py-2.5 text-center font-black font-mono">
                            <span className={esPositivo ? "text-emerald-700 font-bold" : "text-rose-700 font-bold"}>
                              {esPositivo ? `+${mov.cantidad}` : mov.cantidad}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right font-mono text-slate-500">{mov.stockAnterior}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-black text-slate-900">
                            {mov.stockNuevo}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600 text-xs">{mov.motivo}</td>
                          <td className="px-4 py-2.5 text-center font-bold text-slate-700 uppercase text-[11px]">
                            {mov.usuario}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* =========================================================================
            PESTAÑA 4: AJUSTE MANUAL Y BAJAS POR MERMA/DETERIORO
        ========================================================================= */}
        {tabActiva === "ajustes" && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-2xl mx-auto w-full">
            <form onSubmit={handleGuardarAjusteManual} className="space-y-5">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center gap-2 font-black text-amber-950 text-xs uppercase mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  Módulo de Corrección de Inventario & Bajas
                </div>
                <p className="text-[11px] text-amber-900 font-medium">
                  Utiliza este apartado para cuadrar existencias tras un conteo físico o para dar de baja trajes
                  deteriorados o extraviados. Todos los cambios quedan auditados en el Kardex.
                </p>
              </div>

              {/* Selector de Prenda */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">Prenda a Ajustar:</label>
                <select
                  value={ajusteArticuloId || ""}
                  onChange={(e) => {
                    const id = Number(e.target.value);
                    setAjusteArticuloId(id);
                    const art = articulos.find((a) => a.IDARTICULO === id);
                    if (art) setAjusteNuevoStock(art.STOCK || 0);
                  }}
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-bold focus:outline-none"
                >
                  <option value="">-- Selecciona una prenda del catálogo --</option>
                  {articulos.map((a) => (
                    <option key={a.IDARTICULO} value={a.IDARTICULO}>
                      [{a.CODBARRAS || "S/C"}] {a.DESCRIPCION} (Stock actual: {a.STOCK || 0} unds)
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Ajuste */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">Tipo de Ajuste / Motivo:</label>
                <select
                  value={ajusteTipo}
                  onChange={(e) => setAjusteTipo(e.target.value as any)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold focus:outline-none"
                >
                  <option value="AJUSTE_POSITIVO">Ajuste Positivo (+ Por Conteo Físico)</option>
                  <option value="AJUSTE_NEGATIVO">Ajuste Negativo (- Faltante en Conteo)</option>
                  <option value="SALIDA_BAJA_DANO">Baja por Deterioro / Daño Irreparable</option>
                  <option value="SALIDA_PERDIDA">Baja por Pérdida / Extravío</option>
                </select>
              </div>

              {/* Nuevo Stock Real */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">Nuevo Stock Real en Bodega:</label>
                <input
                  type="number"
                  min="0"
                  value={ajusteNuevoStock}
                  onChange={(e) => setAjusteNuevoStock(parseInt(e.target.value) || 0)}
                  required
                  className="w-full rounded-xl border border-amber-300 bg-white px-3.5 py-2.5 text-sm font-mono font-black text-amber-900 focus:border-amber-600 focus:outline-none"
                />
              </div>

              {/* Justificación */}
              <div className="space-y-1.5">
                <label className="text-xs font-black uppercase text-slate-700">Justificación / Motivo del Ajuste:</label>
                <textarea
                  rows={3}
                  value={ajusteMotivo}
                  onChange={(e) => setAjusteMotivo(e.target.value)}
                  placeholder="Ej: Conteo físico general del mes. Se corrigió discrepancia."
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-xs font-medium focus:outline-none"
                />
              </div>

              {/* Botón Aplicar */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setTabActiva("catalogo")}
                  className="rounded-xl bg-slate-100 hover:bg-slate-200 px-5 py-2.5 text-xs font-bold text-slate-700 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 px-6 py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  <Sliders className="h-4 w-4" />
                  <span>{guardando ? "Ajustando..." : "Confirmar & Aplicar Ajuste"}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Pie del Modal */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 font-bold">
          <div>
            Mostrando <span className="text-slate-900 font-black">{articulosFiltrados.length}</span> referencias en catálogo
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all shadow-xs"
          >
            Cerrar Módulo
          </button>
        </footer>
      </div>
    </div>
  );
}
