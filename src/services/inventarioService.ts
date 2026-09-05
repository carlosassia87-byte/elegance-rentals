import { supabase } from "@/integrations/supabase/client";
import type { Articulo } from "@/types/database.types";
import { listarArticulos, guardarArticulo } from "./posService";

export type TipoMovimientoInventario =
  | "ENTRADA_COMPRA"
  | "ENTRADA_CONFECCION"
  | "ENTRADA_ALIMENTACION"
  | "ENTRADA_DEVOLUCION"
  | "SALIDA_ALQUILER"
  | "SALIDA_VENTA"
  | "SALIDA_BAJA_DANO"
  | "SALIDA_PERDIDA"
  | "AJUSTE_POSITIVO"
  | "AJUSTE_NEGATIVO";

export interface MovimientoInventario {
  id: string;
  fecha: string; // ISO string
  idArticulo?: number;
  codBarras: string;
  descripcion: string;
  talla: string;
  tipoMovimiento: TipoMovimientoInventario;
  cantidad: number; // Positivo para entradas/aumentos, negativo para salidas/bajas
  stockAnterior: number;
  stockNuevo: number;
  motivo: string;
  usuario: string;
  costoUnitario?: number;
  precioAlquiler?: number;
  precioDeposito?: number;
  notas?: string;
}

const KEY_LOCAL_MOVIMIENTOS_INV = "elegance_movimientos_inventario_kardex";

// Obtener lista local de movimientos
export function obtenerMovimientosInventarioLocal(): MovimientoInventario[] {
  try {
    const raw = localStorage.getItem(KEY_LOCAL_MOVIMIENTOS_INV);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error("Error leyendo movimientos de inventario locales:", e);
  }
  return [];
}

// Guardar movimiento de inventario en LocalStorage y en Supabase si existe
export async function registrarMovimientoInventario(
  mov: Omit<MovimientoInventario, "id" | "fecha">
): Promise<MovimientoInventario> {
  const nuevoMov: MovimientoInventario = {
    ...mov,
    id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    fecha: new Date().toISOString(),
  };

  // 1. Guardar local
  try {
    const historial = obtenerMovimientosInventarioLocal();
    historial.unshift(nuevoMov);
    localStorage.setItem(KEY_LOCAL_MOVIMIENTOS_INV, JSON.stringify(historial.slice(0, 2000)));
  } catch (e) {
    console.error("Error guardando movimiento local:", e);
  }

  // 2. Intentar registrar en Supabase (si existe la tabla MOVIMIENTOS_INVENTARIO)
  try {
    await supabase.from("MOVIMIENTOS_INVENTARIO" as any).insert({
      FECHA: nuevoMov.fecha,
      IDARTICULO: nuevoMov.idArticulo || null,
      CODBARRAS: nuevoMov.codBarras,
      DESCRIPCION: nuevoMov.descripcion,
      TALLA: nuevoMov.talla,
      TIPO_MOVIMIENTO: nuevoMov.tipoMovimiento,
      CANTIDAD: nuevoMov.cantidad,
      STOCK_ANTERIOR: nuevoMov.stockAnterior,
      STOCK_NUEVO: nuevoMov.stockNuevo,
      MOTIVO: nuevoMov.motivo,
      USUARIO: nuevoMov.usuario,
      NOTAS: nuevoMov.notas || "",
    });
  } catch (err) {
    // Si la tabla no existe en supabase, opera con respaldo local sin interrumpir al usuario
  }

  return nuevoMov;
}

// Generar código de barras sugerido
export async function generarCodigoBarrasSugerido(): Promise<string> {
  try {
    const articulos = await listarArticulos();
    const count = articulos.length + 1;
    const pad = String(count).padStart(4, "0");
    return `DISF-${pad}`;
  } catch {
    const random = Math.floor(1000 + Math.random() * 9000);
    return `DISF-${random}`;
  }
}

// ALIMENTAR INVENTARIO: Entrada de mercancía o nuevo traje
export interface DatosAlimentarInventario {
  idArticulo?: number;
  codBarras: string;
  descripcion: string;
  talla: string;
  cantidadIngreso: number;
  valorAlquiler: number;
  valorDeposito: number;
  tipoEntrada: "ENTRADA_COMPRA" | "ENTRADA_CONFECCION" | "ENTRADA_ALIMENTACION";
  motivo?: string;
  costoUnitario?: number;
  notas?: string;
  usuario: string;
}

