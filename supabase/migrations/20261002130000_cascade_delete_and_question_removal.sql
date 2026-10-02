-- Migration: Cascade delete and secure removal for activity questions and drafts
-- Date: 2026-10-02

-- 1. Actualizar claves foráneas para cascada automática al eliminar preguntas
ALTER TABLE public.question_options 
  DROP CONSTRAINT IF EXISTS question_options_question_id_fkey;
ALTER TABLE public.question_options 
  ADD CONSTRAINT question_options_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES public.activity_questions(id) ON DELETE CASCADE;

ALTER TABLE public.question_correct_answers 
  DROP CONSTRAINT IF EXISTS question_correct_answers_question_id_fkey;
ALTER TABLE public.question_correct_answers 
  ADD CONSTRAINT question_correct_answers_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES public.activity_questions(id) ON DELETE CASCADE;

ALTER TABLE public.question_correct_answers 
  DROP CONSTRAINT IF EXISTS question_correct_answers_correct_option_id_fkey;
ALTER TABLE public.question_correct_answers 
  ADD CONSTRAINT question_correct_answers_correct_option_id_fkey 
  FOREIGN KEY (correct_option_id) REFERENCES public.question_options(id) ON DELETE CASCADE;

ALTER TABLE public.attempt_answers 
  DROP CONSTRAINT IF EXISTS attempt_answers_question_id_fkey;
ALTER TABLE public.attempt_answers 
  ADD CONSTRAINT attempt_answers_question_id_fkey 
  FOREIGN KEY (question_id) REFERENCES public.activity_questions(id) ON DELETE CASCADE;

ALTER TABLE public.attempt_answers 
  DROP CONSTRAINT IF EXISTS attempt_answers_selected_option_id_fkey;
ALTER TABLE public.attempt_answers 
  ADD CONSTRAINT attempt_answers_selected_option_id_fkey 
  FOREIGN KEY (selected_option_id) REFERENCES public.question_options(id) ON DELETE CASCADE;

-- 2. Habilitar política de eliminación para docentes en attempt_answers
DROP POLICY IF EXISTS "attempt_answers_teacher_delete" ON public.attempt_answers;
CREATE POLICY "attempt_answers_teacher_delete"
  ON public.attempt_answers FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_attempts aa
      JOIN public.class_activities ca ON ca.id = aa.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aa.id = attempt_answers.attempt_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

-- 3. Funciones RPC seguras (SECURITY DEFINER) para eliminar preguntas limpiamente
CREATE OR REPLACE FUNCTION public.delete_activity_question(p_question_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.attempt_answers WHERE question_id = p_question_id;
  DELETE FROM public.question_correct_answers WHERE question_id = p_question_id;
  DELETE FROM public.question_options WHERE question_id = p_question_id;
  DELETE FROM public.activity_questions WHERE id = p_question_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_activity_questions(p_activity_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.attempt_answers 
  WHERE question_id IN (SELECT id FROM public.activity_questions WHERE activity_id = p_activity_id);

  DELETE FROM public.question_correct_answers 
  WHERE question_id IN (SELECT id FROM public.activity_questions WHERE activity_id = p_activity_id);

  DELETE FROM public.question_options 
  WHERE question_id IN (SELECT id FROM public.activity_questions WHERE activity_id = p_activity_id);

  DELETE FROM public.activity_questions 
  WHERE activity_id = p_activity_id;
END;
$$;
