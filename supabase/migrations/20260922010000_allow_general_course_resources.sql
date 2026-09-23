-- ============================================================================
-- Migración: Permitir recursos generales de programa/curso (no por clase)
-- Tabla: public.resources
-- ============================================================================

-- 1. Permitir que class_id sea nulo cuando el recurso pertenece a nivel de curso/programa
ALTER TABLE public.resources ALTER COLUMN class_id DROP NOT NULL;

-- 2. Asegurar columna description si no existe
ALTER TABLE public.resources ADD COLUMN IF NOT EXISTS description text;

-- 3. Asegurar tipos permitidos en resource_type (incluyendo code)
ALTER TABLE public.resources DROP CONSTRAINT IF EXISTS resources_resource_type_check;
ALTER TABLE public.resources ADD CONSTRAINT resources_resource_type_check 
  CHECK (resource_type::text = ANY (ARRAY['presentation'::text, 'pdf'::text, 'link'::text, 'video'::text, 'file'::text, 'code'::text]));

-- 4. Asegurar índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_resources_program_id ON public.resources(program_id);
CREATE INDEX IF NOT EXISTS idx_resources_class_id ON public.resources(class_id);

-- 3. Actualizar política de profesores para gestionar tanto recursos de sus clases como recursos generales del programa donde enseñan
DROP POLICY IF EXISTS "resources_teacher_manage" ON public.resources;
CREATE POLICY "resources_teacher_manage"
  ON public.resources FOR ALL
  USING (
    (resources.class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = resources.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    ))
    OR
    (resources.program_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.program_id = resources.program_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    ))
    OR
    public.is_admin()
  )
  WITH CHECK (
    (resources.class_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = resources.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    ))
    OR
    (resources.program_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.program_id = resources.program_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    ))
    OR
    public.is_admin()
  );

-- 4. Actualizar política de lectura para estudiantes (incluyendo recursos generales)
DROP POLICY IF EXISTS "resources_student_read" ON public.resources;
CREATE POLICY "resources_student_read"
  ON public.resources FOR SELECT
  USING (
    is_visible = true
    AND (
      (program_id IS NOT NULL AND public.is_student_enrolled_in_program(program_id))
      OR
      (class_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.class_sessions cs
        WHERE cs.id = resources.class_id
          AND public.is_student_enrolled_in_program(cs.program_id)
      ))
      OR
      public.is_admin()
    )
  );

-- 5. Recargar schema cache de PostgREST
NOTIFY pgrst, 'reload schema';
