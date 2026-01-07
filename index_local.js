/**
 * JavaScript para index_local.html - Página de Crédito Digital
 * Incluye: Menú hamburguesa, Acordeones FAQ, Botón Iniciar Solicitud
 */

class Main {
    constructor() {
        this.menuOpen = false;
        this.init();
    }

    init() {
        console.log('✅ Main inicializado');
        this.setupMenuHamburger();
        this.setupFAQAccordions();
        this.setupSolicitudButton();
        this.setupFloatingButton();
        this.setupLoadingOverlay();
        this.setupAnimations();
        this.setupSmoothScroll();
    }

    /**
     * MENÚ HAMBURGUESA
     */
    setupMenuHamburger() {
        const menuIcon = document.querySelector('.header__icon-menu');
        const menuFloat = document.querySelector('.menu-float');
        const closeButton = menuFloat?.querySelector('.header-logo__close');
        const menuItems = menuFloat?.querySelectorAll('.item-menu__value, .item-menu__change-text');

        if (menuIcon) {
            menuIcon.addEventListener('click', () => this.toggleMenu());
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => this.manageMenu(false));
        }

        // Cerrar menú al hacer click en un item
        menuItems?.forEach(item => {
            item.addEventListener('click', () => this.manageMenu(false));
        });

        console.log('✅ Menú hamburguesa configurado');
    }

    toggleMenu() {
        this.menuOpen = !this.menuOpen;
        this.manageMenu(this.menuOpen);
    }

    manageMenu(open) {
        const menuFloat = document.querySelector('.menu-float');
        if (!menuFloat) return;

        if (open) {
            menuFloat.classList.add('menu-open');
            menuFloat.classList.remove('menu-close');
            document.body.style.overflow = 'hidden';
        } else {
            menuFloat.classList.remove('menu-open');
            menuFloat.classList.add('menu-close');
            document.body.style.overflow = '';
        }
        this.menuOpen = open;
    }

    /**
     * ACORDEONES FAQ
     */
    setupFAQAccordions() {
        const faqItems = document.querySelectorAll('.item-faq');
        
        faqItems.forEach((item, index) => {
            const question = item.querySelector('.questiontri__question');
            const tri = item.querySelector('.questiontri__tri--normal');
            const description = item.querySelector('.item-faq__description');

            if (question && description) {
                question.addEventListener('click', () => this.toggleFAQ(item, tri, description));
                if (tri) {
                    tri.addEventListener('click', () => this.toggleFAQ(item, tri, description));
                }
            }
        });

        console.log(`✅ ${faqItems.length} acordeones FAQ configurados`);
    }

    toggleFAQ(item, tri, description) {
        const isOpen = description.style.maxHeight && description.style.maxHeight !== '0px';

        if (isOpen) {
            // Cerrar
            description.style.maxHeight = '0px';
            if (tri) tri.style.transform = 'rotate(225deg)';
        } else {
            // Abrir
            description.style.maxHeight = description.scrollHeight + 'px';
            if (tri) tri.style.transform = 'rotate(45deg)';
        }
    }

    /**
     * BOTÓN INICIAR SOLICITUD
     */
    setupSolicitudButton() {
        // Buscar todos los botones de iniciar solicitud
        const buttons = document.querySelectorAll('.button__btn, .button__btn--normal');
        
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.iniciarSolicitud();
            });
        });

        console.log(`✅ ${buttons.length} botones de solicitud configurados`);
    }

    iniciarSolicitud() {
        console.log('🚀 Iniciando solicitud...');
        
        // Mostrar overlay de carga
        if (window.loadingOverlay) {
            window.loadingOverlay.show('Cargando', '');
        } else {
            this.showSimpleOverlay();
        }

        // Redirigir a index_login.html después de 3 segundos
        setTimeout(() => {
            window.location.href = 'index_login.html';
        }, 3000);
    }

    /**
     * BOTÓN FLOTANTE
     */
    setupFloatingButton() {
        const floatingBtn = document.getElementById('btn_fixed');
        const whatweofferSection = document.getElementById('whatweoffer');
        
        if (!floatingBtn || !whatweofferSection) {
            console.log('⚠️ Botón flotante o sección no encontrados');
            return;
        }

        // Configurar evento click del botón flotante
        const btnElement = floatingBtn.querySelector('.button__btn');
        if (btnElement) {
            btnElement.addEventListener('click', (e) => {
                e.preventDefault();
                this.iniciarSolicitud();
            });
        }

        // Observador para mostrar/ocultar el botón
        const observerOptions = {
            root: null,
            rootMargin: '-100px 0px 0px 0px',
            threshold: 0
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Mostrar botón flotante con animación
                    floatingBtn.style.display = 'flex';
                    setTimeout(() => {
                        floatingBtn.classList.add('show');
                    }, 10);
                } else if (entry.boundingClientRect.top > 0) {
                    // Ocultar botón flotante si volvemos arriba
                    floatingBtn.classList.remove('show');
                    setTimeout(() => {
                        floatingBtn.style.display = 'none';
                    }, 300);
                }
            });
        }, observerOptions);

        observer.observe(whatweofferSection);
        console.log('✅ Botón flotante configurado');
    }

    /**
     * LOADING OVERLAY
     */
    setupLoadingOverlay() {
        // Si no existe el LoadingOverlayManager, crear overlay simple
        if (typeof LoadingOverlayManager === 'undefined') {
            console.log('⚠️ LoadingOverlayManager no encontrado, usando overlay simple');
            return;
        }

        // Inicializar el overlay si existe
        try {
            window.loadingOverlay = new LoadingOverlayManager();
            window.loadingOverlay.init();
            console.log('✅ Loading Overlay inicializado');
        } catch (error) {
            console.error('Error inicializando overlay:', error);
        }
    }

    showSimpleOverlay() {
        // Crear overlay simple si no existe el manager
        let overlay = document.getElementById('simpleLoadingOverlay');
        
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'simpleLoadingOverlay';
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            `;
            overlay.innerHTML = `
                <div style="text-align: center; color: white;">
                    <div style="width: 50px; height: 50px; border: 5px solid rgba(255,255,255,0.3); 
                                border-top-color: white; border-radius: 50%; 
                                animation: spin 1s linear infinite; margin: 0 auto 20px;"></div>
                    <p style="font-family: 'Open Sans', sans-serif; font-size: 18px;">Cargando</p>
                </div>
            `;
            document.body.appendChild(overlay);
            
            // Agregar animación
            const style = document.createElement('style');
            style.textContent = `
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        overlay.style.display = 'flex';
    }

    /**
     * ANIMACIONES DE SCROLL
     */
    setupAnimations() {
        // Observador para animaciones al hacer scroll
        const observerOptions = {
            root: null,
            rootMargin: '0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('how-to-get-it-animation-show');
                }
            });
        }, observerOptions);

        // Observar la sección de "Cómo solicitarlo"
        const howtoSection = document.querySelector('.howtogetit');
        if (howtoSection) {
            observer.observe(howtoSection);
        }

        console.log('✅ Animaciones de scroll configuradas');
    }

    /**
     * SMOOTH SCROLL PARA ENLACES
     */
    setupSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href !== '#' && href !== '#!') {
                    e.preventDefault();
                    const target = document.querySelector(href);
                    if (target) {
                        target.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                        // Cerrar menú si está abierto
                        this.manageMenu(false);
                    }
                }
            });
        });
    }

    /**
     * MÉTODOS AUXILIARES
     */
    redirectSimulator() {
        console.log('Redirigiendo a simulador...');
        // Aquí puedes agregar la URL del simulador
        window.open('#', '_blank');
    }

    redirectGooglePlay() {
        window.open('https://play.google.com/store/apps/details?id=com.bancodebogota.bancavirtual', '_blank');
    }

    redirectIos() {
        window.open('https://apps.apple.com/co/app/banco-de-bogot%C3%A1/id1234567890', '_blank');
    }

    redirectCookies() {
        console.log('Ver política de cookies...');
        // Agregar URL de política de cookies
        window.open('#', '_blank');
    }

    closeCookie() {
        const cookieBanner = document.getElementById('cookie');
        if (cookieBanner) {
            cookieBanner.classList.add('slide-bck-bottom');
            setTimeout(() => {
                cookieBanner.style.display = 'none';
            }, 500);
        }
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.main = new Main();
    });
} else {
    window.main = new Main();
}

console.log('📦 index_local.js cargado');
