import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import {
  Paperclip, FileText, Presentation, ExternalLink, Code, Download,
  Eye, Search, BookOpen, Video, Layers, Calendar, ChevronRight, X, Check,
  FolderDown, Plus, Trash2, Edit3, EyeOff, Upload, Link as LinkIcon,
  RefreshCw, Info, Lock, LayoutGrid, List
} from 'lucide-react';
import { triggerResourceDownload } from '@/utils/resourceUtils';

/* ── HELPER: Formatear URL para embeber documentos de Google Drive ── */
function formatEmbedDocUrl(url) {
  if (!url) return '';
  let trimmed = url.trim();
  if (trimmed.includes('drive.google.com')) {
    if (trimmed.includes('/preview')) return trimmed;
    return trimmed.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  }
  return trimmed;
}

/* ── HELPER: Ícono por tipo de recurso ── */
function getResourceIcon(type, size = 18) {
  switch (type) {
    case 'presentation':
      return <Presentation size={size} color="var(--gold-dark, #b45309)" />;
    case 'file':
    case 'pdf':
    case 'document':
      return <FileText size={size} color="#dc2626" />;
    case 'link':
      return <ExternalLink size={size} color="#16a34a" />;
    case 'code':
      return <Code size={size} color="#9333ea" />;
    case 'video':
      return <Video size={size} color="#dc2626" />;
    default:
      return <Paperclip size={size} color="var(--navy, #14213D)" />;
  }
}

/* ── HELPER: Etiqueta legible por tipo ── */
function getResourceTypeLabel(type) {
  switch (type) {
    case 'presentation': return 'Presentación / Diapositivas';
    case 'file':
    case 'pdf':
    case 'document': return 'Documento / Lectura';
    case 'link': return 'Enlace de Interés';
    case 'code': return 'Código / Repositorio';
    case 'video': return 'Video / Grabación';
    default: return 'Material de Estudio';
  }
}

/* ── HELPER: Formatear etiqueta combinada de Sesión y Clase ── */
function formatSessionAndClass(sessionTitle, classTitle) {
  const cTitle = classTitle ? classTitle.trim() : '';
  const sTitle = sessionTitle ? sessionTitle.trim() : '';

  if (!sTitle) {
    if (!cTitle) return 'Clase';
    return cTitle.toLowerCase().startsWith('clase') ? cTitle : `Clase: ${cTitle}`;
  }

  const sessionPart = sTitle.toLowerCase().startsWith('sesi') ? sTitle : `Sesión: ${sTitle}`;
  const classPart = cTitle.toLowerCase().startsWith('clase') ? cTitle : `Clase: ${cTitle}`;

  return `${sessionPart} · ${classPart}`;
}

