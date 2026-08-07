import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import liaterLogoDark from '../assets/liater-logo-dark.png';

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
      <div className="header-title" style={{ display: 'flex', alignItems: 'center', gap: '1.125rem' }}>
        <img src={liaterLogoDark} alt="LIATER" style={{ height: '64px', objectFit: 'contain' }} />
        <div style={{ height: '50px', width: '2px', background: 'var(--border-color)', opacity: 0.6 }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2 }}>
            Portal Educativo <span style={{ color: 'var(--gold-600)' }}>LIATER</span>
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em', marginTop: '2px' }}>
            UNIVERSIDAD NACIONAL DE COLOMBIA
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
        </div>
      )}
    </header>
  );
}
