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
  RotateCcw,
  Bell,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import type { UsuarioPos } from "@/services/authPosService";
import type { TerminalConfig, EmpresaConfig } from "@/services/empresaCajaService";
import { consultarTodosLosRetrasosYAlertas } from "@/services/alertasRetrasosService";
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

  const [metricasRetrasos, setMetricasRetrasos] = useState({
    totalClientesEnMora: 0,
    totalTrajesEnMora: 0,
    totalDineroRecargosMora: 0,
  });

  useEffect(() => {
    const cargarMetricas = async () => {
      try {
        const res = await consultarTodosLosRetrasosYAlertas();
        setMetricasRetrasos({
          totalClientesEnMora: res.metricas.totalClientesEnMora,
          totalTrajesEnMora: res.metricas.totalTrajesEnMora,
          totalDineroRecargosMora: res.metricas.totalDineroRecargosMora,
        });
      } catch {}
    };
    cargarMetricas();
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
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3.5">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs font-black text-sm">
              POS
            </div>
            {sidebarExpandido && (
              <div className="min-w-0 transition-opacity duration-200">
                <h2 className="text-sm font-black tracking-tight text-slate-900 truncate">
                  {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
                </h2>
                <p className="text-xs font-bold text-slate-500 uppercase truncate">
                  {usuario.rol} • {usuario.nombre}
                </p>
              </div>
            )}
          </div>

          {/* Botón Hamburguesa Retraíble */}
          <button
            type="button"
            onClick={() => setSidebarExpandido(!sidebarExpandido)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/70 hover:bg-slate-800 hover:text-white text-slate-700 transition-all shadow-xs"
            title={sidebarExpandido ? "Retraer Menú" : "Expandir Menú"}
          >
            {sidebarExpandido ? <ChevronLeft className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>

        {/* Lista de Navegación Categorizada - SIN COLORES CHILLONES Y CON LETRA MÁS GRANDE */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {/* SECCIÓN 1: PUNTO DE VENTA */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
                Punto de Venta
              </div>
            )}

            {permisos.posVentas !== false && (
              <button
                onClick={() => handleAccionConPermiso("pos", true, "Punto de Venta")}
                className={`flex w-full items-center rounded-xl py-3 font-black text-sm transition-all group ${
                  sidebarExpandido
                    ? "justify-between px-3.5 bg-slate-900 text-white shadow-sm hover:bg-black"
                    : "justify-center px-0 bg-slate-900 text-white hover:bg-black"
                }`}
                title="Abrir Punto de Venta"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 shrink-0 text-emerald-400" />
                  {sidebarExpandido && <span className="tracking-wide">Abrir Punto de Venta</span>}
                </div>
                {sidebarExpandido && <ArrowRight className="h-4 w-4 opacity-80" />}
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleAccionConPermiso("inventario_stock", true, "Inventario & Stock")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Módulo de Inventario, Alimentación de Stock y Kardex"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Inventario & Stock</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleAccionConPermiso("catalogo_articulos", true, "Catálogo")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Catálogo Rápido de Trajes & Vestidos"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Catálogo de Trajes</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}

            {permisos.crearArticulos && (
              <button
                onClick={() => handleAccionConPermiso("nuevo_articulo", true, "Nuevo Traje")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Registrar Nuevo Vestido / Traje"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Nuevo Vestido / Traje</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}
          </div>

          {/* SECCIÓN 2: CLIENTES */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
                Clientes
              </div>
            )}

            <button
              onClick={() => handleAccionConPermiso("catalogo_clientes", true, "Catálogo de Clientes")}
              className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
              }`}
              title="Catálogo y Directorio General de Clientes"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                {sidebarExpandido && <span>Catálogo de Clientes</span>}
              </div>
              {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
            </button>

            {permisos.crearModificarClientes !== false && (
              <button
                onClick={() => handleAccionConPermiso("nuevo_cliente", true, "Registrar Cliente")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Registrar Nuevo Cliente"
              >
                <div className="flex items-center gap-3">
                  <UserCheck className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Registrar Cliente</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}
          </div>

          {/* SECCIÓN 3: OPERACIONES & CAJA */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
                Operaciones & Auditoría
              </div>
            )}

            <button
              onClick={() => handleAccionConPermiso("alertas_retrasos", true, "Alertas & Retrasos")}
              className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
              }`}
              title="Panel de Retrasos y Trajes por Vencer (Límite 3 Días · $15.000/día)"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                {sidebarExpandido && <span>Trajes en Mora & Alertas</span>}
              </div>
              {sidebarExpandido && metricasRetrasos.totalClientesEnMora > 0 && (
                <span className="text-xs font-black bg-rose-600 text-white px-2 py-0.5 rounded-full">
                  {metricasRetrasos.totalClientesEnMora}
                </span>
              )}
            </button>

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleAccionConPermiso("movimientos_trajes", true, "Control de Movimientos")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Control de Movimientos y Estado de Trajes"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Movimientos & Trajes</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleAccionConPermiso("balance_depositos", true, "Balance de Depósitos")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Balance Financiero de Depósitos y Saldos"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Balance de Depósitos</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
            )}

            {permisos.apartadosAbonos && (
              <button
                onClick={() => handleAccionConPermiso("apartados", true, "Reservas & Abonos")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Reservas, Abonos y Entregas"
              >
                <div className="flex items-center gap-3">
                  <ArrowDownLeft className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Reservas & Abonos</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.devoluciones && (
              <button
                onClick={() => handleAccionConPermiso("entrada_vestido", true, "Devolución & Depósito")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Devolución de Trajes / Reintegro de Depósito"
              >
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Devolución & Depósito</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.gastosCaja && (
              <button
                onClick={() => handleAccionConPermiso("gasto_salida", true, "Gastos")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Registrar Gasto de Caja"
              >
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Gastos de Caja</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.cierreCaja && (
              <button
                onClick={() => handleAccionConPermiso("cierre_caja", true, "Arqueo de Caja")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Arqueo y Cierre de Caja"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Arqueo y Cierre de Caja</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.reimpresion && (
              <button
                onClick={() => handleAccionConPermiso("reimprimir", true, "Reimpresión de Facturas")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Reimpresión & Historial de Facturas por Fecha"
              >
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Reimpresión & Facturas</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}
          </div>

          {/* SECCIÓN 4: ADMINISTRACIÓN & CONFIGURACIÓN */}
          <div className="space-y-1">
            {sidebarExpandido && (
              <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
                Administración & Ajustes
              </div>
            )}

            {permisos.gestionUsuarios && (
              <button
                onClick={() => handleAccionConPermiso("gestion_usuarios", true, "Gestión de Usuarios")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Usuarios, Roles y Permisos"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Usuarios & Roles</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.configEmpresa && (
              <button
                onClick={() => handleAccionConPermiso("config_empresa", true, "Datos de Empresa")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Configuración de Empresa"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
                  {sidebarExpandido && <span>Datos de Empresa</span>}
                </div>
                {sidebarExpandido && <ChevronRight className="h-3.5 w-3.5 text-slate-400" />}
              </button>
            )}

            {permisos.configCajas && (
              <button
                onClick={() => handleAccionConPermiso("config_cajas", true, "Multi-Cajas")}
                className={`flex w-full items-center rounded-xl py-2.5 font-bold text-sm text-slate-800 hover:bg-slate-100 transition-all group ${
                  sidebarExpandido ? "justify-between px-3.5" : "justify-center px-0"
                }`}
                title="Multi-Cajas y Asignar Terminal"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-slate-500 group-hover:text-slate-900 shrink-0 transition-colors" />
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
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 py-2.5 shadow-xs backdrop-blur-md gap-2 w-full max-w-full">
          {/* Botón rápido para expandir sidebar si está retraído */}
          <div className="flex items-center gap-3 shrink-0">
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

          {/* Estado de la Sesión y Notificaciones */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold shrink-0 ml-auto">
            {/* Botón Campana de Alertas de Retraso */}
            <button
              type="button"
              onClick={() => handleAccionConPermiso("alertas_retrasos", true, "Alertas & Retrasos")}
              className={`relative flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs border ${
                metricasRetrasos.totalClientesEnMora > 0
                  ? "bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100 animate-pulse"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
              }`}
              title="Panel de Retrasos y Trajes por Vencer (3 Días Límite · $15.000/día)"
            >
              <Bell className="h-4 w-4 text-rose-600" />
              <span className="hidden sm:inline">Alertas Mora</span>
              {metricasRetrasos.totalClientesEnMora > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white">
                  {metricasRetrasos.totalClientesEnMora}
                </span>
              )}
            </button>

            <div className="hidden lg:flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
              <Clock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span className="capitalize">{fechaHoyStr}</span>
              <span>•</span>
              <span className="font-mono text-slate-900 font-extrabold">{horaActual}</span>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-emerald-800 text-[11px] shrink-0">
              <span className="font-black uppercase max-w-[130px] sm:max-w-none truncate">{usuario.nombre}</span>
              <span className="text-[10px] bg-emerald-600 px-2 py-0.5 rounded-md font-black text-white shrink-0">{usuario.rol}</span>
            </div>
          </div>
        </header>

        {/* Centro de Bienvenida Ejecutivo y Elegante */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 text-center max-w-4xl mx-auto w-full space-y-5">
          {/* Banner Flotante de Retrasos / Mora (Si existen trajes en mora) */}
          {metricasRetrasos.totalClientesEnMora > 0 && (
            <div
              onClick={() => handleAccionConPermiso("alertas_retrasos", true, "Alertas & Retrasos")}
              className="w-full cursor-pointer rounded-2xl bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 p-3.5 border-2 border-rose-300 shadow-sm hover:shadow-md transition-all flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white font-black shrink-0 animate-bounce">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-rose-900 uppercase">
                      ¡Atención! {metricasRetrasos.totalClientesEnMora} cliente(s) con trajes en mora ({metricasRetrasos.totalTrajesEnMora} prendas)
                    </h4>
                    <span className="bg-rose-600 text-white px-1.5 py-0.2 rounded text-[10px] font-black">
                      +${metricasRetrasos.totalDineroRecargosMora.toLocaleString("es-CO")} en mora
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 font-medium">
                    Han superado el límite de 3 días de alquiler ($15.000/día). Haz clic aquí para enviarles cobro por WhatsApp o recibir trajes.
                  </p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-rose-600 group-hover:translate-x-1 transition-transform shrink-0" />
            </div>
          )}

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
