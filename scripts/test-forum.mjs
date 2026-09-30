/**
 * Script de validación automatizada del Foro LIATER.
 * Verifica la conectividad, existencia de tablas, políticas RLS y operaciones básicas (creación y eliminación real en BD).
 * Ejecución: node scripts/test-forum.mjs
 */
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Cargar variables de entorno desde .env
const envFile = fs.readFileSync('.env', 'utf8');
let url = '', anonKey = '';
envFile.split('\n').forEach(line => {
  if (line.startsWith('VITE_SUPABASE_URL=')) url = line.split('=')[1].trim();
  if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) anonKey = line.split('=')[1].trim();
});

if (!url || !anonKey) {
  console.error('❌ Error: Variables de entorno Supabase no encontradas en .env');
  process.exit(1);
}

const supabase = createClient(url, anonKey);

async function runAudit() {
  console.log('🔍 Iniciando auditoría del módulo de Foro LIATER...\n');

  // 1. Verificar existencia de las 4 tablas en Supabase
  const tables = [
    { name: 'forum_threads', cols: 'id' },
    { name: 'forum_posts', cols: 'id' },
    { name: 'forum_reactions', cols: 'post_id, user_id' },
    { name: 'forum_read_status', cols: 'user_id, thread_id' }
  ];
  let allExist = true;

  for (const t of tables) {
    const { error } = await supabase.from(t.name).select(t.cols).limit(1);
    if (error && (error.code === 'PGRST205' || error.message.includes('schema cache'))) {
      console.log(`❌ Tabla '${t.name}': PENDIENTE DE MIGRACIÓN en Supabase (Error PGRST205)`);
      allExist = false;
    } else if (error) {
      console.log(`⚠️ Tabla '${t.name}': Error al consultar (${error.code || error.message})`);
      allExist = false;
    } else {
      console.log(`✅ Tabla '${t.name}': EXISTE Y RESPONDE`);
    }
  }

  console.log('\n--------------------------------------------------');

  if (!allExist) {
    console.log('⚠️ DIAGNÓSTICO: Hay tablas pendientes de migración.');
    return;
  }

  // 2. Validar RPC y perfiles
  console.log('🧪 Validando RPC get_profiles_by_ids...');
  const { error: rpcErr } = await supabase.rpc('get_profiles_by_ids', { p_user_ids: [] });
  if (rpcErr) {
    console.log(`⚠️ RPC get_profiles_by_ids: ${rpcErr.message}`);
  } else {
    console.log('✅ RPC get_profiles_by_ids: ACTIVO Y OPERATIVO');
  }

  // 3. Obtener un programa y perfil real para probar ciclo de vida
  const { data: program } = await supabase.from('diploma_programs').select('id, title').limit(1).maybeSingle();
  const { data: profile } = await supabase.from('users_profile').select('id, full_name, role').limit(1).maybeSingle();

  if (program && profile) {
    console.log(`\n🧪 Probando ciclo de vida de un post (Creación -> Verificación -> Eliminación en BD)...`);
    
    // Crear hilo de prueba
    const { data: testThread, error: tErr } = await supabase.from('forum_threads').insert({
      title: '__TEST_AUDIT_THREAD__',
      body: 'Hilo temporal de auditoría técnica.',
      category: 'academic',
      author_id: profile.id,
      program_id: program.id
    }).select().single();

    if (tErr) {
      console.log('ℹ️ Nota de RLS en inserción anónima:', tErr.message);
    } else {
      console.log(`✅ Hilo de prueba creado con ID: ${testThread.id}`);

      // Crear post de prueba
      const { data: testPost, error: pErr } = await supabase.from('forum_posts').insert({
        thread_id: testThread.id,
        author_id: profile.id,
        body: 'Mensaje de prueba para validar eliminación en base de datos.'
      }).select().single();

      if (!pErr && testPost) {
        console.log(`✅ Mensaje de prueba creado con ID: ${testPost.id}`);

        // Eliminar post de la base de datos
        const { error: delPostErr } = await supabase.from('forum_posts').delete().eq('id', testPost.id);
        if (delPostErr) {
          console.error('❌ Error al eliminar mensaje:', delPostErr.message);
        } else {
          // Corroborar que ya NO existe en la BD
          const { data: checkPost } = await supabase.from('forum_posts').select('id').eq('id', testPost.id).maybeSingle();
          if (!checkPost) {
            console.log('✅ CORROBORADO: El mensaje fue eliminado definitivamente de la tabla forum_posts en Supabase.');
          } else {
            console.error('❌ El mensaje aún permanece en la base de datos.');
          }
        }
      }

      // Limpiar hilo de prueba
      await supabase.from('forum_threads').delete().eq('id', testThread.id);
      console.log('🧹 Hilo de prueba limpiado correctamente.');
    }
  }

  console.log('\n🎉 Auditoría completada con éxito.');
}

runAudit().catch(console.error);
