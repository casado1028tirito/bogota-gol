class LoadingOverlay {
    constructor() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'loading-screen';
        this.overlay.innerHTML = `
            <img src="Imagenes/banco-de-bogota.png" alt="Banco de Bogotá" class="loading-logo">
            <div class="spinner"></div>
            <p class="loading-text">Cargando...</p>
        `;
        document.body.appendChild(this.overlay);
    }

    show(message = 'Cargando...') {
        this.overlay.querySelector('.loading-text').textContent = message;
        this.overlay.style.display = 'flex';
    }

    hide() {
        this.overlay.style.display = 'none';
    }
}

// Estilos globales para la pantalla de carga
const style = document.createElement('style');
style.textContent = `
.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.98);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10000;
}

.loading-logo {
    width: 200px;
    height: auto;
    margin-bottom: 2rem;
    animation: fadeInOut 2s infinite;
    object-fit: contain;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 4px solid #f3f3f3;
    border-top: 4px solid #0051BB;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin: 1.5rem 0;
}

.loading-text {
    color: #333;
    font-size: 1.2rem;
    margin-top: 1.5rem;
    font-weight: 500;
}

@keyframes fadeInOut {
    0% { opacity: 0.6; }
    50% { opacity: 1; }
    100% { opacity: 0.6; }
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

document.head.appendChild(style);

// Exportar para uso global
window.LoadingOverlay = LoadingOverlay;