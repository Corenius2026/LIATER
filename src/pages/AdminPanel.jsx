import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ListTree, Video, FileText, Plus, Pencil, Trash2,
  CheckCircle2, Clock, Link as LinkIcon, ShieldAlert, X
} from 'lucide-react';
import {
  mockTeachers, mockModules,
  mockSubtopics, mockClasses, mockResources
} from '../data/mockData';
import './AdminPanel.css';

/* ─────────────────────────────────────────
   HELPERS
───────────────────────────────────────── */
function RoleBadge({ role }) {
  const map = { admin: ['role-badge role-admin', 'Administrador'], teacher: ['role-badge role-teacher', 'Profesor'], student: ['role-badge role-student', 'Estudiante'] };
  const [cls, label] = map[role] ?? ['role-badge', role];
  return <span className={cls}>{label}</span>;
}

function StatusBadge({ status }) {
  const map = {
    active:    ['role-badge status-active', 'Activo'],
    inactive:  ['role-badge status-inactive', 'Inactivo'],
    completed: ['role-badge status-completed', 'Completada'],
    upcoming:  ['role-badge status-upcoming', 'Próxima'],
  };
  const [cls, label] = map[status] ?? ['role-badge', status];
  return <span className={cls}>{label}</span>;
}

function TypeBadge({ type }) {
  const map = {
    pdf:          ['role-badge type-pdf', 'PDF'],
    presentation: ['role-badge type-presentation', 'Presentación'],
    link:         ['role-badge type-link', 'Enlace'],
    file:         ['role-badge type-file', 'Archivo'],
  };
  const [cls, label] = map[type] ?? ['role-badge', type];
  return <span className={cls}>{label}</span>;
}

function Initials({ name }) {
  const parts = name.trim().split(' ');
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return <div className="user-avatar-initials">{letters.toUpperCase()}</div>;
}

