import { supabase } from '@/lib/supabaseClient';

/**
 * Servicio: forumService.js
 * Centraliza la lógica de datos del Foro de LIATER:
 * - Hilos, respuestas jerárquicas, reacciones y estado de lectura.
 * - Desacopla consultas PostgREST para evitar errores de relación de claves foráneas.
 * - Utiliza RPC 'get_profiles_by_ids' para obtención segura de perfiles sin bloqueos de RLS.
 * - Incluye detección automática de tablas pendientes de migración.
 */

export const FORUM_SQL_MIGRATION = `-- ====================================================================
-- MIGRACIÓN DEFINITIVA: Foro LIATER (4 tablas + RLS)
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

-- Índices de Rendimiento
CREATE INDEX IF NOT EXISTS idx_forum_threads_program    ON public.forum_threads(program_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_author     ON public.forum_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_category   ON public.forum_threads(category);
CREATE INDEX IF NOT EXISTS idx_forum_threads_pinned     ON public.forum_threads(is_pinned, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_thread       ON public.forum_posts(thread_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_forum_posts_parent       ON public.forum_posts(parent_id);
CREATE INDEX IF NOT EXISTS idx_forum_reactions_post     ON public.forum_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_forum_read_status_user   ON public.forum_read_status(user_id);

-- RLS
ALTER TABLE public.forum_threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_posts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_reactions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.forum_read_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "forum_threads_read"   ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_create" ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_modify" ON public.forum_threads;
DROP POLICY IF EXISTS "forum_threads_remove" ON public.forum_threads;
DROP POLICY IF EXISTS "forum_posts_read"     ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_create"   ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_modify"   ON public.forum_posts;
DROP POLICY IF EXISTS "forum_posts_remove"   ON public.forum_posts;
DROP POLICY IF EXISTS "forum_reactions_all"  ON public.forum_reactions;
DROP POLICY IF EXISTS "forum_read_status_all" ON public.forum_read_status;

CREATE POLICY "forum_threads_read"   ON public.forum_threads FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_threads_create" ON public.forum_threads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_threads_modify" ON public.forum_threads FOR UPDATE TO authenticated USING (true);
CREATE POLICY "forum_threads_remove" ON public.forum_threads FOR DELETE TO authenticated USING (true);

CREATE POLICY "forum_posts_read"     ON public.forum_posts FOR SELECT TO authenticated USING (true);
CREATE POLICY "forum_posts_create"   ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "forum_posts_modify"   ON public.forum_posts FOR UPDATE TO authenticated USING (true);
CREATE POLICY "forum_posts_remove"   ON public.forum_posts FOR DELETE TO authenticated USING (true);

CREATE POLICY "forum_reactions_all"   ON public.forum_reactions   FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "forum_read_status_all" ON public.forum_read_status FOR ALL TO authenticated USING (true) WITH CHECK (true);
`;

/**
 * Detecta si un error proviene de una tabla faltante en la base de datos de Supabase.
 */
export const isForumTableMissingError = (err) => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code || '';
  return (
    code === '42P01' ||
    code === 'PGRST205' ||
    msg.includes('forum_threads') ||
    msg.includes('relation "public.forum_threads" does not exist') ||
    msg.includes('could not find the table') ||
    msg.includes('schema cache')
  );
};

/**
 * Obtiene perfiles de usuarios de forma segura mediante RPC o select directo con fallback.
 */
export async function fetchProfilesSafe(userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return new Map();
  const cleanIds = [...new Set(userIds.filter(Boolean))];
  if (cleanIds.length === 0) return new Map();

  const profilesMap = new Map();

  // 1. Intento con función RPC SECURITY DEFINER
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_profiles_by_ids', {
      p_user_ids: cleanIds
    });

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      rpcData.forEach(p => {
        if (p && p.id) {
          profilesMap.set(p.id, p);
        }
      });
    }
  } catch (err) {
    console.warn('[forumService] RPC get_profiles_by_ids no disponible o falló:', err);
  }

  // 2. Si faltan perfiles, consultar directamente users_profile
  const missingIds = cleanIds.filter(id => !profilesMap.has(id));
  if (missingIds.length > 0) {
    try {
      const { data: directData, error: directErr } = await supabase
        .from('users_profile')
        .select('id, full_name, email, role, phone')
        .in('id', missingIds);

      if (!directErr && Array.isArray(directData)) {
        directData.forEach(p => {
          if (p && p.id) {
            profilesMap.set(p.id, p);
          }
        });
      }
    } catch (e) {
      console.warn('[forumService] Error en fallback de perfiles:', e);
    }
  }

  return profilesMap;
}

/**
 * Consulta la lista de hilos de un programa, aplicando filtros opcionales.
 */
