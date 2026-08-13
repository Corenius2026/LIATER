/**
 * Módulo: storageUtils.js
 * Utilidades seguras y resilientes para interactuar con localStorage en el navegador.
 * Previene crashes por SyntaxError cuando los datos están corruptos o vacíos.
 */

/**
 * Obtiene y parsea de forma segura un valor JSON almacenado en localStorage.
 * @param {string} key - Clave en localStorage
 * @param {*} [fallback=null] - Valor retornado en caso de error, null o parse inválido
 * @returns {*} El valor parseado o el fallback
 */
export function safeJsonParse(key, fallback = null) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null || raw === undefined || raw === 'undefined' || raw === '') {
      return fallback;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn(`[storageUtils] Error al parsear clave '${key}':`, err);
    return fallback;
  }
}

/**
 * Guarda de forma segura un valor en localStorage serializándolo a JSON.
 * @param {string} key - Clave en localStorage
 * @param {*} value - Valor a guardar
 * @returns {boolean} true si se guardó con éxito, false si falló (ej. quota excedida)
 */
export function safeSetItem(key, value) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (err) {
    console.warn(`[storageUtils] Error al guardar clave '${key}':`, err);
    return false;
  }
}

/**
 * Elimina una clave de localStorage de forma segura.
 * @param {string} key - Clave a eliminar
 */
export function safeRemoveItem(key) {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[storageUtils] Error al eliminar clave '${key}':`, err);
  }
}
