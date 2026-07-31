import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Save, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const { programId } = useParams();
  const role = currentUser?.role;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState('diplomado');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    async function fetchProgram() {
      if (!programId) return;
      try {
        const { data, error } = await supabase
          .from('diploma_programs')
          .select('title, description, program_type')
          .eq('id', programId)
          .single();
        
        if (error) throw error;
        setTitle(data.title || '');
        setDescription(data.description || '');
        setProgramType(data.program_type || 'diplomado');
      } catch (err) {
        console.error('Error fetching program:', err);
        setError('No se pudo cargar la información del programa.');
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, [programId]);

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const { error: updateError } = await supabase
        .from('diploma_programs')
        .update({ title, description })
        .eq('id', programId);
      
      if (updateError) throw updateError;
      setSuccess('Datos del programa guardados correctamente.');
    } catch (err) {
      console.error('Error saving program:', err);
      setError('Hubo un error al guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (role !== 'admin') {
    return (
      <div className="page-header">
        <h2>Acceso Denegado</h2>
        <p>Esta vista es exclusiva para administradores.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h2>Configurar {programType === 'curso' ? 'Curso' : 'Diplomado'}</h2>
        <p>Actualiza la información básica de este programa.</p>
      </div>

      <div className="card" style={{ marginTop: '20px', maxWidth: '600px' }}>
        {error && (
          <div style={{ padding: '1rem', backgroundColor: '#fef2f2', color: '#dc2626', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div style={{ padding: '1rem', backgroundColor: '#f0fdf4', color: '#16a34a', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={18} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Título del Programa</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Descripción</label>
            <textarea 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'vertical' }}
            />
          </div>
          
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content' }}>
            <Save size={18} />
            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
