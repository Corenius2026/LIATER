/**
 * ============================================================================
 * LIATER - Automatización Google Drive ➔ Supabase
 * ============================================================================
 * 
 * ESTRUCTURA JERÁRQUICA DE GOOGLE DRIVE:
 * 
 * [Nivel 0: Carpeta Raíz] ➔ "PROGRAMAS - LIATER" (Configurada en ROOT_FOLDER_ID)
 *    ├── [Nivel 1: Categorías y Año] ➔ "LIATER - Cursos 2026", "LIATER - Diplomados 2026"
 *    │      ├── [Nivel 2: Cursos / Diplomados] ➔ "CUR-ILUM-2026-2 - Hospitalaria", "CUR-ILUM-2026-2 - Deportiva"
 *    │      │      └── [Nivel 3: Sesiones] ➔ "Sesión - 4", "Sesión - 5", etc.
 *    │      │             └── [Nivel 4: Clases] ➔ "Clase - 1", "Clase - 2", "Clase - 3", etc.
 *    │      │                    └── Grabaciones (.mp4), Transcripciones (.gdoc, .txt)
 *    │      └── ℹ [Carpetas de utilería] ➔ "material", "plantillas", etc. (se ignoran automáticamente)
 * 
 * [Carpeta Origen Meet] ➔ "Meet Recordings" / "Grabaciones de Meet" (o MEET_RECORDINGS_FOLDER_ID)
 * 
 * NOMENCLATURA OFICIAL OBLIGATORIA (Guia_Nomenclatura_LIATER_Mejorada.pdf):
 *    Identificador Maestro en Calendar / Meet:
 *    [AAAA-P-TIPO-CODIGO-SNN] Nombre del programa
 *    - AAAA   : Año calendario (4 dígitos, ej: 2026, 2027)
 *    - P      : Periodo o cohorte dentro del año (1 o 2)
 *    - TIPO   : CUR (Curso), DIP (Diplomado), TAL (Taller), SEM (Seminario), CER (Certificación)
 *    - CODIGO : Código corto y estable del programa (ej: ILUM, IA, AUTO, FV)
 *    - SNN    : Sesión programada en Calendar (ej: S01, S02, S04, S10)
 *    - Nombre : Nombre legible del programa (ej: Hospitalaria, Deportiva)
 * 
 *    Grabaciones generadas por Google Meet:
 *    [2026-2-CUR-ILUM-S04] Hospitalaria - 2026/09/30 17:54 GMT-05:00 - Recording
 *    - Recording / Recording Vídeo     ➔ Clase - 1 (o Clase - 01)
 *    - Recording 2 / Recording 2 Vídeo ➔ Clase - 2 (o Clase - 02)
 *    - Recording 3 / Recording 3 Vídeo ➔ Clase - 3 (o Clase - 03)
 * 
 *    Estructura en Google Drive (Regla 09 de la guía):
 *    PROGRAMAS - LIATER
 *      └── LIATER - Cursos 2026
 *            └── CUR-ILUM-2026-2 - Hospitalaria  (TIPO-CODIGO-AAAA-P - Nombre)
 *                  └── Sesión - 04 (o Sesión - 4)
 *                        └── Clase - 01 (o Clase - 1)
 * 
 * ⚠️ REGLA ESTRICTA: Solo se procesan y mueven archivos que tengan este formato maestro exacto.
 * Cualquier reunión informal, sin corchetes o con formato no estándar es ignorada automáticamente.
 * 
 * FUNCIONES DISPONIBLES:
 * 1. `organizarGrabacionesDeMeet()`: Mueve grabaciones de video (.mp4) que cumplan la nomenclatura hacia
 *    su subcarpeta existente de Sesión y Clase (ej. "CUR-ILUM-2026-2 - Hospitalaria / Sesión - 4 / Clase - 3").
 *    ⚠️ NUNCA crea carpetas nuevas; utiliza exclusivamente la estructura existente y descarta documentos Word.
 * 2. `sincronizarSoloVideos()`: Organiza grabaciones pendientes y vincula las URLs de video en Supabase.
 * 3. `procesarTranscripcionesEIA()`: Lee transcripciones y genera cuestionarios con Gemini.
 * 4. `ejecutarTodo()`: Ejecuta en orden: Organizar Grabaciones ➔ Sincronizar Videos ➔ Transcripciones IA.
 * 5. `diagnosticarEstructura()`: Muestra en la consola de Apps Script todo el árbol detectado sin alterar datos.
 * 6. `configurarActivadores()`: Programa las ejecuciones automáticas (videos cada 30 min, IA cada 2 horas).
 * 7. `eliminarActivadores()`: Limpia los temporizadores automáticos.
 * 
 * ----------------------------------------------------------------------------
 * CONFIGURACIÓN EN GOOGLE APPS SCRIPT:
 * (⚙️ Configuración del proyecto -> Propiedades del script)
 *   - ROOT_FOLDER_ID: ID o enlace de la carpeta raíz "PROGRAMAS - LIATER"
 *   - DRIVE_AUTOMATION_SECRET: Secreto configurado en Supabase Edge Functions
 *   - MEET_RECORDINGS_FOLDER_ID: (Opcional) ID de carpeta "Meet Recordings" (se auto-detecta si no se especifica)
 *   - LOG_SHEET_ID: (Opcional) ID o enlace del Google Sheet para bitácora
 * ============================================================================
 */

var EDGE_FUNCTION_URL = "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";
var QUESTION_COUNT = 5;

// ============================================================================
// 1. ORGANIZADOR: GUARDAR EN LA CARPETA DE SESIÓN Y CLASE CORRESPONDIENTE
// ============================================================================

/**
 * Escanea la carpeta de Google Meet y las carpetas de programas.
 * Solo procesa archivos que cumplan la nomenclatura estipulada (ej: [2026-2-CUR-ILUM-S04]).
 * Guarda cada archivo en la subcarpeta exacta de la Sesión y de la Clase:
 * Ej: "CUR-ILUM-2026-2 - Hospitalaria / Sesión - 4 / Clase - 3"
 */
