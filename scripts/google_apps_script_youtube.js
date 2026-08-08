/**
 * ============================================================================
 * GOOGLE APPS SCRIPT: AUTOMATIZACIÓN DRIVE -> YOUTUBE -> LIATER PLATFORM
 * ============================================================================
 * 
 * Este script corre de forma 100% GRATUITA directamente dentro de tu Google Drive.
 * 
 * ¿Qué hace?
 * 1. Revisa la carpeta de Google Drive donde subes las clases.
 * 2. Si encuentra un video nuevo (.mp4, .mov, .mkv), lo sube automáticamente a YouTube como "No Listado".
 * 3. Extrae el ID único de YouTube y la URL canónica.
 * 4. Actualiza la clase en Supabase (class_sessions) marcándola como "completed".
 * 5. Renombra el archivo en Drive agregando "[PROCESADO]" para no volverlo a procesar.
 * 
 * INSTRUCCIONES DE CONFIGURACIÓN:
 * 1. Reemplaza `DRIVE_FOLDER_ID` con el ID de tu carpeta de Google Drive.
 * 2. Reemplaza `SUPABASE_URL` y `SUPABASE_KEY` con tus credenciales de Supabase.
 * 3. En la barra lateral izquierda de Apps Script, haz clic en el signo "+" al lado de "Servicios".
 * 4. Selecciona "YouTube Data API v3" y haz clic en "Añadir".
 * ============================================================================
 */

// ── CONFIGURACIÓN PRINCIPAL ──
const DRIVE_FOLDER_ID = "REEMPLAZAR_CON_ID_DE_TU_CARPETA_DE_DRIVE"; 
const SUPABASE_URL     = "https://tu-proyecto.supabase.co"; // Tu VITE_SUPABASE_URL
const SUPABASE_KEY     = "tu_anon_key_de_supabase";          // Tu VITE_SUPABASE_ANON_KEY

/**
 * Función Principal Ejecutable
 */
function autoProcessDriveVideosToYouTube() {
  Logger.log("🚀 Iniciando escaneo de videos en Google Drive...");

  let folder;
  try {
    folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  } catch (e) {
    Logger.log("❌ Error: ID de carpeta de Drive inválido o no encontrado.");
    return;
  }

  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const mimeType = file.getMimeType();

    // Omitir archivos ya procesados
    if (fileName.startsWith("[PROCESADO]") || fileName.startsWith("[ERROR]")) {
      continue;
    }

    // Verificar si es un video
    const isVideo = mimeType.includes("video") || 
                    fileName.endsWith(".mp4") || 
                    fileName.endsWith(".mov") || 
                    fileName.endsWith(".mkv") || 
                    fileName.endsWith(".avi");

    if (!isVideo) {
      continue;
    }

    Logger.log("📹 Procesando video encontrado: " + fileName);

    try {
      // 1. Subir archivo a YouTube como 'unlisted' (No listado)
      const cleanTitle = fileName.replace(/\.[^/.]+$/, "").replace("[PROCESADO]", "").trim();
      const videoBlob = file.getBlob();

      const videoResource = {
        snippet: {
          title: cleanTitle,
          description: "Grabación de clase cargada automáticamente a LIATER LMS",
          categoryId: "27" // Educación
        },
        status: {
          privacyStatus: "unlisted" // Oculto / No listado
        }
      };

      const youtubeVideo = YouTube.Videos.insert(videoResource, "snippet,status", videoBlob);
      const youtubeId = youtubeVideo.id;
      const watchUrl = "https://www.youtube.com/watch?v=" + youtubeId;

      Logger.log("✅ Video subido exitosamente a YouTube. ID: " + youtubeId);

      // 2. Buscar y actualizar la clase correspondiente en Supabase
      // Intenta hacer match por título del archivo o toma la clase pendiente más cercana
      const classIdMatch = findAndSyncSupabaseClass(cleanTitle, watchUrl);

      if (classIdMatch) {
        Logger.log("✅ Clase en Supabase vinculada exitosamente con el video.");
        file.setName("[PROCESADO] " + fileName);
      } else {
        Logger.log("⚠️ Video subido a YouTube (" + watchUrl + "), pero no se encontró la clase exacta en Supabase para vincular.");
        file.setName("[PROCESADO] " + fileName);
      }

    } catch (err) {
      Logger.log("❌ Error procesando el video " + fileName + ": " + err.toString());
      file.setName("[ERROR] " + fileName);
    }
  }

  Logger.log("🏁 Proceso de escaneo completado.");
}

/**
 * Busca en Supabase una clase pendiente por título o fecha y vincula la URL de YouTube
 */
function findAndSyncSupabaseClass(titleToMatch, youtubeUrl) {
  try {
    // Buscar clases en Supabase sin video_url o pendientes
    const endpoint = SUPABASE_URL + "/rest/v1/class_sessions?select=id,title,video_url&order=class_date.desc&limit=10";
    
    const options = {
      method: "GET",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json"
      },
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(endpoint, options);
    const classes = JSON.parse(response.getContentText());

    if (!classes || classes.length === 0) return false;

    // Buscar coincidencia por título
    let targetClass = classes.find(c => c.title.toLowerCase().includes(titleToMatch.toLowerCase()) || titleToMatch.toLowerCase().includes(c.title.toLowerCase()));

    // Si no hay coincidencia directa, tomar la primera clase que no tenga video vinculada
    if (!targetClass) {
      targetClass = classes.find(c => !c.video_url);
    }

    if (!targetClass) return false;

    // Actualizar la clase en Supabase con la URL de YouTube
    const updateEndpoint = SUPABASE_URL + "/rest/v1/class_sessions?id=eq." + targetClass.id;
    const updateOptions = {
      method: "PATCH",
      headers: {
        "apikey": SUPABASE_KEY,
        "Authorization": "Bearer " + SUPABASE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      payload: JSON.stringify({
        video_url: youtubeUrl,
        status: "completed"
      }),
      muteHttpExceptions: true
    };

    const updateResponse = UrlFetchApp.fetch(updateEndpoint, updateOptions);
    return updateResponse.getResponseCode() >= 200 && updateResponse.getResponseCode() < 300;

  } catch (e) {
    Logger.log("Error al consultar Supabase: " + e.toString());
    return false;
  }
}
