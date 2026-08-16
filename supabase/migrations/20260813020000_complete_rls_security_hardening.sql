-- ========================================================================================
-- MIGRACIÓN DE SEGURIDAD INTEGRAL RLS (ROW LEVEL SECURITY) - PROYECTO LIATER
-- ========================================================================================
-- Archivo: supabase/migrations/20260813020000_complete_rls_security_hardening.sql
-- Idempotente y Definitivo: Limpia dinámicamente TODAS las políticas antiguas de pg_policies
-- ========================================================================================

-- ========================================================================================
-- 0. FUNCIONES AUXILIARES DE IDENTIDAD Y ROLES (SECURITY DEFINER)
-- ========================================================================================

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.users_profile
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_profile_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.users_profile
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_teacher_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tp.id
  FROM public.teacher_profiles tp
  JOIN public.users_profile up ON up.id = tp.user_id
  WHERE up.auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_auth_user_role() = 'admin', false);
$$;

CREATE OR REPLACE FUNCTION public.is_student_enrolled_in_program(p_program_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.program_id = p_program_id
      AND e.student_id = public.get_auth_profile_id()
  );
$$;

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
      AND cs.teacher_id = public.get_auth_teacher_id()
  ) OR EXISTS (
    SELECT 1
    FROM public.enrollments e
    WHERE e.program_id = p_program_id
      AND e.student_id = public.get_auth_profile_id()
  );
$$;

-- ========================================================================================
-- 1. HABILITAR RLS EN TODAS LAS TABLAS
-- ========================================================================================
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diploma_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtopics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_correct_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_transcript_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_drafts ENABLE ROW LEVEL SECURITY;

-- ========================================================================================
-- 2. LIMPIEZA DINÁMICA DE TODAS LAS POLÍTICAS PREVIAS (ELIMINA POLÍTICAS ABIERTAS/HEREDADAS)
-- ========================================================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- ========================================================================================
-- 3. POLÍTICAS RLS SEGURAS DEFINITIVAS POR TABLA
-- ========================================================================================

-- ----------------------------------------------------------------------------------------
-- 3.1 users_profile
-- ----------------------------------------------------------------------------------------
CREATE POLICY "users_profile_admin_all"
  ON public.users_profile FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "users_profile_read_own"
  ON public.users_profile FOR SELECT
  USING (auth_user_id = auth.uid());

CREATE POLICY "users_profile_update_own"
  ON public.users_profile FOR UPDATE
  USING (auth_user_id = auth.uid())
  WITH CHECK (
    auth_user_id = auth.uid()
    AND role = public.get_auth_user_role()
  );

CREATE POLICY "users_profile_read_teachers"
  ON public.users_profile FOR SELECT
  USING (auth.role() = 'authenticated' AND role = 'teacher');

CREATE POLICY "users_profile_teacher_read_enrolled_students"
  ON public.users_profile FOR SELECT
  USING (
    public.get_auth_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.enrollments e
      JOIN public.class_sessions cs ON cs.program_id = e.program_id
      WHERE e.student_id = users_profile.id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.2 teacher_profiles
-- ----------------------------------------------------------------------------------------
CREATE POLICY "teacher_profiles_admin_all"
  ON public.teacher_profiles FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "teacher_profiles_read_all"
  ON public.teacher_profiles FOR SELECT
  USING (true);

CREATE POLICY "teacher_profiles_update_own"
  ON public.teacher_profiles FOR UPDATE
  USING (user_id = public.get_auth_profile_id())
  WITH CHECK (user_id = public.get_auth_profile_id());

-- ----------------------------------------------------------------------------------------
-- 3.3 diploma_programs
-- ----------------------------------------------------------------------------------------
CREATE POLICY "diploma_programs_admin_all"
  ON public.diploma_programs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "diploma_programs_read_published"
  ON public.diploma_programs FOR SELECT
  USING (is_published = true OR status IN ('published', 'upcoming'));

CREATE POLICY "diploma_programs_read_enrolled"
  ON public.diploma_programs FOR SELECT
  USING (public.is_student_enrolled_in_program(id));

-- ----------------------------------------------------------------------------------------
-- 3.4 modules & subtopics
-- ----------------------------------------------------------------------------------------
CREATE POLICY "modules_admin_all"
  ON public.modules FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "modules_read_accessible"
  ON public.modules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.diploma_programs dp
      WHERE dp.id = modules.program_id
        AND (dp.is_published = true OR public.is_student_enrolled_in_program(dp.id) OR public.is_teacher_in_program(dp.id))
    )
  );

