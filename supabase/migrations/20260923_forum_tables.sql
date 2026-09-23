-- ====================================================================
-- MIGRACIÓN: Foro LIATER
-- Fecha: 2026-09-23
-- Descripción: Crea las 4 tablas del sistema de foros
--   forum_threads, forum_posts, forum_reactions, forum_read_status
-- ====================================================================

-- 1. Hilos del Foro
-- program_id = null → foro global de soporte
-- class_id   = null → no vinculado a clase específica
CREATE TABLE IF NOT EXISTS public.forum_threads (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  program_id  uuid REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  class_id    uuid REFERENCES public.class_sessions(id) ON DELETE SET NULL,
  author_id   uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  title       varchar(200) NOT NULL,
  body        text NOT NULL,
  category    varchar(30) NOT NULL DEFAULT 'academic'
              CHECK (category IN ('academic', 'debate', 'support')),
  is_pinned   boolean NOT NULL DEFAULT false,
  is_locked   boolean NOT NULL DEFAULT false,
  is_resolved boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- 2. Posts / Respuestas del Foro
-- parent_id = null → respuesta directa al hilo (primer nivel)
-- parent_id = otro post → reply anidada (segundo nivel)
-- is_solution = true → marcado como respuesta correcta/solución
-- is_deleted  = true → soft delete (mantiene estructura del hilo)
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- Un usuario solo puede reaccionar una vez por post (PRIMARY KEY compuesta)
CREATE TABLE IF NOT EXISTS public.forum_reactions (
  post_id       uuid NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  reaction_type varchar(20) NOT NULL DEFAULT 'useful',
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_reactions_pkey PRIMARY KEY (post_id, user_id)
);

-- 4. Estado de Lectura (para badge "no leído" en sidebar)
-- Registra cuándo un usuario leyó por última vez un hilo
-- Compara last_read_at con created_at del último post para saber si hay novedades
CREATE TABLE IF NOT EXISTS public.forum_read_status (
  user_id      uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  thread_id    uuid NOT NULL REFERENCES public.forum_threads(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT forum_read_status_pkey PRIMARY KEY (user_id, thread_id)
);

-- ====================================================================
-- ÍNDICES para performance
-- ====================================================================

-- Listado de hilos por programa (query principal del foro)
CREATE INDEX IF NOT EXISTS idx_forum_threads_program_id
  ON public.forum_threads (program_id, created_at DESC);

-- Listado de hilos globales de soporte (program_id IS NULL)
CREATE INDEX IF NOT EXISTS idx_forum_threads_support
  ON public.forum_threads (category, created_at DESC)
  WHERE program_id IS NULL;

-- Posts por hilo (query al abrir un hilo)
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread_id
  ON public.forum_posts (thread_id, created_at ASC);

-- Posts hijo (replies anidadas)
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent_id
  ON public.forum_posts (parent_id)
  WHERE parent_id IS NOT NULL;

-- Reacciones por post (conteo de 👍)
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post_id
  ON public.forum_reactions (post_id);

-- Estado de lectura por usuario
CREATE INDEX IF NOT EXISTS idx_forum_read_status_user_id
  ON public.forum_read_status (user_id);

-- ====================================================================
-- ROW LEVEL SECURITY
-- ====================================================================

ALTER TABLE public.forum_threads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_read_status ENABLE ROW LEVEL SECURITY;

-- ── FORUM_THREADS ────────────────────────────────────────────────────

-- SELECT: usuario autenticado puede leer hilos de programas en los que está inscrito
-- o hilos globales de soporte (program_id IS NULL)
CREATE POLICY "forum_threads_select" ON public.forum_threads
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND (
      program_id IS NULL -- hilo global de soporte, visible para todos
      OR EXISTS (
        SELECT 1 FROM public.enrollments e
        JOIN public.users_profile up ON up.id = e.student_id
        WHERE up.auth_user_id = auth.uid()
          AND e.program_id = forum_threads.program_id
      )
      OR EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.role IN ('teacher', 'admin')
      )
    )
  );

-- INSERT: cualquier usuario autenticado puede crear hilos
CREATE POLICY "forum_threads_insert" ON public.forum_threads
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.id = forum_threads.author_id
    )
  );

-- UPDATE: autor puede editar su hilo; docentes/admin pueden moderar (is_pinned, is_locked, is_resolved)
CREATE POLICY "forum_threads_update" ON public.forum_threads
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.id = forum_threads.author_id
      )
      OR EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.role IN ('teacher', 'admin')
      )
    )
  );

-- DELETE: solo admin puede eliminar hilos
CREATE POLICY "forum_threads_delete" ON public.forum_threads
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.role = 'admin'
    )
  );

-- ── FORUM_POSTS ──────────────────────────────────────────────────────

CREATE POLICY "forum_posts_select" ON public.forum_posts
  FOR SELECT USING (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.forum_threads ft
      WHERE ft.id = forum_posts.thread_id
    )
  );

CREATE POLICY "forum_posts_insert" ON public.forum_posts
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.id = forum_posts.author_id
    )
  );

CREATE POLICY "forum_posts_update" ON public.forum_posts
  FOR UPDATE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.id = forum_posts.author_id
      )
      OR EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.role IN ('teacher', 'admin')
      )
    )
  );

CREATE POLICY "forum_posts_delete" ON public.forum_posts
  FOR DELETE USING (
    auth.uid() IS NOT NULL AND (
      EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.id = forum_posts.author_id
      )
      OR EXISTS (
        SELECT 1 FROM public.users_profile up
        WHERE up.auth_user_id = auth.uid()
          AND up.role IN ('teacher', 'admin')
      )
    )
  );

-- ── FORUM_REACTIONS ──────────────────────────────────────────────────

CREATE POLICY "forum_reactions_select" ON public.forum_reactions
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "forum_reactions_insert" ON public.forum_reactions
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.id = forum_reactions.user_id
    )
  );

CREATE POLICY "forum_reactions_delete" ON public.forum_reactions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.id = forum_reactions.user_id
    )
  );

-- ── FORUM_READ_STATUS ────────────────────────────────────────────────

CREATE POLICY "forum_read_status_all" ON public.forum_read_status
  USING (
    EXISTS (
      SELECT 1 FROM public.users_profile up
      WHERE up.auth_user_id = auth.uid()
        AND up.id = forum_read_status.user_id
    )
  );
