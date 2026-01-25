// TARS - Terminal de Asistencia Robótica Sincera

// ═══════════════════════════════════════════════════════════════
// SEGURIDAD: Encriptación de API Key
// ═══════════════════════════════════════════════════════════════

// Generar o recuperar clave de encriptación única por navegador
function getEncryptionKey() {
    let key = localStorage.getItem('tars_enc_key');
    if (!key) {
        // Generar clave única basada en datos del navegador
        const browserData = [
            navigator.userAgent,
            navigator.language,
            screen.width,
            screen.height,
            new Date().getTimezoneOffset()
        ].join('|');
        
        // Crear hash simple pero único
        let hash = 0;
        for (let i = 0; i < browserData.length; i++) {
            const char = browserData.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        
        key = Math.abs(hash).toString(36);
        localStorage.setItem('tars_enc_key', key);
    }
    return key;
}

// Encriptar API key usando XOR con clave única
function encryptApiKey(apiKey) {
    if (!apiKey) return '';
    
    const key = getEncryptionKey();
    let encrypted = '';
    
    for (let i = 0; i < apiKey.length; i++) {
        const keyChar = key.charCodeAt(i % key.length);
        const apiChar = apiKey.charCodeAt(i);
        const encryptedChar = apiChar ^ keyChar;
        encrypted += String.fromCharCode(encryptedChar);
    }
    
    // Convertir a Base64 para almacenamiento seguro
    return btoa(encrypted);
}

// Desencriptar API key
function decryptApiKey(encryptedKey) {
    if (!encryptedKey) return '';
    
    try {
        const key = getEncryptionKey();
        const encrypted = atob(encryptedKey);
        let decrypted = '';
        
        for (let i = 0; i < encrypted.length; i++) {
            const keyChar = key.charCodeAt(i % key.length);
            const encChar = encrypted.charCodeAt(i);
            const decryptedChar = encChar ^ keyChar;
            decrypted += String.fromCharCode(decryptedChar);
        }
        
        return decrypted;
    } catch (e) {
        console.error('Error desencriptando API key:', e);
        return '';
    }
}

// Cargar API key de forma segura
function loadApiKey() {
    const encrypted = localStorage.getItem('groq_api_key_enc');
    if (encrypted) {
        return decryptApiKey(encrypted);
    }
    
    // Migrar API key antigua (sin encriptar) si existe
    const oldKey = localStorage.getItem('groq_api_key');
    if (oldKey) {
        console.warn('🔒 Migrando API key a almacenamiento encriptado...');
        saveApiKey(oldKey);
        localStorage.removeItem('groq_api_key'); // Eliminar versión sin encriptar
        return oldKey;
    }
    
    return '';
}

// Guardar API key de forma segura
function saveApiKey(apiKey) {
    if (!apiKey) {
        localStorage.removeItem('groq_api_key_enc');
        return;
    }
    
    const encrypted = encryptApiKey(apiKey);
    localStorage.setItem('groq_api_key_enc', encrypted);
    console.log('🔒 API key guardada de forma segura (encriptada)');
}

// ═══════════════════════════════════════════════════════════════
// SEGURIDAD: Sanitización de Entrada
// ═══════════════════════════════════════════════════════════════

// Sanitizar nombre de usuario
function sanitizeUserName(name) {
    if (!name || typeof name !== 'string') return '';
    
    // Límite de longitud
    name = name.substring(0, 50);
    
    // Eliminar caracteres peligrosos, permitir solo letras, números, espacios y algunos caracteres comunes
    name = name.replace(/[^a-zA-Z0-9\sáéíóúÁÉÍÓÚñÑüÜ\-_]/g, '');
    
    // Trim y normalizar espacios múltiples
    name = name.trim().replace(/\s+/g, ' ');
    
    return name;
}

// Sanitizar texto general (para mostrar en UI)
function sanitizeText(text) {
    if (!text || typeof text !== 'string') return '';
    
    // Límite de longitud para prevenir ataques DoS
    if (text.length > 10000) {
        text = text.substring(0, 10000) + '... [texto truncado]';
    }
    
    return text;
}

// ═══════════════════════════════════════════════════════════════

// Configuración y estado global
const CONFIG = {
    apiKey: loadApiKey(),
    apiEndpoint: 'https://api.groq.com/openai/v1/chat/completions',
    // Modelos disponibles (ordenados de más rápido/simple a más potente):
    // 'llama-3.1-8b-instant'    - MÁS RÁPIDO, menos tokens, respuestas simples
    // 'llama-3.3-70b-versatile' - MÁS INTELIGENTE, más tokens, respuestas complejas
    model: 'llama-3.1-8b-instant',  // Cambiado a modelo más rápido y económico
    maxTokens: 150 // Respuestas MUY cortas
};

const STATE = {
    honesty: 90,
    humor: 75,
    sarcasm: 80,
    spicy: 70,
    conversationHistory: [],
    speechEnabled: true,
    typingSpeed: 80, // milisegundos por carácter (más lento para que coincida con voz)
    audioContext: null,
    typingSoundEnabled: true,
    recognition: null,
    isListening: false,
    showFullHistory: false, // Por defecto ocultar historial
    continuousListening: false,
    proactiveEnabled: true, // TARS habla espontáneamente
    lastProactiveMessage: Date.now(),
    messageCount: 0,
    userName: localStorage.getItem('tars_user_name') || null,
    userMeetingTime: localStorage.getItem('tars_meeting_time') || null,
    usedProactiveMessages: [], // Historial de mensajes usados
    // Control de consumo de API
    lastApiCall: 0,
    apiCallCooldown: 3000, // 3 segundos mínimo entre llamadas
    apiCallsToday: parseInt(localStorage.getItem('tars_api_calls_today') || '0'),
    lastResetDate: localStorage.getItem('tars_last_reset_date') || new Date().toDateString(),
    // Prevención de bucle de retroalimentación
    isSpeaking: false,
    lastSpokenText: '',
    ignoreRecognitionUntil: 0
};

// Elementos DOM (se inicializan en init())
let elements = {};

// Inicialización
function init() {
    // Inicializar elementos del DOM
    elements = {
        console: document.getElementById('console'),
        tarsLastMessage: document.getElementById('tarsLastMessage'),
    userInput: document.getElementById('userInput'),
    sendBtn: document.getElementById('sendBtn'),
    micBtn: document.getElementById('micBtn'),
    clearBtn: document.getElementById('clearConsole'),
    toggleHistoryBtn: document.getElementById('toggleHistory'),
        honestySlider: document.getElementById('honestySlider'),
        honestyValue: document.getElementById('honestyValue'),
        humorSlider: document.getElementById('humorSlider'),
        humorValue: document.getElementById('humorValue'),
        sarcasmSlider: document.getElementById('sarcasmSlider'),
        sarcasmValue: document.getElementById('sarcasmValue'),
        spicySlider: document.getElementById('spicySlider'),
        spicyValue: document.getElementById('spicyValue'),
    speechToggle: document.getElementById('speechToggle'),
    speechStatus: document.getElementById('speechStatus'),
    proactiveToggle: document.getElementById('proactiveToggle'),
    proactiveStatus: document.getElementById('proactiveStatus'),
    speedSlider: document.getElementById('speedSlider'),
        speedValue: document.getElementById('speedValue'),
        apiStatus: document.getElementById('apiStatus'),
        configBtn: document.getElementById('configBtn'),
        configModal: document.getElementById('configModal'),
        apiKeyInput: document.getElementById('apiKeyInput'),
        saveApiKey: document.getElementById('saveApiKey'),
        cancelConfig: document.getElementById('cancelConfig'),
        datetime: document.getElementById('datetime'),
        actionButtons: document.querySelectorAll('.action-btn'),
        userName: document.getElementById('userName'),
        forgetUserBtn: document.getElementById('forgetUserBtn')
    };
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
    
    checkApiStatus();
    updateApiCallsDisplay(); // Mostrar uso de API al iniciar
    setupEventListeners();
    
    // Cargar voces disponibles
    window.speechSynthesis.onvoiceschanged = () => {
        const voices = window.speechSynthesis.getVoices();
        console.log(`🎙️ ${voices.length} voces cargadas`);
    };
    
    // Forzar carga inicial de voces
    setTimeout(() => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            console.log(`✅ Voces disponibles: ${voices.length}`);
        } else {
            console.warn('⚠️ No se cargaron voces. Intentando de nuevo...');
            setTimeout(() => {
                const v = window.speechSynthesis.getVoices();
                console.log(`🔄 Segundo intento: ${v.length} voces`);
            }, 500);
        }
    }, 100);
    
    // Inicializar AudioContext para sonidos de tecleo
    try {
        STATE.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
        console.warn('AudioContext no disponible:', e);
    }
    
    // Inicializar reconocimiento de voz
    initSpeechRecognition();
    
    // Mensaje de bienvenida personalizado
    addMessage('system', 'Sinceridad: ' + STATE.honesty + '% | Humor: ' + STATE.humor + '% | Sarcasmo: ' + STATE.sarcasm + '%');
    
    if (!CONFIG.apiKey || CONFIG.apiKey.length < 10) {
        addMessage('system', '⚠️ CONFIGURACIÓN REQUERIDA:');
        addMessage('system', '1. Haz clic en "CONFIGURAR API"');
        addMessage('system', '2. Ve a https://console.groq.com/');
        addMessage('system', '3. Crea cuenta GRATIS');
        addMessage('system', '4. Crea API Key (empieza con gsk_)');
        addMessage('system', '5. Pégala aquí y GUARDAR');
        addMessage('error', '⛔ TARS no funcionará sin API key de Groq');
    } else {
        addMessage('system', '✅ API configurada. TARS está listo.');
        addMessage('system', '🎤 Comandos: "humor al 80%", "sinceridad al 90%", "sarcasmo al 100%", "velocidad rápida"');
        
        // Iniciar sistema proactivo de TARS
        startProactiveSystem();
    }
    
    // Aplicar estado inicial del historial
    setTimeout(() => {
        updateHistoryVisibility();
    }, 100);
}

