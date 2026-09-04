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
  HelpCircle,
  Layers,
  ChevronRight,
  Laptop,
} from "lucide-react";
import type { TerminalConfig, EmpresaConfig } from "@/services/empresaCajaService";

interface SidebarMenuProps {
  isOpen: boolean;
  onClose: () => void;
  terminal: TerminalConfig;
  empresa: EmpresaConfig;
  onAccion: (accion: string) => void;
}

export function SidebarMenu({
  isOpen,
  onClose,
  terminal,
  empresa,
  onAccion,
}: SidebarMenuProps) {
  if (!isOpen) return null;

  const handleItemClick = (accion: string) => {
    onAccion(accion);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex select-none animate-in fade-in duration-200">
      {/* Telón de fondo con desenfoque */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel Lateral Drawer */}
      <div className="relative z-10 flex h-full w-80 max-w-[85vw] flex-col bg-[#1E222B] text-slate-100 shadow-2xl border-r border-slate-700/80">
        {/* Cabecera del Menú */}
        <div className="flex items-center justify-between border-b border-slate-700 bg-[#161920] px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-red-600 to-red-800 text-white shadow-md font-black text-sm">
              POS
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wide text-white uppercase line-clamp-1">
                {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
              </h2>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{terminal.nombreCaja} ({terminal.prefijo})</span>
                <span>•</span>
                <span className="text-slate-300">{terminal.nombreEquipo}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white transition-all shadow"
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

            <button
              onClick={() => handleItemClick("pos_nuevo")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Nuevo Alquiler / Limpiar</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("catalogo_articulos")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Package className="h-4 w-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span>Archivo de Artículos / Catálogo</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("nuevo_articulo")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <PlusCircle className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Nuevo Vestido / Traje</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          {/* SECCIÓN 2: CLIENTES */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Gestión de Clientes
            </div>

            <button
              onClick={() => handleItemClick("buscar_cliente")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Search className="h-4 w-4 text-sky-400 group-hover:scale-110 transition-transform" />
                <span>Buscar Cliente / Directorio</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("nuevo_cliente")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <UserPlus className="h-4 w-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>Registrar / Modificar Cliente</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          {/* SECCIÓN 3: OPERACIONES POS */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Operaciones y Devoluciones
            </div>

            <button
              onClick={() => handleItemClick("apartados")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <ArrowDownLeft className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Apartados / Entregas y Abonos</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("entrada_vestido")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <ArrowUpRight className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Entrada Vestido / Depósito</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("gasto_salida")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <TrendingDown className="h-4 w-4 text-red-400 group-hover:scale-110 transition-transform" />
                <span>Registrar Gasto / Salida de Caja</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("reimprimir")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Printer className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                <span>Reimprimir Recibo / Factura</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>
          </div>

          {/* SECCIÓN 4: CAJA Y FINANZAS */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Caja y Cuadres
            </div>

            <button
              onClick={() => handleItemClick("cierre_caja")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 bg-slate-800/60 hover:bg-emerald-900/60 hover:text-white border border-slate-700/50 transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Wallet className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span className="text-emerald-300">Arqueo y Cierre de Caja</span>
              </div>
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded">
                Hoy
              </span>
            </button>
          </div>

          {/* SECCIÓN 5: CONFIGURACIÓN GENERAL */}
          <div className="space-y-1">
            <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Configuración y Parámetros
            </div>

            <button
              onClick={() => handleItemClick("config_empresa")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="h-4 w-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Configuración de Empresa</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("config_cajas")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Monitor className="h-4 w-4 text-rose-400 group-hover:scale-110 transition-transform" />
                <span>Multi-Cajas y Asignar Esta PC</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>

            <button
              onClick={() => handleItemClick("config_resoluciones")}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-bold text-slate-200 hover:bg-slate-800 hover:text-white transition-all group"
            >
              <div className="flex items-center gap-2.5">
                <Maximize2 className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
                <span>Resoluciones y Escala UI</span>
              </div>
              <ChevronRight className="h-3.5 w-3.5 text-slate-500 opacity-0 group-hover:opacity-100" />
            </button>
          </div>
        </div>

        {/* Pie del Menú con Estado Local */}
        <div className="border-t border-slate-700/80 bg-[#161920] p-3 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="h-4 w-4 text-slate-500" />
            <div>
              <div className="font-bold text-slate-300">{terminal.nombreEquipo}</div>
              <div className="text-[10px] text-slate-500">Caja: {terminal.nombreCaja} ({terminal.prefijo})</div>
            </div>
          </div>

          <button
            onClick={() => handleItemClick("config_cajas")}
            title="Cambiar Caja o Resolución"
            className="rounded bg-slate-800 px-2 py-1 text-[10px] font-black text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
          >
            Ajustar
          </button>
        </div>
      </div>
    </div>
  );
}
