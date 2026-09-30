/**
 * ForumNewThreadModal.jsx
 * Modal para crear un nuevo hilo de discusión académica en el foro LIATER.
 * Diseño institucional pulido:
 * - Paleta Navy (#14213D) y Gold (#FCA311)
 * - Foco con resplandor dorado
 * - Píldoras de categoría semánticas
 * - Totalmente integrado con Supabase y validaciones de rol
 */
import { useState } from 'react';
import { X, Send, MessageSquarePlus, Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createThread, isForumTableMissingError } from '@/services/forumService';

const CATEGORIES = [
  { value: 'academic', label: 'Dudas Académicas' },
  { value: 'debate',   label: 'Debate / Participación' },
];

export default function ForumNewThreadModal({
  isOpen,
  onClose,
  programId,
  userProfileId,
  preTitle = '',
  preClassId = null,
  onCreated,
}) {
  const { currentUser } = useAuth();
  const effectiveUserId = userProfileId || currentUser?.id;

  const [title, setTitle]       = useState(preTitle);
  const [body, setBody]         = useState('');
  const [category, setCategory] = useState('academic');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    if (!body.trim())  { setError('El contenido no puede estar vacío.'); return; }
    if (!effectiveUserId) { setError('Debes iniciar sesión.'); return; }
    if (!programId) { setError('Programa no especificado.'); return; }

    setSaving(true);
    setError('');

    try {
      const data = await createThread({
        title: title.trim(),
        body: body.trim(),
        category,
        authorId: effectiveUserId,
        programId,
        classId: preClassId || null,
      });

      if (onCreated) onCreated(data);
      onClose();
      // Reset form
      setTitle('');
      setBody('');
      setCategory('academic');
    } catch (err) {
      console.error('Error creando hilo:', err);
      if (isForumTableMissingError(err)) {
        setError('Las tablas del foro aún no han sido migradas en la base de datos de Supabase.');
      } else {
        setError(err.message || 'No se pudo crear el hilo. Intenta de nuevo.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Overlay con desenfoque elegante */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          background: 'rgba(11, 21, 40, 0.6)',
          backdropFilter: 'blur(4px)',
          animation: 'fadeIn 0.2s ease-out',
        }}
      />

      {/* Contenedor Modal */}
      <div style={{
        position: 'fixed',
        zIndex: 1001,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(600px, 94vw)',
        background: '#ffffff',
        borderRadius: '16px',
        boxShadow: '0 25px 50px -12px rgba(11, 21, 40, 0.35)',
        display: 'flex',
        flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'modalSlideIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
      }}>
        {/* Cabecera Institucional Navy */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '1.25rem 1.6rem',
          background: 'var(--navy, #0b1528)',
          color: '#ffffff',
          borderBottom: '1px solid rgba(204, 163, 82, 0.2)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'rgba(252, 163, 17, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <MessageSquarePlus size={18} color="var(--gold, #cca352)" />
            </div>
            <div>
              <span style={{ fontWeight: 800, fontSize: '1rem', display: 'block', letterSpacing: '-0.01em' }}>
                Nueva Discusión Académica
              </span>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                Foro LIATER · Universidad Nacional de Colombia
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              padding: '0.4rem',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.15s ease',
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'}
          >
            <X size={17} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{
          padding: '1.4rem 1.6rem',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.15rem',
        }}>
          {error && (
            <div style={{
              padding: '0.75rem 1rem',
              borderRadius: '9px',
              background: 'rgba(220, 38, 38, 0.06)',
              border: '1px solid rgba(220, 38, 38, 0.25)',
              color: '#dc2626',
              fontSize: '0.84rem',
              fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* Selector de Categoría */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--navy, #0b1528)',
              marginBottom: '0.45rem',
            }}>
              Categoría de la discusión
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setCategory(cat.value)}
                    style={{
                      padding: '0.42rem 0.95rem',
                      borderRadius: '999px',
                      border: `1.5px solid ${isSelected ? 'var(--gold, #cca352)' : '#e2e8f0'}`,
                      background: isSelected ? 'rgba(252, 163, 17, 0.12)' : '#f8fafc',
                      fontSize: '0.82rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#92400e' : '#475569',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Campo Título */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #0b1528)' }}>
                Título del hilo *
              </label>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                {title.length}/200
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Escribe una pregunta o tema conciso..."
              maxLength={200}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '0.65rem 0.95rem',
                borderRadius: '9px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                outline: 'none',
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

          {/* Campo Contenido */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--navy, #0b1528)',
              marginBottom: '0.4rem',
            }}>
              Cuerpo o detalles de la pregunta *
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Explica detalladamente tu duda o comparte el punto que deseas debatir con tus compañeros y el equipo docente..."
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

          {/* Botones de acción */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '0.65rem',
            paddingTop: '0.65rem',
            borderTop: '1px solid #f1f5f9',
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.15rem',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseOut={e => e.currentTarget.style.background = '#ffffff'}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.58rem 1.35rem',
                borderRadius: '8px',
                background: 'var(--navy, #0b1528)',
                color: '#ffffff',
                border: '1.5px solid rgba(252, 163, 17, 0.45)',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
                boxShadow: '0 2px 8px rgba(11, 21, 40, 0.15)',
                transition: 'all 0.15s ease',
              }}
              onMouseOver={e => {
                if (!saving) {
                  e.currentTarget.style.borderColor = 'var(--gold, #cca352)';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(252, 163, 17, 0.25)';
                }
              }}
              onMouseOut={e => {
                if (!saving) {
                  e.currentTarget.style.borderColor = 'rgba(252, 163, 17, 0.45)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(11, 21, 40, 0.15)';
                }
              }}
            >
              {saving ? <Loader2 size={15} style={{ animation: 'liaterSpin 0.75s linear infinite' }} /> : <Send size={15} color="var(--gold, #cca352)" />}
              <span>{saving ? 'Publicando...' : 'Publicar hilo'}</span>
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