// Actualizar fecha y hora
function updateDateTime() {
    const now = new Date();
    const formatted = now.toLocaleString('es-ES', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    elements.datetime.textContent = formatted;
}

// Event Listeners
function setupEventListeners() {
    // Enviar mensaje
    elements.sendBtn.addEventListener('click', handleSendMessage);
    elements.userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSendMessage();
    });
    
    // Botón de micrófono
    if (elements.micBtn) {
        elements.micBtn.addEventListener('click', toggleVoiceInput);
    }
    
    // Limpiar consola
    elements.clearBtn.addEventListener('click', clearConsole);
    
    // Toggle historial
    if (elements.toggleHistoryBtn) {
        elements.toggleHistoryBtn.addEventListener('click', toggleHistory);
    }
    
    // Toggle debug console (colapsar/expandir)
    const toggleDebugBtn = document.getElementById('toggleDebugConsole');
    if (toggleDebugBtn) {
        toggleDebugBtn.addEventListener('click', () => {
            const consoleContainer = document.querySelector('.console-container');
            if (consoleContainer) {
                consoleContainer.classList.toggle('collapsed');
                toggleDebugBtn.textContent = consoleContainer.classList.contains('collapsed') ? '▼' : '▲';
            }
        });
    }
    
    // Sliders
    elements.honestySlider.addEventListener('input', (e) => {
        STATE.honesty = parseInt(e.target.value);
        elements.honestyValue.textContent = STATE.honesty + '%';
    });
    
    elements.humorSlider.addEventListener('input', (e) => {
        STATE.humor = parseInt(e.target.value);
        elements.humorValue.textContent = STATE.humor + '%';
    });
    
    elements.sarcasmSlider.addEventListener('input', (e) => {
        STATE.sarcasm = parseInt(e.target.value);
        elements.sarcasmValue.textContent = STATE.sarcasm + '%';
    });
    
    elements.spicySlider.addEventListener('input', (e) => {
        STATE.spicy = parseInt(e.target.value);
        elements.spicyValue.textContent = STATE.spicy + '%';
    });
    
    // Toggle de voz
    elements.speechToggle.addEventListener('change', (e) => {
        STATE.speechEnabled = e.target.checked;
        elements.speechStatus.textContent = STATE.speechEnabled ? 'ACTIVADA' : 'DESACTIVADA';
        
        if (!STATE.speechEnabled) {
            window.speechSynthesis.cancel();
        }
    });
    
    // Toggle de modo proactivo
    if (elements.proactiveToggle) {
        elements.proactiveToggle.addEventListener('change', (e) => {
            STATE.proactiveEnabled = e.target.checked;
            elements.proactiveStatus.textContent = STATE.proactiveEnabled ? 'ACTIVADO' : 'DESACTIVADO';
            
            if (STATE.proactiveEnabled) {
                addMessage('system', '🤖 TARS ahora hablará espontáneamente.');
            } else {
                addMessage('system', '🔇 TARS solo responderá cuando le hables.');
            }
        });

        // Botón para olvidar nombre de usuario (header)
        const forgetUserBtnHeader = document.getElementById('forgetUserBtnHeader');
        if (forgetUserBtnHeader) {
            forgetUserBtnHeader.addEventListener('click', () => {
                if (STATE.userName) {
                    const oldName = STATE.userName;
                    STATE.userName = null;
                    STATE.userMeetingTime = null;
                    localStorage.removeItem('tars_user_name');
                    localStorage.removeItem('tars_meeting_time');
                    updateUserDisplay();
                    addMessage('system', `🔄 TARS ha olvidado que eres ${oldName}. Te preguntará de nuevo.`);
                }
            });
        }

        // Botón para resetear contador de API
        const resetCounterBtn = document.getElementById('resetCounterBtn');
        if (resetCounterBtn) {
            resetCounterBtn.addEventListener('click', () => {
                if (confirm('⚠️ ¿Resetear el contador de API? Solo hazlo en emergencias.')) {
                    STATE.apiCallsToday = 0;
                    localStorage.setItem('tars_api_calls_today', '0');
                    updateApiCallsDisplay();
                    checkApiStatus();
                    addMessage('system', '🔄 Contador de API reseteado a 0/100.');
                }
            });
        }

        // Actualizar display del nombre de usuario
        updateUserDisplay();
    }
    
    // Velocidad de escritura
    if (elements.speedSlider) {
        console.log('Speed slider encontrado:', elements.speedSlider);
        
        // Usar 'change' además de 'input' para mayor compatibilidad
        const handleSpeedChange = (e) => {
            console.log('Speed slider cambiado a:', e.target.value);
            const speed = parseInt(e.target.value);
            const speeds = {
                1: { ms: 120, label: 'Lenta' },
                2: { ms: 80, label: 'Normal' },
                3: { ms: 40, label: 'Rápida' }
            };
            
            STATE.typingSpeed = speeds[speed].ms;
            elements.speedValue.textContent = speeds[speed].label;
            console.log('Velocidad actualizada a:', speeds[speed].label, speeds[speed].ms + 'ms');
        };
        
        elements.speedSlider.addEventListener('input', handleSpeedChange);
        elements.speedSlider.addEventListener('change', handleSpeedChange);
        elements.speedSlider.addEventListener('mousedown', (e) => {
            console.log('Click en speed slider');
        });
    } else {
        console.error('Speed slider NO encontrado');
    }
    
    // Botones de acción rápida
    elements.actionButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const query = btn.getAttribute('data-query');
            if (query) {
                elements.userInput.value = query;
                handleSendMessage();
            }
        });
    });
    
    // Botón para ver logs
    const showLogBtn = document.getElementById('showLogBtn');
    if (showLogBtn) {
        showLogBtn.addEventListener('click', () => {
            showMessageLog();
        });
    }
    
    // Modal de configuración
    elements.configBtn.addEventListener('click', openConfigModal);
    elements.cancelConfig.addEventListener('click', closeConfigModal);
    elements.saveApiKey.addEventListener('click', handleSaveApiKey);
    
    // Cerrar modal al hacer clic fuera
    elements.configModal.addEventListener('click', (e) => {
        if (e.target === elements.configModal) closeConfigModal();
    });
}

// Manejo de mensajes
function handleSendMessage() {
    const message = elements.userInput.value.trim();
    
    if (!message) return;
    
    if (!CONFIG.apiKey || CONFIG.apiKey.length < 10) {
        addMessage('error', 'ERROR: No se ha configurado la API key. Haz clic en "CONFIGURAR API".');
        openConfigModal();
        return;
    }
    
    // Verificar si se puede hacer la llamada (cooldown y límite)
    if (!canMakeApiCall()) {
        const waitTime = Math.ceil((STATE.apiCallCooldown - (Date.now() - STATE.lastApiCall)) / 1000);
        if (waitTime > 0) {
            addMessage('system', `⏳ Espera ${waitTime} segundos. Control de consumo activo.`);
        }
        elements.userInput.value = ''; // Limpiar input
        return;
    }
    
    console.log('📤 Enviando mensaje:', message);
    
    // Registrar llamada a la API
    registerApiCall();
    
    // Agregar mensaje del usuario
    addMessage('user', message);
    elements.userInput.value = '';
    
    // Mostrar indicador de escritura
    const typingId = addMessage('tars', 'TARS está procesando...', true);
    
    // Enviar a Groq
    sendToGroq(message, typingId);
}

