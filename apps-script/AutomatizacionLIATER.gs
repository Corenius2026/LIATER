/**
 * ============================================================================
 * LIATER - Automatización Google Drive ➔ Supabase
 * ============================================================================
 * 
 * ESTRUCTURA JERÁRQUICA DE GOOGLE DRIVE:
 * 
 * [Nivel 0: Carpeta Raíz] ➔ "PROGRAMAS - LIATER" (Configurada en ROOT_FOLDER_ID)
 *    ├── [Nivel 1: Categorías y Año] ➔ "LIATER - Cursos 2026", "LIATER - Diplomados 2026"
 *    │      ├── [Nivel 2: Cursos / Diplomados] ➔ "CUR-ILUM-2026-2 - Deportiva", "CUR-ILUM-2026-2 - Hospitalaria"
 *    │      │      └── [Nivel 3: Clases / Sesiones] ➔ "Clase 1", grabaciones (.mp4), transcripciones (.gdoc, .txt)
 *    │      └── ℹ [Carpetas de utilería] ➔ "material", "plantillas", etc. (se ignoran automáticamente)
 * 
 * FUNCIONES DISPONIBLES:
 * 1. `diagnosticarEstructura()`: Muestra en la consola de Apps Script todo el árbol detectado
 *    (Cursos, Diplomados, Años, Videos y Transcripciones) SIN hacer cambios en Supabase.
 * 2. `ejecutarTodo()`: Ejecuta sincronización de videos y procesamiento de IA en un solo clic.
 * 3. `sincronizarSoloVideos()`: Escanea grabaciones y vincula URLs a Supabase.
 * 4. `procesarTranscripcionesEIA()`: Lee transcripciones y genera cuestionarios con Gemini.
 * 5. `configurarActivadores()`: Programa las ejecuciones automáticas (videos cada 30 min, IA cada 2 horas).
 * 6. `eliminarActivadores()`: Limpia los temporizadores automáticos.
 * 
 * ----------------------------------------------------------------------------
 * CONFIGURACIÓN EN GOOGLE APPS SCRIPT:
 * (⚙️ Configuración del proyecto -> Propiedades del script)
 *   - ROOT_FOLDER_ID: ID o enlace de la carpeta raíz "PROGRAMAS - LIATER"
 *   - DRIVE_AUTOMATION_SECRET: Secreto configurado en Supabase Edge Functions
 *   - LOG_SHEET_ID: (Opcional) ID o enlace del Google Sheet para bitácora
 * ============================================================================
 */

var EDGE_FUNCTION_URL = "https://dbxkmasucybamylpkndm.supabase.co/functions/v1/automatizacion-drive";
var QUESTION_COUNT = 5;

// ============================================================================
// 1. DIAGNÓSTICO PREVIO DE ESTRUCTURA
// ============================================================================

/**
 * Muestra en la consola la estructura jerárquica detectada sin alterar datos en Supabase.
 * Ejecuta esta función primero para verificar que reconozca correctamente los Cursos, Diplomados y Años.
 */
function diagnosticarEstructura() {
  console.log("=================================================");
  console.log("🔍 DIAGNÓSTICO DE ESTRUCTURA EN GOOGLE DRIVE");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var programas = descubrirProgramas(rootFolder);
  console.log("\n=================================================");
  console.log("📊 RESUMEN: " + programas.length + " PROGRAMA(S) IDENTIFICADO(S)");
  console.log("=================================================");

  for (var i = 0; i < programas.length; i++) {
    var p = programas[i];
    console.log("\n[" + (i + 1) + "] " + p.tipo.toUpperCase() + ": '" + p.nombre + "'");
    console.log("    - Categoría Padre: " + p.categoriaNombre);
    console.log("    - Año detectado: " + (p.anio || "No especificado"));
    console.log("    - ID Carpeta Drive: " + p.id);

    var videos = recolectarVideosDePrograma(p);
    var transcripciones = recolectarTranscripcionesDePrograma(p);

    console.log("    - Videos detectados: " + videos.length);
    for (var v = 0; v < videos.length; v++) {
      console.log("       🎥 [" + videos[v].nombreCarpeta + "] " + videos[v].nombreArchivo);
    }

    console.log("    - Transcripciones detectadas: " + transcripciones.length);
    for (var t = 0; t < transcripciones.length; t++) {
      console.log("       📝 [" + transcripciones[t].nombreCarpeta + "] " + transcripciones[t].nombreArchivo);
    }
  }

  console.log("\n=================================================");
  console.log("✓ Diagnóstico finalizado con éxito.");
  console.log("=================================================");
}

