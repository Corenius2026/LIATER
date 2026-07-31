import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import liaterLogo from '../assets/liater-logo.png';

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none' }}>
          <div style={{
            background: isScrolled ? 'transparent' : 'rgba(255, 255, 255, 0.95)',
            padding: isScrolled ? '0' : '0.25rem 0.75rem',
            borderRadius: '0.5rem',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.3s ease'
          }}>
            <img 
              src={liaterLogo} 
              alt="LIATER" 
              style={{ 
                height: isScrolled ? '45px' : '40px', 
                objectFit: 'contain',
                transition: 'all 0.3s ease' 
              }} 
            />
          </div>
          <span style={{ 
            color: isScrolled ? 'var(--navy)' : 'var(--white)', 
            fontWeight: 800, 
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
            transition: 'color 0.3s ease'
          }}>
            LIATER
          </span>
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
