/**
 * ForumThread.jsx
 * Vista de detalle de un hilo del foro.
 * Muestra: encabezado del hilo, botones de moderación, y todos los posts con sus replies.
 * Permite: responder, reaccionar 👍, marcar solución, eliminar, pinear, cerrar, resolver.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pin, PinOff, Lock, Unlock, CheckCircle2,
  Send, Loader2, AlertCircle, MessageSquare
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import ForumCategoryBadge from '../components/forum/ForumCategoryBadge';
import ForumPostCard from '../components/forum/ForumPostCard';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'Ahora mismo';
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ForumThread() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [thread, setThread]             = useState(null);
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [userProfileId, setUserProfileId] = useState(null);
  const [userRole, setUserRole]         = useState('student');

  // Respuesta
  const [replyingTo, setReplyingTo]     = useState(null); // null = responder al hilo
  const [replyBody, setReplyBody]       = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError]     = useState('');

  const replyBoxRef = useRef(null);

  // Obtener perfil del usuario
  useEffect(() => {
    if (!currentUser?.id) return;
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('users_profile')
        .select('id, role')
        .eq('auth_user_id', currentUser.id)
        .single();
      if (data) {
        setUserProfileId(data.id);
        setUserRole(data.role);
      }
    };
    fetchProfile();
  }, [currentUser?.id]);

  // Cargar hilo y posts
  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError('');
    try {
      // Hilo
      const { data: threadData, error: threadErr } = await supabase
        .from('forum_threads')
        .select(`
          id, title, body, category,
          is_pinned, is_locked, is_resolved,
          views_count, created_at, updated_at,
          program_id, class_id,
          author:author_id ( id, full_name, role ),
          class_session:class_id ( id, title )
        `)
        .eq('id', threadId)
        .single();

      if (threadErr) throw threadErr;
      setThread(threadData);

      // Incrementar contador de vistas
      await supabase
        .from('forum_threads')
        .update({ views_count: (threadData.views_count || 0) + 1 })
        .eq('id', threadId);

      // Posts
      const { data: postsData, error: postsErr } = await supabase
        .from('forum_posts')
        .select(`
          id, thread_id, parent_id, body,
          is_solution, is_deleted,
          created_at, updated_at,
          author:author_id ( id, full_name, role ),
          author_id
        `)
        .eq('thread_id', threadId)
        .order('created_at', { ascending: true });

      if (postsErr) throw postsErr;

      // Cargar conteo de reacciones y si el usuario ya reaccionó
      const postIds = (postsData || []).map(p => p.id);
      let reactionMap = {};
      let userReactedSet = new Set();

      if (postIds.length > 0) {
        const { data: reactions } = await supabase
          .from('forum_reactions')
          .select('post_id, user_id')
          .in('post_id', postIds);

        (reactions || []).forEach(r => {
          reactionMap[r.post_id] = (reactionMap[r.post_id] || 0) + 1;
        });

        if (userProfileId) {
          (reactions || []).filter(r => r.user_id === userProfileId).forEach(r => {
            userReactedSet.add(r.post_id);
          });
        }
      }

      const enrichedPosts = (postsData || []).map(p => ({
        ...p,
        reaction_count: reactionMap[p.id] || 0,
        user_reacted:   userReactedSet.has(p.id),
      }));

      setPosts(enrichedPosts);

      // Actualizar estado de lectura
      if (userProfileId) {
        await supabase
          .from('forum_read_status')
          .upsert({ user_id: userProfileId, thread_id: threadId, last_read_at: new Date().toISOString() });
      }

    } catch (err) {
      console.error('Error cargando hilo:', err);
      setError('No se pudo cargar el hilo. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [threadId, userProfileId]);

  useEffect(() => {
    fetchThread();
  }, [fetchThread]);

  // Responder al hilo o a un post
  const handleSendReply = async () => {
    if (!replyBody.trim()) { setReplyError('Escribe tu respuesta.'); return; }
    if (!userProfileId)    { setReplyError('Debes iniciar sesión.'); return; }
    if (thread?.is_locked) { setReplyError('Este hilo está cerrado.'); return; }

    setSendingReply(true);
    setReplyError('');
    try {
      const payload = {
        thread_id:  threadId,
        author_id:  userProfileId,
        parent_id:  replyingTo ? replyingTo.id : null,
        body:       replyBody.trim(),
      };

      const { data, error: insertErr } = await supabase
        .from('forum_posts')
        .insert(payload)
        .select('id, thread_id, parent_id, body, is_solution, is_deleted, created_at, updated_at, author_id')
        .single();

      if (insertErr) throw insertErr;

      // Actualizar updated_at del hilo
      await supabase
        .from('forum_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', threadId);

      const newPost = {
        ...data,
        author: { full_name: currentUser?.full_name || 'Tú', role: userRole, id: userProfileId },
        reaction_count: 0,
        user_reacted: false,
      };

      setPosts(prev => [...prev, newPost]);
      setReplyBody('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error enviando respuesta:', err);
      setReplyError('No se pudo enviar la respuesta. Intenta de nuevo.');
    } finally {
      setSendingReply(false);
    }
  };

  // Marcar post como solución
  const handleMarkSolution = async (postId) => {
    try {
      // Desmarcar solución anterior si existe
      await supabase
        .from('forum_posts')
        .update({ is_solution: false })
        .eq('thread_id', threadId)
        .eq('is_solution', true);

      await supabase
        .from('forum_posts')
        .update({ is_solution: true })
        .eq('id', postId);

      await supabase
        .from('forum_threads')
        .update({ is_resolved: true })
        .eq('id', threadId);

      setPosts(prev => prev.map(p => ({ ...p, is_solution: p.id === postId })));
      setThread(prev => ({ ...prev, is_resolved: true }));
    } catch (err) {
      console.error('Error marcando solución:', err);
    }
  };

  // Eliminar post (soft delete)
  const handleDeletePost = async (postId) => {
    if (!window.confirm('¿Eliminar este mensaje?')) return;
    try {
      await supabase
        .from('forum_posts')
        .update({ is_deleted: true })
        .eq('id', postId);
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_deleted: true } : p));
    } catch (err) {
      console.error('Error eliminando post:', err);
    }
  };

  // Acciones de moderación en el hilo
  const handleTogglePin = async () => {
    const newVal = !thread.is_pinned;
    await supabase.from('forum_threads').update({ is_pinned: newVal }).eq('id', threadId);
    setThread(prev => ({ ...prev, is_pinned: newVal }));
  };

  const handleToggleLock = async () => {
    const newVal = !thread.is_locked;
    await supabase.from('forum_threads').update({ is_locked: newVal }).eq('id', threadId);
    setThread(prev => ({ ...prev, is_locked: newVal }));
  };

  const handleToggleResolved = async () => {
    const newVal = !thread.is_resolved;
    await supabase.from('forum_threads').update({ is_resolved: newVal }).eq('id', threadId);
    setThread(prev => ({ ...prev, is_resolved: newVal }));
  };

  const canModerate = userRole === 'teacher' || userRole === 'admin';
  const isThreadAuthor = thread && userProfileId && thread.author?.id === userProfileId;

  // Organizar posts: directos al hilo + sus replies anidadas
  const topLevelPosts = posts.filter(p => !p.parent_id);
  const repliesMap = {};
  posts.filter(p => p.parent_id).forEach(p => {
    if (!repliesMap[p.parent_id]) repliesMap[p.parent_id] = [];
    repliesMap[p.parent_id].push(p);
  });

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4rem', gap: '0.75rem', color: 'var(--text-muted, #94a3b8)' }}>
        <Loader2 size={22} style={{ animation: 'liaterSpin 0.75s linear infinite' }} />
        <style>{`@keyframes liaterSpin { to { transform: rotate(360deg); } }`}</style>
        Cargando hilo...
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div style={{ maxWidth: '820px', margin: '2rem auto', padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#dc2626', fontSize: '0.9rem' }}>
          <AlertCircle size={18} />
          {error || 'Hilo no encontrado.'}
        </div>
        <button onClick={() => navigate(-1)} style={{ marginTop: '1rem', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--navy, #0b1528)', fontWeight: 700, fontSize: '0.88rem' }}>
          ← Volver
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '1.5rem 1rem' }}>

      {/* Botón volver */}
      <button
        onClick={() => navigate(-1)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '1.25rem',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text-muted, #64748b)', fontSize: '0.83rem', fontWeight: 600,
          padding: 0,
        }}
      >
        <ArrowLeft size={15} /> Volver al foro
      </button>

      {/* Encabezado del hilo */}
      <div style={{
        padding: '1.25rem 1.5rem',
        background: 'var(--white, #fff)',
        border: '1px solid var(--border-color, #e2e8f0)',
        borderRadius: '12px', marginBottom: '1.25rem',
      }}>
        {/* Badges de estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
          <ForumCategoryBadge category={thread.category} />
          {thread.is_pinned && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 600, color: '#b45309' }}>
              <Pin size={12} /> Fijado
            </span>
          )}
          {thread.is_resolved && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 600, color: '#15803d' }}>
              <CheckCircle2 size={12} /> Resuelto
            </span>
          )}
          {thread.is_locked && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.72rem', fontWeight: 600, color: '#64748b' }}>
              <Lock size={12} /> Cerrado
            </span>
          )}
        </div>

        <h1 style={{ margin: '0 0 0.6rem', fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy, #0b1528)', lineHeight: 1.3 }}>
          {thread.title}
        </h1>

        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted, #64748b)', marginBottom: '1rem' }}>
          Publicado por <strong style={{ color: 'var(--text-dark, #0b1528)' }}>{thread.author?.full_name}</strong>
          {' · '}{timeAgo(thread.created_at)}
          {thread.class_session?.title && (
            <span style={{ marginLeft: '0.5rem', color: '#7c3aed', fontWeight: 600 }}>
              · 📚 {thread.class_session.title}
            </span>
          )}
        </div>

        <div style={{ fontSize: '0.9rem', color: 'var(--text-body, #334155)', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {thread.body}
        </div>

        {/* Acciones de moderación */}
        {canModerate && (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
            <button onClick={handleTogglePin} style={modBtnStyle}>
              {thread.is_pinned ? <><PinOff size={13} /> Desfijar</> : <><Pin size={13} /> Fijar</>}
            </button>
            <button onClick={handleToggleLock} style={modBtnStyle}>
              {thread.is_locked ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Cerrar hilo</>}
            </button>
            <button onClick={handleToggleResolved} style={modBtnStyle}>
              <CheckCircle2 size={13} />
              {thread.is_resolved ? 'Desmarcar resuelto' : 'Marcar resuelto'}
            </button>
          </div>
        )}
      </div>

      {/* Lista de posts */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', margin: '0 0 0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          <MessageSquare size={14} style={{ verticalAlign: 'middle', marginRight: '0.3rem' }} />
          {posts.filter(p => !p.is_deleted).length} {posts.filter(p => !p.is_deleted).length === 1 ? 'Respuesta' : 'Respuestas'}
        </h2>

        {topLevelPosts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted, #94a3b8)', fontSize: '0.88rem' }}>
            Aún no hay respuestas. ¡Sé el primero en responder!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {topLevelPosts.map(post => (
              <div key={post.id}>
                <ForumPostCard
                  post={post}
                  isNested={false}
                  canModerate={canModerate}
                  isThreadAuthor={isThreadAuthor}
                  userProfileId={userProfileId}
                  onReply={(p) => { setReplyingTo(p); setTimeout(() => replyBoxRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
                  onMarkSolution={handleMarkSolution}
                  onDelete={handleDeletePost}
                  onReactionChange={fetchThread}
                />
                {/* Replies anidadas */}
                {(repliesMap[post.id] || []).map(reply => (
                  <div key={reply.id} style={{ marginTop: '0.5rem' }}>
                    <ForumPostCard
                      post={reply}
                      isNested={true}
                      canModerate={canModerate}
                      isThreadAuthor={isThreadAuthor}
                      userProfileId={userProfileId}
                      onReply={null}
                      onMarkSolution={handleMarkSolution}
                      onDelete={handleDeletePost}
                      onReactionChange={fetchThread}
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caja de respuesta */}
      {!thread.is_locked ? (
        <div
          ref={replyBoxRef}
          style={{
            padding: '1.25rem',
            background: 'var(--white, #fff)',
            border: '1.5px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
          }}
        >
          <h3 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-dark, #0b1528)' }}>
            {replyingTo
              ? `↩ Respondiendo a ${replyingTo.author?.full_name || 'usuario'}`
              : '✍️ Tu respuesta'}
          </h3>
          {replyingTo && (
            <div style={{
              padding: '0.5rem 0.85rem', marginBottom: '0.75rem',
              background: 'var(--bg-light, #f8fafc)',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '6px', fontSize: '0.8rem', color: 'var(--text-muted, #64748b)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {replyingTo.body}
              </span>
              <button onClick={() => setReplyingTo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '1rem', marginLeft: '0.5rem', flexShrink: 0 }}>×</button>
            </div>
          )}
          <textarea
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder="Escribe tu respuesta aquí..."
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.65rem 0.9rem', resize: 'vertical', minHeight: '80px',
              border: '1.5px solid var(--border-color, #e2e8f0)',
              borderRadius: '8px', fontSize: '0.88rem',
              outline: 'none', fontFamily: 'inherit',
              color: 'var(--text-dark, #0b1528)', lineHeight: 1.6,
            }}
          />
          {replyError && (
            <p style={{ margin: '0.4rem 0 0', fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>{replyError}</p>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyBody.trim()}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
                background: (sendingReply || !replyBody.trim()) ? '#94a3b8' : 'var(--navy, #0b1528)',
                color: 'white', border: 'none',
                cursor: (sendingReply || !replyBody.trim()) ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
              }}
            >
              {sendingReply ? <Loader2 size={15} style={{ animation: 'liaterSpin 0.75s linear infinite' }} /> : <Send size={15} />}
              {sendingReply ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          padding: '1rem 1.25rem', borderRadius: '10px', textAlign: 'center',
          background: 'rgba(100,116,139,0.07)', border: '1px solid rgba(100,116,139,0.2)',
          color: 'var(--text-muted, #64748b)', fontSize: '0.88rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
        }}>
          <Lock size={15} /> Este hilo está cerrado y no acepta más respuestas.
        </div>
      )}
    </div>
  );
}

const modBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
  padding: '0.3rem 0.75rem', borderRadius: '6px', fontWeight: 600, fontSize: '0.78rem',
  border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent',
  color: 'var(--text-muted, #64748b)', cursor: 'pointer', transition: 'all 0.15s ease',
};
