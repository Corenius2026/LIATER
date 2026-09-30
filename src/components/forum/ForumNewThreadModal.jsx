/**
 * ForumNewThreadModal
 * Modal para crear un nuevo hilo en el foro.
 * Acepta props opcionales: preTitle y preClassId para pre-rellenar
 * cuando se abre desde la página de una clase (ModuleDetail).
 */
import { useState } from 'react';
import { X, Send, MessageSquarePlus } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { createThread, isForumTableMissingError } from '@/services/forumService';
import ForumCategoryBadge from './ForumCategoryBadge';

const CATEGORIES = [
  { value: 'academic', label: 'Dudas Académicas' },
  { value: 'debate',   label: 'Debate / Participación' },
];

export default function ForumNewThreadModal({
  isOpen,
  onClose,
  programId,        // id del programa
  userProfileId,
  preTitle = '',    // título pre-rellenado (desde ModuleDetail)
  preClassId = null, // class_id pre-rellenado
  onCreated,        // callback (newThread) => void
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
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(11, 21, 40, 0.55)',
          backdropFilter: 'blur(3px)',
        }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', zIndex: 1001,
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, 95vw)',
        background: 'var(--white, #fff)',
        borderRadius: '14px',
        boxShadow: '0 20px 40px rgba(11, 21, 40, 0.25)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
      }}>
        {/* Cabecera */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.1rem 1.4rem',
          background: 'var(--navy, #0b1528)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <MessageSquarePlus size={18} color="var(--gold, #cca352)" />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Nuevo hilo</span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: '6px', cursor: 'pointer', padding: '0.3rem',
              color: 'white', display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.4rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {error && (
            <div style={{
              padding: '0.65rem 0.85rem', borderRadius: '8px',
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)',
              color: '#dc2626', fontSize: '0.82rem',
            }}>
              {error}
            </div>
          )}

          {/* Categoría */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark, #0b1528)', marginBottom: '0.4rem' }}>
              Categoría
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  style={{
                    padding: '0.35rem 0.85rem',
                    borderRadius: '999px',
                    border: `1.5px solid ${category === cat.value ? 'var(--gold, #cca352)' : 'var(--border-color, #e2e8f0)'}`,
                    background: category === cat.value ? 'rgba(204,163,82,0.12)' : 'transparent',
                    fontSize: '0.8rem', fontWeight: 600,
                    color: category === cat.value ? 'var(--gold-dark, #b8820a)' : 'var(--text-muted, #64748b)',
                    cursor: 'pointer',
                  }}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Título */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark, #0b1528)', marginBottom: '0.4rem' }}>
              Título del hilo *
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Escribe una pregunta o tema de debate claro..."
              maxLength={200}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.85rem', borderRadius: '8px',
                border: '1.5px solid var(--border-color, #cbd5e1)',
                fontSize: '0.88rem', outline: 'none',
              }}
            />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', float: 'right', marginTop: '0.2rem' }}>
              {title.length}/200
            </span>
          </div>

          {/* Cuerpo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark, #0b1528)', marginBottom: '0.4rem' }}>
              Contenido *
            </label>
            <textarea
              rows={5}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Explica tu duda o comparte el punto que deseas debatir con tus compañeros y docentes..."
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.65rem 0.85rem', borderRadius: '8px',
                border: '1.5px solid var(--border-color, #cbd5e1)',
                fontSize: '0.88rem', fontFamily: 'inherit', resize: 'vertical',
                outline: 'none',
              }}
            />
          </div>

          {/* Pie */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', paddingTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.55rem 1.1rem', borderRadius: '8px',
                border: '1px solid var(--border-color, #e2e8f0)',
                background: 'transparent', color: 'var(--text-muted, #64748b)',
                fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.55rem 1.25rem', borderRadius: '8px',
                background: 'var(--navy, #0b1528)', color: 'white',
                border: 'none', fontSize: '0.85rem', fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              <Send size={15} />
              {saving ? 'Publicando...' : 'Publicar hilo'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
