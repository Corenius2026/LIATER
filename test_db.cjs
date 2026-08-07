const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const env = fs.readFileSync('.env', 'utf-8');
const url = env.match(/VITE_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/VITE_SUPABASE_ANON_KEY=(.*)/)[1].trim();

const sb = createClient(url, key);

async function check() {
  const { data, error } = await sb.from('diploma_programs').select('meet_url').limit(1);
  console.log("Data:", data);
  if (error) console.log("Error:", error.message);
}
check();
