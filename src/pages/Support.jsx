import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, MessageSquare, ChevronDown } from 'lucide-react';
import { supportConfig } from '../config/supportConfig';

export default function Support() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const faqs = [
    {
      question: '¿Cómo puedo recuperar mi contraseña?',
      answer: 'En la pantalla de inicio de sesión selecciona ‘¿Olvidaste tu contraseña?’. Recibirás un enlace de recuperación en el correo asociado a tu cuenta. Si no recibes el mensaje, revisa la carpeta de correo no deseado o comunícate con soporte.'
    },
    {
      question: '¿Qué hago si una clase asignada no aparece en mi panel?',
      answer: 'Verifica primero el programa y la fecha de la clase. Si continúa sin aparecer, comunícate con la administración de LIATER, ya que la asignación de programas y clases es gestionada por el equipo administrador.'
    },
    {
      question: '¿Qué hago si no puedo abrir un programa o una clase?',
      answer: 'Actualiza la página e intenta ingresar nuevamente. Si el problema continúa, reporta el nombre del programa, la clase afectada y una captura del error al equipo de soporte.'
    },
    {
      question: '¿Por qué no aparecen dudas de estudiantes?',
      answer: 'Las dudas solo aparecerán cuando un estudiante las envíe desde una clase asignada al profesor. También verifica que estés consultando el programa y la clase correctos.'
    },
    {
      question: '¿Qué hago si un anuncio no se publica?',
      answer: 'Comprueba que el título y el contenido estén completos. Si la plataforma muestra un error o el anuncio no aparece después de guardar, contacta a soporte indicando el programa afectado.'
    },
    {
      question: '¿Cómo reporto un problema con una grabación o material?',
      answer: 'Indica el nombre del programa, módulo, clase y recurso afectado. Incluye una captura o una breve descripción del problema para facilitar la revisión.'
    }
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto', animation: 'fadeSlideUp 0.35s ease-out' }}>
      
      {/* ENCABEZADO */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h1 style={{ color: 'var(--navy)', fontSize: '2.25rem', fontWeight: 800, marginBottom: '0.75rem' }}>
          Soporte técnico
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1rem', maxWidth: '640px', margin: '0 auto', lineHeight: 1.5 }}>
          Encuentra ayuda para resolver problemas de acceso, funcionamiento y gestión de tus clases dentro del portal.
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

        {/* NOTA DISCRETA: DIFERENCIACIÓN CON BANDEJA DE CONSULTAS */}
        <div 
          style={{ 
            background: 'var(--white)', 
            border: '1px solid var(--border-color)', 
            borderLeft: '4px solid var(--gold)', 
            borderRadius: '8px', 
            padding: '1rem 1.25rem', 
            display: 'flex', 
            alignItems: 'center', 
            justify: 'space-between', 
            gap: '1rem',
            flexWrap: 'wrap'
          }}
        >
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--navy)' }}>
              ¿Buscas las preguntas de tus estudiantes?
            </h4>
            <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Las dudas académicas enviadas desde las clases se encuentran en la sección Bandeja de consultas.
            </p>
          </div>
          <Link 
            to="/portal?tab=consultas" 
            style={{ 
              fontSize: '0.82rem', 
              fontWeight: 700, 
              color: 'var(--navy)', 
              textDecoration: 'none', 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.35rem',
              whiteSpace: 'nowrap',
              background: 'rgba(20, 33, 61, 0.06)',
              padding: '0.4rem 0.85rem',
              borderRadius: '6px',
              transition: 'all 0.2s'
            }}
          >
            <MessageSquare size={14} />
            Ver Bandeja de consultas
          </Link>
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
