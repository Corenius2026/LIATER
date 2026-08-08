-- ====================================================================
-- MIGRACIÓN DE POLÍTICAS RLS PARA INTENTOS Y RESPUESTAS DE ACTIVIDADES
-- ====================================================================

ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;

-- Políticas para activity_attempts
DROP POLICY IF EXISTS "Permitir lectura de intentos a usuarios autenticados" ON public.activity_attempts;
CREATE POLICY "Permitir lectura de intentos a usuarios autenticados"
  ON public.activity_attempts FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir insertar intentos a usuarios autenticados" ON public.activity_attempts;
CREATE POLICY "Permitir insertar intentos a usuarios autenticados"
  ON public.activity_attempts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir actualizar intentos a usuarios autenticados" ON public.activity_attempts;
CREATE POLICY "Permitir actualizar intentos a usuarios autenticados"
  ON public.activity_attempts FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Políticas para attempt_answers
DROP POLICY IF EXISTS "Permitir lectura de respuestas a usuarios autenticados" ON public.attempt_answers;
CREATE POLICY "Permitir lectura de respuestas a usuarios autenticados"
  ON public.attempt_answers FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Permitir insertar respuestas a usuarios autenticados" ON public.attempt_answers;
CREATE POLICY "Permitir insertar respuestas a usuarios autenticados"
  ON public.attempt_answers FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');
