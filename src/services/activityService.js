import { supabase } from '../lib/supabaseClient';

/**
 * Servicio: activityService
 * Consulta y unifica actividades pendientes de tareas (assignments), cuestionarios (quizzes),
 * sesiones en vivo (class_sessions) y anuncios urgentes (announcements) para el estudiante autenticado.
 * Diseñado con alta resiliencia para no fallar aunque alguna tabla no exista o esté vacía.
 */

/**
 * Obtiene las actividades pendientes de un estudiante.
 * @param {string} studentId - ID del estudiante
 * @param {number|null} limit - Número máximo de actividades a devolver (default: 4)
 * @returns {Promise<{ activities: Array, error: string|null }>}
 */
export async function fetchStudentPendingActivities(studentId, limit = 4) {
  if (!studentId) return { activities: [], error: null };

  try {
    const pendingActivities = [];
    const programMap = {};
    let programIds = [];

    // -------------------------------------------------------------
    // 1. OBTENER PROGRAMAS A LOS QUE ESTÁ INSCRITO EL ESTUDIANTE (SOLO PUBLICADOS)
    // -------------------------------------------------------------
    try {
      let { data: enrollments, error: enrollErr } = await supabase
        .from('enrollments')
        .select('program_id, diploma_programs(id, title, is_published, status)')
        .eq('student_id', studentId);

      if (enrollErr || !enrollments || enrollments.length === 0) {
        const { data: legacyEnrollments } = await supabase
          .from('enrollments')
          .select('diploma_id, diploma_programs(id, title, is_published, status)')
          .eq('student_id', studentId);
        enrollments = legacyEnrollments;
      }

      if (enrollments) {
        programIds = enrollments
          .filter(e => {
            const prog = e.diploma_programs;
            if (!prog) return true; // si no hay relación cargada, mantenemos resiliencia
            return prog.is_published !== false && prog.status !== 'draft' && prog.status !== 'disabled';
          })
          .map(e => {
            const pId = e.program_id || e.diploma_id;
            if (pId) {
              programMap[pId] = e.diploma_programs?.title || 'Programa Inscrito';
              return pId;
            }
            return null;
          }).filter(Boolean);
      }
    } catch (err) {
      console.warn('Advertencia al consultar inscripciones:', err);
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    // -------------------------------------------------------------
    // 2. CONSULTAR TAREAS / ENTREGABLES (assignments)
    // -------------------------------------------------------------
    if (programIds.length > 0) {
      try {
        const { data: assignments, error: assErr } = await supabase
          .from('assignments')
          .select('id, program_id, title, description, due_date, is_published')
          .in('program_id', programIds)
          .eq('is_published', true);

        if (!assErr && assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id);
          let submittedIds = new Set();

          try {
            const { data: submissions } = await supabase
              .from('assignment_submissions')
              .select('assignment_id')
              .eq('student_id', studentId)
              .in('assignment_id', assignmentIds);

            if (submissions) {
              submittedIds = new Set(submissions.map(s => s.assignment_id));
            }
          } catch {
            // Ignorar si la tabla de entregas aún no tiene datos
          }

          assignments.forEach(ass => {
            if (submittedIds.has(ass.id)) return; // Omitir entregadas

            const dueDate = new Date(ass.due_date);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            let urgency = 'upcoming';
            let statusLabel = 'Próxima';

            if (dueDateStr === todayStr) {
              urgency = 'today';
              statusLabel = 'Hoy';
            } else if (dueDateStr === tomorrowStr) {
              urgency = 'tomorrow';
              statusLabel = 'Mañana';
            } else if (dueDate < now) {
              urgency = 'overdue';
              statusLabel = 'Vencida';
            }

            pendingActivities.push({
              id: ass.id,
              title: ass.title,
              type: 'Entrega',
              programId: ass.program_id,
              programTitle: programMap[ass.program_id] || 'Programa Inscrito',
              date: ass.due_date,
              urgency,
              statusLabel,
              link: `/dashboard/${ass.program_id}`
            });
          });
        }
      } catch (err) {
        console.info('Información: Tabla assignments en preparación o sin registros.', err);
      }

      // -------------------------------------------------------------
      // 3. CONSULTAR CUESTIONARIOS (quizzes)
      // -------------------------------------------------------------
      try {
        const { data: quizzes, error: quizErr } = await supabase
          .from('quizzes')
          .select('id, program_id, title, description, due_date, is_published')
          .in('program_id', programIds)
          .eq('is_published', true);

        if (!quizErr && quizzes && quizzes.length > 0) {
          const quizIds = quizzes.map(q => q.id);
          let completedQuizIds = new Set();

          try {
            const { data: quizSubmissions } = await supabase
              .from('quiz_submissions')
              .select('quiz_id')
              .eq('student_id', studentId)
              .in('quiz_id', quizIds);

            if (quizSubmissions) {
              completedQuizIds = new Set(quizSubmissions.map(s => s.quiz_id));
            }
          } catch {
            // Ignorar si la tabla de intentos de cuestionario aún no tiene datos
          }

          quizzes.forEach(qz => {
            if (completedQuizIds.has(qz.id)) return; // Omitir completados

            const dueDate = new Date(qz.due_date);
            const dueDateStr = dueDate.toISOString().split('T')[0];

            let urgency = 'upcoming';
            let statusLabel = 'Próxima';

            if (dueDateStr === todayStr) {
              urgency = 'today';
              statusLabel = 'Hoy';
            } else if (dueDateStr === tomorrowStr) {
              urgency = 'tomorrow';
              statusLabel = 'Mañana';
            } else if (dueDate < now) {
              urgency = 'overdue';
              statusLabel = 'Vencida';
            }

            pendingActivities.push({
              id: qz.id,
              title: qz.title,
              type: 'Cuestionario',
              programId: qz.program_id,
              programTitle: programMap[qz.program_id] || 'Programa Inscrito',
              date: qz.due_date,
              urgency,
              statusLabel,
              link: `/dashboard/${qz.program_id}`
            });
          });
        }
      } catch (err) {
        console.info('Información: Tabla quizzes en preparación o sin registros.', err);
      }
    }

    // -------------------------------------------------------------
    // 4. CONSULTAR SESIONES EN VIVO PRÓXIMAS (class_sessions)
    // -------------------------------------------------------------
    if (programIds.length > 0) {
      try {
        const { data: classes, error: classErr } = await supabase
          .from('class_sessions')
          .select('id, title, class_date, program_id')
          .in('program_id', programIds)
          .order('class_date', { ascending: true })
          .limit(10);

        if (!classErr && classes) {
          classes.forEach(cls => {
            if (!cls.class_date) return;
            const clsDate = new Date(cls.class_date);
            if (clsDate < now) return; // Solo clases futuras

            const programTitle = programMap[cls.program_id] || 'Programa Inscrito';
            const clsDateStr = clsDate.toISOString().split('T')[0];

            let urgency = 'upcoming';
            let statusLabel = 'Próxima';

            if (clsDateStr === todayStr) {
              urgency = 'today';
              statusLabel = 'Hoy';
            } else if (clsDateStr === tomorrowStr) {
              urgency = 'tomorrow';
              statusLabel = 'Mañana';
            }

            pendingActivities.push({
              id: cls.id,
              title: cls.title,
              type: 'Sesión en vivo',
              programId: cls.program_id,
              programTitle,
              date: cls.class_date,
              urgency,
              statusLabel,
              link: `/class/${cls.id}`
            });
          });
        }
      } catch (err) {
        console.info('Información sobre clases:', err);
      }
    }

    // -------------------------------------------------------------
    // 5. CONSULTAR ANUNCIOS URGENTES E IMPORTANTES (announcements)
    // -------------------------------------------------------------
    if (programIds.length > 0) {
      try {
        const { data: urgentAnnouncements, error: annErr } = await supabase
          .from('announcements')
          .select('id, title, created_at, tag, program_id, diploma_programs(id, is_published, status)')
          .eq('tag', 'urgent')
          .in('program_id', programIds)
          .order('created_at', { ascending: false })
          .limit(3);

        if (!annErr && urgentAnnouncements) {
          urgentAnnouncements.forEach(ann => {
            const prog = ann.diploma_programs;
            if (prog && (prog.is_published === false || prog.status === 'draft' || prog.status === 'disabled')) {
              return;
            }
            pendingActivities.push({
              id: ann.id,
              title: ann.title,
              type: 'Anuncio importante',
              programTitle: 'Aviso Institucional',
              date: ann.created_at,
              urgency: 'upcoming',
              statusLabel: 'Importante',
              link: `/portal`
            });
          });
        }
      } catch (err) {
        console.info('Información sobre anuncios:', err);
      }
    }

    // -------------------------------------------------------------
    // 6. ORDEN DE PRIORIDAD
    // 1: Vencida, 2: Hoy, 3: Mañana, 4: Próxima / Anuncios
    // -------------------------------------------------------------
    const urgencyWeight = { overdue: 1, today: 2, tomorrow: 3, upcoming: 4 };

    pendingActivities.sort((a, b) => {
      const weightA = urgencyWeight[a.urgency] || 4;
      const weightB = urgencyWeight[b.urgency] || 4;
      if (weightA !== weightB) return weightA - weightB;
      return new Date(a.date) - new Date(b.date);
    });

    return {
      activities: limit ? pendingActivities.slice(0, limit) : pendingActivities,
      error: null
    };
  } catch (err) {
    console.error('Error al procesar pendientes:', err);
    return { activities: [], error: null };
  }
}
