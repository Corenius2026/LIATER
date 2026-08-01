import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  User, Mail, Phone, Globe, Camera, Shield, Save,
  BookOpen, Lock, CheckCircle2, Award, Briefcase,
  LockKeyhole, MailCheck, Eye, EyeOff, X
} from 'lucide-react';

export default function Profile() {
  const { currentUser } = useAuth();
  const role = currentUser?.role;
  const isTeacher = role === 'teacher';

  const [activeTab, setActiveTab] = useState('personal');

  // Datos personales (users_profile)
  const [personalData, setPersonalData] = useState({
    full_name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    country: 'Colombia',
    avatar_url: ''
  });

  // Datos académicos (teacher_profiles)
  const [academicData, setAcademicData] = useState({
    area: '',
    bio: '',
    title_role: 'Profesor Titular',
    experience: ''
  });

  // Programas en los que participa
  const [myPrograms, setMyPrograms] = useState([]);
  
  // Estado para la sección de Seguridad
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordStep, setPasswordStep] = useState('initial'); // 'initial' | 'otp'
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  
  // Visibilidad de contraseñas
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  // Mensajes de error/éxito del modal
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');
  const [securitySaving, setSecuritySaving] = useState(false);

  // Verificación de correo Supabase Auth
  const [isEmailVerified, setIsEmailVerified] = useState(true);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    async function checkEmailVerification() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setIsEmailVerified(!!(user.email_confirmed_at || user.confirmed_at));
        }
      } catch (e) {
        console.error('Error al verificar estado de correo:', e);
      }
    }
    checkEmailVerification();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && showPasswordModal) {
        handleClosePasswordModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showPasswordModal]);

  useEffect(() => {
    async function loadProfileData() {
      if (!currentUser?.id) return;
      try {
        // 1. Cargar users_profile
        const { data: uProfile } = await supabase
          .from('users_profile')
          .select('*')
          .eq('id', currentUser.id)
          .maybeSingle();
          
        if (uProfile) {
          setPersonalData({
            full_name: uProfile.full_name || currentUser.name || '',
            email: currentUser.email || '',
            phone: uProfile.phone || '',
            country: uProfile.country || 'Colombia',
            avatar_url: uProfile.avatar_url || ''
          });
        }

        // 2. Si es profesor, cargar teacher_profiles y diploma_programs
        if (isTeacher) {
          const { data: tProfile } = await supabase
            .from('teacher_profiles')
            .select('*')
            .eq('user_id', currentUser.id)
            .maybeSingle();

          if (tProfile) {
            setAcademicData({
              area: tProfile.area || '',
              bio: tProfile.bio || '',
              title_role: tProfile.title_role || 'Profesor Titular',
              experience: tProfile.experience || ''
            });
          }

          // Cargar programas
          const { data: progs } = await supabase
            .from('diploma_programs')
            .select('*')
            .order('title', { ascending: true });
          if (progs) setMyPrograms(progs);
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      }
    }
    loadProfileData();
  }, [currentUser?.id, isTeacher]);

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const { error } = await supabase
        .from('users_profile')
        .update({
          full_name: personalData.full_name,
          phone: personalData.phone,
          country: personalData.country
        })
        .eq('id', currentUser.id);

      if (error) throw error;
      setMsg({ type: 'success', text: 'Perfil personal actualizado con éxito.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al actualizar perfil: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcademic = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const { data: tProfile } = await supabase
        .from('teacher_profiles')
        .select('id')
        .eq('user_id', currentUser.id)
        .maybeSingle();

      if (tProfile) {
        const { error } = await supabase
          .from('teacher_profiles')
          .update({
            area: academicData.area,
            bio: academicData.bio,
            title_role: academicData.title_role,
            experience: academicData.experience
          })
          .eq('id', tProfile.id);

        if (error) throw error;
      }
      setMsg({ type: 'success', text: 'Perfil académico actualizado con éxito.' });
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al actualizar perfil académico: ' + err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleOpenPasswordModal = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setModalError('');
    setModalSuccess('');
    setPasswordStep('initial');
    setShowPasswordModal(true);
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setOtpCode('');
    setModalError('');
    setModalSuccess('');
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (!currentPassword) {
      setModalError('La contraseña actual es obligatoria.');
      return;
    }
    if (!newPassword) {
      setModalError('La nueva contraseña es obligatoria.');
      return;
    }
    if (newPassword.length < 6) {
      setModalError('La nueva contraseña no cumple los requisitos de seguridad (mínimo 6 caracteres).');
      return;
    }
    if (newPassword !== confirmPassword) {
      setModalError('Las contraseñas no coinciden.');
      return;
    }
    if (newPassword === currentPassword) {
      setModalError('La nueva contraseña debe ser diferente a la contraseña actual.');
      return;
    }

    setSecuritySaving(true);

    try {
      // 1. Verificar la contraseña actual intentando autenticación segura con Supabase
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: currentUser?.email,
        password: currentPassword
      });

      if (signInErr) {
        setModalError('La contraseña actual no es correcta.');
        setSecuritySaving(false);
        return;
      }

      // 2. Si se requiere paso de OTP / Reautenticación por Supabase
      if (passwordStep === 'otp') {
        if (!otpCode.trim()) {
          setModalError('Ingresa el código de verificación enviado a tu correo.');
          setSecuritySaving(false);
          return;
        }

        const { error: otpErr } = await supabase.auth.reauthenticate({
          nonce: otpCode.trim()
        });

        if (otpErr) {
          setModalError('El código de verificación es inválido o ha expirado.');
          setSecuritySaving(false);
          return;
        }
      }

      // 3. Actualizar contraseña mediante Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateErr) {
        if (updateErr.message?.toLowerCase().includes('reauthenticate') || updateErr.status === 429) {
          try {
            await supabase.auth.reauthenticate();
            setPasswordStep('otp');
            setModalError('Por seguridad, enviamos un código a tu correo. Ingrésalo para confirmar.');
          } catch (reauthErr) {
            setModalError('No fue posible iniciar la verificación por correo. Inténtalo más tarde.');
          }
          setSecuritySaving(false);
          return;
        }
        throw updateErr;
      }

      // Éxito
      setModalSuccess('Contraseña actualizada correctamente.');
      setMsg({ type: 'success', text: 'Contraseña actualizada correctamente.' });

      setTimeout(() => {
        handleClosePasswordModal();
      }, 1200);

    } catch (err) {
      console.error('Error al actualizar contraseña:', err);
      setModalError('No fue posible actualizar la contraseña. Inténtalo nuevamente.');
    } finally {
      setSecuritySaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      <h1 style={{ color: 'var(--navy)', fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        Mi Perfil
      </h1>

      {msg.text && (
        <div style={{
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          background: msg.type === 'error' ? '#fef2f2' : '#f0fdf4',
          color: msg.type === 'error' ? '#dc2626' : '#16a34a',
          border: `1px solid ${msg.type === 'error' ? '#fca5a5' : '#bbf7d0'}`
        }}>
          {msg.text}
        </div>
      )}

      {/* CABECERA RESUMIDA DEL USUARIO */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '2rem', padding: '2rem', marginBottom: '2rem', background: 'var(--white)' }}>
        <div style={{ position: 'relative' }}>
          <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 800, fontSize: '2.5rem', flexShrink: 0 }}>
            {personalData.full_name ? personalData.full_name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.25rem' }}>
            {personalData.full_name || 'Usuario LIATER'}
          </h2>
          <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <Mail size={16} /> {personalData.email}
          </p>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'rgba(20, 33, 61, 0.08)', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)' }}>
            <Shield size={14} color="var(--navy)" /> 
            {role === 'admin' ? 'Administrador' : role === 'teacher' ? 'Profesor' : 'Estudiante'}
          </span>
        </div>
      </div>

      {/* SI ES PROFESOR, PESTAÑAS DEDICADAS */}
      {isTeacher ? (
        <div>
          {/* BOTONES DE PESTAÑAS DEL PERFIL */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('personal')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: activeTab === 'personal' ? 'var(--navy)' : 'transparent',
                color: activeTab === 'personal' ? 'var(--white)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <User size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Perfil personal
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: activeTab === 'academic' ? 'var(--navy)' : 'transparent',
                color: activeTab === 'academic' ? 'var(--white)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <Award size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Perfil académico público
            </button>

            <button
              onClick={() => setActiveTab('security')}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                background: activeTab === 'security' ? 'var(--navy)' : 'transparent',
                color: activeTab === 'security' ? 'var(--white)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              <Lock size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'text-bottom' }} />
              Seguridad de la cuenta
            </button>
          </div>

          {/* CONTENIDO DE PESTAÑA: PERFIL PERSONAL */}
          {activeTab === 'personal' && (
            <form onSubmit={handleSavePersonal} className="card" style={{ padding: '2rem', background: 'var(--white)' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--navy)', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                Perfil Personal
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Nombre Completo</label>
                  <input 
                    type="text" 
                    value={personalData.full_name} 
                    onChange={e => setPersonalData({ ...personalData, full_name: e.target.value })} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }} 
                    required 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Correo Electrónico</label>
                  <input 
                    type="email" 
                    value={personalData.email} 
                    disabled 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-muted)' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Teléfono</label>
                  <input 
                    type="tel" 
                    value={personalData.phone} 
                    onChange={e => setPersonalData({ ...personalData, phone: e.target.value })} 
                    placeholder="+57 300 000 0000" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>País</label>
                  <select 
                    value={personalData.country} 
                    onChange={e => setPersonalData({ ...personalData, country: e.target.value })} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}
                  >
                    <option value="Colombia">Colombia</option>
                    <option value="México">México</option>
                    <option value="Perú">Perú</option>
                    <option value="Chile">Chile</option>
                    <option value="Argentina">Argentina</option>
                    <option value="España">España</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} className="btn btn-navy" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}>
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          )}

          {/* CONTENIDO DE PESTAÑA: PERFIL ACADÉMICO PÚBLICO */}
          {activeTab === 'academic' && (
            <form onSubmit={handleSaveAcademic} className="card" style={{ padding: '2rem', background: 'var(--white)' }}>
              <h3 style={{ fontSize: '1.15rem', color: 'var(--navy)', fontWeight: 700, marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                Perfil Académico Público
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Especialidad o Área</label>
                  <input 
                    type="text" 
                    value={academicData.area} 
                    onChange={e => setAcademicData({ ...academicData, area: e.target.value })} 
                    placeholder="Ej. Inteligencia Artificial, Redes de Datos" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }} 
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Cargo</label>
                  <input 
                    type="text" 
                    value={academicData.title_role} 
                    onChange={e => setAcademicData({ ...academicData, title_role: e.target.value })} 
                    placeholder="Ej. Profesor Titular, Docente Investigador" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }} 
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Biografía Corta</label>
                <textarea 
                  rows={3} 
                  value={academicData.bio} 
                  onChange={e => setAcademicData({ ...academicData, bio: e.target.value })} 
                  placeholder="Resumen profesional de tu trayectoria académica para la comunidad..." 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }} 
                />
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.4rem' }}>Formación o Experiencia</label>
                <textarea 
                  rows={3} 
                  value={academicData.experience} 
                  onChange={e => setAcademicData({ ...academicData, experience: e.target.value })} 
                  placeholder="Detalles sobre títulos universitarios, reconocimientos y experiencia docente..." 
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)' }} 
                />
              </div>

              {/* LISTA DE PROGRAMAS EN LOS QUE PARTICIPA */}
              <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem' }}>
                  Programas en los que participa
                </h4>
                {myPrograms.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No hay programas asignados por el momento.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                    {myPrograms.map(prog => (
                      <div key={prog.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem', background: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <BookOpen size={18} color="var(--navy)" />
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>{prog.title}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{prog.program_type === 'curso' ? 'Curso Corto' : 'Diplomado'}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" disabled={saving} className="btn btn-navy" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', fontWeight: 700 }}>
                  <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios Académicos'}
                </button>
              </div>
            </form>
          )}

          {/* CONTENIDO DE PESTAÑA: SEGURIDAD */}
          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* TARJETA DE RESUMEN DE SEGURIDAD */}
              <div className="card" style={{ padding: '2rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderTop: '3px solid var(--gold)' }}>
                <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                    Acceso y seguridad
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.25rem 0 0 0' }}>
                    Administra la contraseña y protege el acceso a tu cuenta.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {/* FILA 1: CONTRASEÑA */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: '1 1 280px' }}>
                      <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.04)', color: 'var(--navy)', flexShrink: 0 }}>
                        <LockKeyhole size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', color: 'var(--navy)', fontWeight: 700, margin: 0 }}>
                          Contraseña
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                          Utiliza una contraseña segura y diferente a la de otros servicios.
                        </p>
                      </div>
                    </div>

                    <button 
                      type="button" 
                      onClick={handleOpenPasswordModal}
                      className="btn" 
                      style={{ 
                        background: 'transparent', 
                        color: 'var(--navy)', 
                        border: '1.5px solid var(--navy)', 
                        padding: '0.55rem 1.25rem', 
                        fontWeight: 700, 
                        fontSize: '0.88rem', 
                        borderRadius: '8px',
                        whiteSpace: 'nowrap',
                        cursor: 'pointer',
                        transition: 'all 200ms ease'
                      }}
                      onMouseOver={e => { e.currentTarget.style.background = 'var(--navy)'; e.currentTarget.style.color = 'var(--white)'; }}
                      onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--navy)'; }}
                    >
                      Cambiar contraseña
                    </button>
                  </div>

                  {/* FILA 2: CORREO DE RECUPERACIÓN */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flex: '1 1 280px' }}>
                      <div style={{ padding: '0.65rem', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.04)', color: 'var(--navy)', flexShrink: 0 }}>
                        <MailCheck size={22} />
                      </div>
                      <div>
                        <h4 style={{ fontSize: '1rem', color: 'var(--navy)', fontWeight: 700, margin: 0 }}>
                          Correo de recuperación
                        </h4>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                          {currentUser?.email || 'Correo no registrado'}
                        </p>
                      </div>
                    </div>

                    <div>
                      <span style={{ 
                        background: isEmailVerified ? '#e8f5ee' : '#fff7ed', 
                        color: isEmailVerified ? 'var(--green-700)' : '#c2410c', 
                        padding: '0.35rem 0.85rem', 
                        borderRadius: '9999px', 
                        fontSize: '0.75rem', 
                        fontWeight: 700 
                      }}>
                        {isEmailVerified ? '✓ Correo verificado' : 'Verificación pendiente'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NOTA PEQUEÑA AL FINAL */}
              <div style={{ textAlign: 'center', padding: '0.5rem 1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Los roles y permisos institucionales son administrados por LIATER.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA ESTÁNDAR PARA OTROS ROLES (ESTUDIANTE / ADMIN) */
        <form onSubmit={handleSavePersonal} className="card" style={{ padding: '2rem', background: 'var(--white)' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', color: 'var(--navy)', fontWeight: 700 }}>
            Información Personal
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>Nombre Completo</label>
              <input type="text" value={personalData.full_name} onChange={e => setPersonalData({...personalData, full_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>Correo Electrónico</label>
              <input type="email" value={personalData.email} disabled style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--bg-light)', color: 'var(--text-muted)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>Teléfono</label>
              <input type="tel" value={personalData.phone} onChange={e => setPersonalData({...personalData, phone: e.target.value})} placeholder="+57 300 000 0000" style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)', marginBottom: '0.5rem' }}>País</label>
              <select value={personalData.country} onChange={e => setPersonalData({...personalData, country: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--white)' }}>
                <option>Colombia</option>
                <option>México</option>
                <option>Perú</option>
                <option>Otro</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" disabled={saving} className="btn btn-navy" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem' }}>
              <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      )}

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {showPasswordModal && (
        <div 
          role="dialog" 
          aria-modal="true" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            background: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(3px)',
            display: 'flex', 
            alignItems: 'center', 
            justify: 'center', 
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={handleClosePasswordModal}
        >
          <div 
            style={{ 
              background: 'var(--white)', 
              borderRadius: 'var(--radius-lg)', 
              border: '1px solid var(--border-color)',
              borderTop: '4px solid var(--gold)',
              maxWidth: '500px', 
              width: '100%', 
              padding: '2rem', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Botón Cerrar */}
            <button 
              type="button" 
              onClick={handleClosePasswordModal} 
              style={{ 
                position: 'absolute', 
                top: '1.25rem', 
                right: '1.25rem', 
                background: 'none', 
                border: 'none', 
                color: 'var(--text-muted)', 
                cursor: 'pointer' 
              }}
              aria-label="Cerrar modal"
            >
              <X size={20} />
            </button>

            {/* HEADER DEL MODAL */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                {passwordStep === 'otp' ? 'Verifica tu identidad' : 'Cambiar contraseña'}
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.35rem 0 0 0' }}>
                {passwordStep === 'otp' 
                  ? 'Enviamos un código de seguridad a tu correo registrado.' 
                  : 'Confirma tu contraseña actual antes de establecer una nueva.'}
              </p>
            </div>

            {/* ALERTAS DEL MODAL */}
            {modalError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                ⚠️ {modalError}
              </div>
            )}

            {modalSuccess && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#166534', padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600, marginBottom: '1.25rem' }}>
                ✓ {modalSuccess}
              </div>
            )}

            {/* FORMULARIO DE CAMBIO */}
            <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {passwordStep === 'initial' ? (
                <>
                  {/* Campo: Contraseña actual */}
                  <div>
                    <label htmlFor="currentPasswordInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                      Contraseña actual
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        id="currentPasswordInput"
                        type={showCurrentPw ? 'text' : 'password'} 
                        value={currentPassword}
                        onChange={e => setCurrentPassword(e.target.value)}
                        placeholder="Tu contraseña actual"
                        style={{ width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowCurrentPw(!showCurrentPw)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        aria-label="Ver u ocultar contraseña actual"
                      >
                        {showCurrentPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Campo: Nueva contraseña */}
                  <div>
                    <label htmlFor="newPasswordInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                      Nueva contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        id="newPasswordInput"
                        type={showNewPw ? 'text' : 'password'} 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        style={{ width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPw(!showNewPw)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        aria-label="Ver u ocultar nueva contraseña"
                      >
                        {showNewPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Campo: Confirmar nueva contraseña */}
                  <div>
                    <label htmlFor="confirmPasswordInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                      Confirmar nueva contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        id="confirmPasswordInput"
                        type={showConfirmPw ? 'text' : 'password'} 
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repite la nueva contraseña"
                        style={{ width: '100%', padding: '0.7rem 2.5rem 0.7rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                        required
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowConfirmPw(!showConfirmPw)}
                        style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                        aria-label="Ver u ocultar confirmación de contraseña"
                      >
                        {showConfirmPw ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                /* Paso OTP */
                <div>
                  <label htmlFor="otpCodeInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                    Código de verificación
                  </label>
                  <input 
                    id="otpCodeInput"
                    type="text" 
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value)}
                    placeholder="Ingresa el código de 6 dígitos"
                    maxLength={6}
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '1.1rem', letterSpacing: '0.2em', textAlign: 'center' }}
                    required
                  />
                </div>
              )}

              {/* ACCIONES DEL MODAL */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={handleClosePasswordModal}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.25rem', fontWeight: 600, fontSize: '0.88rem' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={securitySaving}
                  className="btn" 
                  style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '0.65rem 1.35rem', fontWeight: 700, fontSize: '0.88rem', borderRadius: '8px' }}
                >
                  {securitySaving ? 'Procesando...' : (passwordStep === 'otp' ? 'Verificar y actualizar' : 'Actualizar contraseña')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
