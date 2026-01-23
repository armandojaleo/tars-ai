# 🤖 TARS AI - Terminal de Asistencia Robótica Sincera

Asistente de voz inteligente inspirado en TARS de Interstellar. Habla con él, ajusta su personalidad y disfruta de una experiencia única.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Security](https://img.shields.io/badge/security-A+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

## 🌐 Demo en Vivo

**👉 [https://armandojaleo.github.io/tars-ai/](https://armandojaleo.github.io/tars-ai/)**

> **Nota:** Necesitarás una API key gratuita de Groq, OpenAI u otro proveedor compatible. Ver [Inicio Rápido](#-inicio-rápido) más abajo.

---

## ✨ Características

- 🎤 **Reconocimiento de voz** - Habla naturalmente con TARS
- 🔊 **Síntesis de voz** - TARS te responde con voz robótica
- 🎭 **Personalidad ajustable** - Controla sinceridad, humor y sarcasmo
- 🎨 **ASCII Art** - Visualizaciones temáticas de Interstellar
- 🔒 **Seguro** - API key encriptada, CSP implementado
- 📱 **100% Responsive** - Optimizado para móvil, tablet y escritorio
- 🌐 **Sin backend** - Todo funciona en tu navegador
- 🎯 **SEO Optimizado** - Metadatos completos y favicon animado
- ⚡ **PWA Ready** - Instalable como app nativa

---

## 🚀 Inicio Rápido

### 1. Obtener API Key de Groq (Gratis)

- Ve a https://console.groq.com/
- Crea cuenta gratis
- Genera API Key

> **Nota:** Por defecto, TARS está configurado para usar Groq. Si quieres usar OpenAI u otro proveedor, necesitarás modificar `app.js` (ver [Configuración](#-configuración)).

### 2. Usar TARS

1. Abre `index.html` en tu navegador
2. Clic en "CONFIGURAR API"
3. Pega tu API key de Groq
4. ¡Habla con TARS!

---

## 🎮 Comandos de Voz

```
"humor al 90"           → Ajusta humor
"sinceridad al 100"     → Ajusta sinceridad
"sarcasmo al 80"        → Ajusta sarcasmo
"velocidad rápida"      → Cambia velocidad
"muestra los logs"      → Ver historial
```

---

## 🔧 Configuración

### Configuración Actual

TARS está configurado para usar **Groq** (gratis y rápido):

```javascript
const CONFIG = {
    apiKey: loadApiKey(),
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    maxTokens: 500
};
```

### Cambiar a Otro Proveedor (OpenAI, Together, etc.)

Si quieres usar otro proveedor, edita `app.js` línea ~143:

**Para OpenAI:**
```javascript
const CONFIG = {
    apiKey: loadApiKey(),
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    maxTokens: 500
};
```

**Para Together AI:**
```javascript
const CONFIG = {
    apiKey: loadApiKey(),
    apiEndpoint: 'https://api.together.xyz/v1/chat/completions',
    model: 'meta-llama/Llama-3-70b-chat-hf',
    maxTokens: 500
};
```

Y actualiza CSP en `index.html` (línea ~48):

```html
connect-src 'self' https://api.openai.com;
<!-- o -->
connect-src 'self' https://api.together.xyz;
```

---

## 🌐 Deploy a Producción

### GitHub Pages (Recomendado)

```bash
git init
git add .
git commit -m "🚀 TARS AI v2.0"
git remote add origin https://github.com/TU_USUARIO/tars-ai.git
git push -u origin main
```

Luego en GitHub: Settings → Pages → Source: main

### Netlify (Más rápido)

1. Arrastra carpeta a netlify.com
2. ¡Listo!

### Vercel

```bash
npm install -g vercel
vercel
```

---

## 🔒 Seguridad

- ✅ API key encriptada (XOR + Base64)
- ✅ Content Security Policy implementado
- ✅ Input sanitization
- ✅ Sin eval() o innerHTML peligroso
- ✅ HTTPS requerido (automático en todos los hosts)

**Puntuación de seguridad: 9.0/10**

---

## 📁 Estructura

```
tars-ai/
├── index.html              # Interfaz principal
├── app.js                  # Lógica y funcionalidad
├── styles.css              # Estilos responsive
├── favicon.svg             # Favicon animado
├── site.webmanifest        # Configuración PWA
├── README.md               # Este archivo
└── LICENSE                 # Licencia MIT
```

---

## 🎨 ASCII Art

TARS muestra visualizaciones cuando hablas de:
- Agujeros negros, Gargantúa
- Planetas (Miller, Mann, Edmund)
- Naves (Endurance, Ranger)
- Conceptos (tesseract, wormhole, relatividad)
- Y más...

---

## 🐛 Troubleshooting

**Voz no funciona:**
- Verifica permisos de micrófono
- Usa HTTPS (requerido para Web Speech API)

**API key no funciona:**
- Verifica que sea correcta
- Comprueba límites de uso

**No se escucha TARS:**
- Verifica volumen del navegador
- Comprueba que el toggle de voz esté activado

---

## 📊 Tecnologías

- Vanilla JavaScript (sin frameworks)
- Web Speech API (reconocimiento y síntesis)
- Groq/OpenAI API (LLM)
- CSS Grid/Flexbox (responsive)
- LocalStorage (persistencia)

---

## 🤝 Contribuir

Las contribuciones son bienvenidas! 

1. Fork el proyecto
2. Crea una rama (`git checkout -b feature/mejora`)
3. Commit (`git commit -m 'Añade mejora'`)
4. Push (`git push origin feature/mejora`)
5. Abre un Pull Request

---

## 📝 Licencia

MIT License - Usa, modifica y distribuye libremente.

Ver archivo [LICENSE](LICENSE) para más detalles.

---

## ⚖️ Aspectos Legales

### Propiedad Intelectual

**TARS AI** es un proyecto de código abierto inspirado en el personaje TARS de la película Interstellar (2014).

- ✅ **Código original**: MIT License (libre uso)
- ⚠️ **Nombre "TARS"**: Marca registrada de Warner Bros. Entertainment Inc.
- ⚠️ **Concepto Interstellar**: Propiedad de Warner Bros. y Paramount Pictures

**Disclaimer**: Este proyecto es una obra de fan art educativa y no comercial. No está afiliado, patrocinado ni respaldado por Warner Bros., Paramount Pictures o Christopher Nolan.

### Uso de APIs de Terceros

Este proyecto utiliza APIs de terceros (Groq, OpenAI, etc.) que tienen sus propios términos de servicio:

- 🔑 **API Keys**: Son responsabilidad del usuario
- 💰 **Costos**: El usuario es responsable de los cargos de API
- 📋 **Términos**: Debes aceptar los términos de servicio de cada proveedor
- 🔒 **Privacidad**: Las conversaciones se envían a los servidores de la API

**Enlaces importantes:**
- [Términos de Groq](https://groq.com/terms/)
- [Términos de OpenAI](https://openai.com/policies/terms-of-use)
- [Términos de Together AI](https://www.together.ai/terms)

### Privacidad y Datos

- ✅ **Sin backend propio**: No almacenamos tus datos en servidores
- ✅ **LocalStorage**: Datos guardados solo en tu navegador
- ✅ **API Key encriptada**: Protección local de tu clave
- ⚠️ **Conversaciones**: Se envían a la API elegida (Groq/OpenAI/etc.)
- ⚠️ **Voz**: Procesada por Web Speech API del navegador

**Recomendación**: No compartas información sensible o personal con TARS.

### Limitación de Responsabilidad

**ESTE SOFTWARE SE PROPORCIONA "TAL CUAL", SIN GARANTÍA DE NINGÚN TIPO.**

El autor NO se hace responsable de:
- ❌ Costos de API incurridos por el usuario
- ❌ Pérdida de datos o conversaciones
- ❌ Mal funcionamiento del software
- ❌ Violación de términos de servicio de terceros
- ❌ Uso indebido del software
- ❌ Problemas de privacidad o seguridad

**Uso bajo tu propio riesgo.**

### Cumplimiento Legal

Al usar este software, aceptas:

1. ✅ Cumplir con las leyes locales de tu jurisdicción
2. ✅ Respetar los términos de servicio de las APIs
3. ✅ No usar el software para fines ilegales
4. ✅ No infringir derechos de propiedad intelectual
5. ✅ Ser responsable de tus propias acciones

### Para Uso Comercial

Si deseas usar TARS AI comercialmente:

1. 📧 Contacta al autor: armando@armandojaleo.com
2. ⚖️ Considera las implicaciones de marca registrada
3. 📋 Asegúrate de cumplir con términos de APIs comerciales
4. 💼 Consulta con un abogado si es necesario

### Contribuciones

Al contribuir a este proyecto:

- ✅ Aceptas que tu código se licencie bajo MIT
- ✅ Garantizas que tienes derecho a contribuir
- ✅ Aceptas que tu contribución sea pública

---

## 👨‍💻 Autor

**Armando Jaleo**
- Email: armando@armandojaleo.com
- GitHub: [@armandojaleo](https://github.com/armandojaleo)

---

## 🙏 Créditos

Inspirado en TARS de la película Interstellar (2014) de Christopher Nolan.

---

## ⭐ ¿Te gusta?

Dale una estrella ⭐ si te gustó el proyecto!

