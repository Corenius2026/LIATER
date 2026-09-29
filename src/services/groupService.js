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
 * Obtiene perfiles de usuarios de forma segura y tolerante a fallos.
 * Intenta primero mediante la función RPC 'get_profiles_by_ids' (que cuenta con SECURITY DEFINER
 * para permitir que los estudiantes vean los nombres, emails y teléfonos de sus compañeros de grupo sin
 * ser bloqueados por el RLS de users_profile). Si la función no existe o faltan registros, recurre a select directo.
 */
export async function fetchProfilesSafe(userIds) {
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) return new Map();
  const cleanIds = [...new Set(userIds.filter(Boolean))];
  if (cleanIds.length === 0) return new Map();

  const profilesMap = new Map();

  // 1. Intento con función RPC SECURITY DEFINER (elude bloqueo de RLS entre estudiantes)
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_profiles_by_ids', {
      p_user_ids: cleanIds
    });

    if (!rpcErr && Array.isArray(rpcData) && rpcData.length > 0) {
      rpcData.forEach(p => {
        if (p && p.id) {
          profilesMap.set(p.id, p);
        }
      });

      // Si obtuvimos todos los perfiles requeridos, retornamos
      if (profilesMap.size === cleanIds.length) {
        return profilesMap;
      }
    }
  } catch (e) {
    // Si la función RPC no existe en la base de datos aún, continuamos con select directo
  }

  // 2. Consulta directa sobre users_profile (para roles admin/teacher o si la política RLS está activa)
  try {
    const missingIds = cleanIds.filter(id => !profilesMap.has(id));
    if (missingIds.length > 0) {
      const { data: directProfiles, error: directErr } = await supabase
        .from('users_profile')
        .select('id, full_name, email, role, phone')
        .in('id', missingIds);

      if (!directErr && Array.isArray(directProfiles)) {
        directProfiles.forEach(p => {
          if (p && p.id) {
            profilesMap.set(p.id, p);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Aviso en consulta directa de perfiles:', e);
  }

  return profilesMap;
}

/**
 * Obtiene todos los grupos de trabajo de un programa con sus integrantes y materiales.
 */
export async function getProgramWorkGroups(programId) {
  if (!programId) return { data: [], tableExists: true, error: null };
  const cleanId = decodeURIComponent(String(programId || '')).trim();

  try {
    // 1. Obtener grupos del programa de forma directa
    const { data: groups, error: groupsErr } = await supabase
      .from('work_groups')
      .select('*')
      .eq('program_id', cleanId)
      .order('created_at', { ascending: true });

    if (groupsErr) {
      if (isTableMissingError(groupsErr)) {
        return { data: [], tableExists: false, error: 'Tabla work_groups no creada aún en la base de datos.' };
      }
      throw groupsErr;
    }

    if (!groups || groups.length === 0) {
      return { data: [], tableExists: true, error: null };
    }

    const groupIds = groups.map(g => g.id);

    // 2. Obtener miembros de estos grupos
    let members = [];
    try {
      const { data: memData, error: memErr } = await supabase
        .from('work_group_members')
        .select('*')
        .in('group_id', groupIds);
      if (memErr) console.warn('Aviso al obtener miembros:', memErr);
      members = memData || [];
    } catch (e) {
      console.warn('Excepción al obtener miembros:', e);
    }

    // 3. Obtener materiales de estos grupos
    let materials = [];
    try {
      const { data: matData, error: matErr } = await supabase
        .from('work_group_materials')
        .select('*')
        .in('group_id', groupIds)
        .order('created_at', { ascending: false });
      if (matErr) console.warn('Aviso al obtener materiales:', matErr);
      materials = matData || [];
    } catch (e) {
      console.warn('Excepción al obtener materiales:', e);
    }

    // 4. Obtener perfiles de los usuarios involucrados
    const allUserIds = [
      ...new Set([
        ...members.map(m => m.student_id),
        ...materials.map(m => m.uploaded_by)
      ].filter(Boolean))
    ];

    const profilesMap = await fetchProfilesSafe(allUserIds);

    // 5. Ensamblar estructura completa de cada grupo
    const membersByGroup = new Map();
    members.forEach(m => {
      if (!membersByGroup.has(m.group_id)) membersByGroup.set(m.group_id, []);
      membersByGroup.get(m.group_id).push({
        ...m,
        users_profile: profilesMap.get(m.student_id) || { id: m.student_id, full_name: 'Estudiante', email: '' }
      });
    });

    const materialsByGroup = new Map();
    materials.forEach(mat => {
      if (!materialsByGroup.has(mat.group_id)) materialsByGroup.set(mat.group_id, []);
      materialsByGroup.get(mat.group_id).push({
        ...mat,
        users_profile: profilesMap.get(mat.uploaded_by) || { id: mat.uploaded_by, full_name: 'Miembro' }
      });
    });

    const enrichedGroups = groups.map(g => ({
      ...g,
      work_group_members: membersByGroup.get(g.id) || [],
      work_group_materials: materialsByGroup.get(g.id) || []
    }));

    return { data: enrichedGroups, tableExists: true, error: null };
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
  const cleanId = decodeURIComponent(String(programId || '')).trim();

  try {
    // 1. Buscar membresía del estudiante en cualquier grupo
    const { data: memberRecords, error: memErr } = await supabase
      .from('work_group_members')
      .select('group_id')
      .eq('student_id', studentId);

    if (memErr) {
      if (isTableMissingError(memErr)) {
        return { data: null, tableExists: false, error: 'Tabla work_groups no disponible' };
      }
      throw memErr;
    }

    if (!memberRecords || memberRecords.length === 0) {
      return { data: null, tableExists: true, error: null };
    }

    const groupIds = memberRecords.map(m => m.group_id);

    // 2. Traer el grupo que pertenece a este program_id
    const { data: matchedGroups, error: groupErr } = await supabase
      .from('work_groups')
      .select('*')
      .in('id', groupIds)
      .eq('program_id', cleanId);

    if (groupErr) throw groupErr;
    if (!matchedGroups || matchedGroups.length === 0) {
      return { data: null, tableExists: true, error: null };
    }

    const targetGroup = matchedGroups[0];

    // 3. Traer los miembros del grupo
    let groupMembers = [];
    try {
      const { data: memData } = await supabase
        .from('work_group_members')
        .select('*')
        .eq('group_id', targetGroup.id);
      groupMembers = memData || [];
    } catch {}

    // 4. Traer los materiales del grupo
    let groupMaterials = [];
    try {
      const { data: matData } = await supabase
        .from('work_group_materials')
        .select('*')
        .eq('group_id', targetGroup.id)
        .order('created_at', { ascending: false });
      groupMaterials = matData || [];
    } catch {}

    // 5. Perfiles
    const userIds = [
      ...new Set([
        ...groupMembers.map(m => m.student_id),
        ...groupMaterials.map(m => m.uploaded_by)
      ].filter(Boolean))
    ];

    const profilesMap = await fetchProfilesSafe(userIds);

    const enrichedMembers = groupMembers.map(m => ({
      ...m,
      users_profile: profilesMap.get(m.student_id) || { id: m.student_id, full_name: 'Estudiante', email: '' }
    }));

    const enrichedMaterials = groupMaterials.map(m => ({
      ...m,
      users_profile: profilesMap.get(m.uploaded_by) || { id: m.uploaded_by, full_name: 'Miembro' }
    }));

    return {
      data: {
        ...targetGroup,
        work_group_members: enrichedMembers,
        work_group_materials: enrichedMaterials
      },
      tableExists: true,
      error: null
    };
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
  const cleanProgramId = decodeURIComponent(String(programId || '')).trim();

  const { data: newGroup, error: groupErr } = await supabase
    .from('work_groups')
    .insert([{
      program_id: cleanProgramId,
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
 * Guarda los archivos físicos directamente en la carpeta general de Google Drive del curso
 * a través de la función del sistema 'upload-pdf-drive'.
 */
export async function addGroupMaterial({
  groupId,
  programId = null,
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

  // Si se adjuntó un archivo físico, subir a la carpeta general de Google Drive del curso
  if (file) {
    finalFileName = file.name;
    finalFileSize = file.size;
    finalProvider = 'drive';

    // Deducir tipo
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'pdf') finalType = 'pdf';
    else if (['zip', 'rar', 'tar', 'gz', '7z'].includes(ext)) finalType = 'archive';
    else if (['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx'].includes(ext)) finalType = 'document';
    else finalType = 'file';

    // Resolver program_id y nombre del grupo si no fueron provistos
    let resolvedProgramId = programId;
    let resolvedGroupName = '';
    if (!resolvedProgramId || !resolvedGroupName) {
      try {
        const { data: g } = await supabase
          .from('work_groups')
          .select('program_id, name')
          .eq('id', groupId)
          .maybeSingle();
        if (g) {
          if (!resolvedProgramId) resolvedProgramId = g.program_id;
          resolvedGroupName = g.name || '';
        }
      } catch (err) {
        console.warn('Aviso obteniendo datos del grupo para subida:', err);
      }
    }

    if (!resolvedProgramId) {
      throw new Error('No se pudo identificar el programa/curso asociado al grupo para guardar el archivo.');
    }

    const cleanProgramId = decodeURIComponent(String(resolvedProgramId || '')).trim();

    // Invocar Edge Function para subir a la carpeta general de Google Drive del curso
    const formData = new FormData();
    formData.append('file', file);
    formData.append('programId', cleanProgramId);
    formData.append('classId', 'general'); // Carpeta general de Google Drive del curso
    formData.append('resourceType', 'file');
    formData.append('allowDownload', 'true');
    const groupPrefix = resolvedGroupName ? `[${resolvedGroupName}]` : '[Grupo]';
    formData.append('customTitle', `${groupPrefix} ${title.trim()}`);

    const { data: driveData, error: driveErr } = await supabase.functions.invoke('upload-pdf-drive', {
      body: formData
    });

    if (driveErr) {
      let msg = driveErr.message;
      try {
        if (driveErr.context && typeof driveErr.context.json === 'function') {
          const body = await driveErr.context.json();
          if (body?.error) msg = body.error;
        }
      } catch (_) {}
      throw new Error(msg || 'Error al subir archivo a la carpeta general del curso en Google Drive.');
    }

    if (driveData?.error) {
      throw new Error(driveData.error);
    }

    finalUrl = driveData?.previewUrl || (driveData?.driveFileId ? `https://drive.google.com/file/d/${driveData.driveFileId}/preview` : '');
    if (!finalUrl) {
      throw new Error('Google Drive no devolvió un enlace válido para el archivo subido.');
    }

    // Para evitar que el archivo de trabajo del grupo aparezca en la lista general de recursos de clase,
    // limpiamos el registro creado automáticamente en resources
    if (driveData?.resource?.id) {
      try {
        await supabase.from('resources').delete().eq('id', driveData.resource.id);
      } catch (_) {}
    }
  }

  // Deducir proveedor si es enlace web
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
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

/**
 * Elimina un material de grupo y remueve su archivo de Google Drive si fue subido allí.
 */
export async function deleteGroupMaterial(materialId) {
  if (!materialId) throw new Error('ID de material requerido');

  // Intentar eliminar de Google Drive si fue subido allí
  try {
    const { data: mat } = await supabase
      .from('work_group_materials')
      .select('url, provider')
      .eq('id', materialId)
      .maybeSingle();

    if (mat && (mat.provider === 'drive' || mat.url?.includes('drive.google.com'))) {
      try {
        await supabase.functions.invoke('upload-pdf-drive', {
          body: { action: 'delete', fileUrl: mat.url }
        });
      } catch (dErr) {
        console.warn('Aviso al eliminar de Google Drive:', dErr);
      }
    }
  } catch (_) {}

  const { error } = await supabase
    .from('work_group_materials')
    .delete()
    .eq('id', materialId);

  if (error) throw error;
  return true;
}
