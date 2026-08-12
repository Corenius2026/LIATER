import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
import { X, CheckCircle, Plus, Trash2, GraduationCap, MapPin, Phone, Eye, UserPlus } from 'lucide-react';
import { Initials, ConfirmModal, EmptyRow } from './AdminShared';
import { Link } from 'react-router-dom';

// Helper to safely parse JSON from the bio field if it exists
const parseTeacherMeta = (teacher) => {
  let meta = { 
    bio: teacher.bio || 'Sin biografía proporcionada.', 
    role: teacher.area || 'Profesor', 
    phone: '', 
    country: '', 
    experience: '' 
  };
  
  try {
    if (teacher.bio && typeof teacher.bio === 'string' && teacher.bio.trim().startsWith('{')) {
      const parsed = JSON.parse(teacher.bio);
      if (parsed.bio) meta.bio = parsed.bio;
      if (parsed.title_role) meta.role = parsed.title_role;
      if (parsed.phone) meta.phone = parsed.phone;
      if (parsed.country) meta.country = parsed.country;
      if (parsed.experience) meta.experience = parsed.experience;
    }
  } catch (e) {
    // Ignore JSON parse error, fallback to raw string
  }
  return meta;
};

/* ────────────────────────────────────
   DRAWER — Asignar Profesor
──────────────────────────────────── */
export function AssignTeacherDrawer({ programId, programTitle, assignedTeachers, onClose, onRefresh }) {
  const [allTeachers, setAllTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [assigning, setAssigning] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const assignedUserIds = new Set(assignedTeachers.map(t => t.user_id));

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const { data, error } = await supabase
          .from('teacher_profiles')
          .select('*')
          .order('name', { ascending: true });
        if (error) throw error;
        setAllTeachers(data || []);
      } catch (err) {
        console.error('Error cargando profesores:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeachers();
  }, []);

  const unassigned = allTeachers.filter(t => !assignedUserIds.has(t.user_id));
  const filtered = unassigned.filter(t => {
    const term = searchTerm.toLowerCase();
    const meta = parseTeacherMeta(t);
    return t.name?.toLowerCase().includes(term) || meta.role.toLowerCase().includes(term);
  });

  const handleAssign = async (teacher) => {
    setAssigning(teacher.id);
    setSuccessMsg('');
    try {
      const { error } = await supabase.from('enrollments').insert([{
        student_id: teacher.user_id,
        program_id: programId,
      }]);
      if (error) throw error;
      setSuccessMsg(`✓ Profesor ${teacher.name} asignado correctamente.`);
      setAllTeachers(prev => prev.filter(t => t.id !== teacher.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al asignar profesor: ' + err.message);
    } finally {
      setAssigning(null);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.45)', zIndex: 1000 }} />
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: '450px', maxWidth: '90vw',
        background: 'white', zIndex: 1001, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', animation: 'slideInRight 0.3s ease-out'
      }}>
        <style>{`@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style>
        
        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', background: 'var(--navy)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <UserPlus size={14} color="var(--gold)" />
              <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Asignar Profesor
              </span>
            </div>
            <h2 style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: '1.05rem', lineHeight: 1.2 }}>{programTitle}</h2>
          </div>
          <button onClick={onClose} style={{ color: 'rgba(255,255,255,0.65)', background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}><X size={22} /></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
          {successMsg && (
            <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
              <CheckCircle size={16} /> {successMsg}
            </div>
          )}

          <input
            type="text"
            placeholder="Buscar profesor por nombre o rol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', width: '100%', flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}
          />

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando profesores...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '8px' }}>
                {unassigned.length === 0
                  ? '✓ Todos los profesores de la plataforma ya están asignados a este programa.'
                  : 'No se encontraron profesores con ese nombre o rol.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.map(teacher => {
                  const meta = parseTeacherMeta(teacher);
                  return (
                    <div key={teacher.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                      <div className="user-cell" style={{ gap: '0.75rem' }}>
                        <Initials name={teacher.name} />
                        <div>
                          <div className="user-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)' }}>{teacher.name}</div>
                          <div className="user-email" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{meta.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAssign(teacher)}
                        disabled={assigning === teacher.id}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', minWidth: '90px' }}
                      >
                        {assigning === teacher.id ? '...' : '+ Asignar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────────────────────────
   TAB 3 — Profesores (Supabase)
──────────────────────────────────────────────────────── */
export default function ProfesoresTab({ teachers, loading, onRefresh, programId, programTitle }) {
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherToUnassign, setTeacherToUnassign] = useState(null);
  const [unassigning, setUnassigning] = useState(false);

  const filteredTeachers = teachers.filter(t => {
    const term = searchTerm.toLowerCase();
    const meta = parseTeacherMeta(t);
    return t.name?.toLowerCase().includes(term) || meta.role.toLowerCase().includes(term);
  });

  const handleConfirmUnassignTeacher = async () => {
    if (!teacherToUnassign) return;
    setUnassigning(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('program_id', programId)
        .eq('student_id', teacherToUnassign.user_id);

      if (error) throw error;
      setTeacherToUnassign(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al desvincular profesor: ' + err.message);
    } finally {
      setUnassigning(false);
    }
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      <div className="section-header-row" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="section-title" style={{ display: 'block' }}>Profesores del programa ({teachers.length})</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Directorio de profesores vinculados a este programa.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.55rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', minWidth: '240px', fontSize: '0.85rem' }}
          />
          <button
            onClick={() => setShowAssignDrawer(true)}
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}
          >
            <Plus size={16} /> Asignar Profesor
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper" style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Profesor</th>
              <th>Especialidad / Rol</th>
              <th>Contacto</th>
              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Cargando profesores...</td>
              </tr>
            ) : filteredTeachers.length === 0 ? (
              <EmptyRow cols={4} message="No hay profesores asignados que coincidan con la búsqueda." />
            ) : filteredTeachers.map(t => {
              const meta = parseTeacherMeta(t);
              return (
                <tr key={t.id}>
                  <td>
                    <div className="user-cell">
                      {t.photo || t.photo_url ? (
                        <img src={t.photo || t.photo_url} alt={t.name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <Initials name={t.name} />
                      )}
                      <div>
                        <div className="user-name" style={{ fontWeight: 600, color: 'var(--navy)' }}>{t.name}</div>
                        <div className="user-email" style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{meta.bio}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem', color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 500 }}>
                      <GraduationCap size={15} style={{ color: 'var(--gold)' }} /> {meta.role}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {meta.country && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <MapPin size={13} /> {meta.country}
                        </span>
                      )}
                      {meta.phone && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Phone size={13} /> {meta.phone}
                        </span>
                      )}
                      {!meta.country && !meta.phone && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No disponible</span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: '1.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                      <Link
                        to={`/users`}
                        className="btn-icon"
                        title="Ver perfil completo en Gestión Global"
                        style={{ background: '#f8fafc', color: 'var(--navy)', border: '1px solid var(--border-color)' }}
                      >
                        <Eye size={15} />
                      </Link>
                      <button
                        onClick={() => setTeacherToUnassign(t)}
                        className="btn-icon del"
                        title="Desvincular profesor del programa"
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAssignDrawer && (
        <AssignTeacherDrawer
          programId={programId}
          programTitle={programTitle}
          assignedTeachers={teachers}
          onClose={() => setShowAssignDrawer(false)}
          onRefresh={() => { setShowAssignDrawer(false); if (onRefresh) onRefresh(); }}
        />
      )}

      <ConfirmModal
        isOpen={!!teacherToUnassign}
        title="Desvincular Profesor"
        message={`¿Estás seguro de que deseas desvincular al profesor "${teacherToUnassign?.name}" de este programa?`}
        confirmText="Desvincular"
        cancelText="Cancelar"
        loading={unassigning}
        onConfirm={handleConfirmUnassignTeacher}
        onClose={() => setTeacherToUnassign(null)}
      />
    </div>
  );
}
