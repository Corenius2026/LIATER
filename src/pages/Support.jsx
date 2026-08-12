import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageSquare, ChevronDown } from 'lucide-react';
import { supportConfig } from '../config/supportConfig';
import { useAuth } from '../context/AuthContext';

export default function Support() {
  const [openIndex, setOpenIndex] = useState(null);
  const { currentUser } = useAuth();

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const teacherFaqs = [
    {
      question: '¿Cómo enlazo una clase grabada de YouTube a mi sesión?',
      answer: 'Dirígete a la pestaña "Agenda", selecciona una clase pasada y haz clic en "Enlazar grabación". Pega el enlace de YouTube y define los minutos exactos de inicio y fin. La grabación estará disponible inmediatamente para tus estudiantes.'
    },
    {
      question: '¿Cómo se calcula el Score Promedio de mis estudiantes?',
      answer: 'El promedio se calcula considerando los cuestionarios realizados y los vencidos no realizados. Si un estudiante realiza varios intentos en una misma actividad, el sistema siempre toma en cuenta su puntaje más alto para no penalizar la práctica.'
    },
    {
      question: '¿Por qué algunos estudiantes aparecen "En riesgo" en la analítica?',
      answer: 'El estado "En riesgo" se activa automáticamente si un estudiante ha completado menos del 50% de las actividades publicadas hasta la fecha, o si su promedio de calificaciones actual es inferior al 60%.'
    },
    {
      question: '¿Cómo respondo a las dudas enviadas durante mis clases?',
      answer: 'Todas las consultas académicas enviadas por los estudiantes desde el aula virtual se recopilan en tu pestaña "Consultas". Desde allí puedes filtrar por programa y marcar las dudas como resueltas a medida que las atiendas.'
    },
    {
      question: '¿Cómo habilito un cuestionario de reforzamiento en una clase?',
      answer: 'En tu panel de "Clases y Actividades", busca la clase deseada y haz clic en "Nueva Actividad". Podrás redactar o cargar preguntas, establecer límites de tiempo e intentos, y marcar la actividad como obligatoria para el avance.'
    },
    {
      question: '¿Qué hago si una clase asignada no aparece en mi panel?',
      answer: 'Verifica primero tener seleccionado el programa académico correcto en el selector de la parte superior (Mis Programas). Si el problema continúa, comunícate con la administración para revisar tu carga docente.'
    }
  ];

  const studentFaqs = [
    {
      question: '¿Qué son las actividades de reforzamiento?',
      answer: 'Son cuestionarios o ejercicios habilitados por tu profesor para comprobar tu entendimiento sobre el tema de una clase reciente. Suelen ser obligatorios para tu avance académico.'
    },
    {
      question: '¿Por qué tengo una actividad pendiente que ya hice?',
      answer: 'Si una actividad permite múltiples intentos, seguirá apareciendo en tu panel hasta que envíes todos los intentos disponibles o hasta que cierre su fecha límite. ¡Pero no te preocupes! El sistema guarda tu intento más alto.'
    },
    {
      question: '¿Cómo sé cuál es mi calificación y en qué fallé?',
      answer: 'Puedes revisar tus puntajes en la sección "Mis Resultados". Si el profesor habilitó la revisión, también podrás ver el detalle de en qué preguntas acertaste o te equivocaste haciendo clic en el detalle.'
    },
    {
      question: '¿Cómo funciona la racha de estudio?',
      answer: 'Mantén un avance continuo enviando al menos una actividad o entregable cada semana para aumentar tu racha. Si dejas pasar una semana sin entregar nada, la racha se reiniciará a cero.'
    },
    {
      question: '¿Dónde puedo resolver dudas académicas de una clase?',
      answer: 'Dentro de la página donde ves la grabación o los detalles de cada clase, encontrarás un área de comentarios en la parte inferior. Si envías tu duda allí, le llegará directamente al profesor de esa sesión.'
    },
    {
      question: 'No me aparece un programa o diplomado al que me inscribí',
      answer: 'En la parte superior, revisa el selector "Mis Programas". Si no lo ves allí, asegúrate de que estás ingresando con el correo con el que te registraste, y de lo contrario comunícate con soporte.'
    }
  ];
  const adminFaqs = [
    {
      question: '¿Cómo creo un nuevo programa o curso?',
      answer: 'Desde la sección de Panorama General, puedes utilizar el acceso rápido "Nuevo Programa" para abrir el formulario de creación y definir el título, descripción y tipo de programa.'
    },
    {
      question: '¿Cómo activo o desactivo un programa?',
      answer: 'Puedes hacerlo desde el menú de opciones (tres puntos) en la tarjeta del programa en tu panel de Panorama General, y usar el interruptor "Estado de publicación" para cambiarlo a Publicado o Borrador.'
    },
    {
      question: '¿Cómo envío una comunicación masiva?',
      answer: 'Dirígete a la pestaña de "Comunicaciones" y selecciona "Redactar Nuevo Mensaje". Podrás elegir enviar un mensaje a todos los estudiantes de un programa específico o buscar usuarios particulares.'
    },
    {
      question: '¿Cómo gestiono las cuentas de estudiantes y profesores?',
      answer: 'En la sección de "Gestión de Usuarios" puedes buscar a cualquier usuario registrado, visualizar sus datos, y editar su rol o información básica utilizando las acciones disponibles en la tabla.'
    },
    {
      question: '¿Cómo puedo monitorear las clases en vivo?',
      answer: 'En tu Panorama General, los programas que tengan una clase activa en este momento mostrarán un indicador rojo de "En vivo" junto con un botón para que puedas unirte a la sesión como observador.'
    },
    {
      question: '¿Qué hago si necesito asistencia técnica avanzada?',
      answer: 'Para configuraciones del sistema, problemas de acceso, o dudas complejas de la plataforma, utiliza nuestros canales directos de "Envíanos un correo" o "Asistencia rápida" situados en la parte superior.'
    }
  ];

  const faqs = currentUser?.role === 'admin' ? adminFaqs : (currentUser?.role === 'teacher' ? teacherFaqs : studentFaqs);

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', animation: 'fadeSlideUp 0.35s ease-out' }}>
      
      {/* ENCABEZADO */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Soporte técnico
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.5 }}>
          {currentUser?.role === 'teacher' || currentUser?.role === 'admin' 
            ? 'Encuentra ayuda para resolver problemas de acceso, funcionamiento y gestión de tus clases dentro del portal.'
            : 'Encuentra ayuda para resolver problemas de acceso, funcionamiento y dudas sobre tus clases dentro del portal.'}
        </p>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        
        {/* TARJETAS DE CANALES DE CONTACTO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          
          {/* TARJETA DE CORREO */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.75rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" width="28" height="28" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--navy)' }}>
              Envíanos un correo
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.45, minHeight: '2.6rem' }}>
              Reporta inconvenientes técnicos o solicita apoyo con el funcionamiento del portal.
            </p>

            {supportConfig.supportEmail ? (
              <a 
                href={`mailto:${supportConfig.supportEmail}`} 
                className="btn" 
                style={{ 
                  background: 'var(--navy)', 
                  color: 'var(--white)', 
                  border: 'none', 
                  width: '100%', 
                  fontWeight: 700, 
                  fontSize: '0.875rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                {supportConfig.supportEmail}
              </a>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-light)', padding: '0.5rem 1rem', borderRadius: '6px', width: '100%' }}>
                Canal de correo pendiente de configuración.
              </span>
            )}
          </div>

          {/* TARJETA DE WHATSAPP / ASISTENCIA RÁPIDA */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '1.75rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.05)', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" width="28" height="28" />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--navy)' }}>
              Asistencia rápida
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.25rem', lineHeight: 1.45, minHeight: '2.6rem' }}>
              Consulta inconvenientes urgentes relacionados con el acceso o funcionamiento de la plataforma.
            </p>

            {supportConfig.supportWhatsApp ? (
              <a 
                href={supportConfig.supportWhatsApp} 
                target="_blank" 
                rel="noreferrer" 
                className="btn" 
                style={{ 
                  background: '#16a34a', 
                  color: 'white', 
                  border: 'none', 
                  width: '100%', 
                  fontWeight: 700, 
                  fontSize: '0.875rem',
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  textDecoration: 'none',
                  display: 'inline-block'
                }}
              >
                Abrir WhatsApp
              </a>
            ) : (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-light)', padding: '0.5rem 1rem', borderRadius: '6px', width: '100%' }}>
                Canal de asistencia pendiente de configuración.
              </span>
            )}
          </div>

        </div>


        {/* FAQ - PREGUNTAS FRECUENTES ACORDEÓN */}
        <div className="card" style={{ padding: '2rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <HelpCircle size={22} color="var(--navy)" />
            <h2 style={{ fontSize: '1.25rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
              Preguntas Frecuentes
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {faqs.map((faq, index) => {
              const isOpen = openIndex === index;
              return (
                <div 
                  key={index} 
                  style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    overflow: 'hidden',
                    transition: 'all 0.2s ease',
                    background: isOpen ? 'var(--bg-light)' : 'var(--white)'
                  }}
                >
                  <button 
                    onClick={() => toggleFaq(index)}
                    style={{ 
                      width: '100%', 
                      padding: '1rem 1.25rem', 
                      display: 'flex', 
                      justify: 'space-between', 
                      alignItems: 'center', 
                      background: 'transparent',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      gap: '1rem'
                    }}
                  >
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--navy)', lineHeight: 1.4 }}>
                      {faq.question}
                    </span>
                    <ChevronDown 
                      size={18} 
                      color="var(--navy)" 
                      style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 0.2s ease',
                        flexShrink: 0 
                      }} 
                    />
                  </button>
                  {isOpen && (
                    <div style={{ padding: '0 1.25rem 1.25rem 1.25rem', borderTop: '1px solid rgba(20,33,61,0.06)' }}>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: '0.75rem 0 0 0', lineHeight: 1.55 }}>
                        {faq.answer}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
