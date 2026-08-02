import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash2, Edit2, CheckCircle2, AlertTriangle, PlayCircle, GripVertical, Save, FileText, Check } from 'lucide-react';

export default function AdminClassReinforcement({ classId }) {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState(null);
  const [questions, setQuestions] = useState([]);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Estados de edición local
  const [localActivity, setLocalActivity] = useState({
    title: 'Actividad de Reforzamiento',
    description: '',
    is_mandatory: false,
    max_attempts: 1
  });

  const [previewMode, setPreviewMode] = useState(false);
  const [previewQuestionIndex, setPreviewQuestionIndex] = useState(0);
  const [previewSelectedOptions, setPreviewSelectedOptions] = useState({});

  // ==========================================
  // ESTADOS TEMPORALES PARA PRUEBA DE IA
  // ==========================================
  const [testTranscript, setTestTranscript] = useState('');
  const [testQuestionCount, setTestQuestionCount] = useState(5);
  const [testGenerating, setTestGenerating] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [testError, setTestError] = useState('');

  const handleTestGenerate = async () => {
    if (testTranscript.trim().length < 200) {
      setTestError('La transcripción debe tener al menos 200 caracteres.');
      return;
    }

    if (questions.length > 0) {
      if (!window.confirm("El editor ya contiene preguntas. ¿Deseas reemplazarlas por las 5 preguntas que generará la IA?")) {
        return;
      }
    }
    
    setTestGenerating(true);
    setTestError('');
    setTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke(
        "generar-preguntas-reforzamiento",
        {
          body: {
            transcript: testTranscript.trim(),
            questionCount: 5,
            classTitle: localActivity.title,
            promptRules: `
- El enunciado no debe introducir escenarios, condiciones o términos que no aparezcan expresamente en la transcripción.
- Las opciones incorrectas deben ser plausibles y basarse en confusiones conceptuales razonables; evita opciones absurdas o evidentemente falsas.
- DEBES marcar exactamente una opción como correcta para cada pregunta (is_correct: true).
            `.trim()
          }
        }
      );
      
      if (error) throw error;
      
      setTestResult(data);

      // Carga automática de preguntas en el editor
      if (data?.draft?.questions) {
        const isOptionCorrect = (o, oIndex, q) => {
          if (o.is_correct === true || o.isCorrect === true || o.correct === true || o.is_right === true) return true;
          if (typeof q.correct_option_index === 'number' && q.correct_option_index === oIndex) return true;
          if (typeof q.correct_index === 'number' && q.correct_index === oIndex) return true;
          if (typeof q.correct_answer === 'number' && q.correct_answer === oIndex) return true;
          if (typeof q.correct_answer === 'string' && (q.correct_answer === o.text || q.correct_answer === String(oIndex))) return true;
          return false;
        };

        const newQuestions = data.draft.questions.map((q, qIndex) => {
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
            activity_id: activity?.id || 'temp-act',
            text: q.text || 'Sin enunciado',
            question_type: q.question_type || 'single_choice',
            order_num: qIndex,
            options: newOptions,
            correctOptionId: correctOptId
          };
        });

        setQuestions(newQuestions);
      }
    } catch (err) {
      console.error('Error invocando Edge Function:', err);
      setTestError(err.message || 'Error desconocido al invocar la función');
    } finally {
      setTestGenerating(false);
    }
  };

  useEffect(() => {
    if (classId) {
      loadActivityData();
    }
  }, [classId]);

  const loadActivityData = async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Obtener la actividad de la clase
      const { data: actData, error: actError } = await supabase
        .from('class_activities')
        .select('*')
        .eq('class_id', classId)
        .maybeSingle();

      if (actError) throw actError;

      if (actData) {
        setActivity(actData);
        setLocalActivity({
          title: actData.title,
          description: actData.description || '',
          is_mandatory: actData.is_mandatory,
          max_attempts: actData.max_attempts
        });

        // 2. Obtener preguntas, opciones y correctas
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
        const normalizedQuestions = (qData || []).map(q => {
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

        setQuestions(normalizedQuestions);
      } else {
        setActivity(null);
        setQuestions([]);
      }
    } catch (err) {
      console.error('Error cargando actividad:', err);
      setError('No se pudo cargar la actividad. Verifica que hayas ejecutado la migración SQL en Supabase.');
    } finally {
      setLoading(false);
    }
  };

  const createActivity = async () => {
    setSaving(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase
        .from('class_activities')
        .insert([{
          class_id: classId,
          title: localActivity.title,
          description: localActivity.description,
          is_mandatory: localActivity.is_mandatory,
          max_attempts: localActivity.max_attempts,
          is_published: false
        }])
        .select()
        .single();
      
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

    const normalizeQType = (t) => {
      if (!t) return 'single_choice';
      const str = String(t).toLowerCase();
      if (str.includes('true') || str.includes('false') || str.includes('falso') || str.includes('verdadero')) {
        return 'true_false';
      }
      return 'single_choice';
    };

    // 0. Eliminar de DB preguntas que ya no estén en currentQuestions
    const { data: existingQs } = await supabase
      .from('activity_questions')
      .select('id')
      .eq('activity_id', activityId);

    if (existingQs && existingQs.length > 0) {
      const currentRealIds = new Set(currentQuestions.filter(q => !String(q.id).startsWith('temp-')).map(q => q.id));
      const idsToDelete = existingQs.map(q => q.id).filter(id => !currentRealIds.has(id));
      if (idsToDelete.length > 0) {
        await supabase
          .from('activity_questions')
          .delete()
          .in('id', idsToDelete);
      }
    }

    const savedQuestions = [];

    for (let qIndex = 0; qIndex < currentQuestions.length; qIndex++) {
      const q = currentQuestions[qIndex];
      let realQId = q.id;
      const validQType = normalizeQType(q.question_type);

      // 1. Crear o actualizar la pregunta en DB
      if (String(q.id).startsWith('temp-')) {
        const { data: insertedQ, error: qErr } = await supabase
          .from('activity_questions')
          .insert([{
            activity_id: activityId,
            text: q.text || 'Sin enunciado',
            question_type: validQType,
            order_num: qIndex
          }])
          .select()
          .single();

        if (qErr) throw qErr;
        realQId = insertedQ.id;
      } else {
        await supabase
          .from('activity_questions')
          .update({
            text: q.text,
            question_type: validQType,
            order_num: qIndex
          })
          .eq('id', q.id);
      }

      // Eliminar de DB opciones huérfanas de esta pregunta
      if (!String(q.id).startsWith('temp-')) {
        const { data: existingOpts } = await supabase
          .from('question_options')
          .select('id')
          .eq('question_id', realQId);

        if (existingOpts && existingOpts.length > 0) {
          const currentOptRealIds = new Set((q.options || []).filter(o => !String(o.id).startsWith('temp-')).map(o => o.id));
          const optIdsToDelete = existingOpts.map(o => o.id).filter(id => !currentOptRealIds.has(id));
          if (optIdsToDelete.length > 0) {
            await supabase
              .from('question_options')
              .delete()
              .in('id', optIdsToDelete);
          }
        }
      }

      // 2. Crear o actualizar las opciones en DB
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

        if (q.correctOptionId === opt.id) {
          realCorrectOptId = realOptId;
        }

        savedOptions.push({
          ...opt,
          id: realOptId,
          question_id: realQId
        });
      }

      // 3. Guardar la respuesta correcta en DB
      if (realCorrectOptId) {
        await supabase
          .from('question_correct_answers')
          .upsert({
            question_id: realQId,
            correct_option_id: realCorrectOptId
          }, { onConflict: 'question_id' });
      }

      savedQuestions.push({
        ...q,
        id: realQId,
        activity_id: activityId,
        options: savedOptions,
        correctOptionId: realCorrectOptId
      });
    }

    return savedQuestions;
  };

  const saveActivityInfo = async () => {
    let currentAct = activity;
    setSaving(true);
    setError('');
    try {
      if (!currentAct) {
        // Crear la actividad si aún no existía en la base de datos
        const { data: newAct, error: insertError } = await supabase
          .from('class_activities')
          .insert([{
            class_id: classId,
            title: localActivity.title,
            description: localActivity.description,
            is_mandatory: localActivity.is_mandatory,
            max_attempts: localActivity.max_attempts,
            is_published: false
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        currentAct = newAct;
        setActivity(newAct);
      } else {
        const { error: updateError } = await supabase
          .from('class_activities')
          .update({
            title: localActivity.title,
            description: localActivity.description,
            is_mandatory: localActivity.is_mandatory,
            max_attempts: localActivity.max_attempts
          })
          .eq('id', currentAct.id);

        if (updateError) throw updateError;

        setActivity(prev => ({
          ...prev,
          title: localActivity.title,
          description: localActivity.description,
          is_mandatory: localActivity.is_mandatory,
          max_attempts: localActivity.max_attempts
        }));
      }

      // Guardar en la BD todas las preguntas y opciones (incluyendo las generadas por IA)
      const savedQs = await persistQuestionsToDatabase(currentAct.id, questions);
      setQuestions(savedQs);

      setSuccess('Actividad y preguntas guardadas correctamente en Supabase.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al guardar la actividad: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

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

  const deleteQuestion = async (id) => {
    if (!window.confirm('¿Eliminar pregunta? Se borrarán sus opciones y respuestas.')) return;
    if (!String(id).startsWith('temp-')) {
      try {
        await supabase.from('activity_questions').delete().eq('id', id);
      } catch (err) { console.error(err); }
    }
    setQuestions(questions.filter(q => q.id !== id));
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
    let currentAct = activity;
    if (!currentAct) {
      return setError('Debes guardar la actividad antes de publicarla.');
    }
    
    setSaving(true);
    setError('');
    try {
      // 1. Guardar primero en DB todas las preguntas y opciones pendientes
      const savedQs = await persistQuestionsToDatabase(currentAct.id, questions);
      setQuestions(savedQs);

      const willPublish = !currentAct.is_published;
      
      // 2. Validaciones antes de publicar
      if (willPublish) {
        if (savedQs.length === 0) {
          throw new Error('La actividad debe tener al menos una pregunta para ser publicada.');
        }
        for (const q of savedQs) {
          if (q.options.length < 2) {
            throw new Error(`La pregunta "${q.text}" debe tener al menos 2 opciones.`);
          }
          if (!q.correctOptionId) {
            throw new Error(`La pregunta "${q.text}" no tiene una opción correcta asignada.`);
          }
        }
      }

      const { error } = await supabase
        .from('class_activities')
        .update({ is_published: willPublish })
        .eq('id', currentAct.id);
        
      if (error) throw error;
      
      setActivity(prev => ({ ...prev, is_published: willPublish }));
      setSuccess(willPublish ? 'Actividad publicada exitosamente.' : 'Actividad regresada a borrador.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al cambiar el estado de publicación: ' + err.message);
    } finally {
      setSaving(false);
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
              background: activity.is_published ? '#dcfce7' : '#f1f5f9',
              color: activity.is_published ? '#166534' : '#475569',
              fontWeight: 600
            }}>
              {activity.is_published ? 'PUBLICADA' : 'BORRADOR'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => { setPreviewQuestionIndex(0); setPreviewMode(true); }} className="btn btn-secondary">
              <PlayCircle size={16} style={{ marginRight: '0.4rem' }}/> Vista Previa
            </button>
            <button 
              onClick={togglePublish} 
              disabled={saving}
              className={`btn ${activity.is_published ? 'btn-secondary' : 'btn-primary'}`}
              style={activity.is_published ? { borderColor: 'var(--border-color)', color: '#dc2626' } : {}}
            >
              {activity.is_published ? 'Despublicar' : 'Publicar Actividad'}
            </button>
          </div>
        </div>

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={localActivity.is_mandatory} 
                onChange={e => setLocalActivity({...localActivity, is_mandatory: e.target.checked})}
                style={{ width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Es Obligatoria para avanzar</span>
            </label>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.4rem', fontSize: '0.85rem', fontWeight: 600 }}>Intentos permitidos</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input 
                type="number" 
                min="0"
                value={localActivity.max_attempts} 
                onChange={e => setLocalActivity({...localActivity, max_attempts: parseInt(e.target.value) || 0})}
                style={{ width: '100px', padding: '0.5rem', border: '1px solid var(--border-color)', borderRadius: '6px' }} 
              />
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(0 = Ilimitados)</span>
            </div>
          </div>
          
          <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
            <button onClick={saveActivityInfo} disabled={saving} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Save size={16} /> Guardar Cambios
            </button>
          </div>
        </div>
      </div>

      {/* 2. PREGUNTAS Y OPCIONES */}
      <div className="card" style={{ padding: '1.5rem', background: 'white', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)' }}>Constructor de Preguntas ({questions.length})</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => addQuestion('single_choice')} className="btn btn-primary" style={{ fontSize: '0.8rem', padding: '0.5rem 0.8rem' }}>
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
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ==========================================
          SECCIÓN TEMPORAL: Prueba de generación con IA
          ========================================== */}
      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
        <h3 style={{ fontSize: '1.1rem', color: '#0f172a', marginBottom: '1rem', fontWeight: 'bold' }}>
          Prueba de generación con IA
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.4rem', fontWeight: 500, color: '#334155' }}>
              Transcripción de la clase (Mín. 200 caracteres)
            </label>
            <textarea 
              value={testTranscript}
              onChange={(e) => setTestTranscript(e.target.value)}
              placeholder="Pega la transcripción aquí..."
              style={{ width: '100%', minHeight: '120px', padding: '0.75rem', border: '1px solid #cbd5e1', borderRadius: '4px', resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.75rem', color: testTranscript.trim().length >= 200 ? '#16a34a' : '#64748b', marginTop: '0.2rem' }}>
              {testTranscript.trim().length} caracteres
            </div>
          </div>
          

          <button 
            onClick={handleTestGenerate}
            disabled={testGenerating || testTranscript.trim().length < 200}
            className="btn btn-primary"
            style={{ alignSelf: 'flex-start', padding: '0.6rem 1.2rem' }}
          >
            {testGenerating ? 'Generando...' : 'Generar borrador con IA'}
          </button>
          
          {testError && (
            <div style={{ padding: '0.75rem', background: '#fef2f2', color: '#b91c1c', border: '1px solid #f87171', borderRadius: '4px', fontSize: '0.9rem' }}>
              {testError}
            </div>
          )}
          
          {testResult?.draft?.questions && (
            <div style={{ color: '#16a34a', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem' }}>
              ✓ {testResult.draft.questions.length} preguntas generadas y cargadas automáticamente en el editor.
            </div>
          )}
        </div>
      </div>
      {/* FIN SECCIÓN TEMPORAL */}

    </div>
  );
}
