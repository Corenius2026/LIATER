-- ====================================================================
-- MIGRACIÓN DEFINITIVA: Foro LIATER (4 tablas + RLS abierta a autenticados)
-- ====================================================================

-- 1. Hilos del Foro
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id  uuid REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  author_id   uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  title       varchar(200) NOT NULL,
  body        text NOT NULL,
  category    varchar(30) NOT NULL DEFAULT 'academic'
              CHECK (category IN ('academic', 'debate')),
  is_pinned   boolean NOT NULL DEFAULT false,
  is_locked   boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Posts / Respuestas del Foro
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id   uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  author_id   uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  parent_id   uuid REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  body        text NOT NULL,
  is_solution boolean NOT NULL DEFAULT false,
  is_deleted  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 3. Reacciones (👍 Útil)
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  post_id       uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  reaction_type varchar(20) NOT NULL DEFAULT 'useful',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_reactions_pkey PRIMARY KEY (post_id, user_id)
);

-- 4. Estado de Lectura
CREATE TABLE IF NOT EXISTS public.forum_read_status (
  user_id      uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  thread_id    uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_read_status_pkey PRIMARY KEY (user_id, thread_id)
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_forum_threads_program    ON public.forum_threads(program_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author     ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category   ON public.forum_threads(category);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned     ON public.forum_threads(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread       ON public.forum_posts(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent       ON public.forum_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post     ON public.forum_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_read_status_user   ON public.forum_read_status(user_id);

-- Habilitar RLS
ALTER TABLE public.forum_threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_read_status ENABLE ROW LEVEL SECURITY;

-- Limpiar políticas anteriores si existían
DROP POLICY IF EXISTS "forum_threads_read"       ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_create"     ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_modify"     ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_remove"     ON public.forum_threads;
DROP POLICY IF EXISTS "forum_posts_read"         ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_create"       ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_modify"       ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_remove"       ON public.forum_posts;
DROP POLICY IF EXISTS "forum_reactions_all"      ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_read_status_all"    ON public.forum_read_status;

-- Políticas RLS abiertas para todos los usuarios autenticados
-- (la autorización de moderación se valida en frontend y backend)
CREATE POLICY "forum_threads_read"   ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_threads_create" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_threads_modify" ON public.forum_threads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "forum_threads_remove" ON public.forum_threads FOR DELETE TO authenticated USING (true);

CREATE POLICY "forum_posts_read"   ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_create" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_posts_modify" ON public.forum_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "forum_posts_remove" ON public.forum_posts FOR DELETE TO authenticated USING (true);

CREATE POLICY "forum_reactions_all"   ON public.forum_reactions   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "forum_read_status_all" ON public.forum_read_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
