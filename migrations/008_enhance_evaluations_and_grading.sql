-- ====================================================================
-- Migración 008: Mejoras en Evaluaciones, Entregas y Calificaciones
-- ====================================================================

-- 1. Jerarquía y control en tareas (assignments)
ALTER TABLE public.assignments 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS weight_percentage NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS allowed_file_types TEXT DEFAULT 'pdf,doc,docx,zip,link';

-- 2. Calificación y feedback en entregas de tareas (assignment_submissions)
ALTER TABLE public.assignment_submissions 
  ADD COLUMN IF NOT EXISTS grade NUMERIC,
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS graded_by UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL;

-- 3. Jerarquía y control en cuestionarios (quizzes)
ALTER TABLE public.quizzes 
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS module_id UUID REFERENCES public.modules(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS max_score NUMERIC DEFAULT 100,
  ADD COLUMN IF NOT EXISTS time_limit_minutes INTEGER DEFAULT 0;

-- 4. Feedback en intentos de cuestionario (quiz_submissions)
ALTER TABLE public.quiz_submissions
  ADD COLUMN IF NOT EXISTS feedback TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'completed';

-- 5. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments(teacher_id);
CREATE INDEX IF NOT EXISTS idx_assignments_module ON public.assignments(module_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_status ON public.assignment_submissions(status);

-- 6. Políticas RLS
DROP POLICY IF EXISTS "Profesores gestionan tareas" ON public.assignments;
CREATE POLICY "Profesores gestionan tareas"
  ON public.assignments FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Profesores califican entregas" ON public.assignment_submissions;
CREATE POLICY "Profesores califican entregas"
  ON public.assignment_submissions FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Profesores gestionan quizzes" ON public.quizzes;
CREATE POLICY "Profesores gestionan quizzes"
  ON public.quizzes FOR ALL
  TO authenticated, anon
  USING (true)
  WITH CHECK (true);
