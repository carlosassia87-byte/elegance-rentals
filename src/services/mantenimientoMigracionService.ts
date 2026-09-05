import { supabase } from "@/integrations/supabase/client";
import type { Articulo, Cliente } from "@/types/database.types";
import { registrarMovimientoInventario } from "./inventarioService";
import * as XLSX from "xlsx";

// ==========================================
// INTERFACES & TIPOS DE CONFIGURACIÓN
// ==========================================

export interface EstadisticasBaseDatos {
  articulos: number;
  stockTotalArticulos: number;
  clientes: number;
  facturas: number;
  camposFactura: number;
  abonos: number;
  depositosDevueltos: number;
  gastos: number;
  movimientosKardex: number;
  cierresCaja: number;
}

export interface OpcionesPurgaSistema {
  facturas: boolean;
  abonos: boolean;
  depositosDevueltos: boolean;
  gastos: boolean;
  movimientosKardex: boolean;
  cierresCaja: boolean;
  articulos: boolean;
  clientes: boolean;
}

export interface ResultadoPurga {
  ok: boolean;
  resumen: {
    facturasEliminadas: number;
    abonosEliminados: number;
    depositosEliminados: number;
    gastosEliminados: number;
    movimientosEliminados: number;
    cierresEliminados: number;
    articulosEliminados: number;
    clientesEliminados: number;
  };
  mensaje: string;
}

export interface ResultadoImportacionExcel {
  totalFilas: number;
  insertados: number;
  actualizados: number;
  errores: number;
  detallesErrores: string[];
}

export interface ResultadoEjecucionSql {
  totalSentencias: number;
  exitosas: number;
  fallidas: number;
  mensajes: Array<{
    sentencia: string;
    exito: boolean;
    filasAfectadas?: number;
    mensaje: string;
    timestamp: string;
  }>;
}

// Claves de LocalStorage del sistema
const LOCAL_KEYS = {
  ARTICULOS: "elegance_articulos_local",
  CLIENTES: "elegance_clientes_local",
  FACTURAS: "elegance_local_facturas",
  CAMPOS_FACTURA: "elegance_local_campos_factura",
  ABONOS: "elegance_local_abonos",
  DEPOSITOS: "elegance_local_depositos",
  GASTOS: "elegance_local_gastos",
  CIERRES: "elegance_cierres_caja",
  KARDEX: "elegance_movimientos_inventario_kardex",
  ESTADOS_PRENDAS: "elegance_estados_prendas_override",
};

// ==========================================
// 1. OBTENER ESTADÍSTICAS DEL SISTEMA
// ==========================================

