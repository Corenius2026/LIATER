-- Migration: Permitir a estudiantes eliminar sus propias dudas cuando están en estado 'enviada'
-- Fecha: 2026-10-02

DROP POLICY IF EXISTS "class_doubts_student_delete_own" ON public.class_doubts;

CREATE POLICY "class_doubts_student_delete_own"
  ON public.class_doubts FOR DELETE
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND status = 'enviada'
  );
