import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar si el usuario realmente viene de un enlace de recuperación
    // Al hacer click en el enlace, Supabase debería haber iniciado sesión temporalmente.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // Si no hay sesión temporal en la URL, redirigir al login
        navigate('/login');
      }
    });
  }, [navigate]);

  const handleUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      alert('Contraseña actualizada con éxito. Ahora serás redirigido.');
      navigate('/');
    }
  };

  return (
    <div className="public-layout">
      <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '2rem', color: 'var(--text-dark)' }}>Configurar Contraseña</h2>
        
        <p style={{ textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Ingresa tu nueva contraseña para acceder a la plataforma.
        </p>

        {error && (
          <div style={{ 
            backgroundColor: '#fee2e2', 
            color: '#dc2626', 
            padding: '0.75rem', 
            borderRadius: 'var(--radius-md)', 
            marginBottom: '1rem',
            fontSize: '0.875rem',
            textAlign: 'center',
            border: '1px solid #fca5a5'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Nueva Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 500 }}>Confirmar Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
              disabled={loading}
              style={{ width: '100%', padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }} 
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', marginTop: '1rem' }}>
            {loading ? 'Guardando...' : 'Guardar Contraseña'}
          </button>
        </form>
      </div>
    </div>
  );
}
