import { Link } from 'react-router-dom';
import unalPillLogo from '../assets/unal-pill-logo.png';
import liaterLogo from '../assets/liater-logo.png';

export default function PublicFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer style={{
      background: 'var(--navy)',
      color: 'rgba(255, 255, 255, 0.7)',
      padding: '4rem 2rem 2rem',
      borderTop: '1px solid rgba(255, 255, 255, 0.1)'
    }}>
      <div className="container" style={{ maxWidth: '1200px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '3rem',
          marginBottom: '3rem'
        }}>
          {/* Columna 1: Logos e info principal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ background: 'white', padding: '0.5rem', borderRadius: '0.5rem', width: 'fit-content' }}>
              <img 
                src={liaterLogo} 
                alt="LIATER" 
                style={{ height: '50px', objectFit: 'contain' }} 
              />
            </div>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '300px' }}>
              Portal Académico oficial para la gestión de cursos y diplomados. Transformando la educación tecnológica a través del aprendizaje práctico.
            </p>
          </div>

          {/* Columna 2: Enlaces Rápidos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--white)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Enlaces Rápidos</h4>
            <a href="#inicio" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Inicio</a>
            <a href="#modulos" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Explorar Módulos</a>
            <a href="#beneficios" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Beneficios</a>
            <Link to="/login" style={{ color: 'inherit', textDecoration: 'none', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Iniciar Sesión</Link>
          </div>

          {/* Columna 3: Contacto institucional */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h4 style={{ color: 'var(--white)', fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>Contacto Institucional</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'flex-start' }}>
               <img
                  src={unalPillLogo}
                  alt="UNAL - Universidad Nacional de Colombia"
                  style={{
                    height: '60px',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
                  }}
                />
                <span style={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.02em', color: 'var(--white)' }}>
                  UNIVERSIDAD NACIONAL DE COLOMBIA
                </span>
            </div>
          </div>
        </div>

        {/* Bottom Line */}
        <div style={{
          paddingTop: '2rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          fontSize: '0.85rem'
        }}>
          <p>© {currentYear} Laboratorio LIATER. Todos los derechos reservados.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Términos de Servicio</span>
            <span style={{ cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={(e) => e.target.style.color = 'var(--gold)'} onMouseOut={(e) => e.target.style.color = 'inherit'}>Política de Privacidad</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