CREATE POLICY "subtopics_admin_all"
  ON public.subtopics FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "subtopics_read_accessible"
  ON public.subtopics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.modules m
      JOIN public.diploma_programs dp ON dp.id = m.program_id
      WHERE m.id = subtopics.module_id
        AND (dp.is_published = true OR public.is_student_enrolled_in_program(dp.id) OR public.is_teacher_in_program(dp.id))
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.5 class_sessions
-- ----------------------------------------------------------------------------------------
CREATE POLICY "class_sessions_admin_all"
  ON public.class_sessions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "class_sessions_teacher_manage"
  ON public.class_sessions FOR ALL
  USING (teacher_id = public.get_auth_teacher_id())
  WITH CHECK (teacher_id = public.get_auth_teacher_id());

CREATE POLICY "class_sessions_student_read"
  ON public.class_sessions FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND public.is_student_enrolled_in_program(program_id)
  );

-- ----------------------------------------------------------------------------------------
-- 3.6 resources
-- ----------------------------------------------------------------------------------------
CREATE POLICY "resources_admin_all"
  ON public.resources FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "resources_teacher_manage"
  ON public.resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = resources.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = resources.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "resources_student_read"
  ON public.resources FOR SELECT
  USING (
    is_visible = true
    AND public.get_auth_user_role() = 'student'
    AND public.is_student_enrolled_in_program(program_id)
  );

-- ----------------------------------------------------------------------------------------
-- 3.7 announcements
-- ----------------------------------------------------------------------------------------
CREATE POLICY "announcements_admin_all"
  ON public.announcements FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "announcements_teacher_manage"
  ON public.announcements FOR ALL
  USING (teacher_id = public.get_auth_teacher_id())
  WITH CHECK (teacher_id = public.get_auth_teacher_id());

CREATE POLICY "announcements_student_read"
  ON public.announcements FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND (
      program_id IS NULL
      OR public.is_student_enrolled_in_program(program_id)
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.8 enrollments
-- ----------------------------------------------------------------------------------------
CREATE POLICY "enrollments_admin_all"
  ON public.enrollments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "enrollments_read_own"
  ON public.enrollments FOR SELECT
  USING (
    student_id = public.get_auth_profile_id()
  );

CREATE POLICY "enrollments_teacher_read"
  ON public.enrollments FOR SELECT
  USING (
    public.get_auth_user_role() = 'teacher'
    AND public.is_teacher_in_program(program_id)
  );

-- ----------------------------------------------------------------------------------------
-- 3.9 assignments & assignment_submissions
-- ----------------------------------------------------------------------------------------
CREATE POLICY "assignments_admin_all"
  ON public.assignments FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "assignments_teacher_manage"
  ON public.assignments FOR ALL
  USING (
    public.get_auth_user_role() = 'teacher'
    AND public.is_teacher_in_program(program_id)
  )
  WITH CHECK (
    public.get_auth_user_role() = 'teacher'
    AND public.is_teacher_in_program(program_id)
  );

CREATE POLICY "assignments_student_read"
  ON public.assignments FOR SELECT
  USING (
    is_published = true
    AND public.get_auth_user_role() = 'student'
    AND public.is_student_enrolled_in_program(program_id)
  );

CREATE POLICY "submissions_admin_all"
  ON public.assignment_submissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "submissions_teacher_manage"
  ON public.assignment_submissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.is_teacher_in_program(a.program_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND public.is_teacher_in_program(a.program_id)
    )
  );

