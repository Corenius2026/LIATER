import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';

// Cliente secundario solo para crear usuarios sin sobreescribir la sesión del admin
const supabaseCreator = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'dummy-admin-creator', autoRefreshToken: false, persistSession: false } }
);

import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ListTree, Video, FileText, Plus, Pencil, Trash2,
  CheckCircle2, CheckCircle, Clock, Link as LinkIcon, ShieldAlert, X, Megaphone, ArrowLeft
} from 'lucide-react';
import './AdminPanel.css';
import { toLocalDatetimeString, parseLocalDatetime, formatShortDate } from '../utils/dateUtils';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

/* ─────────────────────────────────────────
   HELPERS (sin cambios)
───────────────────────────────────────── */
function RoleBadge({ role }) {
  const map = { admin: ['role-badge role-admin', 'Administrador'], teacher: ['role-badge role-teacher', 'Profesor'], student: ['role-badge role-student', 'Estudiante'] };
  const [cls, label] = map[role] ?? ['role-badge', role];
  return <span className={cls}>{label}</span>;
}

function StatusBadge({ status }) {
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

function TypeBadge({ type }) {
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

function Initials({ name }) {
  const parts = (name || '').trim().split(' ');
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return <div className="user-avatar-initials">{letters.toUpperCase()}</div>;
}

function ActionBtns({ onEdit, onDelete }) {
  return (
    <div className="action-btns">
      <button className="btn-icon edit" title="Editar" onClick={onEdit}><Pencil size={15} /></button>
      <button className="btn-icon del"  title="Eliminar" onClick={onDelete}><Trash2 size={15} /></button>
    </div>
  );
}

function LoadingRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Cargando datos...
      </td>
    </tr>
  );
}

