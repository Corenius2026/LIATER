/**
 * ForumPostCard
 * Tarjeta de un post/respuesta dentro de un hilo del foro.
 * Muestra: autor, fecha, cuerpo, reacción 👍 Útil,
 * botón de responder, badge de solución, y acciones de moderación.
 */
import { useState } from 'react';
import { ThumbsUp, Reply, Trash2, CheckCircle2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)     return 'Ahora mismo';
  if (diff < 3600)   return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)  return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
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
    return (
      <div style={{
        padding: isNested ? '0.55rem 0.85rem' : '0.75rem 1rem',
        marginLeft: isNested ? '2rem' : 0,
        background: 'var(--bg-light, #f8fafc)',
        borderRadius: '8px',
        border: '1px solid var(--border-color, #e2e8f0)',
        fontSize: '0.8rem',
        color: 'var(--text-muted, #94a3b8)',
        fontStyle: 'italic',
      }}>
        [Este mensaje fue eliminado]
      </div>
    );
  }

  const isOwnPost = userProfileId && post.author_id === userProfileId;
  const authorName = post.author?.full_name || 'Usuario';
  const authorRole = post.author?.role;

  const handleReaction = async () => {
    if (reactLoading || !userProfileId) return;
    setReactLoading(true);
    try {
      if (userReacted) {
        // Quitar reacción
        await supabase
          .from('forum_reactions')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userProfileId);
        setReactionCount(c => Math.max(0, c - 1));
        setUserReacted(false);
      } else {
        // Agregar reacción
        await supabase
          .from('forum_reactions')
          .insert({ post_id: post.id, user_id: userProfileId, reaction_type: 'useful' });
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
      gap: '0.6rem',
      padding: isNested ? '0.75rem 1rem' : '1rem 1.25rem',
      marginLeft: isNested ? '2rem' : 0,
      background: post.is_solution
        ? 'rgba(21, 128, 61, 0.04)'
        : isNested
          ? 'var(--bg-light, #f8fafc)'
          : 'var(--white, #fff)',
      border: post.is_solution
        ? '1.5px solid rgba(21, 128, 61, 0.35)'
        : `1px solid var(--border-color, #e2e8f0)`,
      borderRadius: '10px',
      position: 'relative',
    }}>

      {/* Badge de solución */}
      {post.is_solution && (
        <div style={{
          position: 'absolute', top: '0.6rem', right: '0.85rem',
          display: 'flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.72rem', fontWeight: 700, color: '#15803d',
        }}>
          <CheckCircle2 size={14} /> Solución
        </div>
      )}

      {/* Encabezado: autor + fecha */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Avatar placeholder */}
        <div style={{
          width: '30px', height: '30px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #0b1528, #1e3a5f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: '0.75rem', fontWeight: 700, flexShrink: 0,
        }}>
          {authorName.charAt(0).toUpperCase()}
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-dark, #0b1528)' }}>
              {authorName}
            </span>
            {(authorRole === 'teacher' || authorRole === 'admin') && (
              <span style={{
                display: 'flex', alignItems: 'center', gap: '0.2rem',
                fontSize: '0.65rem', fontWeight: 600,
                color: authorRole === 'admin' ? '#b45309' : '#1d4ed8',
                background: authorRole === 'admin' ? 'rgba(180,83,9,0.1)' : 'rgba(29,78,216,0.1)',
                borderRadius: '999px', padding: '0.1rem 0.4rem',
              }}>
                <ShieldCheck size={10} />
                {authorRole === 'admin' ? 'Admin' : 'Docente'}
              </span>
            )}
          </div>
          <span style={{ fontSize: '0.73rem', color: 'var(--text-muted, #64748b)' }}>
            {timeAgo(post.created_at)}
            {post.updated_at !== post.created_at && ' · editado'}
          </span>
        </div>
      </div>

      {/* Cuerpo del post */}
      <div style={{
        fontSize: '0.88rem',
        color: 'var(--text-body, #334155)',
        lineHeight: 1.65,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
      }}>
        {post.body}
      </div>

      {/* Acciones */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        flexWrap: 'wrap', marginTop: '0.2rem',
      }}>
        {/* Reacción 👍 Útil */}
        <button
          onClick={handleReaction}
          disabled={reactLoading || !userProfileId}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.3rem',
            fontSize: '0.78rem', fontWeight: 600,
            color: userReacted ? '#2563eb' : 'var(--text-muted, #64748b)',
            background: userReacted ? 'rgba(37,99,235,0.1)' : 'transparent',
            border: `1px solid ${userReacted ? 'rgba(37,99,235,0.3)' : 'var(--border-color, #e2e8f0)'}`,
            borderRadius: '6px', padding: '0.3rem 0.65rem',
            cursor: reactLoading || !userProfileId ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
          }}
          title={userReacted ? 'Quitar reacción' : 'Marcar como útil'}
        >
          <ThumbsUp size={13} />
          Útil {reactionCount > 0 && `(${reactionCount})`}
        </button>

        {/* Responder */}
        {!post.is_locked && onReply && (
          <button
            onClick={() => onReply(post)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.78rem', fontWeight: 600,
              color: 'var(--text-muted, #64748b)',
              background: 'transparent',
              border: '1px solid var(--border-color, #e2e8f0)',
              borderRadius: '6px', padding: '0.3rem 0.65rem',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
          >
            <Reply size={13} /> Responder
          </button>
        )}

        {/* Marcar como solución (autor del hilo o moderador) */}
        {(isThreadAuthor || canModerate) && !post.is_solution && onMarkSolution && (
          <button
            onClick={() => onMarkSolution(post.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.78rem', fontWeight: 600, color: '#15803d',
              background: 'rgba(21,128,61,0.08)',
              border: '1px solid rgba(21,128,61,0.3)',
              borderRadius: '6px', padding: '0.3rem 0.65rem',
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            title="Marcar como respuesta correcta"
          >
            <CheckCircle2 size={13} /> Solución
          </button>
        )}

        {/* Eliminar (propio post o moderador) */}
        {(isOwnPost || canModerate) && onDelete && (
          <button
            onClick={() => onDelete(post.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              fontSize: '0.78rem', fontWeight: 600, color: '#dc2626',
              background: 'transparent',
              border: '1px solid rgba(220,38,38,0.2)',
              borderRadius: '6px', padding: '0.3rem 0.65rem',
              cursor: 'pointer', transition: 'all 0.15s ease',
              marginLeft: 'auto',
            }}
            title="Eliminar post"
          >
            <Trash2 size={13} /> Eliminar
          </button>
        )}
      </div>
    </div>
  );
}
