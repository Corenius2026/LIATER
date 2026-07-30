import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

  return (
    <header className="app-header">
      <div className="header-search">
        <h3 style={{color: 'var(--text-muted)', fontWeight: 500}}>Portal Educativo LIATER</h3>
      </div>
      
      {currentUser && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <div className="header-profile">
            <div className="profile-info">
              <span className="profile-name">{currentUser.name}</span>
              <span className="profile-role">{getRoleLabel(currentUser.role)}</span>
            </div>
            <img src={currentUser.avatar} alt="Profile" className="profile-avatar" />
          </div>

          <button 
            onClick={handleLogout}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem', 
              color: 'var(--text-muted)', 
              fontSize: '0.875rem',
              fontWeight: 500,
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              transition: 'var(--transition)'
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
            <LogOut size={16} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      )}
    </header>
  );
}
