-- ==============================================================================
-- SCRIPT COMPLETO DE BASE DE DATOS: PUNTO DE VENTA Y ALQUILER DE VESTIDOS
-- Esquema compatible con WinDev (CLIENTES.wda) y Supabase / PostgreSQL
-- ==============================================================================

-- 1. EXTENSIONES BÁSICAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. TABLA: EMPRESA_CONFIG / EMPRESA
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "EMPRESA_CONFIG" (
    "ID" INTEGER PRIMARY KEY DEFAULT 1,
    "NOMBRE_COMERCIAL" VARCHAR(100) DEFAULT 'LA CASA DEL DISFRAZ',
    "RAZON_SOCIAL" VARCHAR(100) DEFAULT 'LA CASA DEL DISFRAZ S.A.S.',
    "NIT" VARCHAR(50) DEFAULT '900.123.456-7',
    "DIRECCION" VARCHAR(150) DEFAULT 'Calle Principal # 10 - 25',
    "CIUDAD" VARCHAR(100) DEFAULT 'Cali, Colombia',
    "TELEFONO1" VARCHAR(50) DEFAULT '315 123 4567',
    "TELEFONO2" VARCHAR(50) DEFAULT '320 765 4321',
    "EMAIL" VARCHAR(100) DEFAULT 'contacto@lacasadeldisfraz.com',
    "REGIMEN" VARCHAR(100) DEFAULT 'Régimen Simplificado / No Responsable de IVA',
    "MENSAJE_PIE" TEXT DEFAULT '¡Gracias por su preferencia! Conserve este recibo para la devolución de su prenda y depósito.',
    "TERMINOS" TEXT DEFAULT 'El traje debe ser devuelto en la fecha pactada en perfecto estado. Todo retraso causará cobro adicional por día.',
    "LOGO_URL" TEXT,
    "MONEDA" VARCHAR(10) DEFAULT 'COP',
    "SIMBOLO_MONEDA" VARCHAR(10) DEFAULT '$',
    "DIAS_ALQUILER" INTEGER DEFAULT 3
);

-- ==============================================================================
-- 3. TABLA: CAJAS (MULTI-CAJAS Y NUMERACIÓN)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "CAJAS" (
    "IDCAJAS" SERIAL8 PRIMARY KEY,
    "NOMBRECAJA" VARCHAR(50) UNIQUE,
    "RESOLUCION" VARCHAR(50) DEFAULT '1366x768',
    "NUMERACION" INTEGER DEFAULT 0,
    "PREFIJO" VARCHAR(50) DEFAULT 'G'
);

