/**
 * Componente: Layout
 * Estructura contenedora (Wrapper) para las páginas internas de la plataforma.
 * Integra la barra lateral (Sidebar), la barra superior (Header) y define
 * un área dinámica donde se carga el contenido de cada página.
 */
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import coreniusLogoColor from '../assets/Corenius_Logo_Principal_Color.svg';

export default function Layout() {
  return (
    // Contenedor principal que ocupa toda la pantalla mediante Flexbox
    <div className="app-layout">
      
      {/* --- BARRA LATERAL (FIJA) --- */}
      <Sidebar />
      
      {/* --- CONTENEDOR PRINCIPAL --- */}
      {/* Esta sección toma todo el ancho sobrante de la pantalla, al lado del Sidebar */}
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        
        {/* --- BARRA SUPERIOR (HEADER) --- */}
        <Header />
        
        {/* --- ÁREA DINÁMICA DE CONTENIDO --- */}
        {/* El componente <Outlet /> de React Router es un "marcador de posición".
            Aquí es donde se insertarán automáticamente los componentes hijos (páginas)
            dependiendo de la URL actual (ej. Dashboard, Módulos, Profesores). */}
        <div className="page-content" style={{ flex: '1 0 auto' }}>
          <Outlet />
        </div>

        {/* --- PIE DE PÁGINA INTERNO PORTAL --- */}
        <footer style={{
          padding: '1.25rem 2rem',
          borderTop: '1px solid #E2E8F0',
          background: '#FFFFFF',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.78rem',
          color: '#64748B',
          marginTop: 'auto'
        }}>
          <div>
            © {new Date().getFullYear()} Laboratorio LIATER — Universidad Nacional de Colombia.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ color: '#94A3B8', fontWeight: 500 }}>Diseño y Desarrollo por</span>
            <img src={coreniusLogoColor} alt="Corenius - Transformación Digital" style={{ height: '20px', objectFit: 'contain' }} />
          </div>
        </footer>
        
      </main>
    </div>
  );
}
