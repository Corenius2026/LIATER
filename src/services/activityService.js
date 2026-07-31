import { supabase } from '../lib/supabaseClient';

/**
 * Servicio: activityService
 * Consulta y unifica actividades pendientes de tareas (assignments), cuestionarios (quizzes),
 * sesiones en vivo (class_sessions) y anuncios urgentes (announcements) para el estudiante autenticado.
 */

/**
 * Obtiene las actividades pendientes de un estudiante.
 * @param {string} studentId - ID del estudiante
 * @param {number} limit - Número máximo de actividades a devolver (default: 4)
 * @returns {Promise<{ activities: Array, error: string|null }>}
 */
export async function fetchStudentPendingActivities(studentId, limit = 4) {
  if (!studentId) return { activities: [], error: null };

  try {
    // 1. Obtener programas a los que está inscrito el estudiante
    const { data: enrollments, error: enrollErr } = await supabase
      .from('enrollments')
      .select('diploma_id, diploma_programs(title)')
      .eq('student_id', studentId);

    if (enrollErr) throw enrollErr;

    const programMap = {};
    const programIds = (enrollments || []).map(e => {
      if (e.diploma_id && e.diploma_programs) {
        programMap[e.diploma_id] = e.diploma_programs.title;
      }
      return e.diploma_id;
    }).filter(Boolean);

    if (programIds.length === 0) {
      return { activities: [], error: null };
    }

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const pendingActivities = [];

    // -------------------------------------------------------------
    // 2. CONSULTAR TAREAS / ENTREGABLES (assignments)
    // -------------------------------------------------------------
    try {
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id, program_id, title, description, due_date, is_published')
        .in('program_id', programIds)
        .eq('is_published', true);

      if (assignments && assignments.length > 0) {
        const assignmentIds = assignments.map(a => a.id);
        const { data: submissions } = await supabase
          .from('assignment_submissions')
          .select('assignment_id')
          .eq('student_id', studentId)
          .in('assignment_id', assignmentIds);

        const submittedIds = new Set((submissions || []).map(s => s.assignment_id));

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
            programTitle: programMap[ass.program_id] || 'Programa Inscrito',
            date: ass.due_date,
            urgency,
            statusLabel,
            link: `/dashboard/${ass.program_id}`
          });
        });
      }
    } catch {
      console.info('PGRST inform: Tabla assignments aún sin registros o en proceso de migración.');
    }

    // -------------------------------------------------------------
    // 3. CONSULTAR CUESTIONARIOS (quizzes)
    // -------------------------------------------------------------
    try {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, program_id, title, description, due_date, is_published')
        .in('program_id', programIds)
        .eq('is_published', true);

      if (quizzes && quizzes.length > 0) {
        const quizIds = quizzes.map(q => q.id);
        const { data: quizSubmissions } = await supabase
          .from('quiz_submissions')
          .select('quiz_id')
          .eq('student_id', studentId)
          .in('quiz_id', quizIds);

        const completedQuizIds = new Set((quizSubmissions || []).map(s => s.quiz_id));

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
            programTitle: programMap[qz.program_id] || 'Programa Inscrito',
            date: qz.due_date,
            urgency,
            statusLabel,
            link: `/dashboard/${qz.program_id}`
          });
        });
      }
    } catch {
      console.info('PGRST inform: Tabla quizzes aún sin registros.');
    }

    // -------------------------------------------------------------
    // 4. CONSULTAR SESIONES EN VIVO PRÓXIMAS (class_sessions)
    // -------------------------------------------------------------
    try {
      const { data: classes } = await supabase
        .from('class_sessions')
        .select('id, title, class_date, subtopics(module_id, modules(program_id))')
        .order('class_date', { ascending: true })
        .limit(10);

      (classes || []).forEach(cls => {
        if (!cls.class_date) return;
        const clsDate = new Date(cls.class_date);
        if (clsDate < now) return; // Solo clases futuras

        const progId = cls.subtopics?.modules?.program_id;
        const programTitle = programMap[progId] || 'Programa Inscrito';
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
          programTitle,
          date: cls.class_date,
          urgency,
          statusLabel,
          link: `/class/${cls.id}`
        });
      });
    } catch {
      console.info('No se encontraron clases programadas.');
    }

    // -------------------------------------------------------------
    // 5. CONSULTAR ANUNCIOS URGENTES E IMPORTANTES (announcements)
    // -------------------------------------------------------------
    try {
      const { data: urgentAnnouncements } = await supabase
        .from('announcements')
        .select('id, title, created_at, tag')
        .eq('tag', 'urgent')
        .order('created_at', { ascending: false })
        .limit(3);

      (urgentAnnouncements || []).forEach(ann => {
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
    } catch {
      console.info('No se encontraron anuncios urgentes.');
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
    console.error('Error al obtener actividades pendientes:', err);
    return { activities: [], error: 'No se pudieron consultar tus pendientes.' };
  }
}
