/**
 * ============================================================================
 * LIATER - Automatización Google Drive ➔ Supabase
 * ============================================================================
 * 
 * Este script contiene dos flujos independientes y desacoplados:
 * 
 * 1. `sincronizarSoloVideos()`:
 *    - Escanea carpetas buscando grabaciones de video (.mp4, .mov, etc.).
 *    - Garantiza permisos de lectura para que se puedan reproducir en la web.
 *    - Vincula el enlace directamente a la clase en Supabase (`class_sessions.video_url`).
 *    - Rápido y ligero (ideal para temporizador cada 15-30 minutos).
 * 
 * 2. `procesarTranscripcionesEIA()`:
 *    - Escanea carpetas buscando transcripciones (.gdoc, .txt).
 *    - Limpia marcas de tiempo y muletillas para optimizar el uso de tokens.
 *    - Llama a la Edge Function para generar preguntas con Google Gemini.
 *    - Guarda las actividades en `activity_drafts` para revisión del profesor/admin.
 *    - Ideal para temporizador cada 1-2 horas o ejecución manual.
 * 
 * 3. `ejecutarTodo()`:
 *    - Ejecuta ambos procesos en secuencia con un solo clic.
 * 
 * ----------------------------------------------------------------------------
 * CONFIGURACIÓN EN GOOGLE APPS SCRIPT:
 * (⚙️ Configuración del proyecto -> Propiedades del script)
 *   - ROOT_FOLDER_ID: ID o enlace completo de la carpeta raíz en Google Drive
 *   - DRIVE_AUTOMATION_SECRET: Secreto configurado en Supabase Edge Functions
 *   - LOG_SHEET_ID: (Opcional) ID o enlace del Google Sheet para bitácora
 * ============================================================================
 */

var EDGE_FUNCTION_URL = "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";
var QUESTION_COUNT = 5;

// ============================================================================
// 1. FLUJO PRINCIPAL: SINCRONIZACIÓN DE VIDEOS / GRABACIONES
// ============================================================================

/**
 * Escanea Drive y actualiza únicamente las grabaciones de video en Supabase
 */
function sincronizarSoloVideos() {
  console.log("=================================================");
  console.log("▶ INICIANDO: Sincronización de Grabaciones de Video");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var carpetas = [];
  buscarCarpetasRecursivas(rootFolder, carpetas);

  console.log("Total de carpetas analizadas: " + carpetas.length);

  var videosActualizados = 0;
  var carpetasSinVideo = 0;
  var errores = 0;

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();
    var folderId = folder.getId();

    var videoFile = encontrarArchivoVideo(folder);

    if (videoFile) {
      try {
        // Asegurar que el video tenga permisos de lectura para el visor web
        garantizarPermisosDeLectura(videoFile);

        var videoUrl = "https://drive.google.com/file/d/" + videoFile.getId() + "/preview";
        console.log("-> Video detectado en '" + folderName + "': " + videoFile.getName());

        // Enviar a Supabase solo el video (sin transcript)
        var res = llamarEdgeFunction({
          drive_folder_id: folderId,
          folder_name: folderName,
          doc_name: videoFile.getName(),
          video_url: videoUrl,
          transcript: "",
        }, config.cronSecret);

        if (res && res.ok) {
          if (res.already_synced) {
            console.log("   ℹ Video ya estaba previamente vinculado en Supabase para: '" + (res.class_title || folderName) + "' (Sin cambios necesarios).");
          } else {
            videosActualizados++;
            console.log("   ✓ Video vinculado con éxito en Supabase para: '" + (res.class_title || folderName) + "'");
            console.log("     - ID de Clase en BD: " + (res.class_id || "N/A"));
            console.log("     - URL Video: " + (res.video_url || "N/A"));
            console.log("     - ID Carpeta Drive: " + folderId);
          }
          if (config.logSheet) {
            registrarEnLog(config.logSheet, videoFile.getId(), videoFile.getName(), folderId, folderName, res.already_synced ? "VIDEO_EXISTENTE" : "VIDEO_OK", "ID: " + res.class_id + " | Video: " + (res.video_url || videoUrl));
          }
        } else {
          errores++;
          console.warn("   ✗ No se pudo vincular video: " + (res.error || JSON.stringify(res)));
          if (config.logSheet) {
            registrarEnLog(config.logSheet, videoFile.getId(), videoFile.getName(), folderId, folderName, "VIDEO_ERROR", res.error || "Error desconocido");
          }
        }
      } catch (e) {
        errores++;
        console.error("   ✗ Excepción procesando video en '" + folderName + "': " + e.message);
      }
    } else {
      carpetasSinVideo++;
    }
  }

  console.log("=================================================");
  console.log("Resumen Videos -> Actualizados: " + videosActualizados + " | Sin Video: " + carpetasSinVideo + " | Errores: " + errores);
  console.log("=================================================");
}

