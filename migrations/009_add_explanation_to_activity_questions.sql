-- Migración 009: Agregar columnas de explicación y sustento pedagógico a la tabla activity_questions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_questions') THEN
    ALTER TABLE public.activity_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
    ALTER TABLE public.activity_questions ADD COLUMN IF NOT EXISTS source_basis TEXT;
  END IF;
END $$;
