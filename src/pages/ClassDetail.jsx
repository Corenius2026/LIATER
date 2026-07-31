import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Download, PlayCircle, FileText, Video, Calendar, User, ExternalLink, Paperclip, Presentation, ArrowLeft, Clock } from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  
  const [clsData, setClsData] = useState(null);
  const [moduleId, setModuleId] = useState(null);
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

        // 2. Obtener el módulo al que pertenece para el botón "Volver"
        if (classData && classData.subtopic_id) {
          const { data: subData } = await supabase
            .from('subtopics')
            .select('module_id')
            .eq('id', classData.subtopic_id)
            .maybeSingle();
          
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
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>
      {/* BOTÓN DE RETORNO */}
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to={moduleId ? `/module/${moduleId}` : '/portal'} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
          <ArrowLeft size={14} /> {moduleId ? 'Volver al Módulo' : 'Volver al Portal'}
        </Link>
      </div>

      {/* HEADER DE LA CLASE */}
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">{clsData.title}</h1>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {clsData.class_date && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={16} color="var(--gold-dark)" />
              {new Date(clsData.class_date).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {clsData.teacher_profiles?.name && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={16} color="var(--navy)" />
              Docente: <strong>{clsData.teacher_profiles.name}</strong>
            </span>
          )}
        </div>
      </div>

      {/* VIDEO / TRANSMISIÓN */}
      <div className="card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Video size={20} color="var(--gold-dark)" /> Grabación / Transmisión de la Clase
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
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-lg)', border: '1px border-color' }}>
            <Video size={40} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
            <h4 style={{ color: 'var(--navy)', marginBottom: '0.25rem' }}>Grabación no disponible aún</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              El video de esta sesión estará disponible una vez finalizada la transmisión.
            </p>
          </div>
        )}
      </div>

      {/* MATERIALES Y RECURSOS */}
      <div className="card">
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Paperclip size={20} color="var(--navy)" /> Recursos y Material de Estudio ({resources.length})
        </h3>

        {resources.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '1.5rem 0' }}>
            No hay archivos ni recursos adicionales cargados para esta clase.
          </p>
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
    </div>
  );
}
