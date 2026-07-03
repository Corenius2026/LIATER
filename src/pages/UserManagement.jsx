import { UserPlus, UserCog, Trash2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function UserManagement() {
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
    <div className="user-management-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Gestión de Usuarios</h2>
          <p>Crea, edita o elimina estudiantes, profesores y administradores de la plataforma.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <UserPlus size={18} />
          <span>Crear Usuario</span>
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nombre</th>
              <th style={{ padding: '12px' }}>Email</th>
              <th style={{ padding: '12px' }}>Rol</th>
              <th style={{ padding: '12px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 1, name: 'Juan Martínez', email: 'juan@example.com', role: 'student' },
              { id: 2, name: 'Carlos Gómez', email: 'carlos@example.com', role: 'teacher' },
              { id: 3, name: 'Ana Silva', email: 'ana@example.com', role: 'teacher' },
              { id: 4, name: 'Admin Principal', email: 'admin@diplomado.com', role: 'admin' },
            ].map(user => (
              <tr key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px', fontWeight: 500 }}>{user.name}</td>
                <td style={{ padding: '12px' }}>{user.email}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem',
                    backgroundColor: user.role === 'admin' ? 'var(--danger-color)' : user.role === 'teacher' ? 'var(--primary-color)' : 'var(--bg-secondary)',
                    color: user.role === 'student' ? 'var(--text-color)' : 'white'
                  }}>
                    {user.role === 'admin' ? 'Administrador' : user.role === 'teacher' ? 'Profesor' : 'Estudiante'}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-sm" style={{ padding: '6px' }} title="Editar">
                      <UserCog size={16} />
                    </button>
                    <button className="btn btn-sm" style={{ padding: '6px', color: 'red' }} title="Eliminar">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
