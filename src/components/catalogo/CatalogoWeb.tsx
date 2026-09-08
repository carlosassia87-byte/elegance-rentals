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
  ChevronLeft,
  Info,
  PackageOpen,
  ShoppingBag,
  ExternalLink,
  Store,
  Clock,
  ShieldCheck,
  Crown,
} from "lucide-react";
import type { Articulo, Accesorio } from "@/types/database.types";
import { listarArticulos } from "@/services/posService";
import { listarAccesorios } from "@/services/accesoriosService";
import { obtenerConfiguracionEmpresa, type EmpresaConfig, EMPRESA_DEFAULT } from "@/services/empresaCajaService";

interface CatalogoWebProps {
  onIrAlPos?: () => void;
}

const ARTICULOS_RESPALDO: Articulo[] = [
  { IDARTICULO: 1, DESCRIPCION: "ALICIA EN EL PAÍS DE LAS MARAVILLAS NIÑA EN ALQUILER VESTIDO TUTU", TALLA: "8", STOCK: 3, VALOR: 75000, CODBARRAS: "1001", VALORDEPOSITO: 35000, CATEGORIA: "PRINCESAS Y CUENTOS", DISPONIBLE: true, DESTACADO: true },
  { IDARTICULO: 2, DESCRIPCION: "MUSULMÁN BLANCO ALQUI BATA GORRO MUSULMAN CUADROS ROJO CON", TALLA: "M", STOCK: 4, VALOR: 65000, CODBARRAS: "1002", VALORDEPOSITO: 30000, CATEGORIA: "ÉPOCA Y COLONIAL", DISPONIBLE: true },
  { IDARTICULO: 3, DESCRIPCION: "TRAJE DE SALSA NIÑO: CAMISA, PANTALÓN", TALLA: "10", STOCK: 5, VALOR: 70000, CODBARRAS: "1003", VALORDEPOSITO: 35000, CATEGORIA: "TRADICIONAL / TÍPICO", DISPONIBLE: true },
  { IDARTICULO: 4, DESCRIPCION: "TRAJE DE SALSA NIÑA: VESTIDO, GUANTES, PEINETA", TALLA: "8", STOCK: 2, VALOR: 80000, CODBARRAS: "1004", VALORDEPOSITO: 40000, CATEGORIA: "TRADICIONAL / TÍPICO", DISPONIBLE: true, DESTACADO: true },
  { IDARTICULO: 5, DESCRIPCION: "PIRATA NIÑO: PANTALÓN, CAMISA, CHAQUETA CINTURÓN, SOBREBOTAS, SOMBRERO, ESPADA", TALLA: "12", STOCK: 4, VALOR: 85000, CODBARRAS: "1538", VALORDEPOSITO: 40000, CATEGORIA: "HALLOWEEN Y TERROR", DISPONIBLE: true, DESTACADO: true },
  { IDARTICULO: 6, DESCRIPCION: "MAGO NIÑO: PANTALÓN, CAMISA, CHAQUETÍN, CORBATÍN CINTURÓN, CAPA, SOMBRERO", TALLA: "10", STOCK: 3, VALOR: 75000, CODBARRAS: "1006", VALORDEPOSITO: 35000, CATEGORIA: "PRINCESAS Y CUENTOS", DISPONIBLE: true },
  { IDARTICULO: 7, DESCRIPCION: "MAGO DE OZ NIÑO: TÚNICA, CORDÓN DE CINTURA, VARITA Y SOMBRERO", TALLA: "8", STOCK: 2, VALOR: 70000, CODBARRAS: "1007", VALORDEPOSITO: 30000, CATEGORIA: "PRINCESAS Y CUENTOS", DISPONIBLE: true },
  { IDARTICULO: 8, DESCRIPCION: "DRÁCULA NIÑO: PANTALÓN, CAMISA, CHAQUETÍN, CORBATÍN CINTURÓN, CAPA, SOMBRERO", TALLA: "14", STOCK: 5, VALOR: 90000, CODBARRAS: "1008", VALORDEPOSITO: 45000, CATEGORIA: "HALLOWEEN Y TERROR", DISPONIBLE: true, DESTACADO: true },
];

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
  const [articulos, setArticulos] = useState<Articulo[]>(ARTICULOS_RESPALDO);
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
        listarArticulos("", 5000),
        listarAccesorios(),
        obtenerConfiguracionEmpresa(),
      ]);
      if (arts && arts.length > 0) {
        setArticulos(arts);
      } else {
        setArticulos(ARTICULOS_RESPALDO);
      }
      if (accs && accs.length > 0) {
        setAccesorios(accs.filter((a) => a.ACTIVO !== false));
      }
      if (emp) {
        setEmpresa(emp);
      }
    } catch (e) {
      console.error("Error cargando catálogo web:", e);
      setArticulos(ARTICULOS_RESPALDO);
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 flex flex-col font-sans antialiased selection:bg-emerald-500 selection:text-white">
      {/* =========================================================================
          BARRA SUPERIOR / HEADER (Estilo Claro del Sistema)
      ========================================================================= */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo y Nombre */}
          <div className="flex items-center gap-3">
            {onIrAlPos && (
              <button
                type="button"
                onClick={onIrAlPos}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-all active:scale-95 border border-slate-700 mr-1"
                title="Volver al Menú Principal"
              >
                <ChevronLeft className="h-4 w-4 text-emerald-400" />
                <span className="tracking-wide uppercase font-black">VOLVER AL MENÚ</span>
              </button>
            )}

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs font-black">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 uppercase truncate">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h1>
              <p className="text-[11px] text-emerald-700 font-extrabold tracking-wide flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Catálogo Oficial de Alquiler de Trajes & Disfraces</span>
              </p>
            </div>
          </div>

          {/* Contacto Rápido */}
          <div className="flex items-center gap-3">
            {empresa.telefono1 && (
              <a
                href={`https://wa.me/57${empresa.telefono1.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-all shadow-2xs"
              >
                <MessageCircle className="h-4 w-4 text-emerald-600" />
                <span className="hidden sm:inline">WhatsApp: {empresa.telefono1}</span>
                <span className="sm:hidden">WhatsApp</span>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          HERO BANNER (Diseño Claro, Moderno y Elegante)
      ========================================================================= */}
      <section className="relative overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100/70 py-8 sm:py-10 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200 px-4 py-1 text-xs font-black uppercase tracking-wider text-emerald-800 shadow-2xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Colección de Disfraces & Trajes de Alquiler</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight max-w-3xl mx-auto">
            Encuentra el traje perfecto para tu <span className="text-emerald-700">ocasión especial</span>
          </h2>

          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto font-medium">
            Explora nuestro inventario de prendas en tiempo real, verifica disponibilidad de tallas y aparta tu vestido en minutos directamente por WhatsApp.
          </p>

          {/* Pestañas: Trajes vs Accesorios */}
          <div className="flex justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSeccion("TRAJES")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                seccion === "TRAJES"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Sparkles className="h-4 w-4 text-emerald-400" />
              <span>Trajes & Vestidos ({articulosFiltrados.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSeccion("ACCESORIOS")}
              className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                seccion === "ACCESORIOS"
                  ? "bg-purple-800 text-white shadow-sm"
                  : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Crown className="h-4 w-4 text-amber-300" />
              <span>Accesorios & Complementos ({accesoriosFiltrados.length})</span>
            </button>
          </div>

          {/* Barra de Búsqueda Principal */}
          <div className="max-w-2xl mx-auto pt-2">
            <div className="relative flex items-center">
              <Search className="absolute left-4 h-5 w-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Busca por personaje, temática, traje o código (Ej: Alicia, Salsa, Pirata, 1538)..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-2xl bg-white border-2 border-slate-300 pl-12 pr-10 py-3 text-xs sm:text-sm font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10 shadow-xs transition-all"
              />
              {busqueda && (
                <button
                  type="button"
                  onClick={() => setBusqueda("")}
                  className="absolute right-4 text-slate-400 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          BARRA DE CATEGORÍAS Y FILTROS (Tema Claro del POS)
      ========================================================================= */}
      {seccion === "TRAJES" && (
        <section className="sticky top-16 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 shadow-2xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-2.5">
            {/* Categorías en Carrusel Horizontal */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {CATEGORIAS_FILTRO.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoriaSeleccionada(cat.id)}
                  className={`whitespace-nowrap px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    categoriaSeleccionada === cat.id
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Filtros Secundarios: Talla, Disponibilidad, Orden */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
              <div className="flex flex-wrap items-center gap-3">
                {/* Filtro por Talla */}
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-600 uppercase text-[11px]">Talla:</span>
                  <select
                    value={filtroTalla}
                    onChange={(e) => setFiltroTalla(e.target.value)}
                    className="rounded-xl bg-slate-50 border border-slate-300 px-2.5 py-1 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
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
                    <option value="2">2</option>
                    <option value="4">4</option>
                    <option value="6">6</option>
                    <option value="8">8</option>
                    <option value="10">10</option>
                    <option value="12">12</option>
                    <option value="14">14</option>
                    <option value="16">16</option>
                  </select>
                </div>

                {/* Switch Solo Disponibles */}
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-300 rounded-xl px-3 py-1 text-slate-700 hover:bg-slate-100 shadow-2xs">
                  <input
                    type="checkbox"
                    checked={soloDisponibles}
                    onChange={(e) => setSoloDisponibles(e.target.checked)}
                    className="h-3.5 w-3.5 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                  <span className="font-extrabold text-[11px]">Solo Disponibles Ahora</span>
                </label>
              </div>

              {/* Orden por Precio */}
              <div className="flex items-center gap-2">
                <span className="text-slate-600 font-extrabold uppercase text-[11px]">Ordenar:</span>
                <select
                  value={ordenPrecio}
                  onChange={(e) => setOrdenPrecio(e.target.value as any)}
                  className="rounded-xl bg-slate-50 border border-slate-300 px-2.5 py-1 font-bold text-slate-800 focus:outline-none focus:border-emerald-500 shadow-2xs"
                >
                  <option value="defecto">Destacados primero</option>
                  <option value="menor">Menor precio de alquiler</option>
                  <option value="mayor">Mayor precio de alquiler</option>
                </select>
                <span className="text-slate-500 font-bold hidden sm:inline text-xs">
                  ({articulosFiltrados.length} trajes)
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* =========================================================================
          GRILLA DE PRODUCTOS / TRAJES (Diseño Blanco Limpio con Tarjetas)
      ========================================================================= */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {cargando ? (
          <div className="py-24 text-center space-y-3">
            <div className="h-10 w-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-bold text-slate-500">Cargando catálogo en tiempo real...</p>
          </div>
        ) : seccion === "ACCESORIOS" ? (
          accesoriosFiltrados.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs">
              <PackageOpen className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="text-base font-black text-slate-900">Aún no hay accesorios disponibles</h3>
              <p className="text-xs text-slate-500">
                Pronto verás sombreros, pelucas, máscaras, capas y más complementos para tu disfraz.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {accesoriosFiltrados.map((acc) => {
                const disponible = Number(acc.STOCK || 0) > 0;
                return (
                  <div
                    key={acc.IDACCESORIO ?? acc.CODBARRAS}
                    className="group flex flex-col rounded-2xl bg-white hover:bg-slate-50/50 border border-slate-200/90 hover:border-purple-400 shadow-xs hover:shadow-md transition-all p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                      <span className="uppercase text-purple-700 font-extrabold tracking-wide">
                        {acc.CATEGORIA || "ACCESORIO"}
                      </span>
                      <span>{acc.CODBARRAS || "S/C"}</span>
                    </div>

                    <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2 min-h-[32px]">
                      {acc.DESCRIPCION}
                    </h4>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
                          disponible ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {disponible ? "Disponible" : "Agotado"}
                      </span>
                      <span className="rounded-lg bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-700">
                        Talla: {acc.TALLA || "U"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Alquiler</div>
                        <div className="text-base font-black text-slate-900">
                          ${Number(acc.VALOR || 0).toLocaleString("es-CO")}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Depósito</div>
                        <div className="text-xs font-bold text-amber-700">
                          +${Number(acc.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApartarAccesorioPorWhatsApp(acc)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-xs transition-all active:scale-95"
                    >
                      <MessageCircle className="h-3.5 w-3.5 text-white" />
                      <span>Apartar por WhatsApp</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )
        ) : articulosFiltrados.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-slate-200 p-8 max-w-lg mx-auto shadow-xs">
            <PackageOpen className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="text-base font-black text-slate-900">No encontramos trajes con estos filtros</h3>
            <p className="text-xs text-slate-500">
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
              className="mt-2 inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-black px-4 py-2 text-xs font-bold text-white transition-all shadow-xs"
            >
              Restablecer Filtros
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {articulosFiltrados.map((art) => {
              const stock = Number(art.STOCK || 0);
              const estaDisponible = art.DISPONIBLE !== false && stock > 0;
              const esAgotado = stock <= 0;

              return (
                <div
                  key={art.IDARTICULO}
                  className="group relative flex flex-col rounded-2xl bg-white hover:bg-slate-50/40 border border-slate-200/90 hover:border-emerald-500 shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden"
                >
                  {/* Foto con Badge de Disponibilidad y Destacado */}
                  <div className="relative aspect-4/3 w-full bg-slate-100 overflow-hidden border-b border-slate-100">
                    {art.IMAGEN_URL ? (
                      <img
                        src={art.IMAGEN_URL}
                        alt={art.DESCRIPCION}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 gap-2 p-4 text-center">
                        <div className="h-10 w-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500">Disponible en tienda</span>
                      </div>
                    )}

                    {/* Badges superiores */}
                    <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-2 pointer-events-none">
                      {/* Estado Disponibilidad */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs ${
                          estaDisponible
                            ? "bg-emerald-600 text-white"
                            : esAgotado
                            ? "bg-rose-600 text-white"
                            : "bg-slate-600 text-white"
                        }`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${estaDisponible ? "bg-white animate-pulse" : "bg-slate-200"}`} />
                        {estaDisponible ? "Disponible" : esAgotado ? "En Alquiler" : "No disponible"}
                      </span>

                      {art.DESTACADO && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-400 text-slate-900 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider shadow-xs">
                          <Star className="h-3 w-3 fill-slate-900" /> Top
                        </span>
                      )}
                    </div>

                    {/* Talla Badge */}
                    <div className="absolute bottom-2.5 right-2.5">
                      <span className="rounded-lg bg-slate-900/90 backdrop-blur-xs text-white px-2.5 py-0.5 text-[10px] font-black shadow-xs">
                        Talla: {art.TALLA || "ESTÁNDAR"}
                      </span>
                    </div>
                  </div>

                  {/* Contenido de la Tarjeta */}
                  <div className="flex-1 p-4 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      {/* Categoría y Código */}
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="uppercase text-emerald-800 font-extrabold tracking-wide">
                          {art.CATEGORIA || "GENERAL"}
                        </span>
                        <span>{art.CODBARRAS || "S/C"}</span>
                      </div>

                      {/* Título / Descripción */}
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 leading-snug min-h-[32px]">
                        {art.DESCRIPCION}
                      </h4>

                      {/* Precios */}
                      <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                        <div>
                          <div className="text-[10px] uppercase font-bold text-slate-400">Alquiler (3 Días)</div>
                          <div className="text-base font-black text-slate-900">
                            ${Number(art.VALOR || 0).toLocaleString("es-CO")}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-[10px] uppercase font-bold text-slate-400">Depósito</div>
                          <div className="text-xs font-bold text-amber-700">
                            +${Number(art.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setArticuloDetalle(art)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200 py-2 text-xs font-bold text-slate-700 transition-all active:scale-95"
                      >
                        <Eye className="h-3.5 w-3.5 text-slate-600" />
                        <span>Detalles</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApartarPorWhatsApp(art)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2 text-xs font-black text-white shadow-xs transition-all active:scale-95"
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
          MODAL DE DETALLE DEL PRODUCTO (Estilo Claro del POS)
      ========================================================================= */}
      {articuloDetalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden text-slate-800 my-8">
            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={() => setArticuloDetalle(null)}
              className="absolute top-4 right-4 z-10 h-8 w-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 flex items-center justify-center transition-all shadow-xs"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid grid-cols-1 md:grid-cols-2">
              {/* Foto Grande */}
              <div className="relative aspect-square md:aspect-auto bg-slate-100 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-200">
                {articuloDetalle.IMAGEN_URL ? (
                  <img
                    src={articuloDetalle.IMAGEN_URL}
                    alt={articuloDetalle.DESCRIPCION}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Sparkles className="h-12 w-12 text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">Prenda lista en tienda física</p>
                  </div>
                )}
              </div>

              {/* Información Completa */}
              <div className="p-6 md:p-7 flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  {/* Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-extrabold text-emerald-800 uppercase">
                      {articuloDetalle.CATEGORIA || "GENERAL"}
                    </span>
                    <span className="rounded-xl bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-600 font-mono">
                      CÓD: {articuloDetalle.CODBARRAS || "S/C"}
                    </span>
                  </div>

                  {/* Nombre */}
                  <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {articuloDetalle.DESCRIPCION}
                  </h3>

                  {/* Talla y Disponibilidad */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Talla</div>
                      <div className="text-xs font-black text-slate-900">{articuloDetalle.TALLA || "ESTÁNDAR"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Estado</div>
                      <div className="text-xs font-black text-emerald-700">
                        {articuloDetalle.DISPONIBLE !== false && Number(articuloDetalle.STOCK || 0) > 0
                          ? "Disponible para Alquiler"
                          : "Consultar fecha"}
                      </div>
                    </div>
                  </div>

                  {/* Piezas Incluidas / Descripción Web */}
                  {articuloDetalle.DESCRIPCION_WEB ? (
                    <div className="space-y-1">
                      <div className="text-[11px] font-extrabold uppercase text-slate-600">Piezas Incluidas & Detalles:</div>
                      <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        {articuloDetalle.DESCRIPCION_WEB}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Incluye las piezas y complementos principales del traje. Consulta detalles específicos por WhatsApp.
                    </p>
                  )}

                  {/* Precios */}
                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Precio Alquiler (3 Días)</div>
                      <div className="text-xl font-black text-slate-900">
                        ${Number(articuloDetalle.VALOR || 0).toLocaleString("es-CO")}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase font-bold text-slate-400">Depósito Reembolsable</div>
                      <div className="text-xs font-bold text-amber-700">
                        +${Number(articuloDetalle.VALORDEPOSITO || 0).toLocaleString("es-CO")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Botón WhatsApp */}
                <button
                  type="button"
                  onClick={() => handleApartarPorWhatsApp(articuloDetalle)}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 py-3 text-xs font-black text-white shadow-sm transition-all active:scale-98"
                >
                  <MessageCircle className="h-4 w-4" />
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
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-0.5 text-center md:text-left">
            <p className="font-black text-slate-900 uppercase text-xs">{empresa.nombreComercial}</p>
            <p className="text-slate-500 text-[11px]">{empresa.direccion} — {empresa.ciudad}</p>
          </div>

          <div className="flex items-center gap-3 text-slate-600 text-[11px] font-bold">
            {empresa.telefono1 && <span>📞 {empresa.telefono1}</span>}
            <span>•</span>
            <span>⏱️ 3 Días de Alquiler Reglamentarios</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

