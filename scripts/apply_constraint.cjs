// Script para aplicar constraint UNIQUE en class_activities via Supabase REST API
// Usa la service_role key o la anon key con permisos de ejecucion de SQL

const SUPABASE_URL = 'https://dbxkmasucybamylpkndm.supabase.co';
const ANON_KEY = 'sb_publishable_CytIgWrFP00vZJDeBHrxtg_Zmuc4U7k';

async function applyConstraint() {
  // Intentar via REST API /rpc (funcion sql si existe)
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'class_activities_class_id_unique'
      ) THEN
        ALTER TABLE class_activities ADD CONSTRAINT class_activities_class_id_unique UNIQUE (class_id);
        RAISE NOTICE 'Constraint creado correctamente';
      ELSE
        RAISE NOTICE 'Constraint ya existe';
      END IF;
    END $$;
  `;

  console.log('Intentando aplicar constraint via Supabase RPC...');
  
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': ANON_KEY,
      'Authorization': `Bearer ${ANON_KEY}`
    },
    body: JSON.stringify({ sql })
  });

  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);

  if (!res.ok) {
    console.log('\nNota: La anon_key no tiene permisos para DDL.');
    console.log('Se necesita service_role key o ejecutar en el SQL Editor de Supabase Dashboard.');
    console.log('\nSQL a ejecutar:');
    console.log(sql);
  }
}

applyConstraint().catch(console.error);
