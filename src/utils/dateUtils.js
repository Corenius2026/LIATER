/**
 * dateUtils.js
 * Utilidades para manejar y formatear las fechas de las clases, 
 * asegurando una zona horaria consistente (America/Bogota) a lo largo de la app.
 */

const TIMEZONE = 'America/Bogota';

/**
 * Convierte un string de fecha (del input datetime-local) a un string ISO (UTC)
 * asumiendo que el usuario ingresó la fecha en la zona horaria del diplomado (America/Bogota).
 * @param {string} localDateString - El valor del input (ej: "2026-07-15T18:00")
 * @returns {string|null} ISO 8601 en UTC
 */
export const parseLocalDatetime = (localDateString) => {
  if (!localDateString) return null;
  // Construimos una fecha con el timezone especificado
  try {
    // Para simplificar sin librerías externas en navegadores modernos:
    // Creamos una cadena RFC2822 o ISO reconociendo el offset.
    // 'America/Bogota' es UTC-5 en todo el año (no tiene DST).
    const bogotaOffset = '-05:00';
    const dateWithOffset = new Date(`${localDateString}${bogotaOffset}`);
    
    if (isNaN(dateWithOffset.getTime())) return null;
    return dateWithOffset.toISOString();
  } catch (error) {
    console.error('Error parseando fecha:', error);
    return null;
  }
};

/**
 * Convierte un string ISO UTC al formato requerido por el input datetime-local,
 * representado en la zona horaria de America/Bogota.
 * @param {string} isoString - La fecha en formato ISO devuelta por Supabase
 * @returns {string} String compatible con <input type="datetime-local"> (ej. "2026-07-15T18:00")
 */
export const toLocalDatetimeString = (isoString) => {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    // Extraemos las partes en la zona horaria de Bogotá
    const formatter = new Intl.DateTimeFormat('en-CA', { // en-CA da formato YYYY-MM-DD
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23' // formato 24 hrs
    });
    
    const parts = formatter.formatToParts(date);
    const p = {};
    parts.forEach(part => { p[part.type] = part.value; });
    
    // Retornamos "YYYY-MM-DDThh:mm"
    if (!p.year) return '';
    return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  } catch (error) {
    console.error('Error convirtiendo fecha para datetime-local:', error);
    return '';
  }
};

/**
 * Formatea una fecha ISO para mostrarla de manera amigable al estudiante.
 * Ej: "15 de julio de 2026, 6:00 p. m. — hora Colombia"
 * @param {string} isoString - Fecha ISO
 * @param {boolean} includeTimezoneSuffix - Si debe o no agregar "— hora Colombia" al final
 * @returns {string} Fecha formateada
 */
export const formatClassDate = (isoString, includeTimezoneSuffix = true) => {
  if (!isoString) return 'Fecha por confirmar';
  try {
    const date = new Date(isoString);
    const formatter = new Intl.DateTimeFormat('es-CO', {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    });
    
    const formatted = formatter.format(date);
    return includeTimezoneSuffix ? `${formatted} — hora Colombia` : formatted;
  } catch (error) {
    console.error('Error formateando fecha:', error);
    return 'Fecha inválida';
  }
};

/**
 * Formato corto para las tablas de administración.
 * Ej: "15 jul 2026, 18:00"
 */
export const formatShortDate = (isoString) => {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    return new Intl.DateTimeFormat('es-CO', {
      timeZone: TIMEZONE,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      hourCycle: 'h23'
    }).format(date);
  } catch (e) {
    return '—';
  }
};

/**
 * Determina si la clase es en el futuro basado en la hora actual.
 * @param {string} isoString - Fecha ISO de la clase
 * @returns {boolean} True si la clase aún no ha ocurrido
 */
export const isUpcomingClass = (isoString) => {
  if (!isoString) return false;
  return new Date(isoString).getTime() > Date.now();
};

/**
 * Determina si una clase está en vivo o a menos de 10 minutos de comenzar.
 * Regla: Se activa desde 10 minutos antes de la hora (class_date) hasta el fin estimado (class_date + duration min, por defecto 120 min),
 * siempre y cuando no tenga aún video de grabación disponible (lo que indica que ya fue archivada/finalizada).
 *
 * @param {Object|string} cls - Objeto clase con { class_date, duration, video_url } o fecha ISO
 * @param {number} [preMinutes=10] - Minutos de anticipación permitidos (por defecto 10)
 * @returns {boolean} True si está dentro de la ventana de clase en vivo
 */
