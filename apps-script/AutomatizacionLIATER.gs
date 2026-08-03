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
      Logger.log("Aviso: No se pudo abrir la hoja de log (se omitira el log en Sheets): " + sheetErr.message);
    }
  }

  var rootFolder;
  try {
    rootFolder = DriveApp.getFolderById(rootFolderId);
  } catch (err) {
    Logger.log("ERROR: No se pudo acceder a la carpeta de Drive con ID '" + rootFolderId + "'. Verifica que el ID sea correcto y que tengas permisos de acceso.");
    return;
  }

  Logger.log("Carpeta raiz analizada: '" + rootFolder.getName() + "' (ID: " + rootFolder.getId() + ")");

  // Buscar todas las carpetas que contengan archivos de transcripcion (recursivo)
  var carpetasConTranscripcion = [];
  buscarCarpetasConTranscripciones(rootFolder, carpetasConTranscripcion);

  Logger.log("Carpetas con transcripciones encontradas: " + carpetasConTranscripcion.length);

  var procesadas = 0;
  var errores = 0;

  for (var i = 0; i < carpetasConTranscripcion.length; i++) {
    var folder = carpetasConTranscripcion[i];
    var resultado = procesarCarpeta(folder, log, cronSecret);
    if (resultado === "OK") procesadas++;
    else if (resultado === "ERROR") errores++;
  }

  Logger.log("==========================================");
  Logger.log("Resumen: Procesadas: " + procesadas + " | Errores: " + errores);
  Logger.log("==========================================");
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
      Logger.log("-> Encontrado archivo de transcripcion: '" + fName + "' en carpeta '" + folder.getName() + "'");
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
  if (!transcripcionFile) {
    Logger.log("Sin archivo de transcripcion en: " + folderName);
    return "SKIP";
  }

  var fileId = transcripcionFile.getId();
  var fileName = transcripcionFile.getName();

  if (log && yaFueProcesado(log, fileId)) {
    Logger.log("Ya procesado anteriormente segun el Log: " + fileName);
    return "DUPLICADO";
  }

  Logger.log("Leyendo contenido de: '" + fileName + "'...");

  try {
    var transcript = extraerTexto(transcripcionFile);

    if (!transcript || transcript.length < 200) {
      var len = transcript ? transcript.length : 0;
      var msg = "Transcripcion muy corta (" + len + " caracteres): " + fileName;
      Logger.log("IGNORADO: " + msg);
      if (log) registrarEnLog(log, fileId, fileName, folderId, folderName, "IGNORADO", msg);
      return "SKIP";
    }

    Logger.log("Enviando " + transcript.length + " caracteres a Supabase Edge Function...");
    var resultado = llamarEdgeFunction(folderId, transcript, cronSecret, folderName, fileName);

    if (resultado.ok) {
      Logger.log("EXITO: Borrador creado en Supabase! ID=" + resultado.draft_id + " para la clase: '" + resultado.class_title + "'");
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "OK", "draft_id=" + resultado.draft_id + " | " + resultado.class_title);
      }
      return "OK";
    } else if (resultado.already_processed) {
      Logger.log("Aviso: " + (resultado.error || "Ya existe un borrador para esta clase"));
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "DUPLICADO", resultado.error || "Ya existe borrador");
      }
      return "DUPLICADO";
    } else {
      Logger.log("ERROR en Supabase: " + (resultado.error || JSON.stringify(resultado)));
      if (log) {
        registrarEnLog(log, fileId, fileName, folderId, folderName, "ERROR", resultado.error || "Error desconocido");
      }
      return "ERROR";
    }
  } catch (e) {
    var errMsg = e.toString();
    Logger.log("EXCEPCION procesando " + fileName + ": " + errMsg);
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
}

/**
 * Extrae texto de Google Docs, archivos TXT u otros formatos
 */
function extraerTexto(file) {
  var mime = file.getMimeType();
  if (mime === "application/vnd.google-apps.document") {
    return DocumentApp.openById(file.getId()).getBody().getText();
  }
  // Archivo de texto plano / Markdown
  try {
    return file.getBlob().getDataAsString("UTF-8");
  } catch (e) {
    return file.getBlob().getDataAsString();
  }
}

/**
 * Realiza la peticion HTTP a la Edge Function
 */
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

  Logger.log("HTTP " + statusCode + ": " + responseText.substring(0, 300));

  try {
    return JSON.parse(responseText);
  } catch (e) {
    return { ok: false, error: "Respuesta no valida (" + statusCode + "): " + responseText };
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
