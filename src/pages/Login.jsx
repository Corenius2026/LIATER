import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import liaterLogo from '../assets/liater-logo.png';
import unalLogoWhite from '../assets/unal-logo-white.png';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/portal');
    } else {
      setError(result.message);
    }
  };

  return (
    <div className="public-layout">
      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.98)',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(0,0,0,0.40)',
        padding: '2.5rem',
        position: 'relative', zIndex: 1,
        animation: 'fadeSlideUp 0.45s cubic-bezier(0.4,0,0.2,1) both',
        border: '1px solid rgba(252,163,17,0.15)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '0.875rem' }}>
          <img
            src={liaterLogo}
            alt="LIATER"
            style={{
              width: '160px', height: '160px', objectFit: 'contain',
              filter: 'none',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#14213D', letterSpacing: '0.05em', lineHeight: 1 }}>
              LIAT<span style={{ color: '#FCA311' }}>ER</span>
            </h1>
            <p style={{ color: '#6b7280', fontSize: '0.78rem', marginTop: '0.3rem', fontWeight: 500 }}>
              Portal Educativo · Universidad Nacional de Colombia
            </p>
          </div>
        </div>

        {/* Línea dorada decorativa */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #FCA311, transparent)', marginBottom: '2rem', borderRadius: '9999px' }} />

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', color: '#dc2626',
            padding: '0.75rem 1rem', borderRadius: '0.5rem',
            marginBottom: '1.25rem', fontSize: '0.85rem',
            textAlign: 'center', border: '1px solid #fca5a5', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.83rem', color: '#14213D' }}>
              Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="usuario@unal.edu.co"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.5rem', border: '1.5px solid #e0e0e0',
                fontSize: '0.9rem', background: '#fafafa', color: '#000',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontWeight: 600, fontSize: '0.83rem', color: '#14213D' }}>
              Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              style={{
                width: '100%', padding: '0.75rem 1rem',
                borderRadius: '0.5rem', border: '1.5px solid #e0e0e0',
                fontSize: '0.9rem', background: '#fafafa', color: '#000',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem', width: '100%', padding: '0.875rem',
              borderRadius: '0.5rem',
              background: loading ? '#e0e0e0' : '#FCA311',
              color: loading ? '#9ca3af' : '#000',
              fontWeight: 800, fontSize: '0.95rem',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.25s ease',
              boxShadow: loading ? 'none' : '0 4px 18px rgba(252,163,17,0.40)',
              letterSpacing: '0.04em',
            }}
            onMouseOver={(e) => { if (!loading) { e.currentTarget.style.background = '#d98a00'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
            onMouseOut={(e) => { e.currentTarget.style.background = loading ? '#e0e0e0' : '#FCA311'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/"
            style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 500, transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#FCA311'}
            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            ← Volver al Inicio
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '1.75rem', zIndex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <img src={unalLogoWhite} alt="Universidad Nacional de Colombia" style={{ height: '32px', objectFit: 'contain', opacity: 0.7 }} />
        <span style={{ color: 'rgba(255,255,255,0.40)', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.04em' }}>
          © {new Date().getFullYear()} LIATER · Universidad Nacional de Colombia
        </span>
      </div>
    </div>
  );
}
