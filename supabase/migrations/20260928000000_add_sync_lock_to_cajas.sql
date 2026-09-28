-- Migración: BUG-01 fix — Agregar columnas de lock distribuido a la tabla CAJAS
-- Sincroniza la secuencia de IDCAJAS para evitar colisión de clave primaria (error 23505)

-- 1. Agregar columnas
ALTER TABLE "CAJAS"
  ADD COLUMN IF NOT EXISTS "SYNC_LOCK_AT" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "SYNC_LOCK_BY" TEXT;

-- 2. Índice único en NOMBRECAJA
CREATE UNIQUE INDEX IF NOT EXISTS idx_cajas_nombrecaja ON "CAJAS" ("NOMBRECAJA");

-- 3. Sincronizar la secuencia automática con el máximo ID actual
SELECT setval(
  pg_get_serial_sequence('"CAJAS"', 'IDCAJAS'),
  COALESCE((SELECT MAX("IDCAJAS") FROM "CAJAS"), 0) + 1,
  false
);

-- 4. Insertar el registro de semáforo con ID seguro
INSERT INTO "CAJAS" ("IDCAJAS", "NOMBRECAJA", "NUMERACION", "PREFIJO", "SYNC_LOCK_AT", "SYNC_LOCK_BY")
VALUES (
  COALESCE((SELECT MAX("IDCAJAS") FROM "CAJAS"), 0) + 1,
  'SYNC_LOCK_GLOBAL',
  0,
  'LOCK',
  '1970-01-01T00:00:00Z',
  ''
)
ON CONFLICT ("NOMBRECAJA") DO UPDATE
  SET "SYNC_LOCK_AT" = EXCLUDED."SYNC_LOCK_AT",
      "SYNC_LOCK_BY" = EXCLUDED."SYNC_LOCK_BY";

-- 5. Ajustar la secuencia por encima del valor insertado
SELECT setval(
  pg_get_serial_sequence('"CAJAS"', 'IDCAJAS'),
  COALESCE((SELECT MAX("IDCAJAS") FROM "CAJAS"), 1)
);

