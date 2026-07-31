import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { formatClassDate } from '../utils/dateUtils';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen, Video, FileText, Megaphone, Presentation,
  Play, Plus, Upload, Link as LinkIcon, Clock, CheckCircle2,
  CalendarDays, Timer, ShieldAlert, Eye, Pencil, Trash2,
  AlertCircle, Info, Layers, X, User, MessageSquare, Users
} from 'lucide-react';

import './TeacherPanel.css';

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   HELPERS & CONFIG
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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
   TAB 1 — Resumen (Hero + stats rápidas)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ResumenTab({ onChangeTab }) {
  const { profile } = useTeacherContext();
  const [stats, setStats] = useState({ totalClasses: 0, completed: 0, upcoming: 0, announcements: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      if (!profile?.id) return;
      try {
        const { programId } = useTeacherContext();
        // Filtrar clases por programa
        const pClasses = supabase.from('class_sessions')
          .select('class_date, program_id')
          .eq('teacher_id', profile.id)
          .eq('program_id', programId);
          
        const pAnnouncements = supabase.from('announcements')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', profile.id)
          .eq('program_id', programId);
        
        const [resClasses, resAnn] = await Promise.all([pClasses, pAnnouncements]);
        
        const classes = resClasses.data || [];
        const now = new Date();
        const completed = classes.filter(c => new Date(c.class_date) < now).length;
        const upcoming = classes.filter(c => new Date(c.class_date) >= now).length;

        setStats({
          totalClasses: classes.length,
          completed,
          upcoming,
          announcements: resAnn.count || 0
        });
      } catch (err) {
        console.error('Error fetching teacher stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, [profile?.id]);

  return (
    <div>
      {/* Hero Banner */}
      <div className="card teacher-hero" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=14213D&color=FCA311&size=150`} alt={profile.name} className="teacher-hero-img" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
        <div className="teacher-hero-info">
          <h1>{profile.name}</h1>
          <p>{profile.area || 'Sin área especificada'} Â· {profile.users_profile?.email || ''}</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>{profile.bio || 'Sin biografía'}</p>
          <div className="teacher-hero-stats" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{loading ? '-' : stats.totalClasses}</span>
              <span style={{ fontSize: '0.75rem' }}>Clases Asignadas</span>
            </div>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{loading ? '-' : stats.upcoming}</span>
              <span style={{ fontSize: '0.75rem' }}>Clases Pendientes</span>
            </div>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{loading ? '-' : stats.announcements}</span>
              <span style={{ fontSize: '0.75rem' }}>Avisos Publicados</span>
            </div>
          </div>
        </div>
      </div>

      {/* Widgets inferiores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Progreso de clases */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Progreso del Curso</h3>
          {[
            { label: 'Clases completadas', value: stats.completed, total: stats.totalClasses, color: '#10b981' },
            { label: 'Clases próximas',    value: stats.upcoming,  total: stats.totalClasses, color: '#f59e0b' },
          ].map(item => {
            const percentage = item.total === 0 ? 0 : (item.value / item.total) * 100;
            return (
              <div key={item.label} style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value} / {item.total}</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: `${percentage}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Acciones Rápidas */}
        <div className="card" style={{ background: 'var(--white)', padding: '1.5rem', borderRadius: '12px' }}>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--navy)', marginBottom: '1.25rem' }}>
            Acciones Rápidas
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem' }}>
            {/* 1. Leer preguntas */}
            <button 
              onClick={() => onChangeTab('dudas')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.08)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <MessageSquare size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>Leer preguntas</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Atender dudas de alumnos</div>
              </div>
            </button>

            {/* 2. Crear anuncio */}
            <button 
              onClick={() => onChangeTab('anuncios')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.08)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Megaphone size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>Crear anuncio</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Publicar aviso general</div>
              </div>
            </button>

            {/* 3. Ver próxima clase */}
            <button 
              onClick={() => onChangeTab('clases')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(252, 163, 17, 0.15)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <CalendarDays size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>Ver próxima clase</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Consultar horario activo</div>
              </div>
            </button>

            {/* 4. Agregar material */}
            <button 
              onClick={() => onChangeTab('clases')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem 1rem', borderRadius: '8px', background: 'var(--bg-light)', border: '1px solid var(--border-color)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--navy)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border-color)'; e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.08)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Upload size={18} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--navy)' }}>Agregar material</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Subir recurso o lectura</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [savingInfo, setSavingInfo] = useState(false);
  const [infoMsg, setInfoMsg] = useState('');

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
      fetchMaterials();
    }
  }, [selectedClass]);

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
            <Video size={18} color="var(--navy)" /> 3. Grabación de la Clase
          </h3>
          <div style={{ background: 'var(--white)', padding: '1rem 1.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>
                {selectedClass.video_url ? 'Grabación Oficial Disponible' : 'Grabación Pendiente'}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                {selectedClass.video_url 
                  ? 'La grabación de esta sesión ha sido publicada por el Administrador.' 
                  : 'El enlace de la grabación debe ser registrado por el Administrador al finalizar la clase en vivo.'}
              </div>
            </div>
            {selectedClass.video_url && (
              <a href={selectedClass.video_url} target="_blank" rel="noreferrer" className="btn btn-navy" style={{ fontSize: '0.82rem', padding: '0.45rem 1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 600 }}>
                <Play size={14} /> Reproducir Grabación
              </a>
            )}
          </div>
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
        </div>

      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 3 — Mis Clases
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ClasesTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    if (!programId) return;
    async function fetchMyClasses() {
      try {
        setLoading(true);
        let query = supabase
          .from('class_sessions')
          .select('*, subtopics(title, module_id, modules(title, program_id))')
          .eq('program_id', programId)
          .order('class_date', { ascending: true });

        if (teacherId) {
          query = query.eq('teacher_id', teacherId);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        setClasses(data || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMyClasses();
  }, [teacherId, programId]);

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
   TAB 5 — Grabaciones Disponibles
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function RecordingsTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId || !programId) return;
    async function fetchRecordings() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, duration, video_url, program_id')
          .eq('teacher_id', teacherId)
          .eq('program_id', programId)
          .not('video_url', 'is', null)
          .order('class_date', { ascending: false });
        
        setClasses(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchRecordings();
  }, [teacherId, programId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Grabaciones disponibles ({classes.length})</span>
      </div>

      <div style={{ background: '#f0fdf4', color: 'var(--text-muted)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Modo de solo lectura</strong>
          Las grabaciones oficiales son subidas y gestionadas por la administración del diplomado. No es posible modificarlas desde este panel.
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando grabaciones...</p>
      ) : classes.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Aún no hay grabaciones subidas para tus clases.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {classes.map(c => (
            <div className="resource-row" key={c.id}>
              <div className="resource-icon-box" style={{ background: '#f0fdf4' }}>
                <Video size={20} color="var(--green-600)" />
              </div>
              <div className="resource-row-body">
                <div className="resource-row-title">{c.title}</div>
                <div className="resource-row-meta">{formatClassDate(c.class_date, false)} Â· {c.duration || 0} min</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={c.video_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ background:'#f0fdf4', color:'var(--green-600)', borderColor:'#bbf7d0', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}>
                  <Play size={13} style={{display:'inline', marginRight:'4px'}}/> Reproducir
                </a>
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
   TAB: Dudas de estudiantes
───────────────────────────────────────── */
function DudasTab() {
  return (
    <div className="card" style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px' }}>
      <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(20, 33, 61, 0.05)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
        <MessageSquare size={30} />
      </div>
      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.5rem' }}>Dudas e Inquietudes de Estudiantes</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
        Atiende las consultas recibidas de los estudiantes matriculados en este programa o revisa la bandeja general.
      </p>
      <Link to="/soporte" className="btn btn-navy" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', fontWeight: 600 }}>
        Ir a Bandeja de Consultas
      </Link>
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
const TABS = [
  { id: 'resumen',     label: 'Resumen',              icon: <BookOpen size={16} />,      component: ResumenTab },
  { id: 'clases',      label: 'Clases',               icon: <Video size={16} />,         component: ClasesTab },
  { id: 'dudas',       label: 'Dudas de estudiantes', icon: <MessageSquare size={16} />,  component: DudasTab },
  { id: 'grabaciones', label: 'Grabaciones',          icon: <Play size={16} />,          component: RecordingsTab },
  { id: 'anuncios',    label: 'Anuncios',             icon: <Megaphone size={16} />,     component: AnunciosTab },
  { id: 'estudiantes', label: 'Estudiantes',          icon: <Users size={16} />,         component: EstudiantesTab },
];

export default function TeacherPanel() {
  const { currentUser } = useAuth();
  const { programId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('resumen');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentProgram, setCurrentProgram] = useState(null);
  const [myPrograms, setMyPrograms] = useState([]);
  const role = currentUser?.role;

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
    <TeacherContext.Provider value={{ id: teacherProfile.id, profile: teacherProfile, setProfile: setTeacherProfile, programId }}>
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
            {myPrograms.length > 1 && (
              <select
                value={programId}
                onChange={(e) => {
                  const newId = e.target.value;
                  localStorage.setItem('activeProgramId', newId);
                  navigate(`/dashboard/profesor/${newId}`);
                }}
                style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', background: 'var(--white)', cursor: 'pointer' }}
              >
                {myPrograms.map(p => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            )}

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

        {/* --- ENCABEZADO PRINCIPAL DEL PROGRAMA --- */}
        <div className="page-header" style={{ marginBottom: '1.5rem', background: 'var(--white)', padding: '1.5rem 1.75rem', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.35rem' }}>
            <span className="badge badge-navy" style={{ textTransform: 'uppercase', fontSize: '0.7rem' }}>
              {currentProgram?.program_type === 'curso' ? 'Curso Corto' : 'Diplomado'}
            </span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.6rem', color: 'var(--navy)', margin: 0, fontWeight: 800, lineHeight: 1.2 }}>
            {currentProgram?.title || 'Mi Panel de Profesor'}
          </h1>
          <p className="page-description" style={{ marginTop: '0.4rem', marginBottom: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {currentProgram?.description || 'Gestiona las clases, recursos, dudas y anuncios de este programa.'}
          </p>
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




