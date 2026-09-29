import { supabase } from '@/lib/supabaseClient';

/**
 * Servicio: groupService.js
 * Gestiona Grupos de Trabajo, asignación de integrantes y materiales/entregables colaborativos.
 * Incluye tolerancia y detección de estado de migración de base de datos.
 */

export const isTableMissingError = (err) => {
  if (!err) return false;
  const msg = (err.message || String(err)).toLowerCase();
  const code = err.code || '';
  return (
    code === '42P01' ||
    msg.includes('relation "public.work_groups" does not exist') ||
    msg.includes('relation "work_groups" does not exist') ||
    msg.includes('could not find the') ||
    msg.includes('schema cache')
  );
};

/**
 * Obtiene todos los grupos de trabajo de un programa con sus integrantes y materiales.
 */
export async function getProgramWorkGroups(programId) {
  if (!programId) return { data: [], tableExists: true, error: null };
  const cleanId = String(programId).trim();

  try {
    const { data: groups, error: groupsErr } = await supabase
      .from('work_groups')
      .select(`
        id,
        program_id,
        name,
        project_topic,
        description,
        created_by,
        created_at,
        updated_at,
        work_group_members (
          id,
          student_id,
          assigned_at,
          users_profile (
            id,
            full_name,
            email,
            role,
            phone
          )
        ),
        work_group_materials (
          id,
          uploaded_by,
          title,
          description,
          material_type,
          url,
          file_name,
          file_size,
          provider,
          created_at,
          users_profile:uploaded_by (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('program_id', cleanId)
      .order('created_at', { ascending: true });

    if (groupsErr) {
      if (isTableMissingError(groupsErr)) {
        return { data: [], tableExists: false, error: 'Tabla work_groups no creada aún en la base de datos.' };
      }
      throw groupsErr;
    }

    return { data: groups || [], tableExists: true, error: null };
  } catch (err) {
    if (isTableMissingError(err)) {
      return { data: [], tableExists: false, error: 'Tabla work_groups no creada aún.' };
    }
    console.error('Error al obtener grupos de trabajo:', err);
    return { data: [], tableExists: true, error: err.message || String(err) };
  }
}

/**
 * Obtiene el grupo al que pertenece un estudiante específico dentro de un programa.
 */
export async function getStudentWorkGroup(programId, studentId) {
  if (!programId || !studentId) return { data: null, tableExists: true, error: null };
  const cleanId = String(programId).trim();

  try {
    // 1. Buscar membresía del estudiante en el programa
    const { data: memberRecords, error: memErr } = await supabase
      .from('work_group_members')
      .select('group_id, work_groups!inner(*)')
      .eq('student_id', studentId)
      .eq('work_groups.program_id', cleanId);

    if (memErr) {
      if (isTableMissingError(memErr)) {
        return { data: null, tableExists: false, error: 'Tabla work_groups no disponible' };
      }
      throw memErr;
    }

    if (!memberRecords || memberRecords.length === 0) {
      return { data: null, tableExists: true, error: null };
    }

    const targetGroupId = memberRecords[0].group_id;

    // 2. Traer el grupo completo con todos los miembros y materiales
    const { data: fullGroup, error: fullErr } = await supabase
      .from('work_groups')
      .select(`
        id,
        program_id,
        name,
        project_topic,
        description,
        created_by,
        created_at,
        updated_at,
        work_group_members (
          id,
          student_id,
          assigned_at,
          users_profile (
            id,
            full_name,
            email,
            role,
            phone
          )
        ),
        work_group_materials (
          id,
          uploaded_by,
          title,
          description,
          material_type,
          url,
          file_name,
          file_size,
          provider,
          created_at,
          users_profile:uploaded_by (
            id,
            full_name,
            email
          )
        )
      `)
      .eq('id', targetGroupId)
      .maybeSingle();

    if (fullErr) throw fullErr;

    return { data: fullGroup || null, tableExists: true, error: null };
  } catch (err) {
    if (isTableMissingError(err)) {
      return { data: null, tableExists: false, error: 'Tabla no existe aún.' };
    }
    console.error('Error al obtener grupo del estudiante:', err);
    return { data: null, tableExists: true, error: err.message || String(err) };
  }
}

/**
 * Crea un nuevo grupo de trabajo y opcionalmente le asigna sus primeros integrantes.
 */
export async function createWorkGroup({ programId, name, projectTopic = '', description = '', memberIds = [], createdBy = null }) {
  if (!programId || !name) throw new Error('El ID de programa y el nombre del grupo son obligatorios.');

  const { data: newGroup, error: groupErr } = await supabase
    .from('work_groups')
    .insert([{
      program_id: String(programId).trim(),
      name: name.trim(),
      project_topic: projectTopic ? projectTopic.trim() : null,
      description: description ? description.trim() : null,
      created_by: createdBy || null
    }])
    .select()
    .single();

  if (groupErr) throw groupErr;

  // Asignar integrantes si se especificaron
  if (Array.isArray(memberIds) && memberIds.length > 0) {
    const memberRows = memberIds.map(studentId => ({
      group_id: newGroup.id,
      student_id: studentId,
      assigned_by: createdBy || null
    }));

    const { error: memErr } = await supabase
      .from('work_group_members')
      .insert(memberRows);

    if (memErr) {
      console.warn('Grupo creado pero ocurrió un error asignando integrantes:', memErr);
    }
  }

  return newGroup;
}

/**
 * Actualiza la información básica de un grupo de trabajo.
 */
export async function updateWorkGroup(groupId, { name, projectTopic, description }) {
  if (!groupId) throw new Error('ID de grupo requerido');

  const updates = {
    updated_at: new Date().toISOString()
  };
  if (name !== undefined) updates.name = name.trim();
  if (projectTopic !== undefined) updates.project_topic = projectTopic ? projectTopic.trim() : null;
  if (description !== undefined) updates.description = description ? description.trim() : null;

  const { data, error } = await supabase
    .from('work_groups')
    .update(updates)
    .eq('id', groupId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina un grupo de trabajo y sus dependencias.
 */
export async function deleteWorkGroup(groupId) {
  if (!groupId) throw new Error('ID de grupo requerido');
  const { error } = await supabase
    .from('work_groups')
    .delete()
    .eq('id', groupId);

  if (error) throw error;
  return true;
}

/**
 * Agrega uno o varios estudiantes a un grupo de trabajo.
 */
export async function addMembersToGroup(groupId, studentIds, assignedBy = null) {
  if (!groupId || !Array.isArray(studentIds) || studentIds.length === 0) return true;

  const memberRows = studentIds.map(sId => ({
    group_id: groupId,
    student_id: sId,
    assigned_by: assignedBy || null
  }));

  const { error } = await supabase
    .from('work_group_members')
    .insert(memberRows);

  if (error) throw error;
  return true;
}

/**
 * Remueve un estudiante de un grupo de trabajo.
 */
export async function removeMemberFromGroup(groupId, studentId) {
  if (!groupId || !studentId) throw new Error('ID de grupo y estudiante requeridos');

  const { error } = await supabase
    .from('work_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('student_id', studentId);

  if (error) throw error;
  return true;
}

/**
 * Sube o registra un material / entregable en un grupo de trabajo.
 * Soporta enlace web o archivo físico mediante Supabase Storage.
 */
export async function addGroupMaterial({
  groupId,
  uploadedBy,
  title,
  description = '',
  materialType = 'link',
  url = '',
  fileName = '',
  fileSize = null,
  provider = 'link',
  file = null
}) {
  if (!groupId || !title) throw new Error('Datos incompletos para guardar el entregable.');

  let finalUrl = url ? url.trim() : '';
  let finalFileName = fileName || '';
  let finalFileSize = fileSize;
  let finalProvider = provider;
  let finalType = materialType;

  // Si se adjuntó un archivo físico, intentar subirlo a Supabase Storage
  if (file) {
    finalFileName = file.name;
    finalFileSize = file.size;
    finalProvider = 'storage';
    
    // Deducir tipo
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') finalType = 'pdf';
    else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) finalType = 'archive';
    else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) finalType = 'document';
    else finalType = 'file';

    const safeName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const storagePath = `groups/${groupId}/${safeName}`;

    try {
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('work-group-materials')
        .upload(storagePath, file, { cacheControl: '3600', upsert: true });

      if (!uploadErr && uploadData?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('work-group-materials')
          .getPublicUrl(storagePath);
        finalUrl = publicUrlData?.publicUrl || storagePath;
      } else {
        console.warn('Aviso: Bucket work-group-materials no configurado o protegido, guardando referencia.');
        if (!finalUrl) {
          finalUrl = URL.createObjectURL(file);
        }
      }
    } catch (sErr) {
      console.warn('Error al subir a Supabase Storage:', sErr);
      if (!finalUrl) {
        throw new Error('No se pudo subir el archivo. Por favor proporciona un enlace web directo (Drive, Dropbox, etc.).');
      }
    }
  }

  // Deducir proveedor si es enlace
  if (!file && finalUrl) {
    const low = finalUrl.toLowerCase();
    if (low.includes('drive.google.com')) {
      finalProvider = 'drive';
      finalType = 'drive';
    } else if (low.includes('github.com')) {
      finalProvider = 'github';
      finalType = 'code';
    } else if (low.includes('figma.com') || low.includes('canva.com') || low.includes('miro.com')) {
      finalProvider = 'link';
      finalType = 'document';
    }
  }

  const payload = {
    group_id: groupId,
    uploaded_by: uploadedBy || null,
    title: title.trim(),
    description: description ? description.trim() : null,
    material_type: finalType,
    url: finalUrl,
    file_name: finalFileName || null,
    file_size: finalFileSize || null,
    provider: finalProvider
  };

  const { data, error } = await supabase
    .from('work_group_materials')
    .insert([payload])
    .select(`
      *,
      users_profile:uploaded_by (
        id,
        full_name,
        email
      )
    `)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina un material de grupo.
 */
export async function deleteGroupMaterial(materialId) {
  if (!materialId) throw new Error('ID de material requerido');
  const { error } = await supabase
    .from('work_group_materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
  return true;
}
