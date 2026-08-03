import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { updateDoubtStatus } from '../services/doubtService';
import { formatClassDate } from '../utils/dateUtils';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Video, FileText, Megaphone, Presentation,
  Play, Plus, Upload, Link as LinkIcon, Clock, CheckCircle2,
  CalendarDays, Timer, ShieldAlert, Eye, Pencil, Trash2,
  AlertCircle, Info, Layers, X, User, MessageSquare, Users,
  Search, Filter, Check, Archive, RefreshCw, FileCheck,
  Sparkles, Bot, CheckCheck, XCircle, ChevronDown, ChevronUp,
  Edit3, EyeOff, Save, PlusCircle
} from 'lucide-react';


import './TeacherPanel.css';
import AdminClassReinforcement from '../components/AdminClassReinforcement';

/* ─────────────────────────────────────────
   HELPERS & CONFIG
───────────────────────────────────────── */
// Context para pasar el teacher_profile completo a todos los tabs
const TeacherContext = React.createContext(null);
const useTeacherContext = () => React.useContext(TeacherContext);

const TYPE_CONFIG = {
  pdf:          { bg: '#fef2f2', color: '#dc2626', label: 'PDF' },
  presentation: { bg: '#eff6ff', color: 'var(--navy)', label: 'Presentación' },
  link:         { bg: '#f0fdf4', color: 'var(--green-600)', label: 'Enlace' },
  file:         { bg: '#fef9c3', color: '#ca8a04', label: 'Archivo' },
};

