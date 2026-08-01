/**
 * Componente: Sidebar
 * Representa la barra lateral de navegación de la plataforma LMS.
 * Dark navy design con logo LIATER y acentos dorados.
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Home, BookOpen, Users, LogOut, Settings, LayoutDashboard,
  GraduationCap, UserCircle, HelpCircle, ListTree, ArrowLeft,
  Video, FileText, Megaphone, CalendarDays, MessageSquare
} from 'lucide-react';
import liaterLogoWhite from '../assets/liater-logo-white.png';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = currentUser?.role;
  
  const [activeProgramId, setActiveProgramId] = useState(localStorage.getItem('activeProgramId') || '');
  const [activeProgramType, setActiveProgramType] = useState(localStorage.getItem('activeProgramType') || 'diplomado');

  useEffect(() => {
    const handleStorageChange = () => {
      setActiveProgramId(localStorage.getItem('activeProgramId') || '');
      setActiveProgramType(localStorage.getItem('activeProgramType') || 'diplomado');
    };

    window.addEventListener('programContextChanged', handleStorageChange);
    
    // Sincronizar en caso de que cambie la ruta y el storage haya sido actualizado sin evento
    handleStorageChange();

    return () => {
      window.removeEventListener('programContextChanged', handleStorageChange);
    };
  }, [location.pathname]);

  // Lista de rutas donde NO se debe mostrar el menú específico del curso
  const globalRoutes = ['/portal', '/perfil', '/soporte', '/users'];
  const isGlobalRoute = globalRoutes.includes(location.pathname);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">

      {/* --- SECCIÓN 1: Logo LIATER --- */}
      <div className="sidebar-logo" onClick={() => navigate('/portal')}>
        <img src={liaterLogoWhite} alt="LIATER" className="sidebar-logo-img" />
      </div>

      {/* --- SECCIÓN 2: Menú de Navegación Principal --- */}
      <nav className="sidebar-nav">

        {/* --- MENÚ PROFESOR (SIEMPRE MANTIENE SU ESPACIO GLOBAL) --- */}
        {role === 'teacher' ? (
          <>
            <div className="sidebar-section-label">INICIO</div>
            <NavLink
              to="/portal"
              className={() => {
                const isInicio = location.pathname === '/portal' && (!location.search || (!location.search.includes('tab=programas') && !location.search.includes('tab=agenda') && !location.search.includes('tab=consultas')));
                return isInicio ? 'nav-item active' : 'nav-item';
              }}
              aria-current={(location.pathname === '/portal' && (!location.search || (!location.search.includes('tab=programas') && !location.search.includes('tab=agenda') && !location.search.includes('tab=consultas')))) ? 'page' : undefined}
              end
            >
              <Home size={18} />
              <span>Inicio docente</span>
            </NavLink>

            <NavLink
              to="/portal?tab=programas"
              className={() => {
                const isProgramas = location.pathname.startsWith('/dashboard/profesor') || (location.pathname === '/portal' && location.search.includes('tab=programas'));
                return isProgramas ? 'nav-item active' : 'nav-item';
              }}
              aria-current={(location.pathname.startsWith('/dashboard/profesor') || (location.pathname === '/portal' && location.search.includes('tab=programas'))) ? 'page' : undefined}
            >
              <BookOpen size={18} />
              <span>Mis programas</span>
            </NavLink>

            <NavLink
              to="/portal?tab=consultas"
              className={() => {
                const isConsultas = (location.pathname === '/portal' && location.search.includes('tab=consultas')) || location.pathname === '/consultas';
                return isConsultas ? 'nav-item active' : 'nav-item';
              }}
              aria-current={((location.pathname === '/portal' && location.search.includes('tab=consultas')) || location.pathname === '/consultas') ? 'page' : undefined}
            >
              <MessageSquare size={18} />
              <span>Bandeja de consultas</span>
            </NavLink>

            <NavLink
              to="/portal?tab=agenda"
              className={() => {
                const isAgenda = (location.pathname === '/portal' && location.search.includes('tab=agenda')) || location.pathname === '/pendientes';
                return isAgenda ? 'nav-item active' : 'nav-item';
              }}
              aria-current={((location.pathname === '/portal' && location.search.includes('tab=agenda')) || location.pathname === '/pendientes') ? 'page' : undefined}
            >
              <CalendarDays size={18} />
              <span>Agenda</span>
            </NavLink>

            <div className="sidebar-divider" />
            <div className="sidebar-section-label">CUENTA</div>

            <NavLink 
              to="/perfil" 
              className={() => {
                const isPerfil = location.pathname === '/perfil';
                return isPerfil ? 'nav-item active' : 'nav-item';
              }}
              aria-current={location.pathname === '/perfil' ? 'page' : undefined}
            >
              <UserCircle size={18} />
              <span>Mi perfil</span>
            </NavLink>

            <NavLink 
              to="/soporte" 
              className={() => {
                const isSoporte = location.pathname === '/soporte';
                return isSoporte ? 'nav-item active' : 'nav-item';
              }}
              aria-current={location.pathname === '/soporte' ? 'page' : undefined}
            >
              <HelpCircle size={18} />
              <span>Soporte técnico</span>
            </NavLink>
          </>
        ) : (
          <>
            {/* --- ENLACES GLOBALES (ESTUDIANTE / ADMIN) --- */}
            {isGlobalRoute && (
              <>
                <div className="sidebar-section-label">Principal</div>
                <NavLink
                  to="/portal"
                  className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
                >
                  <LayoutDashboard size={18} />
                  <span>{role === 'admin' ? 'Panorama General' : 'Mis Programas'}</span>
                </NavLink>

                {role === 'admin' && (
                  <NavLink
                    to="/users"
                    className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
                  >
                    <Users size={18} />
                    <span>Gestión de Usuarios</span>
                  </NavLink>
                )}

                <div className="sidebar-divider" />
                <div className="sidebar-section-label">Cuenta</div>

                <NavLink to="/perfil" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <UserCircle size={18} />
                  <span>Mi Perfil</span>
                </NavLink>

                <NavLink to="/soporte" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <HelpCircle size={18} />
                  <span>Soporte Técnico</span>
                </NavLink>
              </>
            )}

            {/* --- SEPARADOR VISUAL PARA MENÚ DE CURSO --- */}
            {!isGlobalRoute && (
              <div className="sidebar-section-label">
                {role === 'admin' ? 'Gestión del Programa' : 'Menú del Curso'}
              </div>
            )}

            {/* MUESTRA LAS OPCIONES DEL CURSO SOLO SI NO ESTÁ EN EL PORTAL GLOBAL */}
            {!isGlobalRoute && (
              <>
                {/* --- ENLACES ESTUDIANTE --- */}
                {role === 'student' && (
                  <>
                    <NavLink to={`/dashboard/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
                      <Home size={18} />
                      <span>Inicio {activeProgramType === 'curso' ? 'del Curso' : 'del Diplomado'}</span>
                    </NavLink>
                    {activeProgramType !== 'curso' ? (
                      <NavLink to={`/modules/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <BookOpen size={18} />
                        <span>Módulos</span>
                      </NavLink>
                    ) : (
                      <NavLink to={`/syllabus/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                        <ListTree size={18} />
                        <span>Subtemas</span>
                      </NavLink>
                    )}
                    <NavLink to={`/teachers/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                      <Users size={18} />
                      <span>Profesores</span>
                    </NavLink>
                  </>
                )}

                {/* --- ENLACES ADMINISTRADOR --- */}
                {role === 'admin' && (
                  <>
                    <NavLink to="/portal" className="nav-item" style={{ color: 'var(--gold)', marginBottom: '0.4rem', fontWeight: 700 }}>
                      <ArrowLeft size={18} />
                      <span>← Panorama General</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=resumen`} className={({isActive}) => (isActive && (!location.search || location.search.includes('resumen'))) ? 'nav-item active' : 'nav-item'}>
                      <LayoutDashboard size={18} />
                      <span>Resumen</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=alumnos`} className={({isActive}) => location.search.includes('alumnos') ? 'nav-item active' : 'nav-item'}>
                      <Users size={18} />
                      <span>Estudiantes</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=profesores`} className={({isActive}) => location.search.includes('profesores') ? 'nav-item active' : 'nav-item'}>
                      <GraduationCap size={18} />
                      <span>Profesores</span>
                    </NavLink>

                    {activeProgramType !== 'curso' && (
                      <NavLink to={`/dashboard/admin/${activeProgramId}?tab=modulos`} className={({isActive}) => location.search.includes('modulos') ? 'nav-item active' : 'nav-item'}>
                        <BookOpen size={18} />
                        <span>Módulos</span>
                      </NavLink>
                    )}

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=subtemas`} className={({isActive}) => location.search.includes('subtemas') ? 'nav-item active' : 'nav-item'}>
                      <ListTree size={18} />
                      <span>Subtemas</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=clases`} className={({isActive}) => location.search.includes('clases') ? 'nav-item active' : 'nav-item'}>
                      <Video size={18} />
                      <span>Clases en Vivo</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=recursos`} className={({isActive}) => location.search.includes('recursos') ? 'nav-item active' : 'nav-item'}>
                      <FileText size={18} />
                      <span>Recursos</span>
                    </NavLink>

                    <NavLink to={`/dashboard/admin/${activeProgramId}?tab=anuncios`} className={({isActive}) => location.search.includes('anuncios') ? 'nav-item active' : 'nav-item'}>
                      <Megaphone size={18} />
                      <span>Anuncios</span>
                    </NavLink>

                    <div className="sidebar-divider" />
                    <NavLink to={`/settings/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                      <Settings size={18} />
                      <span>Configurar Programa</span>
                    </NavLink>
                  </>
                )}
              </>
            )}
          </>
        )}

      </nav>

      {/* --- SECCIÓN 3: Pie de la barra lateral --- */}
      <div className="sidebar-footer">
        <button 
          className="logout-btn" 
          onClick={handleLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--white)',
            fontWeight: 600,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(252, 163, 17, 0.15)';
            e.currentTarget.style.color = 'var(--gold)';
            e.currentTarget.style.borderColor = 'var(--gold)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            e.currentTarget.style.color = 'var(--white)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }}
        >
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

    </aside>
  );
}
