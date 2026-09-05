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
      <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-white text-slate-800 shadow-2xl border-r border-slate-200">
        {/* Cabecera del Menú */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs font-black text-sm">
              POS
            </div>
            <div>
              <h2 className="text-xs font-extrabold tracking-tight text-slate-900 line-clamp-1">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-slate-700">{terminal.nombreCaja} ({terminal.prefijo})</span>
                {usuario && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-700">{usuario.rol}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-200/70 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-all shadow-xs"
            title="Cerrar Menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de Secciones y Opciones con Scroll Suave */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar text-xs">
          {/* SECCIÓN 1: VENTAS Y ALQUILER */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Punto de Venta & Alquiler
            </div>

            {permisos.posVentas !== false && (
              <button
                onClick={() => handleItemClick("pos_nuevo")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Nuevo Alquiler / Limpiar</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleItemClick("inventario_stock")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-black text-slate-800 bg-blue-50/80 hover:bg-blue-100 hover:text-blue-900 transition-all group border border-blue-200"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>Inventario & Alimentar Stock</span>
                </div>
                <span className="text-[9px] font-black bg-blue-600 text-white px-1.5 py-0.2 rounded">KARDEX</span>
              </button>
            )}

            {permisos.catalogoArticulos !== false && (
              <button
                onClick={() => handleItemClick("catalogo_articulos")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Package className="h-4 w-4 text-blue-600 group-hover:scale-110 transition-transform" />
                  <span>Catálogo Rápido de Trajes</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.crearArticulos && (
              <button
                onClick={() => handleItemClick("nuevo_articulo")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Nuevo Vestido / Traje</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 2: CLIENTES */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gestión de Clientes
            </div>

            <button
              onClick={() => handleItemClick("catalogo_clientes")}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-800 hover:bg-sky-50 hover:text-sky-800 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4 text-sky-600 group-hover:scale-110 transition-transform" />
                <span>Catálogo / Directorio de Clientes</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
            </button>

            {permisos.crearModificarClientes !== false && (
              <button
                onClick={() => handleItemClick("nuevo_cliente")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <UserPlus className="h-4 w-4 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span>Registrar Nuevo Cliente</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 3: OPERACIONES POS */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operaciones y Devoluciones
            </div>

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleItemClick("movimientos_trajes")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-black text-emerald-900 bg-emerald-50/80 hover:bg-emerald-100 border border-emerald-200/90 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Activity className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Control de Movimientos & Estados</span>
                </div>
                <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.2 rounded font-black">
                  AUDITORÍA
                </span>
              </button>
            )}

            {permisos.movimientosTrajes !== false && (
              <button
                onClick={() => handleItemClick("balance_depositos")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-black text-amber-950 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Balance de Depósitos & Saldos</span>
                </div>
                <span className="text-[9px] bg-amber-600 text-white px-1.5 py-0.2 rounded font-black">
                  FINANZAS
                </span>
              </button>
            )}

            {permisos.apartadosAbonos && (
              <button
                onClick={() => handleItemClick("apartados")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <ArrowDownLeft className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Reservas / Abonos y Entregas</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            <button
              onClick={() => handleItemClick("alertas_retrasos")}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-black text-rose-900 bg-rose-50/80 hover:bg-rose-100 hover:text-rose-950 transition-all group border border-rose-200"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                <span>Trajes en Mora & Alertas</span>
              </div>
              <span className="text-[9px] font-black bg-rose-600 text-white px-1.5 py-0.2 rounded">MORA 3D</span>
            </button>

            {permisos.devoluciones && (
              <button
                onClick={() => handleItemClick("entrada_vestido")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-teal-50 hover:text-teal-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <RotateCcw className="h-4 w-4 text-teal-600 group-hover:scale-110 transition-transform" />
                  <span>Devolución de Traje & Depósito</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.gastosCaja && (
              <button
                onClick={() => handleItemClick("gasto_salida")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <TrendingDown className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Registrar Gasto / Salida</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.reimpresion && (
              <button
                onClick={() => handleItemClick("reimprimir")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-cyan-50 hover:text-cyan-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Printer className="h-4 w-4 text-cyan-600 group-hover:scale-110 transition-transform" />
                  <span>Reimprimir Recibo / Factura</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>

          {/* SECCIÓN 4: CAJA Y FINANZAS */}
          {permisos.cierreCaja && (
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                Caja y Cuadres
              </div>

              <button
                onClick={() => handleItemClick("cierre_caja")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Wallet className="h-4 w-4 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span>Arqueo y Cierre de Caja</span>
                </div>
                <span className="text-[10px] font-black bg-emerald-600 text-white px-1.5 py-0.5 rounded">
                  Hoy
                </span>
              </button>
            </div>
          )}

          {/* SECCIÓN 5: CONFIGURACIÓN GENERAL Y SEGURIDAD */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Configuración y Administración
            </div>

            {permisos.gestionUsuarios && (
              <button
                onClick={() => handleItemClick("gestion_usuarios")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Usuarios & Permisos / Roles</span>
                </div>
                <span className="text-[9px] bg-purple-600 text-white px-1.5 py-0.2 rounded font-black">
                  ADMIN
                </span>
              </button>
            )}

            {permisos.configEmpresa && (
              <button
                onClick={() => handleItemClick("config_empresa")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-amber-50 hover:text-amber-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className="h-4 w-4 text-amber-600 group-hover:scale-110 transition-transform" />
                  <span>Configuración de Empresa</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.configCajas && (
              <button
                onClick={() => handleItemClick("config_cajas")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Monitor className="h-4 w-4 text-rose-600 group-hover:scale-110 transition-transform" />
                  <span>Multi-Cajas y Asignar PC</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}

            {permisos.configResoluciones && (
              <button
                onClick={() => handleItemClick("config_resoluciones")}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left font-bold text-slate-700 hover:bg-purple-50 hover:text-purple-800 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <Maximize2 className="h-4 w-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Resoluciones y Escala UI</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-slate-400 opacity-0 group-hover:opacity-100" />
              </button>
            )}
          </div>
        </div>

        {/* Pie del Menú con Estado Local */}
        <div className="border-t border-slate-200 bg-slate-50 p-3 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-slate-400" />
            <div>
              <div className="font-bold text-slate-700">{terminal.nombreEquipo}</div>
              <div className="text-[10px] text-slate-500">Caja: {terminal.nombreCaja} ({terminal.prefijo})</div>
            </div>
          </div>

          {permisos.configCajas && (
            <button
              onClick={() => handleItemClick("config_cajas")}
              title="Cambiar Caja o Resolución"
              className="rounded-lg bg-white px-2.5 py-1 text-[10px] font-bold text-slate-700 hover:bg-slate-200 transition-all border border-slate-300 shadow-xs"
            >
              Ajustar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