function ActionBtns() {
  return (
    <div className="action-btns">
      <button className="btn-icon edit" title="Editar"><Pencil size={15} /></button>
      <button className="btn-icon del"  title="Eliminar"><Trash2 size={15} /></button>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen General
───────────────────────────────────────── */
function ResumenTab() {
  const { users } = useAuth();
  const stats = [
    { label: 'Usuarios Total', value: users.length, color: '#6366f1', bg: '#eef2ff', icon: <Users size={22} color="#6366f1" /> },
    { label: 'Profesores', value: mockTeachers.length, color: '#0ea5e9', bg: '#e0f2fe', icon: <GraduationCap size={22} color="#0ea5e9" /> },
    { label: 'Módulos', value: mockModules.length, color: '#10b981', bg: '#d1fae5', icon: <BookOpen size={22} color="#10b981" /> },
    { label: 'Subtemas', value: mockSubtopics.length, color: '#f59e0b', bg: '#fef3c7', icon: <ListTree size={22} color="#f59e0b" /> },
    { label: 'Clases', value: mockClasses.length, color: '#ef4444', bg: '#fee2e2', icon: <Video size={22} color="#ef4444" /> },
    { label: 'Recursos', value: mockResources.length, color: '#8b5cf6', bg: '#ede9fe', icon: <FileText size={22} color="#8b5cf6" /> },
  ];

  const completadas = mockClasses.filter(c => c.status === 'completed').length;
  const proximas = mockClasses.filter(c => c.status === 'upcoming').length;
  const activos = users.filter(u => u.status === 'active' || u.status === undefined).length;

  return (
    <div>
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-number">{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
        {/* Estado de clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Estado del Programa</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[
              { label: 'Clases completadas', value: completadas, total: mockClasses.length, color: '#10b981' },
              { label: 'Clases próximas', value: proximas, total: mockClasses.length, color: '#f59e0b' },
              { label: 'Usuarios activos', value: activos, total: mockUsers.length, color: '#6366f1' },
            ].map(item => (
              <div key={item.label}>
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
        </div>

        {/* Últimas clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Próximas Clases</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mockClasses.filter(c => c.status === 'upcoming').map(cls => (
              <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} color="#ca8a04" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.title}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{cls.date} · {cls.teacher}</div>
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
   TAB 2 — Usuarios
───────────────────────────────────────── */
function UsuariosTab() {
  const { users, registerUser } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!name || !email || !password) {
      setError('Por favor completa todos los campos.');
      return;
    }

    const res = registerUser({ name, email, password, role, status: 'active', joinDate: new Date().toISOString().split('T')[0] });
    if (res.success) {
      setSuccess('Usuario registrado con éxito.');
      setName('');
      setEmail('');
      setPassword('');
      setRole('student');
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } else {
      setError(res.message);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Usuarios registrados ({users.length})</span>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Usuario
        </button>
      </div>

      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Registrar Nuevo Usuario</h3>
            
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Juan Pérez" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Correo Electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="juan@ejemplo.com" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="••••••••" />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Rol</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>Registrar Usuario</button>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Fecha de Ingreso</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <Initials name={user.name} />
                    <div>
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={user.role} /></td>
                <td><StatusBadge status={user.status ?? 'active'} /></td>
                <td>{user.joinDate ?? '2024-01-01'}</td>
                <td><ActionBtns /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3 — Profesores
───────────────────────────────────────── */
function ProfesoresTab() {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Profesores del diplomado ({mockTeachers.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Profesor
        </button>
      </div>
      <div className="teacher-cards-grid">
        {mockTeachers.map(t => (
          <div className="teacher-admin-card" key={t.id}>
            <div className="teacher-card-top">
              <img src={t.avatar} alt={t.name} className="teacher-card-img" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.area}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{t.email}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.bio}</p>
            <div className="teacher-card-stats">
              <div className="teacher-card-stat">
                <span>{t.modules}</span>
                <span>Módulos</span>
              </div>
              <div className="teacher-card-stat">
                <span>{t.classes}</span>
                <span>Clases</span>
              </div>
            </div>
            <div className="teacher-card-actions">
              <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>
                <Pencil size={14} /> Editar
              </button>
              <button className="btn-icon del" title="Eliminar" style={{ border: '1px solid var(--border-color)' }}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 4 — Módulos
───────────────────────────────────────── */
function ModulosTab() {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Módulos del programa ({mockModules.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Módulo
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Descripción</th>
              <th>Subtemas</th>
              <th>Clases</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockModules.map(m => (
              <tr key={m.id}>
                <td><div className="order-badge">{m.order}</div></td>
                <td><span style={{ fontWeight: 600 }}>{m.title}</span></td>
                <td style={{ color: 'var(--text-muted)', maxWidth: '240px' }}>{m.description}</td>
                <td><span className="badge">{m.subtopics}</span></td>
                <td><span className="badge">{m.classes}</span></td>
                <td><ActionBtns /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 5 — Subtemas
───────────────────────────────────────── */
function SubtemasTab() {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Subtemas registrados ({mockSubtopics.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Subtema
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Título</th>
              <th>Módulo</th>
              <th>Descripción</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockSubtopics.map(st => (
              <tr key={st.id}>
                <td><div className="order-badge">{st.order}</div></td>
                <td><span style={{ fontWeight: 600 }}>{st.title}</span></td>
                <td><span className="badge">{st.module}</span></td>
                <td style={{ color: 'var(--text-muted)', maxWidth: '260px' }}>{st.description}</td>
                <td><ActionBtns /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 6 — Clases
───────────────────────────────────────── */
function ClasesTab() {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Sesiones de clase ({mockClasses.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Clase
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Título</th>
              <th>Subtema</th>
              <th>Profesor</th>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Estado</th>
              <th>Grabación</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockClasses.map(cls => (
              <tr key={cls.id}>
                <td style={{ fontWeight: 600 }}>{cls.title}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{cls.subtopic}</td>
                <td>{cls.teacher}</td>
                <td>{cls.date}</td>
                <td>{cls.duration} min</td>
                <td><StatusBadge status={cls.status} /></td>
                <td>
                  {cls.videoUrl
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#16a34a', fontSize: '0.8rem', fontWeight: 500 }}><CheckCircle2 size={14} />Disponible</span>
                    : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Pendiente</span>
                  }
                </td>
                <td><ActionBtns /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 7 — Recursos
───────────────────────────────────────── */
function RecursosTab() {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Recursos del diplomado ({mockResources.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Recurso
        </button>
      </div>
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Nombre del Recurso</th>
              <th>Clase Asociada</th>
              <th>Profesor</th>
              <th>Tipo</th>
              <th>Enlace</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {mockResources.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{r.class}</td>
                <td>{r.teacher}</td>
                <td><TypeBadge type={r.type} /></td>
                <td>
                  <a href={r.url} style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
                    <LinkIcon size={13} /> Ver
                  </a>
                </td>
                <td><ActionBtns /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPONENTE PRINCIPAL
───────────────────────────────────────── */
const TABS = [
  { id: 'resumen',    label: 'Resumen',      icon: <LayoutDashboard size={16} />, component: ResumenTab },
  { id: 'usuarios',   label: 'Usuarios',     icon: <Users size={16} />,           component: UsuariosTab },
  { id: 'profesores', label: 'Profesores',   icon: <GraduationCap size={16} />,   component: ProfesoresTab },
  { id: 'modulos',    label: 'Módulos',      icon: <BookOpen size={16} />,        component: ModulosTab },
  { id: 'subtemas',   label: 'Subtemas',     icon: <ListTree size={16} />,        component: SubtemasTab },
  { id: 'clases',     label: 'Clases',       icon: <Video size={16} />,           component: ClasesTab },
  { id: 'recursos',   label: 'Recursos',     icon: <FileText size={16} />,        component: RecursosTab },
];

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen');
  const role = currentUser?.role;

  if (role !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#dc2626" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Este panel es exclusivo para administradores.</p>
        <p>Cambia tu rol en la parte superior para acceder.</p>
      </div>
    );
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? ResumenTab;

  return (
    <div>
      {/* Header de la página */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Panel de Administración</h1>
        <p className="page-description">Gestiona todos los recursos y contenidos del diplomado desde un solo lugar.</p>
      </div>

      {/* Tabs de navegación */}
      <div className="admin-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            id={`admin-tab-${tab.id}`}
            className={`admin-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido del tab activo */}
      <ActiveComponent />
    </div>
  );
}
