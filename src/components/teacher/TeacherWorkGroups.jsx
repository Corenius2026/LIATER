import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  Users, Search, ExternalLink, Download, FileText,
  Paperclip, Code, HardDrive, Archive, Plus, X,
  CheckCircle, AlertCircle, MessageSquare
} from 'lucide-react';
import { getProgramWorkGroups, addGroupMaterial } from '@/services/groupService';
import { triggerResourceDownload } from '@/utils/resourceUtils';

export default function TeacherWorkGroups({ programId, programTitle }) {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modal para adjuntar material / retroalimentación del docente
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matType, setMatType] = useState('link');
  const [matUrl, setMatUrl] = useState('');
  const [matFile, setMatFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchGroups = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const res = await getProgramWorkGroups(programId);
      if (!res.tableExists) {
        setTableExists(false);
      } else {
        setTableExists(true);
        setGroups(res.data || []);
      }
    } catch (err) {
      console.error('Error cargando grupos en panel docente:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getInitials = (name) => {
    const parts = (name || '').trim().split(' ');
    return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || 'AL';
  };

  const getMaterialIcon = (mat) => {
    const p = mat.provider || '';
    const t = mat.material_type || '';
    if (p === 'github' || t === 'code') return <Code size={16} color="#24292e" />;
    if (p === 'drive' || t === 'drive') return <HardDrive size={16} color="#0F9D58" />;
    if (t === 'pdf') return <FileText size={16} color="#DC2626" />;
    if (t === 'archive') return <Archive size={16} color="#F59E0B" />;
    return <Paperclip size={16} color="var(--gold-dark)" />;
  };

  const totalAssignedStudents = useMemo(() => {
    let count = 0;
    groups.forEach(g => { count += (g.work_group_members || []).length; });
    return count;
  }, [groups]);

  const totalDeliverables = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.work_group_materials?.length || 0), 0);
  }, [groups]);

  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groups;
    const q = searchTerm.toLowerCase();
    return groups.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.project_topic?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      (g.work_group_members || []).some(m => m.users_profile?.full_name?.toLowerCase().includes(q))
    );
  }, [groups, searchTerm]);

  const handleOpenAttach = (group) => {
    setSelectedGroup(group);
    setMatTitle('');
    setMatDesc('');
    setMatType('link');
    setMatUrl('');
    setMatFile(null);
    setShowAttachModal(true);
  };

  const handleAttachSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !matTitle.trim()) {
      alert('Ingresa un título para el material.');
      return;
    }
    if (matType === 'link' && !matUrl.trim()) {
      alert('Ingresa el enlace web del material.');
      return;
    }
    if (matType === 'file' && !matFile) {
      alert('Selecciona un archivo para subir.');
      return;
    }

    setSubmitting(true);
    try {
      await addGroupMaterial({
        groupId: selectedGroup.id,
        programId: programId || selectedGroup.program_id,
        uploadedBy: currentUser?.id,
        title: matTitle,
        description: matDesc,
        materialType: matType,
        url: matUrl,
        file: matFile
      });
      setShowAttachModal(false);
      await fetchGroups();
    } catch (err) {
      alert('Error guardando material: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* Banner si la tabla no existe aún */}
      {!tableExists && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '12px',
          padding: '1.25rem',
          marginBottom: '1.5rem',
          color: '#92400E',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <AlertCircle size={20} color="#D97706" style={{ flexShrink: 0 }} />
          <div>
            <strong>Módulo de Grupos en configuración:</strong> La administración debe aplicar la migración SQL de grupos de trabajo en Supabase para habilitar esta sección.
          </div>
        </div>
      )}

      {/* Contadores */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        <div className="card" style={{ padding: '1.15rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={22} color="var(--gold-dark)" />
          </div>
          <div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{groups.length}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Grupos de Trabajo</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={22} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{totalAssignedStudents}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Estudiantes en Grupos</div>
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={22} color="var(--navy)" />
          </div>
          <div>
            <div style={{ fontSize: '1.55rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{totalDeliverables}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Entregables Subidos</div>
          </div>
        </div>
      </div>

      {/* Buscador */}
      <div style={{ marginBottom: '1.5rem', position: 'relative', maxWidth: '450px' }}>
        <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="text"
          placeholder="Buscar por grupo, tema del proyecto o alumno..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '0.55rem 0.75rem 0.55rem 2.25rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.88rem' }}
        />
      </div>

      {/* Listado de Grupos */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando grupos de trabajo...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3rem 1.5rem',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)'
        }}>
          <Users size={40} color="var(--gold-dark)" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
          <h3 style={{ color: 'var(--navy)', margin: '0 0 0.4rem 0', fontWeight: 800 }}>
            {groups.length === 0 ? 'No hay grupos de trabajo creados en este programa' : 'No se encontraron resultados'}
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem' }}>
            {groups.length === 0
              ? 'La administración es la encargada de conformar y asignar los grupos de trabajo para este curso.'
              : 'Verifica el texto ingresado en la búsqueda.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(460px, 1fr))', gap: '1.5rem', alignItems: 'start' }}>
          {filteredGroups.map(group => {
            const members = group.work_group_members || [];
            const materials = group.work_group_materials || [];

            return (
              <div
                key={group.id}
                className="card"
                style={{
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid var(--border-color)',
                  boxShadow: '0 2px 10px rgba(20, 33, 61, 0.04)',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1.25rem'
                }}
              >
                {/* Header Grupo */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                      {group.name}
                    </h3>
                    {group.project_topic && (
                      <span style={{
                        background: 'var(--gold-subtle)',
                        color: 'var(--gold-dark)',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.55rem',
                        borderRadius: '6px'
                      }}>
                        🎯 {group.project_topic}
                      </span>
                    )}
                  </div>
                  {group.description && (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                      {group.description}
                    </p>
                  )}
                </div>

                {/* Integrantes */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.65rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Users size={14} color="var(--gold-dark)" /> Integrantes ({members.length})
                  </div>
                  {members.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#F8FAFC', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
                      Sin integrantes asignados aún.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      {members.map(m => {
                        const prof = m.users_profile || {};
                        return (
                          <div
                            key={m.id || m.student_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.6rem',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.82rem'
                            }}
                          >
                            <span style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              background: 'var(--navy)',
                              color: 'var(--gold)',
                              fontSize: '0.68rem',
                              fontWeight: 800,
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {getInitials(prof.full_name)}
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 700, color: 'var(--navy)' }}>{prof.full_name || 'Estudiante'}</span>
                              {prof.email && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{prof.email}</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Materiales y Entregables subidos por los alumnos */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Paperclip size={14} color="var(--gold-dark)" />
                      Entregables y Materiales ({materials.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAttach(group)}
                      style={{
                        background: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        borderRadius: '6px',
                        padding: '0.25rem 0.55rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#15803D',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <Plus size={13} />
                      <span>Adjuntar Retroalimentación</span>
                    </button>
                  </div>

                  {materials.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      El grupo aún no ha subido ningún entregable o material.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      {materials.map(mat => {
                        const uploaderName = mat.users_profile?.full_name || 'Miembro del grupo';
                        return (
                          <div
                            key={mat.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              gap: '0.75rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                              <div style={{ flexShrink: 0 }}>
                                {getMaterialIcon(mat)}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {mat.title}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Subido por: <strong>{uploaderName}</strong>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => triggerResourceDownload(mat.url, mat.title)}
                              title="Abrir o descargar entregable"
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #CBD5E1',
                                color: 'var(--navy)',
                                borderRadius: '6px',
                                padding: '0.3rem 0.65rem',
                                fontSize: '0.74rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                flexShrink: 0
                              }}
                            >
                              <ExternalLink size={12} />
                              <span>Revisar</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Modal Adjuntar Material Docente */}
      {showAttachModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '500px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Compartir Material con: {selectedGroup?.name}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Sube guías, correcciones o recursos para este grupo de estudiantes.
                </p>
              </div>
              <button type="button" onClick={() => setShowAttachModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAttachSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                  🔗 Enlace Web
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
                  Título *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Retroalimentación Avance 1, Guía de rúbrica..."
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
                    placeholder="https://drive.google.com/..."
                    value={matUrl}
                    onChange={(e) => setMatUrl(e.target.value)}
                    style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                  />
                </div>
              ) : (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                    Archivo *
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
                  Descripción (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Comentarios adicionales para el equipo..."
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAttachModal(false)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitting ? 'Subiendo a Google Drive...' : 'Compartir con el Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
