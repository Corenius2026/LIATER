import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@^2";
import { generateActivity } from "../_shared/generateActivity.ts";

// ─── CORS ──────────────────────────────────────────────────────────────────

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
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

// ─── Normaliza el drive_folder_id: acepta URL completa o solo el ID ────────

function normalizeDriveFolderId(raw: string): string {
  // Extrae el ID de una URL de Google Drive si se pegó una URL completa
  // ej: https://drive.google.com/drive/folders/1BxiM... → 1BxiM...
  const urlMatch = raw.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  // Si tiene parámetros de query, los elimina
  const queryMatch = raw.match(/^([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];

  return raw.trim();
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

    // ── Autenticación: CRON_SECRET enviado por Google Apps Script ─────────
    const incomingSecret = req.headers.get("x-cron-secret");
    const expectedSecret = Deno.env.get("DRIVE_CRON_SECRET");

    if (!expectedSecret) {
      console.error("DRIVE_CRON_SECRET no está configurado en los secretos de la función");
      return jsonResponse(
        { ok: false, error: "La función de automatización no está configurada correctamente" },
        500,
      );
    }

    if (!incomingSecret || incomingSecret !== expectedSecret) {
      return jsonResponse(
        { ok: false, error: "No autorizado. Secreto incorrecto o ausente." },
        401,
      );
    }

    // ── Leer body ─────────────────────────────────────────────────────────
    let body: {
      drive_folder_id?: unknown;
      transcript?: unknown;
      questionCount?: unknown;
    };

    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { ok: false, error: "El cuerpo de la solicitud no contiene JSON válido" },
        400,
      );
    }

    const rawFolderId =
      typeof body.drive_folder_id === "string"
        ? body.drive_folder_id.trim()
        : "";

    if (!rawFolderId) {
      return jsonResponse(
        { ok: false, error: "El campo drive_folder_id es obligatorio" },
        400,
      );
    }

    const folderId = normalizeDriveFolderId(rawFolderId);

    const transcript =
      typeof body.transcript === "string" ? body.transcript.trim() : "";

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

    const requestedCount = Number(body.questionCount ?? 5);
    const questionCount = Number.isInteger(requestedCount)
      ? Math.min(Math.max(requestedCount, 1), 10)
      : 5;

    // ── Cliente admin de Supabase (service_role) ─────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Faltan variables de entorno SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY");
      return jsonResponse(
        { ok: false, error: "Configuración interna incompleta" },
        500,
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // ── Buscar la clase por drive_folder_id ───────────────────────────────
    // Se busca por coincidencia exacta y también por URL que contenga el ID
    const { data: session, error: sessionError } = await supabaseAdmin
      .from("class_sessions")
      .select("id, title")
      .or(`drive_folder_id.eq.${folderId},drive_folder_id.ilike.%${folderId}%`)
      .maybeSingle();

    if (sessionError) {
      console.error("Error buscando clase:", sessionError);
      return jsonResponse(
        { ok: false, error: "Error al consultar la base de datos" },
        500,
      );
    }

    if (!session) {
      return jsonResponse(
        {
          ok: false,
          error: `No se encontró ninguna clase vinculada al folder '${folderId}'. Asegúrate de que el campo drive_folder_id esté configurado en la clase.`,
          drive_folder_id: folderId,
        },
        404,
      );
    }

    const classId = session.id as string;
    const classTitle = (session.title as string) || "Clase";

    // ── Verificar si ya existe un borrador pendiente para esta clase ───────
    const { data: existingDraft } = await supabaseAdmin
      .from("activity_drafts")
      .select("id, status, created_at")
      .eq("class_id", classId)
      .in("status", ["pending", "approved"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingDraft) {
      return jsonResponse(
        {
          ok: false,
          already_processed: true,
          error: `Esta clase ya tiene un borrador con estado '${existingDraft.status}'. No se generó uno nuevo.`,
          draft_id: existingDraft.id,
          class_id: classId,
          class_title: classTitle,
        },
        409,
      );
    }

    // ── Llamar a Gemini (lógica compartida) ───────────────────────────────
    const apiKey = Deno.env.get("Gemini_KEY_preguntas");

    if (!apiKey) {
      console.error("No se encontró el secreto Gemini_KEY_preguntas");
      return jsonResponse(
        { ok: false, error: "La función de inteligencia artificial no está configurada" },
        500,
      );
    }

    let activity;
    try {
      activity = await generateActivity(
        transcript,
        classTitle,
        questionCount,
        apiKey,
      );
    } catch (error) {
      console.error("Error generando actividad con Gemini:", error);
      return jsonResponse(
        { ok: false, error: "No fue posible generar las preguntas. Revisa los registros de la función." },
        500,
      );
    }

    // ── Guardar borrador en activity_drafts ───────────────────────────────
    const { data: draft, error: insertError } = await supabaseAdmin
      .from("activity_drafts")
      .insert({
        class_id: classId,
        drive_folder_id: folderId,
        draft_data: activity,
        status: "pending",
      })
      .select("id")
      .single();

    if (insertError || !draft) {
      console.error("Error guardando borrador:", insertError);
      return jsonResponse(
        { ok: false, error: "Las preguntas fueron generadas pero no pudieron guardarse" },
        500,
      );
    }

    console.log(`Borrador creado: ${draft.id} para clase: ${classTitle} (${classId})`);

    return jsonResponse({
      ok: true,
      draft_id: draft.id,
      class_id: classId,
      class_title: classTitle,
      question_count: activity.questions.length,
      activity_title: activity.activity_title,
    });
  },
};
