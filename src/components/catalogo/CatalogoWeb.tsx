import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Sparkles,
  Tag,
  Star,
  CheckCircle2,
  AlertTriangle,
  X,
  Phone,
  MapPin,
  MessageCircle,
  Calendar,
  Layers,
  ArrowRight,
  Filter,
  Eye,
  SlidersHorizontal,
  ChevronRight,
  Info,
  PackageOpen,
  ShoppingBag,
  ExternalLink,
} from "lucide-react";
import type { Articulo, Accesorio } from "@/types/database.types";
import { listarArticulos } from "@/services/posService";
import { listarAccesorios } from "@/services/accesoriosService";
import { obtenerConfiguracionEmpresa, type EmpresaConfig, EMPRESA_DEFAULT } from "@/services/empresaCajaService";

interface CatalogoWebProps {
  onIrAlPos?: () => void;
}

const CATEGORIAS_FILTRO = [
  { id: "TODAS", label: "✨ Todos los Trajes" },
  { id: "SUPERHÉROES", label: "🦸 Superhéroes & Cómics" },
  { id: "PRINCESAS Y CUENTOS", label: "👑 Princesas & Fantasía" },
  { id: "TRAJES DE GALA", label: "👔 Trajes de Gala & Novias" },
  { id: "ÉPOCA Y COLONIAL", label: "🎩 Época & Colonial" },
  { id: "HALLOWEEN Y TERROR", label: "🎃 Halloween & Terror" },
  { id: "NAVIDAD", label: "🎄 Navidad & Temporada" },
  { id: "TRADICIONAL / TÍPICO", label: "💃 Tradicional & Típico" },
  { id: "INFANTIL", label: "🧸 Infantiles" },
  { id: "GENERAL", label: "🎭 Otros" },
];

