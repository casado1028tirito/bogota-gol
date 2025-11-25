class LoadingScreen {
    constructor() {
        this.element = document.createElement('div');
        this.element.className = 'loading-screen';
        this.element.style.display = 'none';
        
        // Crear el contenido del loading screen
        this.element.innerHTML = `
            <img src="Imagenes/banco-de-bogota.png" alt="Banco de Bogotá" class="loading-logo">
            <div class="spinner"></div>
            <p class="loading-text">Cargando...</p>
        `;

        // Agregar estilos CSS
        const style = document.createElement('style');
        style.textContent = `
            .loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.98);
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            }

            .loading-logo {
                width: 120px;
                height: auto;
                margin-bottom: 2rem;
            }

            .spinner {
                width: 40px;
                height: 40px;
                border: 3px solid #f3f3f3;
                border-top: 3px solid #0051BB;
                border-radius: 50%;
                animation: spin 1s linear infinite;
                margin: 1rem 0;
            }

            .loading-text {
                color: #333;
                font-size: 1rem;
                margin-top: 1rem;
            }

            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        document.head.appendChild(style);
        document.body.appendChild(this.element);
    }

    show(message = 'Cargando...') {
        this.element.querySelector('.loading-text').textContent = message;
        this.element.style.display = 'flex';
    }

    hide() {
        this.element.style.display = 'none';
    }
}

// Export para uso global
window.LoadingScreen = LoadingScreen;