require('dotenv').config({ path: '../.env' }); // Leemos las variables desde el .env del proyecto principal
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { startCronJobs } = require('./services/cronService');

console.log('Iniciando bot de WhatsApp...');

// Inicializar cliente con guardado de sesión local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// Generar QR para vinculación
client.on('qr', (qr) => {
    console.log('Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Listo y conectado
client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado y listo!');
    console.log('Iniciando tareas programadas (cron jobs)...');
    
    // Iniciar los cron jobs pasándole el cliente
    startCronJobs(client);
});

// Manejo de desconexiones
client.on('disconnected', (reason) => {
    console.log('El bot se ha desconectado. Motivo:', reason);
});

// Inicializar cliente
client.initialize();
