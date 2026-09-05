import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Database,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  Terminal,
  AlertTriangle,
  CheckCircle2,
  Download,
  Upload,
  Layers,
  Sparkles,
  ShieldAlert,
  Loader2,
  ArrowRight,
  Package,
  Users,
  Receipt,
  Wallet,
  Coins,
  TrendingDown,
  Activity,
  Archive,
  Info,
  Play,
  RotateCcw,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  obtenerEstadisticasBaseDatos,
  ponerTodoElInventarioEnCero,
  purgarDatosSeleccionados,
  descargarPlantillaExcel,
  leerArchivoExcelParaPrevisualizacion,
  importarLoteArticulos,
  importarLoteClientes,
  ejecutarScriptSql,
  type EstadisticasBaseDatos,
  type OpcionesPurgaSistema,
  type ResultadoImportacionExcel,
  type ResultadoEjecucionSql,
} from "@/services/mantenimientoMigracionService";

interface MantenimientoMigracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cajeroNombre?: string;
  onDatosActualizados?: () => void;
}

export function MantenimientoMigracionModal({
  open,
  onOpenChange,
  cajeroNombre = "ADMINISTRADOR",
  onDatosActualizados,
}: MantenimientoMigracionModalProps) {
  // Pestaña Activa: "stock_cero" | "reseteo" | "excel" | "sql"
  const [tabActiva, setTabActiva] = useState<"stock_cero" | "reseteo" | "excel" | "sql">("stock_cero");

  // Estadísticas del sistema
  const [stats, setStats] = useState<EstadisticasBaseDatos>({
    articulos: 0,
    stockTotalArticulos: 0,
    clientes: 0,
    facturas: 0,
    camposFactura: 0,
    abonos: 0,
    depositosDevueltos: 0,
    gastos: 0,
    movimientosKardex: 0,
    cierresCaja: 0,
  });
  const [cargandoStats, setCargandoStats] = useState(false);

  // Estados de Operación: Stock a Cero
  const [procesandoStockCero, setProcesandoStockCero] = useState(false);
  const [confirmarStockCeroModal, setConfirmarStockCeroModal] = useState(false);

  // Estados de Operación: Reseteo Selectivo
  const [opcionesPurga, setOpcionesPurga] = useState<OpcionesPurgaSistema>({
    facturas: true,
    abonos: true,
    depositosDevueltos: true,
    gastos: true,
    movimientosKardex: true,
    cierresCaja: true,
    articulos: false,
    clientes: false,
  });
  const [palabraConfirmacion, setPalabraConfirmacion] = useState("");
  const [procesandoPurga, setProcesandoPurga] = useState(false);

  // Estados de Operación: Migración Excel
  const [tablaDestinoExcel, setTablaDestinoExcel] = useState<"ARTICULO" | "CLIENTES">("ARTICULO");
  const [modoImportacion, setModoImportacion] = useState<"upsert" | "insert">("upsert");
  const [archivoExcelSeleccionado, setArchivoExcelSeleccionado] = useState<File | null>(null);
  const [previewColumnas, setPreviewColumnas] = useState<string[]>([]);
  const [previewFilas, setPreviewFilas] = useState<any[]>([]);
  const [totalFilasExcel, setTotalFilasExcel] = useState(0);
  const [procesandoExcel, setProcesandoExcel] = useState(false);
  const [resultadoExcel, setResultadoExcel] = useState<ResultadoImportacionExcel | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Operación: Migración SQL
  const [scriptSql, setScriptSql] = useState("");
  const [procesandoSql, setProcesandoSql] = useState(false);
  const [resultadoSql, setResultadoSql] = useState<ResultadoEjecucionSql | null>(null);
  const sqlFileInputRef = useRef<HTMLInputElement>(null);

  // Cargar estadísticas al abrir
  useEffect(() => {
    if (open) {
      cargarEstadisticas();
    }
  }, [open]);

  async function cargarEstadisticas() {
    setCargandoStats(true);
    try {
      const data = await obtenerEstadisticasBaseDatos();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setCargandoStats(false);
    }
  }

  // 1. Manejo de Poner Inventario en Cero
  async function handleEjecutarStockCero() {
    setProcesandoStockCero(true);
    setConfirmarStockCeroModal(false);
    try {
      const res = await ponerTodoElInventarioEnCero(cajeroNombre);
      if (res.ok) {
        toast.success(res.mensaje);
        await cargarEstadisticas();
        onDatosActualizados?.();
      } else {
        toast.error(res.mensaje);
      }
    } catch (err: any) {
      toast.error(`Error: ${err?.message || "No se pudo resetear el stock"}`);
    } finally {
      setProcesandoStockCero(false);
    }
  }

  // 2. Manejo de Purga Selectiva
  async function handleEjecutarPurga() {
    if (palabraConfirmacion.trim().toUpperCase() !== "ELIMINAR") {
      toast.error("Debes escribir exactamente la palabra ELIMINAR para confirmar");
      return;
    }

    const algunaSeleccionada = Object.values(opcionesPurga).some(Boolean);
    if (!algunaSeleccionada) {
      toast.error("Selecciona al menos una categoría de datos para purgar");
      return;
    }

    setProcesandoPurga(true);
    try {
      const res = await purgarDatosSeleccionados(opcionesPurga, cajeroNombre);
      if (res.ok) {
        toast.success(res.mensaje);
        setPalabraConfirmacion("");
        await cargarEstadisticas();
        onDatosActualizados?.();
      } else {
        toast.error(res.mensaje);
      }
    } catch (err: any) {
      toast.error(`Error al purgar: ${err?.message || "Error desconocido"}`);
    } finally {
      setProcesandoPurga(false);
    }
  }

  // Presets rápidos de purga
  function aplicarPresetPurga(tipo: "operativo" | "todo" | "ninguno") {
    if (tipo === "operativo") {
      setOpcionesPurga({
        facturas: true,
        abonos: true,
        depositosDevueltos: true,
        gastos: true,
        movimientosKardex: true,
        cierresCaja: true,
        articulos: false,
        clientes: false,
      });
      toast.info("Preset aplicado: Solo Historial Operativo (Conserva Clientes y Catálogo)");
    } else if (tipo === "todo") {
      setOpcionesPurga({
        facturas: true,
        abonos: true,
        depositosDevueltos: true,
        gastos: true,
        movimientosKardex: true,
        cierresCaja: true,
        articulos: true,
        clientes: true,
      });
      toast.warning("Preset aplicado: Reseteo Total del Sistema (Incluye Clientes y Artículos)");
    } else {
      setOpcionesPurga({
        facturas: false,
        abonos: false,
        depositosDevueltos: false,
        gastos: false,
        movimientosKardex: false,
        cierresCaja: false,
        articulos: false,
        clientes: false,
      });
    }
  }

  // 3. Manejo de Archivo Excel
  async function handleSeleccionarArchivoExcel(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoExcelSeleccionado(file);
    setResultadoExcel(null);

    try {
      const { columnas, filas, totalFilas } = await leerArchivoExcelParaPrevisualizacion(file);
      setPreviewColumnas(columnas);
      setPreviewFilas(filas);
      setTotalFilasExcel(totalFilas);
      toast.success(`Archivo cargado: ${file.name} (${totalFilas} filas detectadas)`);
    } catch (err: any) {
      console.error(err);
      toast.error("Error al leer el archivo Excel. Verifica el formato.");
      setArchivoExcelSeleccionado(null);
      setPreviewFilas([]);
    }
  }

  async function handleImportarExcel() {
    if (!previewFilas || previewFilas.length === 0) {
      toast.error("No hay filas válidas para importar");
      return;
    }

    setProcesandoExcel(true);
    setResultadoExcel(null);

    try {
      let resultado: ResultadoImportacionExcel;
      if (tablaDestinoExcel === "ARTICULO") {
        resultado = await importarLoteArticulos(previewFilas, modoImportacion);
      } else {
        resultado = await importarLoteClientes(previewFilas, modoImportacion);
      }

      setResultadoExcel(resultado);
      if (resultado.insertados > 0 || resultado.actualizados > 0) {
        toast.success(`¡Importación exitosa! ${resultado.insertados + resultado.actualizados} registros procesados.`);
        await cargarEstadisticas();
        onDatosActualizados?.();
      } else {
        toast.error("No se pudieron importar los registros. Revisa los detalles.");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(`Error durante la importación: ${err?.message || "Error desconocido"}`);
    } finally {
      setProcesandoExcel(false);
    }
  }

  // 4. Manejo de SQL
  function handleCargarArchivoSql(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setScriptSql(content);
      toast.success(`Script SQL cargado: ${file.name}`);
    };
    reader.readAsText(file);
  }

  async function handleEjecutarSql() {
    if (!scriptSql.trim()) {
      toast.error("Escribe o carga un script SQL para ejecutar");
      return;
    }

    setProcesandoSql(true);
    setResultadoSql(null);

    try {
      const res = await ejecutarScriptSql(scriptSql);
      setResultadoSql(res);
      if (res.exitosas > 0) {
        toast.success(`¡Ejecutadas ${res.exitosas} sentencias SQL con éxito!`);
        await cargarEstadisticas();
        onDatosActualizados?.();
      } else {
        toast.error("Todas las sentencias fallaron. Revisa el log de la consola.");
      }
    } catch (err: any) {
      toast.error(`Error ejecutando SQL: ${err?.message || "Error desconocido"}`);
    } finally {
      setProcesandoSql(false);
    }
  }

  function insertarSnippetSql(tipo: "articulos" | "clientes" | "reset_stock") {
    if (tipo === "articulos") {
      setScriptSql(
`-- MIGRACIÓN DE ARTÍCULOS / DISFRACES
INSERT INTO ARTICULO (CODBARRAS, DESCRIPCION, TALLA, STOCK, VALOR, VALORDEPOSITO)
VALUES ('DISF-1001', 'TRAJE DE ÉPOCA COLONIAL DAMA', 'M', 5, 85000, 40000);

INSERT INTO ARTICULO (CODBARRAS, DESCRIPCION, TALLA, STOCK, VALOR, VALORDEPOSITO)
VALUES ('DISF-1002', 'DISFRAZ PIRATA DEL CARIBE ADULTO', 'L', 4, 90000, 45000);`
      );
    } else if (tipo === "clientes") {
      setScriptSql(
`-- MIGRACIÓN DE CLIENTES
INSERT INTO CLIENTES (CEDULA, NOMBRE, DIRECCION, TELEFONO, SALDO)
VALUES (1020304050, 'MARIA FERNANDA RODRIGUEZ', 'CALLE 45 # 23-10', '3101234567', 0);

INSERT INTO CLIENTES (CEDULA, NOMBRE, DIRECCION, TELEFONO, SALDO)
VALUES (98765432, 'CARLOS ANDRES MARTINEZ', 'CRA 15 # 10-20', '3004567890', 0);`
      );
    } else {
      setScriptSql(
`-- COLOCAR INVENTARIO EN CERO
UPDATE ARTICULO SET STOCK = 0;`
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[95vw] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-0 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        
        {/* =========================================================
            1. HEADER DEL MODAL
        ========================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight uppercase">
                  Mantenimiento, Reseteo & Migración de Datos
                </h2>
                <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-300 border border-emerald-500/40">
                  Panel Avanzado
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Poner stock en cero, purga selectiva del sistema e importación masiva por Excel / SQL.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={cargarEstadisticas}
              disabled={cargandoStats}
              title="Recargar Estadísticas"
              className="flex items-center gap-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-bold text-slate-200 border border-slate-700 transition-all"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${cargandoStats ? "animate-spin text-emerald-400" : ""}`} />
              <span className="hidden sm:inline">Refrescar</span>
            </button>

            <button
              onClick={() => onOpenChange(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* =========================================================
            2. RESUMEN DE REGISTROS DEL SISTEMA (MINI BARRA DE MÉTRICAS)
        ========================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 bg-slate-50 border-b border-slate-200 px-6 py-2 text-xs">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-slate-500 font-medium">Artículos:</span>
            <span className="font-bold text-slate-800">{stats.articulos}</span>
          </div>
          <div className="flex items-center gap-2">
            <Archive className="h-3.5 w-3.5 text-indigo-600" />
            <span className="text-slate-500 font-medium">Stock Total:</span>
            <span className={`font-black ${stats.stockTotalArticulos === 0 ? "text-slate-400" : "text-indigo-700"}`}>
              {stats.stockTotalArticulos}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-slate-500 font-medium">Clientes:</span>
            <span className="font-bold text-slate-800">{stats.clientes}</span>
          </div>
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-amber-600" />
            <span className="text-slate-500 font-medium">Facturas:</span>
            <span className="font-bold text-slate-800">{stats.facturas}</span>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-3.5 w-3.5 text-cyan-600" />
            <span className="text-slate-500 font-medium">Abonos:</span>
            <span className="font-bold text-slate-800">{stats.abonos}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-3.5 w-3.5 text-rose-600" />
            <span className="text-slate-500 font-medium">Gastos:</span>
            <span className="font-bold text-slate-800">{stats.gastos}</span>
          </div>
        </div>

        {/* =========================================================
            3. SELECTOR DE PESTAÑAS
        ========================================================= */}
        <div className="flex items-center border-b border-slate-200 bg-white px-6 pt-2 gap-2 overflow-x-auto">
          <button
            onClick={() => setTabActiva("stock_cero")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "stock_cero"
                ? "border-amber-600 text-amber-700 bg-amber-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Archive className="h-4 w-4 text-amber-600" />
            <span>1. Inventario en Cero</span>
          </button>

          <button
            onClick={() => setTabActiva("reseteo")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "reseteo"
                ? "border-rose-600 text-rose-700 bg-rose-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <ShieldAlert className="h-4 w-4 text-rose-600" />
            <span>2. Reseteo Selectivo del Sistema</span>
          </button>

          <button
            onClick={() => setTabActiva("excel")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "excel"
                ? "border-emerald-600 text-emerald-700 bg-emerald-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span>3. Migración Masiva Excel</span>
          </button>

          <button
            onClick={() => setTabActiva("sql")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "sql"
                ? "border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Terminal className="h-4 w-4 text-blue-600" />
            <span>4. Migración por Script SQL</span>
          </button>
        </div>

        {/* =========================================================
            4. CUERPO DE LAS PESTAÑAS
        ========================================================= */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 custom-scrollbar">

          {/* --------------------------------------------------------
              PESTAÑA 1: INVENTARIO EN CERO (0)
          -------------------------------------------------------- */}
          {tabActiva === "stock_cero" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-amber-200 bg-amber-50/70 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500 text-white shrink-0 shadow-md">
                    <Archive className="h-6 w-6" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <h3 className="text-base font-black text-amber-950 uppercase tracking-tight">
                      Colocar Todo el Stock del Inventario en Cero (0)
                    </h3>
                    <p className="text-xs text-amber-900 leading-relaxed">
                      Esta función actualizará el stock disponible de <strong>todos los artículos ({stats.articulos} prendas registradas)</strong> a <strong>cero (0)</strong>.
                    </p>
                    <div className="rounded-xl bg-white/80 border border-amber-200 p-3 text-xs text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5 text-amber-950">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>¿Qué se conserva intacto?</span>
                      </div>
                      <p className="text-[11px] text-slate-600 pl-5">
                        El catálogo de artículos, nombres de disfraces, tallas, códigos de barras, precios de alquiler y valores de depósito <strong>permanecen guardados</strong>. Solo la cantidad en stock cambia a 0 para que puedas volver a alimentarlo de cero.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjeta de Métricas de Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Total Artículos en Catálogo</div>
                  <div className="mt-1 text-3xl font-black text-slate-900">{stats.articulos}</div>
                  <div className="text-[11px] text-slate-500 mt-1">Disfraces, trajes y accesorios</div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
                  <div className="text-xs font-bold uppercase text-slate-400">Stock Total Actual Acumulado</div>
                  <div className={`mt-1 text-3xl font-black ${stats.stockTotalArticulos > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                    {stats.stockTotalArticulos} <span className="text-sm font-bold text-slate-500">unidades</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {stats.stockTotalArticulos === 0 ? "El inventario ya se encuentra en 0" : "Unidades pendientes por resetear a 0"}
                  </div>
                </div>
              </div>

              {/* Botón de Acción Principal */}
              <div className="pt-2 flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => setConfirmarStockCeroModal(true)}
                  disabled={procesandoStockCero}
                  className="w-full sm:w-auto min-w-[320px] flex items-center justify-center gap-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white font-black text-sm uppercase px-8 py-4 shadow-lg shadow-amber-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
                >
                  {procesandoStockCero ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Archive className="h-5 w-5" />
                  )}
                  <span>Colocar Todo el Inventario en Cero (0)</span>
                </button>

                <p className="text-[11px] text-slate-500 text-center">
                  Esta acción quedará registrada en el Kardex / Auditoría de Inventario con el usuario {cajeroNombre}.
                </p>
              </div>

              {/* Modal de Confirmación Secundaria para Stock Cero */}
              {confirmarStockCeroModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
                  <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
                    <div className="flex items-center gap-3 text-amber-600">
                      <AlertTriangle className="h-7 w-7 shrink-0" />
                      <h4 className="text-base font-black text-slate-900">¿Confirmas poner el stock en 0?</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Se actualizará el stock de los <strong>{stats.articulos} artículos</strong> a <strong>0 unidades</strong>. Los nombres y precios se conservarán.
                    </p>
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setConfirmarStockCeroModal(false)}
                        className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleEjecutarStockCero}
                        className="rounded-xl bg-amber-600 hover:bg-amber-700 px-5 py-2 text-xs font-black uppercase text-white shadow-md transition-all"
                      >
                        Sí, Poner en Cero
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------
              PESTAÑA 2: RESETEO SELECTIVO DEL SISTEMA (PURGA GRANULAR)
          -------------------------------------------------------- */}
          {tabActiva === "reseteo" && (
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-200">
              {/* Advertencia Superior */}
              <div className="rounded-2xl border-2 border-rose-200 bg-rose-50/80 p-5 shadow-xs">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shrink-0 shadow-md">
                    <ShieldAlert className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-rose-950 uppercase tracking-tight">
                      Reseteo / Purga Selectiva de la Base de Datos
                    </h3>
                    <p className="text-xs text-rose-900 leading-relaxed">
                      Marca las casillas de las tablas y registros que deseas eliminar. Puedes reiniciar únicamente el historial de ventas o reiniciar todo de fábrica.
                    </p>
                  </div>
                </div>
              </div>

              {/* Botones de Presets Rápidos */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                <div className="text-xs font-black uppercase tracking-wider text-slate-500">
                  Selección de Tablas y Entidades:
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => aplicarPresetPurga("operativo")}
                    className="rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-1 font-bold hover:bg-indigo-100 transition-all"
                  >
                    Solo Historial de Ventas
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetPurga("todo")}
                    className="rounded-lg bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 font-bold hover:bg-rose-100 transition-all"
                  >
                    Seleccionar Todo (Fábrica)
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarPresetPurga("ninguno")}
                    className="rounded-lg bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 font-bold hover:bg-slate-200 transition-all"
                  >
                    Deseleccionar
                  </button>
                </div>
              </div>

              {/* Grilla de Checkboxes Granulares */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Facturas y Alquileres */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.facturas ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.facturas}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, facturas: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Facturas & Alquileres</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.facturas} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina historial de facturas, recibos de alquiler y líneas de detalle de factura (`FACTURA`, `CAMPOFACTURA`).
                    </p>
                  </div>
                </label>

                {/* 2. Abonos de Clientes */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.abonos ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.abonos}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, abonos: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Abonos & Anticipos</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.abonos} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina el historial de abonos parciales realizados a facturas en bodega (`ABONO_CLIENTE`).
                    </p>
                  </div>
                </label>

                {/* 3. Depósitos Devueltos */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.depositosDevueltos ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.depositosDevueltos}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, depositosDevueltos: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Depósitos Devueltos</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.depositosDevueltos} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina el historial de garantías reintegradas a clientes en devoluciones (`depositoentregado`).
                    </p>
                  </div>
                </label>

                {/* 4. Gastos de Caja */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.gastos ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.gastos}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, gastos: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Gastos de Caja</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.gastos} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina salidas de dinero registradas en caja (`gastos`).
                    </p>
                  </div>
                </label>

                {/* 5. Movimientos / Kardex */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.movimientosKardex ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.movimientosKardex}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, movimientosKardex: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Movimientos & Kardex</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.movimientosKardex} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina el log de auditoría de entradas, salidas y ajustes de trajes (`MOVIMIENTOS_INVENTARIO`).
                    </p>
                  </div>
                </label>

                {/* 6. Cierres de Caja */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.cierresCaja ? "border-rose-400 bg-rose-50/40 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.cierresCaja}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, cierresCaja: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-slate-900 uppercase">Historial de Cierres de Caja</span>
                      <span className="text-[11px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
                        {stats.cierresCaja} registros
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Elimina el histórico de arqueos diarios y cierres de turno de cajeros.
                    </p>
                  </div>
                </label>

                {/* 7. Catálogo de Artículos (CRÍTICO) */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.articulos ? "border-red-600 bg-red-50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.articulos}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, articulos: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-red-900 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Catálogo de Artículos (Prendas)</span>
                      </span>
                      <span className="text-[11px] font-black bg-red-200 text-red-900 px-2 py-0.5 rounded-full">
                        {stats.articulos} prendas
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700 font-medium mt-0.5">
                      ⚠️ ¡ATENCIÓN! Borrará todos los disfraces y prendas del sistema (`ARTICULO`).
                    </p>
                  </div>
                </label>

                {/* 8. Catálogo de Clientes (CRÍTICO) */}
                <label className={`flex items-start gap-3 rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                  opcionesPurga.clientes ? "border-red-600 bg-red-50 shadow-xs" : "border-slate-200 bg-white hover:border-slate-300"
                }`}>
                  <input
                    type="checkbox"
                    checked={opcionesPurga.clientes}
                    onChange={(e) => setOpcionesPurga({ ...opcionesPurga, clientes: e.target.checked })}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-xs text-red-900 uppercase flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                        <span>Directorio de Clientes</span>
                      </span>
                      <span className="text-[11px] font-black bg-red-200 text-red-900 px-2 py-0.5 rounded-full">
                        {stats.clientes} clientes
                      </span>
                    </div>
                    <p className="text-[11px] text-red-700 font-medium mt-0.5">
                      ⚠️ ¡ATENCIÓN! Borrará la base de datos completa de clientes (`CLIENTES`).
                    </p>
                  </div>
                </label>
              </div>

              {/* Panel de Confirmación de Seguridad */}
              <div className="rounded-2xl border border-slate-300 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5 text-rose-600" />
                  <h4 className="text-xs font-black uppercase text-slate-800">
                    Medida de Seguridad Obligatoria:
                  </h4>
                </div>
                <p className="text-xs text-slate-600">
                  Para evitar reseteos accidentales, escribe la palabra <strong className="text-rose-700 font-black">ELIMINAR</strong> en el siguiente campo:
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={palabraConfirmacion}
                    onChange={(e) => setPalabraConfirmacion(e.target.value.toUpperCase())}
                    placeholder="Escribe ELIMINAR para desbloquear"
                    className="w-full sm:w-80 rounded-xl border-2 border-slate-300 px-4 py-2.5 text-xs font-black text-slate-900 tracking-wider uppercase focus:border-rose-600 focus:outline-none"
                  />

                  <button
                    type="button"
                    onClick={handleEjecutarPurga}
                    disabled={procesandoPurga || palabraConfirmacion.trim() !== "ELIMINAR"}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase px-6 py-3 shadow-md shadow-rose-600/20 disabled:opacity-40 transition-all"
                  >
                    {procesandoPurga ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    <span>Purgar Datos Seleccionados</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------
              PESTAÑA 3: MIGRACIÓN MASIVA POR EXCEL / CSV
          -------------------------------------------------------- */}
          {tabActiva === "excel" && (
            <div className="max-w-4xl mx-auto space-y-5 animate-in fade-in duration-200">
              {/* Opciones y Descarga de Plantilla */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Selector de Tabla Destino */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                  <label className="text-xs font-black uppercase text-slate-700">1. Tabla Destino:</label>
                  <select
                    value={tablaDestinoExcel}
                    onChange={(e) => {
                      setTablaDestinoExcel(e.target.value as any);
                      setPreviewFilas([]);
                      setArchivoExcelSeleccionado(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="ARTICULO">Catálogo de Artículos / Trajes</option>
                    <option value="CLIENTES">Directorio de Clientes</option>
                  </select>
                </div>

                {/* 2. Modo de Importación */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                  <label className="text-xs font-black uppercase text-slate-700">2. Modo de Migración:</label>
                  <select
                    value={modoImportacion}
                    onChange={(e) => setModoImportacion(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="upsert">Actualizar existentes o Crear nuevos (Upsert)</option>
                    <option value="insert">Solo Insertar nuevos</option>
                  </select>
                </div>

                {/* 3. Descargar Plantilla Oficial */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs flex flex-col justify-between space-y-2">
                  <div className="text-xs font-black uppercase text-emerald-950">Plantilla Oficial Excel:</div>
                  <button
                    type="button"
                    onClick={() => descargarPlantillaExcel(tablaDestinoExcel)}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-2 text-xs font-black uppercase shadow-xs transition-all"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Descargar Plantilla .xlsx</span>
                  </button>
                </div>
              </div>

              {/* Área de Carga de Archivo Drag & Drop */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 bg-white hover:bg-emerald-50/20 p-8 text-center transition-all flex flex-col items-center justify-center gap-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleSeleccionarArchivoExcel}
                  className="hidden"
                />
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Upload className="h-6 w-6" />
                </div>
                <div>
                  <div className="text-sm font-black text-slate-800">
                    {archivoExcelSeleccionado ? archivoExcelSeleccionado.name : "Haz clic aquí para seleccionar tu archivo Excel (.xlsx, .xls, .csv)"}
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {totalFilasExcel > 0
                      ? `${totalFilasExcel} registros listos para previsualizar e importar`
                      : "Soporta formatos estándar de WinDev, Excel y hojas de cálculo"}
                  </p>
                </div>
              </div>

              {/* Vista Previa de la Tabla Importada */}
              {previewFilas.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-xs font-black uppercase text-slate-800">
                        Vista Previa ({totalFilasExcel} registros encontrados · Mostrando primeros 8)
                      </h4>
                    </div>

                    <button
                      type="button"
                      onClick={handleImportarExcel}
                      disabled={procesandoExcel}
                      className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-5 py-2 shadow-sm disabled:opacity-50 transition-all"
                    >
                      {procesandoExcel ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                      <span>Iniciar Importación a {tablaDestinoExcel}</span>
                    </button>
                  </div>

                  {/* Tabla Preview */}
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 font-bold text-slate-700 uppercase text-[10px]">
                        <tr>
                          {previewColumnas.slice(0, 7).map((col, idx) => (
                            <th key={idx} className="p-2.5 border-b border-slate-200">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {previewFilas.slice(0, 8).map((fila, fIdx) => (
                          <tr key={fIdx} className="hover:bg-slate-50">
                            {previewColumnas.slice(0, 7).map((col, cIdx) => (
                              <td key={cIdx} className="p-2.5 text-slate-600 truncate max-w-[180px]">
                                {String(fila[col] ?? "")}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Resultado de la Importación */}
              {resultadoExcel && (
                <div className={`rounded-2xl border p-4 shadow-xs ${
                  resultadoExcel.errores === 0 ? "border-emerald-200 bg-emerald-50/70" : "border-amber-200 bg-amber-50/70"
                }`}>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-xs font-black uppercase text-slate-800">
                      Resumen del Proceso de Importación:
                    </h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-xs">
                    <div>Total Filas: <strong>{resultadoExcel.totalFilas}</strong></div>
                    <div className="text-emerald-700">Insertados: <strong>{resultadoExcel.insertados}</strong></div>
                    <div className="text-blue-700">Actualizados: <strong>{resultadoExcel.actualizados}</strong></div>
                    <div className="text-rose-700">Errores / Omitidos: <strong>{resultadoExcel.errores}</strong></div>
                  </div>
                  {resultadoExcel.detallesErrores.length > 0 && (
                    <div className="mt-2 text-[11px] text-rose-700 font-mono bg-white/80 p-2 rounded-lg border border-rose-200 max-h-24 overflow-y-auto">
                      {resultadoExcel.detallesErrores.slice(0, 10).map((err, idx) => (
                        <div key={idx}>• {err}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* --------------------------------------------------------
              PESTAÑA 4: MIGRACIÓN POR SCRIPT SQL
          -------------------------------------------------------- */}
          {tabActiva === "sql" && (
            <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Terminal className="h-4 w-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase text-slate-800">
                    Editor de Scripts SQL de Migración
                  </h4>
                </div>

                {/* Botones de Snippets y Carga de Archivo */}
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    ref={sqlFileInputRef}
                    type="file"
                    accept=".sql, .txt"
                    onChange={handleCargarArchivoSql}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => sqlFileInputRef.current?.click()}
                    className="flex items-center gap-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 font-bold border border-slate-300 transition-all"
                  >
                    <Upload className="h-3 w-3" />
                    <span>Subir archivo .SQL</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => insertarSnippetSql("articulos")}
                    className="rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 font-bold border border-blue-200 transition-all"
                  >
                    Plantilla Artículos
                  </button>
                  <button
                    type="button"
                    onClick={() => insertarSnippetSql("clientes")}
                    className="rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 font-bold border border-blue-200 transition-all"
                  >
                    Plantilla Clientes
                  </button>
                </div>
              </div>

              {/* Editor de Texto SQL */}
              <div className="relative">
                <textarea
                  value={scriptSql}
                  onChange={(e) => setScriptSql(e.target.value)}
                  placeholder="-- Pega o escribe aquí tus sentencias SQL (INSERT INTO, UPDATE, etc.) separadas por punto y coma (;)&#10;INSERT INTO ARTICULO (CODBARRAS, DESCRIPCION, TALLA, STOCK, VALOR, VALORDEPOSITO) VALUES ('DISF-01', 'VESTIDO TUTU ALICIA', '8', 3, 75000, 35000);"
                  className="w-full h-64 rounded-2xl border-2 border-slate-300 bg-slate-900 text-emerald-400 p-4 font-mono text-xs focus:border-blue-500 focus:outline-none shadow-inner resize-y leading-relaxed"
                  spellCheck={false}
                />
              </div>

              {/* Botón Ejecutar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setScriptSql("")}
                  className="rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-200 transition-all"
                >
                  Limpiar Editor
                </button>

                <button
                  type="button"
                  onClick={handleEjecutarSql}
                  disabled={procesandoSql || !scriptSql.trim()}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-6 py-2.5 shadow-md shadow-blue-600/20 disabled:opacity-40 transition-all"
                >
                  {procesandoSql ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4" />
                  )}
                  <span>Ejecutar Script SQL</span>
                </button>
              </div>

              {/* Consola de Resultados Terminal */}
              {resultadoSql && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono shadow-md space-y-2">
                  <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-1.5 text-[11px]">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Consola de Ejecución SQL:</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">{resultadoSql.exitosas} OK</span> ·{" "}
                      <span className="text-rose-400 font-bold">{resultadoSql.fallidas} Fallidas</span>
                    </div>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1 text-[11px] custom-scrollbar">
                    {resultadoSql.mensajes.map((m, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-slate-500">[{m.timestamp}]</span>
                        <span className={m.exito ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                          {m.exito ? "✔" : "✖"}
                        </span>
                        <span className="text-slate-300">{m.sentencia}</span>
                        <span className={m.exito ? "text-emerald-300/80" : "text-rose-300"}>— {m.mensaje}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* =========================================================
            5. FOOTER DEL MODAL
        ========================================================= */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100 px-6 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Info className="h-4 w-4 text-slate-400" />
            <span>Módulo de Mantenimiento · Elegance POS v2.0</span>
          </div>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 transition-all shadow-xs"
          >
            Cerrar Ventana
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