function organizarGrabacionesDeMeet() {
  console.log("=================================================");
  console.log("📂 ORGANIZANDO GRABACIONES EN SESIONES Y CLASES");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var programas = descubrirProgramas(rootFolder);
  if (programas.length === 0) {
    console.warn("⚠️ No se encontraron carpetas de cursos/programas en la raíz.");
    return;
  }

  var stats = {
    encontrados: 0,
    guardados: 0,
    errores: 0
  };

  // -------------------------------------------------------------
  // PASO 1: Procesar carpetas y subcarpetas de Google Meet
  // -------------------------------------------------------------
  var meetFolders = buscarCarpetasMeetOrigen(config.meetFolderId);
  if (meetFolders.length === 0) {
    console.log("ℹ No se encontró ninguna carpeta de origen para Meet (ej: 'Google Meet', 'Meet Recordings').");
  } else {
    console.log("Se encontraron " + meetFolders.length + " ubicación(es) de Meet para escanear.");

    for (var m = 0; m < meetFolders.length; m++) {
      var currentMeetFolder = meetFolders[m];
      console.log("\n--- Escaneando ubicación de Meet: '" + currentMeetFolder.getName() + "' (ID: " + currentMeetFolder.getId() + ") ---");

      // 1.1 Archivos sueltos en la raíz de la carpeta de Meet
      var iterArchivosDirectos = currentMeetFolder.getFiles();
      while (iterArchivosDirectos.hasNext()) {
        var fDirecto = iterArchivosDirectos.next();
        procesarYGuardarArchivo(fDirecto, currentMeetFolder.getName(), programas, config, stats);
      }

      // 1.2 Subcarpetas creadas por Google Meet (ej: '[2026-2-CUR-ILUM-S04] Hospitalaria (recurring)')
      var iterSubcarpetas = currentMeetFolder.getFolders();
      while (iterSubcarpetas.hasNext()) {
        var subMeet = iterSubcarpetas.next();
        var subMeetName = subMeet.getName();

        if (esCarpetaExcluida(subMeetName)) continue;

        var archivosEnSub = subMeet.getFiles();
        var archivosProcesadosEnSub = 0;

        while (archivosEnSub.hasNext()) {
          var fEnSub = archivosEnSub.next();
          var ok = procesarYGuardarArchivo(fEnSub, subMeetName, programas, config, stats);
          if (ok) archivosProcesadosEnSub++;
        }

        if (archivosProcesadosEnSub > 0) {
          console.log("   ✓ " + archivosProcesadosEnSub + " archivo(s) organizados desde subcarpeta de Meet: '" + subMeetName + "'");
        }
      }
    }
  }

  // -------------------------------------------------------------
  // PASO 2: Revisar grabaciones o subcarpetas sueltas en la raíz del curso
  // -------------------------------------------------------------
  for (var p = 0; p < programas.length; p++) {
    var prog = programas[p];

    // Archivos directos en la raíz del curso
    var filesEnRaizCurso = prog.carpeta.getFiles();
    while (filesEnRaizCurso.hasNext()) {
      var f = filesEnRaizCurso.next();
      procesarYGuardarArchivo(f, prog.nombre, programas, config, stats);
    }

    // Subcarpetas arrastradas a la raíz del curso (ej: carpetas de Meet)
    var subcarpetasEnProg = prog.carpeta.getFolders();
    while (subcarpetasEnProg.hasNext()) {
      var subP = subcarpetasEnProg.next();
      var subPName = subP.getName();

      if (!extraerNumeroSesionCarpeta(subPName) && !esCarpetaExcluida(subPName)) {
        var filesEnSubP = subP.getFiles();
        while (filesEnSubP.hasNext()) {
          procesarYGuardarArchivo(filesEnSubP.next(), subPName, programas, config, stats);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // PASO 3: Revisar si hay grabaciones sueltas dentro de "Sesión - X"
  // (para moverlas dentro de su respectiva subcarpeta "Clase - Y")
  // -------------------------------------------------------------
  for (var p2 = 0; p2 < programas.length; p2++) {
    var prg = programas[p2];
    var subcarpetasProg = prg.carpeta.getFolders();

    while (subcarpetasProg.hasNext()) {
      var subSesion = subcarpetasProg.next();
      var numSesion = extraerNumeroSesionCarpeta(subSesion.getName());

      // Si es una carpeta de sesión (ej: "Sesión - 4")
      if (numSesion) {
        var filesEnSesion = subSesion.getFiles();

        while (filesEnSesion.hasNext()) {
          var fS = filesEnSesion.next();
          var fnS = fS.getName();

          // FILTRO ESTRICTO: Solo mover archivos de VIDEO
          if (!esArchivoVideo(fS)) continue;

          if (!cumpleNomenclaturaEstipulada(fnS, subSesion.getName())) continue;

          var infoS = parseNomenclaturaGrabacion(fnS, subSesion.getName());
          if (!infoS) continue;

          var destinoClase = buscarCarpetaClaseExistente(subSesion, infoS.classNumber);
          if (!destinoClase) {
            console.warn("   ⚠️ No se encontró la subcarpeta existente para Clase " + infoS.classNumber + " en '" + subSesion.getName() + "'. No se creará ninguna carpeta.");
            continue;
          }

          // Verificar si ya está dentro de la carpeta de la clase
          var pS = fS.getParents();
          var idActual = pS.hasNext() ? pS.next().getId() : "";

          if (idActual !== destinoClase.getId()) {
            stats.encontrados++;
            console.log("\n-> Grabación suelta en '" + subSesion.getName() + "': '" + fnS + "' (Clase " + infoS.classNumber + ")");
            var okClase = moverArchivo(fS, destinoClase);
            if (okClase) {
              stats.guardados++;
              garantizarPermisosDeLectura(fS);
              console.log("   ✓ Guardado con éxito en: '" + prg.nombre + " / " + subSesion.getName() + " / " + destinoClase.getName() + "'");
            } else {
              stats.errores++;
              console.error("   ✗ Error al guardar en " + destinoClase.getName());
            }
          }
        }
      }
    }
  }

  console.log("\n=================================================");
  console.log("Resumen: " + stats.encontrados + " grabaciones encontradas | " + stats.guardados + " guardadas con éxito | " + stats.errores + " errores");
  console.log("=================================================");
}

/**
 * Procesa un archivo individual proveniente de Meet o de la raíz del curso,
 * extrayendo metadata combinada del archivo y de su carpeta padre,
 * ubicando el programa destino y moviéndolo a Sesión - X / Clase - Y.
 */
function procesarYGuardarArchivo(file, parentName, programas, config, stats) {
  var fileName = file.getName();

  // FILTRO ESTRICTO: Solo mover archivos de VIDEO (.mp4, .mov, .mkv, etc.)
  // NO mover archivos de Word (.docx, .doc), Google Docs, transcripciones, notas ni chats
  if (!esArchivoVideo(file)) {
    return false;
  }

  // Filtro: Solo procesar si el archivo o la carpeta padre cumplen la nomenclatura
  if (!cumpleNomenclaturaEstipulada(fileName, parentName)) {
    return false;
  }

  var info = parseNomenclaturaGrabacion(fileName, parentName);
  if (!info || !info.esGrabacionMeet) {
    return false;
  }

  stats.encontrados++;
  console.log("\n-> Grabación detectada: '" + fileName + "' en '" + parentName + "' (Sesión " + (info.sessionNumber || "?") + " - Clase " + info.classNumber + ")");

  var progDestino = encontrarProgramaParaGrabacion(programas, info);
  if (!progDestino) {
    stats.errores++;
    console.warn("   ✗ No se encontró la carpeta del programa para '" + (info.topic || parentName) + "' (Código: " + info.programCode + ")");
    return false;
  }

  // 1. Buscar la carpeta existente de la Sesión (ej: "Sesión - 4")
  var carpetaSesion = buscarCarpetaSesionExistente(progDestino.carpeta, info.sessionNumber);
  if (!carpetaSesion) {
    stats.errores++;
    console.warn("   ⚠️ No se encontró la carpeta existente para 'Sesión - " + info.sessionNumber + "' en '" + progDestino.nombre + "'. No se creará ninguna carpeta nueva.");
    return false;
  }

  // 2. Buscar la carpeta existente de la Clase (ej: "Clase - 1")
  var carpetaClase = buscarCarpetaClaseExistente(carpetaSesion, info.classNumber);
  if (!carpetaClase) {
    stats.errores++;
    console.warn("   ⚠️ No se encontró la carpeta existente para 'Clase - " + info.classNumber + "' en '" + progDestino.nombre + " / " + carpetaSesion.getName() + "'. No se creará ninguna carpeta nueva.");
    return false;
  }

  // Verificar si ya está en el destino para evitar operaciones redundantes
  var parents = file.getParents();
  var parentActualId = parents.hasNext() ? parents.next().getId() : "";
  if (parentActualId === carpetaClase.getId()) {
    return false; // Ya está ubicada
  }

  var exito = moverArchivo(file, carpetaClase);
  if (exito) {
    stats.guardados++;
    garantizarPermisosDeLectura(file);
    console.log("   ✓ Guardado con éxito en: '" + progDestino.nombre + " / " + carpetaSesion.getName() + " / " + carpetaClase.getName() + "'");

    if (config.logSheet) {
      registrarEnLog(
        config.logSheet,
        file.getId(),
        fileName,
        carpetaClase.getId(),
        carpetaClase.getName(),
        "GUARDADO_OK",
        "Guardado en " + progDestino.nombre + " / " + carpetaSesion.getName() + " / " + carpetaClase.getName() + " (Origen: " + parentName + ")",
        progDestino.nombre,
        progDestino.tipo,
        progDestino.anio
      );
    }
    return true;
  } else {
    stats.errores++;
    console.error("   ✗ Error al guardar el archivo en '" + carpetaClase.getName() + "'");
    return false;
  }
}

// ============================================================================
// 2. FLUJO PRINCIPAL: SINCRONIZACIÓN DE VIDEOS / GRABACIONES
// ============================================================================

/**
 * Escanea EXCLUSIVAMENTE la carpeta raíz "PROGRAMAS - LIATER",
 * detecta los cursos y las clases existentes, y sincroniza las grabaciones de video
 * hacia la plataforma LIATER / Supabase.
 * ⚠️ NO escanea carpetas de Google Meet / Meet Recordings.
 */
function sincronizarSoloVideos() {
  console.log("=================================================");
  console.log("▶ INICIANDO: Sincronización de Grabaciones de Video");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  console.log("📂 Escaneando exclusivamente la carpeta raíz de programas: '" + rootFolder.getName() + "'");

  var programas = descubrirProgramas(rootFolder);
  console.log("\nTotal de programas a sincronizar: " + programas.length);

  var videosActualizados = 0;
  var videosYaSincronizados = 0;
  var programasSinVideo = 0;
  var errores = 0;

  for (var p = 0; p < programas.length; p++) {
    var prog = programas[p];
    var itemsVideo = recolectarVideosDePrograma(prog);

    if (itemsVideo.length === 0) {
      programasSinVideo++;
      continue;
    }

    console.log("\n-------------------------------------------------");
    console.log("📂 Programa: '" + prog.nombre + "' (" + itemsVideo.length + " grabaciones)");

    for (var i = 0; i < itemsVideo.length; i++) {
      var item = itemsVideo[i];
      var videoFile = item.archivo;
      var folderId = item.idCarpeta;
      var folderName = item.nombreCarpeta;
      var nom = item.nomenclatura;

      try {
        garantizarPermisosDeLectura(videoFile);
        var videoUrl = "https://drive.google.com/file/d/" + videoFile.getId() + "/preview";

        var res = llamarEdgeFunction({
          drive_folder_id: folderId,
          folder_name: folderName,
          doc_name: videoFile.getName(),
          video_url: videoUrl,
          transcript: "",
          program_name: prog.nombre,
          program_folder_id: prog.id,
          program_type: prog.tipo,
          program_year: prog.anio,
          category_name: prog.categoriaNombre,
          session_number: nom ? nom.sessionNumber : null,
          class_number: nom ? nom.classNumber : 1,
          class_date: nom ? nom.isoDateString : null,
          recording_date: nom ? nom.formattedDate : null,
          recording_part: nom ? nom.recordingPart : 1,
          program_topic: nom ? nom.topic : null,
          nomenclature_tag: nom ? nom.tag : null
        }, config.cronSecret);

        if (res && res.ok) {
          if (res.already_synced) {
            videosYaSincronizados++;
            console.log("   ℹ Grabación ya estaba vinculada en Supabase para: '" + (res.class_title || folderName) + "'");
          } else {
            videosActualizados++;
            console.log("   ✓ Guardado con éxito en Supabase para: '" + (res.class_title || folderName) + "'");
          }
          if (config.logSheet) {
            registrarEnLog(
              config.logSheet,
              videoFile.getId(),
              videoFile.getName(),
              folderId,
              folderName,
              res.already_synced ? "VIDEO_EXISTENTE" : "VIDEO_OK",
              "[" + prog.nombre + "] " + (res.class_title ? "Clase: '" + res.class_title + "' | " : "") + (res.video_url || videoUrl) + (nom && nom.formattedDate ? " | Fecha: " + nom.formattedDate : ""),
              prog.nombre,
              prog.tipo,
              prog.anio
            );
          }
        } else {
          errores++;
          console.warn("   ✗ No se pudo vincular con Supabase: " + (res.error || JSON.stringify(res)));
          if (config.logSheet) {
            registrarEnLog(
              config.logSheet,
              videoFile.getId(),
              videoFile.getName(),
              folderId,
              folderName,
              "VIDEO_ERROR",
              "[" + prog.nombre + "] " + (res.error || "Error desconocido"),
              prog.nombre,
              prog.tipo,
              prog.anio
            );
          }
        }
      } catch (e) {
        errores++;
        console.error("   ✗ Excepción procesando video en '" + folderName + "': " + e.message);
      }
    }
  }

  console.log("\n=================================================");
  console.log("Resumen Sincronización -> Nuevos: " + videosActualizados + " | Ya vinculados: " + videosYaSincronizados + " | Errores: " + errores);
  console.log("=================================================");
}

// ============================================================================
// 3. FLUJO PRINCIPAL: PROCESAMIENTO DE TRANSCRIPCIONES E IA
// ============================================================================

/**
 * Escanea Drive por programa, lee transcripciones y genera actividades formativas con Gemini
 */
function procesarTranscripcionesEIA() {
  console.log("=================================================");
  console.log("▶ INICIANDO: Procesamiento de Transcripciones y Preguntas IA");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var programas = descubrirProgramas(rootFolder);
  var procesadas = 0;
  var omitidas = 0;
  var errores = 0;

  for (var p = 0; p < programas.length; p++) {
    var prog = programas[p];
    var itemsTrans = recolectarTranscripcionesDePrograma(prog);

    if (itemsTrans.length === 0) continue;

    console.log("\n-------------------------------------------------");
    console.log("📂 Procesando transcripciones de: '" + prog.nombre + "'");

    for (var i = 0; i < itemsTrans.length; i++) {
      var item = itemsTrans[i];
      var transFile = item.archivo;
      var fileId = transFile.getId();
      var fileName = transFile.getName();
      var folderId = item.idCarpeta;
      var folderName = item.nombreCarpeta;
      var nom = item.nomenclatura;

      if (config.logSheet && yaFueProcesado(config.logSheet, fileId)) {
        omitidas++;
        continue;
      }

      try {
        var transcript = extraerTexto(transFile);

        if (!transcript || transcript.length < 200) {
          omitidas++;
          continue;
        }

        console.log("   Enviando " + transcript.length + " caracteres a Gemini para '" + fileName + "'...");

        var resultado = llamarEdgeFunction({
          drive_folder_id: folderId,
          folder_name: folderName,
          doc_name: fileName,
          transcript: transcript,
          questionCount: QUESTION_COUNT,
          program_name: prog.nombre,
          program_folder_id: prog.id,
          program_type: prog.tipo,
          program_year: prog.anio,
          category_name: prog.categoriaNombre,
          session_number: nom ? nom.sessionNumber : null,
          class_number: nom ? nom.classNumber : 1,
          class_date: nom ? nom.isoDateString : null,
          recording_date: nom ? nom.formattedDate : null,
          recording_part: nom ? nom.recordingPart : 1,
          program_topic: nom ? nom.topic : null,
          nomenclature_tag: nom ? nom.tag : null
        }, config.cronSecret);

        if (resultado.ok && resultado.draft_id && !resultado.already_processed) {
          procesadas++;
          console.log("   ✓ Actividad generada con éxito para: '" + resultado.class_title + "' (ID: " + resultado.draft_id + ")");
          if (config.logSheet) {
            registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IA_OK", "[" + prog.nombre + "] draft_id=" + resultado.draft_id + " | " + resultado.class_title, prog.nombre, prog.tipo, prog.anio);
          }
        } else if (resultado.already_processed) {
          omitidas++;
          console.log("   ℹ Preguntas ya existentes para: '" + (resultado.class_title || folderName) + "'");
        } else {
          errores++;
          console.error("   ✗ Error en Supabase/Gemini: " + (resultado.error || JSON.stringify(resultado)));
        }
      } catch (e) {
        errores++;
        console.error("   ✗ Excepción procesando transcripción '" + fileName + "': " + e.message);
      }
    }
  }

  console.log("\n=================================================");
  console.log("Resumen IA -> Procesadas: " + procesadas + " | Omitidas: " + omitidas + " | Errores: " + errores);
  console.log("=================================================");
}

// ============================================================================
// 4. EJECUCIÓN TOTAL Y ACTIVADORES
// ============================================================================

function ejecutarTodo() {
  console.log("=================================================");
  console.log("🚀 EJECUCIÓN TOTAL: Organizar Grabaciones + Videos + Transcripciones");
  console.log("=================================================");
  organizarGrabacionesDeMeet();
  sincronizarSoloVideos();
  procesarTranscripcionesEIA();
}

function configurarActivadores() {
  eliminarActivadores();

  ScriptApp.newTrigger("sincronizarSoloVideos")
    .timeBased()
    .everyMinutes(30)
    .create();

  ScriptApp.newTrigger("procesarTranscripcionesEIA")
    .timeBased()
    .everyHours(2)
    .create();

  console.log("✓ Activadores configurados con éxito:");
  console.log("  - sincronizarSoloVideos: Cada 30 minutos (organiza en Sesión/Clase y vincula)");
  console.log("  - procesarTranscripcionesEIA: Cada 2 horas");
}

function eliminarActivadores() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    ScriptApp.deleteTrigger(triggers[i]);
  }
  console.log("Activadores anteriores eliminados.");
}

// ============================================================================
// 5. DIAGNÓSTICO
// ============================================================================

function diagnosticarEstructura() {
  console.log("=================================================");
  console.log("🔍 DIAGNÓSTICO DE ESTRUCTURA EN GOOGLE DRIVE");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  // 1. Diagnóstico de Meet Recordings y Google Meet
  var meetFolders = buscarCarpetasMeetOrigen(config.meetFolderId);
  var programasParaDiag = descubrirProgramas(rootFolder);

  console.log("\n-------------------------------------------------");
  console.log("📹 CARPETAS DE GOOGLE MEET DETECTADAS (" + meetFolders.length + "):");
  if (meetFolders.length === 0) {
    console.log("  ℹ No se encontraron carpetas de origen de Meet ('Google Meet', 'Meet Recordings').");
  }

  for (var m = 0; m < meetFolders.length; m++) {
    var mf = meetFolders[m];
    console.log("\n  [" + (m + 1) + "] Carpeta: '" + mf.getName() + "' (ID: " + mf.getId() + ")");

    // Archivos directos
    var meetFiles = mf.getFiles();
    var countDirect = 0;
    while (meetFiles.hasNext()) {
      var df = meetFiles.next();
      var esVidD = esArchivoVideo(df);
      if (cumpleNomenclaturaEstipulada(df.getName(), mf.getName())) {
        if (esVidD) {
          countDirect++;
          var dInfo = parseNomenclaturaGrabacion(df.getName(), mf.getName());
          var dProg = encontrarProgramaParaGrabacion(programasParaDiag, dInfo);
          var destTxtD = "";
          if (dProg) {
            var dSess = buscarCarpetaSesionExistente(dProg.carpeta, dInfo.sessionNumber);
            var dClase = dSess ? buscarCarpetaClaseExistente(dSess, dInfo.classNumber) : null;
            if (dSess && dClase) {
              destTxtD = " ➔ '" + dProg.nombre + " / " + dSess.getName() + " / " + dClase.getName() + "' (Carpeta existente ✓)";
            } else if (!dSess) {
              destTxtD = " ➔ ⚠️ Falta 'Sesión - " + dInfo.sessionNumber + "' en '" + dProg.nombre + "' (No se creará carpeta)";
            } else {
              destTxtD = " ➔ ⚠️ Falta 'Clase - " + dInfo.classNumber + "' en '" + dProg.nombre + " / " + dSess.getName() + "' (No se creará carpeta)";
            }
          } else {
            destTxtD = " ➔ ⚠️ Programa destino no detectado";
          }
          console.log("      🎥 [Video directo] " + df.getName() + destTxtD);
        } else {
          console.log("      📄 [Omitido] " + df.getName() + " (Documento/Word/transcripción - se queda en Meet)");
        }
      }
    }
    if (countDirect === 0) {
      console.log("      ℹ Sin grabaciones de video directas en la raíz de esta carpeta.");
    }

    // Subcarpetas de Meet
    var meetSubs = mf.getFolders();
    var countSub = 0;
    while (meetSubs.hasNext()) {
      countSub++;
      var sf = meetSubs.next();
      var sfName = sf.getName();

      if (!cumpleNomenclaturaEstipulada(sfName, "")) {
        console.log("      📁 [Subcarpeta Meet #" + countSub + "] '" + sfName + "' [Omitida: No cumple la nomenclatura oficial [AAAA-P-TIPO-CODIGO-SNN]]");
        continue;
      }

      var sInfo = parseNomenclaturaGrabacion(sfName, "");
      var sProg = encontrarProgramaParaGrabacion(programasParaDiag, sInfo);

      console.log("      📁 [Subcarpeta Meet #" + countSub + "] '" + sfName + "'");
      console.log("         - Sesión: " + (sInfo ? sInfo.sessionNumber : "N/A") + " | Tema: '" + (sInfo ? sInfo.topic : "N/A") + "' | Destino: " + (sProg ? "'" + sProg.nombre + "'" : "⚠️ No asociado"));

      var filesInSub = sf.getFiles();
      var countF = 0;
      while (filesInSub.hasNext()) {
        countF++;
        var subFile = filesInSub.next();
        var esVid = esArchivoVideo(subFile);
        var fInfo = parseNomenclaturaGrabacion(subFile.getName(), sfName);
        if (esVid) {
          var destTxtSub = "";
          if (sProg) {
            var sSess = buscarCarpetaSesionExistente(sProg.carpeta, fInfo.sessionNumber);
            var sClase = sSess ? buscarCarpetaClaseExistente(sSess, fInfo.classNumber) : null;
            if (sSess && sClase) {
              destTxtSub = " ➔ '" + sProg.nombre + " / " + sSess.getName() + " / " + sClase.getName() + "' (Carpeta existente ✓)";
            } else if (!sSess) {
              destTxtSub = " ➔ ⚠️ Falta 'Sesión - " + fInfo.sessionNumber + "' en '" + sProg.nombre + "' (No se creará carpeta)";
            } else {
              destTxtSub = " ➔ ⚠️ Falta 'Clase - " + fInfo.classNumber + "' en '" + sProg.nombre + " / " + sSess.getName() + "' (No se creará carpeta)";
            }
          } else {
            destTxtSub = " ➔ ⚠️ Programa destino no detectado";
          }
          console.log("         └─ (" + countF + ") 🎥 " + subFile.getName() + destTxtSub);
        } else {
          console.log("         └─ (" + countF + ") 📄 " + subFile.getName() + " [Omitido: Es documento/Word/transcripción]");
        }
      }
      if (countF === 0) {
        console.log("         └─ (Subcarpeta vacía o sin archivos)");
      }
    }
  }

  // 2. Diagnóstico de Programas
  var programas = descubrirProgramas(rootFolder);
  console.log("\n=================================================");
  console.log("📊 RESUMEN: " + programas.length + " PROGRAMA(S) IDENTIFICADO(S)");
  console.log("=================================================");

  for (var i = 0; i < programas.length; i++) {
    var p = programas[i];
    console.log("\n[" + (i + 1) + "] " + p.tipo.toUpperCase() + ": '" + p.nombre + "' (" + (p.anio || "N/A") + ")");

    var videos = recolectarVideosDePrograma(p);
    console.log("    - Videos: " + videos.length);
    for (var v = 0; v < videos.length; v++) {
      var itemV = videos[v];
      var nomV = itemV.nomenclatura;
      var descV = nomV && nomV.sessionNumber ? " [Sesión " + nomV.sessionNumber + " - Clase " + nomV.classNumber + "]" : "";
      console.log("       🎥 [" + itemV.nombreCarpeta + "] " + itemV.nombreArchivo + descV);
    }
  }

  console.log("\n=================================================");
  console.log("✓ Diagnóstico finalizado con éxito.");
  console.log("=================================================");
}

// ============================================================================
// 6. DETECCIÓN Y PARSER DE NOMENCLATURA
// ============================================================================

/**
 * Valida si un nombre de archivo o carpeta cumple estrictamente con el estándar maestro
 * estipulado en la Guía Operativa (Guia_Nomenclatura_LIATER_Mejorada.pdf):
 * Formato obligatorio: [AAAA-P-TIPO-CODIGO-SNN] Nombre del programa
 * Ej: [2026-2-CUR-ILUM-S04] Hospitalaria - 2026/09/30 17:54 GMT-05:00 - Recording
 */
function cumpleNomenclaturaEstipulada(str, parentFolderName) {
  if (!str && !parentFolderName) return false;
  var texto = ((str || "") + " " + (parentFolderName || "")).replace(/\s*\((?:recurring|recurrente)\)/gi, "").trim();

  // El identificador maestro OBLIGATORIAMENTE debe estar en corchetes: [AAAA-P-TIPO-CODIGO-SNN]
  // - AAAA: 4 dígitos de año (ej: 2026)
  // - P: Periodo 1 o 2
  // - TIPO: CUR, DIP, TAL, SEM, CER (3 letras)
  // - CODIGO: Código alfanumérico corto y estable (ej: ILUM, IA, AUTO, FV)
  // - SNN: S seguido del número de sesión (ej: S01, S04, S10)
  var masterTagRegex = /\[(\d{4})-([12])-([A-Za-z]{3})-([A-Za-z0-9]+)-S0*(\d+)\]/i;
  return masterTagRegex.test(texto);
}

/**
 * Extrae el número de sesión de una carpeta (ej: "Sesión - 4", "Sesión 4", "S04")
 */
function extraerNumeroSesionCarpeta(nombre) {
  if (!nombre) return null;
  var norm = limpiarTexto(nombre);
  var match = norm.match(/(?:\bSESION\b|\bSESSION\b|\bSEMANA\b)\s*[-–—:]*\s*#?\s*0*(\d+)\b/) ||
              norm.match(/\bS\s*[-–—:]*\s*0*(\d+)\b/) ||
              norm.match(/\bS0*(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Extrae el número de clase de una carpeta (ej: "Clase - 1", "Clase - 2", "Clase 3", "C01")
 */
function extraerNumeroClaseCarpeta(nombre) {
  if (!nombre) return null;
  var norm = limpiarTexto(nombre);
  var match = norm.match(/(?:\bCLASE\b|\bCLASS\b)\s*[-–—:]*\s*#?\s*0*(\d+)\b/) ||
              norm.match(/\bC\s*[-–—:]*\s*0*(\d+)\b/) ||
              norm.match(/\bC0*(\d+)\b/);
  return match ? parseInt(match[1], 10) : null;
}

/**
 * Determina el número de clase a partir del tag o del fragmento de grabación:
 * "Recording" ➔ Clase 1
 * "Recording 2" ➔ Clase 2
 * "Recording 3" ➔ Clase 3
 */
function extraerNumeroClaseArchivo(tag, str, recordingPart) {
  var cTagMatch = (tag || "").match(/-C0*(\d+)\b/i);
  if (cTagMatch) return parseInt(cTagMatch[1], 10);

  var cStrMatch = (str || "").match(/(?:clase|class)\s*[-–—:]*\s*#?\s*0*(\d+)\b/i);
  if (cStrMatch) return parseInt(cStrMatch[1], 10);

  if (recordingPart) return recordingPart;

  return 1;
}

/**
 * Decodifica la nomenclatura completa de una grabación de Meet
 * según el estándar oficial de Guia_Nomenclatura_LIATER_Mejorada.pdf:
 * Tag maestro: [AAAA-P-TIPO-CODIGO-SNN] Nombre del programa
 * Carpeta esperada en Drive: TIPO-CODIGO-AAAA-P - Nombre
 */
function parseNomenclaturaGrabacion(str, parentFolderName) {
  if (!str && !parentFolderName) return null;

  var parent = (parentFolderName || "").replace(/\s*\((?:recurring|recurrente)\)/gi, "").trim();
  var cleanStr = (str || "").replace(/\s*\((?:recurring|recurrente)\)/gi, "").trim();
  var textoCompleto = cleanStr + " " + parent;

  // 1. Tag maestro obligatorio: [AAAA-P-TIPO-CODIGO-SNN]
  var masterTagRegex = /\[(\d{4})-([12])-([A-Za-z]{3})-([A-Za-z0-9]+)-S0*(\d+)\]/i;
  var tagMatch = cleanStr.match(masterTagRegex) || parent.match(masterTagRegex);

  if (!tagMatch) {
    return null; // Si no cumple el identificador maestro, se descarta
  }

  var anio = tagMatch[1];
  var periodo = tagMatch[2];
  var tipoCodigo = tagMatch[3].toUpperCase(); // CUR, DIP, TAL, etc.
  var codigoProg = tagMatch[4].toUpperCase(); // ILUM, IA, AUTO, FV
  var sessionNumber = parseInt(tagMatch[5], 10);
  var tag = tagMatch[0]; // Ej: [2026-2-CUR-ILUM-S04]

  var tipo = (tipoCodigo === "DIP") ? "diplomado" : "curso";

  // 2. Extraer nombre / tema del programa (ubicado justo después del corchete del tag)
  var baseParaTema = cleanStr.indexOf(tag) !== -1 ? cleanStr : parent;
  var idxTag = baseParaTema.indexOf(tag);
  var textoPostTag = idxTag !== -1 ? baseParaTema.substring(idxTag + tag.length) : baseParaTema;

  var topic = textoPostTag
    .replace(/\s*\((?:recurring|recurrente)\)/gi, "")
    .replace(/-?\s*\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2}.*$/, "")
    .replace(/-?\s*(?:recording|grabaci[oó]n|parte|part|video|vídeo)\b.*$/i, "")
    .replace(/\.(mp4|mov|mkv|avi|webm|m4v|gdoc|txt|doc|docx)$/i, "")
    .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "")
    .trim();

  // Si no se extrajo tema de cleanStr pero parent tiene texto
  if (!topic && parent.indexOf(tag) !== -1) {
    var idxParentTag = parent.indexOf(tag);
    topic = parent.substring(idxParentTag + tag.length)
      .replace(/\s*\((?:recurring|recurrente)\)/gi, "")
      .replace(/^[\s\-–—:]+|[\s\-–—:]+$/g, "")
      .trim();
  }

  // 3. Extraer fecha, hora y zona horaria (generada automáticamente por Meet)
  var dateMatch = textoCompleto.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})\s+(\d{1,2}):(\d{2})(?:\s*(GMT[+-]\d{1,2}(?::\d{2})?|[+-]\d{2}:?\d{2}))?/i);
  var isoDateString = null;
  var formattedDate = null;
  var rawDateStr = null;

  if (dateMatch) {
    var y = dateMatch[1];
    var m = dateMatch[2].length === 1 ? "0" + dateMatch[2] : dateMatch[2];
    var d = dateMatch[3].length === 1 ? "0" + dateMatch[3] : dateMatch[3];
    var hh = dateMatch[4].length === 1 ? "0" + dateMatch[4] : dateMatch[4];
    var mi = dateMatch[5].length === 1 ? "0" + dateMatch[5] : dateMatch[5];
    var rawTz = dateMatch[6] || "";
    rawDateStr = dateMatch[0];

    var tz = "-05:00"; // Colombia por defecto
    if (rawTz) {
      var cleanTz = rawTz.replace(/GMT/i, "").trim();
      if (/^[+-]\d{2}:\d{2}$/.test(cleanTz)) {
        tz = cleanTz;
      } else if (/^[+-]\d{1,2}$/.test(cleanTz)) {
        var sign = cleanTz.charAt(0);
        var num = cleanTz.substring(1);
        tz = sign + (num.length === 1 ? "0" + num : num) + ":00";
      }
    }
    isoDateString = y + "-" + m + "-" + d + "T" + hh + ":" + mi + ":00" + tz;
    formattedDate = y + "-" + m + "-" + d + " " + hh + ":" + mi;
  }

  // 4. Determinar la clase a partir del consecutivo de Recording (Regla 08 de la guía):
  // "Recording" / "Recording Vídeo" ➔ Clase 1
  // "Recording 2" / "Recording 2 Vídeo" ➔ Clase 2
  // "Recording 3" / "Recording 3 Vídeo" ➔ Clase 3
  var partMatch = cleanStr.match(/(?:recording|grabaci[oó]n|parte|part)\s*(\d+)/i) ||
                  parent.match(/(?:recording|grabaci[oó]n|parte|part)\s*(\d+)/i);
  var classNumber = partMatch ? parseInt(partMatch[1], 10) : 1;

  // 5. Nomenclatura oficial de la carpeta destino en Google Drive (Regla 09 de la guía):
  // Patrón: TIPO-CODIGO-AAAA-P - Nombre (ej: "CUR-ILUM-2026-2 - Hospitalaria")
  var codigoPrograma = tipoCodigo + "-" + codigoProg + "-" + anio + "-" + periodo;
  var carpetaEsperada = codigoPrograma + (topic ? " - " + topic : "");

  return {
    raw: str || parentFolderName,
    valido: true,
    tag: tag,
    anio: anio,
    periodo: periodo,
    tipoCodigo: tipoCodigo,
    tipo: tipo,
    codigo: codigoProg,
    programCode: codigoPrograma,
    codigoPrograma: codigoPrograma,
    carpetaEsperada: carpetaEsperada,
    topic: topic,
    sessionNumber: sessionNumber,
    classNumber: classNumber,
    recordingPart: classNumber,
    isoDateString: isoDateString,
    formattedDate: formattedDate,
    rawDateStr: rawDateStr,
    esGrabacionMeet: true
  };
}

// ============================================================================
// 7. NAVEGACIÓN Y DETECCIÓN EN DRIVE (SESIÓN Y CLASE)
// ============================================================================

/**
 * Busca EXCLUSIVAMENTE la subcarpeta existente de la Sesión (ej. "Sesión - 4", "Sesión - 1")
 * dentro de la carpeta del programa.
 * ⚠️ NUNCA crea carpetas nuevas; si no existe, retorna null.
 */
function buscarCarpetaSesionExistente(carpetaPrograma, sessionNumber) {
  if (!sessionNumber || !carpetaPrograma) {
    return null;
  }

  var subfolders = carpetaPrograma.getFolders();
  while (subfolders.hasNext()) {
    var sub = subfolders.next();
    var fn = sub.getName();
    if (esCarpetaExcluida(fn)) continue;

    var num = extraerNumeroSesionCarpeta(fn);
    if (num === sessionNumber) {
      return sub;
    }
  }

  return null;
}

/**
 * Busca EXCLUSIVAMENTE la subcarpeta existente de la Clase (ej. "Clase - 1", "Clase - 2", "Clase - 3")
 * dentro de la carpeta de la Sesión.
 * ⚠️ NUNCA crea carpetas nuevas; si no existe, retorna null.
 */
function buscarCarpetaClaseExistente(carpetaSesion, classNumber) {
  if (!carpetaSesion) {
    return null;
  }

  if (!classNumber) {
    classNumber = 1;
  }

  var subfolders = carpetaSesion.getFolders();
  var primeraClase = null;

  while (subfolders.hasNext()) {
    var sub = subfolders.next();
    var fn = sub.getName();
    if (esCarpetaExcluida(fn)) continue;

    var num = extraerNumeroClaseCarpeta(fn);
    if (num === classNumber) {
      return sub;
    }

    if (num === 1 && !primeraClase) {
      primeraClase = sub;
    }
  }

  // Si se buscaba Clase 1 y no hubo coincidencia exacta pero existe la primera clase
  if (classNumber === 1 && primeraClase) {
    return primeraClase;
  }

  return null;
}

// Aliases para compatibilidad: NUNCA crean carpetas nuevas
function encontrarOCrearCarpetaSesion(carpetaPrograma, sessionNumber) {
  return buscarCarpetaSesionExistente(carpetaPrograma, sessionNumber);
}

function encontrarOCrearCarpetaClase(carpetaSesion, classNumber) {
  return buscarCarpetaClaseExistente(carpetaSesion, classNumber);
}

/**
 * Busca dentro de la lista de programas aquel que coincida con el tema y/o código de la grabación
 */
function coincidenTokensCodigo(codigo, nombreCarpeta) {
  if (!codigo || !nombreCarpeta) return false;
  var normCod = limpiarTexto(codigo);
  var normCarpeta = limpiarTexto(nombreCarpeta);
  var tokens = normCod.split(/[\s\-_\/]+/).filter(function(t) { return t.length >= 2; });
  if (tokens.length === 0) return false;

  var aciertos = 0;
  for (var i = 0; i < tokens.length; i++) {
    if (normCarpeta.indexOf(tokens[i]) !== -1) {
      aciertos++;
    }
  }
  return aciertos >= Math.min(tokens.length, 3);
}

function coincidenRaicesTema(tema, nombreCarpeta) {
  if (!tema || !nombreCarpeta) return false;
  var normTema = limpiarTexto(tema);
  var normCarpeta = limpiarTexto(nombreCarpeta);

  // Palabras significativas (ignorar palabras genéricas)
  var palabras = normTema.split(/[\s\-_\/]+/).filter(function(w) { 
    return w.length >= 3 && !/^(CURSO|DIPLOMADO|SEMANA|SESION|CLASE|2026|2025|2024|RECURRING|RECURRENTE)$/.test(w); 
  });

  for (var i = 0; i < palabras.length; i++) {
    var p = palabras[i];
    // Raíz de 5 caracteres para derivaciones gramaticales (ej: 'HOSPI' para 'HOSPITALARIA' y 'HOSPITALES')
    var raiz = p.length > 5 ? p.substring(0, 5) : p;
    if (normCarpeta.indexOf(raiz) !== -1 || normCarpeta.indexOf(p) !== -1) {
      return true;
    }
  }
  return false;
}

function encontrarProgramaParaGrabacion(programas, infoNom) {
  if (!infoNom || !programas || programas.length === 0) return null;

  var normEsperada = limpiarTexto(infoNom.carpetaEsperada);
  var normCodigoProg = limpiarTexto(infoNom.codigoPrograma);
  var normTopic = limpiarTexto(infoNom.topic);

  // 1. Coincidencia EXACTA con la carpeta oficial según la Guía LIATER (Regla 09):
  // Ej: "CUR-ILUM-2026-2 - Hospitalaria", "CUR-ILUM-2026-2 - Deportiva"
  if (normEsperada) {
    for (var i = 0; i < programas.length; i++) {
      var p = programas[i];
      var normP = limpiarTexto(p.nombre);
      if (normP === normEsperada) {
        return p;
      }
    }
  }

  // 2. Coincidencia por código oficial (ej. CUR-ILUM-2026-2) y tema simultáneos
  if (normCodigoProg) {
    for (var j = 0; j < programas.length; j++) {
      var pr = programas[j];
      var normPr = limpiarTexto(pr.nombre);
      if (normPr.indexOf(normCodigoProg) !== -1) {
        if (!normTopic || normPr.indexOf(normTopic) !== -1 || coincidenRaicesTema(normTopic, normPr)) {
          return pr;
        }
      }
    }
  }

  // 3. Coincidencia por tokens del código y raíces de tema
  for (var k = 0; k < programas.length; k++) {
    var prk = programas[k];
    var normPrk = limpiarTexto(prk.nombre);
    var coincideTokens = coincidenTokensCodigo(infoNom.codigoPrograma, normPrk) || (infoNom.tag && coincidenTokensCodigo(infoNom.tag, normPrk));
    var coincideTema = normTopic && (normPrk.indexOf(normTopic) !== -1 || coincidenRaicesTema(normTopic, normPrk));
    if (coincideTokens && coincideTema) {
      return prk;
    }
  }

  // 4. Búsqueda por palabras clave generales en el texto crudo de la grabación
  var rawNorm = limpiarTexto(infoNom.raw);
  for (var m = 0; m < programas.length; m++) {
    var prg = programas[m];
    var normPrg = limpiarTexto(prg.nombre);
    if (coincidenRaicesTema(normPrg, rawNorm)) {
      return prg;
    }
  }

  return null;
}

/**
 * Determina si una carpeta corresponde a un curso o diplomado de LIATER.
 * Se basa en la nomenclatura oficial (ej: "CUR-ILUM-2026-2 - Hospitalaria", "CUR-ILUM-2026-2 - Deportiva")
 * o en que contenga directamente subcarpetas de sesiones ("Sesión - 1", "Sesión - 2", etc.).
 */
function esCarpetaDePrograma(folder) {
  if (!folder) return false;
  var nombre = folder.getName();
  var norm = limpiarTexto(nombre);

  if (esCarpetaExcluida(nombre)) return false;
  if (/^PROGRAMAS\s*-\s*LIATER/.test(norm)) return false;
  if (/^LIATER\s*-\s*(?:CURSOS|DIPLOMADOS)/.test(norm)) return false;

  // 1. Si el nombre coincide con la nomenclatura oficial de programas LIATER
  // Ej: "CUR-ILUM-2026-2 - Hospitalaria", "CUR-ILUM-2026-2 - Deportiva", "DIP-FV-2026-1 - ..."
  if (/^(?:CUR|DIP)[-_]/.test(norm) || /20\d{2}[-_][12][-_](?:CUR|DIP)/.test(norm)) {
    return true;
  }

  // 2. Si contiene directamente subcarpetas de sesiones ("Sesión - 1", "Sesión - 2", etc.)
  var subs = folder.getFolders();
  while (subs.hasNext()) {
    var subName = subs.next().getName();
    if (extraerNumeroSesionCarpeta(subName) !== null) {
      return true;
    }
  }

  return false;
}

/**
 * Mapea las carpetas de cursos y diplomados desde la carpeta raíz.
 * Explora jerárquicamente hasta encontrar las carpetas con la nomenclatura del curso
 * (ej: "CUR-ILUM-2026-2 - Hospitalaria") y no desciende dentro de sus sesiones.
 * ⚠️ NUNCA crea carpetas nuevas.
 */
function descubrirProgramas(rootFolder) {
  var programas = [];
  var idsVistos = {};

  function explorar(folder, nivel) {
    if (!folder || idsVistos[folder.getId()] || nivel > 4) return;
    idsVistos[folder.getId()] = true;

    var nombre = folder.getName();
    if (esCarpetaExcluida(nombre)) return;

    // Si es una carpeta de curso/diplomado
    if (nivel > 0 && esCarpetaDePrograma(folder)) {
      var tipo = (limpiarTexto(nombre).indexOf("DIP") !== -1 || limpiarTexto(nombre).indexOf("DIPLOMAD") !== -1) ? "diplomado" : "curso";
      var anioMatch = nombre.match(/\b(20\d{2})\b/);
      var anio = anioMatch ? anioMatch[1] : "";

      programas.push({
        carpeta: folder,
        id: folder.getId(),
        nombre: nombre,
        tipo: tipo,
        anio: anio
      });
      // Detener recursión: no explorar sesiones como si fueran programas
      return;
    }

    // Si es un contenedor de nivel superior (ej: "PROGRAMAS - LIATER", "LIATER - Cursos 2026")
    var subfolders = folder.getFolders();
    while (subfolders.hasNext()) {
      explorar(subfolders.next(), nivel + 1);
    }
  }

  explorar(rootFolder, 0);

  // Fallback si la raíz apuntaba directamente a la carpeta de un curso
  if (programas.length === 0 && esCarpetaDePrograma(rootFolder)) {
    var nomRaiz = rootFolder.getName();
    var tipoRaiz = (limpiarTexto(nomRaiz).indexOf("DIP") !== -1) ? "diplomado" : "curso";
    var anioMatchRaiz = nomRaiz.match(/\b(20\d{2})\b/);
    programas.push({
      carpeta: rootFolder,
      id: rootFolder.getId(),
      nombre: nomRaiz,
      tipo: tipoRaiz,
      anio: anioMatchRaiz ? anioMatchRaiz[1] : ""
    });
  }

  return programas;
}

function esCarpetaExcluida(nombreCarpeta) {
  var norm = limpiarTexto(nombreCarpeta);
  if (!norm) return false;

  var nombresExcluidos = [
    "MATERIAL",
    "MATERIALES",
    "MATERIAL GENERAL",
    "MATERIAL DE CLASE",
    "PLANTILLAS",
    "TEMPLATES",
    "GENERAL",
    "RECURSOS",
    "PAPELERA",
    "TRASH",
    "LOGS",
    "BACKUP",
    "BITACORA"
  ];

  for (var i = 0; i < nombresExcluidos.length; i++) {
    var exc = nombresExcluidos[i];
    if (norm === exc || norm.indexOf(exc + " -") === 0 || norm.indexOf(exc + "_") === 0 || norm.indexOf(exc + " ") === 0) {
      return true;
    }
  }
  return false;
}

function recolectarVideosDePrograma(programa) {
  var carpetas = [];
  buscarCarpetasRecursivas(programa.carpeta, carpetas);

  var itemsVideo = [];

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();

    if (esCarpetaExcluida(folderName) && folder.getId() !== programa.id) {
      continue;
    }

    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (esArchivoVideo(file)) {
        var nom = parseNomenclaturaGrabacion(file.getName(), folderName);
        if (!nom) {
          // Si el archivo no tiene la nomenclatura completa en su nombre pero está ubicado
          // dentro de la jerarquía de Clase / Sesión / Programa:
          var numClase = extraerNumeroClaseCarpeta(folderName) || 1;
          var pParents = folder.getParents();
          var parentFolder = pParents.hasNext() ? pParents.next() : null;
          var numSesion = parentFolder ? extraerNumeroSesionCarpeta(parentFolder.getName()) : null;

          var progMatch = programa.nombre.match(/([A-Z]{3})-([A-Z0-9]+)-(\d{4})-([12])(?:\s*-\s*(.+))?/i);
          if (progMatch) {
            var sStr = numSesion ? (numSesion < 10 ? "0" + numSesion : "" + numSesion) : "01";
            var tagGen = "[" + progMatch[3] + "-" + progMatch[4] + "-" + progMatch[1].toUpperCase() + "-" + progMatch[2].toUpperCase() + "-S" + sStr + "]";
            nom = {
              valido: true,
              tag: tagGen,
              anio: progMatch[3],
              periodo: progMatch[4],
              tipoCodigo: progMatch[1].toUpperCase(),
              tipo: progMatch[1].toUpperCase() === "DIP" ? "diplomado" : "curso",
              codigo: progMatch[2].toUpperCase(),
              programCode: progMatch[1].toUpperCase() + "-" + progMatch[2].toUpperCase() + "-" + progMatch[3] + "-" + progMatch[4],
              codigoPrograma: progMatch[1].toUpperCase() + "-" + progMatch[2].toUpperCase() + "-" + progMatch[3] + "-" + progMatch[4],
              topic: (progMatch[5] || "").trim(),
              sessionNumber: numSesion || 1,
              classNumber: numClase,
              recordingPart: numClase,
              esGrabacionMeet: true
            };
          }
        }

        itemsVideo.push({
          archivo: file,
          nombreArchivo: file.getName(),
          idArchivo: file.getId(),
          carpeta: folder,
          nombreCarpeta: folderName,
          idCarpeta: folder.getId(),
          programa: programa,
          nomenclatura: nom
        });
      }
    }
  }

  return itemsVideo;
}

function recolectarTranscripcionesDePrograma(programa) {
  var carpetas = [];
  buscarCarpetasRecursivas(programa.carpeta, carpetas);

  var itemsTranscripcion = [];

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();

    if (esCarpetaExcluida(folderName) && folder.getId() !== programa.id) {
      continue;
    }

    var files = folder.getFiles();
    while (files.hasNext()) {
      var file = files.next();
      if (esArchivoTranscripcion(file.getName())) {
        var nom = parseNomenclaturaGrabacion(file.getName()) || parseNomenclaturaGrabacion(folderName);
        itemsTranscripcion.push({
          archivo: file,
          nombreArchivo: file.getName(),
          idArchivo: file.getId(),
          carpeta: folder,
          nombreCarpeta: folderName,
          idCarpeta: folder.getId(),
          programa: programa,
          nomenclatura: nom
        });
      }
    }
  }

  return itemsTranscripcion;
}

