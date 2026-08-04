/**
 * LIATER - Automatizacion Google Drive -> Supabase
 *
 * Configura en Propiedades del Script (⚙️ Configuración del proyecto -> Propiedades del script):
 *   - ROOT_FOLDER_ID: ID o enlace completo de la carpeta raiz en Google Drive
 *   - DRIVE_AUTOMATION_SECRET: Secreto configurado en Supabase
 *   - LOG_SHEET_ID: (Opcional) ID o enlace del Google Sheet para el historial
 */

var EDGE_FUNCTION_URL = "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";
var QUESTION_COUNT = 5;

/**
 * Normaliza y quita tildes para comparaciones
 */
function limpiarTexto(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

/**
 * Determina si el nombre de un archivo corresponde a una transcripcion
 */
function esArchivoTranscripcion(nombre) {
  var norm = limpiarTexto(nombre);
  return norm.indexOf("TRANSCRIP") !== -1 || norm.indexOf("TRANSCRIPT") !== -1;
}

/**
 * Limpia y extrae el ID de una URL de Drive o devuelve el ID limpio
 */
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

/**
 * Funcion principal para procesar transcripciones
 */
function procesarTranscripciones() {
  console.log("==========================================");
  console.log("Iniciando procesamiento de transcripciones y videos...");
  console.log("==========================================");

  var props = PropertiesService.getScriptProperties();
  var rawRootId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var rawSheetId = props.getProperty("LOG_SHEET_ID");

  var rootFolderId = extraerIdDeDrive(rawRootId);
  var logSheetId = extraerIdDeDrive(rawSheetId);

  if (!rootFolderId || !cronSecret) {
    console.error("ERROR: Faltan propiedades del script. Configura ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET.");
    return;
  }

  var log = null;
  if (logSheetId) {
    try {
      log = obtenerHojaDeLog(logSheetId);
    } catch (sheetErr) {
      console.warn("Aviso: No se pudo abrir la hoja de log (se omitira el log en Sheets): " + sheetErr.message);
    }
  }

  var rootFolder;
  try {
    rootFolder = DriveApp.getFolderById(rootFolderId);
  } catch (err) {
    console.error("ERROR: No se pudo acceder a la carpeta de Drive con ID '" + rootFolderId + "'. Verifica permisos.");
    return;
  }

  console.log("Carpeta raiz analizada: '" + rootFolder.getName() + "' (ID: " + rootFolder.getId() + ")");

  // Buscar todas las carpetas que contengan archivos de transcripcion (recursivo)
  var carpetasConTranscripcion = [];
  buscarCarpetasConTranscripciones(rootFolder, carpetasConTranscripcion);

  console.log("Carpetas con transcripciones encontradas: " + carpetasConTranscripcion.length);

  var procesadas = 0;
  var errores = 0;

  for (var i = 0; i < carpetasConTranscripcion.length; i++) {
    var folder = carpetasConTranscripcion[i];
    var resultado = procesarCarpeta(folder, log, cronSecret);
    if (resultado === "OK") procesadas++;
    else if (resultado === "ERROR") errores++;
  }

  console.log("==========================================");
  console.log("Resumen: Procesadas: " + procesadas + " | Errores: " + errores);
  console.log("==========================================");
}

/**
 * Busca de forma recursiva carpetas que contengan archivos de transcripcion
 */
function buscarCarpetasConTranscripciones(folder, lista) {
  var files = folder.getFiles();
  var tiene = false;

  while (files.hasNext()) {
    var f = files.next();
    var fName = f.getName();
    if (esArchivoTranscripcion(fName)) {
      tiene = true;
      console.log("-> Encontrado archivo de transcripcion: '" + fName + "' en carpeta '" + folder.getName() + "'");
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

/**
 * Procesa una carpeta individual
 */
function procesarCarpeta(folder, log, cronSecret) {
  var folderId = folder.getId();
  var folderName = folder.getName();

  var transcripcionFile = encontrarArchivoTranscripcion(folder);
  var videoFile = encontrarArchivoVideo(folder);
  var videoUrl = "";

  if (videoFile) {
    videoUrl = "https://drive.google.com/file/d/" + videoFile.getId() + "/preview";
    console.log("-> Grabación de video encontrada: '" + videoFile.getName() + "' (ID: " + videoFile.getId() + ")");
  }

  if (!transcripcionFile) {
    console.log("Sin archivo de transcripcion en: " + folderName);
    return "SKIP";
  }

  var fileId = transcripcionFile.getId();
  var fileName = transcripcionFile.getName();

  if (log && yaFueProcesado(log, fileId)) {
    console.log("Ya procesado anteriormente segun el Log: " + fileName);
    return "DUPLICADO";
  }

  console.log("Leyendo contenido de: '" + fileName + "'...");

  try {
    var transcript = extraerTexto(transcripcionFile);

    if (!transcript || transcript.length < 200) {
      var len = transcript ? transcript.length : 0;
      var msg = "Transcripcion muy corta (" + len + " caracteres): " + fileName;
      console.log("IGNORADO: " + msg);
      if (log) registrarEnLog(log, fileId, fileName, folderId, folderName, "IGNORADO", msg);
      return "SKIP";
    }

    console.log("Enviando " + transcript.length + " caracteres a Supabase Edge Function...");
    var resultado = llamarEdgeFunction(folderId, transcript, cronSecret, folderName, fileName, videoUrl);

    if (resultado.ok) {
      console.log("EXITO: Borrador creado en Supabase! ID=" + resultado.draft_id + " para la clase: '" + resultado.class_title + "'");
      if (resultado.video_url) {
        console.log("-> Enlace de video vinculado a la clase: " + resultado.video_url);
      }
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "OK", "draft_id=" + resultado.draft_id + " | " + resultado.class_title + (videoUrl ? " | Video OK" : ""));
      }
      return "OK";
    } else if (resultado.already_processed) {
      console.log("Aviso: " + (resultado.error || "Ya existe un borrador para esta clase"));
      if (resultado.video_url) {
        console.log("-> Enlace de video actualizado en la clase: " + resultado.video_url);
      }
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "DUPLICADO", resultado.error || "Ya existe borrador");
      }
      return "DUPLICADO";
    } else {
      console.error("ERROR en Supabase: " + (resultado.error || JSON.stringify(resultado)));
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "ERROR", resultado.error || "Error desconocido");
      }
      return "ERROR";
    }
  } catch (e) {
    var errMsg = e.toString();
    console.error("EXCEPCION procesando " + fileName + ": " + errMsg);
    if (log) {
      registrarEnLog(log, fileId, fileName, folderId, folderName, "EXCEPCION", errMsg);
    }
    return "ERROR";
  }
}