export const isClassLiveOrSoon = (cls, preMinutes = 10) => {
  if (!cls) return false;
  const isoString = typeof cls === 'string' ? cls : cls.class_date;
  if (!isoString) return false;

  // Si ya tiene grabación de video disponible, la transmisión en vivo terminó
  if (typeof cls === 'object' && cls.video_url) return false;

  const classTime = new Date(isoString).getTime();
  if (isNaN(classTime)) return false;

  const now = Date.now();
  const durationMinutes = (typeof cls === 'object' && cls.duration && cls.duration > 0) ? cls.duration : 120;

  const startWindow = classTime - (preMinutes * 60 * 1000);
  const endWindow = classTime + (durationMinutes * 60 * 1000);

  return now >= startWindow && now <= endWindow;
};

/**
 * Determina si una clase es futura o está actualmente en curso (su tiempo de fin no ha pasado).
 * Excluye clases que ya tienen video de grabación o cuya duración programada ya expiró.
 *
 * @param {Object|string} cls - Objeto clase con { class_date, duration, video_url } o fecha ISO
 * @returns {boolean} True si la clase no ha finalizado
 */
export const isClassActiveOrUpcoming = (cls) => {
  if (!cls) return false;
  if (typeof cls === 'object' && cls.video_url) return false;
  const isoString = typeof cls === 'string' ? cls : cls.class_date;
  if (!isoString) return false;

  const classTime = new Date(isoString).getTime();
  if (isNaN(classTime)) return false;

  const durationMinutes = (typeof cls === 'object' && cls.duration && cls.duration > 0) ? cls.duration : 120;
  const classEndTime = classTime + (durationMinutes * 60 * 1000);

  return Date.now() <= classEndTime;
};

/**
 * Genera la URL para agendar una clase directamente en Google Calendar.
 *
 * @param {Object} cls - Objeto de la clase con { class_date, duration, title, meet_url, teacher_profiles }
 * @param {string} [programTitle] - Nombre del diplomado o programa
 * @param {string} [teacherName] - Nombre del docente (opcional)
 * @param {string} [role='teacher'] - Rol del usuario ('teacher' o 'student')
 * @returns {string|null} URL lista para abrir en ventana nueva hacia Google Calendar
 */
export const getGoogleCalendarUrl = (cls, programTitle = '', teacherName = '', role = 'teacher') => {
  if (!cls?.class_date) return null;
  try {
    const startDate = new Date(cls.class_date);
    if (isNaN(startDate.getTime())) return null;
    const durationMinutes = Number(cls.duration) || 90;
    const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

    const formatUtc = (d) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const dates = `${formatUtc(startDate)}/${formatUtc(endDate)}`;

    const progSuffix = programTitle ? ` | ${programTitle}` : ' | LIATER UNAL';
    const title = encodeURIComponent(`${cls.title || 'Clase en vivo'}${progSuffix}`);
    
    const docName = teacherName || cls.teacher_profiles?.name || 'Docente UNAL';
    const meetLink = cls.meet_url || '';

    let detailsText = '';
    if (role === 'teacher') {
      detailsText = [
        '🏛️ PORTAL EDUCATIVO LIATER — UNAL',
        programTitle ? `📚 Diplomado: ${programTitle}` : '',
        `📌 Clase a dictar: ${cls.title || 'Clase en vivo'}`,
        `👨‍🏫 Docente: ${docName}`,
        '',
        meetLink ? `🔗 Enlace de la videollamada:\n${meetLink}` : '🔗 Enlace de videollamada: Disponible en el portal',
        '',
        '📋 Recordatorios para la sesión:',
        '• Conectarse 5 a 10 minutos antes para verificar audio, cámara y presentación.',
        '• Habilitar la grabación de la clase para los estudiantes.',
        '• Al concluir, subir recursos o actividades en el Portal LIATER.',
        '',
        '🌐 Acceso al panel docente: https://liater.unal.edu.co/portal'
      ].filter(Boolean).join('\n');
    } else {
      detailsText = [
        '🏛️ PORTAL EDUCATIVO LIATER — UNAL',
        programTitle ? `📚 Diplomado: ${programTitle}` : '',
        `📌 Sesión: ${cls.title || 'Clase en vivo'}`,
        `👨‍🏫 Docente: ${docName}`,
        '',
        meetLink ? `🔗 Enlace de acceso a la clase:\n${meetLink}` : '🔗 Enlace de acceso: Disponible en el portal',
        '',
        '💡 Tip: Recuerda tener a mano tus apuntes y revisar el material previo en el aula virtual.'
      ].filter(Boolean).join('\n');
    }

    const details = encodeURIComponent(detailsText);
    const location = encodeURIComponent(meetLink || 'Portal Educativo LIATER - Universidad Nacional de Colombia');

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=${location}`;
  } catch (err) {
    console.error('Error generando enlace de Google Calendar:', err);
    return null;
  }
};



