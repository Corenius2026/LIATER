import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { updateDoubtStatus } from '../services/doubtService';
import { formatClassDate } from '../utils/dateUtils';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  BookOpen, Video, FileText, Megaphone, Presentation,
  Play, Plus, Upload, Link as LinkIcon, Clock, CheckCircle2,
  CalendarDays, Timer, ShieldAlert, Eye, Pencil, Trash2,
  AlertCircle, Info, Layers, X, User, MessageSquare, Users,
  Search, Filter, Check, Archive, RefreshCw, FileCheck,
  Sparkles, Bot, CheckCheck, XCircle, ChevronDown, ChevronUp,
  Edit3, EyeOff, Save, PlusCircle, ExternalLink, Download,
  ChevronLeft, ChevronRight, Award, GraduationCap, Percent,
  Calendar, FileSpreadsheet, Folder
} from 'lucide-react';

import './TeacherPanel.css';
import AdminClassReinforcement from '../components/AdminClassReinforcement';

const TeacherContext = React.createContext(null);
const useTeacherContext = () => React.useContext(TeacherContext);

/* ─────────────────────────────────────────
   MODAL DE DETALLE DE CLASE — CICLO 360°
   Fases: PRE-CLASE | GRABACIÓN | ACTIVIDAD IA
───────────────────────────────────────── */
function ClassDetailModal({ selectedClass, onClose, onClassUpdated }) {
  const [activeSection, setActiveSection] = useState('preclass'); // 'preclass' | 'recording' | 'activity'
  
  // — PRE-CLASE: Materiales —
  const [materials, setMaterials]         = useState([]);
  const [matLoading, setMatLoading]       = useState(true);
  const [matError, setMatError]           = useState('');
  const [editId, setEditId]               = useState(null);
  const [matTitle, setMatTitle]           = useState('');
  const [matType, setMatType]             = useState('presentation');
  const [matProvider, setMatProvider]     = useState('drive');
  const [matUrl, setMatUrl]               = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [activeForm, setActiveForm]       = useState(null); // 'presentation' | 'complementary' | null

  // — PRE-CLASE: Info de clase —
  const [classTitle, setClassTitle]       = useState(selectedClass?.title || '');
  const [classDesc, setClassDesc]         = useState(selectedClass?.description || '');
  const [classMeetUrl, setClassMeetUrl]   = useState(selectedClass?.meet_url || '');
  const [savingInfo, setSavingInfo]       = useState(false);
  const [infoMsg, setInfoMsg]             = useState('');

  // — GRABACIÓN —
  const [videoUrl, setVideoUrl]           = useState(selectedClass?.video_url || '');
  const [savingVideo, setSavingVideo]     = useState(false);
  const [videoMsg, setVideoMsg]           = useState('');

  // — ACTIVIDAD IA —
  const [draft, setDraft]                 = useState(null);
  const [draftLoading, setDraftLoading]   = useState(true);
  const [draftError, setDraftError]       = useState('');
  const [editingQuestions, setEditingQuestions] = useState(false);
  const [localQuestions, setLocalQuestions]     = useState([]);
  const [actionLoading, setActionLoading]       = useState(null);
  const [activityMsg, setActivityMsg]           = useState('');
  const [activityStats, setActivityStats]       = useState(null);

  const isPastClass = new Date(selectedClass?.class_date) < new Date();

  // Determina el estado de ciclo de vida de la clase
  const classStatus = (() => {
    const now = new Date();
    const classDate = new Date(selectedClass?.class_date);
    const diff = classDate - now;
    if (diff > 0 && diff < 60 * 60 * 1000) return 'live';   // próxima hora
    if (diff > 0) return 'upcoming';
    return 'completed';
  })();

  const STATUS_LABELS = {
    upcoming:  { label: 'Programada',  bg: 'rgba(20,33,61,0.08)',   color: '#14213D' },
    live:      { label: '🔴 EN VIVO',  bg: 'rgba(220,38,38,0.1)',   color: '#dc2626' },
    completed: { label: 'Finalizada',  bg: 'rgba(22,163,74,0.1)',   color: '#16a34a' },
  };
  const statusInfo = STATUS_LABELS[classStatus];

  // ── FETCH MATERIALES ──
  const fetchMaterials = async () => {
    setMatLoading(true);
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('class_id', selectedClass.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setMaterials(data || []);
    } catch (err) {
      setMatError(err.message);
    } finally {
      setMatLoading(false);
    }
  };

  // ── FETCH BORRADOR IA + STATS ──
  const fetchDraftAndStats = async () => {
    setDraftLoading(true);
    try {
      // Borrador IA para esta clase
      const { data: draftData } = await supabase
        .from('activity_drafts')
        .select('*')
        .eq('class_id', selectedClass.id)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDraft(draftData || null);
      if (draftData?.draft_data?.questions) {
        setLocalQuestions(draftData.draft_data.questions.map((q, i) => ({ ...q, _key: i })));
      }

      // Stats de la actividad publicada para esta clase
      const { data: actData } = await supabase
        .from('class_activities')
        .select('id, title, is_published')
        .eq('class_id', selectedClass.id)
        .maybeSingle();
      
      if (actData?.id) {
        try {
          const { count: totalResponses } = await supabase
            .from('activity_responses')
            .select('id', { count: 'exact', head: true })
            .eq('activity_id', actData.id);
          setActivityStats({ isPublished: actData.is_published, totalResponses: totalResponses || 0 });
        } catch {
          setActivityStats({ isPublished: actData.is_published, totalResponses: 0 });
        }
      }
    } catch (err) {
      setDraftError(err.message);
    } finally {
      setDraftLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      setClassTitle(selectedClass.title || '');
      setClassDesc(selectedClass.description || '');
      setClassMeetUrl(selectedClass.meet_url || '');
      setVideoUrl(selectedClass.video_url || '');
      fetchMaterials();
      fetchDraftAndStats();
    }
  }, [selectedClass?.id]);

  // ── GUARDAR INFO DE CLASE ──
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setSavingInfo(true);
    setInfoMsg('');
    try {
      const { error } = await supabase
        .from('class_sessions')
        .update({ title: classTitle.trim(), description: classDesc.trim(), meet_url: classMeetUrl.trim() || null })
        .eq('id', selectedClass.id);
      if (error) throw error;
      setInfoMsg('✓ Información actualizada correctamente.');
      if (onClassUpdated) onClassUpdated();
    } catch (err) {
      setInfoMsg('Error: ' + err.message);
    } finally {
      setSavingInfo(false);
    }
  };

  // ── GUARDAR GRABACIÓN ──
  const handleSaveVideo = async (e) => {
    e.preventDefault();
    setSavingVideo(true);
    setVideoMsg('');
    try {
      const { error } = await supabase
        .from('class_sessions')
        .update({ video_url: videoUrl.trim() || null })
        .eq('id', selectedClass.id);
      if (error) throw error;
      setVideoMsg('✓ Enlace de grabación guardado correctamente.');
      if (onClassUpdated) onClassUpdated();
    } catch (err) {
      setVideoMsg('Error: ' + err.message);
    } finally {
      setSavingVideo(false);
    }
  };

  // ── MATERIALES: Guardar recurso ──
  const handleCancelForm = () => {
    setEditId(null); setMatTitle(''); setMatType('presentation');
    setMatProvider('drive'); setMatUrl(''); setActiveForm(null); setMatError('');
  };

  const handleEditResource = (r) => {
    setEditId(r.id); setMatTitle(r.title); setMatType(r.resource_type);
    setMatProvider(r.provider || 'drive'); setMatUrl(r.url || '');
    setActiveForm(r.resource_type === 'presentation' ? 'presentation' : 'complementary');
    setMatError('');
  };

  const handleSubmitResource = async (e, sectionType) => {
    e.preventDefault();
    if (!matTitle.trim() || !matUrl.trim()) { setMatError('El título y el enlace son obligatorios.'); return; }
    setSubmitting(true); setMatError('');
    const targetType = sectionType === 'presentation' ? 'presentation' : (matType === 'presentation' ? 'file' : matType);
    const payload = { class_id: selectedClass.id, title: matTitle.trim(), resource_type: targetType, provider: matProvider, url: matUrl.trim(), is_visible: true };
    try {
      if (editId) {
        const { error } = await supabase.from('resources').update(payload).eq('id', editId).eq('class_id', selectedClass.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('resources').insert([payload]);
        if (error) throw error;
      }
      handleCancelForm(); await fetchMaterials();
    } catch (err) { setMatError('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleDeleteResource = async (id) => {
    try {
      const { error } = await supabase.from('resources').delete().eq('id', id).eq('class_id', selectedClass.id);
      if (error) throw error;
      await fetchMaterials();
    } catch (err) { setMatError('Error al eliminar: ' + err.message); }
  };

  // ── ACTIVIDAD IA: Publicar / Despublicar ──
  const syncAndPublish = async (draftData, classId) => {
    const { data: existing } = await supabase.from('class_activities').select('id').eq('class_id', classId).maybeSingle();
    let actId;
    if (existing) {
      const { data: updated, error } = await supabase.from('class_activities').update({ title: draftData.activity_title || 'Actividad de Reforzamiento', description: draftData.activity_description || '', is_published: true, max_attempts: 3 }).eq('id', existing.id).select('id').single();
      if (error) throw error;
      actId = updated.id;
      await supabase.from('activity_questions').delete().eq('activity_id', actId);
    } else {
      const { data: newAct, error } = await supabase.from('class_activities').insert({ class_id: classId, title: draftData.activity_title || 'Actividad de Reforzamiento', description: draftData.activity_description || '', is_published: true, max_attempts: 3, is_mandatory: false }).select('id').single();
      if (error) throw error;
      actId = newAct.id;
    }
    for (let qi = 0; qi < (draftData.questions || []).length; qi++) {
      const q = draftData.questions[qi];
      const { data: qData, error: qErr } = await supabase.from('activity_questions').insert({ activity_id: actId, text: q.text, question_type: q.question_type || 'single_choice', order_num: qi + 1 }).select('id').single();
      if (qErr) throw qErr;
      let correctOptId = null;
      for (let oi = 0; oi < (q.options || []).length; oi++) {
        const opt = q.options[oi];
        const { data: optData, error: optErr } = await supabase.from('question_options').insert({ question_id: qData.id, text: opt.text, order_num: oi + 1 }).select('id').single();
        if (optErr) throw optErr;
        if (opt.is_correct) correctOptId = optData.id;
      }
      if (correctOptId) {
        await supabase.from('question_correct_answers').upsert({ question_id: qData.id, correct_option_id: correctOptId }, { onConflict: 'question_id' });
      }
    }
  };

  const handlePublishActivity = async () => {
    if (!draft) return;
    setActionLoading('publishing');
    setActivityMsg('');
    try {
      const updatedDraftData = { ...draft.draft_data, questions: localQuestions };
      await syncAndPublish(updatedDraftData, selectedClass.id);
      await supabase.from('activity_drafts').update({ status: 'approved', reviewed_at: new Date().toISOString() }).eq('id', draft.id);
      setActivityMsg('✓ Actividad publicada correctamente. Los estudiantes ya pueden responderla.');
      await fetchDraftAndStats();
    } catch (err) {
      setActivityMsg('Error al publicar: ' + err.message);
    } finally { setActionLoading(null); }
  };

  const handleUnpublishActivity = async () => {
    setActionLoading('unpublishing');
    setActivityMsg('');
    try {
      await supabase.from('class_activities').update({ is_published: false }).eq('class_id', selectedClass.id);
      await supabase.from('activity_drafts').update({ status: 'pending' }).eq('id', draft?.id);
      setActivityMsg('Actividad despublicada. Los estudiantes ya no pueden verla.');
      await fetchDraftAndStats();
    } catch (err) {
      setActivityMsg('Error: ' + err.message);
    } finally { setActionLoading(null); }
  };

  const presentations = materials.filter(m => m.resource_type === 'presentation');
  const complementary = materials.filter(m => m.resource_type !== 'presentation');

  const SECTIONS = [
    { id: 'preclass',   label: 'Pre-Clase',    icon: <Presentation size={15} /> },
    { id: 'recording',  label: 'Grabación',    icon: <Video size={15} /> },
    { id: 'activity',   label: 'Actividad IA', icon: <Sparkles size={15} />,
      badge: draft && draft.status === 'pending' ? '!' : null },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(20,33,61,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem', backdropFilter: 'blur(6px)' }}>
      <div style={{ width: '100%', maxWidth: '860px', maxHeight: '92vh', overflowY: 'auto', background: '#FFFFFF', borderRadius: '14px', boxShadow: '0 24px 60px rgba(20,33,61,0.3)', display: 'flex', flexDirection: 'column' }}>
        {/* HEADER DEL MODAL */}
        <div style={{ padding: '1.75rem 2rem 0', borderBottom: '1px solid #E5E5E5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 800, padding: '3px 10px', borderRadius: '9999px', textTransform: 'uppercase', letterSpacing: '0.06em', background: statusInfo.bg, color: statusInfo.color }}>
                  {statusInfo.label}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {(selectedClass?.sessions?.modules?.title || selectedClass?.subtopics?.modules?.title || 'Sin módulo')} → {(selectedClass?.sessions?.title || selectedClass?.subtopics?.title || 'Sin sesión')}
                </span>
              </div>
              <h2 style={{ margin: 0, fontWeight: 800, fontSize: '1.4rem', color: '#14213D' }}>{selectedClass?.title}</h2>
              <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CalendarDays size={13} />
                  {new Date(selectedClass?.class_date).toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={13} />
                  {new Date(selectedClass?.class_date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {selectedClass?.duration || 0} min
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '0.25rem', flexShrink: 0 }}>
              <X size={22} />
            </button>
          </div>

          {/* NAVEGACIÓN DE FASES — Todas habilitadas para clic fluido */}
          <div style={{ display: 'flex', gap: 0, borderBottom: 'none' }}>
            {SECTIONS.map(sec => {
              const isActive = activeSection === sec.id;
              return (
                <button key={sec.id} onClick={() => setActiveSection(sec.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.75rem 1.25rem', border: 'none', borderBottom: isActive ? '3px solid #FCA311' : '3px solid transparent',
                    background: 'transparent', color: isActive ? '#FCA311' : '#14213D',
                    fontWeight: isActive ? 700 : 500, fontSize: '0.85rem', cursor: 'pointer',
                    transition: 'all 0.2s ease', position: 'relative',
                  }}>
                  {sec.icon} {sec.label}
                  {sec.badge && (
                    <span style={{ position: 'absolute', top: '6px', right: '6px', width: '8px', height: '8px', borderRadius: '50%', background: '#FCA311' }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* CONTENIDO DE SECCIÓN */}
        <div style={{ padding: '1.75rem 2rem', flex: 1, overflowY: 'auto' }}>
          {/* ════ SECCIÓN: PRE-CLASE ════ */}
          {activeSection === 'preclass' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Información básica + Meet URL */}
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E5E5E5' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#14213D', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={16} color="#FCA311" /> Información de la Sesión
                </h3>
                {infoMsg && <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600, color: infoMsg.startsWith('✓') ? '#16a34a' : '#dc2626', background: infoMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>{infoMsg}</div>}
                <form onSubmit={handleSaveInfo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: '#14213D' }}>Título de la Clase</label>
                    <input type="text" value={classTitle} onChange={e => setClassTitle(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '0.88rem', outline: 'none' }} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: '#14213D' }}>Descripción / Temas a cubrir</label>
                    <textarea rows={2} value={classDesc} onChange={e => setClassDesc(e.target.value)} placeholder="Ej: Introducción a conceptos clave, ejercicios prácticos..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '0.88rem', resize: 'vertical' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: '#14213D', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Video size={13} color="#FCA311" /> Enlace de sesión en vivo (Google Meet / Zoom)
                    </label>
                    <input type="url" value={classMeetUrl} onChange={e => setClassMeetUrl(e.target.value)} placeholder="https://meet.google.com/..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '0.88rem' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={savingInfo} style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '7px', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseOver={e => e.currentTarget.style.background = '#000000'}
                      onMouseOut={e => e.currentTarget.style.background = '#14213D'}>
                      {savingInfo ? 'Guardando...' : 'Guardar Información'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Presentación */}
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#14213D', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Presentation size={16} color="#FCA311" /> Presentación de la Clase
                  </h3>
                  <button onClick={() => activeForm === 'presentation' && !editId ? setActiveForm(null) : (handleCancelForm(), setActiveForm('presentation'))}
                    style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={13} /> {activeForm === 'presentation' ? 'Cerrar' : 'Cargar Presentación'}
                  </button>
                </div>
                {matError && activeForm === 'presentation' && <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{matError}</div>}
                {activeForm === 'presentation' && (
                  <form onSubmit={e => handleSubmitResource(e, 'presentation')} style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #E5E5E5' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>Título</label><input type="text" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Ej. Diapositivas Módulo 1" style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }} required /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>Origen</label>
                        <select value={matProvider} onChange={e => setMatProvider(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }}>
                          <option value="drive">Google Drive / OneDrive</option>
                          <option value="external">Otro enlace externo</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.85rem' }}><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>URL del archivo</label><input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://drive.google.com/..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }} required /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" onClick={handleCancelForm} style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
                      <button type="submit" disabled={submitting} style={{ background: '#FCA311', color: '#14213D', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        {submitting ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Cargar')}
                      </button>
                    </div>
                  </form>
                )}
                {matLoading ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Cargando...</p>
                : presentations.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sin presentación cargada aún.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {presentations.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1rem', background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '7px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <Presentation size={16} color="#14213D" />
                          <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#14213D' }}>{p.title}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <a href={p.url} target="_blank" rel="noreferrer" style={{ padding: '0.3rem 0.65rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.78rem', color: '#14213D', textDecoration: 'none', fontWeight: 600 }}>Ver</a>
                          <button onClick={() => handleEditResource(p)} style={{ padding: '0.3rem 0.65rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.78rem', background: '#FFFFFF', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => handleDeleteResource(p.id)} style={{ padding: '0.3rem 0.65rem', border: '1px solid #fca5a5', borderRadius: '5px', fontSize: '0.78rem', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>}
              </div>

              {/* Material Complementario */}
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0, color: '#14213D', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={16} color="#FCA311" /> Material Complementario
                  </h3>
                  <button onClick={() => activeForm === 'complementary' && !editId ? setActiveForm(null) : (handleCancelForm(), setActiveForm('complementary'))}
                    style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Plus size={13} /> {activeForm === 'complementary' ? 'Cerrar' : 'Agregar Material'}
                  </button>
                </div>
                {matError && activeForm === 'complementary' && <div style={{ color: '#dc2626', fontSize: '0.82rem', marginBottom: '0.75rem' }}>{matError}</div>}
                {activeForm === 'complementary' && (
                  <form onSubmit={e => handleSubmitResource(e, 'complementary')} style={{ background: '#FFFFFF', padding: '1.25rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #E5E5E5' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.85rem', marginBottom: '0.85rem' }}>
                      <div style={{ gridColumn: 'span 2' }}><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>Título del recurso</label><input type="text" value={matTitle} onChange={e => setMatTitle(e.target.value)} placeholder="Ej. Lectura PDF, Guía de estudio" style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }} required /></div>
                      <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>Tipo</label>
                        <select value={matType} onChange={e => setMatType(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }}>
                          <option value="pdf">PDF</option>
                          <option value="link">Enlace Web</option>
                          <option value="file">Archivo</option>
                        </select>
                      </div>
                    </div>
                    <div style={{ marginBottom: '0.85rem' }}><label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', fontWeight: 600, color: '#14213D' }}>URL</label><input type="url" value={matUrl} onChange={e => setMatUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem' }} required /></div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button type="button" onClick={handleCancelForm} style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.8rem', cursor: 'pointer' }}>Cancelar</button>
                      <button type="submit" disabled={submitting} style={{ background: '#FCA311', color: '#14213D', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                        {submitting ? 'Guardando...' : (editId ? 'Guardar Cambios' : 'Agregar')}
                      </button>
                    </div>
                  </form>
                )}
                {complementary.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Sin material complementario agregado.</p>
                : <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {complementary.map(p => (
                      <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.7rem 1rem', background: '#FFFFFF', border: '1px solid #E5E5E5', borderRadius: '7px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                          <FileText size={16} color="#14213D" />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#14213D' }}>{p.title}</div>
                            <TypePill type={p.resource_type} />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <a href={p.url} target="_blank" rel="noreferrer" style={{ padding: '0.3rem 0.65rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.78rem', color: '#14213D', textDecoration: 'none', fontWeight: 600 }}>Ver</a>
                          <button onClick={() => handleEditResource(p)} style={{ padding: '0.3rem 0.65rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.78rem', background: '#FFFFFF', cursor: 'pointer' }}>Editar</button>
                          <button onClick={() => handleDeleteResource(p.id)} style={{ padding: '0.3rem 0.65rem', border: '1px solid #fca5a5', borderRadius: '5px', fontSize: '0.78rem', color: '#dc2626', background: '#fef2f2', cursor: 'pointer' }}>Eliminar</button>
                        </div>
                      </div>
                    ))}
                  </div>}
              </div>
            </div>
          )}

          {/* ════ SECCIÓN: GRABACIÓN ════ */}
          {activeSection === 'recording' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {!isPastClass && !videoUrl && (
                <div style={{ padding: '0.85rem 1.1rem', borderRadius: '8px', background: 'rgba(20,33,61,0.04)', border: '1px solid rgba(20,33,61,0.12)', fontSize: '0.82rem', color: '#14213D', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Info size={16} color="#FCA311" style={{ flexShrink: 0 }} />
                  <span>Esta clase está programada para una fecha futura. Puedes vincular el enlace de la grabación con anticipación si ya dispones de él.</span>
                </div>
              )}
              {/* Semáforo de estado */}
              <div style={{ padding: '1.5rem', borderRadius: '10px', border: `2px solid ${videoUrl ? 'rgba(22,163,74,0.3)' : 'rgba(252,163,17,0.3)'}`, background: videoUrl ? 'rgba(22,163,74,0.05)' : 'rgba(252,163,17,0.05)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: videoUrl ? '#16a34a' : '#FCA311', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {videoUrl ? <CheckCircle2 size={24} color="#FFFFFF" /> : <AlertCircle size={24} color="#FFFFFF" />}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: '#14213D' }}>
                    {videoUrl ? '✓ Grabación vinculada' : 'Grabación pendiente'}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {videoUrl ? 'La grabación está disponible para los estudiantes inscritos.' : 'La grabación de esta clase aún no ha sido vinculada.'}
                  </div>
                </div>
                {videoUrl && (
                  <a href={videoUrl} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', background: '#14213D', color: '#FFFFFF', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '7px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                    <Play size={13} /> Ver grabación
                  </a>
                )}
              </div>

              {/* Formulario para vincular grabación */}
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '10px', border: '1px solid #E5E5E5' }}>
                <h3 style={{ margin: '0 0 1rem 0', color: '#14213D', fontSize: '1rem', fontWeight: 700 }}>
                  {videoUrl ? 'Actualizar enlace de grabación' : 'Vincular grabación'}
                </h3>
                {videoMsg && <div style={{ fontSize: '0.82rem', marginBottom: '0.75rem', fontWeight: 600, color: videoMsg.startsWith('✓') ? '#16a34a' : '#dc2626', background: videoMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', padding: '0.5rem 0.75rem', borderRadius: '6px' }}>{videoMsg}</div>}
                <form onSubmit={handleSaveVideo} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.82rem', fontWeight: 600, color: '#14213D' }}>URL de la grabación (Drive / YouTube / Loom)</label>
                    <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://drive.google.com/... ó https://youtube.com/..." style={{ width: '100%', padding: '0.6rem 0.75rem', border: '1px solid #E5E5E5', borderRadius: '6px', fontSize: '0.88rem' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={savingVideo} style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '7px', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                      {savingVideo ? 'Guardando...' : 'Guardar Grabación'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* ════ SECCIÓN: ACTIVIDAD IA ════ */}
          {activeSection === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {draftLoading ? (
                <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>Cargando actividad...</p>
              ) : !draft ? (
                <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #E5E5E5' }}>
                  <Sparkles size={36} color="#FCA311" style={{ margin: '0 auto 0.75rem' }} />
                  <h3 style={{ color: '#14213D', marginBottom: '0.5rem', fontWeight: 700 }}>
                    {!isPastClass ? 'Actividad disponible tras realizar la clase' : 'Sin borrador IA disponible'}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0, maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                    {!isPastClass
                      ? 'El borrador de preguntas generado por la IA se procesará automáticamente una vez que la clase haya finalizado.'
                      : 'El administrador enviará el borrador generado por IA una vez que la transcripción de la clase esté procesada.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Estado de la actividad */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.25rem', borderRadius: '8px', background: draft.status === 'approved' ? 'rgba(22,163,74,0.08)' : 'rgba(252,163,17,0.08)', border: `1px solid ${draft.status === 'approved' ? 'rgba(22,163,74,0.25)' : 'rgba(252,163,17,0.25)'}`, flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      {draft.status === 'approved'
                        ? <CheckCircle2 size={18} color="#16a34a" />
                        : <Sparkles size={18} color="#FCA311" />}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#14213D' }}>
                          {draft.status === 'approved' ? 'Actividad publicada a estudiantes' : 'Borrador IA pendiente de revisión'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {draft.draft_data?.activity_title || 'Sin título'} · {(localQuestions.length)} preguntas
                          {activityStats && ` · ${activityStats.totalResponses} respuestas recibidas`}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {draft.status === 'approved' ? (
                        <button onClick={handleUnpublishActivity} disabled={actionLoading === 'unpublishing'}
                          style={{ background: '#FFFFFF', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          {actionLoading === 'unpublishing' ? '...' : <><EyeOff size={12} /> Despublicar</>}
                        </button>
                      ) : (
                        <button onClick={handlePublishActivity} disabled={actionLoading === 'publishing'}
                          style={{ background: '#FCA311', color: '#14213D', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          {actionLoading === 'publishing' ? 'Publicando...' : <><CheckCheck size={13} /> Publicar a estudiantes</>}
                        </button>
                      )}
                      <button onClick={() => setEditingQuestions(!editingQuestions)}
                        style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <Edit3 size={12} /> {editingQuestions ? 'Cerrar editor' : 'Editar preguntas'}
                      </button>
                    </div>
                  </div>
                  {activityMsg && <div style={{ fontSize: '0.82rem', fontWeight: 600, color: activityMsg.startsWith('✓') ? '#16a34a' : '#dc2626', background: activityMsg.startsWith('✓') ? '#f0fdf4' : '#fef2f2', padding: '0.6rem 0.85rem', borderRadius: '6px' }}>{activityMsg}</div>}

                  {/* Lista de preguntas — modo visualización */}
                  {!editingQuestions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {localQuestions.map((q, qi) => (
                        <div key={q._key ?? qi} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E5E5' }}>
                          <div style={{ fontWeight: 700, color: '#14213D', fontSize: '0.9rem', marginBottom: '0.6rem' }}>
                            {qi + 1}. {q.text}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                            {(q.options || []).map((opt, oi) => (
                              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.35rem 0.6rem', borderRadius: '5px', background: opt.is_correct ? 'rgba(22,163,74,0.08)' : 'transparent', border: opt.is_correct ? '1px solid rgba(22,163,74,0.2)' : '1px solid transparent' }}>
                                {opt.is_correct ? <Check size={13} color="#16a34a" /> : <span style={{ width: '13px' }} />}
                                <span style={{ fontSize: '0.84rem', color: opt.is_correct ? '#166534' : '#14213D', fontWeight: opt.is_correct ? 600 : 400 }}>{opt.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Editor de preguntas — modo edición */}
                  {editingQuestions && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {localQuestions.map((q, qi) => (
                        <div key={q._key ?? qi} style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #E5E5E5' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
                            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#14213D' }}>Pregunta {qi + 1}</label>
                            <button onClick={() => setLocalQuestions(prev => prev.filter((_, i) => i !== qi))}
                              style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '5px', padding: '0.2rem 0.5rem', cursor: 'pointer', color: '#dc2626', fontSize: '0.75rem' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <textarea value={q.text} onChange={e => setLocalQuestions(prev => prev.map((item, i) => i === qi ? { ...item, text: e.target.value } : item))}
                            rows={2} style={{ width: '100%', padding: '0.5rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.85rem', marginBottom: '0.6rem', resize: 'vertical' }} />
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                              <input type="radio" name={`correct-${qi}`} checked={!!opt.is_correct}
                                onChange={() => setLocalQuestions(prev => prev.map((item, i) => i === qi ? { ...item, options: item.options.map((o, j) => ({ ...o, is_correct: j === oi })) } : item))}
                                style={{ accentColor: '#FCA311' }} title="Marcar como correcta" />
                              <input type="text" value={opt.text} onChange={e => setLocalQuestions(prev => prev.map((item, i) => i === qi ? { ...item, options: item.options.map((o, j) => j === oi ? { ...o, text: e.target.value } : o) } : item))}
                                style={{ flex: 1, padding: '0.4rem 0.6rem', border: '1px solid #E5E5E5', borderRadius: '5px', fontSize: '0.83rem' }} />
                            </div>
                          ))}
                        </div>
                      ))}
                      <button onClick={() => setLocalQuestions(prev => [...prev, { _key: Date.now(), text: '', question_type: 'single_choice', options: [{ text: '', is_correct: true }, { text: '', is_correct: false }, { text: '', is_correct: false }] }])}
                        style={{ background: '#FFFFFF', border: '1px dashed #FCA311', borderRadius: '7px', padding: '0.6rem', color: '#FCA311', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                        <PlusCircle size={15} /> Agregar pregunta
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}



/* ─────────────────────────────────────────
   TAB: MIS CLASES — Vista jerárquica
   Módulo → Sesión → Clase
───────────────────────────────────────── */
function ClasesTab() {
  const { programId, teacherId } = useTeacherContext();
  const [classes, setClasses]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [expandedModules, setExpandedModules]   = useState({});
  const [expandedSessions, setExpandedSessions] = useState({});
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'upcoming' | 'completed'

  const fetchMyClasses = async () => {
    if (!teacherId) return; // Esperar hasta tener el ID del profesor
    try {
      setLoading(true);
      let data = [];
      const { data: sData, error: sErr } = await supabase
        .from('class_sessions')
        .select('*, sessions(id, title, order_index, module_id, modules(id, title, program_id)), meet_url')
        .eq('program_id', programId)
        .eq('teacher_id', teacherId)         // ← Solo clases del profesor
        .order('class_date', { ascending: true });

      if (sErr) {
        const { data: oldData, error: oldErr } = await supabase
          .from('class_sessions')
          .select('*, subtopics(id, title, module_id, modules(id, title, program_id)), meet_url')
          .eq('program_id', programId)
          .eq('teacher_id', teacherId)       // ← Fallback también filtrado
          .order('class_date', { ascending: true });
        if (oldErr) throw oldErr;
        data = oldData || [];
      } else {
        data = sData || [];
      }

      setClasses(data);

      // Expandir todos los módulos y sesiones por defecto
      const mods = {};
      const subs = {};
      (data || []).forEach(c => {
        const parentMod = c.sessions?.module_id || c.subtopics?.module_id;
        const parentSes = c.session_id || c.subtopic_id;
        if (parentMod) mods[parentMod] = true;
        if (parentSes) subs[parentSes] = true;
      });
      setExpandedModules(mods);
      setExpandedSessions(subs);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (programId && teacherId) fetchMyClasses(); }, [programId, teacherId]);

  const toggleModule   = id => setExpandedModules(p => ({ ...p, [id]: !p[id] }));
  const toggleSession  = id => setExpandedSessions(p => ({ ...p, [id]: !p[id] }));

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando clases del programa...</div>;
  if (error)   return <div style={{ padding: '2rem', textAlign: 'center', color: '#dc2626' }}>Error: {error}</div>;

  const now = new Date();

  // Filtrar por estado
  const filteredClasses = classes.filter(c => {
    if (filterStatus === 'upcoming')  return new Date(c.class_date) >= now;
    if (filterStatus === 'completed') return new Date(c.class_date) < now;
    return true;
  });

  // Agrupar: Módulo → Sesión → Clase
  const grouped = {};
  filteredClasses.forEach(cls => {
    const sesObj = cls.sessions || cls.subtopics;
    const modId     = sesObj?.modules?.id    || 'sin-modulo';
    const modTitle  = sesObj?.modules?.title || 'Sin Módulo';
    const sesId     = cls.session_id || cls.subtopic_id || 'sin-sesion';
    const sesTitle  = sesObj?.title          || 'Sin Sesión';
    const sesOrder  = sesObj?.order_index    ?? 999;

    if (!grouped[modId]) grouped[modId] = { title: modTitle, sessions: {} };
    if (!grouped[modId].sessions[sesId]) {
      grouped[modId].sessions[sesId] = { title: sesTitle, order: sesOrder, classes: [], minDate: null, maxDate: null };
    }
    grouped[modId].sessions[sesId].classes.push(cls);
    // Rastrear rango de fechas de la sesión
    const d = new Date(cls.class_date);
    const sess = grouped[modId].sessions[sesId];
    if (!sess.minDate || d < new Date(sess.minDate)) sess.minDate = cls.class_date;
    if (!sess.maxDate || d > new Date(sess.maxDate)) sess.maxDate = cls.class_date;
  });

  const totalCompleted = classes.filter(c => new Date(c.class_date) < now).length;
  const totalUpcoming  = classes.filter(c => new Date(c.class_date) >= now).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Encabezado + Filtros */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          <span><strong style={{ color: '#14213D' }}>{classes.length}</strong> clases totales</span>
          <span>·</span>
          <span><strong style={{ color: '#16a34a' }}>{totalCompleted}</strong> completadas</span>
          <span>·</span>
          <span><strong style={{ color: '#FCA311' }}>{totalUpcoming}</strong> próximas</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[{ id: 'all', label: 'Todas' }, { id: 'upcoming', label: 'Próximas' }, { id: 'completed', label: 'Finalizadas' }].map(f => (
            <button key={f.id} onClick={() => setFilterStatus(f.id)}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '9999px', border: '1px solid', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
                background: filterStatus === f.id ? '#14213D' : '#FFFFFF',
                color:      filterStatus === f.id ? '#FFFFFF'  : '#14213D',
                borderColor:filterStatus === f.id ? '#14213D'  : '#E5E5E5' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sin resultados */}
      {Object.keys(grouped).length === 0 && (
        <div style={{ padding: '3rem', textAlign: 'center', background: '#f8fafc', borderRadius: '10px', border: '1px dashed #E5E5E5' }}>
          <BookOpen size={40} color="#E5E5E5" style={{ margin: '0 auto 0.75rem' }} />
          <h3 style={{ color: '#14213D', marginBottom: '0.5rem' }}>Sin clases para mostrar</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>Prueba cambiando el filtro.</p>
        </div>
      )}

      {/* Árbol jerárquico: Módulo → Sesión → Clase */}
      {Object.entries(grouped).map(([modId, mod], modIndex) => (
        <div key={modId} style={{ border: '1px solid #E5E5E5', borderRadius: '10px', overflow: 'hidden' }}>
          {/* ENCABEZADO DE MÓDULO */}
          <button onClick={() => toggleModule(modId)} style={{ width: '100%', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#14213D', border: 'none', cursor: 'pointer', color: '#FFFFFF', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <Layers size={16} color="#FCA311" />
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{mod.title}</span>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>
                {Object.values(mod.sessions).reduce((acc, s) => acc + s.classes.length, 0)} clases
              </span>
            </div>
            {expandedModules[modId] ? <ChevronUp size={16} color="#FCA311" /> : <ChevronDown size={16} color="#FCA311" />}
          </button>

          {/* SESIONES */}
          {expandedModules[modId] && Object.entries(mod.sessions).map(([sesId, ses]) => (
            <div key={sesId} style={{ borderTop: '1px solid #E5E5E5' }}>
              {/* Encabezado Sesión */}
              <button onClick={() => toggleSession(sesId)} style={{ width: '100%', padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f8fafc', border: 'none', cursor: 'pointer', textAlign: 'left', borderBottom: '1px solid #E5E5E5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <BookOpen size={14} color="#FCA311" />
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.88rem', color: '#14213D' }}>{ses.title}</span>
                    {ses.minDate && (
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                        {ses.minDate === ses.maxDate
                          ? new Date(ses.minDate).toLocaleDateString('es-ES', { weekday: 'short', day: '2-digit', month: 'short' })
                          : `${new Date(ses.minDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} – ${new Date(ses.maxDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`
                        }
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{ses.classes.length} clase{ses.classes.length !== 1 ? 's' : ''}</span>
                </div>
                {expandedSessions[sesId] ? <ChevronUp size={14} color="var(--text-muted)" /> : <ChevronDown size={14} color="var(--text-muted)" />}
              </button>

              {/* CLASES */}
              {expandedSessions[sesId] && ses.classes.map(cls => {
                const isCompleted = new Date(cls.class_date) < now;
                const hasVideo    = !!cls.video_url;
                const isToday     = new Date().toDateString() === new Date(cls.class_date).toDateString();

                return (
                  <div key={cls.id} style={{ padding: '1rem 1.75rem', borderBottom: '1px solid #f1f5f9', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', transition: 'background 0.2s ease' }}
                    onMouseOver={e => e.currentTarget.style.background = '#fafafa'}
                    onMouseOut={e => e.currentTarget.style.background = '#FFFFFF'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', flex: 1, minWidth: 0 }}>
                      {/* Indicador de estado */}
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', marginTop: '6px', flexShrink: 0,
                        background: isCompleted ? '#16a34a' : isToday ? '#FCA311' : '#E5E5E5' }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: '#14213D', fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{cls.title}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><CalendarDays size={12} />{formatClassDate(cls.class_date, false)}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Timer size={12} />{cls.duration || 0} min</span>
                          {isCompleted && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: hasVideo ? '#16a34a' : '#FCA311', fontWeight: 600 }}>
                              {hasVideo ? <><CheckCircle2 size={12} /> Grabación OK</> : <><AlertCircle size={12} /> Sin grabación</>}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button onClick={() => setSelectedClass(cls)}
                      style={{ background: '#14213D', color: '#FFFFFF', border: 'none', borderRadius: '7px', padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, transition: 'all 0.2s ease' }}
                      onMouseOver={e => e.currentTarget.style.background = '#000000'}
                      onMouseOut={e => e.currentTarget.style.background = '#14213D'}>
                      <Eye size={13} /> Gestionar clase
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ))}

      {/* Modal de detalle */}
      {selectedClass && (
        <ClassDetailModal
          selectedClass={selectedClass}
          onClose={() => setSelectedClass(null)}
          onClassUpdated={fetchMyClasses}
        />
      )}
    </div>
  );
}


/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 4 — Materiales de Apoyo (Global)
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function SupportMaterialsTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!teacherId || !programId) return;
    async function fetchMaterials() {
      try {
        setLoading(true);
        const { data } = await supabase
          .from('resources')
          .select('*, class_sessions!inner(title, teacher_id, program_id)')
          .eq('class_sessions.teacher_id', teacherId)
          .eq('program_id', programId)
          .in('resource_type', ['presentation', 'pdf', 'link', 'file'])
          .order('created_at', { ascending: false });
        
        setMaterials(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchMaterials();
  }, [teacherId]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Materiales de apoyo ({materials.length})</span>
      </div>

      <div style={{ background: '#eef2ff', color: '#3730a3', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <Info size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div style={{ fontSize: '0.85rem' }}>
          <strong style={{ display: 'block', marginBottom: '4px' }}>Nota sobre la gestión de materiales</strong>
          Para añadir, editar o eliminar un material de una de tus clases, ve a la pestaña <strong>Mis Clases</strong>, haz clic en <strong>Ver Clase</strong> y gestiónalo desde allí. Aquí puedes ver una lista consolidada de todo el material.
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando materiales...</p>
      ) : materials.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No hay materiales de apoyo en tus clases.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {materials.map(p => (
            <div className="resource-row" key={p.id}>
              <div className="resource-icon-box" style={{ background: '#f8fafc' }}>
                <FileText size={20} color="#64748b" />
              </div>
              <div className="resource-row-body">
                <div className="resource-row-title">{p.title}</div>
                <div className="resource-row-meta">Clase: {p.class_sessions?.title}</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <TypePill type={p.resource_type} />
                <a href={p.url} target="_blank" rel="noreferrer" className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}><Eye size={13} style={{display:'inline', marginRight:'4px'}}/> Ver</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   MODAL DE ANUNCIOS
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AnnouncementModal({ announcement, onClose, onRefresh }) {
  const { id: teacherId, programId } = useTeacherContext();
  const [title, setTitle] = useState(announcement?.title || '');
  const [body, setBody] = useState(announcement?.body || '');
  const [tag, setTag] = useState(announcement?.tag || 'general');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('El título y el mensaje son obligatorios.');
      return;
    }

    setSubmitting(true);
    setError('');

    const payload = {
      teacher_id: teacherId,
      program_id: programId,
      title: title.trim(),
      body: body.trim(),
      tag
    };

    try {
      if (announcement?.id) {
        const { error: updateError } = await supabase
          .from('announcements')
          .update(payload)
          .eq('id', announcement.id)
          .eq('teacher_id', teacherId);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('announcements')
          .insert([payload]);
        if (insertError) throw insertError;
      }

      onRefresh();
      onClose();
    } catch (err) {
      setError('Error al guardar el anuncio: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '500px', background: 'white', position: 'relative', padding: '2rem' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <X size={24} />
        </button>
        
        <h2 style={{ marginBottom: '1.5rem', fontWeight: 700 }}>{announcement ? 'Editar Anuncio' : 'Nuevo Anuncio'}</h2>

        {error && <div style={{ color: 'var(--danger)', marginBottom: '1rem', fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Título del anuncio</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Nivel de importancia (Etiqueta)</label>
            <select value={tag} onChange={e => setTag(e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
              <option value="general">General</option>
              <option value="info">Aviso Importante (Info)</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Mensaje</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={5} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', resize: 'vertical' }} required />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 1 }}>
              {submitting ? 'Guardando...' : (announcement ? 'Guardar Cambios' : 'Publicar Anuncio')}
            </button>
            <button type="button" onClick={onClose} className="btn btn-outline" style={{ flex: 1 }}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 7 — Anuncios
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function AnunciosTab() {
  const { id: teacherId, programId } = useTeacherContext();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const fetchAnnouncements = async () => {
    if (!teacherId || !programId) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('teacher_id', teacherId)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnnouncements(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [teacherId]);

  const handleEdit = (a) => {
    setSelectedAnnouncement(a);
    setShowModal(true);
  };

  const handleCreate = () => {
    setSelectedAnnouncement(null);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este anuncio?')) return;
    try {
      const { error } = await supabase
        .from('announcements')
        .delete()
        .eq('id', id)
        .eq('teacher_id', teacherId);
      if (error) throw error;
      fetchAnnouncements();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Anuncios publicados ({announcements.length})</span>
        <button onClick={handleCreate} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '0.6rem 1.1rem' }}>
          <Plus size={16} /> Nuevo Anuncio
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Cargando anuncios...</p>
      ) : announcements.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-color)' }}>
          <Megaphone size={48} color="var(--primary-light)" style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ color: 'var(--text-dark)', marginBottom: '0.5rem' }}>No hay anuncios publicados</h3>
          <p style={{ color: 'var(--text-muted)' }}>Publica un anuncio para comunicarte con tus estudiantes.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {announcements.map(a => (
            <div className={`announcement-card ${a.tag !== 'general' ? a.tag : ''}`} key={a.id}>
              <TagPill tag={a.tag} />
              <div className="announcement-header">
                <div className="announcement-title">{a.title}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span className="announcement-date">{formatClassDate(a.created_at, false)}</span>
                  <button onClick={() => handleEdit(a)} style={{ background:'none', border:'1px solid var(--border-color)', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#64748b', display:'flex' }}><Pencil size={13} /></button>
                  <button onClick={() => handleDelete(a.id)} style={{ background:'none', border:'1px solid #fca5a5', borderRadius:'var(--radius-md)', padding:'0.35rem', cursor:'pointer', color:'#dc2626', display:'flex' }}><Trash2 size={13} /></button>
                </div>
              </div>
              <p className="announcement-body">{a.body}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <AnnouncementModal 
          announcement={selectedAnnouncement} 
          onClose={() => setShowModal(false)} 
          onRefresh={fetchAnnouncements}
        />
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   TAB 7 — Perfil
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PerfilTab() {
  const { profile, setProfile } = useTeacherContext();
  const [newPassword, setNewPassword] = useState('');
  const [updatingPwd, setUpdatingPwd] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ text: '', type: '' });
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ area: profile.area || '', bio: profile.bio || '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase
        .from('teacher_profiles')
        .update({ area: editData.area, bio: editData.bio })
        .eq('id', profile.id)
        .select('*, users_profile(email)')
        .single();
      
      if (error) throw error;
      setProfile(data);
      setEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      alert('Error al actualizar perfil: ' + err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setPwdMsg({ text: 'Debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }
    setUpdatingPwd(true);
    setPwdMsg({ text: '', type: '' });
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwdMsg({ text: 'Contraseña actualizada con éxito.', type: 'success' });
      setNewPassword('');
    } catch (err) {
      setPwdMsg({ text: 'Error al actualizar: ' + err.message, type: 'error' });
    } finally {
      setUpdatingPwd(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span style={{ fontWeight: 600, fontSize: '1rem' }}>Mi Perfil Público</span>
        {!editing && (
          <button onClick={() => setEditing(true)} className="btn btn-outline" style={{ display: 'flex', gap: '0.5rem' }}>
            <Pencil size={16} /> Editar Perfil
          </button>
        )}
      </div>
      <div className="card" style={{ maxWidth: '600px' }}>
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', marginBottom: '1.5rem' }}>
          <img src={profile.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=14213D&color=FCA311&size=150`} alt="Avatar" style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>{profile.name}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{profile.users_profile?.email}</p>
          </div>
        </div>
        {editing ? (
          <form onSubmit={handleUpdateProfile}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Especialidad / Área</label>
              <input type="text" value={editData.area} onChange={e => setEditData({...editData, area: e.target.value})} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Biografía corta</label>
              <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} rows={4} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} required />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditing(false)} className="btn btn-outline">Cancelar</button>
              <button type="submit" className="btn btn-primary">Guardar Cambios</button>
            </div>
          </form>
        ) : (
          <>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Especialidad / Área</label>
              <input type="text" value={profile.area || ''} disabled style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#f8fafc' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Biografía corta</label>
              <textarea value={profile.bio || ''} disabled rows={4} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#f8fafc' }} />
            </div>
          </>
        )}
      </div>

      <div className="card" style={{ maxWidth: '600px', marginTop: '1.5rem' }}>
        <h3 style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '1rem' }}>Cambiar Contraseña</h3>
        {pwdMsg.text && (
          <div style={{ color: pwdMsg.type === 'error' ? 'red' : 'green', marginBottom: '1rem', fontSize: '0.85rem' }}>
            {pwdMsg.text}
          </div>
        )}
        <form onSubmit={handleUpdatePassword} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem', fontWeight: 500 }}>Nueva Contraseña</label>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '4px' }} 
            />
          </div>
          <button type="submit" disabled={updatingPwd} className="btn btn-primary">
            {updatingPwd ? 'Guardando...' : 'Actualizar'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   HELPER COMPONENT: StatusChip
───────────────────────────────────────── */
function StatusChip({ status }) {
  const configs = {
    enviada: { bg: '#dbeafe', color: '#1e40af', icon: <Clock size={13} />, label: 'Enviada (Sin revisar)' },
    revisada: { bg: '#fef3c7', color: '#92400e', icon: <Eye size={13} />, label: 'Revisada' },
    atendida: { bg: '#dcfce7', color: '#166534', icon: <CheckCircle2 size={13} />, label: 'Atendida en clase' },
    archivada: { bg: '#f1f5f9', color: '#475569', icon: <Layers size={13} />, label: 'Archivada' }
  };
  const cfg = configs[status] || configs.enviada;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.35rem',
      padding: '0.25rem 0.65rem',
      borderRadius: '12px',
      fontSize: '0.74rem',
      fontWeight: 600,
      background: cfg.bg,
      color: cfg.color
    }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

/* ─────────────────────────────────────────
   TAB 1 — Resumen (Hero + stats rápidas)
───────────────────────────────────────── */
function ResumenTab({ onChangeTab }) {
  const { profile, teacherId, programId, currentProgram } = useTeacherContext();
  const [stats, setStats] = useState({
    totalClasses: 0,
    completed: 0,
    upcoming: 0,
    announcements: 0,
    students: 0,
    pendingDoubts: 0,
    pendingDrafts: 0,      // borradores IA pendientes de revisión
    missingRecordings: 0,  // clases pasadas sin video_url
    pendingEvaluations: 0, // entregas de estudiantes pendientes por calificar
  });
  const [loading, setLoading] = useState(true);
  const [upcomingClasses, setUpcomingClasses] = useState([]);  // máx 1 (la más próxima)
  const [pendingDoubts, setPendingDoubts] = useState([]);
  const [urgentAlerts, setUrgentAlerts] = useState([]);        // bandeja de acción

  const fetchStatsAndDoubts = async () => {
    if (!programId) return;
    try {
      setLoading(true);

      const teacherProfileId = teacherId || profile?.id;
      const pClasses = supabase.from('class_sessions')
        .select('id, title, class_date, program_id, duration, description, meet_url')
        .eq('program_id', programId)
        .eq('teacher_id', teacherProfileId)
        .order('class_date', { ascending: true });
        
      const pAnnouncements = supabase.from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId);
        
      const pStudents = supabase.from('enrollments')
        .select('student_id, users_profile!inner(role)', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('users_profile.role', 'student');

      // Consultar dudas no revisadas ('enviada') para el contador dinámico
      const pUnreviewedDoubts = supabase.from('class_doubts')
        .select('*', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('status', 'enviada');

      // Consultar las últimas dudas recibidas que requieren atención
      const pTopDoubts = supabase.from('class_doubts')
        .select(`
          *,
          class_sessions (id, title),
          users_profile:student_id (full_name)
        `)
        .eq('program_id', programId)
        .in('status', ['enviada', 'revisada'])
        .order('created_at', { ascending: false })
        .limit(3);

      // Query A: Borradores IA pendientes de las clases del profesor
      const pPendingDrafts = supabase
        .from('activity_drafts')
        .select('id, class_id, status, draft_data, created_at, class_sessions!inner(id, title, program_id, teacher_id)', { count: 'exact' })
        .eq('class_sessions.program_id', programId)
        .eq('class_sessions.teacher_id', teacherProfileId)
        .eq('status', 'pending');

      // Query B: Clases PROPIAS del profesor pasadas sin grabación (class_date < ahora Y video_url IS NULL)
      const pMissingRecordings = supabase
        .from('class_sessions')
        .select('id, title, class_date', { count: 'exact', head: false })
        .eq('program_id', programId)
        .eq('teacher_id', teacherProfileId)
        .lt('class_date', new Date().toISOString())
        .is('video_url', null);

      // Query C: Entregas de tareas pendientes por calificar en este programa
      const pPendingSubmissions = supabase
        .from('assignment_submissions')
        .select('id, assignment_id, assignments!inner(id, title, program_id)', { count: 'exact' })
        .eq('assignments.program_id', programId)
        .eq('status', 'submitted');

      const [resClasses, resAnn, resStudents, resUnreviewed, resTopDoubts, resDrafts, resMissingRec, resSubmissions] = await Promise.all([
        pClasses, pAnnouncements, pStudents, pUnreviewedDoubts, pTopDoubts, pPendingDrafts, pMissingRecordings, pPendingSubmissions
      ]);
      
      const classes = resClasses.data || [];
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);

      const completed = classes.filter(c => new Date(c.class_date) < startOfToday).length;
      const upcomingList = classes.filter(c => new Date(c.class_date) >= startOfToday);
      
      setUpcomingClasses(upcomingList.slice(0, 1));
      setPendingDoubts(resTopDoubts.data || []);

      const alerts = [];
      // Alerta: entregas de evaluación pendientes por calificar
      const pendingSubCount = (resSubmissions.data || []).length;
      if (pendingSubCount > 0) {
        alerts.push({
          id: 'pending-submissions-alert',
          type: 'evaluation',
          title: `Evaluaciones por calificar (${pendingSubCount})`,
          subtitle: `${pendingSubCount} entrega(s) de estudiantes esperando tu calificación y feedback`,
          action: 'Calificar ahora',
          tab: 'evaluaciones',
          icon: 'fileCheck',
          color: '#FCA311',
        });
      }

      // Alerta: borradores IA pendientes
      if ((resDrafts.data || []).length > 0) {
        (resDrafts.data || []).forEach(d => {
          alerts.push({
            id: d.id,
            type: 'draft',
            title: `Borrador IA pendiente: "${d.draft_data?.activity_title || 'Sin título'}"`,
            subtitle: `Clase: ${d.class_sessions?.title || 'Clase vinculada'} · Generado ${new Date(d.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}`,
            action: 'Revisar ahora',
            tab: 'clases',
            icon: 'sparkles',
            color: '#FCA311',
          });
        });
      }
      // Alerta: clases sin grabación
      if ((resMissingRec.data || []).length > 0) {
        (resMissingRec.data || []).forEach(c => {
          alerts.push({
            id: c.id + '-rec',
            type: 'recording',
            title: `Grabación pendiente: "${c.title}"`,
            subtitle: `Clase del ${new Date(c.class_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} · Sin grabación vinculada`,
            action: 'Ir a Mis Clases',
            tab: 'clases',
            icon: 'video',
            color: '#14213D',
          });
        });
      }
      setUrgentAlerts(alerts);

      setStats({
        totalClasses: classes.length,
        completed,
        upcoming: upcomingList.length || classes.length,
        announcements: resAnn.count || 0,
        students: resStudents.count || 0,
        pendingDoubts: resUnreviewed.count || 0,
        pendingDrafts: (resDrafts.data || []).length,
        missingRecordings: (resMissingRec.data || []).length,
        pendingEvaluations: pendingSubCount,
      });
    } catch (err) {
      console.error('Error fetching teacher stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatsAndDoubts();
  }, [profile?.id, programId]);

  // Actualizar estado de una duda directamente desde el Resumen y actualizar contador en caliente
  const handleQuickStatusChange = async (doubtId, newStatus) => {
    setPendingDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
    
    // Si la duda pasa de 'enviada' a otro estado, decrementar el contador dinámicamente
    const target = pendingDoubts.find(d => d.id === doubtId);
    if (target && target.status === 'enviada' && newStatus !== 'enviada') {
      setStats(prev => ({ ...prev, pendingDoubts: Math.max(0, prev.pendingDoubts - 1) }));
    }

    await updateDoubtStatus(doubtId, newStatus);
  };

  if (loading) {
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando resumen del programa...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* ── ENCABEZADO DEL PROGRAMA ── */}
      <div className="card" style={{
        padding: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        background: 'linear-gradient(135deg, #14213D 0%, #000000 100%)',
        border: 'none',
        borderRadius: '12px',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', color: '#FCA311', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            {currentProgram?.program_type === 'curso' ? 'Curso Corto' : 'Diplomado'} · Panel del Profesor
          </div>
          <h1 style={{ fontSize: '1.6rem', color: '#FFFFFF', margin: '0 0 0.5rem 0', fontWeight: 800 }}>
            {currentProgram?.title || 'Cargando programa...'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem', fontSize: '0.85rem', color: '#E5E5E5' }}>
            <span>Prof. <strong style={{ color: '#FCA311' }}>{profile.name}</strong></span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#22c55e' }} />
              Programa activo
            </span>
            <span><strong style={{ color: '#FFFFFF' }}>{stats.students}</strong> estudiantes inscritos</span>
          </div>
        </div>
        <button
          className="btn"
          onClick={() => onChangeTab('anuncios')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            background: '#FCA311', color: '#14213D', border: 'none',
            fontWeight: 700, fontSize: '0.85rem', padding: '0.6rem 1.2rem',
            borderRadius: '8px', cursor: 'pointer', whiteSpace: 'nowrap',
            transition: 'all 0.2s ease',
          }}
          onMouseOver={e => e.currentTarget.style.background = '#e8960a'}
          onMouseOut={e => e.currentTarget.style.background = '#FCA311'}
        >
          <Megaphone size={16} /> Crear anuncio
        </button>
      </div>
      {/* ── KPI CARDS (4 indicadores) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        {/* KPI 1: Dudas por revisar */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #FCA311', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => onChangeTab('dudas')}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#14213D', lineHeight: 1 }}>{stats.pendingDoubts}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Dudas sin revisar</span>
        </div>
        {/* KPI 2: Próximas clases */}
        <div className="card" style={{ padding: '1.5rem', borderLeft: '4px solid #14213D', cursor: 'pointer', transition: 'all 0.2s ease' }}
          onClick={() => onChangeTab('clases')}
          onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#14213D', lineHeight: 1 }}>{stats.upcoming}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Próximas clases</span>
        </div>
        {/* KPI 3: Borradores IA pendientes */}
        <div className="card" style={{
          padding: '1.5rem',
          borderLeft: `4px solid ${stats.pendingDrafts > 0 ? '#FCA311' : '#E5E5E5'}`,
          cursor: stats.pendingDrafts > 0 ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
          background: stats.pendingDrafts > 0 ? 'rgba(252, 163, 17, 0.05)' : 'var(--white)',
        }}
          onClick={() => stats.pendingDrafts > 0 && onChangeTab('clases')}
          onMouseOver={e => stats.pendingDrafts > 0 && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '2.5rem', fontWeight: 800, color: stats.pendingDrafts > 0 ? '#FCA311' : '#14213D', lineHeight: 1 }}>{stats.pendingDrafts}</span>
            {stats.pendingDrafts > 0 && <Sparkles size={18} color="#FCA311" />}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Borradores IA</span>
        </div>
        {/* KPI 4: Clases sin grabación */}
        <div className="card" style={{
          padding: '1.5rem',
          borderLeft: `4px solid ${stats.missingRecordings > 0 ? '#000000' : '#E5E5E5'}`,
          cursor: stats.missingRecordings > 0 ? 'pointer' : 'default',
          transition: 'all 0.2s ease',
        }}
          onClick={() => stats.missingRecordings > 0 && onChangeTab('clases')}
          onMouseOver={e => stats.missingRecordings > 0 && (e.currentTarget.style.transform = 'translateY(-2px)')}
          onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#14213D', lineHeight: 1 }}>{stats.missingRecordings}</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, marginTop: '0.5rem', display: 'block', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Sin grabación</span>
        </div>
      </div>
      {/* ── BANDEJA DE ACCIÓN URGENTE ── Solo visible si hay alertas */}
      {urgentAlerts.length > 0 && (
        <div className="card" style={{ padding: '1.5rem', border: '1px solid rgba(252, 163, 17, 0.3)', background: 'rgba(252, 163, 17, 0.04)', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
            <AlertCircle size={18} color="#FCA311" />
            <h3 style={{ margin: 0, color: '#14213D', fontSize: '1rem', fontWeight: 700 }}>
              Acciones requeridas <span style={{ background: '#FCA311', color: '#14213D', fontSize: '0.7rem', fontWeight: 800, padding: '2px 8px', borderRadius: '9999px', marginLeft: '6px' }}>{urgentAlerts.length}</span>
            </h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {urgentAlerts.map(alert => (
              <div key={alert.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', background: '#FFFFFF',
                border: `1px solid ${alert.color === '#FCA311' ? 'rgba(252,163,17,0.25)' : 'rgba(20,33,61,0.15)'}`,
                borderRadius: '8px', gap: '1rem', flexWrap: 'wrap',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div style={{ background: alert.color === '#FCA311' ? 'rgba(252,163,17,0.12)' : 'rgba(20,33,61,0.08)', padding: '0.5rem', borderRadius: '8px' }}>
                    {alert.type === 'draft' ? (
                      <Sparkles size={18} color={alert.color} />
                    ) : alert.type === 'evaluation' ? (
                      <FileCheck size={18} color={alert.color} />
                    ) : (
                      <Video size={18} color={alert.color} />
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#14213D', fontSize: '0.9rem' }}>{alert.title}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>{alert.subtitle}</div>
                  </div>
                </div>
                <button
                  onClick={() => onChangeTab(alert.tab)}
                  style={{
                    background: alert.color, color: alert.color === '#FCA311' ? '#14213D' : '#FFFFFF',
                    border: 'none', borderRadius: '6px', padding: '0.4rem 0.9rem',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                    transition: 'all 0.2s ease', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                  onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
                  onMouseOut={e => e.currentTarget.style.opacity = '1'}
                >
                  {alert.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      {/* ── GRID PRINCIPAL (2 columnas) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem', alignItems: 'start' }}>
        {/* COLUMNA IZQUIERDA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Tu próxima clase */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#14213D', fontSize: '1.05rem', fontWeight: 700 }}>
                Tu próxima clase
              </h3>
              <button onClick={() => onChangeTab('clases')} className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>
                Ver todas
              </button>
            </div>
            {upcomingClasses.length === 0 ? (
              <div style={{ padding: '2.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #E5E5E5' }}>
                <CalendarDays size={32} color="#E5E5E5" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>No hay clases próximas programadas</p>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>El administrador asignará las próximas sesiones</span>
              </div>
            ) : (
              upcomingClasses.map(c => {
                const classDate = new Date(c.class_date);
                const isToday = new Date().toDateString() === classDate.toDateString();
                return (
                  <div key={c.id} style={{
                    padding: '1.25rem', border: isToday ? '2px solid #FCA311' : '1px solid #E5E5E5',
                    borderRadius: '10px', background: isToday ? 'rgba(252,163,17,0.04)' : '#FFFFFF',
                  }}>
                    {isToday && (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#FCA311', background: 'rgba(252,163,17,0.15)', padding: '2px 10px', borderRadius: '9999px', marginBottom: '0.75rem', display: 'inline-block', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                        ¡HOY!
                      </span>
                    )}
                    <div style={{ fontWeight: 800, color: '#14213D', fontSize: '1.05rem', marginBottom: '0.5rem' }}>{c.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <CalendarDays size={14} />
                        {classDate.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' })}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} />
                        {classDate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })} · {c.duration || 0} min
                      </span>
                    </div>
                    {c.meet_url ? (
                      <a href={c.meet_url} target="_blank" rel="noreferrer" style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
                        background: '#14213D', color: '#FFFFFF', textDecoration: 'none',
                        padding: '0.5rem 1.1rem', borderRadius: '7px', fontWeight: 700,
                        fontSize: '0.83rem', transition: 'all 0.2s ease',
                      }}
                        onMouseOver={e => e.currentTarget.style.background = '#000000'}
                        onMouseOut={e => e.currentTarget.style.background = '#14213D'}
                      >
                        <Video size={15} /> Unirse a la sesión en vivo
                      </a>
                    ) : (
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Sin enlace de sesión en vivo configurado
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          {/* Dudas que requieren atención */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ margin: 0, color: '#14213D', fontSize: '1.05rem', fontWeight: 700 }}>Dudas que requieren atención</h3>
              <button onClick={() => onChangeTab('dudas')} className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}>Ver todas</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {pendingDoubts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '8px' }}>
                  <CheckCircle2 size={28} color="#E5E5E5" style={{ margin: '0 auto 0.5rem' }} />
                  <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 600 }}>¡Sin dudas pendientes!</p>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Las nuevas dudas de estudiantes aparecerán aquí</span>
                </div>
              ) : (
                pendingDoubts.map(d => (
                  <div key={d.id} style={{
                    padding: '1.1rem 1.25rem', border: '1px solid #E5E5E5',
                    borderRadius: '8px', background: '#FFFFFF', transition: 'all 0.2s ease',
                  }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(252,163,17,0.4)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = '#E5E5E5'; e.currentTarget.style.transform = 'translateY(0)'; }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.35rem' }}>
                      <div style={{ fontWeight: 700, color: '#14213D', fontSize: '0.92rem' }}>{d.subject}</div>
                      <StatusChip status={d.status} />
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
                      {d.description?.length > 100 ? `${d.description.substring(0, 100)}...` : d.description}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <span><strong style={{ color: '#14213D' }}>{d.users_profile?.full_name || 'Estudiante'}</strong> · {d.class_sessions?.title || 'Clase'}</span>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        {d.status === 'enviada' && (
                          <button onClick={() => handleQuickStatusChange(d.id, 'revisada')} className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem' }}>
                            <Eye size={12} /> Para clase
                          </button>
                        )}
                        {d.status !== 'atendida' && (
                          <button onClick={() => handleQuickStatusChange(d.id, 'atendida')} className="btn btn-outline" style={{ fontSize: '0.72rem', padding: '0.2rem 0.55rem', color: '#166534', borderColor: '#bbf7d0' }}>
                            <CheckCircle2 size={12} /> Atendida
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        {/* COLUMNA DERECHA — Resumen estadístico */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1.25rem 0', color: '#14213D', fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={16} color="#FCA311" /> Resumen del Programa
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {[
                { label: 'Total de clases', value: stats.totalClasses, color: '#14213D' },
                { label: 'Clases completadas', value: stats.completed, color: '#16a34a' },
                { label: 'Clases pendientes', value: stats.upcoming, color: '#14213D' },
                { label: 'Estudiantes inscritos', value: stats.students, color: '#14213D' },
                { label: 'Anuncios publicados', value: stats.announcements, color: '#14213D' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                  <strong style={{ color }}>{value}</strong>
                </div>
              ))}
            </div>
          </div>
          {/* Acceso rápido a secciones */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', color: '#14213D', fontSize: '1rem', fontWeight: 700 }}>Acceso rápido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[
                { label: 'Mis Clases', tab: 'clases', icon: <Video size={14} /> },
                { label: 'Dudas de estudiantes', tab: 'dudas', icon: <MessageSquare size={14} /> },
                { label: 'Anuncios', tab: 'anuncios', icon: <Megaphone size={14} /> },
                { label: 'Estudiantes', tab: 'estudiantes', icon: <Users size={14} /> },
              ].map(({ label, tab, icon }) => (
                <button key={tab} onClick={() => onChangeTab(tab)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.65rem 0.9rem', background: '#f8fafc',
                  border: '1px solid #E5E5E5', borderRadius: '7px',
                  color: '#14213D', fontSize: '0.83rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.2s ease', textAlign: 'left',
                }}
                  onMouseOver={e => { e.currentTarget.style.background = '#14213D'; e.currentTarget.style.color = '#FFFFFF'; e.currentTarget.style.borderColor = '#14213D'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.color = '#14213D'; e.currentTarget.style.borderColor = '#E5E5E5'; }}
                >
                  {icon} {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   TAB 3: Dudas de estudiantes (Gestión Docente)
───────────────────────────────────────── */
function DudasTab() {
  const { programId, currentProgram } = useTeacherContext();
  const [doubts, setDoubts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [classFilter, setClassFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateOrder, setDateOrder] = useState('desc');

  // Modal de Detalle
  const [selectedDoubt, setSelectedDoubt] = useState(null);

  const fetchDoubtsAndClasses = async () => {
    if (!programId) return;
    try {
      setLoading(true);

      // 1. Cargar clases del programa
      const { data: clsData } = await supabase
        .from('class_sessions')
        .select('id, title')
        .eq('program_id', programId)
        .order('order_index', { ascending: true });
      setClasses(clsData || []);

      // 2. Cargar dudas del programa con relaciones
      const { data: doubtData, error } = await supabase
        .from('class_doubts')
        .select(`
          *,
          class_sessions (
            id,
            title
          ),
          users_profile:student_id (
            id,
            full_name,
            email
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDoubts(doubtData || []);
    } catch (err) {
      console.error('Error al cargar dudas del estudiante:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoubtsAndClasses();
  }, [programId]);

  // Actualización de estado en caliente (optimista y persistida)
  const handleStatusUpdate = async (doubtId, newStatus) => {
    setDoubts(prev => prev.map(d => d.id === doubtId ? { ...d, status: newStatus } : d));
    if (selectedDoubt && selectedDoubt.id === doubtId) {
      setSelectedDoubt(prev => prev ? { ...prev, status: newStatus } : null);
    }
    await updateDoubtStatus(doubtId, newStatus);
  };

  // Filtrado dinámico
  const filteredDoubts = doubts.filter(d => {
    const matchesStatus = statusFilter === 'todos' || d.status === statusFilter;
    const matchesClass = classFilter === 'todos' || d.class_id === classFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm.trim() ||
      d.subject?.toLowerCase().includes(searchLower) ||
      d.description?.toLowerCase().includes(searchLower) ||
      d.users_profile?.full_name?.toLowerCase().includes(searchLower) ||
      d.users_profile?.email?.toLowerCase().includes(searchLower);

    return matchesStatus && matchesClass && matchesSearch;
  }).sort((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const countByStatus = (st) => doubts.filter(d => d.status === st).length;

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando dudas de estudiantes...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* ENCABEZADO Y RESUMEN DE ESTADOS */}
      <div className="card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <MessageSquare size={20} color="var(--gold-dark)" /> Bandeja de Consultas e Inquietudes
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.84rem', margin: '4px 0 0 0' }}>
              Revisa y gestiona las dudas enviadas por los estudiantes del programa <strong>{currentProgram?.title}</strong> para atenderlas durante las sesiones de clase.
            </p>
          </div>
          <button onClick={fetchDoubtsAndClasses} className="btn btn-outline" style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <RefreshCw size={14} /> Actualizar
          </button>
        </div>

        {/* CONTADORES RÁPIDOS POR ESTADO */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
          <div
            onClick={() => setStatusFilter('todos')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'todos' ? '#f1f5f9' : 'transparent',
              border: statusFilter === 'todos' ? '1px solid var(--navy)' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>{doubts.length}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Todas</div>
          </div>

          <div
            onClick={() => setStatusFilter('enviada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'enviada' ? '#dbeafe' : 'transparent',
              border: statusFilter === 'enviada' ? '1px solid #1e40af' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e40af' }}>{countByStatus('enviada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#1e40af', fontWeight: 600 }}>Enviadas</div>
          </div>

          <div
            onClick={() => setStatusFilter('revisada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'revisada' ? '#fef3c7' : 'transparent',
              border: statusFilter === 'revisada' ? '1px solid #92400e' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#92400e' }}>{countByStatus('revisada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: 600 }}>Revisadas</div>
          </div>

          <div
            onClick={() => setStatusFilter('atendida')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'atendida' ? '#dcfce7' : 'transparent',
              border: statusFilter === 'atendida' ? '1px solid #166534' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#166534' }}>{countByStatus('atendida')}</div>
            <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600 }}>Atendidas en clase</div>
          </div>

          <div
            onClick={() => setStatusFilter('archivada')}
            style={{
              padding: '0.5rem 0.85rem', borderRadius: '8px', cursor: 'pointer',
              background: statusFilter === 'archivada' ? '#f1f5f9' : 'transparent',
              border: statusFilter === 'archivada' ? '1px solid #475569' : '1px solid var(--border-color)',
              textAlign: 'center'
            }}
          >
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#475569' }}>{countByStatus('archivada')}</div>
            <div style={{ fontSize: '0.72rem', color: '#475569', fontWeight: 600 }}>Archivadas</div>
          </div>
        </div>
      </div>

      {/* BARRA DE FILTROS Y BÚSQUEDA */}
      <div className="card" style={{ padding: '1rem 1.25rem', background: 'var(--white)', borderRadius: '12px', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        
        {/* BUSCADOR POR TEXTO */}
        <div style={{ flex: 1, minWidth: '220px', position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por asunto, estudiante o contenido..."
            style={{
              width: '100%',
              padding: '0.45rem 0.85rem 0.45rem 2.2rem',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              fontSize: '0.84rem'
            }}
          />
        </div>

        {/* FILTRO POR CLASE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Filter size={14} color="var(--text-muted)" />
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="todos">Todas las clases</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* ORDEN POR FECHA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem' }}>
          <Clock size={14} color="var(--text-muted)" />
          <select
            value={dateOrder}
            onChange={(e) => setDateOrder(e.target.value)}
            style={{ padding: '0.45rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.82rem', background: '#fff' }}
          >
            <option value="desc">Más recientes primero</option>
            <option value="asc">Más antiguas primero</option>
          </select>
        </div>

      </div>

      {/* LISTADO DE DUDAS / ESTADO VACÍO */}
      {filteredDoubts.length === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'var(--white)', borderRadius: '12px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(202, 138, 4, 0.08)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
            <MessageSquare size={32} />
          </div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.4rem' }}>
            No hay dudas por revisar
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', maxWidth: '480px', margin: '0 auto', lineHeight: 1.5 }}>
            Las dudas enviadas por los estudiantes aparecerán aquí, organizadas por programa y clase.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {filteredDoubts.map(d => (
            <div
              key={d.id}
              className="card"
              style={{
                padding: '1.25rem',
                background: 'var(--white)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
                transition: 'border-color 0.2s ease'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--navy)' }}>
                      {d.subject}
                    </h4>
                    <StatusChip status={d.status} />
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', margin: '0 0 0.6rem 0', lineHeight: 1.45 }}>
                    {d.description?.length > 180 ? `${d.description.substring(0, 180)}...` : d.description}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    <span>Estudiante: <strong style={{ color: 'var(--navy)' }}>{d.users_profile?.full_name || 'Estudiante'}</strong> ({d.users_profile?.email || 'Sin correo'})</span>
                    <span>•</span>
                    <span>Clase: <strong style={{ color: 'var(--navy)' }}>{d.class_sessions?.title || 'Clase'}</strong></span>
                    <span>•</span>
                    <span>Fecha: {new Date(d.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* ACCIONES DEL DOCENTE (SIN OPCIONES DE ESCRIBIR RESPUESTAS) */}
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => setSelectedDoubt(d)}
                    className="btn btn-outline"
                    style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    <Eye size={13} /> Ver detalle
                  </button>

                  {d.status !== 'revisada' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'revisada')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#92400e', borderColor: '#fde68a', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Eye size={13} /> Marcar revisada
                    </button>
                  )}

                  {d.status !== 'atendida' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'atendida')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#166534', borderColor: '#bbf7d0', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <CheckCircle2 size={13} /> Atendida en clase
                    </button>
                  )}

                  {d.status !== 'archivada' && (
                    <button
                      onClick={() => handleStatusUpdate(d.id, 'archivada')}
                      className="btn btn-outline"
                      style={{ fontSize: '0.76rem', padding: '0.35rem 0.75rem', color: '#475569', borderColor: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                    >
                      <Layers size={13} /> Archivar
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL DE DETALLE COMPLETO DE LA DUDA */}
      {selectedDoubt && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 2000, padding: '1rem'
          }}
          onClick={() => setSelectedDoubt(null)}
        >
          <div
            className="card"
            style={{
              width: '100%', maxWidth: '620px', maxHeight: '90vh', overflowY: 'auto',
              background: '#ffffff', borderRadius: '16px', padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)', position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* CERRAR */}
            <button
              type="button"
              onClick={() => setSelectedDoubt(null)}
              style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            {/* HEADER DEL MODAL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={22} color="var(--gold-dark)" />
              </div>
              <div>
                <StatusChip status={selectedDoubt.status} />
                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  {selectedDoubt.subject}
                </h3>
              </div>
            </div>

            {/* METADATOS COMPLETOS */}
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', border: '1px solid var(--border-color)' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Estudiante:</span>
                <strong style={{ color: 'var(--navy)' }}>{selectedDoubt.users_profile?.full_name || 'Estudiante'}</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{selectedDoubt.users_profile?.email || 'Sin correo'}</div>
              </div>

              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block' }}>Clase vinculada:</span>
                <strong style={{ color: 'var(--navy)' }}>{selectedDoubt.class_sessions?.title || 'Clase'}</strong>
                <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                  Enviada el: {new Date(selectedDoubt.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>

            {/* CONTENIDO DE LA CONSULTA */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.4rem' }}>
                Descripción de la duda:
              </label>
              <div style={{ background: '#ffffff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '1rem', fontSize: '0.88rem', color: 'var(--navy)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                {selectedDoubt.description}
              </div>
            </div>

            {/* AVISO EXPLICATIVO DOCENTE */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={16} color="#2563eb" style={{ flexShrink: 0 }} />
              <span>Esta duda será atendida por el docente durante la sesión de clase o espacio académico correspondiente.</span>
            </div>

            {/* ACCIONES RÁPIDAS DE ESTADO */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              {selectedDoubt.status !== 'revisada' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'revisada')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', color: '#92400e', borderColor: '#fde68a' }}
                >
                  <Eye size={14} /> Marcar como revisada
                </button>
              )}

              {selectedDoubt.status !== 'atendida' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'atendida')}
                  className="btn"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', background: '#166534', color: '#fff', border: 'none' }}
                >
                  <CheckCircle2 size={14} /> Atendida en clase
                </button>
              )}

              {selectedDoubt.status !== 'archivada' && (
                <button
                  onClick={() => handleStatusUpdate(selectedDoubt.id, 'archivada')}
                  className="btn btn-outline"
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem', color: '#475569' }}
                >
                  <Layers size={14} /> Archivar
                </button>
              )}

              <button
                onClick={() => setSelectedDoubt(null)}
                className="btn btn-outline"
                style={{ fontSize: '0.82rem', padding: '0.5rem 0.9rem' }}
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


/* ─────────────────────────────────────────
   TAB: Estudiantes
───────────────────────────────────────── */
function EstudiantesTab() {
  const { programId } = useTeacherContext();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudents() {
      if (!programId) return;
      try {
        const { data, error } = await supabase
          .from('enrollments')
          .select('student_id, created_at, users_profile:student_id(*)')
          .eq('program_id', programId);
        if (error) throw error;
        
        // Filtrar exclusivamente los estudiantes vinculados a este programa
        const programStudents = (data || []).filter(item => 
          item.users_profile && item.users_profile.role === 'student'
        );
        
        setStudents(programStudents);
      } catch (err) {
        console.error('Error al obtener estudiantes:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [programId]);

  if (loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando estudiantes...</div>;

  return (
    <div className="card" style={{ padding: '1.5rem', background: 'var(--white)', borderRadius: '12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>
            Estudiantes Inscritos ({students.length})
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '4px 0 0 0' }}>
            Listado oficial de estudiantes matriculados en este programa.
          </p>
        </div>
      </div>

      {students.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          No hay estudiantes inscritos en este programa por el momento.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {students.map(item => (
            <div key={item.student_id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '1rem', borderRadius: '10px', background: 'var(--bg-light)', border: '1px solid var(--border-color)' }}>
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'var(--navy)', color: 'var(--gold)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                {item.users_profile?.full_name ? item.users_profile.full_name.charAt(0).toUpperCase() : 'E'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.users_profile?.full_name || 'Estudiante'}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.users_profile?.email || 'Sin correo registrado'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   COMPONENTE PRINCIPAL
â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
/* ─── Borradores IA ─────────────────────────────────────────────────────── */

function BorradoresTab() {
  const { programId } = useTeacherContext();
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDrafts = async () => {
    setLoading(true);
    try {
      // 1. Obtener clases del programa actual
      const { data: classesData, error: classesErr } = await supabase
        .from('class_sessions')
        .select('id, title, program_id')
        .eq('program_id', programId);

      if (classesErr) {
        console.warn('Error cargando clases del programa:', classesErr);
      }

      const classIds = (classesData || []).map(c => c.id);
      const classMap = {};
      (classesData || []).forEach(c => { classMap[c.id] = c; });

      // 2. Consultar borradores (excluyendo rechazados o eliminados)
      let query = supabase
        .from('activity_drafts')
        .select('id, class_id, status, drive_folder_id, created_at, draft_data, reviewed_at')
        .neq('status', 'rejected')
        .order('created_at', { ascending: false });

      if (classIds.length > 0) {
        query = query.in('class_id', classIds);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Vincular datos de clase para renderizar
      const formattedDrafts = (data || []).map(d => ({
        ...d,
        class_sessions: classMap[d.class_id] || { id: d.class_id, title: 'Clase vinculada' }
      }));

      setDrafts(formattedDrafts);
    } catch (err) {
      console.error('Error cargando borradores:', err);
      showToast(`Error: ${err.message || 'No se pudieron cargar los borradores'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDrafts(); }, [programId]);

  // Helper para sincronizar la actividad en las tablas públicas de Supabase
  const syncAndPublishActivity = async (classId, draftData) => {
    // 1. Upsert / update en class_activities
    const { data: existingAct } = await supabase
      .from('class_activities')
      .select('id')
      .eq('class_id', classId)
      .maybeSingle();

    let activityId;

    if (existingAct) {
      const { data: updatedAct, error: updateErr } = await supabase
        .from('class_activities')
        .update({
          title: draftData.activity_title || 'Actividad de Reforzamiento',
          description: draftData.activity_description || '',
          is_published: true,
          max_attempts: 3,
          is_mandatory: false,
        })
        .eq('id', existingAct.id)
        .select('id')
        .single();

      if (updateErr) throw updateErr;
      activityId = updatedAct.id;

      // Limpiar preguntas anteriores para re-insertar limpiamente
      await supabase.from('activity_questions').delete().eq('activity_id', activityId);
    } else {
      const { data: newAct, error: actErr } = await supabase
        .from('class_activities')
        .insert({
          class_id: classId,
          title: draftData.activity_title || 'Actividad de Reforzamiento',
          description: draftData.activity_description || '',
          is_published: true,
          max_attempts: 3,
          is_mandatory: false,
        })
        .select('id')
        .single();

      if (actErr) throw actErr;
      activityId = newAct.id;
    }

    // 2. Insertar preguntas y opciones
    const questions = draftData.questions || [];
    for (let qIndex = 0; qIndex < questions.length; qIndex++) {
      const q = questions[qIndex];

      const { data: qData, error: qErr } = await supabase
        .from('activity_questions')
        .insert({
          activity_id: activityId,
          text: q.text,
          question_type: q.question_type || 'single_choice',
          order_num: qIndex + 1,
        })
        .select('id')
        .single();

      if (qErr) throw qErr;
      const questionId = qData.id;

      let correctOptId = null;

      for (let oIndex = 0; oIndex < (q.options || []).length; oIndex++) {
        const opt = q.options[oIndex];

        const { data: optData, error: optErr } = await supabase
          .from('question_options')
          .insert({
            question_id: questionId,
            text: opt.text,
            order_num: oIndex + 1,
          })
          .select('id')
          .single();

        if (optErr) throw optErr;

        if (opt.is_correct) {
          correctOptId = optData.id;
        }
      }

      if (correctOptId) {
        await supabase
          .from('question_correct_answers')
          .upsert({
            question_id: questionId,
            correct_option_id: correctOptId,
          }, { onConflict: 'question_id' });
      }
    }
  };

  const handleApprove = async (draft) => {
    if (!window.confirm(`¿Publicar la actividad "${draft.draft_data?.activity_title}" para los alumnos?`)) return;
    setActionLoading(draft.id + '-approve');
    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (!classId) throw new Error('No se encontró el ID de la clase vinculada.');

      await syncAndPublishActivity(classId, draft.draft_data);

      await supabase
        .from('activity_drafts')
        .update({ status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);

      showToast('¡Actividad publicada exitosamente!');
      fetchDrafts();
    } catch (err) {
      console.error('Error aprobando borrador:', err);
      showToast(`Error al publicar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnpublish = async (draft) => {
    if (!window.confirm(`¿Despublicar la actividad "${draft.draft_data?.activity_title}"? Los estudiantes ya no podrán verla ni responderla.`)) return;
    setActionLoading(draft.id + '-unpublish');
    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (classId) {
        await supabase
          .from('class_activities')
          .update({ is_published: false })
          .eq('class_id', classId);
      }

      await supabase
        .from('activity_drafts')
        .update({ status: 'pending' })
        .eq('id', draft.id);

      showToast('Actividad despublicada. Ha vuelto a estado pendiente.', 'info');
      fetchDrafts();
    } catch (err) {
      console.error('Error despublicando borrador:', err);
      showToast(`Error al despublicar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (draft) => {
    if (!window.confirm(`¿Eliminar permanentemente el borrador "${draft.draft_data?.activity_title || 'este borrador'}"? Esta acción no se puede deshacer.`)) return;
    setActionLoading(draft.id + '-delete');
    
    // Remover inmediatamente de la vista para respuesta instantánea
    setDrafts(prev => prev.filter(d => d.id !== draft.id));

    try {
      const classId = draft.class_id || draft.class_sessions?.id;
      if (draft.status === 'approved' && classId) {
        const deleteClassAct = window.confirm('Este borrador ya estaba publicado. ¿Deseas también eliminar la actividad de la clase para que los estudiantes ya no la vean?');
        if (deleteClassAct) {
          const { data: act } = await supabase.from('class_activities').select('id').eq('class_id', classId).maybeSingle();
          if (act) {
            await supabase.from('activity_questions').delete().eq('activity_id', act.id);
            await supabase.from('class_activities').delete().eq('id', act.id);
          }
        }
      }

      // 1. Cambiar estado a 'rejected' en la base de datos (para asegurar la eliminación lógica incluso si RLS bloquea DELETE)
      const { error: updateErr } = await supabase
        .from('activity_drafts')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);

      if (updateErr) {
        console.error('Error al actualizar estado del borrador:', updateErr);
      }

      // 2. Intentar la eliminación física del registro
      const { error: delErr } = await supabase
        .from('activity_drafts')
        .delete()
        .eq('id', draft.id);

      if (delErr) {
        console.warn('No se pudo borrar físicamente (posible política RLS), pero se marcó como rejected:', delErr);
      }

      showToast('Borrador eliminado exitosamente.');
    } catch (err) {
      console.error('Error eliminando borrador:', err);
      showToast(`Error al eliminar: ${err.message || 'Intenta de nuevo'}`, 'error');
      // En caso de fallo grave, recargar lista
      fetchDrafts();
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (draft) => {
    if (!window.confirm('¿Rechazar y descartar este borrador?')) return;
    setActionLoading(draft.id + '-reject');
    try {
      await supabase
        .from('activity_drafts')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
        .eq('id', draft.id);
      showToast('Borrador rechazado.', 'info');
      fetchDrafts();
    } catch (err) {
      showToast('Error al rechazar el borrador.', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  // --- LÓGICA DE EDICIÓN DEL BORRADOR ---
  const [editingDraft, setEditingDraft] = useState(null);
  const [editFormData, setEditFormData] = useState(null);

  const startEditing = (draft) => {
    setEditingDraft(draft);
    setEditFormData(JSON.parse(JSON.stringify(draft.draft_data || {
      activity_title: '',
      activity_description: '',
      questions: []
    })));
  };

  const handleSaveEditedDraft = async (publishDirectly = false) => {
    if (!editingDraft || !editFormData) return;
    if (!editFormData.activity_title?.trim()) {
      alert('Por favor asigna un título a la actividad.');
      return;
    }

    setActionLoading('saving-edit');
    try {
      const classId = editingDraft.class_id || editingDraft.class_sessions?.id;
      const shouldPublish = publishDirectly || editingDraft.status === 'approved';

      // 1. Guardar cambios en activity_drafts
      const { error: draftErr } = await supabase
        .from('activity_drafts')
        .update({
          draft_data: editFormData,
          status: shouldPublish ? 'approved' : editingDraft.status,
          reviewed_at: shouldPublish ? new Date().toISOString() : editingDraft.reviewed_at
        })
        .eq('id', editingDraft.id);

      if (draftErr) throw draftErr;

      // 2. Si se publica o ya estaba aprobado, sincronizar en base de datos real
      if (shouldPublish && classId) {
        await syncAndPublishActivity(classId, editFormData);
      }

      showToast(shouldPublish ? '¡Borrador guardado y publicado exitosamente!' : 'Borrador guardado con éxito.');
      setEditingDraft(null);
      setEditFormData(null);
      fetchDrafts();
    } catch (err) {
      console.error('Error guardando cambios del borrador:', err);
      showToast(`Error al guardar: ${err.message || 'Intenta de nuevo'}`, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadge = (status) => {
    const styles = {
      pending:  { bg: '#fef9c3', color: '#854d0e', label: 'Pendiente',  icon: <Bot size={12} /> },
      approved: { bg: '#dcfce7', color: '#166534', label: 'Publicado',  icon: <CheckCheck size={12} /> },
      rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rechazado',  icon: <XCircle size={12} /> },
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: s.bg, color: s.color,
        padding: '2px 10px', borderRadius: '12px', fontSize: '0.74rem', fontWeight: 700
      }}>
        {s.icon} {s.label}
      </span>
    );
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando borradores...</div>;

  return (
    <div style={{ padding: '1.5rem 0' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem', zIndex: 9999,
          background: toast.type === 'error' ? '#dc2626' : toast.type === 'info' ? '#0369a1' : '#16a34a',
          color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '10px',
          fontWeight: 600, fontSize: '0.88rem', boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
        }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={20} color="var(--gold-dark)" />
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)' }}>
            Borradores generados por IA
          </h3>
        </div>
        <button
          onClick={fetchDrafts}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.85rem', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)' }}
        >
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Info banner */}
      <div style={{
        background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px',
        padding: '0.75rem 1rem', marginBottom: '1.25rem',
        display: 'flex', alignItems: 'flex-start', gap: '0.6rem', fontSize: '0.83rem', color: '#1e40af'
      }}>
        <Bot size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          Estos borradores fueron generados automáticamente a partir del contenido de las clases.
          Puedes <strong>editar</strong> sus preguntas y retroalimentación, <strong>publicar</strong> para tus estudiantes, <strong>despublicar</strong> o <strong>eliminar</strong> cuando lo necesites.
        </span>
      </div>

      {/* Lista */}
      {drafts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
          <Bot size={40} style={{ marginBottom: '0.75rem', opacity: 0.4 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>No hay borradores</p>
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem' }}>Cuando se procese una sesión de clase, el borrador aparecerá aquí.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {drafts.map(draft => (
            <div key={draft.id} style={{
              background: '#fff', border: '1px solid var(--border-color)',
              borderRadius: '12px', overflow: 'hidden',
              boxShadow: draft.status === 'pending' ? '0 0 0 2px rgba(202,138,4,0.15)' : 'none'
            }}>
              {/* Cabecera del borrador */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '1rem 1.25rem', gap: '1rem', flexWrap: 'wrap'
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                    {statusBadge(draft.status)}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(draft.created_at).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {draft.draft_data?.activity_title || 'Sin título'}
                  </p>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Clase: <strong>{draft.class_sessions?.title}</strong> · {draft.draft_data?.questions?.length || 0} preguntas
                  </p>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '0.45rem', flexShrink: 0, flexWrap: 'wrap' }}>
                  {/* Previsualizar */}
                  <button
                    onClick={() => setExpandedId(expandedId === draft.id ? null : draft.id)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600
                    }}
                  >
                    <Eye size={13} />
                    {expandedId === draft.id ? 'Ocultar' : 'Ver'}
                    {expandedId === draft.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>

                  {/* Editar */}
                  <button
                    onClick={() => startEditing(draft)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #93c5fd',
                      background: '#eff6ff', color: '#1d4ed8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700
                    }}
                  >
                    <Edit3 size={13} /> Editar
                  </button>

                  {/* Botones según estado */}
                  {draft.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(draft)}
                        disabled={!!actionLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none',
                          background: 'var(--navy)', color: '#fff', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === draft.id + '-approve' ? '...' : <><Check size={13} /> Publicar</>}
                      </button>
                      <button
                        onClick={() => handleReject(draft)}
                        disabled={!!actionLoading}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                          padding: '0.45rem 0.75rem', borderRadius: '8px', border: '1px solid #fca5a5',
                          background: '#fff7f7', color: '#dc2626', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                        }}
                      >
                        {actionLoading === draft.id + '-reject' ? '...' : <><XCircle size={13} /> Rechazar</>}
                      </button>
                    </>
                  )}

                  {draft.status === 'approved' && (
                    <button
                      onClick={() => handleUnpublish(draft)}
                      disabled={!!actionLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.45rem 0.85rem', borderRadius: '8px', border: '1px solid #fde047',
                        background: '#fef9c3', color: '#854d0e', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      {actionLoading === draft.id + '-unpublish' ? '...' : <><EyeOff size={13} /> Despublicar</>}
                    </button>
                  )}

                  {draft.status === 'rejected' && (
                    <button
                      onClick={() => handleApprove(draft)}
                      disabled={!!actionLoading}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        padding: '0.45rem 0.85rem', borderRadius: '8px', border: 'none',
                        background: 'var(--navy)', color: '#fff', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                      }}
                    >
                      {actionLoading === draft.id + '-approve' ? '...' : <><Check size={13} /> Publicar</>}
                    </button>
                  )}

                  {/* Eliminar borrador */}
                  <button
                    onClick={() => handleDelete(draft)}
                    disabled={!!actionLoading}
                    title="Eliminar borrador permanentemente"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.45rem 0.65rem', borderRadius: '8px', border: '1px solid #fecaca',
                      background: '#fff1f2', color: '#e11d48', cursor: 'pointer',
                      fontSize: '0.8rem', fontWeight: 700, opacity: actionLoading ? 0.6 : 1
                    }}
                  >
                    {actionLoading === draft.id + '-delete' ? '...' : <Trash2 size={13} />}
                  </button>
                </div>
              </div>

              {/* Previsualización expandida de preguntas */}
              {expandedId === draft.id && (
                <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.25rem', background: '#fafafa' }}>
                  <p style={{ margin: '0 0 0.75rem', fontSize: '0.83rem', color: 'var(--text-muted)' }}>
                    {draft.draft_data?.activity_description}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {(draft.draft_data?.questions || []).map((q, qi) => (
                      <div key={qi} style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '10px', padding: '0.85rem 1rem' }}>
                        <p style={{ margin: '0 0 0.6rem', fontWeight: 700, fontSize: '0.87rem', color: 'var(--navy)' }}>
                          {qi + 1}. {q.text}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {(q.options || []).map((opt, oi) => (
                            <div key={oi} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '0.4rem 0.65rem', borderRadius: '7px', fontSize: '0.83rem',
                              background: opt.is_correct ? '#dcfce7' : '#f8fafc',
                              border: `1px solid ${opt.is_correct ? '#86efac' : 'var(--border-color)'}`,
                              color: opt.is_correct ? '#166534' : 'var(--text-dark)',
                              fontWeight: opt.is_correct ? 700 : 400
                            }}>
                              {opt.is_correct ? <Check size={13} /> : <span style={{ width: 13 }} />}
                              {opt.text}
                            </div>
                          ))}
                        </div>
                        {(q.explanation || q.source_basis) && (
                          <div style={{
                            margin: '0.6rem 0 0',
                            padding: '0.55rem 0.8rem',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            color: '#1e40af',
                            lineHeight: 1.45,
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '0.45rem'
                          }}>
                            <span style={{ flexShrink: 0 }}>💡</span>
                            <span>
                              {(() => {
                                const exp = (q.explanation || '').trim();
                                const src = (q.source_basis || '').trim();
                                if (exp && src && !exp.toLowerCase().includes(src.toLowerCase())) {
                                  return `${exp} (Fundamentado en la clase: ${src})`;
                                }
                                return exp || src;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ─── MODAL DE EDICIÓN DEL BORRADOR ─── */}
      {editingDraft && editFormData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '820px',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', border: '1px solid var(--border-color)',
            overflow: 'hidden'
          }}>
            {/* Header del Modal */}
            <div style={{
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'var(--bg-light)'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Editar Borrador de Actividad
                </h3>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Clase: {editingDraft.class_sessions?.title}
                </p>
              </div>
              <button
                onClick={() => { setEditingDraft(null); setEditFormData(null); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Cuerpo con scroll */}
            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Título de la actividad */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                  Título de la actividad *
                </label>
                <input
                  type="text"
                  value={editFormData.activity_title || ''}
                  onChange={e => setEditFormData({ ...editFormData, activity_title: e.target.value })}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', fontSize: '0.9rem', outline: 'none'
                  }}
                  placeholder="Ej: Cuestionario de Reforzamiento - Sesión 1"
                />
              </div>

              {/* Descripción */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.4rem' }}>
                  Instrucciones o descripción
                </label>
                <textarea
                  rows={2}
                  value={editFormData.activity_description || ''}
                  onChange={e => setEditFormData({ ...editFormData, activity_description: e.target.value })}
                  style={{
                    width: '100%', padding: '0.65rem 0.85rem', borderRadius: '8px',
                    border: '1px solid var(--border-color)', fontSize: '0.88rem', outline: 'none', resize: 'vertical'
                  }}
                  placeholder="Instrucciones para los estudiantes..."
                />
              </div>

              {/* Lista de preguntas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--navy)' }}>
                    Preguntas ({editFormData.questions?.length || 0})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const newQ = {
                        text: 'Nueva pregunta...',
                        question_type: 'single_choice',
                        options: [
                          { text: 'Opción 1', is_correct: true },
                          { text: 'Opción 2', is_correct: false },
                          { text: 'Opción 3', is_correct: false },
                          { text: 'Opción 4', is_correct: false },
                        ],
                        explanation: '',
                        source_basis: ''
                      };
                      setEditFormData({
                        ...editFormData,
                        questions: [...(editFormData.questions || []), newQ]
                      });
                    }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                      padding: '0.35rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                      background: '#fff', color: 'var(--navy)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <PlusCircle size={14} /> Agregar Pregunta
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {(editFormData.questions || []).map((q, qIdx) => (
                    <div key={qIdx} style={{
                      background: 'var(--bg-light)', border: '1px solid var(--border-color)',
                      borderRadius: '12px', padding: '1.1rem', position: 'relative'
                    }}>
                      {/* Header de la pregunta */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--navy)', background: '#e2e8f0', padding: '2px 8px', borderRadius: '6px' }}>
                          Pregunta {qIdx + 1}
                        </span>
                        {editFormData.questions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const updated = editFormData.questions.filter((_, idx) => idx !== qIdx);
                              setEditFormData({ ...editFormData, questions: updated });
                            }}
                            style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', fontWeight: 600 }}
                          >
                            <Trash2 size={13} /> Eliminar
                          </button>
                        )}
                      </div>

                      {/* Enunciado */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          Enunciado
                        </label>
                        <textarea
                          rows={2}
                          value={q.text || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].text = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.88rem', outline: 'none'
                          }}
                        />
                      </div>

                      {/* Opciones */}
                      <div style={{ marginBottom: '0.85rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.35rem' }}>
                          Opciones de respuesta (Marca cuál es la correcta)
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {(q.options || []).map((opt, oIdx) => (
                            <div key={oIdx} style={{
                              display: 'flex', alignItems: 'center', gap: '0.5rem',
                              background: '#ffffff', padding: '0.4rem 0.6rem', borderRadius: '8px',
                              border: opt.is_correct ? '1.5px solid #22c55e' : '1px solid var(--border-color)'
                            }}>
                              <input
                                type="radio"
                                name={`correct-opt-${qIdx}`}
                                checked={!!opt.is_correct}
                                onChange={() => {
                                  const updated = [...editFormData.questions];
                                  updated[qIdx].options = updated[qIdx].options.map((o, i) => ({
                                    ...o,
                                    is_correct: i === oIdx
                                  }));
                                  setEditFormData({ ...editFormData, questions: updated });
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                              <input
                                type="text"
                                value={opt.text || ''}
                                onChange={e => {
                                  const updated = [...editFormData.questions];
                                  updated[qIdx].options[oIdx].text = e.target.value;
                                  setEditFormData({ ...editFormData, questions: updated });
                                }}
                                style={{
                                  flex: 1, border: 'none', outline: 'none', fontSize: '0.85rem',
                                  fontWeight: opt.is_correct ? 700 : 400, color: 'var(--navy)'
                                }}
                                placeholder={`Opción ${oIdx + 1}`}
                              />
                              {opt.is_correct && (
                                <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 700, background: '#dcfce7', padding: '1px 6px', borderRadius: '4px' }}>
                                  Correcta
                                </span>
                              )}
                              {(q.options || []).length > 2 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...editFormData.questions];
                                    updated[qIdx].options = updated[qIdx].options.filter((_, i) => i !== oIdx);
                                    // Si eliminó la correcta, poner la primera como correcta
                                    if (opt.is_correct && updated[qIdx].options.length > 0) {
                                      updated[qIdx].options[0].is_correct = true;
                                    }
                                    setEditFormData({ ...editFormData, questions: updated });
                                  }}
                                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '2px' }}
                                  title="Eliminar opción"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].options = [
                              ...(updated[qIdx].options || []),
                              { text: '', is_correct: false }
                            ];
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            marginTop: '0.4rem', background: 'none', border: 'none',
                            color: 'var(--navy)', fontSize: '0.75rem', fontWeight: 700,
                            cursor: 'pointer', padding: 0, display: 'inline-flex', alignItems: 'center', gap: '3px'
                          }}
                        >
                          + Agregar opción
                        </button>
                      </div>

                      {/* Retroalimentación de la IA */}
                      <div style={{ marginBottom: '0.6rem' }}>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          💡 Retroalimentación Pedagógica (Explicación para el estudiante)
                        </label>
                        <textarea
                          rows={2}
                          value={q.explanation || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].explanation = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.5rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.82rem', outline: 'none'
                          }}
                          placeholder="Explica por qué esta es la respuesta correcta y cómo se relaciona con el contenido..."
                        />
                      </div>

                      {/* Fundamento en la clase */}
                      <div>
                        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
                          📌 Fundamento en la clase
                        </label>
                        <input
                          type="text"
                          value={q.source_basis || ''}
                          onChange={e => {
                            const updated = [...editFormData.questions];
                            updated[qIdx].source_basis = e.target.value;
                            setEditFormData({ ...editFormData, questions: updated });
                          }}
                          style={{
                            width: '100%', padding: '0.45rem 0.75rem', borderRadius: '7px',
                            border: '1px solid var(--border-color)', fontSize: '0.82rem', outline: 'none'
                          }}
                          placeholder="Ej: Minuto 14:20 - Introducción al concepto de..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer del modal con botones de acción */}
            <div style={{
              padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)',
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.75rem',
              background: '#f8fafc'
            }}>
              <button
                type="button"
                onClick={() => { setEditingDraft(null); setEditFormData(null); }}
                style={{
                  padding: '0.55rem 1.15rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: '#fff', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => handleSaveEditedDraft(false)}
                disabled={actionLoading === 'saving-edit'}
                style={{
                  padding: '0.55rem 1.25rem', borderRadius: '8px', border: '1px solid var(--navy)',
                  background: '#fff', color: 'var(--navy)', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem'
                }}
              >
                <Save size={14} /> Guardar borrador
              </button>

              <button
                type="button"
                onClick={() => handleSaveEditedDraft(true)}
                disabled={actionLoading === 'saving-edit'}
                style={{
                  padding: '0.55rem 1.35rem', borderRadius: '8px', border: 'none',
                  background: 'var(--navy)', color: '#fff', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
                }}
              >
                <CheckCheck size={14} /> Guardar y Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL DE CALIFICACIÓN Y RETROALIMENTACIÓN (GradingModal)
───────────────────────────────────────────────────────────── */
function GradingModal({ evaluation, onClose, onGraded, teacherId }) {
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'submitted' | 'graded' | 'pending'
  const [searchStudent, setSearchStudent] = useState('');
  const [gradeInput, setGradeInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [savingGrade, setSavingGrade] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const isAssignment = evaluation.evalType === 'assignment';
  const maxScore = Number(evaluation.max_score) || 100;

  // Cargar estudiantes inscritos y sus entregas
  const loadSubmissionsData = async () => {
    setLoading(true);
    try {
      // 1. Obtener alumnos inscritos
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('student_id, users_profile!inner(id, full_name, email)')
        .eq('program_id', evaluation.program_id)
        .eq('users_profile.role', 'student');

      const studentList = (enrollData || []).map(e => ({
        id: e.users_profile?.id || e.student_id,
        name: e.users_profile?.full_name || 'Estudiante',
        email: e.users_profile?.email || ''
      }));

      // 2. Obtener entregas según tipo
      let subMap = {};
      if (isAssignment) {
        const { data: subs } = await supabase
          .from('assignment_submissions')
          .select('*')
          .eq('assignment_id', evaluation.id);

        (subs || []).forEach(s => {
          subMap[s.student_id] = s;
        });
      } else {
        const { data: qSubs } = await supabase
          .from('quiz_submissions')
          .select('*')
          .eq('quiz_id', evaluation.id);

        (qSubs || []).forEach(qs => {
          subMap[qs.student_id] = {
            id: qs.id,
            student_id: qs.student_id,
            grade: qs.score,
            feedback: qs.feedback || '',
            submitted_at: qs.completed_at,
            status: qs.status || 'graded',
            comments: 'Cuestionario completado por el estudiante'
          };
        });
      }

      setStudents(studentList);
      setSubmissions(subMap);

      if (studentList.length > 0 && !selectedStudentId) {
        // Seleccionar primer alumno por calificar o primero de la lista
        const firstSubmitted = studentList.find(st => subMap[st.id]?.status === 'submitted');
        const initial = firstSubmitted || studentList[0];
        setSelectedStudentId(initial.id);
        const currentSub = subMap[initial.id];
        setGradeInput(currentSub?.grade !== null && currentSub?.grade !== undefined ? currentSub.grade : '');
        setFeedbackInput(currentSub?.feedback || '');
      }
    } catch (err) {
      console.error('Error al cargar entregas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissionsData();
  }, [evaluation?.id]);

  const handleSelectStudent = (stId) => {
    setSelectedStudentId(stId);
    setFeedbackMsg('');
    const sub = submissions[stId];
    setGradeInput(sub?.grade !== null && sub?.grade !== undefined ? sub.grade : '');
    setFeedbackInput(sub?.feedback || '');
  };

  // Guardar calificación
  const handleSaveGrade = async () => {
    if (!selectedStudentId) return;
    setSavingGrade(true);
    setFeedbackMsg('');

    const numericGrade = gradeInput === '' ? null : Number(gradeInput);
    if (numericGrade !== null && (isNaN(numericGrade) || numericGrade < 0 || numericGrade > maxScore)) {
      setFeedbackMsg(`La calificación debe estar entre 0 y ${maxScore}`);
      setSavingGrade(false);
      return;
    }

    try {
      const now = new Date().toISOString();
      let existingSub = submissions[selectedStudentId];

      if (isAssignment) {
        if (existingSub?.id) {
          // Actualizar entrega existente
          const { error } = await supabase
            .from('assignment_submissions')
            .update({
              grade: numericGrade,
              feedback: feedbackInput,
              status: numericGrade !== null ? 'graded' : existingSub.status,
              graded_at: now,
              graded_by: teacherId || null
            })
            .eq('id', existingSub.id);
          if (error) throw error;
        } else {
          // Crear registro de entrega con la nota asignada directamente por el docente
          const { data: newSub, error } = await supabase
            .from('assignment_submissions')
            .insert([{
              assignment_id: evaluation.id,
              student_id: selectedStudentId,
              grade: numericGrade,
              feedback: feedbackInput,
              status: numericGrade !== null ? 'graded' : 'submitted',
              graded_at: now,
              graded_by: teacherId || null
            }])
            .select()
            .single();
          if (error) throw error;
          if (newSub) existingSub = newSub;
        }
      } else {
        // Cuestionario
        if (existingSub?.id) {
          await supabase
            .from('quiz_submissions')
            .update({
              score: numericGrade,
              feedback: feedbackInput,
              status: 'graded'
            })
            .eq('id', existingSub.id);
        } else {
          await supabase
            .from('quiz_submissions')
            .insert([{
              quiz_id: evaluation.id,
              student_id: selectedStudentId,
              score: numericGrade,
              feedback: feedbackInput,
              status: 'graded'
            }]);
        }
      }

      // Actualizar estado local
      setSubmissions(prev => ({
        ...prev,
        [selectedStudentId]: {
          ...(prev[selectedStudentId] || {}),
          grade: numericGrade,
          feedback: feedbackInput,
          status: numericGrade !== null ? 'graded' : (prev[selectedStudentId]?.status || 'submitted'),
          graded_at: now
        }
      }));

      setFeedbackMsg('✅ Calificación guardada con éxito.');
      if (onGraded) onGraded();

      // Desvanecer mensaje tras 2.5s
      setTimeout(() => setFeedbackMsg(''), 2500);
    } catch (err) {
      console.error('Error al guardar calificación:', err);
      setFeedbackMsg('❌ Error al guardar: ' + err.message);
    } finally {
      setSavingGrade(false);
    }
  };

  // Filtrado de alumnos
  const filteredStudents = students.filter(st => {
    const matchesSearch = st.name.toLowerCase().includes(searchStudent.toLowerCase()) || st.email.toLowerCase().includes(searchStudent.toLowerCase());
    if (!matchesSearch) return false;

    const sub = submissions[st.id];
    if (filterStatus === 'all') return true;
    if (filterStatus === 'submitted') return sub && sub.status === 'submitted';
    if (filterStatus === 'graded') return sub && (sub.status === 'graded' || sub.grade !== null && sub.grade !== undefined);
    if (filterStatus === 'pending') return !sub;
    return true;
  });

  const selectedStudent = students.find(st => st.id === selectedStudentId);
  const currentSubmission = selectedStudentId ? submissions[selectedStudentId] : null;

  // Navegación entre estudiantes
  const currentIndex = filteredStudents.findIndex(st => st.id === selectedStudentId);
  const handlePrevStudent = () => {
    if (currentIndex > 0) {
      handleSelectStudent(filteredStudents[currentIndex - 1].id);
    }
  };
  const handleNextStudent = () => {
    if (currentIndex < filteredStudents.length - 1) {
      handleSelectStudent(filteredStudents[currentIndex + 1].id);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#FFFFFF', width: '100%', maxWidth: '1050px', maxHeight: '90vh',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', overflow: 'hidden'
      }}>
        {/* Cabecera del Modal */}
        <div style={{
          padding: '1.25rem 1.5rem', background: '#14213D', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(252, 163, 17, 0.2)', padding: '0.5rem', borderRadius: '8px' }}>
              <FileCheck size={20} color="#FCA311" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, background: '#FCA311', color: '#14213D', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                  {isAssignment ? 'Tarea / Entregable' : 'Cuestionario'}
                </span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF' }}>
                  {evaluation.title}
                </h3>
              </div>
              <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#E5E5E5' }}>
                Puntaje Máximo: {maxScore} pts · Fecha Límite: {new Date(evaluation.due_date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer', padding: '0.4rem', borderRadius: '6px' }}
          >
            <X size={22} />
          </button>
        </div>

        {/* Cuerpo del Modal con Doble Columna */}
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          
          {/* COLUMNA IZQUIERDA: Lista de Estudiantes */}
          <div style={{ borderRight: '1px solid #E5E5E5', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
            {/* Buscador y Filtros */}
            <div style={{ padding: '0.85rem', borderBottom: '1px solid #E5E5E5' }}>
              <div style={{ position: 'relative', marginBottom: '0.5rem' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Buscar estudiante..."
                  value={searchStudent}
                  onChange={e => setSearchStudent(e.target.value)}
                  style={{
                    width: '100%', padding: '0.4rem 0.5rem 0.4rem 2rem', borderRadius: '6px',
                    border: '1px solid #E5E5E5', fontSize: '0.8rem', outline: 'none'
                  }}
                />
              </div>

              {/* Filtros de estado en pastillas */}
              <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                {[
                  { id: 'all', label: `Todos (${students.length})` },
                  { id: 'submitted', label: 'Por calificar' },
                  { id: 'graded', label: 'Calificados' },
                  { id: 'pending', label: 'Sin entrega' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id)}
                    style={{
                      border: 'none', borderRadius: '4px', padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                      background: filterStatus === tab.id ? '#14213D' : '#E2E8F0',
                      color: filterStatus === tab.id ? '#FFFFFF' : '#475569'
                    }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Listado con scroll */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem' }}>
              {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Cargando alumnos...
                </div>
              ) : filteredStudents.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  No se encontraron estudiantes
                </div>
              ) : (
                filteredStudents.map(st => {
                  const sub = submissions[st.id];
                  const isSelected = st.id === selectedStudentId;
                  const isGraded = sub && (sub.status === 'graded' || (sub.grade !== null && sub.grade !== undefined));
                  const isSubmitted = sub && sub.status === 'submitted';

                  return (
                    <div
                      key={st.id}
                      onClick={() => handleSelectStudent(st.id)}
                      style={{
                        padding: '0.65rem 0.75rem', borderRadius: '8px', marginBottom: '0.35rem',
                        cursor: 'pointer', transition: 'all 0.15s ease',
                        background: isSelected ? '#FFFFFF' : 'transparent',
                        border: isSelected ? '1px solid #14213D' : '1px solid transparent',
                        boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: isSelected ? 700 : 600, fontSize: '0.84rem', color: '#14213D' }}>
                          {st.name}
                        </div>
                        {isGraded ? (
                          <span style={{ fontSize: '0.72rem', fontWeight: 800, background: '#DCFCE7', color: '#15803D', padding: '1px 6px', borderRadius: '4px' }}>
                            {sub.grade}/{maxScore}
                          </span>
                        ) : isSubmitted ? (
                          <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309', padding: '1px 6px', borderRadius: '4px' }}>
                            Entregado
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94A3B8', fontWeight: 500 }}>
                            Sin entrega
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {st.email}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* COLUMNA DERECHA: Detalle de Entrega y Calificación */}
          <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: '1.5rem', background: '#FFFFFF' }}>
            {selectedStudent ? (
              <>
                {/* Header del Alumno Seleccionado */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1rem', borderBottom: '1px solid #E5E5E5', marginBottom: '1.25rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#14213D' }}>
                        {selectedStudent.name}
                      </h4>
                      {currentSubmission?.status === 'graded' && (
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Check size={12} /> Calificado
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {selectedStudent.email}
                    </p>
                  </div>

                  {/* Botones Anterior / Siguiente */}
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={handlePrevStudent}
                      disabled={currentIndex <= 0}
                      style={{
                        padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #E5E5E5',
                        background: '#FFFFFF', cursor: currentIndex <= 0 ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px',
                        color: currentIndex <= 0 ? '#94A3B8' : '#14213D'
                      }}
                    >
                      <ChevronLeft size={14} /> Anterior
                    </button>
                    <button
                      onClick={handleNextStudent}
                      disabled={currentIndex >= filteredStudents.length - 1}
                      style={{
                        padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #E5E5E5',
                        background: '#FFFFFF', cursor: currentIndex >= filteredStudents.length - 1 ? 'not-allowed' : 'pointer',
                        fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '2px',
                        color: currentIndex >= filteredStudents.length - 1 ? '#94A3B8' : '#14213D'
                      }}
                    >
                      Siguiente <ChevronRight size={14} />
                    </button>
                  </div>
                </div>

                {/* Información de la Entrega */}
                <div style={{ marginBottom: '1.5rem', background: '#F8FAFC', padding: '1rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#14213D', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <FileText size={15} color="#FCA311" />
                    Contenido de la Entrega
                  </div>

                  {currentSubmission ? (
                    <div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                        Entregado el: {new Date(currentSubmission.submitted_at || currentSubmission.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}
                      </div>

                      {/* Archivo o Enlace entregado */}
                      {currentSubmission.file_url ? (
                        <div style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: '#FFFFFF', border: '1px solid #CBD5E1', padding: '0.75rem 1rem',
                          borderRadius: '8px', marginBottom: '0.75rem'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                            <Folder size={18} color="#14213D" />
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#14213D', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {currentSubmission.file_url}
                            </div>
                          </div>
                          <a
                            href={currentSubmission.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
                              background: '#14213D', color: '#FFFFFF', padding: '0.4rem 0.8rem',
                              borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none',
                              flexShrink: 0
                            }}
                          >
                            <ExternalLink size={13} /> Abrir Entrega
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: '0.5rem' }}>
                          Sin archivo adjunto subido
                        </div>
                      )}

                      {/* Comentarios del alumno */}
                      {currentSubmission.comments && (
                        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', padding: '0.75rem', borderRadius: '6px', fontSize: '0.82rem', color: '#334155' }}>
                          <span style={{ fontWeight: 700, color: '#14213D' }}>Comentarios del alumno: </span>
                          "{currentSubmission.comments}"
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '1rem', textAlign: 'center', background: '#FFFFFF', borderRadius: '6px', border: '1px dashed #CBD5E1' }}>
                      <AlertCircle size={22} color="#94A3B8" style={{ margin: '0 auto 0.35rem auto' }} />
                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748B' }}>
                        El estudiante aún no ha realizado la entrega para esta evaluación.
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#94A3B8', marginTop: '2px' }}>
                        Puedes calificar directamente si se trata de una evaluación presencial o calificación extemporánea.
                      </div>
                    </div>
                  )}
                </div>

                {/* Formulario de Calificación */}
                <div style={{ background: '#FFFFFF', border: '1px solid #E5E5E5', padding: '1.25rem', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.03)' }}>
                  <h5 style={{ margin: '0 0 1rem 0', fontSize: '0.95rem', fontWeight: 700, color: '#14213D', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Award size={16} color="#FCA311" />
                    Asignar Calificación y Retroalimentación
                  </h5>

                  {/* Input de Nota */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.3rem' }}>
                        Nota (0 - {maxScore} pts)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input
                          type="number"
                          min="0"
                          max={maxScore}
                          step="0.1"
                          placeholder="Ej. 95"
                          value={gradeInput}
                          onChange={e => setGradeInput(e.target.value)}
                          style={{
                            width: '110px', padding: '0.5rem', borderRadius: '6px',
                            border: '2px solid #14213D', fontSize: '1.1rem', fontWeight: 800,
                            textAlign: 'center', color: '#14213D', outline: 'none'
                          }}
                        />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                          / {maxScore}
                        </span>
                      </div>
                    </div>

                    {/* Botones rápidos de porcentaje */}
                    <div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: '0.3rem', fontWeight: 600 }}>
                        Atajos rápidos:
                      </div>
                      <div style={{ display: 'flex', gap: '0.3rem' }}>
                        {[
                          { label: '100%', val: maxScore },
                          { label: '90%', val: maxScore * 0.9 },
                          { label: '80%', val: maxScore * 0.8 },
                          { label: '70%', val: maxScore * 0.7 },
                          { label: '0%', val: 0 }
                        ].map(preset => (
                          <button
                            key={preset.label}
                            type="button"
                            onClick={() => setGradeInput(preset.val.toString())}
                            style={{
                              background: '#F1F5F9', border: '1px solid #CBD5E1', padding: '0.35rem 0.55rem',
                              borderRadius: '4px', fontSize: '0.74rem', fontWeight: 700, color: '#334155', cursor: 'pointer'
                            }}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Retroalimentación Pedagógica */}
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.3rem' }}>
                      Retroalimentación pedagógica para el alumno (Feedback)
                    </label>
                    <textarea
                      rows="4"
                      placeholder="Escribe comentarios formativos, fortalezas de la entrega, aspectos a mejorar y recomendaciones para el estudiante..."
                      value={feedbackInput}
                      onChange={e => setFeedbackInput(e.target.value)}
                      style={{
                        width: '100%', padding: '0.65rem', borderRadius: '6px',
                        border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', resize: 'vertical'
                      }}
                    />
                  </div>

                  {/* Mensaje de feedback visual */}
                  {feedbackMsg && (
                    <div style={{
                      padding: '0.6rem 0.85rem', borderRadius: '6px', marginBottom: '1rem',
                      fontSize: '0.82rem', fontWeight: 600,
                      background: feedbackMsg.includes('✅') ? '#DCFCE7' : '#FEE2E2',
                      color: feedbackMsg.includes('✅') ? '#15803D' : '#991B1B'
                    }}>
                      {feedbackMsg}
                    </div>
                  )}

                  {/* Botón de Guardar */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={handleSaveGrade}
                      disabled={savingGrade}
                      style={{
                        background: '#14213D', color: '#FFFFFF', border: 'none',
                        padding: '0.6rem 1.5rem', borderRadius: '8px', fontSize: '0.88rem', fontWeight: 700,
                        cursor: savingGrade ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                        boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)', transition: 'all 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#FCA311'}
                      onMouseOut={e => e.currentTarget.style.background = '#14213D'}
                    >
                      <Save size={16} />
                      {savingGrade ? 'Guardando...' : 'Guardar Calificación'}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                Selecciona un estudiante de la lista izquierda para revisar su entrega y calificar.
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MODAL DE CREACIÓN / EDICIÓN DE EVALUACIÓN (EvaluationModal)
───────────────────────────────────────────────────────────── */
function EvaluationModal({ initialData, programId, modules, classes, onClose, onSaved, teacherId }) {
  const isEditing = !!initialData?.id;
  const [evalType, setEvalType] = useState(initialData?.evalType || 'assignment'); // 'assignment' | 'quiz'
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [moduleId, setModuleId] = useState(initialData?.module_id || (modules[0]?.id || ''));
  const [classId, setClassId] = useState(initialData?.class_id || '');
  const [dueDate, setDueDate] = useState(() => {
    if (initialData?.due_date) {
      // Formato YYYY-MM-DDTHH:mm para input datetime-local
      const d = new Date(initialData.due_date);
      return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    }
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    defaultDate.setHours(23, 59, 0, 0);
    return new Date(defaultDate.getTime() - defaultDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  });
  const [maxScore, setMaxScore] = useState(initialData?.max_score || 100);
  const [weightPercentage, setWeightPercentage] = useState(initialData?.weight_percentage || 0);
  const [allowedFileTypes, setAllowedFileTypes] = useState(initialData?.allowed_file_types || 'pdf,doc,docx,zip,link');
  const [isPublished, setIsPublished] = useState(initialData?.is_published !== false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Clases filtradas por el módulo seleccionado
  const filteredClasses = classes.filter(c => !moduleId || c.module_id === moduleId || c.session?.module_id === moduleId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Por favor ingresa un título para la evaluación.');
      return;
    }
    if (!dueDate) {
      setErrorMsg('Por favor define la fecha límite de entrega.');
      return;
    }

    setSaving(true);
    setErrorMsg('');

    try {
      const payload = {
        program_id: programId,
        teacher_id: teacherId || null,
        module_id: moduleId || null,
        class_id: classId || null,
        title: title.trim(),
        description: description.trim(),
        due_date: new Date(dueDate).toISOString(),
        max_score: Number(maxScore) || 100,
        is_published: isPublished
      };

      if (evalType === 'assignment') {
        payload.weight_percentage = Number(weightPercentage) || 0;
        payload.allowed_file_types = allowedFileTypes.trim();

        if (isEditing) {
          const { error } = await supabase
            .from('assignments')
            .update(payload)
            .eq('id', initialData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('assignments')
            .insert([payload]);
          if (error) throw error;
        }
      } else {
        // Quiz
        if (isEditing) {
          const { error } = await supabase
            .from('quizzes')
            .update(payload)
            .eq('id', initialData.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('quizzes')
            .insert([payload]);
          if (error) throw error;
        }
      }

      if (onSaved) onSaved();
      onClose();
    } catch (err) {
      console.error('Error al guardar evaluación:', err);
      setErrorMsg('Error al guardar: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
    }}>
      <div style={{
        background: '#FFFFFF', width: '100%', maxWidth: '640px', maxHeight: '90vh',
        borderRadius: '12px', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)', overflow: 'hidden'
      }}>
        {/* Cabecera */}
        <div style={{
          padding: '1.25rem 1.5rem', background: '#14213D', color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ background: 'rgba(252, 163, 17, 0.2)', padding: '0.45rem', borderRadius: '8px' }}>
              <PlusCircle size={18} color="#FCA311" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF' }}>
                {isEditing ? 'Editar Evaluación' : 'Crear Nueva Evaluación'}
              </h3>
              <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.76rem', color: '#E5E5E5' }}>
                Configura los parámetros, módulo y plazo para los estudiantes
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#FFFFFF', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Formulario con scroll */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
          {errorMsg && (
            <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', padding: '0.65rem 1rem', borderRadius: '6px', marginBottom: '1.25rem', fontSize: '0.82rem', fontWeight: 600 }}>
              {errorMsg}
            </div>
          )}

          {/* Selector de Tipo (solo si es nueva) */}
          {!isEditing && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#14213D', marginBottom: '0.4rem' }}>
                Tipo de Evaluación
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEvalType('assignment')}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', border: evalType === 'assignment' ? '2px solid #FCA311' : '1px solid #CBD5E1',
                    background: evalType === 'assignment' ? 'rgba(252, 163, 17, 0.08)' : '#FFFFFF',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem'
                  }}
                >
                  <FileText size={20} color={evalType === 'assignment' ? '#14213D' : '#64748B'} />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#14213D' }}>Tarea / Entregable</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Entrega de archivos (PDF, DOCX, ZIP o Link)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEvalType('quiz')}
                  style={{
                    padding: '0.75rem', borderRadius: '8px', border: evalType === 'quiz' ? '2px solid #FCA311' : '1px solid #CBD5E1',
                    background: evalType === 'quiz' ? 'rgba(252, 163, 17, 0.08)' : '#FFFFFF',
                    textAlign: 'left', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.6rem'
                  }}
                >
                  <FileCheck size={20} color={evalType === 'quiz' ? '#14213D' : '#64748B'} />
                  <div>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#14213D' }}>Cuestionario / Quiz</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Evaluación de conocimientos teóricos</div>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Título */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
              Título de la Evaluación *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Tarea Práctica: Caso de Estudio Módulo 2"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.86rem', outline: 'none' }}
            />
          </div>

          {/* Instrucciones / Descripción */}
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
              Instrucciones y Criterios de Evaluación
            </label>
            <textarea
              rows="3"
              placeholder="Detalla las instrucciones para los estudiantes, formato de entrega y rúbrica..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem', outline: 'none', resize: 'vertical' }}
            />
          </div>

          {/* Jerarquía: Módulo y Clase */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Módulo Asociado
              </label>
              <select
                value={moduleId}
                onChange={e => setModuleId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', background: '#FFFFFF', outline: 'none' }}
              >
                <option value="">Evaluación General del Programa</option>
                {modules.map((m, idx) => (
                  <option key={m.id} value={m.id}>
                    Módulo {m.order_index || idx + 1}: {m.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Clase Específica (Opcional)
              </label>
              <select
                value={classId}
                onChange={e => setClassId(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', background: '#FFFFFF', outline: 'none' }}
              >
                <option value="">Todo el módulo</option>
                {filteredClasses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Plazo y Calificación */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Fecha y Hora Límite *
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Puntaje Máximo
              </label>
              <input
                type="number"
                min="1"
                max="1000"
                value={maxScore}
                onChange={e => setMaxScore(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem', textAlign: 'center', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Ponderación (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={weightPercentage}
                onChange={e => setWeightPercentage(e.target.value)}
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.84rem', textAlign: 'center', outline: 'none' }}
              />
            </div>
          </div>

          {/* Tipos de Archivos Permitidos (si es tarea) */}
          {evalType === 'assignment' && (
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#14213D', marginBottom: '0.35rem' }}>
                Formatos permitidos (separados por coma)
              </label>
              <input
                type="text"
                value={allowedFileTypes}
                onChange={e => setAllowedFileTypes(e.target.value)}
                placeholder="pdf, doc, docx, zip, link"
                style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.82rem', outline: 'none' }}
              />
            </div>
          )}

          {/* Switch Publicado */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', marginBottom: '1.5rem' }}>
            <input
              type="checkbox"
              id="is_published_checkbox"
              checked={isPublished}
              onChange={e => setIsPublished(e.target.checked)}
              style={{ width: '16px', height: '16px', accentColor: '#14213D', cursor: 'pointer' }}
            />
            <label htmlFor="is_published_checkbox" style={{ fontSize: '0.84rem', fontWeight: 600, color: '#14213D', cursor: 'pointer' }}>
              Publicar inmediatamente (visible para los estudiantes en su portal)
            </label>
          </div>

          {/* Botones de acción */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.6rem 1.25rem', borderRadius: '8px', border: '1px solid #CBD5E1',
                background: '#FFFFFF', color: '#475569', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '0.6rem 1.5rem', borderRadius: '8px', border: 'none',
                background: '#14213D', color: '#FFFFFF', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem', boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
              }}
              onMouseOver={e => e.currentTarget.style.background = '#FCA311'}
              onMouseOut={e => e.currentTarget.style.background = '#14213D'}
            >
              <Save size={15} />
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar Evaluación' : 'Crear Evaluación')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   PESTAÑA DE EVALUACIONES (EvaluacionesTab)
   Fase 2: Gestión Integral de Tareas, Cuestionarios y Calificaciones
───────────────────────────────────────────────────────────── */
function EvaluacionesTab({ onChangeTab }) {
  const { profile, teacherId, programId, currentProgram } = useTeacherContext();
  const [evaluations, setEvaluations] = useState([]);
  const [modules, setModules] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState('all'); // 'all' | 'assignment' | 'quiz'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all' | 'pending_grade' | 'active' | 'closed' | 'draft'
  const [filterModule, setFilterModule] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Modales
  const [selectedEvaluationForGrading, setSelectedEvaluationForGrading] = useState(null);
  const [evaluationModalData, setEvaluationModalData] = useState(null);
  const [isEvaluationModalOpen, setIsEvaluationModalOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleteType, setDeleteType] = useState('assignment');

  const fetchEvaluationsData = async () => {
    if (!programId) return;
    setLoading(true);
    try {
      const teacherProfileId = teacherId || profile?.id;

      // 1. Cargar Módulos y Clases para nombres jerárquicos
      const { data: mods } = await supabase
        .from('modules')
        .select('*')
        .eq('program_id', programId)
        .order('order_index', { ascending: true });
      setModules(mods || []);

      const { data: cls } = await supabase
        .from('class_sessions')
        .select('id, title, module_id')
        .eq('program_id', programId);
      setClasses(cls || []);

      // 2. Conteo de estudiantes inscritos
      const { count: studentCount } = await supabase
        .from('enrollments')
        .select('student_id, users_profile!inner(role)', { count: 'exact', head: true })
        .eq('program_id', programId)
        .eq('users_profile.role', 'student');
      setEnrolledCount(studentCount || 0);

      // 3. Consultar Tareas (assignments)
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select(`
          *,
          assignment_submissions (
            id, student_id, grade, status, submitted_at
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      // 4. Consultar Cuestionarios (quizzes)
      const { data: quizzesData } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_submissions (
            id, student_id, score, status, completed_at
          )
        `)
        .eq('program_id', programId)
        .order('created_at', { ascending: false });

      // Normalizar lista de evaluaciones combinada
      const normalizedAssignments = (assignmentsData || []).map(a => {
        const subs = a.assignment_submissions || [];
        const totalSubs = subs.length;
        const pendingGrade = subs.filter(s => s.status === 'submitted' || (s.grade === null && s.status !== 'graded')).length;
        const gradedSubs = subs.filter(s => s.status === 'graded' || (s.grade !== null && s.grade !== undefined));
        const avgScore = gradedSubs.length > 0 ? (gradedSubs.reduce((acc, s) => acc + Number(s.grade || 0), 0) / gradedSubs.length).toFixed(1) : null;

        return {
          ...a,
          evalType: 'assignment',
          totalSubs,
          pendingGrade,
          gradedCount: gradedSubs.length,
          avgScore
        };
      });

      const normalizedQuizzes = (quizzesData || []).map(q => {
        const subs = q.quiz_submissions || [];
        const totalSubs = subs.length;
        const gradedSubs = subs.filter(s => s.score !== null && s.score !== undefined);
        const avgScore = gradedSubs.length > 0 ? (gradedSubs.reduce((acc, s) => acc + Number(s.score || 0), 0) / gradedSubs.length).toFixed(1) : null;

        return {
          ...q,
          evalType: 'quiz',
          totalSubs,
          pendingGrade: 0, // En quizzes la corrección suele ser automática
          gradedCount: gradedSubs.length,
          avgScore
        };
      });

      setEvaluations([...normalizedAssignments, ...normalizedQuizzes]);
    } catch (err) {
      console.error('Error al consultar evaluaciones:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvaluationsData();
  }, [programId, teacherId, profile?.id]);

  // Toggle de publicación
  const handleTogglePublish = async (evalItem) => {
    try {
      const table = evalItem.evalType === 'assignment' ? 'assignments' : 'quizzes';
      const newStatus = !evalItem.is_published;

      const { error } = await supabase
        .from(table)
        .update({ is_published: newStatus })
        .eq('id', evalItem.id);

      if (error) throw error;

      setEvaluations(prev => prev.map(ev => ev.id === evalItem.id ? { ...ev, is_published: newStatus } : ev));
    } catch (err) {
      console.error('Error al cambiar visibilidad:', err);
    }
  };

  // Eliminar evaluación
  const handleDeleteEvaluation = async () => {
    if (!confirmDeleteId) return;
    try {
      const table = deleteType === 'assignment' ? 'assignments' : 'quizzes';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', confirmDeleteId);

      if (error) throw error;

      setEvaluations(prev => prev.filter(ev => ev.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    } catch (err) {
      console.error('Error al eliminar evaluación:', err);
    }
  };

  // Cálculos de KPIs Superiores
  const totalEvals = evaluations.length;
  const totalSubmissionsReceived = evaluations.reduce((acc, ev) => acc + (ev.totalSubs || 0), 0);
  const totalPendingGrading = evaluations.reduce((acc, ev) => acc + (ev.pendingGrade || 0), 0);
  const evaluationsWithAvg = evaluations.filter(ev => ev.avgScore !== null);
  const overallAvg = evaluationsWithAvg.length > 0
    ? (evaluationsWithAvg.reduce((acc, ev) => acc + Number(ev.avgScore), 0) / evaluationsWithAvg.length).toFixed(1)
    : null;

  // Filtrado de lista
  const now = new Date();
  const filteredEvaluations = evaluations.filter(ev => {
    // Tipo
    if (filterType !== 'all' && ev.evalType !== filterType) return false;

    // Módulo
    if (filterModule !== 'all' && ev.module_id !== filterModule) return false;

    // Búsqueda
    if (searchTerm && !ev.title.toLowerCase().includes(searchTerm.toLowerCase()) && !(ev.description || '').toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Estado
    const dueDate = new Date(ev.due_date);
    if (filterStatus === 'pending_grade') return ev.pendingGrade > 0;
    if (filterStatus === 'active') return ev.is_published && dueDate >= now;
    if (filterStatus === 'closed') return ev.is_published && dueDate < now;
    if (filterStatus === 'draft') return !ev.is_published;

    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingBottom: '2rem' }}>
      
      {/* ── 1. KPI CARDS (Black and Gold Elegance) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        
        {/* Total Evaluaciones */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #14213D' }}>
          <div style={{ background: 'rgba(20, 33, 61, 0.08)', padding: '0.75rem', borderRadius: '10px' }}>
            <FileText size={24} color="#14213D" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#14213D', lineHeight: 1 }}>
              {totalEvals}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
              Evaluaciones del Programa
            </div>
          </div>
        </div>

        {/* Total Entregas */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #14213D' }}>
          <div style={{ background: 'rgba(20, 33, 61, 0.08)', padding: '0.75rem', borderRadius: '10px' }}>
            <Folder size={24} color="#14213D" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#14213D', lineHeight: 1 }}>
              {totalSubmissionsReceived}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
              Entregas Recibidas
            </div>
          </div>
        </div>

        {/* Pendientes por Calificar */}
        <div className="card" style={{
          padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
          borderLeft: '4px solid #FCA311',
          background: totalPendingGrading > 0 ? 'rgba(252, 163, 17, 0.04)' : '#FFFFFF'
        }}>
          <div style={{ background: 'rgba(252, 163, 17, 0.15)', padding: '0.75rem', borderRadius: '10px' }}>
            <Clock size={24} color="#FCA311" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: totalPendingGrading > 0 ? '#B45309' : '#14213D', lineHeight: 1 }}>
              {totalPendingGrading}
            </div>
            <div style={{ fontSize: '0.8rem', color: totalPendingGrading > 0 ? '#B45309' : 'var(--text-muted)', fontWeight: 700, marginTop: '4px' }}>
              Por Calificar
            </div>
          </div>
        </div>

        {/* Promedio General */}
        <div className="card" style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', borderLeft: '4px solid #16A34A' }}>
          <div style={{ background: 'rgba(22, 163, 74, 0.1)', padding: '0.75rem', borderRadius: '10px' }}>
            <Award size={24} color="#16A34A" />
          </div>
          <div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A', lineHeight: 1 }}>
              {overallAvg ? `${overallAvg} pts` : '—'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '4px' }}>
              Calificación Promedio
            </div>
          </div>
        </div>

      </div>

      {/* ── 2. BARRA DE ACCIONES Y FILTROS ── */}
      <div className="card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          
          {/* Buscador */}
          <div style={{ position: 'relative', width: '280px', minWidth: '220px' }}>
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Buscar evaluación..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '8px',
                border: '1px solid var(--border-color)', fontSize: '0.84rem', outline: 'none'
              }}
            />
          </div>

          {/* Selector de Módulo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Módulo:</span>
            <select
              value={filterModule}
              onChange={e => setFilterModule(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)',
                fontSize: '0.84rem', fontWeight: 600, color: '#14213D', background: '#FFFFFF', outline: 'none'
              }}
            >
              <option value="all">Todos los módulos</option>
              {modules.map((m, i) => (
                <option key={m.id} value={m.id}>
                  Módulo {m.order_index || i + 1}: {m.title}
                </option>
              ))}
            </select>
          </div>

          {/* Botón "+ Nueva Evaluación" */}
          <button
            onClick={() => {
              setEvaluationModalData(null);
              setIsEvaluationModalOpen(true);
            }}
            style={{
              background: '#14213D', color: '#FFFFFF', border: 'none',
              padding: '0.55rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)', transition: 'all 0.2s ease'
            }}
            onMouseOver={e => e.currentTarget.style.background = '#FCA311'}
            onMouseOut={e => e.currentTarget.style.background = '#14213D'}
          >
            <Plus size={16} /> Nueva Evaluación
          </button>

        </div>

        {/* Filtros Tipo y Estado (Pastillas) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.85rem' }}>
          
          {/* Tipo de Evaluación */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'Todas las evaluaciones' },
              { id: 'assignment', label: 'Tareas / Entregables' },
              { id: 'quiz', label: 'Cuestionarios' }
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setFilterType(t.id)}
                style={{
                  border: 'none', borderRadius: '9999px', padding: '0.35rem 0.85rem',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
                  background: filterType === t.id ? '#14213D' : '#F1F5F9',
                  color: filterType === t.id ? '#FFFFFF' : '#475569'
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Estado de Evaluación */}
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            {[
              { id: 'all', label: 'Todos' },
              { id: 'pending_grade', label: `⚠️ Por calificar (${totalPendingGrading})` },
              { id: 'active', label: 'Activas' },
              { id: 'closed', label: 'Cerradas' },
              { id: 'draft', label: 'Borradores' }
            ].map(st => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                style={{
                  border: 'none', borderRadius: '6px', padding: '0.35rem 0.75rem',
                  fontSize: '0.76rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s ease',
                  background: filterStatus === st.id ? '#FCA311' : 'transparent',
                  color: filterStatus === st.id ? '#14213D' : 'var(--text-muted)'
                }}
              >
                {st.label}
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── 3. LISTADO DE TARJETAS DE EVALUACIONES ── */}
      {loading ? (
        <div style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Cargando evaluaciones del programa...
        </div>
      ) : filteredEvaluations.length === 0 ? (
        <div className="card" style={{ padding: '3.5rem 2rem', textAlign: 'center' }}>
          <FileText size={48} color="#CBD5E1" style={{ margin: '0 auto 1rem auto' }} />
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#14213D', fontSize: '1.1rem', fontWeight: 700 }}>
            No hay evaluaciones para mostrar
          </h4>
          <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-muted)', fontSize: '0.86rem' }}>
            {evaluations.length === 0
              ? 'Aún no se han creado evaluaciones o tareas en este programa académico.'
              : 'No hay evaluaciones que coincidan con los filtros seleccionados.'}
          </p>
          <button
            onClick={() => {
              setEvaluationModalData(null);
              setIsEvaluationModalOpen(true);
            }}
            style={{
              background: '#14213D', color: '#FFFFFF', border: 'none',
              padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem'
            }}
          >
            <Plus size={16} /> Crear primera evaluación
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {filteredEvaluations.map(ev => {
            const dueDate = new Date(ev.due_date);
            const isOverdue = dueDate < now;
            const isAssignment = ev.evalType === 'assignment';
            const moduleLinked = modules.find(m => m.id === ev.module_id);
            const submissionPercentage = enrolledCount > 0 ? Math.min(100, Math.round((ev.totalSubs / enrolledCount) * 100)) : 0;

            return (
              <div
                key={`${ev.evalType}-${ev.id}`}
                className="card"
                style={{
                  padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem',
                  borderLeft: ev.pendingGrade > 0 ? '4px solid #FCA311' : '4px solid #14213D',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Fila Superior: Badges y Visibilidad */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    
                    {/* Badge Tipo */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 800, padding: '3px 8px', borderRadius: '4px', textTransform: 'uppercase',
                      background: isAssignment ? 'rgba(20, 33, 61, 0.08)' : 'rgba(124, 58, 237, 0.1)',
                      color: isAssignment ? '#14213D' : '#6D28D9'
                    }}>
                      {isAssignment ? '📁 Tarea / Entregable' : '📝 Cuestionario'}
                    </span>

                    {/* Badge Módulo */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                      background: '#F1F5F9', color: '#475569'
                    }}>
                      {moduleLinked ? `Módulo: ${moduleLinked.title}` : 'Evaluación General'}
                    </span>

                    {/* Badge Ponderación */}
                    {ev.weight_percentage > 0 && (
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                        background: 'rgba(252, 163, 17, 0.15)', color: '#B45309'
                      }}>
                        Ponderación: {ev.weight_percentage}%
                      </span>
                    )}

                    {/* Badge Estado de Publicación */}
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '4px',
                      background: ev.is_published ? '#DCFCE7' : '#F1F5F9',
                      color: ev.is_published ? '#15803D' : '#64748B'
                    }}>
                      {ev.is_published ? '● Publicada' : '○ Borrador (Oculta)'}
                    </span>
                  </div>

                  {/* Fecha Límite */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', fontWeight: 600,
                    color: isOverdue ? '#DC2626' : '#14213D'
                  }}>
                    <Calendar size={14} color={isOverdue ? '#DC2626' : '#FCA311'} />
                    <span>Límite: {dueDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    {isOverdue ? (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#FEE2E2', color: '#DC2626', padding: '1px 5px', borderRadius: '3px' }}>
                        CERRADA
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.7rem', fontWeight: 800, background: '#EFF6FF', color: '#1D4ED8', padding: '1px 5px', borderRadius: '3px' }}>
                        EN CURSO
                      </span>
                    )}
                  </div>
                </div>

                {/* Fila Central: Título, Descripción y Puntaje */}
                <div>
                  <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1.1rem', fontWeight: 700, color: '#14213D' }}>
                    {ev.title}
                  </h4>
                  {ev.description && (
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#475569', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ev.description}
                    </p>
                  )}
                </div>

                {/* Fila Inferior: Avance de entregas y Botones de Acción */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem',
                  borderTop: '1px solid #F1F5F9', paddingTop: '0.85rem'
                }}>
                  {/* Barra de progreso de entregas */}
                  <div style={{ flex: 1, minWidth: '220px', maxWidth: '380px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>
                      <span>Entregas de alumnos: <strong>{ev.totalSubs} de {enrolledCount}</strong> ({submissionPercentage}%)</span>
                      {ev.avgScore !== null && (
                        <span style={{ color: '#16A34A', fontWeight: 700 }}>Promedio: {ev.avgScore} pts</span>
                      )}
                    </div>
                    <div style={{ height: '6px', width: '100%', background: '#E2E8F0', borderRadius: '9999px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${submissionPercentage}%`, background: '#14213D', borderRadius: '9999px', transition: 'width 0.3s ease' }} />
                    </div>
                  </div>

                  {/* Alerta de pendientes + Botones */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                    
                    {ev.pendingGrade > 0 && (
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 800, background: '#FEF3C7', color: '#B45309',
                        padding: '4px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '3px'
                      }}>
                        <AlertCircle size={13} /> {ev.pendingGrade} por calificar
                      </span>
                    )}

                    {/* Botón Principal: Calificar Entregas */}
                    <button
                      onClick={() => setSelectedEvaluationForGrading(ev)}
                      style={{
                        background: '#14213D', color: '#FFFFFF', border: 'none',
                        padding: '0.45rem 1rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 700,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={e => e.currentTarget.style.background = '#FCA311'}
                      onMouseOut={e => e.currentTarget.style.background = '#14213D'}
                    >
                      <FileCheck size={14} /> Ver Entregas / Calificar
                    </button>

                    {/* Botón Editar */}
                    <button
                      onClick={() => {
                        setEvaluationModalData(ev);
                        setIsEvaluationModalOpen(true);
                      }}
                      title="Editar parámetros"
                      style={{
                        background: '#FFFFFF', border: '1px solid #CBD5E1', color: '#475569',
                        padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                      }}
                    >
                      <Pencil size={14} />
                    </button>

                    {/* Botón Publicar / Ocultar */}
                    <button
                      onClick={() => handleTogglePublish(ev)}
                      title={ev.is_published ? 'Ocultar a estudiantes' : 'Publicar para estudiantes'}
                      style={{
                        background: '#FFFFFF', border: '1px solid #CBD5E1', color: ev.is_published ? '#15803D' : '#64748B',
                        padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                      }}
                    >
                      {ev.is_published ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>

                    {/* Botón Eliminar */}
                    <button
                      onClick={() => {
                        setConfirmDeleteId(ev.id);
                        setDeleteType(ev.evalType);
                      }}
                      title="Eliminar evaluación"
                      style={{
                        background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#DC2626',
                        padding: '0.45rem 0.65rem', borderRadius: '6px', fontSize: '0.82rem', fontWeight: 600,
                        cursor: 'pointer', display: 'inline-flex', alignItems: 'center'
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* ── MODAL DE CALIFICACIÓN ── */}
      {selectedEvaluationForGrading && (
        <GradingModal
          evaluation={selectedEvaluationForGrading}
          teacherId={teacherId || profile?.id}
          onClose={() => setSelectedEvaluationForGrading(null)}
          onGraded={fetchEvaluationsData}
        />
      )}

      {/* ── MODAL DE CREACIÓN / EDICIÓN ── */}
      {isEvaluationModalOpen && (
        <EvaluationModal
          initialData={evaluationModalData}
          programId={programId}
          modules={modules}
          classes={classes}
          teacherId={teacherId || profile?.id}
          onClose={() => {
            setIsEvaluationModalOpen(false);
            setEvaluationModalData(null);
          }}
          onSaved={fetchEvaluationsData}
        />
      )}

      {/* ── MODAL DE CONFIRMACIÓN DE ELIMINACIÓN ── */}
      {confirmDeleteId && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1100,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <div style={{ background: '#FFFFFF', padding: '1.5rem', borderRadius: '12px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: '#FEE2E2', padding: '0.6rem', borderRadius: '50%' }}>
                <Trash2 size={22} color="#DC2626" />
              </div>
              <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#14213D' }}>
                ¿Eliminar evaluación?
              </h4>
            </div>
            <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.86rem', color: '#475569', lineHeight: 1.4 }}>
              Esta acción eliminará permanentemente la evaluación y todas las entregas o calificaciones asociadas de los estudiantes.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                onClick={() => setConfirmDeleteId(null)}
                style={{
                  padding: '0.55rem 1rem', borderRadius: '6px', border: '1px solid #CBD5E1',
                  background: '#FFFFFF', color: '#475569', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteEvaluation}
                style={{
                  padding: '0.55rem 1.2rem', borderRadius: '6px', border: 'none',
                  background: '#DC2626', color: '#FFFFFF', fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

const TABS = [
  { id: 'resumen',      label: 'Inicio',                icon: <BookOpen size={16} />,     component: ResumenTab },
  { id: 'clases',       label: 'Mis Clases',            icon: <Video size={16} />,        component: ClasesTab },
  { id: 'evaluaciones', label: 'Evaluaciones',          icon: <FileCheck size={16} />,    component: EvaluacionesTab },
  { id: 'dudas',        label: 'Dudas',                 icon: <MessageSquare size={16} />,component: DudasTab },
  { id: 'anuncios',     label: 'Anuncios',              icon: <Megaphone size={16} />,    component: AnunciosTab },
  { id: 'estudiantes',  label: 'Estudiantes',           icon: <Users size={16} />,        component: EstudiantesTab },
];


export default function TeacherPanel() {
  const { currentUser } = useAuth();
  const { programId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('resumen');
  const [teacherProfile, setTeacherProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [currentProgram, setCurrentProgram] = useState(null);
  const [myPrograms, setMyPrograms] = useState([]);
  const role = currentUser?.role;

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  // Resolver el teacher_profile.id real y obtener datos del programa
  useEffect(() => {
    async function resolveTeacherProfile() {
      if (!currentUser?.id) return;
      try {
        const { data } = await supabase
          .from('teacher_profiles')
          .select('*, users_profile(email)')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        if (data) setTeacherProfile(data);
      } catch (err) {
        console.error('Error al resolver teacher_profile:', err);
      } finally {
        setProfileLoading(false);
      }
    }

    async function fetchProgramDetails() {
      if (!programId) return;
      try {
        const { data } = await supabase
          .from('diploma_programs')
          .select('*')
          .eq('id', programId)
          .maybeSingle();
        if (data) setCurrentProgram(data);
      } catch (err) {
        console.error('Error al obtener programa:', err);
      }
    }

    async function fetchAllPrograms() {
      // Solo cargar programas donde el profesor tiene clases asignadas
      try {
        // Primero obtenemos el teacher_profile.id (puede diferir del currentUser.id)
        const { data: profileData } = await supabase
          .from('teacher_profiles')
          .select('id')
          .eq('user_id', currentUser.id)
          .maybeSingle();
        const tId = profileData?.id;
        if (!tId) return;

        // Obtenemos los program_id distintos donde tiene clases
        const { data: classRows } = await supabase
          .from('class_sessions')
          .select('program_id')
          .eq('teacher_id', tId);

        const uniqueProgramIds = [...new Set((classRows || []).map(r => r.program_id).filter(Boolean))];
        if (uniqueProgramIds.length === 0) return;

        const { data } = await supabase
          .from('diploma_programs')
          .select('*')
          .in('id', uniqueProgramIds)
          .order('title', { ascending: true });
        if (data) setMyPrograms(data);
      } catch (err) {
        console.error('Error al obtener lista de programas del profesor:', err);
      }
    }

    resolveTeacherProfile();
    fetchProgramDetails();
    fetchAllPrograms();
  }, [currentUser?.id, programId]);

  if (role !== 'teacher') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#ca8a04" />
        <h2 style={{ color: 'var(--text-dark)' }}>Acceso Denegado</h2>
        <p>Este panel es exclusivo para profesores.</p>
      </div>
    );
  }

  if (profileLoading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>Cargando tu perfil de profesor...</div>;
  }

  if (!teacherProfile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '1rem', color: 'var(--text-muted)' }}>
        <ShieldAlert size={48} color="#dc2626" />
        <h2 style={{ color: 'var(--text-dark)' }}>Perfil no configurado</h2>
        <p>Tu cuenta no tiene un perfil de profesor vinculado. Contacta con el administrador.</p>
      </div>
    );
  }

  const ActiveComponent = TABS.find(t => t.id === activeTab)?.component ?? ResumenTab;

  return (
    <TeacherContext.Provider value={{ id: teacherProfile.id, teacherId: teacherProfile.id, profile: teacherProfile, setProfile: setTeacherProfile, programId, currentProgram }}>
      <div>

        {/* ALERTA DE PROGRAMA INHABILITADO */}
        {currentProgram && (currentProgram.is_published === false || currentProgram.status === 'draft' || currentProgram.status === 'disabled') && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', padding: '0.85rem 1.25rem', borderRadius: 'var(--radius-md)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 600, fontSize: '0.88rem' }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0 }} />
            <span>Este programa se encuentra inhabilitado por la administración. Los estudiantes no pueden acceder ni reciben notificaciones ni fechas de este curso.</span>
          </div>
        )}

        {/* --- RUTA DE NAVEGACIÓN (BREADCRUMB) Y ACCIONES DE PROGRAMA --- */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', fontWeight: 500 }}>
            <Link to="/portal" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.color = 'var(--gold)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-muted)'}>
              Mis programas
            </Link>
            <span>/</span>
            <span style={{ color: 'var(--navy)', fontWeight: 700 }}>
              {currentProgram?.title || 'Cargando programa...'}
            </span>
            {currentProgram && (currentProgram.is_published === false || currentProgram.status === 'draft' || currentProgram.status === 'disabled') && (
              <span className="badge" style={{ backgroundColor: '#fee2e2', color: '#dc2626', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', marginLeft: '0.5rem' }}>
                INHABILITADO
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Link
              to="/portal"
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                textDecoration: 'none',
                padding: '0.4rem 0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: 'var(--white)',
                fontWeight: 600,
                transition: 'all 0.2s'
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-light)'; e.currentTarget.style.color = 'var(--navy)'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              ← Volver a mis programas
            </Link>
          </div>
        </div>

        {/* --- PESTAÑAS DEL PROGRAMA --- */}
        <div className="teacher-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              id={`teacher-tab-${tab.id}`}
              className={`teacher-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <ActiveComponent onChangeTab={setActiveTab} />
      </div>
    </TeacherContext.Provider>
  );
}