// ============================================================================
// 2. FLUJO PRINCIPAL: PROCESAMIENTO DE TRANSCRIPCIONES E IA
// ============================================================================

/**
 * Escanea Drive, lee transcripciones, genera actividades con Gemini y guarda borradores
 */
function procesarTranscripcionesEIA() {
  console.log("=================================================");
  console.log("▶ INICIANDO: Procesamiento de Transcripciones y Preguntas IA");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var carpetasConTranscripcion = [];
  buscarCarpetasConTranscripciones(rootFolder, carpetasConTranscripcion);

  console.log("Carpetas con transcripción encontradas: " + carpetasConTranscripcion.length);

  var procesadas = 0;
  var omitidas = 0;
  var errores = 0;

  for (var i = 0; i < carpetasConTranscripcion.length; i++) {
    var folder = carpetasConTranscripcion[i];
    var folderId = folder.getId();
    var folderName = folder.getName();

    var transcripcionFile = encontrarArchivoTranscripcion(folder);
    if (!transcripcionFile) continue;

    var fileId = transcripcionFile.getId();
    var fileName = transcripcionFile.getName();

    if (config.logSheet && yaFueProcesado(config.logSheet, fileId)) {
      console.log("-> Transcripción ya procesada anteriormente según Log: '" + fileName + "'");
      omitidas++;
      continue;
    }

    console.log("-> Leyendo transcripción: '" + fileName + "' en carpeta '" + folderName + "'...");

    try {
      var transcript = extraerTexto(transcripcionFile);

      if (!transcript || transcript.length < 200) {
        var msg = "Transcripción muy corta (" + (transcript ? transcript.length : 0) + " caracteres)";
        console.warn("   Aviso: " + msg);
        if (config.logSheet) registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IGNORADO", msg);
        omitidas++;
        continue;
      }

      console.log("   Enviando " + transcript.length + " caracteres a Gemini...");

      var resultado = llamarEdgeFunction({
        drive_folder_id: folderId,
        folder_name: folderName,
        doc_name: fileName,
        transcript: transcript,
        questionCount: QUESTION_COUNT,
      }, config.cronSecret);

      if (resultado.ok && resultado.draft_id && !resultado.already_processed) {
        procesadas++;
        console.log("   ✓ ÉXITO: Nuevo borrador creado (ID: " + resultado.draft_id + ") para clase: '" + resultado.class_title + "' (" + (resultado.question_count || QUESTION_COUNT) + " preguntas)");
        if (config.logSheet) {
          registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IA_OK", "draft_id=" + resultado.draft_id + " | " + resultado.class_title);
        }
      } else if (resultado.already_processed) {
        omitidas++;
        console.log("   ℹ Preguntas ya existen para: '" + (resultado.class_title || folderName) + "' (" + (resultado.message || "Borrador existente") + "). Omitiendo IA para no gastar cuota.");
        if (config.logSheet) {
          registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "DUPLICADO", resultado.message || "Borrador existente");
        }
      } else {
        errores++;
        console.error("   ✗ Error en Supabase/Gemini: " + (resultado.error || JSON.stringify(resultado)));
        if (config.logSheet) {
          registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IA_ERROR", resultado.error || "Error");
        }
      }
    } catch (e) {
      errores++;
      console.error("   ✗ Excepción con archivo '" + fileName + "': " + e.message);
      if (config.logSheet) {
        registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "EXCEPCIÓN", e.message);
      }
    }
  }

  console.log("=================================================");
  console.log("Resumen IA -> Procesadas: " + procesadas + " | Omitidas/Duplicadas: " + omitidas + " | Errores: " + errores);
  console.log("=================================================");
}

// ============================================================================
// 3. EJECUCIÓN COMBINADA
// ============================================================================

/**
 * Ejecuta ambas sincronizaciones de forma secuencial
 */
function ejecutarTodo() {
  console.log("=================================================");
  console.log("🚀 EJECUCIÓN TOTAL: Videos + Transcripciones");
  console.log("=================================================");
  sincronizarSoloVideos();
  procesarTranscripcionesEIA();
}

// ============================================================================
// 4. GESTIÓN AUTOMÁTICA DE ACTIVADORES (TRIGGERS)
// ============================================================================

