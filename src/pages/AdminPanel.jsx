import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  LayoutDashboard, Users, GraduationCap, BookOpen,
  ListTree, Video, FileText, Plus, Pencil, Trash2,
  CheckCircle2, CheckCircle, Clock, Link as LinkIcon, ShieldAlert, X
} from 'lucide-react';
import './AdminPanel.css';

/* ─────────────────────────────────────────
   HELPERS (sin cambios)
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
    cancelled: ['role-badge status-inactive', 'Cancelada'],
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
    video:        ['role-badge type-presentation', 'Video'],
  };
  const [cls, label] = map[type] ?? ['role-badge', type];
  return <span className={cls}>{label}</span>;
}

function Initials({ name }) {
  const parts = (name || '').trim().split(' ');
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return <div className="user-avatar-initials">{letters.toUpperCase()}</div>;
}

function ActionBtns({ onEdit, onDelete }) {
  return (
    <div className="action-btns">
      <button className="btn-icon edit" title="Editar" onClick={onEdit}><Pencil size={15} /></button>
      <button className="btn-icon del"  title="Eliminar" onClick={onDelete}><Trash2 size={15} /></button>
    </div>
  );
}

function LoadingRow({ cols }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        Cargando datos...
      </td>
    </tr>
  );
}

function EmptyRow({ cols, message }) {
  return (
    <tr>
      <td colSpan={cols} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
        {message}
      </td>
    </tr>
  );
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen General
───────────────────────────────────────── */
function ResumenTab({ counts, upcomingClasses }) {
  const { users } = useAuth();

  const stats = [
    { label: 'Usuarios Total',  value: counts.usuarios,  color: '#6366f1', bg: '#eef2ff', icon: <Users size={22} color="#6366f1" /> },
    { label: 'Profesores',      value: counts.profesores, color: '#0ea5e9', bg: '#e0f2fe', icon: <GraduationCap size={22} color="#0ea5e9" /> },
    { label: 'Módulos',         value: counts.modulos,    color: '#10b981', bg: '#d1fae5', icon: <BookOpen size={22} color="#10b981" /> },
    { label: 'Subtemas',        value: counts.subtemas,   color: '#f59e0b', bg: '#fef3c7', icon: <ListTree size={22} color="#f59e0b" /> },
    { label: 'Clases',          value: counts.clases,     color: '#ef4444', bg: '#fee2e2', icon: <Video size={22} color="#ef4444" /> },
    { label: 'Recursos',        value: counts.recursos,   color: '#8b5cf6', bg: '#ede9fe', icon: <FileText size={22} color="#8b5cf6" /> },
  ];

  return (
    <div>
      <div className="stats-grid">
        {stats.map(s => (
          <div className="stat-card" key={s.label}>
            <div className="stat-icon" style={{ background: s.bg }}>{s.icon}</div>
            <div className="stat-number">{s.value ?? '—'}</div>
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
              { label: 'Total Clases',   value: counts.clases,   total: counts.clases,   color: '#10b981' },
              { label: 'Total Módulos',  value: counts.modulos,  total: counts.modulos,  color: '#6366f1' },
              { label: 'Total Recursos', value: counts.recursos, total: counts.recursos, color: '#f59e0b' },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                  <span style={{ fontWeight: 600 }}>{item.value}</span>
                </div>
                <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ width: '100%', height: '100%', background: item.color, borderRadius: '4px' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Próximas clases */}
        <div className="admin-table-wrapper" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontWeight: 600, marginBottom: '1.25rem', fontSize: '0.95rem', color: 'var(--text-dark)' }}>Próximas Clases</h3>
          {upcomingClasses.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No hay clases próximas.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {upcomingClasses.map(cls => (
                <div key={cls.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.625rem', borderRadius: 'var(--radius-md)', background: '#f8fafc', border: '1px solid var(--border-color)' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} color="#ca8a04" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.title}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {cls.class_date ? new Date(cls.class_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Fecha por confirmar'}
                    </div>
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

/* ─────────────────────────────────────────
   TAB 2 — Usuarios (Supabase users_profile)
───────────────────────────────────────── */
function UsuariosTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  const [fullName, setFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [role, setRole] = useState('student');
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error: fetchErr } = await supabase
        .from('users_profile')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (fetchErr) throw fetchErr;
      setUsers(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!name || !email || !role) { 
      setError('Por favor completa todos los campos.'); 
      return; 
    }

    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('users_profile')
        .insert([{
          full_name: name,
          email: email,
          role: role
        }]);
      
      if (insertError) throw insertError;
      
      setSuccess('Usuario registrado con éxito.');
      fetchUsers();
      
      setTimeout(() => { 
        setShowModal(false); 
        setSuccess(''); 
        setName(''); setEmail(''); setRole('student');
      }, 1500);
    } catch (err) {
      setError('Error al registrar usuario: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (user) => {
    setEditUser(user);
    setFullName(user.full_name || '');
    setEditEmail(user.email || '');
    setRole(user.role || 'student');
    setShowEditModal(true);
    setError('');
    setSuccess('');
  };

  const handleToggleStatus = async (user) => {
    const isCurrentlyActive = user.is_active !== false; // Asume activo si es null/undefined
    const actionText = isCurrentlyActive ? 'desactivar' : 'reactivar';
    
    if (!window.confirm(`¿Estás seguro de que deseas ${actionText} este usuario?`)) return;
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({ is_active: !isCurrentlyActive })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setSuccess(`Usuario ${isCurrentlyActive ? 'desactivado' : 'reactivado'} con éxito.`);
      fetchUsers();
    } catch (err) {
      setError(`Error al ${actionText} usuario: ` + err.message);
      setLoading(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!fullName || !role) { 
      setError('El nombre y el rol son obligatorios.'); 
      return; 
    }

    if (!['student', 'teacher', 'admin'].includes(role)) {
      setError('El rol seleccionado no es válido.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({ full_name: fullName, role })
        .eq('id', editUser.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Usuario actualizado con éxito.');
      fetchUsers();
      
      setTimeout(() => { 
        setShowEditModal(false); 
        setSuccess(''); 
      }, 1500);
    } catch (err) {
      setError('Error al actualizar: ' + err.message);
    } finally {
      setSubmitting(false);
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
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Registrar Nuevo Usuario</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Nombre Completo</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Juan Pérez" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Correo Electrónico</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="juan@ejemplo.com" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Rol</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Registrar Usuario'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showEditModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowEditModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Editar Usuario</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Nombre Completo</label>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Correo Electrónico (Solo lectura)</label>
                <input type="email" value={editEmail} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#9ca3af' }} />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>El correo está enlazado a la cuenta y no puede editarse aquí de forma segura.</span>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Rol</label>
                <select value={role} onChange={e => setRole(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                  <option value="student">Estudiante</option>
                  <option value="teacher">Profesor</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Usuario</th><th>Rol</th><th>Estado</th><th>Fecha de Ingreso</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> : 
             users.length === 0 ? <EmptyRow cols={4} message="No hay usuarios registrados." /> :
             users.map(user => (
              <tr key={user.id}>
                <td>
                  <div className="user-cell">
                    <Initials name={user.full_name || 'Desconocido'} />
                    <div>
                      <div className="user-name">{user.full_name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td><RoleBadge role={user.role} /></td>
                <td>
                  <span style={{ 
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '0.75rem', 
                    fontWeight: 'bold', 
                    backgroundColor: user.is_active !== false ? '#dcfce7' : '#fee2e2', 
                    color: user.is_active !== false ? '#166534' : '#991b1b' 
                  }}>
                    {user.is_active !== false ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '—'}</td>
                <td>
                  <div className="action-btns">
                    <button className="btn-icon edit" title="Editar Usuario" onClick={() => openEditModal(user)}><Pencil size={15} /></button>
                    <button className="btn-icon del" title={user.is_active !== false ? 'Desactivar Usuario' : 'Reactivar Usuario'} onClick={() => handleToggleStatus(user)}>
                      {user.is_active !== false ? <Trash2 size={15} /> : <CheckCircle size={15} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3 — Profesores (Supabase)
───────────────────────────────────────── */
function ProfesoresTab({ teachers, loading }) {
  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Profesores del diplomado ({teachers.length})</span>
        <button className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Profesor (próx.)
        </button>
      </div>
      <div className="teacher-cards-grid">
        {loading ? (
          <p style={{ color: 'var(--text-muted)' }}>Cargando profesores...</p>
        ) : teachers.length === 0 ? (
          <p style={{ color: 'var(--text-muted)' }}>No hay profesores registrados.</p>
        ) : teachers.map(t => (
          <div className="teacher-admin-card" key={t.id}>
            <div className="teacher-card-top">
              {t.photo || t.photo_url ? (
                <img src={t.photo || t.photo_url} alt={t.name} className="teacher-card-img" />
              ) : (
                <div className="teacher-card-img" style={{ backgroundColor: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '1.25rem' }}>
                  {(t.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{t.name}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{t.area}</div>
              </div>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{t.bio || 'Sin biografía.'}</p>
            <div className="teacher-card-actions">
              <button className="btn btn-outline" style={{ flex: 1, fontSize: '0.8rem', padding: '0.5rem' }}>
                <Pencil size={14} /> Editar (próx.)
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 4 — Módulos (Supabase)
───────────────────────────────────────── */
function ModulosTab({ modules, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [editModuleId, setEditModuleId] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [diplomaId, setDiplomaId] = useState('');
  const [diplomas, setDiplomas] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Limpiar el formulario al abrir modal de creación
  const openCreateModal = () => {
    setEditModuleId(null);
    setTitle('');
    setDescription('');
    setOrderIndex(1);
    // diplomaId se setea en el useEffect si está vacío
    setShowModal(true);
  };

  // Llenar el formulario al abrir modal de edición
  const openEditModal = (m) => {
    setEditModuleId(m.id);
    setTitle(m.title);
    setDescription(m.description || '');
    setOrderIndex(m.order_index || 1);
    setDiplomaId(m.diploma_id);
    setShowModal(true);
  };

  useEffect(() => {
    if (showModal && diplomas.length === 0) {
      supabase.from('diploma_programs').select('id, title').then(({ data }) => {
        setDiplomas(data || []);
        if (data && data.length > 0) setDiplomaId(data[0].id);
      });
    }
  }, [showModal]);

  const handleDelete = async (m) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el módulo "${m.title}"?`)) return;

    try {
      // Verificar si tiene subtemas asociados
      const { count, error: countError } = await supabase
        .from('subtopics')
        .select('*', { count: 'exact', head: true })
        .eq('module_id', m.id);
      
      if (countError) throw countError;

      if (count && count > 0) {
        alert(`Operación denegada:\n\nNo se puede eliminar el módulo "${m.title}" porque tiene ${count} subtema(s) asociado(s).\n\nPara eliminarlo de forma segura, primero debes reasignar o eliminar esos subtemas.`);
        return;
      }

      // Eliminar el módulo
      const { error: deleteError } = await supabase
        .from('modules')
        .delete()
        .eq('id', m.id);

      if (deleteError) throw deleteError;

      alert('Módulo eliminado exitosamente.');
      if (onRefresh) onRefresh();

    } catch (err) {
      alert('Error al eliminar el módulo: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!title || !diplomaId) {
      setError('El título y el diplomado son obligatorios.');
      return;
    }
    
    const parsedOrder = parseInt(orderIndex) || 0;
    
    // Validar orden duplicado (ignorando el módulo actual si estamos editando)
    if (modules.some(m => m.order_index === parsedOrder && m.id !== editModuleId)) {
      setError(`Ya existe un módulo con el orden ${parsedOrder}. Por favor elige otro número.`);
      return;
    }
    
    setSubmitting(true);
    try {
      const payload = {
        title,
        description,
        order_index: parsedOrder,
        diploma_id: diplomaId
      };

      let query;
      if (editModuleId) {
        query = supabase.from('modules').update(payload).eq('id', editModuleId);
      } else {
        query = supabase.from('modules').insert([payload]);
      }

      const { error: opError } = await query;
      if (opError) throw opError;
      
      setSuccess(editModuleId ? 'Módulo actualizado con éxito.' : 'Módulo creado con éxito.');
      setTitle(''); setDescription('');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al crear módulo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Módulos del programa ({modules.length})</span>
        <button onClick={openCreateModal} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Módulo
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{editModuleId ? 'Editar Módulo' : 'Crear Nuevo Módulo'}</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Módulo</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Fundamentos de Frontend" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Diplomado Asociado</label>
                <select value={diplomaId} onChange={e => setDiplomaId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {diplomas.length === 0 ? <option value="">Cargando diplomados...</option> : diplomas.map(d => (
                    <option key={d.id} value={d.id}>{d.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden (Número)</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="1" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Descripción corta del módulo..." />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Guardar Módulo'}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Título</th><th>Descripción</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             modules.length === 0 ? <EmptyRow cols={4} message="No hay módulos registrados." /> :
             modules.map((m, i) => (
              <tr key={m.id}>
                <td><div className="order-badge">{m.order_index ?? i + 1}</div></td>
                <td><span style={{ fontWeight: 600 }}>{m.title}</span></td>
                <td style={{ color: 'var(--text-muted)', maxWidth: '240px' }}>{m.description}</td>
                <td><ActionBtns onEdit={() => openEditModal(m)} onDelete={() => handleDelete(m)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 5 — Subtemas (Supabase)
───────────────────────────────────────── */
function SubtemasTab({ subtopics, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  const [moduleId, setModuleId] = useState('');
  const [modules, setModules] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar módulos al abrir el modal para seleccionar a qué módulo pertenece
  useEffect(() => {
    if (showModal && modules.length === 0) {
      supabase.from('modules').select('id, title').then(({ data }) => {
        setModules(data || []);
        if (data && data.length > 0) setModuleId(data[0].id);
      });
    }
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !moduleId) {
      setError('El título y el módulo asociado son obligatorios.');
      return;
    }
    
    const parsedOrder = parseInt(orderIndex) || 0;
    
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('subtopics')
        .insert([{
          title,
          description,
          order_index: parsedOrder,
          module_id: moduleId
        }]);
      
      if (insertError) throw insertError;
      
      setSuccess('Subtema creado con éxito.');
      setTitle(''); setDescription('');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al crear subtema: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Subtemas registrados ({subtopics.length})</span>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Subtema
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Crear Nuevo Subtema</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Subtema</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Introducción a HTML" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Módulo Asociado</label>
                <select value={moduleId} onChange={e => setModuleId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {modules.length === 0 ? <option value="">Cargando módulos...</option> : modules.map(m => (
                    <option key={m.id} value={m.id}>{m.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden (Número)</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="1" required />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción (opcional)</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }} placeholder="Descripción corta del subtema..." />
              </div>
              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Guardar Subtema'}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>#</th><th>Título</th><th>Descripción</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             subtopics.length === 0 ? <EmptyRow cols={4} message="No hay subtemas registrados." /> :
             subtopics.map((st, i) => (
              <tr key={st.id}>
                <td><div className="order-badge">{st.order_index ?? i + 1}</div></td>
                <td><span style={{ fontWeight: 600 }}>{st.title}</span></td>
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
   TAB 6 — Clases (Supabase)
───────────────────────────────────────── */
function ClasesTab({ classes, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subtopicId, setSubtopicId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [classDate, setClassDate] = useState('');
  const [duration, setDuration] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [presentationUrl, setPresentationUrl] = useState('');
  const [orderIndex, setOrderIndex] = useState(1);
  
  const [subtopicsList, setSubtopicsList] = useState([]);
  const [teachersList, setTeachersList] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar subtemas y profesores al abrir el modal
  useEffect(() => {
    if (showModal && subtopicsList.length === 0) {
      Promise.all([
        supabase.from('subtopics').select('id, title').order('order_index', { ascending: true }),
        supabase.from('teacher_profiles').select('id, name')
      ]).then(([stRes, tRes]) => {
        setSubtopicsList(stRes.data || []);
        setTeachersList(tRes.data || []);
        if (stRes.data && stRes.data.length > 0) setSubtopicId(stRes.data[0].id);
        if (tRes.data && tRes.data.length > 0) setTeacherId(tRes.data[0].id);
      });
    }
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !subtopicId || !teacherId) {
      setError('El título, subtema y profesor son obligatorios.');
      return;
    }
    
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('class_sessions')
        .insert([{
          title,
          description,
          subtopic_id: subtopicId,
          teacher_id: teacherId,
          class_date: classDate ? new Date(classDate).toISOString() : null,
          duration: duration ? parseInt(duration) : null,
          video_url: videoUrl || null,
          presentation_url: presentationUrl || null,
          order_index: parseInt(orderIndex) || 0
        }]);
      
      if (insertError) throw insertError;
      
      setSuccess('Clase creada con éxito.');
      setTitle(''); setDescription(''); setClassDate(''); setDuration(''); setVideoUrl(''); setPresentationUrl('');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al crear clase: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Sesiones de clase ({classes.length})</span>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Crear Clase
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Crear Nueva Clase</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título de la Clase</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Bases de React" required />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Subtema Asociado</label>
                <select value={subtopicId} onChange={e => setSubtopicId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {subtopicsList.length === 0 ? <option value="">Cargando subtemas...</option> : subtopicsList.map(st => (
                    <option key={st.id} value={st.id}>{st.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Profesor Asignado</label>
                <select value={teacherId} onChange={e => setTeacherId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {teachersList.length === 0 ? <option value="">Cargando profesores...</option> : teachersList.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Fecha y Hora</label>
                <input type="datetime-local" value={classDate} onChange={e => setClassDate(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Duración (minutos)</label>
                <input type="number" value={duration} onChange={e => setDuration(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: 90" />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL de Grabación</label>
                <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL de Presentación</label>
                <input type="url" value={presentationUrl} onChange={e => setPresentationUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Orden</label>
                <input type="number" value={orderIndex} onChange={e => setOrderIndex(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Descripción</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit' }} />
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ width: '100%' }}>
                  {submitting ? 'Guardando...' : 'Guardar Clase'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Título</th><th>Profesor</th><th>Fecha</th><th>Duración</th><th>Estado</th><th>Grabación</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={7} /> :
             classes.length === 0 ? <EmptyRow cols={7} message="No hay clases registradas." /> :
             classes.map(cls => (
              <tr key={cls.id}>
                <td style={{ fontWeight: 600 }}>{cls.title}</td>
                <td>{cls.teacher_profiles?.name || '—'}</td>
                <td>{cls.class_date ? new Date(cls.class_date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                <td>{cls.duration ? `${cls.duration} min` : '—'}</td>
                <td><StatusBadge status={cls.status} /></td>
                <td>
                  {cls.video_url
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
   TAB 7 — Recursos (Supabase)
───────────────────────────────────────── */
function RecursosTab({ resources, loading, onRefresh }) {
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState('');
  const [resourceType, setResourceType] = useState('link');
  const [url, setUrl] = useState('');
  const [classesList, setClassesList] = useState([]);
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Cargar clases al abrir el modal para seleccionar a qué clase pertenece
  useEffect(() => {
    if (showModal && classesList.length === 0) {
      supabase.from('class_sessions').select('id, title').order('created_at', { ascending: false }).then(({ data }) => {
        setClassesList(data || []);
        if (data && data.length > 0) setClassId(data[0].id);
      });
    }
  }, [showModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    
    if (!title || !classId || !url) {
      setError('El título, la clase y el enlace son obligatorios.');
      return;
    }
    
    setSubmitting(true);
    try {
      const { error: insertError } = await supabase
        .from('resources')
        .insert([{
          title,
          class_id: classId,
          resource_type: resourceType,
          url
        }]);
      
      if (insertError) throw insertError;
      
      setSuccess('Recurso agregado con éxito.');
      setTitle(''); setUrl(''); setResourceType('link');
      if (onRefresh) onRefresh();
      
      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Error al agregar recurso: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="section-header-row">
        <span className="section-title">Recursos del diplomado ({resources.length})</span>
        <button onClick={() => setShowModal(true)} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Agregar Recurso
        </button>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', background: 'white', padding: '2rem', position: 'relative' }}>
            <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
              <X size={20} />
            </button>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>Agregar Nuevo Recurso</h3>
            {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
            {success && <div style={{ color: 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>{success}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Título del Recurso</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Ej: Diapositivas de la Clase 1" required />
              </div>
              
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Clase Asociada</label>
                <select value={classId} onChange={e => setClassId(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  {classesList.length === 0 ? <option value="">Cargando clases...</option> : classesList.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Tipo de Recurso</label>
                <select value={resourceType} onChange={e => setResourceType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required>
                  <option value="link">Enlace externo (Web)</option>
                  <option value="pdf">Documento PDF</option>
                  <option value="presentation">Presentación / Diapositivas</option>
                  <option value="video">Video Externo</option>
                  <option value="file">Otro Archivo</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>URL del Recurso</label>
                <input type="url" value={url} onChange={e => setUrl(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="https://..." required />
              </div>

              <button type="submit" disabled={submitting} className="btn btn-primary" style={{ marginTop: '1rem', width: '100%' }}>
                {submitting ? 'Guardando...' : 'Agregar Recurso'}
              </button>
            </form>
          </div>
        </div>
      )}
      <div className="admin-table-wrapper">
        <table className="admin-table">
          <thead>
            <tr><th>Nombre</th><th>Tipo</th><th>Enlace</th><th>Acciones</th></tr>
          </thead>
          <tbody>
            {loading ? <LoadingRow cols={4} /> :
             resources.length === 0 ? <EmptyRow cols={4} message="No hay recursos registrados." /> :
             resources.map(r => (
              <tr key={r.id}>
                <td style={{ fontWeight: 600 }}>{r.title}</td>
                <td><TypeBadge type={r.resource_type} /></td>
                <td>
                  <a href={r.url} target="_blank" rel="noreferrer" style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem' }}>
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
  { id: 'resumen',    label: 'Resumen',    icon: <LayoutDashboard size={16} /> },
  { id: 'usuarios',  label: 'Usuarios',   icon: <Users size={16} /> },
  { id: 'profesores',label: 'Profesores', icon: <GraduationCap size={16} /> },
  { id: 'modulos',   label: 'Módulos',    icon: <BookOpen size={16} /> },
  { id: 'subtemas',  label: 'Subtemas',   icon: <ListTree size={16} /> },
  { id: 'clases',    label: 'Clases',     icon: <Video size={16} /> },
  { id: 'recursos',  label: 'Recursos',   icon: <FileText size={16} /> },
];

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const [activeTab, setActiveTab] = useState('resumen');
  const role = currentUser?.role;

  // Estado centralizado de datos
  const [data, setData] = useState({
    teachers: [], modules: [], subtopics: [], classes: [], resources: [],
    upcomingClasses: [],
    counts: { usuarios: 0, profesores: 0, modulos: 0, subtemas: 0, clases: 0, recursos: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  useEffect(() => {
    if (role !== 'admin') return;

    async function fetchAll() {
      try {
        const [teachersRes, modulesRes, subtopicsRes, classesRes, resourcesRes] = await Promise.all([
          supabase.from('teacher_profiles').select('*'),
          supabase.from('modules').select('*').order('order_index', { ascending: true }),
          supabase.from('subtopics').select('*').order('order_index', { ascending: true }),
          supabase.from('class_sessions').select('*, teacher_profiles(name)').order('class_date', { ascending: true }),
          supabase.from('resources').select('*'),
        ]);

        const now = new Date().toISOString();
        const upcoming = (classesRes.data || []).filter(c => c.class_date && c.class_date > now).slice(0, 4);

        setData({
          teachers: teachersRes.data || [],
          modules: modulesRes.data || [],
          subtopics: subtopicsRes.data || [],
          classes: classesRes.data || [],
          resources: resourcesRes.data || [],
          upcomingClasses: upcoming,
          counts: {
            usuarios: '—',
            profesores: (teachersRes.data || []).length,
            modulos: (modulesRes.data || []).length,
            subtemas: (subtopicsRes.data || []).length,
            clases: (classesRes.data || []).length,
            recursos: (resourcesRes.data || []).length,
          }
        });
      } catch (err) {
        console.error('Error cargando datos del panel admin:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAll();
  }, [role, refreshTrigger]);

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

  const renderTab = () => {
    switch (activeTab) {
      case 'resumen':    return <ResumenTab counts={data.counts} upcomingClasses={data.upcomingClasses} />;
      case 'usuarios':   return <UsuariosTab />;
      case 'profesores': return <ProfesoresTab teachers={data.teachers} loading={loading} />;
      case 'modulos':    return <ModulosTab modules={data.modules} loading={loading} onRefresh={refreshData} />;
      case 'subtemas':   return <SubtemasTab subtopics={data.subtopics} loading={loading} onRefresh={refreshData} />;
      case 'clases':     return <ClasesTab classes={data.classes} loading={loading} onRefresh={refreshData} />;
      case 'recursos':   return <RecursosTab resources={data.resources} loading={loading} onRefresh={refreshData} />;
      default:           return <ResumenTab counts={data.counts} upcomingClasses={data.upcomingClasses} />;
    }
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Panel de Administración</h1>
        <p className="page-description">Gestiona todos los recursos y contenidos del diplomado desde un solo lugar.</p>
      </div>

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

      {loading && activeTab !== 'usuarios' ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando datos del panel...
        </div>
      ) : (
        renderTab()
      )}
    </div>
  );
}
