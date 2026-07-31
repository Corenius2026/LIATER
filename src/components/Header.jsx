import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import unalLogo from '../assets/unal-logo.png';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'teacher') return 'Profesor';
    return 'Estudiante';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="app-header">
      <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.1rem' }}>
        <img src={unalLogo} alt="Universidad Nacional de Colombia" style={{ height: '52px', objectFit: 'contain' }} />
        <div style={{ height: '34px', width: '1.5px', background: 'var(--border-color)' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>
            Portal Educativo <span style={{ color: 'var(--gold-600)' }}>LIATER</span>
          </span>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.01em' }}>
            Universidad Nacional de Colombia
          </span>
        </div>
      </div>

      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-profile">
            <div className="profile-info">
              <span className="profile-name">{currentUser.name || currentUser.email}</span>
              <span className="profile-role">{getRoleLabel(currentUser.role)}</span>
            </div>
            {currentUser.avatar ? (
              <img src={currentUser.avatar} alt="Profile" className="profile-avatar" />
            ) : (
              <div className="profile-avatar-initials">
                {getInitials(currentUser.name || currentUser.email)}
              </div>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: 'var(--text-muted)',
              fontSize: '0.8rem',
              fontWeight: 500,
              padding: '0.45rem 0.875rem',
              borderRadius: 'var(--radius-md)',
              border: '1.5px solid var(--border-color)',
              transition: 'var(--transition)',
              background: 'transparent',
              cursor: 'pointer',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#fee2e2';
              e.currentTarget.style.color = '#dc2626';
              e.currentTarget.style.borderColor = '#fca5a5';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = 'var(--text-muted)';
              e.currentTarget.style.borderColor = 'var(--border-color)';
            }}
          >
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
