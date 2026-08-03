/**
 * LIATER - Automatizacion Google Drive -> Supabase
 *
 * Configura en Propiedades del Script:
 *   - ROOT_FOLDER_ID: ID de la carpeta raiz en Drive donde estan las subcarpetas de sesion
 *   - DRIVE_AUTOMATION_SECRET: Secreto configurado en Supabase (o DRIVE_CRON_SECRET)
 *   - LOG_SHEET_ID: (Opcional) ID de una hoja de Google Sheets para registrar el historial
 */

var EDGE_FUNCTION_URL = "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";
var QUESTION_COUNT = 5;

/**
 * Funcion principal para ejecutar manualmente o por activador de tiempo
 */
function procesarTranscripciones() {
  var props = PropertiesService.getScriptProperties();
  var rootFolderId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var logSheetId = props.getProperty("LOG_SHEET_ID");

  if (!rootFolderId || !cronSecret) {
    Logger.log("ERROR: Faltan propiedades del script. Configura ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET.");
    return;
  }

  var log = logSheetId ? obtenerHojaDeLog(logSheetId) : null;
  var rootFolder = DriveApp.getFolderById(rootFolderId);
  var subfolders = rootFolder.getFolders();
  var procesadas = 0;
  var errores = 0;

  while (subfolders.hasNext()) {
    var subfolder = subfolders.next();
    var folderId = subfolder.getId();
    var folderName = subfolder.getName();

    var transcripcionDoc = encontrarTranscripcion(subfolder);
    if (!transcripcionDoc) {
      Logger.log("Sin transcripcion en: " + folderName);
      continue;
    }

    var docId = transcripcionDoc.getId();
    var docName = transcripcionDoc.getName();

    if (log && yaFueProcesado(log, docId)) {
      Logger.log("Ya procesado anteriormente: " + docName);
      continue;
    }

    Logger.log("Procesando: " + docName + " en carpeta " + folderName);

    try {
      var transcript = DocumentApp.openById(docId).getBody().getText();

      if (transcript.length < 200) {
        var msg = "Transcripcion muy corta (" + transcript.length + " caracteres): " + docName;
        Logger.log("IGNORADO: " + msg);
        if (log) registrarEnLog(log, docId, docName, folderId, folderName, "IGNORADO", msg);
        continue;
      }

      var resultado = llamarEdgeFunction(folderId, transcript, cronSecret);

      if (resultado.ok) {
        Logger.log("OK: draft_id=" + resultado.draft_id + " clase=" + resultado.class_title);
        if (log) {
          registrarEnLog(log, docId, docName, folderId, folderName, "OK", "draft_id=" + resultado.draft_id + " | " + resultado.class_title);
        }
        procesadas++;
      } else if (resultado.already_processed) {
        Logger.log("Ya existe borrador previo: " + docName);
        if (log) {
          registrarEnLog(log, docId, docName, folderId, folderName, "DUPLICADO", resultado.error || "Ya existe borrador");
        }
      } else {
        Logger.log("ERROR en Edge Function: " + JSON.stringify(resultado));
        if (log) {
          registrarEnLog(log, docId, docName, folderId, folderName, "ERROR", resultado.error || "Error desconocido");
        }
        errores++;
      }
    } catch (e) {
      var errMsg = e.toString();
      Logger.log("EXCEPCION procesando " + docName + ": " + errMsg);
      if (log) {
        registrarEnLog(log, docId, docName, folderId, folderName, "EXCEPCION", errMsg);
      }
      errores++;
    }
  }

  Logger.log("Finalizado. Procesadas: " + procesadas + " | Errores: " + errores);
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

function llamarEdgeFunction(driveFolderId, transcript, cronSecret) {
  var payload = JSON.stringify({
    drive_folder_id: driveFolderId,
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

  Logger.log("HTTP " + statusCode + ": " + responseText.substring(0, 300));

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
