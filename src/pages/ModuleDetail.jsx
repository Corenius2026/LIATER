import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, PlayCircle, Clock, Video, User, ArrowLeft } from 'lucide-react';

export default function ModuleDetail() {
  const { id } = useParams();
  
  const [moduleData, setModuleData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [programType, setProgramType] = useState(null);

  useEffect(() => {
    async function fetchModuleData() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // 1. Obtener los datos del módulo
        const { data: modData, error: modError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        
        if (modError) console.error('Error fetching module:', modError);
        setModuleData(modData);

        if (modData) {
          // Actualizar contexto global para el Sidebar
          if (modData.program_id) {
            const { data: progData } = await supabase
              .from('diploma_programs')
              .select('program_type')
              .eq('id', modData.program_id)
              .maybeSingle();

            if (progData?.program_type) {
              setProgramType(progData.program_type);
              localStorage.setItem('activeProgramType', progData.program_type);
            }
            localStorage.setItem('activeProgramId', modData.program_id);
            window.dispatchEvent(new Event('programContextChanged'));
          }

          // 2. Obtener las sesiones
          let sessionsData = [];
          const { data: sData, error: sError } = await supabase
            .from('sessions')
            .select('*')
            .eq('module_id', id)
            .order('order_index', { ascending: true });
          
          if (sError) {
            const { data: oldData } = await supabase
              .from('subtopics')
              .select('*')
              .eq('module_id', id)
              .order('order_index', { ascending: true });
            sessionsData = oldData || [];
          } else {
            sessionsData = sData || [];
          }

          let sessionsWithClasses = sessionsData;

          // 3. Obtener las clases si hay sesiones
          if (sessionsWithClasses.length > 0) {
            const sessionIds = sessionsWithClasses.map(s => s.id);
            
            let classesData = [];
            const { data: cData, error: cError } = await supabase
              .from('class_sessions')
              .select('*, teacher_profiles(name)')
              .or(`session_id.in.(${sessionIds.join(',')}),subtopic_id.in.(${sessionIds.join(',')})`);

            if (cError) {
              const { data: fallbackData } = await supabase
                .from('class_sessions')
                .select('*, teacher_profiles(name)')
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
            <BookOpen size={36} color="var(--gold-dark)" style={{ marginBottom: '0.5rem' }} />
            <h3 style={{ color: 'var(--navy)', marginBottom: '0.25rem' }}>Sin sesiones registradas aún</h3>
            <p style={{ fontSize: '0.85rem' }}>Los contenidos de este módulo están en desarrollo.</p>
          </div>
        ) : (
          sessions.map((session, sIdx) => (
            <div key={session.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <div style={{
                  width: '34px', height: '34px', borderRadius: 'var(--radius-md)',
                  background: 'var(--gold-subtle)', color: 'var(--gold-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '0.9rem', flexShrink: 0
                }}>
                  {session.order_index ?? (sIdx + 1)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                    {session.title}
                  </h3>
                  {session.description && (
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                      {session.description}
                    </p>
                  )}
                </div>
              </div>

              {/* LISTA DE CLASES DE LA SESIÓN */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {!session.classes || session.classes.length === 0 ? (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.5rem 0' }}>
                    No hay clases programadas en esta sesión.
                  </p>
                ) : (
                  session.classes.map(cls => (
                    <div key={cls.id} style={{
                      padding: '0.85rem 1rem',
                      border: '1px solid var(--border-color)',
                      borderRadius: 'var(--radius-md)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--surface-light)'
                    }}>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                          {cls.title}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                          {cls.class_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <Clock size={12} /> {new Date(cls.class_date).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                          {cls.teacher_profiles?.name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                              <User size={12} /> Prof. {cls.teacher_profiles.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <Link to={`/class/${cls.id}`} className="btn btn-primary" style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem' }}>
                        <PlayCircle size={14} /> Ver Clase
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
