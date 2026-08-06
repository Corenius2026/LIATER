process.on('uncaughtException', (err) => {
    console.error('Error fatal no capturado:', err);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Promesa rechazada no manejada:', reason);
});

require('dotenv').config({ path: '../.env' }); // Leemos las variables desde el .env del proyecto principal
const express = require('express');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { startCronJobs } = require('./services/cronService');

// HACK PARA RENDER: Crear un servidor web básico para que Render no mate el proceso
const app = express();
const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Bot de WhatsApp de LIATER está corriendo 🚀'));
app.listen(PORT, () => console.log(`Servidor web escuchando en el puerto ${PORT}`));

console.log('Iniciando bot de WhatsApp...');

// Inicializar cliente con guardado de sesión local
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Generar QR para vinculación
client.on('qr', (qr) => {
    console.log('Escanea este código QR con tu WhatsApp:');
    qrcode.generate(qr, { small: true });
});

// Eventos de depuración de conexión
client.on('authenticated', () => {
    console.log('Autenticación exitosa. Sincronizando chats (esto puede tardar unos segundos)...');
});

client.on('auth_failure', msg => {
    console.error('Hubo un fallo en la autenticación:', msg);
});

// Listo y conectado
client.on('ready', () => {
    console.log('¡Bot de WhatsApp conectado y listo!');
    console.log('Iniciando tareas programadas (cron jobs)...');
    
    // Iniciar los cron jobs pasándole el cliente
    startCronJobs(client);
});

// Opcional: Responder a comandos básicos o imprimir IDs de grupos
client.on('message_create', (message) => {
    // Esto te ayudará a obtener el ID del grupo:
    console.log(`[Mensaje detectado] De: ${message.from} | Texto: ${message.body}`);
    
    if (message.body === '!ping') {
        client.sendMessage(message.from, 'pong');
    }
});

// Manejo de desconexiones
client.on('disconnected', (reason) => {
    console.log('El bot se ha desconectado. Motivo:', reason);
});

// Inicializar cliente
client.initialize();