// ============================================================================
// 2. FLUJO PRINCIPAL: SINCRONIZACIÓN DE VIDEOS / GRABACIONES
// ============================================================================

/**
 * Escanea Drive navegando desde PROGRAMAS - LIATER y actualiza grabaciones en Supabase
 */
function sincronizarSoloVideos() {
  console.log("=================================================");
  console.log("▶ INICIANDO: Sincronización de Grabaciones de Video");
  console.log("=================================================");

  var config = obtenerConfiguracion();
  if (!config) return;

  var rootFolder = abrirCarpetaRaiz(config.rootFolderId);
  if (!rootFolder) return;

  var programas = descubrirProgramas(rootFolder);
  console.log("Total de programas a procesar: " + programas.length);

  var videosActualizados = 0;
  var videosYaSincronizados = 0;
  var programasSinVideo = 0;
  var errores = 0;

  for (var p = 0; p < programas.length; p++) {
    var prog = programas[p];
    console.log("\n-------------------------------------------------");
    console.log("📂 Procesando [" + (p + 1) + "/" + programas.length + "]: '" + prog.nombre + "' (" + prog.tipo.toUpperCase() + (prog.anio ? " - " + prog.anio : "") + ")");

    var itemsVideo = recolectarVideosDePrograma(prog);

    if (itemsVideo.length === 0) {
      console.log("   ℹ No se encontraron grabaciones en este programa.");
      programasSinVideo++;
      continue;
    }

    console.log("   Grabaciones encontradas: " + itemsVideo.length);

    for (var i = 0; i < itemsVideo.length; i++) {
      var item = itemsVideo[i];
      var videoFile = item.archivo;
      var folderId = item.idCarpeta;
      var folderName = item.nombreCarpeta;

      try {
        garantizarPermisosDeLectura(videoFile);
        var videoUrl = "https://drive.google.com/file/d/" + videoFile.getId() + "/preview";
        console.log("   -> Video detectado: '" + videoFile.getName() + "' en carpeta '" + folderName + "'");

        var res = llamarEdgeFunction({
          drive_folder_id: folderId,
          folder_name: folderName,
          doc_name: videoFile.getName(),
          video_url: videoUrl,
          transcript: "",
          // Contexto jerárquico del programa
          program_name: prog.nombre,
          program_folder_id: prog.id,
          program_type: prog.tipo,
          program_year: prog.anio,
          category_name: prog.categoriaNombre
        }, config.cronSecret);

        if (res && res.ok) {
          if (res.already_synced) {
            videosYaSincronizados++;
            console.log("      ℹ Video ya estaba previamente vinculado en Supabase para: '" + (res.class_title || folderName) + "'");
          } else {
            videosActualizados++;
            console.log("      ✓ Video vinculado con éxito para: '" + (res.class_title || folderName) + "'");
            console.log("        - ID de Clase en BD: " + (res.class_id || "N/A"));
            console.log("        - URL Video: " + (res.video_url || videoUrl));
          }
          if (config.logSheet) {
            registrarEnLog(
              config.logSheet,
              videoFile.getId(),
              videoFile.getName(),
              folderId,
              folderName,
              res.already_synced ? "VIDEO_EXISTENTE" : "VIDEO_OK",
              "[" + prog.nombre + "] " + (res.class_title ? "Clase: '" + res.class_title + "' | " : "") + (res.video_url || videoUrl),
              prog.nombre,
              prog.tipo,
              prog.anio
            );
          }
        } else {
          errores++;
          console.warn("      ✗ No se pudo vincular video: " + (res.error || JSON.stringify(res)));
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
        console.error("      ✗ Excepción procesando video en '" + folderName + "': " + e.message);
      }
    }
  }

  console.log("\n=================================================");
  console.log("Resumen Videos -> Nuevos: " + videosActualizados + " | Ya vinculados: " + videosYaSincronizados + " | Programas sin video: " + programasSinVideo + " | Errores: " + errores);
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
  console.log("Total de programas a procesar: " + programas.length);

  var procesadas = 0;
  var omitidas = 0;
  var errores = 0;

  for (var p = 0; p < programas.length; p++) {
    var prog = programas[p];
    console.log("\n-------------------------------------------------");
    console.log("📂 Procesando [" + (p + 1) + "/" + programas.length + "]: '" + prog.nombre + "' (" + prog.tipo.toUpperCase() + (prog.anio ? " - " + prog.anio : "") + ")");

    var itemsTrans = recolectarTranscripcionesDePrograma(prog);

    if (itemsTrans.length === 0) {
      console.log("   ℹ No se encontraron transcripciones en este programa.");
      continue;
    }

    console.log("   Transcripciones encontradas: " + itemsTrans.length);

    for (var i = 0; i < itemsTrans.length; i++) {
      var item = itemsTrans[i];
      var transFile = item.archivo;
      var fileId = transFile.getId();
      var fileName = transFile.getName();
      var folderId = item.idCarpeta;
      var folderName = item.nombreCarpeta;

      if (config.logSheet && yaFueProcesado(config.logSheet, fileId)) {
        console.log("   -> Transcripción ya procesada anteriormente según Log: '" + fileName + "'");
        omitidas++;
        continue;
      }

      console.log("   -> Leyendo transcripción: '" + fileName + "' en carpeta '" + folderName + "'...");

      try {
        var transcript = extraerTexto(transFile);

        if (!transcript || transcript.length < 200) {
          var msg = "Transcripción muy corta (" + (transcript ? transcript.length : 0) + " caracteres)";
          console.warn("      Aviso: " + msg);
          if (config.logSheet) {
            registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IGNORADO", "[" + prog.nombre + "] " + msg, prog.nombre, prog.tipo, prog.anio);
          }
          omitidas++;
          continue;
        }

        console.log("      Enviando " + transcript.length + " caracteres a Gemini para programa '" + prog.nombre + "'...");

        var resultado = llamarEdgeFunction({
          drive_folder_id: folderId,
          folder_name: folderName,
          doc_name: fileName,
          transcript: transcript,
          questionCount: QUESTION_COUNT,
          // Contexto jerárquico del programa
          program_name: prog.nombre,
          program_folder_id: prog.id,
          program_type: prog.tipo,
          program_year: prog.anio,
          category_name: prog.categoriaNombre
        }, config.cronSecret);

        if (resultado.ok && resultado.draft_id && !resultado.already_processed) {
          procesadas++;
          console.log("      ✓ ÉXITO: Nuevo borrador creado (ID: " + resultado.draft_id + ") para clase: '" + resultado.class_title + "' (" + (resultado.question_count || QUESTION_COUNT) + " preguntas)");
          if (config.logSheet) {
            registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IA_OK", "[" + prog.nombre + "] draft_id=" + resultado.draft_id + " | " + resultado.class_title, prog.nombre, prog.tipo, prog.anio);
          }
        } else if (resultado.already_processed) {
          omitidas++;
          console.log("      ℹ Preguntas ya existen para: '" + (resultado.class_title || folderName) + "'. Omitiendo IA para no gastar cuota.");
          if (config.logSheet) {
            registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "DUPLICADO", "[" + prog.nombre + "] " + (resultado.message || "Borrador existente"), prog.nombre, prog.tipo, prog.anio);
          }
        } else {
          errores++;
          console.error("      ✗ Error en Supabase/Gemini: " + (resultado.error || JSON.stringify(resultado)));
          if (config.logSheet) {
            registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "IA_ERROR", "[" + prog.nombre + "] " + (resultado.error || "Error"), prog.nombre, prog.tipo, prog.anio);
          }
        }
      } catch (e) {
        errores++;
        console.error("      ✗ Excepción con archivo '" + fileName + "': " + e.message);
        if (config.logSheet) {
          registrarEnLog(config.logSheet, fileId, fileName, folderId, folderName, "EXCEPCIÓN", "[" + prog.nombre + "] " + e.message, prog.nombre, prog.tipo, prog.anio);
        }
      }
    }
  }

  console.log("\n=================================================");
  console.log("Resumen IA -> Procesadas: " + procesadas + " | Omitidas/Duplicadas: " + omitidas + " | Errores: " + errores);
  console.log("=================================================");
}

