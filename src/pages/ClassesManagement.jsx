import { Video, Plus, Link as LinkIcon, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ClassesManagement() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  if (role === 'student') {
    return (
      <div className="page-header">
        <h2>Acceso Denegado</h2>
        <p>Esta vista es para profesores y administradores.</p>
      </div>
    );
  }

  const isAdmin = role === 'admin';

  return (
    <div className="classes-management-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>{isAdmin ? 'Gestión Global de Clases' : 'Mis Clases'}</h2>
          <p>{isAdmin 
            ? 'Administra todas las sesiones, crea nuevas y asigna profesores.' 
            : 'Sube las grabaciones y administra las sesiones que impartes.'}
          </p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={18} />
            <span>Crear Nueva Clase</span>
          </button>
        )}
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Título de la Clase</th>
              <th style={{ padding: '12px' }}>Módulo / Subtema</th>
              {isAdmin && <th style={{ padding: '12px' }}>Profesor Asignado</th>}
              <th style={{ padding: '12px' }}>Fecha</th>
              <th style={{ padding: '12px' }}>Grabación</th>
              <th style={{ padding: '12px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 1, title: 'Conceptos Básicos', module: 'Fundamentos', teacher: 'Carlos Gómez', date: '2024-05-10', url: 'https://zoom.us/...' },
              { id: 2, title: 'Tipos de Inversores', module: 'Equipos', teacher: 'Carlos Gómez', date: '2024-05-12', url: null },
              { id: 3, title: 'Baterías y Almacenamiento', module: 'Equipos', teacher: 'Ana Silva', date: '2024-05-15', url: 'https://youtube.com/...' },
            ]
            .filter(c => isAdmin || c.teacher === 'Carlos Gómez') // Simular filtro de "mis clases" si es profesor
            .map(cls => (
              <tr key={cls.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={18} color="var(--primary-color)" />
                  {cls.title}
                </td>
                <td style={{ padding: '12px' }}>{cls.module}</td>
                {isAdmin && <td style={{ padding: '12px' }}>{cls.teacher}</td>}
                <td style={{ padding: '12px' }}>{cls.date}</td>
                <td style={{ padding: '12px' }}>
                  {cls.url ? (
                    <span style={{ color: 'green', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <LinkIcon size={14} /> Disponible
                    </span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Pendiente</span>
                  )}
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!isAdmin && (
                      <button className="btn btn-sm" style={{ padding: '6px' }} title="Agregar Grabación">
                        <LinkIcon size={16} />
                      </button>
                    )}
                    <button className="btn btn-sm" style={{ padding: '6px' }} title="Editar">
                      <Edit size={16} />
                    </button>
                    {isAdmin && (
                      <button className="btn btn-sm" style={{ padding: '6px', color: 'red' }} title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    )}
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
