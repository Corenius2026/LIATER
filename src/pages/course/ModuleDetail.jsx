import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { BookOpen, PlayCircle, Clock, Video, User, ArrowLeft, CheckCircle2, AlertCircle, CalendarPlus } from 'lucide-react';
import { getGoogleCalendarUrl, safeFormatDateTime } from '@/utils/dateUtils';

export default function ModuleDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  
  const [moduleData, setModuleData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [completedActivities, setCompletedActivities] = useState(new Set());

  const [programType, setProgramType] = useState(null);
  const [programTitle, setProgramTitle] = useState('');

  useEffect(() => {
    async function fetchModuleData() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        
        // 1. Obtener los datos del módulo y sesiones en paralelo
        const [
          { data: modData, error: modError },
          sRes
        ] = await Promise.all([
          supabase.from('modules').select('*').eq('id', id).maybeSingle(),
          (async () => {
            let res = await supabase.from('sessions').select('*').eq('module_id', id).order('order_index', { ascending: true });
            if (res.error) {
              res = await supabase.from('subtopics').select('*').eq('module_id', id).order('order_index', { ascending: true });
            }
            return res;
          })()
        ]);
        
        if (modError) console.error('Error fetching module:', modError);
        setModuleData(modData);

        if (modData) {
          // Actualizar contexto global para el Sidebar y disparar peticiones secundarias
          if (modData.program_id) {
            // No hacemos await aquí para no bloquear, lo dejamos en background
            supabase
              .from('diploma_programs')
              .select('title, program_type')
              .eq('id', modData.program_id)
              .maybeSingle()
              .then(({ data: progData }) => {
                if (progData?.program_type) {
                  setProgramType(progData.program_type);
                  localStorage.setItem('activeProgramType', progData.program_type);
                }
                if (progData?.title) {
                  setProgramTitle(progData.title);
                }
                localStorage.setItem('activeProgramId', modData.program_id);
                window.dispatchEvent(new Event('programContextChanged'));
              });
          }

          let sessionsWithClasses = sRes.data || [];

          // 3. Obtener las clases si hay sesiones
          if (sessionsWithClasses.length > 0) {
            const sessionIds = sessionsWithClasses.map(s => s.id);
            const formattedIds = sessionIds.map(id => `"${id}"`).join(',');
            
            let classesData = [];
            const { data: cData, error: cError } = await supabase
              .from('class_sessions')
              .select('*, teacher_profiles(name), class_activities(id, is_published)')
              .or(`session_id.in.(${formattedIds}),subtopic_id.in.(${formattedIds})`);

            if (cError) {
              const { data: fallbackData } = await supabase
                .from('class_sessions')
                .select('*, teacher_profiles(name), class_activities(id, is_published)')
                .in('subtopic_id', sessionIds);
              classesData = fallbackData || [];
            } else {
              classesData = cData || [];
            }

            // Agrupamos las clases dentro de su respectiva sesión
            sessionsWithClasses = sessionsWithClasses.map(session => ({
              ...session,
              classes: (classesData || []).filter(c => (c.session_id === session.id || c.subtopic_id === session.id))
            }));

            // Fetch completados
            if (currentUser?.id && classesData.length > 0) {
              const activityIds = [];
              classesData.forEach(c => {
                if (c.class_activities) {
                  const activities = Array.isArray(c.class_activities) ? c.class_activities : [c.class_activities];
                  activities.forEach(a => {
                    if (a && a.id) activityIds.push(a.id);
                  });
                }
              });

              if (activityIds.length > 0) {
                const { data: attemptsData } = await supabase
                  .from('activity_attempts')
                  .select('activity_id')
                  .eq('student_id', currentUser.id)
                  .eq('status', 'completed')
                  .in('activity_id', activityIds);
                  
                if (attemptsData) {
                  const completedSet = new Set(attemptsData.map(a => a.activity_id));
                  setCompletedActivities(completedSet);
                }
              }
            }
          }

          setSessions(sessionsWithClasses);
        }
      } catch (err) {
        console.error('Error fetching module details:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchModuleData();
  }, [id]);

  const isCourse = programType === 'course' || moduleData?.order_index === 0;

  if (loading) {
    return (
      <div style={{ width: '100%', padding: '1rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1.5rem' }}>
          <div className="skeleton" style={{ width: '80px', height: '24px' }}></div>
          <div className="skeleton" style={{ width: '150px', height: '24px' }}></div>
        </div>
        <div className="skeleton" style={{ width: '300px', height: '40px', marginBottom: '1rem' }}></div>
        <div className="skeleton" style={{ width: '200px', height: '20px', marginBottom: '2rem' }}></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.5rem' }}>
          <div className="skeleton" style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-md)' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-md)' }}></div>
          <div className="skeleton" style={{ width: '100%', height: '140px', borderRadius: 'var(--radius-md)' }}></div>
        </div>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', animation: 'fadeSlideUp 0.35s ease-out' }}>
        <h2>Módulo no encontrado</h2>
        <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>El módulo solicitado no existe o fue desactivado.</p>
        <Link to="/portal" className="btn btn-primary">
          <ArrowLeft size={16} /> Volver al Portal
        </Link>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      {/* BOTÓN DE RETORNO */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={isCourse ? (moduleData?.program_id ? `/dashboard/${moduleData.program_id}` : '/portal') : (moduleData?.program_id ? `/modules/${moduleData.program_id}` : '/portal')} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
          <ArrowLeft size={14} /> {isCourse ? 'Volver al inicio del curso' : (moduleData?.program_id ? 'Volver a Módulos' : 'Volver al Portal')}
        </Link>
      </div>

      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        {!isCourse && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <span className="badge badge-gold">Módulo {moduleData.order_index ?? ''}</span>
          </div>
        )}
        <h1 className="page-title">{moduleData.title}</h1>
        <p className="page-description">{moduleData.description || 'Sin descripción detallada'}</p>
      </div>

      {/* CONTENIDO Y SESIONES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <BookOpen size={36} color="var(--gold-dark)" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'var(--navy)', marginBottom: '0.25rem' }}>Sin sesiones registradas aún</h3>
            <p style={{ fontSize: '0.85rem' }}>Los contenidos de este módulo están en desarrollo.</p>
          </div>
        ) : (
          sessions.map((session, sIdx) => (
            <div
              key={session.id}
              className="card static-card"
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1.1rem',
                background: '#FFFFFF',
                borderRadius: '14px',
                border: '1.5px solid #CBD5E1',
                borderLeft: '5px solid var(--navy, #14213D)',
                boxShadow: '0 4px 16px rgba(20, 33, 61, 0.05)',
                padding: '1.25rem 1.5rem'
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.85rem',
                borderBottom: '1.5px solid #E2E8F0',
                paddingBottom: '0.85rem',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #14213D 0%, #1E3A5F 100%)',
                    color: 'var(--gold, #FCA311)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    flexShrink: 0,
                    boxShadow: '0 2px 5px rgba(20, 33, 61, 0.15)'
                  }}>
                    {session.order_index ?? (sIdx + 1)}
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy, #14213D)', margin: 0 }}>
                      {session.title}
                    </h3>
                    {session.description && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                        {session.description}
                      </p>
                    )}
                  </div>
                </div>

                {session.classes && session.classes.length > 0 && (
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.25rem 0.65rem',
                    borderRadius: '20px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    color: '#475569',
                    fontSize: '0.74rem',
                    fontWeight: 700
                  }}>
                    {session.classes.length} {session.classes.length === 1 ? 'clase' : 'clases'}
                  </span>
                )}
              </div>

              {/* LISTA DE CLASES DE LA SESIÓN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {!session.classes || session.classes.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No hay clases programadas en esta sesión.
                  </p>
                ) : (
                  session.classes.map(cls => {
                    const hasVideo = !!cls.video_url;
                    
                    const activitiesArr = Array.isArray(cls.class_activities) ? cls.class_activities : (cls.class_activities ? [cls.class_activities] : []);
                    const publishedActivities = activitiesArr.filter(a => a.is_published);
                    const isActivityPublished = !!cls.has_published_activity || publishedActivities.length > 0;
                    
                    const hasCompletedActivity = publishedActivities.some(a => completedActivities.has(a.id));

                    const isPast = cls.class_date ? new Date(cls.class_date) < new Date() : false;

                    let activityStatusText = 'Actividad no disponible';
                    let activityStatusColor = '#9ca3af'; // gray

                    if (isActivityPublished) {
                      if (hasCompletedActivity) {
                        activityStatusText = 'Actividad OK';
                        activityStatusColor = '#16a34a'; // green
                      } else {
                        activityStatusText = 'Actividad pendiente';
                        activityStatusColor = '#f97316'; // orange
                      }
                    }

                    const classDateObj = cls.class_date ? new Date(cls.class_date) : null;
                    const isFutureClass = classDateObj && !isNaN(classDateObj.getTime()) && classDateObj.getTime() > Date.now();
                    const googleCalUrl = isFutureClass
                      ? getGoogleCalendarUrl(
                          cls,
                          programTitle || moduleData?.title || '',
                          cls.teacher_profiles?.name || '',
                          currentUser?.role === 'teacher' ? 'teacher' : 'student'
                        )
                      : null;

                    return (
                    <div key={cls.id} style={{
                      padding: '0.9rem 1.15rem',
                      border: '1px solid #E2E8F0',
                      borderLeft: '4.5px solid var(--gold, #FCA311)',
                      borderRadius: '10px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: '#F8FAFC',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      boxShadow: '0 1px 3px rgba(20, 33, 61, 0.03)',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={e => {
                      e.currentTarget.style.borderColor = '#CBD5E1';
                      e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.boxShadow = '0 3px 10px rgba(252, 163, 17, 0.12)';
                    }}
                    onMouseOut={e => {
                      e.currentTarget.style.borderColor = '#E2E8F0';
                      e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(20, 33, 61, 0.03)';
                    }}
                    >
                      <div style={{ minWidth: 0, flex: '1 1 260px' }}>
                        <h4 style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                          {cls.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          {cls.class_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={12} /> {safeFormatDateTime(cls.class_date)}
                            </span>
                          )}
                          {cls.teacher_profiles?.name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <User size={12} /> Prof. {cls.teacher_profiles.name}
                            </span>
                          )}
                          {isPast && (
                            <>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: hasVideo ? '#16a34a' : '#f97316', fontWeight: 600 }}>
                                {hasVideo ? <><CheckCircle2 size={12} /> Grabación OK</> : <><AlertCircle size={12} /> Grabación pendiente</>}
                              </span>
                              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: activityStatusColor, fontWeight: 600 }}>
                                {activityStatusText === 'Actividad OK' && <CheckCircle2 size={12} />}
                                {activityStatusText === 'Actividad pendiente' && <AlertCircle size={12} />}
                                {activityStatusText === 'Actividad no disponible' && <AlertCircle size={12} />}
                                {activityStatusText}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0, flexWrap: 'wrap' }}>
                        {isFutureClass && googleCalUrl && (
                          <a
                            href={googleCalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Agendar esta clase en Google Calendar"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-md, 8px)',
                              background: '#FFFFFF',
                              border: '1.5px solid #CBD5E1',
                              color: 'var(--navy, #14213D)',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
                            }}
                            onMouseOver={e => {
                              e.currentTarget.style.borderColor = 'var(--gold, #FCA311)';
                              e.currentTarget.style.background = '#F8FAFC';
                            }}
                            onMouseOut={e => {
                              e.currentTarget.style.borderColor = '#CBD5E1';
                              e.currentTarget.style.background = '#FFFFFF';
                            }}
                          >
                            <CalendarPlus size={13} color="var(--gold-dark, #b45309)" />
                            <span>Agendar</span>
                          </a>
                        )}

                        <Link to={`/class/${cls.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <PlayCircle size={14} /> Ver Clase
                        </Link>
                      </div>
                    </div>
                  )})
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
