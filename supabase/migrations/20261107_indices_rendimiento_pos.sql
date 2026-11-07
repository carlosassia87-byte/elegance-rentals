-- =========================================================================
-- MIGRACIÓN DE ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN POS (CORREGIDO)
-- Fecha: 2026-11-07
-- =========================================================================

-- 1. Búsqueda directa de facturas por número
CREATE INDEX IF NOT EXISTS "IDX_FACTURA_NUMEROFACT" 
ON "FACTURA" ("NUMEROFACT");

-- 2. Filtro de cierres de caja y arqueos diarios por fecha
CREATE INDEX IF NOT EXISTS "IDX_FACTURA_FECHA_RECIBO" 
ON "FACTURA" ("FECHA_RECIBO");

CREATE INDEX IF NOT EXISTS "IDX_FACTURA_FECHASALIDA" 
ON "FACTURA" ("FECHASALIDA");

-- 3. Detalle de items de cada factura en CAMPOFACTURA
CREATE INDEX IF NOT EXISTS "IDX_CAMPOFACTURA_NUMEROFACT" 
ON "CAMPOFACTURA" ("NUMEROFACT");

-- 4. Búsqueda rápida de abonos pertenecientes a una factura
CREATE INDEX IF NOT EXISTS "IDX_ABONO_CLIENTE_AFACTURA" 
ON "ABONO_CLIENTE" ("AFACTURA");

-- 5. Búsqueda de devoluciones de depósito por factura en caja
CREATE INDEX IF NOT EXISTS "IDX_DEPOSITOENTREGADO_NUMEROFACTURA" 
ON "depositoentregado" ("NUMEROFACTURA");

-- 6. Filtro de gastos de caja por fecha y número de gasto (en gastos la columna es NUMEROGASTO)
CREATE INDEX IF NOT EXISTS "IDX_GASTOS_NUMEROGASTO" 
ON "gastos" ("NUMEROGASTO");

CREATE INDEX IF NOT EXISTS "IDX_GASTOS_FECHA" 
ON "gastos" ("FECHA");

-- 7. Búsqueda de clientes por cédula
CREATE INDEX IF NOT EXISTS "IDX_CLIENTES_CEDULA" 
ON "CLIENTES" ("CEDULA");

-- 8. Búsqueda de artículos por código de barras
CREATE INDEX IF NOT EXISTS "IDX_ARTICULO_CODBARRAS" 
ON "ARTICULO" ("CODBARRAS");
