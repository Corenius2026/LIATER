/**
 * ForumNewThreadModal
 * Modal para crear un nuevo hilo en el foro.
 * Acepta props opcionales: preTitle y preClassId para pre-rellenar
 * cuando se abre desde la página de una clase (ModuleDetail).
 */
import { useState } from 'react';
import { X, Send, MessageSquarePlus } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import ForumCategoryBadge from './ForumCategoryBadge';

const CATEGORIES = [
  { value: 'academic', label: 'Dudas Académicas' },
  { value: 'debate',   label: 'Debate / Participación' },
  { value: 'support',  label: 'Soporte Técnico' },
];

export default function ForumNewThreadModal({
  isOpen,
  onClose,
  programId,        // null = foro de soporte global
  userProfileId,
  preTitle = '',    // título pre-rellenado (desde ModuleDetail)
  preClassId = null, // class_id pre-rellenado
  onCreated,        // callback (newThread) => void
}) {
  const [title, setTitle]       = useState(preTitle);
  const [body, setBody]         = useState('');
  const [category, setCategory] = useState(programId ? 'academic' : 'support');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    if (!body.trim())  { setError('El contenido no puede estar vacío.'); return; }
    if (!userProfileId) { setError('Debes iniciar sesión.'); return; }

    setSaving(true);
    setError('');

    try {
      const payload = {
        title:      title.trim(),
        body:       body.trim(),
        category,
        author_id:  userProfileId,
        program_id: programId || null,
        class_id:   preClassId || null,
      };

      const { data, error: insertErr } = await supabase
        .from('forum_threads')
        .insert(payload)
        .select('*')
        .single();

      if (insertErr) throw insertErr;

      // Inicializar estado de lectura para el autor
      await supabase
        .from('forum_read_status')
        .upsert({ user_id: userProfileId, thread_id: data.id, last_read_at: new Date().toISOString() });

      if (onCreated) onCreated(data);
      onClose();
      // Reset form
      setTitle('');
      setBody('');
      setCategory(programId ? 'academic' : 'support');
    } catch (err) {
      console.error('Error creando hilo:', err);
      setError('No se pudo crear el hilo. Intenta de nuevo.');
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
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1rem 1.25rem',
          background: 'var(--navy, #0b1528)',
          color: 'white',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '1rem', fontWeight: 700 }}>
            <MessageSquarePlus size={18} />
            Nuevo hilo
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '6px',
              color: 'white', cursor: 'pointer', padding: '0.3rem 0.45rem',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Pre-clase info */}
          {preClassId && (
            <div style={{
              padding: '0.55rem 0.85rem',
              background: 'rgba(124,58,237,0.07)',
              border: '1px solid rgba(124,58,237,0.25)',
              borderRadius: '8px',
              fontSize: '0.8rem',
              color: '#7c3aed',
              fontWeight: 600,
            }}>
              📚 Este hilo quedará vinculado a la clase seleccionada
            </div>
          )}

          {/* Categoría */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark, #0b1528)', marginBottom: '0.4rem' }}>
              Categoría
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {CATEGORIES
                .filter(c => programId ? c.value !== 'support' : c.value === 'support')
                .concat(programId ? [{ value: 'support', label: 'Soporte Técnico' }] : [])
                .map(cat => (
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
              placeholder="Ej: ¿Cómo interpretar el resultado de la prueba de hipótesis?"
              maxLength={200}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.85rem',
                border: '1.5px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px', fontSize: '0.88rem',
                outline: 'none', fontFamily: 'inherit',
                color: 'var(--text-dark, #0b1528)',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '0.72rem', color: 'var(--text-muted, #94a3b8)', marginTop: '0.2rem' }}>
              {title.length}/200
            </div>
          </div>

          {/* Cuerpo */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dark, #0b1528)', marginBottom: '0.4rem' }}>
              Contenido *
            </label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Describe tu pregunta, duda o aporte con el mayor detalle posible..."
              rows={5}
              style={{
                width: '100%', boxSizing: 'border-box',
                padding: '0.6rem 0.85rem', resize: 'vertical', minHeight: '100px',
                border: '1.5px solid var(--border-color, #e2e8f0)',
                borderRadius: '8px', fontSize: '0.88rem',
                outline: 'none', fontFamily: 'inherit',
                color: 'var(--text-dark, #0b1528)', lineHeight: 1.6,
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '0.55rem 0.85rem', borderRadius: '8px',
              background: 'rgba(220,38,38,0.07)', border: '1px solid rgba(220,38,38,0.25)',
              fontSize: '0.82rem', color: '#dc2626', fontWeight: 600,
            }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem',
                border: '1.5px solid var(--border-color, #e2e8f0)', background: 'transparent',
                color: 'var(--text-muted, #64748b)', cursor: 'pointer',
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 1.35rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
                background: saving ? '#94a3b8' : 'var(--navy, #0b1528)',
                color: 'white', border: 'none', cursor: saving ? 'not-allowed' : 'pointer',
                transition: 'background 0.15s ease',
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