-- ==============================================================================
-- 4. TABLA: LOGIN (USUARIOS Y CAJEROS DEL POS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "LOGIN" (
    "IDLOGIN" SERIAL8 PRIMARY KEY,
    "INOMBRE" VARCHAR(50),
    "IAPELLIDO" VARCHAR(50),
    "ILOGIN" INTEGER UNIQUE DEFAULT 0,
    "PASSWORD" VARCHAR(50),
    "TIPO" BOOL DEFAULT false,
    "ACCESOALMENU" BOOL DEFAULT true
);

-- ==============================================================================
-- 5. TABLA: CLIENTES
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "CLIENTES" (
    "IDCLIENTES" SERIAL8 PRIMARY KEY,
    "CEDULA" BIGINT DEFAULT 0,
    "DIRECCION" VARCHAR(100),
    "TELEFONO" VARCHAR(50) DEFAULT '0',
    "TELEFONO2" VARCHAR(50),
    "EMPRESA" VARCHAR(100),
    "DIRECCIONEMP" VARCHAR(100),
    "NOMBRE" VARCHAR(100),
    "SALDO" NUMERIC(24,6) DEFAULT 0,
    "NOTA" VARCHAR(2000)
);
CREATE INDEX IF NOT EXISTS "WDIDX_CLIENTES_CEDULA" ON "CLIENTES" ("CEDULA");
CREATE INDEX IF NOT EXISTS "WDIDX_CLIENTES_NOMBRE" ON "CLIENTES" ("NOMBRE");

-- ==============================================================================
-- 6. TABLA: ARTICULO (TRAJES, VESTIDOS Y DISFRACES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "ARTICULO" (
    "IDARTICULO" SERIAL8 PRIMARY KEY,
    "DESCRIPCION" VARCHAR(250),
    "TALLA" VARCHAR(50),
    "STOCK" INTEGER DEFAULT 0,
    "VALOR" NUMERIC(24,6) DEFAULT 0,
    "CODBARRAS" VARCHAR(50),
    "IDCAMPOFACTURA" BIGINT DEFAULT 0,
    "VALORDEPOSITO" NUMERIC(24,6) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "WDIDX_ARTICULO_DESCRIPCION" ON "ARTICULO" ("DESCRIPCION");
CREATE INDEX IF NOT EXISTS "WDIDX_ARTICULO_CODBARRAS" ON "ARTICULO" ("CODBARRAS");

-- ==============================================================================
-- 7. TABLA: FACTURA (CABECERA DE FACTURAS Y ALQUILERES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "FACTURA" (
    "IDFACTURA" SERIAL8 PRIMARY KEY,
    "NUMEROFACT" VARCHAR(50) UNIQUE DEFAULT '0',
    "FECHASALIDA" DATE,
    "FECHAENTRADA" DATE,
    "FTOTALDEPOSITO" NUMERIC(24,6) DEFAULT 0,
    "FTOTALVENTADEPOSITO" NUMERIC(24,6) DEFAULT 0,
    "FORMAPAGO" VARCHAR(50) DEFAULT 'EFECTIVO',
    "MODO" VARCHAR(50) DEFAULT 'ALQUILER',
    "VENDEDOR" VARCHAR(50),
    "CCLIENTE" VARCHAR(100),
    "CAMBIOS" NUMERIC(24,6) DEFAULT 0,
    "PAGACON" NUMERIC(24,6) DEFAULT 0,
    "AUTOMATIC" BIGINT DEFAULT 0,
    "IDFCLIENTES" BIGINT DEFAULT 0,
    "ESTADOCLIENTE" VARCHAR(50) DEFAULT 'EN ALQUILER',
    "IDF_PAGO" BIGINT DEFAULT 0,
    "CDIRECCION" VARCHAR(100),
    "CTELEFONO" VARCHAR(50),
    "CTELEFONO1" VARCHAR(50),
    "CEMPRESA" VARCHAR(100),
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
CREATE INDEX IF NOT EXISTS "WDIDX_FACTURA_NUMEROFACT" ON "FACTURA" ("NUMEROFACT");
CREATE INDEX IF NOT EXISTS "WDIDX_FACTURA_CCEDULA" ON "FACTURA" ("CCEDULA");

-- ==============================================================================
-- 8. TABLA: CAMPOFACTURA (DETALLE DE ÍTEMS ALQUILADOS)
-- ==============================================================================
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
CREATE INDEX IF NOT EXISTS "WDIDX_CAMPOFACTURA_IDFACTURA" ON "CAMPOFACTURA" ("IDFACTURA");
CREATE INDEX IF NOT EXISTS "WDIDX_CAMPOFACTURA_NUMEROFACT" ON "CAMPOFACTURA" ("NUMEROFACT");

-- ==============================================================================
-- 9. TABLA: ABONO_CLIENTE (PAGOS Y ABONOS A FACTURAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "ABONO_CLIENTE" (
    "IDABONO_CLIENTE" SERIAL8 PRIMARY KEY,
    "NUMEROABONO" VARCHAR(50),
    "ACLIENTE" VARCHAR(100),
    "AFACTURA" VARCHAR(50),
    "PAGOEFECTIVO" NUMERIC(24,6) DEFAULT 0,
    "PAGOTRANFE" NUMERIC(24,6) DEFAULT 0,
    "FECHAABONO" DATE,
    "SALDOANTERIOR" NUMERIC(24,6) DEFAULT 0,
    "SALDODEBER" NUMERIC(24,6) DEFAULT 0,
    "TOTAL_ABONO" NUMERIC(24,6) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "WDIDX_ABONO_AFACTURA" ON "ABONO_CLIENTE" ("AFACTURA");

-- ==============================================================================
-- 10. TABLA: DEPOSITOENTREGADO (DEVOLUCIONES DE FIANZAS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "depositoentregado" (
    "IDdepositoentregado" SERIAL8 PRIMARY KEY,
    "NUMEROFACTURA" VARCHAR(50),
    "VALOR" NUMERIC(24,6) DEFAULT 0,
    "FECHA" DATE
);

-- ==============================================================================
-- 11. TABLA: GASTOS (SALIDAS DE CAJA)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "gastos" (
    "IDgastos" SERIAL8 PRIMARY KEY,
    "DESCRIPCIONSALIDA" VARCHAR(200),
    "FECHA" DATE,
    "VALORSALIDA" VARCHAR(50),
    "NUMEROGASTO" VARCHAR(50) UNIQUE
);

-- ==============================================================================
-- 12. TABLA: MOVIMIENTOS_INVENTARIO (KARDEX, ENTRADAS, SALIDAS Y AJUSTES)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS "MOVIMIENTOS_INVENTARIO" (
    "IDMOVIMIENTO" SERIAL8 PRIMARY KEY,
    "FECHA" TIMESTAMPTZ DEFAULT NOW(),
    "IDARTICULO" BIGINT REFERENCES "ARTICULO"("IDARTICULO") ON DELETE SET NULL,
    "CODBARRAS" VARCHAR(50),
    "DESCRIPCION" VARCHAR(250),
    "TALLA" VARCHAR(50),
    "TIPO_MOVIMIENTO" VARCHAR(50), -- ENTRADA_ALIMENTACION, ENTRADA_COMPRA, ENTRADA_DEVOLUCION, SALIDA_ALQUILER, SALIDA_VENTA, AJUSTE_POSITIVO, AJUSTE_NEGATIVO, SALIDA_BAJA_DANO
    "CANTIDAD" INTEGER NOT NULL DEFAULT 1,
    "STOCK_ANTERIOR" INTEGER DEFAULT 0,
    "STOCK_NUEVO" INTEGER DEFAULT 0,
    "MOTIVO" VARCHAR(255),
    "USUARIO" VARCHAR(100) DEFAULT 'ADMINISTRADOR',
    "NOTAS" TEXT
);
CREATE INDEX IF NOT EXISTS "WDIDX_MOV_INV_FECHA" ON "MOVIMIENTOS_INVENTARIO" ("FECHA");
CREATE INDEX IF NOT EXISTS "WDIDX_MOV_INV_CODBARRAS" ON "MOVIMIENTOS_INVENTARIO" ("CODBARRAS");
CREATE INDEX IF NOT EXISTS "WDIDX_MOV_INV_TIPO" ON "MOVIMIENTOS_INVENTARIO" ("TIPO_MOVIMIENTO");

-- ==============================================================================
-- 12. DATOS INICIALES POR DEFECTO (SEEDS)
-- ==============================================================================

-- Cajas
INSERT INTO "CAJAS" ("IDCAJAS", "NOMBRECAJA", "NUMERACION", "PREFIJO", "RESOLUCION")
VALUES
    (1, 'SERVIDOR', 124, 'G', '1366x768'),
    (2, 'CAJA 2', 50, 'POS2-', '1366x768'),
    (3, 'CAJA 3', 10, 'POS3-', '1366x768')
ON CONFLICT ("NOMBRECAJA") DO NOTHING;

-- Usuarios de Cajero
INSERT INTO "LOGIN" ("IDLOGIN", "INOMBRE", "IAPELLIDO", "ILOGIN", "PASSWORD", "TIPO", "ACCESOALMENU")
VALUES
    (1, 'ADMINISTRADOR', 'PRINCIPAL', 101, '1234', true, true),
    (2, 'CAJERO 1', 'MOSTRADOR', 102, '1234', false, true),
    (3, 'CAJERO 2', 'VESTIDORES', 103, '1234', false, true)
ON CONFLICT ("ILOGIN") DO NOTHING;

-- Configuración de Empresa
INSERT INTO "EMPRESA_CONFIG" ("ID", "NOMBRE_COMERCIAL", "RAZON_SOCIAL", "NIT", "DIRECCION", "CIUDAD", "TELEFONO1", "TELEFONO2", "EMAIL", "REGIMEN", "MENSAJE_PIE", "TERMINOS", "MONEDA", "SIMBOLO_MONEDA", "DIAS_ALQUILER")
VALUES
    (1, 'LA CASA DEL DISFRAZ', 'LA CASA DEL DISFRAZ S.A.S.', '900.123.456-7', 'Calle Principal # 10 - 25', 'Cali, Colombia', '315 123 4567', '320 765 4321', 'contacto@lacasadeldisfraz.com', 'Régimen Simplificado / No Responsable de IVA', '¡Gracias por su preferencia! Conserve este recibo para la devolución de su prenda y depósito.', 'El traje debe ser devuelto en la fecha pactada en perfecto estado. Todo retraso causará cobro adicional por día.', 'COP', '$', 3)
ON CONFLICT ("ID") DO NOTHING;

-- Artículos de Ejemplo
INSERT INTO "ARTICULO" ("IDARTICULO", "DESCRIPCION", "TALLA", "STOCK", "VALOR", "CODBARRAS", "VALORDEPOSITO")
VALUES
    (1, 'ALICIA EN EL PAÍS DE LAS MARAVILLAS NIÑA EN ALQUILER VESTIDO TUTU', '8', 3, 75000, '1001', 35000),
    (2, 'MUSULMÁN BLANCO ALQUI BATA GORRO MUSULMAN CUADROS ROJO CON', 'M', 4, 65000, '1002', 30000),
    (3, 'TRAJE DE SALSANIÑO: CAMISA, PANTALÓN', '10', 5, 70000, '1003', 35000),
    (4, 'TRAJE DE SALSANIÑA: VESTIDO, GUANTES, PEINETA', '8', 2, 80000, '1004', 40000),
    (5, 'PIRATANIÑO: PANTALÓN, CAMISA, CHAQUETACINTURÓN, SOBREBOTAS, SOMBRERO', '12', 4, 85000, '1538', 40000),
    (6, 'MAGO NIÑO: PANTALÓN, CAMISA, CHAQUETÍN, CORBATÍN CINTURÓN, CAPA', '10', 3, 75000, '1006', 35000)
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- 13. PERMISOS Y ROLES EN SUPABASE (Acceso público y autenticado)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated;
