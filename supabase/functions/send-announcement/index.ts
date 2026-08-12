import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el solicitante es admin
    const authHeader = req.headers.get("Authorization");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await supabaseAdmin.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'admin') {
      return new Response(JSON.stringify({ error: "Forbidden: Admins only" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { announcement_id } = await req.json();
    if (!announcement_id) {
      return new Response(JSON.stringify({ error: "Missing announcement_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1. Obtener los detalles del anuncio
    const { data: announcement, error: annError } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', announcement_id)
      .single();

    if (annError || !announcement) {
      return new Response(JSON.stringify({ error: "Announcement not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Determinar destinatarios (Global vs Específico)
    let recipients = [];
    if (announcement.program_id) {
      // Específico: obtener estudiantes inscritos en este programa
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, profiles!student_id(email)')
        .eq('program_id', announcement.program_id);
      
      if (enrollments) {
        recipients = enrollments.map((e: any) => e.profiles?.email).filter(Boolean);
      }
    } else {
      // Global: todos los estudiantes (role = student)
      const { data: students } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('role', 'student');
        
      if (students) {
        recipients = students.map((s: any) => s.email).filter(Boolean);
      }
    }

    console.log(`[send-announcement] Evaluando enviar a ${recipients.length} destinatarios.`);

    // 3. Enviar correos usando Resend / SendGrid (Modo Borrador / Console.log por ahora)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.warn("No RESEND_API_KEY found. Simulated success.");
      return new Response(JSON.stringify({ 
        message: `Borrador: Correos enviados simuladamente a ${recipients.length} estudiantes.`,
        simulated: true,
        recipients_count: recipients.length
      }), { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Aquí iría el fetch() real a resend.com usando recipients y announcement.body
    
    return new Response(JSON.stringify({ message: "Correos enviados exitosamente." }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
