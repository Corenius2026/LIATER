import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BookOpen, PlayCircle, Clock, Video, User } from 'lucide-react';
import { formatClassDate, isUpcomingClass } from '../utils/dateUtils';

export default function ModuleDetail() {
  const { id } = useParams();
  
  const [moduleData, setModuleData] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModuleData() {
      try {
        // 1. Obtener los datos del mÃ³dulo
        const { data: modData, error: modError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', id)
          .single();
        
        if (modError) throw modError;
        setModuleData(modData);

        // 2. Obtener los subtemas
        const { data: subData, error: subError } = await supabase
          .from('subtopics')
          .select('*')
          .eq('module_id', id)
          .order('order_index', { ascending: true });
        
        if (subError) throw subError;

        let subtopicsWithClasses = subData || [];

        // 3. Obtener las clases si hay subtemas
        if (subtopicsWithClasses.length > 0) {
          const subtopicIds = subtopicsWithClasses.map(s => s.id);
          
          // Hacemos un JOIN simple con teacher_profiles para sacar el nombre
          const { data: classesData, error: classesError } = await supabase
            .from('class_sessions')
            .select('*, teacher_profiles(name)')
            .in('subtopic_id', subtopicIds)
            .order('order_index', { ascending: true });

          if (classesError) throw classesError;

          // Agrupamos las clases dentro de su respectivo subtema
          subtopicsWithClasses = subtopicsWithClasses.map(sub => ({
            ...sub,
            classes: (classesData || []).filter(c => c.subtopic_id === sub.id)
          }));
        }

        setSubtopics(subtopicsWithClasses);
        
      } catch (err) {
        console.error('Error fetching module details:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchModuleData();
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando detalle del mÃ³dulo...</h2>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Link to="/portal" className="btn btn-primary" style={{ marginTop: '1rem' }}>Volver al Portal</Link>
      </div>
    );
  }

  // isUpcomingClass helper is imported from dateUtils

  return (
    <div>
      {/* --- ENCABEZADO DEL MÃ“DULO --- */}
      <div className="page-header">
        {localStorage.getItem('activeProgramType') !== 'curso' && (
          <Link to={`/modules/${moduleData.program_id}`} style={{ color: 'var(--primary-light)', fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
            &larr; Volver a MÃ³dulos
          </Link>
        )}
        <h1 className="page-title">{localStorage.getItem('activeProgramType') === 'curso' ? 'Temario del Curso' : moduleData.title}</h1>
        <p className="page-description">{moduleData.description}</p>
      </div>

      {/* --- LISTA DE SUBTEMAS Y SUS CLASES --- */}
      {subtopics.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay subtemas disponibles para este mÃ³dulo.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {subtopics.map((subtopic, index) => (
            <div key={subtopic.id} style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
              
              {/* --- Cabecera del Subtema --- */}
              <div style={{ padding: '1.5rem', backgroundColor: '#f8fafc', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '1.25rem', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                    {subtopic.title}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>
                    {subtopic.description}
                  </p>
                </div>
              </div>

              {/* --- Lista de Clases del Subtema --- */}
              <div style={{ padding: '0' }}>
                {!subtopic.classes || subtopic.classes.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    No hay clases programadas para este subtema.
                  </div>
                ) : (
                  subtopic.classes.map((cls, clsIndex) => (
                    <div key={cls.id} style={{ padding: '1.25rem 1.5rem', borderBottom: clsIndex !== subtopic.classes.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      
                      {/* Info de la clase */}
                      <div style={{ flex: 1, paddingRight: '1rem' }}>
                        <h4 style={{ fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                          {cls.title}
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                          {cls.description}
                        </p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                          {cls.class_date && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <Clock size={14} /> {formatClassDate(cls.class_date)}
                            </span>
                          )}
                          {cls.duration && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              â³ {cls.duration} min
                            </span>
                          )}
                          {cls.teacher_profiles && cls.teacher_profiles.name && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                              <User size={14} /> {cls.teacher_profiles.name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* BotÃ³n dinÃ¡mico */}
                      {isUpcomingClass(cls.class_date) || (!cls.video_url && !cls.presentation_url) ? (
                        <Link to={`/class/${cls.id}`} className="btn btn-outline" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                          <Video size={16} /> PrÃ³xima
                        </Link>
                      ) : (
                        <Link to={`/class/${cls.id}`} className="btn btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                          <PlayCircle size={16} /> Ver Clase
                        </Link>
                      )}

                    </div>
                  ))
                )}
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

