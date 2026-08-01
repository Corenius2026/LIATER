import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { createDoubt, fetchStudentDoubtsForClass } from '../services/doubtService';
import {
  Download, FileText, Video, Calendar, User, ExternalLink,
  Paperclip, Presentation, ArrowLeft, Clock, Award, HelpCircle,
  Send, CheckCircle2, BookOpen, X, Info, AlertCircle, FileCheck,
  MessageSquare, Check
} from 'lucide-react';

export default function ClassDetail() {
  const { id } = useParams();
  const { currentUser } = useAuth();
  
  const [clsData, setClsData] = useState(null);
  const [moduleId, setModuleId] = useState(null);
  const [moduleTitle, setModuleTitle] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS DEL MODAL DE DUDAS Y PERSISTENCIA
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [touched, setTouched] = useState({ subject: false, description: false });
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userDoubts, setUserDoubts] = useState([]);

  const doubtButtonRef = useRef(null);
  const firstInputRef = useRef(null);

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
                setTopic(subData.modules.title);
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

        // 4. Obtener las dudas enviadas previamente por el estudiante en esta clase
        if (currentUser?.id) {
          const { doubts } = await fetchStudentDoubtsForClass(id, currentUser.id);
          setUserDoubts(doubts || []);
        }

      } catch (err) {
        console.error('Error fetching class detail:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchClassDetail();
  }, [id, currentUser?.id]);

  // MANEJO DE ACCESIBILIDAD Y ESCAPE EN EL MODAL DE DUDAS
  const openDoubtModal = () => {
    setIsDoubtModalOpen(true);
    setSubmitError('');
    setSuccessMsg('');
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
  };

  const closeDoubtModal = () => {
    setIsDoubtModalOpen(false);
    setSubmitError('');
    setSuccessMsg('');
    doubtButtonRef.current?.focus();
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isDoubtModalOpen) {
        closeDoubtModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDoubtModalOpen]);

  // VALIDACIÓN DEL FORMULARIO
  const subjectError = touched.subject && !subject.trim()
    ? 'El asunto de la duda es obligatorio.'
    : subject.length > 120
    ? 'El asunto no debe exceder los 120 caracteres.'
    : '';

  const descriptionError = touched.description && !description.trim()
    ? 'La descripción de la duda es obligatoria.'
    : description.length > 1500
    ? 'La descripción no debe exceder los 1500 caracteres.'
    : '';

  const isFormValid = subject.trim().length > 0 &&
                      subject.length <= 120 &&
                      description.trim().length > 0 &&
                      description.length <= 1500;

  // ENVÍO DE LA DUDA A SUPABASE CON MANEJO DE ESTADOS
  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    setTouched({ subject: true, description: true });

    if (!isFormValid || submitting) return;

    if (!currentUser?.id) {
      setSubmitError('Debes iniciar sesión para enviar una duda.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSuccessMsg('');

    const { data, error } = await createDoubt({
      class_id: id,
      module_id: moduleId,
      program_id: clsData?.program_id,
      student_id: currentUser.id,
      teacher_id: clsData?.teacher_id,
      subject,
      description,
      topic
    });

    if (error) {
      setSubmitError('Ocurrió un inconveniente al enviar tu duda. Por favor, intenta de nuevo.');
      setSubmitting(false);
      return;
    }

    // ÉXITO EN INSERCIÓN: Mensaje requerido, limpiar campos y recargar dudas
    setSuccessMsg('Tu duda fue enviada. El docente podrá revisarla para atenderla durante la clase.');
    setSubject('');
    setDescription('');
    setTouched({ subject: false, description: false });
    setSubmitting(false);

    // Actualizar lista de dudas enviadas en la vista
    const { doubts } = await fetchStudentDoubtsForClass(id, currentUser.id);
    setUserDoubts(doubts || []);

    // Cerrar modal automáticamente después de 2 segundos
    setTimeout(() => {
      setIsDoubtModalOpen(false);
      setSuccessMsg('');
    }, 2000);
  };

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

        .doubt-input:focus, .doubt-textarea:focus {
          outline: none;
          border-color: var(--gold-dark, #ca8a04) !important;
          box-shadow: 0 0 0 3px rgba(202, 138, 4, 0.15) !important;
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

          {/* 2. ENVIAR UNA DUDA Y LISTA DE DUDAS REGISTRADAS */}
          <div className="card-placeholder order-dudas">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} color="var(--gold-dark)" /> ¿Tienes una duda sobre esta clase?
              </h3>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 600 }}>
                Atención docente
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
              Envía tu pregunta para que el docente pueda revisarla y atenderla durante la clase.
            </p>

            <button
              ref={doubtButtonRef}
              onClick={openDoubtModal}
              className="btn"
              style={{
                width: '100%',
                background: 'var(--navy)',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
              }}
            >
              <Send size={15} /> Enviar una duda
            </button>

            {/* LISTA DE DUDAS ENVIADAS POR EL ESTUDIANTE EN ESTA CLASE */}
            {userDoubts.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquare size={15} color="var(--gold-dark)" />
                  Mis dudas enviadas ({userDoubts.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {userDoubts.map(doubt => (
                    <div key={doubt.id} style={{
                      padding: '0.65rem 0.85rem',
                      background: 'var(--surface-light)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
                          {doubt.subject}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: doubt.status === 'atendida' ? '#dcfce7' :
                                      doubt.status === 'revisada' ? '#fef3c7' :
                                      doubt.status === 'archivada' ? '#f1f5f9' : '#dbeafe',
                          color: doubt.status === 'atendida' ? '#166534' :
                                 doubt.status === 'revisada' ? '#92400e' :
                                 doubt.status === 'archivada' ? '#475569' : '#1e40af'
                        }}>
                          {doubt.status === 'atendida' ? 'Atendida en clase' :
                           doubt.status === 'revisada' ? 'Revisada' :
                           doubt.status === 'archivada' ? 'Archivada' : 'Enviada'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(doubt.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PREPARACIÓN VISUAL DE ETIQUETAS DE ESTADOS FUTUROS CUANDO NO HAY DUDAS */}
            {userDoubts.length === 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  ESTADOS DE REVISIÓN:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Enviada</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>Revisada</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>Atendida en clase</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>Archivada</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 3. MODAL ACCESIBLE DE ENVÍO DE DUDA */}
      {isDoubtModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={closeDoubtModal}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg, 16px)',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              animation: 'fadeSlideUp 0.25s ease-out',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÓN CERRAR */}
            <button
              type="button"
              onClick={closeDoubtModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            {/* ENCABEZADO DEL MODAL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: 'var(--navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <HelpCircle size={22} color="var(--gold-dark)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Enviar Duda al Docente
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Clase: {clsData.title}
                </span>
              </div>
            </div>

            {/* TEXTO INFORMATIVO REQUERIDO */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #475569)',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold-dark)' }} />
              <span>
                Tu duda será revisada por el docente para ser atendida durante la clase o en el espacio académico correspondiente.
              </span>
            </div>

            {/* MENSAJE DE ÉXITO EXIGIDO TRAS INSERCIÓN */}
            {successMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.83rem',
                color: '#166534',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FileCheck size={18} color="#16a34a" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* MENSAJE DE ERROR AMIGABLE */}
            {submitError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.83rem',
                color: '#991b1b',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} color="#dc2626" />
                <span>{submitError}</span>
              </div>
            )}

            {/* FORMULARIO DE DUDAS */}
            <form onSubmit={handleSubmitDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* 1. ASUNTO DE LA DUDA */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                    Asunto de la duda <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: subject.length > 120 ? '#dc2626' : 'var(--text-muted)' }}>
                    {subject.length} / 120
                  </span>
                </div>
                <input
                  ref={firstInputRef}
                  type="text"
                  className="doubt-input"
                  value={subject}
                  maxLength={120}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (!touched.subject) setTouched(prev => ({ ...prev, subject: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
                  placeholder="Ej: Aclaración sobre la fórmula de rendimiento..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: subjectError ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem'
                  }}
                />
                {subjectError && (
                  <span style={{ fontSize: '0.76rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={13} /> {subjectError}
                  </span>
                )}
              </div>

              {/* 2. DESCRIPCIÓN */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                    Descripción detallada <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: description.length > 1500 ? '#dc2626' : 'var(--text-muted)' }}>
                    {description.length} / 1500
                  </span>
                </div>
                <textarea
                  rows={4}
                  className="doubt-textarea"
                  value={description}
                  maxLength={1500}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (!touched.description) setTouched(prev => ({ ...prev, description: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                  placeholder="Describe en detalle tu consulta o inquietud técnica..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: descriptionError ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
                {descriptionError && (
                  <span style={{ fontSize: '0.76rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={13} /> {descriptionError}
                  </span>
                )}
              </div>

              {/* 3. TEMA RELACIONADO (OPCIONAL) */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                  Tema relacionado (opcional)
                </label>
                <input
                  type="text"
                  className="doubt-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Módulo 1 - Fundamentos"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem'
                  }}
                />
              </div>

              {/* DATOS AUTOMÁTICOS (CONTEXTO INTERNO LISTO PARA SUPABASE) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <span>Docente: <strong>{clsData.teacher_profiles?.name || 'Asignado'}</strong></span>
                <span>Estudiante: <strong>{currentUser?.full_name || 'Autenticado'}</strong></span>
              </div>

              {/* ACCIONES DEL FORMULARIO */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeDoubtModal}
                  className="btn btn-outline"
                  style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="btn"
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: isFormValid && !submitting ? 'var(--navy)' : '#e2e8f0',
                    color: isFormValid && !submitting ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: isFormValid && !submitting ? '0 2px 4px rgba(20, 33, 61, 0.2)' : 'none'
                  }}
                >
                  <Send size={15} /> {submitting ? 'Guardando...' : 'Enviar una duda'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}


