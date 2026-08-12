import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, User, Users, GraduationCap, Plus, X, Upload, Trash2, Eye, EyeOff, MessageSquareText, CalendarClock, ChevronRight, CalendarDays, CheckCircle2, Archive, RefreshCw, MessageSquare, ArrowRight, Video, Sparkles, Zap, AlertTriangle, Clock, CalendarPlus, Settings, Filter, Megaphone } from 'lucide-react';
import { formatShortDate, isClassLiveOrSoon } from '../utils/dateUtils';
import { uploadProgramCover, fetchUpcomingPrograms, calculateProgramProgress } from '../services/programService';
import { updateDoubtStatus } from '../services/doubtService';
import PendingActivitiesCard from '../components/PendingActivitiesCard';/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
   SUB-COMPONENTE: Portal de Estudiante
Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function StudentPortal({ getDiplomadoLink }) {
  const { currentUser } = useAuth();
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Diplomados', 'Cursos Cortos', 'Talleres'];
  const [diplomas, setDiplomas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nowTime, setNowTime] = useState(Date.now());

  // Ticker para actualizar estados de clases en vivo en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  // Estados para el bloque de Próximos Programas
  const [upcomingPrograms, setUpcomingPrograms] = useState([]);
  const [upcomingLoading, setUpcomingLoading] = useState(true);
  const [upcomingError, setUpcomingError] = useState(null);

  const loadUpcoming = useCallback(async () => {
    setUpcomingLoading(true);
    setUpcomingError(null);
    try {
      const { programs: data, error: err } = await fetchUpcomingPrograms(currentUser?.id, 3);
      if (err) throw err;
      setUpcomingPrograms(data || []);
    } catch (err) {
      console.error('Error fetching upcoming programs:', err);
      setUpcomingError('No se pudieron cargar los próximos programas.');
    } finally {
      setUpcomingLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    async function fetchDiplomas() {
      if (!currentUser?.id) return;
      try {
        setLoading(true);
        const { data: enrollData, error } = await supabase
          .from('enrollments')
          .select('diploma_programs(*)')
          .eq('student_id', currentUser.id)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        const enrolledDiplomas = (enrollData || []).map(enr => enr.diploma_programs).filter(Boolean);

        // Obtener progreso para cada diplomado usando la nueva lógica basada en actividades de reforzamiento
        if (enrolledDiplomas.length > 0) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

          // Buscar clases programadas para hoy
          const { data: todayClasses } = await supabase
            .from('class_sessions')
            .select('id, program_id, meet_url, class_date, duration, video_url')
            .in('program_id', enrolledDiplomas.map(d => d.id))
            .gte('class_date', todayStart)
            .lt('class_date', todayEnd);

          const diplomasWithProgress = await Promise.all(
            enrolledDiplomas.map(async (dip) => {
              const progress = await calculateProgramProgress(dip.id, currentUser.id);
              const pClasses = todayClasses?.filter(c => c.program_id === dip.id) || [];
              const liveClass = pClasses.find(c => isClassLiveOrSoon(c, 10));
              const liveUrl = liveClass ? (liveClass.meet_url || dip.meet_url) : null;
              return { ...dip, progress, liveUrl, todayClasses: pClasses };
            })
          );
          setDiplomas(diplomasWithProgress);
        } else {
          setDiplomas([]);
        }
      } catch (err) {
        console.error('Error fetching diplomas:', err);
      } finally {
        setLoading(false);
      }
    }

    if (currentUser?.id) {
      fetchDiplomas();
      loadUpcoming();
    }
  }, [currentUser?.id, loadUpcoming]);

  const getButtonLabel = (progress) => {
    if (progress === 0) return 'Comenzar';
    if (progress === 100) return 'Revisar contenido';
    return 'Continuar';
  };

  // Destino dinámico: si ya inició, ir directo a módulos; si no, al dashboard de bienvenida
  const getContinueLink = (dip) => {
    if (dip.progress > 0) return `/modules/${dip.id}`;
    return getDiplomadoLink(dip.id);
  };

  const getBadgeLabel = (type) => {
    if (type === 'curso') return 'Curso Corto';
    if (type === 'taller') return 'Taller';
    return 'Diplomado';
  };

  // Recalcular liveUrl según nowTime (10 minutos antes y durante la clase)
  const activeDiplomas = diplomas.map(dip => {
    if (!dip.todayClasses || dip.todayClasses.length === 0) return dip;
    const liveClass = dip.todayClasses.find(c => isClassLiveOrSoon(c, 10));
    const liveUrl = liveClass ? (liveClass.meet_url || dip.meet_url) : null;
    return { ...dip, liveUrl };
  });

  // Saludo contextual
  const studentName = currentUser?.full_name || currentUser?.user_metadata?.full_name || currentUser?.name || '';
  const firstName = studentName.split(' ')[0] || 'Estudiante';
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
  const todayLabel = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  const programWithClassToday = activeDiplomas.find(d => d.liveUrl);

  // Lógica para "Retoma tu aprendizaje"
  const resumeProgram = activeDiplomas.find(d => d.progress > 0 && d.progress < 100) || activeDiplomas[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

      {/* ══ SALUDO CONTEXTUAL HERO ══ */}
      <div style={{
        background: 'linear-gradient(135deg, var(--navy) 0%, #1e2e52 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 2rem',
        marginBottom: '1.75rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        boxShadow: '0 4px 20px rgba(20,33,61,0.12)'
      }}>
        <div>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.78rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 0.2rem 0' }}>
            {todayLabel}
          </p>
          <h1 style={{ color: '#ffffff', fontSize: '1.75rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.88rem', margin: '0.4rem 0 0 0' }}>
            {diplomas.length > 0
              ? `Tienes ${diplomas.length} ${diplomas.length === 1 ? 'programa activo' : 'programas activos'}.`
              : 'No tienes programas activos aún.'}
          </p>
        </div>
        {programWithClassToday && (
          <a
            href={programWithClassToday.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--gold)',
              color: 'var(--navy)',
              padding: '0.65rem 1.25rem',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '0.88rem',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(252,163,17,0.35)',
              flexShrink: 0,
              animation: 'pulse 2s ease-in-out infinite'
            }}
          >
            <Video size={16} /> Clase en vivo hoy · Unirse
          </a>
        )}
      </div>

      <div className="portal-layout">
        {/* 1. TARJETA DE PENDIENTES Y PRÓXIMAS FECHAS */}
        <div className="mobile-order-pending desktop-sidebar-pending">
          <PendingActivitiesCard studentId={currentUser?.id} />
        </div>

        {/* 2. COLUMNA PRINCIPAL CON FILTROS Y REJILLA */}
        <div className="portal-main mobile-order-main">
        
        {/* ACCESO RÁPIDO: RETOMA TU APRENDIZAJE */}
        {resumeProgram && activeFilter === 'Todos' && !loading && (
          <div style={{
            background: '#ffffff',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem 1.5rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '1.5rem',
            boxShadow: '0 4px 12px rgba(20,33,61,0.06)',
            border: '1px solid var(--border-color)',
            position: 'relative',
            overflow: 'hidden',
            flexWrap: 'wrap'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: '4px', background: 'var(--gold)' }} />
            
            <div style={{ flexShrink: 0, width: '100px', height: '65px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {resumeProgram.image_url ? (
                <img src={resumeProgram.image_url} alt="Portada" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <BookOpen size={24} color="var(--gold)" />
              )}
            </div>

            <div style={{ flexGrow: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--gold)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Retoma tu aprendizaje
                </span>
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--navy)', fontWeight: 800, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {resumeProgram.title}
              </h3>
              
              {/* Barra de progreso rápida */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', maxWidth: '300px' }}>
                <div style={{ flexGrow: 1, height: '6px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${resumeProgram.progress || 0}%`, height: '100%', background: 'var(--navy)', borderRadius: '999px' }} />
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)' }}>{resumeProgram.progress || 0}%</span>
              </div>
            </div>

            <div style={{ flexShrink: 0, marginLeft: 'auto' }}>
              <Link 
                to={getContinueLink(resumeProgram)}
                onClick={() => { 
                  localStorage.setItem('activeProgramId', resumeProgram.id); 
                  localStorage.setItem('activeProgramType', resumeProgram.program_type); 
                }}
                className="btn btn-primary"
                style={{ padding: '0.6rem 1.25rem', borderRadius: '999px', fontSize: '0.85rem' }}
              >
                Continuar →
              </Link>
            </div>
          </div>
        )}

        {/* FILTROS TIPO PASTILLA */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', overflowX: 'auto', paddingBottom: '0.3rem', background: 'rgba(255,255,255,0.4)', padding: '0.35rem', borderRadius: '9999px', backdropFilter: 'blur(10px)', width: 'fit-content', scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
          {filters.map(filter => {
            const isActive = activeFilter === filter;
            return (
              <button 
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{ 
                  background: isActive ? 'var(--navy)' : 'transparent', 
                  color: isActive ? '#ffffff' : 'var(--navy)', 
                  padding: '0.5rem 1.25rem', 
                  borderRadius: '9999px', 
                  fontSize: '0.86rem', 
                  fontWeight: 700, 
                  cursor: 'pointer', 
                  border: 'none', 
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: isActive ? '0 4px 12px rgba(20,33,61,0.2)' : 'none',
                  transform: isActive ? 'scale(1.02)' : 'scale(1)'
                }}
                onMouseOver={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(20, 33, 61, 0.08)';
                    e.currentTarget.style.transform = 'scale(1.04)';
                  }
                }}
                onMouseOut={e => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'scale(1)';
                  }
                }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.95)'; }}
              >
                {filter}
              </button>
            );
          })}
        </div>

        {/* REJILLA DE TARJETAS DE PROGRAMA */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2rem' }}>
          
          {/* ESTADO DE CARGA SKELETON */}
          {loading ? (
            Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="card" style={{ padding: 0, overflow: 'hidden', minHeight: '300px' }}>
                <div style={{ width: '100%', aspectRatio: '16 / 9', background: 'rgba(0,0,0,0.05)', animation: 'pulse 1.5s infinite' }} />
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ width: '80px', height: '18px', borderRadius: '999px', background: 'rgba(0,0,0,0.06)' }} />
                  <div style={{ width: '90%', height: '22px', borderRadius: '4px', background: 'rgba(0,0,0,0.06)' }} />
                  <div style={{ width: '100%', height: '8px', borderRadius: '999px', background: 'rgba(0,0,0,0.04)', marginTop: '0.5rem' }} />
                  <div style={{ width: '100%', height: '42px', borderRadius: 'var(--radius-md)', background: 'rgba(0,0,0,0.05)', marginTop: 'auto' }} />
                </div>
              </div>
            ))
          ) : diplomas.length === 0 ? (
            /* ESTADO VACÍO CUANDO NO HAY PROGRAMAS */
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4.5rem 2rem', borderRadius: 'var(--radius-lg)', background: 'linear-gradient(to bottom, #ffffff, #f8fafc)', border: '1px dashed #cbd5e1' }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(20,33,61,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <BookOpen size={40} color="var(--navy)" style={{ opacity: 0.5 }} />
              </div>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--navy)', fontWeight: 800, marginBottom: '0.75rem' }}>No estás inscrito en ningún programa</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                Parece que aún no tienes cursos o diplomados activos. Explora nuestra oferta académica e inicia tu aprendizaje.
              </p>
              <Link to="/proximos-programas" className="btn btn-outline" style={{ display: 'inline-flex', padding: '0.6rem 1.25rem', fontWeight: 700 }}>
                Explorar Catálogo
              </Link>
            </div>
          ) : (
            /* LISTA DE TARJETAS DE PROGRAMAS ENROLADOS */
            activeDiplomas.filter(d =>
              activeFilter === 'Todos' ||
              (activeFilter === 'Diplomados' && (d.program_type === 'diplomado' || !d.program_type)) ||
              (activeFilter === 'Cursos Cortos' && d.program_type === 'curso') ||
              (activeFilter === 'Talleres' && d.program_type === 'taller')
            ).map(dip => {
              const isCourse = dip.program_type === 'curso';
              const isPublished = dip.is_published !== false && dip.status !== 'draft' && dip.status !== 'disabled';
              const progress = dip.progress || 0;
              const buttonText = getButtonLabel(progress);
              const badgeText = getBadgeLabel(dip.program_type);

              return (
                <div 
                  key={dip.id} 
                  className="card" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: 0, 
                    overflow: 'hidden', 
                    opacity: isPublished ? 1 : 0.88,
                    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                    cursor: 'default',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 2px 8px rgba(20,33,61,0.04)'
                  }}
                  onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 12px 24px rgba(20,33,61,0.1)'; e.currentTarget.style.borderColor = 'var(--navy-light)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,33,61,0.04)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
                >
                  {/* 1. IMAGEN DE PORTADA DESTACADA Y AMPLIA (ALTURA 200PX CON BADGE SOBREPUESTO) */}
                  <div style={{ width: '100%', height: '200px', overflow: 'hidden', position: 'relative', background: 'var(--navy)' }}>
                    {/* BADGES SOBREPUESTOS EN LA IMAGEN */}
                    <div style={{ position: 'absolute', top: '0.5rem', left: '0.5rem', zIndex: 2, display: 'flex', gap: '0.35rem' }}>
                      <span className={isCourse ? 'badge badge-green' : 'badge badge-navy'} style={{ fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', backdropFilter: 'blur(8px)', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                        {badgeText}
                      </span>
                      {!isPublished && (
                        <span className="badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)', color: '#ffffff', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', backdropFilter: 'blur(8px)' }}>
                          INHABILITADO
                        </span>
                      )}
                    </div>

                    {/* INDICADOR DE CLASE PROGRAMADA PARA HOY (ESQUINA DERECHA DE LA PORTADA) */}
                    {dip.liveUrl && isPublished && (
                      <a 
                        href={dip.liveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        title="Ver enlace de la clase programada para hoy"
                        style={{
                          position: 'absolute',
                          top: '0.6rem',
                          right: '0.6rem',
                          zIndex: 3,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          background: 'rgba(20, 33, 61, 0.92)',
                          color: 'var(--gold)',
                          padding: '0.35rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          textDecoration: 'none',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                          letterSpacing: '0.03em',
                          backdropFilter: 'blur(8px)',
                          transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          border: '1px solid rgba(252, 163, 17, 0.5)'
                        }}
                        onMouseOver={e => {
                          e.currentTarget.style.transform = 'scale(1.05)';
                          e.currentTarget.style.borderColor = 'var(--gold)';
                          e.currentTarget.style.boxShadow = '0 0 14px rgba(252, 163, 17, 0.4)';
                        }}
                        onMouseOut={e => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.borderColor = 'rgba(252, 163, 17, 0.5)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
                        }}
                        onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                      >
                        <CalendarDays size={13} color="var(--gold)" />
                        <span>Clase Hoy · Unirse ➔</span>
                      </a>
                    )}

                    {dip.image_url ? (
                      <img 
                        src={dip.image_url} 
                        alt={`Portada de ${dip.title}`}
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; 
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: isPublished ? 'none' : 'grayscale(60%)' }} 
                      />
                    ) : null}
                    
                    {/* Fallback cuando no hay imagen o falla la carga */}
                    <div style={{ 
                      display: dip.image_url ? 'none' : 'flex', 
                      width: '100%', 
                      height: '100%', 
                      background: isCourse ? 'linear-gradient(135deg, #14213D 0%, #1d3557 60%, #FCA311 100%)' : 'linear-gradient(135deg, #14213D 0%, #1a2c50 60%, #007a2e 100%)',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '0.75rem',
                      boxSizing: 'border-box'
                    }}>
                      <BookOpen size={24} color={isCourse ? 'var(--gold)' : '#ffffff'} style={{ marginBottom: '0.2rem', opacity: 0.9 }} />
                      <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', color: isCourse ? 'var(--gold)' : '#a7f3d0', textTransform: 'uppercase' }}>
                        LIATER UNAL
                      </span>
                    </div>
                  </div>

                  {/* CUERPO COMPACTO DE LA TARJETA */}
                  <div style={{ padding: '0.9rem 1rem 1rem 1rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    
                    {/* 3. TÍTULO DEL PROGRAMA */}
                    <h3 style={{ fontSize: '0.98rem', color: 'var(--navy)', fontWeight: 700, marginBottom: '0.75rem', lineHeight: '1.3', minHeight: '2.6rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {dip.title}
                    </h3>

                    {/* 5. FILA DE TEXTO PROGRESO Y PORCENTAJE */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', marginBottom: '0.3rem', fontWeight: 700, color: 'var(--navy)' }}>
                      <span>Progreso</span>
                      <span>{progress}%</span>
                    </div>

                    {/* 6. BARRA DE PROGRESO */}
                    <div style={{ width: '100%', height: '5px', background: 'rgba(0,0,0,0.06)', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.85rem', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)' }}>
                      <div style={{ 
                        width: `${progress}%`, 
                        height: '100%', 
                        background: progress === 100 ? 'var(--green-600)' : 'var(--navy)', 
                        borderRadius: '999px',
                        transition: 'width 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: progress > 0 ? '0 0 10px rgba(20,33,61,0.5)' : 'none'
                      }} />
                    </div>
                    

                    {/* 7. BOTÓN PRINCIPAL CON TEXTO SEGÚN EL AVANCE */}
                    {isPublished ? (
                      <Link 
                        onClick={() => { 
                          localStorage.setItem('activeProgramId', dip.id); 
                          localStorage.setItem('activeProgramType', dip.program_type); 
                        }} 
                        to={getContinueLink(dip)} 
                        className="btn btn-primary" 
                        style={{ 
                          textAlign: 'center', 
                          width: '100%', 
                          justifyContent: 'center', 
                          padding: '0.5rem 0.85rem', 
                          fontWeight: 700, 
                          fontSize: '0.82rem',
                          borderRadius: 'var(--radius-md)',
                          boxShadow: 'var(--shadow-sm)'
                        }}
                      >
                        {buttonText} →
                      </Link>
                    ) : (
                      <button 
                        disabled
                        style={{ 
                          textAlign: 'center', 
                          width: '100%', 
                          padding: '0.65rem', 
                          fontWeight: 700, 
                          fontSize: '0.88rem',
                          borderRadius: 'var(--radius-md)',
                          background: '#cbd5e1',
                          color: '#64748b',
                          border: 'none',
                          cursor: 'not-allowed'
                        }}
                      >
                        Programa Inhabilitado
                      </button>
                    )}

                  </div>
                </div>
              );
            })
          )}
        </div>
        </div>

        {/* 3. BLOQUE DE PRÓXIMOS PROGRAMAS */}
        <div className="mobile-order-upcoming desktop-sidebar-upcoming">
        <div className="card static-card" style={{ padding: '1.35rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 700, margin: 0 }}>Próxima oferta académica</h3>
            <Link to="/proximos-programas" style={{ fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 700, textDecoration: 'none' }}>
              Ver todos
            </Link>
          </div>

          {/* SKELETON LOADER */}
          {upcomingLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <div style={{ width: '80px', height: '56px', borderRadius: '6px', background: '#e2e8f0', flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexGrow: 1 }}>
                    <div style={{ width: '50px', height: '12px', background: '#cbd5e1', borderRadius: '999px' }} />
                    <div style={{ width: '90%', height: '14px', background: '#cbd5e1', borderRadius: '4px' }} />
                    <div style={{ width: '60%', height: '12px', background: '#e2e8f0', borderRadius: '4px' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : upcomingError ? (
            /* ERROR Y REINTENTO */
            <div style={{ padding: '0.75rem', background: '#fef2f2', borderRadius: '6px', color: '#dc2626', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span>{upcomingError}</span>
              <button 
                onClick={loadUpcoming} 
                style={{ background: '#dc2626', color: '#ffffff', border: 'none', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600, width: 'fit-content' }}
              >
                Reintentar
              </button>
            </div>
          ) : upcomingPrograms.length === 0 ? (
            /* ESTADO VACÍO DISCRETO */
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(20,33,61,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.5rem auto' }}>
                <CalendarDays size={20} color="var(--text-muted)" style={{ opacity: 0.6 }} />
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>
                No hay nueva oferta académica por el momento.
              </p>
            </div>
          ) : (
            /* LISTADO COMPACTO HASTA 3 ELEMENTOS */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {upcomingPrograms.slice(0, 3).map(prog => {
                const isOpen = prog.enrollment_start_date || prog.status === 'published';
                const isCourse = prog.program_type === 'curso';

                return (
                  <div key={prog.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    {/* MINIATURA COMPACTA (80px x 56px) */}
                    <div style={{ width: '80px', height: '56px', borderRadius: '6px', overflow: 'hidden', background: 'var(--navy)', flexShrink: 0, position: 'relative' }}>
                      {prog.image_url ? (
                        <img 
                          src={prog.image_url} 
                          alt={`Portada de ${prog.title}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                          }}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                      ) : null}
                      <div style={{ display: prog.image_url ? 'none' : 'flex', width: '100%', height: '100%', background: isCourse ? 'linear-gradient(135deg, #14213D 0%, #FCA311 100%)' : 'linear-gradient(135deg, #14213D 0%, #007a2e 100%)', alignItems: 'center', justifyContent: 'center' }}>
                        <BookOpen size={20} color="#ffffff" />
                      </div>
                    </div>

                    {/* DETALLES DEL PROGRAMA */}
                    <div style={{ flexGrow: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.66rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase' }}>
                          {isCourse ? 'Curso' : 'Diplomado'}
                        </span>
                        <span style={{ fontSize: '0.66rem', fontWeight: 600, color: isOpen ? 'var(--green-700)' : 'var(--gold-dark)' }}>
                          • {isOpen ? 'Inscripciones abiertas' : 'Próximamente'}
                        </span>
                      </div>

                      <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {prog.title}
                      </h4>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.15rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {prog.start_date ? formatShortDate(prog.start_date) : 'Por definir'}
                        </span>
                        <Link to="/proximos-programas" style={{ fontSize: '0.74rem', color: 'var(--navy)', fontWeight: 700, textDecoration: 'none' }}>
                          Ver detalles →
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        </div>{/* cierre portal-layout */}
      </div>{/* cierre wrapper externo */}
    </div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
   SUB-COMPONENTE: Portal de Profesor
Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */
function TeacherPortal({ getDiplomadoLink }) {
  const { currentUser } = useAuth();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const activeTab = searchParams.get('tab') || 'inicio'; // 'inicio' | 'programas' | 'agenda' | 'consultas'

  const [classes, setClasses] = useState([]);
  const [diplomas, setDiplomas] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [pendingClasses, setPendingClasses] = useState([]);
  const [teacherName, setTeacherName] = useState('');
  const [counts, setCounts] = useState({ doubts: 0, upcomingClasses: 0, activePrograms: 0, pendingActivities: 0 });
  const [loading, setLoading] = useState(true);

  // Estados para filtro en "Mis programas", "Bandeja de consultas" y "Agenda"
  const [activeFilter, setActiveFilter] = useState('Todos');
  const filters = ['Todos', 'Diplomados', 'Cursos Cortos', 'Talleres'];
  const [doubtStatusFilter, setDoubtStatusFilter] = useState('todos');
  const [agendaTimeFilter, setAgendaTimeFilter] = useState('todos'); // 'todos' | 'hoy' | 'semana' | 'proximas'
  const [agendaProgramFilter, setAgendaProgramFilter] = useState('todos'); // 'todos' | programId
  const [nowTime, setNowTime] = useState(Date.now());

  // Ticker para actualizar estados de clases en vivo en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = async (doubtId, newStatus) => {
    setQuestions(prev => {
      const updated = prev.map(q => q.id === doubtId ? { ...q, status: newStatus } : q);
      setCounts(cPrev => ({
        ...cPrev,
        doubts: updated.filter(d => d.status === 'enviada' || d.status === 'revisada').length
      }));
      return updated;
    });
    await updateDoubtStatus(doubtId, newStatus);
  };

  const fetchTeacherData = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const { data: profileData } = await supabase
        .from('teacher_profiles')
        .select('id, name, user_id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      const name = profileData?.name || currentUser?.full_name || currentUser?.name || currentUser?.user_metadata?.full_name || 'Profesor';
      setTeacherName(name);

      let teacherDiplomas = [];
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('diploma_programs(*)')
        .eq('student_id', currentUser.id)
        .order('created_at', { ascending: false });
        
      if (enrollData) {
        const fetchedDiplomas = enrollData.map(enr => enr.diploma_programs).filter(Boolean);
        
        if (fetchedDiplomas.length > 0) {
          const now = new Date();
          const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
          const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

          const { data: todayClasses } = await supabase
            .from('class_sessions')
            .select('id, program_id, meet_url, class_date, duration, video_url')
            .in('program_id', fetchedDiplomas.map(d => d.id))
            .gte('class_date', todayStart)
            .lt('class_date', todayEnd);

          teacherDiplomas = fetchedDiplomas.map(dip => {
            const liveClass = todayClasses?.find(c => c.program_id === dip.id && isClassLiveOrSoon(c, 10));
            const liveUrl = liveClass ? (liveClass.meet_url || dip.meet_url) : null;
            return { ...dip, liveUrl };
          });
        } else {
          teacherDiplomas = [];
        }
        setDiplomas(teacherDiplomas);
      }

      let teacherClasses = [];
      let doubtsCount = 0;
      let doubtsData = [];

      const teacherIds = [profileData?.id, profileData?.user_id, currentUser?.id].filter(Boolean);
      const teacherProgramIds = teacherDiplomas.map(p => p.id).filter(Boolean);

      let classQuery = supabase
        .from('class_sessions')
        .select('*, diploma_programs(id, title, program_type, description), sessions(modules(diploma_programs(id, title, program_type, description))), subtopics(modules(diploma_programs(id, title, program_type, description)))')
        .order('class_date', { ascending: true });

      const orConditions = [];
      teacherIds.forEach(id => orConditions.push(`teacher_id.eq.${id}`));
      teacherProgramIds.forEach(pid => orConditions.push(`program_id.eq.${pid}`));

      if (orConditions.length > 0) {
        classQuery = classQuery.or(orConditions.join(','));
      }

      let { data: classData, error: classErr } = await classQuery;
      
      if (classErr) {
        // Fallback en caso de incompatibilidad con join de sessions/subtopics
        const fallbackQuery = supabase
          .from('class_sessions')
          .select('*, diploma_programs(id, title, program_type, description)')
          .order('class_date', { ascending: true });
        if (orConditions.length > 0) {
          const { data: fbData } = await fallbackQuery.or(orConditions.join(','));
          classData = fbData;
        } else {
          const { data: fbData } = await fallbackQuery;
          classData = fbData;
        }
      }
      
      if (classData) {
        const seen = new Set();
        teacherClasses = classData.filter(c => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          const prog = c.diploma_programs || c.sessions?.modules?.diploma_programs || c.subtopics?.modules?.diploma_programs;
          if (prog && (prog.is_published === false || prog.status === 'draft' || prog.status === 'disabled')) {
            return false;
          }
          return true;
        });
      }
      setClasses(teacherClasses);

      // Calcular actividades de reforzamiento pendientes de publicar
      let pendingActivitiesList = [];
      const classIds = teacherClasses.map(c => c.id);
      if (classIds.length > 0) {
        const [{ data: acts }, { data: drafts }] = await Promise.all([
          supabase
            .from('class_activities')
            .select('id, class_id, is_published, created_at')
            .in('class_id', classIds),
          supabase
            .from('activity_drafts')
            .select('id, class_id, status, created_at')
            .in('class_id', classIds)
            .neq('status', 'rejected')
        ]);

        const actsByClass = {};
        (acts || []).forEach(a => {
          if (!actsByClass[a.class_id]) actsByClass[a.class_id] = [];
          actsByClass[a.class_id].push(a);
        });

        const draftsByClass = {};
        (drafts || []).forEach(d => {
          if (!draftsByClass[d.class_id]) draftsByClass[d.class_id] = [];
          draftsByClass[d.class_id].push(d);
        });

        const now = new Date();
        pendingActivitiesList = teacherClasses.filter(c => {
          const isPast = new Date(c.class_date) < now;
          if (!isPast) return false;
          const classActs = actsByClass[c.id] || [];
          const classDrafts = draftsByClass[c.id] || [];
          const hasPublished = classActs.some(a => a.is_published) || classDrafts.some(d => d.status === 'approved' || d.status === 'published');
          return !hasPublished;
        }).map(c => ({
          ...c,
          class_activities: actsByClass[c.id] || [],
          activity_drafts: draftsByClass[c.id] || [],
          hasDraft: (draftsByClass[c.id] || []).length > 0
        })).sort((a, b) => new Date(b.class_date) - new Date(a.class_date));
      }

      setPendingClasses(pendingActivitiesList);

      try {
        const { data: qData, error: qErr } = await supabase
          .from('class_doubts')
          .select(`
            *,
            class_sessions (
              id,
              title
            ),
            diploma_programs (
              id,
              title,
              is_published,
              status
            ),
            users_profile:student_id (
              id,
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (qErr) console.error('Error al obtener class_doubts:', qErr);

        doubtsData = (qData || []).filter(d => {
          const prog = d.diploma_programs;
          if (prog && (prog.is_published === false || prog.status === 'draft' || prog.status === 'disabled')) {
            return false;
          }
          return true;
        });
        doubtsCount = doubtsData.filter(d => d.status === 'enviada' || d.status === 'revisada').length;
      } catch (e) {
        console.error('Error querying class_doubts:', e);
        doubtsCount = 0;
        doubtsData = [];
      }
      setQuestions(doubtsData);

      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcomingCount = teacherClasses.filter(c => new Date(c.class_date) >= startOfToday).length || teacherClasses.length;
      const activeProgramsCount = teacherDiplomas.filter(p => p.is_published !== false && p.status !== 'draft' && p.status !== 'disabled').length;

      setCounts({
        doubts: doubtsCount,
        upcomingClasses: upcomingCount,
        pendingActivities: pendingActivitiesList.length,
        activePrograms: activeProgramsCount
      });

      // Fetch admin announcements (Global or for teacher's programs)
      try {
        let adminQuery = supabase
          .from('announcements')
          .select('*, diploma_programs(title)')
          .is('teacher_id', null)
          .in('target_role', ['all', 'teacher'])
          .order('created_at', { ascending: false })
          .limit(5);

        if (teacherProgramIds.length > 0) {
          adminQuery = adminQuery.or(`program_id.is.null,program_id.in.(${teacherProgramIds.join(',')})`);
        } else {
          adminQuery = adminQuery.is('program_id', null);
        }

        const { data: adminData, error: adminErr } = await adminQuery;
        if (!adminErr && adminData) {
          setAdminAnnouncements(adminData);
        }
      } catch (e) {
        console.error('Error fetching admin announcements:', e);
      }
    } catch (err) {
      console.error('Error fetching teacher portal data', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchTeacherData();
  }, [fetchTeacherData]);

  // Suscripción Realtime en TeacherPortal para mantener sincronizado el dashboard
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel('teacher_portal_realtime_' + currentUser.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_activities' }, () => {
        fetchTeacherData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_drafts' }, () => {
        fetchTeacherData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_sessions' }, () => {
        fetchTeacherData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_doubts' }, () => {
        fetchTeacherData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchTeacherData]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const upcomingClassesList = classes.filter(c => new Date(c.class_date) >= startOfToday).sort((a,b) => new Date(a.class_date) - new Date(b.class_date));
  const upcomingClasses = upcomingClassesList.length > 0 ? upcomingClassesList : classes;

  // Próxima clase única (la futura más cercana)
  const nextClass = upcomingClassesList.length > 0 ? upcomingClassesList[0] : (classes.length > 0 ? classes[0] : null);

  let nextClassDay = '';
  let nextClassMonth = '';
  let nextClassTimeStr = '';
  let nextClassProgTitle = '';
  let nextClassModuleName = '';
  let nextClassProgId = '';

  if (nextClass) {
    const d = new Date(nextClass.class_date);
    nextClassDay = d.getDate();
    nextClassMonth = d.toLocaleString('es-ES', { month: 'short' });
    nextClassTimeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    nextClassProgTitle = nextClass.diploma_programs?.title || nextClass.sessions?.modules?.diploma_programs?.title || nextClass.subtopics?.modules?.diploma_programs?.title || 'Programa asignado';
    nextClassModuleName = nextClass.sessions?.modules?.title || nextClass.subtopics?.modules?.title || nextClass.module_name || '';
    nextClassProgId = nextClass.diploma_programs?.id || nextClass.sessions?.modules?.diploma_programs?.id || nextClass.subtopics?.modules?.diploma_programs?.id || nextClass.program_id;
  }

  // Filtrado para la vista "Mis Programas"
  const filteredDiplomas = diplomas.filter(p => {
    if (activeFilter === 'Diplomados') return p.program_type !== 'curso' && p.program_type !== 'taller';
    if (activeFilter === 'Cursos Cortos') return p.program_type === 'curso';
    if (activeFilter === 'Talleres') return p.program_type === 'taller';
    return true;
  });

  // -------------------------------------------------------------------
  // VISTA 2: MIS PROGRAMAS (tab=programas)
  // -------------------------------------------------------------------
  if (activeTab === 'programas') {
    return (
      <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
        <div style={{ marginBottom: '1rem' }}>
          <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Mis Programas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
            Continúa tu formación y revisa tus próximos compromisos.
          </p>
        </div>

        {/* FILTROS POR CATEGORÍA */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {filters.map(filter => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '0.5rem 1.25rem',
                borderRadius: '9999px',
                border: 'none',
                background: activeFilter === filter ? 'var(--navy)' : 'var(--bg-light)',
                color: activeFilter === filter ? 'var(--white)' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* GRILLA DE PROGRAMAS ASIGNADOS */}
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando programas...</p>
        ) : filteredDiplomas.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <BookOpen size={40} style={{ color: 'var(--navy)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
              No tienes programas en esta categoría
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              Cuando tengas un programa asignado, aparecerá aquí.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem' }}>
            {filteredDiplomas.map(program => {
              // Métricas reales para este programa
              const progClasses = classes.filter(c => 
                (c.diploma_programs?.id === program.id) || 
                (c.sessions?.modules?.diploma_programs?.id === program.id) || 
                (c.subtopics?.modules?.diploma_programs?.id === program.id) || 
                (c.program_id === program.id)
              );
              const progClassCount = progClasses.length;
              
              const startOfToday = new Date();
              startOfToday.setHours(0, 0, 0, 0);
              const progUpcomingClass = progClasses.find(c => new Date(c.class_date) >= startOfToday);
              const progNextClassStr = progUpcomingClass 
                ? new Date(progUpcomingClass.class_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) 
                : (progClassCount > 0 ? 'Programadas' : 'Pendiente');

              return (
                <div 
                  key={program.id} 
                  className="card teacher-summary-card" 
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    padding: 0, 
                    overflow: 'hidden', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: 'var(--radius-lg)',
                    background: 'var(--white)',
                    boxShadow: '0 1px 3px rgba(20, 33, 61, 0.05)',
                    transition: 'all 200ms ease-in-out'
                  }}
                >
                  {/* Portada visual superior compacta (110px) */}
                  <div style={{ 
                    height: '110px', 
                    background: program.image_url ? `url(${program.image_url}) center/cover` : 'linear-gradient(135deg, #14213d 0%, #1e2e52 100%)', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    position: 'relative' 
                  }}>
                    {!program.image_url && (
                      <div style={{ textAlign: 'center', color: 'var(--gold)' }}>
                        <BookOpen size={30} />
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, marginTop: '0.2rem', letterSpacing: '0.05em' }}>LIATER UNAL</div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: '1.25rem 1.5rem 1.5rem 1.5rem', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                    {/* Chips de tipo y estado */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ 
                        background: program.program_type === 'curso' ? '#e8f5ee' : 'var(--bg-light)', 
                        color: program.program_type === 'curso' ? 'var(--green-700)' : 'var(--navy)', 
                        padding: '0.25rem 0.65rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.68rem', 
                        fontWeight: 700, 
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {program.program_type === 'curso' ? 'Curso Corto' : (program.program_type === 'taller' ? 'Taller' : 'Diplomado')}
                      </span>
                      {(program.is_published === false || program.status === 'draft' || program.status === 'disabled') ? (
                        <span style={{ 
                          background: '#fee2e2', 
                          color: '#dc2626', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.68rem', 
                          fontWeight: 700,
                          textTransform: 'uppercase' 
                        }}>
                          INHABILITADO
                        </span>
                      ) : (
                        <span style={{ 
                          background: 'rgba(20, 33, 61, 0.05)', 
                          color: 'var(--navy)', 
                          padding: '0.25rem 0.65rem', 
                          borderRadius: '9999px', 
                          fontSize: '0.68rem', 
                          fontWeight: 700 
                        }}>
                          Asignado
                        </span>
                      )}
                    </div>

                    {/* Título del programa (Sin descripción larga) */}
                    <h3 style={{ fontSize: '1.15rem', color: 'var(--navy)', fontWeight: 800, margin: '0 0 1rem 0', lineHeight: 1.3 }}>
                      {program.title}
                    </h3>

                    {/* Métricas docentes compactas */}
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '0.75rem', 
                      background: 'rgba(20, 33, 61, 0.03)', 
                      border: '1px solid rgba(20, 33, 61, 0.06)', 
                      borderRadius: '8px', 
                      padding: '0.75rem 1rem', 
                      marginBottom: '1.25rem',
                      marginTop: 'auto'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Clases asignadas
                        </div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)' }}>
                          {progClassCount}
                        </div>
                      </div>

                      <div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Próxima clase
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'capitalize' }}>
                          {progNextClassStr}
                        </div>
                      </div>
                    </div>

                    {/* ACCESO RÁPIDO A CLASE EN VIVO (Si aplica) */}
                    {program.liveUrl && (
                      <a 
                        href={program.liveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ 
                          textAlign: 'center', 
                          width: '100%', 
                          justifyContent: 'center', 
                          padding: '0.55rem', 
                          fontWeight: 700, 
                          fontSize: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          marginBottom: '0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', animation: 'pulse 1.5s infinite' }} />
                        Clase en Vivo (Hoy)
                      </a>
                    )}

                    {/* Botón de Acción Principal */}
                    <Link 
                      to={getDiplomadoLink(program.id)} 
                      className="btn" 
                      style={{ 
                        background: 'var(--navy)', 
                        color: 'white', 
                        border: 'none', 
                        textAlign: 'center', 
                        width: '100%', 
                        padding: '0.65rem', 
                        fontWeight: 700, 
                        fontSize: '0.9rem',
                        borderRadius: '8px',
                        display: 'block',
                        textDecoration: 'none'
                      }}
                    >
                      Entrar al programa
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // VISTA 3: AGENDA PRO (tab=agenda)
  // -------------------------------------------------------------------
  if (activeTab === 'agenda') {
    // Helper para generar enlace a Google Calendar
    const getGoogleCalendarUrl = (cls, progTitle) => {
      if (!cls || !cls.class_date) return '#';
      try {
        const start = new Date(cls.class_date);
        const durationMin = cls.duration || 120;
        const end = new Date(start.getTime() + durationMin * 60000);
        const formatCalDate = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
        const dates = `${formatCalDate(start)}/${formatCalDate(end)}`;
        const title = encodeURIComponent(`${cls.title} | ${progTitle}`);
        const details = encodeURIComponent(`Sesión de clase en vivo LIATER.\n\nPrograma: ${progTitle}\nClase: ${cls.title}\nPlataforma: Aula Virtual LIATER\nEnlace: ${cls.meet_url || 'Disponible en el portal'}`);
        const location = encodeURIComponent(cls.meet_url || 'Aula Virtual LIATER');
        return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
      } catch {
        return '#';
      }
    };

    // Clasificación temporal
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);

    const isClassToday = (clsDate) => {
      const d = new Date(clsDate);
      return d >= startOfToday && d < endOfToday;
    };

    const isClassThisWeek = (clsDate) => {
      const d = new Date(clsDate);
      return d >= endOfToday && d <= endOfWeek;
    };

    const isClassFuture = (clsDate) => {
      const d = new Date(clsDate);
      return d > endOfWeek;
    };

    // 1. Filtrar por programa si aplica
    const filteredAgendaClasses = upcomingClassesList.filter(c => {
      if (agendaProgramFilter === 'todos') return true;
      const pId = c.diploma_programs?.id || c.sessions?.modules?.diploma_programs?.id || c.subtopics?.modules?.diploma_programs?.id || c.program_id;
      return String(pId) === String(agendaProgramFilter);
    });

    // 2. Sub-listas temporales
    const todayClassesList = filteredAgendaClasses.filter(c => isClassToday(c.class_date));
    const thisWeekClassesList = filteredAgendaClasses.filter(c => isClassThisWeek(c.class_date));
    const futureClassesList = filteredAgendaClasses.filter(c => isClassFuture(c.class_date));

    // 3. Renderizador de tarjeta de clase
    const renderClassCard = (cls) => {
      const d = new Date(cls.class_date);
      const day = d.getDate();
      const month = d.toLocaleString('es-ES', { month: 'short' });
      const weekday = d.toLocaleString('es-ES', { weekday: 'short' });
      const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const progTitle = cls.diploma_programs?.title || cls.sessions?.modules?.diploma_programs?.title || cls.subtopics?.modules?.diploma_programs?.title || 'Programa asignado';
      const progId = cls.diploma_programs?.id || cls.sessions?.modules?.diploma_programs?.id || cls.subtopics?.modules?.diploma_programs?.id || cls.program_id;

      const isToday = isClassToday(cls.class_date);
      const isLiveOrSoon = isClassLiveOrSoon(cls, 10);
      
      // Consultas de estudiantes asignadas a esta clase
      const classDoubts = questions.filter(q => (q.class_id === cls.id || q.class_sessions?.id === cls.id) && (q.status === 'enviada' || q.status === 'revisada'));

      return (
        <div 
          key={cls.id} 
          className="card" 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            padding: '1.25rem 1.5rem', 
            background: isToday ? 'linear-gradient(to right, rgba(252, 163, 17, 0.04), #ffffff)' : 'white', 
            borderRadius: 'var(--radius-lg)', 
            border: isToday ? '1px solid rgba(252, 163, 17, 0.4)' : '1px solid var(--border-color)', 
            boxShadow: isToday ? '0 4px 16px rgba(252, 163, 17, 0.08)' : '0 2px 4px rgba(20, 33, 61, 0.02)',
            gap: '1.25rem', 
            flexWrap: 'wrap',
            transition: 'all 0.2s ease'
          }}
        >
          {/* Bloque de Fecha */}
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '12px', 
            background: isToday ? 'var(--navy)' : 'rgba(20, 33, 61, 0.06)', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            flexShrink: 0, 
            border: isToday ? '2px solid var(--gold)' : '1px solid rgba(20, 33, 61, 0.1)',
            boxShadow: isToday ? '0 4px 10px rgba(20,33,61,0.2)' : 'none'
          }}>
            <span style={{ 
              fontSize: '0.68rem', 
              color: isToday ? 'var(--gold)' : 'var(--gold-dark)', 
              fontWeight: 800, 
              textTransform: 'uppercase',
              lineHeight: 1
            }}>
              {weekday}. {month}
            </span>
            <span style={{ 
              fontSize: '1.45rem', 
              color: isToday ? 'var(--white)' : 'var(--navy)', 
              fontWeight: 800, 
              lineHeight: 1.1,
              marginTop: '3px'
            }}>
              {day}
            </span>
          </div>

          {/* Info Principal */}
          <div style={{ flex: '1 1 280px', minWidth: '240px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--gold-dark)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {progTitle}
              </span>
              {isToday && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  background: '#FCA311', 
                  color: '#14213D', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  letterSpacing: '0.4px'
                }}>
                  ¡HOY!
                </span>
              )}
              {isLiveOrSoon && (
                <span style={{ 
                  fontSize: '0.7rem', 
                  fontWeight: 800, 
                  background: '#22c55e', 
                  color: '#ffffff', 
                  padding: '2px 8px', 
                  borderRadius: '9999px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                  EN VIVO AHORA
                </span>
              )}
            </div>

            <h3 style={{ margin: '0 0 0.4rem 0', color: 'var(--navy)', fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3 }}>
              {cls.title}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--navy)', fontWeight: 600 }}>
                <Clock size={14} style={{ color: 'var(--gold-dark)' }} /> {timeStr} hrs
              </span>
              <span>•</span>
              <span>⏱️ Duración: {cls.duration || 120} min</span>

              {classDoubts.length > 0 && (
                <>
                  <span>•</span>
                  <Link
                    to={`${getDiplomadoLink(progId)}?tab=dudas`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      color: '#2563eb',
                      background: 'rgba(59, 130, 246, 0.08)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700,
                      textDecoration: 'none'
                    }}
                  >
                    <MessageSquare size={13} />
                    {classDoubts.length} {classDoubts.length === 1 ? 'consulta' : 'consultas'}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Botones de Acción */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end', marginLeft: 'auto' }}>
            {/* Botón EN VIVO condicional (10 min o en vivo) */}
            {isLiveOrSoon && cls.meet_url && (
              <a
                href={cls.meet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary"
                style={{
                  background: 'linear-gradient(135deg, #FCA311 0%, #D48B0C 100%)',
                  color: '#14213D',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.15rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 4px 12px rgba(252, 163, 17, 0.35)',
                  textDecoration: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                <Video size={16} />
                Entrar a la Clase en Vivo
              </a>
            )}

            {/* Botón Gestionar Clase */}
            <Link
              to={`${getDiplomadoLink(progId)}?tab=clases&classId=${cls.id}`}
              className="btn btn-outline"
              style={{
                fontSize: '0.85rem',
                padding: '0.6rem 1.1rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                borderColor: 'var(--navy)',
                color: 'var(--navy)',
                background: 'white'
              }}
            >
              <Settings size={15} />
              Gestionar clase
            </Link>

            {/* Botón Agendar a Google Calendar */}
            <a
              href={getGoogleCalendarUrl(cls, progTitle)}
              target="_blank"
              rel="noopener noreferrer"
              title="Añadir a Google Calendar"
              className="btn btn-ghost"
              style={{
                fontSize: '0.82rem',
                padding: '0.6rem 0.85rem',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--white)',
                textDecoration: 'none'
              }}
            >
              <CalendarPlus size={15} style={{ color: 'var(--gold-dark)' }} />
              <span>Agendar</span>
            </a>

            {/* Enlace al programa */}
            <Link
              to={getDiplomadoLink(progId)}
              title="Ver resumen del programa"
              style={{
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                textDecoration: 'none',
                padding: '0.4rem 0.6rem'
              }}
            >
              <span>Programa</span>
              <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      );
    };

    return (
      <div style={{ animation: 'fadeSlideUp 0.35s ease-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Cabecera Principal */}
        <div>
          <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Agenda de Clases
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
            Revisa tus próximas sesiones en vivo, gestiona tus clases y prepara tus materiales de enseñanza.
          </p>
        </div>

        {/* 1. BARRA DE MÉTRICAS RÁPIDAS (KPIs) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Métrica 1: Total Clases */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--navy)', flexShrink: 0 }}>
              <CalendarDays size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Total Clases</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>
                {upcomingClassesList.length}
              </div>
            </div>
          </div>

          {/* Métrica 2: Próxima Sesión */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(252, 163, 17, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-dark)', flexShrink: 0 }}>
              <Clock size={22} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Próxima Sesión</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--navy)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {nextClass ? (
                  (() => {
                    const d = new Date(nextClass.class_date);
                    const time = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
                    if (isClassToday(nextClass.class_date)) return `Hoy a las ${time} hrs`;
                    const tom = new Date(startOfToday.getTime() + 86400000);
                    const endTom = new Date(startOfToday.getTime() + 86400000 * 2);
                    if (d >= tom && d < endTom) return `Mañana a las ${time} hrs`;
                    return `${d.getDate()} ${d.toLocaleString('es-ES', { month: 'short' })} • ${time} hrs`;
                  })()
                ) : 'Sin clases'}
              </div>
            </div>
          </div>

          {/* Métrica 3: Horas Programadas */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a', flexShrink: 0 }}>
              <Video size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tiempo en Vivo</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>
                {Math.round(upcomingClassesList.reduce((acc, c) => acc + (c.duration || 120), 0) / 60)} hrs
              </div>
            </div>
          </div>

          {/* Métrica 4: Consultas de Alumnos */}
          <div className="card" style={{ padding: '1.1rem 1.25rem', background: 'white', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb', flexShrink: 0 }}>
              <MessageSquare size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>Dudas de Alumnos</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.1 }}>
                {counts.doubts}
              </div>
            </div>
          </div>
        </div>

        {/* 2. BARRA DE FILTROS (TABS TEMPORALES Y SELECTOR DE PROGRAMA) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', background: 'white', padding: '0.85rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          {/* Tabs temporales */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'todos', label: 'Todas', count: filteredAgendaClasses.length },
              { id: 'hoy', label: 'Hoy', count: todayClassesList.length },
              { id: 'semana', label: 'Esta semana', count: thisWeekClassesList.length },
              { id: 'proximas', label: 'Próximas semanas', count: futureClassesList.length }
            ].map(f => {
              const active = agendaTimeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setAgendaTimeFilter(f.id)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    padding: '0.45rem 0.9rem',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    fontWeight: active ? 700 : 500,
                    border: active ? 'none' : '1px solid var(--border-color)',
                    background: active ? 'var(--navy)' : 'var(--white)',
                    color: active ? 'var(--white)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: active ? '0 2px 6px rgba(20,33,61,0.15)' : 'none'
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    padding: '1px 6px',
                    borderRadius: '9999px',
                    background: active ? 'rgba(252, 163, 17, 0.25)' : 'rgba(20, 33, 61, 0.06)',
                    color: active ? 'var(--gold)' : 'var(--text-muted)'
                  }}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Filtro por Programa */}
          {diplomas.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Filter size={15} style={{ color: 'var(--text-muted)' }} />
              <select
                value={agendaProgramFilter}
                onChange={e => setAgendaProgramFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: 'var(--navy)',
                  background: 'var(--white)',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="todos">Todos los programas ({diplomas.length})</option>
                {diplomas.map(dip => (
                  <option key={dip.id} value={dip.id}>{dip.title}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3. LISTADO DE CLASES CON AGRUPACIÓN TEMPORAL */}
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando agenda de clases...</p>
        ) : filteredAgendaClasses.length === 0 ? (
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px' }}>
            <CalendarClock size={40} style={{ color: 'var(--navy)', opacity: 0.4, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
              No tienes clases en este filtro
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
              {agendaProgramFilter !== 'todos' ? 'No hay clases programadas para el programa seleccionado.' : 'Las clases en vivo que te sean asignadas aparecerán aquí ordenadas por fecha.'}
            </p>
          </div>
        ) : agendaTimeFilter === 'todos' ? (
          // VISTA COMPLETA CON AGRUPACIÓN TEMPORAL INTELIGENTE
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* SECCIÓN 1: SESIONES DE HOY */}
            {todayClassesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '2px solid rgba(252, 163, 17, 0.3)', paddingBottom: '0.5rem' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FCA311', display: 'inline-block', boxShadow: '0 0 8px #FCA311' }} />
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Clases de Hoy ({todayClassesList.length})
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {todayClassesList.map(cls => renderClassCard(cls))}
                </div>
              </div>
            )}

            {/* SECCIÓN 2: ESTA SEMANA */}
            {thisWeekClassesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Esta Semana ({thisWeekClassesList.length})
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {thisWeekClassesList.map(cls => renderClassCard(cls))}
                </div>
              </div>
            )}

            {/* SECCIÓN 3: PRÓXIMAS SEMANAS */}
            {futureClassesList.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Próximas Semanas ({futureClassesList.length})
                  </h2>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {futureClassesList.map(cls => renderClassCard(cls))}
                </div>
              </div>
            )}
          </div>
        ) : (() => {
          const currentFilteredList = agendaTimeFilter === 'hoy' ? todayClassesList : agendaTimeFilter === 'semana' ? thisWeekClassesList : futureClassesList;
          return (
            // VISTA FILTRADA (HOY / ESTA SEMANA / PRÓXIMAS)
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {currentFilteredList.length === 0 ? (
                <div className="card" style={{ padding: '3rem 2rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px' }}>
                  <CalendarClock size={36} style={{ color: 'var(--navy)', opacity: 0.4, marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.25rem' }}>
                    No hay clases en esta categoría
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                    Prueba seleccionando otra pestaña de tiempo o el filtro general "Todas".
                  </p>
                </div>
              ) : (
                currentFilteredList.map(cls => renderClassCard(cls))
              )}
            </div>
          );
        })()}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // VISTA 4: BANDEJA DE CONSULTAS (tab=consultas)
  // -------------------------------------------------------------------
  if (activeTab === 'consultas') {
    // 1. Filtrar solo dudas PENDIENTES ('enviada' o 'revisada') (Requisito 1)
    const pendingQuestions = questions.filter(q => q.status === 'enviada' || q.status === 'revisada');

    // 2. Contadores (Requisito 2)
    const countTotalPending = pendingQuestions.length;
    const countNew = pendingQuestions.filter(q => q.status === 'enviada').length;
    const countRevised = pendingQuestions.filter(q => q.status === 'revisada').length;

    // 3. Aplicar sub-filtro de los 3 indicadores ('pendientes', 'enviadas', 'revisadas')
    let displayQuestions = pendingQuestions.filter(q => {
      if (doubtStatusFilter === 'enviada') return q.status === 'enviada';
      if (doubtStatusFilter === 'revisada') return q.status === 'revisada';
      return true;
    });

    // 4. Ordenar: Primero dudas nuevas ('enviada'), luego revisadas ('revisada') (Requisito 7)
    displayQuestions.sort((a, b) => {
      if (a.status === 'enviada' && b.status !== 'enviada') return -1;
      if (a.status !== 'enviada' && b.status === 'enviada') return 1;
      
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return dateB - dateA;
    });

    return (
      <div style={{ animation: 'fadeSlideUp 0.35s ease-out', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            Bandeja de consultas
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
            Revisa las dudas pendientes enviadas por los estudiantes y prepáralas para ser atendidas en sus clases correspondientes.
          </p>
        </div>

        {/* 3 INDICADORES COMPACTOS (Requisito 2) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
          
          {/* INDICADOR 1: PENDIENTES */}
          <div
            onClick={() => setDoubtStatusFilter('pendientes')}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'var(--navy)' : 'var(--white)',
              color: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'var(--white)' : 'var(--navy)',
              border: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'none' : '1px solid var(--border-color)',
              boxShadow: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'inset 0 -3px 0 var(--gold)' : '0 1px 2px rgba(20, 33, 61, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Pendientes</span>
            <span style={{ 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'var(--gold)' : 'var(--navy)',
              background: (doubtStatusFilter === 'pendientes' || doubtStatusFilter === 'todos') ? 'rgba(255,255,255,0.12)' : 'rgba(20,33,61,0.06)',
              padding: '2px 9px',
              borderRadius: '9999px'
            }}>
              {countTotalPending}
            </span>
          </div>

          {/* INDICADOR 2: NUEVAS */}
          <div
            onClick={() => setDoubtStatusFilter('enviada')}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: doubtStatusFilter === 'enviada' ? 'var(--navy)' : 'var(--white)',
              color: doubtStatusFilter === 'enviada' ? 'var(--white)' : 'var(--navy)',
              border: doubtStatusFilter === 'enviada' ? 'none' : '1px solid var(--border-color)',
              boxShadow: doubtStatusFilter === 'enviada' ? 'inset 0 -3px 0 var(--gold)' : '0 1px 2px rgba(20, 33, 61, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Nuevas</span>
            <span style={{ 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: doubtStatusFilter === 'enviada' ? 'var(--gold)' : 'var(--navy)',
              background: doubtStatusFilter === 'enviada' ? 'rgba(255,255,255,0.12)' : 'rgba(20,33,61,0.06)',
              padding: '2px 9px',
              borderRadius: '9999px'
            }}>
              {countNew}
            </span>
          </div>

          {/* INDICADOR 3: REVISADAS */}
          <div
            onClick={() => setDoubtStatusFilter('revisada')}
            style={{
              padding: '0.65rem 1rem',
              borderRadius: '8px',
              cursor: 'pointer',
              background: doubtStatusFilter === 'revisada' ? 'var(--navy)' : 'var(--white)',
              color: doubtStatusFilter === 'revisada' ? 'var(--white)' : 'var(--navy)',
              border: doubtStatusFilter === 'revisada' ? 'none' : '1px solid var(--border-color)',
              boxShadow: doubtStatusFilter === 'revisada' ? 'inset 0 -3px 0 var(--gold)' : '0 1px 2px rgba(20, 33, 61, 0.03)',
              display: 'flex',
              alignItems: 'center',
              justify: 'space-between',
              transition: 'all 0.2s ease'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Revisadas</span>
            <span style={{ 
              fontSize: '1.1rem', 
              fontWeight: 800, 
              color: doubtStatusFilter === 'revisada' ? 'var(--gold)' : 'var(--navy)',
              background: doubtStatusFilter === 'revisada' ? 'rgba(255,255,255,0.12)' : 'rgba(20,33,61,0.06)',
              padding: '2px 9px',
              borderRadius: '9999px'
            }}>
              {countRevised}
            </span>
          </div>

        </div>

        {/* LISTADO DE DUDAS O ESTADO VACÍO */}
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando consultas pendientes...</p>
        ) : displayQuestions.length === 0 ? (
          /* ESTADO VACÍO (Requisito 8) */
          <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.05)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
              <MessageSquareText size={32} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>
              No hay dudas pendientes
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '520px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
              Las nuevas dudas enviadas por los estudiantes aparecerán aquí, organizadas por programa y clase.
            </p>
            <Link 
              to="/portal?tab=programas" 
              className="btn" 
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.5rem', 
                background: 'var(--navy)', 
                color: 'var(--white)', 
                padding: '0.65rem 1.25rem', 
                borderRadius: '8px', 
                fontSize: '0.88rem', 
                fontWeight: 700, 
                textDecoration: 'none' 
              }}
            >
              Ver mis programas
            </Link>
          </div>
        ) : (
          /* FILAS DE DUDAS PENDIENTES (Requisitos 3, 4, 5, 6, 9) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {displayQuestions.map(q => {
              const isNueva = q.status === 'enviada';
              const progId = q.program_id || q.diploma_programs?.id;
              const programLink = getDiplomadoLink ? `${getDiplomadoLink(progId)}?tab=dudas&doubtId=${q.id}` : `/dashboard/profesor/${progId}?tab=dudas&doubtId=${q.id}`;

              return (
                <div 
                  key={q.id} 
                  className="card teacher-summary-card" 
                  style={{ 
                    padding: '1.35rem 1.5rem', 
                    background: 'var(--white)', 
                    borderRadius: 'var(--radius-lg)', 
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 1px 3px rgba(20, 33, 61, 0.04)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem'
                  }}
                >
                  {/* PRIMERO: ESTADO Y TÍTULO (Requisitos 3, 4) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span 
                        style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 800, 
                          padding: '3px 10px', 
                          borderRadius: '9999px', 
                          background: isNueva ? 'rgba(252, 163, 17, 0.12)' : '#e0f2fe', 
                          color: isNueva ? '#b45309' : 'var(--navy)', 
                          border: isNueva ? '1px solid #fde68a' : '1px solid #bae6fd', 
                          whiteSpace: 'nowrap' 
                        }}
                      >
                        {isNueva ? 'Nueva' : 'Revisada'}
                      </span>
                      <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--navy)', fontSize: '1.05rem', lineHeight: 1.3 }}>
                        {q.subject || 'Consulta de estudiante'}
                      </h3>
                    </div>
                  </div>

                  {/* DESPUÉS: FRAGMENTO DE LA DUDA (MÁX 2 LÍNEAS) (Requisito 4) */}
                  <p 
                    style={{ 
                      color: 'var(--text-secondary)', 
                      fontSize: '0.9rem', 
                      margin: 0, 
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {q.description}
                  </p>

                  {/* FINALMENTE: CONTEXTO (CLASE PROTAGONISTA, PROGRAMA, ESTUDIANTE, FECHA) Y BOTÓN (Requisitos 4, 5, 6) */}
                  <div 
                    style={{ 
                      display: 'flex', 
                      justify: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '0.75rem', 
                      paddingTop: '0.75rem', 
                      borderTop: '1px solid var(--border-color)', 
                      fontSize: '0.82rem', 
                      color: 'var(--text-muted)' 
                    }}
                  >
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* CLASE CON MAYOR PROTAGONISMO */}
                      <span style={{ fontWeight: 800, color: 'var(--navy)', fontSize: '0.88rem' }}>
                        {q.class_sessions?.title || 'Clase asignada'}
                      </span>
                      <span>•</span>
                      {/* PROGRAMA */}
                      <span style={{ color: 'var(--gold-dark)', fontWeight: 600 }}>
                        {q.diploma_programs?.title || 'Programa'}
                      </span>
                      <span>•</span>
                      {/* ESTUDIANTE */}
                      <span>
                        Estudiante: <strong style={{ color: 'var(--navy)' }}>{q.users_profile?.full_name || 'Estudiante'}</strong>
                      </span>
                      {/* FECHA */}
                      {q.created_at && (
                        <>
                          <span>•</span>
                          <span>
                            {new Date(q.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </>
                      )}
                    </div>

                    {/* BOTÓN PRINCIPAL "VER EN EL PROGRAMA" */}
                    <Link
                      to={programLink}
                      className="btn"
                      style={{
                        background: 'var(--white)',
                        border: '1px solid var(--navy)',
                        color: 'var(--navy)',
                        fontWeight: 700,
                        fontSize: '0.82rem',
                        padding: '0.45rem 0.95rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = 'var(--navy)';
                        e.currentTarget.style.color = 'var(--white)';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'var(--white)';
                        e.currentTarget.style.color = 'var(--navy)';
                      }}
                    >
                      <ArrowRight size={14} />
                      Ver en el programa
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------------
  // VISTA 1: INICIO DOCENTE (default / tab=inicio)
  // -------------------------------------------------------------------
  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      
      {/* BLOQUE SUPERIOR DE INICIO DOCENTE */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          Inicio docente
        </h1>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', fontWeight: 600, margin: '0.4rem 0 0 0', textTransform: 'capitalize' }}>
          Hola, {teacherName ? teacherName.toLowerCase() : 'Profesor'}
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
          Consulta lo más importante de tus programas y prepara tus próximas clases.
        </p>
      </div>

      {/* CUATRO TARJETAS DE RESUMEN OPERATIVO */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2.5rem'
      }}>
        {/* TARJETA 1: DUDAS POR REVISAR */}
        <Link
          to="/portal?tab=consultas"
          className="teacher-summary-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            background: 'var(--white, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderTop: '3px solid var(--gold, #fca311)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(20, 33, 61, 0.05)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 200ms ease-in-out',
            minHeight: '160px',
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Dudas por revisar
              </span>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(20, 33, 61, 0.04)', color: 'var(--navy, #14213d)' }}>
                <MessageSquareText size={22} />
              </div>
            </div>
            {loading ? (
              <div style={{ width: '48px', height: '36px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy, #14213d)', lineHeight: 1.1 }}>
                {counts.doubts}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold-dark, #d4a017)' }}>
            <span>Revisar dudas</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* TARJETA 2: CLASES PRÓXIMAS */}
        <Link
          to="/portal?tab=agenda"
          className="teacher-summary-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            background: 'var(--white, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderTop: '3px solid var(--gold, #fca311)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(20, 33, 61, 0.05)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 200ms ease-in-out',
            minHeight: '160px',
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Clases próximas
              </span>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(20, 33, 61, 0.04)', color: 'var(--navy, #14213d)' }}>
                <CalendarClock size={22} />
              </div>
            </div>
            {loading ? (
              <div style={{ width: '48px', height: '36px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy, #14213d)', lineHeight: 1.1 }}>
                {counts.upcomingClasses}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold-dark, #d4a017)' }}>
            <span>Ver agenda</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* TARJETA 3: PROGRAMAS ACTIVOS */}
        <Link
          to="/portal?tab=programas"
          className="teacher-summary-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            background: 'var(--white, #ffffff)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderTop: '3px solid var(--gold, #fca311)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            padding: '1.5rem',
            boxShadow: '0 1px 3px rgba(20, 33, 61, 0.05)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 200ms ease-in-out',
            minHeight: '160px',
            cursor: 'pointer'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Programas activos
              </span>
              <div style={{ padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(20, 33, 61, 0.04)', color: 'var(--navy, #14213d)' }}>
                <BookOpen size={22} />
              </div>
            </div>
            {loading ? (
              <div style={{ width: '48px', height: '36px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--navy, #14213d)', lineHeight: 1.1 }}>
                {counts.activePrograms}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--gold-dark, #d4a017)' }}>
            <span>Ver programas</span>
            <ChevronRight size={16} />
          </div>
        </Link>

        {/* TARJETA 4: ACTIVIDADES POR PUBLICAR */}
        <Link
          to="/portal?tab=mis-clases&filter=pending"
          className="teacher-summary-card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justify: 'space-between',
            background: counts.pendingActivities > 0 ? '#fffdf7' : 'var(--white, #ffffff)',
            border: counts.pendingActivities > 0 ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid var(--border-color, #e2e8f0)',
            borderTop: counts.pendingActivities > 0 ? '3px solid #f59e0b' : '3px solid var(--gold, #fca311)',
            borderRadius: 'var(--radius-lg, 0.75rem)',
            padding: '1.5rem',
            boxShadow: counts.pendingActivities > 0 ? '0 2px 8px rgba(245, 158, 11, 0.12)' : '0 1px 3px rgba(20, 33, 61, 0.05)',
            textDecoration: 'none',
            color: 'inherit',
            transition: 'all 200ms ease-in-out',
            minHeight: '160px',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: counts.pendingActivities > 0 ? '#b45309' : 'var(--text-muted, #64748b)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Reforzamiento IA
              </span>
              <div style={{ 
                padding: '0.5rem', 
                borderRadius: '0.5rem', 
                background: counts.pendingActivities > 0 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(20, 33, 61, 0.04)', 
                color: counts.pendingActivities > 0 ? '#d97706' : 'var(--navy, #14213d)' 
              }}>
                <Sparkles size={22} />
              </div>
            </div>
            {loading ? (
              <div style={{ width: '48px', height: '36px', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
                <div style={{ fontSize: '2.25rem', fontWeight: 800, color: counts.pendingActivities > 0 ? '#b45309' : 'var(--navy, #14213d)', lineHeight: 1.1 }}>
                  {counts.pendingActivities}
                </div>
                {counts.pendingActivities > 0 && (
                  <span style={{ 
                    fontSize: '0.72rem', 
                    fontWeight: 700, 
                    padding: '0.2rem 0.55rem', 
                    borderRadius: '9999px', 
                    background: '#fef3c7', 
                    color: '#92400e',
                    border: '1px solid #fde68a'
                  }}>
                    Por publicar
                  </span>
                )}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: counts.pendingActivities > 0 ? '#d97706' : 'var(--gold-dark, #d4a017)' }}>
            <span>Gestionar clases</span>
            <ChevronRight size={16} />
          </div>
        </Link>
      </div>

      {/* AVISOS INSTITUCIONALES PARA PROFESORES */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <Megaphone size={18} color="var(--navy)" />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)' }}>Avisos de Administración</h3>
        </div>
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando avisos...</div>
        ) : adminAnnouncements.length === 0 ? (
          <div className="card" style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay comunicados recientes.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {adminAnnouncements.map(ann => {
              const isUrgent = ann.tag === 'urgent' || ann.tag === 'urgente';
              return (
                <div key={ann.id} className="card" style={{ padding: '1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: '#f8fafc', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', background: isUrgent ? '#dc2626' : 'var(--gold)' }}></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', paddingLeft: '0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: isUrgent ? '#fee2e2' : '#f1f5f9', color: isUrgent ? '#991b1b' : '#475569' }}>
                          {ann.program_id ? ann.diploma_programs?.title : 'Institucional'}
                        </span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {new Date(ann.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>{ann.title}</h4>
                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{ann.body}</p>
                    </div>
                    {ann.program_id && (
                      <Link to={`/dashboard/profesor/${ann.program_id}?tab=anuncios`} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                        Ver en curso
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* CLASE MÁS PRÓXIMA (DESTACADA) */}
      <div style={{ marginTop: '0.5rem' }}>
        <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', fontWeight: 800, marginBottom: '1rem' }}>
          Próxima clase
        </h2>

        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando próxima clase...</p>
        ) : !nextClass ? (
          /* ESTADO SIN CLASES */
          <div className="card" style={{ 
            background: 'var(--white)', 
            border: '1px solid var(--border-color)', 
            borderLeft: '4px solid var(--gold)',
            borderRadius: 'var(--radius-lg)', 
            padding: '2.5rem 2rem', 
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(20, 33, 61, 0.05)'
          }}>
            <CalendarDays size={38} style={{ color: 'var(--navy)', opacity: 0.4, marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
              No tienes clases próximas
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0 0 1.25rem 0' }}>
              Cuando el administrador te asigne una nueva clase, aparecerá aquí.
            </p>
            <Link 
              to="/portal?tab=programas" 
              className="btn" 
              style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '0.55rem 1.25rem', fontWeight: 600, fontSize: '0.88rem', borderRadius: '8px', textDecoration: 'none' }}
            >
              Ver mis programas
            </Link>
          </div>
        ) : (() => {
          const nextIsLiveOrSoon = isClassLiveOrSoon(nextClass, 10);
          const nextDate = new Date(nextClass.class_date);
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          const endOfToday = new Date();
          endOfToday.setHours(23, 59, 59, 999);
          const nextIsToday = nextDate >= startOfToday && nextDate <= endOfToday;

          return (
            /* TARJETA DE PRÓXIMA CLASE */
            <div 
              className="teacher-summary-card" 
              style={{ 
                background: nextIsToday ? 'linear-gradient(to right, rgba(252, 163, 17, 0.04), #ffffff)' : 'var(--white)', 
                border: nextIsToday ? '1px solid rgba(252, 163, 17, 0.4)' : '1px solid var(--border-color)', 
                borderTop: '3px solid var(--gold)', 
                borderRadius: 'var(--radius-lg)', 
                padding: '1.5rem', 
                boxShadow: nextIsToday ? '0 4px 16px rgba(252, 163, 17, 0.08)' : '0 1px 3px rgba(20, 33, 61, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1.5rem',
                flexWrap: 'wrap',
                transition: 'all 200ms ease-in-out'
              }}
            >
              {/* BLOQUE DE FECHA A LA IZQUIERDA */}
              <div style={{ 
                width: '64px', 
                height: '64px', 
                borderRadius: '10px', 
                background: nextIsToday ? 'var(--navy)' : 'rgba(20, 33, 61, 0.04)', 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexShrink: 0, 
                border: nextIsToday ? '2px solid var(--gold)' : '1px solid rgba(20, 33, 61, 0.08)',
                boxShadow: nextIsToday ? '0 4px 10px rgba(20,33,61,0.2)' : 'none'
              }}>
                <span style={{ 
                  fontSize: '0.72rem', 
                  color: nextIsToday ? 'var(--gold)' : 'var(--gold-dark, #d4a017)', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em' 
                }}>
                  {nextClassMonth}
                </span>
                <span style={{ 
                  fontSize: '1.5rem', 
                  color: nextIsToday ? 'var(--white)' : 'var(--navy)', 
                  fontWeight: 800, 
                  lineHeight: 1,
                  marginTop: '2px'
                }}>
                  {nextClassDay}
                </span>
              </div>

              {/* INFORMACIÓN DE LA CLASE EN EL CENTRO */}
              <div style={{ flex: '1 1 280px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: 'var(--gold-dark, #d4a017)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {nextClassProgTitle}
                  </span>
                  {nextIsToday && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      background: '#FCA311', 
                      color: '#14213D', 
                      padding: '2px 8px', 
                      borderRadius: '9999px',
                      letterSpacing: '0.4px'
                    }}>
                      ¡HOY!
                    </span>
                  )}
                  {nextIsLiveOrSoon && (
                    <span style={{ 
                      fontSize: '0.7rem', 
                      fontWeight: 800, 
                      background: '#22c55e', 
                      color: '#ffffff', 
                      padding: '2px 8px', 
                      borderRadius: '9999px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />
                      EN VIVO AHORA
                    </span>
                  )}
                  {nextClassModuleName && (
                    <>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                        {nextClassModuleName}
                      </span>
                    </>
                  )}
                </div>

                <h3 style={{ margin: '0 0 0.35rem 0', color: 'var(--navy)', fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.3 }}>
                  {nextClass.title}
                </h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem', flexWrap: 'wrap' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: 'var(--navy)', fontWeight: 600 }}>
                    <Clock size={14} style={{ color: 'var(--gold-dark)' }} /> {nextClassTimeStr} hrs
                  </span>
                  {nextClass.duration && (
                    <>
                      <span>•</span>
                      <span>⏱️ {nextClass.duration} min</span>
                    </>
                  )}
                </div>
              </div>

              {/* ACCIONES A LA DERECHA */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexShrink: 0, flexWrap: 'wrap' }}>
                {/* Botón condicional EN VIVO (10 min) */}
                {nextIsLiveOrSoon && nextClass.meet_url && (
                  <a
                    href={nextClass.meet_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-primary"
                    style={{
                      background: 'linear-gradient(135deg, #FCA311 0%, #D48B0C 100%)',
                      color: '#14213D',
                      fontWeight: 800,
                      fontSize: '0.88rem',
                      padding: '0.65rem 1.25rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.45rem',
                      boxShadow: '0 4px 12px rgba(252, 163, 17, 0.35)',
                      textDecoration: 'none',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Video size={16} />
                    Entrar a la Clase en Vivo
                  </a>
                )}

                {/* Botón Preparar clase directo a la sesión */}
                <Link 
                  to={`${getDiplomadoLink(nextClassProgId)}?tab=clases&classId=${nextClass.id}`} 
                  className="btn" 
                  style={{ 
                    background: 'var(--navy)', 
                    color: 'var(--white)', 
                    border: 'none', 
                    padding: '0.65rem 1.25rem', 
                    fontWeight: 700, 
                    fontSize: '0.88rem', 
                    borderRadius: '8px', 
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <Settings size={15} />
                  Preparar clase
                </Link>

                <Link 
                  to="/portal?tab=agenda" 
                  style={{ 
                    color: 'var(--gold-dark, #d4a017)', 
                    fontSize: '0.88rem', 
                    fontWeight: 700, 
                    textDecoration: 'none', 
                    whiteSpace: 'nowrap',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  Ver agenda →
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* SECCIÓN: ACTIVIDADES DE REFORZAMIENTO PENDIENTES DE PUBLICAR */}
      {pendingClasses.length > 0 && (
        <div style={{ marginTop: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: 'rgba(245, 158, 11, 0.15)', 
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={18} />
              </div>
              <h2 style={{ color: 'var(--navy)', fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                Actividades de reforzamiento por publicar ({pendingClasses.length})
              </h2>
            </div>
            <Link 
              to="/portal?tab=mis-clases&filter=pending"
              style={{
                color: 'var(--gold-dark, #d4a017)',
                fontSize: '0.88rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              Ver todas las pendientes →
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {pendingClasses.slice(0, 3).map((pClass) => {
              const d = new Date(pClass.class_date);
              const day = d.getDate();
              const month = d.toLocaleString('es-ES', { month: 'short' });
              const timeStr = d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
              const progTitle = pClass.diploma_programs?.title || pClass.sessions?.modules?.diploma_programs?.title || pClass.subtopics?.modules?.diploma_programs?.title || 'Programa asignado';

              return (
                <div
                  key={pClass.id}
                  style={{
                    background: 'var(--white, #ffffff)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    borderLeft: '4px solid #f59e0b',
                    borderRadius: 'var(--radius-lg, 0.75rem)',
                    padding: '1.2rem 1.5rem',
                    boxShadow: '0 1px 3px rgba(20, 33, 61, 0.04)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1.25rem',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: '1 1 300px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      background: 'rgba(245, 158, 11, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}>
                      <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 800, textTransform: 'uppercase' }}>
                        {month}
                      </span>
                      <span style={{ fontSize: '1.15rem', color: 'var(--navy)', fontWeight: 800, lineHeight: 1 }}>
                        {day}
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gold-dark, #d4a017)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          {progTitle}
                        </span>
                        <span style={{ 
                          fontSize: '0.68rem', 
                          fontWeight: 700, 
                          padding: '0.1rem 0.45rem', 
                          borderRadius: '9999px', 
                          background: '#fef3c7', 
                          color: '#92400e' 
                        }}>
                          {pClass.hasDraft ? 'Borrador disponible' : 'Pendiente de publicar'}
                        </span>
                      </div>
                      <h4 style={{ margin: 0, color: 'var(--navy)', fontSize: '1rem', fontWeight: 800 }}>
                        {pClass.title}
                      </h4>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                        Finalizada el {d.toLocaleDateString('es-ES')} a las {timeStr} hrs
                      </span>
                    </div>
                  </div>

                  <div>
                    <Link
                      to={`/portal?tab=mis-clases&classId=${pClass.id}&section=activity`}
                      className="btn"
                      style={{
                        background: '#f59e0b',
                        color: '#ffffff',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        borderRadius: '8px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 4px rgba(245, 158, 11, 0.25)',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      <Sparkles size={16} />
                      <span>Gestionar Actividad IA</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

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

  // Habilitar / Inhabilitar un programa
  const handleTogglePublish = async (programId, currentPublishedState) => {
    const nextState = !currentPublishedState;
    try {
      const { error: updateError } = await supabase
        .from('diploma_programs')
        .update({ 
          is_published: nextState, 
          status: nextState ? 'published' : 'draft' 
        })
        .eq('id', programId);

      if (updateError) throw updateError;

      setDiplomas(prev => prev.map(p => 
        p.id === programId ? { ...p, is_published: nextState, status: nextState ? 'published' : 'draft' } : p
      ));
    } catch (err) {
      console.error('Error al cambiar estado del programa:', err);
      alert('No se pudo cambiar el estado del programa. Inténtalo de nuevo.');
    }
  };

  // Eliminar un programa y todo su contenido asociado
  const handleDeleteProgram = async (program) => {
    const confirmed = window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el programa "${program.title}"?\n\nEsta acción no se puede deshacer y borrará TODOS sus módulos, clases, tareas, inscripciones y contenido asociado.`);
    if (!confirmed) return;

    try {
      // 1. Eliminar inscripciones vinculadas
      await supabase.from('enrollments').delete().eq('diploma_id', program.id);

      // 2. Eliminar tareas y cuestionarios vinculados
      try {
        await supabase.from('assignments').delete().eq('program_id', program.id);
        await supabase.from('quizzes').delete().eq('program_id', program.id);
      } catch {
        // Ignorar si las tablas aún no tienen registros
      }

      // 3. Eliminar clases del programa
      await supabase.from('class_sessions').delete().eq('program_id', program.id);

      // 4. Eliminar sesiones y módulos del programa (cascada a sesiones y clases)
      await supabase.from('sessions').delete().eq('program_id', program.id);
      await supabase.from('subtopics').delete().eq('program_id', program.id);
      await supabase.from('modules').delete().eq('program_id', program.id);
      await supabase.from('modules').delete().eq('diploma_id', program.id);

      // 5. Eliminar el registro principal en diploma_programs
      const { error: deleteError } = await supabase
        .from('diploma_programs')
        .delete()
        .eq('id', program.id);

      if (deleteError) throw deleteError;

      setDiplomas(prev => prev.filter(p => p.id !== program.id));
      setCounts(prev => ({ ...prev, programs: Math.max(0, prev.programs - 1) }));
    } catch (err) {
      console.error('Error al eliminar el programa y su contenido:', err);
      alert('Hubo un error al intentar eliminar el programa.');
    }
  };

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
      
      let diplomasData = dData || [];
      if (diplomasData.length > 0) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        const { data: todayClasses } = await supabase
          .from('class_sessions')
          .select('id, program_id, meet_url, class_date, duration, video_url')
          .in('program_id', diplomasData.map(d => d.id))
          .gte('class_date', todayStart)
          .lt('class_date', todayEnd);

        diplomasData = diplomasData.map(dip => {
          const liveClass = todayClasses?.find(c => c.program_id === dip.id && isClassLiveOrSoon(c, 10));
          const liveUrl = liveClass ? (liveClass.meet_url || dip.meet_url) : null;
          return { ...dip, liveUrl };
        });
      }
      setDiplomas(diplomasData);

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
            title: `Módulo General - ${progData.title}`,
            description: 'Módulo contenedor automático para curso corto',
            order_index: 0
          }]);
        if (modError) console.error("Error creando módulo por defecto para el curso:", modError);
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

  const _getRoleLabel = (role) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'teacher') return 'Profesor';
    return 'Estudiante';
  };

  const _getInitials = (name) => {
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {diplomas.filter(d => d.program_type !== 'curso').map(dip => {
              const isPublished = dip.is_published !== false && dip.status !== 'draft';

              return (
                <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: isPublished ? 'var(--gold-subtle)' : '#f8fafc', border: isPublished ? '1px solid rgba(252, 163, 17, 0.25)' : '1px solid #cbd5e1', padding: '1.25rem', opacity: isPublished ? 1 : 0.85 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span className="badge badge-navy">Diplomado</span>
                    <span className="badge" style={{ background: isPublished ? '#dcfce7' : '#e2e8f0', color: isPublished ? '#15803d' : '#475569', fontSize: '0.68rem' }}>
                      {isPublished ? 'Activo' : 'Inhabilitado'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3', fontWeight: 700 }}>{dip.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.4 }}>
                    {dip.description || 'Sin descripción detallada.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: 'auto' }}>
                    <Link
                      onClick={() => {
                        localStorage.setItem('activeProgramId', dip.id);
                        localStorage.setItem('activeProgramType', dip.program_type);
                        window.dispatchEvent(new Event('programContextChanged'));
                      }}
                      to={getDiplomadoLink(dip.id)}
                      className="btn btn-gold"
                      style={{ textAlign: 'center', width: '100%', justifyContent: 'center', padding: '0.55rem', fontWeight: 700 }}
                    >
                      Administrar →
                    </Link>

                    {/* BOTONES DE INHABILITAR / ELIMINAR */}
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(dip.id, isPublished)}
                        title={isPublished ? 'Inhabilitar programa (ocultar de estudiantes)' : 'Habilitar programa'}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          padding: '0.45rem 0.5rem', borderRadius: 'var(--radius-md)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          background: isPublished ? '#fffbe6' : '#eff6ff',
                          color: isPublished ? '#d97706' : 'var(--navy)',
                          border: isPublished ? '1px solid #fca311' : '1px solid var(--navy)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{isPublished ? 'Inhabilitar' : 'Habilitar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProgram(dip)}
                        title="Eliminar programa permanentemente"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2.5rem' }}>
            {diplomas.filter(d => d.program_type === 'curso').map(dip => {
              const isPublished = dip.is_published !== false && dip.status !== 'draft';

              return (
                <div key={dip.id} className="card" style={{ display: 'flex', flexDirection: 'column', background: isPublished ? 'var(--bg-light)' : '#f8fafc', border: isPublished ? '1px solid rgba(20, 33, 61, 0.15)' : '1px solid #cbd5e1', padding: '1.25rem', opacity: isPublished ? 1 : 0.85 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                    <span className="badge badge-navy">Curso Corto</span>
                    <span className="badge" style={{ background: isPublished ? '#dcfce7' : '#e2e8f0', color: isPublished ? '#15803d' : '#475569', fontSize: '0.68rem' }}>
                      {isPublished ? 'Activo' : 'Inhabilitado'}
                    </span>
                  </div>

                  <h3 style={{ fontSize: '1.05rem', marginBottom: '0.5rem', color: 'var(--navy)', lineHeight: '1.3', fontWeight: 700 }}>{dip.title}</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.82rem', marginBottom: '1.25rem', flexGrow: 1, lineHeight: 1.4 }}>
                    {dip.description || 'Sin descripción detallada.'}
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: 'auto' }}>
                    
                    {/* ACCESO RÁPIDO A CLASE EN VIVO (Si aplica) */}
                    {dip.liveUrl && (
                      <a 
                        href={dip.liveUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn"
                        style={{ 
                          textAlign: 'center', 
                          width: '100%', 
                          justifyContent: 'center', 
                          padding: '0.55rem', 
                          fontWeight: 700, 
                          fontSize: '0.85rem',
                          borderRadius: 'var(--radius-md)',
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#dc2626', animation: 'pulse 1.5s infinite' }} />
                        Clase en Vivo (Hoy)
                      </a>
                    )}

                    <Link
                      onClick={() => {
                        localStorage.setItem('activeProgramId', dip.id);
                        localStorage.setItem('activeProgramType', dip.program_type);
                        window.dispatchEvent(new Event('programContextChanged'));
                      }}
                      to={getDiplomadoLink(dip.id)}
                      className="btn btn-navy"
                      style={{ textAlign: 'center', width: '100%', justifyContent: 'center', padding: '0.55rem', fontWeight: 700 }}
                    >
                      Administrar →
                    </Link>

                    {/* BOTONES DE INHABILITAR / ELIMINAR */}
                    <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(dip.id, isPublished)}
                        title={isPublished ? 'Inhabilitar programa (ocultar de estudiantes)' : 'Habilitar programa'}
                        style={{
                          flex: 1,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          padding: '0.45rem 0.5rem', borderRadius: 'var(--radius-md)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          background: isPublished ? '#fffbe6' : '#eff6ff',
                          color: isPublished ? '#d97706' : 'var(--navy)',
                          border: isPublished ? '1px solid #fca311' : '1px solid var(--navy)',
                          transition: 'all 0.2s'
                        }}
                      >
                        {isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                        <span>{isPublished ? 'Inhabilitar' : 'Habilitar'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteProgram(dip)}
                        title="Eliminar programa permanentemente"
                        style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                          padding: '0.45rem 0.65rem', borderRadius: 'var(--radius-md)',
                          fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                          background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca',
                          transition: 'all 0.2s'
                        }}
                      >
                        <Trash2 size={14} />
                        <span>Eliminar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

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
    <div style={{ padding: '1rem 1rem 2.5rem 1rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* HEADER PRINCIPAL COMPARTIDO (Se oculta para profesores para usar el encabezado propio de Inicio docente) */}
      {role !== 'teacher' && (
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
            {role === 'admin' ? 'Panel de Control LIATER' : 'Mis Programas'}
          </h1>
          {role === 'student' && (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0.35rem 0 0 0', fontWeight: 400 }}>
              Continúa tu formación y revisa tus próximos compromisos.
            </p>
          )}
        </div>
      )}

      {/* RENDERIZADO DINÁMICO SEGÚN ROL */}
      {role === 'admin' && <AdminPortal getDiplomadoLink={getDiplomadoLink} />}
      {role === 'teacher' && <TeacherPortal getDiplomadoLink={getDiplomadoLink} />}
      {role === 'student' && <StudentPortal getDiplomadoLink={getDiplomadoLink} />}
      {/* Fallback por seguridad si no hay rol */}
      {!role && <StudentPortal getDiplomadoLink={getDiplomadoLink} />}    </div>
  );
}
