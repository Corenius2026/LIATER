import React from 'react';
import { ShieldAlert, Trash2, X, Pencil } from 'lucide-react';

export function RoleBadge({ role }) {
  const map = { admin: ['role-badge role-admin', 'Administrador'], teacher: ['role-badge role-teacher', 'Profesor'], student: ['role-badge role-student', 'Estudiante'] };
  const [cls, label] = map[role] ?? ['role-badge', role];
  return <span className={cls}>{label}</span>;
}

export function StatusBadge({ status }) {
  const map = {
    active:    ['role-badge status-active', 'Activo'],
    inactive:  ['role-badge status-inactive', 'Inactivo'],
    completed: ['role-badge status-completed', 'Completada'],
    upcoming:  ['role-badge status-upcoming', 'Próxima'],
    cancelled: ['role-badge status-inactive', 'Cancelada'],
  };
  const [cls, label] = map[status] ?? ['role-badge', status];
  return <span className={cls}>{label}</span>;
}

export function TypeBadge({ type }) {
  const map = {
    pdf:          ['role-badge type-pdf', 'PDF'],
    presentation: ['role-badge type-presentation', 'Presentación'],
    link:         ['role-badge type-link', 'Enlace'],
    file:         ['role-badge type-file', 'Archivo'],
    video:        ['role-badge type-presentation', 'Video'],
  };
  const [cls, label] = map[type] ?? ['role-badge', type];
  return <span className={cls}>{label}</span>;
}

export function Initials({ name }) {
  const parts = (name || '').trim().split(' ');
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return <div className="user-avatar-initials">{letters.toUpperCase()}</div>;
}

export function ActionBtns({ onEdit, onDelete }) {
  return (
    <div className="action-btns">
      <button className="btn-icon edit" title="Editar" onClick={onEdit}><Pencil size={15} /></button>
      <button className="btn-icon del"  title="Eliminar" onClick={onDelete}><Trash2 size={15} /></button>
    </div>
  );
}

export function LoadingRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Cargando datos...
      </td>
    </tr>
  );
}

export function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        {message}
      </td>
    </tr>
  );
}

export function ConfirmModal({ isOpen, title, message, note, confirmText = 'Eliminar', cancelText = 'Cancelar', onConfirm, onClose, loading }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200
    }}>
      <div className="card" style={{
        width: '100%', maxWidth: '440px', background: '#ffffff',
        padding: '1.75rem', borderRadius: '16px', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        border: '1px solid #e2e8f0'
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: '1.25rem', right: '1.25rem',
          background: 'none', border: 'none', cursor: 'pointer', color: '#64748b',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '4px', borderRadius: '50%', transition: 'all 0.2s'
        }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '50%',
            backgroundColor: '#fee2e2', color: '#dc2626',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Trash2 size={24} />
          </div>
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', color: '#0f172a', margin: '0 0 0.35rem 0' }}>
              {title}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.9rem', lineHeight: '1.45', margin: 0 }}>
              {message}
            </p>
          </div>
        </div>

        {note && (
          <div style={{
            backgroundColor: '#fffbe6',
            border: '1px solid #fde68a',
            borderRadius: '8px',
            padding: '0.75rem 1rem',
            marginBottom: '0.5rem',
            fontSize: '0.825rem',
            color: '#92400e',
            lineHeight: 1.45,
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={16} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
            <span><strong>Nota:</strong> {note}</span>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #cbd5e1',
              background: '#f1f5f9', color: '#475569', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
              background: '#dc2626', color: '#ffffff', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 2px 4px rgba(220, 38, 38, 0.2)'
            }}
          >
            {loading ? 'Procesando...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
