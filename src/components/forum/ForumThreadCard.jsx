/**
 * ForumThreadCard
 * Tarjeta que representa un hilo del foro en la vista de lista.
 * Muestra: título, autor, categoría, fecha, conteo de respuestas,
 * badges de resuelto/pineado/cerrado, e indicador de no leído.
 */
import { useNavigate } from 'react-router-dom';
import { Pin, CheckCircle2, Lock, MessageCircle, Eye, Trash2 } from 'lucide-react';
import ForumCategoryBadge from './ForumCategoryBadge';

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)       return 'Ahora mismo';
  if (diff < 3600)     return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)    return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 2592000)  return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export default function ForumThreadCard({ thread, isUnread = false, canDelete = false, onDelete = null }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/foro/hilo/${thread.id}`);
  };

  const authorName = thread.author?.full_name || 'Usuario';
  const replyCount = thread.reply_count ?? 0;
  const views      = thread.views_count ?? 0;

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && handleClick()}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem 1.25rem',
        background: isUnread ? 'rgba(37, 99, 235, 0.04)' : 'var(--white, #fff)',
        border: `1px solid ${isUnread ? 'rgba(37, 99, 235, 0.2)' : 'var(--border-color, #e2e8f0)'}`,
        borderRadius: '10px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
      }}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)';
        e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = isUnread ? 'rgba(37, 99, 235, 0.2)' : 'var(--border-color, #e2e8f0)';
      }}
    >
      {/* Fila superior: badges de estado + categoría */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
        {thread.is_pinned && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 600, color: '#b45309' }}>
            <Pin size={11} /> Fijado
          </span>
        )}
        {thread.is_resolved && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 600, color: '#15803d' }}>
            <CheckCircle2 size={11} /> Resuelto
          </span>
        )}
        {thread.is_locked && (
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', fontWeight: 600, color: '#64748b' }}>
            <Lock size={11} /> Cerrado
          </span>
        )}
        <ForumCategoryBadge category={thread.category} size="xs" />
        {isUnread && (
          <span style={{
            width: '7px', height: '7px', borderRadius: '50%',
            background: '#2563eb', flexShrink: 0,
            boxShadow: '0 0 0 2px rgba(37,99,235,0.2)'
          }} title="Nuevo contenido" />
        )}
      </div>

      {/* Título */}
      <h3 style={{
        margin: 0,
        fontSize: '0.95rem',
        fontWeight: 700,
        color: 'var(--text-dark, #0b1528)',
        lineHeight: 1.35,
      }}>
        {thread.title}
      </h3>

      {/* Extracto del cuerpo */}
      <p style={{
        margin: 0,
        fontSize: '0.82rem',
        color: 'var(--text-muted, #64748b)',
        lineHeight: 1.5,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {thread.body}
      </p>

      {/* Fila inferior: autor, fecha, contadores */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.4rem',
        marginTop: '0.15rem',
      }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
          <strong style={{ color: 'var(--text-dark, #0b1528)', fontWeight: 600 }}>{authorName}</strong>
          {' · '}{timeAgo(thread.created_at)}
          {thread.class_session?.title && (
            <span style={{ marginLeft: '0.35rem', color: '#7c3aed' }}>
              · 📚 {thread.class_session.title}
            </span>
          )}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            <MessageCircle size={13} /> {replyCount}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.78rem', color: 'var(--text-muted, #64748b)' }}>
            <Eye size={13} /> {views}
          </span>
          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread);
              }}
              title="Eliminar hilo de discusión"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: '#dc2626',
                background: 'rgba(220, 38, 38, 0.05)',
                border: '1px solid rgba(220, 38, 38, 0.25)',
                borderRadius: '6px',
                padding: '0.25rem 0.55rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = '#dc2626';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.borderColor = '#dc2626';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(220, 38, 38, 0.05)';
                e.currentTarget.style.color = '#dc2626';
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.25)';
              }}
            >
              <Trash2 size={12} />
              <span>Eliminar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
