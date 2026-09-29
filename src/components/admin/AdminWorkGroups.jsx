import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/context/AuthContext';
import {
  Users, Plus, Trash2, Edit3, UserPlus, X, FileText, Download,
  ExternalLink, CheckCircle, AlertCircle, Copy, FolderPlus,
  Paperclip, Search, ChevronRight, UserMinus, ShieldAlert,
  Code, HardDrive, FileCode, Archive, Sparkles, Eye, Lock
} from 'lucide-react';
import {
  getProgramWorkGroups,
  createWorkGroup,
  updateWorkGroup,
  deleteWorkGroup,
  addMembersToGroup,
  removeMemberFromGroup,
  addGroupMaterial,
  deleteGroupMaterial
} from '@/services/groupService';
import MaterialFrameViewerModal from '@/components/common/MaterialFrameViewerModal';

export default function AdminWorkGroups({ programId, programTitle, enrolledStudents = [], onRefresh }) {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tableExists, setTableExists] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // Modales
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAddMaterialModal, setShowAddMaterialModal] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // Formularios
  const [groupName, setGroupName] = useState('');
  const [groupTopic, setGroupTopic] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Formulario Material
  const [matTitle, setMatTitle] = useState('');
  const [matDesc, setMatDesc] = useState('');
  const [matType, setMatType] = useState('link'); // 'link' | 'file'
  const [matUrl, setMatUrl] = useState('');
  const [matFile, setMatFile] = useState(null);

  // Filtro de búsqueda en grupos
  const [groupSearch, setGroupSearch] = useState('');

  // 1. Cargar grupos del programa
  const fetchGroups = async () => {
    if (!programId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await getProgramWorkGroups(programId);
      if (!res.tableExists) {
        setTableExists(false);
      } else {
        setTableExists(true);
        setGroups(res.data || []);
        if (res.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (err) {
      console.error('Error cargando grupos de trabajo:', err);
      setErrorMsg(err.message || 'Error al consultar grupos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [programId]); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Extraer estudiantes matriculados limpios (solo rol student)
  const programStudents = useMemo(() => {
    const list = [];
    const seen = new Set();
    (enrolledStudents || []).forEach(e => {
      const profile = e.users_profile || e;
      const sId = e.student_id || profile?.id;
      if (sId && profile && !seen.has(sId) && profile.role === 'student') {
        seen.add(sId);
        list.push({
          id: sId,
          full_name: profile.full_name || 'Estudiante',
          email: profile.email || '',
          phone: profile.phone || ''
        });
      }
    });
    return list.sort((a, b) => a.full_name.localeCompare(b.full_name));
  }, [enrolledStudents]);

  // 3. Estudiantes asignados a grupos
  const assignedStudentMap = useMemo(() => {
    const map = new Map(); // studentId -> groupName
    groups.forEach(g => {
      (g.work_group_members || []).forEach(m => {
        if (m.student_id) map.set(m.student_id, g.name);
      });
    });
    return map;
  }, [groups]);

  // Alumnos sin grupo
  const unassignedStudents = useMemo(() => {
    return programStudents.filter(s => !assignedStudentMap.has(s.id));
  }, [programStudents, assignedStudentMap]);

  // Totales
  const totalMaterialsCount = useMemo(() => {
    return groups.reduce((acc, g) => acc + (g.work_group_materials?.length || 0), 0);
  }, [groups]);

  // Grupos filtrados
  const filteredGroups = useMemo(() => {
    if (!groupSearch.trim()) return groups;
    const q = groupSearch.toLowerCase();
    return groups.filter(g =>
      g.name?.toLowerCase().includes(q) ||
      g.project_topic?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      (g.work_group_members || []).some(m => m.users_profile?.full_name?.toLowerCase().includes(q))
    );
  }, [groups, groupSearch]);

  // ── ACCIÓN: CREAR GRUPO ──
  const handleOpenCreate = () => {
    setGroupName(`Grupo ${groups.length + 1}`);
    setGroupTopic('');
    setGroupDesc('');
    setSelectedStudentIds([]);
    setStudentSearch('');
    setShowCreateModal(true);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!groupName.trim()) {
      alert('Por favor ingresa un nombre para el grupo.');
      return;
    }

    setSubmitting(true);
    try {
      await createWorkGroup({
        programId,
        name: groupName,
        projectTopic: groupTopic,
        description: groupDesc,
        memberIds: selectedStudentIds,
        createdBy: currentUser?.id
      });
      setShowCreateModal(false);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error creando grupo:', err);
      alert('Error al crear grupo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCIÓN: EDITAR GRUPO ──
  const handleOpenEdit = (group) => {
    setSelectedGroup(group);
    setGroupName(group.name || '');
    setGroupTopic(group.project_topic || '');
    setGroupDesc(group.description || '');
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !groupName.trim()) return;

    setSubmitting(true);
    try {
      await updateWorkGroup(selectedGroup.id, {
        name: groupName,
        projectTopic: groupTopic,
        description: groupDesc
      });
      setShowEditModal(false);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al actualizar grupo: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCIÓN: ELIMINAR GRUPO ──
  const handleDeleteGroup = async (group) => {
    const confirmMsg = `¿Deseas eliminar permanentemente el "${group.name}"?\nSe desvincularán sus integrantes (${group.work_group_members?.length || 0}) y sus materiales asociados (${group.work_group_materials?.length || 0}).`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await deleteWorkGroup(group.id);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error al eliminar grupo: ' + err.message);
    }
  };

  // ── ACCIÓN: AÑADIR INTEGRANTE ──
  const handleOpenAddMember = (group) => {
    setSelectedGroup(group);
    setSelectedStudentIds([]);
    setStudentSearch('');
    setShowAddMemberModal(true);
  };

  const handleAddMemberSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || selectedStudentIds.length === 0) return;

    setSubmitting(true);
    try {
      await addMembersToGroup(selectedGroup.id, selectedStudentIds, currentUser?.id);
      setShowAddMemberModal(false);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error asignando integrantes: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCIÓN: REMOVER INTEGRANTE ──
  const handleRemoveMember = async (group, student) => {
    if (!window.confirm(`¿Deseas remover a "${student.full_name}" del ${group.name}?`)) return;

    try {
      await removeMemberFromGroup(group.id, student.id);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error removiendo estudiante: ' + err.message);
    }
  };

  // ── ACCIÓN: SUBIR MATERIAL AL GRUPO ──
  const handleOpenAddMaterial = (group) => {
    setSelectedGroup(group);
    setMatTitle('');
    setMatDesc('');
    setMatType('link');
    setMatUrl('');
    setMatFile(null);
    setShowAddMaterialModal(true);
  };

  const handleAddMaterialSubmit = async (e) => {
    e.preventDefault();
    if (!selectedGroup || !matTitle.trim()) {
      alert('Por favor ingresa un título para el material.');
      return;
    }
    if (matType === 'link' && !matUrl.trim()) {
      alert('Por favor ingresa el enlace web del material o entrega.');
      return;
    }
    if (matType === 'file' && !matFile) {
      alert('Por favor selecciona un archivo para subir.');
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
      setShowAddMaterialModal(false);
      await fetchGroups();
      if (onRefresh) onRefresh();
    } catch (err) {
      alert('Error guardando material: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── ACCIÓN: ELIMINAR MATERIAL ──
  const handleDeleteMaterial = async (mat) => {
    if (!window.confirm(`¿Deseas eliminar el material "${mat.title}"?`)) return;
    try {
      await deleteGroupMaterial(mat.id);
      await fetchGroups();
      if (onRefresh) onRefresh();
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
    if (p === 'github' || t === 'code') return <Code size={16} color="#24292e" />;
    if (p === 'drive' || t === 'drive') return <HardDrive size={16} color="#0F9D58" />;
    if (t === 'pdf') return <FileText size={16} color="#DC2626" />;
    if (t === 'archive') return <Archive size={16} color="#F59E0B" />;
    return <Paperclip size={16} color="var(--gold-dark)" />;
  };

  // ── COPIAR SQL SI LA TABLA NO EXISTE ──
  const sqlSnippet = `-- Ejecuta esto en el SQL Editor de tu Dashboard de Supabase:
CREATE TABLE IF NOT EXISTS public.work_groups (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.diploma_programs(id) ON DELETE CASCADE,
  name character varying NOT NULL,
  project_topic character varying,
  description text,
  created_by uuid REFERENCES public.users_profile(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.work_group_members (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.work_groups(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  assigned_by uuid REFERENCES public.users_profile(id) ON DELETE SET NULL,
  CONSTRAINT work_group_members_unique UNIQUE (group_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.work_group_materials (
  id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid NOT NULL REFERENCES public.work_groups(id) ON DELETE CASCADE,
  uploaded_by uuid REFERENCES public.users_profile(id) ON DELETE SET NULL,
  title character varying NOT NULL,
  description text,
  material_type character varying NOT NULL DEFAULT 'file',
  url text NOT NULL,
  file_name text,
  file_size bigint,
  provider character varying DEFAULT 'external',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.work_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_group_materials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "work_groups_admin_all" ON public.work_groups;
DROP POLICY IF EXISTS "work_groups_auth_select" ON public.work_groups;
DROP POLICY IF EXISTS "work_groups_select" ON public.work_groups;

DROP POLICY IF EXISTS "work_group_members_admin_all" ON public.work_group_members;
DROP POLICY IF EXISTS "work_group_members_auth_select" ON public.work_group_members;
DROP POLICY IF EXISTS "work_group_members_select" ON public.work_group_members;

DROP POLICY IF EXISTS "work_group_materials_admin_all" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_auth_select" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_select" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_member_insert" ON public.work_group_materials;
DROP POLICY IF EXISTS "work_group_materials_owner_delete" ON public.work_group_materials;

CREATE POLICY "work_groups_admin_all" ON public.work_groups FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "work_groups_select" ON public.work_groups FOR SELECT USING (true);

CREATE POLICY "work_group_members_admin_all" ON public.work_group_members FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "work_group_members_select" ON public.work_group_members FOR SELECT USING (true);

CREATE POLICY "work_group_materials_admin_all" ON public.work_group_materials FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "work_group_materials_select" ON public.work_group_materials FOR SELECT USING (true);
CREATE POLICY "work_group_materials_member_insert" ON public.work_group_materials FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR EXISTS (SELECT 1 FROM public.work_group_members wgm WHERE wgm.group_id = work_group_materials.group_id AND wgm.student_id = public.get_auth_profile_id()));
CREATE POLICY "work_group_materials_owner_delete" ON public.work_group_materials FOR DELETE TO authenticated USING (public.is_admin() OR uploaded_by = public.get_auth_profile_id());

NOTIFY pgrst, 'reload schema';`;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.35s ease-out' }}>

      {/* ── BANNER RESILIENTE SI AÚN NO EXISTEN LAS TABLAS ── */}
      {!tableExists && (
        <div style={{
          background: '#FFFBEB',
          border: '1px solid #FCD34D',
          borderRadius: '12px',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <AlertCircle size={22} color="#D97706" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 0.4rem 0', color: '#92400E', fontSize: '1rem', fontWeight: 800 }}>
                Tablas de Grupos de Trabajo pendientes de migración
              </h3>
              <p style={{ margin: '0 0 0.85rem 0', color: '#B45309', fontSize: '0.88rem', lineHeight: 1.5 }}>
                Para habilitar la persistencia de grupos y entregables en este entorno, ejecuta la migración en el <strong>SQL Editor</strong> de Supabase:
              </p>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={copySql}
                  className="btn btn-primary"
                  style={{
                    fontSize: '0.82rem',
                    padding: '0.45rem 1rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: '#D97706',
                    borderColor: '#B45309'
                  }}
                >
                  {copiedSql ? <CheckCircle size={15} /> : <Copy size={15} />}
                  <span>{copiedSql ? '¡SQL Copiado!' : 'Copiar Script SQL de Migración'}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchGroups}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.45rem 0.9rem' }}
                >
                  Verificar nuevamente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERTA DE ERROR SI LA CONSULTA FALLA ── */}
      {errorMsg && (
        <div style={{
          background: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          color: '#991B1B'
        }}>
          <AlertCircle size={20} color="#DC2626" style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, fontSize: '0.88rem' }}>
            <strong>Nota del sistema:</strong> {errorMsg}
          </div>
          <button
            type="button"
            onClick={fetchGroups}
            className="btn btn-outline"
            style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: '#FCA5A5', color: '#991B1B' }}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* ── BARRA SUPERIOR DE ACCIONES Y CONTADORES ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.75rem'
      }}>
        {/* Card Grupos */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'var(--gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={24} color="var(--gold-dark)" />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{groups.length}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Grupos Creados</div>
          </div>
        </div>

        {/* Card Alumnos Asignados */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={24} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>
              {assignedStudentMap.size} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 500 }}>/ {programStudents.length}</span>
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Alumnos Asignados</div>
          </div>
        </div>

        {/* Card Alumnos Sin Grupo */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: unassignedStudents.length > 0 ? '#FEF3C7' : '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={24} color={unassignedStudents.length > 0 ? '#D97706' : '#64748B'} />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: unassignedStudents.length > 0 ? '#D97706' : 'var(--navy)', lineHeight: 1 }}>
              {unassignedStudents.length}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Alumnos Sin Grupo</div>
          </div>
        </div>

        {/* Card Entregables */}
        <div className="card" style={{ padding: '1.25rem', background: '#FFFFFF', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'rgba(20, 33, 61, 0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={24} color="var(--navy)" />
          </div>
          <div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1 }}>{totalMaterialsCount}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>Entregables y Archivos</div>
          </div>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y BOTÓN NUEVO GRUPO ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem',
        background: '#FFFFFF',
        padding: '0.85rem 1.25rem',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Buscar por grupo, tema, integrante o material..."
            value={groupSearch}
            onChange={(e) => setGroupSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="btn btn-primary"
          style={{
            fontSize: '0.85rem',
            padding: '0.55rem 1.25rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 700,
            whiteSpace: 'nowrap'
          }}
        >
          <FolderPlus size={16} />
          <span>Crear Nuevo Grupo</span>
        </button>
      </div>

      {/* ── BANNER DE ALUMNOS SIN ASIGNAR (SI EXISTEN) ── */}
      {unassignedStudents.length > 0 && (
        <div style={{
          background: '#F8FAFC',
          border: '1px dashed #CBD5E1',
          borderRadius: '12px',
          padding: '1rem 1.25rem',
          marginBottom: '1.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.65rem' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Alumnos matriculados pendientes por asignar a un grupo ({unassignedStudents.length})
            </span>
            <button
              type="button"
              onClick={handleOpenCreate}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--navy)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
            >
              <span>Crear grupo con ellos</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {unassignedStudents.slice(0, 15).map(s => (
              <span
                key={s.id}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  padding: '0.25rem 0.65rem',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  color: 'var(--navy)',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <span style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'var(--gold-subtle)', color: 'var(--gold-dark)', fontSize: '0.65rem', fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                  {getInitials(s.full_name)}
                </span>
                {s.full_name}
              </span>
            ))}
            {unassignedStudents.length > 15 && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', alignSelf: 'center', fontStyle: 'italic' }}>
                +{unassignedStudents.length - 15} más
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── LISTADO DE GRUPOS DE TRABAJO ── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando grupos de trabajo...
        </div>
      ) : filteredGroups.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed var(--border-color)',
          color: 'var(--text-muted)'
        }}>
          <Users size={44} color="var(--gold-dark)" style={{ marginBottom: '0.75rem', opacity: 0.8 }} />
          <h3 style={{ color: 'var(--navy)', margin: '0 0 0.4rem 0', fontWeight: 800 }}>
            {groups.length === 0 ? 'No hay grupos de trabajo creados todavía' : 'No se encontraron grupos con ese término'}
          </h3>
          <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.9rem', maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            {groups.length === 0
              ? 'Organiza a los alumnos en equipos para realizar proyectos, actividades colaborativas y recibir sus avances y materiales.'
              : 'Intenta con otro filtro de búsqueda o limpia el texto.'}
          </p>
          {groups.length === 0 && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn btn-primary"
              style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem' }}
            >
              <Plus size={16} /> Crear el Primer Grupo
            </button>
          )}
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
                  gap: '1.25rem',
                  transition: 'all 0.2s ease'
                }}
              >
                {/* Encabezado de la Tarjeta del Grupo */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
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

                  {/* Acciones del Grupo (Editar / Eliminar) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(group)}
                      title="Editar información del grupo"
                      style={{
                        background: '#F1F5F9',
                        color: 'var(--navy)',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '0.4rem',
                        cursor: 'pointer',
                        display: 'inline-flex'
                      }}
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteGroup(group)}
                      title="Eliminar grupo"
                      style={{
                        background: '#FEE2E2',
                        color: '#DC2626',
                        border: '1px solid #FECACA',
                        borderRadius: '6px',
                        padding: '0.4rem',
                        cursor: 'pointer',
                        display: 'inline-flex'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Sección de Integrantes */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Users size={14} color="var(--gold-dark)" />
                      Integrantes ({members.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMember(group)}
                      style={{
                        background: '#F1F5F9',
                        border: '1px solid #E2E8F0',
                        borderRadius: '6px',
                        padding: '0.25rem 0.6rem',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: 'var(--navy)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}
                    >
                      <UserPlus size={13} />
                      <span>Añadir alumno</span>
                    </button>
                  </div>

                  {members.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#F8FAFC', padding: '0.6rem 0.85rem', borderRadius: '8px' }}>
                      No hay integrantes asignados a este grupo aún.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {members.map(m => {
                        const prof = m.users_profile || {};
                        return (
                          <div
                            key={m.id || m.student_id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '0.4rem 0.65rem',
                              borderRadius: '8px',
                              background: '#F8FAFC',
                              border: '1px solid #E2E8F0',
                              fontSize: '0.82rem'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', minWidth: 0 }}>
                              <span style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '50%',
                                background: 'var(--navy)',
                                color: 'var(--gold)',
                                fontSize: '0.7rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {getInitials(prof.full_name)}
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {prof.full_name || 'Estudiante'}
                                </div>
                                {prof.email && (
                                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {prof.email}
                                  </div>
                                )}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveMember(group, { id: m.student_id, full_name: prof.full_name })}
                              title={`Remover a ${prof.full_name} del grupo`}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                borderRadius: '4px'
                              }}
                              onMouseOver={e => e.currentTarget.style.color = '#EF4444'}
                              onMouseOut={e => e.currentTarget.style.color = '#94A3B8'}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Sección de Entregables y Materiales del Grupo */}
                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <Paperclip size={14} color="var(--gold-dark)" />
                      Entregables y Materiales ({materials.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddMaterial(group)}
                      style={{
                        background: '#DCFCE7',
                        border: '1px solid #86EFAC',
                        borderRadius: '6px',
                        padding: '0.25rem 0.6rem',
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
                      <span>Adjuntar</span>
                    </button>
                  </div>

                  {materials.length === 0 ? (
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', background: '#F8FAFC', padding: '0.65rem 0.85rem', borderRadius: '8px' }}>
                      No se han subido materiales ni entregables en este grupo todavía.
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

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => setViewingMaterial({ ...mat, groupName: group.name })}
                                title="Visualizar documento en visor seguro (solo lectura)"
                                style={{
                                  background: '#FFFFFF',
                                  border: '1px solid #CBD5E1',
                                  color: 'var(--navy)',
                                  borderRadius: '6px',
                                  padding: '0.3rem 0.6rem',
                                  fontSize: '0.74rem',
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
                            </div>
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

      {/* ────────────────────────────────────────────────────────
          MODAL: CREAR GRUPO DE TRABAJO
      ──────────────────────────────────────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '580px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--gold-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FolderPlus size={18} color="var(--gold-dark)" />
                </div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Crear Grupo de Trabajo
                </h3>
              </div>
              <button type="button" onClick={() => setShowCreateModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Grupo 1, Equipo Robótica, Proyecto Alpha..."
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Tema o Nombre del Proyecto
                </label>
                <input
                  type="text"
                  placeholder="Ej: Clasificación de imágenes satelitales con CNNs"
                  value={groupTopic}
                  onChange={(e) => setGroupTopic(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Descripción o Directrices
                </label>
                <textarea
                  rows={2}
                  placeholder="Breve alcance de la actividad o pautas acordadas en clase..."
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              {/* Selección de Alumnos */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
                    Asignar Alumnos ({selectedStudentIds.length} seleccionados)
                  </label>
                  {unassignedStudents.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedStudentIds(unassignedStudents.map(s => s.id))}
                      style={{ background: 'transparent', border: 'none', color: 'var(--gold-dark)', fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Seleccionar sin grupo ({unassignedStudents.length})
                    </button>
                  )}
                </div>

                <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                  <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    placeholder="Filtrar alumnos por nombre o correo..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ width: '100%', padding: '0.45rem 0.65rem 0.45rem 1.85rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}
                  />
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {programStudents
                    .filter(s => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
                    })
                    .map(s => {
                      const isSelected = selectedStudentIds.includes(s.id);
                      const currentGroupName = assignedStudentMap.get(s.id);

                      return (
                        <label
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.4rem 0.6rem',
                            borderRadius: '6px',
                            background: isSelected ? 'var(--gold-subtle)' : '#FFFFFF',
                            cursor: 'pointer',
                            fontSize: '0.82rem'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                                else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                              }}
                            />
                            <div style={{ minWidth: 0 }}>
                              <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.full_name}</span>
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.4rem' }}>{s.email}</span>
                            </div>
                          </div>

                          {currentGroupName && !isSelected && (
                            <span style={{ fontSize: '0.68rem', color: '#64748B', background: '#F1F5F9', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>
                              En: {currentGroupName}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  {programStudents.length === 0 && (
                    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No hay alumnos inscritos en este programa.
                    </div>
                  )}
                </div>
              </div>

              {/* Botones */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.85rem' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {submitting ? 'Creando Grupo...' : 'Guardar y Crear Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL: EDITAR INFORMACIÓN DEL GRUPO
      ──────────────────────────────────────────────────────── */}
      {showEditModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                Editar: {selectedGroup?.name}
              </h3>
              <button type="button" onClick={() => setShowEditModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Nombre del Grupo *
                </label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Tema o Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={groupTopic}
                  onChange={(e) => setGroupTopic(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.35rem' }}>
                  Descripción o Directrices
                </label>
                <textarea
                  rows={3}
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitting ? 'Guardando...' : 'Actualizar Grupo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL: ASIGNAR INTEGRANTE(S) AL GRUPO
      ──────────────────────────────────────────────────────── */}
      {showAddMemberModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '500px', width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Añadir Alumnos al {selectedGroup?.name}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Selecciona los alumnos que formarán parte de este equipo.
                </p>
              </div>
              <button type="button" onClick={() => setShowAddMemberModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar alumno por nombre..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 1.95rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}
                />
              </div>

              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                {programStudents
                  .filter(s => {
                    // Excluir alumnos que ya están en este grupo
                    const isAlreadyInThisGroup = (selectedGroup?.work_group_members || []).some(m => m.student_id === s.id);
                    if (isAlreadyInThisGroup) return false;
                    if (!studentSearch.trim()) return true;
                    return s.full_name?.toLowerCase().includes(studentSearch.toLowerCase());
                  })
                  .map(s => {
                    const isSelected = selectedStudentIds.includes(s.id);
                    const currentGroupName = assignedStudentMap.get(s.id);

                    return (
                      <label
                        key={s.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.45rem 0.65rem',
                          borderRadius: '6px',
                          background: isSelected ? 'var(--gold-subtle)' : '#FFFFFF',
                          cursor: 'pointer',
                          fontSize: '0.84rem'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedStudentIds(prev => [...prev, s.id]);
                              else setSelectedStudentIds(prev => prev.filter(id => id !== s.id));
                            }}
                          />
                          <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{s.full_name}</span>
                        </div>
                        {currentGroupName && (
                          <span style={{ fontSize: '0.7rem', color: '#B45309', background: '#FEF3C7', padding: '2px 6px', borderRadius: '4px' }}>
                            Cambiará desde: {currentGroupName}
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddMemberModal(false)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || selectedStudentIds.length === 0}
                  className="btn btn-primary"
                  style={{ fontSize: '0.85rem', fontWeight: 700 }}
                >
                  {submitting ? 'Asignando...' : `Añadir (${selectedStudentIds.length}) Alumnos`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL: ADJUNTAR MATERIAL / ENTREGABLE AL GRUPO
      ──────────────────────────────────────────────────────── */}
      {showAddMaterialModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(3px)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ background: '#FFFFFF', borderRadius: '16px', maxWidth: '520px', width: '100%', boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '1.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Adjuntar Material a: {selectedGroup?.name}
                </h3>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Comparte una guía, enlace de Drive/GitHub o archivo con este equipo.
                </p>
              </div>
              <button type="button" onClick={() => setShowAddMaterialModal(false)} style={{ background: 'transparent', border: 'none', color: '#94A3B8', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Selector de Modo (Enlace vs Archivo) */}
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
                  Título del Material / Entrega *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Guía de Arquitectura, Avance Fase 1, Repositorio..."
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
                  Descripción o Comentarios (Opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones breves o notas sobre este archivo..."
                  value={matDesc}
                  onChange={(e) => setMatDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="button" onClick={() => setShowAddMaterialModal(false)} className="btn btn-outline" style={{ fontSize: '0.85rem' }}>
                  Cancelar
                </button>
                <button type="submit" disabled={submitting} className="btn btn-primary" style={{ fontSize: '0.85rem', fontWeight: 700 }}>
                  {submitting ? 'Subiendo a Google Drive...' : 'Guardar Material'}
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
