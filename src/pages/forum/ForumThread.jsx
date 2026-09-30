/**
 * ForumThread.jsx
 * Vista de detalle de un hilo del foro.
 * Muestra: encabezado del hilo, botones de moderación, y todos los posts con sus replies.
 * Permite: responder, reaccionar 👍, marcar solución, eliminar, pinear, cerrar, resolver.
 * Conectado con forumService.js.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pin, PinOff, Lock, Unlock, CheckCircle2,
  Send, Loader2, AlertCircle, MessageSquare
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getThreadDetail, createPost, markPostSolution,
  deletePostFromDb, updateThreadStatus
} from '@/services/forumService';
import ForumCategoryBadge from '@/components/forum/ForumCategoryBadge';
import ForumPostCard from '@/components/forum/ForumPostCard';
import ConfirmModal from '@/components/common/ConfirmModal';

function timeAgo(dateStr) {
  if (!dateStr) return '';
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

  // currentUser.id YA ES users_profile.id
  const userProfileId = currentUser?.id ?? null;
  const userRole      = currentUser?.role ?? 'student';

  // Respuesta
  const [replyingTo, setReplyingTo]     = useState(null);
  const [replyBody, setReplyBody]       = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError]     = useState('');

  // Estados de eliminación y feedback
  const [postToDelete, setPostToDelete] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [toastFeedback, setToastFeedback] = useState(null);

  const replyBoxRef = useRef(null);

  // Cargar hilo y posts mediante forumService
  const fetchThread = useCallback(async () => {
    if (!threadId) return;
    setLoading(true);
    setError('');
    try {
      const res = await getThreadDetail(threadId, userProfileId);
      if (!res.tableExists) {
        setError('El sistema de foros está pendiente de migración en la base de datos.');
      } else if (res.error) {
        setError(res.error);
      } else {
        setThread(res.thread);
        setPosts(res.posts || []);
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
      const newPostData = await createPost({
        threadId,
        authorId: userProfileId,
        parentId: replyingTo ? replyingTo.id : null,
        body: replyBody.trim(),
      });

      const newPost = {
        ...newPostData,
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
      const isAlreadySolution = posts.find(p => p.id === postId)?.is_solution;
      await markPostSolution(postId, threadId, !isAlreadySolution);

      setPosts(prev => prev.map(p => ({
        ...p,
        is_solution: p.id === postId ? !isAlreadySolution : false
      })));
      setThread(prev => ({ ...prev, is_resolved: !isAlreadySolution }));
    } catch (err) {
      console.error('Error marcando solución:', err);
    }
  };

  // Iniciar flujo de eliminación (abre modal de confirmación con diseño LIATER)
  const handleDeletePost = (postOrId) => {
    const postObj = typeof postOrId === 'object' && postOrId !== null
      ? postOrId
      : posts.find(p => p.id === postOrId);
    setPostToDelete(postObj || { id: postOrId });
  };

  // Confirmar y ejecutar eliminación real de la base de datos
  const handleConfirmDeletePost = async () => {
    if (!postToDelete?.id) return;
    setDeletingPost(true);
    try {
      await deletePostFromDb(postToDelete.id);

      // Eliminar del estado inmediatamente para que no haya ruido visual ni residuos
      setPosts(prev => prev.filter(p => p.id !== postToDelete.id && p.parent_id !== postToDelete.id));
      setPostToDelete(null);

      setToastFeedback('Mensaje eliminado permanentemente de la discusión.');
      setTimeout(() => setToastFeedback(null), 3500);
    } catch (err) {
      console.error('Error eliminando mensaje de la base de datos:', err);
      alert('Error al eliminar el mensaje: ' + (err.message || 'Intenta de nuevo.'));
    } finally {
      setDeletingPost(false);
    }
  };

  // Acciones de moderación en el hilo
  const handleTogglePin = async () => {
    try {
      const newVal = !thread.is_pinned;
      await updateThreadStatus(threadId, { is_pinned: newVal });
      setThread(prev => ({ ...prev, is_pinned: newVal }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleLock = async () => {
    try {
      const newVal = !thread.is_locked;
      await updateThreadStatus(threadId, { is_locked: newVal });
      setThread(prev => ({ ...prev, is_locked: newVal }));
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleResolved = async () => {
    try {
      const newVal = !thread.is_resolved;
      await updateThreadStatus(threadId, { is_resolved: newVal });
      setThread(prev => ({ ...prev, is_resolved: newVal }));
    } catch (e) {
      console.error(e);
    }
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

  const handleStartReply = (post) => {
    setReplyingTo(post);
    setTimeout(() => {
      replyBoxRef.current?.focus();
      replyBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  };

  const modBtnStyle = {
    display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
    padding: '0.3rem 0.65rem', borderRadius: '6px',
    border: '1px solid var(--border-color, #e2e8f0)', background: 'transparent',
    color: 'var(--text-muted, #64748b)', fontSize: '0.75rem', fontWeight: 600,
    cursor: 'pointer',
  };

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
              {thread.is_locked ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Cerrar</>}
            </button>
            <button onClick={handleToggleResolved} style={modBtnStyle}>
              <CheckCircle2 size={13} color={thread.is_resolved ? '#15803d' : undefined} />
              {thread.is_resolved ? 'Reabrir duda' : 'Marcar como resuelta'}
            </button>
          </div>
        )}
      </div>

      {/* Lista de respuestas */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy, #0b1528)', marginBottom: '0.85rem' }}>
          Respuestas ({posts.filter(p => !p.is_deleted).length})
        </h2>

        {topLevelPosts.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '2rem',
            background: 'var(--white, #fff)', border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '10px', color: 'var(--text-muted, #94a3b8)', fontSize: '0.85rem',
          }}>
            <MessageSquare size={30} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
            <p style={{ margin: 0 }}>Aún no hay respuestas. ¡Sé el primero en responder!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {topLevelPosts.map(post => (
              <div key={post.id}>
                <ForumPostCard
                  post={post}
                  userProfileId={userProfileId}
                  canModerate={canModerate}
                  isThreadAuthor={isThreadAuthor}
                  onReply={handleStartReply}
                  onMarkSolution={handleMarkSolution}
                  onDelete={handleDeletePost}
                />

                {/* Respuestas anidadas (segundo nivel) */}
                {(repliesMap[post.id] || []).length > 0 && (
                  <div style={{ marginLeft: '1.75rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', borderLeft: '2px solid var(--border-color, #e2e8f0)', paddingLeft: '0.75rem' }}>
                    {repliesMap[post.id].map(reply => (
                      <ForumPostCard
                        key={reply.id}
                        post={reply}
                        userProfileId={userProfileId}
                        canModerate={canModerate}
                        isThreadAuthor={isThreadAuthor}
                        onReply={handleStartReply}
                        onMarkSolution={handleMarkSolution}
                        onDelete={handleDeletePost}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Caja de respuesta */}
      {thread.is_locked ? (
        <div style={{
          padding: '1rem', borderRadius: '10px', textAlign: 'center',
          background: 'rgba(100,116,139,0.08)', color: 'var(--text-muted, #64748b)',
          fontSize: '0.85rem', fontWeight: 600,
        }}>
          🔒 Este hilo está cerrado. No se admiten nuevas respuestas.
        </div>
      ) : (
        <div style={{
          padding: '1.25rem', background: 'var(--white, #fff)',
          border: '1.5px solid var(--border-color, #e2e8f0)',
          borderRadius: '12px',
        }}>
          {replyingTo && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '0.75rem', padding: '0.4rem 0.75rem',
              background: 'rgba(124, 58, 237, 0.08)', borderRadius: '6px',
              fontSize: '0.78rem', color: '#7c3aed',
            }}>
              <span>
                Respondiendo a <strong>{replyingTo.author?.full_name || 'un mensaje'}</strong>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7c3aed', fontWeight: 700 }}
              >
                ✕ Cancelar
              </button>
            </div>
          )}

          <textarea
            ref={replyBoxRef}
            rows={3}
            value={replyBody}
            onChange={e => setReplyBody(e.target.value)}
            placeholder={replyingTo ? 'Escribe tu respuesta a este comentario...' : 'Escribe tu respuesta a esta discusión...'}
            disabled={sendingReply}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '0.65rem 0.85rem', borderRadius: '8px',
              border: '1px solid var(--border-color, #cbd5e1)',
              fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical',
              outline: 'none', marginBottom: '0.65rem',
            }}
          />

          {replyError && (
            <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
              {replyError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyBody.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.25rem', borderRadius: '8px',
                background: 'var(--navy, #0b1528)', color: 'white',
                border: 'none', fontWeight: 700, fontSize: '0.85rem',
                cursor: sendingReply || !replyBody.trim() ? 'not-allowed' : 'pointer',
                opacity: sendingReply || !replyBody.trim() ? 0.6 : 1,
              }}
            >
              {sendingReply ? <Loader2 size={15} style={{ animation: 'liaterSpin 0.75s linear infinite' }} /> : <Send size={15} />}
              {sendingReply ? 'Publicando...' : 'Publicar respuesta'}
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación con diseño del LMS LIATER */}
      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={() => !deletingPost && setPostToDelete(null)}
        onConfirm={handleConfirmDeletePost}
        title="Eliminar mensaje"
        message={
          postToDelete?.author?.full_name
            ? `¿Estás seguro de que deseas eliminar este mensaje publicado por "${postToDelete.author.full_name}"?`
            : '¿Estás seguro de que deseas eliminar este mensaje?'
        }
        note="Esta acción borrará el mensaje de forma permanente en la base de datos de la plataforma."
        confirmText="Eliminar definitivamente"
        cancelText="Cancelar"
        isDanger={true}
        loading={deletingPost}
      />

      {/* Notificación toast elegante en paleta LIATER (Navy + Dorado) */}
      {toastFeedback && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--navy, #0b1528)',
          color: '#ffffff',
          padding: '0.8rem 1.35rem',
          borderRadius: '10px',
          boxShadow: '0 10px 25px -5px rgba(11, 21, 40, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          fontSize: '0.85rem',
          fontWeight: 600,
          zIndex: 9999,
          border: '1.5px solid rgba(204, 163, 82, 0.4)',
          animation: 'fadeSlideUp 0.25s ease-out',
        }}>
          <CheckCircle2 size={17} color="var(--gold, #cca352)" />
          <span>{toastFeedback}</span>
        </div>
      )}
    </div>
  );
}
