import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import liaterLogo from '../assets/liater-logo.png';

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
      {/* Card de login */}
      <div style={{
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255,255,255,0.97)',
        borderRadius: '1.25rem',
        boxShadow: '0 24px 64px rgba(13,35,83,0.35)',
        padding: '2.5rem',
        position: 'relative',
        zIndex: 1,
        animation: 'fadeSlideUp 0.45s cubic-bezier(0.4,0,0.2,1) both',
        border: '1px solid rgba(255,255,255,0.2)',
      }}>

        {/* Logo + Título */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '0.75rem' }}>
          <img
            src={liaterLogo}
            alt="LIATER"
            style={{ width: '72px', height: '72px', objectFit: 'contain', filter: 'drop-shadow(0 4px 8px rgba(212,160,23,0.3))', animation: 'logoFloat 4s ease-in-out infinite' }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--primary-900)', letterSpacing: '-0.02em', lineHeight: 1 }}>
              LIAT<span style={{ color: 'var(--gold-500)' }}>ER</span>
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', fontWeight: 500 }}>
              Portal Educativo · Universidad Nacional de Colombia
            </p>
          </div>
        </div>

        {/* Línea dorada decorativa */}
        <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent, var(--gold-400), transparent)', marginBottom: '2rem', borderRadius: '9999px' }} />

        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            textAlign: 'center',
            border: '1px solid #fca5a5',
            fontWeight: 500,
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                fontSize: '0.9rem',
                background: 'var(--surface-light)',
                color: 'var(--text-dark)',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
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
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius-md)',
                border: '1.5px solid var(--border-color)',
                fontSize: '0.9rem',
                background: 'var(--surface-light)',
                color: 'var(--text-dark)',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              padding: '0.875rem',
              borderRadius: 'var(--radius-md)',
              background: loading ? 'var(--border-color)' : 'linear-gradient(135deg, var(--primary-900) 0%, var(--primary-700) 100%)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.95rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'var(--transition)',
              boxShadow: loading ? 'none' : 'var(--shadow-md)',
              letterSpacing: '0.02em',
            }}
            onMouseOver={(e) => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            {loading ? 'Verificando...' : 'Iniciar Sesión →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <Link to="/" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, transition: 'var(--transition)' }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--gold-500)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            ← Volver al Inicio
          </Link>
        </div>
      </div>

      {/* Badge UNAL */}
      <div style={{ marginTop: '1.5rem', zIndex: 1, textAlign: 'center' }}>
        <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.72rem', fontWeight: 500, letterSpacing: '0.05em' }}>
          © {new Date().getFullYear()} LIATER · Universidad Nacional de Colombia
        </span>
      </div>
    </div>
  );
}
