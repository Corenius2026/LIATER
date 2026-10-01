import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Pencil, Trash2, X, Megaphone } from 'lucide-react';
import { RoleBadge, StatusBadge, TypeBadge, Initials, ActionBtns, LoadingRow, EmptyRow, ConfirmModal } from './AdminShared';
import { toLocalDatetimeString, parseLocalDatetime, formatShortDate } from '@/utils/dateUtils';
import DeleteAnnouncementModal from '@/components/common/DeleteAnnouncementModal';

export default function AnunciosTab({ programId }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, teacher_profiles(name)')
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleEdit = (a) => {
    setSelectedAnnouncement(a);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setShowModal(true);
  };

  const handleDelete = (a) => {
    setConfirmDelete(a);
  };

  const handleConfirmDelete = async (id) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) throw error;
    fetchAnnouncements();
  };

  return (
    <div>
      <div className="admin-table-header">
        <h2 className="admin-table-title">Todos los Anuncios ({announcements.length})</h2>
        <button onClick={handleCreate} className="btn btn-primary" style={{ padding: '0.5rem 1rem' }}>
          <Plus size={16} style={{ marginRight: '0.25rem' }} /> Nuevo Anuncio
        </button>
      </div>

      <div className="admin-table-wrapper">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando anuncios...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>No hay anuncios publicados.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Publicado por</th>
                <th>Etiqueta</th>
                <th>Alcance</th>
                <th>Fecha</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: 500 }}>{a.title}</td>
                  <td>{a.teacher_profiles?.name || 'Administración'}</td>
                  <td>
                    <span className={`role-badge`} style={{
                      backgroundColor: a.tag === 'urgent' ? '#fee2e2' : a.tag === 'info' ? '#dbeafe' : '#f1f5f9',
                      color: a.tag === 'urgent' ? '#dc2626' : a.tag === 'info' ? '#2563eb' : '#64748b'
                    }}>
                      {a.tag}
                    </span>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      backgroundColor: a.target_role === 'student' ? '#f3e8ff' : a.target_role === 'teacher' ? '#ffedd5' : '#e2e8f0',
                      color: a.target_role === 'student' ? '#7e22ce' : a.target_role === 'teacher' ? '#c2410c' : '#475569',
                      whiteSpace: 'nowrap'
                    }}>
                      {a.target_role === 'student' ? 'Estudiantes' : a.target_role === 'teacher' ? 'Profesores' : 'Todos'}
                    </span>
                  </td>
                  <td>{formatShortDate(a.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      {!a.teacher_id && (
                        <button onClick={() => handleEdit(a)} className="action-btn" title="Editar"><Pencil size={15} /></button>
                      )}
                      <button onClick={() => handleDelete(a)} className="action-btn action-delete" title="Eliminar"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AnnouncementDrawer 
          announcement={selectedAnnouncement} 
          onClose={() => setShowModal(false)} 
          onRefresh={fetchAnnouncements}
          programId={programId}
        />
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <DeleteAnnouncementModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        announcement={confirmDelete}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

// --- ANNOUNCEMENT DRAWER ---
function AnnouncementDrawer({ announcement, onClose, onRefresh, programId }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('general');
  const [targetRole, setTargetRole] = useState('all');
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || '');
      setBody(announcement.body || '');
      setTag(announcement.tag || 'general');
      setTargetRole(announcement.target_role || 'all');
    }
  }, [announcement]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !body) {
      setError('El título y el mensaje son obligatorios.');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        title,
        body,
        tag,
        target_role: targetRole,
        program_id: programId
      };

      let newAnnouncementId = null;

      if (announcement?.id) {
        const { error: updateErr } = await supabase.from('announcements').update(payload).eq('id', announcement.id);
        if (updateErr) throw updateErr;
        newAnnouncementId = announcement.id;
      } else {
        const { data, error: insertErr } = await supabase.from('announcements').insert([payload]).select().single();
        if (insertErr) throw insertErr;
        newAnnouncementId = data?.id;
      }

      if (sendEmail && newAnnouncementId) {
        // Trigger edge function
        const { error: funcErr } = await supabase.functions.invoke('send-announcement', {
          body: { announcement_id: newAnnouncementId }
        });
        if (funcErr) {
          console.error('Email send failed:', funcErr);
        }
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Error al guardar anuncio: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div 
      onClick={onClose} 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        backgroundColor: 'rgba(15, 23, 42, 0.65)', 
        backdropFilter: 'blur(5px)',
        zIndex: 1000, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '1.25rem',
        animation: 'fadeInModal 0.2s ease-out'
      }}
    >
      <style>{`
        @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleUpModal { from { opacity: 0; transform: scale(0.96) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>
      
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', 
          maxWidth: '560px', 
          maxHeight: '90vh',
          background: 'white', 
          zIndex: 1001, 
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.35)', 
          animation: 'scaleUpModal 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--navy)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <Megaphone size={14} color="var(--gold)" />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}
              </span>
            </div>
            <h2 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.1rem' }}>{title || 'Escribe un título...'}</h2>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            style={{ 
              color: 'rgba(255,255,255,0.75)', 
              background: 'rgba(255,255,255,0.08)', 
              border: 'none', 
              borderRadius: '8px', 
              cursor: 'pointer', 
              padding: '0.4rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.18)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
            {error && <div style={{ color: '#b91c1c', background: '#fef2f2', padding: '0.6rem 0.8rem', borderRadius: '8px', fontSize: '0.84rem', border: '1px solid #fecaca' }}>{error}</div>}
            
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Título del Anuncio</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                required 
                placeholder="Ej: Clase de hoy cancelada..." 
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Importancia</label>
                <select 
                  value={tag} 
                  onChange={e => setTag(e.target.value)} 
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                >
                  <option value="general">General</option>
                  <option value="info">Informativo</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Audiencia</label>
                <select 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                >
                  <option value="all">Todos los participantes</option>
                  <option value="student">Solo Estudiantes</option>
                  <option value="teacher">Solo Profesores</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Mensaje</label>
              <textarea 
                value={body} 
                onChange={e => setBody(e.target.value)} 
                style={{ width: '100%', padding: '0.75rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', minHeight: '140px', boxSizing: 'border-box', resize: 'vertical' }} 
                required 
                placeholder="Escribe aquí el contenido del anuncio..." 
              />
            </div>

            {/* Interruptor deslizante (Toggle Switch) */}
            <div 
              onClick={() => setSendEmail(!sendEmail)}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                gap: '1rem', 
                background: sendEmail ? 'rgba(252, 163, 17, 0.08)' : '#F8FAFC', 
                padding: '0.9rem 1.15rem', 
                borderRadius: '12px', 
                border: sendEmail ? '1.5px solid var(--gold, #FCA311)' : '1px solid var(--border-color)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', userSelect: 'none' }}>
                <span style={{ fontSize: '0.86rem', color: 'var(--navy, #14213D)', fontWeight: 700 }}>
                  Enviar notificación por correo electrónico
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748B)', fontWeight: 400 }}>
                  Notificará a los participantes correspondientes.
                </span>
              </div>

              {/* Pill Slider */}
              <div
                role="switch"
                aria-checked={sendEmail}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault();
                    setSendEmail(!sendEmail);
                  }
                }}
                style={{
                  width: '46px',
                  height: '26px',
                  borderRadius: '9999px',
                  background: sendEmail ? 'var(--navy, #14213D)' : '#CBD5E1',
                  position: 'relative',
                  flexShrink: 0,
                  transition: 'background-color 0.25s ease',
                  boxShadow: sendEmail ? '0 0 8px rgba(20, 33, 61, 0.25)' : 'none'
                }}
              >
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: sendEmail ? '#FCA311' : '#FFFFFF',
                    position: 'absolute',
                    top: '3px',
                    left: '3px',
                    transform: sendEmail ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              style={{ 
                padding: '0.8rem', 
                marginTop: '0.25rem', 
                borderRadius: '8px', 
                border: 'none', 
                background: 'var(--navy, #14213D)', 
                color: 'white', 
                fontWeight: 700, 
                fontSize: '0.9rem', 
                cursor: submitting ? 'not-allowed' : 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.5rem', 
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)', 
                transition: 'all 0.2s', 
                opacity: submitting ? 0.7 : 1 
              }}
              onMouseOver={e => { if (!submitting) e.currentTarget.style.background = '#1e293b'; }}
              onMouseOut={e => { if (!submitting) e.currentTarget.style.background = 'var(--navy, #14213D)'; }}
            >
              {submitting ? 'Guardando...' : announcement ? 'Guardar Cambios' : 'Publicar Anuncio'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}