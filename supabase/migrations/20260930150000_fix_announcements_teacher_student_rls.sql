-- ========================================================================================
-- MIGRACIÓN: Corrección Definitiva de RLS para Anuncios (announcements)
-- Resuelve:
-- 1. Anuncios para profesores (target_role = 'teacher') invisibles para los docentes.
-- 2. Anuncios para estudiantes (target_role = 'student') que se filtraban hacia los docentes.
-- ========================================================================================

-- 1. Eliminar políticas anteriores en public.announcements
DROP POLICY IF EXISTS "announcements_admin_all" ON public.announcements;
DROP POLICY IF EXISTS "announcements_teacher_manage" ON public.announcements;
DROP POLICY IF EXISTS "announcements_student_read" ON public.announcements;
DROP POLICY IF EXISTS "announcements_teacher_read" ON public.announcements;

-- Asegurar RLS habilitado
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- 2. Asegurar que target_role tenga restricción correcta
ALTER TABLE public.announcements 
  ADD COLUMN IF NOT EXISTS target_role VARCHAR(20) DEFAULT 'all';

-- 3. Actualizar función helper is_teacher_in_program para contemplar teacher_profiles y users_profile
CREATE OR REPLACE FUNCTION public.is_teacher_in_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.class_sessions cs
    WHERE cs.program_id = p_program_id
      AND (
        cs.teacher_id = public.get_auth_teacher_id()
        OR cs.teacher_id = public.get_auth_profile_id()
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.program_id = p_program_id
      AND e.student_id = public.get_auth_profile_id()
  );
$$;

-- 4. Administradores: Acceso total (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 5. Profesores: Gestión de sus propios anuncios en sus programas
CREATE POLICY "announcements_teacher_manage"
  ON public.announcements FOR ALL
  TO authenticated
  USING (
    public.get_auth_user_role() = 'teacher'
    AND teacher_id IS NOT NULL 
    AND teacher_id = public.get_auth_teacher_id()
  )
  WITH CHECK (
    public.get_auth_user_role() = 'teacher'
    AND teacher_id IS NOT NULL 
    AND teacher_id = public.get_auth_teacher_id()
  );

-- 6. Estudiantes: Lectura de anuncios dirigidos a estudiantes o toda la escuela
-- Excluye estrictamente anuncios dirigidos exclusivamente a profesores ('teacher')
CREATE POLICY "announcements_student_read"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    public.get_auth_user_role() = 'student'
    AND (target_role IS NULL OR target_role = 'all' OR target_role = 'student')
    AND (
      program_id IS NULL
      OR public.is_student_enrolled_in_program(program_id)
    )
  );

-- 7. Profesores: Lectura de comunicados de administración y del programa dirigidos a profesores o todos
-- Permite que los docentes vean anuncios institucionales (teacher_id IS NULL)
-- Excluye estrictamente avisos institucionales dirigidos exclusivamente a estudiantes ('student')
CREATE POLICY "announcements_teacher_read"
  ON public.announcements FOR SELECT
  TO authenticated
  USING (
    public.get_auth_user_role() = 'teacher'
    AND (target_role IS NULL OR target_role = 'all' OR target_role = 'teacher')
    AND (
      program_id IS NULL
      OR public.is_teacher_in_program(program_id)
    )
  );
