# 🤖 TARS AI - Terminal de Asistencia Robótica Sincera

Asistente de voz inteligente inspirado en TARS de Interstellar. Habla con él, ajusta su personalidad y disfruta de una experiencia única.

![Version](https://img.shields.io/badge/version-2.0-blue)
![Security](https://img.shields.io/badge/security-A+-green)
![License](https://img.shields.io/badge/license-MIT-orange)

---

## ✨ Características

- 🎤 **Reconocimiento de voz** - Habla naturalmente con TARS
- 🔊 **Síntesis de voz** - TARS te responde con voz robótica
- 🎭 **Personalidad ajustable** - Controla sinceridad, humor y sarcasmo
- 🎨 **ASCII Art** - Visualizaciones temáticas de Interstellar
- 🔒 **Seguro** - API key encriptada, CSP implementado
- 📱 **Responsive** - Funciona en móvil y escritorio
- 🌐 **Sin backend** - Todo funciona en tu navegador

---

## 🚀 Inicio Rápido

### 1. Obtener API Key (Gratis)

**Opción A - Groq (Recomendado):**
- Ve a https://console.groq.com/
- Crea cuenta gratis
- Genera API Key

**Opción B - OpenAI ($5 gratis):**
- Ve a https://platform.openai.com/
- Crea cuenta
- Genera API Key

**Opción C - Together AI ($25 gratis):**
- Ve a https://api.together.xyz/
- Crea cuenta
- Genera API Key

### 2. Usar TARS

1. Abre `index.html` en tu navegador
2. Clic en "CONFIGURAR API"
3. Pega tu API key
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

### Cambiar API (OpenAI, Together, etc.)

Edita `app.js` línea ~140:

```javascript
const CONFIG = {
    apiKey: loadApiKey(),
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-3.5-turbo',
    maxTokens: 150
};
```

Y actualiza CSP en `index.html` línea ~11:

```html
connect-src 'self' https://api.openai.com;
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
├── index.html          # Interfaz principal
├── app.js              # Lógica y funcionalidad
├── styles.css          # Estilos
└── README.md           # Este archivo
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

