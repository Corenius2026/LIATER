import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { formatClassDate } from '../utils/dateUtils';
import {
  BookOpen, Video, FileText, Megaphone, Presentation,
  Play, Plus, Upload, Link as LinkIcon, Clock, CheckCircle2,
  CalendarDays, Timer, ShieldAlert, Eye, Pencil, Trash2,
  AlertCircle, Info, Layers, X, User
} from 'lucide-react';
import {
  currentTeacher, teacherModules, teacherClasses,
  teacherPresentations, teacherRecordings,
  teacherResources, teacherAnnouncements
} from '../data/teacherData';
import './TeacherPanel.css';

/* ─────────────────────────────────────────
   HELPERS & CONFIG
───────────────────────────────────────── */
// Context para pasar el teacher_profile completo a todos los tabs
const TeacherContext = React.createContext(null);
const useTeacherContext = () => React.useContext(TeacherContext);

const TYPE_CONFIG = {
  pdf:          { bg: '#fef2f2', color: '#dc2626', label: 'PDF' },
  presentation: { bg: '#eff6ff', color: '#1d4ed8', label: 'Presentación' },
  link:         { bg: '#f0fdf4', color: '#16a34a', label: 'Enlace' },
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
  const labels = { general: 'General', urgent: '⚠ Urgente', info: '✓ Aviso' };
  return <span className={`announcement-tag ${map[tag] ?? 'tag-general'}`}>{labels[tag] ?? tag}</span>;
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen (Hero + stats rápidas)
───────────────────────────────────────── */
function ResumenTab({ onChangeTab }) {
  const { profile } = useTeacherContext();
  const completed = teacherClasses.filter(c => c.status === 'completed').length;
  const upcoming  = teacherClasses.filter(c => c.status === 'upcoming').length;

  return (
    <div>
      {/* Hero Banner */}
      <div className="card teacher-hero" style={{ padding: '2rem', display: 'flex', gap: '2rem', alignItems: 'center', marginBottom: '1.25rem' }}>
        <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=3b82f6&color=fff&size=150`} alt={profile.name} className="teacher-hero-img" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'cover' }} />
        <div className="teacher-hero-info">
          <h1>{profile.name}</h1>
          <p>{profile.area || 'Sin área especificada'} · {profile.users_profile?.email || ''}</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>{profile.bio || 'Sin biografía'}</p>
          <div className="teacher-hero-stats" style={{ display: 'flex', gap: '2rem', marginTop: '1rem' }}>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{teacherClasses.length}</span>
              <span style={{ fontSize: '0.75rem' }}>Clases Asignadas</span>
            </div>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{upcoming}</span>
              <span style={{ fontSize: '0.75rem' }}>Clases Pendientes</span>
            </div>
            <div className="teacher-hero-stat" style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontWeight: 700 }}>{teacherAnnouncements.length}</span>
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
            { label: 'Clases completadas', value: completed, total: teacherClasses.length, color: '#10b981' },
            { label: 'Clases próximas',    value: upcoming,  total: teacherClasses.length, color: '#f59e0b' },
          ].map(item => (
            <div key={item.label} style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 600 }}>{item.value} / {item.total}</span>
              </div>
              <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${(item.value / item.total) * 100}%`, height: '100%', background: item.color, borderRadius: '4px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Accesos rápidos */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Accesos Rápidos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button 
              onClick={() => onChangeTab('clases')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius-md)', background: '#eff6ff', border: '1px solid #bfdbfe', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Video size={20} color="#1d4ed8" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e3a8a' }}>Mis Clases</div>
                  <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>Consulta tus próximas sesiones</div>
                </div>
              </div>
            </button>
            <button 
              onClick={() => onChangeTab('materiales')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: 'var(--radius-md)', background: '#f0fdf4', border: '1px solid #bbf7d0', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FileText size={20} color="#15803d" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#14532d' }}>Materiales de Apoyo</div>
                  <div style={{ fontSize: '0.75rem', color: '#22c55e' }}>Sube o revisa tus recursos</div>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}



/* ─────────────────────────────────────────
   MODAL DE DETALLE DE CLASE Y MATERIALES
───────────────────────────────────────── */
function ClassDetailModal({ selectedClass, onClose }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form state
  const [editId, setEditId] = useState(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('presentation');
  const [provider, setProvider] = useState('external');
  const [url, setUrl] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('resources')
        .select('*')
        .eq('class_id', selectedClass.id)
        .in('resource_type', ['presentation', 'pdf', 'link', 'file'])
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
    if (selectedClass) fetchMaterials();
  }, [selectedClass]);

  const handleEdit = (p) => {
    setEditId(p.id);
    setTitle(p.title);
    setType(p.resource_type);
    setProvider(p.provider);
    setUrl(p.url || '');
    setIsVisible(p.is_visible);
    setError('');
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setTitle('');
    setType('presentation');
    setProvider('external');
    setUrl('');
    setIsVisible(true);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError('El título y el enlace son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      class_id: selectedClass.id,
      title: title.trim(),
      resource_type: type,
      provider,
      url: url.trim(),
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
      setError('Error al guardar: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este material de apoyo?')) return;
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

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '750px', maxHeight: '90vh', overflowY: 'auto', background: 'white', position: 'relative', padding: '2rem' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '0.5rem', fontWeight: 700, fontSize: '1.4rem' }}>{selectedClass.title}</h2>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Layers size={14} /> {selectedClass.subtopics?.modules?.title || 'Sin módulo'}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><BookOpen size={14} /> {selectedClass.subtopics?.title || 'Sin subtema'}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><CalendarDays size={14} /> {formatClassDate(selectedClass.class_date, false)}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Timer size={14} /> {selectedClass.duration || 0} min</span>
        </div>

        {/* Grabación oficial (Solo lectura) */}
        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Video size={20} color={selectedClass.video_url ? "#16a34a" : "#94a3b8"} />
            <div>
              <div style={{ fontWeight: 600 }}>Grabación Oficial</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {selectedClass.video_url ? 'Disponible para los estudiantes' : 'No se ha subido la grabación aún (solo admin)'}
              </div>
            </div>
          </div>
          {selectedClass.video_url && (
            <a href={selectedClass.video_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
              <Play size={14} style={{ display: 'inline', marginRight: '4px' }}/> Reproducir
            </a>
          )}
        </div>

        <h3 style={{ fontWeight: 600, fontSize: '1.1rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Materiales de Apoyo</h3>
        
        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #bbf7d0' }}>
          <h4 style={{ marginBottom: '1rem', color: '#16a34a' }}>{editId ? 'Editar Material' : 'Añadir Material (Enlace)'}</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Título del material</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Tipo</label>
              <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <option value="presentation">Presentación</option>
                <option value="pdf">PDF</option>
                <option value="link">Enlace web</option>
              </select>
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Proveedor</label>
              <select value={provider} onChange={e => setProvider(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                <option value="drive">Google Drive / OneDrive</option>
                <option value="external">Otro Enlace</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>URL del archivo/sitio</label>
              <input type="url" value={url} onChange={e => setUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." required />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <input type="checkbox" id="isVisible" checked={isVisible} onChange={e => setIsVisible(e.target.checked)} />
            <label htmlFor="isVisible" style={{ fontSize: '0.85rem' }}>Visible para los estudiantes</label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1, background: '#16a34a', borderColor: '#16a34a' }}>
              {submitting ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Añadir Material')}
            </button>
            {editId && (
              <button type="button" onClick={handleCancelEdit} className="btn btn-outline">Cancelar</button>
            )}
          </div>
        </form>

        <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1rem' }}>Materiales guardados</h4>
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando materiales...</p>
        ) : materials.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay materiales asociados a esta clase.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {materials.map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.5rem', borderRadius: '8px', color: '#64748b' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.title}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '8px', alignItems: 'center', marginTop: '2px' }}>
                      <TypePill type={p.resource_type} />
                      <span>{p.provider}</span>
                      {!p.is_visible && <span style={{ color: 'var(--danger)', fontSize: '0.75rem', fontWeight: 600 }}>Oculto</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} title="Abrir">
                    <Eye size={16} />
                  </a>
                  <button onClick={() => handleEdit(p)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} title="Editar">
                    <Pencil size={16} />
                  </button>
                  <button onClick={() => handleDelete(p.id)} className="btn btn-outline" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', color: 'var(--danger)', borderColor: 'var(--danger)' }} title="Eliminar">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3 — Mis Clases
───────────────────────────────────────── */
function ClasesTab() {
  const { id: teacherId } = useTeacherContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [selectedClass, setSelectedClass] = useState(null);

  useEffect(() => {
    if (!teacherId) return;
    async function fetchMyClasses() {
      try {
        setLoading(true);
        const { data, error: fetchError } = await supabase
          .from('class_sessions')
          .select('*, subtopics(title, module_id, modules(title))')
          .eq('teacher_id', teacherId)
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
  }, [teacherId]);

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
                    <span>{cls.subtopics?.modules?.title || 'Módulo Desconocido'}</span> · 
                    <span>{cls.subtopics?.title || 'Subtema Desconocido'}</span> · 
                    <CalendarDays size={12} style={{ display:'inline', margin:'0 3px 0 6px', verticalAlign:'middle' }} />
                    <span>{formatClassDate(cls.class_date, false)}</span> · 
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

/* ─────────────────────────────────────────
   TAB 4 — Materiales de Apoyo (Global)
───────────────────────────────────────── */
function SupportMaterialsTab() {
  const { id: teacherId } = useTeacherContext();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    async function fetchMaterials() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('resources')
          .select('*, class_sessions!inner(title, teacher_id)')
          .eq('class_sessions.teacher_id', teacherId)
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

/* ─────────────────────────────────────────
   TAB 5 — Grabaciones Disponibles
───────────────────────────────────────── */
function RecordingsTab() {
  const { id: teacherId } = useTeacherContext();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId) return;
    async function fetchRecordings() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, duration, video_url')
          .eq('teacher_id', teacherId)
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
  }, [teacherId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Grabaciones disponibles ({classes.length})</span>
      </div>

      <div style={{ background: '#f0fdf4', color: '#166534', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
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
                <Video size={20} color="#16a34a" />
              </div>
              <div className="resource-row-body">
                <div className="resource-row-title">{c.title}</div>
                <div className="resource-row-meta">{formatClassDate(c.class_date, false)} · {c.duration || 0} min</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a href={c.video_url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ background:'#f0fdf4', color:'#16a34a', borderColor:'#bbf7d0', fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}>
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

/* ─────────────────────────────────────────
   MODAL DE ANUNCIOS
───────────────────────────────────────── */
function AnnouncementModal({ announcement, onClose, onRefresh }) {
  const { id: teacherId } = useTeacherContext();
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

/* ─────────────────────────────────────────
   TAB 7 — Anuncios
───────────────────────────────────────── */
function AnunciosTab() {
  const { id: teacherId } = useTeacherContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    if (!teacherId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('teacher_id', teacherId)
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

/* ─────────────────────────────────────────
   TAB 7 — Perfil
───────────────────────────────────────── */
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
          <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=3b82f6&color=fff&size=150`} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
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
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
const TABS = [
  { id: 'resumen',       label: 'Resumen',                 icon: <BookOpen size={16} />,     component: ResumenTab },
  { id: 'clases',        label: 'Mis Clases',              icon: <Video size={16} />,        component: ClasesTab },
  { id: 'materiales',    label: 'Materiales de Apoyo',     icon: <FileText size={16} />,     component: SupportMaterialsTab },
  { id: 'grabaciones',   label: 'Grabaciones Disponibles', icon: <Play size={16} />,         component: RecordingsTab },
  { id: 'anuncios',      label: 'Anuncios',                icon: <Megaphone size={16} />,    component: AnunciosTab },
  { id: 'perfil',        label: 'Perfil',                  icon: <User size={16} />,         component: PerfilTab },
];

export default function TeacherPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const role = currentUser?.role;

  // Resolver el teacher_profile.id real a partir del users_profile.id del usuario autenticado
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
    resolveTeacherProfile();
  }, [currentUser?.id]);

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
    <TeacherContext.Provider value={{ id: teacherProfile.id, profile: teacherProfile, setProfile: setTeacherProfile }}>
      <div>
        <div className="page-header" style={{ marginBottom: '1.5rem' }}>
          <h1 className="page-title">Mi Panel de Profesor</h1>
          <p className="page-description">Gestiona tus módulos, clases, recursos y anuncios del diplomado.</p>
        </div>

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