// ============================================================================
// 8. FUNCIONES AUXILIARES DE DRIVE, RED Y UTILIDADES
// ============================================================================

function obtenerConfiguracion() {
  var props = PropertiesService.getScriptProperties();
  var rawRootId = props.getProperty("ROOT_FOLDER_ID");
  var cronSecret = props.getProperty("DRIVE_AUTOMATION_SECRET") || props.getProperty("DRIVE_CRON_SECRET");
  var rawSheetId = props.getProperty("LOG_SHEET_ID");
  var rawMeetId = props.getProperty("MEET_RECORDINGS_FOLDER_ID") || props.getProperty("MEET_FOLDER_ID");

  var rootFolderId = extraerIdDeDrive(rawRootId);
  var logSheetId = extraerIdDeDrive(rawSheetId);
  var meetFolderId = extraerIdDeDrive(rawMeetId);

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
    meetFolderId: meetFolderId
  };
}

function abrirCarpetaRaiz(folderId) {
  try {
    var root = DriveApp.getFolderById(folderId);
    console.log("Carpeta raíz abierta: '" + root.getName() + "' (ID: " + root.getId() + ")");
    return root;
  } catch (err) {
    console.error("ERROR: No se pudo acceder a la carpeta de Drive con ID '" + folderId + "': " + err.message);
    return null;
  }
}