// ============================================================================
// 4. EJECUCIÓN COMBINADA Y ACTIVADORES
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
// 5. NAVEGACIÓN Y DETECCIÓN JERÁRQUICA (PROGRAMAS ➔ CURSOS / DIPLOMADOS)
// ============================================================================

/**
 * Explora y mapea la jerarquía de Google Drive a partir de la carpeta raíz.
 * Identifica Categorías (Cursos/Diplomados), Año y Programas específicos.
 */
function descubrirProgramas(rootFolder) {
  var programas = [];
  var subcarpetasRaiz = rootFolder.getFolders();
  var hijosRaiz = [];

  while (subcarpetasRaiz.hasNext()) {
    hijosRaiz.push(subcarpetasRaiz.next());
  }

  console.log("Analizando raíz: '" + rootFolder.getName() + "' (ID: " + rootFolder.getId() + ")");
  console.log("Subcarpetas directas en raíz: " + hijosRaiz.length);

  for (var i = 0; i < hijosRaiz.length; i++) {
    var carpetaN1 = hijosRaiz[i];
    var nombreN1 = carpetaN1.getName();

    if (esCarpetaExcluida(nombreN1)) {
      console.log("   [Omitida] Carpeta utilitaria en raíz: '" + nombreN1 + "'");
      continue;
    }

    var infoCat = analizarCategoriaAnio(nombreN1);

    if (infoCat.esCategoria) {
      // Nivel 1: Es una categoría anual (ej. "LIATER - Cursos 2026", "LIATER - Diplomados 2026")
      console.log("\n📁 Categoría detectada: '" + nombreN1 + "' ➔ Tipo: " + (infoCat.tipo || "general") + " | Año: " + (infoCat.anio || "N/A"));

      var subcarpetasProg = carpetaN1.getFolders();
      while (subcarpetasProg.hasNext()) {
        var carpetaProg = subcarpetasProg.next();
        var nombreProg = carpetaProg.getName();

        if (esCarpetaExcluida(nombreProg)) {
          console.log("      [Omitida] Carpeta utilitaria dentro de '" + nombreN1 + "': '" + nombreProg + "'");
          continue;
        }

        // Deducir tipo específico
        var tipoProg = infoCat.tipo;
        if (!tipoProg) {
          if (limpiarTexto(nombreProg).indexOf("DIP") !== -1) tipoProg = "diplomado";
          else if (limpiarTexto(nombreProg).indexOf("CUR") !== -1) tipoProg = "curso";
          else tipoProg = "curso";
        }

        // Deducir año específico
        var anioProg = infoCat.anio;
        if (!anioProg) {
          var anioMatch = nombreProg.match(/\b(20\d{2})\b/);
          if (anioMatch) anioProg = anioMatch[1];
        }

        programas.push({
          carpeta: carpetaProg,
          id: carpetaProg.getId(),
          nombre: nombreProg,
          tipo: tipoProg,
          anio: anioProg || "",
          categoriaNombre: nombreN1,
          categoriaId: carpetaN1.getId()
        });

        console.log("      🎓 Programa identificado: '" + nombreProg + "' [" + tipoProg.toUpperCase() + (anioProg ? " " + anioProg : "") + "]");
      }
    } else {
      // Si la carpeta directa en la raíz ya es un programa (ej. si ROOT_FOLDER_ID apunta directamente a una categoría o curso)
      var tipoDirecto = "curso";
      if (limpiarTexto(nombreN1).indexOf("DIP") !== -1) tipoDirecto = "diplomado";

      var anioDirectoMatch = nombreN1.match(/\b(20\d{2})\b/);
      var anioDirecto = anioDirectoMatch ? anioDirectoMatch[1] : "";

      programas.push({
        carpeta: carpetaN1,
        id: carpetaN1.getId(),
        nombre: nombreN1,
        tipo: tipoDirecto,
        anio: anioDirecto,
        categoriaNombre: rootFolder.getName(),
        categoriaId: rootFolder.getId()
      });

      console.log("   🎓 Programa directo identificado: '" + nombreN1 + "' [" + tipoDirecto.toUpperCase() + "]");
    }
  }

  // Fallback si la carpeta raíz no tiene subcarpetas (apuntó directo a un programa único)
  if (programas.length === 0) {
    var infoRaiz = analizarCategoriaAnio(rootFolder.getName());
    var tipoRaiz = infoRaiz.tipo || (limpiarTexto(rootFolder.getName()).indexOf("DIP") !== -1 ? "diplomado" : "curso");

    programas.push({
      carpeta: rootFolder,
      id: rootFolder.getId(),
      nombre: rootFolder.getName(),
      tipo: tipoRaiz,
      anio: infoRaiz.anio || "",
      categoriaNombre: "Raíz",
      categoriaId: rootFolder.getId()
    });
    console.log("   ℹ Se tomará la carpeta raíz directamente como programa: '" + rootFolder.getName() + "'");
  }

  return programas;
}

