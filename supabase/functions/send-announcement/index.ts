import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verificar que el solicitante es admin o teacher
    const authHeader = req.headers.get("Authorization");
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader ?? "" } } }
    );
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), { status: 401, headers: jsonHeaders });
    }

    const { data: profile } = await supabaseAdmin
      .from('users_profile')
      .select('role')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'teacher')) {
      return new Response(JSON.stringify({ error: "Permiso denegado: solo administradores y docentes pueden difundir anuncios" }), { status: 403, headers: jsonHeaders });
    }

    const body = await req.json();
    const { announcement_id } = body;
    if (!announcement_id) {
      return new Response(JSON.stringify({ error: "Falta el parámetro announcement_id" }), { status: 400, headers: jsonHeaders });
    }

    // 1. Obtener los detalles del anuncio
    const { data: announcement, error: annError } = await supabaseAdmin
      .from('announcements')
      .select('*, diploma_programs(title)')
      .eq('id', announcement_id)
      .single();

    if (annError || !announcement) {
      return new Response(JSON.stringify({ error: "Anuncio no encontrado" }), { status: 404, headers: jsonHeaders });
    }

    // 2. Determinar destinatarios (Global vs Específico)
    let recipients: string[] = [];
    if (announcement.program_id) {
      // Específico: obtener estudiantes inscritos en este programa
      const { data: enrollments } = await supabaseAdmin
        .from('enrollments')
        .select('student_id, users_profile!student_id(email)')
        .eq('program_id', announcement.program_id);
      
      if (enrollments) {
        recipients = enrollments
          .map((e: any) => e.users_profile?.email)
          .filter((email: string | undefined): email is string => Boolean(email && email.includes('@')));
      }
    } else {
      // Global: todos los estudiantes (role = student)
      const { data: students } = await supabaseAdmin
        .from('users_profile')
        .select('email')
        .eq('role', 'student')
        .eq('is_active', true);
        
      if (students) {
        recipients = students
          .map((s: any) => s.email)
          .filter((email: string | undefined): email is string => Boolean(email && email.includes('@')));
      }
    }

    // Filtrar duplicados
    recipients = Array.from(new Set(recipients));

    console.log(`[send-announcement] Evaluando enviar anuncio '${announcement.title}' a ${recipients.length} destinatarios.`);

    if (recipients.length === 0) {
      return new Response(JSON.stringify({ 
        message: "No hay destinatarios registrados para este anuncio.",
        recipients_count: 0
      }), { status: 200, headers: jsonHeaders });
    }

    // 3. Enviar correos usando Resend API
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") ?? "LIATER <notificaciones@liater.edu.co>";
    const SITE_URL = Deno.env.get("SITE_URL") ?? "https://www.latier-unal.com";

    if (!RESEND_API_KEY) {
      console.warn("[send-announcement] No se encontró RESEND_API_KEY en los secretos. Modo simulado activado.");
      return new Response(JSON.stringify({ 
        message: `Aviso registrado. Notificación simulada para ${recipients.length} destinatarios (falta configurar RESEND_API_KEY).`,
        simulated: true,
        recipients_count: recipients.length
      }), { status: 200, headers: jsonHeaders });
    }

    const programTitle = announcement.diploma_programs?.title || "Aviso General";
    const emailHtml = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #0b1528; color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1);">
        <div style="background: linear-gradient(135deg, #091326 0%, #172c54 100%); padding: 30px 24px; text-align: center; border-bottom: 2px solid #00f0ff;">
          <h1 style="color: #00f0ff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 1px;">LIATER</h1>
          <p style="color: rgba(255,255,255,0.7); margin: 6px 0 0; font-size: 13px; text-transform: uppercase;">${programTitle}</p>
        </div>
        <div style="padding: 30px 24px; background-color: #0d1b33;">
          <h2 style="color: #ffffff; margin-top: 0; font-size: 18px; line-height: 1.4;">${announcement.title}</h2>
          <div style="color: rgba(255,255,255,0.85); font-size: 14px; line-height: 1.6; white-space: pre-wrap; margin: 20px 0;">
            ${announcement.body}
          </div>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${SITE_URL}/portal" style="display: inline-block; background: linear-gradient(135deg, #00f0ff 0%, #0077ff 100%); color: #050c1a; text-decoration: none; font-weight: 700; padding: 12px 28px; border-radius: 8px; font-size: 14px;">
              Ingresar a la Plataforma
            </a>
          </div>
        </div>
        <div style="padding: 16px; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); border-top: 1px solid rgba(255,255,255,0.05);">
          © ${new Date().getFullYear()} LIATER — Plataforma de Formación Especializada.
        </div>
      </div>
    `;

    // Resend Batch sending (máximo 100 por batch o en bucle seguro)
    const BATCH_SIZE = 50;
    let sentCount = 0;
    let errorsCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      const emailPayloads = batch.map(toEmail => ({
        from: SENDER_EMAIL,
        to: [toEmail],
        subject: `[LIATER] ${announcement.title}`,
        html: emailHtml,
      }));

      const resendResponse = await fetch("https://api.resend.com/emails/batch", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayloads),
      });

      if (resendResponse.ok) {
        sentCount += batch.length;
      } else {
        const resendErr = await resendResponse.text();
        console.error("[send-announcement] Error en lote de Resend:", resendErr);
        errorsCount += batch.length;
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: `Correos procesados. Enviados: ${sentCount}, Fallidos: ${errorsCount}.`,
      sent_count: sentCount,
      errors_count: errorsCount,
      total_recipients: recipients.length
    }), { status: 200, headers: jsonHeaders });

  } catch (error) {
    console.error("[send-announcement] Error interno:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), { 
      status: 500, 
      headers: jsonHeaders 
    });
  }
});
