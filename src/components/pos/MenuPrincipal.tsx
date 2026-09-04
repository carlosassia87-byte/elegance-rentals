import React, { useState, useEffect } from "react";
import {
  Menu,
  ChevronLeft,
  ChevronRight,
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
  Sparkles,
  ShieldCheck,
  UserCheck,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Store,
  Layers,
  Activity,
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
  // Sidebar abierto por defecto y retraíble
  const [sidebarExpandido, setSidebarExpandido] = useState(true);
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
    onNavegar(modulo);
  };

  return (
    <div className="flex h-screen w-full select-none overflow-hidden bg-[#F8FAFC] text-slate-800 font-sans">
      {/* =========================================================================
          1. MENÚ LATERAL RETRAÍBLE (SIDEBAR HAMBURGUESA INTEGRADO Y ABIERTO)
      ========================================================================= */}
      <aside
        className={`relative flex flex-col border-r border-slate-200/90 bg-white transition-all duration-300 shadow-sm z-30 ${
          sidebarExpandido ? "w-80" : "w-20"
        }`}
      >
        {/* Cabecera del Sidebar con Toggle Hamburguesa */}
        <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-4 py-3.5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs font-black text-sm">
              POS
            </div>
            {sidebarExpandido && (
              <div className="min-w-0 transition-opacity duration-200">
                <h2 className="text-xs font-black tracking-tight text-slate-900 truncate">
                  {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
                </h2>
                <p className="text-[10px] font-bold text-emerald-700 uppercase truncate">
                  {usuario.rol} • {usuario.nombre}
                </p>
              </div>
            )}
          </div>

          {/* Botón Hamburguesa Retraíble */}
          <button
            type="button"
            onClick={() => setSidebarExpandido(!sidebarExpandido)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 hover:bg-emerald-600 hover:text-white text-slate-700 transition-all shadow-xs"
            title={sidebarExpandido ? "Retraer Menú" : "Expandir Menú"}
          >
            {sidebarExpandido ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Lista de Navegación Categorizada */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-4 text-xs custom-scrollbar">
          {/* SECCIÓN 1: PUNTO DE VENTA (DESTACADO) */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Punto de Venta
              </div>
            )}

            {permisos.posVentas !== false && (
              <button
                onClick={() => handleAccionConPermiso("pos", true, "Punto de Venta")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold transition-all group ${
                  sidebarExpandido
                    ? "justify-between px-3 bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
                    : "justify-center px-0 bg-emerald-600 text-white hover:bg-emerald-700"
                }`}
                title="Abrir Punto de Venta"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-4 w-4 shrink-0" />
                  {sidebarExpandido && <span>Abrir Punto de Venta</span>}
                </div>
                {sidebarExpandido && <ArrowRight className="h-3.5 w-3.5 opacity-80" />}
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleAccionConPermiso("catalogo_articulos", true, "Catálogo")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Catálogo de Trajes & Vestidos"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-4 w-4 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Catálogo de Trajes</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.crearArticulos && (
              <button
                onClick={() => handleAccionConPermiso("nuevo_articulo", true, "Nuevo Traje")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Registrar Nuevo Vestido / Traje"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="h-4 w-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Nuevo Vestido / Traje</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}
          </div>

          {/* SECCIÓN 2: CLIENTES */}
          {(permisos.buscarClientes || permisos.crearClientes) && (
            <div className="space-y-1">
              {sidebarExpandido && (
                <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Clientes
                </div>
              )}

              {permisos.buscarClientes && (
                <button
                  onClick={() => handleAccionConPermiso("buscar_cliente", true, "Buscar Cliente")}
                  className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                    sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                  }`}
                  title="Directorio de Clientes"
                >
                  <div className="flex items-center gap-3">
                    <Search className="h-4 w-4 text-sky-600 shrink-0 group-hover:scale-110 transition-transform" />
                    {sidebarExpandido && <span>Buscar Clientes</span>}
                  </div>
                  {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                </button>
              )}

              {permisos.crearClientes && (
                <button
                  onClick={() => handleAccionConPermiso("nuevo_cliente", true, "Registrar Cliente")}
                  className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                    sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                  }`}
                  title="Registrar / Modificar Cliente"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-4 w-4 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                    {sidebarExpandido && <span>Registrar Cliente</span>}
                  </div>
                  {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
                </button>
              )}
            </div>
          )}

          {/* SECCIÓN 3: OPERACIONES & CAJA */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Operaciones & Auditoría
              </div>
            )}

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleAccionConPermiso("movimientos_trajes", true, "Control de Movimientos")}
                className={`flex w-full items-center rounded-xl py-2 font-black text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Control de Movimientos y Estado de Trajes"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Movimientos & Trajes</span>}
                </div>
                {sidebarExpandido && (
                  <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">AUDITORÍA</span>
                )}
              </button>
            )}

            {permisos.apartadosAbonos && (
              <button
                onClick={() => handleAccionConPermiso("apartados", true, "Reservas & Abonos")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Reservas, Abonos y Entregas"
              >
                <div className="flex items-center gap-3">
                  <ArrowDownLeft className="h-4 w-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Reservas & Abonos</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.devoluciones && (
              <button
                onClick={() => handleAccionConPermiso("entrada_vestido", true, "Devolución")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Entrada de Vestidos / Reintegro de Depósito"
              >
                <div className="flex items-center gap-3">
                  <ArrowUpRight className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Entrada de Vestidos</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.gastosCaja && (
              <button
                onClick={() => handleAccionConPermiso("gasto_salida", true, "Gastos")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Registrar Gasto de Caja"
              >
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-4 w-4 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Gastos de Caja</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.cierreCaja && (
              <button
                onClick={() => handleAccionConPermiso("cierre_caja", true, "Arqueo de Caja")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-emerald-950 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Arqueo y Cierre de Caja"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-4 w-4 text-emerald-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Arqueo y Cierre de Caja</span>}
                </div>
                {sidebarExpandido && (
                  <span className="text-[9px] font-black bg-emerald-600 text-white px-1.5 py-0.2 rounded">HOY</span>
                )}
              </button>
            )}

            {permisos.reimpresion && (
              <button
                onClick={() => handleAccionConPermiso("reimprimir", true, "Reimpresión")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Reimprimir Recibo"
              >
                <div className="flex items-center gap-3">
                  <Printer className="h-4 w-4 text-cyan-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Reimprimir Recibo</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}
          </div>

          {/* SECCIÓN 4: ADMINISTRACIÓN & CONFIGURACIÓN */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Administración & Ajustes
              </div>
            )}

            {permisos.gestionUsuarios && (
              <button
                onClick={() => handleAccionConPermiso("gestion_usuarios", true, "Gestión de Usuarios")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-purple-950 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Usuarios, Roles y Permisos"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Usuarios & Roles</span>}
                </div>
                {sidebarExpandido && (
                  <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-black">ADMIN</span>
                )}
              </button>
            )}

            {permisos.configEmpresa && (
              <button
                onClick={() => handleAccionConPermiso("config_empresa", true, "Datos de Empresa")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Configuración de Empresa"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Datos de Empresa</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.configCajas && (
              <button
                onClick={() => handleAccionConPermiso("config_cajas", true, "Multi-Cajas")}
                className={`flex w-full items-center rounded-xl py-2 font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all group ${
                  sidebarExpandido ? "justify-between px-3" : "justify-center px-0"
                }`}
                title="Multi-Cajas y Asignar Terminal"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-4 w-4 text-rose-600 shrink-0 group-hover:scale-110 transition-transform" />
                  {sidebarExpandido && <span>Multi-Cajas & Esta PC</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}
          </div>
        </nav>

        {/* Pie del Sidebar: Info de Terminal y Salir */}
        <div className="border-t border-slate-200/80 bg-slate-50/80 p-3">
          {sidebarExpandido ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <Laptop className="h-4 w-4 text-slate-400 shrink-0" />
                <div className="truncate">
                  <div className="font-bold text-slate-800 text-xs truncate">{terminal.nombreEquipo}</div>
                  <div className="text-[10px] text-slate-500 truncate">Caja: {terminal.nombreCaja}</div>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="rounded-lg bg-red-50 hover:bg-red-600 hover:text-white px-2.5 py-1 text-[11px] font-bold text-red-700 transition-all border border-red-200 shrink-0"
                title="Cerrar Turno"
              >
                Salir
              </button>
            </div>
          ) : (
            <button
              onClick={onLogout}
              className="flex h-9 w-full items-center justify-center rounded-lg bg-red-50 hover:bg-red-600 hover:text-white text-red-700 transition-all border border-red-200"
              title="Cerrar Sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. ÁREA DE TRABAJO PRINCIPAL (LIMPIA, ELEGANTE Y SIN TARJETAS)
      ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-[#F8FAFC]">
        {/* Barra Superior Header */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 py-3.5 shadow-xs backdrop-blur-md">
          {/* Botón rápido para expandir sidebar si está retraído */}
          <div className="flex items-center gap-3">
            {!sidebarExpandido && (
              <button
                type="button"
                onClick={() => setSidebarExpandido(true)}
                className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition-all"
              >
                <Menu className="h-4 w-4" />
                <span>Menú</span>
              </button>
            )}

            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                Sistema POS en línea
              </span>
            </div>
          </div>

          {/* Estado de la Sesión */}
          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-emerald-600" />
              <span className="capitalize">{fechaHoyStr}</span>
              <span>•</span>
              <span className="font-mono text-slate-900 font-extrabold">{horaActual}</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800 text-[11px]">
              <span className="font-black uppercase">{usuario.nombre}</span>
              <span className="text-[10px] bg-emerald-600 px-1.5 py-0.2 rounded-md font-black text-white">{usuario.rol}</span>
            </div>
          </div>
        </header>

        {/* Centro de Bienvenida Ejecutivo y Elegante */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-4xl mx-auto w-full space-y-6">
          {/* Gran Logo Central */}
          <div className="flex flex-col items-center">
            <div className="rounded-3xl bg-white p-4 shadow-sm border border-slate-200/80 mb-4 transition-transform hover:scale-105 duration-200">
              <img
                src={logoAsset.url}
                alt="La Casa Del Disfraz"
                className="h-28 md:h-36 w-auto object-contain"
              />
            </div>

            {/* Slogan Pill */}
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 shadow-xs mb-3">
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              <span>Para toda ocasión, sin importar tu edad</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
              {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
            </h1>
            <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 max-w-md">
              Sistema Integral de Alquiler de Vestidos, Trajes y Punto de Venta.
            </p>
          </div>

          {/* Botón Principal Central: INGRESAR AL PUNTO DE VENTA */}
          {permisos.posVentas !== false && (
            <div className="w-full max-w-md pt-2">
              <button
                type="button"
                onClick={() => handleAccionConPermiso("pos", true, "Punto de Venta")}
                className="w-full flex items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 py-4 px-6 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl hover:scale-[1.02] active:scale-98 transition-all group border border-emerald-400/40"
              >
                <ShoppingCart className="h-5 w-5 group-hover:scale-110 transition-transform" />
                <span>Ingresar al Punto de Venta</span>
                <ArrowRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Indicadores de Estado en la parte inferior */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl pt-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                <Laptop className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-slate-400">Terminal</div>
                <div className="text-xs font-bold text-slate-800 truncate">{terminal.nombreEquipo}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <Store className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-slate-400">Caja Asignada</div>
                <div className="text-xs font-bold text-slate-800 truncate">{terminal.nombreCaja} ({terminal.prefijo})</div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200/90 bg-white p-3.5 text-left shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase text-slate-400">Rol Activo</div>
                <div className="text-xs font-bold text-slate-800 truncate">{usuario.rol}</div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
