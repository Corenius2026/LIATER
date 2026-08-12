import React, { useState, useEffect } from 'react';
import { supabase } from "../../lib/supabaseClient";
import { X, CheckCircle, Plus, Trash2, Eye, UserPlus } from 'lucide-react';
import { formatShortDate } from '../../utils/dateUtils';
import { Initials, EmptyRow, ConfirmModal } from './AdminShared';
import { Link } from 'react-router-dom';

/* ────────────────────────────────────
   DRAWER — Inscribir Alumnos
──────────────────────────────────── */
export function EnrollStudentDrawer({ programId, programTitle, enrolledStudents, onClose, onRefresh }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolling, setEnrolling] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const enrolledIds = new Set(
    enrolledStudents
      .filter(e => e.users_profile?.role === 'student')
      .map(e => e.student_id || e.users_profile?.id)
  );

  useEffect(() => {
    async function fetchStudents() {
      try {
        const { data, error } = await supabase
          .from('users_profile')
          .select('id, full_name, email, role, is_active')
          .eq('role', 'student')
          .order('full_name', { ascending: true });
        if (error) throw error;
        setAllStudents(data || []);
      } catch (err) {
        console.error('Error cargando estudiantes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, []);

  const unenrolled = allStudents.filter(s => !enrolledIds.has(s.id));
  const filtered = unenrolled.filter(s => {
    const term = searchTerm.toLowerCase();
    return s.full_name?.toLowerCase().includes(term) || s.email?.toLowerCase().includes(term);
  });

  const handleEnroll = async (student) => {
    setEnrolling(student.id);
    setSuccessMsg('');
    try {
      const { error } = await supabase.from('enrollments').insert([{
        student_id: student.id,
        program_id: programId,
      }]);
      if (error) throw error;
      setSuccessMsg(`✓ ${student.full_name} inscrito correctamente.`);
      setAllStudents(prev => prev.filter(s => s.id !== student.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al inscribir: ' + err.message);
    } finally {
      setEnrolling(null);
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
                Inscribir Alumnos
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
            placeholder="Buscar alumno por nombre o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', width: '100%', flexShrink: 0, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)' }}
          />

          <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.25rem' }}>
            {loading ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando estudiantes...</p>
            ) : filtered.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem', fontSize: '0.9rem', background: '#f8fafc', borderRadius: '8px' }}>
                {unenrolled.length === 0
                  ? '✓ Todos los estudiantes de la plataforma ya están inscritos en este programa.'
                  : 'No se encontraron estudiantes con ese nombre o correo.'}
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filtered.map(student => (
                  <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white', boxShadow: 'var(--shadow-sm)' }}>
                    <div className="user-cell" style={{ gap: '0.75rem' }}>
                      <Initials name={student.full_name} />
                      <div>
                        <div className="user-name" style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--navy)' }}>{student.full_name}</div>
                        <div className="user-email" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{student.email}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleEnroll(student)}
                      disabled={enrolling === student.id}
                      className="btn btn-primary"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem', whiteSpace: 'nowrap', minWidth: '90px' }}
                    >
                      {enrolling === student.id ? '...' : '+ Inscribir'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ────────────────────────────────────
   TAB — Alumnos Inscritos
──────────────────────────────────── */
function AuthStatusBadge({ status }) {
  const map = {
    active:   { bg: "#dcfce7", color: "#166534", label: "Activo" },
    inactive: { bg: "#fee2e2", color: "#991b1b", label: "Inactivo" },
  };
  const s = map[status] || { bg: "#f1f5f9", color: "#64748b", label: status };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: "0.75rem", fontWeight: 700, padding: "0.25rem 0.6rem", borderRadius: "12px", whiteSpace: "nowrap", border: `1px solid ${s.color}20` }}>
      {s.label}
    </span>
  );
}

export default function AlumnosTab({ enrolledStudents, programId, programTitle, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showEnrollDrawer, setShowEnrollDrawer] = useState(false);
  const [studentToUnenroll, setStudentToUnenroll] = useState(null);
  const [unenrolling, setUnenrolling] = useState(false);

  const onlyStudents = enrolledStudents.filter(e => e.users_profile?.role === 'student');

  const filtered = onlyStudents.filter(e => {
    if (!e.users_profile) return false;
    const term = searchTerm.toLowerCase();
    return e.users_profile.full_name?.toLowerCase().includes(term) || e.users_profile.email?.toLowerCase().includes(term);
  });

  const handleConfirmUnenroll = async () => {
    if (!studentToUnenroll) return;
    setUnenrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', studentToUnenroll.id);

      if (error) throw error;
      setStudentToUnenroll(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al desvincular alumno: ' + err.message);
    } finally {
      setUnenrolling(false);
    }
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      <div className="section-header-row" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="section-title" style={{ display: 'block' }}>Alumnos Inscritos ({filtered.length})</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Estudiantes que actualmente tienen acceso al programa.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.55rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', minWidth: '240px', fontSize: '0.85rem' }}
          />
          <button
            onClick={() => setShowEnrollDrawer(true)}
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--navy)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, boxShadow: 'var(--shadow-sm)' }}
          >
            <Plus size={16} /> Inscribir Alumno
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper" style={{ background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Estado de Cuenta</th>
              <th>Fecha de Inscripción</th>
              <th style={{ textAlign: 'right', paddingRight: '1.5rem' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? <EmptyRow cols={4} message="No hay alumnos inscritos que coincidan con la búsqueda." /> :
             filtered.map(enroll => (
              <tr key={enroll.id}>
                <td>
                  <div className="user-cell">
                    <Initials name={enroll.users_profile?.full_name || 'Desconocido'} />
                    <div>
                      <div className="user-name" style={{ fontWeight: 600, color: 'var(--navy)' }}>{enroll.users_profile?.full_name}</div>
                      <div className="user-email" style={{ color: 'var(--text-secondary)' }}>{enroll.users_profile?.email}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <AuthStatusBadge status={enroll.users_profile?.is_active !== false ? 'active' : 'inactive'} />
                </td>
                <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatShortDate(enroll.created_at)}</td>
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
                      onClick={() => setStudentToUnenroll(enroll)}
                      className="btn-icon del"
                      title="Desvincular alumno del programa"
                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showEnrollDrawer && (
        <EnrollStudentDrawer
          programId={programId}
          programTitle={programTitle}
          enrolledStudents={enrolledStudents}
          onClose={() => setShowEnrollDrawer(false)}
          onRefresh={() => { setShowEnrollDrawer(false); if (onRefresh) onRefresh(); }}
        />
      )}

      <ConfirmModal
        isOpen={!!studentToUnenroll}
        title="Desvincular Alumno"
        message={`¿Estás seguro de que deseas desvincular a "${studentToUnenroll?.users_profile?.full_name}" de este programa?`}
        confirmText="Desvincular"
        cancelText="Cancelar"
        loading={unenrolling}
        onConfirm={handleConfirmUnenroll}
        onClose={() => setStudentToUnenroll(null)}
      />
    </div>
  );
}
