import { Link } from 'react-router-dom';
import liaterLogo from '../assets/liater-logo.png';
import unalPillLogo from '../assets/unal-pill-logo.png';

export default function Home() {
  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      boxSizing: 'border-box',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #14213D 0%, #000000 100%)',
      position: 'relative',
    }}>
      {/* Resplandor decorativo de fondo */}
      <div style={{
        position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,163,17,0.14) 0%, transparent 70%)',
        top: '-150px', right: '-100px', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: '380px', height: '380px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,163,17,0.08) 0%, transparent 70%)',
        bottom: '-100px', left: '-100px', pointerEvents: 'none'
      }} />

      {/* Card Principal */}
      <div style={{
        width: '100%',
        maxWidth: '440px',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.45)',
        padding: '1.75rem 2rem 1.5rem',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeSlideUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
        border: '1px solid rgba(252, 163, 17, 0.20)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
      }}>
        {/* Logo LIATER */}
        <img
          src={liaterLogo}
          alt="LIATER"
          style={{
            height: '90px',
            objectFit: 'contain',
            marginBottom: '0.65rem',
          }}
        />

        <h1 style={{ color: '#14213D', fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem', letterSpacing: '-0.02em' }}>
          Laboratorio LIATER
        </h1>

        <p style={{ color: '#6b7280', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.25rem', maxWidth: '360px' }}>
          Portal Académico oficial para la gestión de cursos y diplomados de la Universidad Nacional de Colombia.
        </p>

        {/* Línea dorada decorativa */}
        <div style={{ width: '100%', height: '2px', background: 'linear-gradient(90deg, transparent, #FCA311, transparent)', marginBottom: '1.25rem', borderRadius: '9999px' }} />

        <Link
          to="/login"
          style={{
            width: '100%',
            padding: '0.78rem 1.5rem',
            borderRadius: '0.5rem',
            background: '#FCA311',
            color: '#000',
            fontWeight: 800,
            fontSize: '0.95rem',
            border: 'none',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.25s ease',
            boxShadow: '0 4px 18px rgba(252,163,17,0.40)',
            letterSpacing: '0.04em',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = '#d98a00'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseOut={(e) => { e.currentTarget.style.background = '#FCA311'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          Ingresar al Portal →
        </Link>
      </div>

      {/* Identidad UNAL Fuera de la Tarjeta */}
      <div style={{
        marginTop: '1.1rem',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.25rem',
        animation: 'fadeIn 0.5s ease both',
      }}>
        <img
          src={unalPillLogo}
          alt="UNAL - Universidad Nacional de Colombia"
          style={{
            height: '70px',
            maxWidth: '280px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 16px rgba(0,0,0,0.45))',
          }}
        />
        <span style={{ color: 'rgba(255, 255, 255, 0.70)', fontSize: '0.76rem', fontWeight: 600, letterSpacing: '0.05em' }}>
          UNIVERSIDAD NACIONAL DE COLOMBIA
        </span>
        <span style={{ color: 'rgba(255, 255, 255, 0.40)', fontSize: '0.68rem', fontWeight: 400 }}>
          © {new Date().getFullYear()} Laboratorio LIATER
        </span>
      </div>
    </div>
  );
}
