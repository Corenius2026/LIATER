import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  Users, Paperclip,
  ArrowLeft, ChevronRight, Plus, ExternalLink, Download,
  FileText, Trash2, Code, HardDrive, Archive, AlertCircle,
  X, CheckCircle, Info, Sparkles, UserCheck, Shield, Eye, Lock,
  Unlock, Layers, FileSpreadsheet
} from 'lucide-react';
import {
  getStudentWorkGroup,
  getProgramWorkGroups,
  addGroupMaterial,
  deleteGroupMaterial
} from '@/services/groupService';
import {
  triggerResourceDownload,
  isMaterialDownloadable,
  isNonPreviewableFormat,
  getFileExtension
} from '@/utils/resourceUtils';
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
  const [formAllowDownload, setFormAllowDownload] = useState(false);
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
    setFormAllowDownload(false);
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
        file: matFile,
        allowDownload: formAllowDownload
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
    const ext = getFileExtension(mat.file_name, mat.url, mat.title).toLowerCase();

    if (['dwg', 'dxf', 'rvt', 'ifc', 'skp'].includes(ext)) {
      return <Layers size={18} color="#0284C7" />;
    }
    if (['xlsx', 'xls', 'csv', 'ods'].includes(ext)) {
      return <FileSpreadsheet size={18} color="#16A34A" />;
    }
    if (ext === 'pdf' || t === 'pdf') {
      return <FileText size={18} color="#DC2626" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext) || t === 'archive') {
      return <Archive size={18} color="#F59E0B" />;
    }
    if (['doc', 'docx'].includes(ext)) {
      return <FileText size={18} color="#2563EB" />;
    }
    if (p === 'github' || t === 'code') return <Code size={18} color="#24292e" />;
    if (p === 'drive' || t === 'drive') return <HardDrive size={18} color="#0F9D58" />;
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
                    const nonPreviewable = isNonPreviewableFormat(mat.file_name, mat.material_type, mat.url, mat.title);
                    const downloadable = isMaterialDownloadable(mat);
                    const ext = getFileExtension(mat.file_name, mat.url, mat.title);

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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                Subido por: <strong>{uploaderName}</strong>
                              </span>
                              {nonPreviewable ? (
                                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Download size={10} /> Descarga Directa {ext ? `(.${ext.toUpperCase()})` : ''}
                                </span>
                              ) : downloadable ? (
                                <span style={{ fontSize: '0.66rem', fontWeight: 700, padding: '1px 6px', borderRadius: '4px', background: '#DCFCE7', color: '#15803D', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Download size={10} /> Descargable
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.66rem', fontWeight: 600, padding: '1px 6px', borderRadius: '4px', background: '#F1F5F9', color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <Lock size={10} /> Solo lectura
                                </span>
                              )}
                            </div>
                            {mat.description && (
                              <div style={{ fontSize: '0.74rem', color: '#64748B', marginTop: '0.2rem' }}>
                                {mat.description}
                              </div>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                          {nonPreviewable ? (
                            <button
                              type="button"
                              onClick={() => triggerResourceDownload(mat.url, mat.file_name || mat.title)}
                              title="Descargar archivo a tu equipo"
                              style={{
                                background: '#DCFCE7',
                                border: '1px solid #86EFAC',
                                color: '#15803D',
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
                              <Download size={13} />
                              <span>Descargar</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => setViewingMaterial({ ...mat, groupName: myGroup?.name })}
                                title="Visualizar documento en pantalla"
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

                              {downloadable && (
                                <button
                                  type="button"
                                  onClick={() => triggerResourceDownload(mat.url, mat.file_name || mat.title)}
                                  title="Descargar documento a tu equipo"
                                  style={{
                                    background: '#F0FDF4',
                                    border: '1px solid #BBF7D0',
                                    color: '#16A34A',
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
                                  <Download size={13} />
                                  <span>Descargar</span>
                                </button>
                              )}
                            </>
                          )}

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
              Volver al Resumen del Programa
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setMatUrl(val);
                      if (val && isNonPreviewableFormat('', '', val, matTitle)) {
                        setFormAllowDownload(true);
                      }
                    }}
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
                    onChange={(e) => {
                      const file = e.target.files?.[0] || null;
                      setMatFile(file);
                      if (file) {
                        const isNonPrev = isNonPreviewableFormat(file.name);
                        // Para .dwg, Excel, ZIP u otros formatos no previsualizables: descargables por defecto
                        if (isNonPrev) {
                          setFormAllowDownload(true);
                        } else {
                          // Para PDF: por defecto protegido (solo visualización), el alumno puede activarlo
                          setFormAllowDownload(false);
                        }
                      }
                    }}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px dashed var(--border-color)', fontSize: '0.85rem' }}
                  />
                  <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: '#0F9D58', display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 600 }}>
                    <HardDrive size={13} color="#0F9D58" />
                    <span>Se guardará automáticamente en la carpeta general de Google Drive del curso.</span>
                  </div>
                </div>
              )}

              {/* PERMISO DE DESCARGA (INTERRUPTOR DESLIZANTE) */}
              <div
                onClick={() => setFormAllowDownload(!formAllowDownload)}
                style={{
                  background: formAllowDownload ? 'rgba(20, 33, 61, 0.03)' : '#F8FAFC',
                  border: formAllowDownload ? '1.5px solid var(--navy, #14213D)' : '1px solid #E2E8F0',
                  borderRadius: '10px',
                  padding: '0.8rem 0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--navy, #14213D)' }}>
                      ¿Permitir descarga a tus compañeros?
                    </span>
                    {formAllowDownload ? (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 7px', borderRadius: '6px' }}>
                        Descargable
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#64748B', background: '#E2E8F0', padding: '2px 7px', borderRadius: '6px' }}>
                        Solo lectura
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.73rem', color: '#64748B' }}>
                    {formAllowDownload
                      ? '✓ Tus compañeros de equipo y profesores podrán descargar el archivo original a su equipo.'
                      : '✗ Modo protegido: tus compañeros solo podrán visualizar el archivo en la plataforma sin botón de descarga.'}
                  </p>
                </div>

                {/* Pill Slider */}
                <div
                  role="switch"
                  aria-checked={formAllowDownload}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      setFormAllowDownload(!formAllowDownload);
                    }
                  }}
                  style={{
                    width: '42px',
                    height: '24px',
                    borderRadius: '9999px',
                    background: formAllowDownload ? 'var(--navy, #14213D)' : '#CBD5E1',
                    position: 'relative',
                    flexShrink: 0,
                    transition: 'background-color 0.25s ease'
                  }}
                >
                  <div
                    style={{
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: formAllowDownload ? '#FCA311' : '#FFFFFF',
                      position: 'absolute',
                      top: '3px',
                      left: '3px',
                      transform: formAllowDownload ? 'translateX(18px)' : 'translateX(0)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>

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
