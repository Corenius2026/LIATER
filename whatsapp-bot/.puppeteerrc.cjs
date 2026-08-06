const { join } = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Configuración para asegurar que Chrome se descargue en una carpeta local de Render
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
