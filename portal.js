/**
 * PSICO NOTES - PORTAL DEL PACIENTE v1.0
 */
const PortalState = {
    patientId: null,
    patientName: '',
    therapistName: '',
    portalToken: null,
    tasks: [],
    evaluations: [],
    moodLog: [],
    cbtRecords: [],
    activeCrisisAlert: false,
    currentFilter: 'pending',
    // --- PORTAL PACIENTES KID (PSICO KIDS SPACE) ---
    isKidMode: false,
    kidStars: 0,
    kidAvatar: {
        character: 'fox',
        emoji: '🦊',
        name: 'Zorrito Valiente',
        aura: 'aura-gold',
        accessory: 'cape',
        accEmoji: '🦸'
    },
    kidWeather: null,
    kidBodyZone: null,
    kidBubblesPopped: 0,
    kidCalmCycles: 0,
    kidActivities: []
};

// ============================================
// COLA DE SINCRONIZACIÓN FUERA DE LÍNEA (OFFLINE QUEUE)
// ============================================
const PortalOfflineQueue = {
    QUEUE_KEY: 'psico_portal_offline_queue',

    enqueue(endpoint, payload) {
        try {
            const queue = this.getQueue();
            queue.push({
                id: 'sync_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
                endpoint,
                payload,
                createdAt: new Date().toISOString()
            });
            localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
            this.updateBadge();
        } catch (e) {
            console.warn('Error encolando operación offline:', e);
        }
    },

    getQueue() {
        try {
            return JSON.parse(localStorage.getItem(this.QUEUE_KEY) || '[]');
        } catch {
            return [];
        }
    },

    async flush() {
        const queue = this.getQueue();
        if (queue.length === 0) return;

        const remaining = [];
        let successCount = 0;

        for (const item of queue) {
            try {
                const res = await fetch(item.endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(item.payload)
                });
                if (res.ok) {
                    successCount++;
                } else if (res.status >= 500 || res.status === 408) {
                    remaining.push(item);
                }
            } catch (err) {
                remaining.push(item);
            }
        }

        localStorage.setItem(this.QUEUE_KEY, JSON.stringify(remaining));
        this.updateBadge();

        if (successCount > 0 && typeof showToast === 'function') {
            showToast(`🔄 Sincronizados ${successCount} registros pendientes con tu terapeuta`, 'success');
        }
    },

    updateBadge() {
        const queue = this.getQueue();
        const badge = document.getElementById('offlineSyncBadge');
        const countEl = document.getElementById('offlineSyncCount');
        if (badge && countEl) {
            if (queue.length > 0) {
                badge.style.display = 'inline-flex';
                countEl.textContent = queue.length;
            } else {
                badge.style.display = 'none';
            }
        }
    }
};

window.PortalOfflineQueue = PortalOfflineQueue;

async function sendPortalPost(endpoint, payload) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
        PortalOfflineQueue.enqueue(endpoint, payload);
        return false;
    }
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) {
            PortalOfflineQueue.enqueue(endpoint, payload);
            return false;
        }
        return true;
    } catch (err) {
        PortalOfflineQueue.enqueue(endpoint, payload);
        return false;
    }
}

window.addEventListener('online', () => {
    if (typeof showToast === 'function') showToast('Conexión reanudada. Sincronizando registros...', 'info');
    PortalOfflineQueue.flush();
});


const REFLECTIONS = [
    "Cada pequeño paso cuenta. No necesitas ser perfecto, solo constante. 🌱",
    "Tus emociones son válidas. Permitirte sentirlas es el primer paso. 💚",
    "El progreso no es lineal. Los días difíciles también forman parte del camino. 🌊",
    "Hoy es un nuevo día para practicar la compasión contigo mismo. 🌸",
    "No tienes que tener todas las respuestas. A veces, solo respirar es suficiente. 🌬️",
    "Celebra tus logros, por pequeños que parezcan. ✨",
    "La vulnerabilidad no es debilidad, es valentía. 💪",
    "Está bien descansar. El descanso también es parte del crecimiento. 🌙",
    "Confía en tu proceso. Estás haciendo más de lo que crees. 🌟",
    "Hoy, elige una cosa pequeña que te haga sentir bien. 🌈",
    "Tus pensamientos no son hechos. Puedes observarlos sin creerlos. 🦋",
    "La paciencia contigo mismo es un acto de amor. 💝",
    "Cada sesión es una oportunidad para conocerte mejor. 🔍",
    "No estás solo en este camino. 🤝",
    "Hoy, practica la gratitud por algo simple. 🙏"
];

const PHQ9_QUESTIONS = [
    "Poco interés o placer en hacer las cosas",
    "Sentirse decaído/a, deprimido/a o sin esperanza",
    "Problemas para dormir o dormir demasiado",
    "Sentirse cansado/a o con poca energía",
    "Poco apetito o comer en exceso",
    "Sentirse mal consigo mismo/a o que es un fracaso",
    "Dificultad para concentrarse en cosas como leer o ver TV",
    "Se mueve o habla tan lentamente que otros lo notan, o lo contrario",
    "Pensamientos de que estaría mejor muerto/a o de hacerse daño"
];

const GAD7_QUESTIONS = [
    "Se ha sentido nervioso/a, ansioso/a o con los nervios de punta",
    "No ha sido capaz de parar o controlar su preocupación",
    "Se ha preocupado demasiado por diferentes cosas",
    "Ha tenido dificultad para relajarse",
    "Se ha sentido tan inquieto/a que le cuesta quedarse quieto/a",
    "Se ha irritado o enfadado fácilmente",
    "Ha sentido miedo como si algo terrible fuera a pasar"
];

const MOOD_QUESTIONS = [
    {
        text: "¿Cómo describirías tu estado de ánimo hoy?",
        options: [
            { value: 5, label: "Muy positivo", emoji: "😊" },
            { value: 4, label: "Positivo", emoji: "🙂" },
            { value: 3, label: "Neutral", emoji: "😐" },
            { value: 2, label: "Negativo", emoji: "😔" },
            { value: 1, label: "Muy negativo", emoji: "😞" }
        ]
    },
    {
        text: "¿Cómo estuvo tu sueño anoche?",
        options: [
            { value: 5, label: "Excelente", emoji: "😴" },
            { value: 4, label: "Bueno", emoji: "🙂" },
            { value: 3, label: "Regular", emoji: "😐" },
            { value: 2, label: "Malo", emoji: "🥱" },
            { value: 1, label: "Muy malo", emoji: "😣" }
        ]
    },
    {
        text: "¿Cómo estuvo tu nivel de energía hoy?",
        options: [
            { value: 5, label: "Muy alta", emoji: "⚡" },
            { value: 4, label: "Alta", emoji: "💪" },
            { value: 3, label: "Normal", emoji: "😐" },
            { value: 2, label: "Baja", emoji: "🔋" },
            { value: 1, label: "Muy baja", emoji: "🪫" }
        ]
    }
];

document.addEventListener('DOMContentLoaded', async () => {
    // Soporte para acceso directo por parámetro de URL (?token=PN-XXXXX o ?code=PN-XXXXX)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const queryToken = (urlParams.get('token') || urlParams.get('code') || '').trim();
        if (queryToken && window.location.protocol !== 'file:') {
            // Intentar autenticación contra backend PostgreSQL
            try {
                const res = await fetch('/api/v1/portal/auth', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: queryToken })
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated && data.patient) {
                        PortalState.patientId = data.patient.id;
                        PortalState.patientName = data.patient.name;
                        PortalState.therapistName = data.patient.therapistName || 'Tu terapeuta';
                        PortalState.portalToken = data.patient.portalToken || queryToken;
                        localStorage.setItem('psico_portal_session', JSON.stringify({
                            patientId: data.patient.id,
                            portalToken: PortalState.portalToken,
                            patientName: data.patient.name,
                            therapistName: data.patient.therapistName
                        }));
                        await enterPortal();
                        return;
                    }
                }
            } catch (netErr) {
                console.warn('Backend no disponible, recurriendo a verificación local:', netErr);
            }

            // Fallback a almacenamiento local si no hay conexión al backend
            const patients = loadPortalPatients();
            const patient = patients.find(p => (p.portalToken || '').toUpperCase().trim() === queryToken.toUpperCase());
            if (patient) {
                PortalState.patientId = patient.id;
                PortalState.patientName = patient.name;
                PortalState.therapistName = patient.therapistName || 'Tu terapeuta';
                PortalState.portalToken = patient.portalToken;
                localStorage.setItem('psico_portal_session', JSON.stringify({
                    patientId: patient.id,
                    portalToken: patient.portalToken,
                    patientName: patient.name,
                    therapistName: patient.therapistName
                }));
                await enterPortal();
                return;
            } else {
                const codeInput = document.getElementById('accessCode');
                if (codeInput) codeInput.value = queryToken;
            }
        }
    } catch (e) {
        console.warn('Error procesando parámetros de URL en portal:', e);
    }

    checkExistingSession();
});

function checkExistingSession() {
    const saved = localStorage.getItem('psico_portal_session');
    if (saved) {
        try {
            const session = JSON.parse(saved);
            if (session.patientId && session.portalToken) {
                PortalState.patientId = session.patientId;
                PortalState.patientName = session.patientName || 'Paciente';
                PortalState.therapistName = session.therapistName || 'Tu terapeuta';
                PortalState.portalToken = session.portalToken;
                showWelcomeBack();
                return;
            }
        } catch (e) {
            console.error('Error leyendo sesión:', e);
        }
    }
    showAccessForm();
}

function showAccessForm() {
    document.getElementById('accessScreen').style.display = 'flex';
    document.getElementById('accessForm').style.display = 'block';
    document.getElementById('welcomeBack').style.display = 'none';
}

function showWelcomeBack() {
    document.getElementById('accessScreen').style.display = 'flex';
    document.getElementById('accessForm').style.display = 'none';
    document.getElementById('welcomeBack').style.display = 'block';
    document.getElementById('portalPatientName').textContent = `Hola, ${(PortalState.patientName || 'Paciente').split(' ')[0]}`;
    document.getElementById('portalPatientAvatar').textContent = getInitials(PortalState.patientName);
}

async function handleAccess() {
    const codeInput = document.getElementById('accessCode');
    const errorEl = document.getElementById('accessError');
    if (!codeInput) return;
    const code = codeInput.value.trim().toUpperCase();
    errorEl.textContent = '';
    codeInput.classList.remove('error');
    if (!code) {
        errorEl.textContent = 'Por favor ingresa tu código de acceso';
        codeInput.classList.add('error');
        return;
    }

    // 1. Intentar autenticar contra el servidor backend (PostgreSQL) si no es file://
    if (window.location.protocol !== 'file:') {
        try {
            const res = await fetch('/api/v1/portal/auth', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: code })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.authenticated && data.patient) {
                    PortalState.patientId = data.patient.id;
                    PortalState.patientName = data.patient.name;
                    PortalState.therapistName = data.patient.therapistName || 'Tu terapeuta';
                    PortalState.portalToken = data.patient.portalToken || code;
                    localStorage.setItem('psico_portal_session', JSON.stringify({
                        patientId: data.patient.id,
                        portalToken: PortalState.portalToken,
                        patientName: data.patient.name,
                        therapistName: data.patient.therapistName
                    }));
                    await enterPortal();
                    return;
                }
            }
        } catch (e) {
            console.warn('Backend no disponible, recurriendo a verificación local:', e);
        }
    }

    // 2. Fallback a lista local si el servidor estuviese offline
    const patients = loadPortalPatients();
    const patient = patients.find(p => {
        const patientToken = (p.portalToken || '').toUpperCase().trim();
        const searchToken = code.toUpperCase().trim();
        return patientToken === searchToken;
    });
    if (!patient) {
        errorEl.textContent = 'Código no válido. Verifica con tu terapeuta.';
        codeInput.classList.add('error');
        return;
    }
    PortalState.patientId = patient.id;
    PortalState.patientName = patient.name;
    PortalState.therapistName = patient.therapistName || 'Tu terapeuta';
    PortalState.portalToken = patient.portalToken;
    localStorage.setItem('psico_portal_session', JSON.stringify({
        patientId: patient.id,
        portalToken: patient.portalToken,
        patientName: patient.name,
        therapistName: patient.therapistName
    }));
    await enterPortal();
}

