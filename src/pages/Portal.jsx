import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PlayCircle, Clock, BookOpen, User, Users, Activity, BarChart3, TrendingUp, Calendar, CheckCircle, GraduationCap, Plus, X, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { formatClassDate, formatShortDate } from '../utils/dateUtils';
import { uploadProgramCover } from '../services/programService';

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
   SUB-COMPONENTE: Portal de Estudiante
Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function StudentPortal({ getDiplomadoLink }) {
  const { currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Diplomados', 'Cursos Cortos', 'Talleres'];
  const [diplomas, setDiplomas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDiplomas() {
      if (!currentUser?.id) return;
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('diploma_programs(*)')
          .eq('student_id', currentUser.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        const enrolledDiplomas = data.map(enr => enr.diploma_programs).filter(Boolean);
        setDiplomas(enrolledDiplomas);
      } catch (err) {
        console.error('Error fetching diplomas:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDiplomas();
  }, [currentUser?.id]);

  return (
    <div className="portal-layout">
      {/* COLUMNA IZQUIERDA */}
      <div className="portal-main">
        {/* FILTROS TIPO PASTILLA */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {filters.map(filter => (
            <button 
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{ 
                background: activeFilter === filter ? 'var(--text-dark)' : '#f1f5f9', 
                color: activeFilter === filter ? 'white' : 'var(--text-muted)', 
                padding: '0.5rem 1.25rem', borderRadius: '9999px', fontSize: '0.9rem', fontWeight: 500, cursor: 'pointer', border: 'none', transition: 'all 0.2s'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* TARJETAS DE CURSOS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {loading ? (
            <div style={{ color: 'var(--text-muted)' }}>Cargando programas...</div>
          ) : diplomas.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No hay programas disponibles.
            </div>
          ) : (
            diplomas.filter(d =>
              activeFilter === 'Todos' ||
              (activeFilter === 'Diplomados' && d.program_type !== 'curso') ||
              (activeFilter === 'Cursos Cortos' && d.program_type === 'curso')
            ).map(dip => {
              const isCourse = dip.program_type === 'curso';
              return (
                <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: isCourse ? 'var(--gold-subtle)' : 'var(--bg-light)', border: isCourse ? '1px solid rgba(252, 163, 17, 0.3)' : '1px solid rgba(20, 33, 61, 0.15)', padding: '1.25rem', transition: 'all 0.25s ease' }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
                >
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ background: isCourse ? 'var(--gold)' : 'var(--navy)', color: isCourse ? 'var(--navy)' : 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                      {isCourse ? 'Curso' : 'Diplomado'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3', fontWeight: 700 }}>{dip.title}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', marginBottom: '1.5rem', flexGrow: 1 }}>{dip.description || 'Sin descripción'}</p>
                  <Link onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }} to={getDiplomadoLink(dip.id)} className="btn" style={{ background: isCourse ? 'var(--gold)' : 'var(--navy)', color: isCourse ? 'var(--navy)' : 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.6rem', fontWeight: 700, borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)' }}>Abrir programa →</Link>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* COLUMNA DERECHA */}
      <div className="portal-sidebar">
        {/* PROGRESO */}
        <div className="card" style={{ background: '#f8fafc', border: 'none', boxShadow: 'none' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)' }}>Tu progreso</h3>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Ver todo</span>
          </div>
          {diplomas.slice(0,2).map((dip, idx) => (
             <div key={dip.id} style={{ marginBottom: '1rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '0.5rem', color: 'var(--text-dark)', fontWeight: 500 }}>
                 <span>{dip.title}</span><span>{(idx+1) * 15}%</span>
               </div>
               <div style={{ width: '100%', height: '14px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                 <div style={{ width: `${(idx+1) * 15}%`, height: '100%', background: 'var(--navy)' }}></div>
               </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
   SUB-COMPONENTE: Portal de Profesor
Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function TeacherPortal({ getDiplomadoLink }) {
  const { currentUser } = useAuth();
  const [classes, setClasses] = useState([]);
  const [diplomas, setDiplomas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeacherData() {
      if (!currentUser?.id) return;
      try {
        const { data: profileData } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();

        if (profileData) {
          // Obtener clases para la agenda
          const { data: classData } = await supabase
            .from('class_sessions')
            .select('*, diploma_programs(id, title, program_type, description), subtopics(modules(diploma_programs(id, title, program_type, description)))')
            .eq('teacher_id', profileData.id)
            .order('class_date', { ascending: true });
            
          setClasses(classData || []);
        }

        // Obtener diplomados/cursos inscritos
        const { data: enrollData } = await supabase
          .from('enrollments')
          .select('diploma_programs(*)')
          .eq('student_id', currentUser.id)
          .order('created_at', { ascending: false });
          
        if (enrollData) {
          const enrolledDiplomas = enrollData.map(enr => enr.diploma_programs).filter(Boolean);
          setDiplomas(enrolledDiplomas);
        }
      } catch (err) {
        console.error('Error fetching teacher portal data', err);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherData();
  }, [currentUser]);

  const upcomingClasses = classes.filter(c => new Date(c.class_date) > new Date());
  
  return (
    <div className="portal-layout">
      <div className="portal-main">
        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Mis Diplomados</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {diplomas.filter(p => p.program_type !== 'curso').length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No tienes diplomados asignados.</p>
          ) : (
            diplomas.filter(p => p.program_type !== 'curso').map(program => (
              <div key={program.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: 'var(--gold-subtle)', border: '1px solid rgba(212,160,23,0.2)', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ background: 'var(--navy)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Asignado</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3' }}>{program.title}</h3>
                <p style={{ color: 'var(--navy-light)', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{program.description || 'Acceso al entorno del diplomado.'}</p>
                <Link to={getDiplomadoLink(program.id)} className="btn" style={{ background: 'var(--navy)', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Entrar</Link>
              </div>
            ))
          )}
        </div>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Mis Cursos Cortos</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          {diplomas.filter(p => p.program_type === 'curso').length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No tienes cursos asignados.</p>
          ) : (
            diplomas.filter(p => p.program_type === 'curso').map(program => (
              <div key={program.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ background: 'var(--green-600)', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Asignado</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: 'var(--green-700)', lineHeight: '1.3' }}>{program.title}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{program.description || 'Acceso directo a subtemas y clases.'}</p>
                <Link to={getDiplomadoLink(program.id)} className="btn" style={{ background: 'var(--green-600)', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Entrar al Curso</Link>
              </div>
            ))
          )}
        </div>

        <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Próximas Clases en Agenda</h2>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando agenda...</p>
        ) : upcomingClasses.length === 0 ? (
           <p style={{ color: 'var(--text-muted)' }}>No tienes clases próximas programadas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingClasses.map(cls => {
              const d = new Date(cls.class_date);
              const day = d.getDate();
              const month = d.toLocaleString('es-ES', { month: 'short' });
              return (
                <div key={cls.id} style={{ display: 'flex', alignItems: 'center', padding: '1.5rem', background: 'white', borderRadius: 'var(--radius-lg)', border: '1px solid #e2e8f0', gap: '1rem' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#eff6ff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 700, textTransform: 'uppercase' }}>{month}</span>
                    <span style={{ fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 800, lineHeight: 1 }}>{day}</span>
                  </div>
                  <div style={{ flex: '1 1 200px' }}>
                    <h4 style={{ margin: 0, color: 'var(--text-dark)', fontSize: '1rem', marginBottom: '0.25rem' }}>{cls.title}</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>{cls.diploma_programs?.title || cls.subtopics?.modules?.diploma_programs?.title || 'Programa'} • {cls.duration || 0} min</p>
                  </div>
                  <Link to={getDiplomadoLink()} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}>Ir al Panel</Link>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="portal-sidebar">
        <div className="card" style={{ background: '#f8fafc', border: 'none', boxShadow: 'none' }}>
          <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Resumen Docente</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Clases Asignadas</span>
              <span style={{ fontWeight: 'bold', color: 'var(--text-dark)' }}>{classes.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Próximas Clases</span>
              <span style={{ fontWeight: 'bold', color: '#e11d48' }}>{upcomingClasses.length} Pendientes</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   SUB-COMPONENTE: Portal de Administrador
───────────────────────────────────────────────────────────────────────────── */
function AdminPortal({ getDiplomadoLink }) {
  const [counts, setCounts] = useState({ students: 0, teachers: 0, programs: 0 });
  const [diplomas, setDiplomas] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  
  // Estados para el Modal de Crear Programa
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newProgram, setNewProgram] = useState({ title: '', description: '', program_type: 'diplomado' });

  // Estados para imagen de portada
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    async function fetchData() {
      // Counts
      const pStudents = supabase.from('users_profile').select('*', { count: 'exact', head: true }).eq('role', 'student');
      const pTeachers = supabase.from('users_profile').select('*', { count: 'exact', head: true }).eq('role', 'teacher');
      const pPrograms = supabase.from('diploma_programs').select('*', { count: 'exact', head: true });
      
      const [resS, resT, resP] = await Promise.all([pStudents, pTeachers, pPrograms]);
      setCounts({ students: resS.count || 0, teachers: resT.count || 0, programs: resP.count || 0 });

      // Diplomas list
      const { data: dData } = await supabase.from('diploma_programs').select('*').order('created_at', { ascending: false });
      setDiplomas(dData || []);

      // Recent users
      const { data: rData } = await supabase.from('users_profile').select('*').order('created_at', { ascending: false }).limit(4);
      setRecentUsers(rData || []);
    }
    fetchData();
  }, []);

  const handleCreateProgram = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (!newProgram.title) throw new Error("El título es obligatorio");

      let imageUrl = null;

      // 1. Insertar el programa básico primero para obtener su ID
      const { data: progData, error: progError } = await supabase
        .from('diploma_programs')
        .insert([{ 
          title: newProgram.title, 
          description: newProgram.description, 
          program_type: newProgram.program_type 
        }])
        .select()
        .single();

      if (progError) throw progError;

      // 2. Subir imagen de portada si se seleccionó un archivo
      if (coverFile && progData?.id) {
        const { publicUrl, error: uploadErr } = await uploadProgramCover(coverFile, progData.id);
        if (uploadErr) {
          console.error("Advertencia al subir portada:", uploadErr);
        } else if (publicUrl) {
          imageUrl = publicUrl;
          await supabase
            .from('diploma_programs')
            .update({ image_url: publicUrl })
            .eq('id', progData.id);
          progData.image_url = publicUrl;
        }
      }

      // 3. Si es un curso, creamos un Módulo Invisible
      if (newProgram.program_type === 'curso') {
        const { error: modError } = await supabase
          .from('modules')
          .insert([{
            program_id: progData.id,
            title: 'Contenido del Curso',
            description: 'Módulo interno para mantener la estructura de la base de datos.',
            order_index: 0
          }]);
        if (modError) throw modError;
      }

      setDiplomas([progData, ...diplomas]);
      setCounts(prev => ({ ...prev, programs: prev.programs + 1 }));
      setShowModal(false);
      setNewProgram({ title: '', description: '', program_type: 'diplomado' });
      setCoverFile(null);
      setCoverPreview(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'teacher') return 'Profesor';
    return 'Estudiante';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', animation: 'fadeSlideUp 0.35s ease-out' }}>
      
      {/* MÉTRICAS GLOBALES ADMIN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem' }}>
        
        {/* Total Estudiantes */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem', background: 'var(--surface-light)', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(20, 33, 61, 0.08)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Users size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Total Estudiantes</h4>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, marginTop: '0.2rem' }}>{counts.students}</div>
          </div>
        </div>

        {/* Programas Creados */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem', background: 'var(--bg-light)', border: '1px solid rgba(20, 33, 61, 0.15)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(20, 33, 61, 0.1)' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Programas Creados</h4>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, marginTop: '0.2rem' }}>{counts.programs}</div>
          </div>
        </div>

        {/* Profesores */}
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem 1.5rem', background: 'var(--gold-subtle)', border: '1px solid rgba(252, 163, 17, 0.35)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: '#ffffff', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(252, 163, 17, 0.3)' }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.74rem', color: 'var(--gold-dark)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>Profesores</h4>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1, marginTop: '0.2rem' }}>{counts.teachers}</div>
          </div>
        </div>

      </div>

      <div className="portal-layout">
        <div className="portal-main">
          
          {/* SECCIÓN 1: DIPLOMADOS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--navy)', margin: 0, fontWeight: 700 }}>Catálogo de Diplomados</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Estructura por Módulos</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {diplomas.filter(d => d.program_type !== 'curso').map(dip => (
              <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: 'var(--gold-subtle)', border: '1px solid rgba(252, 163, 17, 0.25)', padding: '1.25rem' }}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <span className="badge badge-navy">Diplomado</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3', fontWeight: 700 }}>{dip.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.4 }}>
                  {dip.description || 'Sin descripción detallada.'}
                </p>
                <Link
                  onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }}
                  to={getDiplomadoLink(dip.id)}
                  className="btn btn-gold"
                  style={{ textAlign: 'center', width: '100%', justifyContent: 'center', padding: '0.55rem', fontWeight: 700 }}
                >
                  Administrar →
                </Link>
              </div>
            ))}

            {/* Tarjeta de Crear Diplomado */}
            <div
              onClick={() => { setNewProgram({...newProgram, program_type: 'diplomado'}); setShowModal(true); }}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                display: 'flex', flexDirection: 'column', border: '1.5px dashed var(--gold-dark)',
                background: 'rgba(252, 163, 17, 0.04)', boxShadow: 'none', padding: '1.25rem',
                alignItems: 'center', justifyContent: 'center', color: 'var(--navy)',
                cursor: 'pointer', height: '100%', minHeight: '180px', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(252, 163, 17, 0.10)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(252, 163, 17, 0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: 'var(--gold)' }}>
                  <Plus size={22} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Crear Nuevo Diplomado</span>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: CURSOS CORTOS */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1.25rem', color: 'var(--navy)', margin: 0, fontWeight: 700 }}>Catálogo de Cursos Cortos</h2>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500 }}>Temario Directo</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {diplomas.filter(d => d.program_type === 'curso').map(dip => (
              <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: 'var(--bg-light)', border: '1px solid rgba(20, 33, 61, 0.15)', padding: '1.25rem' }}>
                <div style={{ marginBottom: '0.85rem' }}>
                  <span className="badge badge-navy">Curso Corto</span>
                </div>
                <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3', fontWeight: 700 }}>{dip.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.4 }}>
                  {dip.description || 'Sin descripción detallada.'}
                </p>
                <Link
                  onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }}
                  to={getDiplomadoLink(dip.id)}
                  className="btn btn-navy"
                  style={{ textAlign: 'center', width: '100%', justifyContent: 'center', padding: '0.55rem', fontWeight: 700 }}
                >
                  Administrar →
                </Link>
              </div>
            ))}

            {/* Tarjeta de Crear Curso */}
            <div
              onClick={() => { setNewProgram({...newProgram, program_type: 'curso'}); setShowModal(true); }}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{
                display: 'flex', flexDirection: 'column', border: '1.5px dashed var(--navy)',
                background: 'rgba(20, 33, 61, 0.04)', boxShadow: 'none', padding: '1.25rem',
                alignItems: 'center', justifyContent: 'center', color: 'var(--navy)',
                cursor: 'pointer', height: '100%', minHeight: '180px', transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(20, 33, 61, 0.08)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(20, 33, 61, 0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem', color: '#ffffff' }}>
                  <Plus size={22} />
                </div>
                <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Crear Nuevo Curso</span>
              </div>
            </div>
          </div>
        </div>

        <div className="portal-sidebar">
          
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Usuarios Recientes</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {recentUsers.map(user => (
                <div key={user.id} style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', flexShrink: 0 }}>
                    <User size={14} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-dark)' }}><strong>{user.full_name || user.email}</strong> registrado.</p>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Rol: {user.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* MODAL CREAR PROGRAMA */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Crear Nuevo Programa</h3>
            
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            
            <form onSubmit={handleCreateProgram} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Tipo de Programa</label>
                <select 
                  value={newProgram.program_type} 
                  onChange={e => setNewProgram({...newProgram, program_type: e.target.value})}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                >
                  <option value="diplomado">Diplomado (Estructura con Módulos)</option>
                  <option value="curso">Curso Corto (Solo Temas y Clases)</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Programa</label>
                <input 
                  type="text" 
                  value={newProgram.title} 
                  onChange={e => setNewProgram({...newProgram, title: e.target.value})} 
                  placeholder="Ej: Curso de Energía Solar"
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                  required 
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción (Opcional)</label>
                <textarea 
                  value={newProgram.description} 
                  onChange={e => setNewProgram({...newProgram, description: e.target.value})} 
                  rows={3}
                  style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
                />
              </div>

              {/* CAMPO DE IMAGEN DE PORTADA */}
              <div>
                <label htmlFor="create-program-cover-input" style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>
                  Imagen de Portada (Opcional)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {coverPreview ? (
                    <div style={{ position: 'relative', width: '100%', height: '120px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
                      <img src={coverPreview} alt="Vista previa de la portada del programa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button
                        type="button"
                        onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                        style={{ position: 'absolute', top: '8px', right: '8px', background: 'rgba(220, 38, 38, 0.9)', color: 'white', border: 'none', borderRadius: '50%', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                        aria-label="Eliminar imagen seleccionada"
                        title="Eliminar imagen"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <label 
                      htmlFor="create-program-cover-input" 
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('create-program-cover-input')?.click(); } }}
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', border: '1.5px dashed var(--border-color)', borderRadius: '4px', cursor: 'pointer', background: '#f8fafc', color: 'var(--text-muted)', fontSize: '0.84rem' }}
                    >
                      <Upload size={16} />
                      <span>Cargar portada (JPG, PNG, WebP máx 5MB)</span>
                    </label>
                  )}
                  <input
                    id="create-program-cover-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
                        setError('Formato no válido. Selecciona únicamente imágenes JPG, PNG o WebP.');
                        return;
                      }
                      if (file.size > 5 * 1024 * 1024) {
                        setError('El archivo seleccionado excede el tamaño máximo permitido de 5MB.');
                        return;
                      }
                      setError('');
                      setCoverFile(file);
                      setCoverPreview(URL.createObjectURL(file));
                    }}
                  />
                </div>
              </div>
              
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
                {submitting ? 'Creando programa e imagen...' : 'Crear Programa'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
   COMPONENTE PRINCIPAL
Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
export default function Portal() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const getDiplomadoLink = (programId) => {
    if (role === 'admin') return `/dashboard/admin/${programId}`;
    if (role === 'teacher') return `/dashboard/profesor/${programId}`;
    return `/dashboard/${programId}`; // Estudiante
  };

  return (
    <div style={{ padding: '2rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER PRINCIPAL COMPARTIDO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--text-dark)', fontSize: '2.5rem', fontWeight: 'bold' }}>
          {role === 'admin' ? 'Panel de Control LIATER' : 'Mis Programas'}
        </h1>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          </span>
      </div>

      {/* RENDERIZADO DINÁMICO SEGÚN ROL */}
      {role === 'admin' && <AdminPortal getDiplomadoLink={getDiplomadoLink} />}
      {role === 'teacher' && <TeacherPortal getDiplomadoLink={getDiplomadoLink} />}
      {role === 'student' && <StudentPortal getDiplomadoLink={getDiplomadoLink} />}
      {/* Fallback por seguridad si no hay rol */}
      {!role && <StudentPortal getDiplomadoLink={getDiplomadoLink} />}
    </div>
  );
}







