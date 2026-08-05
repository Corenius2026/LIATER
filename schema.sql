-- ====================================================================
-- ESQUEMA OFICIAL DE BASE DE DATOS - PLATAFORMA LIATER UNAL (Supabase PostgreSQL)
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.users_profile (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  full_name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  role character varying NOT NULL CHECK (role::text = ANY (ARRAY['student'::character varying, 'teacher'::character varying, 'admin'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_active boolean DEFAULT true,
  auth_user_id uuid UNIQUE,
  CONSTRAINT users_profile_pkey PRIMARY KEY (id),
  CONSTRAINT users_profile_auth_user_id_fkey FOREIGN KEY (auth_user_id) REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS public.teacher_profiles (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  name character varying NOT NULL,
  bio text,
  area character varying,
  photo_url text,
  linkedin_url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT teacher_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.diploma_programs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  title character varying NOT NULL,
  description text,
  start_date date,
  end_date date,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  program_type text DEFAULT 'diplomado'::text,
  image_url text,
  is_published boolean DEFAULT true,
  status character varying DEFAULT 'published'::character varying CHECK (status::text = ANY (ARRAY['draft'::character varying, 'published'::character varying, 'upcoming'::character varying, 'completed'::character varying]::text[])),
  enrollment_start_date timestamp with time zone,
  enrollment_end_date timestamp with time zone,
  CONSTRAINT diploma_programs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.modules (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT modules_pkey PRIMARY KEY (id),
  CONSTRAINT modules_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  module_id uuid,
  title character varying NOT NULL,
  description text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  program_id uuid,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_module_id_fkey FOREIGN KEY (module_id) REFERENCES public.modules(id) ON DELETE CASCADE,
  CONSTRAINT sessions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.class_sessions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  session_id uuid,
  subtopic_id uuid,
  teacher_id uuid,
  title character varying NOT NULL,
  description text,
  class_date timestamp with time zone,
  duration integer,
  video_url text,
  presentation_url text,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  program_id uuid,
  CONSTRAINT class_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT class_sessions_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  CONSTRAINT class_sessions_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id) ON DELETE SET NULL,
  CONSTRAINT class_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.resources (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid NOT NULL,
  title character varying NOT NULL,
  resource_type character varying NOT NULL CHECK (resource_type::text = ANY (ARRAY['presentation'::character varying, 'pdf'::character varying, 'link'::character varying, 'video'::character varying, 'file'::character varying]::text[])),
  url text,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  provider text DEFAULT 'external'::text CHECK (provider = ANY (ARRAY['drive'::text, 'youtube'::text, 'supabase'::text, 'external'::text])),
  file_path text,
  is_visible boolean DEFAULT true,
  program_id uuid,
  CONSTRAINT resources_pkey PRIMARY KEY (id),
  CONSTRAINT resources_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.class_sessions(id) ON DELETE CASCADE,
  CONSTRAINT resources_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  teacher_id uuid,
  title character varying NOT NULL,
  body text NOT NULL,
  tag character varying DEFAULT 'general'::character varying CHECK (tag::text = ANY (ARRAY['general'::character varying, 'urgent'::character varying, 'info'::character varying]::text[])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  program_id uuid,
  CONSTRAINT announcements_pkey PRIMARY KEY (id),
  CONSTRAINT announcements_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.teacher_profiles(id) ON DELETE CASCADE,
  CONSTRAINT announcements_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.enrollments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  student_id uuid NOT NULL,
  program_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT enrollments_pkey PRIMARY KEY (id),
  CONSTRAINT enrollments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  CONSTRAINT enrollments_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.assignments (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT assignments_pkey PRIMARY KEY (id),
  CONSTRAINT assignments_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.assignment_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  assignment_id uuid NOT NULL,
  student_id uuid NOT NULL,
  file_url text,
  comments text,
  submitted_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  status character varying DEFAULT 'submitted'::character varying CHECK (status::text = ANY (ARRAY['submitted'::character varying, 'graded'::character varying, 'returned'::character varying]::text[])),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT assignment_submissions_assignment_id_fkey FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE,
  CONSTRAINT assignment_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  program_id uuid NOT NULL,
  title character varying NOT NULL,
  description text,
  due_date timestamp with time zone NOT NULL,
  is_published boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_program_id_fkey FOREIGN KEY (program_id) REFERENCES public.diploma_programs(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS public.quiz_submissions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  quiz_id uuid NOT NULL,
  student_id uuid NOT NULL,
  score numeric,
  completed_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT quiz_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_submissions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE,
  CONSTRAINT quiz_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users_profile(id) ON DELETE CASCADE
);