function buscarCarpetasMeetOrigen(customId) {
  var carpetas = [];
  var idsAgregados = {};

  function agregarSiExiste(f) {
    if (f && !idsAgregados[f.getId()]) {
      idsAgregados[f.getId()] = true;
      carpetas.push(f);
    }
  }

  // 1. Si el usuario definió un ID manual en MEET_RECORDINGS_FOLDER_ID
  if (customId) {
    try {
      var manual = DriveApp.getFolderById(extraerIdDeDrive(customId));
      if (manual) agregarSiExiste(manual);
    } catch (e) {
      console.warn("Aviso: No se pudo abrir la carpeta configurada en MEET_RECORDINGS_FOLDER_ID: " + e.message);
    }
  }

  // 2. Nombres comunes de Google Meet en Drive (priorizando 'Google Meet' de Google Workspace)
  var nombresPosibles = [
    "Google Meet",
    "Meet Recordings",
    "Grabaciones de Meet",
    "Grabaciones de Google Meet",
    "Meet recordings",
    "Grabaciones de meet"
  ];

  for (var i = 0; i < nombresPosibles.length; i++) {
    try {
      var folders = DriveApp.getFoldersByName(nombresPosibles[i]);
      while (folders.hasNext()) {
        agregarSiExiste(folders.next());
      }
    } catch (eF) {
      console.warn("Aviso buscando carpeta '" + nombresPosibles[i] + "': " + eF.message);
    }
  }

  return carpetas;
}

