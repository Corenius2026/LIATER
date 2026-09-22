import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { GoogleGenAI } from "npm:@google/genai@^2.3.0";

// ─── CORS ──────────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ─── Schema JSON para la respuesta estructurada de Gemini ──────────────────
function buildResponseSchema(questionCount: number) {
  return {
    type: "object",
    additionalProperties: false,
    properties: {
      activity_title: {
        type: "string",
        description: "Título corto de la actividad de reforzamiento.",
      },
      activity_description: {
        type: "string",
        description: "Descripción breve de los temas evaluados.",
      },
      questions: {
        type: "array",
        minItems: questionCount,
        maxItems: questionCount,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            text: {
              type: "string",
              description: "Enunciado claro de la pregunta.",
            },
            question_type: {
              type: "string",
              enum: ["single_choice"],
            },
            options: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  text: { type: "string" },
                  is_correct: { type: "boolean" },
                },
                required: ["text", "is_correct"],
              },
            },
            explanation: {
              type: "string",
              description:
                "Una sola explicación pedagógica continua y completa de por qué la respuesta es correcta con base en lo explicado en el material de estudio (sin mencionar la palabra 'transcripción' ni 'documento')",
            },
            source_basis: {
              type: "string",
              description:
                "Tema, diapositiva o concepto clave en el que se sustenta la pregunta.",
            },
          },
          required: [
            "text",
            "question_type",
            "options",
            "explanation",
            "source_basis",
          ],
        },
      },
    },
    required: ["activity_title", "activity_description", "questions"],
  };
}

// ─── Helpers para Google Drive y descarga de archivos ──────────────────────
function extractDriveFileId(rawUrlOrId?: string | null): string | null {
  if (!rawUrlOrId || typeof rawUrlOrId !== "string") return null;
  const trimmed = rawUrlOrId.trim();
  const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (matchFile) return matchFile[1];
  const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (matchIdParam) return matchIdParam[1];
  const matchDirect = trimmed.match(/^([a-zA-Z0-9_-]{20,})/);
  if (matchDirect) return matchDirect[1];
  return null;
}

async function getAccessTokenFromRefreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
): Promise<string> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Error canjeando Refresh Token de Google OAuth2: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

async function getGoogleDriveAccessToken(): Promise<string> {
  const refreshToken = Deno.env.get("GOOGLE_REFRESH_TOKEN");
  const clientId = Deno.env.get("GOOGLE_CLIENT_ID");
  const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET");

  if (refreshToken && clientId && clientSecret) {
    return await getAccessTokenFromRefreshToken(clientId, clientSecret, refreshToken);
  }

  throw new Error("No se encontraron credenciales de Google OAuth2 (GOOGLE_REFRESH_TOKEN, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)");
}

