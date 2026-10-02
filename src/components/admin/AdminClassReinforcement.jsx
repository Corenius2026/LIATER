import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { 
  Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, PlayCircle, 
  GripVertical, Save, FileText, Check, Sparkles, RefreshCw, 
  FileQuestion, ExternalLink, Presentation, ChevronDown, ChevronUp, 
  Layers, HelpCircle, ArrowRight, Upload, Calendar, Clock, RotateCcw
} from 'lucide-react';
import { toLocalDatetimeString, parseLocalDatetime, formatClassDate } from '@/utils/dateUtils';

export default function AdminClassReinforcement({ classId, onOpenUploadModal }) {
  const { currentUser } = useAuth();
  const userRole = (currentUser?.role || '').trim().toLowerCase();
  const isAdmin = userRole === 'admin';
  const isTeacher = ['teacher', 'docente', 'profesor'].includes(userRole);
  const isTeacherOrAdmin = isAdmin || isTeacher;

  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [draft, setDraft] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [publishLoading, setPublishLoading] = useState(null); // 'publishing' | 'unpublishing' | null
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de edición local
  const [localActivity, setLocalActivity] = useState({
    title: 'Actividad de Reforzamiento',
    description: '',
    is_mandatory: false,
    max_attempts: 1,
    due_date: ''
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [previewSelectedOptions, setPreviewSelectedOptions] = useState({});

  // ==========================================
  // ESTADOS PARA GENERACIÓN DE PREGUNTAS CON IA
  // ==========================================
  const [classResources, setClassResources] = useState([]);
  const [loadingResources, setLoadingResources] = useState(false);
  const [selectedResourceId, setSelectedResourceId] = useState('');
  const [aiQuestionCount, setAiQuestionCount] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiSuccess, setAiSuccess] = useState('');
  const [generationSource, setGenerationSource] = useState(null); // { type, docTitle, date }
  
  // Modal de confirmación si ya existen preguntas antes de generar con IA
  const [confirmGenerateModalOpen, setConfirmGenerateModalOpen] = useState(false);

  const fetchClassResources = async () => {
    if (!classId) return;
    setLoadingResources(true);
    try {
      const { data, error: resErr } = await supabase
        .from('resources')
        .select('*')
        .eq('class_id', classId)
        .neq('is_visible', false)
        .order('created_at', { ascending: true });

      if (!resErr && data) {
        setClassResources(data);
        if (data.length > 0) {
          // Pre-seleccionar la presentación o el primer documento
          setSelectedResourceId(prev => {
            if (prev && data.some(r => r.id === prev)) return prev;
            const presentation = data.find(r => r.resource_type === 'presentation');
            return presentation ? presentation.id : data[0].id;
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar recursos de la clase para IA:', err);
    } finally {
      setLoadingResources(false);
    }
  };

  const onGenerateAIClick = () => {
    setAiError('');
    setAiSuccess('');

    if (!selectedResourceId) {
      setAiError('Por favor selecciona un material de estudio de la lista para analizar.');
      return;
    }

    if (questions.length > 0) {
      setConfirmGenerateModalOpen(true);
    } else {
      executeGenerateQuestions();
    }
  };

  const executeGenerateQuestions = async () => {
    setAiError('');
    setAiSuccess('');

    if (!selectedResourceId) {
      setAiError('Por favor selecciona un material de estudio de la lista para analizar.');
      return;
    }

    setAiGenerating(true);

    try {
      const selectedDoc = classResources.find(r => r.id === selectedResourceId);
      const payload = {
        classId,
        questionCount: aiQuestionCount,
        classTitle: localActivity.title,
        resourceId: selectedResourceId
      };

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      const invokeOptions = { body: payload };
      if (accessToken) {
        invokeOptions.headers = { Authorization: `Bearer ${accessToken}` };
      }

      const { data, error: fnErr } = await supabase.functions.invoke(
        'generar-preguntas-reforzamiento',
        invokeOptions
      );

      if (fnErr) {
        let msg = fnErr.message || 'Error al conectar con la función de inteligencia artificial';
        try {
          if (fnErr.context && typeof fnErr.context.json === 'function') {
            const body = await fnErr.context.json();
            if (body?.error) msg = body.error;
          }
        } catch (_) {}
        throw new Error(msg);
      }

      if (!data?.ok && data?.error) {
        throw new Error(data.error);
      }

      if (!data?.draft?.questions || data.draft.questions.length === 0) {
        throw new Error('La IA no devolvió preguntas válidas. Por favor intenta nuevamente.');
      }

      // 1. Asegurar o crear la fila en class_activities
      let targetActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) 
        ? activity.id 
        : null;

      if (!targetActId) {
        const { data: actRow } = await supabase
          .from('class_activities')
          .select('id')
          .eq('class_id', classId)
          .maybeSingle();
        if (actRow) targetActId = actRow.id;
      }

      if (!targetActId) {
        const insertPayload = {
          class_id: classId,
          title: data.draft?.activity_title || localActivity.title || 'Actividad de Reforzamiento',
          description: data.draft?.activity_description || localActivity.description || '',
          is_mandatory: false,
          max_attempts: 1,
          due_date: localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null,
          is_published: false
        };
        let { data: newAct, error: createErr } = await supabase.from('class_activities').insert([insertPayload]).select().single();
        if (createErr && (createErr.code === '42703' || createErr.message?.includes('due_date'))) {
          delete insertPayload.due_date;
          const retry = await supabase.from('class_activities').insert([insertPayload]).select().single();
          newAct = retry.data;
        }
        if (newAct) {
          targetActId = newAct.id;
          setActivity(newAct);
        }
      }

      // 2. Purgar preguntas anteriores de la base de datos
      if (targetActId) {
        try {
          const { error: rpcErr } = await supabase.rpc('purge_activity_questions', { p_activity_id: targetActId });
          if (rpcErr) {
            const { data: oldQs } = await supabase
              .from('activity_questions')
              .select('id')
              .eq('activity_id', targetActId);

            if (oldQs && oldQs.length > 0) {
              const oldQIds = oldQs.map(q => q.id);
              await supabase.from('attempt_answers').delete().in('question_id', oldQIds);
              await supabase.from('question_correct_answers').delete().in('question_id', oldQIds);
              await supabase.from('question_options').delete().in('question_id', oldQIds);
              await supabase.from('activity_questions').delete().in('id', oldQIds);
            }
          }
        } catch (dbDelErr) {
          console.error('Error al purgar preguntas anteriores de DB:', dbDelErr);
        }
      }

      // 3. Obtener el borrador generado por la Edge Function para sincronizar estado
      try {
        const { data: latestDraft } = await supabase
          .from('activity_drafts')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestDraft) {
          setDraft(latestDraft);
        } else if (data.draft) {
          setDraft(data.draft);
        }
      } catch (_) {
        if (data.draft) setDraft(data.draft);
      }

      const isOptionCorrect = (o, oIndex, q) => {
        if (o.is_correct === true || o.isCorrect === true || o.correct === true || o.is_right === true) return true;
        if (typeof q.correct_option_index === 'number' && q.correct_option_index === oIndex) return true;
        if (typeof q.correct_index === 'number' && q.correct_index === oIndex) return true;
        if (typeof q.correct_answer === 'number' && q.correct_answer === oIndex) return true;
        if (typeof q.correct_answer === 'string' && (q.correct_answer === o.text || q.correct_answer === String(oIndex))) return true;
        return false;
      };

      const parsedQuestions = data.draft.questions.map((q, qIndex) => {
        const qId = `temp-q-${crypto.randomUUID()}`;
        let correctOptId = null;

        const newOptions = (q.options || []).map((o, oIndex) => {
          const oId = `temp-o-${crypto.randomUUID()}`;
          if (isOptionCorrect(o, oIndex, q)) {
            correctOptId = oId;
          }
          return {
            id: oId,
            question_id: qId,
            text: o.text || `Opción ${oIndex + 1}`,
            order_num: oIndex
          };
        });

        if (!correctOptId && newOptions.length > 0) {
          correctOptId = newOptions[0].id;
        }

        return {
          id: qId,
          activity_id: targetActId || activity?.id || 'temp-act',
          text: q.text || 'Sin enunciado',
          question_type: q.question_type || 'single_choice',
          order_num: qIndex,
          options: newOptions,
          correctOptionId: correctOptId,
          explanation: q.explanation || '',
          source_basis: q.source_basis || ''
        };
      });

      const docName = selectedDoc?.title || 'Material seleccionado';

      const sourceMeta = {
        type: 'document',
        docTitle: docName,
        date: new Date().toISOString()
      };

      // 4. Guardar automáticamente las preguntas en PostgreSQL
      let savedQuestions = parsedQuestions;
      if (targetActId) {
        try {
          const persisted = await persistQuestionsToDatabase(targetActId, parsedQuestions);
          if (persisted && persisted.length > 0) {
            savedQuestions = persisted;
          }
        } catch (saveErr) {
          console.warn('Nota: Auto-guardado en DB falló, preguntas quedan en memoria:', saveErr);
        }
      }

      setQuestions(savedQuestions);
      if (data.draft.activity_title && (!localActivity.title || localActivity.title === 'Actividad de Reforzamiento')) {
        setLocalActivity(prev => ({
          ...prev,
          title: data.draft.activity_title,
          description: data.draft.activity_description || prev.description
        }));
      }

      setGenerationSource(sourceMeta);
      setAiSuccess(`✓ ${savedQuestions.length} nuevas preguntas generadas con IA y guardadas exitosamente en la base de datos.`);
      setTimeout(() => setAiSuccess(''), 7000);

    } catch (err) {
      console.error('Error generando preguntas con IA:', err);
      setAiError(err.message || 'Error desconocido al invocar la función de IA.');
    } finally {
      setAiGenerating(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadActivityData();
      fetchClassResources();
    }
  }, [classId]);

  // Realtime subscription para recursos en vivo (sin pisar el editor de preguntas)
  useEffect(() => {
    if (!classId) return;
    const channel = supabase
      .channel('admin_class_activity_sync_' + classId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resources', filter: `class_id=eq.${classId}` }, () => {
        fetchClassResources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId]);

  const loadActivityData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Obtener la actividad publicada de la clase
      const { data: actData, error: actError } = await supabase
        .from('class_activities')
        .select('*')
        .eq('class_id', classId)
        .maybeSingle();

      if (actError) throw actError;

      // 2. Obtener borrador de IA (activity_drafts)
      const { data: draftData } = await supabase
        .from('activity_drafts')
        .select('*')
        .eq('class_id', classId)
        .neq('status', 'rejected')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      setDraft(draftData || null);

      if (actData) {
        setActivity(actData);
        setLocalActivity({
          title: actData.title,
          description: actData.description || '',
          is_mandatory: false,
          max_attempts: 1,
          due_date: actData.due_date ? toLocalDatetimeString(actData.due_date) : ''
        });

        // 3. Obtener preguntas, opciones y correctas
        const { data: qData, error: qError } = await supabase
          .from('activity_questions')
          .select(`
            *,
            question_options (*),
            question_correct_answers (correct_option_id)
          `)
          .eq('activity_id', actData.id)
          .order('order_num', { ascending: true });

        if (qError) throw qError;

        // Normalizar los datos
        let normalizedQuestions = (qData || []).map(q => {
          const sortedOptions = (q.question_options || []).sort((a, b) => a.order_num - b.order_num);
          let correctOption = null;

          if (q.question_correct_answers) {
            if (Array.isArray(q.question_correct_answers) && q.question_correct_answers.length > 0) {
              correctOption = q.question_correct_answers[0].correct_option_id;
            } else if (typeof q.question_correct_answers === 'object' && q.question_correct_answers.correct_option_id) {
              correctOption = q.question_correct_answers.correct_option_id;
            }
          }
            
          return {
            ...q,
            options: sortedOptions,
            correctOptionId: correctOption
          };
        });

        // Si la actividad en DB no tiene preguntas pero existe un borrador de IA con preguntas, cargarlas
        if (normalizedQuestions.length === 0 && !actData.is_published && draftData?.draft_data?.questions && draftData.draft_data.questions.length > 0) {
          const isOptionCorrect = (o, oIndex, q) => {
            if (o.is_correct === true || o.isCorrect === true || o.correct === true || o.is_right === true) return true;
            if (typeof q.correct_option_index === 'number' && q.correct_option_index === oIndex) return true;
            if (typeof q.correct_index === 'number' && q.correct_index === oIndex) return true;
            if (typeof q.correct_answer === 'number' && q.correct_answer === oIndex) return true;
            if (typeof q.correct_answer === 'string' && (q.correct_answer === o.text || q.correct_answer === String(oIndex))) return true;
            return false;
          };

          normalizedQuestions = draftData.draft_data.questions.map((q, qIndex) => {
            const qId = `temp-draft-q-${qIndex}`;
            let correctOptId = null;

            const newOptions = (q.options || []).map((o, oIndex) => {
              const oId = `temp-draft-o-${qIndex}-${oIndex}`;
              if (isOptionCorrect(o, oIndex, q)) {
                correctOptId = oId;
              }
              return {
                id: oId,
                question_id: qId,
                text: o.text || `Opción ${oIndex + 1}`,
                order_num: oIndex
              };
            });

            if (!correctOptId && newOptions.length > 0) {
              correctOptId = newOptions[0].id;
            }

            return {
              id: qId,
              activity_id: actData.id,
              text: q.text || 'Sin enunciado',
              question_type: q.question_type || 'single_choice',
              explanation: q.explanation || '',
              source_basis: q.source_basis || '',
              order_num: qIndex,
              options: newOptions,
              correctOptionId: correctOptId
            };
          });
        }

        setQuestions(normalizedQuestions);
      } else if (draftData?.draft_data?.questions && draftData.draft_data.questions.length > 0) {
        // Cargar automáticamente las preguntas del borrador de IA
        setLocalActivity({
          title: draftData.draft_data.activity_title || 'Actividad de Reforzamiento',
          description: draftData.draft_data.activity_description || '',
          is_mandatory: false,
          max_attempts: 1,
          due_date: draftData.draft_data.due_date ? toLocalDatetimeString(draftData.draft_data.due_date) : ''
        });

        const isOptionCorrect = (o, oIndex, q) => {
          if (o.is_correct === true || o.isCorrect === true || o.correct === true || o.is_right === true) return true;
          if (typeof q.correct_option_index === 'number' && q.correct_option_index === oIndex) return true;
          if (typeof q.correct_index === 'number' && q.correct_index === oIndex) return true;
          if (typeof q.correct_answer === 'number' && q.correct_answer === oIndex) return true;
          if (typeof q.correct_answer === 'string' && (q.correct_answer === o.text || q.correct_answer === String(oIndex))) return true;
          return false;
        };

        const draftQs = draftData.draft_data.questions.map((q, qIndex) => {
          const qId = `temp-draft-q-${qIndex}`;
          let correctOptId = null;

          const newOptions = (q.options || []).map((o, oIndex) => {
            const oId = `temp-draft-o-${qIndex}-${oIndex}`;
            if (isOptionCorrect(o, oIndex, q)) {
              correctOptId = oId;
            }
            return {
              id: oId,
              question_id: qId,
              text: o.text || `Opción ${oIndex + 1}`,
              order_num: oIndex
            };
          });

          if (!correctOptId && newOptions.length > 0) {
            correctOptId = newOptions[0].id;
          }

          return {
            id: qId,
            activity_id: 'draft-temp',
            text: q.text || 'Sin enunciado',
            question_type: q.question_type || 'single_choice',
            explanation: q.explanation || '',
            source_basis: q.source_basis || '',
            order_num: qIndex,
            options: newOptions,
            correctOptionId: correctOptId
          };
        });

        setQuestions(draftQs);
        setActivity({
          id: 'draft-temp',
          class_id: classId,
          title: draftData.draft_data.activity_title || 'Actividad de Reforzamiento',
          description: draftData.draft_data.activity_description || '',
          is_published: false,
          is_draft: true
        });
      } else {
        setActivity(null);
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error cargando actividad:', err);
      setError('No se pudo cargar la actividad.');
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        class_id: classId,
        title: localActivity.title,
        description: localActivity.description,
        is_mandatory: false,
        max_attempts: 1,
        due_date: localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null,
        is_published: false
      };

      let { data, error: insertError } = await supabase
        .from('class_activities')
        .insert([payload])
        .select()
        .single();
      
      if (insertError && (insertError.code === '42703' || insertError.message?.includes('due_date'))) {
        delete payload.due_date;
        const retry = await supabase.from('class_activities').insert([payload]).select().single();
        data = retry.data;
        insertError = retry.error;
      }

      if (insertError) throw insertError;
      
      setActivity(data);
      setSuccess('Actividad creada. Ahora puedes añadir preguntas.');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error(err);
      setError('Error al crear la actividad: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const persistQuestionsToDatabase = async (activityId, currentQuestions) => {
    if (!activityId || !currentQuestions) return [];

    // Si es una actividad temporal de borrador, resolver o crear en class_activities
    let targetActId = activityId;
    if (!targetActId || targetActId === 'draft-temp' || String(targetActId).startsWith('temp-')) {
      const { data: existingAct } = await supabase
        .from('class_activities')
        .select('id, title, description, is_mandatory, max_attempts, is_published')
        .eq('class_id', classId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAct) {
        targetActId = existingAct.id;
        setActivity(existingAct);
      } else {
        const insertPayload = {
          class_id: classId,
          title: localActivity.title || 'Actividad de Reforzamiento',
          description: localActivity.description || '',
          is_mandatory: false,
          max_attempts: 1,
          due_date: localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null,
          is_published: false
        };

        let { data: newAct, error: actErr } = await supabase
          .from('class_activities')
          .insert([insertPayload])
          .select()
          .single();

        if (actErr && (actErr.code === '42703' || actErr.message?.includes('due_date'))) {
          delete insertPayload.due_date;
          const retry = await supabase.from('class_activities').insert([insertPayload]).select().single();
          newAct = retry.data;
          actErr = retry.error;
        }

        if (actErr) throw actErr;
        targetActId = newAct.id;
        setActivity(newAct);
      }
    }

    const normalizeQType = (t) => {
      if (!t) return 'single_choice';
      const str = String(t).toLowerCase();
      if (str.includes('true') || str.includes('false') || str.includes('falso') || str.includes('verdadero')) {
        return 'true_false';
      }
      return 'single_choice';
    };

    // 0. Eliminar de DB preguntas que ya no estén en currentQuestions (en orden para respetar Foreign Keys)
    const { data: existingQs } = await supabase
      .from('activity_questions')
      .select('id')
      .eq('activity_id', targetActId);

    if (existingQs && existingQs.length > 0) {
      const currentRealIds = new Set(currentQuestions.filter(q => !String(q.id).startsWith('temp-')).map(q => q.id));
      const idsToDelete = existingQs.map(q => q.id).filter(id => !currentRealIds.has(id));
      if (idsToDelete.length > 0) {
        await supabase.from('attempt_answers').delete().in('question_id', idsToDelete);
        await supabase.from('question_correct_answers').delete().in('question_id', idsToDelete);
        await supabase.from('question_options').delete().in('question_id', idsToDelete);
        await supabase.from('activity_questions').delete().in('id', idsToDelete);
      }
    }

    // Guardar preguntas en paralelo con inserción de opciones en bloque
    const savedQuestions = await Promise.all(
      currentQuestions.map(async (q, qIndex) => {
        let realQId = q.id;
        const validQType = normalizeQType(q.question_type);

        // 1. Crear o actualizar la pregunta en DB
        if (String(q.id).startsWith('temp-')) {
          const qPayload = {
            activity_id: targetActId,
            text: q.text || 'Sin enunciado',
            question_type: validQType,
            order_num: qIndex
          };
          if (q.explanation) qPayload.explanation = q.explanation;
          if (q.source_basis) qPayload.source_basis = q.source_basis;

          let { data: insertedQ, error: qErr } = await supabase
            .from('activity_questions')
            .insert([qPayload])
            .select()
            .single();

          if (qErr && (qErr.message?.includes('explanation') || qErr.message?.includes('source_basis') || qErr.code === 'PGRST204')) {
            delete qPayload.explanation;
            delete qPayload.source_basis;
            const retryRes = await supabase
              .from('activity_questions')
              .insert([qPayload])
              .select()
              .single();
            insertedQ = retryRes.data;
            qErr = retryRes.error;
          }

          if (qErr) throw qErr;
          realQId = insertedQ.id;

          // Inserción en lote (bulk) de todas las opciones en 1 sola consulta
          const optsPayload = (q.options || []).map((opt, oIndex) => ({
            question_id: realQId,
            text: opt.text || `Opción ${oIndex + 1}`,
            order_num: oIndex
          }));

          const { data: insertedOpts, error: optErr } = await supabase
            .from('question_options')
            .insert(optsPayload)
            .select();

          if (optErr) throw optErr;

          let realCorrectOptId = null;
          const correctIdx = (q.options || []).findIndex(o => String(o.id) === String(q.correctOptionId));
          if (correctIdx >= 0 && insertedOpts?.[correctIdx]) {
            realCorrectOptId = insertedOpts[correctIdx].id;
          } else if (insertedOpts?.[0]) {
            realCorrectOptId = insertedOpts[0].id;
          }

          if (realCorrectOptId) {
            await supabase
              .from('question_correct_answers')
              .upsert({
                question_id: realQId,
                correct_option_id: realCorrectOptId
              }, { onConflict: 'question_id' });
          }

          return {
            ...q,
            id: realQId,
            activity_id: targetActId,
            options: (insertedOpts || []).map((io, idx) => ({
              ...(q.options?.[idx] || {}),
              id: io.id,
              question_id: realQId
            })),
            correctOptionId: realCorrectOptId
          };
        } else {
          // Pregunta existente: actualizar
          const updatePayload = {
            text: q.text,
            question_type: validQType,
            order_num: qIndex
          };
          if (q.explanation !== undefined) updatePayload.explanation = q.explanation || null;

          await supabase
            .from('activity_questions')
            .update(updatePayload)
            .eq('id', q.id);

          // Eliminar opciones huérfanas
          const { data: existingOpts } = await supabase
            .from('question_options')
            .select('id')
            .eq('question_id', realQId);

          if (existingOpts && existingOpts.length > 0) {
            const currentOptRealIds = new Set((q.options || []).filter(o => !String(o.id).startsWith('temp-')).map(o => o.id));
            const optIdsToDelete = existingOpts.map(o => o.id).filter(id => !currentOptRealIds.has(id));
            if (optIdsToDelete.length > 0) {
              await supabase.from('question_correct_answers').delete().in('correct_option_id', optIdsToDelete);
              await supabase.from('question_options').delete().in('id', optIdsToDelete);
            }
          }

          // Crear o actualizar opciones
          const savedOptions = [];
          let realCorrectOptId = null;

          for (let oIndex = 0; oIndex < (q.options || []).length; oIndex++) {
            const opt = q.options[oIndex];
            let realOptId = opt.id;

            if (String(opt.id).startsWith('temp-')) {
              const { data: insertedOpt, error: optErr } = await supabase
                .from('question_options')
                .insert([{
                  question_id: realQId,
                  text: opt.text || 'Opción',
                  order_num: oIndex
                }])
                .select()
                .single();

              if (optErr) throw optErr;
              realOptId = insertedOpt.id;
            } else {
              await supabase
                .from('question_options')
                .update({
                  text: opt.text,
                  order_num: oIndex
                })
                .eq('id', opt.id);
            }

            if (q.correctOptionId && String(q.correctOptionId) === String(opt.id)) {
              realCorrectOptId = realOptId;
            }

            savedOptions.push({
              ...opt,
              id: realOptId,
              question_id: realQId
            });
          }

          if (!realCorrectOptId && savedOptions.length > 0) {
            realCorrectOptId = savedOptions[0].id;
          }

          if (realCorrectOptId) {
            await supabase
              .from('question_correct_answers')
              .upsert({
                question_id: realQId,
                correct_option_id: realCorrectOptId
              }, { onConflict: 'question_id' });
          }

          return {
            ...q,
            id: realQId,
            activity_id: targetActId,
            options: savedOptions,
            correctOptionId: realCorrectOptId
          };
        }
      })
    );

    return savedQuestions;
  };

  const saveActivityInfo = async () => {
    setSaving(true);
    setSavingQuestions(true);
    setError('');
    setSuccess('');
    try {
      let realActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) 
        ? activity.id 
        : null;

      let currentAct = null;

      if (!realActId) {
        // Verificar si ya existe en la BD para esta clase
        const { data: existingAct } = await supabase
          .from('class_activities')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const parsedDue = localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null;

        if (existingAct) {
          realActId = existingAct.id;
          const updatePayload = {
            title: localActivity.title,
            description: localActivity.description,
            is_mandatory: false,
            max_attempts: 1,
            due_date: parsedDue
          };
          let { data: updatedAct, error: updateError } = await supabase
            .from('class_activities')
            .update(updatePayload)
            .eq('id', realActId)
            .select()
            .single();

          if (updateError && (updateError.code === '42703' || updateError.message?.includes('due_date'))) {
            delete updatePayload.due_date;
            const retry = await supabase.from('class_activities').update(updatePayload).eq('id', realActId).select().single();
            updatedAct = retry.data;
            updateError = retry.error;
          }

          if (updateError) throw updateError;
          currentAct = updatedAct;
          setActivity(updatedAct);
        } else {
          const insertPayload = {
            class_id: classId,
            title: localActivity.title,
            description: localActivity.description,
            is_mandatory: false,
            max_attempts: 1,
            due_date: parsedDue,
            is_published: false
          };
          let { data: newAct, error: insertError } = await supabase
            .from('class_activities')
            .insert([insertPayload])
            .select()
            .single();

          if (insertError && (insertError.code === '42703' || insertError.message?.includes('due_date'))) {
            delete insertPayload.due_date;
            const retry = await supabase.from('class_activities').insert([insertPayload]).select().single();
            newAct = retry.data;
            insertError = retry.error;
          }

          if (insertError) throw insertError;
          realActId = newAct.id;
          currentAct = newAct;
          setActivity(newAct);
        }
      } else {
        const parsedDue = localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null;
        const updatePayload = {
          title: localActivity.title,
          description: localActivity.description,
          is_mandatory: false,
          max_attempts: 1,
          due_date: parsedDue
        };
        let { data: updatedAct, error: updateError } = await supabase
          .from('class_activities')
          .update(updatePayload)
          .eq('id', realActId)
          .select()
          .single();

        if (updateError && (updateError.code === '42703' || updateError.message?.includes('due_date'))) {
          delete updatePayload.due_date;
          const retry = await supabase.from('class_activities').update(updatePayload).eq('id', realActId).select().single();
          updatedAct = retry.data;
          updateError = retry.error;
        }

        if (updateError) throw updateError;
        currentAct = updatedAct;
        setActivity(updatedAct);
      }

      // Guardar en la BD todas las preguntas y opciones (incluyendo las generadas por IA)
      if (questions.length > 0) {
        const savedQs = await persistQuestionsToDatabase(realActId, questions);
        setQuestions(savedQs);
      } else {
        try {
          const { error: rpcErr } = await supabase.rpc('purge_activity_questions', { p_activity_id: realActId });
          if (rpcErr) {
            const { data: oldQs } = await supabase.from('activity_questions').select('id').eq('activity_id', realActId);
            if (oldQs && oldQs.length > 0) {
              const oldQIds = oldQs.map(q => q.id);
              await supabase.from('attempt_answers').delete().in('question_id', oldQIds);
              await supabase.from('question_correct_answers').delete().in('question_id', oldQIds);
              await supabase.from('question_options').delete().in('question_id', oldQIds);
              await supabase.from('activity_questions').delete().in('id', oldQIds);
            }
          }
        } catch (_) {}
      }

      // Sincronizar también activity_drafts con las preguntas guardadas
      try {
        const { data: latestDraft } = await supabase
          .from('activity_drafts')
          .select('*')
          .eq('class_id', classId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestDraft) {
          await supabase
            .from('activity_drafts')
            .update({
              draft_data: {
                ...latestDraft.draft_data,
                activity_title: localActivity.title,
                activity_description: localActivity.description,
                questions: questions.map(q => ({
                  text: q.text,
                  question_type: q.question_type,
                  explanation: q.explanation || '',
                  options: (q.options || []).map(o => ({
                    text: o.text,
                    is_correct: String(o.id) === String(q.correctOptionId)
                  }))
                }))
              },
              status: questions.length === 0 ? 'cleared' : latestDraft.status
            })
            .eq('id', latestDraft.id);
        }
      } catch (_) {}

      setSuccess(`✓ Se guardaron exitosamente ${questions.length} preguntas en la base de datos.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error(err);
      setError('Error al guardar las preguntas: ' + err.message);
    } finally {
      setSaving(false);
      setSavingQuestions(false);
    }
  };

  const handleSaveQuestions = saveActivityInfo;

  const addQuestion = async (type) => {
    let currentAct = activity;
    if (!currentAct) {
      return setError('Guarda primero la actividad para poder añadir preguntas.');
    }
    try {
      const newOrder = questions.length;
      
      const { data: qData, error: qError } = await supabase
        .from('activity_questions')
        .insert([{
          activity_id: currentAct.id,
          text: 'Nueva pregunta',
          question_type: type,
          order_num: newOrder
        }])
        .select()
        .single();
        
      if (qError) throw qError;

      let initialOptions = [];
      if (type === 'true_false') {
        const { data: oData, error: oError } = await supabase
          .from('question_options')
          .insert([
            { question_id: qData.id, text: 'Verdadero', order_num: 0 },
            { question_id: qData.id, text: 'Falso', order_num: 1 }
          ])
          .select();
        
        if (oError) throw oError;
        initialOptions = oData;
      }

      const newQuestion = {
        ...qData,
        options: initialOptions,
        correctOptionId: null
      };

      setQuestions([...questions, newQuestion]);
      
    } catch (err) {
      console.error(err);
      setError('Error añadiendo pregunta: ' + err.message);
    }
  };

  const updateQuestionText = async (id, text) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, text } : q));
    if (!String(id).startsWith('temp-')) {
      try {
        await supabase.from('activity_questions').update({ text }).eq('id', id);
      } catch (err) { console.error(err); }
    }
  };

  const updateQuestionExplanation = async (id, explanation) => {
    setQuestions(questions.map(q => q.id === id ? { ...q, explanation } : q));
    if (!String(id).startsWith('temp-')) {
      try {
        const { error } = await supabase.from('activity_questions').update({ explanation }).eq('id', id);
        if (error && error.message?.includes('explanation')) {
          // Ignorar si la columna no existe en schema cache
        }
      } catch (err) { console.warn('Nota: no se pudo guardar explanation en DB:', err); }
    }
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('¿Eliminar pregunta? Se borrará permanentemente de la base de datos y del editor.')) return;
    
    // 1. Ubicar la pregunta que se desea eliminar
    const targetQ = questions.find(q => String(q.id) === String(id));

    // 2. Eliminar del estado inmediatamente
    const remainingQuestions = questions.filter(q => String(q.id) !== String(id));
    setQuestions(remainingQuestions);

    // 3. Eliminar de la base de datos física (activity_questions y relaciones)
    try {
      if (!String(id).startsWith('temp-')) {
        // Intentar primero con RPC seguro (SECURITY DEFINER)
        const { error: rpcErr } = await supabase.rpc('delete_activity_question', { p_question_id: id });
        if (rpcErr) {
          await supabase.from('attempt_answers').delete().eq('question_id', id);
          await supabase.from('question_correct_answers').delete().eq('question_id', id);
          await supabase.from('question_options').delete().eq('question_id', id);
          const { error: delErr } = await supabase.from('activity_questions').delete().eq('id', id);
          if (delErr) console.error('Error al eliminar de activity_questions:', delErr);
        }
      } else if (targetQ?.text) {
        // Si el ID en editor era temporal pero ya fue guardada en activity_questions con este mismo enunciado
        let realActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) 
          ? activity.id 
          : null;
        if (!realActId) {
          const { data: actRow } = await supabase.from('class_activities').select('id').eq('class_id', classId).maybeSingle();
          if (actRow) realActId = actRow.id;
        }

        if (realActId) {
          const { data: dbQs } = await supabase
            .from('activity_questions')
            .select('id')
            .eq('activity_id', realActId)
            .eq('text', targetQ.text.trim());

          if (dbQs && dbQs.length > 0) {
            for (const dbQ of dbQs) {
              const { error: rpcErr } = await supabase.rpc('delete_activity_question', { p_question_id: dbQ.id });
              if (rpcErr) {
                await supabase.from('attempt_answers').delete().eq('question_id', dbQ.id);
                await supabase.from('question_correct_answers').delete().eq('question_id', dbQ.id);
                await supabase.from('question_options').delete().eq('question_id', dbQ.id);
                await supabase.from('activity_questions').delete().eq('id', dbQ.id);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Error al eliminar pregunta de la base de datos:', err);
    }

    // 4. Si la pregunta proviene o se encuentra en un borrador de IA (activity_drafts), purgarla de TODOS los borradores de esta clase
    try {
      const { data: classDrafts } = await supabase
        .from('activity_drafts')
        .select('*')
        .eq('class_id', classId);

      if (classDrafts && classDrafts.length > 0) {
        for (const cd of classDrafts) {
          const currentDraftQuestions = cd.draft_data?.questions || [];
          const filteredDraftQuestions = currentDraftQuestions.filter((dq, idx) => {
            if (String(id) === `temp-draft-q-${idx}` || String(id) === `temp-q-${idx}`) return false;
            if (targetQ?.text && dq.text && dq.text.trim() === targetQ.text.trim()) return false;
            if (dq.id && String(dq.id) === String(id)) return false;
            return true;
          });

          const updatedDraftData = {
            ...cd.draft_data,
            questions: filteredDraftQuestions
          };

          await supabase
            .from('activity_drafts')
            .update({ 
              draft_data: updatedDraftData,
              status: filteredDraftQuestions.length === 0 ? 'cleared' : cd.status 
            })
            .eq('id', cd.id);

          setDraft(prev => (prev && prev.id === cd.id) ? { ...prev, draft_data: updatedDraftData } : prev);
        }
      }
    } catch (draftErr) {
      console.warn('Error al actualizar activity_drafts:', draftErr);
    }

    setSuccess('Pregunta eliminada correctamente de la base de datos y del editor.');
    setTimeout(() => setSuccess(''), 3000);
  };

  const addOption = async (questionId) => {
    const qIndex = questions.findIndex(q => q.id === questionId);
    if (qIndex < 0) return;
    const q = questions[qIndex];
    
    let newOpt = null;
    if (!String(questionId).startsWith('temp-')) {
      try {
        const { data, error } = await supabase
          .from('question_options')
          .insert([{
            question_id: questionId,
            text: 'Nueva opción',
            order_num: q.options.length
          }])
          .select()
          .single();
          
        if (!error) newOpt = data;
      } catch (err) { console.error(err); }
    }

    if (!newOpt) {
      newOpt = {
        id: `temp-o-${crypto.randomUUID()}`,
        question_id: questionId,
        text: 'Nueva opción',
        order_num: q.options.length
      };
    }

    const updatedQuestions = [...questions];
    updatedQuestions[qIndex] = { ...q, options: [...q.options, newOpt] };
    setQuestions(updatedQuestions);
  };

  const updateOptionText = async (questionId, optionId, text) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        return {
          ...q,
          options: q.options.map(o => o.id === optionId ? { ...o, text } : o)
        };
      }
      return q;
    }));

    if (!String(optionId).startsWith('temp-')) {
      try {
        await supabase.from('question_options').update({ text }).eq('id', optionId);
      } catch (err) { console.error(err); }
    }
  };

  const deleteOption = async (questionId, optionId) => {
    const qIndex = questions.findIndex(q => q.id === questionId);
    if (qIndex < 0) return;
    const q = questions[qIndex];
    let correctId = q.correctOptionId;

    if (!String(optionId).startsWith('temp-')) {
      try {
        if (correctId === optionId) {
          await supabase.from('question_correct_answers').delete().eq('question_id', questionId);
          correctId = null;
        }
        await supabase.from('attempt_answers').delete().eq('selected_option_id', optionId);
        await supabase.from('question_options').delete().eq('id', optionId);
      } catch (err) { console.error(err); }
    } else {
      if (correctId === optionId) correctId = null;
    }

    const updatedQuestions = [...questions];
    updatedQuestions[qIndex] = { 
      ...q, 
      options: q.options.filter(o => o.id !== optionId),
      correctOptionId: correctId
    };
    setQuestions(updatedQuestions);
  };

  const setCorrectOption = async (questionId, optionId) => {
    if (!String(questionId).startsWith('temp-') && !String(optionId).startsWith('temp-')) {
      try {
        const { error } = await supabase
          .from('question_correct_answers')
          .upsert({ question_id: questionId, correct_option_id: optionId }, { onConflict: 'question_id' });
          
        if (error) throw error;
      } catch (err) { console.error(err); }
    }

    setQuestions(questions.map(q => {
      if (q.id === questionId) return { ...q, correctOptionId: optionId };
      return q;
    }));
  };

  const togglePublish = async () => {
    const willPublish = !activity?.is_published;
    setPublishLoading(willPublish ? 'publishing' : 'unpublishing');
    setSaving(true);
    setError('');
    try {
      // 1. Obtener o crear la actividad real en la base de datos
      let realActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) 
        ? activity.id 
        : null;

      let currentAct = activity;

      if (!realActId) {
        // Verificar si ya existe en la BD para esta clase
        const { data: existingAct } = await supabase
          .from('class_activities')
          .select('id, title, description, is_mandatory, max_attempts, is_published')
          .eq('class_id', classId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingAct) {
          realActId = existingAct.id;
          currentAct = existingAct;
        } else {
          // Crear la fila inicial en class_activities
          const insertPayload = {
            class_id: classId,
            title: localActivity.title || 'Actividad de Reforzamiento',
            description: localActivity.description || '',
            is_mandatory: false,
            max_attempts: 1,
            due_date: localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null,
            is_published: false
          };

          let { data: newAct, error: createErr } = await supabase
            .from('class_activities')
            .insert([insertPayload])
            .select()
            .single();

          if (createErr && (createErr.code === '42703' || createErr.message?.includes('due_date'))) {
            delete insertPayload.due_date;
            const retry = await supabase.from('class_activities').insert([insertPayload]).select().single();
            newAct = retry.data;
            createErr = retry.error;
          }

          if (createErr) throw createErr;
          realActId = newAct.id;
          currentAct = newAct;
        }
      }

      const willPublishActual = !currentAct?.is_published;

      // FAST PATH: Despublicar de forma inmediata (sin tocar preguntas ni bloquear la UI)
      if (!willPublishActual) {
        const { data: updatedAct, error: pubErr } = await supabase
          .from('class_activities')
          .update({ is_published: false })
          .eq('id', realActId)
          .select()
          .single();

        if (pubErr) throw pubErr;

        setActivity(updatedAct || { ...(currentAct || {}), id: realActId, is_published: false });
        setSuccess('Actividad regresada a borrador.');
        setTimeout(() => setSuccess(''), 4000);

        // Sincronizar status en activity_drafts en segundo plano
        supabase
          .from('activity_drafts')
          .update({ status: 'pending', reviewed_at: null })
          .eq('class_id', classId)
          .then(() => {})
          .catch(err => console.warn('Nota: No se pudo actualizar status en activity_drafts:', err));

        return;
      }

      // VALIDACIONES PREVIAS (antes de cualquier operación de base de datos)
      if (questions.length === 0) {
        throw new Error('La actividad debe tener al menos una pregunta para ser publicada.');
      }
      for (const q of questions) {
        if (!q.options || q.options.length < 2) {
          throw new Error(`La pregunta "${q.text || 'Sin enunciado'}" debe tener al menos 2 opciones.`);
        }
        if (!q.correctOptionId) {
          throw new Error(`La pregunta "${q.text || 'Sin enunciado'}" no tiene una opción correcta asignada.`);
        }
      }

      // 2. Persistir todas las preguntas y opciones con el UUID real en paralelo
      const savedQs = await persistQuestionsToDatabase(realActId, questions);
      setQuestions(savedQs);

      // 3. Actualizar el estado en class_activities
      const pubPayload = { 
        is_published: true,
        title: localActivity.title || currentAct?.title || 'Actividad de Reforzamiento',
        description: localActivity.description || currentAct?.description || '',
        is_mandatory: false,
        max_attempts: 1,
        due_date: localActivity.due_date ? parseLocalDatetime(localActivity.due_date) : null
      };

      let { data: updatedAct, error: pubErr } = await supabase
        .from('class_activities')
        .update(pubPayload)
        .eq('id', realActId)
        .select()
        .single();

      if (pubErr && (pubErr.code === '42703' || pubErr.message?.includes('due_date'))) {
        delete pubPayload.due_date;
        const retry = await supabase.from('class_activities').update(pubPayload).eq('id', realActId).select().single();
        updatedAct = retry.data;
        pubErr = retry.error;
      }

      if (pubErr) throw pubErr;

      setActivity(updatedAct || { ...(currentAct || {}), id: realActId, is_published: true });
      setSuccess('✓ Actividad publicada exitosamente. Los estudiantes ya pueden responderla.');
      setTimeout(() => setSuccess(''), 4000);

      // 4. Sincronizar en segundo plano activity_drafts para mantener consistencia sin bloquear al usuario
      (async () => {
        try {
          const { data: latestDraft } = await supabase
            .from('activity_drafts')
            .select('id, draft_data')
            .eq('class_id', classId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestDraft) {
            await supabase
              .from('activity_drafts')
              .update({ 
                status: 'approved',
                reviewed_at: new Date().toISOString(),
                draft_data: {
                  ...latestDraft.draft_data,
                  activity_title: localActivity.title,
                  activity_description: localActivity.description,
                  questions: savedQs.map(q => ({
                    text: q.text,
                    question_type: q.question_type,
                    explanation: q.explanation || '',
                    options: (q.options || []).map(o => ({
                      text: o.text,
                      is_correct: String(o.id) === String(q.correctOptionId)
                    }))
                  }))
                }
              })
              .eq('id', latestDraft.id);
          }
        } catch (draftErr) {
          console.warn('Nota: No se pudo actualizar status en activity_drafts:', draftErr);
        }
      })();
    } catch (err) {
      console.error('Error al cambiar el estado de publicación:', err);
      setError('Error al cambiar el estado de publicación: ' + (err.message || err));
    } finally {
      setSaving(false);
      setPublishLoading(null);
    }
  };

  const handleQuickExtendDays = async (days = 7) => {
    const target = new Date();
    target.setDate(target.getDate() + days);
    target.setHours(23, 59, 0, 0);
    const localStr = toLocalDatetimeString(target.toISOString());
    setLocalActivity(prev => ({ ...prev, due_date: localStr }));
    
    // Si la actividad ya existe en BD, guardar al instante para reactivarla inmediatamente
    const realActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) ? activity.id : null;
    if (realActId) {
      setSaving(true);
      try {
        const parsed = parseLocalDatetime(localStr);
        const { error: updErr } = await supabase
          .from('class_activities')
          .update({ due_date: parsed })
          .eq('id', realActId);
        
        if (updErr) throw updErr;
        setActivity(prev => ({ ...(prev || {}), due_date: parsed }));
        setSuccess(`✓ Actividad reactivada con éxito. Plazo extendido hasta el ${formatClassDate(parsed, false)}.`);
        setTimeout(() => setSuccess(''), 5000);
      } catch (e) {
        console.error('Error reactivando actividad:', e);
        const msg = String(e.message || e);
        if (msg.includes('due_date') || msg.includes('schema cache')) {
          setError('La columna "due_date" aún no existe en tu base de datos de Supabase. Ejecuta en el SQL Editor de Supabase: ALTER TABLE class_activities ADD COLUMN IF NOT EXISTS due_date timestamptz;');
        } else {
          setError('No se pudo reactivar automáticamente la fecha: ' + msg);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  const handleClearDeadline = async () => {
    setLocalActivity(prev => ({ ...prev, due_date: '' }));
    const realActId = (activity && activity.id !== 'draft-temp' && !String(activity.id).startsWith('temp-')) ? activity.id : null;
    if (realActId) {
      setSaving(true);
      try {
        const { error: updErr } = await supabase
          .from('class_activities')
          .update({ due_date: null })
          .eq('id', realActId);

        if (updErr) throw updErr;
        setActivity(prev => ({ ...(prev || {}), due_date: null }));
        setSuccess('✓ Plazo eliminado. La actividad queda abierta indefinidamente.');
        setTimeout(() => setSuccess(''), 4000);
      } catch (e) {
        console.error('Error eliminando plazo:', e);
        const msg = String(e.message || e);
        if (msg.includes('due_date') || msg.includes('schema cache')) {
          setError('La columna "due_date" aún no existe en Supabase. Ejecuta la sentencia SQL en Supabase para habilitarla.');
        } else {
          setError('No se pudo actualizar el plazo: ' + msg);
        }
      } finally {
        setSaving(false);
      }
    }
  };

  // VISTA PREVIA
  if (previewMode) {
    const hasQuestions = questions && questions.length > 0;
    const currentQ = hasQuestions ? questions[previewQuestionIndex] : null;
    const currentOptions = currentQ?.options || [];

    return (
      <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', minHeight: '400px' }}>
        <button onClick={() => setPreviewMode(false)} className="btn btn-secondary" style={{ marginBottom: '1.5rem' }}>
          ← Salir de Vista Previa
        </button>
        
        {!hasQuestions || !currentQ ? (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#475569', marginBottom: '0.5rem' }}>
              Esta actividad aún no tiene preguntas para previsualizar.
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Añade algunas preguntas en el editor o genera un borrador con IA.
            </p>
          </div>
        ) : (
          <div style={{ background: 'white', padding: '2rem', borderRadius: '12px', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--navy)' }}>Pregunta {previewQuestionIndex + 1} de {questions.length}</span>
            </div>
            
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', fontWeight: 600 }}>{currentQ.text || 'Sin enunciado'}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {currentOptions.map(opt => {
                const isSelected = previewSelectedOptions[currentQ.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setPreviewSelectedOptions({ ...previewSelectedOptions, [currentQ.id]: opt.id })}
                    style={{
                      padding: '1rem',
                      textAlign: 'left',
                      borderRadius: '8px',
                      border: `1.5px solid ${isSelected ? 'var(--gold)' : 'var(--border-color)'}`,
                      background: isSelected ? '#fbf8f1' : 'white',
                      color: isSelected ? 'var(--navy)' : 'inherit',
                      fontWeight: isSelected ? 600 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem'
                    }}
                  >
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${isSelected ? 'var(--gold)' : '#cbd5e1'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {isSelected && <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--gold)' }} />}
                    </div>
                    {opt.text}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2.5rem' }}>
              <button
                className="btn btn-secondary"
                disabled={previewQuestionIndex === 0}
                onClick={() => setPreviewQuestionIndex(prev => prev - 1)}
              >
                Anterior
              </button>
              <button
                className="btn btn-primary"
                disabled={!previewSelectedOptions[currentQ.id]}
                onClick={() => {
                  if (previewQuestionIndex < questions.length - 1) {
                    setPreviewQuestionIndex(prev => prev + 1);
                  } else {
                    alert("¡Has llegado al final de la vista previa!");
                  }
                }}
              >
                {previewQuestionIndex === questions.length - 1 ? 'Finalizar' : 'Siguiente'}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando actividad...</div>;
  }

  if (!activity) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
        <h4 style={{ marginBottom: '1rem', fontSize: '1.2rem', color: 'var(--navy)', fontWeight: 600 }}>Esta clase aún no tiene una actividad</h4>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
          Crea una actividad de reforzamiento para validar el aprendizaje de los estudiantes.
        </p>
        <button onClick={createActivity} disabled={saving} className="btn btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '1rem' }}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} /> Crear Actividad
        </button>
        {error && <div style={{ color: 'red', marginTop: '1rem' }}>{error}</div>}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* 1. CONFIGURACIÓN GENERAL */}
      <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--navy)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText size={20} /> Configuración de la Actividad
            </h3>
            <span style={{ 
              display: 'inline-block', 
              marginTop: '0.5rem', 
              fontSize: '0.8rem', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '20px', 
              background: activity?.is_published ? '#dcfce7' : '#f1f5f9',
              color: activity?.is_published ? '#166534' : '#475569',
              fontWeight: 600
            }}>
              {activity?.is_published ? 'PUBLICADA' : 'BORRADOR (Pendiente de revisión)'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setPreviewQuestionIndex(0); setPreviewMode(true); }} className="btn btn-secondary">
              <PlayCircle size={16} style={{ marginRight: '0.4rem' }}/> Vista Previa
            </button>
            <button 
              onClick={togglePublish} 
              disabled={saving || !!publishLoading}
              className={`btn ${activity?.is_published ? 'btn-secondary' : 'btn-primary'}`}
              style={{
                ...(activity?.is_published ? { borderColor: 'var(--border-color)', color: '#dc2626' } : {}),
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                opacity: publishLoading ? 0.8 : 1,
                cursor: publishLoading ? 'wait' : 'pointer'
              }}
            >
              {publishLoading === 'publishing' ? (
                <>
                  <RefreshCw size={15} className="spin" /> Publicando...
                </>
              ) : publishLoading === 'unpublishing' ? (
                <>
                  <RefreshCw size={15} className="spin" /> Despublicando...
                </>
              ) : activity?.is_published ? (
                'Despublicar'
              ) : (
                'Publicar Actividad'
              )}
            </button>
          </div>
        </div>

        {publishLoading && (
          <div style={{
            position: 'relative',
            width: '100%',
            height: '4px',
            background: 'rgba(252, 163, 17, 0.15)',
            overflow: 'hidden',
            borderRadius: '2px',
            marginBottom: '1.25rem'
          }}>
            <div style={{
              width: '100%',
              height: '100%',
              background: publishLoading === 'publishing' ? 'linear-gradient(90deg, #16a34a, #4ade80, #16a34a)' : 'linear-gradient(90deg, #f59e0b, #ef4444, #f59e0b)',
              borderRadius: '2px',
              animation: 'shimmer 1s infinite linear',
              backgroundSize: '200% 100%'
            }} />
          </div>
        )}

        {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><AlertTriangle size={16}/> {error}</div>}
        {success && <div style={{ background: '#f0fdf4', color: '#15803d', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle2 size={16}/> {success}</div>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Título de la Actividad</label>
            <input 
              type="text" 
              value={localActivity.title} 
              onChange={e => setLocalActivity({...localActivity, title: e.target.value})}
              style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--border-color)', borderRadius: '6px' }} 
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Descripción (Opcional)</label>
            <textarea 
              value={localActivity.description} 
              onChange={e => setLocalActivity({...localActivity, description: e.target.value})}
              style={{ width: '100%', padding: '0.65rem', border: '1px solid var(--border-color)', borderRadius: '6px', minHeight: '60px', fontFamily: 'inherit' }} 
              placeholder="Ej: Resuelve este breve test para asentar tus conocimientos..."
            />
          </div>
          
          {/* FECHA LÍMITE Y CONTROL DE VENCIMIENTO / REACTIVACIÓN */}
          <div style={{ gridColumn: '1 / -1', marginTop: '0.75rem', padding: '1rem 1.25rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={18} color="var(--navy)" />
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--navy)' }}>Fecha y Hora Límite para Presentar</span>
              </div>
              {/* Indicador de estado */}
              {(() => {
                if (!localActivity.due_date) {
                  return (
                    <span style={{ fontSize: '0.78rem', background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: '12px', fontWeight: 600 }}>
                      ⚪ Sin fecha límite (Abierta indefinidamente)
                    </span>
                  );
                }
                const parsed = parseLocalDatetime(localActivity.due_date);
                const isExpired = parsed ? new Date(parsed) < new Date() : false;
                if (isExpired) {
                  return (
                    <span style={{ fontSize: '0.78rem', background: '#fee2e2', color: '#991b1b', padding: '3px 10px', borderRadius: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      🔴 Plazo vencido (Cerrada para estudiantes)
                    </span>
                  );
                }
                return (
                  <span style={{ fontSize: '0.78rem', background: '#dcfce7', color: '#166534', padding: '3px 10px', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    🟢 Abierta hasta {formatClassDate(parsed, false)}
                  </span>
                );
              })()}
            </div>

            {/* Alerta y botón de reactivación si el plazo ya venció */}
            {(() => {
              if (!localActivity.due_date) return null;
              const parsed = parseLocalDatetime(localActivity.due_date);
              const isExpired = parsed ? new Date(parsed) < new Date() : false;
              if (!isExpired) return null;

              return (
                <div style={{ marginBottom: '1rem', padding: '0.85rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#991b1b', fontSize: '0.85rem' }}>
                    <AlertTriangle size={18} />
                    <div>
                      <strong>Esta actividad ha finalizado.</strong> Los estudiantes no pueden resolverla porque el plazo expiró.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleQuickExtendDays(7)}
                      disabled={saving}
                      className="btn btn-primary"
                      style={{ background: '#dc2626', borderColor: '#dc2626', fontSize: '0.82rem', padding: '0.45rem 0.9rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                    >
                      <RotateCcw size={15} /> Reactivar (+7 días)
                    </button>
                    <button
                      type="button"
                      onClick={handleClearDeadline}
                      disabled={saving}
                      className="btn btn-outline"
                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.8rem', background: 'white', color: '#475569' }}
                    >
                      Reabrir sin fecha límite
                    </button>
                  </div>
                </div>
              );
            })()}

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', minWidth: '220px' }}>
                <input 
                  type="datetime-local" 
                  value={localActivity.due_date} 
                  onChange={e => setLocalActivity(prev => ({ ...prev, due_date: e.target.value }))}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', border: '1px solid var(--border-color)', borderRadius: '6px', fontSize: '0.88rem' }} 
                />
              </div>

              {/* Botones de extensión y atajo rápido */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginRight: '2px' }}>Extender plazo:</span>
                <button
                  type="button"
                  onClick={() => handleQuickExtendDays(3)}
                  disabled={saving}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Establecer límite para dentro de 3 días a las 23:59"
                >
                  +3 días
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExtendDays(7)}
                  disabled={saving}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Establecer límite para dentro de 7 días a las 23:59"
                >
                  +7 días
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickExtendDays(15)}
                  disabled={saving}
                  className="btn btn-outline"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem' }}
                  title="Establecer límite para dentro de 15 días a las 23:59"
                >
                  +15 días
                </button>
                {localActivity.due_date && (
                  <button
                    type="button"
                    onClick={handleClearDeadline}
                    disabled={saving}
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '0.35rem 0.65rem', color: '#64748b' }}
                    title="Eliminar la fecha límite para dejarla abierta"
                  >
                    Sin límite
                  </button>
                )}
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Los estudiantes podrán resolver y enviar la actividad hasta esta fecha y hora. Una vez vencida, podrás reactivarla o ampliar el plazo cuando lo necesites.
            </div>
          </div>
          
          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button onClick={saveActivityInfo} disabled={saving} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* 2. GENERADOR DE PREGUNTAS CON IA (GOOGLE GEMINI) */}
      {isTeacherOrAdmin && (
        <div className="card" style={{ 
          padding: '1.5rem', 
          background: '#ffffff', 
          borderRadius: '10px', 
          border: '1.5px solid #cbd5e1',
          boxShadow: '0 2px 8px rgba(20, 33, 61, 0.04)'
        }}>
          {/* Header del generador */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '42px', height: '42px', borderRadius: '10px', 
                background: 'linear-gradient(135deg, #14213d 0%, #1e3a5f 100%)', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: 'var(--gold)', flexShrink: 0 
              }}>
                <Sparkles size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)', margin: 0 }}>
                  Generador de Preguntas con IA
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Genera preguntas de evaluación formativa analizando automáticamente los documentos y presentaciones de esta clase.
                </p>
              </div>
            </div>
          </div>

          {/* GENERADOR DESDE MATERIALES DE LA CLASE */}
          <div>
              {loadingResources ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  <RefreshCw size={18} className="spin" style={{ marginBottom: '0.5rem' }} />
                  <div>Cargando materiales de la clase...</div>
                </div>
              ) : classResources.length === 0 ? (
                /* ESTADO VACÍO: NO HAY DOCUMENTOS SUBIDOS */
                <div style={{
                  padding: '1.75rem',
                  background: '#fffbeb',
                  border: '1.5px dashed #fcd34d',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1.25rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#b45309', flexShrink: 0 }}>
                      <FileQuestion size={24} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#92400e' }}>
                        Esta clase no tiene materiales de estudio subidos aún
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#b45309', marginTop: '3px', maxWidth: '520px' }}>
                        Para generar preguntas con Inteligencia Artificial, primero debes subir una presentación (PDF) o documento de lectura en la sección de Materiales.
                      </div>
                    </div>
                  </div>

                  {onOpenUploadModal && (
                    <button
                      type="button"
                      onClick={onOpenUploadModal}
                      style={{
                        padding: '0.55rem 1.1rem',
                        background: '#d97706',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '0.82rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 6px rgba(217, 119, 6, 0.25)'
                      }}
                    >
                      <Upload size={14} /> Subir Material a esta Clase
                    </button>
                  )}
                </div>
              ) : (
                /* SELECTOR DE DOCUMENTOS DE LA CLASE */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.45rem' }}>
                      Selecciona el material de estudio para generar las preguntas:
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                      {classResources.map((res) => {
                        const isSelected = selectedResourceId === res.id;
                        const isPresentation = res.resource_type === 'presentation';

                        return (
                          <div
                            key={res.id}
                            onClick={() => setSelectedResourceId(res.id)}
                            style={{
                              border: `2px solid ${isSelected ? 'var(--navy)' : 'var(--border-color)'}`,
                              background: isSelected ? '#f8fafc' : '#ffffff',
                              borderRadius: '8px',
                              padding: '0.85rem 1rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '0.75rem',
                              transition: 'all 0.15s ease',
                              boxShadow: isSelected ? '0 2px 6px rgba(20, 33, 61, 0.08)' : 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                              <div style={{
                                width: '18px', height: '18px', borderRadius: '50%',
                                border: `2px solid ${isSelected ? 'var(--navy)' : '#cbd5e1'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {isSelected && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--navy)' }} />}
                              </div>

                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--navy)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {res.title || 'Documento sin título'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                  <span style={{ 
                                    padding: '0.05rem 0.35rem', 
                                    borderRadius: '4px', 
                                    background: isPresentation ? '#fef3c7' : '#f1f5f9', 
                                    color: isPresentation ? '#92400e' : '#475569',
                                    fontWeight: 600,
                                    fontSize: '0.68rem'
                                  }}>
                                    {isPresentation ? 'Presentación' : (res.resource_type || 'PDF')}
                                  </span>
                                  {res.created_at && (
                                    <span>{new Date(res.created_at).toLocaleDateString('es-CO')}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {res.url && (
                              <a
                                href={res.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                title="Abrir y previsualizar documento en nueva pestaña"
                                style={{
                                  padding: '0.35rem 0.55rem',
                                  background: '#f8fafc',
                                  border: '1px solid #e2e8f0',
                                  borderRadius: '6px',
                                  color: '#64748b',
                                  fontSize: '0.72rem',
                                  textDecoration: 'none',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.3rem',
                                  flexShrink: 0
                                }}
                              >
                                <ExternalLink size={12} /> Ver
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selector de cantidad y botón generar */}
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    flexWrap: 'wrap', 
                    gap: '1rem',
                    paddingTop: '0.5rem',
                    borderTop: '1px solid #f1f5f9'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Cantidad de preguntas:
                      </span>
                      {[3, 5, 8, 10].map(count => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setAiQuestionCount(count)}
                          style={{
                            padding: '0.25rem 0.65rem',
                            borderRadius: '6px',
                            border: `1.5px solid ${aiQuestionCount === count ? 'var(--gold-dark)' : 'var(--border-color)'}`,
                            background: aiQuestionCount === count ? '#fffbeb' : '#ffffff',
                            color: aiQuestionCount === count ? '#92400e' : 'var(--text-secondary)',
                            fontWeight: aiQuestionCount === count ? 800 : 500,
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {count}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={onGenerateAIClick}
                      disabled={aiGenerating || !selectedResourceId}
                      className="btn btn-primary"
                      style={{
                        padding: '0.6rem 1.35rem',
                        fontSize: '0.84rem',
                        fontWeight: 700,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.45rem',
                        boxShadow: '0 2px 8px rgba(20,33,61,0.2)'
                      }}
                    >
                      {aiGenerating ? (
                        <>
                          <RefreshCw size={15} className="spin" /> Analizando documento con IA (~3-5s)...
                        </>
                      ) : (
                        <>
                          <Sparkles size={15} color="var(--gold)" /> Generar Preguntas con IA
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

          {/* MENSAJES DE ALERTA DE LA IA */}
          {aiError && (
            <div style={{
              marginTop: '1rem',
              padding: '0.75rem 1rem',
              background: '#fef2f2',
              color: '#b91c1c',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} flexShrink={0} />
              <span>{aiError}</span>
            </div>
          )}

          {aiSuccess && (
            <div style={{
              marginTop: '1rem',
              padding: '0.85rem 1.15rem',
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #86efac',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle2 size={18} flexShrink={0} />
                <span>{aiSuccess}</span>
              </div>
              <button
                type="button"
                onClick={handleSaveQuestions}
                disabled={saving}
                style={{
                  padding: '0.4rem 0.85rem',
                  background: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}
              >
                {savingQuestions ? (
                  <>
                    <RefreshCw size={13} className="spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save size={13} /> Guardar Ahora
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. PREGUNTAS Y OPCIONES */}
      <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', margin: 0 }}>Constructor de Preguntas ({questions.length})</h3>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Crea, edita y guarda las preguntas para esta actividad</span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button 
              type="button"
              onClick={handleSaveQuestions} 
              disabled={saving} 
              className="btn btn-primary"
              style={{
                fontSize: '0.8rem',
                padding: '0.5rem 0.9rem',
                background: '#1e3a8a',
                borderColor: '#1e3a8a',
                color: 'white',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)'
              }}
              title="Guardar preguntas en la base de datos"
            >
              {savingQuestions ? (
                <>
                  <RefreshCw size={14} className="spin" /> Guardando...
                </>
              ) : (
                <>
                  <Save size={14} /> Guardar Preguntas
                </>
              )}
            </button>
            <button onClick={() => addQuestion('single_choice')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
              <Plus size={14} style={{ marginRight: '0.3rem' }}/> Opción Múltiple
            </button>
            <button onClick={() => addQuestion('true_false')} className="btn btn-secondary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
              <Plus size={14} style={{ marginRight: '0.3rem' }}/> Verdadero / Falso
            </button>
          </div>
        </div>

        {questions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', background: '#f8fafc', borderRadius: '6px' }}>
            No hay preguntas. Añade una para comenzar.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {questions.map((q, idx) => (
              <div key={q.id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', overflow: 'hidden' }}>
                <div style={{ background: '#f8fafc', padding: '1rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', flex: 1 }}>
                    <div style={{ background: 'white', border: '1px solid #cbd5e1', width: '28px', height: '28px', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                      {idx + 1}
                    </div>
                    <textarea 
                      value={q.text}
                      onChange={(e) => updateQuestionText(q.id, e.target.value)}
                      placeholder="Escribe la pregunta aquí..."
                      style={{ flex: 1, padding: '0.5rem', border: '1px solid #cbd5e1', borderRadius: '4px', minHeight: '60px', fontFamily: 'inherit', resize: 'vertical' }}
                    />
                  </div>
                  <button onClick={() => deleteQuestion(q.id)} className="btn-icon del" title="Eliminar Pregunta" style={{ padding: '0.5rem' }}>
                    <Trash2 size={16} />
                  </button>
                </div>

                <div style={{ padding: '1rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Opciones ({q.question_type === 'single_choice' ? 'Selección Única' : 'Verdadero / Falso'})
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {q.options.map(opt => {
                      const isCorrect = q.correctOptionId === opt.id;
                      return (
                        <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <button 
                            onClick={() => setCorrectOption(q.id, opt.id)}
                            title="Marcar como correcta"
                            style={{ 
                              width: '28px', height: '28px', borderRadius: '50%', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              border: isCorrect ? 'none' : '2px solid #cbd5e1',
                              background: isCorrect ? '#22c55e' : 'transparent',
                              color: 'white', cursor: 'pointer', transition: 'all 0.2s'
                            }}
                          >
                            {isCorrect && <Check size={16} strokeWidth={3} />}
                          </button>
                          
                          <input 
                            type="text" 
                            value={opt.text}
                            onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                            disabled={q.question_type === 'true_false'}
                            style={{ flex: 1, padding: '0.5rem', border: isCorrect ? '1.5px solid #22c55e' : '1px solid var(--border-color)', borderRadius: '4px', background: q.question_type === 'true_false' ? '#f1f5f9' : 'white' }}
                          />
                          
                          {q.question_type !== 'true_false' && (
                            <button onClick={() => deleteOption(q.id, opt.id)} className="btn-icon del" style={{ padding: '0.5rem' }}>
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {q.question_type === 'single_choice' && (
                    <button onClick={() => addOption(q.id)} className="btn" style={{ marginTop: '0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--navy)', background: '#f1f5f9', padding: '0.4rem 0.75rem', borderRadius: '4px', border: 'none', cursor: 'pointer' }}>
                      <Plus size={14} /> Añadir opción
                    </button>
                  )}
                  
                  {!q.correctOptionId && (
                    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <AlertTriangle size={12} /> Debes marcar una opción como correcta.
                    </div>
                  )}

                  {/* CAMPO DE RETROALIMENTACIÓN PEDAGÓGICA */}
                  <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.3rem' }}>
                      💡 Retroalimentación Pedagógica (Explicación para el estudiante)
                    </label>
                    <input 
                      type="text" 
                      value={q.explanation || ''} 
                      onChange={(e) => updateQuestionExplanation(q.id, e.target.value)}
                      placeholder="Escribe la explicación o justificación de la respuesta correcta..."
                      style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.83rem' }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* BARRA DE ACCIÓN INFERIOR PARA GUARDAR PREGUNTAS */}
        {questions.length > 0 && (
          <div style={{
            marginTop: '1.5rem',
            padding: '1.25rem 1.5rem',
            background: '#f8fafc',
            border: '1.5px solid #e2e8f0',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckCircle2 size={18} color="#16a34a" />
              <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--navy)' }}>
                {questions.length} {questions.length === 1 ? 'pregunta configurada' : 'preguntas configuradas'}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button 
                type="button"
                onClick={handleSaveQuestions} 
                disabled={saving} 
                className="btn btn-primary"
                style={{
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem',
                  background: '#1e3a8a',
                  borderColor: '#1e3a8a',
                  color: 'white',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  boxShadow: '0 2px 6px rgba(30, 58, 138, 0.25)'
                }}
              >
                {savingQuestions ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Guardando preguntas...
                  </>
                ) : (
                  <>
                    <Save size={15} /> Guardar Preguntas ({questions.length})
                  </>
                )}
              </button>
              <button 
                type="button"
                onClick={togglePublish} 
                disabled={saving || !!publishLoading} 
                className={`btn ${activity?.is_published ? 'btn-secondary' : 'btn-primary'}`}
                style={{
                  fontSize: '0.85rem',
                  padding: '0.6rem 1.25rem',
                  fontWeight: 700,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  opacity: publishLoading ? 0.8 : 1,
                  cursor: publishLoading ? 'wait' : 'pointer'
                }}
              >
                {publishLoading ? (
                  <>
                    <RefreshCw size={15} className="spin" /> Procesando...
                  </>
                ) : activity?.is_published ? (
                  'Despublicar Actividad'
                ) : (
                  <>
                    <Check size={15} /> Publicar Actividad
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: ALERTA DE CONFIRMACIÓN ANTES DE GENERAR NUEVAS PREGUNTAS CON IA */}
      {confirmGenerateModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(20, 33, 61, 0.65)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 10000, padding: '1rem'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '14px', width: '100%', maxWidth: '480px',
            padding: '1.75rem', boxShadow: '0 20px 45px rgba(0,0,0,0.25)', position: 'relative',
            animation: 'fadeSlideUp 0.25s ease-out', border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
              <div style={{
                width: '42px', height: '42px', borderRadius: '10px',
                background: '#FEF3C7', color: '#B45309',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <AlertTriangle size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--navy)' }}>
                  ¿Generar nuevas preguntas con IA?
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Actualmente hay {questions.length} {questions.length === 1 ? 'pregunta creada' : 'preguntas creadas'} en esta actividad.
                </p>
              </div>
            </div>

            <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '1.5rem' }}>
              Al generar nuevas preguntas con IA, <strong>las preguntas actuales serán eliminadas de la base de datos y del editor</strong> para ser reemplazadas por las nuevas. ¿Estás seguro de que deseas continuar?
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => setConfirmGenerateModalOpen(false)}
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.84rem' }}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfirmGenerateModalOpen(false);
                  executeGenerateQuestions();
                }}
                className="btn btn-primary"
                style={{
                  background: 'var(--navy)', color: '#ffffff',
                  padding: '0.55rem 1.15rem', fontSize: '0.84rem', fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  boxShadow: '0 2px 8px rgba(20,33,61,0.2)'
                }}
              >
                <Sparkles size={14} color="var(--gold)" />
                <span>Sí, generar y reemplazar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Indicador flotante con animación durante publicación / despublicación */}
      {publishLoading && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 9999,
          background: publishLoading === 'publishing' ? '#14532d' : '#1e293b',
          color: '#ffffff',
          padding: '0.85rem 1.4rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px -5px rgba(0, 0, 0, 0.35), 0 5px 15px -3px rgba(0, 0, 0, 0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.85rem',
          fontSize: '0.9rem',
          fontWeight: 600,
          border: '1px solid rgba(255, 255, 255, 0.15)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <RefreshCw size={20} className="spin" style={{ color: '#4ade80' }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              {publishLoading === 'publishing' ? 'Publicando actividad...' : 'Despublicando actividad...'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '2px', fontWeight: 400 }}>
              {publishLoading === 'publishing' ? 'Guardando preguntas y habilitando para alumnos' : 'Regresando a estado borrador'}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