function TypePill({ type }) {
  const cfg = TYPE_CONFIG[type] ?? { bg: '#f1f5f9', color: '#64748b', label: type };
  return (
    <span style={{ padding: '3px 10px', borderRadius: '9999px', fontSize: '0.72rem', fontWeight: 600, background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  );
}

function TagPill({ tag }) {
  const map = { general: 'tag-general', urgent: 'tag-urgent', info: 'tag-info' };
  const labels = { general: 'General', urgent: '⚠️ Urgente', info: '✓ Aviso' };
  return <span className={`announcement-tag ${map[tag] ?? 'tag-general'}`}>{labels[tag] ?? tag}</span>;
}




/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MODAL DE DETALLE DE CLASE Y MATERIALES
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* ─────────────────────────────────────────
   MODAL DE DETALLE Y GESTIÓN DE CLASE
───────────────────────────────────────── */
function ClassDetailModal({ selectedClass, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 1. Estado para Información de la Clase
  const [classTitle, setClassTitle] = useState(selectedClass?.title || '');
  const [classDesc, setClassDesc] = useState(selectedClass?.description || '');
  const [classVideoUrl, setClassVideoUrl] = useState(selectedClass?.video_url || '');
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');
  const [savingVideo, setSavingVideo] = useState(false);
  const [videoMsg, setVideoMsg] = useState('');

  // 2. Estado para Presentación y Materiales
  const [editId, setEditId] = useState(null);
  const [matTitle, setMatTitle] = useState('');
  const [matType, setMatType] = useState('presentation'); // 'presentation' | 'file' | 'pdf' | 'link'
  const [matProvider, setMatProvider] = useState('drive'); // 'drive' | 'pc' | 'external'
  const [matUrl, setMatUrl] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeAddSection, setActiveAddSection] = useState(null); // 'presentation' | 'complementary' | null

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('class_id', selectedClass.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setMaterials(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      setClassTitle(selectedClass.title || '');
      setClassDesc(selectedClass.description || '');
      setClassVideoUrl(selectedClass.video_url || '');
      fetchMaterials();
    }
  }, [selectedClass]);

  const handleSaveVideo = async (e) => {
    e.preventDefault();
    setSavingVideo(true);
    setVideoMsg('');
    try {
      const { error: updateErr } = await supabase
        .from('class_sessions')
        .update({ video_url: classVideoUrl.trim() || null })
        .eq('id', selectedClass.id);
      if (updateErr) throw updateErr;
      selectedClass.video_url = classVideoUrl.trim() || null;
      setVideoMsg('URL de grabación guardada con éxito.');
      setTimeout(() => setVideoMsg(''), 3000);
    } catch (err) {
      setVideoMsg('Error al guardar URL de grabación: ' + err.message);
    } finally {
      setSavingVideo(false);
    }
  };

  // Guardar Información de la clase
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg('');
    try {
      const { error: updateErr } = await supabase
        .from('class_sessions')
        .update({
          title: classTitle.trim(),
          description: classDesc.trim()
        })
        .eq('id', selectedClass.id);
      if (updateErr) throw updateErr;
      selectedClass.title = classTitle.trim();
      selectedClass.description = classDesc.trim();
      setInfoMsg('Información de la clase actualizada con éxito.');
    } catch (err) {
      setInfoMsg('Error al actualizar información: ' + err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  const handleEditResource = (p) => {
    setEditId(p.id);
    setMatTitle(p.title);
    setMatType(p.resource_type);
    setMatProvider(p.provider || 'drive');
    setMatUrl(p.url || '');
    setIsVisible(p.is_visible);
    setActiveAddSection(p.resource_type === 'presentation' ? 'presentation' : 'complementary');
    setError('');
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setMatTitle('');
    setMatType('presentation');
    setMatProvider('drive');
    setMatUrl('');
    setIsVisible(true);
    setActiveAddSection(null);
    setError('');
  };

  const handleSubmitResource = async (e, sectionType) => {
    e.preventDefault();
    if (!matTitle.trim() || !matUrl.trim()) {
      setError('El título y el enlace o archivo son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const targetType = sectionType === 'presentation' ? 'presentation' : (matType === 'presentation' ? 'file' : matType);

    const payload = {
      class_id: selectedClass.id,
      title: matTitle.trim(),
      resource_type: targetType,
      provider: matProvider,
      url: matUrl.trim(),
      is_visible: isVisible
    };

    try {
      if (editId) {
        const { error: updateError } = await supabase
          .from('resources')
          .update(payload)
          .eq('id', editId)
          .eq('class_id', selectedClass.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('resources')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      handleCancelEdit();
      await fetchMaterials();
    } catch (err) {
      setError('Error al guardar recurso: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResource = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este material?')) return;
    try {
      const { error: deleteError } = await supabase
        .from('resources')
        .delete()
        .eq('id', id)
        .eq('class_id', selectedClass.id);
      if (deleteError) throw deleteError;
      await fetchMaterials();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  const presentations = materials.filter(m => m.resource_type === 'presentation');
  const complementaryMaterials = materials.filter(m => m.resource_type !== 'presentation');

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20, 33, 61, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)' }}>
      <div className="card" style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', background: 'var(--white)', position: 'relative', padding: '2.5rem', borderRadius: '12px' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        {/* ENCABEZADO DE LA CLASE */}
        <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>
          <span className="badge badge-navy" style={{ textTransform: 'uppercase', fontSize: '0.7rem', marginBottom: '0.5rem', display: 'inline-block' }}>
            Gestión de Clase
          </span>
          <h2 style={{ marginBottom: '0.5rem', fontWeight: 800, fontSize: '1.5rem', color: 'var(--navy)' }}>{selectedClass.title}</h2>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Layers size={14} /> {selectedClass.subtopics?.modules?.title || 'Sin módulo'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> {selectedClass.subtopics?.title || 'Sin subtema'}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={14} /> {formatClassDate(selectedClass.class_date, false)}</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Timer size={14} /> {selectedClass.duration || 0} min</span>
          </div>
        </div>

        {error && <div style={{ color: '#dc2626', background: '#fef2f2', border: '1px solid #fca5a5', padding: '0.75rem', borderRadius: '6px', marginBottom: '1.5rem', fontSize: '0.85rem' }}>{error}</div>}

        {/* ─── SECCIÓN 1: INFORMACIÓN DE LA CLASE ─── */}
        <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Info size={18} color="var(--navy)" /> 1. Información de la Clase
          </h3>
          {infoMsg && <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', color: infoMsg.includes('Error') ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{infoMsg}</div>}
          <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>Título de la Clase</label>
              <input type="text" value={classTitle} onChange={e => setClassTitle(e.target.value)} style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--white)' }} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>Pequeña Descripción</label>
              <textarea rows={2} value={classDesc} onChange={e => setClassDesc(e.target.value)} placeholder="Breve resumen o temas principales a abordar en esta sesión..." style={{ width: '100%', padding: '0.6rem', border: '1px solid var(--border-color)', borderRadius: '6px', background: 'var(--white)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" disabled={savingInfo} className="btn btn-navy" style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 700 }}>
                {savingInfo ? 'Guardando...' : 'Guardar Información'}
              </button>
            </div>
          </form>
        </div>

        {/* ─── SECCIÓN 2: PRESENTACIÓN DE LA CLASE ─── */}
        <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Presentation size={18} color="var(--navy)" /> 2. Presentación de la Clase
            </h3>
            <button 
              onClick={() => {
                if (activeAddSection === 'presentation' && !editId) {
                  setActiveAddSection(null);
                } else {
                  handleCancelEdit();
                  setActiveAddSection('presentation');
                }
              }} 
              className="btn btn-navy"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <Plus size={15} /> {activeAddSection === 'presentation' ? 'Cerrar Formulario' : 'Cargar Presentación (PC / Drive)'}
            </button>
          </div>

          {/* Formulario de Presentación */}
          {activeAddSection === 'presentation' && (
            <form onSubmit={e => handleSubmitResource(e, 'presentation')} style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.85rem 0', color: 'var(--navy)', fontSize: '0.9rem', fontWeight: 700 }}>
                {editId ? 'Editar Presentación' : 'Cargar Nueva Presentación'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Título del archivo / diapositivas</label>
                  <input type="text" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Ej. Presentación Módulo 1 - Diapositivas" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Origen / Proveedor</label>
                  <select value={matProvider} onChange={e => setMatProvider(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <option value="drive">Google Drive / OneDrive</option>
                    <option value="pc">Archivo de PC (Enlace)</option>
                    <option value="external">Otro Enlace Externo</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '0.85rem' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>URL del archivo o enlace de compartir</label>
                <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://drive.google.com/..." style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={handleCancelEdit} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-navy" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  {submitting ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Cargar Presentación')}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Presentaciones */}
          {presentations.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No hay presentaciones vinculadas a esta clase.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {presentations.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Presentation size={18} color="var(--navy)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Origen: {p.provider}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'var(--navy)' }}>Ver</a>
                    <button onClick={() => handleEditResource(p)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}>Editar</button>
                    <button onClick={() => handleDeleteResource(p.id)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid #fca5a5', color: '#dc2626', background: '#fef2f2' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ─── SECCIÓN 3: GRABACIÓN DE LA CLASE ─── */}
        <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid var(--border-color)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Video size={18} color="var(--navy)" /> 3. Grabación / Transmisión de la Clase
          </h3>
          <form onSubmit={handleSaveVideo} style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>
                URL del Video de la Clase (YouTube, Vimeo, Google Drive o Loom)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="url" 
                  value={classVideoUrl} 
                  onChange={e => setClassVideoUrl(e.target.value)} 
                  placeholder="https://www.youtube.com/watch?v=... o Drive / Vimeo" 
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.88rem' }} 
                />
                <button type="submit" disabled={savingVideo} className="btn btn-navy" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {savingVideo ? 'Guardando...' : 'Guardar Video'}
                </button>
              </div>
            </div>
            {videoMsg && (
              <div style={{ fontSize: '0.8rem', color: videoMsg.includes('Error') ? '#dc2626' : '#166534', fontWeight: 600 }}>
                {videoMsg}
              </div>
            )}
            {selectedClass.video_url && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Visualización activa:</span>
                <a href={selectedClass.video_url} target="_blank" rel="noreferrer" style={{ color: 'var(--navy)', fontWeight: 600 }}>
                  Abrir enlace cargado ↗
                </a>
              </div>
            )}
          </form>
        </div>

        {/* ─── SECCIÓN 4: MATERIAL COMPLEMENTARIO ─── */}
        <div style={{ background: 'var(--bg-light)', padding: '1.5rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={18} color="var(--navy)" /> 4. Material Complementario
            </h3>
            <button 
              onClick={() => {
                if (activeAddSection === 'complementary' && !editId) {
                  setActiveAddSection(null);
                } else {
                  handleCancelEdit();
                  setActiveAddSection('complementary');
                }
              }} 
              className="btn btn-navy"
              style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}
            >
              <Plus size={15} /> {activeAddSection === 'complementary' ? 'Cerrar Formulario' : 'Agregar Material (PC / Drive)'}
            </button>
          </div>

          {/* Formulario de Material Complementario */}
          {activeAddSection === 'complementary' && (
            <form onSubmit={e => handleSubmitResource(e, 'complementary')} style={{ background: 'var(--white)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.25rem', border: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.85rem 0', color: 'var(--navy)', fontSize: '0.9rem', fontWeight: 700 }}>
                {editId ? 'Editar Material Complementario' : 'Añadir Material Complementario'}
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Título del recurso</label>
                  <input type="text" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Ej. Lectura recomendada, Guía PDF" style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Tipo de Recurso</label>
                  <select value={matType} onChange={e => setMatType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <option value="pdf">Documento PDF</option>
                    <option value="link">Enlace Web</option>
                    <option value="file">Archivo General</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>Origen / Proveedor</label>
                  <select value={matProvider} onChange={e => setMatProvider(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                    <option value="drive">Google Drive / OneDrive</option>
                    <option value="pc">Archivo de PC (Enlace)</option>
                    <option value="external">Otro Enlace Externo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600 }}>URL del archivo o enlace de lectura</label>
                  <input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                <button type="button" onClick={handleCancelEdit} className="btn" style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}>Cancelar</button>
                <button type="submit" disabled={submitting} className="btn btn-navy" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>
                  {submitting ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Agregar Material')}
                </button>
              </div>
            </form>
          )}

          {/* Lista de Material Complementario */}
          {complementaryMaterials.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>No hay material complementario asociado a esta clase.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {complementaryMaterials.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <FileText size={18} color="var(--navy)" />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>{p.title}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                        <TypePill type={p.resource_type} />
                        <span>Origen: {p.provider}</span>
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <a href={p.url} target="_blank" rel="noreferrer" className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid var(--border-color)', textDecoration: 'none', color: 'var(--navy)' }}>Ver</a>
                    <button onClick={() => handleEditResource(p)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}>Editar</button>
                    <button onClick={() => handleDeleteResource(p.id)} className="btn" style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', border: '1px solid #fca5a5', color: '#dc2626', background: '#fef2f2' }}>Eliminar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* --- SECCIÓN 3: ACTIVIDAD DE REFORZAMIENTO --- */}
          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border-color)' }}>
            <AdminClassReinforcement classId={selectedClass.id} />
          </div>

        </div>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 3 — Mis Clases
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ClasesTab() {
  const { id: teacherId, profile, programId } = useTeacherContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    if (!programId) return;
    async function fetchMyClasses() {
      try {
        setLoading(true);
        // Fetch all classes for this program — teacher can see all classes assigned to the program
        const { data, error: fetchError } = await supabase
          .from('class_sessions')
          .select('*, subtopics(title, module_id, modules(title, program_id))')
          .eq('program_id', programId)
          .order('class_date', { ascending: true });

        if (fetchError) throw fetchError;
        setClasses(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMyClasses();
  }, [programId]);

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tus clases asignadas...</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--danger)' }}>Error al cargar clases: {error}</div>;
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Mis clases ({classes.length})</span>
      </div>

      {classes.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
          <BookOpen size={48} color="var(--primary-light)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>Aún no tienes clases asignadas</h3>
          <p style={{ color: 'var(--text-muted)' }}>Cuando un administrador te asigne una clase, aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {classes.map(cls => {
            const isCompleted = new Date(cls.class_date) < new Date();
            const statusClass = isCompleted ? 'completed' : 'upcoming';

            return (
              <div className="class-card" key={cls.id}>
                <div className={`class-status-dot ${statusClass}`} />

                <div className="class-card-body">
                  <div className="class-title">{cls.title}</div>
                  <div className="class-meta">
                    <span>{cls.subtopics?.modules?.title || 'Módulo Desconocido'}</span> Â· 
                    <span>{cls.subtopics?.title || 'Subtema Desconocido'}</span> Â· 
                    <CalendarDays size={12} style={{ display:'inline', margin:'0 3px 0 6px', verticalAlign:'middle' }} />
                    <span>{formatClassDate(cls.class_date, false)}</span> Â· 
                    <Timer size={12} style={{ display:'inline', margin:'0 3px 0 6px', verticalAlign:'middle' }} />
                    <span>{cls.duration || 0} min</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
                  <button onClick={() => setSelectedClass(cls)} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
                    <Eye size={14} /> Ver Clase
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedClass && (
        <ClassDetailModal 
          selectedClass={selectedClass} 
          onClose={() => setSelectedClass(null)} 
        />
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 4 — Materiales de Apoyo (Global)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SupportMaterialsTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId || !programId) return;
    async function fetchMaterials() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('resources')
          .select('*, class_sessions!inner(title, teacher_id, program_id)')
          .eq('class_sessions.teacher_id', teacherId)
          .eq('program_id', programId)
          .in('resource_type', ['presentation', 'pdf', 'link', 'file'])
          .order('created_at', { ascending: false });
        
        setMaterials(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchMaterials();
  }, [teacherId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Materiales de apoyo ({materials.length})</span>
      </div>

      <div style={{ background: '#eef2ff', color: '#3730a3', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Nota sobre la gestión de materiales</strong>
          Para añadir, editar o eliminar un material de una de tus clases, ve a la pestaña <strong>Mis Clases</strong>, haz clic en <strong>Ver Clase</strong> y gestiónalo desde allí. Aquí puedes ver una lista consolidada de todo el material.
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando materiales...</p>
      ) : materials.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay materiales de apoyo en tus clases.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {materials.map(p => (
            <div className="resource-row" key={p.id}>
              <div className="resource-icon-box" style={{ background: '#f8fafc' }}>
                <FileText size={20} color="#64748b" />
              </div>
              <div className="resource-row-body">
                <div className="resource-row-title">{p.title}</div>
                <div className="resource-row-meta">Clase: {p.class_sessions?.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <TypePill type={p.resource_type} />
                <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}><Eye size={13} style={{display:'inline', marginRight:'4px'}}/> Ver</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MODAL DE ANUNCIOS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AnnouncementModal({ announcement, onClose, onRefresh }) {
  const { id: teacherId, programId } = useTeacherContext();
  const [title, setTitle] = useState(announcement?.title || '');
  const [body, setBody] = useState(announcement?.body || '');
  const [tag, setTag] = useState(announcement?.tag || 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('El título y el mensaje son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      teacher_id: teacherId,
      program_id: programId,
      title: title.trim(),
      body: body.trim(),
      tag
    };

    try {
      if (announcement?.id) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id)
          .eq('teacher_id', teacherId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Error al guardar el anuncio: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'white', position: 'relative', padding: '2rem' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Título del anuncio</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Nivel de importancia (Etiqueta)</label>
            <select value={tag} onChange={e => setTag(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <option value="general">General</option>
              <option value="info">Aviso Importante (Info)</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', resize: 'vertical' }} required />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Guardando...' : (announcement ? 'Guardar Cambios' : 'Publicar Anuncio')}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 7 — Anuncios
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AnunciosTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    if (!teacherId || !programId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [teacherId]);

  const handleEdit = (a) => {
    setSelectedAnnouncement(a);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Anuncios publicados ({announcements.length})</span>
        <button onClick={handleCreate} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Nuevo Anuncio
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando anuncios...</p>
      ) : announcements.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
          <Megaphone size={48} color="var(--primary-light)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No hay anuncios publicados</h3>
          <p style={{ color: 'var(--text-muted)' }}>Publica un anuncio para comunicarte con tus estudiantes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map(a => (
            <div className={`announcement-card ${a.tag !== 'general' ? a.tag : ''}`} key={a.id}>
              <TagPill tag={a.tag} />
              <div className="announcement-header">
                <div className="announcement-title">{a.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="announcement-date">{formatClassDate(a.created_at, false)}</span>
                  <button onClick={() => handleEdit(a)} style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(a.id)} style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="announcement-body">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AnnouncementModal 
          announcement={selectedAnnouncement} 
          onClose={() => setShowModal(false)} 
          onRefresh={fetchAnnouncements}
        />
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 7 — Perfil
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PerfilTab() {
  const { profile, setProfile } = useTeacherContext();
  const [newPassword, setNewPassword] = useState('');
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ area: profile.area || '', bio: profile.bio || '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update({ area: editData.area, bio: editData.bio })
        .eq('id', profile.id)
        .select('*, users_profile(email)')
        .single();
      
      if (error) throw error;
      setProfile(data);
      setEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Error al actualizar perfil: ' + err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdMsg({ text: 'Debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }
    setUpdatingPwd(true);
    setPwdMsg({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwdMsg({ text: 'Contraseña actualizada con éxito.', type: 'success' });
      setNewPassword('');
    } catch (err) {
      setPwdMsg({ text: 'Error al actualizar: ' + err.message, type: 'error' });
    } finally {
      setUpdatingPwd(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Mi Perfil Público</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem' }}>
            <Pencil size={16} /> Editar Perfil
          </button>
        )}
      </div>
      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=14213D&color=FCA311&size=150`} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile.users_profile?.email}</p>
          </div>
        </div>
        {editing ? (
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Especialidad / Área</label>
              <input type="text" value={editData.area} onChange={e => setEditData({...editData, area: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Biografía corta</label>
              <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} rows={4} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Cambios</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Especialidad / Área</label>
              <input type="text" value={profile.area || ''} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#f8fafc' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Biografía corta</label>
              <textarea value={profile.bio || ''} disabled rows={4} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#f8fafc' }} />
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ maxWidth: '600px', marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Cambiar Contraseña</h3>
        {pwdMsg.text && (
          <div style={{ color: pwdMsg.type === 'error' ? 'red' : 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {pwdMsg.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Nueva Contraseña</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
            />
          </div>
          <button type="submit" disabled={updatingPwd} className="btn btn-primary">
            {updatingPwd ? 'Guardando...' : 'Actualizar'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HELPER COMPONENT: StatusChip
───────────────────────────────────────── */
function StatusChip({ status }) {
  const configs = {
    enviada: { bg: '#dbeafe', color: '#1e40af', icon: <Clock size={13} />, label: 'Enviada (Sin revisar)' },
    revisada: { bg: '#fef3c7', color: '#92400e', icon: <Eye size={13} />, label: 'Revisada' },
    atendida: { bg: '#dcfce7', color: '#166534', icon: <CheckCircle2 size={13} />, label: 'Atendida en clase' },
    archivada: { bg: '#f1f5f9', color: '#475569', icon: <Layers size={13} />, label: 'Archivada' }
  };
  const cfg = configs[status] || configs.enviada;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '12px',
      fontSize: '0.74rem',
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen (Hero + stats rápidas)
───────────────────────────────────────── */
function ResumenTab({ onChangeTab }) {
  const { profile, programId, currentProgram } = useTeacherContext();
  const [stats, setStats] = useState({ totalClasses: 0, completed: 0, upcoming: 0, announcements: 0, students: 0, questions: 0 });
  const [loading, setLoading] = useState(true);
  const [upcomingClasses, setUpcomingClasses] = useState([]);
  const [pendingDoubts, setPendingDoubts] = useState([]);

  const fetchStatsAndDoubts = async () => {
    if (!programId) return;
    try {
      setLoading(true);

      const pClasses = supabase.from('class_sessions')
        .select('id, title, class_date, program_id, duration, description')
        .eq('program_id', programId)
        .order('class_date', { ascending: true });
        
      const pAnnouncements = supabase.from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId);
        
      const pStudents = supabase.from('enrollments')
        .select('student_id, users_profile!inner(role)', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('users_profile.role', 'student');

      // Consultar dudas no revisadas ('enviada') para el contador dinámico
      const pUnreviewedDoubts = supabase.from('class_doubts')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('status', 'enviada');

      // Consultar las últimas dudas recibidas que requieren atención
      const pTopDoubts = supabase.from('class_doubts')
        .select(`
          *,
          class_sessions (id, title),
          users_profile:student_id (full_name)
        `)
        .eq('program_id', programId)
        .in('status', ['enviada', 'revisada'])
        .order('created_at', { ascending: false })
        .limit(3);
      
      const [resClasses, resAnn, resStudents, resUnreviewed, resTopDoubts] = await Promise.all([
        pClasses, pAnnouncements, pStudents, pUnreviewedDoubts, pTopDoubts
      ]);
      
      const classes = resClasses.data || [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const completed = classes.filter(c => new Date(c.class_date) < startOfToday).length;
      const upcomingList = classes.filter(c => new Date(c.class_date) >= startOfToday);
      const displayUpcoming = upcomingList.length > 0 ? upcomingList : classes;
      
      setUpcomingClasses(displayUpcoming.slice(0, 3));
      setPendingDoubts(resTopDoubts.data || []);

      setStats({
        totalClasses: classes.length,
        completed,
        upcoming: upcomingList.length || classes.length,
        announcements: resAnn.count || 0,
        students: resStudents.count || 0,
        questions: resUnreviewed.count || 0
      });
    } catch (err) {
      console.error('Error fetching teacher stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndDoubts();
  }, [profile?.id, programId]);

  // Actualizar estado de una duda directamente desde el Resumen y actualizar contador en caliente
  const handleQuickStatusChange = async (doubtId, newStatus) => {
    setPendingDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
    
    // Si la duda pasa de 'enviada' a otro estado, decrementar el contador dinámicamente
    const target = pendingDoubts.find(d => d.id === doubtId);
    if (target && target.status === 'enviada' && newStatus !== 'enviada') {
      setStats(prev => ({ ...prev, questions: Math.max(0, prev.questions - 1) }));
    }

    await updateDoubtStatus(doubtId, newStatus);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando resumen del programa...</div>;
  }

  return (
    <div>
      {/* 1. Encabezado del programa */}
      <div className="card" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
        <div>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600, marginBottom: '0.5rem' }}>
             {currentProgram?.program_type === 'curso' ? 'Curso Corto' : 'Diplomado'}
           </div>
           <h1 style={{ fontSize: '1.5rem', color: 'var(--navy)', margin: '0 0 0.5rem 0' }}>{currentProgram?.title || 'Cargando programa...'}</h1>
           <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
             <span>Profesor asignado: <strong style={{color: 'var(--navy)'}}>{profile.name}</strong></span>
             <span style={{opacity: 0.5}}>•</span>
             <span style={{ color: 'var(--green-600)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
               <div style={{width:'8px', height:'8px', borderRadius:'50%', background:'var(--green-600)'}}></div> Programa activo
             </span>
             <span style={{opacity: 0.5}}>•</span>
             <span><strong>{stats.students}</strong> estudiantes</span>
           </div>
        </div>
        <button className="btn btn-navy" onClick={() => onChangeTab('anuncios')} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', whiteSpace: 'nowrap' }}>
          <Megaphone size={16} /> Crear anuncio
        </button>
      </div>

      {/* 2. Primera fila de indicadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderLeft: '4px solid var(--gold-dark)' }}>
           <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats.questions}</span>
           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>DUDAS POR REVISAR</span>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderLeft: '4px solid #f59e0b' }}>
           <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats.upcoming}</span>
           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>PRÓXIMAS CLASES</span>
        </div>
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', borderLeft: '4px solid #10b981' }}>
           <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{stats.announcements}</span>
           <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem' }}>ANUNCIOS ACTIVOS</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem' }}>
         {/* 3. Columna principal */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Dudas que requieren atención */}
            <div className="card" style={{ padding: '1.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                 <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: '1.1rem', fontWeight: 700 }}>Dudas que requieren atención</h3>
                 <button onClick={() => onChangeTab('dudas')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Ver todas las dudas</button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                 {pendingDoubts.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: '8px' }}>
                      <MessageSquare size={24} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>No hay dudas pendientes por el momento.</p>
                      <span style={{ fontSize: '0.78rem' }}>Las dudas enviadas por los estudiantes aparecerán organizadas aquí.</span>
                    </div>
                 ) : (
                    pendingDoubts.map(d => (
                       <div key={d.id} style={{ padding: '1.25rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--white)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>{d.subject}</div>
                            <StatusChip status={d.status} />
                          </div>
                          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: 1.4 }}>
                            {d.description?.length > 120 ? `${d.description.substring(0, 120)}...` : d.description}
                          </p>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                             <span>Estudiante: <strong style={{ color: 'var(--navy)' }}>{d.users_profile?.full_name || 'Estudiante'}</strong> • {d.class_sessions?.title || 'Clase'}</span>
                             <div style={{ display: 'flex', gap: '0.4rem' }}>
                               {d.status === 'enviada' && (
                                 <button onClick={() => handleQuickStatusChange(d.id, 'revisada')} className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                                   <Eye size={12} /> Marcar revisada
                                 </button>
                               )}
                               {d.status !== 'atendida' && (
                                 <button onClick={() => handleQuickStatusChange(d.id, 'atendida')} className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', color: '#166534', borderColor: '#bbf7d0' }}>
                                   <CheckCircle2 size={12} /> Atendida en clase
                                 </button>
                               )}
                             </div>
                          </div>
                       </div>
                    ))
                 )}
               </div>
            </div>

            {/* Próximas clases */}
            <div className="card" style={{ padding: '1.5rem' }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                 <h3 style={{ margin: 0, color: 'var(--navy)', fontSize: '1.1rem', fontWeight: 700 }}>Próximas clases</h3>
                 <button onClick={() => onChangeTab('clases')} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Ver clases</button>
               </div>
               
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                 {upcomingClasses.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-light)', borderRadius: '8px' }}>
                      <p style={{ margin: 0, fontSize: '0.9rem' }}>No hay próximas clases programadas.</p>
                    </div>
                 ) : (
                    upcomingClasses.map(c => (
                       <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--white)' }}>
                          <div style={{ background: 'rgba(252, 163, 17, 0.15)', color: 'var(--gold-dark)', padding: '0.6rem', borderRadius: '8px' }}>
                            <CalendarDays size={20} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--navy)', fontSize: '0.95rem' }}>{c.title}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>{new Date(c.class_date).toLocaleDateString('es-ES', {day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'})}</div>
                          </div>
                       </div>
                    ))
                 )}
               </div>
            </div>

         </div>

         {/* 4. Columna secundaria (Resumen de programa) */}
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
               <h3 style={{ margin: '0 0 1rem 0', color: 'var(--navy)', fontSize: '1.05rem', fontWeight: 700 }}>Resumen del Programa</h3>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Total Clases:</span>
                    <strong style={{ color: 'var(--navy)' }}>{stats.totalClasses}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Clases Completadas:</span>
                    <strong style={{ color: 'var(--green-600)' }}>{stats.completed}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Clases Pendientes:</span>
                    <strong style={{ color: 'var(--navy)' }}>{stats.upcoming}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Estudiantes Matriculados:</span>
                    <strong style={{ color: 'var(--navy)' }}>{stats.students}</strong>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3: Dudas de estudiantes (Gestión Docente)
───────────────────────────────────────── */
function DudasTab() {
  const { programId, currentProgram } = useTeacherContext();
  const [doubts, setDoubts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [classFilter, setClassFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateOrder, setDateOrder] = useState('desc');

  // Modal de Detalle
  const [selectedDoubt, setSelectedDoubt] = useState(null);

  const fetchDoubtsAndClasses = async () => {
    if (!programId) return;
    try {
      setLoading(true);

      // 1. Cargar clases del programa
      const { data: clsData } = await supabase
        .from('class_sessions')
        .select('id, title')
        .eq('program_id', programId)
        .order('order_index', { ascending: true });
      setClasses(clsData || []);

      // 2. Cargar dudas del programa con relaciones
      const { data: doubtData, error } = await supabase
        .from('class_doubts')
        .select(`
          *,
          class_sessions (
            id,
            title
          ),
          users_profile:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoubts(doubtData || []);
    } catch (err) {
      console.error('Error al cargar dudas del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubtsAndClasses();
  }, [programId]);

  // Actualización de estado en caliente (optimista y persistida)
  const handleStatusUpdate = async (doubtId, newStatus) => {
    setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
    if (selectedDoubt && selectedDoubt.id === doubtId) {
      setSelectedDoubt(prev => prev ? { ...prev, status: newStatus } : null);
    }
    await updateDoubtStatus(doubtId, newStatus);
  };

  // Filtrado dinámico
  const filteredDoubts = doubts.filter(d => {
    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter;
    const matchesClass = classFilter === 'todos' || d.class_id === classFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      d.subject?.toLowerCase().includes(searchLower) ||
      d.description?.toLowerCase().includes(searchLower) ||
      d.users_profile?.full_name?.toLowerCase().includes(searchLower) ||
      d.users_profile?.email?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesClass && matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const countByStatus = (st) => doubts.filter(d => d.status === st).length;

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando dudas de estudiantes...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ENCABEZADO Y RESUMEN DE ESTADOS */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="var(--gold-dark)" /> Bandeja de Consultas e Inquietudes
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Revisa y gestiona las dudas enviadas por los estudiantes del programa <strong>{currentProgram?.title}</strong> para atenderlas durante las sesiones de clase.
            </p>
          </div>
          <button onClick={fetchDoubtsAndClasses} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* CONTADORES RÁPIDOS POR ESTADO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <div
            onClick={() => setStatusFilter('todos')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'todos' ? '#f1f5f9' : 'transparent',
              border: statusFilter === 'todos' ? '1px solid var(--navy)' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>{doubts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Todas</div>
          </div>

          <div
            onClick={() => setStatusFilter('enviada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'enviada' ? '#dbeafe' : 'transparent',
              border: statusFilter === 'enviada' ? '1px solid #1e40af' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e40af' }}>{countByStatus('enviada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>Enviadas</div>
          </div>

          <div
            onClick={() => setStatusFilter('revisada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'revisada' ? '#fef3c7' : 'transparent',
              border: statusFilter === 'revisada' ? '1px solid #92400e' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#92400e' }}>{countByStatus('revisada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>Revisadas</div>
          </div>

          <div
            onClick={() => setStatusFilter('atendida')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'atendida' ? '#dcfce7' : 'transparent',
              border: statusFilter === 'atendida' ? '1px solid #166534' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>{countByStatus('atendida')}</div>
            <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Atendidas en clase</div>
          </div>

          <div
            onClick={() => setStatusFilter('archivada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'archivada' ? '#f1f5f9' : 'transparent',
              border: statusFilter === 'archivada' ? '1px solid #475569' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569' }}>{countByStatus('archivada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Archivadas</div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--white)', borderRadius: '12px', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* BUSCADOR POR TEXTO */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por asunto, estudiante o contenido..."
            style={{
              width: '100%',
              padding: '0.45rem 0.85rem 0.45rem 2.2rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.84rem'
            }}
          />
        </div>

        {/* FILTRO POR CLASE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Filter size={14} color="var(--text-muted)" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="todos">Todas las clases</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* ORDEN POR FECHA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Clock size={14} color="var(--text-muted)" />
          <select
            value={dateOrder}
            onChange={(e) => setDateOrder(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguas primero</option>
          </select>
        </div>

      </div>

      {/* LISTADO DE DUDAS / ESTADO VACÍO */}
      {filteredDoubts.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(202, 138, 4, 0.08)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <MessageSquare size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.4rem' }}>
            No hay dudas por revisar
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
            Las dudas enviadas por los estudiantes aparecerán aquí, organizadas por programa y clase.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredDoubts.map(d => (
            <div
              key={d.id}
              className="card"
              style={{
                padding: '1.25rem',
                background: 'var(--white)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'border-color 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>
                      {d.subject}
                    </h4>
                    <StatusChip status={d.status} />
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', margin: '0 0 0.6rem 0', lineHeight: 1.45 }}>
                    {d.description?.length > 180 ? `${d.description.substring(0, 180)}...` : d.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Estudiante: <strong style={{ color: 'var(--navy)' }}>{d.users_profile?.full_name || 'Estudiante'}</strong> ({d.users_profile?.email || 'Sin correo'})</span>
                    <span>•</span>
                    <span>Clase: <strong style={{ color: 'var(--navy)' }}>{d.class_sessions?.title || 'Clase'}</strong></span>
                    <span>•</span>
                    <span>Fecha: {new Date(d.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* ACCIONES DEL DOCENTE (SIN OPCIONES DE ESCRIBIR RESPUESTAS) */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedDoubt(d)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Eye size={13} /> Ver detalle
                  </button>

                  {d.status !== 'revisada' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'revisada')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#92400e', borderColor: '#fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} /> Marcar revisada
                    </button>
                  )}

                  {d.status !== 'atendida' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'atendida')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#166534', borderColor: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <CheckCircle2 size={13} /> Atendida en clase
                    </button>
                  )}

                  {d.status !== 'archivada' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'archivada')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#475569', borderColor: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Layers size={13} /> Archivar
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE DETALLE COMPLETO DE LA DUDA */}
      {selectedDoubt && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
          }}
          onClick={() => setSelectedDoubt(null)}
        >
          <div
            className="card"
            style={{
              width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto',
              background: '#ffffff', borderRadius: '16px', padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CERRAR */}
            <button
              type="button"
              onClick={() => setSelectedDoubt(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* HEADER DEL MODAL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={22} color="var(--gold-dark)" />
              </div>
              <div>
                <StatusChip status={selectedDoubt.status} />
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  {selectedDoubt.subject}
                </h3>
              </div>
            </div>

            {/* METADATOS COMPLETOS */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Estudiante:</span>
                <strong style={{ color: 'var(--navy)' }}>{selectedDoubt.users_profile?.full_name || 'Estudiante'}</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{selectedDoubt.users_profile?.email || 'Sin correo'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Clase vinculada:</span>
                <strong style={{ color: 'var(--navy)' }}>{selectedDoubt.class_sessions?.title || 'Clase'}</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Enviada el: {new Date(selectedDoubt.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* CONTENIDO DE LA CONSULTA */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                Descripción de la duda:
              </label>
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', fontSize: '0.88rem', color: 'var(--navy)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {selectedDoubt.description}
              </div>
            </div>

            {/* AVISO EXPLICATIVO DOCENTE */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>Esta duda será atendida por el docente durante la sesión de clase o espacio académico correspondiente.</span>
            </div>

            {/* ACCIONES RÁPIDAS DE ESTADO */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              {selectedDoubt.status !== 'revisada' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'revisada')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', color: '#92400e', borderColor: '#fde68a' }}
                >
                  <Eye size={14} /> Marcar como revisada
                </button>
              )}

              {selectedDoubt.status !== 'atendida' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'atendida')}
                  className="btn"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', background: '#166534', color: '#fff', border: 'none' }}
                >
                  <CheckCircle2 size={14} /> Atendida en clase
                </button>
              )}

              {selectedDoubt.status !== 'archivada' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'archivada')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', color: '#475569' }}
                >
                  <Layers size={14} /> Archivar
                </button>
              )}

              <button
                onClick={() => setSelectedDoubt(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


/* ─────────────────────────────────────────
   TAB: Estudiantes
───────────────────────────────────────── */
function EstudiantesTab() {
  const { programId } = useTeacherContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      if (!programId) return;
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('student_id, created_at, users_profile:student_id(*)')
          .eq('program_id', programId);
        if (error) throw error;
        
        // Filtrar exclusivamente los estudiantes vinculados a este programa
        const programStudents = (data || []).filter(item => 
          item.users_profile && item.users_profile.role === 'student'
        );
        
        setStudents(programStudents);
      } catch (err) {
        console.error('Error al obtener estudiantes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [programId]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando estudiantes...</div>;

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
            Estudiantes Inscritos ({students.length})
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
            Listado oficial de estudiantes matriculados en este programa.
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No hay estudiantes inscritos en este programa por el momento.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {students.map(item => (
            <div key={item.student_id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem', borderRadius: '10px', background: 'var(--bg-light)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--navy)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                {item.users_profile?.full_name ? item.users_profile.full_name.charAt(0).toUpperCase() : 'E'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.users_profile?.full_name || 'Estudiante'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.users_profile?.email || 'Sin correo registrado'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPONENTE PRINCIPAL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* ─── Borradores IA ─────────────────────────────────────────────────────── */

function BorradoresTab() {
  const { programId } = useTeacherContext();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      // 1. Obtener clases del programa actual
      const { data: classesData, error: classesErr } = await supabase
        .from('class_sessions')
        .select('id, title, program_id')
        .eq('program_id', programId);

      if (classesErr) {
        console.warn('Error cargando clases del programa:', classesErr);
      }

      const classIds = (classesData || []).map(c => c.id);
      const classMap = {};
      (classesData || []).forEach(c => { classMap[c.id] = c; });

      // 2. Consultar borradores
      let query = supabase
        .from('activity_drafts')
        .select('id, class_id, status, drive_folder_id, created_at, draft_data, reviewed_at')
        .order('created_at', { ascending: false });

      if (classIds.length > 0) {
        query = query.in('class_id', classIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Vincular datos de clase para renderizar
      const formattedDrafts = (data || []).map(d => ({
        ...d,
        class_sessions: classMap[d.class_id] || { id: d.class_id, title: 'Clase vinculada' }
      }));

      setDrafts(formattedDrafts);
    } catch (err) {
      console.error('Error cargando borradores:', err);
      showToast(`Error: ${err.message || 'No se pudieron cargar los borradores'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, [programId]);

  // Helper para sincronizar la actividad en las tablas públicas de Supabase
  const syncAndPublishActivity = async (classId, draftData) => {
    // 1. Upsert / update en class_activities
    const { data: existingAct } = await supabase
      .from('class_activities')
      .select('id')
      .eq('class_id', classId)
      .maybeSingle();

    let activityId;

    if (existingAct) {
      const { data: updatedAct, error: updateErr } = await supabase
        .from('class_activities')
        .update({
          title: draftData.activity_title || 'Actividad de Reforzamiento',
          description: draftData.activity_description || '',
          is_published: true,
          max_attempts: 3,
          is_mandatory: false,
        })
        .eq('id', existingAct.id)
        .select('id')
        .single();

      if (updateErr) throw updateErr;
      activityId = updatedAct.id;

      // Limpiar preguntas anteriores para re-insertar limpiamente
      await supabase.from('activity_questions').delete().eq('activity_id', activityId);
    } else {
      const { data: newAct, error: actErr } = await supabase
        .from('class_activities')
        .insert({
          class_id: classId,
          title: draftData.activity_title || 'Actividad de Reforzamiento',
          description: draftData.activity_description || '',
          is_published: true,
          max_attempts: 3,
          is_mandatory: false,
        })
        .select('id')
        .single();

      if (actErr) throw actErr;
      activityId = newAct.id;
    }

    // 2. Insertar preguntas y opciones
    const questions = draftData.questions || [];
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const q = questions[qIndex];

      const { data: qData, error: qErr } = await supabase
        .from('activity_questions')
        .insert({
          activity_id: activityId,
          text: q.text,
          question_type: q.question_type || 'single_choice',
          order_num: qIndex + 1,
        })
        .select('id')
        .single();

      if (qErr) throw qErr;
      const questionId = qData.id;

      let correctOptId = null;

      for (let oIndex = 0; oIndex < (q.options || []).length; oIndex++) {
        const opt = q.options[oIndex];

        const { data: optData, error: optErr } = await supabase
          .from('question_options')
          .insert({
            question_id: questionId,
            text: opt.text,
            order_num: oIndex + 1,
          })
          .select('id')
          .single();

        if (optErr) throw optErr;

        if (opt.is_correct) {
          correctOptId = optData.id;
        }
      }

      if (correctOptId) {
        await supabase
          .from('question_correct_answers')
          .upsert({
            question_id: questionId,
            correct_option_id: correctOptId,
          }, { onConflict: 'question_id' });
      }
    }
  };

  const handleApprove = async (draft) => {
    if (!window.confirm(`¿Publicar la actividad "${draft.draft_data?.activity_title}" para los alumnos?`)) return;
    setActionLoading(draft.id + '-approve');
    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (!classId) throw new Error('No se encontró el ID de la clase vinculada.');

      await syncAndPublishActivity(classId, draft.draft_data);

      await supabase
        .from('activity_drafts')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);

      showToast('¡Actividad publicada exitosamente!');
      fetchDrafts();
    } catch (err) {
      console.error('Error aprobando borrador:', err);
      showToast(`Error al publicar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (draft) => {
    if (!window.confirm(`¿Despublicar la actividad "${draft.draft_data?.activity_title}"? Los estudiantes ya no podrán verla ni responderla.`)) return;
    setActionLoading(draft.id + '-unpublish');
    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (classId) {
        await supabase
          .from('class_activities')
          .update({ is_published: false })
          .eq('class_id', classId);
      }

      await supabase
        .from('activity_drafts')
        .update({ status: 'pending' })
        .eq('id', draft.id);

      showToast('Actividad despublicada. Ha vuelto a estado pendiente.', 'info');
      fetchDrafts();
    } catch (err) {
      console.error('Error despublicando borrador:', err);
      showToast(`Error al despublicar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (draft) => {
    if (!window.confirm(`¿Eliminar permanentemente el borrador "${draft.draft_data?.activity_title || 'este borrador'}"? Esta acción no se puede deshacer.`)) return;
    setActionLoading(draft.id + '-delete');
    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (draft.status === 'approved' && classId) {
        const deleteClassAct = window.confirm('Este borrador ya estaba publicado. ¿Deseas también eliminar la actividad de la clase para que los estudiantes ya no la vean?');
        if (deleteClassAct) {
          const { data: act } = await supabase.from('class_activities').select('id').eq('class_id', classId).maybeSingle();
          if (act) {
            await supabase.from('activity_questions').delete().eq('activity_id', act.id);
            await supabase.from('class_activities').delete().eq('id', act.id);
          }
        }
      }

      const { error } = await supabase
        .from('activity_drafts')
        .delete()
        .eq('id', draft.id);

      if (error) throw error;
      showToast('Borrador eliminado exitosamente.');
      fetchDrafts();
    } catch (err) {
      console.error('Error eliminando borrador:', err);
      showToast(`Error al eliminar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (draft) => {
    if (!window.confirm('¿Rechazar y descartar este borrador?')) return;
    setActionLoading(draft.id + '-reject');
    try {
      await supabase
        .from('activity_drafts')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);
      showToast('Borrador rechazado.', 'info');
      fetchDrafts();
    } catch (err) {
      showToast('Error al rechazar el borrador.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --- LÓGICA DE EDICIÓN DEL BORRADOR ---
  const [editingDraft, setEditingDraft] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  const startEditing = (draft) => {
    setEditingDraft(draft);
    setEditFormData(JSON.parse(JSON.stringify(draft.draft_data || {
      activity_title: '',
      activity_description: '',
      questions: []
    })));
  };

  const handleSaveEditedDraft = async (publishDirectly = false) => {
    if (!editingDraft || !editFormData) return;
    if (!editFormData.activity_title?.trim()) {
      alert('Por favor asigna un título a la actividad.');
      return;
    }

    setActionLoading('saving-edit');
    try {
      const classId = editingDraft.class_id || editingDraft.class_sessions?.id;
      const shouldPublish = publishDirectly || editingDraft.status === 'approved';

      // 1. Guardar cambios en activity_drafts
      const { error: draftErr } = await supabase
        .from('activity_drafts')
        .update({
          draft_data: editFormData,
          status: shouldPublish ? 'approved' : editingDraft.status,
          reviewed_at: shouldPublish ? new Date().toISOString() : editingDraft.reviewed_at
        })
        .eq('id', editingDraft.id);

      if (draftErr) throw draftErr;

      // 2. Si se publica o ya estaba aprobado, sincronizar en base de datos real
      if (shouldPublish && classId) {
        await syncAndPublishActivity(classId, editFormData);
      }

      showToast(shouldPublish ? '¡Borrador guardado y publicado exitosamente!' : 'Borrador guardado con éxito.');
      setEditingDraft(null);
      setEditFormData(null);
      fetchDrafts();
    } catch (err) {
      console.error('Error guardando cambios del borrador:', err);
      showToast(`Error al guardar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pendiente',  icon: <Bot size={12} /> },
      approved: { bg: '#dcfce7', color: '#166534', label: 'Publicado',  icon: <CheckCheck size={12} /> },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rechazado',  icon: <XCircle size={12} /> },
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: s.bg, color: s.color,
        padding: '2px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando borradores...</div>;

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : toast.type === 'info' ? '#0369a1' : '#16a34a',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px',
          fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={20} color="var(--gold-dark)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>
            Borradores generados por IA
          </h3>
        </div>
        <button
          onClick={fetchDrafts}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px',
        padding: '0.75rem 1rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.83rem', color: '#1e40af'
      }}>
        <Bot size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          Estos borradores fueron generados automáticamente desde las transcripciones de clase.
          Puedes <strong>editar</strong> sus preguntas y retroalimentación, <strong>publicar</strong> para tus estudiantes, <strong>despublicar</strong> o <strong>eliminar</strong> cuando lo necesites.
        </span>
      </div>

      {/* Lista */}
      {drafts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <Bot size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No hay borradores</p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>Cuando se procese una transcripción de clase, el borrador aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {drafts.map(draft => (
            <div key={draft.id} style={{
              background: '#fff', border: '1px solid var(--border-color)',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: draft.status === 'pending' ? '0 0 0 2px rgba(202,138,4,0.15)' : 'none'
            }}>
              {/* Cabecera del borrador */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', gap: '1rem', flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    {statusBadge(draft.status)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(draft.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {draft.draft_data?.activity_title || 'Sin título'}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Clase: <strong>{draft.class_sessions?.title}</strong> · {draft.draft_data?.questions?.length || 0} preguntas
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  {/* Previsualizar */}
                  <button
                    onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600
                    }}
                  >
                    <Eye size={13} />
                    {expandedId === draft.id ? 'Ocultar' : 'Ver'}
                    {expandedId === draft.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => startEditing(draft)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #93c5fd',
                      background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700
                    }}
                  >
                    <Edit3 size={13} /> Editar
                  </button>

                  {/* Botones según estado */}
                  {draft.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(draft)}
                        disabled={!!actionLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none',
                          background: 'var(--navy)', color: '#fff', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === draft.id + '-approve' ? '...' : <><Check size={13} /> Publicar</>}
                      </button>
                      <button
                        onClick={() => handleReject(draft)}
                        disabled={!!actionLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fca5a5',
                          background: '#fff7f7', color: '#dc2626', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === draft.id + '-reject' ? '...' : <><XCircle size={13} /> Rechazar</>}
                      </button>
                    </>
                  )}

                  {draft.status === 'approved' && (
                    <button
                      onClick={() => handleUnpublish(draft)}
                      disabled={!!actionLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #fde047',
                        background: '#fef9c3', color: '#854d0e', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      {actionLoading === draft.id + '-unpublish' ? '...' : <><EyeOff size={13} /> Despublicar</>}
                    </button>
                  )}

                  {draft.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(draft)}
                      disabled={!!actionLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none',
                        background: 'var(--navy)', color: '#fff', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      {actionLoading === draft.id + '-approve' ? '...' : <><Check size={13} /> Publicar</>}
                    </button>
                  )}

                  {/* Eliminar borrador */}
                  <button
                    onClick={() => handleDelete(draft)}
                    disabled={!!actionLoading}
                    title="Eliminar borrador permanentemente"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #fecaca',
                      background: '#fff1f2', color: '#e11d48', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                    }}
                  >
                    {actionLoading === draft.id + '-delete' ? '...' : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Previsualización expandida de preguntas */}
              {expandedId === draft.id && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: '#fafafa' }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    {draft.draft_data?.activity_description}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(draft.draft_data?.questions || []).map((q, qi) => (
                      <div key={qi} style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                        <p style={{ margin: '0 0 0.6rem', fontWeight: 700, fontSize: '0.87rem', color: 'var(--navy)' }}>
                          {qi + 1}. {q.text}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.4rem 0.65rem', borderRadius: '7px', fontSize: '0.83rem',
                              background: opt.is_correct ? '#dcfce7' : '#f8fafc',
                              border: `1px solid ${opt.is_correct ? '#86efac' : 'var(--border-color)'}`,
                              color: opt.is_correct ? '#166534' : 'var(--text-dark)',
                              fontWeight: opt.is_correct ? 700 : 400
                            }}>
                              {opt.is_correct ? <Check size={13} /> : <span style={{ width: 13 }} />}
                              {opt.text}
                            </div>
                          ))}
                        </div>
                        {(q.explanation || q.source_basis) && (
                          <div style={{
                            margin: '0.6rem 0 0',
                            padding: '0.6rem 0.85rem',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#1e40af',
                            lineHeight: 1.45
                          }}>
                            {q.explanation && (
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.45rem', marginBottom: q.source_basis ? '0.35rem' : '0' }}>
                                <span style={{ flexShrink: 0 }}>💡</span>
                                <span>{q.explanation}</span>
                              </div>
                            )}
                            {q.source_basis && (
                              <div style={{
                                fontSize: '0.76rem',
                                color: '#1d4ed8',
                                borderTop: q.explanation ? '1px dashed #bfdbfe' : 'none',
                                paddingTop: q.explanation ? '0.35rem' : '0',
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.45rem'
                              }}>
                                <span style={{ flexShrink: 0 }}>📌</span>
                                <span><strong>Fundamento:</strong> <em>{q.source_basis}</em></span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL DE EDICIÓN DEL BORRADOR ─── */}
      {editingDraft && editFormData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '820px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-light)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Editar Borrador de Actividad
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Clase: {editingDraft.class_sessions?.title}
                </p>
              </div>
              <button
                onClick={() => { setEditingDraft(null); setEditFormData(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo con scroll */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Título de la actividad */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                  Título de la actividad *
                </label>
                <input
                  type="text"
                  value={editFormData.activity_title || ''}
                  onChange={e => setEditFormData({ ...editFormData, activity_title: e.target.value })}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none'
                  }}
                  placeholder="Ej: Cuestionario de Reforzamiento - Sesión 1"
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                  Instrucciones o descripción
                </label>
                <textarea
                  rows={2}
                  value={editFormData.activity_description || ''}
                  onChange={e => setEditFormData({ ...editFormData, activity_description: e.target.value })}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', fontSize: '0.88rem', outline: 'none', resize: 'vertical'
                  }}
                  placeholder="Instrucciones para los estudiantes..."
                />
              </div>

              {/* Lista de preguntas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy)' }}>
                    Preguntas ({editFormData.questions?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ = {
                        text: 'Nueva pregunta...',
                        question_type: 'single_choice',
                        options: [
                          { text: 'Opción 1', is_correct: true },
                          { text: 'Opción 2', is_correct: false },
                          { text: 'Opción 3', is_correct: false },
                          { text: 'Opción 4', is_correct: false },
                        ],
                        explanation: '',
                        source_basis: ''
                      };
                      setEditFormData({
                        ...editFormData,
                        questions: [...(editFormData.questions || []), newQ]
                      });
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#fff', color: 'var(--navy)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <PlusCircle size={14} /> Agregar Pregunta
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {(editFormData.questions || []).map((q, qIdx) => (
                    <div key={qIdx} style={{
                      background: 'var(--bg-light)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', padding: '1.1rem', position: 'relative'
                    }}>
                      {/* Header de la pregunta */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--navy)', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                          Pregunta {qIdx + 1}
                        </span>
                        {editFormData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editFormData.questions.filter((_, idx) => idx !== qIdx);
                              setEditFormData({ ...editFormData, questions: updated });
                            }}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        )}
                      </div>

                      {/* Enunciado */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          Enunciado
                        </label>
                        <textarea
                          rows={2}
                          value={q.text || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].text = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.88rem', outline: 'none'
                          }}
                        />
                      </div>

                      {/* Opciones */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                          Opciones de respuesta (Marca cuál es la correcta)
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {(q.options || []).map((opt, oIdx) => (
                            <div key={oIdx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              background: '#ffffff', padding: '0.4rem 0.6rem', borderRadius: '8px',
                              border: opt.is_correct ? '1.5px solid #22c55e' : '1px solid var(--border-color)'
                            }}>
                              <input
                                type="radio"
                                name={`correct-opt-${qIdx}`}
                                checked={!!opt.is_correct}
                                onChange={() => {
                                  const updated = [...editFormData.questions];
                                  updated[qIdx].options = updated[qIdx].options.map((o, i) => ({
                                    ...o,
                                    is_correct: i === oIdx
                                  }));
                                  setEditFormData({ ...editFormData, questions: updated });
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <input
                                type="text"
                                value={opt.text || ''}
                                onChange={e => {
                                  const updated = [...editFormData.questions];
                                  updated[qIdx].options[oIdx].text = e.target.value;
                                  setEditFormData({ ...editFormData, questions: updated });
                                }}
                                style={{
                                  flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem',
                                  fontWeight: opt.is_correct ? 700 : 400, color: 'var(--navy)'
                                }}
                                placeholder={`Opción ${oIdx + 1}`}
                              />
                              {opt.is_correct && (
                                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                  Correcta
                                </span>
                              )}
                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editFormData.questions];
                                    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
                                    // Si eliminó la correcta, poner la primera como correcta
                                    if (opt.is_correct && updated[qIdx].options.length > 0) {
                                      updated[qIdx].options[0].is_correct = true;
                                    }
                                    setEditFormData({ ...editFormData, questions: updated });
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                  title="Eliminar opción"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].options = [
                              ...(updated[qIdx].options || []),
                              { text: '', is_correct: false }
                            ];
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            marginTop: '0.4rem', background: 'none', border: 'none',
                            color: 'var(--navy)', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          + Agregar opción
                        </button>
                      </div>

                      {/* Retroalimentación de la IA */}
                      <div style={{ marginBottom: '0.6rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          💡 Retroalimentación Pedagógica (Explicación para el estudiante)
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].explanation = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.82rem', outline: 'none'
                          }}
                          placeholder="Explica por qué esta es la respuesta correcta y cómo se relaciona con el contenido..."
                        />
                      </div>

                      {/* Fundamento en la clase */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          📌 Fundamento en la clase
                        </label>
                        <input
                          type="text"
                          value={q.source_basis || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].source_basis = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.45rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.82rem', outline: 'none'
                          }}
                          placeholder="Ej: Minuto 14:20 - Introducción al concepto de..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del modal con botones de acción */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => { setEditingDraft(null); setEditFormData(null); }}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: '#fff', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSaveEditedDraft(false)}
                disabled={actionLoading === 'saving-edit'}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid var(--navy)',
                  background: '#fff', color: 'var(--navy)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Save size={14} /> Guardar borrador
              </button>

              <button
                type="button"
                onClick={() => handleSaveEditedDraft(true)}
                disabled={actionLoading === 'saving-edit'}
                style={{
                  padding: '0.55rem 1.35rem', borderRadius: '8px', border: 'none',
                  background: 'var(--navy)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
                }}
              >
                <CheckCheck size={14} /> Guardar y Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: 'resumen',     label: 'Resumen',              icon: <BookOpen size={16} />,      component: ResumenTab },
  { id: 'clases',      label: 'Clases',               icon: <Video size={16} />,         component: ClasesTab },
  { id: 'dudas',       label: 'Dudas de estudiantes', icon: <MessageSquare size={16} />,  component: DudasTab },
  { id: 'anuncios',    label: 'Anuncios',             icon: <Megaphone size={16} />,     component: AnunciosTab },
  { id: 'estudiantes', label: 'Estudiantes',          icon: <Users size={16} />,         component: EstudiantesTab },
  { id: 'borradores',  label: 'Borradores IA',        icon: <Sparkles size={16} />,      component: BorradoresTab },
];

export default function TeacherPanel() {
  const { currentUser } = useAuth();
  const { programId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('resumen');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentProgram, setCurrentProgram] = useState(null);
  const [myPrograms, setMyPrograms] = useState([]);
  const role = currentUser?.role;

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Resolver el teacher_profile.id real y obtener datos del programa
  useEffect(() => {
    async function resolveTeacherProfile() {
      if (!currentUser?.id) return;
      try {
        const { data } = await supabase
          .from('teacher_profiles')
          .select('*, users_profile(email)')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (data) setTeacherProfile(data);
      } catch (err) {
        console.error('Error al resolver teacher_profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    async function fetchProgramDetails() {
      if (!programId) return;
      try {
        const { data } = await supabase
          .from('diploma_programs')
          .select('*')
          .eq('id', programId)
          .maybeSingle();
        if (data) setCurrentProgram(data);
      } catch (err) {
        console.error('Error al obtener programa:', err);
      }
    }

    async function fetchAllPrograms() {
      try {
        const { data } = await supabase
          .from('diploma_programs')
          .select('*')
          .order('title', { ascending: true });
        if (data) setMyPrograms(data);
      } catch (err) {
        console.error('Error al obtener lista de programas:', err);
      }
    }

    resolveTeacherProfile();
    fetchProgramDetails();
    fetchAllPrograms();
  }, [currentUser?.id, programId]);

  if (role !== 'teacher') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#ca8a04" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Este panel es exclusivo para profesores.</p>
      </div>
    );
  }

  if (profileLoading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tu perfil de profesor...</div>;
  }

  if (!teacherProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#dc2626" />
        <h2 style={{ color: 'var(--text-dark)' }}>Perfil no configurado</h2>
        <p>Tu cuenta no tiene un perfil de profesor vinculado. Contacta con el administrador.</p>
      </div>
    );
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? ResumenTab;

  return (
    <TeacherContext.Provider value={{ id: teacherProfile.id, profile: teacherProfile, setProfile: setTeacherProfile, programId, currentProgram }}>
      <div>

        {/* --- RUTA DE NAVEGACIÓN (BREADCRUMB) Y ACCIONES DE PROGRAMA --- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <Link to="/portal" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.color = 'var(--gold)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Mis programas
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>
              {currentProgram?.title || 'Cargando programa...'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/portal"
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--white)',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--navy)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ← Volver a mis programas
            </Link>
          </div>
        </div>

        {/* --- PESTAÑAS DEL PROGRAMA --- */}
        <div className="teacher-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`teacher-tab-${tab.id}`}
              className={`teacher-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <ActiveComponent onChangeTab={setActiveTab} />
      </div>
    </TeacherContext.Provider>
  );
}