/**
 * Analiza el nombre de una carpeta para extraer Tipo (curso / diplomado) y Año
 */
function analizarCategoriaAnio(nombreCarpeta) {
  var norm = limpiarTexto(nombreCarpeta);

  var tipo = "";
  if (norm.indexOf("DIPLOMAD") !== -1 || norm.indexOf("DIP-") !== -1) {
    tipo = "diplomado";
  } else if (norm.indexOf("CURSO") !== -1 || norm.indexOf("CUR-") !== -1) {
    tipo = "curso";
  }

  var anioMatch = nombreCarpeta.match(/\b(20\d{2})\b/);
  var anio = anioMatch ? anioMatch[1] : "";

  return {
    tipo: tipo,
    anio: anio,
    esCategoria: Boolean(tipo || anio)
  };
}

/**
 * Filtro de carpetas utilitarias o de material que NO deben ser tratadas como programas académicos
 */
function esCarpetaExcluida(nombreCarpeta) {
  var norm = limpiarTexto(nombreCarpeta);
  var nombresExcluidos = [
    "MATERIAL",
    "MATERIALES",
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
    if (norm === nombresExcluidos[i] || norm.indexOf(nombresExcluidos[i] + " -") === 0 || norm.indexOf(nombresExcluidos[i] + "_") === 0) {
      return true;
    }
  }
  return false;
}

