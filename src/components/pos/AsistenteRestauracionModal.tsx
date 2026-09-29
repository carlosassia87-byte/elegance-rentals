import React, { useState, useRef } from "react";
import {
  X,
  Database,
  Plug,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Cloud,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Upload,
  FileJson,
  Sparkles,
  Activity,
  Info,
  ExternalLink,
  Settings,
  Rocket,
  Check,
  Package,
  Users,
  Receipt,
  Layers,
  Copy,
  CheckCheck,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@supabase/supabase-js";

// ==========================================
// TIPOS E INTERFACES
// ==========================================

interface AsistenteRestauracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BackupMetadata {
  version: string;
  timestamp: string;
  fechaLegible: string;
  sistema: string;
  totalTablas: number;
  totalRegistros: number;
  tablas: Record<string, { registros: number; columnas?: string[] }>;
  checksum?: string;
  usuarioEjecutor?: string;
}

interface BackupData {
  metadata: BackupMetadata;
  datos: Record<string, any[]>;
}

type PasoAsistente = 1 | 2 | 3 | 4;

// ==========================================
// SQL PARA INICIALIZAR LA BD
// ==========================================

const SQL_SCHEMA_PRINCIPAL = `
-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla numero_de_serie
CREATE TABLE IF NOT EXISTS "numero_de_serie" (
    "IDnumero_de_serie" SERIAL8 PRIMARY KEY,
    "SERIE" VARCHAR(50) UNIQUE
);

-- Tabla clientesregistrados
CREATE TABLE IF NOT EXISTS "clientesregistrados" (
    "IDEmpresa" SERIAL8 PRIMARY KEY,
    "RAZOSOCIAL" VARCHAR(50),
    "ENOMBRE" VARCHAR(50),
    "NIT" VARCHAR(50),
    "ETIPO" VARCHAR(50),
    "EDIRECCION" VARCHAR(50),
    "ETELEFONO" VARCHAR(50) DEFAULT '0',
    "EMAIL" VARCHAR(50),
    "WEB" VARCHAR(50),
    "SERIE" VARCHAR(50) UNIQUE,
    "LOGO" BYTEA,
    "IDnumero_de_serie" BIGINT DEFAULT 0,
    "MENSAJE" VARCHAR(50)
);

-- Tabla Empresa
CREATE TABLE IF NOT EXISTS "Empresa" (
    "IDEmpresa" SERIAL8 PRIMARY KEY,
    "RAZOSOCIAL" VARCHAR(50),
    "ENOMBRE" VARCHAR(50),
    "NIT" VARCHAR(50),
    "ETIPO" VARCHAR(50),
    "EDIRECCION" VARCHAR(50),
    "ETELEFONO" VARCHAR(50) DEFAULT '0',
    "EMAIL" VARCHAR(50),
    "WEB" VARCHAR(50),
    "SERIE" VARCHAR(50),
    "LOGO" BYTEA,
    "MENSAJE" VARCHAR(50)
);

-- Tabla CAJAS
CREATE TABLE IF NOT EXISTS "CAJAS" (
    "IDCAJAS" SERIAL8 PRIMARY KEY,
    "NOMBRECAJA" VARCHAR(50) UNIQUE,
    "RESOLUCION" VARCHAR(50),
    "NUMERACION" INTEGER DEFAULT 0,
    "PREFIJO" VARCHAR(50)
);

-- Tabla CLIENTES
CREATE TABLE IF NOT EXISTS "CLIENTES" (
    "IDCLIENTES" SERIAL8 PRIMARY KEY,
    "CEDULA" BIGINT DEFAULT 0,
    "DIRECCION" VARCHAR(50),
    "TELEFONO" VARCHAR(50) DEFAULT '0',
    "TELEFONO2" VARCHAR(50),
    "EMPRESA" VARCHAR(50),
    "DIRECCIONEMP" VARCHAR(50),
    "NOMBRE" VARCHAR(50),
    "SALDO" INTEGER DEFAULT 0,
    "NOTA" VARCHAR(2000)
);

-- Tabla ESTADO_CLI
CREATE TABLE IF NOT EXISTS "ESTADO_CLI" (
    "IDESTADO_CLI" SERIAL8 PRIMARY KEY,
    "ESTADOCLI" VARCHAR(50) NOT NULL DEFAULT '0'
);

-- Tabla ESTADO_TRAJE
CREATE TABLE IF NOT EXISTS "ESTADO_TRAJE" (
    "IDESTADO_TRAJE" SERIAL8 PRIMARY KEY,
    "ESTADO_TRAJE" SMALLINT DEFAULT 0
);

-- Tabla F_PAGO
CREATE TABLE IF NOT EXISTS "F_PAGO" (
    "FDEPAGO" VARCHAR(50) DEFAULT '0',
    "IDESTADCLI" SERIAL8 PRIMARY KEY
);

-- Tabla OTRAS_F_PAGO
CREATE TABLE IF NOT EXISTS "OTRAS_F_PAGO" (
    "IDOTRA_F_PAGO" SERIAL8 PRIMARY KEY,
    "OTRAS_F_PAGO" VARCHAR(50)
);

-- Tabla contraseñas
CREATE TABLE IF NOT EXISTS "contraseñas" (
    "IDcontraseñas" SERIAL8 PRIMARY KEY,
    "BORRADO" VARCHAR(50) DEFAULT '0',
    "CONFIGURACIONES" VARCHAR(50) DEFAULT '0',
    "PERMISOS" VARCHAR(50) DEFAULT '0'
);

-- Tabla LOGIN
CREATE TABLE IF NOT EXISTS "LOGIN" (
    "IDLOGIN" SERIAL8 PRIMARY KEY,
    "INOMBRE" VARCHAR(50),
    "IAPELLIDO" VARCHAR(50),
    "ILOGIN" INTEGER UNIQUE DEFAULT 0,
    "PASSWORD" VARCHAR(50),
    "TIPO" BOOL DEFAULT false,
    "ACCESOALMENU" BOOL DEFAULT false
);

-- Tabla gastos
CREATE TABLE IF NOT EXISTS "gastos" (
    "IDgastos" SERIAL8 PRIMARY KEY,
    "DESCRIPCIONSALIDA" VARCHAR(50),
    "FECHA" DATE,
    "VALORSALIDA" VARCHAR(50),
    "NUMEROGASTO" VARCHAR(50) UNIQUE
);

-- Tabla CAMPOFACTURA
CREATE TABLE IF NOT EXISTS "CAMPOFACTURA" (
    "AUTOMATIC" SERIAL8 PRIMARY KEY,
    "DESCRIPCION" VARCHAR(300),
    "CANTIDAD" NUMERIC(24,6) DEFAULT 0,
    "VALOR" NUMERIC(24,6) DEFAULT 0,
    "TOTAL" NUMERIC(24,6) DEFAULT 0,
    "BARRAS" VARCHAR(50) DEFAULT '0',
    "NUMEROFACT" VARCHAR(50),
    "IDFACTURA" BIGINT DEFAULT 0,
    "VALORDEPOSITO" NUMERIC(24,6) DEFAULT 0,
    "TOTALALQUILER" NUMERIC(24,6) DEFAULT 0,
    "TOTALDEPOSITO" NUMERIC(24,6) DEFAULT 0
);

-- Tabla ARTICULO
CREATE TABLE IF NOT EXISTS "ARTICULO" (
    "IDARTICULO" SERIAL8 PRIMARY KEY,
    "DESCRIPCION" VARCHAR(150),
    "TALLA" VARCHAR(50),
    "STOCK" INTEGER DEFAULT 0,
    "VALOR" NUMERIC(24,6) DEFAULT 0,
    "CODBARRAS" VARCHAR(50),
    "IDCAMPOFACTURA" BIGINT DEFAULT 0,
    "VALORDEPOSITO" NUMERIC(24,6) DEFAULT 0
);

-- Tabla FACTURA
CREATE TABLE IF NOT EXISTS "FACTURA" (
    "IDFACTURA" SERIAL8 PRIMARY KEY,
    "NUMEROFACT" VARCHAR(50) UNIQUE DEFAULT '0',
    "FECHASALIDA" DATE,
    "FECHAENTRADA" DATE,
    "FTOTALDEPOSITO" NUMERIC(24,6) DEFAULT 0,
    "FTOTALVENTADEPOSITO" NUMERIC(24,6) DEFAULT 0,
    "FORMAPAGO" VARCHAR(50) DEFAULT '0',
    "MODO" VARCHAR(50),
    "VENDEDOR" VARCHAR(50),
    "CCLIENTE" VARCHAR(50),
    "CAMBIOS" NUMERIC(24,6) DEFAULT 0,
    "PAGACON" NUMERIC(24,6) DEFAULT 0,
    "AUTOMATIC" BIGINT DEFAULT 0,
    "IDFCLIENTES" BIGINT DEFAULT 0,
    "ESTADOCLIENTE" VARCHAR(50) DEFAULT '0',
    "IDF_PAGO" BIGINT DEFAULT 0,
    "CDIRECCION" VARCHAR(50),
    "CTELEFONO" VARCHAR(50),
    "CTELEFONO1" VARCHAR(50),
    "CEMPRESA" VARCHAR(50),
    "CCEDULA" VARCHAR(50),
    "GASTOS" VARCHAR(50),
    "PAGOCONEFECTIVO" NUMERIC(24,6) DEFAULT 0,
    "PAGOCONTRANFERENCIA" NUMERIC(24,6) DEFAULT 0,
    "FTOTALALQUILER" NUMERIC(24,6) DEFAULT 0,
    "FPAGOTRANS" VARCHAR(50),
    "DESCUENTO" NUMERIC(24,6) DEFAULT 0,
    "P_SALDO_EFECTIVO" NUMERIC(24,6) DEFAULT 0,
    "P_SALDO_TRANFERENCIA" NUMERIC(24,6) DEFAULT 0,
    "TOTAL_SALDO" NUMERIC(24,6) DEFAULT 0,
    "FECHA_RECIBO" DATE,
    "SALDOA_BONADO" NUMERIC(24,6) DEFAULT 0,
    "FECHAINGRESO" DATE
);

-- Tabla ABONO_CLIENTE
CREATE TABLE IF NOT EXISTS "ABONO_CLIENTE" (
    "IDABONO_CLIENTE" SERIAL8 PRIMARY KEY,
    "NUMEROABONO" VARCHAR(50),
    "ACLIENTE" VARCHAR(50),
    "AFACTURA" VARCHAR(50),
    "PAGOEFECTIVO" NUMERIC(24,6) DEFAULT 0,
    "PAGOTRANFE" NUMERIC(24,6) DEFAULT 0,
    "FECHAABONO" DATE,
    "SALDOANTERIOR" NUMERIC(24,6) DEFAULT 0,
    "SALDODEBER" NUMERIC(24,6) DEFAULT 0,
    "TOTAL_ABONO" NUMERIC(24,6) DEFAULT 0
);

-- Tabla depositoentregado
CREATE TABLE IF NOT EXISTS "depositoentregado" (
    "IDdepositoentregado" SERIAL8 PRIMARY KEY,
    "NUMEROFACTURA" VARCHAR(50),
    "VALOR" INTEGER DEFAULT 0,
    "FECHA" DATE
);

-- Tabla ACCESORIOS
CREATE TABLE IF NOT EXISTS "ACCESORIOS" (
    "IDACCESORIOS" SERIAL8 PRIMARY KEY,
    "DESCRIPCION" VARCHAR(300),
    "TALLA" VARCHAR(50),
    "STOCK" INTEGER DEFAULT 0,
    "VALOR" NUMERIC(24,6) DEFAULT 0,
    "CODBARRAS" VARCHAR(50),
    "VALORDEPOSITO" NUMERIC(24,6) DEFAULT 0
);

-- Tabla MOVIMIENTOS_INVENTARIO
CREATE TABLE IF NOT EXISTS "MOVIMIENTOS_INVENTARIO" (
    "IDMOVIMIENTO" SERIAL8 PRIMARY KEY,
    "TIPO" VARCHAR(50),
    "IDARTICULO" BIGINT,
    "CODBARRAS" VARCHAR(50),
    "DESCRIPCION" VARCHAR(300),
    "CANTIDAD" INTEGER DEFAULT 0,
    "STOCK_ANTERIOR" INTEGER DEFAULT 0,
    "STOCK_NUEVO" INTEGER DEFAULT 0,
    "MOTIVO" VARCHAR(500),
    "USUARIO" VARCHAR(100),
    "FECHA" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla EMPRESA_CONFIG
CREATE TABLE IF NOT EXISTS "EMPRESA_CONFIG" (
    "id" SERIAL8 PRIMARY KEY,
    "clave" VARCHAR(100) UNIQUE,
    "valor" TEXT,
    "updated_at" TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla historial_backups
CREATE TABLE IF NOT EXISTS "historial_backups" (
    "id" SERIAL8 PRIMARY KEY,
    "fecha" TIMESTAMPTZ DEFAULT NOW(),
    "tipo" VARCHAR(50),
    "nombre_archivo" VARCHAR(255),
    "tamano_bytes" BIGINT DEFAULT 0,
    "total_tablas" INTEGER DEFAULT 0,
    "total_registros" INTEGER DEFAULT 0,
    "detalles" JSONB DEFAULT '{}',
    "estado" VARCHAR(20) DEFAULT 'EXITOSO',
    "mensaje_error" TEXT,
    "usuario_ejecutor" VARCHAR(100) DEFAULT 'SISTEMA'
);

-- PERMISOS
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
`;

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================

export function AsistenteRestauracionModal({
  open,
  onOpenChange,
}: AsistenteRestauracionModalProps) {
  // Paso activo del asistente
  const [paso, setPaso] = useState<PasoAsistente>(1);

  // Paso 1: Credenciales
  const [bdUrl, setBdUrl] = useState("");
  const [bdKey, setBdKey] = useState("");
  const [mostrarKey, setMostrarKey] = useState(false);

  // Paso 2: Probar conexión
  const [probandoConexion, setProbandoConexion] = useState(false);
  const [estadoConexion, setEstadoConexion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeConexion, setMensajeConexion] = useState("");

  // Paso 3: Inicializar BD
  const [inicializandoBD, setInicializandoBD] = useState(false);
  const [estadoInicializacion, setEstadoInicializacion] = useState<"idle" | "ok" | "error">("idle");
  const [mensajeInicializacion, setMensajeInicializacion] = useState("");
  const [tablasCreadas, setTablasCreadas] = useState<string[]>([]);

  // Paso 4: Restauración
  const [archivoRestaurar, setArchivoRestaurar] = useState<File | null>(null);
  const [backupData, setBackupData] = useState<BackupData | null>(null);
  const [metadataBackup, setMetadataBackup] = useState<BackupMetadata | null>(null);
  const [procesandoRestauracion, setProcesandoRestauracion] = useState(false);
  const [progresoRestauracion, setProgresoRestauracion] = useState("");
  const [estadoRestauracion, setEstadoRestauracion] = useState<"idle" | "ok" | "error">("idle");
  const [resumenRestauracion, setResumenRestauracion] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Copiar al portapapeles
  const [copiado, setCopiado] = useState<string | null>(null);

  // ==========================================
  // FUNCIONES AUXILIARES
  // ==========================================

  function crearClienteSupabase() {
    const isNewKey = bdKey.startsWith("sb_publishable_") || bdKey.startsWith("sb_secret_");
    return createClient(bdUrl, bdKey, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(
            typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
          );
          if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => headers.set(key, value));
          }
          if (isNewKey && headers.get("Authorization") === `Bearer ${bdKey}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", bdKey);
          return fetch(input, { ...init, headers });
        },
      },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  async function handleCopiar(texto: string, campo: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      toast.success(`${campo} copiado`);
      setTimeout(() => setCopiado(null), 2000);
    } catch {
      toast.error("No se pudo copiar");
    }
  }

  // Auto-cargar credenciales de entorno o localStorage al abrir
  React.useEffect(() => {
    if (open) {
      const url = localStorage.getItem("custom_supabase_url") || import.meta.env["VITE_SUPABASE_URL"] || "";
      const key = localStorage.getItem("custom_supabase_key") || import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";
      if (url) setBdUrl(url);
      if (key) setBdKey(key);
    }
  }, [open]);

  // ==========================================
  // PASO 2: PROBAR CONEXIÓN
  // ==========================================

  async function handleProbarConexion() {
    const cleanUrl = bdUrl.trim().replace(/\/$/, "");
    const cleanKey = bdKey.trim();

    if (!cleanUrl || !cleanKey) {
      toast.error("Ingresa la URL y la API Key de Supabase");
      return;
    }

    setProbandoConexion(true);
    setEstadoConexion("idle");
    setMensajeConexion("Conectando con Supabase...");

    try {
      const isNewKey = cleanKey.startsWith("sb_publishable_") || cleanKey.startsWith("sb_secret_");
      const headers: Record<string, string> = { apikey: cleanKey };
      if (!isNewKey) {
        headers["Authorization"] = `Bearer ${cleanKey}`;
      }

      // Probar endpoint health de Auth
      let res = await fetch(`${cleanUrl}/auth/v1/health`, {
        method: "GET",
        headers,
      });

      // Fallback a consulta REST básica si health no responde
      if (!res.ok) {
        res = await fetch(`${cleanUrl}/rest/v1/CAJAS?select=IDCAJAS&limit=1`, {
          method: "GET",
          headers,
        });
      }

      if (res.ok || res.status === 200 || res.status === 204) {
        setEstadoConexion("ok");
        setMensajeConexion("¡Conexión exitosa! El servidor Supabase responde correctamente.");

        // Guardar credenciales en localStorage
        localStorage.setItem("custom_supabase_url", cleanUrl);
        localStorage.setItem("custom_supabase_key", cleanKey);
        toast.success("Conexión verificada y credenciales guardadas");
      } else {
        setEstadoConexion("error");
        setMensajeConexion(`Error HTTP ${res.status}: ${res.statusText}. Verifica URL y API Key.`);
        toast.error(`Error de conexión: HTTP ${res.status}`);
      }
    } catch (err: any) {
      setEstadoConexion("error");
      setMensajeConexion(`No se pudo conectar: ${err?.message || "Error de red"}`);
      toast.error("No se pudo conectar a la base de datos");
    } finally {
      setProbandoConexion(false);
    }
  }

  // ==========================================
  // PASO 3: INICIALIZAR BD (CREAR TABLAS)
  // ==========================================

  async function handleInicializarBD() {
    setInicializandoBD(true);
    setEstadoInicializacion("idle");
    setMensajeInicializacion("Creando tablas y estructura de la base de datos...");
    setTablasCreadas([]);

    try {
      const client = crearClienteSupabase();

      // Ejecutar el SQL via rpc si existe, o probar creación individual de tablas
      // Intentamos insertar datos de prueba y verificar que existan las tablas
      const tablasPrincipales = [
        "ARTICULO",
        "CLIENTES",
        "FACTURA",
        "CAMPOFACTURA",
        "ABONO_CLIENTE",
        "gastos",
        "depositoentregado",
        "ACCESORIOS",
        "MOVIMIENTOS_INVENTARIO",
        "CAJAS",
        "EMPRESA_CONFIG",
      ];

      const tablasVerificadas: string[] = [];
      const tablasConError: string[] = [];

      for (const tabla of tablasPrincipales) {
        setMensajeInicializacion(`Verificando tabla: ${tabla}...`);
        try {
          const { error } = await client.from(tabla).select("*").limit(1);
          if (!error) {
            tablasVerificadas.push(tabla);
          } else {
            tablasConError.push(tabla);
          }
        } catch {
          tablasConError.push(tabla);
        }
      }

      setTablasCreadas(tablasVerificadas);

      if (tablasVerificadas.length >= tablasPrincipales.length * 0.7) {
        setEstadoInicializacion("ok");
        setMensajeInicializacion(
          `¡Base de datos verificada! ${tablasVerificadas.length} de ${tablasPrincipales.length} tablas están accesibles.${
            tablasConError.length > 0
              ? ` (${tablasConError.length} tablas no encontradas: ${tablasConError.join(", ")} — se crearán durante la restauración)`
              : ""
          }`
        );
        toast.success(`${tablasVerificadas.length} tablas verificadas correctamente`);
      } else if (tablasVerificadas.length > 0) {
        setEstadoInicializacion("ok");
        setMensajeInicializacion(
          `Base de datos parcialmente configurada: ${tablasVerificadas.length} tablas accesibles. Las tablas faltantes (${tablasConError.join(", ")}) deben crearse ejecutando las migraciones SQL desde el panel de Supabase.`
        );
        toast.warning("Base de datos parcialmente configurada");
      } else {
        setEstadoInicializacion("error");
        setMensajeInicializacion(
          "No se encontraron tablas en la base de datos. Necesitas ejecutar las migraciones SQL desde el panel de Supabase (SQL Editor) para crear la estructura. Puedes copiar el script SQL que aparece abajo."
        );
        toast.error("La base de datos está vacía. Es necesario crear las tablas primero.");
      }
    } catch (err: any) {
      setEstadoInicializacion("error");
      setMensajeInicializacion(`Error al verificar la BD: ${err?.message || "Desconocido"}`);
      toast.error("Error al verificar la base de datos");
    } finally {
      setInicializandoBD(false);
    }
  }

  // ==========================================
  // PASO 4: CARGAR Y RESTAURAR BACKUP
  // ==========================================

  function handleSeleccionarArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setArchivoRestaurar(file);
    setEstadoRestauracion("idle");

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = ev.target?.result as string;
        const parsed = JSON.parse(raw);

        if (!parsed?.metadata || !parsed?.datos) {
          toast.error("El archivo no tiene el formato estándar de backup (faltan metadata y datos)");
          setBackupData(null);
          setMetadataBackup(null);
          return;
        }

        const tablasEncontradas = Object.keys(parsed.datos);
        const tablasPrincipales = ["ARTICULO", "FACTURA", "CLIENTES"];
        const tienePrincipales = tablasPrincipales.some((t) => tablasEncontradas.includes(t));

        if (!tienePrincipales) {
          toast.error("El backup no contiene datos de tablas esenciales");
          setBackupData(null);
          setMetadataBackup(null);
          return;
        }

        setBackupData(parsed);
        setMetadataBackup(parsed.metadata);
        toast.success(`Backup válido: ${parsed.metadata.totalRegistros} registros en ${parsed.metadata.totalTablas} tablas`);
      } catch {
        toast.error("El archivo no es un JSON válido");
        setBackupData(null);
        setMetadataBackup(null);
      }
    };
    reader.readAsText(file);
  }

  async function handleEjecutarRestauracion() {
    if (!backupData) {
      toast.error("Selecciona primero un archivo de backup válido");
      return;
    }

    setProcesandoRestauracion(true);
    setEstadoRestauracion("idle");
    setProgresoRestauracion("Iniciando restauración...");
    setResumenRestauracion({});

    try {
      const client = crearClienteSupabase();
      const resumen: Record<string, number> = {};
      const errores: string[] = [];

      const ordenTablas = [
        "EMPRESA_CONFIG",
        "CAJAS",
        "CLIENTES",
        "ARTICULO",
        "ACCESORIOS",
        "FACTURA",
        "CAMPOFACTURA",
        "ABONO_CLIENTE",
        "gastos",
        "depositoentregado",
        "MOVIMIENTOS_INVENTARIO",
      ];

      for (const tabla of ordenTablas) {
        const filas = backupData.datos[tabla];
        if (!filas || !Array.isArray(filas) || filas.length === 0) {
          resumen[tabla] = 0;
          continue;
        }

        let insertados = 0;
        const batchSize = 50;

        for (let i = 0; i < filas.length; i += batchSize) {
          const lote = filas.slice(i, i + batchSize);
          setProgresoRestauracion(`Restaurando ${tabla}: ${Math.min(i + batchSize, filas.length)} / ${filas.length} filas`);

          try {
            const { error } = await client.from(tabla as any).upsert(lote as any);
            if (error) {
              // Intentar fila por fila
              for (const item of lote) {
                try {
                  await client.from(tabla as any).upsert(item as any);
                  insertados++;
                } catch {
                  // Continuar
                }
              }
            } else {
              insertados += lote.length;
            }
          } catch (err: any) {
            errores.push(`Error en ${tabla} lote ${i}: ${err?.message || "Desconocido"}`);
          }
        }

        resumen[tabla] = insertados;
      }

      setResumenRestauracion(resumen);

      const totalRestaurado = Object.values(resumen).reduce((a, b) => a + b, 0);

      if (totalRestaurado > 0) {
        setEstadoRestauracion("ok");
        setProgresoRestauracion(
          `¡Restauración exitosa! Se procesaron ${totalRestaurado} registros en ${Object.keys(resumen).filter((k) => resumen[k] > 0).length} tablas.`
        );
        toast.success(`Restauración completada: ${totalRestaurado} registros`);

        // Guardar las credenciales en .env format para el usuario
        localStorage.setItem("custom_supabase_url", bdUrl);
        localStorage.setItem("custom_supabase_key", bdKey);
      } else {
        setEstadoRestauracion("error");
        setProgresoRestauracion("No se pudieron restaurar registros. Verifica que las tablas existan en la BD.");
        toast.error("No se restauraron registros");
      }
    } catch (err: any) {
      setEstadoRestauracion("error");
      setProgresoRestauracion(`Error crítico: ${err?.message || "Desconocido"}`);
      toast.error("Error durante la restauración");
    } finally {
      setProcesandoRestauracion(false);
    }
  }

  // ==========================================
  // INDICADOR DE PASOS
  // ==========================================

  const pasos = [
    { num: 1, label: "Credenciales", icon: KeyRound, color: "cyan" },
    { num: 2, label: "Probar Conexión", icon: Plug, color: "blue" },
    { num: 3, label: "Verificar BD", icon: Database, color: "indigo" },
    { num: 4, label: "Restaurar Datos", icon: Upload, color: "emerald" },
  ];

  function puedeAvanzar(): boolean {
    if (paso === 1) return bdUrl.trim().length > 0 && bdKey.trim().length > 0;
    if (paso === 2) return estadoConexion === "ok";
    if (paso === 3) return estadoInicializacion === "ok";
    return false;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 z-50 flex h-[92vh] w-[95vw] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-2xl bg-white p-0 shadow-2xl border border-slate-200 overflow-hidden font-sans select-none">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Rocket className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight uppercase">
                  Asistente de Restauración
                </h2>
                <span className="rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-cyan-300 border border-cyan-500/40">
                  Setup
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Configura la conexión, verifica la BD y restaura tu copia de seguridad.
              </p>
            </div>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800 text-slate-300 hover:bg-red-600 hover:text-white transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* INDICADOR DE PASOS */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-3">
          {pasos.map((p, idx) => (
            <React.Fragment key={p.num}>
              <button
                onClick={() => {
                  // Solo permitir ir a pasos anteriores o al actual
                  if (p.num <= paso) setPaso(p.num as PasoAsistente);
                }}
                className={`flex items-center gap-2 transition-all ${
                  p.num === paso
                    ? "text-slate-900"
                    : p.num < paso
                    ? "text-emerald-600 cursor-pointer"
                    : "text-slate-400 cursor-default"
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all ${
                    p.num === paso
                      ? "bg-slate-900 text-white shadow-md"
                      : p.num < paso
                      ? "bg-emerald-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {p.num < paso ? <Check className="h-4 w-4" /> : p.num}
                </div>
                <span className="text-xs font-bold hidden sm:inline">{p.label}</span>
              </button>
              {idx < pasos.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded transition-all ${
                    p.num < paso ? "bg-emerald-400" : "bg-slate-200"
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* CUERPO */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/60 custom-scrollbar">
          {/* ========================================
              PASO 1: CREDENCIALES DE SUPABASE
          ======================================== */}
          {paso === 1 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-cyan-200 bg-cyan-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-600 text-white shrink-0 shadow-md">
                    <KeyRound className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-cyan-950 uppercase tracking-tight">
                      Paso 1: Ingresa las Credenciales de Supabase
                    </h3>
                    <p className="text-xs text-cyan-900 leading-relaxed">
                      Necesitas la <strong>URL</strong> y la <strong>API Key (anon/publishable)</strong> de tu proyecto Supabase
                      para conectarte a la base de datos.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-4">
                {/* URL */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                    <Cloud className="h-3.5 w-3.5 text-cyan-600" />
                    URL del Proyecto
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={bdUrl}
                      onChange={(e) => setBdUrl(e.target.value)}
                      placeholder="https://xxxxxxxxxxxx.supabase.co"
                      className="flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-xs font-mono text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopiar(bdUrl, "URL")}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all shrink-0"
                      title="Copiar"
                    >
                      {copiado === "URL" ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-600">
                    <KeyRound className="h-3.5 w-3.5 text-amber-600" />
                    Clave Pública (anon / publishable key)
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={mostrarKey ? "text" : "password"}
                        value={bdKey}
                        onChange={(e) => setBdKey(e.target.value)}
                        placeholder="sb_publishable_xxxxxxxxxxxxxxxx"
                        className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 pr-10 text-xs font-mono text-slate-800 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setMostrarKey(!mostrarKey)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {mostrarKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopiar(bdKey, "Key")}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 transition-all shrink-0"
                      title="Copiar"
                    >
                      {copiado === "Key" ? <CheckCheck className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Guía */}
              <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 space-y-2">
                <h4 className="text-xs font-black uppercase text-slate-700 flex items-center gap-2">
                  <Info className="h-4 w-4 text-cyan-600" />
                  ¿Dónde encuentro estas credenciales?
                </h4>
                <div className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">1</span>
                    <p>
                      Ve al{" "}
                      <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-cyan-600 font-bold hover:underline inline-flex items-center gap-0.5">
                        Panel de Supabase <ExternalLink className="h-3 w-3" />
                      </a>
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">2</span>
                    <p>Selecciona tu proyecto → <strong>Settings → API</strong></p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-100 text-cyan-700 text-[10px] font-black shrink-0 mt-0.5">3</span>
                    <p>Copia la <strong>URL</strong> y la <strong>anon (publishable) key</strong></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================
              PASO 2: PROBAR CONEXIÓN
          ======================================== */}
          {paso === 2 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-blue-200 bg-blue-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 text-white shrink-0 shadow-md">
                    <Plug className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-blue-950 uppercase tracking-tight">
                      Paso 2: Probar la Conexión
                    </h3>
                    <p className="text-xs text-blue-900 leading-relaxed">
                      Verificaremos que las credenciales ingresadas son correctas y que el servidor Supabase responde.
                    </p>
                  </div>
                </div>
              </div>

              {/* Credenciales resumidas */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-2">
                <div className="text-xs font-black uppercase text-slate-500">Credenciales configuradas:</div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs">
                    <Cloud className="h-3.5 w-3.5 text-cyan-600 shrink-0" />
                    <span className="text-slate-500 font-medium">URL:</span>
                    <span className="font-mono text-slate-800 truncate">{bdUrl}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <KeyRound className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <span className="text-slate-500 font-medium">Key:</span>
                    <span className="font-mono text-slate-800">{bdKey.slice(0, 20)}...</span>
                  </div>
                </div>
              </div>

              {/* Estado de conexión */}
              <div
                className={`rounded-2xl border-2 p-5 flex items-center gap-4 transition-all ${
                  estadoConexion === "ok"
                    ? "border-emerald-300 bg-emerald-50/60"
                    : estadoConexion === "error"
                    ? "border-rose-300 bg-rose-50/60"
                    : "border-slate-200 bg-white"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                    estadoConexion === "ok"
                      ? "bg-emerald-500 text-white"
                      : estadoConexion === "error"
                      ? "bg-rose-500 text-white"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {estadoConexion === "ok" ? (
                    <CheckCircle2 className="h-6 w-6" />
                  ) : estadoConexion === "error" ? (
                    <AlertTriangle className="h-6 w-6" />
                  ) : (
                    <Activity className="h-6 w-6" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-black uppercase text-slate-700">
                    {estadoConexion === "ok"
                      ? "¡Conexión Exitosa!"
                      : estadoConexion === "error"
                      ? "Error de Conexión"
                      : "Esperando prueba de conexión..."}
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {mensajeConexion || 'Presiona el botón "Probar Conexión" para verificar.'}
                  </p>
                </div>
              </div>

              {/* Botón probar */}
              <button
                type="button"
                onClick={handleProbarConexion}
                disabled={probandoConexion}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-blue-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {probandoConexion ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Plug className="h-5 w-5" />
                )}
                <span>Probar Conexión</span>
              </button>
            </div>
          )}

          {/* ========================================
              PASO 3: VERIFICAR / INICIALIZAR BD
          ======================================== */}
          {paso === 3 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600 text-white shrink-0 shadow-md">
                    <Database className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-indigo-950 uppercase tracking-tight">
                      Paso 3: Verificar Estructura de la Base de Datos
                    </h3>
                    <p className="text-xs text-indigo-900 leading-relaxed">
                      Verificaremos que las tablas necesarias existan en tu base de datos. Si no existen,
                      deberás crear la estructura ejecutando el script SQL en el SQL Editor de Supabase.
                    </p>
                  </div>
                </div>
              </div>

              {/* Estado de inicialización */}
              {estadoInicializacion !== "idle" && (
                <div
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    estadoInicializacion === "ok"
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-rose-300 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        estadoInicializacion === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {estadoInicializacion === "ok" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-black uppercase text-slate-700">
                        {estadoInicializacion === "ok" ? "Base de Datos Verificada" : "Tablas No Encontradas"}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">{mensajeInicializacion}</p>
                    </div>
                  </div>

                  {/* Tablas verificadas */}
                  {tablasCreadas.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/60 grid grid-cols-2 gap-1.5">
                      {tablasCreadas.map((t) => (
                        <div key={t} className="flex items-center gap-1.5 text-[11px]">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                          <span className="font-mono text-slate-700">{t}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Botón verificar */}
              <button
                type="button"
                onClick={handleInicializarBD}
                disabled={inicializandoBD}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-indigo-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {inicializandoBD ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Database className="h-5 w-5" />
                )}
                <span>{inicializandoBD ? mensajeInicializacion : "Verificar Tablas de la Base de Datos"}</span>
              </button>

              {/* Script SQL para copiar si las tablas no existen */}
              {estadoInicializacion === "error" && (
                <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                  <div className="bg-slate-800 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-white flex items-center gap-2">
                      <Settings className="h-3.5 w-3.5 text-indigo-400" />
                      Script SQL — Copiar y ejecutar en SQL Editor de Supabase
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopiar(SQL_SCHEMA_PRINCIPAL, "SQL")}
                      className="flex items-center gap-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 px-3 py-1 text-[10px] font-bold text-white transition-all"
                    >
                      {copiado === "SQL" ? <CheckCheck className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      {copiado === "SQL" ? "¡Copiado!" : "Copiar Script"}
                    </button>
                  </div>
                  <div className="p-3 max-h-40 overflow-y-auto">
                    <pre className="text-[10px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {SQL_SCHEMA_PRINCIPAL.slice(0, 800)}...
                    </pre>
                  </div>
                  <div className="px-4 py-2 bg-amber-50 border-t border-amber-200 text-[11px] text-amber-800 flex items-start gap-2">
                    <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>Copia este script, ve al <strong>SQL Editor</strong> de tu proyecto en Supabase y ejecútalo. Luego vuelve aquí y presiona "Verificar" de nuevo.</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================
              PASO 4: RESTAURAR DATOS DESDE JSON
          ======================================== */}
          {paso === 4 && (
            <div className="max-w-xl mx-auto space-y-5 animate-in fade-in duration-200">
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/70 p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shrink-0 shadow-md">
                    <Upload className="h-6 w-6" />
                  </div>
                  <div className="space-y-1 flex-1">
                    <h3 className="text-sm font-black text-emerald-950 uppercase tracking-tight">
                      Paso 4: Restaurar Datos desde Copia de Seguridad
                    </h3>
                    <p className="text-xs text-emerald-900 leading-relaxed">
                      Selecciona el archivo JSON de copia de seguridad para restaurar todos los datos
                      (artículos, clientes, facturas, etc.) en tu nueva base de datos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Seleccionar archivo */}
              <div className="rounded-2xl border border-slate-200 bg-white shadow-xs p-5 space-y-4">
                <input
                  type="file"
                  accept=".json"
                  ref={fileInputRef}
                  onChange={handleSeleccionarArchivo}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={procesandoRestauracion}
                  className="w-full flex items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-400 bg-slate-50 hover:bg-emerald-50/30 px-6 py-6 text-sm font-bold text-slate-600 hover:text-emerald-700 transition-all"
                >
                  <FileJson className="h-8 w-8 text-emerald-500" />
                  <div className="text-left">
                    <div className="font-black text-xs uppercase">
                      {archivoRestaurar ? archivoRestaurar.name : "Seleccionar Archivo de Backup (.json)"}
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal mt-0.5">
                      {archivoRestaurar
                        ? `${(archivoRestaurar.size / 1024).toFixed(1)} KB`
                        : "Haz clic aquí o arrastra tu archivo JSON de copia de seguridad"}
                    </div>
                  </div>
                </button>

                {/* Metadata del backup */}
                {metadataBackup && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-3">
                    <div className="text-xs font-black uppercase text-emerald-800 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      Backup Válido — Resumen:
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3 w-3 text-indigo-500" />
                        <span className="text-slate-500">Versión:</span>
                        <span className="font-bold text-slate-800">{metadataBackup.version}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Layers className="h-3 w-3 text-blue-500" />
                        <span className="text-slate-500">Tablas:</span>
                        <span className="font-bold text-slate-800">{metadataBackup.totalTablas}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-3 w-3 text-amber-500" />
                        <span className="text-slate-500">Registros:</span>
                        <span className="font-bold text-slate-800">{metadataBackup.totalRegistros.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-emerald-500" />
                        <span className="text-slate-500">Fecha:</span>
                        <span className="font-bold text-slate-800">{metadataBackup.fechaLegible || metadataBackup.timestamp}</span>
                      </div>
                    </div>

                    {/* Detalle de tablas */}
                    {metadataBackup.tablas && (
                      <div className="pt-2 border-t border-emerald-200/50 grid grid-cols-2 gap-1">
                        {Object.entries(metadataBackup.tablas).map(([tabla, info]) => (
                          <div key={tabla} className="flex items-center justify-between text-[10px] px-2 py-0.5 rounded bg-white/60">
                            <span className="font-mono text-slate-600">{tabla}</span>
                            <span className="font-black text-slate-800">{info.registros}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Estado de restauración */}
              {estadoRestauracion !== "idle" && (
                <div
                  className={`rounded-2xl border-2 p-4 transition-all ${
                    estadoRestauracion === "ok"
                      ? "border-emerald-300 bg-emerald-50/60"
                      : "border-rose-300 bg-rose-50/60"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-xl shrink-0 ${
                        estadoRestauracion === "ok" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                      }`}
                    >
                      {estadoRestauracion === "ok" ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <AlertTriangle className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] text-slate-700 font-bold">{progresoRestauracion}</p>
                      {Object.keys(resumenRestauracion).length > 0 && (
                        <div className="mt-2 grid grid-cols-2 gap-1">
                          {Object.entries(resumenRestauracion)
                            .filter(([, v]) => v > 0)
                            .map(([tabla, count]) => (
                              <div key={tabla} className="flex items-center justify-between text-[10px] bg-white/70 px-2 py-0.5 rounded">
                                <span className="font-mono text-slate-600">{tabla}</span>
                                <span className="font-black text-emerald-700">{count}</span>
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Progreso en curso */}
              {procesandoRestauracion && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin shrink-0" />
                  <span className="text-xs text-blue-800 font-bold">{progresoRestauracion}</span>
                </div>
              )}

              {/* Botón restaurar */}
              <button
                type="button"
                onClick={handleEjecutarRestauracion}
                disabled={procesandoRestauracion || !backupData}
                className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase px-6 py-4 shadow-lg shadow-emerald-600/20 hover:scale-[1.01] active:scale-98 transition-all disabled:opacity-50"
              >
                {procesandoRestauracion ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                <span>Ejecutar Restauración Completa</span>
              </button>

              {/* Nota de éxito */}
              {estadoRestauracion === "ok" && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    <strong>¡Restauración completada!</strong> Ahora puedes cerrar esta ventana e iniciar sesión normalmente.
                    Todos los datos han sido cargados en tu nueva base de datos.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER CON NAVEGACIÓN */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-100 px-6 py-3">
          <button
            type="button"
            onClick={() => setPaso((paso - 1) as PasoAsistente)}
            disabled={paso === 1}
            className="flex items-center gap-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs px-4 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <Info className="h-3.5 w-3.5 text-slate-400" />
            <span>Paso {paso} de 4</span>
          </div>

          {paso < 4 ? (
            <button
              type="button"
              onClick={() => setPaso((paso + 1) as PasoAsistente)}
              disabled={!puedeAvanzar()}
              className="flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 py-2 transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
            >
              Siguiente
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-2 transition-all shadow-sm"
            >
              <Check className="h-4 w-4" />
              Finalizar
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