export async function getProgramThreads(programId, categoryFilter = 'all') {
  if (!programId) return { data: [], tableExists: true, error: null };
  const cleanId = decodeURIComponent(String(programId || '')).trim();

  try {
    let query = supabase
      .from('forum_threads')
      .select('id, title, body, category, is_pinned, is_locked, is_resolved, views_count, created_at, updated_at, author_id, class_id')
      .eq('program_id', cleanId)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: false });

    if (categoryFilter && categoryFilter !== 'all') {
      query = query.eq('category', categoryFilter);
    }

    const { data: threadsData, error: threadsErr } = await query;

    if (threadsErr) {
      if (isForumTableMissingError(threadsErr)) {
        return { data: [], tableExists: false, error: 'Tablas del foro pendientes de migración en Supabase.' };
      }
      throw threadsErr;
    }

    if (!threadsData || threadsData.length === 0) {
      return { data: [], tableExists: true, error: null };
    }

    const threadIds = threadsData.map(t => t.id);
    const authorIds = threadsData.map(t => t.author_id).filter(Boolean);
    const classIds = threadsData.map(t => t.class_id).filter(Boolean);

    // 1. Obtener autores
    const profilesMap = await fetchProfilesSafe(authorIds);

    // 2. Obtener sesiones de clase si están vinculadas
    const classMap = new Map();
    if (classIds.length > 0) {
      try {
        const { data: classesData } = await supabase
          .from('class_sessions')
          .select('id, title')
          .in('id', classIds);
        (classesData || []).forEach(c => classMap.set(c.id, c));
      } catch (e) {
        console.warn('[forumService] No se pudieron cargar clases vinculadas:', e);
      }
    }

    // 3. Contar respuestas por hilo
    const countMap = {};
    if (threadIds.length > 0) {
      try {
        const { data: postCounts } = await supabase
          .from('forum_posts')
          .select('thread_id')
          .in('thread_id', threadIds)
          .eq('is_deleted', false);

        (postCounts || []).forEach(p => {
          countMap[p.thread_id] = (countMap[p.thread_id] || 0) + 1;
        });
      } catch (e) {
        console.warn('[forumService] No se pudieron contar posts:', e);
      }
    }

    const enriched = threadsData.map(t => ({
      ...t,
      author: profilesMap.get(t.author_id) || { full_name: 'Usuario', role: 'student' },
      class_session: classMap.get(t.class_id) || null,
      reply_count: countMap[t.id] || 0
    }));

    return { data: enriched, tableExists: true, error: null };
  } catch (err) {
    console.error('[forumService] Error al cargar hilos:', err);
    if (isForumTableMissingError(err)) {
      return { data: [], tableExists: false, error: 'Tablas del foro no encontradas en la base de datos.' };
    }
    return { data: [], tableExists: true, error: err.message || 'Error al consultar hilos del foro.' };
  }
}

/**
 * Consulta el detalle de un hilo, sus posts jerárquicos y reacciones.
 */
export async function getThreadDetail(threadId, currentUserId = null) {
  if (!threadId) return { thread: null, posts: [], tableExists: true, error: 'ID de hilo inválido' };

  try {
    // 1. Hilo
    const { data: threadData, error: threadErr } = await supabase
      .from('forum_threads')
      .select('id, title, body, category, is_pinned, is_locked, is_resolved, views_count, created_at, updated_at, program_id, class_id, author_id')
      .eq('id', threadId)
      .single();

    if (threadErr) {
      if (isForumTableMissingError(threadErr)) {
        return { thread: null, posts: [], tableExists: false, error: 'Tablas del foro pendientes de migración.' };
      }
      throw threadErr;
    }

    // Incrementar vistas en background
    supabase
      .from('forum_threads')
      .update({ views_count: (threadData.views_count || 0) + 1 })
      .eq('id', threadId)
      .then(() => {});

    // 2. Posts del hilo
    const { data: postsData, error: postsErr } = await supabase
      .from('forum_posts')
      .select('id, thread_id, parent_id, body, is_solution, is_deleted, created_at, updated_at, author_id')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (postsErr) throw postsErr;

    // 3. Recopilar todos los autores (hilo + posts)
    const allAuthorIds = [
      threadData.author_id,
      ...(postsData || []).map(p => p.author_id)
    ].filter(Boolean);

    const profilesMap = await fetchProfilesSafe(allAuthorIds);

    // 4. Clase vinculada
    let classSession = null;
    if (threadData.class_id) {
      const { data: cData } = await supabase
        .from('class_sessions')
        .select('id, title')
        .eq('id', threadData.class_id)
        .maybeSingle();
      classSession = cData;
    }

    // 5. Reacciones en los posts
    const postIds = (postsData || []).map(p => p.id);
    const reactionMap = {};
    const userReactedSet = new Set();

    if (postIds.length > 0) {
      try {
        const { data: reactions } = await supabase
          .from('forum_reactions')
          .select('post_id, user_id')
          .in('post_id', postIds);

        (reactions || []).forEach(r => {
          reactionMap[r.post_id] = (reactionMap[r.post_id] || 0) + 1;
          if (currentUserId && r.user_id === currentUserId) {
            userReactedSet.add(r.post_id);
          }
        });
      } catch (e) {
        console.warn('[forumService] No se pudieron cargar reacciones:', e);
      }
    }

    // 6. Marcar lectura
    if (currentUserId) {
      supabase
        .from('forum_read_status')
        .upsert({ user_id: currentUserId, thread_id: threadId, last_read_at: new Date().toISOString() })
        .then(() => {});
    }

    const enrichedThread = {
      ...threadData,
      author: profilesMap.get(threadData.author_id) || { full_name: 'Autor', role: 'student' },
      class_session: classSession
    };

    const enrichedPosts = (postsData || []).map(p => ({
      ...p,
      author: profilesMap.get(p.author_id) || { full_name: 'Usuario', role: 'student' },
      reaction_count: reactionMap[p.id] || 0,
      user_reacted: userReactedSet.has(p.id)
    }));

    return { thread: enrichedThread, posts: enrichedPosts, tableExists: true, error: null };
  } catch (err) {
    console.error('[forumService] Error en getThreadDetail:', err);
    if (isForumTableMissingError(err)) {
      return { thread: null, posts: [], tableExists: false, error: 'Tablas del foro pendientes de migración.' };
    }
    return { thread: null, posts: [], tableExists: true, error: err.message || 'Error al cargar el hilo.' };
  }
}

