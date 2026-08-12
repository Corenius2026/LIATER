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
    // Admin client con service_role
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
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data: profile } = await supabaseAdmin
      .from("users_profile")
      .select("role")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Solo administradores pueden invitar usuarios." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { email, full_name, role, area, bio } = await req.json();

    if (!email || !full_name || !role) {
      return new Response(JSON.stringify({ error: "email, full_name y role son obligatorios." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // PASO 1: Invitar usuario via Supabase Auth (envia email con link de set-password)
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { full_name, role },
      redirectTo: `${Deno.env.get("SITE_URL") ?? "https://liater.com"}/update-password`,
    });

    if (inviteError) throw inviteError;
    if (!inviteData.user) throw new Error("No se pudo crear la cuenta.");

    // PASO 2: Crear users_profile
    const { data: newProfile, error: profileError } = await supabaseAdmin
      .from("users_profile")
      .insert([{
        auth_user_id: inviteData.user.id,
        full_name,
        email,
        role,
        is_active: true,
      }])
      .select()
      .single();

    if (profileError) throw profileError;

    // PASO 3: Si es profesor, crear teacher_profile
    if (role === "teacher" && newProfile) {
      await supabaseAdmin.from("teacher_profiles").insert([{
        user_id: newProfile.id,
        name: full_name,
        area: area ?? null,
        bio: bio ?? null,
      }]);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Invitacion enviada a ${email}. El usuario debera revisar su correo para crear su contrasena.`,
      user_id: newProfile.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
