-- Migración 006: Reestructuración de Subtemas a Sesiones
-- Jerarquía:
-- Diplomados: Diplomado -> Módulos -> Sesiones -> Clases
-- Cursos: Curso -> Sesiones -> Clases

-- 1. Renombrar tabla subtopics a sessions si existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subtopics') THEN
    ALTER TABLE public.subtopics RENAME TO sessions;
  END IF;
END $$;

-- 2. Asegurar que module_id en sessions pueda ser NULL (para Cursos que no usan módulos)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sessions' AND column_name = 'module_id') THEN
    ALTER TABLE public.sessions ALTER COLUMN module_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Renombrar columna subtopic_id a session_id en class_sessions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'class_sessions' AND column_name = 'subtopic_id') THEN
    ALTER TABLE public.class_sessions RENAME COLUMN subtopic_id TO session_id;
  END IF;
END $$;

-- 4. Actualizar constraints y nombres de claves foráneas
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subtopics_pkey') THEN
    ALTER TABLE public.sessions RENAME CONSTRAINT subtopics_pkey TO sessions_pkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subtopics_module_id_fkey') THEN
    ALTER TABLE public.sessions RENAME CONSTRAINT subtopics_module_id_fkey TO sessions_module_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'subtopics_program_id_fkey') THEN
    ALTER TABLE public.sessions RENAME CONSTRAINT subtopics_program_id_fkey TO sessions_program_id_fkey;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'class_sessions_subtopic_id_fkey') THEN
    ALTER TABLE public.class_sessions RENAME CONSTRAINT class_sessions_subtopic_id_fkey TO class_sessions_session_id_fkey;
  END IF;
END $$;

-- 5. Crear vista de compatibilidad 'subtopics' para transiciones suaves
CREATE OR REPLACE VIEW public.subtopics AS
  SELECT id, module_id, title, description, order_index, created_at, program_id
  FROM public.sessions;

-- 6. Otorgar permisos sobre sessions y la vista subtopics
GRANT ALL ON TABLE public.sessions TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.class_sessions TO postgres, service_role, authenticated, anon;
GRANT ALL ON TABLE public.subtopics TO postgres, service_role, authenticated, anon;
