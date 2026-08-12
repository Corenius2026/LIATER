import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { fetchStudentStreak } from '../services/activityService';

import liaterLogoDark from '../assets/liater-logo-dark.png';

export default function Header() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [streak, setStreak] = useState(0);

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

  useEffect(() => {
    const loadStreak = async () => {
      if (currentUser && currentUser.role === 'student') {
        const result = await fetchStudentStreak(currentUser.id);
        if (!result.error) {
          setStreak(result.streak);
        }
      }
    };
    
    loadStreak();

    // Actualizar racha si el estudiante completa una actividad en esta sesión
    const handleActivityCompleted = () => {
      loadStreak();
    };
    window.addEventListener('activityCompleted', handleActivityCompleted);
    return () => window.removeEventListener('activityCompleted', handleActivityCompleted);
  }, [currentUser]);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          
          {/* Racha (Gamificación) */}
          {(currentUser.role === 'student') && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              padding: '0.35rem 0.75rem', 
              borderRadius: '999px',
              border: '1px solid #fde68a',
              boxShadow: '0 2px 6px rgba(252, 163, 17, 0.15)',
              color: '#d97706',
              fontWeight: 800,
              fontSize: '0.85rem'
            }}
            title={streak > 0 ? `¡Sigue así! Has estudiado ${streak} semana(s) seguida(s).` : "¡Completa una actividad para iniciar tu racha!"}
            >
              <span style={{ fontSize: '1rem', filter: streak === 0 ? 'grayscale(100%) opacity(0.5)' : 'none' }}>🔥</span>
              <span>{streak > 0 ? `${streak} semana${streak > 1 ? 's' : ''}` : '¡Inicia tu racha!'}</span>
            </div>
          )}

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
