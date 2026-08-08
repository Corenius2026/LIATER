import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { createDoubt, fetchStudentDoubtsForClass } from '../services/doubtService';
import { calculateProgramProgressDetails } from '../services/programService';
import {
  Download, FileText, Video, Calendar, User, ExternalLink,
  Paperclip, Presentation, ArrowLeft, ArrowRight, Clock, Award, HelpCircle,
  Send, CheckCircle2, BookOpen, X, Info, AlertCircle, FileCheck,
  MessageSquare, Check, Lock, RotateCcw, Zap, Radio
} from 'lucide-react';

function formatEmbedVideoUrl(url) {
  if (!url) return null;
  let trimmed = url.trim();

  // YouTube Shorts
  if (trimmed.includes('youtube.com/shorts/')) {
    const videoId = trimmed.split('youtube.com/shorts/')[1]?.split('?')[0]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  // YouTube watch / youtu.be
  if (trimmed.includes('youtube.com/watch')) {
    try {
      const urlObj = new URL(trimmed);
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {
      const match = trimmed.match(/[?&]v=([^&]+)/);
      if (match) return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  if (trimmed.includes('youtu.be/')) {
    const videoId = trimmed.split('youtu.be/')[1]?.split('?')[0]?.split('&')[0];
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
  }

  // Google Drive
  if (trimmed.includes('drive.google.com') && (trimmed.includes('/view') || trimmed.includes('/edit'))) {
    return trimmed.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview');
  }

  // Vimeo
  if (trimmed.includes('vimeo.com/') && !trimmed.includes('player.vimeo.com')) {
    const videoId = trimmed.split('vimeo.com/')[1]?.split('?')[0]?.split('#')[0];
    if (videoId) return `https://player.vimeo.com/video/${videoId}`;
  }

  // Loom
  if (trimmed.includes('loom.com/share/')) {
    const videoId = trimmed.split('loom.com/share/')[1]?.split('?')[0];
    if (videoId) return `https://www.loom.com/embed/${videoId}`;
  }

  return trimmed;
}

function PrivateVideoPlayer({ videoUrl, title, studentName }) {
  const iframeRef = useRef(null);
  const realEmbedUrl = formatEmbedVideoUrl(videoUrl);
  const isGoogleDrive = realEmbedUrl.includes('drive.google.com');
  const isYouTube = realEmbedUrl.includes('youtube.com') || realEmbedUrl.includes('youtu.be');

  useEffect(() => {
    if (!iframeRef.current || !videoUrl) return;

    if (isGoogleDrive || isYouTube) {
      // Google Drive y YouTube bloquean iframes dentro de URLs blob: por políticas de cookies u origen.
      // Así que lo montamos directamente en el iframe.
      iframeRef.current.src = realEmbedUrl;
      return;
    }

    const obfuscatedUrl = btoa(encodeURIComponent(realEmbedUrl || ''));
    
    // Documento en memoria que descifra la URL vía JS dinámico sin escribir jamás "src=https://..." en el código HTML
    const blobHtml = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; overflow: hidden; background: #000; user-select: none; }
            iframe { width: 100%; height: 100%; border: none; }
            .popout-mask {
              position: absolute;
              top: 0;
              right: 0;
              width: 100px;
              height: 75px;
              z-index: 999999;
              background: transparent;
              cursor: default;
            }
          </style>
        </head>
        <body>
          <iframe 
            id="streamPlayer" 
            title="${title ? title.replace(/"/g, '&quot;') : 'Reproductor Protegido'}"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
            allowfullscreen
          ></iframe>
          <div class="popout-mask" onclick="event.preventDefault(); event.stopPropagation();"></div>

          <script>
            (function() {
              // Desactivar menú contextual en el marco del reproductor
              document.addEventListener('contextmenu', function(e) { e.preventDefault(); return false; });

              // Carga dinámica en memoria del video
              var obfuscated = "${obfuscatedUrl}";
              try {
                var streamUrl = decodeURIComponent(atob(obfuscated));
                var player = document.getElementById("streamPlayer");
                if (player) {
                  try {
                    player.contentWindow.location.replace(streamUrl);
                  } catch(err) {
                    player.src = streamUrl;
                  }
                }
              } catch(err) {
                console.error("Stream init error");
              }
            })();
          </script>
        </body>
      </html>
    `;

    const blob = new Blob([blobHtml], { type: 'text/html' });
    const blobUrl = URL.createObjectURL(blob);
    iframeRef.current.src = blobUrl;

    return () => {
      URL.revokeObjectURL(blobUrl);
    };
  }, [videoUrl, title, realEmbedUrl, isGoogleDrive]);

  return (
    <div 
      onContextMenu={(e) => e.preventDefault()}
      style={{ 
        position: 'relative', 
        paddingBottom: '56.25%', 
        height: 0, 
        overflow: 'hidden', 
        borderRadius: 'var(--radius-lg)', 
        background: '#000',
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      <iframe
        ref={iframeRef}
        title={title}
        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />

      {/* MARCA DE AGUA DINÁMICA ANTI-PIRATERÍA CON EL NOMBRE/USUARIO DEL ALUMNO */}
      {studentName && (
        <div style={{
          position: 'absolute', bottom: '14px', left: '16px', zIndex: 25,
          pointerEvents: 'none', userSelect: 'none',
          background: 'rgba(0, 0, 0, 0.55)', color: 'rgba(255, 255, 255, 0.75)',
          padding: '4px 10px', borderRadius: '12px', fontSize: '0.74rem',
          fontWeight: 600, backdropFilter: 'blur(4px)', letterSpacing: '0.02em'
        }}>
          🔒 LIATER • {studentName}
        </div>
      )}

      {/* MÁSCARA EXTERNA DE SEGURIDAD CONTRA BOTÓN POP-OUT */}
      <div 
        style={{ 
          position: 'absolute', 
          top: 0, 
          right: 0, 
          width: '90px', 
          height: '70px', 
          zIndex: 30, 
          background: 'transparent',
          cursor: 'default'
        }} 
        onContextMenu={(e) => e.preventDefault()}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      />
    </div>
  );
}

export default function ClassDetail() {
  const params = useParams();
  const rawId = params['*'] || params.id || '';
  // Limpiar cualquier barra o traducción automática (/c/ -> 7c) en la URL
  const id = rawId.replace(/^\//, '').replace(/\/c\//g, '7c').replace(/\//g, '').trim();
  const { currentUser } = useAuth();
  
  const [clsData, setClsData] = useState(null);
  const [topic, setTopic] = useState('');
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleId, setModuleId] = useState(null);
  const [resources, setResources] = useState([]);
  const [programType, setProgramType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [programProgressDetails, setProgramProgressDetails] = useState(null);

  const [activityConfig, setActivityConfig] = useState(null);
  const [activityState, setActivityState] = useState('no_configurada'); // 'no_configurada' | 'bloqueada' | 'no_iniciada' | 'en_progreso' | 'completada' | 'vencida'

  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [showConfirmFinishModal, setShowConfirmFinishModal] = useState(false);
  const [completedResult, setCompletedResult] = useState(null);
  const [viewingResultsMode, setViewingResultsMode] = useState(false);

  const handleOptionSelect = (questionId, optionId) => {
    setUserAnswers(prev => {
      const updated = {
        ...prev,
        [questionId]: optionId
      };
      if (activityConfig?.id && currentUser?.id) {
        try {
          localStorage.setItem(`liater_answers_${activityConfig.id}_${currentUser.id}`, JSON.stringify(updated));
        } catch (_) {}
      }
      return updated;
    });
    if (activityState === 'no_iniciada') {
      setActivityState('en_progreso');
    }
  };

  const handleStartActivity = () => {
    if (activityState === 'completada') {
      setViewingResultsMode(true);
      setIsActivityModalOpen(true);
      return;
    }
    setViewingResultsMode(false);
    setShowConfirmFinishModal(false);
    setIsActivityModalOpen(true);
  };

  const handleOpenResults = () => {
    setViewingResultsMode(true);
    setIsActivityModalOpen(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIdx < activityConfig.questions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
    }
  };

  const handlePrevQuestion = () => {
    if (currentQuestionIdx > 0) {
      setCurrentQuestionIdx(prev => prev - 1);
    }
  };

  const handleFinishAttempt = async () => {
    if (!activityConfig || !activityConfig.questions) return;

    let correctCount = 0;
    activityConfig.questions.forEach(q => {
      if (userAnswers[q.id] && q.correctOptionId && String(userAnswers[q.id]) === String(q.correctOptionId)) {
        correctCount++;
      }
    });

    const totalCount = activityConfig.questions.length;
    const scorePct = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;

    const now = new Date();
    const formattedDate = now.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const result = {
      correctCount,
      totalCount,
      scorePct,
      completedAt: formattedDate
    };

    setCompletedResult(result);
    setActivityState('completada');
    setShowConfirmFinishModal(false);
    setViewingResultsMode(true);

    // Guardar intento en Supabase sin bloquear la UI
    if (currentUser?.id && activityConfig.id) {
      try {
        const studentIdToUse = currentUser.id;
        const { data: insertedAttempt, error: insertErr } = await supabase
          .from('activity_attempts')
          .insert([{
            activity_id: activityConfig.id,
            student_id: studentIdToUse,
            status: 'completed',
            score: scorePct,
            completed_at: new Date().toISOString()
          }])
          .select('id')
          .maybeSingle();

        if (insertErr) console.error('Error guardando intento:', insertErr);

        if (insertedAttempt?.id && Object.keys(userAnswers).length > 0) {
          try {
            const attemptAnswersToInsert = Object.entries(userAnswers).map(([qId, optId]) => {
              const q = activityConfig.questions.find(item => item.id === qId);
              const isCorr = q && q.correctOptionId && String(q.correctOptionId) === String(optId);
              return {
                attempt_id: insertedAttempt.id,
                question_id: qId,
                selected_option_id: optId,
                is_correct: !!isCorr
              };
            });
            const { error: ansInsertErr } = await supabase.from('attempt_answers').insert(attemptAnswersToInsert);
            if (ansInsertErr) console.error('Error guardando respuestas del intento:', ansInsertErr);
          } catch (ansErr) {
            console.error('Error procesando attempt_answers:', ansErr);
          }
        }
        // Guardar intento en localStorage de respaldo inmediato
        try {
          const key = `completed_activities_${studentIdToUse}`;
          const currentList = JSON.parse(localStorage.getItem(key) || '[]');
          if (activityConfig.id && !currentList.includes(activityConfig.id)) {
            currentList.push(activityConfig.id);
          }
          localStorage.setItem(key, JSON.stringify(currentList));
        } catch (_) {}
      } catch (err) {
        console.error('Error guardando intento:', err);
      }
    }

    // Actualización visual del progreso
    if (programProgressDetails) {
      setProgramProgressDetails(prev => {
        if (!prev) return prev;
        const classWeight = prev.totalClasses > 0 ? (100 / prev.totalClasses) : 0;
        const additionalPercentage = classWeight * 0.2;
        const newCompletedValue = (prev.completedClassesValue || 0) + 0.2;
        const newPct = Math.round((prev.percentage || 0) + additionalPercentage);
        return {
          ...prev,
          completedClassesValue: newCompletedValue,
          percentage: Math.min(100, newPct)
        };
      });
    }
  };

  // ESTADOS DEL MODAL DE DUDAS Y PERSISTENCIA
  const [isDoubtModalOpen, setIsDoubtModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [touched, setTouched] = useState({ subject: false, description: false });
  const [submitError, setSubmitError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userDoubts, setUserDoubts] = useState([]);

  const doubtButtonRef = useRef(null);
  const firstInputRef = useRef(null);

  useEffect(() => {
    async function fetchClassDetail() {
      if (!id) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);

        // BLOQUE 1: Peticiones principales independientes en paralelo
        let actQuery = supabase
          .from('class_activities')
          .select(`
            *,
            activity_questions (
              *,
              question_options (*),
              question_correct_answers (correct_option_id)
            )
          `)
          .eq('class_id', id);

        const userRole = currentUser?.role;
        if (userRole !== 'admin' && userRole !== 'teacher') {
          actQuery = actQuery.eq('is_published', true);
        }

        const [
          classRes,
          resRes,
          doubtsRes,
          actRes
        ] = await Promise.all([
          // 1. Detalles de la clase
          supabase.from('class_sessions').select('*, teacher_profiles(*)').eq('id', id).maybeSingle(),
          // 2. Recursos
          supabase.from('resources').select('*').eq('class_id', id).order('created_at', { ascending: true }),
          // 3. Dudas
          currentUser?.id ? fetchStudentDoubtsForClass(id, currentUser.id) : Promise.resolve({ doubts: [] }),
          // 4. Actividades
          actQuery.order('created_at', { ascending: false })
        ]);

        const classData = classRes.data;
        if (classRes.error) console.error('Error fetching class session:', classRes.error);
        setClsData(classData);

        setResources(resRes.data || []);
        setUserDoubts(doubtsRes.doubts || []);

        const actData = (actRes.data && actRes.data.length > 0) ? actRes.data[0] : null;

        // BLOQUE 2: Dependencias secundarias basadas en la clase y en la actividad (en paralelo)
        const secondaryPromises = [];

        // 2a. Si hay clase, pedir la sesión/programa
        if (classData) {
          const parentSessionId = classData.session_id || classData.subtopic_id;
          
          if (parentSessionId) {
            secondaryPromises.push(
              (async () => {
                let sessionData = null;
                const { data: sData } = await supabase.from('sessions').select('module_id, modules(title)').eq('id', parentSessionId).maybeSingle();
                if (sData) {
                  sessionData = sData;
                } else {
                  const { data: subData } = await supabase.from('subtopics').select('module_id, modules(title)').eq('id', parentSessionId).maybeSingle();
                  sessionData = subData;
                }
                if (sessionData) {
                  setModuleId(sessionData.module_id);
                  if (sessionData.modules?.title) {
                    setModuleTitle(sessionData.modules.title);
                    setTopic(sessionData.modules.title);
                  }
                }
              })()
            );
          }

          if (classData.program_id) {
            secondaryPromises.push(
              (async () => {
                const { data: progData } = await supabase.from('diploma_programs').select('program_type').eq('id', classData.program_id).maybeSingle();
                localStorage.setItem('activeProgramId', classData.program_id);
                if (progData?.program_type) {
                  setProgramType(progData.program_type);
                  localStorage.setItem('activeProgramType', progData.program_type);
                }
                window.dispatchEvent(new Event('programContextChanged'));
              })()
            );

            if (currentUser?.id) {
              secondaryPromises.push(
                (async () => {
                  const progDetails = await calculateProgramProgressDetails(classData.program_id, currentUser.id);
                  setProgramProgressDetails(progDetails);
                })()
              );
            }
          }
        }

        // 2b. Si hay actividad, pedir sus detalles (preguntas, respuestas, borradores, intentos)
        if (actData) {
          secondaryPromises.push(
            (async () => {
              let questions = actData.activity_questions || [];
              if (questions.length === 0) {
                const { data: fetchedQ } = await supabase.from('activity_questions').select('*, question_options(*)').eq('activity_id', actData.id).order('order_num', { ascending: true });
                if (fetchedQ) questions = fetchedQ;
              }

              if (questions.length > 0) {
                const qIds = questions.map(q => q.id);
                
                // Ejecutar sub-dependencias de la actividad en paralelo
                const studentIdToUse = currentUser?.id;
                const filterClause = currentUser?.auth_user_id 
                  ? `student_id.eq.${studentIdToUse},student_id.eq.${currentUser.auth_user_id}`
                  : `student_id.eq.${studentIdToUse}`;

                let nextClassQuery = Promise.resolve({ data: null });
                if (!actData.due_date && classData?.program_id) {
                  let q = supabase.from('class_sessions').select('class_date').eq('program_id', classData.program_id).gt('class_date', classData?.class_date || new Date().toISOString()).order('class_date', { ascending: true }).limit(1);
                  if (classData.teacher_id) q = q.eq('teacher_id', classData.teacher_id);
                  nextClassQuery = q.maybeSingle();
                }

                const [correctRes, draftRes, attemptsRes, nextClassRes] = await Promise.all([
                  supabase.from('question_correct_answers').select('*').in('question_id', qIds),
                  supabase.from('activity_drafts').select('draft_data').eq('class_id', id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
                  studentIdToUse 
                    ? supabase.from('activity_attempts').select('*').eq('activity_id', actData.id).or(filterClause).order('completed_at', { ascending: false })
                    : Promise.resolve({ data: [] }),
                  nextClassQuery
                ]);

                const correctMap = {};
                if (correctRes.data) {
                  correctRes.data.forEach(ca => correctMap[ca.question_id] = ca.correct_option_id);
                }

                let draftQuestionsMap = {};
                if (draftRes.data?.draft_data?.questions) {
                  draftRes.data.draft_data.questions.forEach(dq => {
                    if (dq.text) draftQuestionsMap[dq.text.trim().toLowerCase()] = dq;
                  });
                }

                const formattedQuestions = questions
                  .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                  .map(q => {
                    const dq = draftQuestionsMap[q.text?.trim().toLowerCase()];
                    const correctOptFromJoin = Array.isArray(q.question_correct_answers)
                      ? q.question_correct_answers[0]?.correct_option_id
                      : q.question_correct_answers?.correct_option_id;

                    return {
                      id: q.id,
                      type: q.question_type,
                      statement: q.text,
                      explanation: q.explanation || dq?.explanation || null,
                      sourceBasis: q.source_basis || dq?.source_basis || null,
                      options: (q.question_options || [])
                        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0))
                        .map(o => ({ id: o.id, text: o.text })),
                      correctOptionId: correctOptFromJoin || correctMap[q.id] || null
                    };
                  });

                setActivityConfig({
                  id: actData.id,
                  title: actData.title,
                  description: actData.description,
                  estimatedTimeMinutes: 10,
                  maxAttempts: actData.max_attempts ?? 1,
                  isMandatory: actData.is_mandatory,
                  questions: formattedQuestions
                });

                if (studentIdToUse && actData.id) {
                  let initialAnswers = {};
                  const savedAnswers = localStorage.getItem(`liater_answers_${actData.id}_${studentIdToUse}`);
                  if (savedAnswers) {
                    try { initialAnswers = JSON.parse(savedAnswers); } catch (_) {}
                  }

                  let stateToSet = 'no_iniciada';
                  const attempts = attemptsRes.data;
                  const localCompleted = JSON.parse(localStorage.getItem(`completed_activities_${studentIdToUse}`) || '[]');
                  const isLocallyCompleted = actData.id ? localCompleted.includes(actData.id) : false;
                  const hasDbCompletedAttempt = attempts && attempts.length > 0 && attempts[0].status === 'completed';

                  if (hasDbCompletedAttempt || isLocallyCompleted) {
                    const lastAttempt = (attempts && attempts.length > 0) ? attempts[0] : null;
                    stateToSet = 'completada';

                    if (lastAttempt?.id) {
                      try {
                        const { data: dbAns } = await supabase
                          .from('attempt_answers')
                          .select('question_id, selected_option_id')
                          .eq('attempt_id', lastAttempt.id);

                        if (dbAns && dbAns.length > 0) {
                          dbAns.forEach(a => {
                            initialAnswers[a.question_id] = a.selected_option_id;
                          });
                        }
                      } catch (errAns) {
                        console.error('Error cargando respuestas de la BD:', errAns);
                      }
                    }

                    setUserAnswers(initialAnswers);

                    let realCorrectCount = 0;
                    formattedQuestions.forEach(q => {
                      if (initialAnswers[q.id] && q.correctOptionId && String(initialAnswers[q.id]) === String(q.correctOptionId)) {
                        realCorrectCount++;
                      }
                    });

                    const finalScore = lastAttempt?.score ?? (formattedQuestions.length > 0 ? Math.round((realCorrectCount / formattedQuestions.length) * 100) : 0);

                    setCompletedResult({
                      correctCount: realCorrectCount,
                      totalCount: formattedQuestions.length,
                      scorePct: finalScore,
                      completedAt: lastAttempt?.completed_at ? new Date(lastAttempt.completed_at).toLocaleDateString('es-ES') : 'Realizada'
                    });
                  } else {
                    setUserAnswers(initialAnswers);
                    if (attempts && attempts.length > 0 && attempts[0].status === 'in_progress') {
                      stateToSet = 'en_progreso';
                    } else {
                      stateToSet = 'no_iniciada';
                    }
                  }

                  // Verificar si la actividad está vencida
                  if (stateToSet !== 'completada') {
                    let dueDate = actData.due_date ? new Date(actData.due_date) : null;
                    if (!dueDate && nextClassRes.data?.class_date) {
                      dueDate = new Date(new Date(nextClassRes.data.class_date).getTime() - 5 * 60000);
                    } else if (!dueDate && classData?.class_date) {
                      dueDate = new Date(new Date(classData.class_date).getTime() + 7 * 24 * 60 * 60000);
                    }
                    if (dueDate && dueDate < new Date()) {
                      stateToSet = 'vencida';
                    }
                  }

                  setActivityState(stateToSet);
                }
              } else {
                // La actividad existe en DB (is_published) pero aún no tiene preguntas configuradas
                setActivityConfig({
                  id: actData.id,
                  title: actData.title,
                  description: actData.description,
                  estimatedTimeMinutes: 10,
                  maxAttempts: actData.max_attempts || 1,
                  isMandatory: actData.is_mandatory,
                  questions: []
                });
                setActivityState('bloqueada');
              }
            })()
          );
        } else {
          setActivityConfig(null);
          setActivityState('no_configurada');
        }

        // Ejecutar bloque secundario (todas las peticiones dependientes, en paralelo entre sí)
        await Promise.all(secondaryPromises);

      } catch (err) {
        console.error('Error fetching class detail:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchClassDetail();
  }, [id, currentUser?.id]);

  // MANEJO DE ACCESIBILIDAD Y ESCAPE EN EL MODAL DE DUDAS
  const openDoubtModal = () => {
    setIsDoubtModalOpen(true);
    setSubmitError('');
    setSuccessMsg('');
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 100);
  };

  const closeDoubtModal = () => {
    setIsDoubtModalOpen(false);
    setSubmitError('');
    setSuccessMsg('');
    doubtButtonRef.current?.focus();
  };

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isDoubtModalOpen) {
        closeDoubtModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDoubtModalOpen]);

  // VALIDACIÓN DEL FORMULARIO
  const subjectError = touched.subject && !subject.trim()
    ? 'El asunto de la duda es obligatorio.'
    : subject.length > 120
    ? 'El asunto no debe exceder los 120 caracteres.'
    : '';

  const descriptionError = touched.description && !description.trim()
    ? 'La descripción de la duda es obligatoria.'
    : description.length > 1500
    ? 'La descripción no debe exceder los 1500 caracteres.'
    : '';

  const isFormValid = subject.trim().length > 0 &&
                      subject.length <= 120 &&
                      description.trim().length > 0 &&
                      description.length <= 1500;

  // ENVÍO DE LA DUDA A SUPABASE CON MANEJO DE ESTADOS
  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    setTouched({ subject: true, description: true });

    if (!isFormValid || submitting) return;

    if (!currentUser?.id) {
      setSubmitError('Debes iniciar sesión para enviar una duda.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');
    setSuccessMsg('');

    const { data, error } = await createDoubt({
      class_id: id,
      module_id: moduleId,
      program_id: clsData?.program_id,
      student_id: currentUser.id,
      teacher_id: clsData?.teacher_id,
      subject,
      description,
      topic
    });

    if (error) {
      console.error('Supabase Error on createDoubt:', error);
      const errorMsg = error?.message || error?.details || JSON.stringify(error) || 'Ocurrió un error desconocido.';
      setSubmitError(`Error en Supabase: ${errorMsg}`);
      setSubmitting(false);
      return;
    }

    // ÉXITO EN INSERCIÓN: Mensaje requerido, limpiar campos y recargar dudas
    setSuccessMsg('Tu duda fue enviada. El docente podrá revisarla para atenderla durante la clase.');
    setSubject('');
    setDescription('');
    setTouched({ subject: false, description: false });
    setSubmitting(false);

    // Actualizar lista de dudas enviadas en la vista
    const { doubts } = await fetchStudentDoubtsForClass(id, currentUser.id);
    setUserDoubts(doubts || []);

    // Cerrar modal automáticamente después de 2 segundos
    setTimeout(() => {
      setIsDoubtModalOpen(false);
      setSuccessMsg('');
    }, 2000);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%', padding: '1rem 0' }}>
        {/* Esqueleto del Encabezado */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)', marginBottom: '1.5rem' }}>
          <div style={{ width: '100%' }}>
            <div className="skeleton" style={{ width: '120px', height: '20px', marginBottom: '12px' }}></div>
            <div className="skeleton" style={{ width: 'max(300px, 40%)', height: '36px', marginBottom: '16px' }}></div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
              <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
            </div>
          </div>
        </div>

        {/* Esqueleto del Cuerpo (Grid) */}
        <div style={{ display: 'grid', gap: '1.5rem', gridTemplateColumns: '1fr' }} className="skeleton-grid">
          <style>{`@media(min-width: 1024px) { .skeleton-grid { grid-template-columns: 2fr 1fr !important; } }`}</style>
          
          {/* Columna Izquierda (Video) */}
          <div>
            <div className="skeleton" style={{ width: '100%', aspectRatio: '16/9', borderRadius: 'var(--radius-lg)' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '80px', marginTop: '1.5rem', borderRadius: 'var(--radius-md)' }}></div>
          </div>
          
          {/* Columna Derecha (Tarjetas laterales) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div className="skeleton" style={{ width: '100%', height: '240px', borderRadius: 'var(--radius-lg)' }}></div>
            <div className="skeleton" style={{ width: '100%', height: '180px', borderRadius: 'var(--radius-lg)' }}></div>
          </div>
        </div>
      </div>
    );
  }

  if (!clsData) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)', animation: 'fadeSlideUp 0.35s ease-out' }}>
        <h2>Clase no encontrada</h2>
        <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>La sesión solicitada no existe o fue cancelada.</p>
        <Link to="/portal" className="btn btn-primary">
          <ArrowLeft size={16} /> Volver al Portal
        </Link>
      </div>
    );
  }

  const getResourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText size={18} color="#dc2626" />;
      case 'presentation': return <Presentation size={18} color="var(--navy)" />;
      case 'link': return <ExternalLink size={18} color="var(--green-600)" />;
      default: return <Paperclip size={18} color="#ca8a04" />;
    }
  };

  return (
    <div className="class-detail-container">
      <style>{`
        .class-detail-container {
          animation: fadeSlideUp 0.35s ease-out;
        }
        .class-detail-grid {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 1.5rem;
          align-items: start;
        }
        .class-detail-main {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .class-detail-sidebar {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .card-placeholder {
          background: #ffffff;
          border: 1px solid var(--border-color, #e2e8f0);
          border-radius: var(--radius-lg, 12px);
          padding: 1.25rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .doubt-input:focus, .doubt-textarea:focus {
          outline: none;
          border-color: var(--gold-dark, #ca8a04) !important;
          box-shadow: 0 0 0 3px rgba(202, 138, 4, 0.15) !important;
        }

        @media (max-width: 991px) {
          .class-detail-grid {
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
          }
          .class-detail-main, .class-detail-sidebar {
            display: contents;
          }
          .order-grabacion { order: 1; }
          .order-actividad { order: 2; }
          .order-recursos { order: 3; }
          .order-dudas { order: 4; }
        }
      `}</style>

      {/* 1. ENCABEZADO DE LA CLASE */}
      <div style={{ marginBottom: '1.25rem' }}>
        <Link to={programType === 'course' ? (clsData?.program_id ? `/dashboard/${clsData.program_id}` : '/portal') : (moduleId ? `/module/${moduleId}` : '/portal')} className="btn btn-outline" style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
          <ArrowLeft size={14} /> {programType === 'course' ? 'Volver al inicio del curso' : (moduleId ? 'Volver al Módulo' : 'Volver al Portal')}
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: '1.75rem' }}>
        <h1 className="page-title" style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--navy)', margin: '0 0 0.6rem 0', lineHeight: 1.25 }}>
          {clsData.title}
        </h1>

        {/* METADATOS LIMPIOS (SIN TARJETA PESADA) */}
        <div style={{ display: 'flex', gap: '1.25rem', fontSize: '0.84rem', color: 'var(--text-muted)', flexWrap: 'wrap', alignItems: 'center' }}>
          {clsData.class_date && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Calendar size={15} color="var(--gold-dark)" />
              {new Date(clsData.class_date).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {clsData.teacher_profiles?.name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={15} color="var(--gold-dark)" />
              Docente: <strong style={{ color: 'var(--navy)' }}>{clsData.teacher_profiles.name}</strong>
            </span>
          )}
          {programType !== 'course' && moduleTitle && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <BookOpen size={15} color="var(--gold-dark)" />
              Módulo: <strong style={{ color: 'var(--navy)' }}>{moduleTitle}</strong>
            </span>
          )}
          {clsData.duration && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Clock size={15} color="var(--gold-dark)" />
              {clsData.duration} min
            </span>
          )}
          {(clsData.status || clsData.video_url) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
              background: clsData.status === 'completed' || clsData.video_url ? '#f0fdf4' : '#f1f5f9',
              color: clsData.status === 'completed' || clsData.video_url ? '#166534' : '#475569'
            }}>
              {clsData.status === 'completed' || clsData.video_url ? 'Finalizada' : 'Programada'}
            </span>
          )}
          {/* BADGE ESTADO DE ACTIVIDAD */}
          {activityState === 'completada' && completedResult && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
              background: completedResult.scorePct >= 70 ? '#f0fdf4' : completedResult.scorePct >= 50 ? '#fffbeb' : '#fef2f2',
              color: completedResult.scorePct >= 70 ? '#166534' : completedResult.scorePct >= 50 ? '#92400e' : '#991b1b',
              border: `1px solid ${completedResult.scorePct >= 70 ? '#86efac' : completedResult.scorePct >= 50 ? '#fcd34d' : '#fca5a5'}`
            }}>
              <Award size={13} /> Actividad: {completedResult.scorePct}%
            </span>
          )}
          {activityState === 'no_iniciada' && activityConfig && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              padding: '0.2rem 0.65rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700,
              background: '#eef2ff', color: '#6366f1', border: '1px solid #c7d2fe'
            }}>
              <Zap size={13} /> Actividad pendiente
            </span>
          )}
        </div>
      </div>

      {/* 2. CUADRÍCULA PRINCIPAL (DESKTOP: 2 COLUMNAS / MOBILE: 1 COLUMNA ORDENADA) */}
      <div className="class-detail-grid">
        
        {/* COLUMNA PRINCIPAL (68% - 72%) */}
        <div className="class-detail-main">

          {/* BANNER CLASE EN VIVO (HOY) */}
          {(() => {
            if (!clsData?.class_date || clsData?.video_url) return null;
            const classDate = new Date(clsData.class_date);
            const now = new Date();
            const todayStart = new Date(); todayStart.setHours(0,0,0,0);
            const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
            const isClassToday = classDate >= todayStart && classDate <= todayEnd;
            const meetLink = clsData?.meet_url || null;
            if (!isClassToday || !meetLink) return null;
            return (
              <div style={{
                background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                borderRadius: 'var(--radius-lg)', padding: '1.1rem 1.4rem',
                marginBottom: '0.5rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                flexWrap: 'wrap', gap: '0.75rem',
                boxShadow: '0 4px 20px rgba(220,38,38,0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '9px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Radio size={18} color="#ffffff" />
                  </div>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.1rem 0' }}>Clase en vivo · HOY</p>
                    <p style={{ color: '#ffffff', fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>
                      {classDate.toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' })} hs — La grabación estará disponible después
                    </p>
                  </div>
                </div>
                <a href={meetLink} target="_blank" rel="noreferrer" style={{
                  background: '#ffffff', color: '#dc2626',
                  padding: '0.5rem 1.1rem', borderRadius: '7px',
                  fontWeight: 800, fontSize: '0.85rem', textDecoration: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)', flexShrink: 0
                }}>
                  <Video size={14} /> Entrar a la Clase
                </a>
              </div>
            );
          })()}

          <div className="card-placeholder order-grabacion">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Video size={18} color="var(--gold-dark)" /> Grabación / Transmisión de la Clase
            </h3>

            {clsData.video_url ? (
              <PrivateVideoPlayer videoUrl={clsData.video_url} title={clsData.title} studentName={currentUser?.full_name || currentUser?.email} />
            ) : (
              <div style={{ textAlign: 'center', padding: '1.75rem 1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <Video size={32} color="var(--text-muted)" style={{ marginBottom: '0.5rem' }} />
                <h4 style={{ color: 'var(--navy)', marginBottom: '0.2rem', fontSize: '0.92rem', fontWeight: 600 }}>Grabación no disponible aún</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  El video de esta sesión estará disponible una vez finalizada la transmisión.
                </p>
              </div>
            )}
          </div>

          {/* 2. RECURSOS Y MATERIAL DE ESTUDIO */}
          <div className="card-placeholder order-recursos">
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Paperclip size={18} color="var(--gold-dark)" /> Recursos y Material de Estudio ({resources.length})
            </h3>

            {resources.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.25rem 1rem', background: 'var(--surface-light)', borderRadius: 'var(--radius-md)' }}>
                <Paperclip size={24} color="var(--text-muted)" style={{ marginBottom: '0.35rem' }} />
                <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: 0 }}>
                  No hay archivos ni recursos adicionales cargados para esta clase.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resources.map(res => (
                  <div key={res.id} style={{
                    padding: '0.85rem 1.25rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--surface-light)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <div style={{ padding: '0.5rem', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                        {getResourceIcon(res.type)}
                      </div>
                      <div>
                        <h4 style={{ fontWeight: 600, color: 'var(--navy)', fontSize: '0.88rem', margin: 0 }}>{res.title}</h4>
                        {res.description && <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{res.description}</p>}
                      </div>
                    </div>

                    <a href={res.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ fontSize: '0.78rem', padding: '0.4rem 0.85rem' }}>
                      <Download size={14} /> Descargar / Abrir
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* COLUMNA LATERAL (BARRA LATERAL DE ACCIONES E INFORMACIÓN) */}
        <div className="class-detail-sidebar">

          {/* 1. ACTIVIDAD DE REFORZAMIENTO DE LA CLASE (REEMPLAZA EL PROGRESO DE LA CLASE) */}
          <div className="card-placeholder order-actividad" style={{ background: 'var(--white)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Award size={18} color="var(--gold-dark)" /> Actividad de reforzamiento
              </h3>
              
              {/* STATUS CHIP DEPENDIENDO DEL ESTADO DE LA ACTIVIDAD */}
              {activityState === 'no_configurada' && (
                <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600 }}>
                  Aún no configurada
                </span>
              )}
              {activityState === 'bloqueada' && (
                <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Lock size={12} /> Bloqueada
                </span>
              )}
              {activityState === 'no_iniciada' && (
                <span style={{ background: '#dbeafe', color: '#1e40af', border: '1px solid #bfdbfe', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600 }}>
                  Disponible
                </span>
              )}
              {activityState === 'en_progreso' && (
                <span style={{ background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={12} /> En progreso ({Object.keys(userAnswers).length}/{activityConfig?.questions?.length || 0})
                </span>
              )}
              {activityState === 'completada' && (
                <span style={{ background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', fontSize: '0.72rem', padding: '0.25rem 0.65rem', borderRadius: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Completada
                </span>
              )}
            </div>

            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '0 0 0.85rem 0', lineHeight: 1.45 }}>
              Comprueba tu comprensión de los temas abordados respondiendo esta evaluación corta.
            </p>

            {/* METADATOS (Solo si existe la actividad y no está sin configurar) */}
            {activityConfig && activityState !== 'no_configurada' && (
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <BookOpen size={13} color="var(--gold-dark)" /> {activityConfig.questions?.length || 0} preguntas
                </span>
                {activityConfig.estimatedTimeMinutes && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={13} color="var(--gold-dark)" /> {activityConfig.estimatedTimeMinutes} min
                  </span>
                )}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                  <RotateCcw size={13} color="var(--gold-dark)" />
                  {activityConfig.maxAttempts === 0
                    ? 'Intentos ilimitados'
                    : activityConfig.maxAttempts === 1
                    ? 'Único intento permitido'
                    : `${activityConfig.maxAttempts} intentos permitidos`}
                </span>
              </div>
            )}

            {/* VISTA SEGÚN ESTADO DE LA ACTIVIDAD */}
            {activityState === 'no_configurada' && (
              <div style={{ padding: '0.85rem', background: 'var(--bg-light)', borderRadius: '8px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                La actividad de reforzamiento aún no está disponible.
              </div>
            )}

            {activityState === 'bloqueada' && (
              <div style={{ padding: '0.85rem', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7', color: '#b45309', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} />
                <span>Debes visualizar la clase para habilitar esta actividad.</span>
              </div>
            )}

            {(activityState === 'no_iniciada' || activityState === 'en_progreso') && (
              <button
                onClick={handleStartActivity}
                className="btn btn-primary"
                style={{ width: '100%', fontSize: '0.85rem', padding: '0.6rem 1rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700 }}
              >
                <Award size={16} /> {activityState === 'en_progreso' ? 'Continuar actividad' : 'Comenzar actividad'}
              </button>
            )}

            {activityState === 'vencida' && (
              <div style={{ padding: '0.85rem', background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca', color: '#991b1b', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Lock size={16} />
                <span>La fecha límite para realizar esta actividad ha finalizado.</span>
              </div>
            )}

            {activityState === 'completada' && completedResult && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                <div>
                  <div style={{ fontWeight: 700, color: '#166534', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CheckCircle2 size={16} /> Actividad completada ({completedResult.correctCount}/{completedResult.totalCount})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#15803d', marginTop: '2px' }}>
                    Puntaje: <strong>{completedResult.scorePct}%</strong> • {completedResult.completedAt}
                  </div>
                  {activityConfig?.isMandatory && programProgressDetails && (
                    <div style={{ fontSize: '0.74rem', color: '#166534', marginTop: '4px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Award size={13} /> Aporte al programa: {programProgressDetails.percentage}%
                    </div>
                  )}
                </div>
                <button
                  onClick={handleOpenResults}
                  className="btn btn-outline"
                  style={{ width: '100%', fontSize: '0.8rem', padding: '0.45rem 0.8rem', color: '#166534', borderColor: '#86efac', background: '#ffffff', fontWeight: 700 }}
                >
                  Revisar resultado
                </button>
              </div>
            )}

          </div>

          {/* 2. ENVIAR UNA DUDA Y LISTA DE DUDAS REGISTRADAS */}
          <div className="card-placeholder order-dudas">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HelpCircle size={18} color="var(--gold-dark)" /> ¿Tienes una duda sobre esta clase?
              </h3>
              <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.72rem', padding: '0.2rem 0.55rem', borderRadius: '12px', fontWeight: 600 }}>
                Atención docente
              </span>
            </div>

            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1rem 0', lineHeight: 1.45 }}>
              Envía tu pregunta para que el docente pueda revisarla y atenderla durante la clase.
            </p>

            <button
              ref={doubtButtonRef}
              onClick={openDoubtModal}
              className="btn"
              style={{
                width: '100%',
                background: 'var(--navy)',
                color: '#ffffff',
                border: 'none',
                padding: '0.6rem 1rem',
                fontSize: '0.85rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                borderRadius: '8px',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
              }}
            >
              <Send size={15} /> Enviar una duda
            </button>

            {/* LISTA DE DUDAS ENVIADAS POR EL ESTUDIANTE EN ESTA CLASE */}
            {userDoubts.length > 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <MessageSquare size={15} color="var(--gold-dark)" />
                  Mis dudas enviadas ({userDoubts.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {userDoubts.map(doubt => (
                    <div key={doubt.id} style={{
                      padding: '0.65rem 0.85rem',
                      background: 'var(--surface-light)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.3 }}>
                          {doubt.subject}
                        </span>
                        <span style={{
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '10px',
                          fontWeight: 600,
                          whiteSpace: 'nowrap',
                          background: doubt.status === 'atendida' ? '#dcfce7' :
                                      doubt.status === 'revisada' ? '#fef3c7' :
                                      doubt.status === 'archivada' ? '#f1f5f9' : '#dbeafe',
                          color: doubt.status === 'atendida' ? '#166534' :
                                 doubt.status === 'revisada' ? '#92400e' :
                                 doubt.status === 'archivada' ? '#475569' : '#1e40af'
                        }}>
                          {doubt.status === 'atendida' ? 'Atendida en clase' :
                           doubt.status === 'revisada' ? 'Revisada' :
                           doubt.status === 'archivada' ? 'Archivada' : 'Enviada'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                        {new Date(doubt.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PREPARACIÓN VISUAL DE ETIQUETAS DE ESTADOS FUTUROS CUANDO NO HAY DUDAS */}
            {userDoubts.length === 0 && (
              <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px dashed var(--border-color)' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  ESTADOS DE REVISIÓN:
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#dbeafe', color: '#1e40af', fontWeight: 600 }}>Enviada</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#fef3c7', color: '#92400e', fontWeight: 600 }}>Revisada</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#dcfce7', color: '#166534', fontWeight: 600 }}>Atendida en clase</span>
                  <span style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem', borderRadius: '10px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>Archivada</span>
                </div>
              </div>
            )}
          </div>

        </div>

      </div>

      {/* 3. MODAL ACCESIBLE DE ENVÍO DE DUDA */}
      {isDoubtModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={closeDoubtModal}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '560px',
              maxHeight: '90vh',
              overflowY: 'auto',
              background: '#ffffff',
              borderRadius: 'var(--radius-lg, 16px)',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
              position: 'relative',
              animation: 'fadeSlideUp 0.25s ease-out',
              border: '1px solid var(--border-color, #e2e8f0)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* BOTÓN CERRAR */}
            <button
              type="button"
              onClick={closeDoubtModal}
              style={{
                position: 'absolute',
                top: '1.25rem',
                right: '1.25rem',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted, #64748b)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>

            {/* ENCABEZADO DEL MODAL */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: 'var(--navy)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                <HelpCircle size={22} color="var(--gold-dark)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--navy)' }}>
                  Enviar Duda al Docente
                </h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Clase: {clsData.title}
                </span>
              </div>
            </div>

            {/* TEXTO INFORMATIVO REQUERIDO */}
            <div style={{
              background: '#f8fafc',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              marginBottom: '1.25rem',
              fontSize: '0.82rem',
              color: 'var(--text-secondary, #475569)',
              lineHeight: 1.45,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem'
            }}>
              <Info size={16} style={{ flexShrink: 0, marginTop: '2px', color: 'var(--gold-dark)' }} />
              <span>
                Tu duda será revisada por el docente para ser atendida durante la clase o en el espacio académico correspondiente.
              </span>
            </div>

            {/* MENSAJE DE ÉXITO EXIGIDO TRAS INSERCIÓN */}
            {successMsg && (
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.83rem',
                color: '#166534',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <FileCheck size={18} color="#16a34a" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* MENSAJE DE ERROR AMIGABLE */}
            {submitError && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                marginBottom: '1.25rem',
                fontSize: '0.83rem',
                color: '#991b1b',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={18} color="#dc2626" />
                <span>{submitError}</span>
              </div>
            )}

            {/* FORMULARIO DE DUDAS */}
            <form onSubmit={handleSubmitDoubt} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              
              {/* 1. ASUNTO DE LA DUDA */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                    Asunto de la duda <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: subject.length > 120 ? '#dc2626' : 'var(--text-muted)' }}>
                    {subject.length} / 120
                  </span>
                </div>
                <input
                  ref={firstInputRef}
                  type="text"
                  className="doubt-input"
                  value={subject}
                  maxLength={120}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    if (!touched.subject) setTouched(prev => ({ ...prev, subject: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, subject: true }))}
                  placeholder="Ej: Aclaración sobre la fórmula de rendimiento..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: subjectError ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem'
                  }}
                />
                {subjectError && (
                  <span style={{ fontSize: '0.76rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={13} /> {subjectError}
                  </span>
                )}
              </div>

              {/* 2. DESCRIPCIÓN */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                    Descripción detallada <span style={{ color: '#dc2626' }}>*</span>
                  </label>
                  <span style={{ fontSize: '0.74rem', color: description.length > 1500 ? '#dc2626' : 'var(--text-muted)' }}>
                    {description.length} / 1500
                  </span>
                </div>
                <textarea
                  rows={4}
                  className="doubt-textarea"
                  value={description}
                  maxLength={1500}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (!touched.description) setTouched(prev => ({ ...prev, description: true }));
                  }}
                  onBlur={() => setTouched(prev => ({ ...prev, description: true }))}
                  placeholder="Describe en detalle tu consulta o inquietud técnica..."
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: descriptionError ? '1px solid #dc2626' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    minHeight: '100px'
                  }}
                />
                {descriptionError && (
                  <span style={{ fontSize: '0.76rem', color: '#dc2626', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <AlertCircle size={13} /> {descriptionError}
                  </span>
                )}
              </div>

              {/* 3. TEMA RELACIONADO (OPCIONAL) */}
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontWeight: 600, fontSize: '0.84rem', color: 'var(--navy)' }}>
                  Tema relacionado (opcional)
                </label>
                <input
                  type="text"
                  className="doubt-input"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Ej: Módulo 1 - Fundamentos"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.85rem',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px',
                    fontSize: '0.86rem'
                  }}
                />
              </div>

              {/* DATOS AUTOMÁTICOS (CONTEXTO INTERNO LISTO PARA SUPABASE) */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <span>Docente: <strong>{clsData.teacher_profiles?.name || 'Asignado'}</strong></span>
                <span>Estudiante: <strong>{currentUser?.full_name || 'Autenticado'}</strong></span>
              </div>

              {/* ACCIONES DEL FORMULARIO */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={closeDoubtModal}
                  className="btn btn-outline"
                  style={{ padding: '0.55rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, borderRadius: '8px' }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!isFormValid || submitting}
                  className="btn"
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    borderRadius: '8px',
                    background: isFormValid && !submitting ? 'var(--navy)' : '#e2e8f0',
                    color: isFormValid && !submitting ? '#ffffff' : '#94a3b8',
                    border: 'none',
                    cursor: isFormValid && !submitting ? 'pointer' : 'not-allowed',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    boxShadow: isFormValid && !submitting ? '0 2px 4px rgba(20, 33, 61, 0.2)' : 'none'
                  }}
                >
                  <Send size={15} /> {submitting ? 'Guardando...' : 'Enviar una duda'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* MODAL / EXPERIENCIA INTERACTIVA DE LA ACTIVIDAD DE REFORZAMIENTO */}
      {/* =================================================================== */}
      {isActivityModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(20, 33, 61, 0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{
            width: '100%', maxWidth: '720px', maxHeight: '90vh',
            overflowY: 'auto', background: 'var(--white)',
            borderRadius: '16px', border: '1px solid var(--border-color)',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)', padding: '2rem',
            position: 'relative', animation: 'fadeSlideUp 0.3s ease-out'
          }}>
            
            {/* BOTÓN CERRAR MODAL */}
            <button
              onClick={() => setIsActivityModalOpen(false)}
              style={{
                position: 'absolute', top: '1.25rem', right: '1.25rem',
                background: 'transparent', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '0.4rem', borderRadius: '50%'
              }}
              aria-label="Cerrar modal de actividad"
            >
              <X size={22} />
            </button>

            {/* ─── CASO 1: MODO REVISIÓN DE RESULTADOS ─── */}
            {viewingResultsMode && completedResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div style={{ textAlign: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(252, 163, 17, 0.15)', color: 'var(--gold-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                    <Award size={36} />
                  </div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--navy)', margin: '0 0 0.35rem 0' }}>
                    Actividad completada
                  </h2>
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                    Resumen de evaluación para: <strong>{clsData?.title}</strong>
                  </div>
                </div>

                {/* MENSAJE OBLIGATORIO DE PROGRESO */}
                <div style={{
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#166534', padding: '0.85rem 1.25rem', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', gap: '0.65rem',
                  fontWeight: 700, fontSize: '0.9rem'
                }}>
                  <CheckCircle2 size={20} color="#166534" />
                  <span>Tu progreso del programa se ha actualizado.</span>
                </div>

                {/* TARJETA DE NOTA Y PUNTAJE */}
                <div style={{
                  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '1rem', background: 'var(--bg-light)', padding: '1.25rem',
                  borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Puntaje Obtenido</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy)', lineHeight: 1.2, marginTop: '4px' }}>
                      {completedResult?.scorePct ?? 0}%
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Aciertos</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#166534', lineHeight: 1.2, marginTop: '4px' }}>
                      {completedResult?.correctCount ?? 0} / {completedResult?.totalCount ?? (activityConfig?.questions?.length || 0)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>Fecha de Finalización</div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--navy)', marginTop: '8px' }}>
                      {completedResult?.completedAt || 'Reciente'}
                    </div>
                  </div>
                </div>

                {/* REVISIÓN DETALLADA DE PREGUNTAS */}
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1rem' }}>
                    Revisión de respuestas y retroalimentación
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {activityConfig.questions.map((q, idx) => {
                      const userChoice = userAnswers[q.id];
                      const isCorrect = userChoice && q.correctOptionId && String(userChoice) === String(q.correctOptionId);
                      const isAnswered = !!userChoice;

                      return (
                        <div key={q.id} style={{
                          padding: '1.2rem 1.35rem', borderRadius: '12px',
                          border: isCorrect ? '1.5px solid #86efac' : isAnswered ? '1.5px solid #fca5a5' : '1.5px solid #cbd5e1',
                          background: isCorrect ? '#f0fdf4' : isAnswered ? '#fef2f2' : '#f8fafc',
                          boxShadow: '0 2px 5px rgba(0,0,0,0.03)'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--navy)', lineHeight: 1.4 }}>
                              {idx + 1}. {q.statement}
                            </span>
                            <span style={{
                              fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: '12px',
                              background: isCorrect ? '#dcfce7' : isAnswered ? '#fee2e2' : '#f1f5f9',
                              color: isCorrect ? '#166534' : isAnswered ? '#dc2626' : '#64748b',
                              flexShrink: 0
                            }}>
                              {isCorrect ? '✓ Correcta' : isAnswered ? '✗ Incorrecta' : 'Clave de respuesta'}
                            </span>
                          </div>

                          {/* LISTA DE OPCIONES */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', margin: '0.6rem 0' }}>
                            {q.options.map(opt => {
                              const isSelected = userChoice && String(userChoice) === String(opt.id);
                              const isRightOption = q.correctOptionId && String(q.correctOptionId) === String(opt.id);

                              return (
                                <div key={opt.id} style={{
                                  padding: '0.6rem 0.85rem', borderRadius: '8px',
                                  background: isRightOption ? '#dcfce7' : isSelected ? '#fee2e2' : '#ffffff',
                                  border: isRightOption ? '2px solid #22c55e' : isSelected ? '2px solid #ef4444' : '1px solid #e2e8f0',
                                  fontWeight: isSelected || isRightOption ? 700 : 400,
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  gap: '0.75rem', fontSize: '0.88rem'
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                      width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0,
                                      background: isRightOption ? '#166534' : isSelected ? '#dc2626' : '#cbd5e1',
                                      color: '#ffffff', fontSize: '11px', fontWeight: 700
                                    }}>
                                      {isRightOption ? '✓' : isSelected ? '✗' : '•'}
                                    </span>
                                    <span style={{ color: 'var(--navy)' }}>{opt.text}</span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                    {isSelected && (
                                      <span style={{
                                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px',
                                        background: isRightOption ? '#15803d' : '#b91c1c',
                                        color: '#ffffff', fontWeight: 700
                                      }}>
                                        {isRightOption ? 'Tu respuesta ✓' : 'Tu selección'}
                                      </span>
                                    )}
                                    {isRightOption && !isSelected && (
                                      <span style={{
                                        fontSize: '0.72rem', padding: '2px 8px', borderRadius: '6px',
                                        background: '#dcfce7', color: '#166534', fontWeight: 700, border: '1px solid #86efac'
                                      }}>
                                        Respuesta correcta
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* ACLARACIÓN / RETROALIMENTACIÓN PEDAGÓGICA */}
                          {(() => {
                            const exp = (q.explanation || '').trim();
                            const src = (q.sourceBasis || '').trim();
                            const correctOpt = (q.options || []).find(o => String(o.id) === String(q.correctOptionId));
                            const defaultFeedback = correctOpt 
                              ? `La opción correcta es "${correctOpt.text}". Revisa los conceptos explicados en esta sesión para afianzar tus conocimientos.`
                              : 'Revisa el material audiovisual y documentos de apoyo de la clase para reforzar este tema.';
                            
                            const feedbackText = exp || src || defaultFeedback;

                            return (
                              <div style={{
                                marginTop: '0.85rem', fontSize: '0.84rem', color: '#1e40af',
                                background: '#eff6ff', padding: '0.8rem 1rem', borderRadius: '10px',
                                border: '1px solid #bfdbfe',
                                lineHeight: 1.5,
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '0.6rem'
                              }}>
                                <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>💡</span>
                                <div style={{ flex: 1 }}>
                                  <strong style={{ display: 'block', color: '#1d4ed8', marginBottom: '2px', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                                    Retroalimentación Pedagógica
                                  </strong>
                                  <span>{feedbackText}</span>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
                  <button onClick={() => setIsActivityModalOpen(false)} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem', fontWeight: 700 }}>
                    Cerrar y volver a la clase
                  </button>
                </div>
              </div>

            ) : showConfirmFinishModal ? (
              
              /* ─── CASO 2: MODAL DE CONFIRMACIÓN DE FINALIZACIÓN ─── */
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(252, 163, 17, 0.15)', color: 'var(--navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem auto' }}>
                  <HelpCircle size={32} color="var(--gold-dark)" />
                </div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy)', marginBottom: '0.5rem' }}>
                  ¿Deseas finalizar la actividad?
                </h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', maxWidth: '480px', margin: '0 auto 1.5rem auto', lineHeight: 1.5 }}>
                  Has respondido <strong>{Object.keys(userAnswers).length}</strong> de <strong>{activityConfig.questions.length}</strong> preguntas.
                  {Object.keys(userAnswers).length < activityConfig.questions.length && (
                    <span style={{ display: 'block', color: '#dc2626', fontWeight: 600, marginTop: '0.5rem' }}>
                      ⚠️ Tienes preguntas sin responder.
                    </span>
                  )}
                </p>

                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                  <button
                    onClick={() => setShowConfirmFinishModal(false)}
                    className="btn btn-outline"
                    style={{ padding: '0.55rem 1.25rem', fontSize: '0.85rem', fontWeight: 600 }}
                  >
                    Volver a revisar
                  </button>
                  <button
                    onClick={handleFinishAttempt}
                    className="btn btn-primary"
                    style={{ padding: '0.55rem 1.4rem', fontSize: '0.85rem', fontWeight: 700 }}
                  >
                    Sí, finalizar actividad
                  </button>
                </div>
              </div>

            ) : (

              /* ─── CASO 3: INTENTO ACTIVO EN PROGRESO (PREGUNTA X DE Y) ─── */
              <div>
                {/* HEADER CON BARRA DE PROGRESO */}
                <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gold-dark)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Actividad de reforzamiento
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)', background: 'var(--bg-light)', padding: '0.2rem 0.65rem', borderRadius: '12px' }}>
                      Pregunta {currentQuestionIdx + 1} de {activityConfig.questions.length}
                    </span>
                  </div>

                  {/* BARRA DE AVANCE INTERNA (100% NEUTRAL - NAVY & GOLD) */}
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${((currentQuestionIdx + 1) / activityConfig.questions.length) * 100}%`,
                      height: '100%',
                      background: 'var(--navy)',
                      transition: 'width 0.3s ease-out'
                    }} />
                  </div>
                </div>

                {/* PREGUNTA ACTUAL */}
                {(() => {
                  const currentQ = activityConfig.questions[currentQuestionIdx];
                  const selectedOptId = userAnswers[currentQ.id];

                  return (
                    <div style={{ minHeight: '280px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--navy)', marginBottom: '1.25rem', lineHeight: 1.35 }}>
                          {currentQ.statement}
                        </h3>

                        {/* OPCIONES DE RESPUESTA CON ÁREAS CLICABLES AMPLIAS */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {currentQ.options.map(opt => {
                            const isSelected = selectedOptId === opt.id;

                            return (
                              <div
                                key={opt.id}
                                onClick={() => handleOptionSelect(currentQ.id, opt.id)}
                                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && handleOptionSelect(currentQ.id, opt.id)}
                                tabIndex={0}
                                role="radio"
                                aria-checked={isSelected}
                                style={{
                                  padding: '1rem 1.25rem',
                                  borderRadius: '12px',
                                  border: isSelected ? '2px solid var(--navy)' : '1px solid var(--border-color)',
                                  background: isSelected ? '#eff6ff' : 'var(--white)',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease-in-out',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.85rem',
                                  boxShadow: isSelected ? '0 2px 6px rgba(20, 33, 61, 0.12)' : 'none',
                                  outline: 'none'
                                }}
                                onFocus={e => e.currentTarget.style.borderColor = 'var(--gold-dark)'}
                                onBlur={e => e.currentTarget.style.borderColor = isSelected ? 'var(--navy)' : 'var(--border-color)'}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                                  {/* CIRCULO INDICADOR RADIO */}
                                  <div style={{
                                    width: '20px', height: '20px', borderRadius: '50%',
                                    border: isSelected ? '6px solid var(--navy)' : '2px solid #cbd5e1',
                                    background: '#ffffff', flexShrink: 0,
                                    transition: 'all 0.15s ease'
                                  }} />
                                  <span style={{ fontSize: '0.92rem', color: 'var(--navy)', fontWeight: isSelected ? 700 : 500 }}>
                                    {opt.text}
                                  </span>
                                </div>

                                {isSelected && (
                                  <span style={{
                                    fontSize: '0.74rem', fontWeight: 700,
                                    background: 'var(--navy)', color: '#ffffff',
                                    padding: '2px 8px', borderRadius: '6px',
                                    flexShrink: 0
                                  }}>
                                    Seleccionada
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CONTROLES DE NAVEGACIÓN (ANTERIOR / SIGUIENTE / FINALIZAR) */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
                        <button
                          onClick={handlePrevQuestion}
                          disabled={currentQuestionIdx === 0}
                          className="btn btn-outline"
                          style={{
                            fontSize: '0.85rem', padding: '0.55rem 1rem',
                            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                            opacity: currentQuestionIdx === 0 ? 0.4 : 1,
                            cursor: currentQuestionIdx === 0 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          <ArrowLeft size={16} /> Anterior
                        </button>

                        {currentQuestionIdx < activityConfig.questions.length - 1 ? (
                          <button
                            onClick={handleNextQuestion}
                            className="btn btn-primary"
                            style={{ fontSize: '0.85rem', padding: '0.55rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}
                          >
                            Siguiente <ArrowRight size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => setShowConfirmFinishModal(true)}
                            className="btn"
                            style={{
                              fontSize: '0.85rem', padding: '0.55rem 1.25rem',
                              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                              background: 'var(--navy)', color: '#ffffff', border: 'none',
                              borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(20, 33, 61, 0.2)'
                            }}
                          >
                            <CheckCircle2 size={16} /> Finalizar actividad
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })()}

              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}


