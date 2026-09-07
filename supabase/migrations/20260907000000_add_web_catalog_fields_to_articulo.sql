-- ==========================================================
-- MIGRACIÓN: CAMPOS WEB Y FOTOS PARA ARTICULO
-- Añade soporte de catálogo web, fotos y disponibilidad
-- ==========================================================

DO $$ BEGIN
    ALTER TABLE "ARTICULO" ADD COLUMN IF NOT EXISTS "IMAGEN_URL" TEXT;
    ALTER TABLE "ARTICULO" ADD COLUMN IF NOT EXISTS "DISPONIBLE" BOOLEAN DEFAULT true;
    ALTER TABLE "ARTICULO" ADD COLUMN IF NOT EXISTS "CATEGORIA" VARCHAR(100) DEFAULT 'GENERAL';
    ALTER TABLE "ARTICULO" ADD COLUMN IF NOT EXISTS "DESTACADO" BOOLEAN DEFAULT false;
    ALTER TABLE "ARTICULO" ADD COLUMN IF NOT EXISTS "DESCRIPCION_WEB" TEXT;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Crear índices para acelerar búsquedas en el catálogo web
CREATE INDEX IF NOT EXISTS "WDIDX_ARTICULO_DISPONIBLE" ON "ARTICULO" ("DISPONIBLE");
CREATE INDEX IF NOT EXISTS "WDIDX_ARTICULO_CATEGORIA" ON "ARTICULO" ("CATEGORIA");
CREATE INDEX IF NOT EXISTS "WDIDX_ARTICULO_DESTACADO" ON "ARTICULO" ("DESTACADO");

-- Crear bucket de storage para fotos si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('articulos_fotos', 'articulos_fotos', true)
ON CONFLICT (id) DO NOTHING;

-- Política de lectura pública para el bucket articulos_fotos
DO $$ BEGIN
    DROP POLICY IF EXISTS "Public Access articulos_fotos" ON storage.objects;
    CREATE POLICY "Public Access articulos_fotos"
    ON storage.objects FOR SELECT
    TO anon, authenticated
    USING (bucket_id = 'articulos_fotos');

    DROP POLICY IF EXISTS "Upload Access articulos_fotos" ON storage.objects;
    CREATE POLICY "Upload Access articulos_fotos"
    ON storage.objects FOR INSERT
    TO anon, authenticated
    WITH CHECK (bucket_id = 'articulos_fotos');

    DROP POLICY IF EXISTS "Update Access articulos_fotos" ON storage.objects;
    CREATE POLICY "Update Access articulos_fotos"
    ON storage.objects FOR UPDATE
    TO anon, authenticated
    USING (bucket_id = 'articulos_fotos');
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;