CREATE POLICY "submissions_student_read_own"
  ON public.assignment_submissions FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

CREATE POLICY "submissions_student_insert_own"
  ON public.assignment_submissions FOR INSERT
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.id = assignment_submissions.assignment_id
        AND a.is_published = true
        AND public.is_student_enrolled_in_program(a.program_id)
    )
  );

CREATE POLICY "submissions_student_update_own"
  ON public.assignment_submissions FOR UPDATE
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND status = 'submitted'
  )
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND status = 'submitted'
  );

-- ----------------------------------------------------------------------------------------
-- 3.10 quizzes & quiz_submissions
-- ----------------------------------------------------------------------------------------
CREATE POLICY "quizzes_admin_all"
  ON public.quizzes FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "quizzes_teacher_manage"
  ON public.quizzes FOR ALL
  USING (
    public.get_auth_user_role() = 'teacher'
    AND public.is_teacher_in_program(program_id)
  )
  WITH CHECK (
    public.get_auth_user_role() = 'teacher'
    AND public.is_teacher_in_program(program_id)
  );

CREATE POLICY "quizzes_student_read"
  ON public.quizzes FOR SELECT
  USING (
    is_published = true
    AND public.get_auth_user_role() = 'student'
    AND public.is_student_enrolled_in_program(program_id)
  );

CREATE POLICY "quiz_submissions_admin_all"
  ON public.quiz_submissions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "quiz_submissions_teacher_read"
  ON public.quiz_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quizzes q
      WHERE q.id = quiz_submissions.quiz_id
        AND public.is_teacher_in_program(q.program_id)
    )
  );

CREATE POLICY "quiz_submissions_student_manage_own"
  ON public.quiz_submissions FOR ALL
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  )
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

-- ----------------------------------------------------------------------------------------
-- 3.11 class_doubts
-- ----------------------------------------------------------------------------------------
CREATE POLICY "class_doubts_admin_all"
  ON public.class_doubts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "class_doubts_teacher_manage"
  ON public.class_doubts FOR ALL
  USING (
    teacher_id = public.get_auth_teacher_id()
    OR (
      program_id IS NOT NULL
      AND public.is_teacher_in_program(program_id)
    )
  )
  WITH CHECK (
    teacher_id = public.get_auth_teacher_id()
    OR (
      program_id IS NOT NULL
      AND public.is_teacher_in_program(program_id)
    )
  );

CREATE POLICY "class_doubts_student_read_own"
  ON public.class_doubts FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

CREATE POLICY "class_doubts_student_insert_own"
  ON public.class_doubts FOR INSERT
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

CREATE POLICY "class_doubts_student_update_own"
  ON public.class_doubts FOR UPDATE
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND status = 'enviada'
  )
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND status = 'enviada'
  );

-- ----------------------------------------------------------------------------------------
-- 3.12 class_activities, activity_questions, question_options
-- ----------------------------------------------------------------------------------------
CREATE POLICY "class_activities_admin_all"
  ON public.class_activities FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "class_activities_teacher_manage"
  ON public.class_activities FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = class_activities.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = class_activities.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "class_activities_student_read"
  ON public.class_activities FOR SELECT
  USING (
    is_published = true
    AND public.get_auth_user_role() = 'student'
    AND EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = class_activities.class_id
        AND public.is_student_enrolled_in_program(cs.program_id)
    )
  );

CREATE POLICY "activity_questions_admin_all"
  ON public.activity_questions FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "activity_questions_teacher_manage"
  ON public.activity_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.class_activities ca
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE ca.id = activity_questions.activity_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_activities ca
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE ca.id = activity_questions.activity_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "activity_questions_student_read"
  ON public.activity_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_activities ca
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE ca.id = activity_questions.activity_id
        AND ca.is_published = true
        AND public.is_student_enrolled_in_program(cs.program_id)
    )
  );