/**
 * Encuentra el archivo de transcripcion dentro de una carpeta
 */
function encontrarArchivoTranscripcion(folder) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    if (esArchivoTranscripcion(file.getName())) {
      return file;
    }
  }
  return null;
/**
 * Encuentra el archivo de video o grabacion dentro de una carpeta
 */
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

/**
 * Determina con precision si un archivo es un video o grabacion
 */
function esArchivoVideo(file) {
  var mime = (file.getMimeType() || "").toLowerCase();
  var name = (file.getName() || "").toLowerCase();
  var norm = limpiarTexto(file.getName() || "");

  // Excluir archivos de texto, documentos o transcripciones
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

  // Extensiones tipicas de video
  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv|flv|3gp|ts|mts)$/i.test(name)) {
    return true;
  }

  // Mime types de video
  if (mime.indexOf("video") !== -1 || mime === "application/vnd.google-apps.video") {
    return true;
  }

  // Nombres que indiquen grabacion o video
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

/**
 * Extrae texto de Google Docs, archivos TXT u otros formatos
 */
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

/**
 * Limpia y optimiza la transcripcion antes de enviarla a Supabase:
 * - Elimina timestamps [00:12:34] o subtitulos SRT/VTT
 * - Elimina frases de relleno (saludos, pruebas de audio/pantalla, recesos)
 * - Condensa si supera el limite optimo para ahorrar tokens
 */
function limpiarYOptimizarTranscripcion(texto) {
  if (!texto) return "";

  var originalLen = texto.length;

  // 1. Eliminar marcas de tiempo [00:12:34], (12:34), 00:00:00,000 --> 00:00:05,000
  var limpio = texto.replace(/\[?\b\d{1,2}:\d{2}(:\d{2})?(\.\d+)?\]?/g, " ");
  limpio = limpio.replace(/\d{1,2}:\d{2}:\d{2}[\,\.]\d{3}\s*-->\s*\d{1,2}:\d{2}:\d{2}[\,\.]\d{3}/g, " ");

  // 2. Separar lineas y filtrar relleno
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
    if (!l) continue;

    // Omitir lineas demasiado cortas que no aportan contenido academico
    if (l.length < 6) continue;

    // Eliminar etiquetas de hablante iniciales como "Profesor:", "Speaker 1:"
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

  // 3. Limite maximo inteligente: si supera los 35,000 caracteres (~7,000 palabras)
  // seleccionamos los bloques mas significativos para no desbordar el modelo
  var MAX_CARACTERES = 12000;
  if (resultado.length > MAX_CARACTERES) {
    resultado = condensarTexto(resultado, MAX_CARACTERES);
  }

  var ahorro = Math.round(((originalLen - resultado.length) / originalLen) * 100);
  console.log("Limpieza completada: de " + originalLen + " a " + resultado.length + " caracteres (ahorro del " + ahorro + "% en tokens).");

  return resultado;
}

