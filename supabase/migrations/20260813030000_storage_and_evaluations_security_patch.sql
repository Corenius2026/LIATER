-- ========================================================================================
-- MIGRACIÓN DE PARCHE DE SEGURIDAD: STORAGE, EVALUACIONES Y CONSTRAINTS
-- ========================================================================================
-- Archivo: supabase/migrations/20260813030000_storage_and_evaluations_security_patch.sql
-- ========================================================================================

-- ========================================================================================
-- 1. SEGURIDAD DE SUPABASE STORAGE (BUCKET 'program-covers')
-- ========================================================================================

-- Limpiar políticas previas para evitar colisiones
DROP POLICY IF EXISTS "program_covers_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Public Access program-covers" ON storage.objects;
DROP POLICY IF EXISTS "program_covers_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "program_covers_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "program_covers_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- 1.1 Lectura pública del bucket de portadas (necesario para ver los cursos)
CREATE POLICY "program_covers_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'program-covers');

-- 1.2 Solo Administradores autenticados pueden subir portadas
CREATE POLICY "program_covers_admin_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'program-covers'
  AND public.is_admin()
);

-- 1.3 Solo Administradores autenticados pueden modificar portadas
CREATE POLICY "program_covers_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'program-covers'
  AND public.is_admin()
)
WITH CHECK (
  bucket_id = 'program-covers'
  AND public.is_admin()
);

-- 1.4 Solo Administradores autenticados pueden eliminar portadas
CREATE POLICY "program_covers_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'program-covers'
  AND public.is_admin()
);


-- ========================================================================================
-- 2. INTEGRIDAD DE EVALUACIONES: QUIZZES Y SUBMISSIONS
-- ========================================================================================

-- Eliminar política permisiva previa (FOR ALL)
DROP POLICY IF EXISTS "quiz_submissions_student_manage_own" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_student_select_own" ON public.quiz_submissions;
DROP POLICY IF EXISTS "quiz_submissions_student_insert_own" ON public.quiz_submissions;

-- 2.1 El estudiante solo puede CONSULTAR sus propias entregas
CREATE POLICY "quiz_submissions_student_select_own"
ON public.quiz_submissions FOR SELECT
TO authenticated
USING (
  student_id = public.get_auth_profile_id()
);

-- 2.2 El estudiante solo puede INSERTAR una entrega propia para un quiz publicado de su programa
CREATE POLICY "quiz_submissions_student_insert_own"
ON public.quiz_submissions FOR INSERT
TO authenticated
WITH CHECK (
  student_id = public.get_auth_profile_id()
  AND public.get_auth_user_role() = 'student'
  AND EXISTS (
    SELECT 1 FROM public.quizzes q
    WHERE q.id = quiz_submissions.quiz_id
      AND q.is_published = true
      AND public.is_student_enrolled_in_program(q.program_id)
  )
);
-- NOTA: No se crea política de UPDATE ni DELETE para estudiantes en quiz_submissions.


-- ========================================================================================
-- 3. INTEGRIDAD DE ACTIVIDADES Y REFORZAMIENTOS (activity_attempts & attempt_answers)
-- ========================================================================================

DROP POLICY IF EXISTS "activity_attempts_student_update_own" ON public.activity_attempts;
DROP POLICY IF EXISTS "attempt_answers_student_insert_own" ON public.attempt_answers;

-- 3.1 El estudiante solo puede actualizar un intento si este se encuentra en estado 'in_progress'
CREATE POLICY "activity_attempts_student_update_own"
ON public.activity_attempts FOR UPDATE
TO authenticated
USING (
  public.get_auth_user_role() = 'student'
  AND student_id = public.get_auth_profile_id()
  AND status = 'in_progress'
)
WITH CHECK (
  public.get_auth_user_role() = 'student'
  AND student_id = public.get_auth_profile_id()
);

-- 3.2 El estudiante solo puede insertar respuestas si el intento le pertenece y está en curso o completado
CREATE POLICY "attempt_answers_student_insert_own"
ON public.attempt_answers FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.activity_attempts aa
    WHERE aa.id = attempt_answers.attempt_id
      AND aa.student_id = public.get_auth_profile_id()
      AND (aa.status = 'in_progress' OR aa.status = 'completed')
  )
);


-- ========================================================================================
-- 4. CONTROL DE ANUNCIOS POR ROL DE DESTINO (target_role)
-- ========================================================================================

DROP POLICY IF EXISTS "announcements_student_read" ON public.announcements;

CREATE POLICY "announcements_student_read"
ON public.announcements FOR SELECT
TO authenticated
USING (
  (target_role IS NULL OR target_role = 'all' OR target_role = 'student')
  AND (
    program_id IS NULL
    OR public.is_student_enrolled_in_program(program_id)
  )
);


-- ========================================================================================
-- 5. CONSTRAINTS E ÍNDICES DE BASE DE DATOS
-- ========================================================================================

-- Evitar inscripciones duplicadas de un estudiante en el mismo programa
CREATE UNIQUE INDEX IF NOT EXISTS idx_enrollments_student_program_unique 
ON public.enrollments (student_id, program_id) 
WHERE program_id IS NOT NULL;

-- Índices de optimización de consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_class_sessions_program_id ON public.class_sessions (program_id);
CREATE INDEX IF NOT EXISTS idx_class_sessions_teacher_id ON public.class_sessions (teacher_id);
CREATE INDEX IF NOT EXISTS idx_activity_attempts_student_id ON public.activity_attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_activity_attempts_activity_id ON public.activity_attempts (activity_id);
CREATE INDEX IF NOT EXISTS idx_announcements_program_id ON public.announcements (program_id);