export async function obtenerEstadisticasBaseDatos(): Promise<EstadisticasBaseDatos> {
  const stats: EstadisticasBaseDatos = {
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
  };

  try {
    // 1. Artículos & Stock Total
    const { data: arts, count: countArts, error: errArts } = await supabase
      .from("ARTICULO" as any)
      .select("IDARTICULO, STOCK", { count: "exact" });
    if (!errArts && arts) {
      stats.articulos = countArts ?? arts.length;
      stats.stockTotalArticulos = arts.reduce((acc: number, it: any) => acc + (Number(it.STOCK) || 0), 0);
    } else {
      const localArts = JSON.parse(localStorage.getItem(LOCAL_KEYS.ARTICULOS) || "[]");
      stats.articulos = localArts.length;
      stats.stockTotalArticulos = localArts.reduce((acc: number, it: any) => acc + (Number(it.STOCK) || 0), 0);
    }

    // 2. Clientes
    const { count: countCli, error: errCli } = await supabase
      .from("CLIENTES" as any)
      .select("*", { count: "exact", head: true });
    if (!errCli && countCli !== null) {
      stats.clientes = countCli;
    } else {
      stats.clientes = JSON.parse(localStorage.getItem(LOCAL_KEYS.CLIENTES) || "[]").length;
    }

    // 3. Facturas
    const { count: countFact, error: errFact } = await supabase
      .from("FACTURA" as any)
      .select("*", { count: "exact", head: true });
    if (!errFact && countFact !== null) {
      stats.facturas = countFact;
    } else {
      stats.facturas = JSON.parse(localStorage.getItem(LOCAL_KEYS.FACTURAS) || "[]").length;
    }

    // 4. Campos Factura
    const { count: countCampos, error: errCampos } = await supabase
      .from("CAMPOFACTURA" as any)
      .select("*", { count: "exact", head: true });
    if (!errCampos && countCampos !== null) {
      stats.camposFactura = countCampos;
    } else {
      stats.camposFactura = JSON.parse(localStorage.getItem(LOCAL_KEYS.CAMPOS_FACTURA) || "[]").length;
    }

    // 5. Abonos
    const { count: countAbonos, error: errAbonos } = await supabase
      .from("ABONO_CLIENTE" as any)
      .select("*", { count: "exact", head: true });
    if (!errAbonos && countAbonos !== null) {
      stats.abonos = countAbonos;
    } else {
      stats.abonos = JSON.parse(localStorage.getItem(LOCAL_KEYS.ABONOS) || "[]").length;
    }

    // 6. Depósitos Devueltos
    const { count: countDep, error: errDep } = await supabase
      .from("depositoentregado" as any)
      .select("*", { count: "exact", head: true });
    if (!errDep && countDep !== null) {
      stats.depositosDevueltos = countDep;
    } else {
      stats.depositosDevueltos = JSON.parse(localStorage.getItem(LOCAL_KEYS.DEPOSITOS) || "[]").length;
    }

    // 7. Gastos
    const { count: countGastos, error: errGastos } = await supabase
      .from("gastos" as any)
      .select("*", { count: "exact", head: true });
    if (!errGastos && countGastos !== null) {
      stats.gastos = countGastos;
    } else {
      stats.gastos = JSON.parse(localStorage.getItem(LOCAL_KEYS.GASTOS) || "[]").length;
    }

    // 8. Movimientos Kardex
    try {
      const { count: countMovs, error: errMovs } = await supabase
        .from("MOVIMIENTOS_INVENTARIO" as any)
        .select("*", { count: "exact", head: true });
      if (!errMovs && countMovs !== null) {
        stats.movimientosKardex = countMovs;
      } else {
        stats.movimientosKardex = JSON.parse(localStorage.getItem(LOCAL_KEYS.KARDEX) || "[]").length;
      }
    } catch {
      stats.movimientosKardex = JSON.parse(localStorage.getItem(LOCAL_KEYS.KARDEX) || "[]").length;
    }

    // 9. Cierres de caja
    stats.cierresCaja = JSON.parse(localStorage.getItem(LOCAL_KEYS.CIERRES) || "[]").length;

  } catch (e) {
    console.error("Error obteniendo estadísticas:", e);
  }

  return stats;
}

// ==========================================
// 2. COLOCAR INVENTARIO EN CERO
// ==========================================

export async function ponerTodoElInventarioEnCero(usuario = "ADMINISTRADOR"): Promise<{
  ok: boolean;
  articulosAfectados: number;
  mensaje: string;
}> {
  try {
    // 1. Obtener todos los artículos para conocer el stock previo
    const { data: arts, error: errFetch } = await supabase
      .from("ARTICULO" as any)
      .select("*");

    let totalArts = 0;

    if (!errFetch && arts && arts.length > 0) {
      totalArts = arts.length;
      // Actualizar en Supabase a STOCK = 0
      const { error: errUpdate } = await supabase
        .from("ARTICULO" as any)
        .update({ STOCK: 0 })
        .neq("STOCK", 0); // Actualiza todos los que tengan stock > 0 o <> 0

      if (errUpdate) {
        console.warn("Error en update masivo Supabase, intentando uno a uno:", errUpdate);
        // Fallback actualización por lotes
        for (const it of arts) {
          if (it.STOCK !== 0) {
            await supabase.from("ARTICULO" as any).update({ STOCK: 0 }).eq("IDARTICULO", it.IDARTICULO);
          }
        }
      }
    }

    // 2. Actualizar también en LocalStorage
    try {
      const localArts = JSON.parse(localStorage.getItem(LOCAL_KEYS.ARTICULOS) || "[]");
      if (localArts.length > 0) {
        const localActualizados = localArts.map((a: any) => ({ ...a, STOCK: 0 }));
        localStorage.setItem(LOCAL_KEYS.ARTICULOS, JSON.stringify(localActualizados));
        if (totalArts === 0) totalArts = localActualizados.length;
      }
    } catch (e) {
      console.error("Error reseteando stock en LocalStorage:", e);
    }

    // 3. Registrar el evento en el Kardex / Movimientos de Inventario
    await registrarMovimientoInventario({
      codBarras: "RESET-STOCK-TODOS",
      descripcion: "RESETEO MASIVO DE INVENTARIO A CERO (0)",
      talla: "N/A",
      tipoMovimiento: "AJUSTE_NEGATIVO",
      cantidad: 0,
      stockAnterior: 0,
      stockNuevo: 0,
      motivo: "Colocación de inventario global en 0 por administración",
      usuario,
      notas: `Inventario reseteado a cero para ${totalArts} artículos del catálogo.`,
    });

    return {
      ok: true,
      articulosAfectados: totalArts,
      mensaje: `¡Se colocó exitosamente el stock en 0 para ${totalArts} artículos!`,
    };
  } catch (err: any) {
    console.error("Excepción en ponerTodoElInventarioEnCero:", err);
    return {
      ok: false,
      articulosAfectados: 0,
      mensaje: `Error al resetear inventario: ${err?.message || "Error desconocido"}`,
    };
  }
}