export async function alimentarInventario(
  datos: DatosAlimentarInventario
): Promise<{ articulo: Articulo; movimiento: MovimientoInventario }> {
  // 1. Verificar si el artículo ya existe por ID o por Código de Barras
  let articuloExistente: Articulo | null = null;
  const lista = await listarArticulos();

  if (datos.idArticulo && datos.idArticulo > 0) {
    articuloExistente = lista.find((a) => a.IDARTICULO === datos.idArticulo) || null;
  } else if (datos.codBarras) {
    articuloExistente =
      lista.find((a) => a.CODBARRAS?.trim().toUpperCase() === datos.codBarras.trim().toUpperCase()) ||
      null;
  }

  const stockAnterior = articuloExistente ? Number(articuloExistente.STOCK || 0) : 0;
  const stockNuevo = stockAnterior + Number(datos.cantidadIngreso);

  const articuloParaGuardar: Partial<Articulo> = {
    IDARTICULO: articuloExistente ? articuloExistente.IDARTICULO : undefined,
    CODBARRAS: datos.codBarras.trim(),
    DESCRIPCION: datos.descripcion.trim().toUpperCase(),
    TALLA: (datos.talla || "ESTÁNDAR").trim().toUpperCase(),
    STOCK: stockNuevo,
    VALOR: Number(datos.valorAlquiler) || 0,
    VALORDEPOSITO: Number(datos.valorDeposito) || 0,
  };

  const articuloGuardado = await guardarArticulo(articuloParaGuardar);
  if (!articuloGuardado) {
    throw new Error("No se pudo guardar o actualizar el artículo en la base de datos.");
  }

  // 2. Registrar el movimiento en el Kardex
  const movimiento = await registrarMovimientoInventario({
    idArticulo: articuloGuardado.IDARTICULO,
    codBarras: articuloGuardado.CODBARRAS,
    descripcion: articuloGuardado.DESCRIPCION,
    talla: articuloGuardado.TALLA,
    tipoMovimiento: datos.tipoEntrada,
    cantidad: datos.cantidadIngreso,
    stockAnterior: stockAnterior,
    stockNuevo: stockNuevo,
    motivo: datos.motivo || `Entrada/Alimentación de ${datos.cantidadIngreso} unidad(es)`,
    usuario: datos.usuario,
    costoUnitario: datos.costoUnitario,
    precioAlquiler: datos.valorAlquiler,
    precioDeposito: datos.valorDeposito,
    notas: datos.notas,
  });

  return { articulo: articuloGuardado, movimiento };
}

// AJUSTE MANUAL DE STOCK (Corrección de inventario, merma, daño, etc.)
export interface DatosAjusteStock {
  idArticulo: number;
  nuevoStock: number;
  tipoAjuste: "AJUSTE_POSITIVO" | "AJUSTE_NEGATIVO" | "SALIDA_BAJA_DANO" | "SALIDA_PERDIDA";
  motivo: string;
  usuario: string;
  notas?: string;
}

export async function ajustarStockManual(
  datos: DatosAjusteStock
): Promise<{ articulo: Articulo; movimiento: MovimientoInventario }> {
  const lista = await listarArticulos();
  const articulo = lista.find((a) => a.IDARTICULO === datos.idArticulo);
  if (!articulo) {
    throw new Error("El artículo a ajustar no existe.");
  }

  const stockAnterior = Number(articulo.STOCK || 0);
  const stockNuevo = Number(datos.nuevoStock);
  const diferencia = stockNuevo - stockAnterior;

  const articuloActualizado = await guardarArticulo({
    ...articulo,
    STOCK: stockNuevo,
  });

  if (!articuloActualizado) {
    throw new Error("Error actualizando stock.");
  }

  const movimiento = await registrarMovimientoInventario({
    idArticulo: articuloActualizado.IDARTICULO,
    codBarras: articuloActualizado.CODBARRAS,
    descripcion: articuloActualizado.DESCRIPCION,
    talla: articuloActualizado.TALLA,
    tipoMovimiento: datos.tipoAjuste,
    cantidad: diferencia,
    stockAnterior: stockAnterior,
    stockNuevo: stockNuevo,
    motivo: datos.motivo,
    usuario: datos.usuario,
    precioAlquiler: articuloActualizado.VALOR,
    precioDeposito: articuloActualizado.VALORDEPOSITO,
    notas: datos.notas,
  });

  return { articulo: articuloActualizado, movimiento };
}

// Consultar Historial Completo de Movimientos con filtros
export async function listarMovimientosInventario(filtros?: {
  fechaDesde?: string;
  fechaHasta?: string;
  tipoMovimiento?: string;
  busqueda?: string;
}): Promise<MovimientoInventario[]> {
  let lista = obtenerMovimientosInventarioLocal();

  if (filtros) {
    if (filtros.fechaDesde) {
      const dDesde = new Date(filtros.fechaDesde).getTime();
      lista = lista.filter((m) => new Date(m.fecha).getTime() >= dDesde);
    }
    if (filtros.fechaHasta) {
      const dHasta = new Date(filtros.fechaHasta + "T23:59:59").getTime();
      lista = lista.filter((m) => new Date(m.fecha).getTime() <= dHasta);
    }
    if (filtros.tipoMovimiento && filtros.tipoMovimiento !== "TODOS") {
      lista = lista.filter((m) => m.tipoMovimiento === filtros.tipoMovimiento);
    }
    if (filtros.busqueda && filtros.busqueda.trim()) {
      const q = filtros.busqueda.toLowerCase().trim();
      lista = lista.filter(
        (m) =>
          m.descripcion.toLowerCase().includes(q) ||
          m.codBarras.toLowerCase().includes(q) ||
          m.motivo.toLowerCase().includes(q) ||
          m.usuario.toLowerCase().includes(q)
      );
    }
  }

  return lista;
}
