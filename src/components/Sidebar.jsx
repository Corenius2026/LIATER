/**
 * Componente: Sidebar
 * Representa la barra lateral de navegación de la plataforma LMS.
 * Contiene los enlaces principales para navegar entre las distintas secciones.
 */
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, BookOpen, Users, LogOut, Settings, Video, Upload, FileText, LayoutDashboard, GraduationCap, UserCircle, HelpCircle, ShieldCheck } from 'lucide-react';

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
    // Contenedor principal de la barra lateral (fija a la izquierda)
    <aside className="sidebar">
      
      {/* --- SECCIÓN 1: Logotipo / Título --- */}
      <div className="sidebar-logo" onClick={() => navigate('/portal')} style={{ cursor: 'pointer' }}>
        <h2>LIATER</h2>
      </div>

      {/* --- SECCIÓN 2: Menú de Navegación Principal --- */}
      <nav className="sidebar-nav">
        
        {/* --- ENLACES GLOBALES (Solo visibles en rutas globales) --- */}
        {isGlobalRoute && (
          <>
            <NavLink 
              to="/portal" 
              className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
            >
              <LayoutDashboard size={20} />
              <span>{role === 'admin' ? 'Programas Creados' : 'Mis Cursos'}</span>
            </NavLink>

            {role === 'admin' && (
              <NavLink 
                to="/users" 
                className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}
              >
                <Users size={20} />
                <span>Registrar Usuarios</span>
              </NavLink>
            )}

            <NavLink to="/perfil" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <UserCircle size={20} />
              <span>Mi Perfil</span>
            </NavLink>

            <NavLink to="/soporte" className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
              <HelpCircle size={20} />
              <span>Soporte Técnico</span>
            </NavLink>

          </>
        )}

        {/* --- SEPARADOR VISUAL --- */}
        {!isGlobalRoute && (
          <div style={{ margin: '0 0 0.5rem 0', padding: '0 1rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Menú del Curso</span>
          </div>
        )}

        {/* MUESTRA LAS OPCIONES DEL CURSO SOLO SI NO ESTÁ EN EL PORTAL GLOBAL */}
        {!isGlobalRoute && (
          <>
            {/* --- ENLACES ESTUDIANTE --- */}
            {role === 'student' && (
              <>
                <NavLink to={`/dashboard/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
                  <Home size={20} />
                  <span>Inicio {activeProgramType === 'curso' ? 'del Curso' : 'del Diplomado'}</span>
                </NavLink>
                {activeProgramType !== 'curso' ? (
                  <NavLink to={`/modules/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                    <BookOpen size={20} />
                    <span>Módulos</span>
                  </NavLink>
                ) : (
                  <NavLink to={`/syllabus/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                    <ListTree size={20} />
                    <span>Subtemas</span>
                  </NavLink>
                )}
                <NavLink to={`/teachers/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <Users size={20} />
                  <span>Profesores</span>
                </NavLink>
              </>
            )}

            {/* --- ENLACES PROFESOR --- */}
            {role === 'teacher' && (
              <>
                <NavLink to={`/dashboard/profesor/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <GraduationCap size={20} />
                  <span>Mi Panel</span>
                </NavLink>
              </>
            )}

            {/* --- ENLACES ADMINISTRADOR --- */}
            {role === 'admin' && (
              <>
                <NavLink to={`/dashboard/admin/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'} end>
                  <Home size={20} />
                  <span>Inicio del Programa</span>
                </NavLink>
                <NavLink to={`/settings/${activeProgramId}`} className={({isActive}) => isActive ? 'nav-item active' : 'nav-item'}>
                  <Settings size={20} />
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
          <button onClick={() => navigate('/portal')} className="nav-item" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', marginBottom: '0.5rem' }}>
            <LayoutDashboard size={20} />
            <span>Volver al Portal</span>
          </button>
        )}

        {/* Botón para cerrar sesión y regresar al inicio público */}
        <button onClick={handleLogout} className="nav-item" style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer' }}>
          <LogOut size={20} />
          <span>Salir</span>
        </button>
      </div>
      
    </aside>
  );
}