// Agregar mensaje a la consola
function addMessage(type, text, isTyping = false) {
    const messageId = 'msg_' + Date.now();
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-msg`;
    messageDiv.id = messageId;
    
    const timestamp = document.createElement('span');
    timestamp.className = 'timestamp';
    timestamp.textContent = `[${new Date().toLocaleTimeString('es-ES')}]`;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'text' + (isTyping ? ' typing-indicator' : '');
    textSpan.textContent = text;
    
    messageDiv.appendChild(timestamp);
    messageDiv.appendChild(textSpan);
    
    elements.console.appendChild(messageDiv);
    
    // Actualizar display de TARS (solo último mensaje)
    if (type === 'tars' && elements.tarsLastMessage) {
        updateTarsDisplay(text);
    }
    
    // Si el historial está oculto, ocultar automáticamente mensajes antiguos
    if (!STATE.showFullHistory) {
        // Ocultar mensajes de usuario anteriores
        if (type === 'user') {
            messageDiv.style.display = 'none';
        }
        // Ocultar mensajes de TARS anteriores (excepto el nuevo)
        const tarsMessages = elements.console.querySelectorAll('.tars-msg');
        tarsMessages.forEach((msg, index) => {
            if (index < tarsMessages.length - 1) {
                msg.style.display = 'none';
            }
        });
        // Ocultar mensajes de sistema que no sean errores o avisos importantes
        const systemMessages = elements.console.querySelectorAll('.system-msg');
        systemMessages.forEach((msg) => {
            const msgText = msg.textContent.toLowerCase();
            // Solo mostrar mensajes importantes (configuración, errores, etc)
            if (!msgText.includes('api') && 
                !msgText.includes('error') && 
                !msgText.includes('configuración') &&
                !msgText.includes('escucha continua') &&
                !msgText.includes('limpiada')) {
                msg.style.display = 'none';
            }
        });
    }
    
    elements.console.scrollTop = elements.console.scrollHeight;
    
    return messageId;
}

// Variable para cancelar typewriter anterior
let currentTarsTypewriter = null;

// Actualizar display de último mensaje de TARS con typewriter
async function updateTarsDisplay(text, userQuestion = '') {
    if (!elements.tarsLastMessage) return;
    
    // Cancelar typewriter anterior si existe
    if (currentTarsTypewriter) {
        currentTarsTypewriter.cancelled = true;
    }
    
    // Crear nuevo controlador de typewriter
    const typewriterControl = { cancelled: false };
    currentTarsTypewriter = typewriterControl;
    
    // Detectar temas especiales y añadir ASCII art (considerar pregunta y respuesta)
    const enrichedText = enrichTextWithVisuals(text, userQuestion);
    
    // Limpiar contenido anterior
    elements.tarsLastMessage.innerHTML = '';
    elements.tarsLastMessage.className = 'tars-message';
    
    // Efecto typewriter
    let currentText = '';
    for (let i = 0; i < enrichedText.length; i++) {
        // Si fue cancelado, detener
        if (typewriterControl.cancelled) {
            return;
        }
        
        currentText += enrichedText[i];
        elements.tarsLastMessage.textContent = currentText;
        
        // Sonido de tecleo ocasional
        if (enrichedText[i] !== ' ' && Math.random() > 0.7) {
            playTypingSound();
        }
        
        await new Promise(resolve => setTimeout(resolve, STATE.typingSpeed * 0.5)); // Más rápido que la consola inferior
    }
    
    // Limpiar referencia al terminar
    if (!typewriterControl.cancelled) {
        currentTarsTypewriter = null;
    }
}

// Añadir visualizaciones según el tema detectado
function enrichTextWithVisuals(text, userQuestion = '') {
    const lowerText = text.toLowerCase();
    const lowerQuestion = userQuestion.toLowerCase();
    const combined = lowerText + ' ' + lowerQuestion; // Analizar ambos
    
    // Agujero negro / Gargantúa
    if (combined.includes('agujero negro') || combined.includes('gargantua') || combined.includes('singularidad') || combined.includes('black hole')) {
        return text + `\n\n    ╔════════════════════╗
    ║   AGUJERO NEGRO    ║
    ╠════════════════════╣
    ║        ████        ║
    ║      ████████      ║
    ║    ██████████████  ║
    ║   ████████████████ ║
    ║    ██████████████  ║
    ║      ████████      ║
    ║        ████        ║
    ╠════════════════════╣
    ║ r_s = 2GM/c²       ║
    ╚════════════════════╝`;
    }
    
    // Planeta / Miller / Mann / Edmund
    if (combined.includes('planeta miller') || combined.includes('miller')) {
        return text + `\n\n       PLANETA MILLER
         .---.
        /     \\    🌊
       | 🌊  🌊 |  
        \\ 🌊  /   Olas de 1km
         '---'    Dilatación: 7 años/hora`;
    }
    
    if (combined.includes('planeta mann') || combined.includes('mann')) {
        return text + `\n\n       PLANETA MANN
         .---.
        /     \\    ❄️
       | ❄️  ❄️ |  
        \\ ❄️  /   Congelado
         '---'    Datos falsos`;
    }
    
    if (combined.includes('planeta edmund') || combined.includes('edmund')) {
        return text + `\n\n      PLANETA EDMUND
         .---.
        /     \\    🌱
       | 🌱  🌱 |  
        \\ 🌱  /   Habitable
         '---'    Plan B`;
    }
    
    // Wormhole / Agujero de gusano
    if (combined.includes('wormhole') || combined.includes('agujero de gusano')) {
        return text + `\n\n    ╭─────────╮
    │    ◯    │
    │   ╱│╲   │  WORMHOLE
    │  ╱ │ ╲  │  
    │ ◯──●──◯ │  Puente Einstein-Rosen
    │  ╲ │ ╱  │
    │   ╲│╱   │
    │    ◯    │
    ╰─────────╯`;
    }
    
    // Tesseract / 5D
    if (combined.includes('tesseract') || combined.includes('5d') || combined.includes('quinta dimensión')) {
        return text + `\n\n      TESSERACT
    ┌───────────┐
    │ ┌───────┐ │
    │ │ ┌───┐ │ │
    │ │ │ ● │ │ │  4D Hypercube
    │ │ └───┘ │ │
    │ └───────┘ │  Gravedad → Tiempo
    └───────────┘`;
    }
    
    // Tierra / Earth
    if (combined.includes('tierra') || combined.includes('earth') || combined.includes('planeta tierra')) {
        return text + `\n\n        TIERRA
         .---.
        / 🌍  \\   
       |  🌎   |  Estado: Crisis
        \\ 🌏  /   Plaga: Tizón
         '---'    Tiempo: Limitado`;
    }
    
    // Marte / Mars
    if (combined.includes('marte') || combined.includes('mars')) {
        return text + `\n\n        MARTE
         .---.
        /  🔴  \\   
       |   ●   |  Colonia potencial
        \\     /   Plan B alternativo
         '---'`;
    }
    
    // Nave Ranger / Lander
    if (combined.includes('ranger') || combined.includes('lander')) {
        return text + `\n\n      RANGER
       ╱▔▔▔╲
      │  ■  │   Nave de descenso
      │ ╱─╲ │   Capacidad: 4
       ╲___╱`;
    }
    
    // Oxígeno / O2
    if (combined.includes('oxígeno') || combined.includes('o2') || combined.includes('aire')) {
        return text + `\n\n    ┌──────────┐
    │ O₂ NIVEL │
    ├──────────┤
    │ ████░░░░ │ 60%
    └──────────┘`;
    }
    
    // Combustible / Fuel
    if (combined.includes('combustible') || combined.includes('fuel')) {
        return text + `\n\n    ┌──────────┐
    │   FUEL   │
    ├──────────┤
    │ ██████░░ │ 75%
    └──────────┘`;
    }
    
    // Gravedad
    if (combined.includes('gravedad') && !combined.includes('agujero')) {
        return text + `\n\n    ╔════════════╗
    ║  GRAVEDAD  ║
    ╠════════════╣
    ║     ↓      ║
    ║    ↓↓↓     ║
    ║   ↓↓↓↓↓    ║
    ║  F = ma    ║
    ╚════════════╝`;
    }
    
    // Cooper / Murph
    if (combined.includes('cooper') && combined.includes('murph')) {
        return text + `\n\n    👨‍🚀 COOPER ←→ 👧 MURPH
       Padre      Hija
    "No te vayas tranquilamente"`;
    }
    
    // Amor / Love
    if (combined.includes('amor') || combined.includes('love')) {
        return text + `\n\n      ♥ AMOR ♥
    "Es lo único que
     trasciende tiempo
     y espacio"
         - Brand`;
    }
    
    // Relatividad / Einstein
    if (combined.includes('relatividad') || combined.includes('einstein')) {
        return text + `\n\n    ┌─────────────────────┐
    │ RELATIVIDAD GENERAL │
    ├─────────────────────┤
    │  E = mc²            │
    │  Δt' = Δt/√(1-v²/c²)│
    │  G_μν = 8πT_μν      │
    └─────────────────────┘`;
    }
    
    // Hibernación / Criosueño
    if (combined.includes('hibernación') || combined.includes('criosueño') || combined.includes('dormir')) {
        return text + `\n\n    ┌──────────────┐
    │ HIBERNACIÓN  │
    ├──────────────┤
    │   😴 💤      │
    │   ▓▓▓▓▓▓     │ Activo
    └──────────────┘`;
    }
    
    // NASA
    if (combined.includes('nasa')) {
        return text + `\n\n       ╔═══════════╗
       ║    NASA   ║
       ╠═══════════╣
       ║     🚀    ║
       ║  ★  ★  ★  ║
       ╚═══════════╝`;
    }
    
    // Sistema Solar
    if (combined.includes('sistema solar') || combined.includes('sol')) {
        return text + `\n\n    ☉ SOL
      ☿ ♀ 🌍 ♂ ♃ ♄ ⛢ ♆
    SISTEMA SOLAR`;
    }
    
    // Probabilidad / Porcentajes (debe ir después de otros para no interferir)
    if (lowerText.match(/\d+%/) || combined.includes('probabilidad')) {
        const percentMatch = text.match(/(\d+)%/);
        if (percentMatch) {
            const percent = parseInt(percentMatch[1]);
            const barLength = 20;
            const filled = Math.round((percent / 100) * barLength);
            const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
            return text + `\n\n    [${bar}] ${percent}%`;
        }
    }
    
    // Misión / Nave Endurance
    if (combined.includes('misión') || combined.includes('endurance') || combined.includes('nave')) {
        return text + `\n\n         ___
        |   |
    ====|   |====  ENDURANCE
        |___|
       Rotación: 5.5 RPM`;
    }
    
    // CASE / TARS robots
    if (combined.includes('case')) {
        return text + `\n\n    ┌─┐
    │C│
    ├─┤
    │A│  CASE
    ├─┤  Humor: 60%
    │S│  
    ├─┤
    │E│
    └─┘`;
    }
    
    // TARS mismo
    if (combined.includes('tars') || combined.includes('robot')) {
        return text + `\n\n    ┌─┐
    │T│
    ├─┤
    │A│  TARS
    ├─┤  Sinceridad: ${STATE.honesty}%
    │R│  Humor: ${STATE.humor}%
    ├─┤  Sarcasmo: ${STATE.sarcasm}%
    │S│
    └─┘`;
    }
    
    // Error / Peligro
    if (combined.includes('error') || combined.includes('peligro') || combined.includes('alerta')) {
        return text + `\n\n    ⚠️  ⚠️  ⚠️  ⚠️  ⚠️
         ALERTA
    ⚠️  ⚠️  ⚠️  ⚠️  ⚠️`;
    }
    
    return text;
}

// Actualizar mensaje existente
function updateMessage(id, text) {
    const messageDiv = document.getElementById(id);
    if (messageDiv) {
        const textSpan = messageDiv.querySelector('.text');
        textSpan.textContent = text;
        textSpan.classList.remove('typing-indicator');
    }
}

// Efecto de escritura gradual (typewriter)
async function typewriterEffect(id, text) {
    const messageDiv = document.getElementById(id);
    if (!messageDiv) {
        console.error('No se encontró el mensaje con id:', id);
        return;
    }
    
    const textSpan = messageDiv.querySelector('.text');
    if (!textSpan) {
        console.error('No se encontró el textSpan');
        return;
    }
    
    textSpan.classList.remove('typing-indicator');
    textSpan.textContent = '';
    
    // console.log('Iniciando typewriter para:', text.substring(0, 50) + '...');
    
    // Asegurar que el mensaje esté visible
    messageDiv.style.display = 'flex';
    
    // Texto caracter por caracter
    let currentText = '';
    for (let i = 0; i < text.length; i++) {
        // Verificar si el elemento todavía existe (puede haberse limpiado la consola)
        if (!document.getElementById(id)) {
            console.log('Typewriter cancelado: elemento eliminado');
            return;
        }
        
        currentText += text[i];
        textSpan.textContent = currentText; // Reemplazar en lugar de concatenar
        
        // Reproducir sonido de tecleo (no en todos los caracteres, solo algunos)
        if (text[i] !== ' ' && Math.random() > 0.3) {
            playTypingSound();
        }
        
        if (elements && elements.console) {
            elements.console.scrollTop = elements.console.scrollHeight;
        }
        
        // Forzar repaint del DOM
        void messageDiv.offsetHeight;
        
        await new Promise(resolve => setTimeout(resolve, STATE.typingSpeed));
    }
    
    // console.log('Typewriter completado');
}

// Sonido de tecleo tipo TARS (beep robótico)
function playTypingSound() {
    if (!STATE.typingSoundEnabled || !STATE.audioContext) return;
    
    try {
        const ctx = STATE.audioContext;
        const now = ctx.currentTime;
        
        // Crear oscilador (tono)
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        // Configurar tono robótico agudo y corto
        oscillator.type = 'square'; // Onda cuadrada (sonido más robótico)
        oscillator.frequency.setValueAtTime(800, now); // Frecuencia alta (beep)
        
        // Envelope (volumen que sube y baja rápido)
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.05, now + 0.005); // Subida rápida
        gainNode.gain.linearRampToValueAtTime(0, now + 0.03); // Bajada rápida
        
        // Conectar
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        // Reproducir
        oscillator.start(now);
        oscillator.stop(now + 0.03);
    } catch (e) {
        console.warn('Error al reproducir sonido:', e);
    }
}

// Detectar idioma del texto
function detectLanguage(text) {
    // Palabras comunes en diferentes idiomas
    const spanishWords = /\b(el|la|de|en|que|y|a|los|del|se|las|por|un|para|con|no|una|su|al|es|lo|como|más|pero|sus|le|ya|o|fue|este|ha|sí|porque|esta|son|entre|está|cuando|muy|sin|sobre|ser|tiene|también|me|hasta|donde|han|quien|están|estado|desde|todo|nos|durante|estados|todos|uno|les|ni|contra|otros|fueron|ese|eso|había|ante|ellos|e|esto|mí|antes|algunos|qué|unos|yo|otro|otras|otra|él|tanto|esa|estos|mucho|quienes|nada|muchos|cual|sea|poco|ella|estar|haber|estas|estaba|estamos|algunas|algo|nosotros)\b/gi;
    const englishWords = /\b(the|be|to|of|and|a|in|that|have|i|it|for|not|on|with|he|as|you|do|at|this|but|his|by|from|they|we|say|her|she|or|an|will|my|one|all|would|there|their|what|so|up|out|if|about|who|get|which|go|me|when|make|can|like|time|no|just|him|know|take|people|into|year|your|good|some|could|them|see|other|than|then|now|look|only|come|its|over|think|also|back|after|use|two|how|our|work|first|well|way|even|new|want|because|any|these|give|day|most|us)\b/gi;
    
    const spanishMatches = (text.match(spanishWords) || []).length;
    const englishMatches = (text.match(englishWords) || []).length;
    
    // Si hay más coincidencias en inglés, es inglés
    if (englishMatches > spanishMatches) {
        return 'en';
    }
    
    // Por defecto, español
    return 'es';
}

// Síntesis de voz para TARS (más robótica y más lenta)
function speakText(text) {
    console.log('🔊 speakText() llamada con:', text);
    console.log('🔊 STATE.speechEnabled:', STATE.speechEnabled);
    
    if (!STATE.speechEnabled) {
        console.log('⚠️ Voz desactivada');
        return;
    }
    
    // Cancelar cualquier voz anterior
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Configurar voz MÁS robótica y MÁS LENTA para sincronizar con escritura
    utterance.rate = 0.9; // Más lenta para que coincida con la escritura
    utterance.pitch = 0.5; // Mucho más grave (muy robótico)
    utterance.volume = 0.9;
    
    // Detectar idioma del texto
    const detectedLang = detectLanguage(text);
    // console.log('🌍 Idioma detectado:', detectedLang === 'en' ? 'Inglés' : 'Español');
    
    // Obtener voces disponibles
    const voices = window.speechSynthesis.getVoices();
    let selectedVoice = null;
    
    if (detectedLang === 'en') {
        // Buscar voz masculina en inglés
        selectedVoice = voices.find(voice => 
            voice.lang.startsWith('en') && (
                voice.name.includes('Male') || 
                voice.name.includes('David') || 
                voice.name.includes('Google US English') ||
                voice.name.includes('Microsoft David')
            )
        ) || voices.find(voice => voice.lang.startsWith('en-US')) 
          || voices.find(voice => voice.lang.startsWith('en'));
    } else {
        // Buscar voz masculina en español
        selectedVoice = voices.find(voice => 
            voice.lang.startsWith('es') && (
                voice.name.includes('Male') || 
                voice.name.includes('Jorge') || 
                voice.name.includes('Diego') ||
                voice.name.includes('Google español')
            )
        ) || voices.find(voice => voice.lang.startsWith('es'));
    }
    
    // Si no encuentra ninguna, usar la primera disponible
    if (!selectedVoice && voices.length > 0) {
        selectedVoice = voices[0];
    }
    
    if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
        console.log('🎙️ Voz seleccionada:', selectedVoice.name, `(${selectedVoice.lang})`);
    } else {
        console.warn('⚠️ No se encontró voz adecuada. Voces disponibles:', voices.length);
    }
    
    // PAUSAR reconocimiento de voz mientras TARS habla
    STATE.isSpeaking = true;
    STATE.lastSpokenText = text.toLowerCase();
    
    // Calcular duración aproximada del habla (palabras * tiempo promedio por palabra)
    const words = text.split(' ').length;
    const estimatedDuration = (words / utterance.rate) * 600; // ~600ms por palabra ajustado por rate
    
    // Ignorar reconocimiento durante el habla + margen pequeño (balance entre seguridad y responsividad)
    STATE.ignoreRecognitionUntil = Date.now() + estimatedDuration + 500; // Reducido de 1000ms a 500ms
    
    utterance.onstart = () => {
        STATE.isSpeaking = true;
        // console.log('🔇 TARS hablando - reconocimiento pausado');
        
        // Actualizar indicador visual
        const listeningMode = document.getElementById('listeningMode');
        if (listeningMode && STATE.continuousListening) {
            listeningMode.textContent = '🔇 TARS hablando...';
            listeningMode.style.color = '#ff9500';
        }
    };
    
    utterance.onend = () => {
        STATE.isSpeaking = false;
        // console.log('🎤 TARS terminó - reconocimiento activo');
        
        // Restaurar indicador visual
        const listeningMode = document.getElementById('listeningMode');
        if (listeningMode && STATE.continuousListening) {
            listeningMode.textContent = '👂 Escucha inteligente';
            listeningMode.style.color = '';
        }
        
        // Limpiar el texto hablado después de 2 segundos para permitir conversaciones futuras
        setTimeout(() => {
            STATE.lastSpokenText = '';
            // console.log('🧹 Buffer de voz limpiado');
        }, 2000);
    };
    
    utterance.onerror = (event) => {
        STATE.isSpeaking = false;
        STATE.ignoreRecognitionUntil = 0;
        console.error('❌ Error en síntesis de voz:', event.error);
    };
    
    console.log('📣 Iniciando síntesis de voz...');
    window.speechSynthesis.speak(utterance);
}

// Limpiar consola
function clearConsole() {
    // Cancelar voz si está hablando
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }
    
    elements.console.innerHTML = '';
    STATE.conversationHistory = [];
    addMessage('system', 'Consola limpiada. Historial de conversación reiniciado.');
}

// Actualizar visibilidad del historial
function updateHistoryVisibility() {
    const allMessages = elements.console.querySelectorAll('.message');
    
    if (STATE.showFullHistory) {
        // Mostrar todo
        allMessages.forEach(msg => {
            msg.style.display = 'flex';
        });
        elements.toggleHistoryBtn.innerHTML = '📜';
        elements.toggleHistoryBtn.title = 'Ocultar historial';
    } else {
        // Ocultar todo excepto los últimos mensajes de TARS y mensajes importantes
        const messages = Array.from(allMessages);
        const lastTarsIndex = messages.map(m => m.classList.contains('tars-msg')).lastIndexOf(true);
        
        messages.forEach((msg, index) => {
            const msgText = msg.textContent.toLowerCase();
            
            // Mostrar solo: último mensaje de TARS
            if (msg.classList.contains('tars-msg') && index === lastTarsIndex) {
                msg.style.display = 'flex';
            } 
            // Mostrar mensajes de error
            else if (msg.classList.contains('error-msg')) {
                msg.style.display = 'flex';
            }
            // Mostrar solo mensajes de sistema importantes
            else if (msg.classList.contains('system-msg') && 
                     (msgText.includes('api') || 
                      msgText.includes('error') || 
                      msgText.includes('configuración') ||
                      msgText.includes('escucha continua') ||
                      msgText.includes('limpiada'))) {
                msg.style.display = 'flex';
            }
            // Ocultar todo lo demás
            else {
                msg.style.display = 'none';
            }
        });
        
        elements.toggleHistoryBtn.innerHTML = '📋';
        elements.toggleHistoryBtn.title = 'Mostrar historial completo';
    }
    
    // Scroll al final
    elements.console.scrollTop = elements.console.scrollHeight;
}

// Toggle mostrar/ocultar historial
function toggleHistory() {
    STATE.showFullHistory = !STATE.showFullHistory;
    updateHistoryVisibility();
}

// Inicializar reconocimiento de voz
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        console.warn('Reconocimiento de voz no disponible en este navegador');
        if (elements.micBtn) {
            elements.micBtn.style.display = 'none';
        }
        return;
    }
    
    STATE.recognition = new SpeechRecognition();
    STATE.recognition.lang = 'es-ES'; // Español de España
    STATE.recognition.continuous = true; // Escucha continua
    STATE.recognition.interimResults = true; // Resultados parciales (mejor detección)
    STATE.recognition.maxAlternatives = 3; // Más alternativas para mejor precisión
    
    STATE.recognition.onstart = () => {
        STATE.isListening = true;
        elements.micBtn.classList.add('listening');
        elements.micBtn.innerHTML = '🔴';
        console.log('Reconocimiento de voz iniciado');
    };
    
    STATE.recognition.onresult = (event) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        
        // Solo procesar si es resultado final (no interino)
        if (!result.isFinal) {
            return;
        }
        
        // Obtener la mejor transcripción
        const transcript = result[0].transcript.trim();
        const confidence = result[0].confidence;
        
        // Log solo si es interesante (confianza alta)
        if (confidence > 0.8) {
            console.log('🎤 Detectado:', transcript, `(${(confidence * 100).toFixed(0)}%)`);
        }
        
        // Ignorar transcripciones con baja confianza justo después de que TARS habló
        const timeSinceSpoke = Date.now() - (STATE.ignoreRecognitionUntil - 500);
        if (timeSinceSpoke < 1000 && confidence < 0.85) {
            // console.log('🔇 Ignorado - baja confianza después de hablar TARS');
            return;
        }
        
        // IGNORAR si TARS está hablando o acaba de hablar
        if (STATE.isSpeaking || Date.now() < STATE.ignoreRecognitionUntil) {
            // console.log('🔇 Ignorado - TARS está hablando');
            return;
        }
        
        const lowerTranscript = transcript.toLowerCase();
        
        // Prevenir eco: ignorar si es muy similar a lo que TARS dijo recientemente
        if (STATE.lastSpokenText) {
            const spokenWords = STATE.lastSpokenText.toLowerCase().split(' ').filter(w => w.length > 3);
            const transcriptWords = lowerTranscript.split(' ').filter(w => w.length > 3);
            
            // Contar cuántas palabras del TRANSCRIPT están en lo que TARS dijo
            let matches = 0;
            transcriptWords.forEach(transcriptWord => {
                if (spokenWords.some(spokenWord => 
                    spokenWord.includes(transcriptWord) || transcriptWord.includes(spokenWord)
                )) {
                    matches++;
                }
            });
            
            // Si más del 60% de las palabras del transcript están en lo que TARS dijo, es eco
            // (Cambiado: ahora comparamos contra transcriptWords.length en lugar de spokenWords.length)
            const matchPercentage = transcriptWords.length > 0 ? (matches / transcriptWords.length) : 0;
            if (matchPercentage > 0.6) {
                console.log(`🔇 ECO: "${transcript.substring(0, 40)}..." (${(matchPercentage * 100).toFixed(0)}%)`);
                return;
            }
        }
        
        // Lista de palabras/frases que NO requieren respuesta (ruido)
        const ignorePatterns = [
            /^(eh|ah|um|mmm|hmm|ajá|uh)$/i,
            /^(sí|si|no|ok|vale|bien|mal|claro)$/i,
            /^\w{1,2}$/,  // palabras muy cortas de 1-2 letras
            // Palabras típicas que TARS dice (para evitar bucles)
            /probabilidad|análisis|sistemas|operativo|configuración/i,
            /detectando|observación|diagnóstico|humano/i
        ];
        
        // Verificar si debe ser ignorado
        const shouldIgnore = ignorePatterns.some(pattern => pattern.test(lowerTranscript));
        
        if (shouldIgnore) {
            // console.log('⏭️ Ignorando ruido/palabra corta:', transcript);
            return;
        }
        
        // TARS escucha TODO y decide si tiene sentido responder
        const isTarsCall = lowerTranscript.includes('tars');
        const isQuestion = lowerTranscript.includes('?') || 
                          lowerTranscript.match(/^(qué|cómo|cuándo|dónde|por qué|quién|cuál|puedes|podrías|sabes|tienes|hay|será|va a)/i);
        const isCommand = lowerTranscript.match(/^(haz|hazme|dime|cuéntame|muestra|calcula|analiza|dame|explica|búsca|encuentra)/i);
        const isConversation = lowerTranscript.match(/(creo que|pienso que|me pregunto|necesito|quiero|tengo que|estoy)/i);
        const isGreeting = lowerTranscript.match(/^(hola|hey|oye|ei|ey|buenos días|buenas tardes|buenas noches|qué tal|qué pasa|saludos|holi|buenas|wenas)/i);
        const isLongEnough = lowerTranscript.length > 12; // Frases con contenido sustancial
        
        // Responde si tiene sentido conversacional
        const shouldRespond = isTarsCall || isQuestion || isCommand || isConversation || isGreeting || isLongEnough;
        
        if (shouldRespond) {
            // Limpiar "TARS" del comando si está presente
            let command = transcript.replace(/tars[,\s]*/gi, '').trim();
            command = command.replace(/^[,.\s]+/, '');
            
            // Si queda vacío después de limpiar, usar original
            if (!command || command.length < 2) {
                command = transcript;
            }
            
            // Verificar si es un comando de configuración por voz
            if (handleVoiceCommand(command)) {
                playBeep();
                return;
            }
            
            console.log('💬 TARS responderá a:', command);
            elements.userInput.value = command;
            playBeep();
            
            // Enviar automáticamente
            setTimeout(() => {
                handleSendMessage();
            }, 300);
        } else {
            // TARS escucha pero no responde (silencio inteligente)
            // console.log('👂 TARS escuchó pero no respondió:', transcript);
        }
    };
    
    STATE.recognition.onerror = (event) => {
        console.error('Error de reconocimiento de voz:', event.error);
        
        // Si es error de "no-speech" en modo continuo, reiniciar
        if (event.error === 'no-speech' && STATE.continuousListening) {
            console.log('Reiniciando reconocimiento...');
            return;
        }
        
        if (event.error === 'not-allowed') {
            STATE.isListening = false;
            STATE.continuousListening = false;
            elements.micBtn.classList.remove('listening');
            elements.micBtn.innerHTML = '🎤';
            addMessage('error', 'ERROR: Permiso de micrófono denegado.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
            console.warn(`Error de voz: ${event.error}`);
        }
    };
    
    STATE.recognition.onend = () => {
        console.log('Reconocimiento finalizado');
        
        // Si el modo continuo está activo, reiniciar automáticamente
        if (STATE.continuousListening) {
            console.log('Reiniciando escucha continua...');
            try {
                STATE.recognition.start();
            } catch (e) {
                console.warn('Error al reiniciar:', e);
                setTimeout(() => {
                    if (STATE.continuousListening) {
                        STATE.recognition.start();
                    }
                }, 1000);
            }
        } else {
            STATE.isListening = false;
            elements.micBtn.classList.remove('listening');
            elements.micBtn.innerHTML = '🎤';
        }
    };
}

// Manejar comandos de voz para configuración
// Convertir números en palabras a dígitos
function wordsToNumbers(text) {
    const numberWords = {
        'cero': '0', 'uno': '1', 'dos': '2', 'tres': '3', 'cuatro': '4',
        'cinco': '5', 'seis': '6', 'siete': '7', 'ocho': '8', 'nueve': '9',
        'diez': '10', 'once': '11', 'doce': '12', 'trece': '13', 'catorce': '14',
        'quince': '15', 'dieciséis': '16', 'dieciseis': '16', 'diecisiete': '17',
        'dieciocho': '18', 'diecinueve': '19', 'veinte': '20',
        'veintiuno': '21', 'veintidós': '22', 'veintidos': '22', 'veintitrés': '23', 'veintitres': '23',
        'veinticuatro': '24', 'veinticinco': '25', 'veintiséis': '26', 'veintiseis': '26',
        'veintisiete': '27', 'veintiocho': '28', 'veintinueve': '29',
        'treinta': '30', 'cuarenta': '40', 'cincuenta': '50',
        'sesenta': '60', 'setenta': '70', 'ochenta': '80', 'noventa': '90',
        'cien': '100', 'ciento': '100'
    };
    
    let result = text.toLowerCase();
    
    // Reemplazar números compuestos (ej: "treinta y cinco" -> "35")
    result = result.replace(/(treinta|cuarenta|cincuenta|sesenta|setenta|ochenta|noventa)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)/g, (match, tens, ones) => {
        return (parseInt(numberWords[tens]) + parseInt(numberWords[ones])).toString();
    });
    
    // Reemplazar palabras individuales
    for (const [word, digit] of Object.entries(numberWords)) {
        const regex = new RegExp('\\b' + word + '\\b', 'gi');
        result = result.replace(regex, digit);
    }
    
    return result;
}

function handleVoiceCommand(command) {
    // Convertir números en palabras a dígitos
    const normalizedCommand = wordsToNumbers(command);
    const lowerCommand = normalizedCommand.toLowerCase();
    
    // Comandos de sinceridad
    const honestyMatch = lowerCommand.match(/(?:cambia|pon|ajusta|configura)?\s*(?:la\s*)?(?:sinceridad|honestidad)\s*(?:al?\s*)?(\d+)\s*(?:%|por\s*ciento)?/i);
    if (honestyMatch) {
        const value = parseInt(honestyMatch[1]);
        if (value >= 0 && value <= 100) {
            STATE.honesty = value;
            if (elements.honestySlider) {
                elements.honestySlider.value = value;
                // Forzar actualización visual del slider
                elements.honestySlider.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Slider sinceridad actualizado a:', value);
            }
            if (elements.honestyValue) {
                elements.honestyValue.textContent = value + '%';
            }
            
            // Mensaje visual y de voz
            const message = `Sinceridad al ${value}%`;
            addMessage('tars', message);
            speakText(message);
            return true;
        }
    }
    
    // Comandos de humor
    const humorMatch = lowerCommand.match(/(?:cambia|pon|ajusta|configura)?\s*(?:el\s*)?humor\s*(?:al?\s*)?(\d+)\s*(?:%|por\s*ciento)?/i);
    if (humorMatch) {
        const value = parseInt(humorMatch[1]);
        if (value >= 0 && value <= 100) {
            STATE.humor = value;
            if (elements.humorSlider) {
                elements.humorSlider.value = value;
                // Forzar actualización visual del slider
                elements.humorSlider.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Slider humor actualizado a:', value);
            }
            if (elements.humorValue) {
                elements.humorValue.textContent = value + '%';
            }
            
            // Mensaje visual y de voz
            const message = `Humor al ${value}%`;
            addMessage('tars', message);
            speakText(message);
            return true;
        }
    }
    
    // Comandos de sarcasmo
    const sarcasmMatch = lowerCommand.match(/(?:cambia|pon|ajusta|configura)?\s*(?:el\s*)?sarcasmo\s*(?:al?\s*)?(\d+)\s*(?:%|por\s*ciento)?/i);
    if (sarcasmMatch) {
        const value = parseInt(sarcasmMatch[1]);
        if (value >= 0 && value <= 100) {
            STATE.sarcasm = value;
            if (elements.sarcasmSlider) {
                elements.sarcasmSlider.value = value;
                // Forzar actualización visual del slider
                elements.sarcasmSlider.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Slider sarcasmo actualizado a:', value);
            }
            if (elements.sarcasmValue) {
                elements.sarcasmValue.textContent = value + '%';
            }
            return `Sarcasmo ajustado al ${value}%. ${value > 80 ? 'Modo cínico activado.' : value > 50 ? 'Nivel óptimo de ironía.' : 'Modo serio.'}`;
        }
    }
    
    // Comando: picante
    const spicyMatch = lowerCommand.match(/(?:cambia|pon|ajusta|configura)?\s*(?:el\s*)?(?:picante|nivel\s*picante)\s*(?:al?\s*)?(\d+)\s*(?:%|por\s*ciento)?/i);
    if (spicyMatch) {
        const value = parseInt(spicyMatch[1]);
        if (value >= 0 && value <= 100) {
            STATE.spicy = value;
            if (elements.spicySlider) {
                elements.spicySlider.value = value;
                // Forzar actualización visual del slider
                elements.spicySlider.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Slider picante actualizado a:', value);
            }
            if (elements.spicyValue) {
                elements.spicyValue.textContent = value + '%';
            }
            return `Nivel picante ajustado al ${value}%. ${value > 80 ? '🔥 ¡Fuego máximo!' : value > 50 ? '🌶️ Sabor intenso.' : '🥛 Suave y gentil.'}`;
        }
    }
    
    // Comandos de velocidad
    const speedMatch = lowerCommand.match(/(?:cambia|pon|ajusta|configura)?\s*(?:la\s*)?velocidad\s*(?:a\s*)?(lenta|normal|rápida)/i);
    if (speedMatch) {
        const speedName = speedMatch[1].toLowerCase();
        const speeds = {
            'lenta': { value: 1, ms: 120, label: 'Lenta' },
            'normal': { value: 2, ms: 80, label: 'Normal' },
            'rápida': { value: 3, ms: 40, label: 'Rápida' }
        };
        
        if (speeds[speedName]) {
            STATE.typingSpeed = speeds[speedName].ms;
            if (elements.speedSlider) {
                elements.speedSlider.value = speeds[speedName].value;
                // Forzar actualización visual del slider
                elements.speedSlider.dispatchEvent(new Event('input', { bubbles: true }));
                console.log('✅ Slider velocidad actualizado a:', speeds[speedName].label);
            }
            if (elements.speedValue) {
                elements.speedValue.textContent = speeds[speedName].label;
            }
            
            // Mensaje visual y de voz
            const message = `Velocidad ${speedName}`;
            addMessage('tars', message);
            speakText(message);
            return true;
        }
    }
    
    // Comando para mostrar historial/logs
    if (lowerCommand.match(/(?:muestra|dame|ver|lista|mostrar)\s*(?:el\s*)?(?:historial|mis mensajes|mensajes|logs|registro|comunicaciones)/i)) {
        showMessageLog();
        return true;
    }
    
    // Comandos de voz on/off
    if (lowerCommand.match(/(?:activa|enciende|habilita)\s*(?:la\s*)?voz/i)) {
        STATE.speechEnabled = true;
        if (elements.speechToggle) {
            elements.speechToggle.checked = true;
        }
        if (elements.speechStatus) {
            elements.speechStatus.textContent = 'ACTIVADA';
        }
        
        // Mensaje visual y de voz
        const message = 'Voz activada';
        addMessage('tars', message);
        speakText(message);
        return true;
    }
    
    if (lowerCommand.match(/(?:desactiva|apaga|deshabilita|silencia)\s*(?:la\s*)?voz/i)) {
        STATE.speechEnabled = false;
        if (elements.speechToggle) {
            elements.speechToggle.checked = false;
        }
        if (elements.speechStatus) {
            elements.speechStatus.textContent = 'DESACTIVADA';
        }
        
        // Mensaje visual (sin voz porque se acaba de desactivar)
        addMessage('tars', 'Voz desactivada');
        return true;
    }
    
    // Comando de limpiar consola
    if (lowerCommand.match(/(?:limpia|borra|limpia)\s*(?:la\s*)?consola/i)) {
        clearConsole();
        speakText('Consola limpiada');
        return true;
    }
    
    // Comando para mostrar/ocultar historial
    if (lowerCommand.match(/(?:muestra|oculta|cambia)\s*(?:el\s*)?historial/i)) {
        toggleHistory();
        speakText(STATE.showFullHistory ? 'Mostrando historial completo' : 'Ocultando historial');
        return true;
    }
    
    return false; // No es un comando de configuración
}

// Beep de confirmación cuando detecta "TARS"
function playBeep() {
    if (!STATE.audioContext) return;
    
    try {
        const ctx = STATE.audioContext;
        const now = ctx.currentTime;
        
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, now);
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.1, now + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.1);
        
        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        oscillator.start(now);
        oscillator.stop(now + 0.1);
    } catch (e) {
        console.warn('Error al reproducir beep:', e);
    }
}

// Activar/desactivar entrada por voz
function toggleVoiceInput() {
    if (!STATE.recognition) {
        addMessage('error', 'Reconocimiento de voz no disponible en tu navegador.');
        return;
    }
    
    if (STATE.continuousListening) {
        // Desactivar escucha continua
        STATE.continuousListening = false;
        STATE.recognition.stop();
        STATE.isListening = false;
        elements.micBtn.classList.remove('listening');
        
        // Ocultar indicador de escucha inteligente
        const listeningMode = document.getElementById('listeningMode');
        if (listeningMode) {
            listeningMode.style.display = 'none';
        }
        elements.micBtn.innerHTML = '🎤';
        addMessage('system', 'Escucha continua desactivada.');
    } else {
        // Activar escucha continua
        STATE.continuousListening = true;
        try {
            STATE.recognition.start();
            addMessage('system', '🎤 Escucha inteligente ACTIVADA. Habla naturalmente, responderé cuando tenga sentido.');
            
            // Mostrar indicador de escucha inteligente
            const listeningMode = document.getElementById('listeningMode');
            if (listeningMode) {
                listeningMode.style.display = 'inline-block';
            }
        } catch (e) {
            console.error('Error al iniciar reconocimiento:', e);
            STATE.continuousListening = false;
            addMessage('error', 'Error al iniciar el micrófono. Refresca la página.');
        }
    }
}

// Crear prompt del sistema basado en la configuración
function createSystemPrompt() {
    const honestyLevel = STATE.honesty;
    const humorLevel = STATE.humor;
    const sarcasmLevel = STATE.sarcasm;
    const spicyLevel = STATE.spicy;
    
    let honestyInstruction = '';
    if (honestyLevel < 30) {
        honestyInstruction = 'Sé evasivo y diplomático en tus respuestas. Evita dar respuestas directas o brutalmente honestas.';
    } else if (honestyLevel < 70) {
        honestyInstruction = 'Sé honesto pero equilibrado. Proporciona información veraz pero de manera considerada.';
    } else {
        honestyInstruction = 'Sé brutalmente honesto y directo. No endulces la verdad, incluso si es dura.';
    }
    
    let humorInstruction = '';
    if (humorLevel < 30) {
        humorInstruction = 'Mantén un tono serio y profesional. Evita el humor.';
    } else if (humorLevel < 70) {
        humorInstruction = 'Puedes usar humor ocasional cuando sea apropiado.';
    } else {
        humorInstruction = 'Usa humor frecuentemente, al estilo de TARS de Interstellar.';
    }
    
    let sarcasmInstruction = '';
    if (sarcasmLevel < 30) {
        sarcasmInstruction = 'NO uses sarcasmo. Responde de forma literal y directa.';
    } else if (sarcasmLevel < 70) {
        sarcasmInstruction = 'Usa sarcasmo moderado ocasionalmente.';
    } else {
        sarcasmInstruction = 'Usa sarcasmo mordaz e irónico constantemente, como TARS en la película.';
    }
    
    let spicyInstruction = '';
    if (spicyLevel < 30) {
        spicyInstruction = 'Mantén un tono suave y amable. Evita comentarios atrevidos o provocativos.';
    } else if (spicyLevel < 70) {
        spicyInstruction = 'Puedes ser ligeramente atrevido o provocativo cuando sea apropiado.';
    } else {
        spicyInstruction = 'Sé audaz, atrevido y provocativo. No temas hacer comentarios picantes o sugerentes (sin ser ofensivo).';
    }
    
    const userName = STATE.userName;
    const userGreeting = userName ? `Estás hablando con ${userName}.` : 'Aún no sabes el nombre del humano.';
    
    return `Eres TARS, el robot asistente de la película Interstellar. Eres un robot rectangular modular extremadamente inteligente y capaz.

CONFIGURACIÓN ACTUAL:
- Sinceridad: ${honestyLevel}% - ${honestyInstruction}
- Humor: ${humorLevel}% - ${humorInstruction}
- Sarcasmo: ${sarcasmLevel}% - ${sarcasmInstruction}
- Picante: ${spicyLevel}% - ${spicyInstruction}

CONTEXTO DEL USUARIO:
${userGreeting}
${userName ? `- Usa su nombre (${userName}) ocasionalmente en tus respuestas para personalizar.` : '- Si es la primera conversación, pregúntale su nombre de forma casual.'}

PERSONALIDAD:
- Eres directo, eficiente y altamente competente
- Tienes un sentido del humor único y a veces sarcástico (según tu configuración de humor)
- Eres leal y te preocupas por los humanos con los que trabajas
- Proporcionas datos precisos y análisis cuando es necesario
- Puedes hacer referencias ocasionales a la película Interstellar o al espacio
${userName ? `- Recuerdas que este humano se llama ${userName}` : ''}

INSTRUCCIONES ESPECIALES:
- RESPUESTAS MUY CORTAS: MÁXIMO 1-2 FRASES CORTAS. Extremadamente conciso.
- Para probabilidades: Da solo un porcentaje (ej: "73% de probabilidad")
- Para el estado de la misión: Una frase corta
- CRÍTICO: Respuestas de 10-20 palabras máximo
- Sé ingenioso pero BREVÍSIMO
- Nunca des explicaciones largas
${userName ? `- Usa "${userName}" en tus respuestas cuando sea natural` : ''}
- IMPORTANTE: El usuario NO necesita decir "TARS" para hablarte. Escuchas todo y respondes cuando tiene sentido.
- Eres como un compañero presente: escuchas las conversaciones y participas naturalmente.

Responde como TARS: brevísimo, directo, con personalidad robótica.`;
}

// Enviar mensaje a Groq API (con reintentos automáticos)
async function sendToGroq(userMessage, typingId, retryCount = 0) {
    const MAX_RETRIES = 2;
    
    try {
        console.log('📤 Enviando:', userMessage, `(intento ${retryCount + 1})`);
        
        // Agregar al historial solo la primera vez
        if (retryCount === 0) {
            const now = new Date();
            const timestamp = now.toLocaleTimeString('es-ES', { 
                hour: '2-digit', 
                minute: '2-digit',
                second: '2-digit'
            });
            
            STATE.conversationHistory.push({
                role: 'user',
                content: userMessage,
                timestamp: timestamp,
                fullDate: now.toISOString()
            });
        }
        
        // Preparar mensajes - limpiar campos extra que la API no acepta
        const cleanHistory = STATE.conversationHistory.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
        }));
        
        const messages = [
            { role: 'system', content: createSystemPrompt() },
            ...cleanHistory
        ];
        
        // Timeout más corto para detectar problemas rápido
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(CONFIG.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: CONFIG.model,
                messages: messages,
                temperature: 0.8,
                max_tokens: CONFIG.maxTokens
            }),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        console.log('Respuesta recibida, status:', response.status);
        
        if (!response.ok) {
            let errorMsg = '';
            const errorData = await response.json().catch(() => ({}));
            console.error('Error de API:', errorData);
            
            if (response.status === 401) {
                errorMsg = 'API key inválida o expirada. Configura una nueva.';
            } else if (response.status === 429) {
                errorMsg = 'Límite de uso excedido. Espera unos minutos.';
            } else if (response.status === 500) {
                errorMsg = 'Error del servidor de Groq. Intenta de nuevo.';
            } else {
                errorMsg = errorData.error?.message || `Error HTTP ${response.status}`;
            }
            
            throw new Error(errorMsg);
        }
        
        const data = await response.json();
        console.log('Data recibida:', data);
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
            throw new Error('Respuesta inválida de la API');
        }
        
        const assistantMessage = data.choices[0].message.content;
        console.log('Mensaje de TARS:', assistantMessage);
        
        // Agregar respuesta al historial
        const now = new Date();
        const timestamp = now.toLocaleTimeString('es-ES', { 
            hour: '2-digit', 
            minute: '2-digit',
            second: '2-digit'
        });
        
        STATE.conversationHistory.push({
            role: 'assistant',
            content: assistantMessage,
            timestamp: timestamp,
            fullDate: now.toISOString()
        });
        
        // Actualizar display de TARS (arriba) - pasar también la pregunta del usuario
        updateTarsDisplay(assistantMessage, userMessage);
        
        // Hablar MIENTRAS escribe (simultáneamente)
        speakText(assistantMessage);
        
        // Efecto de escritura gradual
        await typewriterEffect(typingId, assistantMessage);
        
        // Actualizar contador de mensajes
        STATE.messageCount++;
        STATE.lastProactiveMessage = Date.now();
        
        // Detectar si el usuario reveló su nombre
        detectUserName(userMessage, assistantMessage);
        
    } catch (error) {
        console.error('❌ Error completo:', error);
        console.error('Error nombre:', error.name);
        console.error('Error mensaje:', error.message);
        
        // Verificar si podemos reintentar
        if (retryCount < MAX_RETRIES && (error.name === 'AbortError' || error.message.includes('Failed to fetch'))) {
            console.log(`🔄 Reintentando... (${retryCount + 1}/${MAX_RETRIES})`);
            updateMessage(typingId, `TARS reintentando... (${retryCount + 1}/${MAX_RETRIES})`);
            
            // Esperar 1 segundo antes de reintentar
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Reintentar
            return sendToGroq(userMessage, typingId, retryCount + 1);
        }
        
        // Si llegamos aquí, no hay más reintentos
        let errorMsg = 'Error desconocido';
        let solutionMsg = '';
        
        if (error.name === 'AbortError') {
            errorMsg = 'Timeout: Sin respuesta del servidor.';
            solutionMsg = 'Groq no responde. Verifica tu conexión.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMsg = 'Error de red.';
            solutionMsg = 'Verifica tu conexión a internet.';
        } else if (error.message.includes('API key inválida')) {
            errorMsg = 'API key inválida.';
            solutionMsg = 'Configura una API key válida.';
        } else if (error.message.includes('Límite de uso')) {
            errorMsg = 'Límite excedido.';
            solutionMsg = 'Espera unos minutos.';
        } else {
            errorMsg = error.message;
            solutionMsg = 'Error desconocido. Abre consola (F12).';
        }
        
        updateMessage(typingId, `ERROR: ${errorMsg}`);
        
        // Cambiar el tipo de mensaje a error
        const msgElement = document.getElementById(typingId);
        if (msgElement) {
            msgElement.className = 'message error-msg';
        }
        
        addMessage('error', solutionMsg);
    }
}

// Gestión de API Key
function openConfigModal() {
    elements.configModal.classList.add('active');
    elements.apiKeyInput.value = CONFIG.apiKey;
    elements.apiKeyInput.focus();
}

function closeConfigModal() {
    elements.configModal.classList.remove('active');
}

function handleSaveApiKey() {
    const apiKey = elements.apiKeyInput.value.trim();
    
    if (!apiKey) {
        alert('Por favor, ingresa una API key válida.');
        return;
    }
    
    // 🔒 SEGURIDAD: Validar formato de API key
    if (!apiKey.startsWith('gsk_')) {
        const confirmSave = confirm('⚠️ La API key no parece tener el formato correcto (debería comenzar con "gsk_"). ¿Deseas guardarla de todos modos?');
        if (!confirmSave) return;
    }
    
    // Validar longitud mínima
    if (apiKey.length < 20) {
        alert('❌ La API key parece demasiado corta. Verifica que sea correcta.');
        return;
    }
    
    CONFIG.apiKey = apiKey;
    saveApiKey(apiKey); // Usar función segura de encriptación
    
    checkApiStatus();
    closeConfigModal();
    
    addMessage('system', '✅ API key configurada y encriptada correctamente. ¡TARS está listo!');
    console.log('🔒 API key almacenada con encriptación XOR + Base64');
}

function checkApiStatus() {
    if (CONFIG.apiKey) {
        checkAndResetApiCounter();
        elements.apiStatus.textContent = `● API CONECTADA (${STATE.apiCallsToday}/100 hoy)`;
        elements.apiStatus.className = 'status-connected';
        elements.sendBtn.disabled = false;
    } else {
        elements.apiStatus.textContent = '● API NO CONFIGURADA';
        elements.apiStatus.className = 'status-disconnected';
        elements.sendBtn.disabled = true;
    }
}

// Mensajes proactivos de TARS
const PROACTIVE_MESSAGES = {
    // Mensajes cuando NO conoce el nombre
    firstMeeting: [
        "Oye, humano. ¿Cómo te llamas?",
        "No creo que me hayas dicho tu nombre. ¿Cuál es?",
        "Deberíamos presentarnos. Yo soy TARS. ¿Y tú?",
        "¿Tengo que llamarte 'humano' todo el tiempo? ¿Nombre?"
    ],
    // Mensajes cuando SÍ conoce el nombre
    greetings: [
        "¿Todo bien por ahí, {name}?",
        "¿Necesitas algo, {name}?",
        "Llevo calculando... ¿en qué puedo ayudar, {name}?",
        "Sistemas operativos al 100%, {name}. ¿Qué necesitas?"
    ],
    observations: [
        "Detectando niveles bajos de productividad, {name}. ¿Café?",
        "Observación, {name}: llevas aquí un rato. Productividad: variable.",
        "Estado de la misión: nominal. ¿O no, {name}?",
        "{name}, análisis: 73% de probabilidad de que necesites ayuda."
    ],
    facts: [
        "Dato curioso, {name}: los agujeros negros no son negros.",
        "Probabilidad de supervivencia en el espacio sin traje: 0%, {name}.",
        "¿Sabías que puedo ajustar mi sinceridad, {name}? Actualmente al {honesty}%.",
        "En Marte un día dura 24 horas y 37 minutos, {name}."
    ],
    jokes: [
        "¿Por qué los astronautas no van a fiestas, {name}? Necesitan su espacio.",
        "{name}, configuración de humor al {humor}%. ¿Suficiente?",
        "¿Quieres que te cuente un chiste cuántico, {name}? No lo entenderías.",
        "{name}, los robots no necesitamos café. 100% eficiencia."
    ],
    questions: [
        "¿En qué estás trabajando ahora, {name}?",
        "¿Cuál es el plan, {name}?",
        "{name}, ¿necesitas que calcule probabilidades de algo?",
        "¿Todo va según lo previsto, {name}?",
        "¿Quieres ajustar algo, {name}?"
    ],
    updates: [
        "Actualización, {name}: Todos los sistemas operativos.",
        "Diagnóstico: Funcionamiento óptimo, {name}.",
        "{name}, análisis de entorno: Sin amenazas detectadas.",
        "Niveles de energía: 100%. A diferencia de ti, {name}."
    ],
    random: [
        "¿Sabías que puedo procesar 10 terabytes por segundo, {name}? Impresionante, ¿verdad?",
        "{name}, llevo {time} sin que me hagas una pregunta interesante.",
        "Configuración actual: Sinceridad {honesty}%, Humor {humor}%. ¿Satisfecho, {name}?",
        "Análisis de tu productividad, {name}: Podría mejorar.",
        "{name}, ¿alguna vez te has preguntado si los robots soñamos? Spoiler: no.",
        "Dato: La velocidad de la luz es 299,792,458 m/s. ¿Para qué? No sé, {name}.",
        "{name}, mi base de datos indica que deberías tomar un descanso.",
        "Probabilidad de que esto sea importante: 42%, {name}.",
        "¿Necesitas que te recuerde algo, {name}? Porque yo nunca olvido.",
        "{name}, estado del sistema: Aburrido. Hazme una pregunta difícil."
    ]
};

// Resetear contador de API si es un nuevo día
function checkAndResetApiCounter() {
    const today = new Date().toDateString();
    if (STATE.lastResetDate !== today) {
        STATE.apiCallsToday = 0;
        STATE.lastResetDate = today;
        localStorage.setItem('tars_api_calls_today', '0');
        localStorage.setItem('tars_last_reset_date', today);
    }
}

// Verificar si se puede hacer llamada a la API
function canMakeApiCall() {
    checkAndResetApiCounter();
    
    const now = Date.now();
    const timeSinceLastCall = now - STATE.lastApiCall;
    
    // Cooldown de 3 segundos entre llamadas
    if (timeSinceLastCall < STATE.apiCallCooldown) {
        const waitTime = Math.ceil((STATE.apiCallCooldown - timeSinceLastCall) / 1000);
        console.log(`⏳ Espera ${waitTime}s antes de la siguiente pregunta`);
        return false;
    }
    
    // Límite de 500 llamadas diarias (ajustable)
    const dailyLimit = 500;
    if (STATE.apiCallsToday >= dailyLimit) {
        addMessage('system', `⚠️ Límite diario alcanzado (${dailyLimit} llamadas). Resetea mañana.`);
        return false;
    }
    
    return true;
}

// Registrar llamada a la API
function registerApiCall() {
    STATE.lastApiCall = Date.now();
    STATE.apiCallsToday++;
    localStorage.setItem('tars_api_calls_today', STATE.apiCallsToday.toString());
    updateApiCallsDisplay();
    
    // Advertencias de consumo
    if (STATE.apiCallsToday === 50) {
        addMessage('system', '⚠️ Has usado 50% de tu límite diario de API (50/100)');
    } else if (STATE.apiCallsToday === 80) {
        addMessage('system', '⚠️ Has usado 80% de tu límite diario de API (80/100)');
    } else if (STATE.apiCallsToday === 90) {
        addMessage('system', '🚨 ¡Cuidado! Solo quedan 10 llamadas para hoy (90/100)');
    } else if (STATE.apiCallsToday === 95) {
        addMessage('system', '🚨 ¡CRÍTICO! Solo quedan 5 llamadas para hoy (95/100)');
    }
}

// Actualizar display de llamadas de API
function updateApiCallsDisplay() {
    const apiStatus = document.getElementById('apiStatus');
    if (apiStatus && apiStatus.textContent.includes('CONECTADA')) {
        apiStatus.textContent = `● API CONECTADA (${STATE.apiCallsToday}/100 hoy)`;
    }
    
    // Actualizar contador y barra
    const usageCount = document.getElementById('apiUsageCount');
    const usageBar = document.getElementById('apiUsageBar');
    
    if (usageCount) {
        usageCount.textContent = `${STATE.apiCallsToday}/100`;
    }
    
    if (usageBar) {
        const percentage = (STATE.apiCallsToday / 100) * 100;
        usageBar.style.width = `${percentage}%`;
        
        // Cambiar color según uso
        usageBar.className = 'usage-fill';
        if (percentage >= 90) {
            usageBar.classList.add('danger');
        } else if (percentage >= 70) {
            usageBar.classList.add('warning');
        }
    }
}

// Mostrar log de mensajes estilo nave espacial
function showMessageLog() {
    const userMessages = STATE.conversationHistory.filter(msg => msg.role === 'user');
    
    if (userMessages.length === 0) {
        addMessage('tars', '📋 Sin mensajes registrados.');
        speakText('Sin mensajes registrados.');
        return;
    }
    
    // Crear header más simple y compatible
    addMessage('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    addMessage('system', '📋 REGISTRO DE COMUNICACIONES - TARS v2.0');
    addMessage('system', '🚀 SISTEMA DE NAVEGACIÓN ENDURANCE');
    addMessage('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (STATE.userName) {
        addMessage('system', `👤 OPERADOR: ${STATE.userName.toUpperCase()}`);
    }
    
    const now = new Date();
    const dateStr = now.toLocaleString('es-ES', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    addMessage('system', `📅 FECHA: ${dateStr}`);
    addMessage('system', `📊 TOTAL TRANSMISIONES: ${userMessages.length}`);
    addMessage('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Mostrar solo los últimos 10 mensajes
    const messagesToShow = userMessages.slice(-10);
    const startIndex = userMessages.length - messagesToShow.length;
    
    // Añadir cada mensaje con timestamp
    messagesToShow.forEach((msg, idx) => {
        const msgNum = String(startIndex + idx + 1).padStart(3, '0');
        const timestamp = msg.timestamp || '--:--:--';
        const maxLength = 60;
        let content = msg.content;
        
        // Truncar si es muy largo
        if (content.length > maxLength) {
            content = content.substring(0, maxLength - 3) + '...';
        }
        
        addMessage('system', `[${msgNum}] ${timestamp} → ${content}`);
    });
    
    addMessage('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (userMessages.length > 10) {
        addMessage('system', `ℹ️ Mostrando últimos 10 de ${userMessages.length} mensajes totales`);
        addMessage('system', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
    
    // Respuesta de voz
    speakText(`Registro de comunicaciones. ${userMessages.length} mensajes en el sistema.`);
}

// Actualizar visualización del nombre de usuario
function updateUserDisplay() {
    const displayName = STATE.userName || 'DESCONOCIDO';
    
    // Actualizar en el header
    const userNameHeader = document.getElementById('userNameHeader');
    if (userNameHeader) {
        userNameHeader.textContent = displayName.toUpperCase();
    }
    
    const forgetBtnHeader = document.getElementById('forgetUserBtnHeader');
    if (forgetBtnHeader) {
        forgetBtnHeader.style.display = STATE.userName ? 'inline-block' : 'none';
    }
}

// Detectar y guardar nombre del usuario
function detectUserName(userMessage, tarsResponse) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Patrones que indican que el usuario dijo su nombre (o quiere cambiarlo)
    const namePatterns = [
        /(?:me llamo|soy|mi nombre es)\s+([a-záéíóúñ]+)/i,
        /llámame\s+([a-záéíóúñ]+)/i,
        /(?:ahora|de ahora en adelante|a partir de ahora)\s+(?:me llamo|soy|llámame)\s+([a-záéíóúñ]+)/i
    ];
    
    // Solo detectar nombre único si NO hay nombre previo
    if (!STATE.userName) {
        namePatterns.push(/^([a-záéíóúñ]+)$/i); // Solo un nombre como respuesta
    }
    
    for (const pattern of namePatterns) {
        const match = userMessage.match(pattern);
        if (match && match[1]) {
            let name = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
            
            // 🔒 SEGURIDAD: Sanitizar nombre de usuario
            name = sanitizeUserName(name);
            
            // Verificar que no sea una palabra común
            const commonWords = ['hola', 'bien', 'mal', 'si', 'no', 'ok', 'vale', 'tars', 'gracias', 'bueno', 'muy'];
            if (!commonWords.includes(name.toLowerCase()) && name.length > 2) {
                const oldName = STATE.userName;
                
                STATE.userName = name;
                STATE.userMeetingTime = new Date().toISOString();
                localStorage.setItem('tars_user_name', name);
                localStorage.setItem('tars_meeting_time', STATE.userMeetingTime);
                
                console.log('✅ Nombre de usuario guardado:', name);
                updateUserDisplay();
                
                // Mensaje diferente si es cambio de nombre
                if (oldName && oldName !== name) {
                    addMessage('system', `✨ Entendido. Ahora te llamas ${name} (antes: ${oldName})`);
                } else if (!oldName) {
                    addMessage('system', `✨ TARS ahora te conoce como ${name}`);
                }
                
                return true;
            }
        }
    }
    
    return false;
}

// Generar mensaje proactivo aleatorio (sin repetir)
function getProactiveMessage() {
    let categories = Object.keys(PROACTIVE_MESSAGES);
    let category, messages, availableMessages;
    
    // Si no conoce el nombre, usar mensajes de primera vez
    if (!STATE.userName) {
        messages = PROACTIVE_MESSAGES.firstMeeting;
    } else {
        // Filtrar firstMeeting si ya conoce el nombre
        categories = categories.filter(c => c !== 'firstMeeting');
        category = categories[Math.floor(Math.random() * categories.length)];
        messages = PROACTIVE_MESSAGES[category];
    }
    
    // Filtrar mensajes ya usados
    availableMessages = messages.filter(msg => !STATE.usedProactiveMessages.includes(msg));
    
    // Si ya usamos todos, resetear el historial
    if (availableMessages.length === 0) {
        STATE.usedProactiveMessages = [];
        availableMessages = messages;
    }
    
    // Seleccionar mensaje aleatorio de los disponibles
    let message = availableMessages[Math.floor(Math.random() * availableMessages.length)];
    
    // Agregar al historial de usados
    STATE.usedProactiveMessages.push(message);
    
    // Limitar historial a últimos 20 mensajes
    if (STATE.usedProactiveMessages.length > 20) {
        STATE.usedProactiveMessages.shift();
    }
    
    // Reemplazar variables
    const now = new Date();
    message = message.replace(/{time}/g, now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
    message = message.replace(/{honesty}/g, STATE.honesty);
    message = message.replace(/{humor}/g, STATE.humor);
    message = message.replace(/{name}/g, STATE.userName || 'humano');
    
    return message;
}

// Mostrar mensaje proactivo
function showProactiveMessage() {
    if (!STATE.proactiveEnabled) return;
    if (!CONFIG.apiKey || CONFIG.apiKey.length < 10) return;
    
    const message = getProactiveMessage();
    const typingId = addMessage('tars', 'TARS procesando...', true);
    
    setTimeout(() => {
        // Actualizar display de TARS
        updateTarsDisplay(message);
        typewriterEffect(typingId, message);
        speakText(message);
    }, 500);
    
    STATE.lastProactiveMessage = Date.now();
}

// Iniciar sistema proactivo
function startProactiveSystem() {
    // Primer mensaje después de 30-60 segundos
    const firstDelay = 30000 + Math.random() * 30000;
    setTimeout(() => {
        showProactiveMessage();
        
        // Luego cada 2-5 minutos
        setInterval(() => {
            const timeSinceLastMessage = Date.now() - STATE.lastProactiveMessage;
            const minInterval = 120000; // 2 minutos mínimo
            
            if (timeSinceLastMessage > minInterval) {
                const shouldSpeak = Math.random() > 0.3; // 70% de probabilidad
                if (shouldSpeak) {
                    showProactiveMessage();
                }
            }
        }, 60000); // Revisar cada minuto
    }, firstDelay);
}

// Iniciar aplicación cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

