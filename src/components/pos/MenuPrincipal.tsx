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
  Calendar,
  Sparkle,
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
    <div className="flex min-h-screen w-full select-none flex-col bg-[#F8FAFC] text-slate-800 font-sans">
      {/* =========================================================================
          BARRA SUPERIOR DEL SISTEMA (TOP BAR - LIGHT THEME)
      ========================================================================= */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-slate-200/90 bg-white/95 px-6 py-3 shadow-xs backdrop-blur-md gap-4">
        {/* Lado Izquierdo: Logo y Nombre de Empresa */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-slate-200">
            <img src={logoAsset.url} alt="Logo" className="h-full w-auto object-contain" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-slate-900 leading-tight">
              {empresa.nombreComercial || "LA CASA DEL DISFRAZ"}
            </h1>
            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">
              Sistema de Alquiler & POS
            </p>
          </div>
        </div>

        {/* Lado Derecho: Info de Sesión, Reloj y Botón Salir */}
        <div className="flex items-center flex-wrap gap-2.5 text-xs font-bold">
          {/* Fecha y Hora en vivo */}
          <div className="hidden md:flex items-center gap-2 rounded-xl bg-slate-100/90 px-3 py-1.5 border border-slate-200 text-slate-600 text-[11px]">
            <Clock className="h-3.5 w-3.5 text-emerald-600" />
            <span className="capitalize">{fechaHoyStr}</span>
            <span>•</span>
            <span className="font-mono text-slate-900 font-extrabold">{horaActual}</span>
          </div>

          {/* Terminal / Caja */}
          <div
            onClick={() => handleAccionConPermiso("config_cajas", !!permisos.configCajas, "Configuración de Cajas")}
            className="cursor-pointer flex items-center gap-1.5 rounded-xl bg-slate-100/90 px-3 py-1.5 border border-slate-200 hover:bg-slate-200 transition-all text-slate-700 text-[11px]"
            title="Configurar Cajas y Pantalla"
          >
            <Laptop className="h-3.5 w-3.5 text-red-600" />
            <span>{terminal.nombreEquipo}</span>
            <span>•</span>
            <span className="font-extrabold text-emerald-700">{terminal.nombreCaja} ({terminal.prefijo})</span>
          </div>

          {/* Usuario / Rol */}
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200/80 px-3 py-1.5 text-emerald-800 text-[11px]">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-black uppercase">{usuario.nombre}</span>
            <span className="text-[10px] bg-emerald-600 px-1.5 py-0.2 rounded-md font-black text-white">{usuario.rol}</span>
          </div>

          {/* Botón Salir */}
          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-red-50 hover:text-red-600 hover:border-red-200 px-3.5 py-1.5 font-bold uppercase text-slate-700 transition-all border border-slate-200 text-[11px]"
            title="Cerrar Sesión / Cambiar Usuario"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>CERRAR TURNO</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          CABECERA HERO (ESTILO PANEL DE ADMINISTRACIÓN / LA CASA DEL DISFRAZ)
      ========================================================================= */}
      <div className="w-full flex flex-col items-center justify-center pt-8 pb-6 px-4 text-center">
        {/* Logo Central */}
        <div className="mb-3 transform transition-transform hover:scale-105 duration-200">
          <img
            src={logoAsset.url}
            alt="La Casa Del Disfraz"
            className="h-28 md:h-32 w-auto object-contain drop-shadow-sm"
          />
        </div>

        {/* Badge Mint / Emerald con Slogan */}
        <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1 text-xs font-bold text-emerald-700 shadow-xs mb-3">
          <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
          <span>Para toda ocasión, sin importar tu edad</span>
        </div>

        {/* Título Principal */}
        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tight">
          Panel de administración
        </h1>
        <p className="text-xs md:text-sm font-medium text-slate-500 mt-1 max-w-md">
          Bienvenido. Selecciona una sección para continuar.
        </p>
      </div>

      {/* =========================================================================
          CONTENIDO PRINCIPAL: CUADRÍCULA DE MÓDULOS (CLEAN LIGHT CARDS)
      ========================================================================= */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 pb-12 space-y-8">
        {/* =========================================================================
            1. TARJETA DESTACADA: PUNTO DE VENTA Y ALQUILER
        ========================================================================= */}
        {permisos.posVentas !== false && (
          <div
            onClick={() => handleAccionConPermiso("pos", !!permisos.posVentas, "Punto de Venta")}
            className="cursor-pointer overflow-hidden rounded-2xl border-2 border-emerald-500/80 bg-gradient-to-r from-emerald-500 via-emerald-600 to-teal-600 p-6 md:p-8 text-white shadow-lg hover:shadow-xl hover:scale-[1.008] transition-all group"
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-wider text-white backdrop-blur-xs">
                  <Sparkles className="h-3.5 w-3.5 text-amber-300" /> MÓDULO PRINCIPAL DE ATENCIÓN
                </span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white">
                  Punto de Venta y Facturación de Alquiler
                </h2>
                <p className="text-sm font-medium text-white/90 max-w-2xl">
                  Realizar nuevos alquileres, registrar prendas, depósitos en garantía, entregas y emitir recibos térmicos.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white px-6 py-3.5 text-emerald-700 font-black text-sm uppercase tracking-wider shadow-md group-hover:bg-amber-400 group-hover:text-slate-950 transition-colors shrink-0">
                <ShoppingCart className="h-5 w-5" />
                <span>Abrir Punto de Venta</span>
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1.5 transition-transform" />
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECCIÓN 1: CATÁLOGO, TRAJES Y CLIENTES
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Catálogo, Trajes y Clientes
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Archivo / Catálogo de Artículos */}
            {permisos.catalogoArticulos && (
              <div
                onClick={() => onNavegar("catalogo_articulos")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-xs">
                    <Package className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Trajes & Catálogo
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Gestiona el catálogo: crea trajes, asigna tallas y controla el stock disponible.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Ir a trajes</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 2. Nuevo Traje / Vestido */}
            {permisos.crearArticulos && (
              <div
                onClick={() => onNavegar("nuevo_articulo")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all shadow-xs">
                    <PlusCircle className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Nuevo Vestido / Traje
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Dar de alta una nueva prenda con talla, valor de alquiler y depósito de garantía.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Crear prenda</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 3. Directorio de Clientes */}
            {permisos.buscarClientes && (
              <div
                onClick={() => onNavegar("buscar_cliente")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-600 group-hover:bg-sky-600 group-hover:text-white transition-all shadow-xs">
                    <Search className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Buscar Clientes
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Directorio general de clientes, teléfonos, saldos pendientes y notas de historial.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Ver directorio</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 4. Registrar Cliente */}
            {permisos.crearClientes && (
              <div
                onClick={() => onNavegar("nuevo_cliente")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shadow-xs">
                    <Users className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Registrar Cliente
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Crear y editar información de clientes, documentos de identidad y contactos.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Nuevo cliente</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 2: OPERACIONES DE ALQUILER Y CAJA
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" /> Operaciones de Alquiler y Caja
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Apartados y Abonos */}
            {permisos.apartadosAbonos && (
              <div
                onClick={() => onNavegar("apartados")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowDownLeft className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Reservas & Abonos
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Consulta y administra las reservas de tus clientes: confirma, actualiza o abona.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Ir a reservas</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 2. Entrada / Devolución de Vestidos */}
            {permisos.devoluciones && (
              <div
                onClick={() => onNavegar("entrada_vestido")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-xs">
                    <ArrowUpRight className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Entrada de Vestidos
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Recepción de prendas devueltas e reintegro de fianza en garantía al cliente.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Registrar devolución</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 3. Gastos y Salidas de Caja */}
            {permisos.gastosCaja && (
              <div
                onClick={() => onNavegar("gasto_salida")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
                    <TrendingDown className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Gastos de Caja
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Registrar salidas de dinero menores, compras operativas o pagos directos.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Registrar gasto</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 4. Arqueo y Cierre de Caja */}
            {permisos.cierreCaja && (
              <div
                onClick={() => onNavegar("cierre_caja")}
                className="cursor-pointer rounded-2xl border-2 border-emerald-500/60 bg-emerald-50/50 p-5 shadow-xs hover:shadow-md hover:border-emerald-600 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                    <Wallet className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-emerald-950">
                    Arqueo & Cierre de Caja
                  </h4>
                  <p className="mt-1 text-xs text-emerald-800/80 font-medium leading-relaxed">
                    Cuadre total de ventas del día, efectivo, transferencias e impresión de cierre.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-700 group-hover:gap-2 transition-all">
                  <span>Hacer arqueo</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* =========================================================================
            SECCIÓN 3: CONFIGURACIÓN, USUARIOS Y PARÁMETROS
        ========================================================================= */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" /> Parámetros, Seguridad y Administración
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Gestión de Usuarios y Roles */}
            {permisos.gestionUsuarios && (
              <div
                onClick={() => onNavegar("gestion_usuarios")}
                className="cursor-pointer rounded-2xl border-2 border-purple-300 bg-purple-50/50 p-5 shadow-xs hover:shadow-md hover:border-purple-500 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-600 text-white shadow-xs">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <h4 className="text-sm font-extrabold text-purple-950">
                      Usuarios & Roles
                    </h4>
                    <span className="text-[10px] bg-purple-200/80 text-purple-800 px-1.5 py-0.5 rounded font-black">SEGURIDAD</span>
                  </div>
                  <p className="mt-1 text-xs text-purple-800/80 font-medium leading-relaxed">
                    Crear usuarios, definir roles (Super Admin, Admin, Cajero) y qué ve cada uno.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-purple-700 group-hover:gap-2 transition-all">
                  <span>Administrar usuarios</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 2. Configuración de Empresa */}
            {permisos.configEmpresa && (
              <div
                onClick={() => onNavegar("config_empresa")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all shadow-xs">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Datos de Empresa
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    NIT, Razón Social, Teléfonos, Términos y pie de factura térmica.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Ajustar datos</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 3. Multi-Cajas y Asignar PC */}
            {permisos.configCajas && (
              <div
                onClick={() => onNavegar("config_cajas")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600 group-hover:bg-rose-600 group-hover:text-white transition-all shadow-xs">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Multi-Cajas & Terminal
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Asignar qué caja opera esta computadora física y prefijo de factura.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Configurar caja</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 4. Resoluciones y Escala UI */}
            {permisos.configResoluciones && (
              <div
                onClick={() => onNavegar("config_resoluciones")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple-50 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-all shadow-xs">
                    <Maximize2 className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Resolución & Escala
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Ajustar tamaño de pantalla para laptops, monitores o táctiles.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Ajustar escala</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </div>
            )}

            {/* 5. Reimpresión de Documentos */}
            {permisos.reimpresion && (
              <div
                onClick={() => onNavegar("reimprimir")}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-emerald-500/60 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-xs">
                    <Printer className="h-5 w-5" />
                  </div>
                  <h4 className="mt-4 text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    Reimprimir Recibo
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 font-medium leading-relaxed">
                    Generar copia térmica o física de la última factura procesada.
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-bold text-emerald-600 group-hover:gap-2 transition-all">
                  <span>Reimprimir</span>
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