export default function TeacherResources({ programId, programTitle = 'Programa Académico', programClasses = [], onRefresh }) {
  const fileInputRef = useRef(null);
  const cleanProgramId = programId ? String(programId).trim() : '';

  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState([]);
  const [classesList, setClassesList] = useState([]);
  const [sessionsList, setSessionsList] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);

  // Filtros y Búsqueda
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'presentation' | 'file' | 'link' | 'code'
  const [sessionFilter, setSessionFilter] = useState('all'); // 'all' | 'general' | sessionId
  const [viewMode, setViewMode] = useState('list'); // 'list' (por defecto: limpio y legible) | 'grid'

  // Modal de Subida / Edición
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingResource, setEditingResource] = useState(null);
  const [uploadMode, setUploadMode] = useState('file'); // 'file' (Drive) | 'link'
  const [targetDestination, setTargetDestination] = useState('general'); // 'general' | classId
  const [formTitle, setFormTitle] = useState('');
  const [formType, setFormType] = useState('file');
  const [formUrl, setFormUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAllowDownload, setFormAllowDownload] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  // ── CARGAR RECURSOS Y ESTRUCTURA DE SESIONES / CLASES ──
  const fetchTeacherResources = async () => {
    if (!cleanProgramId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Obtener todas las clases del programa
      let classesData = [];
      const classMap = {};
      const availableClasses = [];

      try {
        const { data: cData, error: cErr } = await supabase
          .from('class_sessions')
          .select('*')
          .eq('program_id', cleanProgramId)
          .order('order_index', { ascending: true, nullsFirst: false });

        if (cErr) {
          console.warn('Aviso al consultar class_sessions:', cErr);
          const { data: fallbackData } = await supabase
            .from('class_sessions')
            .select('id, title, class_date, order_index, subtopic_id')
            .eq('program_id', cleanProgramId)
            .order('order_index', { ascending: true, nullsFirst: false });
          classesData = fallbackData || [];
        } else {
          classesData = cData || [];
        }
      } catch (e) {
        console.warn('Excepción al consultar clases:', e);
      }

      // 2. Módulos y Sesiones (subtopics / sessions)
      let modulesData = [];
      const modMap = {};
      try {
        const { data: mData } = await supabase
          .from('modules')
          .select('id, title, order_index')
          .eq('program_id', cleanProgramId)
          .order('order_index', { ascending: true });
        modulesData = mData || [];
        modulesData.forEach(m => {
          modMap[String(m.id)] = m.title;
        });
      } catch {}

      const modIds = modulesData.map(m => m.id);
      const sessionsMap = new Map();

      // Intento A: subtopics por program_id
      try {
        const { data: subProg } = await supabase
          .from('subtopics')
          .select('id, title, order_index, module_id')
          .eq('program_id', cleanProgramId)
          .order('order_index', { ascending: true });
        (subProg || []).forEach(s => {
          sessionsMap.set(String(s.id), {
            id: String(s.id),
            title: s.title || 'Sesión sin título',
            orderIndex: s.order_index ?? 999,
            moduleId: s.module_id,
            moduleTitle: s.module_id ? (modMap[String(s.module_id)] || null) : null,
            classIds: new Set()
          });
        });
      } catch {}

      // Intento B: subtopics por module_id
      if (modIds.length > 0) {
        try {
          const { data: subMod } = await supabase
            .from('subtopics')
            .select('id, title, order_index, module_id')
            .in('module_id', modIds)
            .order('order_index', { ascending: true });
          (subMod || []).forEach(s => {
            if (!sessionsMap.has(String(s.id))) {
              sessionsMap.set(String(s.id), {
                id: String(s.id),
                title: s.title || 'Sesión sin título',
                orderIndex: s.order_index ?? 999,
                moduleId: s.module_id,
                moduleTitle: s.module_id ? (modMap[String(s.module_id)] || null) : null,
                classIds: new Set()
              });
            }
          });
        } catch {}
      }

      // Intento C: sessions por program_id
      try {
        const { data: sProg } = await supabase
          .from('sessions')
          .select('id, title, order_index, module_id')
          .eq('program_id', cleanProgramId)
          .order('order_index', { ascending: true });
        (sProg || []).forEach(s => {
          if (!sessionsMap.has(String(s.id))) {
            sessionsMap.set(String(s.id), {
              id: String(s.id),
              title: s.title || 'Sesión sin título',
              orderIndex: s.order_index ?? 999,
              moduleId: s.module_id,
              moduleTitle: s.module_id ? (modMap[String(s.module_id)] || null) : null,
              classIds: new Set()
            });
          }
        });
      } catch {}

      // Mapear clases
      classesData.forEach(cls => {
        const sId = cls.subtopic_id ? String(cls.subtopic_id) : (cls.session_id ? String(cls.session_id) : null);
        const sessionObj = sId ? sessionsMap.get(sId) : null;
        const sTitle = sessionObj?.title || null;
        const mTitle = sessionObj?.moduleTitle || (cls.module_id ? modMap[String(cls.module_id)] : null);

        if (sId && sessionObj) {
          sessionObj.classIds.add(cls.id);
        }

        classMap[cls.id] = {
          id: cls.id,
          title: cls.title || 'Clase sin título',
          class_date: cls.class_date,
          order_index: cls.order_index,
          sessionId: sId,
          sessionTitle: sTitle,
          moduleTitle: mTitle,
        };

        availableClasses.push({
          id: cls.id,
          title: cls.title || 'Clase sin título',
          date: cls.class_date,
          orderIndex: cls.order_index,
          sessionId: sId,
          sessionTitle: sTitle
        });
      });

      setClassesList(availableClasses);
      const availableSessions = Array.from(sessionsMap.values()).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      setSessionsList(availableSessions);

      // 3. Consultar recursos (por clase y generales del curso)
      const classIds = Object.keys(classMap);
      const queryPromises = [];

      if (classIds.length > 0) {
        queryPromises.push(
          supabase.from('resources').select('*').in('class_id', classIds)
        );
      }
      queryPromises.push(
        supabase.from('resources').select('*').eq('program_id', cleanProgramId)
      );

      const queryResults = await Promise.all(queryPromises);
      const resourcesMap = new Map();
      queryResults.forEach(({ data, error }) => {
        if (error) console.warn('Aviso al consultar recursos en TeacherResources:', error);
        (data || []).forEach(r => resourcesMap.set(r.id, r));
      });

      const resData = Array.from(resourcesMap.values()).sort((a, b) => {
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      const enriched = resData.map(r => {
        const isGen = !r.class_id || !classMap[r.class_id];
        const cls = (!isGen && classMap[r.class_id]) ? classMap[r.class_id] : null;

        return {
          ...r,
          isGeneral: isGen,
          classId: isGen ? null : r.class_id,
          classTitle: isGen ? 'Contenido General del Curso' : (cls?.title || 'Clase'),
          classDate: cls?.class_date || null,
          sessionId: cls?.sessionId || null,
          sessionTitle: cls?.sessionTitle || null,
          moduleTitle: cls?.moduleTitle || null,
        };
      });

      setResources(enriched);
    } catch (err) {
      console.error('Error al cargar recursos de profesor:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherResources();
  }, [cleanProgramId]);

  // Contadores
  const generalResources = useMemo(() => resources.filter(r => r.isGeneral), [resources]);
  const classResources = useMemo(() => resources.filter(r => !r.isGeneral), [resources]);

  const counts = useMemo(() => {
    return {
      all: resources.length,
      general: generalResources.length,
      presentation: resources.filter(r => (r.resource_type || r.type) === 'presentation').length,
      file: resources.filter(r => {
        const t = r.resource_type || r.type;
        return t === 'file' || t === 'pdf' || t === 'document';
      }).length,
      link: resources.filter(r => (r.resource_type || r.type) === 'link').length,
      code: resources.filter(r => (r.resource_type || r.type) === 'code').length,
    };
  }, [resources, generalResources]);

  // Filtrado de recursos
  const filteredResources = useMemo(() => {
    return resources.filter(res => {
      // Filtro por tipo
      if (typeFilter !== 'all') {
        const actualType = res.resource_type || res.type;
        if (typeFilter === 'file') {
          if (actualType !== 'file' && actualType !== 'pdf' && actualType !== 'document') return false;
        } else if (actualType !== typeFilter) {
          return false;
        }
      }

      // Filtro por sesión o general
      if (sessionFilter === 'general') {
        if (!res.isGeneral) return false;
      } else if (sessionFilter !== 'all') {
        const targetSession = sessionsList.find(s => String(s.id) === String(sessionFilter));
        const matchesSessionId = res.sessionId && String(res.sessionId) === String(sessionFilter);
        const matchesClassInSession = targetSession && targetSession.classIds && targetSession.classIds.has(res.classId);
        if (!matchesSessionId && !matchesClassInSession) {
          return false;
        }
      }

      // Filtro por texto de búsqueda
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const titleMatch = (res.title || '').toLowerCase().includes(query);
        const descMatch = (res.description || '').toLowerCase().includes(query);
        const classMatch = (res.classTitle || '').toLowerCase().includes(query);
        const sessionMatch = (res.sessionTitle || '').toLowerCase().includes(query);
        const moduleMatch = (res.moduleTitle || '').toLowerCase().includes(query);
        if (!titleMatch && !descMatch && !classMatch && !sessionMatch && !moduleMatch) {
          return false;
        }
      }

      return true;
    });
  }, [resources, typeFilter, sessionFilter, searchQuery, sessionsList]);

  const filteredGeneral = useMemo(() => filteredResources.filter(r => r.isGeneral), [filteredResources]);
  const filteredClass = useMemo(() => filteredResources.filter(r => !r.isGeneral), [filteredResources]);

  // ── GESTIÓN DE RECURSOS (CRUD) ──
  const handleOpenUpload = (defaultDestination = 'general') => {
    setModalMode('create');
    setEditingResource(null);
    setTargetDestination(defaultDestination);
    setUploadMode('file');
    setFormTitle('');
    setFormType('file');
    setFormUrl('');
    setFormDescription('');
    setFormAllowDownload(false);
    setSelectedFile(null);
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const handleOpenEdit = (res) => {
    setModalMode('edit');
    setEditingResource(res);
    setTargetDestination(res.classId ? String(res.classId) : 'general');
    setUploadMode('link');
    setFormTitle(res.title || '');
    setFormType(res.resource_type || res.type || 'file');
    setFormUrl(res.url || '');
    setFormDescription(res.description || '');
    setFormAllowDownload(Boolean(res.allow_download));
    setSelectedFile(null);
    setModalError('');
    setModalSuccess('');
    setShowModal(true);
  };

  const handleSubmitResource = async (e) => {
    e.preventDefault();
    setModalError('');
    setModalSuccess('');

    if (modalMode === 'edit') {
      if (!formTitle.trim()) {
        setModalError('Por favor ingresa un título para el recurso.');
        return;
      }
      if (!formUrl.trim()) {
        setModalError('Por favor proporciona la URL del recurso.');
        return;
      }

      try {
        setIsSubmitting(true);
        const targetClassId = targetDestination === 'general' ? null : targetDestination;
        const updatePayload = {
          title: formTitle.trim(),
          resource_type: formType,
          url: formUrl.trim(),
          description: formDescription ? formDescription.trim() : null,
          class_id: targetClassId,
          program_id: cleanProgramId,
          allow_download: formAllowDownload
        };

        const { error } = await supabase
          .from('resources')
          .update(updatePayload)
          .eq('id', editingResource.id);

        if (error) {
          if (error.message?.includes('allow_download')) {
            console.warn('Columna allow_download no existe aún, actualizando sin ella...');
            delete updatePayload.allow_download;
            const retry = await supabase.from('resources').update(updatePayload).eq('id', editingResource.id);
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }

        setModalSuccess('Material actualizado correctamente.');
        await fetchTeacherResources();
        if (onRefresh) onRefresh();
        setTimeout(() => setShowModal(false), 1200);
      } catch (err) {
        console.error('Error actualizando recurso:', err);
        setModalError(err.message || 'Error al actualizar el recurso.');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // MODO CREACIÓN:
    if (uploadMode === 'file') {
      if (!selectedFile) {
        setModalError('Por favor selecciona un archivo PDF o documento para subir a Google Drive.');
        return;
      }

      try {
        setIsSubmitting(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('programId', cleanProgramId);
        formData.append('classId', targetDestination === 'general' ? 'general' : targetDestination);
        formData.append('resourceType', formType === 'presentation' ? 'presentation' : 'file');
        formData.append('allowDownload', String(formAllowDownload));
        if (formTitle.trim()) {
          formData.append('customTitle', formTitle.trim());
        }

        const { data, error } = await supabase.functions.invoke('upload-pdf-drive', {
          body: formData,
        });

        if (error) {
          let msg = error.message;
          try {
            if (error.context && typeof error.context.json === 'function') {
              const body = await error.context.json();
              if (body?.error) msg = body.error;
            }
          } catch (_) {}
          throw new Error(msg);
        }

        if (data?.error) throw new Error(data.error);

        if (data?.resource?.id) {
          const updatePayload = { allow_download: formAllowDownload };
          if (formDescription) updatePayload.description = formDescription.trim();
          const { error: upErr } = await supabase.from('resources').update(updatePayload).eq('id', data.resource.id);
          if (upErr && upErr.message?.includes('allow_download') && formDescription) {
            await supabase.from('resources').update({ description: formDescription.trim() }).eq('id', data.resource.id);
          }
        }

        setModalSuccess(`✓ Archivo subido con éxito a Google Drive: "${data.formattedFileName || selectedFile.name}"`);
        await fetchTeacherResources();
        if (onRefresh) onRefresh();
        setTimeout(() => setShowModal(false), 1400);
      } catch (err) {
        console.error('Error subiendo a Google Drive:', err);
        setModalError('Error al subir a Google Drive: ' + (err.message || String(err)));
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!formTitle.trim()) {
        setModalError('Por favor ingresa un título para el recurso.');
        return;
      }
      if (!formUrl.trim()) {
        setModalError('Por favor proporciona la URL o enlace web.');
        return;
      }

      try {
        setIsSubmitting(true);
        const urlLower = formUrl.toLowerCase();
        let provider = 'external';
        if (urlLower.includes('drive.google.com')) provider = 'drive';
        else if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be')) provider = 'youtube';
        else if (urlLower.includes('supabase.co')) provider = 'supabase';

        const targetClassId = targetDestination === 'general' ? null : targetDestination;
        const insertPayload = {
          title: formTitle.trim(),
          resource_type: formType,
          url: formUrl.trim(),
          description: formDescription ? formDescription.trim() : null,
          class_id: targetClassId,
          program_id: cleanProgramId,
          provider: provider,
          is_visible: true,
          allow_download: formAllowDownload
        };

        const { error } = await supabase
          .from('resources')
          .insert([insertPayload]);

        if (error) {
          if (error.message?.includes('allow_download')) {
            console.warn('Columna allow_download no existe aún, guardando sin ella...');
            delete insertPayload.allow_download;
            const retry = await supabase.from('resources').insert([insertPayload]);
            if (retry.error) throw retry.error;
          } else {
            throw error;
          }
        }

        setModalSuccess('Material añadido exitosamente.');
        await fetchTeacherResources();
        if (onRefresh) onRefresh();
        setTimeout(() => setShowModal(false), 1200);
      } catch (err) {
        console.error('Error guardando enlace:', err);
        setModalError(err.message || 'Error al guardar el recurso.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleDeleteResource = async (res) => {
    const isDrive = res.provider === 'drive' || res.url?.includes('drive.google.com');
    const confirmMsg = isDrive
      ? `¿Eliminar permanentemente "${res.title}"? También se eliminará el archivo en Google Drive.`
      : `¿Estás seguro de eliminar el recurso "${res.title}"?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      if (isDrive && res.url) {
        try {
          await supabase.functions.invoke('upload-pdf-drive', {
            body: {
              action: 'delete',
              fileUrl: res.url,
              resourceId: res.id,
              classId: res.classId,
              clearPresentation: res.resource_type === 'presentation'
            }
          });
        } catch (driveErr) {
          console.warn('Aviso al eliminar de Google Drive:', driveErr);
        }
      }

      const { error } = await supabase.from('resources').delete().eq('id', res.id);
      if (error) throw error;

      await fetchTeacherResources();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error eliminando recurso:', err);
      alert('Error al eliminar el recurso: ' + err.message);
    }
  };

  const handleToggleVisibility = async (res) => {
    try {
      const nextVis = !(res.is_visible !== false);
      const { error } = await supabase
        .from('resources')
        .update({ is_visible: nextVis })
        .eq('id', res.id);
      if (error) throw error;
      await fetchTeacherResources();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error cambiando visibilidad:', err);
      alert('Error cambiando visibilidad: ' + err.message);
    }
  };

  const handleToggleAllowDownload = async (res) => {
    try {
      const nextAllow = !(res.allow_download ?? false);
      const { error } = await supabase
        .from('resources')
        .update({ allow_download: nextAllow })
        .eq('id', res.id);

      if (error) {
        if (error.message?.includes('allow_download')) {
          alert('Para alternar descargas, ejecuta la migración SQL en Supabase:\nALTER TABLE resources ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT false;');
          return;
        }
        throw error;
      }
      await fetchTeacherResources();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Error cambiando permiso de descarga:', err);
      alert('Error cambiando permiso de descarga: ' + err.message);
    }
  };

  // ── HELPERS DE RENDERIZADO VISUAL (ESTILO ESTUDIANTES) ──
  const getResourceMeta = (res) => {
    const resType = res.resource_type || res.type || 'file';
    switch (resType) {
      case 'presentation':
        return { label: 'Presentación', bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' };
      case 'file':
      case 'pdf':
      case 'document':
        return { label: 'Lectura / PDF', bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      case 'link':
        return { label: 'Enlace', bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' };
      case 'code':
        return { label: 'Código', bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' };
      case 'video':
        return { label: 'Grabación', bg: '#FEE2E2', text: '#991B1B', border: '#FECACA' };
      default:
        return { label: 'Material', bg: '#F1F5F9', text: '#334155', border: '#E2E8F0' };
    }
  };

  const getFormatTag = (res) => {
    const resType = res.resource_type || res.type;
    const url = res.url || '';
    if (url.includes('.pdf')) return 'PDF';
    if (url.includes('.ppt') || url.includes('.pptx')) return 'PPT';
    if (url.includes('.doc') || url.includes('.docx')) return 'DOC';
    if (url.includes('.zip') || url.includes('.rar')) return 'ZIP';
    if (res.title) {
      const m = res.title.match(/\.([a-zA-Z0-9]{2,4})$/);
      if (m) {
        const ext = m[1].toUpperCase();
        if (ext.length <= 4) return ext;
      }
    }
    switch (resType) {
      case 'presentation': return 'PPT';
      case 'file':
      case 'pdf':
      case 'document': return 'PDF';
      case 'link': return 'LINK';
      case 'code': return 'CODE';
      case 'video': return 'VIDEO';
      default: return 'FILE';
    }
  };

  // 1. VISTA EN LISTA (POR DEFECTO, LIMPIA Y ELEGANTE)
  const renderResourceListItem = (res) => {
    const isDrive = res.provider === 'drive' || res.url?.includes('drive.google.com');
    const meta = getResourceMeta(res);
    const resType = res.resource_type || res.type || 'file';
    const isHidden = res.is_visible === false;
    const formatTag = getFormatTag(res);

    return (
      <div
        key={res.id}
        style={{
          background: isHidden ? '#F8FAFC' : '#FFFFFF',
          borderRadius: '12px',
          border: isHidden ? '1.5px dashed #CBD5E1' : '1.5px solid #E2E8F0',
          borderLeft: '5px solid var(--gold, #FCA311)',
          padding: '0.9rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: isHidden ? 'none' : '0 1px 4px rgba(20,33,61,0.03)',
          transition: 'all 0.15s ease',
          opacity: isHidden ? 0.8 : 1,
          width: '100%',
          boxSizing: 'border-box',
          minWidth: 0,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}
        onMouseOver={e => {
          if (!isHidden) {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.boxShadow = '0 3px 10px rgba(20,33,61,0.06)';
            e.currentTarget.style.borderTopColor = '#CBD5E1';
            e.currentTarget.style.borderRightColor = '#CBD5E1';
            e.currentTarget.style.borderBottomColor = '#CBD5E1';
            e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
          }
        }}
        onMouseOut={e => {
          if (!isHidden) {
            e.currentTarget.style.background = '#FFFFFF';
            e.currentTarget.style.boxShadow = '0 1px 4px rgba(20,33,61,0.03)';
            e.currentTarget.style.borderTopColor = '#E2E8F0';
            e.currentTarget.style.borderRightColor = '#E2E8F0';
            e.currentTarget.style.borderBottomColor = '#E2E8F0';
            e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
          }
        }}
      >
        {/* LADO IZQUIERDO: ÍCONO + INFO PRINCIPAL */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.85rem',
          minWidth: 0,
          flex: '1 1 260px',
          maxWidth: '100%',
          overflow: 'hidden'
        }}>
          <div
            style={{
              width: '44px',
              minHeight: '46px',
              borderRadius: '9px',
              background: meta.bg,
              border: `1.5px solid ${meta.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '1px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              padding: '3px 4px'
            }}
            title={meta.label}
          >
            {getResourceIcon(resType, 18)}
            <span style={{
              fontSize: '0.56rem',
              fontWeight: 800,
              color: meta.text,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              lineHeight: 1,
              marginTop: '2px'
            }}>
              {formatTag}
            </span>
          </div>

          <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
            <div style={{ minWidth: 0, width: '100%', overflow: 'hidden' }}>
              <span
                title={res.title}
                style={{
                  fontWeight: 700,
                  fontSize: '0.94rem',
                  lineHeight: 1.35,
                  color: 'var(--navy, #14213D)',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere'
                }}
              >
                {res.title}
              </span>
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              flexWrap: 'wrap',
              marginTop: '0.35rem',
              minWidth: 0
            }}>
              {/* Badge de Clase si aplica */}
              {!res.isGeneral && (res.sessionTitle || res.classTitle) ? (
                <Link
                  to={`/class/${res.classId}`}
                  title={`Ir a la clase: ${res.classTitle || res.sessionTitle}`}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '6px',
                    background: '#F1F5F9',
                    color: 'var(--navy, #14213D)',
                    border: '1px solid #CBD5E1',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '3px',
                    maxWidth: '240px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'var(--navy, #14213D)';
                    e.currentTarget.style.color = '#FFFFFF';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#F1F5F9';
                    e.currentTarget.style.color = 'var(--navy, #14213D)';
                  }}
                >
                  <Video size={10} color="var(--gold, #FCA311)" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {formatSessionAndClass(res.sessionTitle, res.classTitle)}
                  </span>
                </Link>
              ) : null}

              {/* Badge de permiso de descarga */}
              {!res.allow_download && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  padding: '1px 6px',
                  borderRadius: '5px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0
                }}>
                  <Lock size={9} /> Solo lectura
                </span>
              )}

              {/* Badge de oculto */}
              {isHidden && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '5px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '2px',
                  flexShrink: 0
                }}>
                  <EyeOff size={9} /> Oculto
                </span>
              )}

              {res.description && (
                <span style={{
                  fontSize: '0.74rem',
                  color: '#64748B',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '320px'
                }}>
                  • {res.description}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* LADO DERECHO: ACCIONES Y GESTIÓN DOCENTE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          flexShrink: 0,
          flexWrap: 'wrap'
        }}>
          {/* Botón Ver */}
          <button
            type="button"
            onClick={() => {
              if (isDrive) {
                setSelectedDoc(res);
              } else {
                window.open(res.url, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{
              background: 'var(--navy, #14213D)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '7px',
              padding: '0.42rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: '0 1px 4px rgba(20,33,61,0.12)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0F172A'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--navy, #14213D)'}
          >
            <Eye size={13} color="var(--gold, #FCA311)" />
            <span>Ver</span>
          </button>

          {/* Botón Descargar (si permitido) */}
          {res.allow_download && res.url && (
            <button
              type="button"
              onClick={() => triggerResourceDownload(res.url, res.title)}
              title="Descargar material a tu equipo"
              style={{
                background: 'var(--gold, #FCA311)',
                color: 'var(--navy, #14213D)',
                border: 'none',
                borderRadius: '7px',
                padding: '0.42rem 0.55rem',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 1px 4px rgba(252,163,17,0.2)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--gold-dark, #B45309)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--gold, #FCA311)'}
            >
              <Download size={14} />
            </button>
          )}

          {/* Enlace directo a la clase si aplica */}
          {!res.isGeneral && res.classId && (
            <Link
              to={`/class/${res.classId}`}
              title="Ir a la clase"
              style={{
                background: '#F8FAFC',
                color: 'var(--navy, #14213D)',
                border: '1px solid #CBD5E1',
                borderRadius: '7px',
                padding: '0.42rem 0.65rem',
                fontSize: '0.78rem',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => {
                e.currentTarget.style.background = '#F1F5F9';
                e.currentTarget.style.borderColor = '#94A3B8';
              }}
              onMouseOut={e => {
                e.currentTarget.style.background = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
              }}
            >
              <Video size={12} color="var(--gold-dark, #B45309)" />
              <span>Clase</span>
            </Link>
          )}

          {/* Herramientas de Gestión Docente */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderLeft: '1px solid #E2E8F0', paddingLeft: '0.45rem', marginLeft: '0.2rem' }}>
            <button
              type="button"
              onClick={() => handleToggleAllowDownload(res)}
              title={res.allow_download ? 'Descarga permitida (Clic para bloquear a estudiantes)' : 'Descarga bloqueada (Clic para permitir descarga)'}
              style={{
                background: res.allow_download ? '#DCFCE7' : '#F1F5F9',
                color: res.allow_download ? '#15803D' : '#64748B',
                border: `1px solid ${res.allow_download ? '#86EFAC' : '#E2E8F0'}`,
                borderRadius: '7px',
                padding: '0.42rem 0.48rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Download size={13} />
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility(res)}
              title={res.is_visible !== false ? 'Ocultar a estudiantes' : 'Mostrar a estudiantes'}
              style={{
                background: res.is_visible !== false ? '#F1F5F9' : '#FEF3C7',
                color: res.is_visible !== false ? '#64748B' : '#B45309',
                border: '1px solid #E2E8F0',
                borderRadius: '7px',
                padding: '0.42rem 0.48rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {res.is_visible !== false ? <Eye size={13} /> : <EyeOff size={13} />}
            </button>

            <button
              type="button"
              onClick={() => handleOpenEdit(res)}
              title="Editar material"
              style={{
                background: '#F1F5F9',
                color: 'var(--navy, #14213D)',
                border: '1px solid #E2E8F0',
                borderRadius: '7px',
                padding: '0.42rem 0.48rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit3 size={13} />
            </button>

            <button
              type="button"
              onClick={() => handleDeleteResource(res)}
              title="Eliminar material"
              style={{
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '7px',
                padding: '0.42rem 0.48rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 2. VISTA EN BLOQUES (CUADRÍCULA)
  const renderResourceCard = (res) => {
    const isDrive = res.provider === 'drive' || res.url?.includes('drive.google.com');
    const meta = getResourceMeta(res);
    const resType = res.resource_type || res.type || 'file';
    const isHidden = res.is_visible === false;
    const formatTag = getFormatTag(res);

    return (
      <div
        key={res.id}
        style={{
          background: isHidden ? '#F8FAFC' : '#FFFFFF',
          borderRadius: '14px',
          border: isHidden ? '1.5px dashed #CBD5E1' : '1.5px solid #E2E8F0',
          borderLeft: '5px solid var(--gold, #FCA311)',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: isHidden ? 'none' : '0 2px 8px rgba(20,33,61,0.04)',
          transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          opacity: isHidden ? 0.8 : 1
        }}
        onMouseOver={e => {
          if (!isHidden) {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 10px 24px rgba(252, 163, 17, 0.12)';
            e.currentTarget.style.borderTopColor = '#CBD5E1';
            e.currentTarget.style.borderRightColor = '#CBD5E1';
            e.currentTarget.style.borderBottomColor = '#CBD5E1';
            e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
          }
        }}
        onMouseOut={e => {
          if (!isHidden) {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 2px 8px rgba(20,33,61,0.04)';
            e.currentTarget.style.borderTopColor = '#E2E8F0';
            e.currentTarget.style.borderRightColor = '#E2E8F0';
            e.currentTarget.style.borderBottomColor = '#E2E8F0';
            e.currentTarget.style.borderLeftColor = 'var(--gold, #FCA311)';
          }
        }}
      >
        <div>
          {/* Encabezado de tarjeta */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.85rem',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }}>
            {!res.isGeneral && res.classId ? (
              <Link
                to={`/class/${res.classId}`}
                title={res.sessionTitle ? `${res.sessionTitle} — ${res.classTitle}` : `Ir a la clase: ${res.classTitle}`}
                style={{
                  background: 'linear-gradient(135deg, rgba(20,33,61,0.07) 0%, rgba(20,33,61,0.03) 100%)',
                  color: 'var(--navy, #14213D)',
                  borderRadius: '8px',
                  padding: '0.3rem 0.65rem',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  border: '1px solid rgba(20,33,61,0.12)',
                  maxWidth: '72%'
                }}
              >
                <Video size={13} color="var(--gold, #FCA311)" />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {formatSessionAndClass(res.sessionTitle, res.classTitle)}
                </span>
              </Link>
            ) : <div />}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {!res.allow_download && (
                <span style={{
                  fontSize: '0.66rem',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: '#F1F5F9',
                  color: '#64748B',
                  border: '1px solid #E2E8F0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}>
                  <Lock size={10} /> Solo lectura
                </span>
              )}
              {isHidden && (
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: '#FEE2E2',
                  color: '#DC2626',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <EyeOff size={11} /> Oculto
                </span>
              )}
            </div>
          </div>

          {/* Cuerpo */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
            <div
              style={{
                width: '46px',
                minHeight: '48px',
                borderRadius: '10px',
                background: meta.bg,
                border: `1.5px solid ${meta.border}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '2px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                padding: '3px 4px'
              }}
              title={meta.label}
            >
              {getResourceIcon(resType, 18)}
              <span style={{
                fontSize: '0.56rem',
                fontWeight: 800,
                color: meta.text,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
                marginTop: '2px'
              }}>
                {formatTag}
              </span>
            </div>

            <div style={{ minWidth: 0, flex: 1, overflow: 'hidden' }}>
              <h3 style={{
                fontSize: '0.98rem',
                fontWeight: 700,
                color: 'var(--navy, #14213D)',
                margin: '0 0 0.35rem 0',
                lineHeight: 1.35,
                wordBreak: 'break-word',
                overflowWrap: 'anywhere'
              }}>
                {res.title}
              </h3>

              {res.description && (
                <p style={{
                  fontSize: '0.82rem',
                  color: 'var(--text-muted, #64748B)',
                  margin: '0 0 0.5rem 0',
                  lineHeight: 1.45,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden'
                }}>
                  {res.description}
                </p>
              )}

              {!res.isGeneral && (res.sessionTitle || res.classDate) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', fontSize: '0.74rem', color: '#64748B', marginTop: '0.35rem' }}>
                  {res.sessionTitle && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Layers size={11} color="#94A3B8" /> {res.sessionTitle}
                    </span>
                  )}
                  {res.classDate && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Calendar size={11} color="#94A3B8" /> {new Date(res.classDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Acciones */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
          paddingTop: '0.85rem',
          borderTop: '1px solid #F1F5F9',
          flexWrap: 'wrap'
        }}>
          <button
            type="button"
            onClick={() => {
              if (isDrive) {
                setSelectedDoc(res);
              } else {
                window.open(res.url, '_blank', 'noopener,noreferrer');
              }
            }}
            style={{
              flex: '1 1 auto',
              background: 'var(--navy, #14213D)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '8px',
              padding: '0.55rem 0.95rem',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(20,33,61,0.15)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#0F172A'}
            onMouseOut={e => e.currentTarget.style.background = 'var(--navy, #14213D)'}
          >
            <Eye size={14} color="var(--gold, #FCA311)" />
            <span>{isDrive ? 'Ver Material' : 'Abrir Enlace'}</span>
          </button>

          {res.allow_download && (
            <button
              type="button"
              onClick={() => triggerResourceDownload(res.url, res.title)}
              title="Descargar material a tu equipo"
              style={{
                background: 'var(--gold, #FCA311)',
                color: 'var(--navy, #14213D)',
                border: 'none',
                borderRadius: '8px',
                padding: '0.55rem 0.75rem',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(252,163,17,0.25)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'var(--gold-dark, #B45309)'}
              onMouseOut={e => e.currentTarget.style.background = 'var(--gold, #FCA311)'}
            >
              <Download size={15} />
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={() => handleToggleAllowDownload(res)}
              title={res.allow_download ? 'Descarga permitida (Clic para bloquear)' : 'Descarga bloqueada (Clic para permitir)'}
              style={{
                background: res.allow_download ? '#DCFCE7' : '#F1F5F9',
                color: res.allow_download ? '#15803D' : '#64748B',
                border: `1px solid ${res.allow_download ? '#86EFAC' : '#E2E8F0'}`,
                borderRadius: '8px',
                padding: '0.52rem 0.6rem',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
            </button>

            <button
              type="button"
              onClick={() => handleToggleVisibility(res)}
              title={res.is_visible !== false ? 'Ocultar a estudiantes' : 'Mostrar a estudiantes'}
              style={{
                background: res.is_visible !== false ? '#F1F5F9' : '#FEF3C7',
                color: res.is_visible !== false ? '#64748B' : '#B45309',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.52rem 0.6rem',
                cursor: 'pointer'
              }}
            >
              {res.is_visible !== false ? <Eye size={14} /> : <EyeOff size={14} />}
            </button>

            <button
              type="button"
              onClick={() => handleOpenEdit(res)}
              title="Editar material"
              style={{
                background: '#F1F5F9',
                color: 'var(--navy, #14213D)',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '0.52rem 0.6rem',
                cursor: 'pointer'
              }}
            >
              <Edit3 size={14} />
            </button>

            <button
              type="button"
              onClick={() => handleDeleteResource(res)}
              title="Eliminar material"
              style={{
                background: '#FEE2E2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '0.52rem 0.6rem',
                cursor: 'pointer'
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ animation: 'fadeSlideUp 0.3s ease-out' }}>

      {/* ── ENCABEZADO DE PESTAÑA ELEGANTE ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        padding: '1.4rem 1.75rem',
        border: '1px solid #E2E8F0',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 1px 3px rgba(20, 33, 61, 0.03)'
      }}>
        <div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--navy, #14213D)', margin: 0, letterSpacing: '-0.01em' }}>
            Material y Contenido del Curso
          </h2>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.86rem', margin: '4px 0 0 0' }}>
            Organiza guías docentes, presentaciones de clase, lecturas PDF y enlaces de estudio para tus estudiantes.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={fetchTeacherResources}
            title="Actualizar lista de recursos"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              background: '#FFFFFF',
              color: 'var(--navy, #14213D)',
              fontSize: '0.82rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--gold, #FCA311)';
              e.currentTarget.style.background = '#F8FAFC';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <RefreshCw size={14} /> <span>Actualizar</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenUpload('general')}
            style={{
              background: 'var(--gold, #FCA311)',
              color: 'var(--navy, #14213D)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.84rem',
              padding: '0.55rem 1.15rem',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              boxShadow: '0 2px 6px rgba(252, 163, 17, 0.25)',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => { e.currentTarget.style.background = '#e8960a'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={e => { e.currentTarget.style.background = 'var(--gold, #FCA311)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Plus size={16} />
            <span>+ Subir Contenido</span>
          </button>

          <Link
            to={`/resources/${cleanProgramId}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir la vista de recursos tal como la ven los estudiantes"
            style={{
              fontSize: '0.82rem',
              padding: '0.55rem 0.95rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: '#FFFFFF',
              border: '1px solid #CBD5E1',
              color: 'var(--navy, #14213D)',
              borderRadius: '8px',
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={e => {
              e.currentTarget.style.borderColor = 'var(--gold, #FCA311)';
              e.currentTarget.style.background = '#F8FAFC';
            }}
            onMouseOut={e => {
              e.currentTarget.style.borderColor = '#CBD5E1';
              e.currentTarget.style.background = '#FFFFFF';
            }}
          >
            <Eye size={14} />
            <span>Vista Estudiantes</span>
          </Link>
        </div>
      </div>

      {/* ── BARRA DE BÚSQUEDA Y FILTROS ESTILO ESTUDIANTES ── */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: '14px',
        padding: '1.25rem 1.4rem',
        border: '1.5px solid #E2E8F0',
        marginBottom: '2rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        boxShadow: '0 4px 14px rgba(20,33,61,0.03)'
      }}>
        {/* FILA SUPERIOR: BUSCADOR + SELECTOR DE ÁMBITO / SESIÓN */}
        <div style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 300px', minWidth: '240px' }}>
            <Search size={16} color="var(--navy, #14213D)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.6 }} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar por material, guía, tema o clase..."
              style={{
                width: '100%',
                padding: '0.7rem 2.2rem 0.7rem 2.5rem',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.88rem',
                outline: 'none',
                background: '#FAFBFD',
                transition: 'all 0.15s ease'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--gold, #FCA311)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252, 163, 17, 0.18)';
                e.currentTarget.style.background = '#FFFFFF';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.background = '#FAFBFD';
              }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: '#F1F5F9', border: 'none', cursor: 'pointer', color: '#64748B',
                  borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div style={{ flex: '0 1 340px', minWidth: '240px' }}>
            <select
              value={sessionFilter}
              onChange={e => setSessionFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '10px',
                border: '1.5px solid #CBD5E1',
                fontSize: '0.86rem',
                background: '#FAFBFD',
                color: 'var(--navy, #14213D)',
                fontWeight: 600,
                outline: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onFocus={e => {
                e.currentTarget.style.borderColor = 'var(--gold, #FCA311)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(252, 163, 17, 0.18)';
              }}
              onBlur={e => {
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <option value="all">Todo el Material ({resources.length})</option>
              <option value="general">Contenido General del Curso ({generalResources.length})</option>
              {sessionsList.length > 0 && (
                <optgroup label="Filtrar por Sesión">
                  {sessionsList.map(s => {
                    const count = resources.filter(r => r.sessionId === s.id || (s.classIds && s.classIds.has(r.classId))).length;
                    return (
                      <option key={s.id} value={s.id}>
                        {s.title} ({count} {count === 1 ? 'material' : 'materiales'})
                      </option>
                    );
                  })}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        {/* FILA INFERIOR: FILTROS TIPO PILL + SELECTOR DE VISTA (LISTA / BLOQUES) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Todos', count: counts.all },
              { id: 'presentation', label: 'Presentaciones', count: counts.presentation },
              { id: 'file', label: 'Lecturas / PDF', count: counts.file },
              { id: 'link', label: 'Enlaces', count: counts.link },
              { id: 'code', label: 'Código / Repos', count: counts.code },
            ].map(f => {
              const isSelected = typeFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTypeFilter(f.id)}
                  style={{
                    border: isSelected ? '1px solid var(--navy, #14213D)' : '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '0.42rem 0.9rem',
                    fontSize: '0.82rem',
                    fontWeight: isSelected ? 700 : 500,
                    background: isSelected ? 'var(--navy, #14213D)' : '#F8FAFC',
                    color: isSelected ? '#FFFFFF' : 'var(--navy, #14213D)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: isSelected ? '0 2px 6px rgba(20,33,61,0.18)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#F1F5F9';
                      e.currentTarget.style.borderColor = '#CBD5E1';
                    }
                  }}
                  onMouseOut={e => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#F8FAFC';
                      e.currentTarget.style.borderColor = '#E2E8F0';
                    }
                  }}
                >
                  <span>{f.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 7px',
                    borderRadius: '9999px',
                    background: isSelected ? 'rgba(252,163,17,0.3)' : '#E2E8F0',
                    color: isSelected ? 'var(--gold, #FCA311)' : '#64748B',
                    fontWeight: 700
                  }}>
                    {f.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* SELECTOR DE VISTA: LISTA (DEFAULT) / BLOQUES */}
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              background: '#F1F5F9',
              padding: '3px',
              borderRadius: '9px',
              border: '1px solid #E2E8F0'
            }}>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                title="Vista en Lista (Limpia y compacta)"
                style={{
                  border: 'none',
                  background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'list' ? 'var(--navy, #14213D)' : '#64748B',
                  borderRadius: '7px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: viewMode === 'list' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <List size={14} />
                <span>Lista</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Vista en Bloques / Cuadrícula"
                style={{
                  border: 'none',
                  background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--navy, #14213D)' : '#64748B',
                  borderRadius: '7px',
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem',
                  fontWeight: viewMode === 'grid' ? 700 : 500,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <LayoutGrid size={14} />
                <span>Bloques</span>
              </button>
            </div>

            <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
              Mostrando <strong style={{ color: 'var(--navy, #14213D)' }}>{filteredResources.length}</strong> de {resources.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── CONTENIDO PRINCIPAL ORGANIZADO EN 2 SECCIONES ── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '3.5rem', color: '#64748B' }}>
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.65rem' }} />
          <div>Cargando materiales del curso...</div>
        </div>
      ) : filteredResources.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '3.5rem 1.5rem',
          background: '#FFFFFF',
          borderRadius: '16px',
          border: '1px dashed #CBD5E1',
          boxShadow: '0 1px 3px rgba(20,33,61,0.02)'
        }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#F1F5F9', display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 1rem', color: '#94A3B8'
          }}>
            <Paperclip size={26} />
          </div>
          <h3 style={{ color: 'var(--navy, #14213D)', margin: '0 0 0.4rem 0', fontWeight: 700, fontSize: '1.15rem' }}>
            {resources.length === 0 ? 'No hay recursos cargados aún' : 'No se encontraron recursos con los filtros aplicados'}
          </h3>
          <p style={{ color: 'var(--text-muted, #64748B)', fontSize: '0.88rem', margin: 0, maxWidth: '460px', marginInline: 'auto' }}>
            {resources.length === 0
              ? 'Sube las guías generales, presentaciones de clase y lecturas transversales para los estudiantes.'
              : 'Prueba buscando con otro término o seleccionando otra categoría o sesión en los filtros superiores.'
            }
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', marginTop: '1.25rem' }}>
            {(searchQuery || typeFilter !== 'all' || sessionFilter !== 'all') && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setTypeFilter('all'); setSessionFilter('all'); }}
                className="btn btn-outline"
                style={{ fontSize: '0.8rem', padding: '0.45rem 1rem' }}
              >
                Restablecer filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => handleOpenUpload('general')}
              className="btn btn-primary"
              style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Plus size={14} /> Subir Material General
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>

          {/* ═════════════════════════════════════════════════════════════
              SECCIÓN 1: CONTENIDO GENERAL DEL CURSO (DESTACADO EN DORADO)
             ═════════════════════════════════════════════════════════════ */}
          {(sessionFilter === 'all' || sessionFilter === 'general') && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid rgba(252, 163, 17, 0.45)',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(252, 163, 17, 0.06)',
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
                paddingBottom: '0.85rem',
                borderBottom: '1.5px solid rgba(252, 163, 17, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--gold, #FCA311) 0%, #D97706 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14213D',
                    boxShadow: '0 3px 10px rgba(252, 163, 17, 0.35)'
                  }}>
                    <FolderDown size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: 'var(--navy, #14213D)' }}>
                      Contenido General del Curso
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      Guías académicas, bibliografía general, enlaces a software y recursos transversales para todos los estudiantes.
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenUpload('general')}
                  style={{
                    background: 'rgba(252, 163, 17, 0.15)',
                    color: 'var(--gold-dark, #b45309)',
                    border: '1px solid rgba(252, 163, 17, 0.4)',
                    borderRadius: '8px',
                    padding: '0.4rem 0.95rem',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'rgba(252, 163, 17, 0.25)'}
                  onMouseOut={e => e.currentTarget.style.background = 'rgba(252, 163, 17, 0.15)'}
                >
                  <Plus size={14} />
                  <span>Agregar Material General</span>
                </button>
              </div>

              {filteredGeneral.length === 0 ? (
                <div style={{
                  padding: '1.75rem',
                  borderRadius: '12px',
                  background: '#FFFBEB',
                  border: '1px dashed #FDE68A',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <Info size={20} color="#D97706" />
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.88rem', color: '#92400E', fontWeight: 700 }}>
                        Aún no se ha publicado contenido general del curso
                      </h4>
                      <p style={{ margin: 0, fontSize: '0.8rem', color: '#B45309' }}>
                        Puedes subir guías de laboratorio, enlaces a software o documentos transversales aquí.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleOpenUpload('general')}
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                  >
                    <Plus size={13} /> Subir ahora
                  </button>
                </div>
              ) : viewMode === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {filteredGeneral.map(res => renderResourceListItem(res))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                  {filteredGeneral.map(res => renderResourceCard(res))}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════
              SECCIÓN 2: MATERIALES POR SESIÓN O CLASE (AZUL NAVY)
             ═════════════════════════════════════════════════════════════ */}
          {sessionFilter !== 'general' && (
            <div style={{
              background: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #CBD5E1',
              padding: '1.5rem',
              boxShadow: '0 4px 16px rgba(20, 33, 61, 0.04)',
              width: '100%',
              boxSizing: 'border-box',
              minWidth: 0,
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1.25rem',
                flexWrap: 'wrap',
                gap: '0.75rem',
                paddingBottom: '0.85rem',
                borderBottom: '1.5px solid #E2E8F0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{
                    width: '42px', height: '42px', borderRadius: '12px',
                    background: 'linear-gradient(135deg, var(--navy, #14213D) 0%, #1E3A8A 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF',
                    boxShadow: '0 3px 10px rgba(20, 33, 61, 0.25)'
                  }}>
                    <Layers size={22} />
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '1.24rem', fontWeight: 800, color: 'var(--navy, #14213D)' }}>
                      {sessionFilter !== 'all'
                        ? (sessionsList.find(s => String(s.id) === String(sessionFilter))?.title || 'Materiales de la Sesión')
                        : `Materiales por Sesión de Clase (${filteredClass.length})`}
                    </h2>
                    <span style={{ fontSize: '0.8rem', color: '#64748B' }}>
                      {sessionFilter !== 'all'
                        ? 'Presentaciones, lecturas y recursos asignados a esta sesión.'
                        : 'Presentaciones, lecturas y enlaces asociados a sesiones de clase específicas.'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (sessionFilter !== 'all' && sessionFilter !== 'general') {
                      const targetSession = sessionsList.find(s => String(s.id) === String(sessionFilter));
                      const firstClassId = targetSession?.classIds ? Array.from(targetSession.classIds)[0] : null;
                      handleOpenUpload(firstClassId || classesList[0]?.id || 'general');
                    } else {
                      handleOpenUpload(classesList[0]?.id || 'general');
                    }
                  }}
                  className="btn btn-outline"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Plus size={13} /> Subir Material a Clase
                </button>
              </div>

              {filteredClass.length === 0 ? (
                <div style={{
                  padding: '1.75rem',
                  borderRadius: '12px',
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  textAlign: 'center',
                  fontSize: '0.86rem',
                  color: '#64748B'
                }}>
                  No hay materiales asignados a clases en este momento. Haz clic en "Subir Material a Clase" para agregar uno.
                </div>
              ) : viewMode === 'list' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', width: '100%', minWidth: 0, overflow: 'hidden' }}>
                  {filteredClass.map(res => renderResourceListItem(res))}
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '1.25rem' }}>
                  {filteredClass.map(res => renderResourceCard(res))}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* ── MODAL DE SUBIDA / EDICIÓN (DOCENTE) ── */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
            animation: 'fadeSlideUp 0.2s ease-out'
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#FAFBFD'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  padding: '6px', borderRadius: '8px',
                  background: 'rgba(252, 163, 17, 0.15)',
                  color: 'var(--gold-dark, #b45309)'
                }}>
                  {modalMode === 'edit' ? <Edit3 size={18} /> : <Plus size={18} />}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy, #14213D)' }}>
                    {modalMode === 'edit' ? 'Editar Material' : 'Subir Contenido al Curso'}
                  </h3>
                  <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                    {targetDestination === 'general' ? 'Se publicará en Contenido General del Curso' : 'Se vinculará a la clase seleccionada'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitResource} style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {modalError && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#FEE2E2', border: '1px solid #FECACA', color: '#B91C1C', fontSize: '0.82rem' }}>
                  {modalError}
                </div>
              )}
              {modalSuccess && (
                <div style={{ padding: '0.75rem', borderRadius: '8px', background: '#DCFCE7', border: '1px solid #BBF7D0', color: '#15803D', fontSize: '0.82rem' }}>
                  {modalSuccess}
                </div>
              )}

              {/* DESTINO */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                  Destino del Material <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <select
                  value={targetDestination}
                  onChange={e => setTargetDestination(e.target.value)}
                  style={{
                    width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                    fontSize: '0.84rem', fontWeight: 600, background: targetDestination === 'general' ? '#FFFBEB' : '#FAFBFD',
                    color: 'var(--navy, #14213D)', outline: 'none'
                  }}
                >
                  <option value="general">Contenido General del Curso (Aplica a todo el programa)</option>
                  {(classesList || []).length > 0 && (
                    <optgroup label="Clases Específicas">
                      {classesList.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.sessionTitle ? `${c.sessionTitle} · ` : ''}{c.title}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              {/* MODO (CREACIÓN) */}
              {modalMode === 'create' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                    Método de Publicación
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setUploadMode('file')}
                      style={{
                        padding: '0.6rem', borderRadius: '8px',
                        border: uploadMode === 'file' ? '2px solid var(--gold, #FCA311)' : '1px solid #CBD5E1',
                        background: uploadMode === 'file' ? 'rgba(252, 163, 17, 0.08)' : '#FAFBFD',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                      }}
                    >
                      <Upload size={14} /> Subir PDF (Google Drive)
                    </button>
                    <button
                      type="button"
                      onClick={() => setUploadMode('link')}
                      style={{
                        padding: '0.6rem', borderRadius: '8px',
                        border: uploadMode === 'link' ? '2px solid var(--gold, #FCA311)' : '1px solid #CBD5E1',
                        background: uploadMode === 'link' ? 'rgba(252, 163, 17, 0.08)' : '#FAFBFD',
                        fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem'
                      }}
                    >
                      <LinkIcon size={14} /> Vincular Enlace Web
                    </button>
                  </div>
                </div>
              )}

              {/* CATEGORÍA */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                  Categoría
                </label>
                <select
                  value={formType}
                  onChange={e => setFormType(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', background: '#FAFBFD', outline: 'none' }}
                >
                  <option value="file">Documento / Lectura / Guía (PDF)</option>
                  <option value="presentation">Presentación / Diapositivas</option>
                  <option value="link">Enlace de Interés / Plataforma Externa</option>
                  <option value="code">Código / Repositorio / Software</option>
                </select>
              </div>

              {/* DROPZONE ARCHIVO */}
              {modalMode === 'create' && uploadMode === 'file' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                    Archivo PDF <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => {
                      e.preventDefault(); setIsDragOver(false);
                      const f = e.dataTransfer.files?.[0];
                      if (f) {
                        setSelectedFile(f);
                        if (!formTitle.trim()) setFormTitle(f.name.replace(/\.[^/.]+$/, ''));
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: isDragOver ? '2px dashed var(--gold, #FCA311)' : '2px dashed #CBD5E1',
                      background: isDragOver ? 'rgba(252, 163, 17, 0.05)' : '#F8FAFC',
                      borderRadius: '10px', padding: '1.4rem', textAlign: 'center', cursor: 'pointer'
                    }}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.zip"
                      style={{ display: 'none' }}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setSelectedFile(f);
                          if (!formTitle.trim()) setFormTitle(f.name.replace(/\.[^/.]+$/, ''));
                        }
                      }}
                    />
                    <Upload size={24} color={selectedFile ? 'var(--gold, #FCA311)' : '#94A3B8'} style={{ margin: '0 auto 0.4rem' }} />
                    {selectedFile ? (
                      <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy, #14213D)' }}>
                        {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.82rem', color: '#64748B' }}>
                        Haz clic o arrastra un archivo PDF aquí
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* TÍTULO */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                  Título del Material {uploadMode === 'link' && <span style={{ color: '#DC2626' }}>*</span>}
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder={uploadMode === 'file' ? 'Opcional (toma el nombre del archivo)' : 'Ej: Guía docente del curso, Enlace a Google Colab...'}
                  style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', background: '#FAFBFD' }}
                />
              </div>

              {/* URL */}
              {(modalMode === 'edit' || uploadMode === 'link') && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                    URL / Enlace Web <span style={{ color: '#DC2626' }}>*</span>
                  </label>
                  <input
                    type="url"
                    value={formUrl}
                    onChange={e => setFormUrl(e.target.value)}
                    placeholder="https://..."
                    style={{ width: '100%', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', background: '#FAFBFD' }}
                  />
                </div>
              )}

              {/* DESCRIPCIÓN */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy, #14213D)', marginBottom: '0.4rem' }}>
                  Descripción o Notas (Opcional)
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Instrucciones breves sobre cómo utilizar este material..."
                  style={{ width: '100%', padding: '0.55rem 0.85rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none', background: '#FAFBFD' }}
                />
              </div>

              {/* PERMISO DE DESCARGA (INTERRUPTOR DESLIZANTE) */}
              <div 
                onClick={() => setFormAllowDownload(!formAllowDownload)}
                style={{ 
                  background: formAllowDownload ? 'rgba(20, 33, 61, 0.03)' : '#F8FAFC', 
                  border: formAllowDownload ? '1.5px solid var(--navy, #14213D)' : '1px solid #E2E8F0', 
                  borderRadius: '10px', 
                  padding: '0.85rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  gap: '1rem', 
                  cursor: 'pointer', 
                  userSelect: 'none', 
                  transition: 'all 0.2s ease' 
                }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--navy, #14213D)' }}>
                      Habilitar descarga a estudiantes
                    </span>
                    {formAllowDownload ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#16A34A', background: '#DCFCE7', padding: '2px 8px', borderRadius: '6px' }}>
                        Descargable
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748B', background: '#E2E8F0', padding: '2px 8px', borderRadius: '6px' }}>
                        Solo lectura
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: '0.74rem', color: '#64748B' }}>
                    {formAllowDownload 
                      ? '✓ Los estudiantes podrán descargar este archivo directamente a su equipo.'
                      : '✗ Modo seguro: los estudiantes solo podrán visualizar el material en la plataforma sin descargarlo.'}
                  </p>
                </div>

                <div
                  role="switch"
                  aria-checked={formAllowDownload}
                  style={{
                    width: '44px',
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
                      transform: formAllowDownload ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.25s ease',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1rem' }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>{uploadMode === 'file' ? 'Subiendo a Drive...' : 'Guardando...'}</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{modalMode === 'edit' ? 'Guardar Cambios' : 'Publicar Material'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL VISOR PROTEGIDO ── */}
      {selectedDoc && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(5px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '1050px',
            height: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              padding: '0.85rem 1.25rem', borderBottom: '1px solid #E2E8F0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#FAFBFD'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--navy, #14213D)' }}>
                  {selectedDoc.title}
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#64748B' }}>
                  {selectedDoc.isGeneral ? 'Contenido General del Curso' : selectedDoc.classTitle}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => triggerResourceDownload(selectedDoc.url, selectedDoc.title)}
                  title="Descargar archivo en tu equipo"
                  style={{
                    background: 'var(--navy, #14213D)', color: '#FFFFFF', border: 'none',
                    borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.78rem',
                    fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                  }}
                >
                  <Download size={14} color="var(--gold, #FCA311)" />
                  <span>Descargar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  style={{ background: '#F1F5F9', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={17} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#0F172A' }}>
              <div 
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '65px',
                  height: '65px',
                  zIndex: 10,
                  background: 'transparent',
                  cursor: 'default'
                }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              />
              <iframe
                src={formatEmbedDocUrl(selectedDoc.url)}
                title={selectedDoc.title || 'Visor de Documento'}
                style={{ width: '100%', height: '100%', border: 'none' }}
                allow="autoplay"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
