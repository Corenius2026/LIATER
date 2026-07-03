import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  BookOpen, Video, FileText, Megaphone, Presentation,
  Play, Plus, Upload, Link as LinkIcon, Clock, CheckCircle2,
  CalendarDays, Timer, ShieldAlert, Eye, Pencil, Trash2,
  AlertCircle, Info, Layers
} from 'lucide-react';
import {
  currentTeacher, teacherModules, teacherClasses,
  teacherPresentations, teacherRecordings,
  teacherResources, teacherAnnouncements
} from '../data/teacherData';
import './TeacherPanel.css';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
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
function ResumenTab() {
  const completed = teacherClasses.filter(c => c.status === 'completed').length;
  const upcoming  = teacherClasses.filter(c => c.status === 'upcoming').length;

  return (
    <div>
      {/* Hero Banner */}
      <div className="teacher-hero">
        <img src={currentTeacher.avatar} alt={currentTeacher.name} className="teacher-hero-img" />
        <div className="teacher-hero-info">
          <h1>{currentTeacher.name}</h1>
          <p>{currentTeacher.area} · {currentTeacher.email}</p>
          <p style={{ fontSize: '0.82rem', opacity: 0.7 }}>{currentTeacher.bio}</p>
          <div className="teacher-hero-stats">
            {[
              { n: teacherModules.length, l: 'Módulos' },
              { n: teacherClasses.length, l: 'Clases' },
              { n: teacherPresentations.length, l: 'Presentaciones' },
              { n: teacherResources.length, l: 'Recursos' },
            ].map(s => (
              <div className="teacher-hero-stat" key={s.l}>
                <span>{s.n}</span>
                <span>{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Widgets inferiores */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Progreso de clases */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Progreso de Clases</h3>
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

        {/* Próximas clases */}
        <div className="card">
          <h3 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '1.25rem' }}>Próximas Sesiones</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {teacherClasses.filter(c => c.status === 'upcoming').map(cls => (
              <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: '#fef9c3', border: '1px solid #fde68a' }}>
                <Clock size={18} color="#ca8a04" />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{cls.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{cls.date} · {cls.duration} min · {cls.subtopic}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 2 — Mis Módulos
───────────────────────────────────────── */
function ModulosTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Módulos asignados ({teacherModules.length})</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
        {teacherModules.map(m => (
          <div className="module-card-teacher" key={m.id}>
            <div className="module-card-header">
              <div className="module-num">{m.order}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>{m.title}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.description}</div>
              </div>
            </div>

            {/* Subtemas */}
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Subtemas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {m.subtopics.map(st => (
                  <div key={st} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', padding: '0.3rem 0.6rem', background: '#f8fafc', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                    <Layers size={13} color="var(--primary-light)" />
                    {st}
                  </div>
                ))}
              </div>
            </div>

            <div className="module-card-footer">
              <span className="module-stat-pill"><Video size={13} />{m.totalClasses} Clases</span>
              <span className="module-stat-pill"><CheckCircle2 size={13} color="#16a34a" />{m.completedClasses} Completadas</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3 — Mis Clases
───────────────────────────────────────── */
function ClasesTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Mis clases ({teacherClasses.length})</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {teacherClasses.map(cls => (
          <div className="class-card" key={cls.id}>
            <div className={`class-status-dot ${cls.status}`} />

            <div className="class-card-body">
              <div className="class-title">{cls.title}</div>
              <div className="class-meta">
                <span>{cls.module}</span> · <span>{cls.subtopic}</span> · 
                <CalendarDays size={12} style={{ display:'inline', margin:'0 3px 0 6px', verticalAlign:'middle' }} />
                <span>{cls.date}</span> · 
                <Timer size={12} style={{ display:'inline', margin:'0 3px 0 6px', verticalAlign:'middle' }} />
                <span>{cls.duration} min</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
              {cls.status === 'completed' && cls.videoUrl && (
                <a href={cls.videoUrl} target="_blank" rel="noreferrer" className="class-video-btn">
                  <Play size={13} /> Ver grabación
                </a>
              )}
              {cls.status === 'upcoming' && cls.meetLink && (
                <a href={cls.meetLink} target="_blank" rel="noreferrer" className="class-video-btn" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}>
                  <LinkIcon size={13} /> Unirse a Meet
                </a>
              )}
              {cls.status === 'upcoming' && !cls.videoUrl && (
                <button className="class-add-btn">
                  <Upload size={13} /> Subir grabación
                </button>
              )}
              <button style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '0.42rem', cursor: 'pointer', color: '#64748b', display: 'flex' }} title="Editar">
                <Pencil size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 4 — Presentaciones
───────────────────────────────────────── */
function PresentacionesTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Presentaciones ({teacherPresentations.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Subir Presentación
        </button>
      </div>

      {/* Upload zone */}
      <div className="upload-zone" style={{ marginBottom: '1.5rem' }}>
        <Upload size={32} color="#93c5fd" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Arrastra tu presentación aquí</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>o haz clic para explorar (PDF, PPTX · máx. 50 MB)</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {teacherPresentations.map(p => (
          <div className="resource-row" key={p.id}>
            <div className="resource-icon-box" style={{ background: '#eff6ff' }}>
              <Presentation size={20} color="#1d4ed8" />
            </div>
            <div className="resource-row-body">
              <div className="resource-row-title">{p.title}</div>
              <div className="resource-row-meta">{p.class} · {p.date} · {p.slides} diapositivas</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a href={p.url} className="class-video-btn"><Eye size={13} /> Ver</a>
              <button style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={15} /></button>
              <button style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 5 — Grabaciones
───────────────────────────────────────── */
function GrabacionesTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Grabaciones ({teacherRecordings.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <LinkIcon size={16} /> Agregar Enlace
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {teacherRecordings.map(r => (
          <div className="resource-row" key={r.id}>
            <div className="resource-icon-box" style={{ background: '#fef2f2' }}>
              <Video size={20} color="#dc2626" />
            </div>
            <div className="resource-row-body">
              <div className="resource-row-title">{r.title}</div>
              <div className="resource-row-meta">{r.class} · {r.date} · {r.duration} · {r.platform}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <a href={r.url} target="_blank" rel="noreferrer" className="class-video-btn" style={{ background:'#fef2f2', color:'#dc2626', borderColor:'#fca5a5' }}>
                <Play size={13} /> Reproducir
              </a>
              <button style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={15} /></button>
              <button style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 6 — Recursos Complementarios
───────────────────────────────────────── */
function RecursosTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Recursos complementarios ({teacherResources.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Recurso
        </button>
      </div>

      {/* Upload zone */}
      <div className="upload-zone" style={{ marginBottom: '1.5rem' }}>
        <Upload size={32} color="#93c5fd" style={{ marginBottom: '0.75rem' }} />
        <p style={{ fontWeight: 600, color: 'var(--text-dark)' }}>Arrastra archivos o pega un enlace</p>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, Word, Excel, ZIP o URL externa · máx. 100 MB</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {teacherResources.map(r => {
          const cfg = TYPE_CONFIG[r.type] ?? { bg: '#f1f5f9', color: '#64748b' };
          return (
            <div className="resource-row" key={r.id}>
              <div className="resource-icon-box" style={{ background: cfg.bg }}>
                <FileText size={20} color={cfg.color} />
              </div>
              <div className="resource-row-body">
                <div className="resource-row-title">{r.title}</div>
                <div className="resource-row-meta">{r.class}{r.size ? ` · ${r.size}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <TypePill type={r.type} />
                <a href={r.url} className="class-video-btn"><Eye size={13} /> Ver</a>
                <button style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={15} /></button>
                <button style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.42rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={15} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 7 — Anuncios
───────────────────────────────────────── */
function AnunciosTab() {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Anuncios publicados ({teacherAnnouncements.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Nuevo Anuncio
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {teacherAnnouncements.map(a => (
          <div className={`announcement-card ${a.tag !== 'general' ? a.tag : ''}`} key={a.id}>
            <TagPill tag={a.tag} />
            <div className="announcement-header">
              <div className="announcement-title">{a.title}</div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="announcement-date">{a.date}</span>
                <button style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={13} /></button>
                <button style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={13} /></button>
              </div>
            </div>
            <p className="announcement-body">{a.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
const TABS = [
  { id: 'resumen',       label: 'Resumen',       icon: <BookOpen size={16} />,     component: ResumenTab },
  { id: 'modulos',       label: 'Mis Módulos',   icon: <Layers size={16} />,       component: ModulosTab },
  { id: 'clases',        label: 'Mis Clases',    icon: <Video size={16} />,        component: ClasesTab },
  { id: 'presentaciones',label: 'Presentaciones',icon: <Presentation size={16} />, component: PresentacionesTab },
  { id: 'grabaciones',   label: 'Grabaciones',   icon: <Play size={16} />,         component: GrabacionesTab },
  { id: 'recursos',      label: 'Recursos',      icon: <FileText size={16} />,     component: RecursosTab },
  { id: 'anuncios',      label: 'Anuncios',      icon: <Megaphone size={16} />,    component: AnunciosTab },
];

export default function TeacherPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen');
  const role = currentUser?.role;

  if (role !== 'teacher') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#ca8a04" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Este panel es exclusivo para profesores.</p>
        <p>Cambia tu rol en la parte superior para acceder.</p>
      </div>
    );
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? ResumenTab;

  return (
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

      <ActiveComponent />
    </div>
  );
}
