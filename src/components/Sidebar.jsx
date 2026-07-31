/**
 * Componente: Sidebar
 * Representa la barra lateral de navegación de la plataforma LMS.
 * Dark navy design con logo LIATER y acentos dorados.
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Home, BookOpen, Users, LogOut, Settings, LayoutDashboard,
  GraduationCap, UserCircle, HelpCircle, ListTree, ArrowLeft,
  Video, FileText, Megaphone
} from 'lucide-react';
import liaterLogoWhite from '../assets/liater-logo-white.png';

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
        <img src={liaterLogoWhite} alt="LIATER" className="sidebar-logo-img" />
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
              <span>{role === 'admin' ? 'Panorama General' : 'Mis Cursos'}</span>
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

            {/* --- ENLACES PROFESOR --- */}
            {role === 'teacher' && (
              <>
                <NavLink to={`/dashboard/profesor/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <GraduationCap size={18} />
                  <span>Mi Panel</span>
                </NavLink>
              </>
            )}

            {/* --- ENLACES ADMINISTRADOR (ENTORNO COMPLETO DE GESTIÓN) --- */}
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

      </nav>

      {/* --- SECCIÓN 3: Pie de la barra lateral --- */}
      <div className="sidebar-footer">
        <button className="logout-btn" onClick={handleLogout}>
          <LogOut size={18} />
          <span>Cerrar Sesión</span>
        </button>
      </div>

    </aside>
  );
}