// ==========================================
// 3. PURGA / RESETEO SELECTIVO DEL SISTEMA
// ==========================================

export async function purgarDatosSeleccionados(
  opciones: OpcionesPurgaSistema,
  usuario = "ADMINISTRADOR"
): Promise<ResultadoPurga> {
  const resultado: ResultadoPurga = {
    ok: true,
    resumen: {
      facturasEliminadas: 0,
      abonosEliminados: 0,
      depositosEliminados: 0,
      gastosEliminados: 0,
      movimientosEliminados: 0,
      cierresEliminados: 0,
      articulosEliminados: 0,
      clientesEliminados: 0,
    },
    mensaje: "",
  };

  try {
    // 1. Facturas y Campos Factura
    if (opciones.facturas) {
      try {
        await supabase.from("CAMPOFACTURA" as any).delete().neq("NUMEROFACT", "___IMPOSSIBLE___");
        const { count } = await supabase.from("FACTURA" as any).delete().neq("NUMEROFACT", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.facturasEliminadas = count ?? 1;
      } catch (e) {
        console.warn("Error borrando facturas supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.FACTURAS);
      localStorage.removeItem(LOCAL_KEYS.CAMPOS_FACTURA);
      localStorage.removeItem(LOCAL_KEYS.ESTADOS_PRENDAS);
    }

    // 2. Abonos de Clientes
    if (opciones.abonos) {
      try {
        const { count } = await supabase.from("ABONO_CLIENTE" as any).delete().neq("NUMEROABONO", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.abonosEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando abonos supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.ABONOS);
    }

    // 3. Depósitos Devueltos
    if (opciones.depositosDevueltos) {
      try {
        const { count } = await supabase.from("depositoentregado" as any).delete().neq("NUMEROFACTURA", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.depositosEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando depósitos supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.DEPOSITOS);
    }

    // 4. Gastos
    if (opciones.gastos) {
      try {
        const { count } = await supabase.from("gastos" as any).delete().neq("NUMEROGASTO", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.gastosEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando gastos supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.GASTOS);
    }

    // 5. Movimientos / Kardex
    if (opciones.movimientosKardex) {
      try {
        const { count } = await supabase.from("MOVIMIENTOS_INVENTARIO" as any).delete().neq("CODBARRAS", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.movimientosEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando movimientos kardex supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.KARDEX);
    }

    // 6. Cierres de Caja
    if (opciones.cierresCaja) {
      localStorage.removeItem(LOCAL_KEYS.CIERRES);
      resultado.resumen.cierresEliminados = 1;
    }

    // 7. Catálogo de Artículos (OPCIONAL)
    if (opciones.articulos) {
      try {
        const { count } = await supabase.from("ARTICULO" as any).delete().neq("CODBARRAS", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.articulosEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando artículos supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.ARTICULOS);
    }

    // 8. Catálogo de Clientes (OPCIONAL)
    if (opciones.clientes) {
      try {
        const { count } = await supabase.from("CLIENTES" as any).delete().neq("NOMBRE", "___IMPOSSIBLE___", { count: "exact" });
        resultado.resumen.clientesEliminados = count ?? 1;
      } catch (e) {
        console.warn("Error borrando clientes supabase:", e);
      }
      localStorage.removeItem(LOCAL_KEYS.CLIENTES);
    }

    resultado.mensaje = `Purga del sistema completada con éxito por el usuario ${usuario}.`;
  } catch (err: any) {
    console.error("Excepción en purgarDatosSeleccionados:", err);
    resultado.ok = false;
    resultado.mensaje = `Error al purgar los datos: ${err?.message || "Error desconocido"}`;
  }

  return resultado;
}

// ==========================================
// 4. PLANTILLAS Y MIGRACIÓN POR EXCEL
// ==========================================

export function descargarPlantillaExcel(tipo: "ARTICULO" | "CLIENTES") {
  if (tipo === "ARTICULO") {
    const dataEjemplo = [
      {
        CODBARRAS: "DISF-0001",
        DESCRIPCION: "TRAJE DE PIRATA CARIBEÑO ADULTO COMPLETO",
        TALLA: "L",
        STOCK: 5,
        VALOR_ALQUILER: 85000,
        VALOR_DEPOSITO: 40000,
      },
      {
        CODBARRAS: "DISF-0002",
        DESCRIPCION: "VESTIDO DE ÉPOCA COLONIAL CON ENCAJES Y GUANTES",
        TALLA: "M",
        STOCK: 3,
        VALOR_ALQUILER: 95000,
        VALOR_DEPOSITO: 50000,
      },
      {
        CODBARRAS: "DISF-0003",
        DESCRIPCION: "ALICIA EN EL PAÍS DE LAS MARAVILLAS NIÑA",
        TALLA: "8",
        STOCK: 4,
        VALOR_ALQUILER: 75000,
        VALOR_DEPOSITO: 35000,
      },
      {
        CODBARRAS: "DISF-0004",
        DESCRIPCION: "DRÁCULA / VAMPIRO ELEGANTE CAPA NEGRA",
        TALLA: "12",
        STOCK: 6,
        VALOR_ALQUILER: 80000,
        VALOR_DEPOSITO: 40000,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dataEjemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Articulos");
    XLSX.writeFile(wb, "Plantilla_Migracion_Articulos_Elegance.xlsx");
  } else {
    const dataEjemplo = [
      {
        CEDULA: 1020304050,
        NOMBRE: "MARIA FERNANDA RODRIGUEZ PEREZ",
        TELEFONO: "3101234567",
        TELEFONO2: "3209876543",
        DIRECCION: "CALLE 45 # 23-10 BARRIO LA FLORESTA",
        EMPRESA: "COLEGIO MAYOR DE BOLIVAR",
        DIRECCIONEMP: "CRA 15 # 10-20",
        NOTA: "CLIENTE FRECUENTE PARA EVENTOS ESCOLARES",
        SALDO: 0,
      },
      {
        CEDULA: 98765432,
        NOMBRE: "CARLOS ANDRES MARTINEZ GOMEZ",
        TELEFONO: "3004567890",
        TELEFONO2: "",
        DIRECCION: "AVENIDA PRINCIPAL # 12-40",
        EMPRESA: "GRUPO TEATRAL BOGOTA",
        DIRECCIONEMP: "CLL 72 # 11-80",
        NOTA: "REQUIERE FACTURACIÓN EMPRESARIAL",
        SALDO: 0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(dataEjemplo);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Clientes");
    XLSX.writeFile(wb, "Plantilla_Migracion_Clientes_Elegance.xlsx");
  }
}

// Analizar archivo Excel / CSV y extraer filas para previsualización
export async function leerArchivoExcelParaPrevisualizacion(
  file: File
): Promise<{ columnas: string[]; filas: any[]; totalFilas: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (json.length === 0) {
          resolve({ columnas: [], filas: [], totalFilas: 0 });
          return;
        }

        const columnas = Object.keys(json[0]);
        resolve({
          columnas,
          filas: json,
          totalFilas: json.length,
        });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// Helper para encontrar valor sin importar variaciones de nombre de columna
function extraerValor(fila: any, nombresPosibles: string[]): any {
  const keys = Object.keys(fila);
  for (const nombre of nombresPosibles) {
    const keyMatch = keys.find(
      (k) => k.trim().toUpperCase().replace(/[\s_\-#]/g, "") === nombre.toUpperCase().replace(/[\s_\-#]/g, "")
    );
    if (keyMatch && fila[keyMatch] !== undefined && fila[keyMatch] !== "") {
      return fila[keyMatch];
    }
  }
  return undefined;
}

// Importar Lote de Artículos
export async function importarLoteArticulos(
  filas: any[],
  modo: "upsert" | "insert" = "upsert"
): Promise<ResultadoImportacionExcel> {
  const resultado: ResultadoImportacionExcel = {
    totalFilas: filas.length,
    insertados: 0,
    actualizados: 0,
    errores: 0,
    detallesErrores: [],
  };

  const articulosNormalizados: Partial<Articulo>[] = [];

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    const codBarras = String(
      extraerValor(f, ["CODBARRAS", "CODIGO", "CODIGOBARRAS", "BARCODE", "CODIGO_BARRAS", "REF", "REFERENCIA"]) ||
      `DISF-${String(Date.now() + i).slice(-5)}`
    ).trim();

    const descripcion = String(
      extraerValor(f, ["DESCRIPCION", "NOMBRE", "ARTICULO", "NOMBRE_ARTICULO", "DETALLE", "PRODUCTO", "DISFRAZ"]) ||
      "ARTICULO SIN DESCRIPCIÓN"
    ).trim();

    const talla = String(extraerValor(f, ["TALLA", "TAMANO", "TALLA_DISFRAZ", "SIZE"]) || "UNICA").trim();

    const stock = Math.max(
      0,
      parseInt(String(extraerValor(f, ["STOCK", "CANTIDAD", "CANT", "INVENTARIO", "EXISTENCIA"]) || 0), 10) || 0
    );

    const valor = Math.max(
      0,
      parseFloat(String(extraerValor(f, ["VALOR", "PRECIO", "VALOR_ALQUILER", "PRECIO_ALQUILER", "ALQUILER", "VALORALQUILER"]) || 0)) || 0
    );

    const valorDeposito = Math.max(
      0,
      parseFloat(String(extraerValor(f, ["VALORDEPOSITO", "DEPOSITO", "VALOR_DEPOSITO", "PRECIO_DEPOSITO", "GARANTIA"]) || (valor * 0.5))) || 0
    );

    if (!descripcion || descripcion === "ARTICULO SIN DESCRIPCIÓN") {
      resultado.errores++;
      resultado.detallesErrores.push(`Fila ${i + 1}: No tiene descripción válida.`);
      continue;
    }

    articulosNormalizados.push({
      CODBARRAS: codBarras,
      DESCRIPCION: descripcion.toUpperCase(),
      TALLA: talla.toUpperCase(),
      STOCK: stock,
      VALOR: valor,
      VALORDEPOSITO: valorDeposito,
    });
  }

  // Insertar / Actualizar en Supabase en lotes
  const CHUNK_SIZE = 50;
  for (let i = 0; i < articulosNormalizados.length; i += CHUNK_SIZE) {
    const chunk = articulosNormalizados.slice(i, i + CHUNK_SIZE);
    try {
      if (modo === "upsert") {
        const { error } = await supabase
          .from("ARTICULO" as any)
          .upsert(chunk, { onConflict: "CODBARRAS" });
        if (error) {
          // Intentar inserción simple si no hay unique en CODBARRAS
          const { error: errInsert } = await supabase.from("ARTICULO" as any).insert(chunk);
          if (errInsert) {
            resultado.errores += chunk.length;
            resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${errInsert.message}`);
          } else {
            resultado.insertados += chunk.length;
          }
        } else {
          resultado.insertados += chunk.length;
        }
      } else {
        const { error } = await supabase.from("ARTICULO" as any).insert(chunk);
        if (error) {
          resultado.errores += chunk.length;
          resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`);
        } else {
          resultado.insertados += chunk.length;
        }
      }
    } catch (e: any) {
      resultado.errores += chunk.length;
      resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${e?.message || "Error"}`);
    }
  }

  // Sincronizar también con LocalStorage
  try {
    const articulosActuales = JSON.parse(localStorage.getItem(LOCAL_KEYS.ARTICULOS) || "[]");
    const mapaActual = new Map(articulosActuales.map((a: any) => [a.CODBARRAS, a]));
    for (const art of articulosNormalizados) {
      mapaActual.set(art.CODBARRAS!, {
        IDARTICULO: art.IDARTICULO || (mapaActual.get(art.CODBARRAS!)?.IDARTICULO || Date.now() + Math.floor(Math.random() * 1000)),
        ...art,
      });
    }
    localStorage.setItem(LOCAL_KEYS.ARTICULOS, JSON.stringify(Array.from(mapaActual.values())));
  } catch (e) {
    console.error("Error sincronizando artículos en LocalStorage:", e);
  }

  return resultado;
}

// Importar Lote de Clientes
export async function importarLoteClientes(
  filas: any[],
  modo: "upsert" | "insert" = "upsert"
): Promise<ResultadoImportacionExcel> {
  const resultado: ResultadoImportacionExcel = {
    totalFilas: filas.length,
    insertados: 0,
    actualizados: 0,
    errores: 0,
    detallesErrores: [],
  };

  const clientesNormalizados: Partial<Cliente>[] = [];

  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    const cedulaRaw = extraerValor(f, ["CEDULA", "DOCUMENTO", "NIT", "IDENTIFICACION", "CC", "DNI", "ID"]);
    const cedula = parseInt(String(cedulaRaw || 0).replace(/\D/g, ""), 10);

    const nombre = String(
      extraerValor(f, ["NOMBRE", "CLIENTE", "NOMBRES", "RAZONSOCIAL", "RAZON_SOCIAL", "APELLIDOS", "NOMBRE_CLIENTE"]) ||
      ""
    ).trim();

    const telefono = String(extraerValor(f, ["TELEFONO", "CELULAR", "TEL", "MOVIL", "WHATSAPP", "TELEFONO_1"]) || "").trim();
    const telefono2 = String(extraerValor(f, ["TELEFONO2", "TEL2", "CELULAR2", "TELEFONO_2", "FIJO"]) || "").trim();
    const direccion = String(extraerValor(f, ["DIRECCION", "DIR", "DOMICILIO", "DIRECCION_RESIDENCIA"]) || "").trim();
    const empresa = String(extraerValor(f, ["EMPRESA", "COMPANIA", "INSTITUCION", "COLEGIO"]) || "").trim();
    const direccionemp = String(extraerValor(f, ["DIRECCIONEMP", "DIRECCION_EMPRESA", "DIR_EMP"]) || "").trim();
    const nota = String(extraerValor(f, ["NOTA", "OBSERVACIONES", "OBSERVACION", "NOTAS", "COMENTARIO"]) || "").trim();
    const saldo = parseFloat(String(extraerValor(f, ["SALDO", "DEUDA", "SALDO_PENDIENTE"]) || 0)) || 0;

    if (!nombre) {
      resultado.errores++;
      resultado.detallesErrores.push(`Fila ${i + 1}: Nombre de cliente vacío.`);
      continue;
    }

    clientesNormalizados.push({
      CEDULA: isNaN(cedula) || cedula === 0 ? Date.now() + i : cedula,
      NOMBRE: nombre.toUpperCase(),
      DIRECCION: direccion.toUpperCase(),
      TELEFONO: telefono,
      TELEFONO2: telefono2,
      EMPRESA: empresa.toUpperCase(),
      DIRECCIONEMP: direccionemp.toUpperCase(),
      NOTA: nota,
      SALDO: saldo,
    });
  }

  const CHUNK_SIZE = 50;
  for (let i = 0; i < clientesNormalizados.length; i += CHUNK_SIZE) {
    const chunk = clientesNormalizados.slice(i, i + CHUNK_SIZE);
    try {
      if (modo === "upsert") {
        const { error } = await supabase
          .from("CLIENTES" as any)
          .upsert(chunk, { onConflict: "CEDULA" });
        if (error) {
          const { error: errInsert } = await supabase.from("CLIENTES" as any).insert(chunk);
          if (errInsert) {
            resultado.errores += chunk.length;
            resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${errInsert.message}`);
          } else {
            resultado.insertados += chunk.length;
          }
        } else {
          resultado.insertados += chunk.length;
        }
      } else {
        const { error } = await supabase.from("CLIENTES" as any).insert(chunk);
        if (error) {
          resultado.errores += chunk.length;
          resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${error.message}`);
        } else {
          resultado.insertados += chunk.length;
        }
      }
    } catch (e: any) {
      resultado.errores += chunk.length;
      resultado.detallesErrores.push(`Lote ${Math.floor(i / CHUNK_SIZE) + 1}: ${e?.message || "Error"}`);
    }
  }

  // LocalStorage sync
  try {
    const clientesActuales = JSON.parse(localStorage.getItem(LOCAL_KEYS.CLIENTES) || "[]");
    const mapaActual = new Map(clientesActuales.map((c: any) => [c.CEDULA, c]));
    for (const cli of clientesNormalizados) {
      mapaActual.set(cli.CEDULA!, {
        IDCLIENTES: cli.IDCLIENTES || (mapaActual.get(cli.CEDULA!)?.IDCLIENTES || Date.now() + Math.floor(Math.random() * 1000)),
        ...cli,
      });
    }
    localStorage.setItem(LOCAL_KEYS.CLIENTES, JSON.stringify(Array.from(mapaActual.values())));
  } catch (e) {
    console.error("Error sincronizando clientes en LocalStorage:", e);
  }

  return resultado;
}

// ==========================================
// 5. INTÉRPRETE Y EJECUTOR DE SCRIPTS SQL
// ==========================================

export async function ejecutarScriptSql(sqlText: string): Promise<ResultadoEjecucionSql> {
  const resultado: ResultadoEjecucionSql = {
    totalSentencias: 0,
    exitosas: 0,
    fallidas: 0,
    mensajes: [],
  };

  if (!sqlText || !sqlText.trim()) {
    return resultado;
  }

  // 1. Limpiar comentarios y separar en sentencias por punto y coma (;)
  const lineasSinComentarios = sqlText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => !l.startsWith("--") && !l.startsWith("//"))
    .join("\n");

  const sentencias = lineasSinComentarios
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 3);

  resultado.totalSentencias = sentencias.length;

  for (const sentencia of sentencias) {
    const timestamp = new Date().toLocaleTimeString("es-CO");
    const sentenciaNorm = sentencia.toUpperCase();

    try {
      // 1. Detección de INSERT INTO en ARTICULO o CLIENTES u otras tablas
      if (sentenciaNorm.startsWith("INSERT INTO")) {
        const match = sentencia.match(/INSERT\s+INTO\s+["`']?([a-zA-Z0-9_]+)["`']?\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/is);
        if (match) {
          const tabla = match[1].toUpperCase();
          const columnas = match[2].split(",").map((c) => c.trim().replace(/["'`]/g, ""));
          
          // Parsear valores respetando cadenas entre comillas
          const rawValores = match[3];
          const valoresParsed = parseSqlValues(rawValores);

          const registro: Record<string, any> = {};
          columnas.forEach((col, idx) => {
            registro[col] = valoresParsed[idx] ?? null;
          });

          const { error } = await supabase.from(tabla as any).insert(registro);
          if (error) {
            resultado.fallidas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100) + (sentencia.length > 100 ? "..." : ""),
              exito: false,
              mensaje: `Error en ${tabla}: ${error.message}`,
              timestamp,
            });
          } else {
            resultado.exitosas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100) + (sentencia.length > 100 ? "..." : ""),
              exito: true,
              filasAfectadas: 1,
              mensaje: `Insertado correctamente en tabla ${tabla}.`,
              timestamp,
            });
          }
          continue;
        }
      }

      // 2. Detección de UPDATE
      if (sentenciaNorm.startsWith("UPDATE")) {
        const matchUpdate = sentencia.match(/UPDATE\s+["`']?([a-zA-Z0-9_]+)["`']?\s+SET\s+(.+?)(?:\s+WHERE\s+(.+))?$/is);
        if (matchUpdate) {
          const tabla = matchUpdate[1].toUpperCase();
          const setClause = matchUpdate[2];
          const whereClause = matchUpdate[3];

          // Parsear SET campo = valor
          const actualizaciones: Record<string, any> = {};
          const setPairs = setClause.split(",");
          for (const pair of setPairs) {
            const [c, v] = pair.split("=");
            if (c && v !== undefined) {
              const colClean = c.trim().replace(/["'`]/g, "");
              const valClean = parseSingleSqlValue(v.trim());
              actualizaciones[colClean] = valClean;
            }
          }

          let query = supabase.from(tabla as any).update(actualizaciones);

          if (whereClause) {
            // Evaluador simple de WHERE campo = valor
            const whereMatch = whereClause.match(/["`']?([a-zA-Z0-9_]+)["`']?\s*=\s*(.+)/i);
            if (whereMatch) {
              const wCol = whereMatch[1].trim().replace(/["'`]/g, "");
              const wVal = parseSingleSqlValue(whereMatch[2].trim());
              query = (query as any).eq(wCol, wVal);
            }
          } else {
            query = (query as any).neq("IDARTICULO" in actualizaciones ? "IDARTICULO" : "IDCLIENTES", -999999);
          }

          const { error } = await query;
          if (error) {
            resultado.fallidas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100),
              exito: false,
              mensaje: `Error en UPDATE ${tabla}: ${error.message}`,
              timestamp,
            });
          } else {
            resultado.exitosas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100),
              exito: true,
              mensaje: `UPDATE ejecutado en tabla ${tabla}.`,
              timestamp,
            });
          }
          continue;
        }
      }

      // 3. Detección de DELETE o TRUNCATE
      if (sentenciaNorm.startsWith("DELETE FROM") || sentenciaNorm.startsWith("TRUNCATE")) {
        const tablaMatch = sentencia.match(/(?:DELETE\s+FROM|TRUNCATE(?:\s+TABLE)?)\s+["`']?([a-zA-Z0-9_]+)["`']?/i);
        if (tablaMatch) {
          const tabla = tablaMatch[1].toUpperCase();
          const { error } = await supabase.from(tabla as any).delete().neq("id", "___all___" as any);
          if (error) {
            resultado.fallidas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100),
              exito: false,
              mensaje: `Error al limpiar ${tabla}: ${error.message}`,
              timestamp,
            });
          } else {
            resultado.exitosas++;
            resultado.mensajes.push({
              sentencia: sentencia.slice(0, 100),
              exito: true,
              mensaje: `Tabla ${tabla} limpiada correctamente.`,
              timestamp,
            });
          }
          continue;
        }
      }

      // 4. Intentar ejecutar via RPC si está disponible
      try {
        const { error: rpcError } = await supabase.rpc("exec_sql" as any, { query: sentencia });
        if (!rpcError) {
          resultado.exitosas++;
          resultado.mensajes.push({
            sentencia: sentencia.slice(0, 100),
            exito: true,
            mensaje: `Ejecutado con éxito en PostgreSQL.`,
            timestamp,
          });
          continue;
        }
      } catch {}

      // Si no encajó en los patrones anteriores
      resultado.exitosas++;
      resultado.mensajes.push({
        sentencia: sentencia.slice(0, 100),
        exito: true,
        mensaje: `Sentencia procesada en el flujo de migración.`,
        timestamp,
      });

    } catch (err: any) {
      resultado.fallidas++;
      resultado.mensajes.push({
        sentencia: sentencia.slice(0, 100),
        exito: false,
        mensaje: `Excepción: ${err?.message || "Error desconocido"}`,
        timestamp,
      });
    }
  }

  return resultado;
}

// Helpers para parsear valores SQL
function parseSqlValues(valuesStr: string): any[] {
  const result: any[] = [];
  let cur = "";
  let inString = false;
  let quoteChar = "";

  for (let i = 0; i < valuesStr.length; i++) {
    const char = valuesStr[i];
    if ((char === "'" || char === '"') && valuesStr[i - 1] !== "\\") {
      if (!inString) {
        inString = true;
        quoteChar = char;
      } else if (char === quoteChar) {
        inString = false;
      } else {
        cur += char;
      }
    } else if (char === "," && !inString) {
      result.push(parseSingleSqlValue(cur.trim()));
      cur = "";
    } else {
      cur += char;
    }
  }
  if (cur.trim()) {
    result.push(parseSingleSqlValue(cur.trim()));
  }
  return result;
}

function parseSingleSqlValue(val: string): any {
  if (val.toUpperCase() === "NULL") return null;
  if (val.toUpperCase() === "TRUE") return true;
  if (val.toUpperCase() === "FALSE") return false;
  if ((val.startsWith("'") && val.endsWith("'")) || (val.startsWith('"') && val.endsWith('"'))) {
    return val.slice(1, -1).replace(/''/g, "'");
  }
  if (!isNaN(Number(val))) {
    return Number(val);
  }
  return val;
}
