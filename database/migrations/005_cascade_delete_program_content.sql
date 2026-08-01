-- ====================================================================
-- Migración 005: Borrado en Cascada para Contenido de Programas
-- ====================================================================

-- 1. Asegurar ON DELETE CASCADE en la relación modules -> diploma_programs
ALTER TABLE IF EXISTS modules
  DROP CONSTRAINT IF EXISTS modules_diploma_id_fkey,
  ADD CONSTRAINT modules_diploma_id_fkey
    FOREIGN KEY (diploma_id) REFERENCES diploma_programs(id) ON DELETE CASCADE;

-- 2. Asegurar ON DELETE CASCADE en subtopics -> modules
ALTER TABLE IF EXISTS subtopics
  DROP CONSTRAINT IF EXISTS subtopics_module_id_fkey,
  ADD CONSTRAINT subtopics_module_id_fkey
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE;

-- 3. Asegurar ON DELETE CASCADE en class_sessions -> subtopics / diploma_programs
ALTER TABLE IF EXISTS class_sessions
  DROP CONSTRAINT IF EXISTS class_sessions_subtopic_id_fkey,
  ADD CONSTRAINT class_sessions_subtopic_id_fkey
    FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'class_sessions' AND column_name = 'program_id'
    ) THEN
        ALTER TABLE class_sessions
          DROP CONSTRAINT IF EXISTS class_sessions_program_id_fkey,
          ADD CONSTRAINT class_sessions_program_id_fkey
            FOREIGN KEY (program_id) REFERENCES diploma_programs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 4. Asegurar ON DELETE CASCADE en enrollments -> diploma_programs
ALTER TABLE IF EXISTS enrollments
  DROP CONSTRAINT IF EXISTS enrollments_diploma_id_fkey,
  ADD CONSTRAINT enrollments_diploma_id_fkey
    FOREIGN KEY (diploma_id) REFERENCES diploma_programs(id) ON DELETE CASCADE;

-- 5. Asegurar ON DELETE CASCADE en assignments -> diploma_programs
ALTER TABLE IF EXISTS assignments
  DROP CONSTRAINT IF EXISTS assignments_program_id_fkey,
  ADD CONSTRAINT assignments_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES diploma_programs(id) ON DELETE CASCADE;

-- 6. Asegurar ON DELETE CASCADE en quizzes -> diploma_programs
ALTER TABLE IF EXISTS quizzes
  DROP CONSTRAINT IF EXISTS quizzes_program_id_fkey,
  ADD CONSTRAINT quizzes_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES diploma_programs(id) ON DELETE CASCADE;
