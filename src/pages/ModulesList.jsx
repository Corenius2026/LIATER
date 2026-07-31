import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function ModulesList() {
  const { programId } = useParams();
  const [modulesList, setModulesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModules() {
      if (!programId) return;
      try {
        const { data, error } = await supabase
          .from('modules')
          .select('*')
          .eq('program_id', programId)
          .order('order_index', { ascending: true });
        
        if (error) throw error;
        setModulesList(data || []);
      } catch (err) {
        console.error('Error fetching modules:', err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchModules();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando módulos...</h2>
        <p>Conectando con la base de datos</p>
      </div>
    );
  }

  if (modulesList.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Aún no hay módulos</h2>
        <p>Los módulos del diplomado aparecerán aquí cuando sean creados.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Temario del Diplomado</h1>
        <p className="page-description">Explora todos los módulos y su contenido.</p>
      </div>

      <div className="grid-3">
        {modulesList.map(mod => (
          <div key={mod.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span className="badge">Módulo</span>
              {/* Se dejó 0 clases hardcodeado temporalmente según restricciones */}
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>0 clases (pdte.)</span>
            </div>
            
            <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-dark)' }}>{mod.title}</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', flex: 1, fontSize: '0.875rem' }}>
              {mod.description}
            </p>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span>Progreso</span>
                <span>0%</span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-color)', borderRadius: '3px', overflow: 'hidden' }}>
                <div style={{ width: `0%`, height: '100%', backgroundColor: 'var(--primary-light)' }}></div>
              </div>
            </div>
            
            <Link to={`/modules/${mod.id}`} className="btn btn-outline" style={{ width: '100%', textAlign: 'center' }}>
              Ver detalles
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