async function downloadGoogleDriveFile(fileId: string, accessToken: string): Promise<{ buffer: ArrayBuffer; mimeType: string }> {
  // 1. Obtener metadatos para saber el mimeType
  const metaRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?supportsAllDrives=true&fields=id,name,mimeType,size`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  let detectedMime = "application/pdf";
  if (metaRes.ok) {
    const meta = await metaRes.json();
    if (meta.mimeType) detectedMime = meta.mimeType;

    // Si es un Google Doc, exportar como texto plano
    if (detectedMime === "application/vnd.google-apps.document") {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (exportRes.ok) {
        return { buffer: await exportRes.arrayBuffer(), mimeType: "text/plain" };
      }
    }

    // Si es una presentación de Google Slides, exportar como PDF
    if (detectedMime === "application/vnd.google-apps.presentation") {
      const exportRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=application/pdf&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (exportRes.ok) {
        return { buffer: await exportRes.arrayBuffer(), mimeType: "application/pdf" };
      }
    }
  }

  // Descarga binaria directa (PDF, etc.)
  const downloadRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!downloadRes.ok) {
    const errText = await downloadRes.text();
    throw new Error(`Error descargando archivo de Google Drive (${fileId}): ${errText}`);
  }

  const buffer = await downloadRes.arrayBuffer();
  return { buffer, mimeType: detectedMime || "application/pdf" };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  const chunkSize = 0x8000;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, Math.min(i + chunkSize, len)))
    );
  }
  return btoa(binary);
}

// ─── Lógica de Generación de Actividad con Gemini ──────────────────────────

async function generateActivityFromDocument(
  docBuffer: ArrayBuffer,
  mimeType: string,
  docTitle: string,
  classTitle: string,
  questionCount: number,
  apiKey: string,
) {
  const prompt = `
Actúa como diseñador pedagógico experto de actividades de reforzamiento académico universitario.

Debes generar exactamente ${questionCount} preguntas de selección única
para la sesión de clase titulada "${classTitle}", basándote estricta y exclusivamente en el material de estudio adjunto ("${docTitle}").

REGLAS OBLIGATORIAS:
1. Utiliza exclusivamente conceptos, metodologías, definiciones y contenidos presentes en este material.
2. No inventes conceptos, cifras, nombres ni conclusiones ajenas al documento.
3. Cada pregunta debe tener exactamente cuatro opciones claras y bien redactadas.
4. Solo una opción puede ser la correcta (is_correct: true). Las otras 3 deben ser falsas (is_correct: false).
5. Evita preguntas triviales sobre nombres de archivo, fechas de subida, portadas o logística.
6. Prioriza comprensión conceptual, aplicación práctica y relación entre los temas del documento.
7. Las opciones incorrectas deben ser plausibles pero claramente distinguibles de la correcta.
8. Escribe todo en español con un tono pedagógico, profesional y riguroso.
9. En el campo "explanation", redacta UNA SOLA explicación pedagógica continua y completa que aclare por qué la respuesta es correcta basándote en lo explicado (ejemplo: "En el material se establece que...", "El tema abordado demuestra que..."). NO utilices expresiones como "la transcripción dice", "el documento dice" o "según el archivo".
10. En el campo "source_basis", indica brevemente el concepto o sección clave en el que se sustenta la pregunta.
11. Distribuye la respuesta correcta de forma equilibrada entre las distintas opciones.
`;

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  let lastError: Error | null = null;

  const isPdf = mimeType.toLowerCase().includes("pdf");
  const isText = mimeType.toLowerCase().includes("text") || mimeType.toLowerCase().includes("plain");

  for (const modelName of modelsToTry) {
    try {
      let outputText: string | null = null;

      if (isPdf) {
        const base64Data = arrayBufferToBase64(docBuffer);

        // Método estándar de GoogleGenAI: generateContent multimodal
        try {
          // @ts-ignore
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [
              {
                role: "user",
                parts: [
                  {
                    inlineData: {
                      mimeType: "application/pdf",
                      data: base64Data,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: buildResponseSchema(questionCount),
            },
          });
          outputText = response.text || (response.candidates?.[0]?.content?.parts?.[0]?.text ?? null);
        } catch (genErr) {
          console.warn(`ai.models.generateContent falló con '${modelName}', intentando ai.interactions.create:`, genErr);
          // Fallback a ai.interactions.create
          // @ts-ignore
          const interaction = await ai.interactions.create({
            model: modelName,
            input: [
              {
                inlineData: {
                  mimeType: "application/pdf",
                  data: base64Data,
                },
              },
              { text: prompt },
            ],
            store: false,
            response_format: {
              type: "text",
              mime_type: "application/json",
              schema: buildResponseSchema(questionCount),
            },
          });
          outputText = interaction.output_text;
        }
      } else {
        // Documento de texto
        const textDecoder = new TextDecoder("utf-8");
        const docText = textDecoder.decode(docBuffer);
        const fullPrompt = `${prompt}\n\nCONTENIDO DEL MATERIAL DE ESTUDIO:\n\n<material_estudio>\n${docText.slice(0, 250_000)}\n</material_estudio>`;

        // @ts-ignore
        const interaction = await ai.interactions.create({
          model: modelName,
          input: fullPrompt,
          store: false,
          response_format: {
            type: "text",
            mime_type: "application/json",
            schema: buildResponseSchema(questionCount),
          },
        });
        outputText = interaction.output_text;
      }

      if (!outputText) {
        throw new Error(`Gemini (${modelName}) no devolvió contenido`);
      }

      const activity = JSON.parse(outputText);

      if (
        !Array.isArray(activity.questions) ||
        activity.questions.length !== questionCount
      ) {
        throw new Error("La cantidad de preguntas generada no coincide con la solicitada");
      }

      for (const question of activity.questions) {
        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error("Una de las preguntas no contiene exactamente cuatro opciones");
        }

        const correctOptions = question.options.filter(
          (option: { is_correct: boolean }) => option.is_correct === true,
        );

        if (correctOptions.length !== 1) {
          throw new Error("Una de las preguntas no contiene exactamente una respuesta correcta");
        }
      }

      return activity;
    } catch (err) {
      console.warn(`Intento con modelo '${modelName}' falló:`, err);
      lastError = err as Error;
    }
  }

  throw lastError || new Error("No se pudo generar la actividad con ningún modelo de Gemini");
}

async function generateActivityFromTranscript(
  transcript: string,
  classTitle: string,
  questionCount: number,
  apiKey: string,
) {
  const prompt = `
Actúa como diseñador pedagógico de actividades de reforzamiento académico universitario.

Debes generar exactamente ${questionCount} preguntas de selección única
para la sesión de clase titulada "${classTitle}".

REGLAS OBLIGATORIAS:
1. Utiliza exclusivamente información sustentada en el contenido de la clase.
2. No inventes conceptos, cifras, definiciones ni conclusiones.
3. Cada pregunta debe tener exactamente cuatro opciones claras y bien redactadas.
4. Solo una opción puede ser correcta (is_correct: true).
5. Evita preguntas triviales sobre nombres, saludos, asistencia o logística.
6. Prioriza comprensión, aplicación práctica y relación entre los conceptos expuestos.
7. Las opciones incorrectas deben ser plausibles, pero claramente distinguibles de la correcta.
8. Escribe todo en español con un tono pedagógico, profesional y riguroso.
9. En el campo "explanation", redacta UNA SOLA explicación pedagógica continua y completa que aclare por qué la respuesta es correcta. NO utilices expresiones como "la transcripción dice" o "según la transcripción"; utiliza siempre referencias naturales como "En la clase se explicó que...", "Durante la sesión se enfatizó que...".
10. En el campo "source_basis", indica brevemente el tema o concepto clave de la clase en el que se fundamenta.
11. Distribuye la respuesta correcta de forma equilibrada entre las distintas posiciones.

CONTENIDO DE LA CLASE:

<contenido_clase>
${transcript}
</contenido_clase>
`;

  const ai = new GoogleGenAI({ apiKey });
  const modelsToTry = [
    "gemini-3.7-flash",
    "gemini-3.5-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];
  let lastError: Error | null = null;

  for (const modelName of modelsToTry) {
    try {
      // @ts-ignore
      const interaction = await ai.interactions.create({
        model: modelName,
        input: prompt,
        store: false,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: buildResponseSchema(questionCount),
        },
      });

      const outputText = interaction.output_text;
      if (!outputText) {
        throw new Error(`Gemini (${modelName}) no devolvió contenido`);
      }

      const activity = JSON.parse(outputText);

      if (
        !Array.isArray(activity.questions) ||
        activity.questions.length !== questionCount
      ) {
        throw new Error("La cantidad de preguntas generada no es válida");
      }

      for (const question of activity.questions) {
        if (!Array.isArray(question.options) || question.options.length !== 4) {
          throw new Error("Una pregunta no contiene cuatro opciones");
        }

        const correctOptions = question.options.filter(
          (option: { is_correct: boolean }) => option.is_correct === true,
        );

        if (correctOptions.length !== 1) {
          throw new Error("Una pregunta no contiene exactamente una respuesta correcta");
        }
      }

      return activity;
    } catch (err) {
      console.warn(`Intento con modelo '${modelName}' falló:`, err);
      lastError = err as Error;
    }
  }

  throw lastError || new Error("No se pudo generar la actividad con ningún modelo de Gemini");
}

// ─── Handler Principal ─────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Método no permitido" }, 405);
  }

  // ── Autenticación: requiere JWT de usuario Supabase ──────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse(
      { ok: false, error: "Debes iniciar sesión para utilizar esta función" },
      401,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });

  const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

  if (userError || !user) {
    return jsonResponse(
      { ok: false, error: "Token de usuario inválido o expirado" },
      401,
    );
  }

  // ── Verificar rol (solo teacher o admin) ─────────────────────────────────
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  });

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("users_profile")
    .select("role, is_active")
    .eq("auth_user_id", user.id)
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

  // ── Leer y validar body ──────────────────────────────────────────────────
  let body: {
    classId?: unknown;
    resourceId?: unknown;
    transcript?: unknown;
    questionCount?: unknown;
    classTitle?: unknown;
  };

  try {
    body = await req.json();
  } catch {
    return jsonResponse(
      { ok: false, error: "El cuerpo de la solicitud no contiene JSON válido" },
      400,
    );
  }

  const classId = typeof body.classId === "string" ? body.classId.trim() : "";
  const resourceId = typeof body.resourceId === "string" ? body.resourceId.trim() : "";
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";

  let classTitle = typeof body.classTitle === "string" ? body.classTitle.trim().slice(0, 200) : "Clase";

  const requestedCount = Number(body.questionCount ?? 5);
  const questionCount = Number.isInteger(requestedCount)
    ? Math.min(Math.max(requestedCount, 1), 10)
    : 5;

  // ── Obtener Clave de Gemini ──────────────────────────────────────────────
  const apiKey = Deno.env.get("Gemini_KEY_preguntas") || Deno.env.get("GEMINI_API_KEY");

  if (!apiKey) {
    console.error("No se encontró el secreto Gemini_KEY_preguntas ni GEMINI_API_KEY");
    return jsonResponse(
      { ok: false, error: "La función de inteligencia artificial no está configurada (falta Gemini_KEY_preguntas o GEMINI_API_KEY en Supabase Secrets)" },
      500,
    );
  }

  try {
    let activity: any = null;

    // CASO 1: Generación basada en un Documento / Recurso subido a la clase
    if (resourceId) {
      const { data: resource, error: resErr } = await supabaseAdmin
        .from("resources")
        .select("*")
        .eq("id", resourceId)
        .single();

      if (resErr || !resource) {
        return jsonResponse(
          { ok: false, error: "No se encontró el documento seleccionado en la plataforma." },
          404,
        );
      }

      // Obtener el título de la clase si no vino en el body
      if (classId && (!classTitle || classTitle === "Clase")) {
        const { data: clsData } = await supabaseAdmin
          .from("class_sessions")
          .select("title")
          .eq("id", classId)
          .maybeSingle();
        if (clsData?.title) classTitle = clsData.title;
      }

      const docTitle = resource.title || "Material de Estudio";
      let docBuffer: ArrayBuffer;
      let mimeType = "application/pdf";

      // A) Si el archivo está en Google Drive
      const driveFileId = extractDriveFileId(resource.url);
      if (resource.provider === "drive" || driveFileId) {
        const fileId = driveFileId || resource.url;
        const accessToken = await getGoogleDriveAccessToken();
        const driveResult = await downloadGoogleDriveFile(fileId, accessToken);
        docBuffer = driveResult.buffer;
        mimeType = driveResult.mimeType;
      } else if (resource.url) {
        // B) Si es una URL externa directa
        const extRes = await fetch(resource.url);
        if (!extRes.ok) {
          throw new Error(`No fue posible descargar el archivo desde la URL proporcionada (${extRes.statusText})`);
        }
        docBuffer = await extRes.arrayBuffer();
        mimeType = extRes.headers.get("content-type") || "application/pdf";
      } else {
        return jsonResponse(
          { ok: false, error: "El recurso seleccionado no tiene una URL o archivo válido asociado." },
          400,
        );
      }

      // Validar tamaño máximo (máx. 25 MB para evitar saturación de memoria en Edge Runtime)
      if (docBuffer.byteLength > 25 * 1024 * 1024) {
        return jsonResponse(
          { ok: false, error: "El documento supera el tamaño máximo permitido para análisis con IA (25 MB)." },
          413,
        );
      }

      // Generar preguntas con Gemini a partir del documento
      activity = await generateActivityFromDocument(
        docBuffer,
        mimeType,
        docTitle,
        classTitle,
        questionCount,
        apiKey,
      );
    }
    // CASO 2: Generación basada en Transcripción de texto (Legacy / Manual)
    else if (transcript) {
      if (transcript.length < 200) {
        return jsonResponse(
          { ok: false, error: "La transcripción es demasiado corta para generar preguntas (mínimo 200 caracteres)." },
          400,
        );
      }
      if (transcript.length > 300_000) {
        return jsonResponse(
          { ok: false, error: "La transcripción supera el tamaño permitido." },
          413,
        );
      }

      activity = await generateActivityFromTranscript(
        transcript,
        classTitle,
        questionCount,
        apiKey,
      );
    }
    // CASO 3: Ni documento ni transcripción
    else {
      return jsonResponse(
        { ok: false, error: "Debes seleccionar un documento de la clase o ingresar una transcripción para generar preguntas." },
        400,
      );
    }

    // ── Guardar automáticamente borrador en activity_drafts para persistencia ──
    if (classId && activity) {
      try {
        await supabaseAdmin.from("activity_drafts").insert([
          {
            class_id: classId,
            draft_data: activity,
            status: "pending",
          },
        ]);
      } catch (draftErr) {
        console.warn("Aviso: no se pudo persistir en activity_drafts:", draftErr);
      }
    }

    return jsonResponse({ ok: true, draft: activity });
  } catch (error) {
    console.error("Error generando preguntas:", error);
    const msg = error instanceof Error ? error.message : String(error);
    return jsonResponse(
      { ok: false, error: `No fue posible generar las preguntas: ${msg}` },
      500,
    );
  }
});
