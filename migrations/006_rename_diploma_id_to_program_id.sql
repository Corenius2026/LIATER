-- ====================================================================
-- Migración 006: Estandarización de columnas de diploma_id a program_id
-- ====================================================================

-- 1. Renombrar columna diploma_id a program_id en la tabla enrollments (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'diploma_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'enrollments' AND column_name = 'program_id'
    ) THEN
        ALTER TABLE enrollments RENAME COLUMN diploma_id TO program_id;
    END IF;
END $$;

-- 2. Renombrar columna diploma_id a program_id en la tabla modules (si existe)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'diploma_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'modules' AND column_name = 'program_id'
    ) THEN
        ALTER TABLE modules RENAME COLUMN diploma_id TO program_id;
    END IF;
END $$;

-- 3. Índices para optimizar búsquedas por program_id
CREATE INDEX IF NOT EXISTS idx_enrollments_program_id ON enrollments(program_id);
CREATE INDEX IF NOT EXISTS idx_modules_program_id ON modules(program_id);
