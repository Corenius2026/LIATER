import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import liaterLogo from '../assets/liater-logo.png';
import liaterLogoWhite from '../assets/liater-logo-white.png';
import unalPillLogo from '../assets/unal-pill-logo.png';
import unalPillNavyLogo from '../assets/unal-pill-navy-logo.png';

export default function PublicNavbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      padding: '1rem 2rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      background: isScrolled ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.05)',
      backdropFilter: isScrolled ? 'blur(10px)' : 'none',
      boxShadow: isScrolled ? '0 4px 20px rgba(0, 0, 0, 0.08)' : 'none',
      transition: 'all 0.3s ease',
      borderBottom: isScrolled ? '1px solid rgba(20, 33, 61, 0.05)' : '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <a href="https://unal.edu.co" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center' }}>
          <img 
            src={isScrolled ? unalPillNavyLogo : unalPillLogo} 
            alt="Universidad Nacional de Colombia" 
            style={{ 
              height: isScrolled ? '72px' : '78px', 
              objectFit: 'contain',
              transition: 'all 0.3s ease' 
            }} 
          />
        </a>
        
        <div style={{ 
          width: '1px', 
          height: '54px', 
          background: isScrolled ? 'rgba(20, 33, 61, 0.2)' : 'rgba(255, 255, 255, 0.3)',
          transition: 'background 0.3s ease'
        }}></div>

        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none' }}>
          <img 
            src={isScrolled ? liaterLogo : liaterLogoWhite} 
            alt="LIATER" 
            style={{ 
              height: isScrolled ? '54px' : '62px', 
              objectFit: 'contain',
              transition: 'all 0.3s ease' 
            }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <span 
              className={isScrolled ? 'liater-title-scrolled' : 'liater-title-electric'}
              style={{ 
                fontSize: '0.84rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                lineHeight: 1.35,
                textTransform: 'uppercase',
                maxWidth: '340px',
                transition: 'all 0.3s ease'
              }}
            >
              Laboratorio de Investigación en Alta Tensión y Energías Renovables
            </span>
          </div>
        </Link>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <a 
          href="#programas" 
          style={{ 
            color: isScrolled ? 'var(--text-secondary)' : 'var(--white)', 
            fontWeight: 600, 
            fontSize: '0.9rem',
            transition: 'color 0.3s ease',
            textDecoration: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--gold)'}
          onMouseOut={(e) => e.currentTarget.style.color = isScrolled ? 'var(--text-secondary)' : 'var(--white)'}
        >
          Explorar Programas
        </a>
        <a 
          href="#beneficios" 
          style={{ 
            color: isScrolled ? 'var(--text-secondary)' : 'var(--white)', 
            fontWeight: 600, 
            fontSize: '0.9rem',
            transition: 'color 0.3s ease',
            textDecoration: 'none'
          }}
          onMouseOver={(e) => e.currentTarget.style.color = 'var(--gold)'}
          onMouseOut={(e) => e.currentTarget.style.color = isScrolled ? 'var(--text-secondary)' : 'var(--white)'}
        >
          Beneficios
        </a>
        
        <button
          onClick={() => navigate('/login')}
          className="btn btn-gold"
          style={{
            padding: '0.5rem 1.25rem',
            boxShadow: isScrolled ? 'var(--shadow-gold)' : '0 4px 15px rgba(0,0,0,0.3)',
          }}
        >
          Iniciar Sesión
        </button>
      </div>
    </nav>
  );
}
