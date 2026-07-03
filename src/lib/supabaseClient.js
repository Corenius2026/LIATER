/**
 * Módulo: supabaseClient.js
 * 
 * Archivo centralizado para la conexión con Supabase.
 * Todas las páginas y servicios del proyecto deben importar
 * el cliente desde este archivo (nunca crear instancias directas).
 *
 * Variables de entorno requeridas en el archivo .env:
 *   VITE_SUPABASE_URL      — URL del proyecto Supabase
 *   VITE_SUPABASE_ANON_KEY — Clave pública anónima de Supabase
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    '[Supabase] Faltan las variables de entorno.\n' +
    'Copia .env.example a .env y rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