function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        {message}
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   MODAL — Inscribir Alumnos
───────────────────────────────────────── */
function InscribirModal({ programId, programTitle, enrolledStudents, onClose, onRefresh }) {
  const [allStudents, setAllStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [enrolling, setEnrolling] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // IDs de los alumnos ya inscritos (solo role=student)
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
          .eq('is_active', true)
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

  // Solo mostrar estudiantes que NO estén ya inscritos en este programa
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
      // Refrescar la lista local inmediatamente
      setAllStudents(prev => prev.filter(s => s.id !== student.id));
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al inscribir: ' + err.message);
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'white', padding: '2rem', position: 'relative', borderRadius: '12px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={22} />
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem' }}>Inscribir Alumnos</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Selecciona estudiantes para inscribir en <strong>{programTitle}</strong>.
            Solo se muestran los que aún no están inscritos.
          </p>
        </div>

        {successMsg && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <input
          type="text"
          placeholder="Buscar alumno por nombre o correo..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '0.6rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando estudiantes...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              {unenrolled.length === 0
                ? '✓ Todos los estudiantes de la plataforma ya están inscritos en este programa.'
                : 'No se encontraron estudiantes con ese nombre o correo.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(student => (
                <div key={student.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8fafc' }}>
                  <div className="user-cell" style={{ gap: '0.75rem' }}>
                    <Initials name={student.full_name} />
                    <div>
                      <div className="user-name" style={{ fontSize: '0.9rem' }}>{student.full_name}</div>
                      <div className="user-email">{student.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEnroll(student)}
                    disabled={enrolling === student.id}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap', minWidth: '90px' }}
                  >
                    {enrolling === student.id ? 'Inscribiendo...' : '+ Inscribir'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB — Alumnos Inscritos
───────────────────────────────────────── */
function AlumnosTab({ enrolledStudents, programId, programTitle, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showInscribirModal, setShowInscribirModal] = useState(false);

  // CORRECCIÓN: Solo mostrar usuarios con role=student en esta tabla
  const onlyStudents = enrolledStudents.filter(e => e.users_profile?.role === 'student');

  const filtered = onlyStudents.filter(e => {
    if (!e.users_profile) return false;
    const term = searchTerm.toLowerCase();
    return e.users_profile.full_name?.toLowerCase().includes(term) || e.users_profile.email?.toLowerCase().includes(term);
  });

  const handleUnenroll = async (enroll) => {
    const studentName = enroll.users_profile?.full_name || 'este alumno';
    if (!window.confirm(`¿Estás seguro de que deseas desvincular a "${studentName}" de este programa?\n\n(El estudiante seguirá existiendo en la gestión global de usuarios)`)) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('id', enroll.id);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al desvincular alumno: ' + err.message);
    }
  };

  return (
    <div>
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
            style={{ padding: '0.5rem 1rem', border: '1px solid var(--border-color)', borderRadius: '4px', minWidth: '220px' }}
          />
          <button
            onClick={() => setShowInscribirModal(true)}
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
          >
            <Plus size={16} /> Inscribir Alumno
          </button>
        </div>
      </div>

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>Programa</th>
              <th>Fecha de Inscripción</th>
              <th style={{ width: '100px', textAlign: 'center' }}>Acciones</th>
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
                      <div className="user-name">{enroll.users_profile?.full_name}</div>
                      <div className="user-email">{enroll.users_profile?.email}</div>
                    </div>
                  </div>
                </td>
                <td><span className="role-badge" style={{ background: '#e0e7ff', color: '#3730a3' }}>{enroll.diploma_programs?.title || programTitle || 'Programa'}</span></td>
                <td>{formatShortDate(enroll.created_at)}</td>
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                      onClick={() => handleUnenroll(enroll)}
                      className="btn-icon del"
                      title="Desvincular alumno del programa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showInscribirModal && (
        <InscribirModal
          programId={programId}
          programTitle={programTitle}
          enrolledStudents={enrolledStudents}
          onClose={() => setShowInscribirModal(false)}
          onRefresh={() => { setShowInscribirModal(false); if (onRefresh) onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen General
───────────────────────────────────────── */
function ResumenTab({ counts, upcomingClasses, isCourse }) {
  const { users } = useAuth();

  let stats = [
    { label: 'Alumnos Inscritos',  value: counts.usuarios,  color: '#6366f1', bg: '#eef2ff', icon: <Users size={22} color="#6366f1" /> },
    { label: 'Profesores',      value: counts.profesores, color: '#0ea5e9', bg: '#e0f2fe', icon: <GraduationCap size={22} color="#0ea5e9" /> },
    { label: 'Módulos',         value: counts.modulos,    color: '#10b981', bg: '#d1fae5', icon: <BookOpen size={22} color="#10b981" /> },
    { label: 'Subtemas',        value: counts.subtemas,   color: '#f59e0b', bg: '#fef3c7', icon: <ListTree size={22} color="#f59e0b" /> },
    { label: 'Clases',          value: counts.clases,     color: '#ef4444', bg: '#fee2e2', icon: <Video size={22} color="#ef4444" /> },
    { label: 'Recursos',        value: counts.recursos,   color: '#8b5cf6', bg: '#ede9fe', icon: <FileText size={22} color="#8b5cf6" /> },
  ];

  if (isCourse) {
    stats = stats.filter(s => s.label !== 'Módulos');
  }

  return (
    <div>
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-number">{s.value ?? '—'}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Estado de clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Estado del Programa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Total Clases',   value: counts.clases,   total: counts.clases,   color: '#10b981' },
              !isCourse && { label: 'Total Módulos',  value: counts.modulos,  total: counts.modulos,  color: '#6366f1' },
              { label: 'Total Recursos', value: counts.recursos, total: counts.recursos, color: '#f59e0b' },
            ].filter(Boolean).map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: item.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Próximas Clases</h3>
          {upcomingClasses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay clases próximas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} color="#ca8a04" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {formatShortDate(cls.class_date)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MODAL — Asignar Profesor
───────────────────────────────────────── */
function AsignarProfesorModal({ programId, programTitle, assignedTeachers, onClose, onRefresh }) {
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
    return t.name?.toLowerCase().includes(term) || t.area?.toLowerCase().includes(term);
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
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }}>
      <div className="card" style={{ width: '100%', maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'white', padding: '2rem', position: 'relative', borderRadius: '12px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
          <X size={22} />
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.35rem' }}>Asignar Profesor al Programa</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Selecciona un profesor para asignarlo a <strong>{programTitle}</strong>.
            Solo se muestran los que aún no están asignados.
          </p>
        </div>

        {successMsg && (
          <div style={{ background: '#d1fae5', color: '#065f46', padding: '0.6rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={16} /> {successMsg}
          </div>
        )}

        <input
          type="text"
          placeholder="Buscar profesor por nombre o área..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ padding: '0.6rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', marginBottom: '1rem', fontSize: '0.9rem' }}
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando profesores...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
              {unassigned.length === 0
                ? '✓ Todos los profesores de la plataforma ya están asignados a este programa.'
                : 'No se encontraron profesores con ese nombre o área.'}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map(teacher => (
                <div key={teacher.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: '#f8fafc' }}>
                  <div className="user-cell" style={{ gap: '0.75rem' }}>
                    <Initials name={teacher.name} />
                    <div>
                      <div className="user-name" style={{ fontSize: '0.9rem' }}>{teacher.name}</div>
                      <div className="user-email">{teacher.area || 'Profesor'}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssign(teacher)}
                    disabled={assigning === teacher.id}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.4rem 1rem', whiteSpace: 'nowrap', minWidth: '90px' }}
                  >
                    {assigning === teacher.id ? 'Asignando...' : '+ Asignar'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3 — Profesores (Supabase)
───────────────────────────────────────── */
function ProfesoresTab({ teachers, loading, onRefresh, programId, programTitle }) {
  const [showAsignarModal, setShowAsignarModal] = useState(false);

  const handleUnassignTeacher = async (teacher) => {
    if (!window.confirm(`¿Estás seguro de que deseas desvincular al profesor "${teacher.name}" de este programa?\n\n(El profesor seguirá existiendo en el directorio global de profesores)`)) return;

    try {
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('program_id', programId)
        .eq('student_id', teacher.user_id);

      if (error) throw error;
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al desvincular profesor: ' + err.message);
    }
  };

  return (
    <div>
      <div className="section-header-row" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <span className="section-title" style={{ display: 'block' }}>Profesores del programa ({teachers.length})</span>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>Directorio de profesores vinculados a este programa.</p>
        </div>
        <button
          onClick={() => setShowAsignarModal(true)}
          className="btn btn-primary"
          style={{ fontSize: '0.85rem', padding: '0.55rem 1.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}
        >
          <Plus size={16} /> Asignar Profesor
        </button>
      </div>

      <div className="teacher-cards-grid">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando profesores...</p>
        ) : teachers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay profesores asignados a este programa.</p>
        ) : teachers.map(t => (
          <div className="teacher-admin-card" key={t.id} style={{ position: 'relative' }}>
            <button
              onClick={() => handleUnassignTeacher(t)}
              className="btn-icon del"
              title="Desvincular profesor del programa"
              style={{ position: 'absolute', top: '1rem', right: '1rem' }}
            >
              <Trash2 size={16} />
            </button>

            <div className="teacher-card-top" style={{ paddingRight: '2.5rem' }}>
              {t.photo || t.photo_url ? (
                <img src={t.photo || t.photo_url} alt={t.name} className="teacher-card-img" />
              ) : (
                <div className="teacher-card-img" style={{ backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                  {(t.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.area}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 0 }}>{t.bio || 'Sin biografía.'}</p>
          </div>
        ))}
      </div>

      {showAsignarModal && (
        <AsignarProfesorModal
          programId={programId}
          programTitle={programTitle}
          assignedTeachers={teachers}
          onClose={() => setShowAsignarModal(false)}
          onRefresh={() => { setShowAsignarModal(false); if (onRefresh) onRefresh(); }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 4 — Módulos (Supabase)
───────────────────────────────────────── */
function ModulosTab({ modules, loading, onRefresh, programId }) {
  const [showModal, setShowModal] = useState(false);
  const [editModuleId, setEditModuleId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Limpiar el formulario al abrir modal de creación
  const openCreateModal = () => {
    setEditModuleId(null);
    setTitle('');
    setDescription('');
    setOrderIndex(1);
    // diplomaId se setea en el useEffect si está vacío
    setShowModal(true);
  };

  // Llenar el formulario al abrir modal de edición
  const openEditModal = (m) => {
    setEditModuleId(m.id);
    setTitle(m.title);
    setDescription(m.description || '');
    setOrderIndex(m.order_index || 1);
    setShowModal(true);
  };

  const handleDelete = async (m) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el módulo "${m.title}"?`)) return;

    try {
      // Verificar si tiene subtemas asociados
      const { count, error: countError } = await supabase
        .from('subtopics')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', m.id);
      
      if (countError) throw countError;

      if (count && count > 0) {
        alert(`Operación denegada:\n\nNo se puede eliminar el módulo "${m.title}" porque tiene ${count} subtema(s) asociado(s).\n\nPara eliminarlo de forma segura, primero debes reasignar o eliminar esos subtemas.`);
        return;
      }

      // Eliminar el módulo
      const { error: deleteError } = await supabase
        .from('modules')
        .delete()
        .eq('id', m.id);

      if (deleteError) throw deleteError;

      alert('Módulo eliminado exitosamente.');
      if (onRefresh) onRefresh();

    } catch (err) {
      alert('Error al eliminar el módulo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!title || !programId) {
      setError('El título del módulo y el programa son obligatorios.');
      return;
    }
    
    const parsedOrder = parseInt(orderIndex) || 0;
    
    // Validar orden duplicado (ignorando el módulo actual si estamos editando)
    if (modules.some(m => m.order_index === parsedOrder && m.id !== editModuleId)) {
      setError(`Ya existe un módulo con el orden ${parsedOrder}. Por favor elige otro número.`);
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        order_index: parsedOrder,
        program_id: programId
      };

      let query;
      if (editModuleId) {
        query = supabase.from('modules').update(payload).eq('id', editModuleId);
      } else {
        query = supabase.from('modules').insert([payload]);
      }

      const { error: opError } = await query;
      if (opError) throw opError;
      
      setSuccess(editModuleId ? 'Módulo actualizado con éxito.' : 'Módulo creado con éxito.');
      setTitle(''); setDescription('');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al crear módulo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Módulos del programa ({modules.length})</span>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Módulo
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editModuleId ? 'Editar Módulo' : 'Crear Nuevo Módulo'}</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Módulo</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Fundamentos de Frontend" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden (Número)</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="1" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Descripción corta del módulo..." />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Guardar Módulo'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Título</th><th>Descripción</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             modules.length === 0 ? <EmptyRow cols={4} message="No hay módulos registrados." /> :
             modules.map((m, i) => (
              <tr key={m.id}>
                <td><div className="order-badge">{m.order_index ?? i + 1}</div></td>
                <td><span style={{ fontWeight: 600 }}>{m.title}</span></td>
                <td style={{ color: 'var(--text-muted)', maxWidth: '240px' }}>{m.description}</td>
                <td><ActionBtns onEdit={() => openEditModal(m)} onDelete={() => handleDelete(m)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 5 — Subtemas (Supabase)
───────────────────────────────────────── */
function SubtemasTab({ subtopics, loading, onRefresh, modulesProp = [], isCourse }) {
  const [showModal, setShowModal] = useState(false);
  const [editSubtopicId, setEditSubtopicId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [moduleId, setModuleId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreateModal = () => {
    setEditSubtopicId(null);
    setTitle(''); setDescription(''); setOrderIndex(1);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  const openEditModal = (st) => {
    setEditSubtopicId(st.id);
    setTitle(st.title);
    setDescription(st.description || '');
    setOrderIndex(st.order_index || 1);
    setModuleId(st.module_id);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  useEffect(() => {
    if (showModal && modulesProp.length > 0 && !editSubtopicId) {
      setModuleId(modulesProp[0].id);
    }
  }, [showModal, modulesProp, editSubtopicId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !moduleId) {
      setError('El título y el módulo asociado son obligatorios.');
      return;
    }
    
    const parsedOrder = parseInt(orderIndex) || 0;
    
    
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        order_index: parsedOrder,
        module_id: moduleId,
        program_id: programId
      };

      let query;
      if (editSubtopicId) {
        query = supabase.from('subtopics').update(payload).eq('id', editSubtopicId);
      } else {
        query = supabase.from('subtopics').insert([payload]);
      }
      
      const { error: opError } = await query;
      if (opError) throw opError;
      
      setSuccess(editSubtopicId ? 'Subtema actualizado con éxito.' : 'Subtema creado con éxito.');
      setTitle(''); setDescription('');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al guardar subtema: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (st) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el subtema "${st.title}"?`)) return;

    try {
      const { count, error: countError } = await supabase
        .from('class_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('subtopic_id', st.id);
      
      if (countError) throw countError;

      if (count && count > 0) {
        alert('No se puede eliminar este subtema porque tiene clases asociadas.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('subtopics')
        .delete()
        .eq('id', st.id);

      if (deleteError) throw deleteError;
      
      alert('Subtema eliminado exitosamente.');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al eliminar subtema: ' + err.message);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Subtemas registrados ({subtopics.length})</span>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Subtema
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editSubtopicId ? 'Editar Subtema' : 'Crear Nuevo Subtema'}</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Subtema</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Introducción a HTML" required />
              </div>
              {!isCourse && (
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Módulo Asociado</label>
                  <select value={moduleId} onChange={e => setModuleId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                    {modulesProp.length === 0 ? <option value="">Cargando módulos...</option> : modulesProp.map(m => (
                      <option key={m.id} value={m.id}>{m.title}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden (Número)</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="1" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Descripción corta del subtema..." />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Guardar Subtema'}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Título</th><th>Descripción</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             subtopics.length === 0 ? <EmptyRow cols={4} message="No hay subtemas registrados." /> :
             subtopics.map((st, i) => (
              <tr key={st.id}>
                <td><div className="order-badge">{st.order_index ?? i + 1}</div></td>
                <td><span style={{ fontWeight: 600 }}>{st.title}</span></td>
                <td style={{ color: 'var(--text-muted)', maxWidth: '260px' }}>{st.description}</td>
                <td><ActionBtns onEdit={() => openEditModal(st)} onDelete={() => handleDelete(st)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 6 — Clases (Supabase)
───────────────────────────────────────── */
function ClasesTab({ classes, teachers, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editClassId, setEditClassId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classDate, setClassDate] = useState('');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  
  const [subtopicsList, setSubtopicsList] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreateModal = () => {
    setEditClassId(null);
    setTitle(''); setDescription(''); setClassDate(''); setDuration(''); setVideoUrl(''); setPresentationUrl(''); setOrderIndex(1);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  const openEditModal = (c) => {
    setEditClassId(c.id);
    setTitle(c.title);
    setDescription(c.description || '');
    setSubtopicId(c.subtopic_id);
    setTeacherId(c.teacher_id);
    setClassDate(toLocalDatetimeString(c.class_date));
    setDuration(c.duration || '');
    setVideoUrl(c.video_url || '');
    setPresentationUrl(c.presentation_url || '');
    setOrderIndex(c.order_index || 1);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  useEffect(() => {
    if (showModal && subtopicsList.length === 0) {
      supabase.from('subtopics').select('id, title').order('order_index', { ascending: true })
        .then(({ data }) => {
          setSubtopicsList(data || []);
          if (data && data.length > 0 && !editClassId) setSubtopicId(data[0].id);
          if (teachers && teachers.length > 0 && !editClassId) setTeacherId(teachers[0].id);
        });
    }
  }, [showModal, subtopicsList.length, editClassId, teachers]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !subtopicId || !teacherId) {
      setError('El título, subtema y profesor son obligatorios.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        subtopic_id: subtopicId,
        teacher_id: teacherId,
        class_date: parseLocalDatetime(classDate),
        duration: duration ? parseInt(duration) : null,
        video_url: videoUrl || null,
        presentation_url: presentationUrl || null,
        order_index: parseInt(orderIndex) || 1,
        program_id: programId
      };

      let query;
      if (editClassId) {
        query = supabase.from('class_sessions').update(payload).eq('id', editClassId);
      } else {
        query = supabase.from('class_sessions').insert([payload]);
      }
      
      const { error: opError } = await query;
      if (opError) throw opError;
      
      setSuccess(editClassId ? 'Clase actualizada con éxito.' : 'Clase creada con éxito.');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al guardar clase: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar la clase "${c.title}"?`)) return;

    try {
      const { count, error: countError } = await supabase
        .from('resources')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', c.id);
      
      if (countError) throw countError;

      if (count && count > 0) {
        alert('Esta clase tiene recursos asociados. Elimina primero los recursos o confirma una eliminación completa si se implementa más adelante.');
        return;
      }

      const { error: deleteError } = await supabase
        .from('class_sessions')
        .delete()
        .eq('id', c.id);

      if (deleteError) throw deleteError;
      
      alert('Clase eliminada exitosamente.');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al eliminar clase: ' + err.message);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Sesiones de clase ({classes.length})</span>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Clase
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editClassId ? 'Editar Clase' : 'Crear Nueva Clase'}</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título de la Clase</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Bases de React" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Subtema Asociado</label>
                <select value={subtopicId} onChange={e => setSubtopicId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {subtopicsList.length === 0 ? <option value="">Cargando subtemas...</option> : subtopicsList.map(st => (
                    <option key={st.id} value={st.id}>{st.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Profesor Asignado</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {teachers.length === 0 ? <option value="">No hay profesores asignados</option> : teachers.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Fecha y Hora</label>
                <input type="datetime-local" value={classDate} onChange={e => setClassDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Duración (minutos)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: 90" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL de Grabación</label>
                <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL de Presentación</label>
                <input type="url" value={presentationUrl} onChange={e => setPresentationUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                  {submitting ? 'Guardando...' : 'Guardar Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Título</th><th>Profesor</th><th>Fecha</th><th>Duración</th><th>Estado</th><th>Grabación</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={7} /> :
             classes.length === 0 ? <EmptyRow cols={7} message="No hay clases registradas." /> :
             classes.map(cls => (
              <tr key={cls.id}>
                <td style={{ fontWeight: 600 }}>{cls.title}</td>
                <td>{cls.teacher_profiles?.name || '—'}</td>
                <td>{formatShortDate(cls.class_date)}</td>
                <td>{cls.duration ? `${cls.duration} min` : '—'}</td>
                <td><StatusBadge status={cls.status} /></td>
                <td>
                  {cls.video_url || cls.presentation_url
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.8rem', fontWeight: 500 }}><CheckCircle2 size={14} />Disponible</span>
                    : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pendiente</span>
                  }
                </td>
                <td><ActionBtns onEdit={() => openEditModal(cls)} onDelete={() => handleDelete(cls)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 7 — Recursos (Supabase)
───────────────────────────────────────── */
function RecursosTab({ resources, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editResourceId, setEditResourceId] = useState(null);
  
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [provider, setProvider] = useState('external');
  const [url, setUrl] = useState('');
  const [filePath, setFilePath] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  
  const [classesList, setClassesList] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const openCreateModal = () => {
    setEditResourceId(null);
    setTitle(''); setResourceType('link'); setProvider('external'); setUrl(''); setFilePath(''); setIsVisible(true);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  const openEditModal = (r) => {
    setEditResourceId(r.id);
    setTitle(r.title);
    setClassId(r.class_id);
    setResourceType(r.resource_type || 'link');
    setProvider(r.provider || 'external');
    setUrl(r.url || '');
    setFilePath(r.file_path || '');
    setIsVisible(r.is_visible !== false);
    setShowModal(true);
    setError(''); setSuccess('');
  };

  useEffect(() => {
    if (showModal && classesList.length === 0) {
      supabase.from('class_sessions').select('id, title').order('created_at', { ascending: false }).then(({ data }) => {
        setClassesList(data || []);
        if (data && data.length > 0 && !editResourceId) setClassId(data[0].id);
      });
    }
  }, [showModal, classesList.length, editResourceId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !classId) {
      setError('El título y la clase son obligatorios.');
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title,
        class_id: classId,
        resource_type: resourceType,
        provider,
        url: url || null,
        file_path: filePath || null,
        is_visible: isVisible,
        program_id: programId
      };

      let query;
      if (editResourceId) {
        query = supabase.from('resources').update(payload).eq('id', editResourceId);
      } else {
        query = supabase.from('resources').insert([payload]);
      }
      
      const { error: opError } = await query;
      if (opError) throw opError;
      
      setSuccess(editResourceId ? 'Recurso actualizado con éxito.' : 'Recurso agregado con éxito.');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al guardar recurso: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (r) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el recurso "${r.title}"?`)) return;

    try {
      if (r.provider === 'supabase' && r.file_path) {
        console.log('Documentado: Falta eliminar el archivo físico de Supabase Storage para', r.file_path);
      }

      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', r.id);

      if (deleteError) throw deleteError;
      
      alert('Recurso eliminado exitosamente.');
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al eliminar recurso: ' + err.message);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Recursos del diplomado ({resources.length})</span>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Recurso
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editResourceId ? 'Editar Recurso' : 'Agregar Nuevo Recurso'}</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Recurso</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Diapositivas de la Clase 1" required />
              </div>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Clase Asociada</label>
                <select value={classId} onChange={e => setClassId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {classesList.length === 0 ? <option value="">Cargando clases...</option> : classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Tipo de Recurso</label>
                <select value={resourceType} onChange={e => setResourceType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  <option value="video">Video</option>
                  <option value="presentation">Presentación / Diapositivas</option>
                  <option value="pdf">Documento PDF</option>
                  <option value="link">Enlace externo</option>
                  <option value="file">Otro Archivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Proveedor</label>
                <select value={provider} onChange={e => setProvider(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  <option value="drive">Google Drive</option>
                  <option value="youtube">YouTube</option>
                  <option value="supabase">Supabase Storage</option>
                  <option value="external">Otro Externo</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL del Recurso</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>File Path (Ruta de archivo interno)</label>
                <input type="text" value={filePath} onChange={e => setFilePath(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="ruta/del/archivo.pdf" />
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input type="checkbox" id="isVisible" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
                <label htmlFor="isVisible" style={{ fontWeight: 500, fontSize: '0.85rem' }}>Visible para estudiantes</label>
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                  {submitting ? 'Guardando...' : 'Guardar Recurso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Enlace</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             resources.length === 0 ? <EmptyRow cols={4} message="No hay recursos registrados." /> :
             resources.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td><TypeBadge type={r.resource_type} /></td>
                <td>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                    <LinkIcon size={13} /> Ver
                  </a>
                </td>
                <td><ActionBtns onEdit={() => openEditModal(r)} onDelete={() => handleDelete(r)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 8 — Anuncios
───────────────────────────────────────── */
function AnnouncementModal({ announcement, onClose, onRefresh }) {
  const [title, setTitle] = useState(announcement?.title || '');
  const [body, setBody] = useState(announcement?.body || '');
  const [tag, setTag] = useState(announcement?.tag || 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('El título y el mensaje son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      // Admin announcement has NO teacher_id
      teacher_id: null,
      title: title.trim(),
      body: body.trim(),
      tag
    };

    try {
      if (announcement?.id) {
        // Al editar un anuncio, respetamos su teacher_id original para no cambiar su autor
        const { error: updateError } = await supabase
          .from('announcements')
          .update({ title: payload.title, body: payload.body, tag: payload.tag })
          .eq('id', announcement.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Error al guardar el anuncio: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-container" style={{ maxWidth: '500px' }}>
        <button className="modal-close" onClick={onClose}><X size={20} /></button>
        <div className="modal-header">
          <h2 className="modal-title">{announcement ? 'Editar Anuncio' : 'Nuevo Anuncio Institucional'}</h2>
        </div>
        <div className="modal-body">
          {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label className="form-label">Título del anuncio</label>
              <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Etiqueta de importancia</label>
              <select className="form-select" value={tag} onChange={e => setTag(e.target.value)}>
                <option value="general">General</option>
                <option value="info">Información</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="form-label">Mensaje</label>
              <textarea className="form-input" value={body} onChange={e => setBody(e.target.value)} rows={5} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ flex: 1 }}>
                {submitting ? 'Guardando...' : 'Guardar Anuncio'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function AnunciosTab() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*, teacher_profiles(name)')
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

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) return;
    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
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
                  <td>{formatShortDate(a.created_at)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleEdit(a)} className="action-btn" title="Editar"><Pencil size={15} /></button>
                      <button onClick={() => handleDelete(a.id)} className="action-btn action-delete" title="Eliminar"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <AnnouncementModal 
          announcement={selectedAnnouncement} 
          onClose={() => setShowModal(false)} 
          onRefresh={fetchAnnouncements}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
const TABS = [
  { id: 'resumen',    label: 'Resumen',    icon: <LayoutDashboard size={16} /> },
  { id: 'alumnos',    label: 'Alumnos',    icon: <Users size={16} /> },
  { id: 'profesores',label: 'Profesores', icon: <GraduationCap size={16} /> },
  { id: 'modulos',   label: 'Módulos',    icon: <BookOpen size={16} /> },
  { id: 'subtemas',  label: 'Subtemas',   icon: <ListTree size={16} /> },
  { id: 'clases',    label: 'Clases',     icon: <Video size={16} /> },
  { id: 'recursos',  label: 'Recursos',   icon: <FileText size={16} /> },
  { id: 'anuncios',  label: 'Anuncios',   icon: <Megaphone size={16} /> },
];



export default function AdminPanel() {
  const { currentUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { programId } = useParams();
  
  const queryParams = new URLSearchParams(location.search);
  const tabFromUrl = queryParams.get('tab');
  
  const [activeTab, setActiveTab] = useState(tabFromUrl && TABS.some(t => t.id === tabFromUrl) ? tabFromUrl : 'resumen');
  const role = currentUser?.role;

  // Actualizar la pestaña activa si cambia la URL
  useEffect(() => {
    const currentTab = queryParams.get('tab');
    if (currentTab && currentTab !== activeTab && TABS.some(t => t.id === currentTab)) {
      setActiveTab(currentTab);
    }
  }, [location.search]);

  // Actualizar la URL cuando cambia la pestaña
  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/dashboard/admin/${programId}?tab=${tabId}`, { replace: true });
  };

  // Estado centralizado de datos
  const [data, setData] = useState({
    program: null,
    teachers: [], modules: [], subtopics: [], classes: [], resources: [],
    upcomingClasses: [], enrolledStudents: [],
    counts: { usuarios: 0, profesores: 0, modulos: 0, subtemas: 0, clases: 0, recursos: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (role !== 'admin') return;

    async function fetchAll() {
      if (!programId) return;
      try {
        const [programRes, teachersRes, modulesRes, subtopicsRes, classesRes, resourcesRes, enrolledRes] = await Promise.all([
          supabase.from('diploma_programs').select('*').eq('id', programId).single(),
          supabase.from('teacher_profiles').select('*'),
          supabase.from('modules').select('*').eq('program_id', programId).order('order_index', { ascending: true }),
          supabase.from('subtopics').select('*').eq('program_id', programId).order('order_index', { ascending: true }),
          supabase.from('class_sessions').select('*, teacher_profiles(name)').eq('program_id', programId).order('class_date', { ascending: true }),
          supabase.from('resources').select('*').eq('program_id', programId),
          supabase.from('enrollments').select('*, users_profile(*), diploma_programs(title)').eq('program_id', programId)
        ]);

        const now = new Date().toISOString();
        const upcoming = (classesRes.data || []).filter(c => c.class_date && c.class_date > now).slice(0, 4);

        const enrolledIds = (enrolledRes.data || []).map(e => e.student_id);
        const teachersAssigned = (teachersRes.data || []).filter(t => enrolledIds.includes(t.user_id));

        setData({
          program: programRes.data,
          teachers: teachersAssigned,
          modules: modulesRes.data || [],
          subtopics: subtopicsRes.data || [],
          classes: classesRes.data || [],
          resources: resourcesRes.data || [],
          upcomingClasses: upcoming,
          enrolledStudents: enrolledRes.data || [],
          counts: {
            usuarios: (enrolledRes.data || []).length,
            profesores: teachersAssigned.length,
            modulos: (modulesRes.data || []).length,
            subtemas: (subtopicsRes.data || []).length,
            clases: (classesRes.data || []).length,
            recursos: (resourcesRes.data || []).length,
          }
        });
      } catch (err) {
        console.error('Error cargando datos del panel admin:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [role, refreshTrigger]);

  if (role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#dc2626" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Este panel es exclusivo para administradores.</p>
        <p>Cambia tu rol en la parte superior para acceder.</p>
      </div>
    );
  }

  const isCourse = data.program?.program_type === 'curso';
  const filteredTabs = isCourse ? TABS.filter(t => t.id !== 'modulos') : TABS;

  const renderTab = () => {
    switch (activeTab) {
      case 'resumen':    return <ResumenTab counts={data.counts} upcomingClasses={data.upcomingClasses} isCourse={isCourse} />;
      case 'alumnos':    return <AlumnosTab enrolledStudents={data.enrolledStudents} programId={programId} programTitle={data.program?.title} onRefresh={refreshData} />;
      case 'profesores': return <ProfesoresTab teachers={data.teachers} loading={loading} onRefresh={refreshData} programId={programId} programTitle={data.program?.title} />;
      case 'modulos':    return <ModulosTab modules={data.modules} loading={loading} onRefresh={refreshData} programId={programId} />;
      case 'subtemas':   return <SubtemasTab subtopics={data.subtopics} loading={loading} onRefresh={refreshData} modulesProp={data.modules} isCourse={isCourse} />;
      case 'clases':     return <ClasesTab classes={data.classes} teachers={data.teachers} loading={loading} onRefresh={refreshData} />;
      case 'recursos':   return <RecursosTab resources={data.resources} loading={loading} onRefresh={refreshData} />;
      case 'anuncios':   return <AnunciosTab />;
      default:           return <ResumenTab counts={data.counts} upcomingClasses={data.upcomingClasses} isCourse={isCourse} />;
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Panel de Administración: {data.program?.title || 'Cargando...'}</h1>
        <p className="page-description">Gestiona todos los recursos y contenidos del {isCourse ? 'curso' : 'diplomado'} desde un solo lugar.</p>
      </div>

      <div className="admin-tabs">
        {filteredTabs.map(tab => (
          <button
            key={tab.id}
            id={`admin-tab-${tab.id}`}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {loading && activeTab !== 'usuarios' ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando datos del panel...
        </div>
      ) : (
        renderTab()
      )}
    </div>
  );
}