/**
 * Configura los temporizadores automáticos de Apps Script con un solo clic
 */
function configurarActivadores() {
  eliminarActivadores();

  // 1. Sincronizar videos cada 30 minutos
  ScriptApp.newTrigger("sincronizarSoloVideos")
    .timeBased()
    .everyMinutes(30)
    .create();

  // 2. Procesar transcripciones con IA cada 2 horas
  ScriptApp.newTrigger("procesarTranscripcionesEIA")
    .timeBased()
    .everyHours(2)
    .create();

  console.log("✓ Activadores configurados con éxito:");
  console.log("  - sincronizarSoloVideos: Cada 30 minutos");
  console.log("  - procesarTranscripcionesEIA: Cada 2 horas");
}

/**
 * Elimina todos los activadores automáticos existentes
 */
function eliminarActivadores() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  console.log("Activadores anteriores eliminados.");
}

// ============================================================================
// 5. FUNCIONES AUXILIARES Y DE DETECCIÓN
// ============================================================================

function obtenerConfiguracion() {
  var props = PropertiesService.getScriptProperties();
  var rawRootId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var rawSheetId = props.getProperty("LOG_SHEET_ID");

  var rootFolderId = extraerIdDeDrive(rawRootId);
  var logSheetId = extraerIdDeDrive(rawSheetId);

  if (!rootFolderId || !cronSecret) {
    console.error("ERROR: Faltan propiedades del script. Configura ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET en Configuración del Proyecto -> Propiedades del script.");
    return null;
  }

  var logSheet = null;
  if (logSheetId) {
    try {
      logSheet = obtenerHojaDeLog(logSheetId);
    } catch (e) {
      console.warn("Aviso: No se pudo abrir la hoja de cálculo de Log: " + e.message);
    }
  }

  return {
    rootFolderId: rootFolderId,
    cronSecret: cronSecret,
    logSheet: logSheet,
  };
}

function abrirCarpetaRaiz(folderId) {
  try {
    var root = DriveApp.getFolderById(folderId);
    console.log("Carpeta raíz abierta: '" + root.getName() + "' (ID: " + root.getId() + ")");
    return root;
  } catch (err) {
    console.error("ERROR: No se pudo acceder a la carpeta de Drive con ID '" + folderId + "'. Verifica permisos: " + err.message);
    return null;
  }
}

function garantizarPermisosDeLectura(file) {
  try {
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Si no se tienen permisos de administración sobre el archivo, continuar sin romper el flujo
  }
}

function limpiarTexto(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function esArchivoTranscripcion(nombre) {
  var norm = limpiarTexto(nombre);
  return norm.indexOf("TRANSCRIP") !== -1 || norm.indexOf("TRANSCRIPT") !== -1;
}

function esArchivoVideo(file) {
  var mime = (file.getMimeType() || "").toLowerCase();
  var name = (file.getName() || "").toLowerCase();
  var norm = limpiarTexto(file.getName() || "");

  if (
    name.endsWith(".txt") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".pdf") ||
    name.endsWith(".gdoc") ||
    norm.indexOf("TRANSCRIP") !== -1
  ) {
    return false;
  }

  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv|flv|3gp|ts|mts)$/i.test(name)) {
    return true;
  }

  if (mime.indexOf("video") !== -1 || mime === "application/vnd.google-apps.video") {
    return true;
  }

  if (
    norm.indexOf("GRABACION") !== -1 ||
    norm.indexOf("RECORDING") !== -1 ||
    norm.indexOf("VIDEO") !== -1 ||
    norm.indexOf("MEET") !== -1
  ) {
    return true;
  }

  return false;
}

function encontrarArchivoTranscripcion(folder) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (esArchivoTranscripcion(file.getName())) {
      return file;
    }
  }
  return null;
}

function encontrarArchivoVideo(folder) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (esArchivoVideo(file)) {
      return file;
    }
  }
  return null;
}

function buscarCarpetasRecursivas(folder, lista) {
  lista.push(folder);
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    buscarCarpetasRecursivas(subfolders.next(), lista);
  }
}

function buscarCarpetasConTranscripciones(folder, lista) {
  var files = folder.getFiles();
  var tiene = false;

  while (files.hasNext()) {
    var f = files.next();
    if (esArchivoTranscripcion(f.getName())) {
      tiene = true;
      break;
    }
  }

  if (tiene) {
    lista.push(folder);
  }

  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    buscarCarpetasConTranscripciones(subfolders.next(), lista);
  }
}

