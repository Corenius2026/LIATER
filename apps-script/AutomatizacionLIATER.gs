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
  var props = PropertiesService.getScriptProperties();
  var rawRootId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var rawSheetId = props.getProperty("LOG_SHEET_ID");

  var rootFolderId = extraerIdDeDrive(rawRootId);
  var logSheetId = extraerIdDeDrive(rawSheetId);

  if (!rootFolderId || !cronSecret) {
    Logger.log("ERROR: Faltan propiedades del script. Configura ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET.");
    return;
  }

  var log = null;
  if (logSheetId) {
    try {
      log = obtenerHojaDeLog(logSheetId);
    } catch (sheetErr) {
      Logger.log("Aviso: No se pudo abrir la hoja de log (se omitirá el log en Sheets): " + sheetErr.message);
    }
  }

  var rootFolder;
  try {
    rootFolder = DriveApp.getFolderById(rootFolderId);
  } catch (err) {
    Logger.log("ERROR: No se pudo acceder a la carpeta de Drive con ID '" + rootFolderId + "'. Verifica que el ID sea correcto y que tengas permisos de acceso.");
    return;
  }

  Logger.log("Carpeta raiz encontrada: " + rootFolder.getName());

  var subfolders = rootFolder.getFolders();
  var procesadas = 0;
  var errores = 0;
  var carpetasRevisadas = 0;

  // 1. Revisa subcarpetas (estructura recomendada: CarpetaRaiz -> SubcarpetaSesion -> Archivos)
  while (subfolders.hasNext()) {
    carpetasRevisadas++;
    var subfolder = subfolders.next();
    var resultado = procesarCarpeta(subfolder, log, cronSecret);
    if (resultado === "OK") procesadas++;
    else if (resultado === "ERROR") errores++;
  }

  // 2. Si la carpeta raiz no tenia subcarpetas pero contiene los archivos directamente
  if (carpetasRevisadas === 0) {
    Logger.log("No se encontraron subcarpetas. Buscando transcripcion directamente en la carpeta raiz...");
    var resDirecto = procesarCarpeta(rootFolder, log, cronSecret);
    if (resDirecto === "OK") procesadas++;
    else if (resDirecto === "ERROR") errores++;
  }

  Logger.log("Finalizado. Procesadas: " + procesadas + " | Errores: " + errores);
}

/**
 * Procesa una carpeta de sesion individual
 */
function procesarCarpeta(folder, log, cronSecret) {
  var folderId = folder.getId();
  var folderName = folder.getName();

  var transcripcionDoc = encontrarTranscripcion(folder);
  if (!transcripcionDoc) {
    Logger.log("Sin transcripcion en: " + folderName);
    return "SKIP";
  }

  var docId = transcripcionDoc.getId();
  var docName = transcripcionDoc.getName();

  if (log && yaFueProcesado(log, docId)) {
    Logger.log("Ya procesado anteriormente: " + docName);
    return "DUPLICADO";
  }

  Logger.log("Procesando: " + docName + " en carpeta '" + folderName + "' (ID: " + folderId + ")");

  try {
    var transcript = DocumentApp.openById(docId).getBody().getText();

    if (transcript.length < 200) {
      var msg = "Transcripcion muy corta (" + transcript.length + " caracteres): " + docName;
      Logger.log("IGNORADO: " + msg);
      if (log) registrarEnLog(log, docId, docName, folderId, folderName, "IGNORADO", msg);
      return "SKIP";
    }

    var resultado = llamarEdgeFunction(folderId, transcript, cronSecret, folderName, docName);

    if (resultado.ok) {
      Logger.log("OK: Borrador creado con exito! draft_id=" + resultado.draft_id + " para la clase: " + resultado.class_title);
      if (log) {
        registrarEnLog(log, docId, docName, folderId, folderName, "OK", "draft_id=" + resultado.draft_id + " | " + resultado.class_title);
      }
      return "OK";
    } else if (resultado.already_processed) {
      Logger.log("Aviso: Ya existe un borrador para esta clase en Supabase (" + docName + ")");
      if (log) {
        registrarEnLog(log, docId, docName, folderId, folderName, "DUPLICADO", resultado.error || "Ya existe borrador");
      }
      return "DUPLICADO";
    } else {
      Logger.log("ERROR en Supabase: " + (resultado.error || JSON.stringify(resultado)));
      if (log) {
        registrarEnLog(log, docId, docName, folderId, folderName, "ERROR", resultado.error || "Error desconocido");
      }
      return "ERROR";
    }
  } catch (e) {
    var errMsg = e.toString();
    Logger.log("EXCEPCION procesando " + docName + ": " + errMsg);
    if (log) {
      registrarEnLog(log, docId, docName, folderId, folderName, "EXCEPCION", errMsg);
    }
    return "ERROR";
  }
}

function encontrarTranscripcion(folder) {
  var mimeGoogleDoc = "application/vnd.google-apps.document";
  var files = folder.getFilesByType(mimeGoogleDoc);

  while (files.hasNext()) {
    var file = files.next();
    if (file.getName().toUpperCase().indexOf("TRANSCRIPCION") !== -1) {
      return file;
    }
  }
  return null;
}

function llamarEdgeFunction(driveFolderId, transcript, cronSecret, folderName, docName) {
  var payload = JSON.stringify({
    drive_folder_id: driveFolderId,
    folder_name: folderName || "",
    doc_name: docName || "",
    transcript: transcript,
    questionCount: QUESTION_COUNT,
  });

  var options = {
    method: "post",
    contentType: "application/json",
    headers: {
      "x-automation-secret": cronSecret,
      "x-cron-secret": cronSecret,
    },
    payload: payload,
    muteHttpExceptions: true,
  };

  var response = UrlFetchApp.fetch(EDGE_FUNCTION_URL, options);
  var statusCode = response.getResponseCode();
  var responseText = response.getContentText();

  Logger.log("HTTP Respuesta " + statusCode + ": " + responseText.substring(0, 300));

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { ok: false, error: "Respuesta no valida: " + responseText };
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
