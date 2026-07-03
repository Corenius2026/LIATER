import { Upload, FileText, Trash2, Edit } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function TeacherResources() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  if (role !== 'teacher') {
    return (
      <div className="page-header">
        <h2>Acceso Denegado</h2>
        <p>Esta vista es exclusiva para profesores.</p>
      </div>
    );
  }

  return (
    <div className="resources-page">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Mis Recursos</h2>
          <p>Gestiona los archivos, presentaciones y enlaces de tus módulos.</p>
        </div>
        <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Upload size={18} />
          <span>Subir Nuevo Recurso</span>
        </button>
      </div>

      <div className="card" style={{ marginTop: '20px' }}>
        <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nombre del Recurso</th>
              <th style={{ padding: '12px' }}>Clase Asociada</th>
              <th style={{ padding: '12px' }}>Tipo</th>
              <th style={{ padding: '12px' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {[
              { id: 1, title: 'Presentación Fotovoltaica', class: 'Introducción a FV', type: 'PDF' },
              { id: 2, title: 'Guía de Laboratorio', class: 'Inversores Solares', type: 'Documento' },
              { id: 3, title: 'Simulador Solar', class: 'Cálculos de Energía', type: 'Enlace' },
            ].map(resource => (
              <tr key={resource.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="var(--primary-color)" />
                  {resource.title}
                </td>
                <td style={{ padding: '12px' }}>{resource.class}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-color)'
                  }}>
                    {resource.type}
                  </span>
                </td>
                <td style={{ padding: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn btn-sm" style={{ padding: '6px' }} title="Editar">
                      <Edit size={16} />
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