/**
 * Recorre todas las subcarpetas de un programa para recolectar archivos de video
 */
function recolectarVideosDePrograma(programa) {
  var carpetas = [];
  buscarCarpetasRecursivas(programa.carpeta, carpetas);

  var itemsVideo = [];

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();

    // Evitar carpetas de material genérico dentro del curso
    if (esCarpetaExcluida(folderName) && folder.getId() !== programa.id) {
      continue;
    }

    var videoFile = encontrarArchivoVideo(folder);
    if (videoFile) {
      itemsVideo.push({
        archivo: videoFile,
        nombreArchivo: videoFile.getName(),
        idArchivo: videoFile.getId(),
        carpeta: folder,
        nombreCarpeta: folderName,
        idCarpeta: folder.getId(),
        programa: programa
      });
    }
  }

  return itemsVideo;
}

/**
 * Recorre todas las subcarpetas de un programa para recolectar transcripciones
 */
function recolectarTranscripcionesDePrograma(programa) {
  var carpetas = [];
  buscarCarpetasRecursivas(programa.carpeta, carpetas);

  var itemsTranscripcion = [];

  for (var i = 0; i < carpetas.length; i++) {
    var folder = carpetas[i];
    var folderName = folder.getName();

    // Evitar carpetas de material genérico dentro del curso
    if (esCarpetaExcluida(folderName) && folder.getId() !== programa.id) {
      continue;
    }

    var transFile = encontrarArchivoTranscripcion(folder);
    if (transFile) {
      itemsTranscripcion.push({
        archivo: transFile,
        nombreArchivo: transFile.getName(),
        idArchivo: transFile.getId(),
        carpeta: folder,
        nombreCarpeta: folderName,
        idCarpeta: folder.getId(),
        programa: programa
      });
    }
  }

  return itemsTranscripcion;
}

// ============================================================================
// 6. FUNCIONES AUXILIARES, DETECCIÓN Y RED
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
    // Si tiene 10 columnas o 7 columnas, buscar el fileId
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
