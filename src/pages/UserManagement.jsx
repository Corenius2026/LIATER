import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { createClient } from '@supabase/supabase-js';
import { UserPlus, UserCog, Trash2, ShieldAlert, X, Plus, CheckCircle, BookOpen, Pencil } from 'lucide-react';
import './AdminPanel.css'; // Reutilizamos estilos

// Cliente secundario solo para crear usuarios sin sobreescribir la sesiÃ³n del admin
const supabaseCreator = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  { auth: { storageKey: 'dummy-admin-creator', autoRefreshToken: false, persistSession: false } }
);

function RoleBadge({ role }) {
  const map = { admin: ['role-badge role-admin', 'Administrador'], teacher: ['role-badge role-teacher', 'Profesor'], student: ['role-badge role-student', 'Estudiante'] };
  const [cls, label] = map[role] ?? ['role-badge', role];
  return <span className={cls}>{label}</span>;
}

function Initials({ name }) {
  const parts = (name || '').trim().split(' ');
  const letters = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '');
  return <div className="user-avatar-initials">{letters.toUpperCase()}</div>;
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

export default function UserManagement() {
  const { currentUser } = useAuth();
  const roleAuth = currentUser?.role;

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewRole, setViewRole] = useState('student');
  
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  
  const [fullName, setFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [role, setRole] = useState('student');
  
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollStudent, setEnrollStudent] = useState(null);
  const [diplomas, setDiplomas] = useState([]);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [enrollSubmitting, setEnrollSubmitting] = useState(false);

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
    if (roleAuth === 'admin') {
      fetchUsers();
    }
  }, [roleAuth]);

  if (roleAuth !== 'admin') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#dc2626" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Esta vista es exclusiva para administradores.</p>
      </div>
    );
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');

    if (!name || !email || !role || !password) {
      setError('Por favor completa todos los campos, incluyendo la contraseÃ±a.');
      return;
    }

    if (password.length < 6) {
      setError('La contraseÃ±a debe tener al menos 6 caracteres.');
      return;
    }

    setSubmitting(true);
    try {
      // PASO 1: Crear cuenta en Supabase Auth usando el cliente secundario
      const { data: authData, error: authError } = await supabaseCreator.auth.signUp({
        email: email,
        password: password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No se pudo crear la cuenta de acceso.');

      // PASO 2: Crear el perfil en users_profile vinculado al auth_user_id.
      const { data: newUserProfile, error: insertError } = await supabase
        .from('users_profile')
        .insert([{
          auth_user_id: authData.user.id,
          full_name: name,
          email: email,
          role: role,
          is_active: true
        }])
        .select()
        .single();

      if (insertError) throw insertError;

      // PASO 2.5: Si es profesor, crear su perfil pÃºblico de profesor
      if (role === 'teacher' && newUserProfile) {
        const { error: teacherInsertError } = await supabase
          .from('teacher_profiles')
          .insert([{
            user_id: newUserProfile.id,
            name: name
          }]);
        
        if (teacherInsertError) {
          console.error('Error al crear perfil de profesor:', teacherInsertError);
        }
      }

      setSuccess(`Usuario creado. El usuario ya puede iniciar sesiÃ³n con el correo ${email} y la contraseÃ±a que le asignaste.`);
      fetchUsers();

      setTimeout(() => {
        setShowModal(false);
        setSuccess('');
        setName(''); setEmail(''); setPassword(''); setRole('student');
      }, 2500);
    } catch (err) {
      console.error('Error completo:', err);
      let errorMsg = err.message || err.error_description;
      if (!errorMsg) {
        try {
          errorMsg = JSON.stringify(err, Object.getOwnPropertyNames(err));
        } catch (e) {
          errorMsg = String(err);
        }
      }
      setError('Error al registrar usuario: ' + errorMsg);
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

  const openEnrollModal = async (user) => {
    setEnrollStudent(user);
    setShowEnrollModal(true);
    setError(''); setSuccess('');
    
    // Fetch all diplomas
    const { data: dData } = await supabase.from('diploma_programs').select('id, title');
    setDiplomas(dData || []);
    
    // Fetch student's enrollments
    const { data: eData } = await supabase.from('enrollments').select('program_id').eq('student_id', user.id);
    setStudentEnrollments(eData ? eData.map(e => e.program_id) : []);
  };

  const handleToggleEnrollment = async (diplomaId) => {
    const isEnrolled = studentEnrollments.includes(diplomaId);
    setEnrollSubmitting(true);
    try {
      if (isEnrolled) {
        const { error } = await supabase.from('enrollments').delete().eq('student_id', enrollStudent.id).eq('program_id', diplomaId);
        if (error) throw error;
        setStudentEnrollments(prev => prev.filter(id => id !== diplomaId));
      } else {
        const { error } = await supabase.from('enrollments').insert([{ student_id: enrollStudent.id, program_id: diplomaId }]);
        if (error) throw error;
        setStudentEnrollments(prev => [...prev, diplomaId]);
      }
    } catch (err) {
      setError('Error al actualizar inscripciÃ³n: ' + err.message);
    } finally {
      setEnrollSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const isCurrentlyActive = user.is_active !== false;
    const actionText = isCurrentlyActive ? 'desactivar' : 'reactivar';
    
    if (!window.confirm(`Â¿EstÃ¡s seguro de que deseas ${actionText} este usuario?`)) return;
    
    setLoading(true);
    try {
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({ is_active: !isCurrentlyActive })
        .eq('id', user.id);
        
      if (updateError) throw updateError;
      
      setSuccess(`Usuario ${isCurrentlyActive ? 'desactivado' : 'reactivado'} con Ã©xito.`);
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
      setError('El rol seleccionado no es vÃ¡lido.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase
        .from('users_profile')
        .update({ full_name: fullName, role })
        .eq('id', editUser.id);
      
      if (updateError) throw updateError;
      
      setSuccess('Usuario actualizado con Ã©xito.');
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
      <div className="page-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">GestiÃ³n de Usuarios Global</h1>
          <p className="page-description">Crea usuarios en la base de datos central de LIATER y adminÃ­stralos.</p>
        </div>
      </div>

      <div className="card" style={{ padding: '1.5rem' }}>
        <div className="section-header-row" style={{ marginBottom: '1rem' }}>
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
                  <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="Juan PÃ©rez" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Correo ElectrÃ³nico</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="juan@ejemplo.com" required />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>ContraseÃ±a Inicial</label>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} placeholder="MÃ­nimo 6 caracteres" required />
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
                  <label style={{ display: 'block', marginBottom: '4px', fontWeight: 500, fontSize: '0.85rem' }}>Correo ElectrÃ³nico (Solo lectura)</label>
                  <input type="email" value={editEmail} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', backgroundColor: '#f3f4f6', color: '#9ca3af' }} />
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>El correo estÃ¡ enlazado a la cuenta y no puede editarse aquÃ­ de forma segura.</span>
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

        {showEnrollModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'white', padding: '2rem', position: 'relative' }}>
              <button onClick={() => setShowEnrollModal(false)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
              <h3 style={{ marginBottom: '0.5rem', fontWeight: 700 }}>Gestionar Inscripciones</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{enrollStudent?.role === 'teacher' ? 'Profesor' : 'Estudiante'}: <strong>{enrollStudent?.full_name}</strong></p>
              {error && <div style={{ color: 'red', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
                {diplomas.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay diplomados disponibles.</p>
                ) : (
                  diplomas.map(dip => {
                    const isEnrolled = studentEnrollments.includes(dip.id);
                    return (
                      <div key={dip.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{dip.title}</span>
                        <button 
                          onClick={() => handleToggleEnrollment(dip.id)} 
                          disabled={enrollSubmitting}
                          className="btn" 
                          style={{ 
                            padding: '0.4rem 0.8rem', 
                            fontSize: '0.75rem', 
                            backgroundColor: isEnrolled ? '#fee2e2' : '#dcfce7', 
                            color: isEnrolled ? '#991b1b' : 'var(--text-muted)',
                            border: 'none',
                            minWidth: '90px'
                          }}
                        >
                          {isEnrolled ? 'Desinscribir' : 'Inscribir'}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
              
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div className="admin-tabs" style={{ marginBottom: 0, padding: 0, background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <button className={`admin-tab-btn ${viewRole === 'student' ? 'active' : ''}`} onClick={() => setViewRole('student')} style={{ padding: '0.5rem 1rem' }}>Alumnos</button>
            <button className={`admin-tab-btn ${viewRole === 'teacher' ? 'active' : ''}`} onClick={() => setViewRole('teacher')} style={{ padding: '0.5rem 1rem' }}>Profesores</button>
            <button className={`admin-tab-btn ${viewRole === 'admin' ? 'active' : ''}`} onClick={() => setViewRole('admin')} style={{ padding: '0.5rem 1rem' }}>Admins</button>
          </div>
          <input 
            type="text" 
            placeholder="Buscar por nombre o correo..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)}
            style={{ padding: '0.6rem 1rem', border: '1px solid var(--border-color)', borderRadius: '6px', minWidth: '280px', fontSize: '0.9rem' }}
          />
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Usuario</th><th>Rol</th><th>Estado</th><th>Fecha de Ingreso</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <LoadingRow cols={5} /> : 
               users.filter(u => u.role === viewRole && (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()))).length === 0 ? <EmptyRow cols={5} message="No se encontraron usuarios con esos criterios." /> :
               users.filter(u => u.role === viewRole && (u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || u.email?.toLowerCase().includes(searchTerm.toLowerCase()))).map(user => (
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
                      color: user.is_active !== false ? 'var(--text-muted)' : '#991b1b' 
                    }}>
                      {user.is_active !== false ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>{user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : 'â€”'}</td>
                  <td>
                    <div className="action-btns">
                      {(user.role === 'student' || user.role === 'teacher') && (
                        <button className="btn-icon" style={{color: 'var(--navy)'}} title="Gestionar Inscripciones" onClick={() => openEnrollModal(user)}>
                          <BookOpen size={15} />
                        </button>
                      )}
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
    </div>
  );
}


