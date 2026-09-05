import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  X,
  Printer,
  Search,
  Calendar,
  Filter,
  RefreshCw,
  FileText,
  User,
  ShoppingBag,
  DollarSign,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Copy,
  Receipt,
  Layers,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { EmpresaConfig } from "@/services/empresaCajaService";
import {
  consultarMovimientos,
  type OperacionClienteMovimiento,
} from "@/services/movimientosService";
import { TicketFactura80mm, imprimirTicketPOS80mm } from "./TicketFactura80mm";

interface ReimpresionFacturasModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: EmpresaConfig;
  cajeroNombre?: string;
}

export function ReimpresionFacturasModal({
  open,
  onOpenChange,
  empresa,
  cajeroNombre = "ADMINISTRADOR",
}: ReimpresionFacturasModalProps) {
  // Rango de fechas: Por defecto HOY
  const hoyStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const [fechaDesde, setFechaDesde] = useState(hoyStr);
  const [fechaHasta, setFechaHasta] = useState(hoyStr);
  const [filtroModo, setFiltroModo] = useState<string>("TODOS");
  const [busqueda, setBusqueda] = useState("");

  const [operaciones, setOperaciones] = useState<OperacionClienteMovimiento[]>([]);
  const [cargando, setCargando] = useState(false);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<OperacionClienteMovimiento | null>(null);

  const ticketRef = useRef<HTMLDivElement>(null);

  // Cargar facturas
  const cargarFacturas = async () => {
    setCargando(true);
    try {
      const res = await consultarMovimientos({
        fechaInicio: fechaDesde,
        fechaFin: fechaHasta,
        estado: "TODOS",
        busqueda: "",
      });
      setOperaciones(res.operaciones);
      if (res.operaciones.length > 0) {
        // Seleccionar la primera por defecto si no hay ninguna seleccionada
        setFacturaSeleccionada((prev) => {
          if (!prev) return res.operaciones[0];
          const encontrada = res.operaciones.find((o) => o.numeroFact === prev.numeroFact);
          return encontrada || res.operaciones[0];
        });
      } else {
        setFacturaSeleccionada(null);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error al consultar facturas para reimpresión");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    if (open) {
      cargarFacturas();
    }
  }, [open, fechaDesde, fechaHasta]);

  // Filtro de facturas en memoria
  const facturasFiltradas = useMemo(() => {
    return operaciones.filter((op) => {
      const q = busqueda.toLowerCase().trim();
      const coincideTexto =
        !q ||
        op.numeroFact.toLowerCase().includes(q) ||
        op.clienteNombre.toLowerCase().includes(q) ||
        op.clienteCedula.toLowerCase().includes(q) ||
        op.items.some((it) => it.descripcion.toLowerCase().includes(q) || it.codigoBarras.toLowerCase().includes(q));

      const coincideModo =
        filtroModo === "TODOS" ||
        (filtroModo === "ALQUILER" && op.tipoOperacion === "ALQUILER") ||
        (filtroModo === "VENTA" && op.tipoOperacion === "VENTA") ||
        (filtroModo === "APARTADO" && op.tipoOperacion === "APARTADO / ABONO");

      return coincideTexto && coincideModo;
    });
  }, [operaciones, busqueda, filtroModo]);

  // Acceso rápido: Solo Hoy
  const handleFiltrarHoy = () => {
    setFechaDesde(hoyStr);
    setFechaHasta(hoyStr);
  };

  // Acceso rápido: Últimos 7 Días
  const handleFiltrarUltimos7Dias = () => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    setFechaDesde(d.toISOString().split("T")[0]);
    setFechaHasta(hoyStr);
  };

  // Acceso rápido: Este Mes
  const handleFiltrarMes = () => {
    const d = new Date();
    const primerDia = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
    setFechaDesde(primerDia);
    setFechaHasta(hoyStr);
  };

  // Disparar Impresión del Ticket Seleccionado
  const handleImprimirTicket = () => {
    if (!facturaSeleccionada) {
      toast.error("Selecciona una factura para imprimir");
      return;
    }
    imprimirTicketPOS80mm(ticketRef.current, `Recibo-${facturaSeleccionada.numeroFact}`);
  };

  // Copiar Resumen
  const handleCopiarResumen = () => {
    if (!facturaSeleccionada) return;
    const itemsTexto = facturaSeleccionada.items
      .map((it) => `- ${it.cantidad}x ${it.descripcion} (${it.talla}): $${it.valorAlquiler.toLocaleString("es-CO")}`)
      .join("\n");

    const texto = `*RECIBO POS - ${empresa.nombreComercial || "LA CASA DEL DISFRAZ"}*\n` +
      `Factura N°: ${facturaSeleccionada.numeroFact}\n` +
      `Fecha: ${facturaSeleccionada.fechaSalida} | Devolución: ${facturaSeleccionada.fechaEntregaPactada}\n` +
      `Cliente: ${facturaSeleccionada.clienteNombre} (C.C. ${facturaSeleccionada.clienteCedula})\n` +
      `Teléfono: ${facturaSeleccionada.clienteTelefono}\n\n` +
      `PRENDAS:\n${itemsTexto}\n\n` +
      `Total Alquiler: $${facturaSeleccionada.totalAlquiler.toLocaleString("es-CO")}\n` +
      `Depósito (Fianza): $${facturaSeleccionada.totalDeposito.toLocaleString("es-CO")}\n` +
      `TOTAL: $${facturaSeleccionada.totalVentaDeposito.toLocaleString("es-CO")}\n` +
      `Atendido por: ${facturaSeleccionada.vendedor || cajeroNombre}`;

    navigator.clipboard.writeText(texto);
    toast.success("Resumen copiado al portapapeles");
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      {/* Telón de fondo */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => onOpenChange(false)} />

      {/* Contenedor Principal del Modal */}
      <div className="relative z-10 flex h-[92vh] w-full max-w-7xl flex-col rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden text-slate-800 font-sans">
        {/* Encabezado Superior */}
        <header className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3.5 gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 text-white shadow-md shadow-cyan-500/20">
              <Printer className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                  Reimpresión & Historial de Facturas
                </h2>
                <span className="rounded-md bg-cyan-100 px-2 py-0.5 text-[10px] font-black text-cyan-800 uppercase">
                  TIRILLA POS 80MM
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Consulta facturas emitidas por fecha o número y reimprime comprobantes de alquiler
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-200/70 hover:bg-rose-50 hover:text-rose-600 text-slate-600 transition-all shadow-xs"
            title="Cerrar ventana"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        {/* Barra de Filtros Rápidos y Rangos de Fecha */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/70 px-6 py-2.5 text-xs">
          {/* Accesos rápidos de rango */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500 text-[11px] uppercase mr-1">Rango:</span>
            <button
              type="button"
              onClick={handleFiltrarHoy}
              className={`rounded-xl px-3 py-1.5 font-bold transition-all ${
                fechaDesde === hoyStr && fechaHasta === hoyStr
                  ? "bg-cyan-600 text-white shadow-xs"
                  : "bg-white text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
            >
              📅 Facturas de Hoy
            </button>
            <button
              type="button"
              onClick={handleFiltrarUltimos7Dias}
              className="rounded-xl bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              Últimos 7 Días
            </button>
            <button
              type="button"
              onClick={handleFiltrarMes}
              className="rounded-xl bg-white px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all"
            >
              Este Mes
            </button>
          </div>

          {/* Selectores de Fecha Manual */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400">Desde:</span>
              <input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="font-bold text-slate-800 text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-[11px] font-bold text-slate-400">Hasta:</span>
              <input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="font-bold text-slate-800 text-xs focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={cargarFacturas}
              className="flex items-center gap-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white px-3 py-1.5 font-bold transition-all shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cargando ? "animate-spin" : ""}`} />
              <span>Consultar</span>
            </button>
          </div>
        </div>

        {/* Cuerpo Principal Dividido: Tabla a la Izquierda (70%) + Vista Previa de Recibo a la Derecha (30%) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* LADO IZQUIERDO: LISTADO Y BÚSQUEDA DE FACTURAS */}
          <div className="flex-1 flex flex-col p-4 border-r border-slate-200 overflow-hidden space-y-3">
            {/* Buscador y Filtro por Modo */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar por N° Factura (ej: 000124), Cédula o Cliente..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs font-semibold focus:border-cyan-500 focus:outline-none shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setFiltroModo("TODOS")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroModo === "TODOS" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Todas ({operaciones.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroModo("ALQUILER")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroModo === "ALQUILER" ? "bg-emerald-600 text-white shadow-xs" : "text-emerald-700 hover:bg-emerald-50"
                  }`}
                >
                  Alquileres
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroModo("VENTA")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroModo === "VENTA" ? "bg-blue-600 text-white shadow-xs" : "text-blue-700 hover:bg-blue-50"
                  }`}
                >
                  Ventas
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroModo("APARTADO")}
                  className={`px-3 py-1 rounded-lg transition-all ${
                    filtroModo === "APARTADO" ? "bg-purple-600 text-white shadow-xs" : "text-purple-700 hover:bg-purple-50"
                  }`}
                >
                  Apartados
                </button>
              </div>
            </div>

            {/* Tabla de Facturas */}
            <div className="flex-1 overflow-auto rounded-2xl border border-slate-200 bg-white shadow-xs">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-slate-700 uppercase font-black tracking-wider">
                  <tr>
                    <th className="px-3 py-2.5">Factura N°</th>
                    <th className="px-3 py-2.5">Fecha</th>
                    <th className="px-3 py-2.5">Cliente</th>
                    <th className="px-2 py-2.5 text-center">Tipo</th>
                    <th className="px-3 py-2.5 text-right">Alquiler</th>
                    <th className="px-3 py-2.5 text-right">Depósito</th>
                    <th className="px-3 py-2.5 text-right">Total Cobrado</th>
                    <th className="px-2 py-2.5 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {facturasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        <Receipt className="mx-auto h-12 w-12 text-slate-300 mb-2" />
                        <p className="font-bold text-sm">No se encontraron facturas con estos filtros</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Verifica el rango de fechas seleccionado o haz clic en "Facturas de Hoy".
                        </p>
                      </td>
                    </tr>
                  ) : (
                    facturasFiltradas.map((op) => {
                      const esSeleccionada = facturaSeleccionada?.numeroFact === op.numeroFact;
                      return (
                        <tr
                          key={op.numeroFact}
                          onClick={() => setFacturaSeleccionada(op)}
                          className={`cursor-pointer transition-colors ${
                            esSeleccionada
                              ? "bg-cyan-50/90 text-cyan-950 font-bold border-l-4 border-cyan-600"
                              : "hover:bg-slate-50 text-slate-700"
                          }`}
                        >
                          <td className="px-3 py-2 font-mono font-black text-cyan-800">
                            #{op.numeroFact}
                          </td>
                          <td className="px-3 py-2 text-slate-500 whitespace-nowrap text-[11px]">
                            {op.fechaSalida}
                          </td>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-900 truncate max-w-[180px]">
                              {op.clienteNombre}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              C.C. {op.clienteCedula}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-black uppercase ${
                                op.tipoOperacion === "VENTA"
                                  ? "bg-blue-100 text-blue-800"
                                  : op.tipoOperacion === "APARTADO / ABONO"
                                  ? "bg-purple-100 text-purple-800"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {op.tipoOperacion}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-slate-700">
                            ${op.totalAlquiler.toLocaleString("es-CO")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-amber-700">
                            ${op.totalDeposito.toLocaleString("es-CO")}
                          </td>
                          <td className="px-3 py-2 text-right font-mono font-black text-emerald-700">
                            ${op.totalVentaDeposito.toLocaleString("es-CO")}
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFacturaSeleccionada(op);
                                setTimeout(handleImprimirTicket, 50);
                              }}
                              className="rounded-lg bg-slate-100 hover:bg-cyan-600 hover:text-white p-1.5 text-slate-600 transition-all"
                              title="Imprimir directamente"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Contador Inferior */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-bold px-1">
              <span>
                Mostrando <strong className="text-slate-800">{facturasFiltradas.length}</strong> facturas
              </span>
              <span>
                Total Recaudado:{" "}
                <strong className="text-emerald-700">
                  ${facturasFiltradas.reduce((acc, f) => acc + f.totalVentaDeposito, 0).toLocaleString("es-CO")}
                </strong>
              </span>
            </div>
          </div>

          {/* LADO DERECHO: PANEL DE VISTA PREVIA Y REIMPRESIÓN DEL TICKET POS */}
          <div className="w-full md:w-96 bg-slate-50 flex flex-col p-4 overflow-y-auto space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-700">
                <Receipt className="h-4 w-4 text-cyan-600" />
                <span>Vista Previa de Tirilla POS</span>
              </div>
              {facturaSeleccionada && (
                <button
                  type="button"
                  onClick={handleCopiarResumen}
                  className="text-[11px] font-bold text-cyan-700 hover:underline flex items-center gap-1"
                  title="Copiar texto del recibo"
                >
                  <Copy className="h-3 w-3" /> Copiar
                </button>
              )}
            </div>

            {facturaSeleccionada ? (
              <div className="flex-1 flex flex-col space-y-3">
                {/* Tirilla Térmica POS 80mm Oficial */}
                <div className="rounded-2xl bg-slate-100/70 p-3 border border-slate-300 shadow-inner overflow-y-auto max-h-[68vh] flex justify-center">
                  <div className="bg-white p-3 shadow-md rounded-lg border border-slate-200">
                    <TicketFactura80mm
                      ref={ticketRef}
                      caja="SERVIDOR"
                      cliente={facturaSeleccionada.clienteNombre}
                      cedula={facturaSeleccionada.clienteCedula}
                      direccion={facturaSeleccionada.clienteDireccion || "DG 17"}
                      telefono1={facturaSeleccionada.clienteTelefono || "1"}
                      telefono2="1"
                      formaPago={facturaSeleccionada.pagoTransferencia > 0 && facturaSeleccionada.pagoEfectivo > 0 ? "MIXTO" : facturaSeleccionada.pagoTransferencia > 0 ? "TRANSFERENCIA" : "EFECTIVO"}
                      tipo={facturaSeleccionada.tipoOperacion || "ALQUILER"}
                      cajero={facturaSeleccionada.vendedor || cajeroNombre || "SUPERVISOR"}
                      recibo={facturaSeleccionada.numeroFact}
                      fechaSalida={facturaSeleccionada.fechaSalida}
                      fechaDevolucion={facturaSeleccionada.fechaEntregaPactada}
                      valorAlquiler={facturaSeleccionada.totalAlquiler}
                      deposito={facturaSeleccionada.totalDeposito}
                      totalAlqDep={facturaSeleccionada.totalVentaDeposito}
                      descuento={0}
                      recibi={facturaSeleccionada.pagoEfectivo + facturaSeleccionada.pagoTransferencia}
                      saldo={facturaSeleccionada.saldoPendiente || 0}
                      esAbono={facturaSeleccionada.tipoOperacion === "APARTADO / ABONO"}
                      direccionEmpresa={empresa.direccion || "CRA 23 #15- 34"}
                      ciudadEmpresa="BUCARAMANGA -SANTANDER"
                      telefonosEmpresa={empresa.telefono1 ? `${empresa.telefono1} - ${empresa.telefono2 || "3202375610"}` : "6076963959 - 3202375610"}
                      items={facturaSeleccionada.items.map((it) => ({
                        descripcion: `${it.descripcion}${it.talla ? ` (${it.talla})` : ""}`,
                        cantidad: it.cantidad,
                        valor: it.valorAlquiler,
                        total: it.valorAlquiler * it.cantidad + (it.totalDeposito || 0),
                      }))}
                    />
                  </div>
                </div>

                {/* Botón Acción Principal de Reimpresión */}
                <button
                  type="button"
                  onClick={handleImprimirTicket}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-black text-white font-black py-3.5 px-4 text-xs uppercase tracking-wider shadow-lg shadow-slate-900/20 active:scale-98 transition-all"
                >
                  <Printer className="h-4 w-4 text-cyan-400" />
                  <span>Reimprimir Tirilla POS 80mm</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 rounded-2xl border border-dashed border-slate-300">
                <FileText className="h-10 w-10 text-slate-300 mb-2" />
                <p className="font-bold text-xs">Selecciona una factura de la lista</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  Aquí verás la vista previa del recibo lista para reimprimir en impresora térmica.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Pie del Modal */}
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500 font-bold">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Módulo de Reimpresión Activo · Terminal Conectada</span>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 px-5 py-2 text-xs font-bold text-white transition-all shadow-xs"
          >
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
}
