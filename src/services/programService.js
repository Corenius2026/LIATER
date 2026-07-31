/**
 * Módulo: programService.js
 * Capa de servicios y datos para la gestión de programas, portadas y consulta de próximos programas.
 */
import { supabase } from '../lib/supabaseClient';

/**
 * Sube una imagen de portada al bucket de Supabase Storage 'program-covers'.
 * Requiere autenticación de Administrador.
 * 
 * @param {File} file - Archivo de imagen (JPG, PNG, WebP)
 * @param {string} programId - ID del programa asociado
 * @returns {Promise<{ publicUrl: string|null, filePath: string|null, error: Error|null }>}
 */
export async function uploadProgramCover(file, programId) {
  try {
    if (!file) throw new Error('No se proporcionó ningún archivo de imagen.');

    // 1. Validar Tipo MIME
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Formato no permitido. Solo se aceptan imágenes JPG, PNG y WebP.');
    }

    // 2. Validar Tamaño Máximo (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('El archivo excede el tamaño máximo permitido de 5MB.');
    }

    // 3. Generar Nombre Único para evitar sobreescrituras accidentales
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const uniqueHash = Math.random().toString(36).substring(2, 8);
    const filePath = `covers/${programId || 'new'}_${Date.now()}_${uniqueHash}.${fileExt}`;

    // 4. Subir a Supabase Storage (Bucket: 'program-covers')
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('program-covers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) throw uploadError;

    // 5. Obtener URL pública
    const { data: urlData } = supabase.storage
      .from('program-covers')
      .getPublicUrl(filePath);

    return {
      publicUrl: urlData?.publicUrl || null,
      filePath: uploadData?.path || filePath,
      error: null
    };
  } catch (err) {
    console.error('Error al subir imagen de portada:', err);
    return { publicUrl: null, filePath: null, error: err };
  }
}

/**
 * Obtiene los próximos programas disponibles para un estudiante:
 * - Publicados (`is_published = true`)
 * - En estado 'published' o 'upcoming'
 * - En los cuales el estudiante NO está inscrito aún
 * - Ordenados por fecha de inicio más cercana
 * - Máximo 3 resultados
 * 
 * @param {string} studentId - ID del estudiante actual
 * @param {number} [limit=3] - Límite de resultados
 * @returns {Promise<{ programs: Array, error: Error|null }>}
 */
export async function fetchUpcomingPrograms(studentId, limit = 3) {
  try {
    // 1. Obtener los IDs de los programas donde el estudiante YA está inscrito
    let enrolledProgramIds = [];
    if (studentId) {
      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('program_id')
        .eq('student_id', studentId);

      if (!enrollError && enrollments) {
        enrolledProgramIds = enrollments.map(e => e.program_id).filter(Boolean);
      }
    }

    // 2. Consultar programas próximos/publicados
    let query = supabase
      .from('diploma_programs')
      .select('*')
      .eq('is_published', true)
      .in('status', ['published', 'upcoming'])
      .order('start_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    // Excluir programas en los que ya está inscrito si aplica
    if (enrolledProgramIds.length > 0) {
      query = query.not('id', 'in', `(${enrolledProgramIds.join(',')})`);
    }

    const { data: programs, error: progError } = await query;
    if (progError) throw progError;

    return { programs: programs || [], error: null };
  } catch (err) {
    console.error('Error al consultar próximos programas:', err);
    return { programs: [], error: err };
  }
}

/**
 * Obtiene el progreso real calculado para un programa específico y estudiante:
 * (Clases pasadas o vistas / Total clases del programa) * 100
 * 
 * @param {string} programId - ID del programa
 * @returns {Promise<number>} Porcentaje de avance (0 a 100)
 */
export async function calculateProgramProgress(programId) {
  try {
    if (!programId) return 0;

    // Obtener total de clases registradas para el programa
    const { data: classes, error: classError } = await supabase
      .from('class_sessions')
      .select('id, class_date')
      .eq('program_id', programId);

    if (classError || !classes || classes.length === 0) return 0;

    const totalClasses = classes.length;
    const now = new Date();

    // Contar clases pasadas
    const pastClasses = classes.filter(c => c.class_date && new Date(c.class_date) <= now).length;

    const percentage = Math.round((pastClasses / totalClasses) * 100);
    return Math.min(100, Math.max(0, percentage));
  } catch (err) {
    console.error('Error al calcular progreso del programa:', err);
    return 0;
  }
}
