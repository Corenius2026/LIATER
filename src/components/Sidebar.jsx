/**
 * Componente: Sidebar
 * Representa la barra lateral de navegación de la plataforma LMS.
 * Dark navy design con logo LIATER y acentos dorados.
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, Users, LogOut, Settings, LayoutDashboard, GraduationCap, UserCircle, HelpCircle, ListTree } from 'lucide-react';
import liaterLogo from '../assets/liater-logo.png';
import unalLogoWhite from '../assets/unal-logo-white.png';

export default function Sidebar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const role = currentUser?.role;
  const activeProgramId = localStorage.getItem('activeProgramId') || '';
  const activeProgramType = localStorage.getItem('activeProgramType') || 'diplomado';

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
        <img src={liaterLogo} alt="LIATER" className="sidebar-logo-img" />
      </div>

      {/* --- SECCIÓN 2: Menú de Navegación Principal --- */}
      <nav className="sidebar-nav">

        {/* --- ENLACES GLOBALES --- */}
        {isGlobalRoute && (
          <>
            <div className="sidebar-section-label">Principal</div>
            <NavLink
              to="/portal"
              className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <LayoutDashboard size={18} />
              <span>{role === 'admin' ? 'Programas Creados' : 'Mis Cursos'}</span>
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
          <div className="sidebar-section-label">Menú del Curso</div>
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

            {/* --- ENLACES PROFESOR --- */}
            {role === 'teacher' && (
              <>
                <NavLink to={`/dashboard/profesor/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <GraduationCap size={18} />
                  <span>Mi Panel</span>
                </NavLink>
              </>
            )}

            {/* --- ENLACES ADMINISTRADOR --- */}
            {role === 'admin' && (
              <>
                <NavLink to={`/dashboard/admin/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
                  <Home size={18} />
                  <span>Inicio del Programa</span>
                </NavLink>
                <NavLink to={`/settings/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <Settings size={18} />
                  <span>Configurar Programa</span>
                </NavLink>
              </>
            )}
          </>
        )}

      </nav>

      {/* --- SECCIÓN 3: Pie de la barra lateral --- */}
      <div className="sidebar-footer">

        {/* Botón Volver (solo visible dentro de un curso) */}
        {!isGlobalRoute && (
          <button onClick={() => navigate('/portal')} className="nav-item" style={{ marginBottom: '0.25rem' }}>
            <LayoutDashboard size={18} />
            <span>Volver al Portal</span>
          </button>
        )}

        {/* Institucional UNAL */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.85rem',
          padding: '0.75rem 0.85rem', marginBottom: '0.5rem',
          borderRadius: 'var(--radius-lg)', background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.12)'
        }}>
          <img src={unalLogoWhite} alt="Universidad Nacional de Colombia" style={{ height: '42px', objectFit: 'contain' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.74rem', color: '#FFFFFF', fontWeight: 700, lineHeight: 1.1, letterSpacing: '0.01em' }}>
              Universidad Nacional
            </span>
            <span style={{ fontSize: '0.65rem', color: 'var(--gold)', fontWeight: 600 }}>
              de Colombia
            </span>
          </div>
        </div>

        {/* Botón para cerrar sesión */}
        <button onClick={handleLogout} className="nav-item">
          <LogOut size={18} />
          <span>Salir</span>
        </button>
      </div>

    </aside>
  );
}
