import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Linkedin, User } from 'lucide-react';

export default function Teachers() {
  const [teachersList, setTeachersList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTeachers() {
      try {
        const { data, error } = await supabase
          .from('teacher_profiles')
          .select('*');
        
        if (error) throw error;
        setTeachersList(data || []);
      } catch (err) {
        console.error('Error fetching teachers:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Cargando profesores...</h2>
      </div>
    );
  }

  if (teachersList.length === 0) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        <h2>Aún no hay profesores registrados</h2>
        <p>Los perfiles de los docentes aparecerán aquí pronto.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Cuerpo Docente</h1>
        <p className="page-description">Conoce a los expertos que te acompañarán durante el diplomado.</p>
      </div>

      <div className="grid-3">
        {teachersList.map(teacher => (
          <div key={teacher.id} className="card" style={{ textAlign: 'center', padding: '2rem 1.5rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ margin: '0 auto', marginBottom: '1rem' }}>
              {teacher.photo_url || teacher.photo ? (
                <img 
                  src={teacher.photo_url || teacher.photo} 
                  alt={teacher.name} 
                  style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} 
                />
              ) : (
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                  <User size={48} />
                </div>
              )}
            </div>
            
            <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.25rem' }}>{teacher.name}</h3>
            <p style={{ color: 'var(--primary-light)', fontWeight: 500, fontSize: '0.875rem', marginBottom: '1rem' }}>{teacher.area || 'Docente'}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1.5rem', flex: 1 }}>{teacher.bio || 'Sin biografía disponible.'}</p>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {(teacher.linkedin_url || teacher.linkedin) && (
                <a 
                  href={teacher.linkedin_url || teacher.linkedin} 
                  target="_blank" 
                  rel="noreferrer" 
                  className="btn btn-outline" 
                  style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '0.5rem' }}
                >
                  <Linkedin size={18} /> LinkedIn
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
