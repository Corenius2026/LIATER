import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ─── CORS Headers ────────────────────────────────────────────────────────────
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

// ─── Normaliza el drive_folder_id: acepta URL completa o solo el ID ──────────
function normalizeDriveFolderId(raw?: string | null): string | null {
  if (!raw || typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (urlMatch) return urlMatch[1];

  const queryMatch = trimmed.match(/^([a-zA-Z0-9_-]+)/);
  if (queryMatch) return queryMatch[1];

  return trimmed;
}

// ─── Generación de Access Token de Google con Service Account (Web Crypto) ───
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN[ A-Z_-]+-----/g, "")
    .replace(/-----END[ A-Z_-]+-----/g, "")
    .replace(/\s+/g, "");
  const raw = atob(b64);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer.buffer;
}

function base64UrlEncode(str: string | Uint8Array): string {
  let b64 = "";
  if (typeof str === "string") {
    b64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    let binary = "";
    const len = str.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(str[i]);
    }
    b64 = btoa(binary);
  }
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getGoogleAccessToken(serviceAccount: {
  client_email: string;
  private_key: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaimSet = base64UrlEncode(JSON.stringify(claimSet));
  const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

  const keyBuffer = pemToArrayBuffer(serviceAccount.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signatureInput),
  );

  const encodedSignature = base64UrlEncode(new Uint8Array(signature));
  const jwt = `${signatureInput}.${encodedSignature}`;

  // Canjear JWT por Access Token en Google OAuth2
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Error obteniendo token de Google OAuth2: ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// ─── Handler Principal ───────────────────────────────────────────────────────
Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Método no permitido. Utiliza POST." }, 405);
  }

  try {
    // 1. Obtener credenciales de Google Service Account desde los Secrets
    const rawServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    if (!rawServiceAccount) {
      return jsonResponse(
        {
          error:
            "No se encontró el secret 'GOOGLE_SERVICE_ACCOUNT_JSON' en Supabase.",
        },
        500,
      );
    }

    let serviceAccount: { client_email: string; private_key: string };
    try {
      serviceAccount = typeof rawServiceAccount === "string"
        ? JSON.parse(rawServiceAccount)
        : rawServiceAccount;
    } catch {
      return jsonResponse(
        { error: "El secret GOOGLE_SERVICE_ACCOUNT_JSON no tiene formato JSON válido." },
        500,
      );
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return jsonResponse(
        {
          error:
            "El JSON de la cuenta de servicio debe contener 'client_email' y 'private_key'.",
        },
        500,
      );
    }

    // 2. Extraer datos del formulario (FormData)
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const classId = formData.get("classId") as string | null;
    const programId = formData.get("programId") as string | null;
    const resourceType = (formData.get("resourceType") as string) || "presentation";
    const customTitle = formData.get("customTitle") as string | null;

    if (!file) {
      return jsonResponse({ error: "No se proporcionó ningún archivo." }, 400);
    }
    if (!classId) {
      return jsonResponse({ error: "El parámetro 'classId' es requerido." }, 400);
    }

    // 3. Cliente Supabase con Service Role Key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 4. Consultar datos de la clase y del programa para armar nomenclatura y buscar carpeta
    const { data: classData, error: classErr } = await supabase
      .from("class_sessions")
      .select("id, title, order_index, drive_folder_id, program_id")
      .eq("id", classId)
      .single();

    if (classErr || !classData) {
      return jsonResponse(
        { error: `No se encontró la clase: ${classErr?.message || "ID no existe"}` },
        404,
      );
    }

    // Consultar programa para obtener drive_folder_id global si la clase no tiene uno específico
    let programDriveFolderId: string | null = null;
    const effectiveProgramId = classData.program_id || programId;
    if (effectiveProgramId) {
      const { data: progData } = await supabase
        .from("diploma_programs")
        .select("id, title, drive_folder_id")
        .eq("id", effectiveProgramId)
        .maybeSingle();
      if (progData) {
        programDriveFolderId = progData.drive_folder_id;
      }
    }

    const orderNum = classData.order_index ?? 1;
    const classTitle = (classData.title || "Clase").trim();
    const originalFileName = file.name || "documento.pdf";

    // 5. Determinar la carpeta de destino en Google Drive
    const targetFolderId =
      normalizeDriveFolderId(classData.drive_folder_id) ||
      normalizeDriveFolderId(programDriveFolderId);

    if (!targetFolderId) {
      return jsonResponse(
        {
          error:
            "No se ha configurado la carpeta de Google Drive para este curso. El administrador debe vincular el enlace de la carpeta en la pestaña 'Configuración' del curso.",
        },
        400,
      );
    }

    // 6. Armar Nomenclatura Estandarizada
    // Ej: [Clase 01 - Fundamentos de Robótica] Presentacion_Intro.pdf
    const formattedOrder = String(orderNum).padStart(2, "0");
    const sanitizedClassTitle = classTitle.replace(/[\\/:*?"<>|]/g, "-");
    const formattedFileName = `[Clase ${formattedOrder} - ${sanitizedClassTitle}] ${originalFileName}`;

    // 7. Obtener token de acceso de Google Drive
    const accessToken = await getGoogleAccessToken(serviceAccount);

    // 8. Subida Multipart a Google Drive API v3
    const metadata: Record<string, unknown> = {
      name: formattedFileName,
      mimeType: file.type || "application/pdf",
    };

    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const fileBuffer = await file.arrayBuffer();

    const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
    const mediaPartHeader = `${delimiter}Content-Type: ${file.type || "application/pdf"}\r\n\r\n`;

    const encoder = new TextEncoder();
    const metadataBytes = encoder.encode(metadataPart);
    const mediaHeaderBytes = encoder.encode(mediaPartHeader);
    const closeBytes = encoder.encode(closeDelimiter);

    // Combinar los bytes del cuerpo multipart
    const totalLength =
      metadataBytes.length +
      mediaHeaderBytes.length +
      fileBuffer.byteLength +
      closeBytes.length;

    const multipartBody = new Uint8Array(totalLength);
    let offset = 0;

    multipartBody.set(metadataBytes, offset);
    offset += metadataBytes.length;

    multipartBody.set(mediaHeaderBytes, offset);
    offset += mediaHeaderBytes.length;

    multipartBody.set(new Uint8Array(fileBuffer), offset);
    offset += fileBuffer.byteLength;

    multipartBody.set(closeBytes, offset);

    const uploadRes = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,webContentLink",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      },
    );

    if (!uploadRes.ok) {
      const uploadErr = await uploadRes.text();
      return jsonResponse(
        { error: `Error de Google Drive API al subir archivo: ${uploadErr}` },
        500,
      );
    }

    const driveFile = await uploadRes.json();
    const fileId = driveFile.id;
    const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

    // 9. Asignar permiso público de lectura para que los estudiantes lo vean en el iframe sin pedir permisos
    try {
      await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}/permissions?supportsAllDrives=true`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "reader",
            type: "anyone",
          }),
        },
      );
    } catch (permErr) {
      console.warn("Aviso: no se pudo asignar permiso público automático:", permErr);
    }

    // 10. Guardar en la tabla 'resources' de Supabase
    const resourcePayload = {
      class_id: classId,
      program_id: programId || classData.program_id,
      title: (customTitle && customTitle.trim()) || formattedFileName,
      resource_type: resourceType === "presentation" ? "presentation" : "pdf",
      provider: "drive",
      url: previewUrl,
      is_visible: true,
    };

    const { data: insertedResource, error: insertErr } = await supabase
      .from("resources")
      .insert([resourcePayload])
      .select()
      .single();

    if (insertErr) {
      console.error("Error guardando en tabla resources:", insertErr);
    }

    // Si es presentación principal, también actualizar presentation_url en class_sessions
    if (resourceType === "presentation") {
      await supabase
        .from("class_sessions")
        .update({ presentation_url: previewUrl })
        .eq("id", classId);
    }

    return jsonResponse({
      success: true,
      fileId,
      previewUrl,
      formattedFileName,
      targetFolderId: targetFolderId || "Raíz de la cuenta",
      resource: insertedResource,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("Error inesperado en upload-pdf-drive:", err);
    return jsonResponse({ error: `Error inesperado: ${msg}` }, 500);
  }
});
