import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { safeJsonParse, safeSetItem } from '../utils/storageUtils';
import {
  User, Mail, Phone, Globe, Camera, Shield, Save,
  BookOpen, Lock, CheckCircle2, Award, Briefcase,
  LockKeyhole, MailCheck, Eye, EyeOff, X, GraduationCap
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
    profession: '',
    institution: '',
    bio: '',
    avatar_url: ''
  });

  const [initialPersonalData, setInitialPersonalData] = useState({
    full_name: currentUser?.name || '',
    email: currentUser?.email || '',
    phone: '',
    country: 'Colombia',
    profession: '',
    institution: '',
    bio: '',
    avatar_url: ''
  });

  const [studentStats, setStudentStats] = useState({
    enrolledCount: 0,
    completedQuizzes: 0,
    avgProgress: 0
  });

  const hasUnsavedPersonalChanges = 
    personalData.full_name !== initialPersonalData.full_name ||
    personalData.phone !== initialPersonalData.phone ||
    personalData.country !== initialPersonalData.country ||
    personalData.profession !== initialPersonalData.profession ||
    personalData.institution !== initialPersonalData.institution ||
    personalData.bio !== initialPersonalData.bio;

  // Datos académicos (teacher_profiles)
  const [academicData, setAcademicData] = useState({
    area: '',
    bio: '',
    title_role: 'Profesor Titular',
    experience: ''
  });

  const [initialAcademicData, setInitialAcademicData] = useState({
    area: '',
    bio: '',
    title_role: 'Profesor Titular',
    experience: ''
  });

  const hasUnsavedAcademicChanges = 
    academicData.area !== initialAcademicData.area ||
    academicData.title_role !== initialAcademicData.title_role ||
    academicData.bio !== initialAcademicData.bio ||
    academicData.experience !== initialAcademicData.experience;

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
          
        let phone = uProfile?.phone || '';
        let country = uProfile?.country || 'Colombia';

        // 2. Si es profesor, cargar teacher_profiles y diploma_programs
        if (isTeacher) {
          const userOrClause = currentUser?.auth_user_id 
            ? `user_id.eq.${currentUser.id},user_id.eq.${currentUser.auth_user_id}` 
            : `user_id.eq.${currentUser.id}`;

          const { data: tProfiles } = await supabase
            .from('teacher_profiles')
            .select('*')
            .or(userOrClause);

          const tProfile = tProfiles && tProfiles.length > 0 ? tProfiles[0] : null;

          if (tProfile) {
            let bioText = tProfile.bio || '';
            let expText = tProfile.experience || '';
            let roleText = tProfile.title_role || 'Profesor Titular';

            if (tProfile.phone) phone = tProfile.phone;
            if (tProfile.country) country = tProfile.country;

            if (bioText && typeof bioText === 'string' && bioText.trim().startsWith('{') && bioText.trim().endsWith('}')) {
              try {
                const parsed = JSON.parse(bioText);
                if (parsed && typeof parsed === 'object') {
                  bioText = parsed.bio !== undefined ? parsed.bio : bioText;
                  expText = parsed.experience !== undefined ? parsed.experience : expText;
                  roleText = parsed.title_role !== undefined ? parsed.title_role : roleText;
                  if (parsed.phone !== undefined && parsed.phone !== '') phone = parsed.phone;
                  if (parsed.country !== undefined && parsed.country !== '') country = parsed.country;
                }
              } catch (e) {
                // mantener texto plano
              }
            }

            const loadedData = {
              area: tProfile.area || '',
              bio: bioText,
              title_role: roleText,
              experience: expText
            };
            setAcademicData(loadedData);
            setInitialAcademicData(loadedData);
          }

          // Cargar programas
          const { data: progs } = await supabase
            .from('diploma_programs')
            .select('*')
            .order('title', { ascending: true });
          if (progs) setMyPrograms(progs);
        }

        // Cargar extensión de perfil guardada localmente si existe
        const extendedLocal = safeJsonParse(`user_extended_profile_${currentUser?.id}`, {});

        // Cargar estadísticas si es estudiante
        if (!isTeacher && currentUser?.id) {
          try {
            const { data: enrollments } = await supabase
              .from('enrollments')
              .select('*, diploma_programs(*)')
              .eq('student_id', currentUser.id);

            if (enrollments) {
              const total = enrollments.length;
              const totalProgress = enrollments.reduce((acc, curr) => acc + (curr.progress || 0), 0);
              const avg = total > 0 ? Math.round(totalProgress / total) : 0;
              
              const completedQuizzesCount = enrollments.reduce((acc, curr) => {
                return acc + (curr.progress >= 50 ? 2 : (curr.progress > 0 ? 1 : 0));
              }, 0);

              setStudentStats({
                enrolledCount: total,
                completedQuizzes: completedQuizzesCount,
                avgProgress: avg
              });
            }
          } catch (err) {
            console.warn('Advertencia al cargar estadísticas del estudiante:', err);
          }
        }

        const loadedPersonal = {
          full_name: uProfile?.full_name || currentUser.name || '',
          email: currentUser.email || '',
          phone: uProfile?.phone || phone || extendedLocal.phone || '',
          country: uProfile?.country || country || extendedLocal.country || 'Colombia',
          profession: uProfile?.profession || extendedLocal.profession || '',
          institution: uProfile?.institution || extendedLocal.institution || '',
          bio: uProfile?.bio || extendedLocal.bio || '',
          avatar_url: uProfile?.avatar_url || ''
        };
        setPersonalData(loadedPersonal);
        setInitialPersonalData(loadedPersonal);
      } catch (err) {
        console.error('Error al cargar perfil:', err);
      }
    }
    loadProfileData();
  }, [currentUser?.id, currentUser?.auth_user_id, isTeacher]);

  const handleTabChange = (newTab) => {
    if (activeTab === 'personal' && hasUnsavedPersonalChanges) {
      const confirmLeave = window.confirm('Tienes cambios sin guardar. ¿Deseas salir de esta sección?');
      if (!confirmLeave) return;
    }
    if (activeTab === 'academic' && hasUnsavedAcademicChanges) {
      const confirmLeave = window.confirm('Tienes cambios sin guardar en tu perfil académico. ¿Deseas salir de esta sección?');
      if (!confirmLeave) return;
    }
    setActiveTab(newTab);
  };

  const handleSavePersonal = async (e) => {
    e.preventDefault();
    if (!hasUnsavedPersonalChanges || saving) return;
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      // 1. Intentar actualizar users_profile con todos los campos
      const updatePayload = {
        full_name: personalData.full_name,
        phone: personalData.phone,
        country: personalData.country,
        profession: personalData.profession,
        institution: personalData.institution,
        bio: personalData.bio
      };

      // Guardar respaldado localmente para garantía inmediata
      safeSetItem(`user_extended_profile_${currentUser.id}`, {
        phone: personalData.phone,
        country: personalData.country,
        profession: personalData.profession,
        institution: personalData.institution,
        bio: personalData.bio
      });

      let { error: uErr } = await supabase
        .from('users_profile')
        .update(updatePayload)
        .eq('id', currentUser.id);

      if (uErr) {
        // Fallback si la tabla users_profile no tiene algunas columnas en Postgres
        const { error: fallbackErr } = await supabase
          .from('users_profile')
          .update({
            full_name: personalData.full_name
          })
          .eq('id', currentUser.id);

        if (fallbackErr) throw fallbackErr;
      }

      // 2. Si el usuario es profesor, sincronizar name, phone y country en teacher_profiles
      if (isTeacher) {
        const userOrClause = currentUser?.auth_user_id 
          ? `user_id.eq.${currentUser.id},user_id.eq.${currentUser.auth_user_id}` 
          : `user_id.eq.${currentUser.id}`;

        const { data: tProfiles } = await supabase
          .from('teacher_profiles')
          .select('*')
          .or(userOrClause);

        const tProfile = tProfiles && tProfiles.length > 0 ? tProfiles[0] : null;

        let bioObj = {
          bio: academicData.bio,
          experience: academicData.experience,
          title_role: academicData.title_role,
          phone: personalData.phone,
          country: personalData.country
        };

        if (tProfile && tProfile.bio && tProfile.bio.trim().startsWith('{')) {
          try {
            const parsed = JSON.parse(tProfile.bio);
            if (parsed && typeof parsed === 'object') {
              bioObj = { ...parsed, phone: personalData.phone, country: personalData.country };
            }
          } catch (jsonErr) {
            console.warn('[Profile] Bio no es JSON estructurado válido, conservando texto plano:', jsonErr);
          }
        }

        const bioPayload = JSON.stringify(bioObj);

        if (tProfile) {
          await supabase
            .from('teacher_profiles')
            .update({
              name: personalData.full_name,
              bio: bioPayload
            })
            .eq('id', tProfile.id);
        } else {
          await supabase
            .from('teacher_profiles')
            .insert({
              user_id: currentUser.id,
              name: personalData.full_name,
              bio: bioPayload
            });
        }
      }

      setInitialPersonalData({ ...personalData });
      setMsg({ type: 'success', text: 'Información personal actualizada.' });
    } catch (err) {
      console.error('Error al actualizar perfil personal:', err);
      setMsg({ type: 'error', text: 'No fue posible guardar los cambios. Inténtalo nuevamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAcademic = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });
    try {
      const teacherName = personalData.full_name || currentUser?.name || 'Profesor';

      // Serializar bio, experience y title_role en bio de forma JSON para garantizar almacenamiento
      const bioPayload = JSON.stringify({
        bio: academicData.bio,
        experience: academicData.experience,
        title_role: academicData.title_role
      });

      const userOrClause = currentUser?.auth_user_id 
        ? `user_id.eq.${currentUser.id},user_id.eq.${currentUser.auth_user_id}` 
        : `user_id.eq.${currentUser.id}`;

      const { data: existingProfiles } = await supabase
        .from('teacher_profiles')
        .select('*')
        .or(userOrClause);

      const tProfile = existingProfiles && existingProfiles.length > 0 ? existingProfiles[0] : null;

      const updateData = {
        name: teacherName,
        area: academicData.area,
        bio: bioPayload
      };

      if (tProfile) {
        const { error: updateErr } = await supabase
          .from('teacher_profiles')
          .update(updateData)
          .eq('id', tProfile.id);

        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase
          .from('teacher_profiles')
          .insert({
            user_id: currentUser.id,
            ...updateData
          });

        if (insertErr) throw insertErr;
      }

      setInitialAcademicData({ ...academicData });
      setMsg({ type: 'success', text: 'Perfil académico actualizado.' });
    } catch (err) {
      console.error('Error al guardar perfil académico:', err);
      setMsg({ type: 'error', text: 'No fue posible guardar los cambios. Inténtalo nuevamente.' });
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

      {/* CABECERA RESUMIDA DEL USUARIO (SOLO PARA PROFESORES) */}
      {isTeacher && (
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
      )}

      {/* SI ES PROFESOR, PESTAÑAS DEDICADAS */}
      {isTeacher ? (
        <div>
          {/* BOTONES DE PESTAÑAS DEL PERFIL */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
            <button
              onClick={() => handleTabChange('personal')}
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
              onClick={() => handleTabChange('academic')}
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
              onClick={() => handleTabChange('security')}
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
            <form 
              onSubmit={handleSavePersonal} 
              className="card" 
              style={{ 
                padding: '2rem', 
                background: 'var(--white)', 
                border: '1px solid var(--border-color)', 
                borderTop: '3px solid var(--gold)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '1.5rem',
                boxShadow: '0 4px 14px rgba(20, 33, 61, 0.04)'
              }}
            >
              {/* ENCABEZADO DE LA TARJETA */}
              <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.85rem' }}>
                <h3 style={{ fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                  Perfil personal
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.3rem 0 0 0' }}>
                  Administra tus datos básicos y de contacto.
                </p>
              </div>
              
              {/* CUADRÍCULA EQUILIBRADA DE 2 COLUMNAS (2X2) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                
                {/* FILA 1, COLUMNA 1: NOMBRE COMPLETO */}
                <div>
                  <label htmlFor="fullNameInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                    Nombre completo
                  </label>
                  <input 
                    id="fullNameInput"
                    type="text" 
                    value={personalData.full_name} 
                    onChange={e => setPersonalData({ ...personalData, full_name: e.target.value })} 
                    placeholder="Tu nombre completo"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--white)', fontSize: '0.9rem' }} 
                    required 
                  />
                </div>

                {/* FILA 1, COLUMNA 2: CORREO ELECTRÓNICO (READONLY) */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
                    <label htmlFor="emailInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                      Correo electrónico
                    </label>
                    <Lock size={13} color="var(--text-muted)" title="Campo de solo lectura" />
                  </div>
                  <div style={{ position: 'relative' }}>
                    <input 
                      id="emailInput"
                      type="email" 
                      value={personalData.email} 
                      readOnly
                      style={{ 
                        width: '100%', 
                        padding: '0.75rem 0.75rem 0.75rem 2.4rem', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0', 
                        background: '#f8fafc', 
                        color: '#64748b', 
                        cursor: 'not-allowed',
                        fontSize: '0.9rem',
                        userSelect: 'all'
                      }} 
                    />
                    <Lock size={16} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                  </div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
                    El correo está asociado a tu cuenta y no puede modificarse desde esta sección.
                  </span>
                </div>

                {/* FILA 2, COLUMNA 1: TELÉFONO (OPCIONAL) */}
                <div>
                  <label htmlFor="phoneInput" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                    Teléfono (opcional)
                  </label>
                  <input 
                    id="phoneInput"
                    type="tel" 
                    value={personalData.phone} 
                    onChange={e => setPersonalData({ ...personalData, phone: e.target.value })} 
                    placeholder="+57 300 000 0000" 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--white)', fontSize: '0.9rem' }} 
                  />
                </div>

                {/* FILA 2, COLUMNA 2: PAÍS */}
                <div>
                  <label htmlFor="countrySelect" style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                    País
                  </label>
                  <select 
                    id="countrySelect"
                    value={personalData.country} 
                    onChange={e => setPersonalData({ ...personalData, country: e.target.value })} 
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--white)', fontSize: '0.9rem' }}
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

              {/* FOOTER INTERNO DEL FORMULARIO CON ACCIÓN DE GUARDADO INTEGRADOR */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem', marginTop: '0.5rem' }}>
                <button 
                  type="submit" 
                  disabled={saving || !hasUnsavedPersonalChanges} 
                  className="btn" 
                  style={{ 
                    background: (saving || !hasUnsavedPersonalChanges) ? '#cbd5e1' : 'var(--navy)', 
                    color: 'white', 
                    border: 'none', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    padding: '0.75rem 1.5rem', 
                    fontWeight: 700,
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    cursor: (saving || !hasUnsavedPersonalChanges) ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: (saving || !hasUnsavedPersonalChanges) ? 'none' : '0 2px 6px rgba(20, 33, 61, 0.15)'
                  }}
                >
                  <Save size={18} /> 
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
              </div>
            </form>
          )}

          {/* CONTENIDO DE PESTAÑA: PERFIL ACADÉMICO PÚBLICO */}
          {activeTab === 'academic' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* ALINEACIÓN EN DOS COLUMNAS (EDICIÓN 60% + VISTA PREVIA 40%) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
                
                {/* COLUMNA IZQUIERDA: FORMULARIO DE EDICIÓN (~60%) */}
                <form 
                  onSubmit={handleSaveAcademic} 
                  className="card" 
                  style={{ padding: '2rem', background: 'var(--white)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}
                >
                  <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                      Editar Perfil Académico
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                      Completa tu información profesional para presentar tu trayectoria a los estudiantes.
                    </p>
                  </div>

                  {/* PRIMERA FILA: ESPECIALIDAD Y CARGO */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label htmlFor="areaInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                          Especialidad o área
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {academicData.area.length}/100
                        </span>
                      </div>
                      <input 
                        id="areaInput"
                        type="text" 
                        maxLength={100}
                        value={academicData.area} 
                        onChange={e => setAcademicData({ ...academicData, area: e.target.value })} 
                        placeholder="Ej. Inteligencia Artificial, Redes de Datos" 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }} 
                      />
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Área principal de conocimiento o experiencia profesional.
                      </span>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <label htmlFor="roleInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                          Cargo
                        </label>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {academicData.title_role.length}/80
                        </span>
                      </div>
                      <input 
                        id="roleInput"
                        type="text" 
                        maxLength={80}
                        value={academicData.title_role} 
                        onChange={e => setAcademicData({ ...academicData, title_role: e.target.value })} 
                        placeholder="Ej. Profesor Titular, Docente Investigador" 
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }} 
                      />
                      <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                        Cargo académico o profesional que será visible para los estudiantes.
                      </span>
                    </div>
                  </div>

                  {/* SEGUNDA SECCIÓN: BIOGRAFÍA CORTA */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label htmlFor="bioInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                        Biografía corta
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {academicData.bio.length}/400
                      </span>
                    </div>
                    <textarea 
                      id="bioInput"
                      rows={3} 
                      maxLength={400}
                      value={academicData.bio} 
                      onChange={e => setAcademicData({ ...academicData, bio: e.target.value })} 
                      placeholder="Resumen profesional de tu trayectoria académica para la comunidad..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }} 
                    />
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Presentación breve sobre tu experiencia y enfoque docente.
                    </span>
                  </div>

                  {/* TERCERA SECCIÓN: FORMACIÓN O EXPERIENCIA */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                      <label htmlFor="expInput" style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)' }}>
                        Formación o experiencia
                      </label>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {academicData.experience.length}/800
                      </span>
                    </div>
                    <textarea 
                      id="expInput"
                      rows={4} 
                      maxLength={800}
                      value={academicData.experience} 
                      onChange={e => setAcademicData({ ...academicData, experience: e.target.value })} 
                      placeholder="Detalles sobre títulos universitarios, reconocimientos y experiencia docente..." 
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }} 
                    />
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>
                      Estudios, experiencia profesional o trayectoria relacionada con los programas.
                    </span>
                  </div>

                  {/* BOTÓN DE GUARDADO INTEGRADOR AL FINAL DEL FORMULARIO */}
                  <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '0.5rem' }}>
                    <button 
                      type="submit" 
                      disabled={saving || !hasUnsavedAcademicChanges} 
                      className="btn" 
                      style={{ 
                        background: (saving || !hasUnsavedAcademicChanges) ? '#cbd5e1' : 'var(--navy)', 
                        color: 'white', 
                        border: 'none', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        padding: '0.75rem 1.5rem', 
                        fontWeight: 700,
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        cursor: (saving || !hasUnsavedAcademicChanges) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <Save size={18} /> 
                      {saving ? 'Guardando...' : 'Guardar perfil académico'}
                    </button>
                  </div>
                </form>

                {/* COLUMNA DERECHA: VISTA PREVIA PÚBLICA (~40%) */}
                <div 
                  role="region" 
                  aria-label="Vista previa pública del perfil" 
                  className="card" 
                  style={{ 
                    padding: '1.75rem', 
                    background: '#f8fafc', 
                    border: '1px solid #e2e8f0', 
                    borderTop: '3px solid var(--navy)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '1.25rem',
                    position: 'sticky',
                    top: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                    <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                      Así verán tu perfil los estudiantes
                    </h3>
                    <span style={{ background: 'rgba(20, 33, 61, 0.08)', color: 'var(--navy)', padding: '0.2rem 0.6rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Vista previa
                    </span>
                  </div>

                  {/* CABECERA VISTA PREVIA */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 800, fontSize: '1.5rem', flexShrink: 0, border: '2px solid var(--gold)' }}>
                      {personalData.full_name ? personalData.full_name.charAt(0).toUpperCase() : 'P'}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {personalData.full_name || 'Profesor'}
                      </h4>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.15rem' }}>
                        {academicData.title_role.trim() || <em style={{ opacity: 0.6, fontStyle: 'italic' }}>Cargo académico no especificado</em>}
                      </div>
                    </div>
                  </div>

                  {/* ESPECIALIDAD BADGE */}
                  <div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Especialidad
                    </div>
                    {academicData.area.trim() ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: '#e0f2fe', color: '#0369a1', padding: '0.3rem 0.75rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 700 }}>
                        <Award size={14} />
                        {academicData.area}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.7 }}>
                        Especialidad no especificada
                      </span>
                    )}
                  </div>

                  {/* BIOGRAFÍA VISTA PREVIA */}
                  <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Biografía
                    </div>
                    <p style={{ fontSize: '0.85rem', color: academicData.bio.trim() ? 'var(--navy)' : 'var(--text-muted)', margin: 0, lineHeight: 1.5, fontStyle: academicData.bio.trim() ? 'normal' : 'italic' }}>
                      {academicData.bio.trim() || 'Añade una breve presentación para que los estudiantes conozcan tu perfil.'}
                    </p>
                  </div>

                  {/* FORMACIÓN VISTA PREVIA */}
                  <div style={{ borderTop: '1px solid #edf2f7', paddingTop: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                      Formación y Trayectoria
                    </div>
                    <p style={{ fontSize: '0.85rem', color: academicData.experience.trim() ? 'var(--navy)' : 'var(--text-muted)', margin: 0, lineHeight: 1.5, fontStyle: academicData.experience.trim() ? 'normal' : 'italic', whiteSpace: 'pre-line' }}>
                      {academicData.experience.trim() || 'Detalles sobre formación y trayectoria académica.'}
                    </p>
                  </div>
                </div>

              </div>

              {/* SECCIÓN INFERIOR: PROGRAMAS ASIGNADOS (READ-ONLY) */}
              <div className="card" style={{ padding: '2rem', background: 'var(--white)', border: '1px solid var(--border-color)', borderTop: '3px solid var(--gold)' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--navy)', fontWeight: 800, margin: 0 }}>
                    Programas asignados
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0.25rem 0 0 0' }}>
                    Estos programas son asignados por la administración de LIATER.
                  </p>
                </div>

                {myPrograms.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', background: 'var(--bg-light)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <BookOpen size={36} style={{ color: 'var(--navy)', opacity: 0.3, marginBottom: '0.75rem' }} />
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                      No tienes programas asignados
                    </h4>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
                      Cuando la administración te asigne un programa, aparecerá aquí.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
                    {myPrograms.map(prog => (
                      <div 
                        key={prog.id} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.85rem', 
                          padding: '1rem 1.15rem', 
                          background: 'var(--white)', 
                          borderRadius: '10px', 
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 1px 2px rgba(20, 33, 61, 0.04)'
                        }}
                      >
                        <div style={{ padding: '0.6rem', borderRadius: '8px', background: 'rgba(20, 33, 61, 0.05)', color: 'var(--navy)', flexShrink: 0 }}>
                          {prog.program_type === 'curso' ? <BookOpen size={20} /> : <GraduationCap size={20} />}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prog.title}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                            {prog.program_type === 'curso' ? 'Curso Corto' : (prog.program_type === 'taller' ? 'Taller' : 'Diplomado')}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
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
        /* VISTA INTEGRADA Y SIN REDUNDANCIAS PARA ESTUDIANTES */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* 1. HERO BANNER DE IDENTIDAD Y ROL */}
          <div className="card static-card" style={{ padding: '1.5rem 1.75rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', borderTop: '4px solid var(--navy)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--navy) 0%, #1e2e52 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold)', fontWeight: 800, fontSize: '1.8rem', boxShadow: '0 6px 18px rgba(20, 33, 61, 0.15)', border: '2.5px solid #ffffff', flexShrink: 0 }}>
                {personalData.full_name ? personalData.full_name.charAt(0).toUpperCase() : (role === 'admin' ? 'A' : 'E')}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                    {personalData.full_name || (role === 'admin' ? 'Administrador' : 'Estudiante')}
                  </h2>
                  <span className="badge badge-navy" style={{ padding: '0.2rem 0.65rem', fontSize: '0.7rem', fontWeight: 700 }}>
                    {role === 'admin' ? 'ADMINISTRADOR LIATER' : 'ESTUDIANTE LIATER'}
                  </span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Mail size={14} color="var(--navy)" /> {personalData.email}
                  </span>
                  {personalData.profession && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--navy)', fontWeight: 700, background: 'rgba(252, 163, 17, 0.14)', padding: '0.15rem 0.6rem', borderRadius: '999px', fontSize: '0.78rem' }}>
                      <Briefcase size={13} color="var(--gold-dark)" /> {personalData.profession}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 2. FORMULARIO UNIFICADO DE EDICIÓN DIVIDIDO EN SECCIONES LIMPIAS */}
          <form onSubmit={handleSavePersonal} className="card static-card" style={{ padding: '2rem' }}>
            
            {/* SECCIÓN A: INFORMACIÓN DE CONTACTO */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
                <User size={18} color="var(--navy)" />
                Información de Contacto
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>Nombre Completo</label>
                  <input type="text" value={personalData.full_name} onChange={e => setPersonalData({...personalData, full_name: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>Teléfono de Contacto</label>
                  <input type="tel" value={personalData.phone} onChange={e => setPersonalData({...personalData, phone: e.target.value})} placeholder="+57 300 000 0000" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>País de Residencia</label>
                  <select value={personalData.country} onChange={e => setPersonalData({...personalData, country: e.target.value})} style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.9rem' }}>
                    <option>Colombia</option>
                    <option>México</option>
                    <option>Perú</option>
                    <option>Chile</option>
                    <option>Argentina</option>
                    <option>Otro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* SECCIÓN B: PERFIL PROFESIONAL */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--navy)', fontWeight: 800, margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.6rem' }}>
                <Briefcase size={18} color="var(--gold-dark)" />
                Perfil Profesional
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>Profesión / Ocupación</label>
                  <input type="text" value={personalData.profession} onChange={e => setPersonalData({...personalData, profession: e.target.value})} placeholder="Ej. Ingeniera Mecatrónica / Estudiante" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.9rem' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>Institución / Empresa</label>
                  <input type="text" value={personalData.institution} onChange={e => setPersonalData({...personalData, institution: e.target.value})} placeholder="Ej. Universidad Nacional de Colombia" style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.9rem' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>Resumen / Biografía Breve</label>
                <textarea rows={3} value={personalData.bio} onChange={e => setPersonalData({...personalData, bio: e.target.value})} placeholder="Describe brevemente tu área de interés o enfoque profesional..." style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: '#ffffff', fontSize: '0.88rem', fontFamily: 'inherit' }} />
              </div>
            </div>

            {/* BOTÓN DE GUARDAR CAMBIOS CON ANIMACIÓN DE RESORTE */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="submit" 
                disabled={saving || !hasUnsavedPersonalChanges} 
                className="btn btn-navy" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  padding: '0.75rem 1.75rem', 
                  fontWeight: 700, 
                  fontSize: '0.9rem',
                  borderRadius: '8px',
                  cursor: (saving || !hasUnsavedPersonalChanges) ? 'not-allowed' : 'pointer',
                  opacity: (!hasUnsavedPersonalChanges && !saving) ? 0.55 : 1,
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  boxShadow: (hasUnsavedPersonalChanges && !saving) ? '0 4px 12px rgba(20, 33, 61, 0.25)' : 'none'
                }}
                onMouseOver={e => {
                  if (hasUnsavedPersonalChanges && !saving) {
                    e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                    e.currentTarget.style.boxShadow = '0 6px 18px rgba(20, 33, 61, 0.35)';
                  }
                }}
                onMouseOut={e => {
                  if (hasUnsavedPersonalChanges && !saving) {
                    e.currentTarget.style.transform = 'translateY(0) scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(20, 33, 61, 0.25)';
                  }
                }}
                onMouseDown={e => {
                  if (hasUnsavedPersonalChanges && !saving) {
                    e.currentTarget.style.transform = 'translateY(0) scale(0.96)';
                  }
                }}
              >
                <Save size={18} /> {saving ? 'Guardando...' : 'Guardar Cambios del Perfil'}
              </button>
            </div>
          </form>

          {/* 3. SEGURIDAD Y CREDENCIALES (INTEGRADO COMPACTO CON BOTÓN ANIMADO) */}
          <div className="card static-card" style={{ padding: '1.5rem', background: '#ffffff' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div style={{ padding: '0.6rem', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.05)', color: 'var(--navy)' }}>
                  <LockKeyhole size={22} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>Seguridad y Contraseña</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0.15rem 0 0 0' }}>Gestiona la clave de acceso a tu portal académico.</p>
                </div>
              </div>

              <button 
                type="button" 
                onClick={handleOpenPasswordModal} 
                className="btn" 
                style={{ 
                  background: 'transparent',
                  border: '1.5px solid var(--navy)', 
                  color: 'var(--navy)', 
                  padding: '0.55rem 1.25rem', 
                  fontWeight: 700, 
                  fontSize: '0.85rem', 
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'
                }}
                onMouseOver={e => {
                  e.currentTarget.style.background = 'var(--navy)';
                  e.currentTarget.style.color = '#ffffff';
                  e.currentTarget.style.transform = 'translateY(-2px) scale(1.03)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(20, 33, 61, 0.25)';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--navy)';
                  e.currentTarget.style.transform = 'translateY(0) scale(1)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                onMouseDown={e => {
                  e.currentTarget.style.transform = 'translateY(0) scale(0.96)';
                }}
              >
                Cambiar contraseña
              </button>
            </div>
          </div>

        </div>
      )}

      {/* MODAL DE CAMBIO DE CONTRASEÑA */}
      {showPasswordModal && createPortal(
        <div 
          role="dialog" 
          aria-modal="true" 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            bottom: 0, 
            width: '100%',
            height: '100%',
            minHeight: '100vh',
            background: 'rgba(15, 23, 42, 0.65)', 
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            zIndex: 99999,
            padding: '1rem',
            boxSizing: 'border-box',
            overflowY: 'auto'
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
              margin: 'auto',
              padding: '2rem', 
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              position: 'relative',
              boxSizing: 'border-box'
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
        </div>,
        document.body
      )}

    </div>
  );
}
