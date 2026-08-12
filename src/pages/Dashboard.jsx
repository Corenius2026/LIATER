import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import { calculateProgramProgressDetails } from '../services/programService';
import { isClassLiveOrSoon } from '../utils/dateUtils';
import {
  PlayCircle, BookOpen, Calendar, Video, Clock, User, Megaphone,
  ArrowRight, ArrowLeft, ChevronRight, MessageSquare, Award,
  CheckCircle2, TrendingUp, BarChart2, AlertTriangle
} from 'lucide-react';

/* ─────────────────────────────────────────────────────
   HELPER: icono de recurso de clase
───────────────────────────────────────────────────── */
function ClassRow({ cls, activityInfo }) {
  const hasRecording = !!cls.video_url;
  const actStatus = activityInfo?.completed ? 'completada' : activityInfo?.has ? 'pendiente' : null;

  return (
    <Link
      to={`/class/${cls.id}`}
      style={{ textDecoration: 'none' }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.85rem',
        padding: '0.8rem 1rem',
        border: '1px solid var(--border-color)',
        borderLeft: `4px solid ${hasRecording ? 'var(--navy)' : 'var(--gray)'}`,
        borderRadius: 'var(--radius-md)',
        background: 'var(--white)',
        transition: 'var(--transition-fast)',
        cursor: 'pointer'
      }}
        onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--navy-light)'; }}
        onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}
      >
        {/* Grabación disponible */}
        <div style={{
          width: '34px', height: '34px', borderRadius: 'var(--radius-sm)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: hasRecording ? 'var(--gold-subtle)' : 'rgba(20,33,61,0.05)'
        }}>
          {hasRecording
            ? <PlayCircle size={16} color="var(--gold-dark)" />
            : <Video size={16} color="var(--gray-dark)" />
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 600, color: 'var(--navy)', fontSize: '0.87rem',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {cls.title}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem', flexWrap: 'wrap' }}>
            <p style={{ margin: 0, fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              {cls.class_date
                ? new Date(cls.class_date).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
                : 'Sin fecha'}
            </p>
            {cls.teacher_profiles?.name && (
              <span style={{ fontSize: '0.72rem', color: 'var(--navy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                · <User size={11} color="var(--gold-dark)" /> {cls.teacher_profiles.name}
              </span>
            )}
          </div>
        </div>

        {/* Badge de actividad — paleta del sistema */}
        {actStatus && (
          <span style={{
            fontSize: '0.66rem', fontWeight: 700, flexShrink: 0,
            padding: '0.15rem 0.5rem', borderRadius: '999px',
            background: actStatus === 'completada' ? 'var(--green-subtle)' : 'var(--gold-subtle)',
            color: actStatus === 'completada' ? 'var(--green-600)' : 'var(--gold-dark)',
            border: `1px solid ${actStatus === 'completada' ? 'var(--green-400)' : 'var(--gold-light)'}`
          }}>
            {actStatus === 'completada' ? '✓ Hecho' : '● Pendiente'}
          </span>
        )}

        <ChevronRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  );
}

/* ─────────────────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────────────────── */
export default function Dashboard() {
  const { programId } = useParams();
  const { currentUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [hasNewAnnouncements, setHasNewAnnouncements] = useState(false);
  const [activityStats, setActivityStats] = useState({ completedCount: 0, totalCount: 0, averageScore: 0 });
  const [recentClasses, setRecentClasses] = useState([]);

  const [dashboardData, setDashboardData] = useState({
    diplomaTitle: 'Programa Académico',
    programType: 'diplomado',
    modulesCount: 0,
    sessionsCount: 0,
    totalClassesCount: 0,
    upcomingClasses: [],
    latestRecordings: [],
    firstModuleId: null,
    announcements: [],
    meetUrl: null
  });

  const cleanProgramId = programId
    ? decodeURIComponent(programId).replace(/\s+/g, '-').trim()
    : '';
  const seenAnnouncementsKey = `seen_announcements_${programId}`;
  const [, setTimeTick] = useState(0);

  // Actualizador periódico cada 30 segundos para recalcular ventana de 10 min en tiempo real
  useEffect(() => {
    const timer = setInterval(() => setTimeTick(t => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!cleanProgramId) { setLoading(false); return; }
      try {
        setLoading(true);
        const todayStartIso = new Date(new Date().setHours(0,0,0,0)).toISOString();

        // ─── BLOQUE 1: consultas independientes en paralelo ───
        const [
          { data: diplomaData },
          { data: modulesData },
          { data: upcomingData },
          { data: announcementsData },
          { data: allClassesData },
          sessionsRes,
          { count: totalClassesCount }
        ] = await Promise.all([
          supabase
            .from('diploma_programs')
            .select('title, program_type, is_published, status, meet_url')
            .eq('id', cleanProgramId)
            .maybeSingle(),
          supabase
            .from('modules')
            .select('id')
            .eq('program_id', cleanProgramId)
            .order('order_index', { ascending: true }),
          supabase
            .from('class_sessions')
            .select('id, title, class_date, duration, video_url, meet_url, teacher_profiles(name)')
            .eq('program_id', cleanProgramId)
            .gte('class_date', todayStartIso)
            .order('class_date', { ascending: true })
            .limit(6),
          supabase
            .from('announcements')
            .select('*, teacher_profiles(name)')
            .eq('program_id', cleanProgramId)
            .order('created_at', { ascending: false })
            .limit(5),
          supabase
            .from('class_sessions')
            .select('id, title, class_date, duration, video_url, teacher_profiles(name)')
            .eq('program_id', cleanProgramId)
            .order('class_date', { ascending: false })
            .limit(8),
          supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', cleanProgramId),
          supabase
            .from('class_sessions')
            .select('id', { count: 'exact', head: true })
            .eq('program_id', cleanProgramId)
        ]);

        const isPublished = diplomaData
          ? (diplomaData.is_published !== false
              && diplomaData.status !== 'draft'
              && diplomaData.status !== 'disabled')
          : true;
        const freshAnnouncements = isPublished ? (announcementsData || []) : [];

        // Conteo de sesiones si no viene por program_id directo
        let calculatedSessionsCount = sessionsRes?.count || 0;
        if (!calculatedSessionsCount && modulesData && modulesData.length > 0) {
          const modIds = modulesData.map(m => m.id);
          const { count: modSessionsCount } = await supabase
            .from('sessions')
            .select('id', { count: 'exact', head: true })
            .in('module_id', modIds);
          calculatedSessionsCount = modSessionsCount || 0;
        }

        setDashboardData({
          diplomaTitle: diplomaData?.title || 'Programa Académico',
          programType: diplomaData?.program_type || 'diplomado',
          meetUrl: diplomaData?.meet_url || null,
          isPublished,
          modulesCount: modulesData?.length || 0,
          sessionsCount: calculatedSessionsCount,
          totalClassesCount: totalClassesCount || (allClassesData?.length || 0),
          upcomingClasses: isPublished ? (upcomingData || []) : [],
          latestRecordings: [],
          firstModuleId: modulesData?.[0]?.id || null,
          announcements: freshAnnouncements
        });

        // Anuncios no leídos
        if (freshAnnouncements.length > 0) {
          const seenId = localStorage.getItem(seenAnnouncementsKey);
          if (seenId !== String(freshAnnouncements[0]?.id)) setHasNewAnnouncements(true);
        }

        // ─── BLOQUE 2: dependencias en paralelo ───
        const secondaryResults = await Promise.all([
          // 2a. Progreso real del estudiante
          currentUser?.id
            ? calculateProgramProgressDetails(cleanProgramId, currentUser.id)
            : Promise.resolve({ percentage: 0, totalClasses: 0, completedClassesValue: 0 }),

          // 2b. Actividades publicadas de las últimas clases (para stats + estado)
          (async () => {
            const classIds = (allClassesData || []).map(c => c.id);
            if (classIds.length === 0) return { activities: [], attempts: [] };

            const { data: acts } = await supabase
              .from('class_activities')
              .select('id, class_id, is_mandatory')
              .eq('is_published', true)
              .in('class_id', classIds);

            const actIds = (acts || []).map(a => a.id);
            if (actIds.length === 0 || !currentUser?.id) return { activities: acts || [], attempts: [] };

            const { data: atts } = await supabase
              .from('activity_attempts')
              .select('id, activity_id, score, status')
              .eq('student_id', currentUser.id)
              .eq('status', 'completed')
              .in('activity_id', actIds);

            const attIds = (atts || []).map(a => a.id).filter(Boolean);
            let attAnsMap = {};
            if (attIds.length > 0) {
              const { data: ans } = await supabase.from('attempt_answers').select('attempt_id, is_correct').in('attempt_id', attIds);
              if (ans && ans.length > 0) {
                ans.forEach(a => {
                  if (!attAnsMap[a.attempt_id]) attAnsMap[a.attempt_id] = { total: 0, correct: 0 };
                  attAnsMap[a.attempt_id].total++;
                  if (a.is_correct) attAnsMap[a.attempt_id].correct++;
                });
              }
            }

            return { activities: acts || [], attempts: atts || [], attAnsMap };
          })()
        ]);

        const [progressDetails, activityData] = secondaryResults;
        setProgress(progressDetails?.percentage || 0);

        // Calcular estadísticas de actividades
        const { activities, attempts, attAnsMap } = activityData;
        if (activities.length > 0) {
          // Mejor intento por actividad
          const bestByActivity = {};
          (attempts || []).forEach(att => {
            let realScore = att.score;
            const ansStats = attAnsMap ? attAnsMap[att.id] : null;
            if (ansStats && ansStats.total > 0) {
              realScore = Math.round((ansStats.correct / ansStats.total) * 100);
            }
            if (!bestByActivity[att.activity_id] || realScore > bestByActivity[att.activity_id]) {
              bestByActivity[att.activity_id] = realScore;
            }
          });
          const completedIds = new Set(Object.keys(bestByActivity));
          const scores = Object.values(bestByActivity);
          const avg = scores.length > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
            : 0;

          setActivityStats({
            completedCount: completedIds.size,
            totalCount: activities.length,
            averageScore: avg
          });

          // Mapear estado por class_id para la lista de clases
          const activityByClass = {};
          activities.forEach(act => {
            activityByClass[act.class_id] = {
              has: true,
              completed: completedIds.has(act.id)
            };
          });

          setRecentClasses((allClassesData || []).map(c => ({
            ...c,
            activityInfo: activityByClass[c.id] || null
          })));
        } else {
          setRecentClasses(allClassesData || []);
        }

        // Contexto global del Sidebar
        localStorage.setItem('activeProgramId', cleanProgramId);
        if (diplomaData?.program_type) {
          localStorage.setItem('activeProgramType', diplomaData.program_type);
        }
        window.dispatchEvent(new Event('programContextChanged'));

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── SKELETON ── */
  if (loading) {
    return (
      <div style={{ width: '100%', padding: '1rem 0' }}>
        <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between' }}>
          <div className="skeleton" style={{ width: '150px', height: '30px' }} />
          <div className="skeleton" style={{ width: '180px', height: '30px' }} />
        </div>
        <div className="skeleton" style={{ width: '100%', height: '100px', borderRadius: 'var(--radius-lg)', marginBottom: '1.5rem' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '88px', borderRadius: 'var(--radius-md)' }} />)}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '260px', borderRadius: 'var(--radius-lg)' }} />
          <div className="skeleton" style={{ height: '260px', borderRadius: 'var(--radius-lg)' }} />
        </div>
      </div>
    );
  }

  const {
    diplomaTitle, programType, isPublished, modulesCount, sessionsCount,
    totalClassesCount, upcomingClasses, firstModuleId, announcements, meetUrl
  } = dashboardData;

  const isCourse = programType === 'curso';

  // ── LÓGICA DE CLASE EN VIVO (Habilitada desde 10 min antes hasta fin de transmisión) ──
  const activeLiveClass = upcomingClasses.find(c => isClassLiveOrSoon(c, 10));
  const activeLiveMeetUrl = activeLiveClass ? (activeLiveClass.meet_url || meetUrl) : null;

  // Clase de hoy (si hay alguna programada para hoy sin grabación aún)
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todayEnd   = new Date(); todayEnd.setHours(23,59,59,999);
  const classToday = upcomingClasses.find(c => {
    const d = c.class_date ? new Date(c.class_date) : null;
    return d && d >= todayStart && d <= todayEnd && !c.video_url;
  });
  const isClassTodayLive = classToday ? isClassLiveOrSoon(classToday, 10) : false;
  const classTodayMeetUrl = classToday ? (classToday.meet_url || meetUrl) : null;

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* ── BREADCRUMB + BOTÓN CLASE EN VIVO (Solo visible 10 min antes o durante transmisión) ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link to="/portal" className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
            <ArrowLeft size={14} /> Volver
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            <ChevronRight size={14} />
            <Link to="/portal" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}
              onMouseOver={e => e.currentTarget.style.color = 'var(--navy)'}
              onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Mis Programas
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--navy)', fontWeight: 700, whiteSpace: 'nowrap',
              overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>
              {diplomaTitle}
            </span>
          </div>
        </div>

        {activeLiveMeetUrl && (
          <a href={activeLiveMeetUrl} target="_blank" rel="noreferrer" style={{
            background: '#dc2626', color: '#ffffff',
            padding: '0.5rem 1.1rem', borderRadius: '8px',
            fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            boxShadow: '0 2px 8px rgba(220,38,38,0.3)',
            animation: 'pulse 2s ease-in-out infinite'
          }}>
            <Video size={16} /> Clase en Vivo — Entrar Ahora
          </a>
        )}
      </div>

      {/* ── ALERTA PROGRAMA DESHABILITADO ── */}
      {!isPublished && (
        <div className="card" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          <AlertTriangle size={24} style={{ marginBottom: '0.5rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', fontWeight: 800, color: '#991b1b' }}>Este programa se encuentra inhabilitado</h3>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#7f1d1d' }}>
            La administración ha suspendido temporalmente el acceso a los contenidos y clases.
          </p>
        </div>
      )}

      {/* ── ENCABEZADO ── */}
      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span className={`badge ${isCourse ? 'badge-gold' : 'badge-primary'}`} style={{ fontSize: '0.74rem', padding: '0.2rem 0.6rem' }}>
            {isCourse ? 'Curso Corto' : 'Diplomado'}
          </span>
        </div>
        <h1 className="page-title" style={{ fontSize: '1.9rem', lineHeight: 1.2 }}>{diplomaTitle}</h1>
        <p className="page-description" style={{ marginTop: '0.35rem' }}>
          Tu panel de control &nbsp;·&nbsp; {isCourse
            ? `${sessionsCount || 'Varias'} ${sessionsCount === 1 ? 'sesión' : 'sesiones'} · ${totalClassesCount || recentClasses.length} ${totalClassesCount === 1 ? 'clase' : 'clases'}`
            : `${modulesCount} ${modulesCount === 1 ? 'módulo' : 'módulos'} · ${totalClassesCount || recentClasses.length} ${totalClassesCount === 1 ? 'clase' : 'clases'}`
          }
        </p>
      </div>

      {/* ── BANNER CLASE HOY (EN VIVO O PROGRAMADA) ── */}
      {classToday && (
        isClassTodayLive ? (
          <div style={{
            background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
            borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
            marginBottom: '1.75rem', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            boxShadow: '0 4px 20px rgba(220,38,38,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Video size={20} color="#ffffff" />
              </div>
              <div>
                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.15rem 0' }}>
                  Clase en vivo — EN TRANSMISIÓN
                </p>
                <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  {classToday.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  {classToday.class_date && (
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', margin: 0 }}>
                      {new Date(classToday.class_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs
                    </p>
                  )}
                  {classToday.teacher_profiles?.name && (
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.78rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={12} color="#ffffff" /> Prof. {classToday.teacher_profiles.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {classTodayMeetUrl && (
              <a href={classTodayMeetUrl} target="_blank" rel="noreferrer" style={{
                background: '#ffffff', color: '#dc2626',
                padding: '0.6rem 1.25rem', borderRadius: '8px',
                fontWeight: 800, fontSize: '0.88rem', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)', flexShrink: 0
              }}>
                <Video size={15} /> Entrar a la Clase
              </a>
            )}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, var(--navy) 0%, #1e2e52 100%)',
            borderRadius: 'var(--radius-lg)', padding: '1.15rem 1.5rem',
            marginBottom: '1.75rem', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            border: '1px solid rgba(252,163,17,0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'var(--gold-subtle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Calendar size={20} color="var(--gold-dark)" />
              </div>
              <div>
                <p style={{ color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.15rem 0' }}>
                  Clase programada para HOY
                </p>
                <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                  {classToday.title}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                  {classToday.class_date && (
                    <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} color="var(--gold)" />
                      Inicio: {new Date(classToday.class_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs
                    </p>
                  )}
                  {classToday.teacher_profiles?.name && (
                    <p style={{ color: 'rgba(255,255,255,0.95)', fontSize: '0.78rem', margin: 0, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <User size={12} color="var(--gold)" /> Prof. {classToday.teacher_profiles.name}
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.45rem',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)',
              border: '1px solid rgba(255,255,255,0.12)',
              padding: '0.45rem 0.9rem', borderRadius: '8px',
              fontSize: '0.78rem', fontWeight: 600
            }}>
              <Clock size={13} color="var(--gold)" /> El botón de ingreso se activará 10 min antes
            </div>
          </div>
        )
      )}

      {/* ── 4 MÉTRICAS CLAVE ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {/* Progreso */}
        <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, #1e2e52 100%)', borderRadius: 'var(--radius-lg)', padding: '1.2rem 1.4rem', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
            <TrendingUp size={18} color="var(--gold)" />
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--gold)' }}>{progress}%</span>
          </div>
          <div style={{ height: '4px', background: 'rgba(255,255,255,0.15)', borderRadius: '999px', marginBottom: '0.5rem', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--gold)', borderRadius: '999px', transition: 'width 1s ease' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.76rem', fontWeight: 600, margin: 0 }}>Progreso general</p>
        </div>

        {/* Actividades completadas */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.2rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <CheckCircle2 size={18} color="#16a34a" />
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>
              {activityStats.completedCount}<span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/{activityStats.totalCount}</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600, margin: 0 }}>
            Actividades completadas
          </p>
        </div>

        {/* Nota promedio */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.2rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <Award size={18} color="var(--gold-dark)" />
            <span style={{ fontSize: '1.6rem', fontWeight: 800,
              color: activityStats.completedCount > 0
                ? (activityStats.averageScore >= 70 ? 'var(--green-600)' : activityStats.averageScore >= 50 ? 'var(--warning)' : 'var(--error)')
                : 'var(--text-muted)',
              lineHeight: 1 }}>
              {activityStats.completedCount > 0 ? `${activityStats.averageScore}%` : '—'}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600, margin: 0 }}>
            Nota promedio
          </p>
        </div>

        {/* Clases disponibles */}
        <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)', padding: '1.2rem 1.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
            <BookOpen size={18} color="var(--gold-dark)" />
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>
              {recentClasses.filter(c => !!c.video_url).length}
            </span>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.76rem', fontWeight: 600, margin: 0 }}>
            Grabaciones disponibles
          </p>
        </div>
      </div>

      {/* ── GRID PRINCIPAL: LISTA DE CLASES + PRÓXIMAS EN VIVO ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* CLASES DEL PROGRAMA */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'var(--gold-subtle, #fef9ec)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Video size={16} color="var(--gold-dark)" />
              </div>
              <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>
                {isCourse ? 'Contenido del Curso' : 'Contenido del Diplomado'}
              </h2>
            </div>
            <Link to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`}
              style={{ fontSize: '0.78rem', color: 'var(--gold-dark)', fontWeight: 700, textDecoration: 'none' }}>
              {isCourse ? 'Ver sesiones →' : 'Ver módulos →'}
            </Link>
          </div>

          {recentClasses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {recentClasses.slice(0, 6).map(cls => (
                <ClassRow key={cls.id} cls={cls} activityInfo={cls.activityInfo} />
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(20,33,61,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
              <BookOpen size={30} color="var(--navy)" style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                Aún no hay clases registradas.
              </p>
            </div>
          )}

          {/* CTA continuar */}
          <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            {isCourse ? (
              <Link to={`/syllabus/${cleanProgramId}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <BookOpen size={16} /> Ver sesiones del curso
              </Link>
            ) : firstModuleId ? (
              <Link to={`/module/${firstModuleId}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <PlayCircle size={16} />
                {progress === 0 ? 'Comenzar diplomado' : progress === 100 ? 'Revisar contenido' : 'Continuar aprendiendo'}
              </Link>
            ) : (
              <Link to={`/modules/${cleanProgramId}`} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                <BookOpen size={16} /> Ver módulos del diplomado
              </Link>
            )}
          </div>
        </div>

        {/* PRÓXIMAS CLASES EN VIVO */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
            <div style={{ width: '34px', height: '34px', borderRadius: 'var(--radius-md)', background: 'rgba(20,33,61,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={16} color="var(--navy)" />
            </div>
            <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>Próximas Clases en Vivo</h2>
          </div>

          {upcomingClasses.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingClasses.map(cls => {
                const classDate = cls.class_date ? new Date(cls.class_date) : null;
                const isToday = classDate && classDate >= todayStart && classDate <= todayEnd;
                const tomorrowEnd = new Date(todayEnd); tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);
                const isTomorrow = classDate && classDate > todayEnd && classDate <= tomorrowEnd;
                const urgencyLabel = isToday ? 'HOY' : isTomorrow ? 'MAÑANA' : null;
                const isLiveNow = isClassLiveOrSoon(cls, 10);
                const clsMeet = cls.meet_url || meetUrl;

                return (
                  <div key={cls.id} style={{
                    padding: '0.85rem 1rem',
                    border: `1px solid ${isLiveNow ? '#fca5a5' : isToday ? 'rgba(220,38,38,0.2)' : isTomorrow ? '#fcd34d' : 'var(--border-color)'}`,
                    borderLeft: `4px solid ${isLiveNow ? '#dc2626' : isToday ? '#e11d48' : isTomorrow ? '#d97706' : 'var(--navy)'}`,
                    borderRadius: 'var(--radius-md)',
                    background: isLiveNow ? '#fff5f5' : isToday ? '#fff8f8' : isTomorrow ? '#fffbeb' : 'var(--surface-light)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
                          <h4 style={{ fontWeight: 700, color: 'var(--navy)', margin: 0, fontSize: '0.87rem' }}>{cls.title}</h4>
                          {isLiveNow ? (
                            <span style={{
                              padding: '0.08rem 0.45rem', borderRadius: '999px',
                              background: '#dc2626', color: '#ffffff',
                              fontSize: '0.63rem', fontWeight: 800, flexShrink: 0,
                              animation: 'pulse 2s ease-in-out infinite'
                            }}>
                              EN VIVO
                            </span>
                          ) : urgencyLabel && (
                            <span style={{
                              padding: '0.08rem 0.45rem', borderRadius: '999px',
                              background: isToday ? '#fee2e2' : '#fffbe6',
                              color: isToday ? '#dc2626' : '#d97706',
                              fontSize: '0.63rem', fontWeight: 800, flexShrink: 0
                            }}>
                              {urgencyLabel}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          <Clock size={11} />
                          {classDate
                            ? classDate.toLocaleString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                            : 'Fecha por confirmar'}
                        </p>
                        {cls.teacher_profiles?.name && (
                          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.74rem', color: 'var(--navy)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <User size={11} color="var(--gold-dark)" /> Prof. {cls.teacher_profiles.name}
                          </p>
                        )}
                      </div>
                      {isLiveNow && clsMeet ? (
                        <a href={clsMeet} target="_blank" rel="noreferrer" className="btn btn-primary"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', flexShrink: 0, background: '#dc2626', border: 'none' }}>
                          <Video size={12} /> Entrar
                        </a>
                      ) : (
                        <Link to={`/class/${cls.id}`} className="btn btn-outline"
                          style={{ padding: '0.3rem 0.7rem', fontSize: '0.72rem', flexShrink: 0 }}>
                          Detalle
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', background: 'rgba(20,33,61,0.02)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
              <Calendar size={30} color="var(--navy)" style={{ opacity: 0.25, marginBottom: '0.5rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                No hay clases en vivo programadas próximamente.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── TABLÓN DE ANUNCIOS ── */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: 'var(--radius-md)', background: 'rgba(20,33,61,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <Megaphone size={18} color="var(--navy)" />
            {hasNewAnnouncements && (
              <span style={{ position: 'absolute', top: '-3px', right: '-3px', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', border: '2px solid white' }} />
            )}
          </div>
          <h2 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 700, color: 'var(--navy)' }}>Tablón de Anuncios</h2>
          {hasNewAnnouncements && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#dc2626', background: '#fee2e2', padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
              Nuevos
            </span>
          )}
          {announcements.length > 0 && (
            <button
              onClick={() => { localStorage.setItem(seenAnnouncementsKey, String(announcements[0]?.id)); setHasNewAnnouncements(false); }}
              style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer' }}>
              {announcements.length} {announcements.length === 1 ? 'anuncio' : 'anuncios'}
            </button>
          )}
        </div>

        {(() => {
          const TAG = {
            general: { label: 'General',     emoji: '📢', color: '#14213D', bg: '#EEF2F8', border: '#14213D' },
            info:    { label: 'Informativo', emoji: '📌', color: '#1d4ed8', bg: '#dbeafe', border: '#3b82f6' },
            urgent:  { label: 'Urgente',     emoji: '🔴', color: '#991b1b', bg: '#fee2e2', border: '#ef4444' }
          };
          return announcements.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {announcements.map(a => {
                const cfg = TAG[a.tag] || TAG.general;
                return (
                  <div key={a.id} style={{
                    padding: '1rem 1.25rem', borderRadius: '0 10px 10px 0',
                    border: '1px solid var(--border-color)', borderLeft: `4px solid ${cfg.border}`,
                    backgroundColor: 'var(--surface-light)', transition: 'box-shadow 0.15s'
                  }}
                    onMouseOver={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'}
                    onMouseOut={e => e.currentTarget.style.boxShadow = 'none'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', background: cfg.bg, color: cfg.color, fontSize: '0.7rem', fontWeight: 700 }}>
                        {cfg.emoji} {cfg.label}
                      </span>
                      <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {a.created_at ? new Date(a.created_at).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : ''}
                      </span>
                    </div>
                    <h4 style={{ fontWeight: 700, color: 'var(--navy)', margin: '0 0 0.35rem 0', fontSize: '0.92rem' }}>{a.title}</h4>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 0.5rem 0', whiteSpace: 'pre-wrap', lineHeight: 1.55 }}>{a.body}</p>
                    <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', fontWeight: 500, borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem' }}>
                      Publicado por: <strong>{a.teacher_profiles?.name ? (a.teacher_profiles.name.toLowerCase().includes('admin') ? a.teacher_profiles.name : `Prof. ${a.teacher_profiles.name}`) : 'Administración Académica'}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
              <Megaphone size={36} color="var(--navy)" style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: 0 }}>
                No hay anuncios recientes.
              </p>
            </div>
          );
        })()}
      </div>

      {/* ── ACCESOS RÁPIDOS ── */}
      <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', fontWeight: 700, color: 'var(--navy)' }}>Accesos Rápidos</h2>
      <div className="grid-3" style={{ marginBottom: '2rem' }}>

        {/* Ver temario / sesiones */}
        <Link to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', transition: 'all 0.2s ease', border: '1px solid var(--border-color)' }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(20,33,61,0.08)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--gold-subtle)', color: 'var(--gold-dark)', borderRadius: 'var(--radius-md)' }}>
            <BookOpen size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem', margin: '0 0 0.2rem 0' }}>{isCourse ? 'Ver Sesiones' : 'Ver Módulos'}</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {isCourse ? 'Explora las sesiones y clases del curso' : 'Módulos y sesiones del diplomado'}
            </p>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </Link>

        {/* Mis Resultados */}
        <Link to={`/resultados/${cleanProgramId}`}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', transition: 'var(--transition)', border: '1px solid var(--border-color)' }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'var(--gold-subtle)', color: 'var(--gold-dark)', borderRadius: 'var(--radius-md)', position: 'relative' }}>
            <BarChart2 size={22} />
            {activityStats.completedCount > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: 'var(--gold)', color: 'var(--navy)', fontSize: '0.6rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--white)' }}>
                {activityStats.completedCount}
              </span>
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem', margin: '0 0 0.2rem 0' }}>Mis Resultados</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
              {activityStats.completedCount > 0
                ? `${activityStats.completedCount} completadas · Promedio ${activityStats.averageScore}%`
                : 'Ver actividades de reforzamiento'}
            </p>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </Link>

        {/* Cuerpo Docente */}
        <Link to={`/teachers/${cleanProgramId}`}
          className="card"
          style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', transition: 'all 0.2s ease', border: '1px solid var(--border-color)' }}
          onMouseOver={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(20,33,61,0.08)'; e.currentTarget.style.borderColor = 'var(--navy-light)'; }}
          onMouseOut={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-color)'; }}>
          <div style={{ padding: '0.85rem', backgroundColor: 'rgba(20,33,61,0.08)', color: 'var(--navy)', borderRadius: 'var(--radius-md)' }}>
            <User size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem', margin: '0 0 0.2rem 0' }}>Cuerpo Docente</h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>Conoce a tus profesores</p>
          </div>
          <ArrowRight size={16} color="var(--text-muted)" />
        </Link>
      </div>

    </div>
  );
}
