import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  Users, Home, ListTree, BookOpen, Paperclip, BarChart2,
  ArrowLeft, ChevronRight, Plus, ExternalLink, Download,
  FileText, Trash2, Code, HardDrive, Archive, AlertCircle,
  X, CheckCircle, Info, Sparkles, UserCheck, Shield, Eye, Lock
} from 'lucide-react';
import {
  getStudentWorkGroup,
  getProgramWorkGroups,
  addGroupMaterial,
  deleteGroupMaterial
} from '@/services/groupService';
import MaterialFrameViewerModal from '@/components/common/MaterialFrameViewerModal';

export default function CourseGroups() {
  const { programId } = useParams();
  const cleanProgramId = decodeURIComponent(programId || '').trim();
  const { currentUser } = useAuth();
  const role = currentUser?.role;

  const [loading, setLoading] = useState(true);
  const [programData, setProgramData] = useState(null);
  const [myGroup, setMyGroup] = useState(null);
  const [allGroups, setAllGroups] = useState([]);
  const [tableExists, setTableExists] = useState(true);
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // Modal para subir material / entregable
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matType, setMatType] = useState('link'); // 'link' | 'file'
  const [matUrl, setMatUrl] = useState('');
  const [matFile, setMatFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // 1. Cargar información del programa y grupo del estudiante
  const loadData = async () => {
    if (!cleanProgramId) return;
    setLoading(true);
    try {
      // Información del programa
      const { data: prog } = await supabase
        .from('diploma_programs')
        .select('*')
        .eq('id', cleanProgramId)
        .maybeSingle();

      setProgramData(prog);

      // Contexto global del sidebar
      localStorage.setItem('activeProgramId', cleanProgramId);
      if (prog?.program_type) {
        localStorage.setItem('activeProgramType', prog.program_type);
      }
      window.dispatchEvent(new Event('programContextChanged'));

      // Traer todos los grupos del programa
      const allRes = await getProgramWorkGroups(cleanProgramId);
      if (!allRes.tableExists) {
        setTableExists(false);
      } else {
        setTableExists(true);
        setAllGroups(allRes.data || []);
      }

      // Buscar si el usuario actual pertenece a algún grupo
      if (currentUser?.id) {
        const studentRes = await getStudentWorkGroup(cleanProgramId, currentUser.id);
        setMyGroup(studentRes.data);
      }
    } catch (err) {
      console.error('Error cargando grupos del curso:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [cleanProgramId, currentUser?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isCourse = programData?.program_type === 'curso';
  const programTitle = programData?.title || 'Programa Académico';

  // ── ACCIÓN: SUBIR MATERIAL AL GRUPO ──
  const handleOpenUpload = () => {
    setMatTitle('');
    setMatDesc('');
    setMatType('link');
    setMatUrl('');
    setMatFile(null);
    setUploadError('');
    setShowUploadModal(true);
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!myGroup) return;
    if (!matTitle.trim()) {
      setUploadError('Por favor ingresa un título para el entregable.');
      return;
    }
    if (matType === 'link' && !matUrl.trim()) {
      setUploadError('Por favor ingresa la URL del entregable o archivo.');
      return;
    }
    if (matType === 'file' && !matFile) {
      setUploadError('Por favor selecciona un archivo de tu equipo.');
      return;
    }

    setSubmitting(true);
    setUploadError('');
    try {
      await addGroupMaterial({
        groupId: myGroup.id,
        programId: cleanProgramId || myGroup.program_id,
        uploadedBy: currentUser?.id,
        title: matTitle,
        description: matDesc,
        materialType: matType,
        url: matUrl,
        file: matFile
      });
      setShowUploadModal(false);
      await loadData();
    } catch (err) {
      setUploadError(err.message || 'Error al guardar el entregable.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCIÓN: ELIMINAR MATERIAL PROPIO ──
  const handleDeleteMaterial = async (mat) => {
    if (!window.confirm(`¿Deseas eliminar el material "${mat.title}"?`)) return;
    try {
      await deleteGroupMaterial(mat.id);
      await loadData();
    } catch (err) {
      alert('Error eliminando material: ' + err.message);
    }
  };

  const getInitials = (name) => {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'AL';
  };

  const getMaterialIcon = (mat) => {
    const p = mat.provider || '';
    const t = mat.material_type || '';
    if (p === 'github' || t === 'code') return <Code size={18} color="#24292e" />;
    if (p === 'drive' || t === 'drive') return <HardDrive size={18} color="#0F9D58" />;
    if (t === 'pdf') return <FileText size={18} color="#DC2626" />;
    if (t === 'archive') return <Archive size={18} color="#F59E0B" />;
    return <Paperclip size={18} color="var(--gold-dark)" />;
  };

  // ── SKELETON ──
  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '1.5rem 0', animation: 'fadeSlideUp 0.35s ease-out' }}>
        <div className="skeleton" style={{ width: '180px', height: '24px', marginBottom: '1rem', borderRadius: '6px' }} />
        <div className="skeleton" style={{ width: '60%', height: '36px', marginBottom: '1.5rem', borderRadius: '8px' }} />
        <div className="skeleton" style={{ width: '100%', height: '140px', marginBottom: '1.5rem', borderRadius: '12px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
          <div className="skeleton" style={{ height: '220px', borderRadius: '12px' }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* ── BREADCRUMB ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Link
            to={role === 'admin' ? `/dashboard/admin/${cleanProgramId}?tab=grupos` : (role === 'teacher' ? `/dashboard/profesor/${cleanProgramId}?tab=grupos` : `/dashboard/${cleanProgramId}`)}
            className="btn btn-outline"
            style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
          >
            <ArrowLeft size={14} /> {role === 'admin' ? 'Panel Administrador' : (role === 'teacher' ? 'Panel Docente' : 'Volver al Inicio')}
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
            <ChevronRight size={14} />
            <Link to="/portal" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
              Mis Programas
            </Link>
            <ChevronRight size={14} />
            <Link
              to={role === 'admin' ? `/dashboard/admin/${cleanProgramId}?tab=grupos` : (role === 'teacher' ? `/dashboard/profesor/${cleanProgramId}?tab=grupos` : `/dashboard/${cleanProgramId}`)}
              style={{ color: 'var(--text-muted)', textDecoration: 'none', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            >
              {programTitle}
            </Link>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>Grupos de Trabajo</span>
          </div>
        </div>

        {/* Acceso Rápido para Admin / Docente */}
        {(role === 'admin' || role === 'teacher') && (
          <Link
            to={role === 'admin' ? `/dashboard/admin/${cleanProgramId}?tab=grupos` : `/dashboard/profesor/${cleanProgramId}?tab=grupos`}
            className="btn btn-outline"
            style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Shield size={14} />
            <span>Gestionar Grupos del Curso</span>
          </Link>
        )}
      </div>

      {/* ── ENCABEZADO PRINCIPAL ── */}
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.85rem', lineHeight: 1.25, margin: 0 }}>
          Grupos de Trabajo y Proyectos
        </h1>
        <p className="page-description" style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Espacio colaborativo de tu equipo para coordinar avances, compartir enlaces y entregar materiales del proyecto.
        </p>
      </div>

      {/* ── BARRA DE PESTAÑAS DEL CURSO (NAVEGACIÓN INTEGRADA) ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '1.75rem',
        overflowX: 'auto',
        paddingBottom: '4px',
        borderBottom: '1px solid var(--border-color)',
        scrollbarWidth: 'none'
      }}>
        <Link
          to={role === 'admin' ? `/dashboard/admin/${cleanProgramId}?tab=grupos` : (role === 'teacher' ? `/dashboard/profesor/${cleanProgramId}?tab=grupos` : `/dashboard/${cleanProgramId}`)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <Home size={15} /> {role === 'admin' ? 'Panel Admin' : (role === 'teacher' ? 'Panel Docente' : 'Resumen')}
        </Link>
        <Link
          to={isCourse ? `/syllabus/${cleanProgramId}` : `/modules/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          {isCourse ? <ListTree size={15} /> : <BookOpen size={15} />}
          {isCourse ? 'Sesiones' : 'Módulos'}
        </Link>
        <Link
          to={`/resources/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <Paperclip size={15} color="var(--gold-dark, #b45309)" /> Recursos y Materiales
        </Link>

        {/* PESTAÑA ACTIVA: GRUPOS DE TRABAJO */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1.1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 700,
            background: 'var(--navy, #14213D)',
            color: '#FFFFFF',
            borderBottom: '3px solid var(--gold, #FCA311)',
            whiteSpace: 'nowrap'
          }}
        >
          <Users size={15} color="var(--gold, #FCA311)" /> Grupos de Trabajo {myGroup ? `(${myGroup.name})` : ''}
        </div>

        <Link
          to={`/resultados/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <BarChart2 size={15} /> Mis Resultados
        </Link>
        <Link
          to={`/teachers/${cleanProgramId}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.55rem 1rem',
            borderRadius: '8px 8px 0 0',
            fontSize: '0.84rem',
            fontWeight: 600,
            textDecoration: 'none',
            background: '#F1F5F9',
            color: 'var(--navy)',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap'
          }}
          onMouseOver={e => e.currentTarget.style.background = '#E2E8F0'}
          onMouseOut={e => e.currentTarget.style.background = '#F1F5F9'}
        >
          <Users size={15} /> Profesores
        </Link>
      </div>

      {/* ── CONTENIDO PRINCIPAL: EL ESTUDIANTE TIENE GRUPO ASIGNADO ── */}
      {myGroup ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>

          {/* Banner Hero del Grupo */}
          <div style={{
            background: 'linear-gradient(135deg, var(--navy) 0%, #1a2a4c 100%)',
            borderRadius: '16px',
            padding: '1.75rem 2rem',
            color: '#FFFFFF',
            border: '1px solid rgba(252, 163, 17, 0.25)',
            boxShadow: '0 8px 24px rgba(20, 33, 61, 0.12)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(252, 163, 17, 0.15)', border: '1px solid rgba(252, 163, 17, 0.4)', borderRadius: '20px', padding: '0.2rem 0.75rem', fontSize: '0.74rem', color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.65rem' }}>
                  <Users size={12} /> Tu Equipo de Trabajo
                </div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 0.35rem 0', color: '#FFFFFF' }}>
                  {myGroup.name}
                </h2>
                {myGroup.project_topic && (
                  <p style={{ margin: '0 0 0.65rem 0', fontSize: '1.05rem', color: 'var(--gold)', fontWeight: 700 }}>
                    Tema: {myGroup.project_topic}
                  </p>
                )}
                {myGroup.description && (
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: 1.5, maxWidth: '750px' }}>
                    {myGroup.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleOpenUpload}
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontWeight: 800,
                  boxShadow: '0 4px 12px rgba(252, 163, 17, 0.3)',
                  flexShrink: 0
                }}
              >
                <Plus size={16} />
                <span>Subir Entrega o Material</span>
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>

            {/* Tarjeta de Compañeros de Equipo */}
            <div className="card" style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserCheck size={18} color="var(--gold-dark)" />
                  Integrantes del Equipo ({myGroup.work_group_members?.length || 0})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {(myGroup.work_group_members || []).map(m => {
                  const prof = m.users_profile || {};
                  const isMe = prof.id === currentUser?.id;

                  return (
                    <div
                      key={m.id || m.student_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '10px',
                        background: isMe ? 'var(--gold-subtle)' : '#F8FAFC',
                        border: isMe ? '1px solid var(--gold)' : '1px solid #E2E8F0',
                        gap: '0.75rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                        <span style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: isMe ? 'var(--gold-dark)' : 'var(--navy)',
                          color: '#FFFFFF',
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}>
                          {getInitials(prof.full_name)}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {prof.full_name || 'Estudiante'} {isMe && <span style={{ fontSize: '0.72rem', color: 'var(--gold-dark)', fontWeight: 800 }}>(Tú)</span>}
                          </div>
                          {prof.email && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {prof.email}
                            </div>
                          )}
                        </div>
                      </div>

                      {prof.phone && (
                        <a
                          href={`https://wa.me/${prof.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Contactar por WhatsApp"
                          style={{
                            background: '#DCFCE7',
                            color: '#15803D',
                            padding: '0.3rem 0.55rem',
                            borderRadius: '6px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            textDecoration: 'none',
                            flexShrink: 0
                          }}
                        >
                          WhatsApp
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tarjeta de Entregables y Materiales Subidos */}
            <div className="card" style={{ background: '#FFFFFF', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Paperclip size={18} color="var(--gold-dark)" />
                  Entregables y Archivos ({myGroup.work_group_materials?.length || 0})
                </h3>
                <button
                  type="button"
                  onClick={handleOpenUpload}
                  style={{
                    background: '#F1F5F9',
                    border: '1px solid #CBD5E1',
                    borderRadius: '6px',
                    padding: '0.3rem 0.65rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: 'var(--navy)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Plus size={13} />
                  <span>Subir</span>
                </button>
              </div>

              {(myGroup.work_group_materials || []).length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2.5rem 1rem',
                  background: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #CBD5E1',
                  color: 'var(--text-muted)'
                }}>
                  <Paperclip size={28} color="var(--gold-dark)" style={{ opacity: 0.7, marginBottom: '0.5rem' }} />
                  <p style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem' }}>
                    Tu equipo aún no ha subido ningún archivo o enlace de entrega.
                  </p>
                  <button
                    type="button"
                    onClick={handleOpenUpload}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
                  >
                    <Plus size={14} /> Subir la Primera Entrega
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {(myGroup.work_group_materials || []).map(mat => {
                    const isUploader = mat.uploaded_by === currentUser?.id || role === 'admin';
                    const uploaderName = mat.users_profile?.full_name || 'Compañero';

                    return (
                      <div
                        key={mat.id}
                        style={{
                          padding: '0.75rem 0.9rem',
                          borderRadius: '10px',
                          background: '#F8FAFC',
                          border: '1px solid #E2E8F0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                          <div style={{ flexShrink: 0 }}>
                            {getMaterialIcon(mat)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {mat.title}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              Subido por: <strong>{uploaderName}</strong>
                            </div>
                            {mat.description && (
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.15rem' }}>
                                {mat.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          <button
                            type="button"
                            onClick={() => setViewingMaterial({ ...mat, groupName: myGroup?.name })}
                            title="Visualizar documento en visor seguro (solo lectura)"
                            style={{
                              background: '#FFFFFF',
                              border: '1px solid #CBD5E1',
                              color: 'var(--navy)',
                              borderRadius: '6px',
                              padding: '0.35rem 0.65rem',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.3rem'
                            }}
                          >
                            <Eye size={13} color="var(--gold-dark, #b45309)" />
                            <span>Visualizar</span>
                          </button>

                          {isUploader && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMaterial(mat)}
                              title="Eliminar este entregable"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '0.3rem',
                                display: 'inline-flex',
                                borderRadius: '4px'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
                              onMouseOut={e => e.currentTarget.style.color = '#94A3B8'}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

        </div>
      ) : (
        /* ── EL ESTUDIANTE AÚN NO TIENE GRUPO ASIGNADO ── */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{
            textAlign: 'center',
            padding: '3.5rem 2rem',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px dashed var(--border-color)',
            boxShadow: '0 2px 10px rgba(0,0,0,0.02)'
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'var(--gold-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto'
            }}>
              <Users size={28} color="var(--gold-dark)" />
            </div>

            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy)', margin: '0 0 0.5rem 0' }}>
              Aún no has sido asignado a un grupo de trabajo
            </h2>
            <p style={{ fontSize: '0.92rem', color: 'var(--text-muted)', maxWidth: '580px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
              La administración o coordinación del programa organiza los equipos de acuerdo a las actividades y proyectos acordados en clase. Tan pronto como tu grupo sea configurado, aquí verás a tus compañeros y podrán compartir entregables.
            </p>

            <Link to={`/dashboard/${cleanProgramId}`} className="btn btn-outline" style={{ fontSize: '0.85rem', padding: '0.5rem 1.25rem' }}>
              Volver al Panorama del Curso
            </Link>
          </div>

          {/* Listado informativo de grupos existentes en el curso */}
          {allGroups.length > 0 && (
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.85rem' }}>
                Equipos conformados en este curso ({allGroups.length})
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                {allGroups.map(g => (
                  <div key={g.id} className="card" style={{ padding: '1.15rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                      <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: 'var(--navy)' }}>{g.name}</h4>
                      <span style={{ fontSize: '0.72rem', background: '#F1F5F9', color: '#64748B', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                        {g.work_group_members?.length || 0} integrantes
                      </span>
                    </div>
                    {g.project_topic && (
                      <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.82rem', color: 'var(--gold-dark)', fontWeight: 600 }}>
                        {g.project_topic}
                      </p>
                    )}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(g.work_group_members || []).map(m => (
                        <span key={m.id || m.student_id} style={{ fontSize: '0.74rem', background: '#F8FAFC', border: '1px solid #E2E8F0', padding: '2px 6px', borderRadius: '4px', color: 'var(--navy)' }}>
                          {m.users_profile?.full_name || 'Estudiante'}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL: SUBIR MATERIAL / ENTREGABLE POR ESTUDIANTE
      ──────────────────────────────────────────────────────── */}
      {showUploadModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Subir Entrega o Material de Proyecto
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Quedará disponible para todos los miembros del {myGroup?.name}.
                </p>
              </div>
              <button type="button" onClick={() => setShowUploadModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {uploadError && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FECACA', color: '#DC2626', padding: '0.65rem 0.85rem', borderRadius: '8px', fontSize: '0.82rem', marginBottom: '1rem' }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUploadSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selector de Tipo */}
              <div style={{ display: 'flex', gap: '0.5rem', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setMatType('link')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: matType === 'link' ? '#FFFFFF' : 'transparent',
                    color: matType === 'link' ? 'var(--navy)' : 'var(--text-muted)',
                    boxShadow: matType === 'link' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  🔗 Enlace Web (Drive, GitHub, Figma...)
                </button>
                <button
                  type="button"
                  onClick={() => setMatType('file')}
                  style={{
                    flex: 1,
                    padding: '0.45rem',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: matType === 'file' ? '#FFFFFF' : 'transparent',
                    color: matType === 'file' ? 'var(--navy)' : 'var(--text-muted)',
                    boxShadow: matType === 'file' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                  }}
                >
                  📄 Subir a Google Drive del Curso
                </button>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Título del Entregable *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Informe Fase 1, Repositorio de Código, Presentación Final..."
                  value={matTitle}
                  onChange={(e) => setMatTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              {matType === 'link' ? (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                    Enlace URL *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://drive.google.com/... o https://github.com/..."
                    value={matUrl}
                    onChange={(e) => setMatUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                    Seleccionar Archivo *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => setMatFile(e.target.files?.[0] || null)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '0.85rem' }}
                  />
                  <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#0F9D58', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <HardDrive size={13} color="#0F9D58" />
                    <span>Se guardará automáticamente en la carpeta general de Google Drive del curso.</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Descripción o Notas (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Comentarios sobre qué contiene esta entrega o indicaciones para tus compañeros..."
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowUploadModal(false)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitting ? 'Subiendo a Google Drive...' : 'Subir al Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VISOR SEGURO DE DOCUMENTOS EN FRAME (SOLO LECTURA, SIN DESCARGA) ── */}
      {viewingMaterial && (
        <MaterialFrameViewerModal
          material={viewingMaterial}
          groupName={viewingMaterial.groupName || ''}
          onClose={() => setViewingMaterial(null)}
        />
      )}

    </div>
  );
}
