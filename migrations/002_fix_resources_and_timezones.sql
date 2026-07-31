-- ====================================================================
-- Migración 002: Actualización de Recursos y Zonas Horarias
-- ====================================================================

-- 1. Agregar las nuevas columnas a la tabla resources si no existen
ALTER TABLE resources 
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'external',
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN DEFAULT true;

-- 2. Asegurar que url puede ser nulo en caso de que se use file_path de supabase
ALTER TABLE resources ALTER COLUMN url DROP NOT NULL;

-- 3. Añadir la restricción CHECK para los valores permitidos de provider
-- Nota: Usamos DO block para atrapar la excepción si el constraint ya existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.constraint_column_usage 
        WHERE constraint_name = 'resources_provider_check'
    ) THEN
        ALTER TABLE resources 
        ADD CONSTRAINT resources_provider_check 
        CHECK (provider IN ('drive', 'youtube', 'supabase', 'external'));
    END IF;
END
$$;

-- 4. La columna class_date de class_sessions ya está configurada como
-- TIMESTAMP WITH TIME ZONE, por lo que no es necesario realizar una
-- migración para el manejo de hora en la base de datos.
