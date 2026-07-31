import React, { useState } from 'react';
import { 
  PlayCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  MessageSquare, 
  Download, 
  FileText, 
  Lock, 
  MonitorPlay,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const MOCK_DATA = {
  courseTitle: "Sistemas Fotovoltaicos Avanzados",
  progress: 35,
  subtopics: [
    {
      id: 1,
      title: "Tema 1: Fundamentos de EnergÃ­a Solar",
      classes: [
        { id: 101, title: "Clase 1: IntroducciÃ³n a la RadiaciÃ³n Solar", duration: "1h 45m", date: "02 de Oct", type: "video", completed: true, isCurrent: false },
        { id: 102, title: "Clase 2: Tipos de Paneles Fotovoltaicos", duration: "2h 10m", date: "04 de Oct", type: "video", completed: true, isCurrent: false },
        { id: 103, title: "Material de Apoyo", duration: "PDF", type: "document", completed: true, isCurrent: false },
      ]
    },
    {
      id: 2,
      title: "Tema 2: DiseÃ±o y Dimensionamiento",
      classes: [
        { id: 201, title: "Clase 3: CÃ¡lculo de Consumo EnergÃ©tico", duration: "2h 05m", date: "09 de Oct", type: "video", completed: false, isCurrent: true },
        { id: 202, title: "Clase 4: SelecciÃ³n de Inversores", duration: "PrÃ³ximamente", date: "11 de Oct", type: "video", completed: false, isCurrent: false, locked: true },
      ]
    },
    {
      id: 3,
      title: "Tema 3: InstalaciÃ³n y Mantenimiento",
      classes: [
        { id: 301, title: "Clase 5: Normativas de Seguridad", duration: "PrÃ³ximamente", date: "16 de Oct", type: "video", completed: false, isCurrent: false, locked: true },
      ]
    }
  ],
  currentClass: {
    title: "Clase 3: CÃ¡lculo de Consumo EnergÃ©tico (GrabaciÃ³n)",
    description: "GrabaciÃ³n de la sesiÃ³n virtual en vivo del 09 de Octubre. En esta clase aprendimos a calcular el consumo energÃ©tico de una vivienda o comercio para dimensionar adecuadamente el sistema fotovoltaico. Discutimos conceptos de potencia nominal, horas pico solar y respondimos las dudas en vivo.",
    teacher: {
      name: "Ing. Roberto MartÃ­nez",
      avatar: "https://i.pravatar.cc/150?img=11"
    }
  }
};

export default function CourseViewerMock() {
  const navigate = useNavigate();
  const [expandedSubtopics, setExpandedSubtopics] = useState([2]); // El subtema 2 estÃ¡ expandido por defecto
  const [activeTab, setActiveTab] = useState('resumen');

  const toggleSubtopic = (id) => {
    if (expandedSubtopics.includes(id)) {
      setExpandedSubtopics(expandedSubtopics.filter(subId => subId !== id));
    } else {
      setExpandedSubtopics([...expandedSubtopics, id]);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      
      {/* HEADER TOP BAR */}
      <div style={{ height: '60px', backgroundColor: '#1e293b', borderBottom: '1px solid #334155', display: 'flex', alignItems: 'center', padding: '0 1.5rem', justifyContent: 'space-between', color: '#f8fafc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/portal')} 
            style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <ArrowLeft size={20} />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Volver</span>
          </button>
          <div style={{ height: '24px', width: '1px', backgroundColor: '#334155' }}></div>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>{MOCK_DATA.courseTitle}</h1>
        </div>
        
        {/* Progreso Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Tu Progreso</span>
            <div style={{ width: '120px', height: '6px', backgroundColor: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${MOCK_DATA.progress}%`, height: '100%', backgroundColor: '#10b981', borderRadius: '3px' }}></div>
            </div>
          </div>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>{MOCK_DATA.progress}%</span>
        </div>
      </div>

      {/* MAIN CONTENT SPLIT */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        
        {/* LEFT / CENTER: Video & Content */}
        <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#0f172a' }}>
          {/* VIDEO PLAYER AREA */}
          <div style={{ width: '100%', backgroundColor: '#000', aspectRatio: '16/9', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {/* SimulaciÃ³n del reproductor */}
            <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.8))', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
              <button style={{ 
                width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(99, 102, 241, 0.9)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer',
                boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)', transition: 'transform 0.2s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.1)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              >
                <PlayCircle size={40} color="white" style={{ marginLeft: '4px' }} />
              </button>
            </div>
            {/* Controls overlay sim */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '1rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ width: '100%', height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: '2px', position: 'absolute', top: 0, left: 0 }}>
                <div style={{ width: '35%', height: '100%', backgroundColor: '#6366f1', borderRadius: '2px' }}></div>
              </div>
              <span style={{ color: 'white', fontSize: '0.85rem', marginTop: '8px', fontWeight: 500 }}>GrabaciÃ³n de SesiÃ³n en Vivo (2h 05m)</span>
            </div>
          </div>

          {/* TABS & CLASS INFO */}
          <div style={{ padding: '2rem 3rem', maxWidth: '1000px', margin: '0 auto' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.5rem' }}>
              {MOCK_DATA.currentClass.title}
            </h2>

            {/* Custom Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #334155', marginBottom: '2rem', gap: '2rem' }}>
              {[
                { id: 'resumen', label: 'Resumen', icon: <FileText size={18} /> },
                { id: 'recursos', label: 'Recursos', icon: <Download size={18} /> },
                { id: 'discusion', label: 'DiscusiÃ³n', icon: <MessageSquare size={18} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.75rem 0', background: 'transparent', border: 'none',
                    borderBottom: activeTab === tab.id ? '3px solid #6366f1' : '3px solid transparent',
                    color: activeTab === tab.id ? '#f8fafc' : '#94a3b8',
                    fontWeight: activeTab === tab.id ? 600 : 500,
                    fontSize: '1rem', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT */}
            <div style={{ color: '#cbd5e1', lineHeight: '1.7', fontSize: '1rem' }}>
              {activeTab === 'resumen' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '8px' }}>
                    <img src={MOCK_DATA.currentClass.teacher.avatar} alt="Profesor" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profesor</div>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{MOCK_DATA.currentClass.teacher.name}</div>
                    </div>
                  </div>
                  <p>{MOCK_DATA.currentClass.description}</p>
                </div>
              )}
              {activeTab === 'recursos' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <p style={{ marginBottom: '1rem' }}>Archivos adjuntos a esta clase:</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FileText color="#6366f1" size={24} />
                        <span>PresentaciÃ³n_Calculo_Consumo.pdf</span>
                      </div>
                      <button style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={16} /> Descargar
                      </button>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <FileText color="#10b981" size={24} />
                        <span>Plantilla_Excel_Dimensionamiento.xlsx</span>
                      </div>
                      <button style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Download size={16} /> Descargar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {activeTab === 'discusion' && (
                <div style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', flexShrink: 0 }}>
                      TÃš
                    </div>
                    <div style={{ flex: 1 }}>
                      <textarea 
                        placeholder="Escribe un comentario o pregunta sobre esta clase..."
                        style={{ width: '100%', padding: '1rem', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', minHeight: '100px', resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
                          Publicar Comentario
                        </button>
                      </div>
                    </div>
                  </div>
                  <hr style={{ borderColor: '#334155', margin: '2rem 0' }} />
                  <p style={{ textAlign: 'center', color: '#64748b' }}>No hay comentarios aÃºn. Â¡SÃ© el primero en participar!</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR: Curriculum */}
        <div style={{ width: '380px', backgroundColor: '#1e293b', borderLeft: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1.5rem', borderBottom: '1px solid #334155' }}>
            <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem', fontWeight: 600 }}>Contenido del Curso</h3>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {MOCK_DATA.subtopics.map(subtopic => (
              <div key={subtopic.id} style={{ borderBottom: '1px solid #334155' }}>
                
                {/* Accordion Header */}
                <button 
                  onClick={() => toggleSubtopic(subtopic.id)}
                  style={{ 
                    width: '100%', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: expandedSubtopics.includes(subtopic.id) ? '#0f172a' : 'transparent', border: 'none', cursor: 'pointer',
                    color: '#f8fafc', textAlign: 'left', transition: 'background 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '1rem' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{subtopic.title}</span>
                  </div>
                  {expandedSubtopics.includes(subtopic.id) ? <ChevronUp size={20} color="#94a3b8" /> : <ChevronDown size={20} color="#94a3b8" />}
                </button>

                {/* Accordion Body (Classes) */}
                {expandedSubtopics.includes(subtopic.id) && (
                  <div style={{ backgroundColor: '#1e293b' }}>
                    {subtopic.classes.map((cls, idx) => (
                      <div 
                        key={cls.id}
                        style={{ 
                          padding: '1rem 1.5rem 1rem 3rem', display: 'flex', gap: '1rem', cursor: cls.locked ? 'not-allowed' : 'pointer',
                          backgroundColor: cls.isCurrent ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                          borderLeft: cls.isCurrent ? '3px solid #6366f1' : '3px solid transparent',
                          transition: 'background 0.2s',
                          opacity: cls.locked ? 0.6 : 1
                        }}
                      >
                        <div style={{ paddingTop: '2px' }}>
                          {cls.completed ? (
                            <CheckCircle2 size={18} color="#10b981" />
                          ) : cls.locked ? (
                            <Lock size={18} color="#64748b" />
                          ) : (
                            <MonitorPlay size={18} color={cls.isCurrent ? '#6366f1' : '#94a3b8'} />
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: cls.isCurrent ? '#f8fafc' : (cls.locked ? '#64748b' : '#cbd5e1'),
                            fontWeight: cls.isCurrent ? 600 : 400
                          }}>
                            {cls.title}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                            {cls.type === 'video' && <span>GrabaciÃ³n â€¢ {cls.duration}</span>}
                            {cls.type === 'document' && <span>Recurso â€¢ {cls.duration}</span>}
                            {cls.date && <span style={{ marginLeft: '4px' }}>| {cls.date}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Inject Keyframes for animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}


