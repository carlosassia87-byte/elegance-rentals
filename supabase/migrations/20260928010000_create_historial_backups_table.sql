-- ==============================================================================
-- TABLA: historial_backups (Auditoría de Copias de Seguridad del POS)
-- Soporta backups locales, automáticos por cron nocturno, Google Drive y Vault
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.historial_backups (
    id SERIAL8 PRIMARY KEY,
    fecha TIMESTAMPTZ DEFAULT now(),
    tipo VARCHAR(50) NOT NULL DEFAULT 'MANUAL_LOCAL', -- MANUAL_LOCAL, CRON_AUTO, GOOGLE_DRIVE, CLOUD_VAULT
    nombre_archivo VARCHAR(255) NOT NULL,
    tamano_bytes BIGINT DEFAULT 0,
    total_tablas INTEGER DEFAULT 0,
    total_registros INTEGER DEFAULT 0,
    detalles JSONB DEFAULT '{}'::jsonb,
    estado VARCHAR(50) DEFAULT 'EXITOSO', -- EXITOSO, ERROR
    mensaje_error TEXT,
    usuario_ejecutor VARCHAR(100) DEFAULT 'ADMINISTRADOR',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_historial_backups_fecha ON public.historial_backups (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_historial_backups_tipo ON public.historial_backups (tipo);
CREATE INDEX IF NOT EXISTS idx_historial_backups_estado ON public.historial_backups (estado);

-- RLS y Políticas de acceso abierto para terminales del POS
ALTER TABLE public.historial_backups ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_backups' AND policyname = 'Permitir lectura publica a historial_backups'
    ) THEN
        CREATE POLICY "Permitir lectura publica a historial_backups" 
        ON public.historial_backups FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_backups' AND policyname = 'Permitir insercion a historial_backups'
    ) THEN
        CREATE POLICY "Permitir insercion a historial_backups" 
        ON public.historial_backups FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_backups' AND policyname = 'Permitir actualizacion a historial_backups'
    ) THEN
        CREATE POLICY "Permitir actualizacion a historial_backups" 
        ON public.historial_backups FOR UPDATE USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'historial_backups' AND policyname = 'Permitir borrado a historial_backups'
    ) THEN
        CREATE POLICY "Permitir borrado a historial_backups" 
        ON public.historial_backups FOR DELETE USING (true);
    END IF;
END $$;
