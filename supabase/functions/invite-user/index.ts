import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Lista cerrada de roles invitables. "admin" queda excluido deliberadamente.
const ALLOWED_ROLES = ["student", "teacher"];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Falta configurar el secreto SUPABASE_SERVICE_ROLE_KEY en el proyecto." }), { status: 500, headers: jsonHeaders });
    }

    // ── 1. Cliente Admin (service_role) ──────────────────────────────
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      serviceRoleKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // ── 2. Verificar autenticación del solicitante ────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autenticado." }), { status: 401, headers: jsonHeaders });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Token de sesion invalido o expirado." }), { status: 401, headers: jsonHeaders });
    }

    // ── 3. Verificar que el solicitante es admin ──────────────────────
    const { data: callerProfile } = await supabaseAdmin
      .from("users_profile")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Solo administradores pueden invitar usuarios." }), { status: 403, headers: jsonHeaders });
    }

    // ── 4. Validar y normalizar payload ──────────────────────────────
    const body = await req.json();
    const { email, full_name, role, area, bio } = body;

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "email, full_name y role son obligatorios." }), { status: 400, headers: jsonHeaders });
    }

    const emailNorm = String(email).trim().toLowerCase();
    const nameNorm  = String(full_name).trim();
    const roleNorm  = String(role).trim().toLowerCase();

    // Validar rol contra lista cerrada
    if (!ALLOWED_ROLES.includes(roleNorm)) {
      return new Response(JSON.stringify({ error: "Rol no permitido. Solo se puede invitar a 'student' o 'teacher'." }), { status: 400, headers: jsonHeaders });
    }

    if (nameNorm.length < 2 || nameNorm.length > 120) {
      return new Response(JSON.stringify({ error: "El nombre debe tener entre 2 y 120 caracteres." }), { status: 400, headers: jsonHeaders });
    }

    const siteUrl = Deno.env.get("SITE_URL") ?? "https://www.latier-unal.com";

    // ── 5. Verificar si ya existe un perfil con ese correo ────────────
    const { data: existingProfile } = await supabaseAdmin
      .from("users_profile")
      .select("id, is_active, role, invited_at")
      .eq("email", emailNorm)
      .maybeSingle();

    if (existingProfile) {
      // Usuario ya activo: informar al admin sin sobrescribir nada
      if (existingProfile.is_active) {
        return new Response(JSON.stringify({
          error: "Este correo ya corresponde a un usuario activo en la plataforma.",
          code: "USER_ALREADY_ACTIVE",
        }), { status: 409, headers: jsonHeaders });
      }

      // Usuario invitado pero no activado: reenviar invitación
      const { error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
        data: { full_name: nameNorm, role: roleNorm },
        redirectTo: `${siteUrl}/update-password`,
      });
      if (resendError) throw resendError;

      // Registrar la fecha del reenvío
      await supabaseAdmin
        .from("users_profile")
        .update({ invited_at: new Date().toISOString(), full_name: nameNorm })
        .eq("id", existingProfile.id);

      return new Response(JSON.stringify({
        success: true,
        resent: true,
        message: `Invitacion reenviada a ${emailNorm}. El usuario debe revisar su correo.`,
      }), { status: 200, headers: jsonHeaders });
    }

    // ── 6. Invitar usuario nuevo via Supabase Auth ────────────────────
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
      data: { full_name: nameNorm, role: roleNorm },
      redirectTo: `${siteUrl}/update-password`,
    });

    if (inviteError) throw inviteError;
    if (!inviteData.user) throw new Error("No se pudo crear la cuenta.");

    // ── 7. Crear users_profile en estado pendiente ────────────────────
    // is_active: false — se activa en UpdatePassword tras definir contraseña
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from("users_profile")
      .insert([{
        auth_user_id: inviteData.user.id,
        full_name: nameNorm,
        email: emailNorm,
        role: roleNorm,
        is_active: false,
        invited_at: new Date().toISOString(),
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    // ── 8. Si es profesor, crear teacher_profile ──────────────────────
    if (roleNorm === "teacher" && newProfile) {
      await supabaseAdmin.from("teacher_profiles").insert([{
        user_id: newProfile.id,
        name: nameNorm,
        area: area ? String(area).trim() : null,
        bio:  bio  ? String(bio).trim()  : null,
      }]);
    }

    return new Response(JSON.stringify({
      success: true,
      resent: false,
      message: `Invitacion enviada a ${emailNorm}. El usuario debe revisar su correo para crear su contrasena.`,
      user_id: newProfile.id,
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Mensajes seguros
    const safeMessage = message.includes("already registered")
      ? "Este correo ya esta registrado en el sistema."
      : message.includes("Unable to validate email address")
      ? "El formato del correo no es valido."
      : "Error interno: " + message;

    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500, headers: jsonHeaders
    });
  }
});
