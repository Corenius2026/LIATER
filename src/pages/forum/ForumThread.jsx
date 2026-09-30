/**
 * ForumThread.jsx
 * Vista detallada de un hilo del foro académico LIATER.
 * Diseño LMS profesional:
 * - Navegación contextual y migas de pan limpias
 * - Tarjeta principal del hilo con avatar del autor, rol, badges y tipografía de lectura
 * - Barra de herramientas de moderación para docentes y administradores
 * - Listado de respuestas con destacado de Solución (Verde UNAL) y respuestas anidadas
 * - Compositor de respuestas enriquecido con foco dorado y botón Navy institucional
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pin, PinOff, Lock, Unlock, CheckCircle2,
  Send, Loader2, AlertCircle, MessageSquare, Trash2,
  BookOpen, CornerDownRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  getThreadDetail, createPost, markPostSolution,
  deletePostFromDb, deleteThreadFromDb, updateThreadStatus
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

function getInitials(name) {
  if (!name) return 'U';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

function getRoleBadge(role) {
  if (role === 'admin') {
    return { label: 'Admin', color: '#b45309', bg: 'rgba(180, 83, 9, 0.08)', border: 'rgba(180, 83, 9, 0.22)' };
  }
  if (role === 'teacher') {
    return { label: 'Docente', color: '#1e3a8a', bg: 'rgba(30, 58, 138, 0.08)', border: 'rgba(30, 58, 138, 0.22)' };
  }
  return { label: 'Estudiante', color: '#475569', bg: 'rgba(71, 85, 105, 0.06)', border: 'rgba(71, 85, 105, 0.16)' };
}

export default function ForumThread() {
  const { threadId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [thread, setThread]             = useState(null);
  const [posts, setPosts]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');

  const userProfileId = currentUser?.id ?? null;
  const userRole      = currentUser?.role ?? 'student';

  // Estados de respuesta
  const [replyingTo, setReplyingTo]     = useState(null);
  const [replyBody, setReplyBody]       = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError]     = useState('');

  // Estados de eliminación y feedback
  const [postToDelete, setPostToDelete] = useState(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [showDeleteThreadModal, setShowDeleteThreadModal] = useState(false);
  const [deletingThread, setDeletingThread] = useState(false);
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

  // Iniciar flujo de eliminación de mensaje
  const handleDeletePost = (postOrId) => {
    const postObj = typeof postOrId === 'object' && postOrId !== null
      ? postOrId
      : posts.find(p => p.id === postOrId);
    setPostToDelete(postObj || { id: postOrId });
  };

  // Confirmar y ejecutar eliminación de mensaje de la base de datos
  const handleConfirmDeletePost = async () => {
    if (!postToDelete?.id) return;
    setDeletingPost(true);
    try {
      await deletePostFromDb(postToDelete.id);
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

  // Confirmar y eliminar el hilo completo (Admin)
  const handleConfirmDeleteThread = async () => {
    if (!thread?.id) return;
    setDeletingThread(true);
    try {
      await deleteThreadFromDb(thread.id);
      navigate(`/foro/${thread.program_id || ''}`, { replace: true });
    } catch (err) {
      console.error('Error eliminando hilo:', err);
      alert('Error al eliminar el hilo: ' + (err.message || 'Intenta de nuevo.'));
      setDeletingThread(false);
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

  const modBtnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.35rem 0.75rem',
    borderRadius: '7px',
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#475569',
    fontSize: '0.78rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  };

  if (loading) {
    return (
      <div style={{
        maxWidth: '1040px',
        margin: '0 auto',
        padding: '5rem 1rem',
        textAlign: 'center',
      }}>
        <div style={{
          width: '36px',
          height: '36px',
          border: '3px solid #e2e8f0',
          borderTopColor: 'var(--gold, #cca352)',
          borderRadius: '50%',
          animation: 'liaterSpin 0.75s linear infinite',
          margin: '0 auto 0.85rem',
        }} />
        <style>{`@keyframes liaterSpin { to { transform: rotate(360deg); } }`}</style>
        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#64748b' }}>
          Cargando discusión académica...
        </span>
      </div>
    );
  }

  if (error || !thread) {
    return (
      <div style={{ maxWidth: '1040px', margin: '2rem auto', padding: '1rem' }}>
        <div style={{
          padding: '1.25rem 1.5rem',
          borderRadius: '12px',
          background: 'rgba(220, 38, 38, 0.05)',
          border: '1px solid rgba(220, 38, 38, 0.25)',
          color: '#dc2626',
          fontSize: '0.9rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
        }}>
          <AlertCircle size={20} />
          <span>{error || 'Hilo de discusión no encontrado.'}</span>
        </div>
        <button
          onClick={() => navigate(-1)}
          style={{
            marginTop: '1.25rem',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            color: 'var(--navy, #0b1528)',
            fontWeight: 700,
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
          }}
        >
          <ArrowLeft size={16} /> Volver
        </button>
      </div>
    );
  }

  const threadAuthorName = thread.author?.full_name || 'Usuario';
  const threadAuthorRole = thread.author?.role || 'student';
  const threadRoleBadge  = getRoleBadge(threadAuthorRole);
  const threadInitials   = getInitials(threadAuthorName);

  return (
    <div style={{
      maxWidth: '1040px',
      margin: '0 auto',
      padding: '1.75rem 1.25rem 3.5rem',
    }}>

      {/* ── BARRA DE NAVEGACIÓN SUPERIOR / BREADCRUMB ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        marginBottom: '1.25rem',
      }}>
        <button
          onClick={() => navigate(`/foro/${thread.program_id || ''}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '0.42rem 0.85rem',
            cursor: 'pointer',
            color: 'var(--navy, #0b1528)',
            fontSize: '0.82rem',
            fontWeight: 700,
            transition: 'all 0.15s ease',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
          onMouseOver={e => {
            e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
            e.currentTarget.style.background = '#f8fafc';
          }}
          onMouseOut={e => {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.background = '#ffffff';
          }}
        >
          <ArrowLeft size={15} />
          <span>Volver al listado de discusiones</span>
        </button>

        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 500 }}>
          ID de discusión: #{thread.id?.slice(0, 8)}
        </span>
      </div>

      {/* ── TARJETA PRINCIPAL DEL HILO (PREGUNTA / TEMA) ── */}
      <div style={{
        padding: '1.6rem 1.85rem',
        background: '#ffffff',
        border: thread.is_pinned
          ? '1.5px solid rgba(252, 163, 17, 0.45)'
          : '1px solid #e2e8f0',
        borderRadius: '14px',
        marginBottom: '1.75rem',
        boxShadow: thread.is_pinned
          ? '0 3px 12px rgba(252, 163, 17, 0.08)'
          : '0 1px 4px rgba(11, 21, 40, 0.03)',
      }}>
        {/* Metadatos del Autor y Badges Superiores */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          paddingBottom: '1rem',
          marginBottom: '1rem',
          borderBottom: '1px solid #f1f5f9',
        }}>
          {/* Bloque del Autor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: threadAuthorRole === 'admin'
                ? 'linear-gradient(135deg, #14213d, #2d3748)'
                : threadAuthorRole === 'teacher'
                  ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                  : 'linear-gradient(135deg, #334155, #64748b)',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}>
              {threadInitials}
            </div>

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--navy, #0b1528)' }}>
                  {threadAuthorName}
                </span>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  color: threadRoleBadge.color,
                  background: threadRoleBadge.bg,
                  border: `1px solid ${threadRoleBadge.border}`,
                  borderRadius: '999px',
                  padding: '0.1rem 0.45rem',
                }}>
                  {threadRoleBadge.label}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: '#64748b', marginTop: '0.15rem' }}>
                <span>Publicado {timeAgo(thread.created_at)}</span>
                {thread.class_session?.title && (
                  <>
                    <span style={{ color: '#cbd5e1' }}>·</span>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      color: '#4f46e5',
                      fontWeight: 600,
                    }}>
                      <BookOpen size={12} /> {thread.class_session.title}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Badges de Categoría y Estado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <ForumCategoryBadge category={thread.category} />

            {thread.is_pinned && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#92400e',
                background: 'rgba(252, 163, 17, 0.14)',
                border: '1px solid rgba(252, 163, 17, 0.35)',
                borderRadius: '999px',
                padding: '0.2rem 0.6rem',
              }}>
                <Pin size={12} /> Fijado
              </span>
            )}

            {thread.is_resolved && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 700,
                color: '#007a2e',
                background: 'rgba(0, 122, 46, 0.1)',
                border: '1px solid rgba(0, 122, 46, 0.25)',
                borderRadius: '999px',
                padding: '0.2rem 0.6rem',
              }}>
                <CheckCircle2 size={12} /> Resuelto
              </span>
            )}

            {thread.is_locked && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: '#64748b',
                background: 'rgba(100, 116, 139, 0.08)',
                border: '1px solid rgba(100, 116, 139, 0.2)',
                borderRadius: '999px',
                padding: '0.2rem 0.6rem',
              }}>
                <Lock size={12} /> Cerrado
              </span>
            )}
          </div>
        </div>

        {/* Título de la discusión */}
        <h1 style={{
          margin: '0 0 0.85rem',
          fontSize: '1.35rem',
          fontWeight: 800,
          color: 'var(--navy, #0b1528)',
          lineHeight: 1.35,
          letterSpacing: '-0.01em',
        }}>
          {thread.title}
        </h1>

        {/* Cuerpo del hilo */}
        <div style={{
          fontSize: '0.92rem',
          color: '#334155',
          lineHeight: 1.7,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}>
          {thread.body}
        </div>

        {/* ── BARRA DE HERRAMIENTAS DE MODERACIÓN (DOCENTE Y ADMIN) ── */}
        {canModerate && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            flexWrap: 'wrap',
            marginTop: '1.35rem',
            paddingTop: '1rem',
            borderTop: '1px solid #f1f5f9',
          }}>
            <span style={{ fontSize: '0.73rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginRight: '0.2rem' }}>
              Herramientas de Cátedra:
            </span>

            <button
              onClick={handleTogglePin}
              style={modBtnBase}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--gold, #cca352)'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              {thread.is_pinned ? <><PinOff size={13} /> Desfijar</> : <><Pin size={13} /> Fijar</>}
            </button>

            <button
              onClick={handleToggleLock}
              style={modBtnBase}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--gold, #cca352)'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#cbd5e1'}
            >
              {thread.is_locked ? <><Unlock size={13} /> Reabrir</> : <><Lock size={13} /> Cerrar discusión</>}
            </button>

            <button
              onClick={handleToggleResolved}
              style={{
                ...modBtnBase,
                color: thread.is_resolved ? '#007a2e' : '#475569',
                borderColor: thread.is_resolved ? 'rgba(0, 122, 46, 0.35)' : '#cbd5e1',
                background: thread.is_resolved ? 'rgba(0, 122, 46, 0.05)' : '#ffffff',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = 'var(--gold, #cca352)'}
              onMouseOut={e => e.currentTarget.style.borderColor = thread.is_resolved ? 'rgba(0, 122, 46, 0.35)' : '#cbd5e1'}
            >
              <CheckCircle2 size={13} color={thread.is_resolved ? '#007a2e' : undefined} />
              <span>{thread.is_resolved ? 'Reabrir duda' : 'Marcar resuelta'}</span>
            </button>

            {/* Eliminar hilo definitivamente (Exclusivo Admin) */}
            {userRole === 'admin' && (
              <button
                type="button"
                onClick={() => setShowDeleteThreadModal(true)}
                style={{
                  ...modBtnBase,
                  color: '#dc2626',
                  borderColor: 'rgba(220, 38, 38, 0.25)',
                  background: 'rgba(220, 38, 38, 0.04)',
                  marginLeft: 'auto',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.borderColor = '#dc2626';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(220, 38, 38, 0.04)';
                  e.currentTarget.style.color = '#dc2626';
                  e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.25)';
                }}
                title="Eliminar este hilo definitivamente (Solo Admin)"
              >
                <Trash2 size={13} />
                <span>Eliminar hilo</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── SECCIÓN DE RESPUESTAS ── */}
      <div style={{ marginBottom: '1.85rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1rem',
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '1.08rem',
            fontWeight: 800,
            color: 'var(--navy, #0b1528)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
          }}>
            <span>Respuestas a la discusión</span>
            <span style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              padding: '0.15rem 0.55rem',
              borderRadius: '999px',
              background: 'rgba(20, 33, 61, 0.08)',
              color: 'var(--navy, #0b1528)',
            }}>
              {posts.filter(p => !p.is_deleted).length}
            </span>
          </h2>
        </div>

        {topLevelPosts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2.75rem 1.5rem',
            background: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            color: '#64748b',
          }}>
            <MessageSquare size={32} style={{ margin: '0 auto 0.6rem', opacity: 0.3 }} />
            <p style={{ margin: '0 0 0.3rem', fontWeight: 600, fontSize: '0.92rem' }}>
              Aún no hay respuestas en esta discusión
            </p>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
              Aporta una respuesta técnica o formula una consulta adicional abajo.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {topLevelPosts.map(post => (
              <div key={post.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
                  <div style={{
                    marginLeft: '2rem',
                    paddingLeft: '0.9rem',
                    borderLeft: '2px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
                  }}>
                    {repliesMap[post.id].map(reply => (
                      <ForumPostCard
                        key={reply.id}
                        post={reply}
                        isNested={true}
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

      {/* ── CAJA DE RESPUESTA / COMPOSITOR ── */}
      {thread.is_locked ? (
        <div style={{
          padding: '1.25rem',
          borderRadius: '12px',
          textAlign: 'center',
          background: 'rgba(100, 116, 139, 0.08)',
          border: '1px solid rgba(100, 116, 139, 0.2)',
          color: '#475569',
          fontSize: '0.86rem',
          fontWeight: 600,
        }}>
          🔒 Este hilo ha sido cerrado por la moderación. No se admiten nuevas intervenciones.
        </div>
      ) : (
        <div style={{
          padding: '1.4rem 1.6rem',
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          borderRadius: '14px',
          boxShadow: '0 2px 8px rgba(11, 21, 40, 0.04)',
        }}>
          {replyingTo && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '0.85rem',
              padding: '0.45rem 0.85rem',
              background: 'rgba(30, 58, 138, 0.06)',
              border: '1px solid rgba(30, 58, 138, 0.15)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#1e3a8a',
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <CornerDownRight size={14} />
                <span>Respondiendo directamente al comentario de <strong>{replyingTo.author?.full_name || 'un participante'}</strong></span>
              </span>
              <button
                type="button"
                onClick={() => setReplyingTo(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#1e3a8a',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                }}
              >
                ✕ Cancelar
              </button>
            </div>
          )}

          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--navy, #0b1528)',
              marginBottom: '0.4rem',
            }}>
              {replyingTo ? 'Tu réplica al comentario:' : 'Publicar una respuesta:'}
            </label>
            <textarea
              ref={replyBoxRef}
              rows={3}
              value={replyBody}
              onChange={e => setReplyBody(e.target.value)}
              placeholder={replyingTo ? 'Escribe tu respuesta a este comentario académico...' : 'Escribe tu respuesta técnica o comentario aquí...'}
              disabled={sendingReply}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.75rem 0.95rem',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
                color: 'var(--navy, #0b1528)',
                background: '#f8fafc',
                transition: 'all 0.15s ease',
              }}
              onFocus={e => {
                e.target.style.borderColor = 'var(--gold, #cca352)';
                e.target.style.background = '#ffffff';
                e.target.style.boxShadow = '0 0 0 3px rgba(252, 163, 17, 0.15)';
              }}
              onBlur={e => {
                e.target.style.borderColor = '#cbd5e1';
                e.target.style.background = '#f8fafc';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {replyError && (
            <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: '0.75rem' }}>
              {replyError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '0.65rem' }}>
            <button
              onClick={handleSendReply}
              disabled={sendingReply || !replyBody.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.6rem 1.35rem',
                borderRadius: '8px',
                background: 'var(--navy, #0b1528)',
                color: '#ffffff',
                border: '1.5px solid rgba(252, 163, 17, 0.45)',
                fontWeight: 700,
                fontSize: '0.85rem',
                boxShadow: '0 2px 8px rgba(11, 21, 40, 0.15)',
                cursor: sendingReply || !replyBody.trim() ? 'not-allowed' : 'pointer',
                opacity: sendingReply || !replyBody.trim() ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
              onMouseOver={e => {
                if (!sendingReply && replyBody.trim()) {
                  e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(252, 163, 17, 0.25)';
                }
              }}
              onMouseOut={e => {
                if (!sendingReply && replyBody.trim()) {
                  e.currentTarget.style.borderColor = 'rgba(252, 163, 17, 0.45)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(11, 21, 40, 0.15)';
                }
              }}
            >
              {sendingReply ? <Loader2 size={15} style={{ animation: 'liaterSpin 0.75s linear infinite' }} /> : <Send size={15} color="var(--gold, #cca352)" />}
              <span>{sendingReply ? 'Publicando...' : 'Publicar respuesta'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar post (Admin o autor) */}
      <ConfirmModal
        isOpen={Boolean(postToDelete)}
        onClose={() => !deletingPost && setPostToDelete(null)}
        onConfirm={handleConfirmDeletePost}
        title="Eliminar mensaje"
        message={
          postToDelete?.author?.full_name
            ? `¿Estás seguro de que deseas eliminar permanentemente este mensaje publicado por "${postToDelete.author.full_name}"?`
            : '¿Estás seguro de que deseas eliminar este mensaje?'
        }
        note="Esta acción borrará el mensaje de forma permanente en la base de datos de la plataforma."
        confirmText="Eliminar definitivamente"
        cancelText="Cancelar"
        isDanger={true}
        loading={deletingPost}
      />

      {/* Modal de confirmación para eliminar hilo completo (Admin) */}
      <ConfirmModal
        isOpen={showDeleteThreadModal}
        onClose={() => !deletingThread && setShowDeleteThreadModal(false)}
        onConfirm={handleConfirmDeleteThread}
        title="Eliminar hilo de discusión"
        message={
          thread?.title
            ? `¿Estás seguro de que deseas eliminar permanentemente el hilo "${thread.title}"?`
            : '¿Estás seguro de que deseas eliminar este hilo de discusión?'
        }
        note="Esta acción es irreversible y eliminará el hilo junto con todas sus respuestas y reacciones de la base de datos."
        confirmText="Eliminar hilo definitivamente"
        cancelText="Cancelar"
        isDanger={true}
        loading={deletingThread}
      />

      {/* Notificación toast elegante en paleta LIATER (Navy + Dorado) */}
      {toastFeedback && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          background: 'var(--navy, #0b1528)',
          color: '#ffffff',
          padding: '0.85rem 1.45rem',
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
