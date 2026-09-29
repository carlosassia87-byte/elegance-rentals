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
  Folder,
  FolderCheck,
  HardDrive,
  Cloud,
  ShieldCheck,
  KeyRound,
  History,
  Lock,
  Check,
  ExternalLink,
  Settings,
  Plug,
  Eye,
  EyeOff,
  Copy,
  CheckCheck,
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
import {
  TABLAS_IMPORTABLES,
  descargarPlantillaTabla,
  importarLoteTabla,
} from "@/services/importacionTablasService";
import {
  generarCopiaSeguridadCompleta,
  guardarBackupLocalConFileSystem,
  descargarBackupArchivo,
  subirBackupAGoogleDriveOStorage,
  validarEstructuraBackup,
  restaurarCopiaSeguridad,
  obtenerHistorialBackups,
  obtenerDirectorioHandle,
  type BackupData,
  type HistorialBackupItem,
} from "@/services/backupService";

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
  // Pestaña Activa: "stock_cero" | "reseteo" | "excel" | "sql" | "backup" | "conexion_bd"
  const [tabActiva, setTabActiva] = useState<"stock_cero" | "reseteo" | "excel" | "sql" | "backup" | "conexion_bd">("stock_cero");

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
  const [tablaDestinoExcel, setTablaDestinoExcel] = useState<string>("ARTICULO");
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

  // Estados de Operación: Copias de Seguridad (Backup & File System API)
  const [carpetaLocalNombre, setCarpetaLocalNombre] = useState<string | null>(null);
  const [procesandoBackup, setProcesandoBackup] = useState(false);
  const [backupProgresoTexto, setBackupProgresoTexto] = useState("");
  const [historialBackups, setHistorialBackups] = useState<HistorialBackupItem[]>([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);
  const [archivoRestaurar, setArchivoRestaurar] = useState<File | null>(null);
  const [backupParaRestaurar, setBackupParaRestaurar] = useState<BackupData | null>(null);
  const [metadataRestaurar, setMetadataRestaurar] = useState<any | null>(null);
  const [pinAdminBackup, setPinAdminBackup] = useState("");
  const [procesandoRestauracion, setProcesandoRestauracion] = useState(false);
  const [restauracionProgresoTexto, setRestauracionProgresoTexto] = useState("");
  const backupFileInputRef = useRef<HTMLInputElement>(null);

  // Estados de Operación: Conexión BD
  const [bdUrl, setBdUrl] = useState("");
  const [bdKey, setBdKey] = useState("");
  const [bdProjectId, setBdProjectId] = useState("");
  const [mostrarKey, setMostrarKey] = useState(false);
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeConexion, setMensajeConexion] = useState("");
  const [guardandoConexion, setGuardandoConexion] = useState(false);
  const [copiado, setCopiado] = useState<string | null>(null);

  // Cargar datos de conexión BD al abrir
  useEffect(() => {
    if (open) {
      const url = import.meta.env['VITE_SUPABASE_URL'] || localStorage.getItem('custom_supabase_url') || '';
      const key = import.meta.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || localStorage.getItem('custom_supabase_key') || '';
      const pid = import.meta.env['VITE_SUPABASE_PROJECT_ID'] || localStorage.getItem('custom_supabase_project_id') || '';
      setBdUrl(url);
      setBdKey(key);
      setBdProjectId(pid);
      setEstadoConexion('idle');
      setMensajeConexion('');
    }
  }, [open]);

  async function handleProbarConexion() {
    setProbandoConexion(true);
    setEstadoConexion('idle');
    setMensajeConexion('Probando conexión...');
    try {
      const res = await fetch(`${bdUrl.replace(/\/$/, '')}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': bdKey,
        },
      });
      if (res.ok || res.status === 200 || res.status === 204) {
        setEstadoConexion('ok');
        setMensajeConexion('¡Conexión exitosa! La base de datos está accesible y responde correctamente.');
        toast.success('Conexión a Supabase verificada correctamente');
      } else {
        setEstadoConexion('error');
        setMensajeConexion(`Error HTTP ${res.status}: ${res.statusText}. Verifica la URL y la API Key.`);
        toast.error(`Error de conexión: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setEstadoConexion('error');
      setMensajeConexion(`No se pudo conectar: ${err?.message || 'Error de red'}. Verifica que la URL sea correcta y que tengas conexión a internet.`);
      toast.error('No se pudo conectar a la base de datos');
    } finally {
      setProbandoConexion(false);
    }
  }

  function handleGuardarConexion() {
    setGuardandoConexion(true);
    try {
      localStorage.setItem('custom_supabase_url', bdUrl);
      localStorage.setItem('custom_supabase_key', bdKey);
      localStorage.setItem('custom_supabase_project_id', bdProjectId);
      toast.success('Credenciales guardadas en el almacenamiento local. Recarga la página para aplicar los cambios.');
    } catch (err: any) {
      toast.error('Error al guardar las credenciales');
    } finally {
      setGuardandoConexion(false);
    }
  }

  async function handleCopiarAlPortapapeles(texto: string, campo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      toast.success(`${campo} copiado al portapapeles`);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      toast.error('No se pudo copiar al portapapeles');
    }
  }

  // Cargar estadísticas y configuración al abrir
  useEffect(() => {
    if (open) {
      cargarEstadisticas();
      verificarCarpetaLocal();
      cargarHistorial();
    }
  }, [open]);

  useEffect(() => {
    if (tabActiva === "backup") {
      verificarCarpetaLocal();
      cargarHistorial();
    }
  }, [tabActiva]);

  async function verificarCarpetaLocal() {
    try {
      const handle = await obtenerDirectorioHandle();
      if (handle) {
        setCarpetaLocalNombre(handle.name);
      }
    } catch {}
  }

  async function cargarHistorial() {
    setCargandoHistorial(true);
    try {
      const data = await obtenerHistorialBackups();
      setHistorialBackups(data);
    } catch (err) {
      console.warn("Aviso cargando historial de backups:", err);
    } finally {
      setCargandoHistorial(false);
    }
  }

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
      const resultado = await importarLoteTabla(tablaDestinoExcel, previewFilas, modoImportacion);
      setResultadoExcel(resultado);
      if (resultado.insertados > 0 || resultado.actualizados > 0) {
        toast.success(`¡Importación exitosa! ${resultado.insertados + resultado.actualizados} registros procesados.`);
        await cargarEstadisticas();
        onDatosActualizados?.();
      } else {
        toast.error("No se pudieron importar los registros. Revisa los detalles de error.");
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

  // =========================================================
  // OPERACIONES DE COPIAS DE SEGURIDAD (BACKUP & RESTORE)
  // =========================================================
  async function handleGuardarBackupLocal(forzarSeleccion = false) {
    setProcesandoBackup(true);
    setBackupProgresoTexto("Iniciando extracción completa de la base de datos...");
    try {
      const backup = await generarCopiaSeguridadCompleta(cajeroNombre, (tabla, p, t) => {
        setBackupProgresoTexto(`Extrayendo ${tabla}: ${p} / ${t || "..."} filas`);
      });

      setBackupProgresoTexto("Escribiendo archivo de seguridad en la carpeta...");
      const res = await guardarBackupLocalConFileSystem(backup, forzarSeleccion);
      if (res.ok) {
        if (res.carpeta) setCarpetaLocalNombre(res.carpeta);
        toast.success(`Copia guardada con éxito en ${res.carpeta || "carpeta local"}: ${res.nombreArchivo}`);
        await cargarHistorial();
      } else {
        toast.error(`Error guardando backup: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error durante el backup: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoBackup(false);
      setBackupProgresoTexto("");
    }
  }

  async function handleDescargarBackupDirecto() {
    setProcesandoBackup(true);
    setBackupProgresoTexto("Generando copia de seguridad para descarga...");
    try {
      const backup = await generarCopiaSeguridadCompleta(cajeroNombre, (tabla, p, t) => {
        setBackupProgresoTexto(`Extrayendo ${tabla}: ${p} / ${t || "..."} filas`);
      });
      const nombre = descargarBackupArchivo(backup);
      toast.success(`Archivo descargado: ${nombre}`);
      await cargarHistorial();
    } catch (err: any) {
      toast.error(`Error al descargar: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoBackup(false);
      setBackupProgresoTexto("");
    }
  }

  async function handleSubirCloudVault() {
    setProcesandoBackup(true);
    setBackupProgresoTexto("Generando copia para la Bóveda Privada / Google Drive...");
    try {
      const backup = await generarCopiaSeguridadCompleta(cajeroNombre, (tabla, p, t) => {
        setBackupProgresoTexto(`Extrayendo ${tabla}: ${p} / ${t || "..."} filas`);
      });
      setBackupProgresoTexto("Sincronizando con la nube...");
      const res = await subirBackupAGoogleDriveOStorage(backup, "cloud_vault");
      if (res.ok) {
        toast.success(res.mensaje || "Copia sincronizada exitosamente en la nube");
        await cargarHistorial();
      } else {
        toast.error(`Error en nube: ${res.error}`);
      }
    } catch (err: any) {
      toast.error(`Error en nube: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoBackup(false);
      setBackupProgresoTexto("");
    }
  }

  function handleSeleccionarArchivoBackup(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoRestaurar(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);
        const validacion = validarEstructuraBackup(parsed);
        if (!validacion.valido) {
          toast.error(validacion.error || "El archivo de copia de seguridad no es válido");
          setBackupParaRestaurar(null);
          setMetadataRestaurar(null);
          return;
        }
        setBackupParaRestaurar(parsed);
        setMetadataRestaurar(validacion.metadata);
        toast.success(`Backup validado: ${validacion.metadata?.totalRegistros} registros en ${validacion.metadata?.totalTablas} tablas.`);
      } catch {
        toast.error("El archivo seleccionado no es un JSON válido");
        setBackupParaRestaurar(null);
        setMetadataRestaurar(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleEjecutarRestauracion() {
    if (!backupParaRestaurar) {
      toast.error("Selecciona primero un archivo de backup válido");
      return;
    }
    if (!pinAdminBackup.trim()) {
      toast.error("Debes ingresar el PIN de Administrador para autorizar la restauración");
      return;
    }

    setProcesandoRestauracion(true);
    setRestauracionProgresoTexto("Iniciando restauración autorizada...");
    try {
      const res = await restaurarCopiaSeguridad(
        backupParaRestaurar,
        pinAdminBackup,
        (tabla, p, t) => {
          setRestauracionProgresoTexto(`Restaurando ${tabla}: ${p} / ${t}`);
        }
      );

      if (res.ok) {
        toast.success(res.mensaje);
        setPinAdminBackup("");
        setBackupParaRestaurar(null);
        setArchivoRestaurar(null);
        setMetadataRestaurar(null);
        if (backupFileInputRef.current) backupFileInputRef.current.value = "";
        await cargarEstadisticas();
        await cargarHistorial();
        onDatosActualizados?.();
      } else {
        toast.error(res.mensaje);
      }
    } catch (err: any) {
      toast.error(`Error crítico en restauración: ${err?.message || "Desconocido"}`);
    } finally {
      setProcesandoRestauracion(false);
      setRestauracionProgresoTexto("");
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

          <button
            onClick={() => setTabActiva("backup")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "backup"
                ? "border-violet-600 text-violet-700 bg-violet-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <HardDrive className="h-4 w-4 text-violet-600" />
            <span>5. Copias de Seguridad (Backup)</span>
          </button>

          <button
            onClick={() => setTabActiva("conexion_bd")}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all ${
              tabActiva === "conexion_bd"
                ? "border-cyan-600 text-cyan-700 bg-cyan-50/50 rounded-t-lg"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-t-lg"
            }`}
          >
            <Plug className="h-4 w-4 text-cyan-600" />
            <span>6. Conexión BD</span>
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
                      setTablaDestinoExcel(e.target.value);
                      setPreviewFilas([]);
                      setArchivoExcelSeleccionado(null);
                      setResultadoExcel(null);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {TABLAS_IMPORTABLES.map((tab) => (
                      <option key={tab.clave} value={tab.clave}>
                        {tab.etiqueta} ({tab.tabla})
                      </option>
                    ))}
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
                    onClick={() => descargarPlantillaTabla(tablaDestinoExcel)}
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

          {/* --------------------------------------------------------
              PESTAÑA 5: COPIAS DE SEGURIDAD (BACKUP INTEGRAL & CLOUD)
          -------------------------------------------------------- */}
          {tabActiva === "backup" && (
            <div className="space-y-6">
              {/* Tarjeta de Encabezado y Resumen */}
              <div className="rounded-2xl border border-violet-200 bg-linear-to-r from-violet-50/80 via-white to-indigo-50/80 p-5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600 text-white shadow-md shadow-violet-600/30">
                      <HardDrive className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-900 tracking-tight">
                        Sistema Integral de Copias de Seguridad
                      </h3>
                      <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
                        Exporta y resguarda de forma segura los 11 módulos del negocio (artículos, clientes, facturas, abonos, gastos, cajas y configuración) en tu disco local (C:\ o USB) y en la nube.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleGuardarBackupLocal(true)}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs"
                    >
                      <Folder className="h-3.5 w-3.5 text-amber-600" />
                      <span>{carpetaLocalNombre ? "Cambiar Carpeta" : "Configurar Carpeta"}</span>
                    </button>
                  </div>
                </div>

                {/* Sub-tarjetas de estado de almacenamiento */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-violet-100 text-xs">
                  <div className="flex items-center gap-2.5 rounded-xl bg-white/80 p-2.5 border border-violet-100/80">
                    <FolderCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-700 block">Carpeta Física en tu PC:</span>
                      <span className="font-mono text-[11px] text-slate-500 truncate block">
                        {carpetaLocalNombre ? `Carpeta vinculada: ${carpetaLocalNombre}` : "No configurada aún (se abrirá el selector al respaldar)"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 rounded-xl bg-white/80 p-2.5 border border-violet-100/80">
                    <Cloud className="h-4 w-4 text-indigo-600 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-700 block">Bóveda Cloud & Google Drive:</span>
                      <span className="text-[11px] text-slate-500 truncate block">
                        Sincronización en la nube y endpoint nocturno automático (/api/public/cron-backup)
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botonera de Acciones de Generación de Backup */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleGuardarBackupLocal(false)}
                  disabled={procesandoBackup}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-linear-to-b from-violet-600 to-indigo-700 hover:from-violet-700 hover:to-indigo-800 text-white p-4 shadow-lg shadow-violet-600/25 transition-all text-center disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                    {procesandoBackup ? <Loader2 className="h-5 w-5 animate-spin" /> : <HardDrive className="h-5 w-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">1. Guardar en Carpeta Local</span>
                    <span className="text-[11px] text-violet-200 font-medium block mt-0.5">Guardado directo con 1 Clic (File System API)</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleDescargarBackupDirecto}
                  disabled={procesandoBackup}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 p-4 shadow-sm transition-all text-center disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Download className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">2. Descarga Directa JSON</span>
                    <span className="text-[11px] text-slate-500 font-medium block mt-0.5">Descarga clásica para cualquier navegador</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={handleSubirCloudVault}
                  disabled={procesandoBackup}
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white border border-indigo-200 hover:bg-indigo-50/50 text-indigo-950 p-4 shadow-sm transition-all text-center disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600">
                    <Cloud className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-black uppercase tracking-wider block">3. Bóveda Cloud & Drive</span>
                    <span className="text-[11px] text-indigo-600/80 font-medium block mt-0.5">Resguardo seguro en la nube</span>
                  </div>
                </button>
              </div>

              {/* Barra de progreso de extracción */}
              {procesandoBackup && (
                <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-xs">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 text-violet-600 animate-spin shrink-0" />
                    <div className="flex-1">
                      <span className="text-xs font-bold text-violet-900 block">Generando Copia de Seguridad</span>
                      <span className="text-xs text-violet-700 font-medium">{backupProgresoTexto || "Extrayendo registros..."}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* SECCIÓN: RESTAURACIÓN DE COPIAS DE SEGURIDAD (PROTEGIDA CON PIN) */}
              <div className="rounded-2xl border border-amber-300 bg-amber-50/40 p-5 shadow-xs space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/20 shrink-0">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase text-amber-950 tracking-wider">
                        Restauración de Base de Datos
                      </h4>
                      <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black text-amber-900 uppercase">
                        Protegido por PIN
                      </span>
                    </div>
                    <p className="text-xs text-amber-900/80 mt-0.5">
                      Restaura la información a partir de un archivo JSON generado previamente. Requiere autorización explícita mediante PIN de Administrador.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {/* Selector de Archivo de Backup */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      Seleccionar Archivo de Respaldo (.json):
                    </label>
                    <input
                      ref={backupFileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleSeleccionarArchivoBackup}
                      disabled={procesandoRestauracion}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:bg-amber-600 file:text-white hover:file:bg-amber-700 file:cursor-pointer cursor-pointer border border-amber-200 rounded-xl bg-white p-1"
                    />
                  </div>

                  {/* Input de PIN de Administrador */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 block">
                      PIN de Administrador (Autorización):
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="Ingresa PIN (ej. 1234)"
                        value={pinAdminBackup}
                        onChange={(e) => setPinAdminBackup(e.target.value)}
                        disabled={procesandoRestauracion}
                        className="h-9 w-full rounded-xl border border-amber-300 bg-white pl-9 pr-3 text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 shadow-2xs"
                      />
                      <KeyRound className="h-4 w-4 text-amber-600 absolute left-3 top-2.5" />
                    </div>
                  </div>
                </div>

                {/* Previsualización del archivo cargado */}
                {metadataRestaurar && (
                  <div className="rounded-xl border border-amber-200 bg-white p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-100 pb-1.5">
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Archivo Válido: {archivoRestaurar?.name}</span>
                      </div>
                      <span className="text-slate-500 text-[11px]">{metadataRestaurar.fechaLegible}</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      <div>
                        <span className="text-slate-500 block">Total Tablas:</span>
                        <span className="font-bold text-slate-900">{metadataRestaurar.totalTablas}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Total Registros:</span>
                        <span className="font-bold text-slate-900">{metadataRestaurar.totalRegistros}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Sistema:</span>
                        <span className="font-bold text-slate-900">{metadataRestaurar.sistema}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Checksum:</span>
                        <span className="font-mono text-[10px] text-slate-600 truncate block">
                          {metadataRestaurar.checksum?.slice(0, 12)}...
                        </span>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleEjecutarRestauracion}
                        disabled={procesandoRestauracion || !pinAdminBackup.trim()}
                        className="flex items-center justify-center gap-2 w-full rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase py-2.5 shadow-md shadow-amber-600/20 disabled:opacity-40 transition-all"
                      >
                        {procesandoRestauracion ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span>{restauracionProgresoTexto || "Restaurando base de datos..."}</span>
                          </>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            <span>Ejecutar Restauración en la Base de Datos</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECCIÓN: TABLA DE HISTORIAL Y AUDITORÍA DE BACKUPS */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-violet-600" />
                    <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                      Auditoría e Historial de Copias de Seguridad
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={cargarHistorial}
                    disabled={cargandoHistorial}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-700 hover:text-violet-900"
                  >
                    <RefreshCw className={`h-3 w-3 ${cargandoHistorial ? "animate-spin" : ""}`} />
                    <span>Actualizar Historial</span>
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto custom-scrollbar border border-slate-100 rounded-xl">
                  {historialBackups.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No se han registrado copias de seguridad aún. Genera una copia manual o programa el cron nocturno.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                        <tr>
                          <th className="px-3.5 py-2">Fecha / Hora</th>
                          <th className="px-3.5 py-2">Tipo</th>
                          <th className="px-3.5 py-2">Archivo</th>
                          <th className="px-3.5 py-2">Tamaño</th>
                          <th className="px-3.5 py-2">Registros</th>
                          <th className="px-3.5 py-2">Estado</th>
                          <th className="px-3.5 py-2">Usuario</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                        {historialBackups.map((h, idx) => {
                          const fDate = new Date(h.fecha).toLocaleString("es-CO", {
                            dateStyle: "short",
                            timeStyle: "short",
                          });
                          const sizeKb = h.tamano_bytes > 0 ? `${(h.tamano_bytes / 1024).toFixed(1)} KB` : "N/A";
                          return (
                            <tr key={h.id || idx} className="hover:bg-slate-50/80 transition-colors">
                              <td className="px-3.5 py-2 whitespace-nowrap text-[11px] text-slate-600">{fDate}</td>
                              <td className="px-3.5 py-2">
                                <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold ${
                                  h.tipo === "MANUAL_LOCAL"
                                    ? "bg-violet-100 text-violet-800"
                                    : h.tipo === "CRON_AUTO"
                                    ? "bg-indigo-100 text-indigo-800"
                                    : h.tipo === "GOOGLE_DRIVE" || h.tipo === "CLOUD_VAULT"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-700"
                                }`}>
                                  {h.tipo}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 font-mono text-[11px] text-slate-800 truncate max-w-44" title={h.nombre_archivo}>
                                {h.nombre_archivo}
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-500">{sizeKb}</td>
                              <td className="px-3.5 py-2 font-bold text-slate-900">{h.total_registros}</td>
                              <td className="px-3.5 py-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-bold ${
                                  h.estado === "EXITOSO" ? "text-emerald-600" : "text-rose-600"
                                }`}>
                                  {h.estado === "EXITOSO" ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                                  {h.estado}
                                </span>
                              </td>
                              <td className="px-3.5 py-2 text-[11px] text-slate-500">{h.usuario_ejecutor}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------------------------
              PESTAÑA 6: CONEXIÓN A BASE DE DATOS
          -------------------------------------------------------- */}
          {tabActiva === "conexion_bd" && (
            <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
              {/* Header Informativo */}
              <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shrink-0 shadow-md">
                    <Plug className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-cyan-950 uppercase tracking-tight">
                      Configuración de Conexión a Base de Datos (Supabase)
                    </h3>
                    <p className="text-xs text-cyan-900 leading-relaxed">
                      Visualiza y gestiona las credenciales de conexión a tu base de datos Supabase. Puedes probar la conexión
                      para verificar que todo está funcionando correctamente.
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado de Conexión Actual */}
              <div className={`rounded-2xl border-2 p-4 flex items-center gap-3 transition-all ${
                estadoConexion === 'ok'
                  ? 'border-emerald-300 bg-emerald-50/60'
                  : estadoConexion === 'error'
                  ? 'border-rose-300 bg-rose-50/60'
                  : 'border-slate-200 bg-white'
              }`}>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                  estadoConexion === 'ok'
                    ? 'bg-emerald-500 text-white'
                    : estadoConexion === 'error'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-500'
                }`}>
                  {estadoConexion === 'ok' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : estadoConexion === 'error' ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <Activity className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black uppercase text-slate-700">
                    {estadoConexion === 'ok' ? 'Conexión Activa' : estadoConexion === 'error' ? 'Error de Conexión' : 'Estado: Sin Verificar'}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {mensajeConexion || 'Presiona "Probar Conexión" para verificar la comunicación con la base de datos.'}
                  </p>
                </div>
              </div>

              {/* Formulario de Credenciales */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                <div className="bg-slate-800 px-5 py-3 flex items-center gap-2">
                  <Settings className="h-4 w-4 text-cyan-400" />
                  <span className="text-xs font-black uppercase text-white tracking-wider">Credenciales de Supabase</span>
                </div>

                <div className="p-5 space-y-4">
                  {/* URL de Supabase */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                      <Cloud className="h-3.5 w-3.5 text-cyan-600" />
                      URL del Proyecto (SUPABASE_URL)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bdUrl}
                        onChange={(e) => { setBdUrl(e.target.value); setEstadoConexion('idle'); }}
                        placeholder="https://xxxxxxxxxxxx.supabase.co"
                        className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopiarAlPortapapeles(bdUrl, 'URL')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shrink-0"
                        title="Copiar URL"
                      >
                        {copiado === 'URL' ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* API Key */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                      <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                      Clave Pública / Publishable Key (anon key)
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <input
                          type={mostrarKey ? 'text' : 'password'}
                          value={bdKey}
                          onChange={(e) => { setBdKey(e.target.value); setEstadoConexion('idle'); }}
                          placeholder="sb_publishable_xxxxxxxxxxxxxxxx"
                          className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 pr-10 text-xs font-mono text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setMostrarKey(!mostrarKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                          title={mostrarKey ? 'Ocultar clave' : 'Mostrar clave'}
                        >
                          {mostrarKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopiarAlPortapapeles(bdKey, 'API Key')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shrink-0"
                        title="Copiar API Key"
                      >
                        {copiado === 'API Key' ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-amber-600 flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3 shrink-0" />
                      Esta es la clave pública (anon). Nunca compartas la Service Role Key.
                    </p>
                  </div>

                  {/* Project ID */}
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                      <Database className="h-3.5 w-3.5 text-indigo-600" />
                      ID del Proyecto (Project ID)
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={bdProjectId}
                        onChange={(e) => setBdProjectId(e.target.value)}
                        placeholder="xxxxxxxxxxxxxxxxxxxx"
                        className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => handleCopiarAlPortapapeles(bdProjectId, 'Project ID')}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-all shrink-0"
                        title="Copiar Project ID"
                      >
                        {copiado === 'Project ID' ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleProbarConexion}
                  disabled={probandoConexion || !bdUrl || !bdKey}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-cyan-600 hover:bg-cyan-700 text-white font-black text-xs uppercase px-6 py-3.5 shadow-lg shadow-cyan-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
                >
                  {probandoConexion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plug className="h-4 w-4" />
                  )}
                  <span>Probar Conexión</span>
                </button>

                <button
                  type="button"
                  onClick={handleGuardarConexion}
                  disabled={guardandoConexion || !bdUrl || !bdKey}
                  className="w-full sm:flex-1 flex items-center justify-center gap-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-xs uppercase px-6 py-3.5 shadow-lg shadow-slate-800/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
                >
                  {guardandoConexion ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  <span>Guardar en Almacenamiento Local</span>
                </button>
              </div>

              {/* Información Adicional */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 space-y-3">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-600" />
                  ¿Dónde encuentro estas credenciales?
                </h4>
                <div className="space-y-2 text-[11px] text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">1</span>
                    <p>Ingresa al <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-bold hover:underline inline-flex items-center gap-0.5">Panel de Supabase <ExternalLink className="h-3 w-3" /></a> con tu cuenta.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">2</span>
                    <p>Selecciona tu proyecto y ve a <strong>Settings → API</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">3</span>
                    <p>Copia la <strong>URL</strong> del proyecto y la <strong>anon (publishable) key</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">4</span>
                    <p>El <strong>Project ID</strong> se encuentra en <strong>Settings → General</strong>.</p>
                  </div>
                </div>
              </div>

              {/* Nota de Seguridad */}
              <div className="rounded-xl bg-amber-50/80 border border-amber-200 p-3 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <strong>Nota de Seguridad:</strong> Las credenciales guardadas se almacenan en el almacenamiento local del navegador.
                  Para cambios permanentes, edita el archivo <code className="bg-amber-100 px-1 rounded text-[10px] font-mono">.env</code> en la raíz del proyecto
                  con las variables <code className="bg-amber-100 px-1 rounded text-[10px] font-mono">VITE_SUPABASE_URL</code> y <code className="bg-amber-100 px-1 rounded text-[10px] font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code>.
                </p>
              </div>
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
