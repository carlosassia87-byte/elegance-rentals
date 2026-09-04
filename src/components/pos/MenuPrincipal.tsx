import React, { useState, useEffect } from "react";
import {
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
  ShieldAlert,
  Lock,
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
    <div className="flex min-h-screen w-full select-none flex-col bg-[#0F1117] text-slate-100 font-sans">
      {/* =========================================================================
          BARRA SUPERIOR DEL SISTEMA (TOP BAR)
      ========================================================================= */}
      <header className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#161922] px-6 py-3 shadow-md gap-4">
        {/* Lado Izquierdo: Logo y Nombre de Empresa */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white p-1.5 shadow ring-2 ring-red-600/40">
            <img src={logoAsset.url} alt="Logo" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-base font-black tracking-wide uppercase text-white leading-none line-clamp-1">
              {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
            </h1>
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mt-1">
              SISTEMA INTEGRAL DE ALQUILER Y POS
            </p>
          </div>
        </div>

        {/* Lado Derecho: Info de Sesión, Reloj y Botón Salir */}
        <div className="flex items-center flex-wrap gap-3 text-xs font-bold">
          {/* Fecha y Hora en vivo */}
          <div className="hidden md:flex items-center gap-2 rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/80 text-slate-300">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="capitalize">{fechaHoyStr}</span>
            <span>•</span>
            <span className="font-mono text-white font-black">{horaActual}</span>
          </div>

          {/* Terminal / Caja */}
          <div
            onClick={() => handleAccionConPermiso("config_cajas", !!permisos.configCajas, "Configuración de Cajas")}
            className="cursor-pointer flex items-center gap-1.5 rounded-lg bg-slate-800/80 px-3 py-1.5 border border-slate-700/80 hover:bg-slate-700 transition-all text-slate-300"
            title="Configurar Cajas y Pantalla"
          >
            <Laptop className="h-3.5 w-3.5 text-red-500" />
            <span>{terminal.nombreEquipo}</span>
            <span>•</span>
            <span className="font-black text-amber-400">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>

          {/* Usuario / Rol */}
          <div className="flex items-center gap-2 rounded-lg bg-red-950/50 border border-red-800/60 px-3 py-1.5 text-red-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-black uppercase">{usuario.nombre}</span>
            <span className="text-[10px] bg-red-800 px-1.5 py-0.2 rounded font-black text-white">{usuario.rol}</span>
          </div>

          {/* Botón Salir */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3.5 py-1.5 font-black uppercase text-slate-300 hover:bg-red-600 hover:text-white transition-all shadow border border-slate-700"
            title="Cerrar Sesión / Cambiar Usuario"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>CERRAR TURNO</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          CONTENIDO PRINCIPAL: CUADRÍCULA DE MÓDULOS (DASHBOARD TILES)
      ========================================================================= */}
      <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
        {/* BANNER PRINCIPAL / TARJETA DESTACADA DEL POS */}
        <div
          onClick={() => handleAccionConPermiso("pos", !!permisos.posVentas, "Punto de Venta")}
          className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-red-600 bg-gradient-to-r from-[#99002B] via-[#C40038] to-[#E60000] p-6 text-white shadow-2xl transition-all duration-200 hover:scale-[1.01] hover:shadow-red-900/40 group"
        >
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-black uppercase tracking-widest text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5 text-amber-300" /> MÓDULO PRINCIPAL DE ATENCIÓN
              </span>
              <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white">
                PUNTO DE VENTA Y FACTURACIÓN DE ALQUILER
              </h2>
              <p className="text-sm font-medium text-white/90 max-w-2xl">
                Realizar nuevos alquileres, agregar vestidos, registrar depósitos en garantía, seleccionar clientes y emitir recibos térmicos al instante.
              </p>
            </div>

            <div className="flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-red-700 font-black text-sm uppercase tracking-wider shadow-lg group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0">
              <ShoppingCart className="h-5 w-5" />
              <span>ABRIR PUNTO DE VENTA</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 1: INVENTARIO, CATÁLOGO Y CLIENTES
        ========================================================================= */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500" /> Catálogo, Artículos y Clientes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Catálogo de Artículos */}
            {permisos.catalogoArticulos && (
              <div
                onClick={() => onNavegar("catalogo_articulos")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-blue-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400 group-hover:scale-110 transition-transform">
                  <Package className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Archivo Artículos</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Consulta catálogo completo, códigos de barras, precios y existencias.
                </p>
              </div>
            )}

            {/* 2. Nuevo Vestido / Traje */}
            {permisos.crearArticulos && (
              <div
                onClick={() => onNavegar("nuevo_articulo")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-amber-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Nuevo Vestido / Traje</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Crear una nueva prenda en el catálogo con talla, depósito y alquiler.
                </p>
              </div>
            )}

            {/* 3. Directorio de Clientes */}
            {permisos.buscarClientes && (
              <div
                onClick={() => onNavegar("buscar_cliente")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-sky-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-600/20 text-sky-400 group-hover:scale-110 transition-transform">
                  <Search className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Buscar Cliente</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Directorio general de clientes, saldos pendientes y notas de historial.
                </p>
              </div>
            )}

            {/* 4. Registrar Cliente */}
            {permisos.crearClientes && (
              <div
                onClick={() => onNavegar("nuevo_cliente")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-indigo-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 group-hover:scale-110 transition-transform">
                  <Users className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Registrar Cliente</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Alta y modificación de clientes, teléfonos, empresa y direcciones.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 2: OPERACIONES, DEVOLUCIONES Y FINANZAS
        ========================================================================= */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Operaciones de Alquiler y Caja
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Apartados y Abonos */}
            {permisos.apartadosAbonos && (
              <div
                onClick={() => onNavegar("apartados")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-purple-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Apartados & Abonos</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Consultar facturas reservadas, registrar abonos y autorizar entrega.
                </p>
              </div>
            )}

            {/* 2. Entrada / Devolución de Vestidos */}
            {permisos.devoluciones && (
              <div
                onClick={() => onNavegar("entrada_vestido")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-emerald-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Entrada de Vestidos</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Recepción de prenda devuelta y reintegro del depósito de fianza.
                </p>
              </div>
            )}

            {/* 3. Gastos y Salidas de Caja */}
            {permisos.gastosCaja && (
              <div
                onClick={() => onNavegar("gasto_salida")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-red-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/20 text-red-400 group-hover:scale-110 transition-transform">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Gastos de Caja</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Registrar salidas de dinero, compras menores o pagos de servicios.
                </p>
              </div>
            )}

            {/* 4. Arqueo y Cierre de Caja */}
            {permisos.cierreCaja && (
              <div
                onClick={() => onNavegar("cierre_caja")}
                className="cursor-pointer rounded-xl border-2 border-emerald-600/60 bg-emerald-950/20 p-4 shadow-md hover:border-emerald-500 hover:bg-emerald-900/30 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/30 text-emerald-300 group-hover:scale-110 transition-transform">
                  <Wallet className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-emerald-300">Arqueo y Cierre de Caja</h4>
                <p className="mt-1 text-[11px] text-emerald-200/80 font-semibold">
                  Cuadre total del día en efectivo, transferencias e impresión de cierre.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 3: CONFIGURACIONES Y ADMINISTRACIÓN
        ========================================================================= */}
        <div className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Parámetros, Seguridad y Administración
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gestión de Usuarios y Roles (Módulo Solicitado) */}
            {permisos.gestionUsuarios && (
              <div
                onClick={() => onNavegar("gestion_usuarios")}
                className="cursor-pointer rounded-xl border-2 border-purple-600/60 bg-purple-950/20 p-4 shadow-md hover:border-purple-500 hover:bg-purple-900/30 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/30 text-purple-300 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div className="flex items-center justify-between mt-3">
                  <h4 className="text-sm font-black uppercase text-purple-300">Usuarios & Roles</h4>
                  <span className="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold">SEGURIDAD</span>
                </div>
                <p className="mt-1 text-[11px] text-purple-200/80 font-semibold">
                  Crear usuarios, asignar roles (Super Admin, Admin, Cajero) y definir qué ve cada uno.
                </p>
              </div>
            )}

            {/* 2. Configuración de Empresa */}
            {permisos.configEmpresa && (
              <div
                onClick={() => onNavegar("config_empresa")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-amber-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600/20 text-amber-400 group-hover:scale-110 transition-transform">
                  <Building2 className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Datos de Empresa</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  NIT, Razón Social, Teléfonos, Términos y pie de factura.
                </p>
              </div>
            )}

            {/* 3. Multi-Cajas y Asignar PC */}
            {permisos.configCajas && (
              <div
                onClick={() => onNavegar("config_cajas")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-rose-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-600/20 text-rose-400 group-hover:scale-110 transition-transform">
                  <Monitor className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Multi-Cajas & Esta PC</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Asignar qué caja opera esta computadora física y prefijos.
                </p>
              </div>
            )}

            {/* 4. Resoluciones y Pantallas */}
            {permisos.configResoluciones && (
              <div
                onClick={() => onNavegar("config_resoluciones")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-purple-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600/20 text-purple-400 group-hover:scale-110 transition-transform">
                  <Maximize2 className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Resolución y Escala UI</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Adaptar interfaz para laptops, monitores HD o pantallas táctiles.
                </p>
              </div>
            )}

            {/* 5. Reimpresión de Documentos */}
            {permisos.reimpresion && (
              <div
                onClick={() => onNavegar("reimprimir")}
                className="cursor-pointer rounded-xl border border-slate-800 bg-[#161922] p-4 shadow-md hover:border-cyan-500/80 hover:bg-slate-800/80 transition-all group"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-600/20 text-cyan-400 group-hover:scale-110 transition-transform">
                  <Printer className="h-5 w-5" />
                </div>
                <h4 className="mt-3 text-sm font-black uppercase text-white">Reimprimir Recibo</h4>
                <p className="mt-1 text-[11px] text-slate-400 font-semibold">
                  Generar copia física o térmica de la última factura procesada.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
