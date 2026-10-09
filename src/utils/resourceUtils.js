/**
 * Utilidades para la gestión y descarga de recursos y materiales de estudio.
 */

/**
 * Obtiene la URL de descarga directa de un recurso.
 * Para archivos alojados en Google Drive, convierte la URL de vista previa/compartida
 * en una URL de exportación directa (export=download).
 * Para otros recursos, retorna la URL directa.
 *
 * @param {string} url - URL del recurso
 * @returns {string} URL directa para descarga
 */
export function getDownloadUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const trimmed = url.trim();

  // Caso Google Drive: extraer file ID y retornar enlace de descarga directa
  if (trimmed.includes('drive.google.com')) {
    const matchFile = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (matchFile && matchFile[1]) {
      return `https://drive.google.com/uc?export=download&id=${matchFile[1]}`;
    }
    const matchIdParam = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (matchIdParam && matchIdParam[1]) {
      return `https://drive.google.com/uc?export=download&id=${matchIdParam[1]}`;
    }
  }

  return trimmed;
}

/**
 * Dispara la descarga de un recurso de forma programática o abre la descarga directa en nueva pestaña.
 *
 * @param {string} url - URL original o de descarga
 * @param {string} [title] - Nombre sugerido del archivo
 */
export function triggerResourceDownload(url, title = '') {
  const downloadUrl = getDownloadUrl(url);
  if (!downloadUrl) return;

  // Si es Google Drive, abrimos la URL de descarga directa que fuerza el download del archivo
  if (downloadUrl.includes('drive.google.com')) {
    window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  // Para enlaces directos de archivos (PDF, ZIP, etc.)
  const link = document.createElement('a');
  link.href = downloadUrl;
  if (title) {
    link.download = title;
  }
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Obtiene la extensión en minúsculas a partir del nombre de archivo, URL o título.
 *
 * @param {string} [fileName]
 * @param {string} [url]
 * @param {string} [title]
 * @returns {string} Extensión limpia (ej. 'dwg', 'pdf', 'xlsx')
 */
export function getFileExtension(fileName = '', url = '', title = '') {
  const target = (fileName || title || url || '').toLowerCase().split('?')[0].split('#')[0];
  const parts = target.split('.');
  if (parts.length > 1) {
    return parts.pop().trim().toLowerCase();
  }
  return '';
}

/**
 * Determina si el formato de archivo no cuenta con previsualizador web directo en el navegador
 * (como planos .dwg, .dxf, hojas de cálculo Excel, archivos comprimidos, etc.).
 *
 * @param {string} [fileName]
 * @param {string} [materialType]
 * @param {string} [url]
 * @param {string} [title]
 * @returns {boolean}
 */
export function isNonPreviewableFormat(fileName = '', materialType = '', url = '', title = '') {
  const ext = getFileExtension(fileName, url, title);
  const nonPreviewableExts = [
    'dwg', 'dxf', 'rvt', 'ifc', 'skp', 'step', 'stp', 'iges', 'blend', 'obj', 'stl', '3ds',
    'xlsx', 'xls', 'xlsm', 'csv', 'ods',
    'zip', 'rar', '7z', 'tar', 'gz', 'bz2',
    'doc', 'docx', 'ppt', 'pptx',
    'exe', 'dmg', 'apk', 'bin', 'mpp', 'pbix'
  ];
  if (nonPreviewableExts.includes(ext)) return true;
  if (materialType === 'archive') return true;
  return false;
}

/**
 * Determina si un formato es previsualizable directamente en navegador/iframe (PDF, imagen, etc.).
 */
export function isPreviewableFormat(fileName = '', materialType = '', url = '', title = '') {
  return !isNonPreviewableFormat(fileName, materialType, url, title);
}

/**
 * Determina si un material de grupo debe ser descargable:
 * 1. Formatos no previsualizables (.dwg, Excel, ZIP, etc.): son descargables por defecto
 *    (incluso si no se ha configurado la columna o si allow_download no es estrictamente false).
 * 2. Formatos previsualizables (PDF, imágenes): solo son descargables si allow_download es true.
 *
 * @param {Object} material
 * @returns {boolean}
 */
export function isMaterialDownloadable(material) {
  if (!material) return false;
  const isNonPreview = isNonPreviewableFormat(
    material.file_name,
    material.material_type,
    material.url,
    material.title
  );
  if (isNonPreview) {
    // Para DWG, Excel, etc. es descargable por defecto a menos que se haya bloqueado explícitamente
    return material.allow_download !== false;
  }
  return Boolean(material.allow_download);
}
