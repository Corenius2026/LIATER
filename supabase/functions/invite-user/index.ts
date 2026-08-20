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
      return new Response(JSON.stringify({ error: "Token de sesión inválido o expirado." }), { status: 401, headers: jsonHeaders });
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
      let resendSuccessful = false;
      const { data: resendData, error: resendError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
        data: { full_name: nameNorm, role: roleNorm },
        redirectTo: `${siteUrl}/update-password`,
      });

      if (!resendError) {
        resendSuccessful = true;
      } else {
        console.warn(`[invite-user] Reenvío directo falló para ${emailNorm} (${resendError.message}). Limpiando auth.users para re-invitar limpiamente...`);
        // Si el usuario ya estaba en auth.users (ej. link anterior expirado o confirmado parcialmente):
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const existingAuthUser = listData?.users?.find(u => u.email?.toLowerCase() === emailNorm);
        
        if (existingAuthUser) {
          // 1. Desvincular temporalmente auth_user_id para evitar que ON DELETE CASCADE de PostgreSQL borre users_profile
          await supabaseAdmin
            .from("users_profile")
            .update({ auth_user_id: null })
            .eq("id", existingProfile.id);

          // 2. Eliminar el usuario obsoleto en auth.users
          await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
          
          // 3. Crear nueva invitación limpia
          const { data: retryData, error: retryErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
            data: { full_name: nameNorm, role: roleNorm },
            redirectTo: `${siteUrl}/update-password`,
          });
          
          if (retryErr) throw retryErr;
          
          if (retryData?.user?.id) {
            // 4. Vincular el nuevo auth_user_id en users_profile
            await supabaseAdmin
              .from("users_profile")
              .update({
                auth_user_id: retryData.user.id,
                invited_at: new Date().toISOString(),
                full_name: nameNorm,
              })
              .eq("id", existingProfile.id);
            
            resendSuccessful = true;
          }
        } else {
          throw resendError;
        }
      }

      if (resendSuccessful) {
        // Registrar la fecha del reenvío
        await supabaseAdmin
          .from("users_profile")
          .update({ invited_at: new Date().toISOString(), full_name: nameNorm })
          .eq("id", existingProfile.id);

        return new Response(JSON.stringify({
          success: true,
          resent: true,
          message: `Invitación reenviada a ${emailNorm}. El usuario debe revisar su correo.`,
        }), { status: 200, headers: jsonHeaders });
      }
    }

    // ── 6. Invitar usuario nuevo via Supabase Auth (con manejo de cuentas huérfanas) ──
    let createdAuthUser = null;
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
      data: { full_name: nameNorm, role: roleNorm },
      redirectTo: `${siteUrl}/update-password`,
    });

    if (inviteError) {
      const errMsg = inviteError.message || "";
      // Si el correo ya existía en auth.users (pero no en users_profile porque fue eliminado previamente):
      if (errMsg.toLowerCase().includes("already") || errMsg.toLowerCase().includes("registered")) {
        console.warn(`[invite-user] Cuenta huérfana en auth.users detectada para ${emailNorm}. Limpiando y re-creando...`);
        
        // Localizar el id en auth.users
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const orphanUser = listData?.users?.find(u => u.email?.toLowerCase() === emailNorm);
        
        if (orphanUser) {
          await supabaseAdmin.auth.admin.deleteUser(orphanUser.id);
          
          // Reintentar invitación limpia
          const { data: retryData, error: retryErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(emailNorm, {
            data: { full_name: nameNorm, role: roleNorm },
            redirectTo: `${siteUrl}/update-password`,
          });
          
          if (retryErr) throw retryErr;
          createdAuthUser = retryData?.user;
        } else {
          throw inviteError;
        }
      } else {
        throw inviteError;
      }
    } else {
      createdAuthUser = inviteData?.user;
    }

    if (!createdAuthUser) {
      throw new Error("No se pudo inicializar la cuenta de autenticación.");
    }

    // ── 7. Crear users_profile en estado pendiente ────────────────────
    // is_active: false — se activa en UpdatePassword tras definir contraseña
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from("users_profile")
      .insert([{
        auth_user_id: createdAuthUser.id,
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
      message: `Invitación enviada a ${emailNorm}. El usuario debe revisar su correo para crear su contraseña.`,
      user_id: newProfile.id,
    }), { status: 200, headers: jsonHeaders });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // Mensajes seguros
    const safeMessage = message.includes("already registered")
      ? "Este correo ya está registrado en el sistema."
      : message.includes("Unable to validate email address")
      ? "El formato del correo no es válido."
      : "Error interno: " + message;

    return new Response(JSON.stringify({ error: safeMessage }), {
      status: 500, headers: jsonHeaders
    });
  }
});