/**
 * Crea un nuevo hilo en el foro.
 */
export async function createThread({ title, body, category, authorId, programId, classId = null }) {
  if (!title?.trim() || !body?.trim() || !authorId || !programId) {
    throw new Error('Faltan campos obligatorios para crear el hilo.');
  }

  const payload = {
    title: title.trim(),
    body: body.trim(),
    category: category || 'academic',
    author_id: authorId,
    program_id: programId,
    class_id: classId || null
  };

  const { data, error } = await supabase
    .from('forum_threads')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  // Registrar lectura automática para el autor
  await supabase
    .from('forum_read_status')
    .upsert({ user_id: authorId, thread_id: data.id, last_read_at: new Date().toISOString() });

  return data;
}

/**
 * Publica una respuesta o réplica anidada en un hilo.
 */
export async function createPost({ threadId, authorId, parentId = null, body }) {
  if (!threadId || !authorId || !body?.trim()) {
    throw new Error('El mensaje no puede estar vacío.');
  }

  const payload = {
    thread_id: threadId,
    author_id: authorId,
    parent_id: parentId || null,
    body: body.trim()
  };

  const { data, error } = await supabase
    .from('forum_posts')
    .insert(payload)
    .select('*')
    .single();

  if (error) throw error;

  // Actualizar updated_at del hilo para notificaciones de actividad
  await supabase
    .from('forum_threads')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', threadId);

  return data;
}

/**
 * Conmuta la reacción 👍 Útil de un post.
 */
export async function toggleUsefulReaction(postId, userId) {
  if (!postId || !userId) return false;

  // 1. Verificar si ya existe
  const { data: existing } = await supabase
    .from('forum_reactions')
    .select('post_id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('forum_reactions')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);
    return false; // Reacción removida
  } else {
    await supabase
      .from('forum_reactions')
      .insert({ post_id: postId, user_id: userId, reaction_type: 'useful' });
    return true; // Reacción añadida
  }
}

/**
 * Modera un hilo (fijar, bloquear, resolver).
 */
export async function updateThreadStatus(threadId, updates) {
  if (!threadId || !updates) return null;
  const { data, error } = await supabase
    .from('forum_threads')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', threadId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

/**
 * Marca o desmarca un post como solución de la duda.
 */
export async function markPostSolution(postId, threadId, isSolution) {
  if (!postId || !threadId) return;

  // Si se marca como solución, primero desmarcar cualquier otra previa en el hilo
  if (isSolution) {
    await supabase
      .from('forum_posts')
      .update({ is_solution: false })
      .eq('thread_id', threadId);
  }

  const { error: postErr } = await supabase
    .from('forum_posts')
    .update({ is_solution: isSolution })
    .eq('id', postId);
  if (postErr) throw postErr;

  // Actualizar estado del hilo
  await supabase
    .from('forum_threads')
    .update({ is_resolved: isSolution, updated_at: new Date().toISOString() })
    .eq('id', threadId);
}

/**
 * Elimina un post definitivamente de la base de datos de Supabase.
 * Gracias a las foreign keys con ON DELETE CASCADE, las reacciones asociadas
 * y réplicas se limpian de manera consistente en la BD.
 */
export async function deletePostFromDb(postId) {
  if (!postId) return false;
  const { error } = await supabase
    .from('forum_posts')
    .delete()
    .eq('id', postId);
  if (error) throw error;
  return true;
}

/**
 * Soft delete de un post (mantenido por compatibilidad, redirige a eliminación real en BD).
 */
export async function softDeletePost(postId) {
  return deletePostFromDb(postId);
}

/**
 * Elimina un hilo definitivamente de la base de datos de Supabase.
 * Gracias a las foreign keys con ON DELETE CASCADE, todas sus respuestas,
 * reacciones y estados de lectura se eliminan automáticamente.
 */
export async function deleteThreadFromDb(threadId) {
  if (!threadId) return false;
  const { error } = await supabase
    .from('forum_threads')
    .delete()
    .eq('id', threadId);
  if (error) throw error;
  return true;
}
