-- =========================================================================
-- MIGRACIÓN DE ÍNDICES DE RENDIMIENTO Y OPTIMIZACIÓN POS
-- Fecha: 2026-11-07
-- Propósito: Eliminar Seq Scans en búsquedas por código de factura, abonos y depósitos
-- =========================================================================

-- 1. Búsqueda directa de facturas por número (esencial para Punto de Venta, Devoluciones y Abonos)
CREATE INDEX IF NOT EXISTS "IDX_FACTURA_NUMEROFACT" 
ON "FACTURA" ("NUMEROFACT");

-- 2. Filtro de cierres de caja y arqueos diarios por fecha de recibo y salida
CREATE INDEX IF NOT EXISTS "IDX_FACTURA_FECHA_RECIBO" 
ON "FACTURA" ("FECHA_RECIBO");

CREATE INDEX IF NOT EXISTS "IDX_FACTURA_FECHASALIDA" 
ON "FACTURA" ("FECHASALIDA");

-- 3. Detalle de items de cada factura en CAMPOFACTURA (elimina cuellos de botella al cargar recibos)
CREATE INDEX IF NOT EXISTS "IDX_CAMPOFACTURA_NUMEROFACT" 
ON "CAMPOFACTURA" ("NUMEROFACT");

-- 4. Búsqueda rápida de abonos pertenecientes a una factura
CREATE INDEX IF NOT EXISTS "IDX_ABONO_CLIENTE_AFACTURA" 
ON "ABONO_CLIENTE" ("AFACTURA");

-- 5. Búsqueda de devoluciones de depósito por factura en caja
CREATE INDEX IF NOT EXISTS "IDX_DEPOSITOENTREGADO_NUMEROFACTURA" 
ON "depositoentregado" ("NUMEROFACTURA");

-- 6. Filtro de gastos de caja por fecha y número de factura
CREATE INDEX IF NOT EXISTS "IDX_GASTOS_NUMEROFACTURA" 
ON "gastos" ("NUMEROFACTURA");

CREATE INDEX IF NOT EXISTS "IDX_GASTOS_FECHA" 
ON "gastos" ("FECHA");

-- 7. Búsqueda de clientes por cédula
CREATE INDEX IF NOT EXISTS "IDX_CLIENTES_CEDULA" 
ON "CLIENTES" ("CEDULA");

-- 8. Búsqueda de artículos por código de barras
CREATE INDEX IF NOT EXISTS "IDX_ARTICULO_CODBARRAS" 
ON "ARTICULO" ("CODBARRAS");
