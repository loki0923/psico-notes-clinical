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
    currentFilter: 'pending'
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
        } else {
            PortalState.tasks = [];
            PortalState.evaluations = [];
            PortalState.moodLog = [];
            PortalState.cbtRecords = [];
            PortalState.activeCrisisAlert = false;
        }
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
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(`psico_portal_data_${PortalState.patientId}`, JSON.stringify(data));
        
        // Sincronizar evaluaciones y moodLog a las claves globales que lee app.js
        if (PortalState.patientId) {
            localStorage.setItem(`psico_portal_results_${PortalState.patientId}`, JSON.stringify(PortalState.evaluations));
            localStorage.setItem(`psico_portal_mood_${PortalState.patientId}`, JSON.stringify(PortalState.moodLog));
            localStorage.setItem(`psico_portal_cbt_${PortalState.patientId}`, JSON.stringify(PortalState.cbtRecords));
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

