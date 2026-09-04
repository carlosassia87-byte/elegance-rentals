import React, { useState, useEffect } from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Package,
  PlusCircle,
  Users,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Printer,
  Wallet,
  Building2,
  Monitor,
  Maximize2,
  LogOut,
  Clock,
  Laptop,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  UserCheck,
  Tag,
  Receipt,
  FileSpreadsheet,
  CheckCircle2,
  ArrowRight,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import type { UsuarioPos } from "@/services/authPosService";
import type { TerminalConfig, EmpresaConfig } from "@/services/empresaCajaService";
import logoAsset from "@/assets/logo.asset.json";

interface MenuPrincipalProps {
  usuario: UsuarioPos;
  terminal: TerminalConfig;
  empresa: EmpresaConfig;
  onNavegar: (modulo: string) => void;
  onLogout: () => void;
}

export function MenuPrincipal({
  usuario,
  terminal,
  empresa,
  onNavegar,
  onLogout,
}: MenuPrincipalProps) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false);
  const [horaActual, setHoraActual] = useState(() => new Date().toLocaleTimeString("es-CO"));

  useEffect(() => {
    const interval = setInterval(() => {
      setHoraActual(new Date().toLocaleTimeString("es-CO"));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const fechaHoyStr = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const permisos = usuario.permisos || {};

  const handleAccionConPermiso = (modulo: string, permitido: boolean, nombreModulo: string) => {
    if (!permitido) {
      toast.error(`Acceso denegado: Tu usuario (${usuario.rol}) no tiene permisos para ${nombreModulo}`);
      return;
    }
    setSidebarAbierto(false);
    onNavegar(modulo);
  };

  return (
    <div className="flex min-h-screen w-full select-none flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      {/* =========================================================================
          1. BARRA SUPERIOR DEL SISTEMA (TOP BAR CON BOTÓN HAMBURGUESA)
      ========================================================================= */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-8 py-3 shadow-xs backdrop-blur-md">
        {/* Lado Izquierdo: Botón Menú Hamburguesa + Logo Empresa */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            type="button"
            onClick={() => setSidebarAbierto(true)}
            className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all active:scale-95 group"
            title="Abrir Menú Lateral de Opciones"
          >
            <Menu className="h-4 w-4 transition-transform group-hover:scale-110" />
            <span className="hidden sm:inline tracking-wider uppercase">Menú Principal</span>
          </button>

          <div className="flex items-center gap-2.5 border-l border-slate-200 pl-3 md:pl-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200">
              <img src={logoAsset.url} alt="Logo" className="h-full w-auto object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h1>
              <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
                Sistema Integral de Alquiler & POS
              </p>
            </div>
          </div>
        </div>

        {/* Lado Derecho: Info de Sesión, Reloj y Botón Salir */}
        <div className="flex items-center gap-2.5 text-xs font-bold">
          {/* Fecha y Hora en vivo */}
          <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="capitalize">{fechaHoyStr}</span>
            <span>•</span>
            <span className="font-mono text-slate-900 font-extrabold">{horaActual}</span>
          </div>

          {/* Terminal / Caja */}
          <div
            onClick={() => handleAccionConPermiso("config_cajas", !!permisos.configCajas, "Configuración de Cajas")}
            className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 hover:bg-slate-200 transition-all text-slate-700 text-[11px]"
            title="Configurar Cajas y Pantalla"
          >
            <Laptop className="h-3.5 w-3.5 text-red-600" />
            <span className="hidden sm:inline">{terminal.nombreEquipo} •</span>
            <span className="font-extrabold text-emerald-700">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>

          {/* Usuario / Rol */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-black uppercase">{usuario.nombre}</span>
            <span className="text-[10px] bg-emerald-600 px-1.5 py-0.2 rounded-md font-black text-white">{usuario.rol}</span>
          </div>

          {/* Botón Salir */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3 py-1.5 font-bold uppercase text-slate-700 transition-all border border-slate-200 text-[11px]"
            title="Cerrar Sesión"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden md:inline">SALIR</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          2. MENÚ LATERAL HAMBURGUESA DESPLEGABLE (DRAWER ELEGANTE)
      ========================================================================= */}
      {sidebarAbierto && (
        <div className="fixed inset-0 z-50 flex select-none animate-in fade-in duration-200">
          {/* Telón de fondo */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarAbierto(false)}
          />

          {/* Panel Lateral Drawer */}
          <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-white text-slate-800 shadow-2xl border-r border-slate-200 animate-in slide-in-from-left duration-300">
            {/* Cabecera del Menú */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm font-black text-base">
                  POS
                </div>
                <div>
                  <h2 className="text-sm font-black tracking-tight text-slate-900">
                    Menú del Sistema
                  </h2>
                  <p className="text-[10px] font-bold text-emerald-700 uppercase">
                    {usuario.rol} • {usuario.nombre}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSidebarAbierto(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all"
                title="Cerrar Menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Lista de Opciones Categorizadas */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs custom-scrollbar">
              {/* SECCIÓN 1: PUNTO DE VENTA */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Punto de Venta & Alquiler
                </div>

                {permisos.posVentas !== false && (
                  <button
                    onClick={() => handleAccionConPermiso("pos", true, "Punto de Venta")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-bold text-slate-800 bg-emerald-50/70 hover:bg-emerald-100 hover:text-emerald-900 transition-all group border border-emerald-200/60"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShoppingCart className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>Abrir Punto de Venta</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-emerald-600" />
                  </button>
                )}

                {permisos.catalogoArticulos !== false && (
                  <button
                    onClick={() => handleAccionConPermiso("catalogo_articulos", true, "Catálogo")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Package className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                      <span>Catálogo de Trajes & Vestidos</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.crearArticulos && (
                  <button
                    onClick={() => handleAccionConPermiso("nuevo_articulo", true, "Nuevo Traje")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <PlusCircle className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span>Registrar Nuevo Traje</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
              </div>

              {/* SECCIÓN 2: CLIENTES */}
              {(permisos.buscarClientes || permisos.crearClientes) && (
                <div className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Directorio de Clientes
                  </div>

                  {permisos.buscarClientes && (
                    <button
                      onClick={() => handleAccionConPermiso("buscar_cliente", true, "Clientes")}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Search className="h-4 w-4 text-sky-600 group-hover:scale-110 transition-transform" />
                        <span>Buscar y Consultar Clientes</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}

                  {permisos.crearClientes && (
                    <button
                      onClick={() => handleAccionConPermiso("nuevo_cliente", true, "Registrar Cliente")}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                    >
                      <div className="flex items-center gap-2.5">
                        <Users className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                        <span>Crear / Modificar Cliente</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                    </button>
                  )}
                </div>
              )}

              {/* SECCIÓN 3: OPERACIONES Y CAJA */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Operaciones & Devoluciones
                </div>

                {permisos.apartadosAbonos && (
                  <button
                    onClick={() => handleAccionConPermiso("apartados", true, "Reservas y Abonos")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowDownLeft className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span>Reservas / Abonos & Entrega</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.devoluciones && (
                  <button
                    onClick={() => handleAccionConPermiso("entrada_vestido", true, "Devoluciones")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ArrowUpRight className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>Entrada de Vestidos / Fianza</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.gastosCaja && (
                  <button
                    onClick={() => handleAccionConPermiso("gasto_salida", true, "Gastos")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <TrendingDown className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                      <span>Gastos y Salidas de Caja</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.cierreCaja && (
                  <button
                    onClick={() => handleAccionConPermiso("cierre_caja", true, "Arqueo de Caja")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 transition-all group border border-emerald-200/80"
                  >
                    <div className="flex items-center gap-2.5">
                      <Wallet className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span>Arqueo y Cierre de Caja</span>
                    </div>
                    <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded">HOY</span>
                  </button>
                )}
              </div>

              {/* SECCIÓN 4: ADMINISTRACIÓN & SEGURIDAD */}
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Administración & Seguridad
                </div>

                {permisos.gestionUsuarios && (
                  <button
                    onClick={() => handleAccionConPermiso("gestion_usuarios", true, "Gestión de Usuarios")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-purple-950 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <ShieldCheck className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                      <span>Usuarios, Roles & Permisos</span>
                    </div>
                    <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-black">ADMIN</span>
                  </button>
                )}

                {permisos.configEmpresa && (
                  <button
                    onClick={() => handleAccionConPermiso("config_empresa", true, "Configuración Empresa")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Building2 className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                      <span>Datos de Empresa & Factura</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.configCajas && (
                  <button
                    onClick={() => handleAccionConPermiso("config_cajas", true, "Configuración Cajas")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Monitor className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                      <span>Multi-Cajas & Asignar Esta PC</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}

                {permisos.reimpresion && (
                  <button
                    onClick={() => handleAccionConPermiso("reimprimir", true, "Reimpresión")}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-slate-100 transition-all group"
                  >
                    <div className="flex items-center gap-2.5">
                      <Printer className="h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                      <span>Reimprimir Recibo Anterior</span>
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
                  </button>
                )}
              </div>
            </div>

            {/* Pie del Menú */}
            <div className="border-t border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="font-bold text-slate-800">{terminal.nombreEquipo}</div>
                  <div className="text-[10px] text-slate-500">Caja: {terminal.nombreCaja}</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="rounded-lg bg-red-50 hover:bg-red-600 hover:text-white px-2.5 py-1 text-[10px] font-bold text-red-700 transition-all border border-red-200"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. CONTENIDO PRINCIPAL: DASHBOARD ELEGANTE Y CENTRADO
      ========================================================================= */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-8 py-8 space-y-8">
        {/* CABECERA HERO ELEGANTE */}
        <div className="flex flex-col items-center justify-center text-center space-y-3">
          <div className="flex h-24 md:h-28 w-auto items-center justify-center">
            <img
              src={logoAsset.url}
              alt="La Casa Del Disfraz"
              className="h-full w-auto object-contain drop-shadow-sm transition-transform hover:scale-105 duration-200"
            />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-bold text-emerald-700 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
            <span>Para toda ocasión, sin importar tu edad</span>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
              Panel de Administración y Control
            </h2>
            <p className="text-xs md:text-sm font-medium text-slate-500 max-w-lg mx-auto">
              Bienvenido, <strong className="text-slate-800">{usuario.nombre}</strong>. Accede a través del menú superior o selecciona una sección directa.
            </p>
          </div>
        </div>

        {/* =========================================================================
            BANNER PRINCIPAL: BOTÓN GIGANTE PUNTO DE VENTA Y ALQUILER
        ========================================================================= */}
        {permisos.posVentas !== false && (
          <div
            onClick={() => handleAccionConPermiso("pos", true, "Punto de Venta")}
            className="cursor-pointer relative overflow-hidden rounded-3xl border-2 border-emerald-500 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 p-6 md:p-8 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all group"
          >
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3.5 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> MÓDULO PRINCIPAL DE ATENCIÓN
                </span>
                <h3 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white">
                  Punto de Venta y Facturación de Alquiler
                </h3>
                <p className="text-sm font-medium text-white/90 max-w-2xl">
                  Realizar nuevos alquileres, consultar disponibilidad de prendas, registrar depósitos de garantía, abonar y emitir tiras térmicas en tiempo real.
                </p>
              </div>

              <div className="flex items-center gap-2.5 rounded-2xl bg-white px-7 py-4 text-emerald-800 font-black text-sm uppercase tracking-wider shadow-lg group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0">
                <ShoppingCart className="h-5 w-5" />
                <span>Ingresar al POS</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            CUADRÍCULA DE MÓDULOS EN 4 COLUMNAS PERFECTAMENTE EQUILIBRADAS
        ========================================================================= */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Módulos y Accesos Rápidos
            </h4>
            <span className="text-[11px] font-bold text-slate-400">
              Usa el botón <strong className="text-slate-700">☰ Menú</strong> para ver la lista completa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
            {/* 1. Catálogo & Trajes */}
            {permisos.catalogoArticulos && (
              <div
                onClick={() => onNavegar("catalogo_articulos")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <Package className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Trajes & Catálogo
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Gestiona el catálogo: crea prendas, asigna tallas y controla el stock disponible.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Ir a trajes</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 2. Nuevo Vestido / Prenda */}
            {permisos.crearArticulos && (
              <div
                onClick={() => onNavegar("nuevo_articulo")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
                    <PlusCircle className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Nuevo Traje / Vestido
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Dar de alta una nueva prenda con talla, valor de alquiler y depósito de garantía.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Crear prenda</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 3. Directorio de Clientes */}
            {permisos.buscarClientes && (
              <div
                onClick={() => onNavegar("buscar_cliente")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs">
                    <Search className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Buscar Clientes
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Directorio de clientes, historial de alquileres, teléfonos y saldos pendientes.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Ver directorio</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 4. Reservas / Apartados & Abonos */}
            {permisos.apartadosAbonos && (
              <div
                onClick={() => onNavegar("apartados")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowDownLeft className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Reservas & Abonos
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Consulta facturas reservadas, registra abonos parciales y autoriza la entrega.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Ir a reservas</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 5. Entrada / Devolución de Vestidos */}
            {permisos.devoluciones && (
              <div
                onClick={() => onNavegar("entrada_vestido")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowUpRight className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Entrada de Vestidos
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Recepción de prenda devuelta y reintegro inmediato del depósito en garantía.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Registrar devolución</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 6. Arqueo y Cierre de Caja */}
            {permisos.cierreCaja && (
              <div
                onClick={() => onNavegar("cierre_caja")}
                className="cursor-pointer rounded-2xl border-2 border-emerald-500/80 bg-emerald-50/60 p-5 shadow-xs hover:shadow-lg hover:border-emerald-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-xs">
                    <Wallet className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-emerald-950">
                    Arqueo & Cierre de Caja
                  </h5>
                  <p className="mt-1 text-xs text-emerald-800/80 font-medium leading-relaxed">
                    Cuadre total del día en efectivo, transferencias e impresión de cierre de turno.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-700 group-hover:gap-2.5 transition-all pt-2 border-t border-emerald-200">
                  <span>Hacer arqueo</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 7. Gestión de Usuarios y Roles */}
            {permisos.gestionUsuarios && (
              <div
                onClick={() => onNavegar("gestion_usuarios")}
                className="cursor-pointer rounded-2xl border-2 border-purple-300 bg-purple-50/60 p-5 shadow-xs hover:shadow-lg hover:border-purple-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-600 text-white shadow-xs">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <h5 className="text-base font-extrabold text-purple-950">
                      Usuarios & Roles
                    </h5>
                    <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.5 rounded font-black">SEGURIDAD</span>
                  </div>
                  <p className="mt-1 text-xs text-purple-800/80 font-medium leading-relaxed">
                    Crear usuarios, asignar roles (Super Admin, Admin, Cajero) y qué ve cada uno.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-purple-700 group-hover:gap-2.5 transition-all pt-2 border-t border-purple-200">
                  <span>Administrar usuarios</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 8. Multi-Cajas y Configuración de Terminal */}
            {permisos.configCajas && (
              <div
                onClick={() => onNavegar("config_cajas")}
                className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 shadow-xs hover:shadow-lg hover:border-emerald-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
                    <Monitor className="h-6 w-6" />
                  </div>
                  <h5 className="mt-4 text-base font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Multi-Cajas & Esta PC
                  </h5>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Configurar qué caja opera esta computadora y numeración de recibos.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-bold text-emerald-600 group-hover:gap-2.5 transition-all pt-2 border-t border-slate-100">
                  <span>Configurar caja</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
