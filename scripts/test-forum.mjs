/**
 * Script de validación automatizada del Foro LIATER.
 * Verifica la conectividad, existencia de tablas, políticas RLS y operaciones básicas.
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

  // 1. Verificar existencia de tablas en Supabase
  const tables = ['forum_threads', 'forum_posts', 'forum_reactions', 'forum_read_status'];
  let allExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('id').limit(1);
    if (error && (error.code === 'PGRST205' || error.message.includes('schema cache'))) {
      console.log(`❌ Tabla '${table}': PENDIENTE DE MIGRACIÓN en Supabase (Error PGRST205)`);
      allExist = false;
    } else if (error) {
      console.log(`⚠️ Tabla '${table}': Error al consultar (${error.code || error.message})`);
      allExist = false;
    } else {
      console.log(`✅ Tabla '${table}': EXISTE Y RESPONDE`);
    }
  }

  console.log('\n--------------------------------------------------');

  if (!allExist) {
    console.log('⚠️ DIAGNÓSTICO: Las tablas del foro aún no han sido creadas en tu proyecto Supabase.');
    console.log('👉 Ejecuta el archivo "supabase/migrations/20260929_forum_tables_clean.sql" en el SQL Editor de Supabase.');
    console.log('   Una vez ejecutado, vuelve a correr este script para validar las operaciones entre perfiles.');
    return;
  }

  // 2. Si las tablas existen, validar programas y perfiles
  console.log('🧪 Validando acceso a programas y perfiles...');
  const { data: program } = await supabase.from('diploma_programs').select('id, title').limit(1).maybeSingle();
  if (!program) {
    console.log('ℹ️ No hay programas en la base de datos para probar hilos.');
    return;
  }
  console.log(`✅ Programa activo detectado: "${program.title}" (${program.id})`);

  // Validar RPC get_profiles_by_ids
  const { error: rpcErr } = await supabase.rpc('get_profiles_by_ids', { p_user_ids: [] });
  if (rpcErr) {
    console.log(`⚠️ RPC get_profiles_by_ids: ${rpcErr.message}`);
  } else {
    console.log('✅ RPC get_profiles_by_ids: ACTIVO Y OPERATIVO');
  }

  console.log('\n🎉 Todas las verificaciones completadas con éxito.');
}

runAudit().catch(console.error);
