import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import liaterLogo from '../assets/liater-logo.png';
import unalLogoWhiteText from '../assets/unal-logo-white-text.png';

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
      {/* Card Blanca Independiente de Login */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(0, 0, 0, 0.40)',
        padding: '2rem 2.25rem 1.75rem',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeSlideUp 0.45s cubic-bezier(0.4, 0, 0.2, 1) both',
        border: '1px solid rgba(252, 163, 17, 0.15)',
        display: 'flex',
        flexDirection: 'column',
      }}>

        {/* Logo LIATER */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.25rem' }}>
          <img
            src={liaterLogo}
            alt="LIATER"
            style={{
              height: '130px',
              objectFit: 'contain',
            }}
          />
          <p style={{ color: '#6b7280', fontSize: '0.82rem', fontWeight: 600, marginTop: '0.35rem' }}>
            Portal Educativo
          </p>
        </div>

        {/* Línea dorada decorativa */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, #FCA311, transparent)', marginBottom: '1.5rem', borderRadius: '9999px' }} />

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', color: '#dc2626',
            padding: '0.65rem 1rem', borderRadius: '0.5rem',
            marginBottom: '1rem', fontSize: '0.85rem',
            textAlign: 'center', border: '1px solid #fca5a5', fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.83rem', color: '#14213D' }}>
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
                width: '100%', padding: '0.7rem 0.9rem',
                borderRadius: '0.5rem', border: '1.5px solid #e0e0e0',
                fontSize: '0.9rem', background: '#fafafa', color: '#000',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.35rem', fontWeight: 600, fontSize: '0.83rem', color: '#14213D' }}>
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
                width: '100%', padding: '0.7rem 0.9rem',
                borderRadius: '0.5rem', border: '1.5px solid #e0e0e0',
                fontSize: '0.9rem', background: '#fafafa', color: '#000',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.4rem', width: '100%', padding: '0.8rem',
              borderRadius: '0.5rem',
              background: loading ? '#e0e0e0' : '#FCA311',
              color: loading ? '#9ca3af' : '#000',
              fontWeight: 800, fontSize: '0.92rem',
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

        <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
          <Link to="/"
            style={{ color: '#9ca3af', fontSize: '0.8rem', fontWeight: 500, transition: 'color 0.2s' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#FCA311'}
            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
          >
            ← Volver al Inicio
          </Link>
        </div>
      </div>

      {/* Institucional UNAL Independiente Fuera de la Tarjeta */}
      <div style={{
        marginTop: '2rem',
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        animation: 'fadeIn 0.5s ease both',
      }}>
        <img
          src={unalLogoWhiteText}
          alt="Universidad Nacional de Colombia"
          style={{
            height: '95px',
            maxWidth: '320px',
            objectFit: 'contain',
            filter: 'drop-shadow(0 4px 14px rgba(0,0,0,0.35))',
          }}
        />
        <span style={{ color: 'rgba(255, 255, 255, 0.55)', fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.02em' }}>
          © {new Date().getFullYear()} Laboratorio LIATER · Universidad Nacional de Colombia
        </span>
      </div>
    </div>
  );
}