function loadPortalPatients() {
    try {
        const stored = localStorage.getItem('psico_portal_patients');
        if (stored) return JSON.parse(stored);
    } catch (e) {
        console.error('Error cargando portal patients:', e);
    }
    return [];
}

async function enterPortal() {
    document.getElementById('accessScreen').style.display = 'none';
    document.getElementById('portalApp').style.display = 'block';
    document.getElementById('portalApp').classList.add('active');
    await loadPatientData();
    loadTasksFromNotes();
    updateHeader();
    updateDailyReflection();
    renderTasks();
    updateTestsLastResults();
    updateProgress();
    checkConsentCard();
    initKidModeState();
    PortalOfflineQueue.updateBadge();
    PortalOfflineQueue.flush();
    showToast(`Bienvenido/a, ${(PortalState.patientName || 'Paciente').split(' ')[0]}`, 'success');
}

function logoutPortal() {
    if (confirm('¿Deseas salir de tu espacio personal?')) {
        localStorage.removeItem('psico_portal_session');
        PortalState.patientId = null;
        PortalState.patientName = '';
        PortalState.therapistName = '';
        PortalState.portalToken = null;
        document.getElementById('accessCode').value = '';
        showAccessForm();
    }
}

function calculateAge(bd) {
    if (!bd) return '';
    const b = new Date(bd);
    const t = new Date();
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
}

function determineIfKid(patientData) {
    // 1. Si la URL solicita explícitamente el modo
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        if (mode === 'kid') return true;
        if (mode === 'adult') return false;
    } catch {}

    // 2. Si la sesión guardada especifica isKid
    try {
        const session = JSON.parse(localStorage.getItem('psico_portal_session') || '{}');
        if (typeof session.isKid === 'boolean') {
            return session.isKid;
        }
    } catch {}

    if (!patientData) return false;

    // 3. Regla clínica obligatoria: Menores de 13 años (< 13) entran automáticamente en Portal KIDS
    if (patientData.birthdate) {
        const calculated = calculateAge(patientData.birthdate);
        if (typeof calculated === 'number' && !isNaN(calculated) && calculated >= 0) {
            return calculated < 13;
        }
    }
    const directAge = parseInt(patientData.age, 10);
    if (!isNaN(directAge) && directAge >= 0) {
        return directAge < 13;
    }

    // 4. Fallback por etapa de vida / categoría
    const stage = (patientData.category || patientData.life_stage || patientData.lifeStage || '').toLowerCase();
    return stage === 'child' || stage === 'infantil';
}

async function loadPatientData() {
    // 1. Intentar cargar desde el backend PostgreSQL si hay token de acceso
    if (PortalState.portalToken) {
        try {
            const res = await fetch(`/api/v1/portal/me?token=${encodeURIComponent(PortalState.portalToken)}`);
            if (res.ok) {
                const data = await res.json();
                if (data.status === 'ok') {
                    if (data.tasks) PortalState.tasks = data.tasks;
                    if (data.evaluations) PortalState.evaluations = data.evaluations;
                    if (data.moodLogs) PortalState.moodLog = data.moodLogs.map(m => ({
                        id: m.id,
                        value: m.mood_score || m.value,
                        date: m.created_at || m.date
                    }));
                    if (data.cbtRecords) PortalState.cbtRecords = data.cbtRecords.map(c => ({
                        id: c.id,
                        situation: c.situation,
                        thought: c.thought,
                        distortion: c.distortion,
                        emotion: c.emotion,
                        initialIntensity: c.initial_intensity,
                        rationalThought: c.rational_thought,
                        finalIntensity: c.final_intensity,
                        date: c.created_at
                    }));
                    PortalState.activeCrisisAlert = Boolean(data.hasActiveCrisisAlert);
                    if (data.therapistName) PortalState.therapistName = data.therapistName;

                    // Datos específicos de actividades lúdicas infantiles
                    if (Array.isArray(data.kidActivities)) {
                        PortalState.kidActivities = data.kidActivities;
                        // Extraer el último avatar configurado si existe
                        const avatarAct = data.kidActivities.find(a => a.activity_type === 'avatar_customization');
                        if (avatarAct && avatarAct.data) {
                            PortalState.kidAvatar = { ...PortalState.kidAvatar, ...avatarAct.data };
                        }
                    }

                    // Auto-activación estricta de Portal KIDS si edad < 13 años
                    PortalState.isKidMode = determineIfKid(data.patient);

                    savePatientDataLocally();
                    return;
                }
            }
        } catch (e) {
            console.warn('Conexión con backend no disponible, cargando copia local:', e);
        }
    }

    // 2. Fallback a localStorage
    loadPatientDataLocally();
}

function loadPatientDataLocally() {
    try {
        const stored = localStorage.getItem(`psico_portal_data_${PortalState.patientId}`);
        if (stored) {
            const data = JSON.parse(stored);
            PortalState.tasks = data.tasks || [];
            PortalState.evaluations = data.evaluations || [];
            PortalState.moodLog = data.moodLog || [];
            PortalState.cbtRecords = data.cbtRecords || [];
            PortalState.activeCrisisAlert = Boolean(data.activeCrisisAlert);
            PortalState.kidStars = typeof data.kidStars === 'number' ? data.kidStars : 0;
            PortalState.kidAvatar = data.kidAvatar || PortalState.kidAvatar;
            PortalState.kidActivities = data.kidActivities || [];
        } else {
            PortalState.tasks = [];
            PortalState.evaluations = [];
            PortalState.moodLog = [];
            PortalState.cbtRecords = [];
            PortalState.activeCrisisAlert = false;
            PortalState.kidStars = 0;
            PortalState.kidActivities = [];
        }

        const patients = loadPortalPatients();
        const pObj = patients.find(p => p.id === PortalState.patientId);
        PortalState.isKidMode = determineIfKid(pObj);
    } catch (e) {
        console.error('Error cargando datos locales del portal:', e);
    }
}

function savePatientDataLocally() {
    savePatientData();
}

function savePatientData() {
    try {
        const data = {
            tasks: PortalState.tasks,
            evaluations: PortalState.evaluations,
            moodLog: PortalState.moodLog,
            cbtRecords: PortalState.cbtRecords,
            activeCrisisAlert: PortalState.activeCrisisAlert,
            kidStars: PortalState.kidStars,
            kidAvatar: PortalState.kidAvatar,
            kidActivities: PortalState.kidActivities,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(`psico_portal_data_${PortalState.patientId}`, JSON.stringify(data));
        
        // Sincronizar evaluaciones y moodLog a las claves globales que lee app.js
        if (PortalState.patientId) {
            localStorage.setItem(`psico_portal_results_${PortalState.patientId}`, JSON.stringify(PortalState.evaluations));
            localStorage.setItem(`psico_portal_mood_${PortalState.patientId}`, JSON.stringify(PortalState.moodLog));
            localStorage.setItem(`psico_portal_cbt_${PortalState.patientId}`, JSON.stringify(PortalState.cbtRecords));
            localStorage.setItem(`psico_portal_kid_${PortalState.patientId}`, JSON.stringify({
                avatar: PortalState.kidAvatar,
                stars: PortalState.kidStars,
                activities: PortalState.kidActivities
            }));
        }
    } catch (e) {
        console.error('Error guardando datos del portal:', e);
    }
}

function loadTasksFromNotes() {
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        const patientTasks = Object.values(bridge).filter(t => t.patientId === PortalState.patientId);
        if (patientTasks.length === 0) {
            return;
        }
        const currentTasks = PortalState.tasks || [];
        patientTasks.forEach(task => {
            const existing = currentTasks.find(t => t.id === task.id);
            if (existing) {
                task.completed = existing.completed;
                task.completedAt = existing.completedAt;
            } else {
                task.completed = false;
                task.completedAt = null;
            }
        });
        PortalState.tasks = patientTasks;
        savePatientData();
    } catch (e) {
        console.error('Error cargando tareas desde puente:', e);
    }
}

function updateHeader() {
    const hour = new Date().getHours();
    let greeting = 'Buenas noches';
    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 19) greeting = 'Buenas tardes';
    document.getElementById('headerGreeting').textContent = greeting;
    document.getElementById('headerName').textContent = PortalState.patientName.split(' ')[0];
    document.getElementById('headerAvatar').textContent = getInitials(PortalState.patientName);
}

function switchView(viewName) {
    document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`).classList.add('active');
    document.querySelector(`.nav-btn[data-view="${viewName}"]`).classList.add('active');
    if (viewName === 'tasks') renderTasks();
    if (viewName === 'tests') updateTestsLastResults();
    if (viewName === 'progress') updateProgress();
}

function updateDailyReflection() {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const reflection = REFLECTIONS[dayOfYear % REFLECTIONS.length];
    document.getElementById('dailyReflection').textContent = reflection;
}

function selectMood(value) {
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.mood-btn[data-mood="${value}"]`).classList.add('selected');
    const moodLog = {
        id: generateId(),
        value: value,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    PortalState.moodLog.push(moodLog);
    savePatientData();

    // Sincronizar en tiempo real con backend PostgreSQL (con soporte de cola offline)
    if (PortalState.patientId && PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/mood', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            mood: value,
            sleep: 3,
            energy: 3
        });
    }

    document.getElementById('moodConfirmation').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('moodConfirmation').style.display = 'none';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    }, 3000);
    showToast('Estado de ánimo registrado', 'success');
}

