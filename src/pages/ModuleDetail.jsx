import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { BookOpen } from 'lucide-react';

export default function ModuleDetail() {
  const { id } = useParams();
  
  const [moduleData, setModuleData] = useState(null);
  const [subtopics, setSubtopics] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchModuleAndSubtopics() {
      try {
        // 1. Obtener los datos del módulo
        const { data: modData, error: modError } = await supabase
          .from('modules')
          .select('*')
          .eq('id', id)
          .single();
        
        if (modError) throw modError;
        setModuleData(modData);

        // 2. Obtener los subtemas asociados a este módulo
        const { data: subData, error: subError } = await supabase
          .from('subtopics')
          .select('*')
          .eq('module_id', id)
          .order('order_index', { ascending: true });
        
        if (subError) throw subError;
        setSubtopics(subData || []);
        
      } catch (err) {
        console.error('Error fetching module details:', err.message);
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchModuleAndSubtopics();
    }
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando detalle del módulo...</h2>
      </div>
    );
  }

  if (!moduleData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Módulo no encontrado</h2>
        <Link to="/modules" className="btn btn-primary" style={{ marginTop: '1rem' }}>Volver a Módulos</Link>
      </div>
    );
  }

  return (
    <div>
      {/* --- ENCABEZADO DEL MÓDULO --- */}
      <div className="page-header">
        <Link to="/modules" style={{ color: 'var(--primary-light)', fontSize: '0.875rem', marginBottom: '1rem', display: 'inline-block' }}>
          &larr; Volver a Módulos
        </Link>
        <h1 className="page-title">{moduleData.title}</h1>
        <p className="page-description">{moduleData.description}</p>
      </div>

      {/* --- LISTA DE SUBTEMAS --- */}
      {subtopics.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)' }}>
          <p style={{ color: 'var(--text-muted)' }}>No hay subtemas disponibles para este módulo.</p>
        </div>
      ) : (
        <div style={{ backgroundColor: 'var(--white)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--border-color)' }}>
          {subtopics.map((subtopic, index) => (
            <div key={subtopic.id} style={{ padding: '1.5rem', borderBottom: index !== subtopics.length - 1 ? '1px solid var(--border-color)' : 'none', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              
              {/* Información Básica del Subtema */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#e0e7ff', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, flexShrink: 0 }}>
                  {index + 1}
                </div>
                <div>
                  <h4 style={{ fontWeight: 600, fontSize: '1.125rem', color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                    {subtopic.title}
                  </h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', lineHeight: '1.5' }}>
                    {subtopic.description}
                  </p>
                </div>
              </div>
              
              {/* Placeholder estético ya que no conectamos clases todavía */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', backgroundColor: 'var(--bg-color)', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)' }}>
                <BookOpen size={16} />
                <span>Subtema</span>
              </div>
              
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