CREATE POLICY "question_options_admin_all"
  ON public.question_options FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "question_options_teacher_manage"
  ON public.question_options FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_questions aq
      JOIN public.class_activities ca ON ca.id = aq.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aq.id = question_options.question_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_questions aq
      JOIN public.class_activities ca ON ca.id = aq.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aq.id = question_options.question_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "question_options_student_read"
  ON public.question_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_questions aq
      JOIN public.class_activities ca ON ca.id = aq.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aq.id = question_options.question_id
        AND ca.is_published = true
        AND public.is_student_enrolled_in_program(cs.program_id)
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.13 question_correct_answers (SEGURIDAD CRÍTICA: NO EXPONER ANTES DE COMPLETAR)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "question_correct_answers_admin_all"
  ON public.question_correct_answers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "question_correct_answers_teacher_manage"
  ON public.question_correct_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_questions aq
      JOIN public.class_activities ca ON ca.id = aq.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aq.id = question_correct_answers.question_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_questions aq
      JOIN public.class_activities ca ON ca.id = aq.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aq.id = question_correct_answers.question_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "question_correct_answers_student_read_completed"
  ON public.question_correct_answers FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND EXISTS (
      SELECT 1
      FROM public.activity_questions aq
      JOIN public.activity_attempts aa ON aa.activity_id = aq.activity_id
      WHERE aq.id = question_correct_answers.question_id
        AND aa.student_id = public.get_auth_profile_id()
        AND aa.status = 'completed'
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.14 activity_attempts & attempt_answers (SIN POLÍTICAS DUPLICADAS NI QUAL=TRUE)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "activity_attempts_admin_all"
  ON public.activity_attempts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "activity_attempts_teacher_read"
  ON public.activity_attempts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.class_activities ca
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE ca.id = activity_attempts.activity_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "activity_attempts_student_read_own"
  ON public.activity_attempts FOR SELECT
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

CREATE POLICY "activity_attempts_student_insert_own"
  ON public.activity_attempts FOR INSERT
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
    AND EXISTS (
      SELECT 1 FROM public.class_activities ca
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE ca.id = activity_attempts.activity_id
        AND ca.is_published = true
        AND public.is_student_enrolled_in_program(cs.program_id)
    )
  );

CREATE POLICY "activity_attempts_student_update_own"
  ON public.activity_attempts FOR UPDATE
  USING (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  )
  WITH CHECK (
    public.get_auth_user_role() = 'student'
    AND student_id = public.get_auth_profile_id()
  );

CREATE POLICY "attempt_answers_admin_all"
  ON public.attempt_answers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "attempt_answers_teacher_read"
  ON public.attempt_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_attempts aa
      JOIN public.class_activities ca ON ca.id = aa.activity_id
      JOIN public.class_sessions cs ON cs.id = ca.class_id
      WHERE aa.id = attempt_answers.attempt_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "attempt_answers_student_read_own"
  ON public.attempt_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_attempts aa
      WHERE aa.id = attempt_answers.attempt_id
        AND aa.student_id = public.get_auth_profile_id()
    )
  );

CREATE POLICY "attempt_answers_student_insert_own"
  ON public.attempt_answers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.activity_attempts aa
      WHERE aa.id = attempt_answers.attempt_id
        AND aa.student_id = public.get_auth_profile_id()
    )
  );

-- ----------------------------------------------------------------------------------------
-- 3.15 activity_drafts, jobs (BLOQUEADOS PARA ESTUDIANTES)
-- ----------------------------------------------------------------------------------------
CREATE POLICY "activity_drafts_admin_all"
  ON public.activity_drafts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "activity_drafts_teacher_manage"
  ON public.activity_drafts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = activity_drafts.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.class_sessions cs
      WHERE cs.id = activity_drafts.class_id
        AND cs.teacher_id = public.get_auth_teacher_id()
    )
  );

CREATE POLICY "jobs_generation_admin_all"
  ON public.activity_generation_jobs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "jobs_transcript_admin_all"
  ON public.drive_transcript_jobs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