export function CatalogoWeb({ onIrAlPos }: CatalogoWebProps) {
  const [articulos, setArticulos] = useState<Articulo[]>([]);
  const [accesorios, setAccesorios] = useState<Accesorio[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaConfig>(EMPRESA_DEFAULT);
  const [cargando, setCargando] = useState(true);

  // Sección: trajes o accesorios
  const [seccion, setSeccion] = useState<"TRAJES" | "ACCESORIOS">("TRAJES");

  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState("TODAS");
  const [filtroTalla, setFiltroTalla] = useState("TODAS");
  const [soloDisponibles, setSoloDisponibles] = useState(false);
  const [ordenPrecio, setOrdenPrecio] = useState<"defecto" | "menor" | "mayor">("defecto");

  // Modal de Detalle
  const [articuloDetalle, setArticuloDetalle] = useState<Articulo | null>(null);

  useEffect(() => {
    cargarCatalogo();
  }, []);

  async function cargarCatalogo() {
    setCargando(true);
    try {
      const [arts, accs, emp] = await Promise.all([
        listarArticulos("", 2000),
        listarAccesorios(),
        obtenerConfiguracionEmpresa(),
      ]);
      setArticulos(arts);
      setAccesorios(accs.filter((a) => a.ACTIVO !== false));
      setEmpresa(emp);
    } catch (e) {
      console.error("Error cargando catálogo web:", e);
    } finally {
      setCargando(false);
    }
  }

  // Filtrado y ordenamiento de artículos
  const articulosFiltrados = useMemo(() => {
    return articulos
      .filter((art) => {
        // Búsqueda por texto
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase().trim();
          const matchDesc = (art.DESCRIPCION || "").toLowerCase().includes(q);
          const matchCod = (art.CODBARRAS || "").toLowerCase().includes(q);
          const matchCat = (art.CATEGORIA || "").toLowerCase().includes(q);
          const matchTalla = (art.TALLA || "").toLowerCase().includes(q);
          if (!matchDesc && !matchCod && !matchCat && !matchTalla) return false;
        }

        // Categoría
        if (categoriaSeleccionada !== "TODAS") {
          const catArt = (art.CATEGORIA || "GENERAL").trim().toUpperCase();
          if (catArt !== categoriaSeleccionada) return false;
        }

        // Talla
        if (filtroTalla !== "TODAS") {
          const tallaArt = (art.TALLA || "").trim().toUpperCase();
          if (tallaArt !== filtroTalla) return false;
        }

        // Solo Disponibles (Stock > 0 y DISPONIBLE !== false)
        if (soloDisponibles) {
          const disponible = art.DISPONIBLE !== false && Number(art.STOCK || 0) > 0;
          if (!disponible) return false;
        }

        return true;
      })
      .sort((a, b) => {
        // Primero destacados
        if (a.DESTACADO && !b.DESTACADO) return -1;
        if (!a.DESTACADO && b.DESTACADO) return 1;

        // Orden de precio
        if (ordenPrecio === "menor") {
          return Number(a.VALOR || 0) - Number(b.VALOR || 0);
        }
        if (ordenPrecio === "mayor") {
          return Number(b.VALOR || 0) - Number(a.VALOR || 0);
        }
        return 0;
      });
  }, [articulos, busqueda, categoriaSeleccionada, filtroTalla, soloDisponibles, ordenPrecio]);

  // Accesorios filtrados (búsqueda + talla + disponibilidad + orden)
  const accesoriosFiltrados = useMemo(() => {
    return accesorios
      .filter((acc) => {
        if (busqueda.trim()) {
          const q = busqueda.toLowerCase().trim();
          const match =
            (acc.DESCRIPCION || "").toLowerCase().includes(q) ||
            (acc.CODBARRAS || "").toLowerCase().includes(q) ||
            (acc.CATEGORIA || "").toLowerCase().includes(q);
          if (!match) return false;
        }
        if (filtroTalla !== "TODAS") {
          const t = (acc.TALLA || "").trim().toUpperCase();
          if (t !== filtroTalla && t !== "U") return false;
        }
        if (soloDisponibles && Number(acc.STOCK || 0) <= 0) return false;
        return true;
      })
      .sort((a, b) => {
        if (ordenPrecio === "menor") return Number(a.VALOR || 0) - Number(b.VALOR || 0);
        if (ordenPrecio === "mayor") return Number(b.VALOR || 0) - Number(a.VALOR || 0);
        return 0;
      });
  }, [accesorios, busqueda, filtroTalla, soloDisponibles, ordenPrecio]);

  // Número de WhatsApp: preferimos el celular (empieza por 3)
  const telefonoWhatsApp = useMemo(() => {
    const candidatos = [empresa.telefono2, empresa.telefono1]
      .map((t) => (t || "").replace(/\D/g, ""))
      .filter(Boolean);
    const celular = candidatos.find((t) => t.startsWith("3") && t.length >= 10);
    const elegido = celular || candidatos[0] || "3151234567";
    return elegido.startsWith("57") ? elegido : `57${elegido}`;
  }, [empresa.telefono1, empresa.telefono2]);

  // WhatsApp Link Generador
  function handleApartarPorWhatsApp(art: Articulo) {
    const texto = encodeURIComponent(
      `¡Hola! 👋 Vi en su catálogo web el traje:\n\n` +
      `🎭 *${art.DESCRIPCION}*\n` +
      `🏷️ Código: *${art.CODBARRAS || "S/C"}*\n` +
      `📏 Talla: *${art.TALLA || "ESTÁNDAR"}*\n` +
      `💰 Alquiler: *$${Number(art.VALOR || 0).toLocaleString("es-CO")}*\n\n` +
      `Me gustaría consultar disponibilidad para apartarlo. ¿Tienen disponible para esa fecha?`
    );

    window.open(`https://wa.me/${telefonoWhatsApp}?text=${texto}`, "_blank");
  }

  function handleApartarAccesorioPorWhatsApp(acc: Accesorio) {
    const texto = encodeURIComponent(
      `¡Hola! 👋 Vi en su catálogo web el accesorio:\n\n` +
      `🎩 *${acc.DESCRIPCION}*\n` +
      `🏷️ Código: *${acc.CODBARRAS || "S/C"}*\n` +
      `💰 Alquiler: *$${Number(acc.VALOR || 0).toLocaleString("es-CO")}*\n\n` +
      `¿Está disponible para apartarlo?`
    );
    window.open(`https://wa.me/${telefonoWhatsApp}?text=${texto}`, "_blank");
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-purple-500 selection:text-white font-sans antialiased">
      {/* =========================================================================
          BARRA SUPERIOR / HEADER
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white uppercase truncate">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h1>
              <p className="text-[10px] sm:text-xs text-purple-300 font-semibold tracking-wide flex items-center gap-1.5">
                <span>Catálogo Oficial de Alquiler de Trajes & Disfraces</span>
              </p>
            </div>
          </div>

          {/* Contacto Rápido & Botón POS */}
          <div className="flex items-center gap-3">
            {empresa.telefono1 && (
              <a
                href={`https://wa.me/57${empresa.telefono1.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-2 rounded-xl bg-emerald-600/20 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600/30 transition-all"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>WhatsApp: {empresa.telefono1}</span>
              </a>
            )}

            {onIrAlPos && (
              <button
                type="button"
                onClick={onIrAlPos}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs font-bold text-slate-200 shadow-sm transition-all"
              >
                <ShoppingBag className="h-4 w-4 text-indigo-400" />
                <span className="hidden sm:inline">Punto de Venta</span>
                <span className="sm:hidden">POS</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER
      ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-indigo-950/40 to-slate-900 py-8 sm:py-12 border-b border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_50%)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/30 px-4 py-1 text-xs font-black uppercase tracking-wider text-indigo-400">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>Colección de Disfraces & Trajes de Alquiler</span>
          </div>

          <h2 className="text-2xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight max-w-3xl mx-auto">
            Encuentra el traje perfecto para tu <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">ocasión especial</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">
            Explora nuestro inventario en tiempo real, verifica disponibilidad de tallas y aparta tu vestido en minutos directamente por WhatsApp.
          </p>

          {/* Barra de Búsqueda Principal */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-indigo-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca por personaje, temática, traje o código (Ej: Mario Bros, Princesa, DISF-001)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-2xl bg-slate-800/90 border-2 border-indigo-500/40 pl-12 pr-10 py-3.5 text-sm font-semibold text-white placeholder-slate-400 focus:outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/20 shadow-xl transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-4 text-slate-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BARRA DE CATEGORÍAS Y FILTROS
      ========================================================================= */}
      <section className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          {/* Categorías en Carrusel Horizontal */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CATEGORIAS_FILTRO.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategoriaSeleccionada(cat.id)}
                className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  categoriaSeleccionada === cat.id
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30 scale-105"
                    : "bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/60"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Filtros Secundarios: Talla, Disponibilidad, Orden */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-800/60">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filtro por Talla */}
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-400">Talla:</span>
                <select
                  value={filtroTalla}
                  onChange={(e) => setFiltroTalla(e.target.value)}
                  className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1 font-bold text-white focus:outline-none"
                >
                  <option value="TODAS">Todas las tallas</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                  <option value="INFANTIL">Infantil</option>
                  <option value="ESTÁNDAR">Estándar</option>
                </select>
              </div>

              {/* Switch Solo Disponibles */}
              <label className="flex items-center gap-2 cursor-pointer bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-1 text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={soloDisponibles}
                  onChange={(e) => setSoloDisponibles(e.target.checked)}
                  className="h-3.5 w-3.5 rounded text-indigo-500 focus:ring-0 cursor-pointer"
                />
                <span className="font-bold">Solo Disponibles Ahora</span>
              </label>
            </div>

            {/* Orden por Precio */}
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold">Ordenar:</span>
              <select
                value={ordenPrecio}
                onChange={(e) => setOrdenPrecio(e.target.value as any)}
                className="rounded-xl bg-slate-800 border border-slate-700 px-2.5 py-1 font-bold text-white focus:outline-none"
              >
                <option value="defecto">Destacados primero</option>
                <option value="menor">Menor precio de alquiler</option>
                <option value="mayor">Mayor precio de alquiler</option>
              </select>
              <span className="text-slate-400 font-bold hidden sm:inline">
                ({articulosFiltrados.length} trajes)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          GRILLA DE PRODUCTOS / TRAJES
      ========================================================================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {cargando ? (
          <div className="py-24 text-center space-y-4">
            <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-400">Cargando catálogo en tiempo real...</p>
          </div>
        ) : seccion === "ACCESORIOS" ? (
          accesoriosFiltrados.length === 0 ? (
            <div className="py-20 text-center space-y-3 bg-slate-800/40 rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
              <PackageOpen className="mx-auto h-14 w-14 text-slate-500" />
              <h3 className="text-lg font-black text-white">Aún no hay accesorios publicados</h3>
              <p className="text-xs text-slate-400">
                Pronto verás sombreros, pelucas, máscaras, capas y más complementos para tu disfraz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {accesoriosFiltrados.map((acc) => {
                const disponible = Number(acc.STOCK || 0) > 0;
                return (
                  <div
                    key={acc.IDACCESORIO ?? acc.CODBARRAS}
                    className="group flex flex-col rounded-3xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/60 shadow-lg transition-all p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                      <span className="uppercase text-indigo-400 font-bold tracking-wide">
                        {acc.CATEGORIA || "ACCESORIO"}
                      </span>
                      <span>{acc.CODBARRAS || "S/C"}</span>
                    </div>

                    <h4 className="text-sm font-bold text-white leading-snug line-clamp-2">{acc.DESCRIPCION}</h4>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          disponible ? "bg-emerald-500/90 text-white" : "bg-rose-600/90 text-white"
                        }`}
                      >
                        {disponible ? "Disponible" : "Agotado"}
                      </span>
                      <span className="rounded-xl bg-slate-950/70 border border-slate-700 px-2 py-0.5 text-[11px] font-black text-indigo-300">
                        Talla: {acc.TALLA || "U"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-700/60 flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Alquiler</div>
                        <div className="text-lg font-black text-indigo-400">
                          ${Number(acc.VALOR || 0).toLocaleString("es-CO")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Depósito</div>
                        <div className="text-xs font-bold text-amber-400">
                          +${Number(acc.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApartarAccesorioPorWhatsApp(acc)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-white" />
                      <span>Apartar</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : articulosFiltrados.length === 0 ? (
          <div className="py-20 text-center space-y-3 bg-slate-800/40 rounded-3xl border border-slate-800 p-8 max-w-lg mx-auto">
            <PackageOpen className="mx-auto h-14 w-14 text-slate-500" />
            <h3 className="text-lg font-black text-white">No encontramos trajes con estos filtros</h3>
            <p className="text-xs text-slate-400">
              Intenta buscando con otra palabra o restableciendo los filtros de categoría y talla.
            </p>
            <button
              type="button"
              onClick={() => {
                setBusqueda("");
                setCategoriaSeleccionada("TODAS");
                setFiltroTalla("TODAS");
                setSoloDisponibles(false);
              }}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all shadow-md"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {articulosFiltrados.map((art) => {
              const stock = Number(art.STOCK || 0);
              const estaDisponible = art.DISPONIBLE !== false && stock > 0;
              const esAgotado = stock <= 0;

              return (
                <div
                  key={art.IDARTICULO}
                  className="group relative flex flex-col rounded-3xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-indigo-500/60 shadow-lg hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 overflow-hidden"
                >
                  {/* Foto con Badge de Disponibilidad y Destacado */}
                  <div className="relative aspect-4/3 w-full bg-slate-900 overflow-hidden">
                    {art.IMAGEN_URL ? (
                      <img
                        src={art.IMAGEN_URL}
                        alt={art.DESCRIPCION}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500 gap-2 p-4 text-center">
                        <Sparkles className="h-8 w-8 text-indigo-400/60" />
                        <span className="text-[11px] font-bold text-slate-400">Foto disponible en tienda</span>
                      </div>
                    )}

                    {/* Badges superiores */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                      {/* Estado Disponibilidad */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md backdrop-blur-md ${
                          estaDisponible
                            ? "bg-emerald-500/90 text-white border border-emerald-400/40"
                            : esAgotado
                            ? "bg-rose-600/90 text-white border border-rose-400/40"
                            : "bg-slate-700/90 text-slate-200 border border-slate-500/40"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${estaDisponible ? "bg-white animate-pulse" : "bg-slate-300"}`} />
                        {estaDisponible ? "Disponible" : esAgotado ? "En Alquiler" : "No disponible"}
                      </span>

                      {art.DESTACADO && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/95 text-slate-950 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-md">
                          <Star className="h-3 w-3 fill-slate-950" /> Top
                        </span>
                      )}
                    </div>

                    {/* Talla Badge */}
                    <div className="absolute bottom-3 right-3">
                      <span className="rounded-xl bg-slate-950/80 backdrop-blur-md border border-slate-700 px-2.5 py-1 text-[11px] font-black text-indigo-300 shadow-md">
                        Talla: {art.TALLA || "ESTÁNDAR"}
                      </span>
                    </div>
                  </div>

                  {/* Contenido de la Tarjeta */}
                  <div className="flex-1 p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      {/* Categoría y Código */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="uppercase text-indigo-400 font-bold tracking-wide">
                          {art.CATEGORIA || "GENERAL"}
                        </span>
                        <span>{art.CODBARRAS || "S/C"}</span>
                      </div>

                      {/* Título / Descripción */}
                      <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                        {art.DESCRIPCION}
                      </h4>

                      {/* Precios */}
                      <div className="pt-2 border-t border-slate-700/60 flex items-baseline justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Alquiler por 3 días</div>
                          <div className="text-lg font-black text-indigo-400">
                            ${Number(art.VALOR || 0).toLocaleString("es-CO")}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Depósito</div>
                          <div className="text-xs font-bold text-amber-400">
                            +${Number(art.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setArticuloDetalle(art)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-200 transition-all active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Detalles</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApartarPorWhatsApp(art)}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-600/20 transition-all active:scale-95"
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-white" />
                        <span>Apartar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* =========================================================================
          MODAL DE DETALLE DEL PRODUCTO
      ========================================================================= */}
      {articuloDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl overflow-hidden text-slate-100 my-8">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setArticuloDetalle(null)}
              className="absolute top-4 right-4 z-10 h-9 w-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Foto Grande */}
              <div className="relative aspect-square md:aspect-auto bg-slate-950 flex items-center justify-center">
                {articuloDetalle.IMAGEN_URL ? (
                  <img
                    src={articuloDetalle.IMAGEN_URL}
                    alt={articuloDetalle.DESCRIPCION}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-500 space-y-2">
                    <Sparkles className="h-12 w-12 text-indigo-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-400">Prenda lista en tienda física</p>
                  </div>
                )}
              </div>

              {/* Información Completa */}
              <div className="p-6 md:p-8 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-indigo-500/20 border border-indigo-500/30 px-3 py-0.5 text-xs font-bold text-indigo-300 uppercase">
                      {articuloDetalle.CATEGORIA || "GENERAL"}
                    </span>
                    <span className="rounded-xl bg-slate-800 border border-slate-700 px-3 py-0.5 text-xs font-bold text-slate-300 font-mono">
                      {articuloDetalle.CODBARRAS || "S/C"}
                    </span>
                  </div>

                  {/* Nombre */}
                  <h3 className="text-xl font-black text-white leading-tight">
                    {articuloDetalle.DESCRIPCION}
                  </h3>

                  {/* Talla y Disponibilidad */}
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-800/80 rounded-2xl border border-slate-700">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Talla</div>
                      <div className="text-sm font-black text-indigo-300">{articuloDetalle.TALLA || "ESTÁNDAR"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Estado</div>
                      <div className="text-sm font-black text-emerald-400">
                        {articuloDetalle.DISPONIBLE !== false && Number(articuloDetalle.STOCK || 0) > 0
                          ? "Disponible para Alquiler"
                          : "Consultar fecha"}
                      </div>
                    </div>
                  </div>

                  {/* Piezas Incluidas / Descripción Web */}
                  {articuloDetalle.DESCRIPCION_WEB ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold uppercase text-slate-400">Piezas Incluidas & Detalles:</div>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        {articuloDetalle.DESCRIPCION_WEB}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic">
                      Incluye todos los accesorios principales del personaje. Consulta detalles específicos por WhatsApp.
                    </p>
                  )}

                  {/* Precios */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Precio Alquiler (3 Días)</div>
                      <div className="text-2xl font-black text-indigo-400">
                        ${Number(articuloDetalle.VALOR || 0).toLocaleString("es-CO")}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Depósito Reembolsable</div>
                      <div className="text-sm font-bold text-amber-400">
                        ${Number(articuloDetalle.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleApartarPorWhatsApp(articuloDetalle)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3.5 text-sm font-black text-white shadow-xl shadow-emerald-600/30 transition-all active:scale-98"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span>Apartar este Traje por WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          FOOTER
      ========================================================================= */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 mt-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <p className="font-black text-white uppercase text-sm">{empresa.nombreComercial}</p>
            <p className="text-slate-500">{empresa.direccion} — {empresa.ciudad}</p>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            {empresa.telefono1 && <span>📞 {empresa.telefono1}</span>}
            <span>•</span>
            <span>⏱️ 3 Días de Alquiler Reglamentarios</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
