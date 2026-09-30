/**
 * ForumThreadCard.jsx
 * Tarjeta de hilo de discusión en la vista de lista del foro.
 * Diseño LMS profesional: tipografía Inter, paleta institucional (Navy #14213D, Gold #FCA311, White, Slate),
 * avatar con iniciales, badges semánticos, métricas y controles de moderación para administradores.
 */
import { useNavigate } from 'react-router-dom';
import { Pin, CheckCircle2, Lock, MessageCircle, Eye, Trash2, BookOpen } from 'lucide-react';
import ForumCategoryBadge from './ForumCategoryBadge';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60)       return 'Ahora mismo';
  if (diff < 3600)     return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400)    return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 2592000)  return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
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

export default function ForumThreadCard({ thread, isUnread = false, canDelete = false, onDelete = null }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/foro/hilo/${thread.id}`);
  };

  const authorName = thread.author?.full_name || 'Usuario';
  const authorRole = thread.author?.role || 'student';
  const roleBadge  = getRoleBadge(authorRole);
  const initials   = getInitials(authorName);
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
        gap: '0.75rem',
        padding: '1.15rem 1.35rem',
        background: '#ffffff',
        border: thread.is_pinned
          ? '1.5px solid rgba(252, 163, 17, 0.45)'
          : isUnread
            ? '1px solid rgba(37, 99, 235, 0.28)'
            : '1px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        boxShadow: thread.is_pinned
          ? '0 2px 8px rgba(252, 163, 17, 0.08)'
          : '0 1px 3px rgba(11, 21, 40, 0.03)',
      }}
      onMouseOver={e => {
        e.currentTarget.style.boxShadow = '0 6px 20px -2px rgba(11, 21, 40, 0.08)';
        e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseOut={e => {
        e.currentTarget.style.boxShadow = thread.is_pinned
          ? '0 2px 8px rgba(252, 163, 17, 0.08)'
          : '0 1px 3px rgba(11, 21, 40, 0.03)';
        e.currentTarget.style.borderColor = thread.is_pinned
          ? 'rgba(252, 163, 17, 0.45)'
          : isUnread
            ? 'rgba(37, 99, 235, 0.28)'
            : '#e2e8f0';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Fila Superior: Autor + Badges de Estado */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.6rem',
      }}>
        {/* Bloque Autor */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {/* Avatar con iniciales */}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}>
            {initials}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy, #0b1528)' }}>
              {authorName}
            </span>
            <span style={{
              fontSize: '0.68rem',
              fontWeight: 600,
              color: roleBadge.color,
              background: roleBadge.bg,
              border: `1px solid ${roleBadge.border}`,
              borderRadius: '999px',
              padding: '0.1rem 0.45rem',
            }}>
              {roleBadge.label}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>·</span>
            <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
              {timeAgo(thread.created_at)}
            </span>
          </div>
        </div>

        {/* Badges de Categoría y Estado */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
          {thread.is_pinned && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#92400e',
              background: 'rgba(252, 163, 17, 0.14)',
              border: '1px solid rgba(252, 163, 17, 0.35)',
              borderRadius: '999px',
              padding: '0.15rem 0.55rem',
            }}>
              <Pin size={11} /> Fijado
            </span>
          )}

          {thread.is_resolved && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              fontWeight: 700,
              color: '#007a2e',
              background: 'rgba(0, 122, 46, 0.1)',
              border: '1px solid rgba(0, 122, 46, 0.25)',
              borderRadius: '999px',
              padding: '0.15rem 0.55rem',
            }}>
              <CheckCircle2 size={11} /> Resuelto
            </span>
          )}

          {thread.is_locked && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem',
              fontWeight: 600,
              color: '#64748b',
              background: 'rgba(100, 116, 139, 0.08)',
              border: '1px solid rgba(100, 116, 139, 0.2)',
              borderRadius: '999px',
              padding: '0.15rem 0.55rem',
            }}>
              <Lock size={11} /> Cerrado
            </span>
          )}

          <ForumCategoryBadge category={thread.category} size="xs" />

          {isUnread && (
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: '#2563eb',
                boxShadow: '0 0 0 3px rgba(37,99,235,0.18)',
                marginLeft: '0.1rem',
              }}
              title="Hilo con respuestas o actividad no leída"
            />
          )}
        </div>
      </div>

      {/* Título de la discusión */}
      <h3 style={{
        margin: 0,
        fontSize: '0.98rem',
        fontWeight: 700,
        color: 'var(--navy, #0b1528)',
        lineHeight: 1.4,
      }}>
        {thread.title}
      </h3>

      {/* Extracto del cuerpo */}
      {thread.body && (
        <p style={{
          margin: 0,
          fontSize: '0.84rem',
          color: '#475569',
          lineHeight: 1.55,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}>
          {thread.body}
        </p>
      )}

      {/* Fila Inferior: Sesión vinculada + Métricas + Acción Admin */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        paddingTop: '0.65rem',
        marginTop: '0.15rem',
        borderTop: '1px solid #f1f5f9',
      }}>
        {/* Sesión de clase (si existe) */}
        <div>
          {thread.class_session?.title ? (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: 500,
              color: '#4f46e5',
              background: 'rgba(79, 70, 229, 0.06)',
              borderRadius: '6px',
              padding: '0.15rem 0.5rem',
            }}>
              <BookOpen size={12} />
              <span>{thread.class_session.title}</span>
            </span>
          ) : (
            <span />
          )}
        </div>

        {/* Métricas y Acción de Eliminar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.95rem' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.78rem',
            fontWeight: replyCount > 0 ? 600 : 500,
            color: replyCount > 0 ? 'var(--navy, #0b1528)' : '#64748b',
          }}>
            <MessageCircle size={14} color={replyCount > 0 ? 'var(--gold, #cca352)' : '#94a3b8'} />
            {replyCount} {replyCount === 1 ? 'respuesta' : 'respuestas'}
          </span>

          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.78rem',
            fontWeight: 500,
            color: '#64748b',
          }}>
            <Eye size={14} color="#94a3b8" />
            {views}
          </span>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(thread);
              }}
              title="Eliminar hilo de discusión (Solo Admin)"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.28rem',
                fontSize: '0.73rem',
                fontWeight: 600,
                color: '#dc2626',
                background: 'rgba(220, 38, 38, 0.05)',
                border: '1px solid rgba(220, 38, 38, 0.22)',
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
                e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.22)';
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
