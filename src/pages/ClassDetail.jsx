import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Download, PlayCircle, FileText, Video, Calendar, User, ExternalLink, Paperclip, Presentation } from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  
  const [clsData, setClsData] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassDetail() {
      try {
        // 1. Obtener detalles de la clase y el profesor
        const { data: classData, error: classError } = await supabase
          .from('class_sessions')
          .select('*, teacher_profiles(*)')
          .eq('id', id)
          .single();
        
        if (classError) throw classError;
        setClsData(classData);

        // 2. Obtener el módulo al que pertenece para el botón "Volver"
        if (classData && classData.subtopic_id) {
          const { data: subData } = await supabase
            .from('subtopics')
            .select('module_id')
            .eq('id', classData.subtopic_id)
            .single();
          
          if (subData) {
            setModuleId(subData.module_id);
          }
        }

        // 3. Obtener los recursos de la clase
        const { data: resData, error: resError } = await supabase
          .from('resources')
          .select('*')
          .eq('class_id', id)
          .order('created_at', { ascending: true });
          
        if (resError) {
          console.error('Error fetching resources:', resError);
        } else {
          setResources(resData || []);
        }

      } catch (err) {
        console.error('Error fetching class details:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchClassDetail();
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando detalle de la clase...</h2>
      </div>
    );
  }

  if (!clsData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Clase no encontrada</h2>
        <Link to="/modules" className="btn btn-primary" style={{ marginTop: '1rem' }}>Ir a Módulos</Link>
      </div>
    );
  }

  const teacher = clsData.teacher_profiles || {};
  // Si tiene video_url o la fecha ya pasó, asumimos que no es en vivo próximamente
  const isUpcoming = clsData.class_date ? (new Date(clsData.class_date) > new Date()) : false;
  const hasVideo = !!clsData.video_url;

  // Helper para renderizar iconos según el tipo de recurso
  const renderResourceIcon = (type) => {
    switch(type) {
      case 'presentation': return <Presentation size={18} />;
      case 'pdf': return <FileText size={18} />;
      case 'link': return <ExternalLink size={18} />;
      case 'video': return <Video size={18} />;
      default: return <Paperclip size={18} />; // file genérico
    }
  };

  return (
    <div>
      {/* --- ENCABEZADO DE LA CLASE --- */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        {moduleId ? (
          <Link to={`/modules/${moduleId}`} style={{ color: 'var(--primary-light)', fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
            &larr; Volver al Módulo
          </Link>
        ) : (
          <Link to="/modules" style={{ color: 'var(--primary-light)', fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
            &larr; Volver a Módulos
          </Link>
        )}
        <h1 className="page-title">{clsData.title}</h1>
        {/* Etiqueta que identifica si es sesión en vivo o grabada */}
        <span className="badge" style={{ marginTop: '0.5rem', backgroundColor: isUpcoming ? '#fef3c7' : '#e0e7ff', color: isUpcoming ? '#d97706' : 'var(--primary-color)' }}>
          {isUpcoming ? 'Próximamente en Vivo' : 'Clase Grabada'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
        
        {/* --- COLUMNA PRINCIPAL (REPRODUCTOR O ACCESO A MEET) --- */}
        <div>
          {isUpcoming && !hasVideo ? (
            
            // Render si la clase es EN VIVO próximamente
            <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#f8fafc', border: '2px dashed var(--border-color)', borderRadius: 'var(--radius-lg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <Calendar size={64} style={{ color: 'var(--primary-light)', marginBottom: '1rem' }} />
              <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Esta clase será transmitida en vivo</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                {clsData.class_date ? `Programada para: ${new Date(clsData.class_date).toLocaleString()}` : 'Únete a la sesión a la hora programada.'}
              </p>
              {clsData.meet_url || clsData.meet_link ? (
                <a href={clsData.meet_url || clsData.meet_link} target="_blank" rel="noreferrer" className="btn btn-primary">
                  <Video size={18} /> Entrar a la Sala Virtual
                </a>
              ) : (
                <span className="btn btn-outline" style={{ cursor: 'not-allowed', opacity: 0.7 }}>
                  Enlace disponible pronto
                </span>
              )}
            </div>
            
          ) : (
            
            // Render si la clase está GRABADA (Muestra visor)
            hasVideo ? (
              <a href={clsData.video_url} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none' }}>
                <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#0f172a', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', marginBottom: '1.5rem', position: 'relative', cursor: 'pointer', transition: 'transform 0.2s' }} onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'} onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}>
                  <PlayCircle size={64} style={{ opacity: 0.9, color: 'var(--primary-light)' }} />
                  <span style={{ position: 'absolute', bottom: '1rem', left: '1rem', fontSize: '0.875rem', opacity: 0.8 }}>Clic para abrir grabación externa</span>
                </div>
              </a>
            ) : (
              <div style={{ width: '100%', aspectRatio: '16/9', backgroundColor: '#f1f5f9', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
                <div style={{ textAlign: 'center' }}>
                  <Video size={48} style={{ opacity: 0.5, marginBottom: '1rem', margin: '0 auto' }} />
                  <p>La grabación aún no está disponible.</p>
                </div>
              </div>
            )
            
          )}
          
          {/* Descripción de la clase (desde BD) */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', color: 'var(--text-dark)' }}>Acerca de esta clase</h3>
            <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {clsData.description || 'No hay descripción disponible para esta clase.'}
            </p>
          </div>
        </div>
        
        {/* --- COLUMNA SECUNDARIA (PROFESOR Y MATERIALES) --- */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Ficha del Profesor */}
          {teacher.name && (
            <div className="card">
              <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Profesor</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                {teacher.photo_url || teacher.photo ? (
                  <img src={teacher.photo_url || teacher.photo} alt={teacher.name} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <User size={24} />
                  </div>
                )}
                <div>
                  <h4 style={{ fontWeight: 600 }}>{teacher.name}</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{teacher.area || 'Docente'}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Recursos Complementarios */}
          <div className="card">
            <h3 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>Materiales de clase</h3>
            
            {/* Si existe el campo presentation_url en class_sessions (legado) */}
            {clsData.presentation_url && (
              <a href={clsData.presentation_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: '0.5rem' }}>
                <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Presentation size={18} /> Presentación (Principal)</span>
                  <Download size={18} />
                </button>
              </a>
            )}

            {/* Renderizar todos los recursos de la tabla resources */}
            {resources.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {resources.map(resource => (
                  <a key={resource.id} href={resource.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                    <button className="btn btn-outline" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', padding: '1rem', cursor: 'pointer', backgroundColor: 'var(--bg-color)', border: 'none' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-dark)', fontSize: '0.875rem' }}>
                        {renderResourceIcon(resource.type)} {resource.title}
                      </span>
                      {resource.type === 'link' || resource.type === 'video' ? <ExternalLink size={16} /> : <Download size={16} />}
                    </button>
                  </a>
                ))}
              </div>
            ) : (
              !clsData.presentation_url && (
                <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  No hay recursos complementarios disponibles.
                </p>
              )
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
}
