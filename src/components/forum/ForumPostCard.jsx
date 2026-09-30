/**
 * ForumPostCard.jsx
 * Tarjeta de respuesta o post dentro del detalle de una discusión académica.
 * Diseño LMS profesional:
 * - Avatar con iniciales y rol académico (Docente, Admin, Estudiante)
 * - Destacado institucional para respuestas verificadas como Solución (Verde UNAL)
 * - Botón de reacción útil con contador interactivo
 * - Acciones de moderación y eliminación sin ruido visual
 */
import { useState } from 'react';
import { ThumbsUp, Reply, Trash2, CheckCircle2, ShieldCheck, Check } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

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

export default function ForumPostCard({
  post,
  isNested = false,
  canModerate = false,    // docente o admin
  isThreadAuthor = false, // el autor del hilo puede marcar solución
  userProfileId,
  onReply,               // callback (post) => void
  onMarkSolution,        // callback (postId) => void
  onDelete,              // callback (postId) => void
  onReactionChange,      // callback() → refetch
}) {
  const { currentUser } = useAuth();
  const [reactionCount, setReactionCount]   = useState(post.reaction_count ?? 0);
  const [userReacted, setUserReacted]       = useState(post.user_reacted ?? false);
  const [reactLoading, setReactLoading]     = useState(false);

  if (post.is_deleted) {
    return null;
  }

  const effectiveUserId = userProfileId || currentUser?.id;
  const isOwnPost = effectiveUserId && post.author_id === effectiveUserId;
  const isAdmin = currentUser?.role === 'admin';
  const canDelete = isAdmin || isOwnPost;
  const authorName = post.author?.full_name || 'Usuario';
  const authorRole = post.author?.role || 'student';
  const roleBadge  = getRoleBadge(authorRole);
  const initials   = getInitials(authorName);

  const handleReaction = async () => {
    if (reactLoading || !effectiveUserId) return;
    setReactLoading(true);
    try {
      if (userReacted) {
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', effectiveUserId);
        setReactionCount(c => Math.max(0, c - 1));
        setUserReacted(false);
      } else {
        await supabase
          .from('forum_reactions')
          .insert({ post_id: post.id, user_id: effectiveUserId, reaction_type: 'useful' });
        setReactionCount(c => c + 1);
        setUserReacted(true);
      }
      if (onReactionChange) onReactionChange();
    } catch (err) {
      console.error('Error reacción:', err);
    } finally {
      setReactLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      padding: isNested ? '0.9rem 1.15rem' : '1.15rem 1.35rem',
      marginLeft: isNested ? '1.75rem' : 0,
      background: post.is_solution
        ? 'rgba(0, 122, 46, 0.035)'
        : isNested
          ? '#f8fafc'
          : '#ffffff',
      border: post.is_solution
        ? '1.5px solid rgba(0, 122, 46, 0.35)'
        : '1px solid #e2e8f0',
      borderRadius: '12px',
      position: 'relative',
      boxShadow: post.is_solution
        ? '0 2px 8px rgba(0, 122, 46, 0.06)'
        : '0 1px 3px rgba(11, 21, 40, 0.02)',
      transition: 'all 0.15s ease',
    }}>

      {/* Banner de Solución Verificada */}
      {post.is_solution && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingBottom: '0.6rem',
          borderBottom: '1px solid rgba(0, 122, 46, 0.15)',
        }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.76rem',
            fontWeight: 700,
            color: '#007a2e',
            background: 'rgba(0, 122, 46, 0.1)',
            padding: '0.2rem 0.65rem',
            borderRadius: '999px',
          }}>
            <CheckCircle2 size={13} />
            <span>Respuesta validada como solución</span>
          </span>

          {(isThreadAuthor || canModerate) && onMarkSolution && (
            <button
              onClick={() => onMarkSolution(post.id)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.72rem',
                color: '#64748b',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Desmarcar solución
            </button>
          )}
        </div>
      )}

      {/* Encabezado: Avatar + Autor + Fecha */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: authorRole === 'admin'
              ? 'linear-gradient(135deg, #14213d, #2d3748)'
              : authorRole === 'teacher'
                ? 'linear-gradient(135deg, #1e3a8a, #3b82f6)'
                : 'linear-gradient(135deg, #334155, #64748b)',
            color: '#ffffff',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            {initials}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy, #0b1528)' }}>
                {authorName}
              </span>
              <span style={{
                fontSize: '0.66rem',
                fontWeight: 600,
                color: roleBadge.color,
                background: roleBadge.bg,
                border: `1px solid ${roleBadge.border}`,
                borderRadius: '999px',
                padding: '0.1rem 0.45rem',
              }}>
                {roleBadge.label}
              </span>
            </div>
            <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
              {timeAgo(post.created_at)}
              {post.updated_at !== post.created_at && ' · editado'}
            </span>
          </div>
        </div>
      </div>

      {/* Cuerpo del post */}
      <div style={{
        fontSize: '0.88rem',
        color: '#334155',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {post.body}
      </div>

      {/* Barra de Acciones */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        flexWrap: 'wrap',
        marginTop: '0.15rem',
        paddingTop: '0.6rem',
        borderTop: '1px solid #f1f5f9',
      }}>
        {/* Reacción 👍 Útil */}
        <button
          onClick={handleReaction}
          disabled={reactLoading || !effectiveUserId}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.76rem',
            fontWeight: 600,
            color: userReacted ? 'var(--navy, #0b1528)' : '#64748b',
            background: userReacted ? 'rgba(252, 163, 17, 0.15)' : '#ffffff',
            border: `1px solid ${userReacted ? 'var(--gold, #cca352)' : '#e2e8f0'}`,
            borderRadius: '6px',
            padding: '0.28rem 0.65rem',
            cursor: reactLoading || !effectiveUserId ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={userReacted ? 'Quitar reacción' : 'Marcar como útil'}
        >
          <ThumbsUp size={13} color={userReacted ? 'var(--gold, #cca352)' : '#94a3b8'} />
          <span>Útil {reactionCount > 0 ? `(${reactionCount})` : ''}</span>
        </button>

        {/* Responder */}
        {!post.is_locked && onReply && (
          <button
            onClick={() => onReply(post)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#475569',
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '0.28rem 0.65rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
              e.currentTarget.style.color = 'var(--navy, #0b1528)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#e2e8f0';
              e.currentTarget.style.color = '#475569';
            }}
          >
            <Reply size={13} />
            <span>Responder</span>
          </button>
        )}

        {/* Marcar como solución (autor del hilo o moderador) */}
        {(isThreadAuthor || canModerate) && !post.is_solution && onMarkSolution && (
          <button
            onClick={() => onMarkSolution(post.id)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.76rem',
              fontWeight: 600,
              color: '#007a2e',
              background: 'rgba(0, 122, 46, 0.08)',
              border: '1px solid rgba(0, 122, 46, 0.25)',
              borderRadius: '6px',
              padding: '0.28rem 0.65rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Marcar esta respuesta como la solución aceptada"
          >
            <Check size={13} />
            <span>Marcar solución</span>
          </button>
        )}

        {/* Eliminar (Admin cualquier post, o autor de su propio post) */}
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(post)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.74rem',
              fontWeight: 600,
              color: '#dc2626',
              background: 'rgba(220, 38, 38, 0.05)',
              border: '1px solid rgba(220, 38, 38, 0.22)',
              borderRadius: '6px',
              padding: '0.25rem 0.55rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              marginLeft: 'auto',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = '#dc2626';
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.borderColor = '#dc2626';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.22)';
            }}
            title="Eliminar mensaje permanentemente"
          >
            <Trash2 size={12} />
            <span>Eliminar</span>
          </button>
        )}
      </div>
    </div>
  );
}
