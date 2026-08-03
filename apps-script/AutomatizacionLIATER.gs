/**
 * LIATER – Automatización Google Drive → Supabase
 * ================================================
 * Este script monitorea carpetas de Google Drive vinculadas a sesiones
 * de clase y, cuando detecta un Google Doc de transcripción nuevo (no
 * procesado), lo envía a la Edge Function `automatizacion-drive` para
 * generar una actividad de reforzamiento con IA.
 *
 * INSTALACIÓN:
 * 1. Abre https://script.google.com y crea un proyecto nuevo.
 * 2. Pega este código en el editor.
 * 3. Ve a "Proyecto" → "Propiedades" → "Propiedades del script" y agrega:
 *      - EDGE_FUNCTION_URL : URL de la Edge Function (ver constante abajo)
 *      - DRIVE_CRON_SECRET : El mismo secreto configurado en Supabase
 *      - ROOT_FOLDER_ID    : ID de la carpeta raíz en Google Drive
 *      - LOG_SHEET_ID      : ID del Google Sheet para el log de ejecuciones
 * 4. Configura un trigger: "Ejecutar" → "Agregar activador"
 *      Función: procesarTranscripciones
 *      Origen:  Basado en tiempo → Días → Cada día (hora preferida)
 *
 * NOMENCLATURA ESPERADA DE ARCHIVOS:
 *   Carpeta raíz/
 *     └── Subcarpeta de sesión (su ID está en class_sessions.drive_folder_id)
 *           ├── DIP-CTRL-2026-01_M01_S001_TRANSCRIPCION  ← Google Doc
 *           └── DIP-CTRL-2026-01_M01_S001_GRABACION      ← video (ignorado)
 */

// ─── Configuración ──────────────────────────────────────────────────────────

var EDGE_FUNCTION_URL =
  "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";

var QUESTION_COUNT = 5; // Número de preguntas a generar por sesión

// ─── Punto de entrada principal ────────────────────────────────────────────

/**
 * Función principal. Configura el trigger de tiempo para que se ejecute
 * automáticamente cada día.
 */
function procesarTranscripciones() {
  var props = PropertiesService.getScriptProperties();
  var rootFolderId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var logSheetId = props.getProperty("LOG_SHEET_ID");

  if (!rootFolderId || !cronSecret) {
    Logger.log(
      "ERROR: Faltan propiedades del script. Configura ROOT_FOLDER_ID y DRIVE_AUTOMATION_SECRET."
    );
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

    // Busca un Google Doc cuyo nombre contenga "TRANSCRIPCION"
    var transcripcionDoc = encontrarTranscripcion(subfolder);

    if (!transcripcionDoc) {
      Logger.log("Sin transcripción en: " + folderName);
      continue;
    }

    var docId = transcripcionDoc.getId();
    var docName = transcripcionDoc.getName();

    // Evita reprocesar: revisa si el doc ya está en el log
    if (log && yaFueProcesado(log, docId)) {
      Logger.log("Ya procesado (log): " + docName);
      continue;
    }

    Logger.log("Procesando: " + docName + " en carpeta " + folderName);

    try {
      // Lee el texto del Google Doc (sin tokens de PDF)
      var transcript = leerTextoGoogleDoc(docId);

      if (transcript.length < 200) {
        var msg = "Transcripción muy corta (" + transcript.length + " chars): " + docName;
        Logger.log("IGNORADO: " + msg);
        if (log) registrarEnLog(log, docId, docName, folderId, folderName, "IGNORADO", msg);
        continue;
      }

      // Llama a la Edge Function de Supabase
      var resultado = llamarEdgeFunction(
        folderId,
        transcript,
        cronSecret
      );

      if (resultado.ok) {
        Logger.log(
          "OK: draft_id=" + resultado.draft_id +
          " clase=" + resultado.class_title
        );
        if (log) {
          registrarEnLog(
            log, docId, docName, folderId, folderName,
            "OK",
            "draft_id=" + resultado.draft_id + " | " + resultado.class_title
          );
        }
        procesadas++;
      } else if (resultado.already_processed) {
        Logger.log("Ya procesado (Supabase): " + docName);
        if (log) {
          registrarEnLog(
            log, docId, docName, folderId, folderName,
            "DUPLICADO",
            resultado.error || "Ya existe borrador"
          );
        }
      } else {
        Logger.log("ERROR en Edge Function: " + JSON.stringify(resultado));
        if (log) {
          registrarEnLog(
            log, docId, docName, folderId, folderName,
            "ERROR",
            resultado.error || "Error desconocido"
          );
        }
        errores++;
      }
    } catch (e) {
      var errMsg = e.toString();
      Logger.log("EXCEPCIÓN procesando " + docName + ": " + errMsg);
      if (log) {
        registrarEnLog(
          log, docId, docName, folderId, folderName,
          "EXCEPCIÓN",
          errMsg
        );
      }
      errores++;
    }
  }

  Logger.log(
    "Finalizado. Procesadas: " + procesadas + " | Errores: " + errores
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Busca el primer Google Doc cuyo nombre contenga "TRANSCRIPCION"
 * dentro de la carpeta dada.
 * @param {GoogleAppsScript.Drive.Folder} folder
 * @returns {GoogleAppsScript.Drive.File|null}
 */
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

/**
 * Lee el texto plano de un Google Doc.
 * @param {string} docId
 * @returns {string}
 */
function leerTextoGoogleDoc(docId) {
  var doc = DocumentApp.openById(docId);
  return doc.getBody().getText();
}

/**
 * Llama a la Edge Function automatizacion-drive vía HTTP POST.
 * @param {string} driveFolderId  ID de la subcarpeta de la sesión
 * @param {string} transcript     Texto de la transcripción
 * @param {string} cronSecret     Secreto de autenticación
 * @returns {Object} Respuesta JSON de la Edge Function
 */
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
    return { ok: false, error: "Respuesta no válida: " + responseText };
  }
}

// ─── Log en Google Sheets ──────────────────────────────────────────────────

/**
 * Obtiene (o crea) la hoja de log en un Google Sheet existente.
 * @param {string} sheetId
 * @returns {GoogleAppsScript.Spreadsheet.Sheet}
 */
function obtenerHojaDeLog(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName("Log Automatización");

  if (!sheet) {
    sheet = ss.insertSheet("Log Automatización");
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

/**
 * Verifica si un docId ya fue procesado exitosamente (estado OK).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet
 * @param {string} docId
 * @returns {boolean}
 */
function yaFueProcesado(sheet, docId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    // Col B = Doc ID (índice 1), Col F = Estado (índice 5)
    if (data[i][1] === docId && data[i][5] === "OK") {
      return true;
    }
  }
  return false;
}

/**
 * Registra una fila en el log de Google Sheets.
 */
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
