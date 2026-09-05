import React from "react";
import {
  Menu,
  X,
  ShoppingCart,
  Package,
  PlusCircle,
  Users,
  UserPlus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Printer,
  Wallet,
  Building2,
  Monitor,
  Maximize2,
  Settings,
  ShieldCheck,
  ChevronRight,
  Laptop,
  Activity,
  RotateCcw,
  Bell,
} from "lucide-react";
import type { TerminalConfig, EmpresaConfig } from "@/services/empresaCajaService";
import type { UsuarioPos } from "@/services/authPosService";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  terminal: TerminalConfig;
  empresa: EmpresaConfig;
  usuario?: UsuarioPos | null;
  onAccion: (accion: string) => void;
}

export function SidebarMenu({
  isOpen,
  onClose,
  terminal,
  empresa,
  usuario,
  onAccion,
}: SidebarMenuProps) {
  if (!isOpen) return null;

  const handleItemClick = (accion: string) => {
    onAccion(accion);
    onClose();
  };

  const permisos = usuario?.permisos || {};

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-in fade-in duration-200">
      {/* Telón de fondo con desenfoque */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Panel Lateral Drawer Light Theme */}
      <div className="relative z-10 flex h-full w-84 max-w-[85vw] flex-col bg-white text-slate-800 shadow-2xl border-r border-slate-200">
        {/* Cabecera del Menú */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-xs font-black text-sm">
              POS
            </div>
            <div>
              <h2 className="text-sm font-black tracking-tight text-slate-900 line-clamp-1">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700">{terminal.nombreCaja} ({terminal.prefijo})</span>
                {usuario && (
                  <>
                    <span>•</span>
                    <span className="text-slate-800 font-bold uppercase">{usuario.rol}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-600 hover:bg-slate-800 hover:text-white transition-all shadow-xs"
            title="Cerrar Menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de Secciones y Opciones con Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 custom-scrollbar">
          {/* SECCIÓN 1: VENTAS Y ALQUILER */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Punto de Venta
            </div>

            {permisos.posVentas !== false && (
              <button
                onClick={() => handleItemClick("pos_nuevo")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-3 text-left font-black text-sm bg-slate-900 text-white hover:bg-black transition-all group shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <ShoppingCart className="h-5 w-5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Nuevo Alquiler / Limpiar</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400" />
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleItemClick("inventario_stock")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Inventario & Stock</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleItemClick("catalogo_articulos")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Package className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Catálogo de Trajes</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.crearArticulos && (
              <button
                onClick={() => handleItemClick("nuevo_articulo")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <PlusCircle className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Registrar Traje</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 2: CLIENTES */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Clientes
            </div>

            <button
              onClick={() => handleItemClick("catalogo_clientes")}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                <span>Catálogo de Clientes</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
            </button>

            {permisos.crearModificarClientes !== false && (
              <button
                onClick={() => handleItemClick("nuevo_cliente")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <UserPlus className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Registrar Cliente</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 3: OPERACIONES POS */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Operaciones & Auditoría
            </div>

            <button
              onClick={() => handleItemClick("alertas_retrasos")}
              className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                <span>Trajes en Mora & Alertas</span>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
            </button>

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleItemClick("movimientos_trajes")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Activity className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Movimientos & Trajes</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleItemClick("balance_depositos")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Balance de Depósitos</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.apartadosAbonos && (
              <button
                onClick={() => handleItemClick("apartados")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ArrowDownLeft className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Reservas & Abonos</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.devoluciones && (
              <button
                onClick={() => handleItemClick("entrada_vestido")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <RotateCcw className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Devolución & Depósito</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.cierreCaja && (
              <button
                onClick={() => handleItemClick("cierre_caja")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Arqueo y Cierre de Caja</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.gastosCaja && (
              <button
                onClick={() => handleItemClick("gasto_salida")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Registrar Gasto</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.reimpresion && (
              <button
                onClick={() => handleItemClick("reimprimir")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Printer className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Reimpresión & Facturas</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 4: CONFIGURACIÓN GENERAL Y SEGURIDAD */}
          <div className="space-y-1">
            <div className="px-3 py-1 text-xs font-black uppercase tracking-wider text-slate-400">
              Administración & Ajustes
            </div>

            {permisos.gestionUsuarios && (
              <button
                onClick={() => handleItemClick("gestion_usuarios")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Usuarios & Roles</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.configEmpresa && (
              <button
                onClick={() => handleItemClick("config_empresa")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Datos de Empresa</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.configCajas && (
              <button
                onClick={() => handleItemClick("config_cajas")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Multi-Cajas & Esta PC</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.configResoluciones && (
              <button
                onClick={() => handleItemClick("config_resoluciones")}
                className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left font-bold text-sm text-slate-800 hover:bg-slate-100 hover:text-slate-900 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Maximize2 className="h-5 w-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
                  <span>Resolución de Pantalla</span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </div>

        {/* Pie del Menú con Estado Local */}
        <div className="border-t border-slate-200 bg-slate-50 p-3 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-slate-400" />
            <div>
              <div className="font-bold text-slate-700">{terminal.nombreEquipo}</div>
              <div className="text-[11px] text-slate-500">Caja: {terminal.nombreCaja} ({terminal.prefijo})</div>
            </div>
          </div>

          {permisos.configCajas && (
            <button
              onClick={() => handleItemClick("config_cajas")}
              title="Cambiar Caja o Resolución"
              className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all border border-slate-300 shadow-xs"
            >
              Ajustar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
