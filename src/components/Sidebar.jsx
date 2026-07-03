/**
 * Componente: Sidebar
 * Representa la barra lateral de navegación de la plataforma LMS.
 * Contiene los enlaces principales para navegar entre las distintas secciones.
 */
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, Users, LogOut, Settings, Video, Upload, FileText, LayoutDashboard, GraduationCap } from 'lucide-react';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const role = currentUser?.role;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    // Contenedor principal de la barra lateral (fija a la izquierda)
    <aside className="sidebar">
      
      {/* --- SECCIÓN 1: Logotipo / Título --- */}
      <div className="sidebar-logo">
        <h2>Diplomado FV</h2>
      </div>

      {/* --- SECCIÓN 2: Menú de Navegación Principal --- */}
      <nav className="sidebar-nav">
        
        {/* Enlace al Dashboard dinámico */}
        <NavLink 
          to={role === 'admin' ? '/dashboard/admin' : role === 'teacher' ? '/dashboard/profesor' : '/dashboard'} 
          className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
        >
          <Home size={20} />
          <span>Dashboard</span>
        </NavLink>

        {/* --- ENLACES ESTUDIANTE --- */}
        {role === 'student' && (
          <>
            <NavLink to="/modules" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <BookOpen size={20} />
              <span>Módulos</span>
            </NavLink>
            <NavLink to="/teachers" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <Users size={20} />
              <span>Profesores</span>
            </NavLink>
          </>
        )}

        {/* --- ENLACES PROFESOR --- */}
        {role === 'teacher' && (
          <>
            <NavLink to="/dashboard/profesor" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <GraduationCap size={20} />
              <span>Mi Panel</span>
            </NavLink>
          </>
        )}

        {/* --- ENLACES ADMINISTRADOR --- */}
        {role === 'admin' && (
          <>
            <NavLink to="/dashboard/admin" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <LayoutDashboard size={20} />
              <span>Panel Admin</span>
            </NavLink>
          </>
        )}

      </nav>

      {/* --- SECCIÓN 3: Pie de la barra lateral --- */}
      <div className="sidebar-footer">
        {/* Botón para cerrar sesión y regresar al inicio público */}
        <button onClick={handleLogout} className="nav-item" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}>
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      </div>
      
    </aside>
  );
}