/**
 * Condensa un texto largo conservando los parrafos con mayor contenido conceptual
 */
function condensarTexto(texto, maxLen) {
  var parrafos = texto.split(/\n{1,2}/);
  var parrafosSeleccionados = [];
  var acumulado = 0;

  for (var i = 0; i < parrafos.length; i++) {
    var p = parrafos[i].trim();
    if (p.length > 20) {
      if (acumulado + p.length > maxLen) {
        break;
      }
      parrafosSeleccionados.push(p);
      acumulado += p.length + 1;
    }
  }

  return parrafosSeleccionados.join("\n\n");
}

/**
 * Realiza la peticion HTTP a la Edge Function
 */
function llamarEdgeFunction(driveFolderId, transcript, cronSecret, folderName, docName, videoUrl) {
  var payload = JSON.stringify({
    drive_folder_id: driveFolderId,
    folder_name: folderName || "",
    doc_name: docName || "",
    transcript: transcript || "",
    video_url: videoUrl || "",
    questionCount: QUESTION_COUNT,
  });

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

  console.log("HTTP " + statusCode + ": " + responseText.substring(0, 300));

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { ok: false, error: "Respuesta no valida (" + statusCode + "): " + responseText };
  }
}

/**
 * Funcion auxiliar para sincronizar unicamente videos de clases encontrados en Drive
 */
function sincronizarVideosDeClases() {
  console.log("==========================================");
  console.log("Iniciando sincronización de grabaciones...");
  console.log("==========================================");

  var props = PropertiesService.getScriptProperties();
  var rawRootId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var rootFolderId = extraerIdDeDrive(rawRootId);

  if (!rootFolderId || !cronSecret) {
    console.error("ERROR: Faltan propiedades del script. Asegúrate de configurar ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET.");
    return;
  }

  var rootFolder;
  try {
    rootFolder = DriveApp.getFolderById(rootFolderId);
  } catch (e) {
    console.error("ERROR: No se pudo abrir la carpeta raíz con ID: " + rootFolderId + ". " + e.message);
    return;
  }

  console.log("Carpeta raíz: '" + rootFolder.getName() + "' (ID: " + rootFolder.getId() + ")");
  var carpetas = [];
  buscarCarpetasRecursivas(rootFolder, carpetas);

  console.log("Total carpetas encontradas: " + carpetas.length);
  var sincronizados = 0;

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();
    var videoFile = encontrarArchivoVideo(folder);

    if (videoFile) {
      var videoUrl = "https://drive.google.com/file/d/" + videoFile.getId() + "/preview";
      console.log("-> Encontrado video: '" + videoFile.getName() + "' en carpeta '" + folderName + "'");
      console.log("   URL: " + videoUrl);

      var transcripcionFile = encontrarArchivoTranscripcion(folder);
      var transcript = transcripcionFile ? extraerTexto(transcripcionFile) : "";

      var res = llamarEdgeFunction(folder.getId(), transcript, cronSecret, folderName, videoFile.getName(), videoUrl);
      console.log("   Resultado Supabase:", JSON.stringify(res));
      if (res && res.ok) {
        sincronizados++;
      }
    } else {
      console.log("   Sin video en carpeta: '" + folderName + "'");
    }
  }

  console.log("==========================================");
  console.log("Sincronización finalizada. Videos asociados: " + sincronizados);
  console.log("==========================================");
}

function buscarCarpetasRecursivas(folder, lista) {
  lista.push(folder);
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    buscarCarpetasRecursivas(subfolders.next(), lista);
  }
}

function obtenerHojaDeLog(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Log Automatizacion");

  if (!sheet) {
    sheet = ss.insertSheet("Log Automatizacion");
    sheet.appendRow([
      "Fecha",
      "Doc ID",
      "Nombre del Doc",
      "Folder ID",
      "Nombre Carpeta",
      "Estado",
      "Detalle",
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function yaFueProcesado(sheet, docId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][1] === docId && data[i][5] === "OK") {
      return true;
    }
  }
  return false;
}

function registrarEnLog(sheet, docId, docName, folderId, folderName, estado, detalle) {
  sheet.appendRow([
    new Date(),
    docId,
    docName,
    folderId,
    folderName,
    estado,
    detalle,
  ]);
}
