import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { PlayCircle, Clock, BookOpen, User, Users, Activity, BarChart3, TrendingUp, Calendar, CheckCircle, GraduationCap, Plus, X } from 'lucide-react';
import { formatClassDate, formatShortDate } from '../utils/dateUtils';

/* ────────────────────────────────────────────────────────
   SUB-COMPONENTE: Portal de Estudiante
──────────────────────────────────────────────────────── */
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
                <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: isCourse ? '#f0fdf4' : '#e0e7ff', border: isCourse ? '1px solid #bbf7d0' : 'none', padding: '1.25rem' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <span style={{ background: isCourse ? '#16a34a' : '#4f46e5', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>
                      {isCourse ? 'Curso' : 'Diplomado'}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: isCourse ? '#14532d' : '#1e3a8a', lineHeight: '1.3' }}>{dip.title}</h3>
                  <p style={{ color: isCourse ? '#166534' : '#3730a3', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{dip.description || 'Sin descripción'}</p>
                  <Link onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }} to={getDiplomadoLink(dip.id)} className="btn" style={{ background: isCourse ? '#16a34a' : '#4f46e5', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Entrar</Link>
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
                 <div style={{ width: `${(idx+1) * 15}%`, height: '100%', background: 'var(--primary-color)' }}></div>
               </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   SUB-COMPONENTE: Portal de Profesor
──────────────────────────────────────────────────────── */
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
              <div key={program.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: '#e0e7ff', border: '1px solid #bfdbfe', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}>
                  <span style={{ background: '#4f46e5', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Asignado</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#1e3a8a', lineHeight: '1.3' }}>{program.title}</h3>
                <p style={{ color: '#3730a3', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{program.description || 'Acceso al entorno del diplomado.'}</p>
                <Link to={getDiplomadoLink(program.id)} className="btn" style={{ background: '#4f46e5', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Entrar</Link>
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
                  <span style={{ background: '#16a34a', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Asignado</span>
                </div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#14532d', lineHeight: '1.3' }}>{program.title}</h3>
                <p style={{ color: '#166534', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{program.description || 'Acceso directo a subtemas y clases.'}</p>
                <Link to={getDiplomadoLink(program.id)} className="btn" style={{ background: '#16a34a', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Entrar al Curso</Link>
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
                    <span style={{ fontSize: '1.2rem', color: '#1d4ed8', fontWeight: 800, lineHeight: 1 }}>{day}</span>
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

/* ────────────────────────────────────────────────────────
   SUB-COMPONENTE: Portal de Administrador
──────────────────────────────────────────────────────── */
function AdminPortal({ getDiplomadoLink }) {
  const [counts, setCounts] = useState({ students: 0, teachers: 0, programs: 0 });
  const [diplomas, setDiplomas] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  
  // Estados para el Modal de Crear Programa
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newProgram, setNewProgram] = useState({ title: '', description: '', program_type: 'diplomado' });

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
      const { data: rData } = await supabase.from('users_profile').select('*').order('created_at', { ascending: false }).limit(3);
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

      // Insertar el programa
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

      // Si es un curso, creamos un Módulo Invisible
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
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* MÉTRICAS GLOBALES ADMIN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '50%', color: '#2563eb' }}><Users size={24} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#3b82f6', textTransform: 'uppercase', fontWeight: 600 }}>Total Estudiantes</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#1e3a8a' }}>{counts.students}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '50%', color: '#16a34a' }}><BookOpen size={24} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#22c55e', textTransform: 'uppercase', fontWeight: 600 }}>Programas Creados</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#14532d' }}>{counts.programs}</div>
          </div>
        </div>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', background: '#fffbeb', border: '1px solid #fde68a' }}>
          <div style={{ background: 'white', padding: '0.75rem', borderRadius: '50%', color: '#d97706' }}><GraduationCap size={24} /></div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#d97706', textTransform: 'uppercase', fontWeight: 600 }}>Profesores</h4>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#92400e' }}>{counts.teachers}</div>
          </div>
        </div>
      </div>

      <div className="portal-layout">
        <div className="portal-main">
          
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Catálogo de Diplomados</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            
            {diplomas.filter(d => d.program_type !== 'curso').map(dip => (
              <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: '#e0e7ff', border: 'none', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}><span style={{ background: '#4f46e5', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Activo</span></div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#1e3a8a', lineHeight: '1.3' }}>{dip.title}</h3>
                <p style={{ color: '#3730a3', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{dip.description || 'Sin descripción.'}</p>
                <Link onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }} to={getDiplomadoLink(dip.id)} className="btn" style={{ background: '#4f46e5', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Administrar</Link>
              </div>
            ))}

            <div onClick={() => { setNewProgram({...newProgram, program_type: 'diplomado'}); setShowModal(true); }} style={{textDecoration: 'none'}}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', border: '1px dashed #cbd5e1', background: '#f8fafc', boxShadow: 'none', padding: '1.25rem', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', height: '100%', minHeight: '200px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <Plus size={24} color="#64748b" />
                </div>
                <span style={{ fontWeight: 600 }}>Crear Nuevo Diplomado</span>
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '1.5rem' }}>Catálogo de Cursos Cortos</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
            
            {diplomas.filter(d => d.program_type === 'curso').map(dip => (
              <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: '#f0fdf4', border: 'none', padding: '1.25rem' }}>
                <div style={{ marginBottom: '1rem' }}><span style={{ background: '#16a34a', color: 'white', padding: '0.3rem 0.8rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600 }}>Activo</span></div>
                <h3 style={{ fontSize: '1.15rem', marginBottom: '0.5rem', color: '#14532d', lineHeight: '1.3' }}>{dip.title}</h3>
                <p style={{ color: '#166534', fontSize: '0.85rem', marginBottom: '1.5rem', flexGrow: 1 }}>{dip.description || 'Sin descripción.'}</p>
                <Link onClick={() => { localStorage.setItem('activeProgramId', dip.id); localStorage.setItem('activeProgramType', dip.program_type); }} to={getDiplomadoLink(dip.id)} className="btn" style={{ background: '#16a34a', color: 'white', border: 'none', textAlign: 'center', width: '100%', padding: '0.5rem' }}>Administrar</Link>
              </div>
            ))}

            <div onClick={() => { setNewProgram({...newProgram, program_type: 'curso'}); setShowModal(true); }} style={{textDecoration: 'none'}}>
              <div className="card" style={{ display: 'flex', flexDirection: 'column', border: '1px dashed #cbd5e1', background: '#f8fafc', boxShadow: 'none', padding: '1.25rem', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer', height: '100%', minHeight: '200px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', border: '1px solid #e2e8f0' }}>
                  <Plus size={24} color="#64748b" />
                </div>
                <span style={{ fontWeight: 600 }}>Crear Nuevo Curso</span>
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
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1d4ed8', flexShrink: 0 }}>
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
              
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%', padding: '0.75rem' }}>
                {submitting ? 'Creando...' : 'Crear Programa'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}


/* ────────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
──────────────────────────────────────────────────────── */
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
        <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Hola, {role === 'admin' ? 'Administrador' : role === 'teacher' ? 'Profesor' : 'Estudiante'} 👋
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
