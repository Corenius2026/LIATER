import { Settings, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  if (role !== 'admin') {
    return (
      <div className="page-header">
        <h2>Acceso Denegado</h2>
        <p>Esta vista es exclusiva para administradores.</p>
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h2>Configuración de la Plataforma</h2>
        <p>Ajustes globales del sistema del diplomado.</p>
      </div>

      <div className="card" style={{ marginTop: '20px', maxWidth: '600px' }}>
        <form style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Nombre de la Plataforma</label>
            <input 
              type="text" 
              defaultValue="Diplomado FV" 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Correo de Contacto Soporte</label>
            <input 
              type="email" 
              defaultValue="soporte@diplomado.com" 
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Modo de Mantenimiento</label>
            <select style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <option value="off">Desactivado (Sitio en línea)</option>
              <option value="on">Activado (Solo admins pueden entrar)</option>
            </select>
          </div>
          <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Save size={18} />
            <span>Guardar Cambios</span>
          </button>
        </form>
      </div>
    </div>
  );
}
