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
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el proyecto." }),
        { status: 500, headers: jsonHeaders }
      );
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
      return new Response(
        JSON.stringify({ error: "No autenticado." }),
        { status: 401, headers: jsonHeaders }
      );
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Token de sesión inválido o expirado." }),
        { status: 401, headers: jsonHeaders }
      );
    }

    // ── 3. Verificar que el solicitante es admin ──────────────────────
    const { data: callerProfile } = await supabaseAdmin
      .from("users_profile")
      .select("id, role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Solo administradores pueden eliminar usuarios." }),
        { status: 403, headers: jsonHeaders }
      );
    }

    // ── 4. Validar payload ───────────────────────────────────────────
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "El parámetro user_id es obligatorio." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    // ── 5. Obtener perfil del usuario a eliminar ─────────────────────
    const { data: targetProfile, error: targetErr } = await supabaseAdmin
      .from("users_profile")
      .select("id, auth_user_id, email, full_name, role, is_active")
      .eq("id", user_id)
      .maybeSingle();

    if (targetErr || !targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuario no encontrado en users_profile." }),
        { status: 404, headers: jsonHeaders }
      );
    }

    // ── 6. Impedir auto-eliminación ──────────────────────────────────
    if (targetProfile.auth_user_id === user.id || targetProfile.id === callerProfile.id) {
      return new Response(
        JSON.stringify({ error: "Por seguridad, no puedes eliminar tu propia cuenta de administrador." }),
        { status: 400, headers: jsonHeaders }
      );
    }

    console.log(`[delete-user] Iniciando eliminación del usuario ${targetProfile.email} (${targetProfile.id})`);

    // ── 7. Limpieza en cascada según el rol ───────────────────────────
    if (targetProfile.role === "student") {
      // Borrar registros de actividad del estudiante
      await supabaseAdmin.from("activity_attempts").delete().eq("student_id", targetProfile.id);
      await supabaseAdmin.from("quiz_submissions").delete().eq("student_id", targetProfile.id);
      await supabaseAdmin.from("assignment_submissions").delete().eq("student_id", targetProfile.id);
      await supabaseAdmin.from("class_doubts").delete().eq("student_id", targetProfile.id);
      await supabaseAdmin.from("enrollments").delete().eq("student_id", targetProfile.id);
    } else if (targetProfile.role === "teacher") {
      // Obtener teacher_profile si existe
      const { data: teacherProf } = await supabaseAdmin
        .from("teacher_profiles")
        .select("id")
        .eq("user_id", targetProfile.id)
        .maybeSingle();

      const teacherProfId = teacherProf?.id;

      // Desvincular de class_sessions para no borrar las grabaciones/clases del diplomado
      if (teacherProfId) {
        await supabaseAdmin
          .from("class_sessions")
          .update({ teacher_id: null })
          .eq("teacher_id", teacherProfId);
      }
      await supabaseAdmin
        .from("class_sessions")
        .update({ teacher_id: null })
        .eq("teacher_id", targetProfile.id);

      // Desvincular de revisiones IA
      await supabaseAdmin
        .from("activity_drafts")
        .update({ reviewed_by: null })
        .eq("reviewed_by", targetProfile.id);

      await supabaseAdmin
        .from("activity_generation_jobs")
        .update({ requested_by: null })
        .eq("requested_by", targetProfile.id);

      // Borrar teacher_profile
      await supabaseAdmin.from("teacher_profiles").delete().eq("user_id", targetProfile.id);
    }

    // ── 8. Borrar users_profile ──────────────────────────────────────
    const { error: profileDelErr } = await supabaseAdmin
      .from("users_profile")
      .delete()
      .eq("id", targetProfile.id);

    if (profileDelErr) {
      console.error("[delete-user] Error al eliminar users_profile:", profileDelErr);
      return new Response(
        JSON.stringify({ error: `Error al eliminar el perfil: ${profileDelErr.message}` }),
        { status: 500, headers: jsonHeaders }
      );
    }

    // ── 9. Borrar de auth.users si existe auth_user_id ────────────────
    if (targetProfile.auth_user_id) {
      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(targetProfile.auth_user_id);
      if (authDelErr) {
        console.warn("[delete-user] Nota: No se pudo eliminar en auth.users (posiblemente ya no existía):", authDelErr.message);
      }
    }

    console.log(`[delete-user] Usuario ${targetProfile.email} eliminado exitosamente`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `El usuario ${targetProfile.full_name || targetProfile.email} ha sido eliminado definitivamente.`,
        deleted_user: {
          id: targetProfile.id,
          email: targetProfile.email,
          full_name: targetProfile.full_name,
          role: targetProfile.role
        }
      }),
      { status: 200, headers: jsonHeaders }
    );
  } catch (err: any) {
    console.error("[delete-user] Error no controlado:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Error interno al procesar la eliminación." }),
      { status: 500, headers: jsonHeaders }
    );
  }
});
