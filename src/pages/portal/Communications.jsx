import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Plus, Pencil, Trash2, X, Megaphone, Send } from 'lucide-react';
import { formatShortDate } from '@/utils/dateUtils';
import DeleteAnnouncementModal from '@/components/common/DeleteAnnouncementModal';
import '@/pages/admin/AdminPanel.css'; // Reusing admin styles

export default function Communications() {
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
        .select('*, teacher_profiles(name), diploma_programs(title)')
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

  const getTargetLabel = (role, hasProgram) => {
    switch(role) {
      case 'student': return 'Solo Estudiantes';
      case 'teacher': return 'Solo Profesores';
      default: return hasProgram ? 'Todos en el Programa' : 'Toda la Institución';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', animation: 'fadeSlideUp 0.35s ease-out' }}>
      {/* ── HERO BANNER INSTITUCIONAL EN AZUL OSCURO (#14213D) ── */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.25rem',
        padding: '1.75rem 2rem',
        background: 'linear-gradient(135deg, #14213D 0%, #1A2B4C 100%)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 10px 25px -5px rgba(20, 33, 61, 0.25), 0 8px 10px -6px rgba(20, 33, 61, 0.2)',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Glow sutil de acento dorado */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '180px',
          height: '180px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(252, 163, 17, 0.18) 0%, rgba(20, 33, 61, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FFFFFF', margin: 0, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            Comunicaciones
          </h1>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.45, maxWidth: '650px' }}>
            Envía y administra anuncios globales o segmentados por programa académico.
          </p>
        </div>

        <button
          onClick={handleCreate}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            background: 'linear-gradient(135deg, #FCA311 0%, #E59500 100%)',
            color: '#14213D',
            border: 'none',
            borderRadius: '12px',
            padding: '0.75rem 1.35rem',
            fontWeight: 800,
            fontSize: '0.92rem',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(252, 163, 17, 0.35)',
            transition: 'all 0.2s ease',
            position: 'relative',
            zIndex: 1,
            flexShrink: 0
          }}
          onMouseOver={e => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(252, 163, 17, 0.45)';
          }}
          onMouseOut={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 14px rgba(252, 163, 17, 0.35)';
          }}
        >
          <Megaphone size={18} strokeWidth={2.3} />
          <span>Nuevo Comunicado</span>
        </button>
      </div>

      <div className="admin-table-wrapper" style={{ background: "white", borderRadius: "12px", border: "1px solid var(--border-color)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
        {loading ? (
          <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando comunicaciones...</div>
        ) : announcements.length === 0 ? (
          <div style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Megaphone size={28} color="#94a3b8" />
            </div>
            <div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--navy)', fontSize: '1.1rem' }}>Aún no hay anuncios</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '400px' }}>Mantén a la institución informada. Los anuncios globales y de programa que crees aparecerán aquí.</p>
            </div>
            <button onClick={handleCreate} style={{ display: "flex", alignItems: "center", gap: "0.5rem", background: "#f8fafc", color: "var(--navy)", border: "1px solid var(--border-color)", borderRadius: "8px", padding: "0.5rem 1rem", fontWeight: 600, fontSize: "0.85rem", cursor: "pointer", marginTop: '0.5rem' }}>
              <Plus size={15} /> Crear Comunicado
            </button>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Publicado por</th>
                <th>Alcance</th>
                <th>Etiqueta</th>
                <th>Fecha</th>
                <th style={{ width: '100px', textAlign: 'right' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map(a => (
                <tr key={a.id} style={{ transition: "background 0.15s" }}>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{a.title}</td>
                  <td>{a.teacher_profiles?.name || 'Administración'}</td>
                  <td>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#f1f5f9', color: '#475569', padding: '0.25rem 0.6rem', borderRadius: '12px' }}>
                      {a.program_id ? a.diploma_programs?.title || 'Específico' : 'Global (Todos)'}
                    </span>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', paddingLeft: '4px' }}>
                      {getTargetLabel(a.target_role, !!a.program_id)}
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.6rem', borderRadius: '12px',
                      backgroundColor: (a.tag || 'general') === 'urgent' ? '#fee2e2' : (a.tag || 'general') === 'info' ? '#dbeafe' : '#f8fafc',
                      color: (a.tag || 'general') === 'urgent' ? '#dc2626' : (a.tag || 'general') === 'info' ? '#2563eb' : '#64748b',
                      border: '1px solid',
                      borderColor: (a.tag || 'general') === 'urgent' ? '#fca5a5' : (a.tag || 'general') === 'info' ? '#bfdbfe' : 'transparent'
                    }}>
                      {(a.tag || 'general').charAt(0).toUpperCase() + (a.tag || 'general').slice(1)}
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>{formatShortDate(a.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {!a.teacher_id && (
                        <button onClick={() => handleEdit(a)} title="Editar" style={{ display: "flex", alignItems: "center", gap: "0.25rem", padding: "0.3rem 0.65rem", background: "var(--navy)", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 600 }}>
                          <Pencil size={12} /> Editar
                        </button>
                      )}
                      <button onClick={() => handleDelete(a)} title="Eliminar" style={{ padding: "0.3rem 0.6rem", background: "#fef2f2", color: "#dc2626", border: "1px solid #fca5a5", borderRadius: "6px", cursor: "pointer", fontSize: "0.75rem", fontWeight: 700 }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <GlobalAnnouncementDrawer 
          announcement={selectedAnnouncement} 
          onClose={() => setShowModal(false)} 
          onRefresh={fetchAnnouncements}
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

function GlobalAnnouncementDrawer({ announcement, onClose, onRefresh }) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tag, setTag] = useState('general');
  const [targetRole, setTargetRole] = useState('all');
  const [programId, setProgramId] = useState('');
  const [programs, setPrograms] = useState([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPrograms() {
      const { data } = await supabase.from('diploma_programs').select('id, title').eq('is_published', true);
      if (data) setPrograms(data);
    }
    loadPrograms();
  }, []);

  useEffect(() => {
    if (announcement) {
      setTitle(announcement.title || '');
      setBody(announcement.body || '');
      setTag(announcement.tag || 'general');
      setTargetRole(announcement.target_role || 'all');
      setProgramId(announcement.program_id || '');
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
        program_id: programId || null
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
        // Trigger edge function (Optional, assumed it handles global announcements via target_role)
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
          maxWidth: '580px', 
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
                {announcement ? 'Editar Comunicado' : 'Nuevo Comunicado'}
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
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Título del Comunicado</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box' }} 
                required 
                placeholder="Ej: Mantenimiento de la plataforma..." 
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
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Alcance</label>
                <select 
                  value={programId} 
                  onChange={e => setProgramId(e.target.value)} 
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                >
                  <option value="">Global (Toda la Institución)</option>
                  {programs.map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>Audiencia (A quién va dirigido)</label>
                <select 
                  value={targetRole} 
                  onChange={e => setTargetRole(e.target.value)} 
                  style={{ width: '100%', padding: '0.65rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.88rem', boxSizing: 'border-box', background: '#FFFFFF' }}
                >
                  <option value="all">Toda la Escuela</option>
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
                  Se notificará a todos los usuarios que formen parte de la audiencia seleccionada.
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
                padding: "0.8rem", 
                marginTop: "0.25rem", 
                borderRadius: "8px", 
                border: "none", 
                background: "var(--navy)", 
                color: "white", 
                fontWeight: 700, 
                fontSize: "0.9rem",
                cursor: submitting ? 'not-allowed' : 'pointer', 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                gap: "0.5rem",
                boxShadow: "0 2px 8px rgba(20, 33, 61, 0.25)",
                transition: "opacity 0.2s"
              }}
            >
              {submitting ? 'Publicando...' : announcement ? 'Guardar Cambios' : (
                <>
                  <Send size={15} /> Publicar Comunicado
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
