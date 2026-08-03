import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createSupabaseContext } from "npm:@supabase/server@^1";
import { generateActivity } from "../_shared/generateActivity.ts";

// ─── CORS ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Handler ───────────────────────────────────────────────────────────────

export default {
  fetch: async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") {
      return new Response("ok", { headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
    }

    // ── Autenticación: requiere JWT de usuario Supabase ──────────────────
    const { data: ctx, error: authError } = await createSupabaseContext(req, {
      auth: "user",
    });

    if (authError || !ctx) {
      return jsonResponse(
        { ok: false, error: "Debes iniciar sesión para utilizar esta función" },
        401,
      );
    }

    const authUserId = String(
      ctx.userClaims?.sub ?? ctx.userClaims?.id ?? "",
    );

    if (!authUserId) {
      return jsonResponse(
        { ok: false, error: "No se pudo identificar al usuario" },
        401,
      );
    }

    // ── Verificar rol (solo teacher o admin) ─────────────────────────────
    const { data: profile, error: profileError } = await ctx.supabaseAdmin
      .from("users_profile")
      .select("role, is_active")
      .eq("auth_user_id", authUserId)
      .maybeSingle();

    if (profileError) {
      console.error("Error consultando perfil:", profileError);
      return jsonResponse(
        { ok: false, error: "No fue posible verificar el perfil" },
        500,
      );
    }

    if (
      !profile ||
      profile.is_active !== true ||
      !["teacher", "admin"].includes(profile.role)
    ) {
      return jsonResponse(
        { ok: false, error: "Solo profesores y administradores pueden generar preguntas" },
        403,
      );
    }

    // ── Leer y validar body ──────────────────────────────────────────────
    let body: { transcript?: unknown; questionCount?: unknown; classTitle?: unknown };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { ok: false, error: "El cuerpo de la solicitud no contiene JSON válido" },
        400,
      );
    }

    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";

    const classTitle =
      typeof body.classTitle === "string"
        ? body.classTitle.trim().slice(0, 200)
        : "Clase";

    const requestedCount = Number(body.questionCount ?? 5);
    const questionCount = Number.isInteger(requestedCount)
      ? Math.min(Math.max(requestedCount, 1), 10)
      : 5;

    if (transcript.length < 200) {
      return jsonResponse(
        { ok: false, error: "La transcripción es demasiado corta para generar preguntas" },
        400,
      );
    }

    if (transcript.length > 300_000) {
      return jsonResponse(
        { ok: false, error: "La transcripción supera el tamaño permitido" },
        413,
      );
    }

    // ── Gemini (lógica compartida con automatizacion-drive) ──────────────
    const apiKey = Deno.env.get("Gemini_KEY_preguntas");

    if (!apiKey) {
      console.error("No se encontró el secreto Gemini_KEY_preguntas");
      return jsonResponse(
        { ok: false, error: "La función de inteligencia artificial no está configurada" },
        500,
      );
    }

    try {
      const activity = await generateActivity(
        transcript,
        classTitle,
        questionCount,
        apiKey,
      );

      return jsonResponse({ ok: true, draft: activity });
    } catch (error) {
      console.error("Error generando preguntas:", error);
      return jsonResponse(
        { ok: false, error: "No fue posible generar las preguntas. Revisa los registros de la función." },
        500,
      );
    }
  },
};
