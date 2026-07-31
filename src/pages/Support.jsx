import React from 'react';
import { HelpCircle, Mail, MessageSquare, Phone, ChevronDown } from 'lucide-react';

export default function Support() {
  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1 style={{ color: 'var(--text-dark)', fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Soporte Técnico</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
          ¿Tienes algún problema con la plataforma o dudas sobre tus programas? Estamos aquí para ayudarte.
        </p>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
        
        {/* Contacto Directo */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '1rem' }}>
          
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/7/7e/Gmail_icon_%282020%29.svg" alt="Gmail" width="32" height="32" />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Envíanos un correo</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Te responderemos en menos de 24 horas hábiles.</p>
            <a href="mailto:soporte@liater.com" className="btn" style={{ background: '#eff6ff', color: '#2563eb', border: 'none', width: '100%' }}>
              soporte@liater.com
            </a>
          </div>

          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '2rem' }}>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" width="32" height="32" />
            </div>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--text-dark)' }}>Chat de Asistencia</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Escríbenos por WhatsApp para respuestas rápidas.</p>
            <button className="btn" style={{ background: '#f0fdf4', color: '#16a34a', border: 'none', width: '100%' }}>
              Abrir WhatsApp
            </button>
          </div>

        </div>

        {/* FAQ - Preguntas Frecuentes */}
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
            <HelpCircle size={24} color="var(--primary-color)" />
            <h2 style={{ fontSize: '1.5rem', color: 'var(--text-dark)' }}>Preguntas Frecuentes</h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-dark)' }}>¿Cómo puedo recuperar mi contraseña?</h4>
                <ChevronDown size={20} color="var(--text-muted)" />
              </div>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', cursor: 'pointer' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary-color)' }}>¿Dónde encuentro el material de apoyo de mis clases?</h4>
                <ChevronDown size={20} color="var(--primary-color)" style={{ transform: 'rotate(180deg)' }} />
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', margin: 0, lineHeight: '1.5' }}>
                Debes ingresar a tu programa desde el <strong>Portal de Cursos</strong>, luego dirigirte a la sección de <strong>Módulos</strong> y seleccionar el módulo actual. En cada clase encontrarás las presentaciones, PDFs y enlaces de interés proporcionados por tu profesor.
              </p>
            </div>

            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1.25rem', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-dark)' }}>¿Cuándo se habilita la opción de descargar mi certificado?</h4>
                <ChevronDown size={20} color="var(--text-muted)" />
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
