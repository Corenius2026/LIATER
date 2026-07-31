import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Settings, Save, AlertCircle, CheckCircle, Upload, Trash2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { uploadProgramCover } from '../services/programService';

export default function AdminSettings() {
  const { currentUser } = useAuth();
  const { programId } = useParams();
  const role = currentUser?.role;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [programType, setProgramType] = useState('diplomado');
  const [imageUrl, setImageUrl] = useState(null);
  
  // Estados para subida de imagen de portada
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [uploadingCover, setUploadingCover] = useState(false);

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
          .select('title, description, program_type, image_url')
          .eq('id', programId)
          .single();
        
        if (error) throw error;
        setTitle(data.title || '');
        setDescription(data.description || '');
        setProgramType(data.program_type || 'diplomado');
        setImageUrl(data.image_url || null);
        if (data.image_url) {
          setCoverPreview(data.image_url);
        }
      } catch (err) {
        console.error('Error fetching program:', err);
        setError('No se pudo cargar la información del programa.');
      } finally {
        setLoading(false);
      }
    }
    fetchProgram();
  }, [programId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar Formato (JPG, PNG, WebP)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Formato no permitido. Selecciona únicamente imágenes JPG, PNG o WebP.');
      return;
    }

    // Validar Tamaño (Máx 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('La imagen excede el límite máximo de 5MB.');
      return;
    }

    setError('');
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setCoverFile(null);
    setCoverPreview(null);
    setImageUrl(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      let finalImageUrl = imageUrl;

      // Subir nueva imagen si fue seleccionada
      if (coverFile) {
        setUploadingCover(true);
        const { publicUrl, error: uploadErr } = await uploadProgramCover(coverFile, programId);
        setUploadingCover(false);

        if (uploadErr) {
          throw new Error('Error al subir la imagen de portada: ' + uploadErr.message);
        }
        if (publicUrl) {
          finalImageUrl = publicUrl;
        }
      }

      // Actualizar registro en base de datos
      const { error: updateError } = await supabase
        .from('diploma_programs')
        .update({ 
          title, 
          description,
          image_url: finalImageUrl 
        })
        .eq('id', programId);
      
      if (updateError) throw updateError;
      
      setImageUrl(finalImageUrl);
      setCoverFile(null);
      setSuccess('Datos e imagen del programa guardados correctamente.');
    } catch (err) {
      console.error('Error saving program:', err);
      setError(err.message || 'Hubo un error al guardar los cambios.');
    } finally {
      setSaving(false);
      setUploadingCover(false);
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

  const isButtonDisabled = saving || uploadingCover;

  return (
    <div className="admin-settings-page">
      <div className="page-header">
        <h2>Configurar {programType === 'curso' ? 'Curso' : 'Diplomado'}</h2>
        <p>Actualiza la información básica y la imagen de portada de este programa.</p>
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
            <label htmlFor="settings-title-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Título del Programa</label>
            <input 
              id="settings-title-input"
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)' }}
            />
          </div>
          
          <div>
            <label htmlFor="settings-description-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>Descripción</label>
            <textarea 
              id="settings-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="4"
              style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--border-color)', resize: 'vertical' }}
            />
          </div>

          {/* SECCIÓN DE GESTIÓN DE PORTADA */}
          <div>
            <label htmlFor="settings-cover-input" style={{ display: 'block', fontWeight: 'bold', marginBottom: '8px' }}>
              Imagen de Portada
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {coverPreview ? (
                <div style={{ position: 'relative', width: '100%', height: '180px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-color)', background: '#f8fafc' }}>
                  <img src={coverPreview} alt="Portada del programa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', bottom: '10px', right: '10px', display: 'flex', gap: '8px' }}>
                    <label 
                      htmlFor="settings-cover-input" 
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('settings-cover-input')?.click(); } }}
                      style={{ background: 'var(--navy)', color: 'white', padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'var(--shadow-sm)' }}
                    >
                      <Upload size={14} /> Cambiar
                    </label>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: 'var(--shadow-sm)' }}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  </div>
                </div>
              ) : (
                <label 
                  htmlFor="settings-cover-input"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); document.getElementById('settings-cover-input')?.click(); } }}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '2rem', border: '2px dashed var(--border-color)', borderRadius: '6px', background: '#f8fafc', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  <ImageIcon size={32} color="var(--navy)" />
                  <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--navy)' }}>Cargar Imagen de Portada</span>
                  <span style={{ fontSize: '0.78rem' }}>JPG, PNG o WebP (Máximo 5MB)</span>
                </label>
              )}

              <input 
                id="settings-cover-input"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={isButtonDisabled} 
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', width: 'fit-content', padding: '10px 20px', fontWeight: 700 }}
          >
            <Save size={18} />
            <span>
              {uploadingCover ? 'Subiendo imagen...' : saving ? 'Guardando...' : 'Guardar Cambios'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