function extraerTexto(file) {
  var raw = "";
  var mime = file.getMimeType();
  if (mime === "application/vnd.google-apps.document") {
    raw = DocumentApp.openById(file.getId()).getBody().getText();
  } else {
    try {
      raw = file.getBlob().getDataAsString("UTF-8");
    } catch (e) {
      raw = file.getBlob().getDataAsString();
    }
  }

  return limpiarYOptimizarTranscripcion(raw);
}

function limpiarYOptimizarTranscripcion(texto) {
  if (!texto) return "";

  var originalLen = texto.length;
  var limpio = texto.replace(/\[?\b\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\]?/g, " ");
  limpio = limpio.replace(/\d{1,2}:\d{2}:\d{2}[\,\.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[\,\.]\d{3}/g, " ");

  var lineas = limpio.split(/\r?\n/);
  var lineasUtiles = [];

  var patronesRelleno = [
    /^(buenos d[ií]as|buenas tardes|buenas noches|hola a todos|chao|hasta luego|adi[oó]s)/i,
    /^(me escuchan|se escucha|ven mi pantalla|pueden ver mi pantalla|comparto pantalla)/i,
    /^(vamos a pasar lista|asistencia|presente|un momento por favor|esperen un segundo)/i,
    /^(vamos a un receso|cinco minutos de descanso|pausa activa|receso)/i,
    /^(probando sonido|1 2 3|ok ok|bueno bueno)/i
  ];

  for (var i = 0; i < lineas.length; i++) {
    var l = lineas[i].trim();
    if (!l || l.length < 6) continue;

    l = l.replace(/^(profesor|docente|estudiante|alumno|speaker\s*\d+|persona\s*\d+)\s*:\s*/i, "");

    var esRelleno = false;
    for (var p = 0; p < patronesRelleno.length; p++) {
      if (patronesRelleno[p].test(l)) {
        esRelleno = true;
        break;
      }
    }

    if (!esRelleno) {
      lineasUtiles.push(l);
    }
  }

  var resultado = lineasUtiles.join("\n");
  var MAX_CARACTERES = 35000;
  if (resultado.length > MAX_CARACTERES) {
    resultado = condensarTexto(resultado, MAX_CARACTERES);
  }

  var ahorro = Math.round(((originalLen - resultado.length) / originalLen) * 100);
  console.log("   Transcripción optimizada: de " + originalLen + " a " + resultado.length + " caracteres (" + ahorro + "% de ahorro en tokens).");

  return resultado;
}

function condensarTexto(texto, maxLen) {
  var parrafos = texto.split(/\n{1,2}/);
  var parrafosSeleccionados = [];
  var acumulado = 0;

  for (var i = 0; i < parrafos.length; i++) {
    var p = parrafos[i].trim();
    if (p.length > 20) {
      if (acumulado + p.length > maxLen) break;
      parrafosSeleccionados.push(p);
      acumulado += p.length + 1;
    }
  }

  return parrafosSeleccionados.join("\n\n");
}

function extraerIdDeDrive(valor) {
  if (!valor) return "";
  var str = valor.toString().trim();
  var match = str.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  var docMatch = str.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (docMatch) return docMatch[1];
  var cleanMatch = str.match(/^([a-zA-Z0-9_-]+)/);
  if (cleanMatch) return cleanMatch[1];
  return str;
}

function llamarEdgeFunction(payloadObj, cronSecret) {
  var payload = JSON.stringify(payloadObj);

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-automation-secret": cronSecret ? cronSecret.trim() : "",
      "x-cron-secret": cronSecret ? cronSecret.trim() : "",
      "Authorization": "Bearer " + (cronSecret ? cronSecret.trim() : ""),
    },
    payload: payload,
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(EDGE_FUNCTION_URL, options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { ok: false, error: "Respuesta inválida (HTTP " + statusCode + "): " + responseText.substring(0, 200) };
  }
}

function obtenerHojaDeLog(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Log Automatizacion");

  if (!sheet) {
    sheet = ss.insertSheet("Log Automatizacion");
    sheet.appendRow([
      "Fecha",
      "ID Archivo",
      "Nombre Archivo",
      "Folder ID",
      "Nombre Carpeta",
      "Tipo Evento",
      "Detalle / Resultado",
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function yaFueProcesado(sheet, fileId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === fileId && (data[i][5] === "IA_OK" || data[i][5] === "OK")) {
      return true;
    }
  }
  return false;
}

function registrarEnLog(sheet, fileId, fileName, folderId, folderName, estado, detalle) {
  sheet.appendRow([
    new Date(),
    fileId,
    fileName,
    folderId,
    folderName,
    estado,
    detalle,
  ]);
}