function renderTasks() {
    const list = document.getElementById('tasksList');
    let tasks = PortalState.tasks;
    if (PortalState.currentFilter === 'pending') {
        tasks = tasks.filter(t => !t.completed);
    } else if (PortalState.currentFilter === 'completed') {
        tasks = tasks.filter(t => t.completed);
    }
    const pending = PortalState.tasks.filter(t => !t.completed).length;
    const completed = PortalState.tasks.filter(t => t.completed).length;
    document.getElementById('countPending').textContent = pending;
    document.getElementById('countCompleted').textContent = completed;
    document.getElementById('pendingTasksCount').textContent = pending;
    if (tasks.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">${PortalState.currentFilter === 'completed' ? '🎉' : '✨'}</div>
                <p>${PortalState.currentFilter === 'completed' ? 'Aún no has completado tareas' : 'No tienes tareas pendientes'}</p>
                <button class="btn-secondary" onclick="loadTasksFromNotes(); renderTasks(); showToast('Buscando nuevas tareas...', 'info');" style="margin-top: 12px;">
                    <i class="fas fa-sync"></i> Buscar tareas nuevas
                </button>
                <small>${PortalState.currentFilter === 'completed' ? 'Completa tus tareas para verlas aquí' : 'Tu terapeuta te asignará actividades entre sesiones'}</small>
            </div>
        `;
        return;
    }
    list.innerHTML = tasks.map(task => {
        const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
        return `
            <div class="task-item ${task.completed ? 'completed' : ''}">
                <div class="task-checkbox ${task.completed ? 'checked' : ''}" onclick="toggleTask('${task.id}')">
                    ${task.completed ? '<i class="fas fa-check" style="font-size:12px;"></i>' : ''}
                </div>
                <div class="task-content">
                    <div class="task-title">${task.title}</div>
                    ${task.description ? `<div class="task-description">${task.description}</div>` : ''}
                    ${task.dueDate ? `
                        <div class="task-due ${isOverdue ? 'overdue' : ''}">
                            <i class="fas fa-calendar"></i>
                            ${isOverdue ? 'Vencida: ' : 'Para: '}${formatDateSafe(task.dueDate)}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

function filterTasks(filter) {
    PortalState.currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`.filter-btn[data-filter="${filter}"]`).classList.add('active');
    renderTasks();
}

function toggleTask(taskId) {
    const task = PortalState.tasks.find(t => t.id === taskId);
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    updateTaskInBridge(task);
    savePatientData();
    renderTasks();
    if (task.completed) {
        showToast('¡Tarea completada! 🎉', 'success');
    }

    // Sincronizar en tiempo real con backend PostgreSQL (con soporte de cola offline)
    if (PortalState.patientId && PortalState.portalToken) {
        sendPortalPost(`/api/v1/portal/tasks/${taskId}/toggle`, {
            patientId: PortalState.patientId,
            token: PortalState.portalToken
        });
    }
}

function updateTaskInBridge(task) {
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        const taskKey = `${task.patientId}_${task.id}`;
        if (bridge[taskKey]) {
            bridge[taskKey].completed = task.completed;
            bridge[taskKey].completedAt = task.completedAt;
            localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));
        }
    } catch (e) {
        console.error('Error actualizando tarea en puente:', e);
    }
}

function updateTestsLastResults() {
    const phq9 = PortalState.evaluations.filter(e => e.type === 'phq9').slice(-1)[0];
    const gad7 = PortalState.evaluations.filter(e => e.type === 'gad7').slice(-1)[0];
    const mood = PortalState.moodLog.slice(-1)[0];
    const cbt = (PortalState.cbtRecords || []).slice(-1)[0];
    document.getElementById('lastPhq9').textContent = phq9 
        ? `Último: ${formatDateSafe(phq9.date)} · Puntaje ${phq9.score}/27`
        : 'Sin realizar aún';
    document.getElementById('lastGad7').textContent = gad7
        ? `Último: ${formatDateSafe(gad7.date)} · Puntaje ${gad7.score}/21`
        : 'Sin realizar aún';
    document.getElementById('lastMood').textContent = mood
        ? `Hoy: ${getMoodLabel(mood.value)}`
        : 'Sin registro hoy';
    const lastCbtEl = document.getElementById('lastCbt');
    if (lastCbtEl) {
        lastCbtEl.textContent = cbt
            ? `Último: ${formatDateSafe(cbt.date)} · ${cbt.emotion || 'Completado'}`
            : 'Sin registro reciente';
    }
}

function openTest(testType) {
    const modal = document.getElementById('testModal');
    const title = document.getElementById('testModalTitle');
    const body = document.getElementById('testModalBody');
    if (testType === 'phq9') {
        title.textContent = 'Evaluación del Estado de Ánimo (PHQ-9)';
        body.innerHTML = renderTestQuestions(PHQ9_QUESTIONS, 'phq9');
    } else if (testType === 'gad7') {
        title.textContent = 'Evaluación de Ansiedad (GAD-7)';
        body.innerHTML = renderTestQuestions(GAD7_QUESTIONS, 'gad7');
    } else if (testType === 'mood') {
        title.textContent = 'Registro de Ánimo Diario';
        body.innerHTML = renderMoodQuestions();
    } else if (testType === 'cbt_thought') {
        title.textContent = 'Registro de Pensamientos Automáticos (ABC)';
        body.innerHTML = renderCbtQuestions();
    }
    modal.style.display = 'flex';
}

function renderTestQuestions(questions, testType) {
    return `
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
            En las últimas 2 semanas, ¿con qué frecuencia te han molestado los siguientes problemas?
        </p>
        <form id="testForm">
            ${questions.map((q, i) => `
                <div class="test-question">
                    <div class="test-question-text">${i + 1}. ${q}</div>
                    <div class="test-options">
                        ${['Nunca (0)', 'Varios días (1)', 'Más de la mitad de los días (2)', 'Casi todos los días (3)'].map((opt, j) => `
                            <label class="test-option" onclick="selectOption(this, '${testType}_${i}', ${j})">
                                <input type="radio" name="${testType}_${i}" value="${j}">
                                <span>${opt}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            <button type="button" class="btn-primary full-width" onclick="submitTest('${testType}', ${questions.length})">
                <i class="fas fa-check"></i> Enviar evaluación
            </button>
        </form>
    `;
}

function renderMoodQuestions() {
    return `
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
            Cuéntame cómo ha sido tu día
        </p>
        <form id="moodForm">
            ${MOOD_QUESTIONS.map((q, i) => `
                <div class="test-question">
                    <div class="test-question-text">${q.text}</div>
                    <div class="test-options">
                        ${q.options.map((opt, j) => `
                            <label class="test-option" onclick="selectOption(this, 'mood_${i}', ${opt.value})">
                                <input type="radio" name="mood_${i}" value="${opt.value}">
                                <span>${opt.emoji} ${opt.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
            <button type="button" class="btn-primary full-width" onclick="submitMoodLog()">
                <i class="fas fa-check"></i> Guardar registro
            </button>
        </form>
    `;
}

function selectOption(element, name, value) {
    const parent = element.parentElement;
    parent.querySelectorAll('.test-option').forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
    const radio = element.querySelector('input');
    if (radio) {
        radio.checked = true;
    }
}

function renderCbtQuestions() {
    return `
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
            Identifica el pensamiento que te causó malestar y formula una alternativa constructiva.
        </p>
        <form id="cbtForm" onsubmit="event.preventDefault(); submitCbtRecord();">
            <div class="test-question" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;">1. Situación:</label>
                <input type="text" id="cbt_situation" placeholder="¿Qué ocurrió? ¿Dónde estabas?" required style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);">
            </div>
            <div class="test-question" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;">2. Pensamiento Automático:</label>
                <textarea id="cbt_thought" rows="2" placeholder="¿Qué cruzó por tu mente? (Ej: 'No seré capaz', 'Todo saldrá mal')" required style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);"></textarea>
            </div>
            <div class="test-question" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;">3. Distorsión Cognitiva Principal:</label>
                <select id="cbt_distortion" style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);">
                    <option value="Catastrofismo">Catastrofismo (anticipar lo peor)</option>
                    <option value="Filtro Negativo">Filtro Negativo (enfocarse solo en lo malo)</option>
                    <option value="Todo o Nada">Pensamiento Todo o Nada (blanco o negro)</option>
                    <option value="Lectura de Mente">Lectura de Mente (asumir lo que otros piensan)</option>
                    <option value="Razonamiento Emocional">Razonamiento Emocional (sentirlo no lo hace real)</option>
                    <option value="Personalización">Personalización (asumir culpa ajena)</option>
                    <option value="Deberías">Exigencias Rígidas (los 'debería')</option>
                </select>
            </div>
            <div class="test-question" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;">4. Emoción y Malestar Inicial (0 a 100%):</label>
                <div style="display:flex;gap:8px;margin-top:4px;">
                    <input type="text" id="cbt_emotion" placeholder="Ej: Ansiedad, Rabia, Tristeza" required style="flex:1;padding:8px;border-radius:6px;border:1px solid var(--border-primary);">
                    <input type="number" id="cbt_intensity_initial" min="0" max="100" placeholder="80%" required style="width:75px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);">
                </div>
            </div>
            <div class="test-question" style="margin-bottom:12px;">
                <label style="font-weight:600;font-size:13px;">5. Pensamiento Alternativo / Racional:</label>
                <textarea id="cbt_rational" rows="2" placeholder="¿Qué perspectiva más realista y compasiva puedes tomar?" required style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);"></textarea>
            </div>
            <div class="test-question" style="margin-bottom:16px;">
                <label style="font-weight:600;font-size:13px;">6. Intensidad Emocional Posterior (0 a 100%):</label>
                <input type="number" id="cbt_intensity_final" min="0" max="100" placeholder="35%" required style="width:100%;margin-top:4px;padding:8px;border-radius:6px;border:1px solid var(--border-primary);">
            </div>
            <button type="submit" class="btn-primary full-width">
                <i class="fas fa-check"></i> Guardar Autoregistro ABC
            </button>
        </form>
    `;
}

function submitCbtRecord() {
    const situation = document.getElementById('cbt_situation')?.value.trim();
    const thought = document.getElementById('cbt_thought')?.value.trim();
    const distortion = document.getElementById('cbt_distortion')?.value;
    const emotion = document.getElementById('cbt_emotion')?.value.trim();
    const initIntensity = document.getElementById('cbt_intensity_initial')?.value;
    const rational = document.getElementById('cbt_rational')?.value.trim();
    const finalIntensity = document.getElementById('cbt_intensity_final')?.value;

    if (!situation || !thought || !emotion || !rational) {
        showToast('Completa todos los campos del registro', 'warning');
        return;
    }

    const cbtEntry = {
        id: generateId(),
        situation,
        thought,
        distortion,
        emotion,
        initialIntensity: parseInt(initIntensity, 10) || 50,
        rationalThought: rational,
        finalIntensity: parseInt(finalIntensity, 10) || 30,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    PortalState.cbtRecords.push(cbtEntry);
    savePatientData();

    // Sincronizar en tiempo real con backend PostgreSQL (con soporte de cola offline)
    if (PortalState.patientId && PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/cbt', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            situation,
            thought,
            distortion,
            emotion,
            initialIntensity: parseInt(initIntensity, 10) || 50,
            rationalThought: rational,
            finalIntensity: parseInt(finalIntensity, 10) || 30
        });
    }

    closeTestModal();
    updateTestsLastResults();
    showToast('¡Autoregistro guardado exitosamente!', 'success');
}

function submitTest(testType, questionCount) {
    let total = 0;
    let answered = 0;
    for (let i = 0; i < questionCount; i++) {
        const selected = document.querySelector(`input[name="${testType}_${i}"]:checked`);
        if (selected) {
            total += parseInt(selected.value, 10);
            answered++;
        }
    }
    if (answered < questionCount) {
        showToast('Por favor responde todas las preguntas', 'warning');
        return;
    }

    let alertRisk = false;
    let riskReason = '';

    if (testType === 'phq9') {
        const item9Value = parseInt(document.querySelector('input[name="phq9_8"]:checked')?.value || '0', 10);
        if (item9Value > 0) {
            alertRisk = true;
            riskReason = 'Ideación autolítica señalada en el ítem 9 del PHQ-9';
        } else if (total >= 20) {
            alertRisk = true;
            riskReason = 'Depresión severa detectada (puntuación >= 20)';
        }
    }

    const evaluation = {
        id: generateId(),
        type: testType,
        score: total,
        maxScore: questionCount * 3,
        alertRisk,
        riskReason,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };

    if (alertRisk) {
        PortalState.activeCrisisAlert = true;
        // Notificar al servidor PostgreSQL
        sendPortalPost('/api/v1/portal/crisis', {
            patientId: PortalState.patientId,
            patientName: PortalState.patientName,
            token: PortalState.portalToken,
            severity: 'CRITICO',
            reason: riskReason
        });
    }

    PortalState.evaluations.push(evaluation);
    savePatientData();

    // Sincronizar evaluación con el backend PostgreSQL (con soporte de cola offline)
    if (PortalState.patientId && PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/evaluations', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            scaleType: testType,
            score: total,
            maxScore: questionCount * 3,
            alertRisk,
            riskReason,
            answers: []
        });
    }

    if (alertRisk) {
        closeTestModal();
        triggerPortalEmergencyHelp(riskReason);
    } else {
        showTestResult(testType, total, questionCount * 3);
    }
}

function triggerPortalEmergencyHelp(reason) {
    const modal = document.getElementById('crisisHelpModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    PortalState.activeCrisisAlert = true;
    savePatientData();

    // Notificar al backend PostgreSQL
    if (PortalState.patientId && PortalState.portalToken) {
        fetch('/api/v1/portal/crisis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: PortalState.patientId,
                token: PortalState.portalToken,
                patientName: PortalState.patientName,
                severity: 'CRITICO',
                reason: reason || 'Solicitud de apoyo inmediato SOS por el paciente'
            })
        }).catch(() => {});
    }
}

function closeCrisisHelpModal() {
    const modal = document.getElementById('crisisHelpModal');
    if (modal) modal.style.display = 'none';
}

function submitMoodLog() {
    const answers = [];
    for (let i = 0; i < MOOD_QUESTIONS.length; i++) {
        const selected = document.querySelector(`input[name="mood_${i}"]:checked`);
        if (selected) {
            answers.push(parseInt(selected.value, 10));
        }
    }
    if (answers.length < MOOD_QUESTIONS.length) {
        showToast('Por favor responde todas las preguntas', 'warning');
        return;
    }
    const moodLog = {
        id: generateId(),
        mood: answers[0],
        sleep: answers[1],
        energy: answers[2],
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    PortalState.moodLog.push({ id: moodLog.id, value: answers[0], date: moodLog.date });
    savePatientData();

    // Sincronizar en tiempo real con backend PostgreSQL
    if (PortalState.patientId && PortalState.portalToken) {
        fetch('/api/v1/portal/mood', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: PortalState.patientId,
                token: PortalState.portalToken,
                mood: answers[0],
                sleep: answers[1],
                energy: answers[2]
            })
        }).catch(e => console.warn('Sync mood offline:', e));
    }

    closeTestModal();
    updateTestsLastResults();
    showToast('¡Registro de bienestar guardado!', 'success');
}

function showTestResult(testType, score, maxScore) {
    const body = document.getElementById('testModalBody');
    let level, message, icon;
    if (testType === 'phq9') {
        if (score <= 4) { level = 'Ánimo estable'; message = '¡Vas muy bien! Sigue cuidándote. 🌟'; icon = '🌟'; }
        else if (score <= 9) { level = 'Malestar leve'; message = 'Es normal tener días difíciles. 🌱'; icon = '🌱'; }
        else if (score <= 14) { level = 'Malestar moderado'; message = 'Te recomendamos compartir estos resultados con tu terapeuta. 💭'; icon = '💭'; }
        else if (score <= 19) { level = 'Malestar importante'; message = 'Es importante que hables con tu terapeuta. 🌧️'; icon = '🌧️'; }
        else { level = 'Malestar severo'; message = 'Por favor contacta a tu terapeuta lo antes posible. ⚠️'; icon = '⚠️'; }
    } else if (testType === 'gad7') {
        if (score <= 4) { level = 'Ansiedad baja'; message = '¡Excelente! Tu nivel de ansiedad está bajo. 🌟'; icon = '🌟'; }
        else if (score <= 9) { level = 'Ansiedad leve'; message = 'Un poco de ansiedad es normal. 🌱'; icon = '🌱'; }
        else if (score <= 14) { level = 'Ansiedad moderada'; message = 'Te recomendamos compartir estos resultados. 🌊'; icon = '🌊'; }
        else { level = 'Ansiedad alta'; message = 'Es importante que tu terapeuta lo sepa. ⚠️'; icon = '⚠️'; }
    }
    body.innerHTML = `
        <div class="test-result">
            <div class="test-result-icon">${icon}</div>
            <div class="test-result-title">${level}</div>
            <div class="test-result-score">${score} / ${maxScore}</div>
            <div class="test-result-message">${message}</div>
            <button class="btn-primary full-width" onclick="closeTestModal()">
                <i class="fas fa-check"></i> Entendido
            </button>
        </div>
    `;
}

function closeTestModal() {
    document.getElementById('testModal').style.display = 'none';
}

function updateProgress() {
    const completedTasks = PortalState.tasks.filter(t => t.completed).length;
    const totalEvaluations = PortalState.evaluations.length;
    document.getElementById('totalSessions').textContent = totalEvaluations;
    document.getElementById('completedTasks').textContent = completedTasks;
    const achievements = [];
    if (PortalState.tasks.length > 0) {
        achievements.push({ icon: '🌱', title: 'Primer paso', desc: 'Comenzaste tu proceso terapéutico' });
    }
    if (completedTasks >= 1) {
        achievements.push({ icon: '✅', title: 'Primera tarea', desc: 'Completaste tu primera actividad' });
    }
    if (completedTasks >= 5) {
        achievements.push({ icon: '⭐', title: 'Constante', desc: 'Has completado 5 tareas' });
    }
    if (PortalState.evaluations.length >= 3) {
        achievements.push({ icon: '📊', title: 'Autoconocimiento', desc: 'Has realizado 3 evaluaciones' });
    }
    if (PortalState.moodLog.length >= 7) {
        achievements.push({ icon: '🌈', title: 'Consciente', desc: 'Has registrado tu ánimo por una semana' });
    }
    document.getElementById('achievementsList').innerHTML = achievements.map(a => `
        <div class="achievement">
            <div class="achievement-icon">${a.icon}</div>
            <div class="achievement-info">
                <div class="achievement-title">${a.title}</div>
                <div class="achievement-desc">${a.desc}</div>
            </div>
        </div>
    `).join('');
    const recentEvals = PortalState.evaluations.slice(-5).reverse();
    if (recentEvals.length === 0) {
        document.getElementById('evaluationsHistory').innerHTML = '<div class="empty-state-small">Aún no hay evaluaciones registradas</div>';
    } else {
        document.getElementById('evaluationsHistory').innerHTML = recentEvals.map(e => `
            <div class="evaluation-item">
                <div>
                    <div style="font-weight: 600;">${e.type === 'phq9' ? '🌧️ Estado de Ánimo' : e.type === 'gad7' ? '🌊 Ansiedad' : '💭 Ánimo'}</div>
                    <div class="evaluation-date">${formatDateSafe(e.date)}</div>
                </div>
                <div class="evaluation-score">${e.score}/${e.maxScore}</div>
            </div>
        `).join('');
    }
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getInitials(name) {
    if (!name) return '👤';
    return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
}

function formatDateSafe(dateString) {
    if (!dateString) return 'Fecha no disponible';
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha no disponible';
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
        return 'Fecha no disponible';
    }
}

function getMoodLabel(value) {
    const labels = { 1: 'Muy bajo', 2: 'Bajo', 3: 'Neutral', 4: 'Bueno', 5: 'Muy bueno' };
    return labels[value] || '—';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

setInterval(() => {
    if (PortalState.patientId) {
        loadTasksFromNotes();
    }
}, 30000);

// ============================================
// AUDIO SINTETIZADO DE CALMA (WEB AUDIO API)
// ============================================
let audioCtx = null;
let soundEnabled = true;

function toggleBreathingSound() {
    soundEnabled = !soundEnabled;
    const btn = document.getElementById('breathingSoundBtn');
    if (btn) {
        btn.innerHTML = soundEnabled 
            ? '<i class="fas fa-volume-high"></i> Sonido suave' 
            : '<i class="fas fa-volume-xmark"></i> Silencio';
    }
}

function playCalmTone(freq = 432, duration = 0.8) {
    if (!soundEnabled) return;
    try {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.001, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, audioCtx.currentTime + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch (e) {}
}

// ============================================
// RESPIRACIÓN GUIADA 4-7-8
// ============================================
const BreathingController = {
    isRunning: false,
    interval: null,
    currentCycle: 1,
    maxCycles: 4,
    phase: 'idle', // 'inhale', 'hold', 'exhale'
    secondsRemaining: 4
};

function openBreathingExercise() {
    resetBreathingSession();
    const modal = document.getElementById('breathingModal');
    if (modal) modal.style.display = 'flex';
}

function closeBreathingExercise() {
    stopBreathingSession();
    const modal = document.getElementById('breathingModal');
    if (modal) modal.style.display = 'none';
}

function resetBreathingSession() {
    stopBreathingSession();
    BreathingController.currentCycle = 1;
    BreathingController.phase = 'idle';
    BreathingController.secondsRemaining = 4;
    updateBreathingUI('Listo para comenzar', '4', 'Presiona Iniciar para activar la respiración 4-7-8');
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-circle-inner';
    const counter = document.getElementById('breathingCycleCounter');
    if (counter) counter.textContent = `1 / ${BreathingController.maxCycles}`;
    const btn = document.getElementById('btnBreathingToggle');
    if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Iniciar Ejercicio';
}

function toggleBreathingSession() {
    if (BreathingController.isRunning) {
        stopBreathingSession();
        const btn = document.getElementById('btnBreathingToggle');
        if (btn) btn.innerHTML = '<i class="fas fa-play"></i> Continuar Ejercicio';
    } else {
        startBreathingSession();
        const btn = document.getElementById('btnBreathingToggle');
        if (btn) btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
    }
}

function startBreathingSession() {
    BreathingController.isRunning = true;
    runInhalePhase();
}

function stopBreathingSession() {
    BreathingController.isRunning = false;
    if (BreathingController.interval) {
        clearInterval(BreathingController.interval);
        BreathingController.interval = null;
    }
}

function updateBreathingUI(instruction, countdown, guide) {
    const instEl = document.getElementById('breathingInstruction');
    const countEl = document.getElementById('breathingCountdown');
    const guideEl = document.getElementById('breathingPhaseGuide');
    if (instEl) instEl.textContent = instruction;
    if (countEl) countEl.textContent = countdown;
    if (guideEl) guideEl.textContent = guide;
}

function runInhalePhase() {
    if (!BreathingController.isRunning) return;
    BreathingController.phase = 'inhale';
    BreathingController.secondsRemaining = 4;
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-circle-inner inhale';
    updateBreathingUI('Inhala', BreathingController.secondsRemaining, 'Inhala lentamente y con calma por la nariz (4s)');
    playCalmTone(392, 0.8);
    if (navigator.vibrate) navigator.vibrate(80);

    BreathingController.interval = setInterval(() => {
        BreathingController.secondsRemaining--;
        if (BreathingController.secondsRemaining > 0) {
            const countEl = document.getElementById('breathingCountdown');
            if (countEl) countEl.textContent = BreathingController.secondsRemaining;
        } else {
            clearInterval(BreathingController.interval);
            runHoldPhase();
        }
    }, 1000);
}

function runHoldPhase() {
    if (!BreathingController.isRunning) return;
    BreathingController.phase = 'hold';
    BreathingController.secondsRemaining = 7;
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-circle-inner hold';
    updateBreathingUI('Sostén', BreathingController.secondsRemaining, 'Mantén el aire suspendido en tus pulmones con suavidad (7s)');
    playCalmTone(432, 0.6);

    BreathingController.interval = setInterval(() => {
        BreathingController.secondsRemaining--;
        if (BreathingController.secondsRemaining > 0) {
            const countEl = document.getElementById('breathingCountdown');
            if (countEl) countEl.textContent = BreathingController.secondsRemaining;
        } else {
            clearInterval(BreathingController.interval);
            runExhalePhase();
        }
    }, 1000);
}

function runExhalePhase() {
    if (!BreathingController.isRunning) return;
    BreathingController.phase = 'exhale';
    BreathingController.secondsRemaining = 8;
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-circle-inner exhale';
    updateBreathingUI('Exhala', BreathingController.secondsRemaining, 'Suelta todo el aire lentamente por la boca en un suave suspiro (8s)');
    playCalmTone(330, 1.0);
    if (navigator.vibrate) navigator.vibrate(100);

    BreathingController.interval = setInterval(() => {
        BreathingController.secondsRemaining--;
        if (BreathingController.secondsRemaining > 0) {
            const countEl = document.getElementById('breathingCountdown');
            if (countEl) countEl.textContent = BreathingController.secondsRemaining;
        } else {
            clearInterval(BreathingController.interval);
            // Siguiente ciclo o finalización
            if (BreathingController.currentCycle < BreathingController.maxCycles) {
                BreathingController.currentCycle++;
                const counter = document.getElementById('breathingCycleCounter');
                if (counter) counter.textContent = `${BreathingController.currentCycle} / ${BreathingController.maxCycles}`;
                runInhalePhase();
            } else {
                finishBreathingSession();
            }
        }
    }, 1000);
}

function finishBreathingSession() {
    stopBreathingSession();
    playCalmTone(528, 1.5);
    updateBreathingUI('¡Completado!', '✨', 'Excelente. Tu ritmo cardíaco se ha desacelerado y tu cuerpo está en calma.');
    const orb = document.getElementById('breathingOrb');
    if (orb) orb.className = 'breathing-circle-inner';
    const btn = document.getElementById('btnBreathingToggle');
    if (btn) btn.innerHTML = '<i class="fas fa-rotate-right"></i> Repetir Ejercicio';

    showToast('¡Sesión de respiración 4-7-8 completada con éxito! 🌱', 'success');
    syncCalmIntervention('Respiración Guiada 4-7-8', 'Completó 4 ciclos de respiración profunda parasimpática');
}

// ============================================
// ANCLAJE SENSORIAL GROUNDING 5-4-3-2-1
// ============================================
let currentGroundingStep = 0;
const GroundingSteps = [
    { num: 5, icon: '👁️', title: '5 cosas que puedes VER', desc: 'Mira a tu alrededor detenidamente y nombra 5 objetos que llamen tu atención.', placeholder: 'Ej: la lámpara, el marco de la puerta, la textura de la mesa...' },
    { num: 4, icon: '✋', title: '4 cosas que puedes TOCAR o SENTIR', desc: 'Nota 4 sensaciones táctiles físicas en tu cuerpo en este preciso instante.', placeholder: 'Ej: la suavidad de mi ropa, el respaldo de la silla, el frío del suelo...' },
    { num: 3, icon: '👂', title: '3 sonidos que puedes ESCUCHAR', desc: 'Guarda silencio unos segundos y detecta 3 sonidos presentes en tu entorno.', placeholder: 'Ej: el zumbido del ventilador, un pájaro afuera, mi propia respiración...' },
    { num: 2, icon: '👃', title: '2 olores que puedes PERCIBIR', desc: 'Inhala suavemente y busca 2 olores en el aire o en tu piel.', placeholder: 'Ej: olor a café, jabón en mis manos, aire fresco...' },
    { num: 1, icon: '👅', title: '1 sabor que tienes en tu boca', desc: 'Enfoca tu atención en el sabor actual en tu paladar o toma un sorbo de agua.', placeholder: 'Ej: sabor a pasta dental, sorbo de agua fresca, neutral...' }
];

function openGroundingExercise() {
    currentGroundingStep = 0;
    renderGroundingStep();
    const modal = document.getElementById('groundingModal');
    if (modal) modal.style.display = 'flex';
}

function closeGroundingExercise() {
    const modal = document.getElementById('groundingModal');
    if (modal) modal.style.display = 'none';
}

function renderGroundingStep() {
    const container = document.getElementById('groundingModalBody');
    if (!container) return;

    if (currentGroundingStep >= GroundingSteps.length) {
        container.innerHTML = `
            <div class="grounding-step-card">
                <div class="grounding-step-icon">🧘✨</div>
                <div class="grounding-step-title">¡Anclaje Completado!</div>
                <p class="grounding-step-desc">
                    Has traído tu mente al presente. El momento de crisis ha pasado y estás a salvo aquí y ahora.
                </p>
                <button class="btn-primary full-width" onclick="finishGroundingExercise()">
                    <i class="fas fa-check"></i> Finalizar y Guardar en mi Registro
                </button>
            </div>
        `;
        return;
    }

    const step = GroundingSteps[currentGroundingStep];
    container.innerHTML = `
        <div class="grounding-step-card">
            <span class="grounding-step-num">Paso ${currentGroundingStep + 1} de 5</span>
            <div class="grounding-step-icon">${step.icon}</div>
            <div class="grounding-step-title">${step.title}</div>
            <p class="grounding-step-desc">${step.desc}</p>
            <div class="grounding-input-list">
                <input type="text" class="grounding-input" id="groundingInput" placeholder="${step.placeholder}" autofocus>
            </div>
            <div style="display: flex; gap: 10px;">
                ${currentGroundingStep > 0 ? `<button class="btn-secondary" onclick="currentGroundingStep--; renderGroundingStep();">Atrás</button>` : ''}
                <button class="btn-primary full-width" onclick="nextGroundingStep()">
                    Siguiente <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        </div>
    `;
    setTimeout(() => {
        const inp = document.getElementById('groundingInput');
        if (inp) inp.focus();
    }, 100);
}

function nextGroundingStep() {
    playCalmTone(440 + currentGroundingStep * 40, 0.4);
    if (navigator.vibrate) navigator.vibrate(50);
    currentGroundingStep++;
    renderGroundingStep();
}

function finishGroundingExercise() {
    closeGroundingExercise();
    showToast('¡Anclaje 5-4-3-2-1 completado! Estás en calma y presente 🌱', 'success');
    syncCalmIntervention('Anclaje Sensorial 5-4-3-2-1', 'Ejercicio sensorial completado para desacelerar la mente');
}

// ============================================
// REGISTRO DE INTERVENCIONES DE CALMA EN BACKEND
// ============================================
function syncCalmIntervention(technique, detail) {
    if (!PortalState.patientId) return;

    // Guardar en cbt_records para que el terapeuta lo vea
    const entry = {
        id: generateId(),
        situation: `Técnica de Autorregulación: ${technique}`,
        thought: 'Activación autónoma de herramientas de calma en el portal',
        distortion: 'Manejo adaptativo del estrés',
        emotion: 'Calma / Alivio',
        initialIntensity: 75,
        rationalThought: detail,
        finalIntensity: 25,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    PortalState.cbtRecords.push(entry);
    savePatientData();

    // Sincronizar con PostgreSQL (con soporte de cola offline)
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/cbt', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            situation: entry.situation,
            thought: entry.thought,
            distortion: entry.distortion,
            emotion: entry.emotion,
            initialIntensity: entry.initialIntensity,
            rationalThought: entry.rationalThought,
            finalIntensity: entry.finalIntensity
        });
    }
}

// ============================================
// PWA INSTALL BANNER CONTROLLER
// ============================================
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const banner = document.getElementById('pwaInstallBanner');
    if (banner && !sessionStorage.getItem('pwa_dismissed')) {
        banner.style.display = 'flex';
    }
});

function promptPwaInstall() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                showToast('¡App instalada en tu pantalla de inicio!', 'success');
            }
            deferredPrompt = null;
            dismissPwaBanner();
        });
    } else {
        // Instrucción para iOS Safari
        alert('Para instalar en iPhone: presiona el botón Compartir (cuadrado con flecha) y selecciona "Agregar a la pantalla de inicio" 📲');
    }
}

function dismissPwaBanner() {
    const banner = document.getElementById('pwaInstallBanner');
    if (banner) banner.style.display = 'none';
    sessionStorage.setItem('pwa_dismissed', 'true');
}

// Registrar Service Worker para PWA offline
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('✅ ServiceWorker de Mi Espacio activo'))
            .catch((err) => console.warn('SW register error:', err));
    });
}

// ============================================
// CONSENTIMIENTO INFORMADO DIGITAL EN PORTAL
// ============================================
let portalConsentSignatureCtx = null;
let isPortalConsentDrawing = false;

function checkConsentCard() {
    const card = document.getElementById('consentCardPortal');
    if (!card) return;

    const saved = localStorage.getItem(`psico_portal_consent_${PortalState.patientId}`);
    if (saved) {
        card.style.display = 'flex';
        card.classList.add('signed');
        const titleEl = document.getElementById('consentCardTitle');
        const descEl = document.getElementById('consentCardDesc');
        const btn = document.getElementById('btnConsentAction');
        if (titleEl) titleEl.textContent = '✅ Acuerdo Terapéutico Firmado';
        if (descEl) descEl.textContent = 'Tu consentimiento y marco de confidencialidad están formalmente vigentes.';
        if (btn) btn.style.display = 'none';
    } else {
        card.style.display = 'flex';
        card.classList.remove('signed');
        const titleEl = document.getElementById('consentCardTitle');
        const descEl = document.getElementById('consentCardDesc');
        const btn = document.getElementById('btnConsentAction');
        if (titleEl) titleEl.textContent = 'Acuerdo Terapéutico y Confidencialidad';
        if (descEl) descEl.textContent = 'Revisa y firma digitalmente el marco de confidencialidad con tu terapeuta.';
        if (btn) btn.style.display = 'inline-flex';
    }
}

function openPortalConsentModal() {
    const modal = document.getElementById('consentModalPortal');
    if (modal) modal.style.display = 'flex';
    setTimeout(() => initPortalConsentSignaturePad(), 80);
}

function closePortalConsentModal() {
    const modal = document.getElementById('consentModalPortal');
    if (modal) modal.style.display = 'none';
}

function initPortalConsentSignaturePad() {
    const canvas = document.getElementById('portalConsentSignaturePad');
    if (!canvas) return;
    portalConsentSignatureCtx = canvas.getContext('2d');
    portalConsentSignatureCtx.lineWidth = 2.5;
    portalConsentSignatureCtx.lineCap = 'round';
    portalConsentSignatureCtx.lineJoin = 'round';
    portalConsentSignatureCtx.strokeStyle = '#4f46e5';

    const getPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    };

    const startDraw = (e) => {
        e.preventDefault();
        isPortalConsentDrawing = true;
        const pos = getPos(e);
        portalConsentSignatureCtx.beginPath();
        portalConsentSignatureCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isPortalConsentDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        portalConsentSignatureCtx.lineTo(pos.x, pos.y);
        portalConsentSignatureCtx.stroke();
    };

    const stopDraw = () => {
        if (isPortalConsentDrawing) {
            isPortalConsentDrawing = false;
        }
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = draw;
    window.onmouseup = stopDraw;

    canvas.ontouchstart = startDraw;
    canvas.ontouchmove = draw;
    canvas.ontouchend = stopDraw;

    portalConsentSignatureCtx.clearRect(0, 0, canvas.width, canvas.height);
}

function clearPortalSignaturePad() {
    const canvas = document.getElementById('portalConsentSignaturePad');
    if (canvas && portalConsentSignatureCtx) {
        portalConsentSignatureCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function confirmPortalConsentSignature() {
    const canvas = document.getElementById('portalConsentSignaturePad');
    if (!canvas) return;

    let signatureData = '';
    try {
        signatureData = canvas.toDataURL();
    } catch (e) {}

    const consentRecord = {
        patientId: PortalState.patientId,
        signedAt: new Date().toISOString(),
        signature: signatureData
    };

    localStorage.setItem(`psico_portal_consent_${PortalState.patientId}`, JSON.stringify(consentRecord));

    // Sincronizar hacia el backend y expediente del terapeuta
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/cbt', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            situation: 'Acuerdo Terapéutico y Secreto Profesional Firmado Digitalmente',
            thought: 'Consentimiento firmado en pantalla móvil por el consultante',
            distortion: 'Marco Ético Homologado',
            emotion: 'Asentimiento Terapéutico',
            initialIntensity: 100,
            rationalThought: `Firmado digitalmente el ${new Date().toLocaleDateString('es-ES')}`,
            finalIntensity: 100
        });
    }

    closePortalConsentModal();
    checkConsentCard();
    showToast('¡Acuerdo firmado con éxito! Gracias por tu compromiso.', 'success');
}

// ==========================================================================
// PORTAL PACIENTES KID — LÓGICA VIBRANTE Y DINÁMICA (PSICO KIDS SPACE)
// ==========================================================================

// ----------------------------------------------------
// 0. EFECTOS DE SONIDO SINTÉTICOS NATIVOS (WEB AUDIO API)
// ----------------------------------------------------
const KidAudioEffects = {
    ctx: null,
    isMuted: false,

    init() {
        if (!this.ctx && typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        }
        try {
            this.isMuted = localStorage.getItem('psico_kid_muted') === 'true';
            this.updateButton();
        } catch (e) {}
    },

    toggleMute() {
        this.isMuted = !this.isMuted;
        try {
            localStorage.setItem('psico_kid_muted', this.isMuted ? 'true' : 'false');
        } catch (e) {}
        this.updateButton();
        if (!this.isMuted) this.playDing();
    },

    updateButton() {
        const btn = document.getElementById('btnKidSoundToggle');
        if (btn) {
            btn.textContent = this.isMuted ? '🔇' : '🔊';
            btn.classList.toggle('muted', this.isMuted);
        }
    },

    playTone(freq, type = 'sine', duration = 0.15, startGain = 0.25) {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(startGain, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (e) {}
    },

    playPop() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            const t = this.ctx.currentTime;
            osc.frequency.setValueAtTime(750, t);
            osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
            gain.gain.setValueAtTime(0.35, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.08);
        } catch (e) {}
    },

    playDing() {
        this.playTone(880, 'sine', 0.4, 0.2);
        setTimeout(() => this.playTone(1760, 'sine', 0.5, 0.15), 50);
    },

    playBoing() {
        if (this.isMuted) return;
        this.init();
        if (!this.ctx) return;
        if (this.ctx.state === 'suspended') this.ctx.resume();
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'triangle';
            const t = this.ctx.currentTime;
            osc.frequency.setValueAtTime(220, t);
            osc.frequency.linearRampToValueAtTime(460, t + 0.06);
            osc.frequency.linearRampToValueAtTime(300, t + 0.14);
            gain.gain.setValueAtTime(0.25, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
        } catch (e) {}
    },

    playSuccess() {
        const notes = [523.25, 659.25, 783.99, 1046.50]; // Do, Mi, Sol, Do agudo
        notes.forEach((f, idx) => {
            setTimeout(() => this.playTone(f, 'sine', 0.35, 0.2), idx * 85);
        });
    }
};

// ----------------------------------------------------
// 0.1 MOTOR DE CONFETTI Y ESTRELLAS EN PANTALLA
// ----------------------------------------------------
const KidConfetti = {
    canvas: null,
    ctx: null,
    particles: [],
    animId: null,

    init() {
        this.canvas = document.getElementById('kidConfettiCanvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    burst(x, y, count = 35) {
        this.init();
        if (!this.canvas || !this.ctx) return;
        const px = typeof x === 'number' && !isNaN(x) ? x : window.innerWidth / 2;
        const py = typeof y === 'number' && !isNaN(y) ? y : window.innerHeight / 2;
        const colors = ['#f59e0b', '#ec4899', '#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#fde047', '#ff6b6b'];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 4 + Math.random() * 8;
            this.particles.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 2.5,
                color: colors[Math.floor(Math.random() * colors.length)],
                radius: 4 + Math.random() * 5,
                alpha: 1,
                shape: Math.random() > 0.4 ? 'circle' : 'star'
            });
        }

        if (!this.animId) {
            this.render();
        }
    },

    render() {
        if (!this.canvas || !this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.28; // Gravedad suave
            p.vx *= 0.98;
            p.alpha *= 0.96;

            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;

            if (p.shape === 'star') {
                this.drawStar(p.x, p.y, 5, p.radius * 1.5, p.radius * 0.7);
            } else {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.fill();
            }
            this.ctx.restore();

            if (p.alpha <= 0.04 || p.y > this.canvas.height + 20) {
                this.particles.splice(i, 1);
            }
        }

        if (this.particles.length > 0) {
            this.animId = requestAnimationFrame(() => this.render());
        } else {
            this.animId = null;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    drawStar(cx, cy, spikes, outerRadius, innerRadius) {
        let rot = (Math.PI / 2) * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            this.ctx.lineTo(x, y);
            rot += step;
        }
        this.ctx.lineTo(cx, cy - outerRadius);
        this.ctx.closePath();
        this.ctx.fill();
    }
};

// ----------------------------------------------------
// INICIALIZACIÓN Y TOGGLE DE MODO KIDS
// ----------------------------------------------------
function initKidModeState() {
    KidAudioEffects.init();
    KidConfetti.init();

    const starsEl = document.getElementById('kidStarsCount');
    const badgeEl = document.getElementById('kidStarsBadge');
    if (starsEl) starsEl.textContent = PortalState.kidStars || 0;
    
    // Configurar avatar en home y header
    updateKidAvatarDisplays();

    // Actualizar nombre en saludo infantil
    const greetingNameEl = document.getElementById('kidGreetingName');
    if (greetingNameEl) {
        greetingNameEl.textContent = (PortalState.patientName || 'Explorador').split(' ')[0];
    }

    // Activar modo correspondiente de forma determinista
    toggleKidMode(Boolean(PortalState.isKidMode));
}

function toggleKidMode(forceValue) {
    if (typeof forceValue === 'boolean') {
        PortalState.isKidMode = forceValue;
    } else {
        PortalState.isKidMode = !PortalState.isKidMode;
    }

    const toggleBtn = document.getElementById('btnKidModeToggle');
    const soundBtn = document.getElementById('btnKidSoundToggle');
    const badgeEl = document.getElementById('kidStarsBadge');
    const stdNav = document.getElementById('standardNav');
    const kidNav = document.getElementById('kidNav');

    // REGLA CLÍNICA PRIMORDIAL:
    // En el portal de adultos y adolescentes NO debe aparecer ningún botón o indicador de "Modo Kids".
    // En el portal de niños, tampoco se muestra botón para cambiarse al portal de adultos.
    if (toggleBtn) {
        toggleBtn.style.display = 'none';
        toggleBtn.style.setProperty('display', 'none', 'important');
    }

    if (PortalState.isKidMode) {
        document.body.classList.add('kid-mode-active');
        if (soundBtn) soundBtn.style.display = 'inline-flex';
        if (badgeEl) badgeEl.style.display = 'inline-flex';
        if (stdNav) stdNav.style.display = 'none';
        if (kidNav) kidNav.style.display = 'flex';
        switchKidView('kid-home');
        KidAudioEffects.playSuccess();
        KidConfetti.burst(window.innerWidth / 2, 200, 30);
    } else {
        document.body.classList.remove('kid-mode-active');
        if (soundBtn) soundBtn.style.display = 'none';
        if (badgeEl) badgeEl.style.display = 'none';
        if (stdNav) stdNav.style.display = 'flex';
        if (kidNav) kidNav.style.display = 'none';
        switchView('home');
    }
}

function switchKidView(viewKey) {
    document.querySelectorAll('.portal-view').forEach(v => {
        v.classList.remove('active');
        v.style.display = 'none';
    });
    document.querySelectorAll('.kid-bottom-console .kid-console-btn').forEach(b => b.classList.remove('active'));

    let targetId = 'viewKidHome';
    if (viewKey === 'kid-avatar') targetId = 'viewKidAvatar';
    else if (viewKey === 'kid-bubbles') targetId = 'viewKidBubbles';
    else if (viewKey === 'kid-drawing') targetId = 'viewKidDrawing';
    else if (viewKey === 'kid-calm') targetId = 'viewKidCalm';

    const targetView = document.getElementById(targetId);
    if (targetView) {
        targetView.classList.add('active');
        targetView.style.display = 'block';
    }

    const activeBtn = document.querySelector(`.kid-bottom-console .kid-console-btn[data-kid-view="${viewKey}"]`);
    if (activeBtn) activeBtn.classList.add('active');

    KidAudioEffects.playBoing();

    // Inicializaciones bajo demanda
    if (viewKey === 'kid-bubbles') initKidBubbles();
    if (viewKey === 'kid-drawing') initKidDrawingCanvas();
}

function updateKidAvatarDisplays() {
    const avatar = PortalState.kidAvatar || { emoji: '🦊', name: 'Zorrito Valiente', aura: 'aura-gold', accEmoji: '🦸' };
    const homeBadge = document.getElementById('kidHomeAvatarBadge');
    if (homeBadge) homeBadge.textContent = avatar.emoji;

    const homeAcc = document.getElementById('kidHomeAvatarAcc');
    if (homeAcc) homeAcc.textContent = avatar.accEmoji || '🦸';

    const stageDisplay = document.getElementById('kidAvatarStageDisplay');
    const stageChar = document.getElementById('kidStageChar');
    const stageAcc = document.getElementById('kidStageAccessory');
    const stageName = document.getElementById('kidAvatarDisplayName');

    if (stageDisplay) {
        stageDisplay.className = `kid-stage-aura-ring ${avatar.aura || 'aura-gold'}`;
    }
    if (stageChar) stageChar.textContent = avatar.emoji || '🦊';
    if (stageAcc) stageAcc.textContent = avatar.accEmoji || '🦸';
    if (stageName) stageName.textContent = avatar.name || 'Zorrito Valiente';

    // Header avatar
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && PortalState.isKidMode) {
        headerAvatar.textContent = avatar.emoji;
    }
}

// ----------------------------------------------------
// 1. CLIMA EMOCIONAL & MAPA SOMÁTICO CORPORAL
// ----------------------------------------------------
function selectKidWeather(weatherKey) {
    PortalState.kidWeather = weatherKey;
    document.querySelectorAll('.kid-weather-card-v2').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-weather') === weatherKey);
    });
    KidAudioEffects.playBoing();
}

function selectKidBodyZone(zoneKey) {
    PortalState.kidBodyZone = zoneKey;

    // Actualizar botones pills laterales
    document.querySelectorAll('.kid-zone-pill').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-zone') === zoneKey);
    });

    // Actualizar hotspots del SVG del muñequito
    document.querySelectorAll('.somatic-hotspot-group').forEach(group => {
        group.classList.toggle('selected', group.getAttribute('data-zone') === zoneKey);
    });

    // Bocadillo de diálogo empático
    const speechEl = document.getElementById('kidSomaticSpeechBubble');
    if (speechEl) {
        const zonePhrases = {
            head: '🧠 ¡Uff, mi cabecita está pensando muy rápido como un cometa!',
            throat: '🗣️ ¡Tengo un nudito en la garganta o palabras que quiero decir!',
            chest: '💖 ¡Mi corazón late como un tambor y siento calor en el pecho!',
            belly: '🌀 ¡Siento mariposas revoloteando o cosquillitas en la pancita!',
            hands: '✊ ¡Mis manitas quieren apretar o moverse con mucha energía!'
        };
        speechEl.textContent = zonePhrases[zoneKey] || '✨ ¡Tu cuerpo te da señales mágicas!';
    }

    KidAudioEffects.playBoing();
}

async function submitKidWeatherAndBody(e) {
    if (!PortalState.kidWeather) {
        showToast('¡Por favor elige el clima de tu corazón primero! ☀️🌧️', 'warning');
        return;
    }

    const weatherNames = {
        sunny: 'Soleado ☀️ (Alegre y con energía)',
        partly_cloudy: 'Sol con nubes 🌤️ (Tranqui, en calma)',
        rainbow: 'Arcoíris 🌈 (Creativo y contento)',
        rainy: 'Lluvia 🌧️ (Un poco triste o apagado)',
        storm: 'Tormenta ⚡ (Enojado o frustrado)',
        tornado: 'Remolino 🌪️ (Con miedo o confuso)'
    };

    const zoneNames = {
        head: 'En la cabecita 🧠',
        throat: 'En la garganta 🗣️',
        chest: 'En el pecho 💖',
        belly: 'En la pancita 🌀',
        hands: 'En las manitas ✊'
    };

    const payloadData = {
        weather: PortalState.kidWeather,
        weatherLabel: weatherNames[PortalState.kidWeather] || PortalState.kidWeather,
        bodyZone: PortalState.kidBodyZone || 'general',
        bodyZoneLabel: zoneNames[PortalState.kidBodyZone] || 'En todo el cuerpo',
        recordedAt: new Date().toISOString()
    };

    // Registrar en actividad local
    const activityRecord = {
        id: 'act_' + Date.now(),
        activity_type: 'weather_body',
        data: payloadData,
        created_at: new Date().toISOString()
    };
    PortalState.kidActivities.unshift(activityRecord);

    // Sumar +1 Estrella ⭐ y disparo de confeti
    awardKidStars(1);
    KidAudioEffects.playSuccess();
    KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.4, 40);

    // Enviar al backend PostgreSQL con cola offline
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'weather_body',
            data: payloadData
        });
    }

    savePatientData();
    showToast('✨ ¡Genial! Tu clima emocional llegó a tu terapeuta (+1 ⭐)', 'success');
}

function awardKidStars(amount) {
    PortalState.kidStars = (PortalState.kidStars || 0) + (amount || 1);
    const starsEl = document.getElementById('kidStarsCount');
    if (starsEl) starsEl.textContent = PortalState.kidStars;
    savePatientData();
}

// ----------------------------------------------------
// 2. CREADOR DE AVATAR (ESTILO PEDESTAL 3D)
// ----------------------------------------------------
function pickAvatarChar(charKey, emoji, name) {
    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.character = charKey;
    PortalState.kidAvatar.emoji = emoji;
    PortalState.kidAvatar.name = name;

    document.querySelectorAll('.avatar-puffy-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-char') === charKey);
    });

    const stageChar = document.getElementById('kidStageChar');
    const stageName = document.getElementById('kidAvatarDisplayName');
    if (stageChar) {
        stageChar.textContent = emoji;
        stageChar.classList.remove('kid-hop');
        void stageChar.offsetWidth;
        stageChar.classList.add('kid-hop');
    }
    if (stageName) stageName.textContent = name;

    KidAudioEffects.playBoing();
}

function pickAvatarAura(auraClass) {
    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.aura = auraClass;

    document.querySelectorAll('.aura-sparkle-btn').forEach(b => {
        b.classList.toggle('active', b.classList.contains(auraClass + '-btn'));
    });

    const stageDisplay = document.getElementById('kidAvatarStageDisplay');
    if (stageDisplay) {
        stageDisplay.className = `kid-stage-aura-ring ${auraClass}`;
    }

    KidAudioEffects.playDing();
}

function pickAvatarAccessory(accKey, accEmoji) {
    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.accessory = accKey;
    PortalState.kidAvatar.accEmoji = accEmoji;

    document.querySelectorAll('.acc-puffy-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-acc') === accKey);
    });

    const stageAcc = document.getElementById('kidStageAccessory');
    if (stageAcc) stageAcc.textContent = accEmoji;

    KidAudioEffects.playBoing();
}

function generateRandomKidAvatarName() {
    const prefixes = ['Super', 'Capitán', 'Príncipe', 'Princesa', 'Maestro', 'Explorador', 'Comandante', 'Mago'];
    const suffixes = ['de las Galaxias', 'del Relámpago', 'de las Nubes', 'del Arcoíris', 'del Fuego Mágico', 'de las Estrellas', 'de la Calma', 'del Viento'];
    const baseName = (PortalState.kidAvatar && PortalState.kidAvatar.name) ? PortalState.kidAvatar.name.split(' ')[0] : 'Compañero';

    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomTitle = `${p} ${baseName} ${s}`;

    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.name = randomTitle;

    const nameEl = document.getElementById('kidAvatarDisplayName');
    if (nameEl) nameEl.textContent = randomTitle;

    const charEl = document.getElementById('kidStageChar');
    if (charEl) {
        charEl.classList.remove('kid-hop');
        void charEl.offsetWidth;
        charEl.classList.add('kid-hop');
    }

    KidAudioEffects.playDing();
    KidConfetti.burst(window.innerWidth / 2, 280, 20);
}

async function saveKidAvatar() {
    updateKidAvatarDisplays();
    awardKidStars(1);
    KidAudioEffects.playSuccess();
    KidConfetti.burst(window.innerWidth / 2, 300, 45);

    const payloadData = {
        ...PortalState.kidAvatar,
        updatedAt: new Date().toISOString()
    };

    const activityRecord = {
        id: 'act_' + Date.now(),
        activity_type: 'avatar_customization',
        data: payloadData,
        created_at: new Date().toISOString()
    };
    PortalState.kidActivities.unshift(activityRecord);

    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'avatar_customization',
            data: payloadData
        });
    }

    savePatientData();
    showToast('🌟 ¡Avatar guardado! Te acompañará en todo tu espacio mágico (+1 ⭐)', 'success');
}

// ----------------------------------------------------
// 3. CAZADOR DE PREOCUPACIONES (BURBUJAS 3D Y CONFETTI)
// ----------------------------------------------------
const DEFAULT_KID_WORRIES = [
    'Un mal sueño 🌙',
    'Miedo a equivocarme 📝',
    'Pelea en el recreo ⚽',
    'Nervios antes de clase 🎒',
    'Tristeza repentina 🌧️',
    'Enojo en la panza ⚡',
    'Ganas de llorar 💧',
    'Miedo a la oscuridad 🔦'
];

function initKidBubbles() {
    const playfield = document.getElementById('kidBubblesPlayfield');
    if (!playfield) return;

    const countEl = document.getElementById('kidBubblesPoppedCount');
    if (countEl) countEl.textContent = PortalState.kidBubblesPopped || 0;

    // Solo rellenar si está vacío
    if (playfield.children.length === 0) {
        DEFAULT_KID_WORRIES.forEach(worry => {
            const bubble = createBubbleElement(worry);
            playfield.appendChild(bubble);
        });
    }
}

function createBubbleElement(text) {
    const b = document.createElement('div');
    b.className = 'kid-bubble-v2';
    b.innerHTML = `<span>🫧 ${text}</span>`;
    b.onclick = (e) => popKidBubble(b, text, e);
    return b;
}

function popKidBubble(el, worryText, ev) {
    if (el.classList.contains('popping')) return;
    el.classList.add('popping');

    // Efecto de sonido POP y confeti en las coordenadas del toque
    KidAudioEffects.playPop();
    const clickX = ev && ev.clientX ? ev.clientX : window.innerWidth / 2;
    const clickY = ev && ev.clientY ? ev.clientY : window.innerHeight / 2;
    KidConfetti.burst(clickX, clickY, 25);

    PortalState.kidBubblesPopped = (PortalState.kidBubblesPopped || 0) + 1;
    const countEl = document.getElementById('kidBubblesPoppedCount');
    if (countEl) countEl.textContent = PortalState.kidBubblesPopped;

    setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);

        // Si se vacía el campo, rellenar de nuevo y celebrar
        const playfield = document.getElementById('kidBubblesPlayfield');
        if (playfield && playfield.children.length === 0) {
            initKidBubbles();
            awardKidStars(1);
            KidAudioEffects.playSuccess();
            KidConfetti.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
            showToast('🎉 ¡Has limpiado todas las burbujas! ¡Gran trabajo soltando tensiones! (+1 ⭐)', 'success');
        }
    }, 280);

    // Notificar al terapeuta
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'bubble_popped',
            data: {
                worryText,
                totalPopped: PortalState.kidBubblesPopped,
                poppedAt: new Date().toISOString()
            }
        });
    }
}

function promptCustomBubble() {
    const custom = prompt('¿Qué preocupación o pensamiento quieres meter en una burbuja para dejarla ir?');
    if (custom && custom.trim()) {
        const playfield = document.getElementById('kidBubblesPlayfield');
        if (playfield) {
            const newBubble = createBubbleElement(custom.trim());
            playfield.insertBefore(newBubble, playfield.firstChild);
            KidAudioEffects.playDing();
            showToast('🫧 ¡Burbuja creada! Tócala cuando estés listo para soltarla.', 'info');
        }
    }
}

// ----------------------------------------------------
// 4. EL LIENZO MÁGICO (HTML5 CANVAS CON PINCEL ARCOÍRIS)
// ----------------------------------------------------
let kidCanvasState = {
    canvas: null,
    ctx: null,
    isDrawing: false,
    color: '#202923',
    brushSize: 10,
    isEraser: false,
    isRainbow: false,
    rainbowHue: 0,
    selectedStamp: null
};

function initKidDrawingCanvas() {
    const canvas = document.getElementById('kidDrawingCanvas');
    if (!canvas) return;

    kidCanvasState.canvas = canvas;
    const ctx = canvas.getContext('2d');
    kidCanvasState.ctx = ctx;

    // Inicializar fondo blanco si está en blanco
    if (!canvas.getAttribute('data-initialized')) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.setAttribute('data-initialized', 'true');
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        if (e.touches && e.touches.length > 0) {
            return {
                x: (e.touches[0].clientX - rect.left) * scaleX,
                y: (e.touches[0].clientY - rect.top) * scaleY
            };
        }
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY
        };
    }

    function startDraw(e) {
        e.preventDefault();
        const coords = getCoords(e);

        if (kidCanvasState.selectedStamp) {
            ctx.font = '54px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(kidCanvasState.selectedStamp, coords.x, coords.y);
            KidAudioEffects.playBoing();
            return;
        }

        kidCanvasState.isDrawing = true;
        ctx.beginPath();
        ctx.moveTo(coords.x, coords.y);

        if (kidCanvasState.isEraser) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = kidCanvasState.brushSize * 2.5;
        } else if (kidCanvasState.isRainbow) {
            ctx.strokeStyle = `hsl(${kidCanvasState.rainbowHue}, 90%, 55%)`;
            ctx.lineWidth = kidCanvasState.brushSize;
        } else {
            ctx.strokeStyle = kidCanvasState.color;
            ctx.lineWidth = kidCanvasState.brushSize;
        }
    }

    function moveDraw(e) {
        if (!kidCanvasState.isDrawing || kidCanvasState.selectedStamp) return;
        e.preventDefault();
        const coords = getCoords(e);

        if (kidCanvasState.isRainbow) {
            kidCanvasState.rainbowHue = (kidCanvasState.rainbowHue + 4) % 360;
            ctx.strokeStyle = `hsl(${kidCanvasState.rainbowHue}, 90%, 55%)`;
        }

        ctx.lineTo(coords.x, coords.y);
        ctx.stroke();
    }

    function endDraw(e) {
        if (kidCanvasState.isDrawing) {
            kidCanvasState.isDrawing = false;
            ctx.closePath();
        }
    }

    canvas.onmousedown = startDraw;
    canvas.onmousemove = moveDraw;
    canvas.onmouseup = endDraw;
    canvas.onmouseleave = endDraw;

    canvas.ontouchstart = startDraw;
    canvas.ontouchmove = moveDraw;
    canvas.ontouchend = endDraw;
    canvas.ontouchcancel = endDraw;
}

function setCanvasColor(hexColor) {
    kidCanvasState.color = hexColor;
    kidCanvasState.isEraser = false;
    kidCanvasState.isRainbow = false;
    kidCanvasState.selectedStamp = null;

    document.querySelectorAll('.crayon-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.style.backgroundColor && btn.style.backgroundColor.includes(hexColor.toLowerCase())) {
            btn.classList.add('active');
        }
    });
    document.querySelectorAll('.stamp-pill-btn').forEach(btn => btn.classList.remove('active'));
    KidAudioEffects.playBoing();
}

function setRainbowBrush() {
    kidCanvasState.isRainbow = true;
    kidCanvasState.isEraser = false;
    kidCanvasState.selectedStamp = null;

    document.querySelectorAll('.crayon-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.stamp-pill-btn').forEach(btn => btn.classList.remove('active'));
    const rainbowBtn = document.querySelector('.crayon-rainbow');
    if (rainbowBtn) rainbowBtn.classList.add('active');

    KidAudioEffects.playDing();
}

function setCanvasBrushSize(size) {
    kidCanvasState.brushSize = size;
    document.querySelectorAll('.size-pill-btn').forEach(btn => {
        const text = btn.textContent.toLowerCase();
        btn.classList.toggle('active', 
            (size === 4 && text.includes('fino')) ||
            (size === 10 && text.includes('medio')) ||
            (size === 22 && text.includes('grueso'))
        );
    });
    KidAudioEffects.playBoing();
}

function toggleCanvasEraser() {
    kidCanvasState.isEraser = true;
    kidCanvasState.isRainbow = false;
    kidCanvasState.selectedStamp = null;
    document.querySelectorAll('.crayon-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.stamp-pill-btn').forEach(btn => btn.classList.remove('active'));
    const eraserBtn = document.querySelector('.crayon-eraser');
    if (eraserBtn) eraserBtn.classList.add('active');

    KidAudioEffects.playBoing();
}

function setCanvasStamp(emoji) {
    kidCanvasState.selectedStamp = emoji;
    kidCanvasState.isEraser = false;
    kidCanvasState.isRainbow = false;
    document.querySelectorAll('.stamp-pill-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.trim() === emoji);
    });
    document.querySelectorAll('.crayon-btn').forEach(btn => btn.classList.remove('active'));

    KidAudioEffects.playDing();
}

function clearKidCanvas() {
    if (confirm('¿Quieres limpiar todo el lienzo para empezar un dibujo nuevo? 🎨')) {
        const canvas = kidCanvasState.canvas || document.getElementById('kidDrawingCanvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            KidAudioEffects.playPop();
        }
    }
}

async function submitKidDrawing() {
    const canvas = kidCanvasState.canvas || document.getElementById('kidDrawingCanvas');
    if (!canvas) return;

    let drawingDataUrl = '';
    try {
        drawingDataUrl = canvas.toDataURL('image/png', 0.85);
    } catch (e) {
        showToast('Error al procesar el dibujo', 'error');
        return;
    }

    const payloadData = {
        imageDataUrl: drawingDataUrl,
        sentAt: new Date().toISOString()
    };

    const activityRecord = {
        id: 'act_' + Date.now(),
        activity_type: 'drawing',
        data: payloadData,
        created_at: new Date().toISOString()
    };
    PortalState.kidActivities.unshift(activityRecord);

    awardKidStars(2);
    KidAudioEffects.playSuccess();
    KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 45);

    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'drawing',
            data: payloadData
        });
    }

    savePatientData();
    showToast('🎨✨ ¡Precioso dibujo! Ya está en el consultorio de tu terapeuta (+2 ⭐)', 'success');
}

// ----------------------------------------------------
// 5. EL GLOBO DE LA CALMA (RESPIRACIÓN ANIMADA)
// ----------------------------------------------------
let balloonBreathingTimer = null;
let balloonBreathingActive = false;
let balloonPhaseSeconds = 0;
let isBalloonInhaling = true;

function toggleBalloonBreathing() {
    if (balloonBreathingActive) {
        stopBalloonBreathing();
    } else {
        startBalloonBreathing();
    }
}

function startBalloonBreathing() {
    balloonBreathingActive = true;
    const btn = document.getElementById('btnToggleBalloon');
    if (btn) btn.innerHTML = '<span class="btn-puffy-icon">⏸️</span> <span class="btn-puffy-text">Pausar Respiración</span>';

    KidAudioEffects.playTone(392, 'sine', 0.5, 0.2); // Sol suave
    runBalloonCycle();
}

function stopBalloonBreathing() {
    balloonBreathingActive = false;
    if (balloonBreathingTimer) {
        clearInterval(balloonBreathingTimer);
        balloonBreathingTimer = null;
    }

    const balloon = document.getElementById('kidBalloon');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const btn = document.getElementById('btnToggleBalloon');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    if (balloon) {
        balloon.classList.remove('inhale', 'exhale');
    }
    if (eyes) eyes.innerHTML = '<span class="eye left">●</span><span class="eye right">●</span>';
    if (mouth) mouth.textContent = '‿';
    if (instruction) instruction.textContent = '¡Muy bien hecho! Puedes volver a respirar cuando quieras.';
    if (timer) timer.textContent = '0s';
    if (btn) btn.innerHTML = '<span class="btn-puffy-icon">🎈</span> <span class="btn-puffy-text">¡Comenzar a Respirar!</span>';
}

function runBalloonCycle() {
    if (!balloonBreathingActive) return;

    const balloon = document.getElementById('kidBalloon');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    // Fase 1: Inhalar (4 segundos)
    isBalloonInhaling = true;
    balloonPhaseSeconds = 4;
    if (balloon) {
        balloon.classList.remove('exhale');
        balloon.classList.add('inhale');
    }
    if (eyes) eyes.innerHTML = '<span class="eye left">◉</span><span class="eye right">◉</span>';
    if (mouth) mouth.textContent = 'o';
    if (instruction) instruction.textContent = '🌬️ Inhala suavemente por la nariz... llenando el globo';
    if (timer) timer.textContent = `${balloonPhaseSeconds}s`;

    KidAudioEffects.playTone(440, 'sine', 1.0, 0.15); // Tono suave de inhalación

    let elapsed = 0;
    balloonBreathingTimer = setInterval(() => {
        if (!balloonBreathingActive) return;
        elapsed++;
        const remaining = balloonPhaseSeconds - elapsed;
        if (timer) timer.textContent = `${Math.max(0, remaining)}s`;

        if (elapsed >= balloonPhaseSeconds) {
            clearInterval(balloonBreathingTimer);
            startBalloonExhale();
        }
    }, 1000);
}

function startBalloonExhale() {
    if (!balloonBreathingActive) return;

    const balloon = document.getElementById('kidBalloon');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    isBalloonInhaling = false;
    balloonPhaseSeconds = 6;
    if (balloon) {
        balloon.classList.remove('inhale');
        balloon.classList.add('exhale');
    }
    if (eyes) eyes.innerHTML = '<span class="eye left">^</span><span class="eye right">^</span>';
    if (mouth) mouth.textContent = '‿';
    if (instruction) instruction.textContent = '🍃 Exhala despacito por la boca... soltando el aire como una pluma';
    if (timer) timer.textContent = `${balloonPhaseSeconds}s`;

    KidAudioEffects.playTone(330, 'sine', 1.5, 0.12); // Tono relajante de exhalación

    let elapsed = 0;
    balloonBreathingTimer = setInterval(() => {
        if (!balloonBreathingActive) return;
        elapsed++;
        const remaining = balloonPhaseSeconds - elapsed;
        if (timer) timer.textContent = `${Math.max(0, remaining)}s`;

        if (elapsed >= balloonPhaseSeconds) {
            clearInterval(balloonBreathingTimer);

            // Ciclo completado
            PortalState.kidCalmCycles = (PortalState.kidCalmCycles || 0) + 1;
            const cyclesEl = document.getElementById('kidCalmCycles');
            if (cyclesEl) cyclesEl.textContent = PortalState.kidCalmCycles;

            if (PortalState.kidCalmCycles % 3 === 0) {
                awardKidStars(1);
                KidAudioEffects.playSuccess();
                KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 30);
                showToast('⭐ ¡Superpoder de calma desbloqueado! 3 respiraciones completas (+1 ⭐)', 'success');
            }

            // Notificar al backend
            if (PortalState.portalToken) {
                sendPortalPost('/api/v1/portal/kid/activity', {
                    patientToken: PortalState.portalToken,
                    activityType: 'calm_breathing',
                    data: {
                        cyclesCompleted: PortalState.kidCalmCycles,
                        timestamp: new Date().toISOString()
                    }
                });
            }

            // Siguiente ciclo
            runBalloonCycle();
        }
    }, 1000);
}

// Exponer funciones globales para eventos onClick en portal.html
window.toggleKidMode = toggleKidMode;
window.switchKidView = switchKidView;
window.selectKidWeather = selectKidWeather;
window.selectKidBodyZone = selectKidBodyZone;
window.submitKidWeatherAndBody = submitKidWeatherAndBody;
window.pickAvatarChar = pickAvatarChar;
window.pickAvatarAura = pickAvatarAura;
window.pickAvatarAccessory = pickAvatarAccessory;
window.generateRandomKidAvatarName = generateRandomKidAvatarName;
window.saveKidAvatar = saveKidAvatar;
window.promptCustomBubble = promptCustomBubble;
window.setCanvasColor = setCanvasColor;
window.setRainbowBrush = setRainbowBrush;
window.setCanvasBrushSize = setCanvasBrushSize;
window.toggleCanvasEraser = toggleCanvasEraser;
window.setCanvasStamp = setCanvasStamp;
window.clearKidCanvas = clearKidCanvas;
window.submitKidDrawing = submitKidDrawing;
window.toggleBalloonBreathing = toggleBalloonBreathing;
window.KidAudioEffects = KidAudioEffects;
window.KidConfetti = KidConfetti;
