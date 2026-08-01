import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import {
  Download, FileText, Video, Calendar, User, ExternalLink,
  Paperclip, Presentation, ArrowLeft, Clock, Award, HelpCircle,
  Send, CheckCircle2, BookOpen
} from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  
  const [clsData, setClsData] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [moduleTitle, setModuleTitle] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClassDetail() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // 1. Obtener detalles de la clase y el profesor
        const { data: classData, error: classError } = await supabase
          .from('class_sessions')
          .select('*, teacher_profiles(*)')
          .eq('id', id)
          .maybeSingle();
        
        if (classError) console.error('Error fetching class session:', classError);
        setClsData(classData);

        // 2. Obtener el módulo y su nombre para el encabezado y botón "Volver"
        if (classData) {
          if (classData.subtopic_id) {
            const { data: subData } = await supabase
              .from('subtopics')
              .select('module_id, modules(title)')
              .eq('id', classData.subtopic_id)
              .maybeSingle();
            
            if (subData) {
              setModuleId(subData.module_id);
              if (subData.modules?.title) {
                setModuleTitle(subData.modules.title);
              }
            }
          }

          if (classData.program_id) {
            const { data: progData } = await supabase
              .from('diploma_programs')
              .select('program_type')
              .eq('id', classData.program_id)
              .maybeSingle();

            localStorage.setItem('activeProgramId', classData.program_id);
            if (progData?.program_type) {
              localStorage.setItem('activeProgramType', progData.program_type);
            }
            window.dispatchEvent(new Event('programContextChanged'));
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
        console.error('Error fetching class detail:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchClassDetail();
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
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', animation: 'fadeSlideUp 0.35s ease-out' }}>
        <h2>Clase no encontrada</h2>
        <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>La sesión solicitada no existe o fue cancelada.</p>
        <Link to="/portal" className="btn btn-primary">
          <ArrowLeft size={16} /> Volver al Portal
        </Link>
      </div>
    );
  }

  const getResourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={18} color="#dc2626" />;
      case 'presentation': return <Presentation size={18} color="var(--navy)" />;
      case 'link': return <ExternalLink size={18} color="var(--green-600)" />;
      default: return <Paperclip size={18} color="#ca8a04" />;
    }
  };

  return (
    <div className="class-detail-container">
      <style>{`
        .class-detail-container {
          animation: fadeSlideUp 0.35s ease-out;
        }
        .class-detail-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
        }
        .class-detail-main {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .class-detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .card-placeholder {
          background: #ffffff;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        @media (max-width: 991px) {
          .class-detail-grid {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .class-detail-main, .class-detail-sidebar {
            display: contents;
          }
          .order-progreso { order: 1; }
          .order-grabacion { order: 2; }
          .order-recursos { order: 3; }
          .order-actividad { order: 4; }
          .order-dudas { order: 5; }
        }
      `}</style>

      {/* 1. ENCABEZADO DE LA CLASE */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to={moduleId ? `/module/${moduleId}` : '/portal'} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> {moduleId ? 'Volver al Módulo' : 'Volver al Portal'}
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', margin: '0 0 0.6rem 0', lineHeight: 1.25 }}>
          {clsData.title}
        </h1>

        {/* METADATOS LIMPIOS (SIN TARJETA PESADA) */}
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.84rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
          {clsData.class_date && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} color="var(--gold-dark)" />
              {new Date(clsData.class_date).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {clsData.teacher_profiles?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="var(--gold-dark)" />
              Docente: <strong style={{ color: 'var(--navy)' }}>{clsData.teacher_profiles.name}</strong>
            </span>
          )}
          {moduleTitle && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={15} color="var(--gold-dark)" />
              Módulo: <strong style={{ color: 'var(--navy)' }}>{moduleTitle}</strong>
            </span>
          )}
          {clsData.duration && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color="var(--gold-dark)" />
              {clsData.duration} min
            </span>
          )}
          {(clsData.status || clsData.video_url) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
              background: clsData.status === 'completed' || clsData.video_url ? '#f0fdf4' : '#f1f5f9',
              color: clsData.status === 'completed' || clsData.video_url ? '#166534' : '#475569'
            }}>
              {clsData.status === 'completed' || clsData.video_url ? 'Finalizada' : 'Programada'}
            </span>
          )}
        </div>
      </div>

      {/* 2. CUADRÍCULA PRINCIPAL (DESKTOP: 2 COLUMNAS / MOBILE: 1 COLUMNA ORDENADA) */}
      <div className="class-detail-grid">
        
        {/* COLUMNA PRINCIPAL (68% - 72%) */}
        <div className="class-detail-main">

          {/* 1. GRABACIÓN / TRANSMISIÓN */}
          <div className="card-placeholder order-grabacion">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color="var(--gold-dark)" /> Grabación / Transmisión de la Clase
            </h3>

            {clsData.video_url ? (
              <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: '#000' }}>
                <iframe
                  src={clsData.video_url}
                  title={clsData.title}
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
                  allowFullScreen
                />
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '1.75rem 1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Video size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: 'var(--navy)', marginBottom: '0.2rem', fontSize: '0.92rem', fontWeight: 600 }}>Grabación no disponible aún</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  El video de esta sesión estará disponible una vez finalizada la transmisión.
                </p>
              </div>
            )}
          </div>

          {/* 2. RECURSOS Y MATERIAL DE ESTUDIO */}
          <div className="card-placeholder order-recursos">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={18} color="var(--gold-dark)" /> Recursos y Material de Estudio ({resources.length})
            </h3>

            {resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.25rem 1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)' }}>
                <Paperclip size={24} color="var(--text-muted)" style={{ marginBottom: '0.35rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  No hay archivos ni recursos adicionales cargados para esta clase.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resources.map(res => (
                  <div key={res.id} style={{
                    padding: '0.85rem 1.25rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ padding: '0.5rem', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        {getResourceIcon(res.type)}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.88rem', margin: 0 }}>{res.title}</h4>
                        {res.description && <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{res.description}</p>}
                      </div>
                    </div>

                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>
                      <Download size={14} /> Descargar / Abrir
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. PLACEHOLDER DE ACTIVIDAD DE REFORZAMIENTO */}
          <div className="card-placeholder order-actividad">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="var(--gold-dark)" /> Actividad de reforzamiento
              </h3>
              <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 500 }}>
                Actividad aún no configurada
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.45 }}>
              Comprueba tu comprensión de los temas abordados en esta clase.
            </p>
          </div>

        </div>

        {/* COLUMNA LATERAL (28% - 32%) */}
        <div className="class-detail-sidebar">

          {/* 1. PLACEHOLDER DE PROGRESO DE LA CLASE */}
          <div className="card-placeholder order-progreso">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
              <CheckCircle2 size={18} color="var(--gold-dark)" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                Progreso de la clase
              </h3>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.85rem 0', lineHeight: 1.45 }}>
              La actividad de reforzamiento aún no está disponible.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 500 }}>Avance de la sesión</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)' }}>0%</span>
            </div>
            <div style={{ height: '7px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ width: '0%', height: '100%', background: 'var(--gold-dark)', transition: 'width 0.3s ease' }} />
            </div>
          </div>

          {/* 2. PLACEHOLDER DE ENVIAR UNA DUDA */}
          <div className="card-placeholder order-dudas">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} color="var(--gold-dark)" /> ¿Tienes una duda sobre esta clase?
              </h3>
              <span style={{ background: '#fef3c7', color: '#92400e', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 600 }}>
                Disponible próximamente
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
              Envía tu pregunta para que el docente pueda revisarla y atenderla durante la clase.
            </p>

            <button disabled className="btn" style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed', background: '#f1f5f9', color: '#64748b', border: '1px solid #cbd5e1', padding: '0.55rem 1rem', fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem', borderRadius: '8px' }}>
              <Send size={15} /> Enviar una duda
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