function buscarCarpetaMeetRecordings(customId) {
  var todas = buscarCarpetasMeetOrigen(customId);
  return todas.length > 0 ? todas[0] : null;
}

function moverArchivo(file, targetFolder) {
  try {
    var currentParents = file.getParents();
    var yaEstaEnDestino = false;
    while (currentParents.hasNext()) {
      if (currentParents.next().getId() === targetFolder.getId()) {
        yaEstaEnDestino = true;
        break;
      }
    }

    if (yaEstaEnDestino) {
      return true;
    }

    if (typeof file.moveTo === "function") {
      file.moveTo(targetFolder);
    } else {
      targetFolder.addFile(file);
      var parents = file.getParents();
      while (parents.hasNext()) {
        var p = parents.next();
        if (p.getId() !== targetFolder.getId()) {
          p.removeFile(file);
        }
      }
    }
    return true;
  } catch (err) {
    console.error("Error al mover archivo '" + file.getName() + "': " + err.message);
    return false;
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

  // 1. Descartar explícitamente cualquier documento Word (.docx, .doc), Google Docs, texto, PDF, transcripción, notas o chat
  if (
    mime.indexOf("document") !== -1 ||
    mime.indexOf("word") !== -1 ||
    mime.indexOf("text") !== -1 ||
    mime.indexOf("pdf") !== -1 ||
    mime.indexOf("sheet") !== -1 ||
    name.endsWith(".docx") ||
    name.endsWith(".doc") ||
    name.endsWith(".txt") ||
    name.endsWith(".gdoc") ||
    name.endsWith(".pdf") ||
    name.endsWith(".vtt") ||
    name.endsWith(".sbv") ||
    norm.indexOf("TRANSCRIP") !== -1 ||
    norm.indexOf("TRANSIC") !== -1 ||
    norm.indexOf("CHAT") !== -1 ||
    norm.indexOf("NOTAS") !== -1 ||
    norm.indexOf("ASISTENCIA") !== -1
  ) {
    return false;
  }

  // 2. Comprobar extensiones de video explícitas
  if (/\.(mp4|mov|mkv|avi|webm|m4v|wmv|flv|3gp|ts|mts)$/i.test(name)) {
    return true;
  }

  // 3. Comprobar MIME type de video
  if (mime.indexOf("video") !== -1 || mime === "application/vnd.google-apps.video") {
    return true;
  }

  return false;
}

function buscarCarpetasRecursivas(folder, lista) {
  lista.push(folder);
  var subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    buscarCarpetasRecursivas(subfolders.next(), lista);
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
      "Authorization": "Bearer " + (cronSecret ? cronSecret.trim() : "")
    },
    payload: payload,
    muteHttpExceptions: true
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
      "Año",
      "Tipo",
      "Programa / Curso",
      "ID Archivo",
      "Nombre Archivo",
      "Folder ID",
      "Nombre Carpeta",
      "Tipo Evento",
      "Detalle / Resultado"
    ]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function yaFueProcesado(sheet, fileId) {
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    for (var col = 1; col <= 4; col++) {
      if (data[i][col] === fileId && (data[i][8] === "IA_OK" || data[i][5] === "IA_OK" || data[i][8] === "OK" || data[i][5] === "OK")) {
        return true;
      }
    }
  }
  return false;
}

function registrarEnLog(sheet, fileId, fileName, folderId, folderName, estado, detalle, programName, programType, programYear) {
  var numCols = sheet.getLastColumn();
  if (numCols >= 10) {
    sheet.appendRow([
      new Date(),
      programYear || "",
      programType || "",
      programName || "",
      fileId,
      fileName,
      folderId,
      folderName,
      estado,
      detalle
    ]);
  } else {
    sheet.appendRow([
      new Date(),
      fileId,
      fileName,
      folderId,
      (programName ? "[" + programName + "] " : "") + folderName,
      estado,
      detalle
    ]);
  }
}
