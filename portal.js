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
    appointments: [],
    activeCrisisAlert: false,
    currentFilter: 'pending',
    // --- PORTAL PACIENTES KID (PSICO KIDS SPACE) ---
    isKidMode: false,
    kidStars: 0,
    kidCoins: 50,
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
    kidSensation: null,
    kidBubblesPopped: 0,
    kidCalmCycles: 0,
    kidCalmTechnique: 'balloon',
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
                    if (data.tasks) {
                        PortalState.tasks = data.tasks.map(t => ({
                            ...t,
                            id: t.id,
                            patientId: t.patient_id || t.patientId || PortalState.patientId,
                            patient_id: t.patient_id || t.patientId || PortalState.patientId,
                            title: t.title || t.text,
                            description: t.description || '',
                            dueDate: t.dueDate || t.deadline || null,
                            deadline: t.deadline || t.dueDate || null,
                            completed: Boolean(t.completed),
                            completedAt: t.completed_at || t.completedAt || null
                        }));
                    }
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
                    if (data.therapistInfo) PortalState.therapistInfo = data.therapistInfo;
                    if (data.documents) PortalState.documents = data.documents;
                    if (data.paymentMethods) PortalState.paymentMethods = data.paymentMethods;
                    if (data.paymentReports) PortalState.paymentReports = data.paymentReports;
                    if (data.patient) {
                        PortalState.patientProfile = data.patient;
                        if (data.patient.name) PortalState.patientName = data.patient.name;
                    }

                    // Extraer palabra del día si existe en el último mood log de hoy
                    if (Array.isArray(data.moodLogs) && data.moodLogs.length > 0) {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const todayMood = data.moodLogs.find(m => (m.created_at || m.date || '').startsWith(todayStr) && m.word);
                        if (todayMood && todayMood.word) {
                            PortalState.dailyWord = todayMood.word;
                            const inputWord = document.getElementById('inputDailyWord');
                            const tagWord = document.getElementById('dailyWordSavedTag');
                            if (inputWord) inputWord.value = todayMood.word;
                            if (tagWord) {
                                tagWord.textContent = `"${todayMood.word}" registrada ✓`;
                                tagWord.style.display = 'inline-block';
                            }
                        }
                    }

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

                    if (Array.isArray(data.appointments)) {
                        PortalState.appointments = data.appointments.map(a => ({
                            id: a.id,
                            patientId: a.patientId || a.patient_id || PortalState.patientId,
                            date: a.date,
                            time: a.time,
                            duration: Number(a.duration) || 50,
                            status: a.status || 'agendada',
                            attendanceConfirmed: Boolean(a.attendanceConfirmed || a.attendance_confirmed || a.status === 'confirmada'),
                            type: a.type || 'Online',
                            notes: a.notes || '',
                            createdAt: a.createdAt || new Date().toISOString()
                        }));

                        // Sincronizar el puente local con el estatus del servidor para mantener consistencia
                        try {
                            const bridge = JSON.parse(localStorage.getItem('psico_portal_appointments_bridge') || '{}');
                            let bridgeChanged = false;
                            data.appointments.forEach(sa => {
                                if (sa && sa.id && bridge[sa.id]) {
                                    if (bridge[sa.id].status !== sa.status) {
                                        bridge[sa.id].status = sa.status;
                                        bridgeChanged = true;
                                    }
                                }
                            });
                            if (bridgeChanged) {
                                localStorage.setItem('psico_portal_appointments_bridge', JSON.stringify(bridge));
                            }
                        } catch (e) {}
                    }
                    if (typeof mergeAppointmentsFromBridge === 'function') mergeAppointmentsFromBridge();
                    if (typeof renderNextSession === 'function') renderNextSession();
                    if (typeof renderTherapistCard === 'function') renderTherapistCard();
                    if (typeof renderDocumentsView === 'function') renderDocumentsView();
                    if (typeof renderPaymentsView === 'function') renderPaymentsView();
                    if (typeof renderProfileView === 'function') renderProfileView();

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
        const patients = loadPortalPatients();
        const pObj = patients.find(p => p.id === PortalState.patientId);

        if (stored) {
            const data = JSON.parse(stored);
            PortalState.tasks = data.tasks || [];
            PortalState.evaluations = data.evaluations || [];
            PortalState.moodLog = data.moodLog || [];
            PortalState.cbtRecords = data.cbtRecords || [];
            PortalState.appointments = data.appointments || [];
            PortalState.activeCrisisAlert = Boolean(data.activeCrisisAlert);
            PortalState.kidStars = typeof data.kidStars === 'number' ? data.kidStars : 0;
            PortalState.kidCoins = typeof data.kidCoins === 'number' ? data.kidCoins : 50;
            PortalState.kidAvatar = data.kidAvatar || PortalState.kidAvatar;
            PortalState.kidActivities = data.kidActivities || [];
            PortalState.therapistOccupiedSlots = data.therapistOccupiedSlots || [];
            PortalState.documents = data.documents || PortalState.documents || [];
            PortalState.paymentReports = data.paymentReports || PortalState.paymentReports || [];
            PortalState.paymentMethods = data.paymentMethods || PortalState.paymentMethods || [];
            PortalState.patientProfile = data.patientProfile || PortalState.patientProfile || pObj || {};
            PortalState.therapistInfo = data.therapistInfo || PortalState.therapistInfo || null;
            PortalState.dailyWord = data.dailyWord || PortalState.dailyWord || '';
        } else {
            PortalState.tasks = [];
            PortalState.evaluations = [];
            PortalState.moodLog = [];
            PortalState.cbtRecords = [];
            PortalState.appointments = [];
            PortalState.activeCrisisAlert = false;
            PortalState.kidStars = 0;
            PortalState.kidCoins = 50;
            PortalState.kidActivities = [];
            PortalState.documents = PortalState.documents || [];
            PortalState.paymentReports = PortalState.paymentReports || [];
            PortalState.paymentMethods = PortalState.paymentMethods || [];
            PortalState.patientProfile = PortalState.patientProfile || pObj || {};
        }

        // Cargar formas de pago personalizadas del terapeuta desde localStorage si existen
        try {
            const customMethods = JSON.parse(localStorage.getItem('psico_therapist_payment_methods') || 'null');
            if (Array.isArray(customMethods) && customMethods.length > 0) {
                PortalState.paymentMethods = customMethods;
            }
        } catch (e) {}

        if (typeof mergeAppointmentsFromBridge === 'function') mergeAppointmentsFromBridge();
        if (typeof renderNextSession === 'function') renderNextSession();
        if (typeof renderTherapistCard === 'function') renderTherapistCard();
        if (typeof renderDocumentsView === 'function') renderDocumentsView();
        if (typeof renderPaymentsView === 'function') renderPaymentsView();
        if (typeof renderProfileView === 'function') renderProfileView();

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
            appointments: PortalState.appointments,
            activeCrisisAlert: PortalState.activeCrisisAlert,
            kidStars: PortalState.kidStars,
            kidCoins: PortalState.kidCoins,
            kidAvatar: PortalState.kidAvatar,
            kidActivities: PortalState.kidActivities,
            therapistOccupiedSlots: PortalState.therapistOccupiedSlots || [],
            documents: PortalState.documents || [],
            paymentReports: PortalState.paymentReports || [],
            paymentMethods: PortalState.paymentMethods || [],
            patientProfile: PortalState.patientProfile || {},
            therapistInfo: PortalState.therapistInfo || null,
            dailyWord: PortalState.dailyWord || '',
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(`psico_portal_data_${PortalState.patientId}`, JSON.stringify(data));
        
        // Sincronizar evaluaciones y moodLog a las claves globales que lee app.js
        if (PortalState.patientId) {
            localStorage.setItem(`psico_portal_results_${PortalState.patientId}`, JSON.stringify(PortalState.evaluations));
            localStorage.setItem(`psico_portal_mood_${PortalState.patientId}`, JSON.stringify(PortalState.moodLog));
            localStorage.setItem(`psico_portal_cbt_${PortalState.patientId}`, JSON.stringify(PortalState.cbtRecords));
            localStorage.setItem(`psico_portal_payments_${PortalState.patientId}`, JSON.stringify(PortalState.paymentReports || []));
            localStorage.setItem(`psico_portal_kid_${PortalState.patientId}`, JSON.stringify({
                avatar: PortalState.kidAvatar,
                stars: PortalState.kidStars,
                coins: PortalState.kidCoins,
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
        const patientTasks = Object.values(bridge).filter(t => String(t.patientId || t.patient_id) === String(PortalState.patientId));
        
        let localTasks = [];
        try {
            const stored = localStorage.getItem(`psico_portal_data_${PortalState.patientId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed.tasks)) localTasks = parsed.tasks;
            }
        } catch (e) {}

        const allAvailable = [...patientTasks];
        localTasks.forEach(lt => {
            if (!allAvailable.some(at => at.id === lt.id)) allAvailable.push(lt);
        });

        if (allAvailable.length === 0) {
            return;
        }
        const currentTasks = PortalState.tasks || [];
        const mergedTasks = allAvailable.map(task => {
            const existing = currentTasks.find(t => t.id === task.id);
            return {
                ...task,
                id: task.id,
                patientId: task.patientId || task.patient_id || PortalState.patientId,
                patient_id: task.patient_id || task.patientId || PortalState.patientId,
                title: task.title || task.text,
                description: task.description || '',
                dueDate: task.dueDate || task.deadline || null,
                deadline: task.deadline || task.dueDate || null,
                completed: existing ? existing.completed : Boolean(task.completed),
                completedAt: existing ? existing.completedAt : (task.completedAt || null)
            };
        });
        PortalState.tasks = mergedTasks;
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
    const target = document.getElementById(`view${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (target) target.classList.add('active');
    const navBtn = document.querySelector(`.nav-btn[data-view="${viewName}"]`);
    if (navBtn) navBtn.classList.add('active');
    if (viewName === 'sessions') renderSessionsView();
    if (viewName === 'tasks') renderTasks();
    if (viewName === 'tests') updateTestsLastResults();
    if (viewName === 'progress') updateProgress();
    if (viewName === 'home') {
        renderNextSession();
        if (typeof renderTherapistCard === 'function') renderTherapistCard();
    }
    if (viewName === 'documents' && typeof renderDocumentsView === 'function') renderDocumentsView();
    if (viewName === 'payments' && typeof renderPaymentsView === 'function') renderPaymentsView();
    if (viewName === 'profile' && typeof renderProfileView === 'function') renderProfileView();
}

function updateDailyReflection() {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const reflection = REFLECTIONS[dayOfYear % REFLECTIONS.length];
    document.getElementById('dailyReflection').textContent = reflection;
}

function selectMood(value) {
    document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    document.querySelector(`.mood-btn[data-mood="${value}"]`).classList.add('selected');
    const currentWord = (document.getElementById('inputDailyWord')?.value || PortalState.dailyWord || '').trim();

    const moodLog = {
        id: generateId(),
        value: value,
        word: currentWord,
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
            energy: 3,
            word: currentWord
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
        const pId = task.patientId || task.patient_id || PortalState.patientId;
        const taskKey = `${pId}_${task.id}`;
        if (bridge[taskKey]) {
            bridge[taskKey].completed = task.completed;
            bridge[taskKey].completedAt = task.completedAt;
        } else {
            bridge[taskKey] = {
                ...task,
                patientId: pId,
                patient_id: pId,
                completed: task.completed,
                completedAt: task.completedAt
            };
        }
        localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));

        const stored = localStorage.getItem(`psico_portal_data_${pId}`);
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed.tasks)) {
                const tIdx = parsed.tasks.findIndex(t => t.id === task.id);
                if (tIdx >= 0) {
                    parsed.tasks[tIdx].completed = task.completed;
                    parsed.tasks[tIdx].completedAt = task.completedAt;
                }
                localStorage.setItem(`psico_portal_data_${pId}`, JSON.stringify(parsed));
            }
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
    if (PortalState.isKidMode) {
        triggerKidSosHelp(reason);
        return;
    }
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
    PortalState.activeCrisisAlert = false;
    savePatientData();
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
    if (starsEl) starsEl.textContent = PortalState.kidStars || 0;

    const coinsEl = document.getElementById('kidCoinsCount');
    if (coinsEl) coinsEl.textContent = PortalState.kidCoins || 50;
    
    // Configurar avatar en home y header
    updateKidAvatarDisplays();

    // Actualizar nombre en saludo infantil
    const greetingNameEl = document.getElementById('kidGreetingName');
    if (greetingNameEl) {
        greetingNameEl.textContent = (PortalState.patientName || 'Explorador').split(' ')[0];
    }

    const greetingMsgEl = document.getElementById('kidGreetingMsg');
    if (greetingMsgEl) {
        greetingMsgEl.textContent = 'Hoy podemos descubrir cosas maravillosas sobre tu mundo interior y divertirnos explorando.';
    }

    // Actualizar progreso de Bento cards
    updateKidBentoProgress();

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
    const starsBadge = document.getElementById('kidStarsBadge');
    const coinsBadge = document.getElementById('kidCoinsBadge');
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
        if (starsBadge) starsBadge.style.display = 'inline-flex';
        if (coinsBadge) coinsBadge.style.display = 'inline-flex';
        if (stdNav) stdNav.style.display = 'none';
        if (kidNav) kidNav.style.display = 'flex';
        switchKidView('kid-home');
        KidAudioEffects.playSuccess();
        KidConfetti.burst(window.innerWidth / 2, 200, 30);
    } else {
        document.body.classList.remove('kid-mode-active');
        if (soundBtn) soundBtn.style.display = 'none';
        if (starsBadge) starsBadge.style.display = 'none';
        if (coinsBadge) coinsBadge.style.display = 'none';
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
    if (viewKey === 'kid-avatar') updateKidAvatarDisplays();
    if (viewKey === 'kid-home') updateKidBentoProgress();
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

    // Campo de texto de nombre editable si existe
    const customNameInput = document.getElementById('kidAvatarCustomName');
    if (customNameInput && !customNameInput.value) {
        customNameInput.value = avatar.name || '';
    }

    // Header avatar
    const headerAvatar = document.getElementById('headerAvatar');
    if (headerAvatar && PortalState.isKidMode) {
        headerAvatar.textContent = avatar.emoji;
    }
}

function updateKidBentoProgress() {
    const pWeather = document.getElementById('bentoProgressWeather');
    if (pWeather) {
        if (PortalState.kidWeather) {
            pWeather.textContent = '¡Completado hoy! ✨';
            pWeather.classList.add('completed');
        } else {
            pWeather.textContent = 'Explorar hoy';
            pWeather.classList.remove('completed');
        }
    }

    const pAvatar = document.getElementById('bentoProgressAvatar');
    if (pAvatar) {
        pAvatar.textContent = (PortalState.kidAvatar && PortalState.kidAvatar.name) ? 'Personalizado 🌟' : 'Personalizar';
        pAvatar.classList.add('completed');
    }

    const pBubbles = document.getElementById('bentoProgressBubbles');
    if (pBubbles) {
        const count = PortalState.kidBubblesPopped || 0;
        pBubbles.textContent = count > 0 ? `${count} soltadas 🫧` : 'Por jugar';
        if (count > 0) pBubbles.classList.add('completed');
    }

    const pDrawing = document.getElementById('bentoProgressDrawing');
    if (pDrawing) {
        const drawingsCount = (PortalState.kidActivities || []).filter(a => a.activity_type === 'drawing').length;
        pDrawing.textContent = drawingsCount > 0 ? `${drawingsCount} creados 🎨` : 'Lienzo listo';
        if (drawingsCount > 0) pDrawing.classList.add('completed');
    }

    const pCalm = document.getElementById('bentoProgressCalm');
    if (pCalm) {
        const cycles = PortalState.kidCalmCycles || 0;
        pCalm.textContent = cycles > 0 ? `${cycles} respiraciones 🍃` : 'Sin empezar';
        if (cycles > 0) pCalm.classList.add('completed');
    }
}

function awardKidStars(amount) {
    PortalState.kidStars = (PortalState.kidStars || 0) + (amount || 1);
    const starsEl = document.getElementById('kidStarsCount');
    if (starsEl) starsEl.textContent = PortalState.kidStars;
    savePatientData();
    updateKidBentoProgress();
}

function awardKidCoins(amount) {
    PortalState.kidCoins = (PortalState.kidCoins || 0) + (amount || 5);
    const coinsEl = document.getElementById('kidCoinsCount');
    if (coinsEl) coinsEl.textContent = PortalState.kidCoins;
    savePatientData();
}

// ----------------------------------------------------
// 1. CLIMA EMOCIONAL & MAPA SOMÁTICO CORPORAL
// ----------------------------------------------------
const KID_WEATHER_QUESTIONS = {
    sunny: '☀️ ¡Qué lindo que te sientas alegre! ¿Qué fue lo más bonito que pasó hoy?',
    partly_cloudy: '🌤️ Tranquilidad y calma. ¿Qué te gusta hacer cuando te sientes en paz?',
    rainbow: '🌈 ¡Qué energía tan mágica y colorida! ¿Qué juego o idea tienes en mente?',
    rainy: '🌧️ A veces llueve por dentro y es completamente normal. ¿Quieres contarme qué pasó?',
    storm: '⚡ Sentir enojo o frustración es natural. ¿Qué hizo que la tormenta llegara?',
    tornado: '🌪️ Si sientes muchas cosas revueltas o confusión, estamos aquí contigo. ¿Cómo te ayudamos?'
};

function selectKidWeather(weatherKey) {
    PortalState.kidWeather = weatherKey;
    document.querySelectorAll('.kid-weather-card-v2').forEach(btn => {
        btn.classList.toggle('selected', btn.getAttribute('data-weather') === weatherKey);
    });

    const reflectionBox = document.getElementById('kidWeatherReflectionBox');
    const promptText = document.getElementById('kidWeatherPromptText');
    if (reflectionBox) {
        reflectionBox.style.display = 'block';
    }
    if (promptText && KID_WEATHER_QUESTIONS[weatherKey]) {
        promptText.textContent = KID_WEATHER_QUESTIONS[weatherKey];
    }

    KidAudioEffects.playBoing();
}

function selectKidThoughtChip(chipText) {
    const input = document.getElementById('kidWeatherStory');
    if (input) {
        input.value = chipText;
    }
    document.querySelectorAll('.kid-thought-chip').forEach(chip => {
        chip.classList.toggle('active', chip.textContent.trim() === chipText.trim());
    });
    KidAudioEffects.playDing();
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
            hands: '✊ ¡Mis manitas quieren apretar o moverse con mucha energía!',
            feet: '👟 ¡Mis pies quieren saltar, correr o quedarse quietecitos!'
        };
        speechEl.textContent = zonePhrases[zoneKey] || '✨ ¡Tu cuerpo te da señales mágicas!';
    }

    KidAudioEffects.playBoing();
}

function selectKidSensation(sensationKey, label) {
    PortalState.kidSensation = { key: sensationKey, label: label };
    document.querySelectorAll('.kid-sensation-pill').forEach(pill => {
        pill.classList.toggle('selected', pill.getAttribute('data-sensation') === sensationKey);
    });
    KidAudioEffects.playDing();
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
        hands: 'En las manitas ✊',
        feet: 'En los pies 👟'
    };

    const storyInput = document.getElementById('kidWeatherStory');
    const reflectionStory = storyInput ? storyInput.value.trim() : '';

    const payloadData = {
        weather: PortalState.kidWeather,
        weatherLabel: weatherNames[PortalState.kidWeather] || PortalState.kidWeather,
        bodyZone: PortalState.kidBodyZone || 'general',
        bodyZoneLabel: zoneNames[PortalState.kidBodyZone] || 'En todo el cuerpo',
        sensation: PortalState.kidSensation || null,
        note: reflectionStory || null,
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

    // Sumar +1 Estrella ⭐ y +5 Monedas 🪙 con confeti
    awardKidStars(1);
    awardKidCoins(5);
    KidAudioEffects.playSuccess();
    KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.4, 45);

    // Enviar al backend PostgreSQL con cola offline
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'weather_body',
            data: payloadData
        });
    }

    savePatientData();
    updateKidBentoProgress();
    showToast('✨ ¡Genial! Tu clima emocional llegó a tu terapeuta (+1 ⭐, +5 🪙)', 'success');
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

    const customNameInput = document.getElementById('kidAvatarCustomName');
    if (customNameInput) {
        customNameInput.value = name;
    }

    KidAudioEffects.playBoing();
}

function pickAvatarAura(auraClass) {
    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.aura = auraClass;

    document.querySelectorAll('.aura-sparkle-btn').forEach(b => {
        b.classList.toggle('active', b.classList.contains(auraClass + '-btn') || b.getAttribute('data-aura') === auraClass);
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
    const prefixes = ['Super', 'Capitán', 'Príncipe', 'Princesa', 'Maestro', 'Explorador', 'Comandante', 'Mago', 'Guardián', 'Valiente'];
    const suffixes = ['de las Galaxias', 'del Relámpago', 'de las Nubes', 'del Arcoíris', 'del Fuego Mágico', 'de las Estrellas', 'de la Calma', 'del Viento', 'del Bosque', 'de los Sueños'];
    const baseName = (PortalState.kidAvatar && PortalState.kidAvatar.name) ? PortalState.kidAvatar.name.split(' ')[0] : 'Compañero';

    const p = prefixes[Math.floor(Math.random() * prefixes.length)];
    const s = suffixes[Math.floor(Math.random() * suffixes.length)];
    const randomTitle = `${p} ${baseName} ${s}`;

    if (!PortalState.kidAvatar) PortalState.kidAvatar = {};
    PortalState.kidAvatar.name = randomTitle;

    const nameEl = document.getElementById('kidAvatarDisplayName');
    if (nameEl) nameEl.textContent = randomTitle;

    const customNameInput = document.getElementById('kidAvatarCustomName');
    if (customNameInput) customNameInput.value = randomTitle;

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
    const customNameInput = document.getElementById('kidAvatarCustomName');
    if (customNameInput && customNameInput.value.trim()) {
        PortalState.kidAvatar.name = customNameInput.value.trim();
    }

    updateKidAvatarDisplays();
    awardKidStars(1);
    awardKidCoins(5);
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
    updateKidBentoProgress();
    showToast('🌟 ¡Avatar guardado! Te acompañará en todo tu espacio mágico (+1 ⭐, +5 🪙)', 'success');
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
    'Miedo a la oscuridad 🔦',
    'Vergüenza de hablar 🗣️',
    'Pensar que no puedo hacerlo 🧱'
];

function initKidBubbles() {
    const playfield = document.getElementById('kidBubblesPlayfield');
    if (!playfield) return;

    const countEl = document.getElementById('kidBubblesPoppedCount');
    if (countEl) countEl.textContent = PortalState.kidBubblesPopped || 0;

    // Solo rellenar si está vacío
    if (playfield.children.length === 0) {
        DEFAULT_KID_WORRIES.slice(0, 7).forEach(worry => {
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

    // Sonido pop y confeti en las coordenadas del toque
    KidAudioEffects.playPop();
    const clickX = ev && ev.clientX ? ev.clientX : window.innerWidth / 2;
    const clickY = ev && ev.clientY ? ev.clientY : window.innerHeight / 2;
    KidConfetti.burst(clickX, clickY, 25);

    PortalState.kidBubblesPopped = (PortalState.kidBubblesPopped || 0) + 1;
    const countEl = document.getElementById('kidBubblesPoppedCount');
    if (countEl) countEl.textContent = PortalState.kidBubblesPopped;

    // Cada burbuja da +1 moneda 🪙
    awardKidCoins(1);

    setTimeout(() => {
        if (el.parentNode) el.parentNode.removeChild(el);

        // Si se vacía el campo, rellenar de nuevo y celebrar
        const playfield = document.getElementById('kidBubblesPlayfield');
        if (playfield && playfield.children.length === 0) {
            initKidBubbles();
            awardKidStars(1);
            awardKidCoins(10);
            KidAudioEffects.playSuccess();
            KidConfetti.burst(window.innerWidth / 2, window.innerHeight / 2, 50);
            showToast('🎉 ¡Has soltado todas las burbujas! ¡Gran trabajo liberando tensiones! (+1 ⭐, +10 🪙)', 'success');
        }
    }, 280);

    // Registrar en actividad local
    const activityRecord = {
        id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        activity_type: 'bubble_popped',
        data: {
            worryText,
            totalPopped: PortalState.kidBubblesPopped,
            poppedAt: new Date().toISOString()
        },
        created_at: new Date().toISOString()
    };
    PortalState.kidActivities.unshift(activityRecord);
    savePatientData();
    updateKidBentoProgress();

    // Notificar al terapeuta
    if (PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/kid/activity', {
            patientToken: PortalState.portalToken,
            activityType: 'bubble_popped',
            data: activityRecord.data
        });
    }
}

function skipCurrentBubble() {
    const playfield = document.getElementById('kidBubblesPlayfield');
    if (playfield && playfield.children.length > 0) {
        const first = playfield.firstElementChild;
        first.style.opacity = '0.3';
        first.style.transform = 'translateY(80px) scale(0.6)';
        setTimeout(() => {
            if (first.parentNode) {
                first.parentNode.removeChild(first);
                playfield.appendChild(first);
                first.style.opacity = '1';
                first.style.transform = '';
            }
        }, 300);
        KidAudioEffects.playBoing();
        showToast('🍃 ¡No pasa nada! La dejamos flotar para después sin ninguna prisa.', 'info');
    }
}

function openCustomBubbleModal() {
    const modal = document.getElementById('kidCustomBubbleModal');
    if (modal) {
        modal.style.display = 'flex';
        const input = document.getElementById('kidCustomBubbleInput');
        if (input) {
            input.value = '';
            setTimeout(() => input.focus(), 150);
        }
    }
}

function closeCustomBubbleModal() {
    const modal = document.getElementById('kidCustomBubbleModal');
    if (modal) modal.style.display = 'none';
}

function confirmCustomBubble() {
    const input = document.getElementById('kidCustomBubbleInput');
    const text = input ? input.value.trim() : '';
    if (!text) {
        showToast('Escribe algo cortito para poner en tu burbuja 🫧', 'warning');
        return;
    }
    const playfield = document.getElementById('kidBubblesPlayfield');
    if (playfield) {
        const newBubble = createBubbleElement(text);
        playfield.insertBefore(newBubble, playfield.firstChild);
        KidAudioEffects.playDing();
        closeCustomBubbleModal();
        showToast('🫧 ¡Burbuja lista! Dale un toque cuando quieras soltarla.', 'success');
    }
}

function promptCustomBubble() {
    openCustomBubbleModal();
}

// ----------------------------------------------------
// 4. EL LIENZO MÁGICO (HTML5 CANVAS CON DESHACER)
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
    selectedStamp: null,
    undoStack: []
};

function saveCanvasSnapshot() {
    if (!kidCanvasState.ctx || !kidCanvasState.canvas) return;
    try {
        const snap = kidCanvasState.ctx.getImageData(0, 0, kidCanvasState.canvas.width, kidCanvasState.canvas.height);
        kidCanvasState.undoStack.push(snap);
        if (kidCanvasState.undoStack.length > 20) {
            kidCanvasState.undoStack.shift();
        }
    } catch (e) {
        console.warn('Canvas snapshot skipped:', e);
    }
}

function undoKidCanvas() {
    if (kidCanvasState.undoStack.length === 0) {
        showToast('¡No hay más trazos anteriores para deshacer! 🎨', 'info');
        return;
    }
    const prevSnap = kidCanvasState.undoStack.pop();
    if (prevSnap && kidCanvasState.ctx) {
        kidCanvasState.ctx.putImageData(prevSnap, 0, 0);
        KidAudioEffects.playBoing();
    }
}

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
        saveCanvasSnapshot();
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
        saveCanvasSnapshot();
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
        const bg = btn.style.backgroundColor || '';
        if (btn.getAttribute('data-color') === hexColor || bg.includes(hexColor.toLowerCase())) {
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
            saveCanvasSnapshot();
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

    const storyInput = document.getElementById('kidDrawingStoryInput');
    const drawingStory = storyInput ? storyInput.value.trim() : '';

    const payloadData = {
        imageDataUrl: drawingDataUrl,
        story: drawingStory || null,
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
    awardKidCoins(10);
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
    updateKidBentoProgress();
    showToast('🎨✨ ¡Precioso dibujo! Ya está en el consultorio de tu terapeuta (+2 ⭐, +10 🪙)', 'success');
}

// ----------------------------------------------------
// 5. JARDÍN DE LA CALMA (RESPIRACIÓN MULTI-TÉCNICA)
// ----------------------------------------------------
let calmBreathingTimer = null;
let calmBreathingActive = false;
let calmPhaseSeconds = 0;
let calmCurrentTechnique = 'balloon'; // balloon | flower | turtle

function selectCalmTechnique(techKey) {
    if (calmBreathingActive) {
        stopBalloonBreathing();
    }
    calmCurrentTechnique = techKey;
    PortalState.kidCalmTechnique = techKey;

    document.querySelectorAll('.calm-tech-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tech') === techKey);
    });

    const balloonEl = document.getElementById('kidBalloon');
    const flowerEl = document.getElementById('kidFlower');
    const turtleEl = document.getElementById('kidTurtle');

    if (balloonEl) balloonEl.style.display = techKey === 'balloon' ? 'flex' : 'none';
    if (flowerEl) flowerEl.style.display = techKey === 'flower' ? 'flex' : 'none';
    if (turtleEl) turtleEl.style.display = techKey === 'turtle' ? 'flex' : 'none';

    const titleEl = document.getElementById('kidCalmTechTitle');
    const descEl = document.getElementById('kidCalmTechDesc');

    if (techKey === 'balloon') {
        if (titleEl) titleEl.textContent = 'El Globo de la Calma';
        if (descEl) descEl.textContent = 'Inhala para inflar el globo y exhala despacito para desinflarlo.';
    } else if (techKey === 'flower') {
        if (titleEl) titleEl.textContent = 'La Flor Mágica';
        if (descEl) descEl.textContent = 'Huele la flor despacio, sostén su rico aroma y sopla suavemente.';
    } else if (techKey === 'turtle') {
        if (titleEl) titleEl.textContent = 'La Tortuga Serena';
        if (descEl) descEl.textContent = 'Asómate al mundo tomando aire y guárdate en tu caparazón tranquilo soltando el aire.';
    }

    KidAudioEffects.playBoing();
}

function toggleBalloonBreathing() {
    if (calmBreathingActive) {
        pauseBalloonBreathing();
    } else {
        startBalloonBreathing();
    }
}

function startBalloonBreathing() {
    calmBreathingActive = true;
    const btn = document.getElementById('btnToggleBalloon');
    if (btn) btn.innerHTML = '<span class="btn-puffy-icon">⏸️</span> <span class="btn-puffy-text">Pausar</span>';

    KidAudioEffects.playTone(392, 'sine', 0.5, 0.2); // Sol suave
    runCalmCycle();
}

function pauseBalloonBreathing() {
    calmBreathingActive = false;
    if (calmBreathingTimer) {
        clearInterval(calmBreathingTimer);
        calmBreathingTimer = null;
    }
    const btn = document.getElementById('btnToggleBalloon');
    if (btn) btn.innerHTML = '<span class="btn-puffy-icon">▶️</span> <span class="btn-puffy-text">Continuar</span>';
    const instruction = document.getElementById('kidBreathingInstruction');
    if (instruction) instruction.textContent = 'Pausado. ¡Puedes respirar normal y continuar cuando quieras!';
}

function stopBalloonBreathing(isFinished) {
    calmBreathingActive = false;
    if (calmBreathingTimer) {
        clearInterval(calmBreathingTimer);
        calmBreathingTimer = null;
    }

    const balloon = document.getElementById('kidBalloon');
    const flower = document.getElementById('kidFlower');
    const turtle = document.getElementById('kidTurtle');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const btn = document.getElementById('btnToggleBalloon');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    if (balloon) balloon.classList.remove('inhale', 'exhale');
    if (flower) flower.classList.remove('inhale', 'exhale');
    if (turtle) turtle.classList.remove('inhale', 'exhale');

    if (eyes) eyes.innerHTML = '<span class="eye left">●</span><span class="eye right">●</span>';
    if (mouth) mouth.textContent = '‿';
    if (instruction) instruction.textContent = isFinished ? '¡Excelente trabajo! Has completado tus momentos de calma.' : 'Puedes volver a respirar cuando quieras.';
    if (timer) timer.textContent = '0s';
    if (btn) btn.innerHTML = '<span class="btn-puffy-icon">🎈</span> <span class="btn-puffy-text">¡Comenzar!</span>';

    if (isFinished) {
        awardKidStars(1);
        awardKidCoins(5);
        KidAudioEffects.playSuccess();
        KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 35);
        showToast('🌟 ¡Paz y serenidad completadas! (+1 ⭐, +5 🪙)', 'success');
    }
}

function runCalmCycle() {
    if (!calmBreathingActive) return;

    const balloon = document.getElementById('kidBalloon');
    const flower = document.getElementById('kidFlower');
    const turtle = document.getElementById('kidTurtle');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    // Fase 1: Inhalar (4s)
    calmPhaseSeconds = 4;
    if (balloon) { balloon.classList.remove('exhale'); balloon.classList.add('inhale'); }
    if (flower) { flower.classList.remove('exhale'); flower.classList.add('inhale'); }
    if (turtle) { turtle.classList.remove('exhale'); turtle.classList.add('inhale'); }

    if (eyes) eyes.innerHTML = '<span class="eye left">◉</span><span class="eye right">◉</span>';
    if (mouth) mouth.textContent = 'o';

    if (calmCurrentTechnique === 'flower') {
        if (instruction) instruction.textContent = '🌸 Inhala por la nariz... huele el aroma de la flor mágica';
    } else if (calmCurrentTechnique === 'turtle') {
        if (instruction) instruction.textContent = '🐢 Asómate al mundo... tomando aire suavemente';
    } else {
        if (instruction) instruction.textContent = '🌬️ Inhala suavemente por la nariz... llenando el globo';
    }

    if (timer) timer.textContent = `${calmPhaseSeconds}s`;
    KidAudioEffects.playTone(440, 'sine', 1.0, 0.15); // Tono suave de inhalación

    let elapsed = 0;
    calmBreathingTimer = setInterval(() => {
        if (!calmBreathingActive) return;
        elapsed++;
        const remaining = calmPhaseSeconds - elapsed;
        if (timer) timer.textContent = `${Math.max(0, remaining)}s`;

        if (elapsed >= calmPhaseSeconds) {
            clearInterval(calmBreathingTimer);
            startCalmExhale();
        }
    }, 1000);
}

function startCalmExhale() {
    if (!calmBreathingActive) return;

    const balloon = document.getElementById('kidBalloon');
    const flower = document.getElementById('kidFlower');
    const turtle = document.getElementById('kidTurtle');
    const instruction = document.getElementById('kidBreathingInstruction');
    const timer = document.getElementById('kidBreathingTimer');
    const eyes = document.getElementById('kidBalloonEyes');
    const mouth = document.getElementById('kidBalloonMouth');

    calmPhaseSeconds = 6;
    if (balloon) { balloon.classList.remove('inhale'); balloon.classList.add('exhale'); }
    if (flower) { flower.classList.remove('inhale'); flower.classList.add('exhale'); }
    if (turtle) { turtle.classList.remove('inhale'); turtle.classList.add('exhale'); }

    if (eyes) eyes.innerHTML = '<span class="eye left">^</span><span class="eye right">^</span>';
    if (mouth) mouth.textContent = '‿';

    if (calmCurrentTechnique === 'flower') {
        if (instruction) instruction.textContent = '🍃 Sopla despacio por la boca... acariciando los pétalos';
    } else if (calmCurrentTechnique === 'turtle') {
        if (instruction) instruction.textContent = '🐢 Guárdate en tu caparazón seguro... soltando el aire despacito';
    } else {
        if (instruction) instruction.textContent = '🍃 Exhala despacito por la boca... soltando el aire como una pluma';
    }

    if (timer) timer.textContent = `${calmPhaseSeconds}s`;
    KidAudioEffects.playTone(330, 'sine', 1.5, 0.12); // Tono de exhalación

    let elapsed = 0;
    calmBreathingTimer = setInterval(() => {
        if (!calmBreathingActive) return;
        elapsed++;
        const remaining = calmPhaseSeconds - elapsed;
        if (timer) timer.textContent = `${Math.max(0, remaining)}s`;

        if (elapsed >= calmPhaseSeconds) {
            clearInterval(calmBreathingTimer);

            // Ciclo completado
            PortalState.kidCalmCycles = (PortalState.kidCalmCycles || 0) + 1;
            const cyclesEl = document.getElementById('kidCalmCycles');
            if (cyclesEl) cyclesEl.textContent = PortalState.kidCalmCycles;

            if (PortalState.kidCalmCycles % 3 === 0) {
                awardKidStars(1);
                awardKidCoins(5);
                KidAudioEffects.playSuccess();
                KidConfetti.burst(window.innerWidth / 2, window.innerHeight * 0.45, 30);
                showToast('⭐ ¡Superpoder de calma desbloqueado! 3 respiraciones completas (+1 ⭐, +5 🪙)', 'success');

                const calmRecord = {
                    id: 'act_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    activity_type: 'calm_breathing',
                    data: {
                        technique: calmCurrentTechnique,
                        cyclesCompleted: PortalState.kidCalmCycles,
                        timestamp: new Date().toISOString()
                    },
                    created_at: new Date().toISOString()
                };
                PortalState.kidActivities.unshift(calmRecord);
                savePatientData();
                updateKidBentoProgress();

                // Notificar al backend
                if (PortalState.portalToken) {
                    sendPortalPost('/api/v1/portal/kid/activity', {
                        patientToken: PortalState.portalToken,
                        activityType: 'calm_breathing',
                        data: calmRecord.data
                    });
                }
            }

            // Continuar con el siguiente ciclo
            runCalmCycle();
        }
    }, 1000);
}

// ----------------------------------------------------
// 6. ASISTENCIA INFANTIL RECONFORTANTE (SOS CHILD-FRIENDLY)
// ----------------------------------------------------
function triggerKidSosHelp(reason) {
    const modal = document.getElementById('kidCrisisModal');
    if (modal) {
        modal.style.display = 'flex';
    }
    KidAudioEffects.playDing();
}

function closeKidCrisisModal() {
    const modal = document.getElementById('kidCrisisModal');
    if (modal) modal.style.display = 'none';
    PortalState.activeCrisisAlert = false;
    savePatientData();
}

function alertKidAdultTalk() {
    alert('💛 Puedes acercarte a mamá, papá o la persona adulta que te cuida y decirles:\n\n"Necesito un abrazo o que hablemos un ratito."\n\n¡Siempre hay alguien que te quiere y te escucha!');
}

function goToKidCalmFromSos() {
    closeKidCrisisModal();
    switchKidView('kid-calm');
}

function sendKidSosToTherapist() {
    if (PortalState.patientId && PortalState.portalToken) {
        fetch('/api/v1/portal/crisis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patientId: PortalState.patientId,
                token: PortalState.portalToken,
                reason: 'El paciente infantil solicitó apoyo o contención desde el botón SOS infantil.'
            })
        }).catch(err => console.warn('Error enviando SOS infantil:', err));
    }
    closeKidCrisisModal();
    showToast('💛 Le hemos avisado a tu terapeuta. Recuerda también hablar con el adulto que te acompaña.', 'info');
}

function toggleKidAudioMute() {
    KidAudioEffects.enabled = !KidAudioEffects.enabled;
    const btn = document.getElementById('btnKidSoundToggle');
    if (btn) {
        btn.textContent = KidAudioEffects.enabled ? '🔊 Sonidos' : '🔇 Silencio';
    }
    if (KidAudioEffects.enabled) KidAudioEffects.playDing();
}

// ============================================
// GESTIÓN Y AGENDAMIENTO DE SESIONES EN EL PORTAL
// ============================================
function mergeAppointmentsFromBridge() {
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_appointments_bridge') || '{}');
        const patientAppointments = Object.values(bridge).filter(a => String(a.patientId || a.patient_id) === String(PortalState.patientId));
        patientAppointments.forEach(ba => {
            const idx = (PortalState.appointments || []).findIndex(a => String(a.id) === String(ba.id));
            if (idx >= 0) {
                const current = PortalState.appointments[idx];
                // Si la cita fue cancelada por el terapeuta en backend o en el puente, priorizar siempre estado cancelado
                let resolvedStatus = ba.status || current.status;
                if (current.status === 'cancelada' && ba.status !== 'reprogramada' && ba.status !== 'agendada') {
                    resolvedStatus = 'cancelada';
                } else if (ba.status === 'cancelada') {
                    resolvedStatus = 'cancelada';
                }
                PortalState.appointments[idx] = { 
                    ...current, 
                    ...ba,
                    status: resolvedStatus
                };
            } else {
                if (!PortalState.appointments) PortalState.appointments = [];
                PortalState.appointments.push(ba);
            }
        });
    } catch (e) {}
}

function renderNextSession() {
    const todayStr = new Date().toISOString().split('T')[0];
    const upcoming = (PortalState.appointments || [])
        .filter(a => a.status !== 'cancelada' && a.status !== 'completada' && (a.date >= todayStr || a.status === 'agendada'))
        .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

    const nextApp = upcoming[0];
    const nextSessionStatEl = document.getElementById('nextSessionText');
    const homeCardEl = document.getElementById('homeNextSessionCard');

    if (!nextApp) {
        if (nextSessionStatEl) nextSessionStatEl.textContent = 'Sin agendar';
        if (homeCardEl) {
            homeCardEl.innerHTML = `
                <div class="portal-session-banner-inner">
                    <div style="display: flex; align-items: center; gap: 14px;">
                        <div style="width: 44px; height: 44px; border-radius: 12px; background: rgba(59, 130, 246, 0.12); color: #2563eb; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                            📅
                        </div>
                        <div>
                            <strong style="display: block; font-size: 14.5px; color: var(--text-primary);">Próxima Sesión Terapéutica</strong>
                            <p style="margin: 2px 0 0 0; font-size: 12px; color: var(--text-secondary);">No tienes ninguna sesión programada en este momento.</p>
                        </div>
                    </div>
                    <button class="btn-primary" onclick="openScheduleSessionModal()" style="font-size: 12.5px; padding: 8px 16px; border-radius: var(--radius-sm); font-weight: 700;">
                        <i class="fas fa-calendar-plus" style="margin-right: 6px;"></i> Agendar Cita
                    </button>
                </div>
            `;
        }
        return;
    }

    const dateObj = new Date(nextApp.date + 'T12:00:00');
    const dayNum = isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
    const monthStr = isNaN(dateObj.getDate()) ? '' : dateObj.toLocaleDateString('es-ES', { month: 'short' });
    const yearNum = isNaN(dateObj.getFullYear()) ? '' : dateObj.getFullYear();
    const formattedDate = formatDateSafe(nextApp.date);

    if (nextSessionStatEl) {
        nextSessionStatEl.textContent = `${dayNum} ${monthStr}`;
    }

    const isOnline = (nextApp.type || 'Online').toLowerCase().includes('online');
    const therapist = PortalState.therapistName || 'Tu Terapeuta';

    if (homeCardEl) {
        homeCardEl.innerHTML = `
            <div class="portal-session-banner-inner">
                <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 240px;">
                    <div class="portal-session-date-box">
                        <span class="portal-session-day">${dayNum}</span>
                        <span class="portal-session-month">${monthStr}</span>
                        <span class="portal-session-year">${yearNum}</span>
                    </div>
                    <div class="portal-session-info-wrap">
                        <div class="portal-session-badge-row">
                            <span class="portal-session-badge portal-badge-agendada">
                                <i class="fas fa-calendar-check"></i> Próxima Sesión
                            </span>
                            <span class="portal-session-badge ${isOnline ? 'portal-badge-online' : 'portal-badge-presencial'}">
                                <i class="fas ${isOnline ? 'fa-video' : 'fa-building'}"></i> ${nextApp.type || 'Online'}
                            </span>
                        </div>
                        <h4 class="portal-session-title">${formattedDate} a las ${nextApp.time || '10:00'}</h4>
                        <p class="portal-session-subtitle">
                            <span><i class="fas fa-user-md"></i> ${therapist}</span>
                            <span>•</span>
                            <span><i class="far fa-clock"></i> ${nextApp.duration || 50} min</span>
                        </p>
                    </div>
                </div>

                <div class="portal-session-actions">
                    ${(nextApp.attendanceConfirmed || nextApp.status === 'confirmada') ? `
                        <span class="badge-attendance-confirmed" title="Asistencia confirmada para esta sesión">
                            <i class="fas fa-check-circle"></i> Asistencia confirmada
                        </span>
                    ` : `
                        <button class="btn-confirm-attendance" onclick="confirmSessionAttendance('${nextApp.id}')" title="Confirmar mi asistencia con mi psicólogo">
                            <i class="fas fa-check"></i> Confirmar Asistencia
                        </button>
                    `}
                    ${isOnline ? `
                        <button class="btn-telehealth-join" onclick="openTelehealthFromPortal('${nextApp.id}')" title="Ingresar a la sala cifrada de teleconsulta">
                            <i class="fas fa-video"></i> Unirme a Sesión
                        </button>
                    ` : ''}
                    <button class="btn-secondary" onclick="switchView('sessions')" style="font-size: 12px; padding: 8px 14px; border-radius: var(--radius-sm);">
                        Ver Sesiones
                    </button>
                </div>
            </div>
        `;
    }
}

function renderSessionsView() {
    renderNextSession();

    const container = document.getElementById('sessionsUpcomingContainer');
    const historyList = document.getElementById('sessionsHistoryList');
    const historyCountEl = document.getElementById('sessionsHistoryCount');

    const todayStr = new Date().toISOString().split('T')[0];
    const appointments = PortalState.appointments || [];

    const upcoming = appointments
        .filter(a => a.status !== 'cancelada' && a.status !== 'completada' && (a.date >= todayStr || a.status === 'agendada'))
        .sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));

    const history = appointments
        .filter(a => a.status === 'completada' || a.status === 'cancelada' || a.status === 'reprogramada' || a.date < todayStr)
        .sort((a, b) => new Date(b.date + 'T' + (b.time || '00:00')) - new Date(a.date + 'T' + (a.time || '00:00')));

    if (historyCountEl) {
        historyCountEl.textContent = `${history.length} sesión${history.length === 1 ? '' : 'es'}`;
    }

    if (container) {
        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="section-card" style="text-align: center; padding: 26px 20px;">
                    <div style="font-size: 38px; margin-bottom: 8px;">📅</div>
                    <h3 style="margin: 0 0 6px 0; font-size: 16px; color: var(--text-primary);">No tienes sesiones programadas</h3>
                    <p style="margin: 0 0 16px 0; font-size: 13px; color: var(--text-secondary); max-width: 380px; margin-inline: auto;">
                        Mantén la constancia en tu proceso terapéutico agendando tu próxima sesión de forma rápida y sencilla.
                    </p>
                    <button class="btn-primary" onclick="openScheduleSessionModal()" style="padding: 10px 20px; font-weight: 700; border-radius: var(--radius-sm);">
                        <i class="fas fa-calendar-plus" style="margin-right: 6px;"></i> Agendar mi Próxima Sesión
                    </button>
                </div>
            `;
        } else {
            const next = upcoming[0];
            const dateObj = new Date(next.date + 'T12:00:00');
            const dayNum = isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
            const monthStr = isNaN(dateObj.getDate()) ? '' : dateObj.toLocaleDateString('es-ES', { month: 'short' });
            const yearNum = isNaN(dateObj.getFullYear()) ? '' : dateObj.getFullYear();
            const isOnline = (next.type || 'Online').toLowerCase().includes('online');

            container.innerHTML = `
                <div class="portal-next-session-card" style="margin-top: 0; border-color: var(--accent-primary);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; border-bottom: 1px solid var(--border-secondary); padding-bottom: 8px;">
                        <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: var(--accent-primary); letter-spacing: 0.5px;">
                            <i class="fas fa-star" style="margin-right: 4px;"></i> Próxima Consulta Confirmada
                        </span>
                        <span class="portal-session-badge portal-badge-agendada">Programada</span>
                    </div>
                    <div class="portal-session-banner-inner">
                        <div style="display: flex; align-items: center; gap: 14px; flex: 1; min-width: 240px;">
                            <div class="portal-session-date-box">
                                <span class="portal-session-day">${dayNum}</span>
                                <span class="portal-session-month">${monthStr}</span>
                                <span class="portal-session-year">${yearNum}</span>
                            </div>
                            <div class="portal-session-info-wrap">
                                <h4 class="portal-session-title">${formatDateSafe(next.date)} a las ${next.time || '10:00'}</h4>
                                <p class="portal-session-subtitle">
                                    <span><i class="fas fa-user-md"></i> ${PortalState.therapistName || 'Tu Terapeuta'}</span>
                                    <span>•</span>
                                    <span><i class="far fa-clock"></i> ${next.duration || 50} minutos</span>
                                </p>
                                <div style="margin-top: 6px; font-size: 12px; color: var(--text-secondary);">
                                    <i class="fas ${isOnline ? 'fa-video' : 'fa-building'}" style="color: var(--accent-primary); margin-right: 4px;"></i>
                                    <strong>Modalidad:</strong> ${next.type || 'Online (Videollamada)'}
                                </div>
                                ${next.notes ? `<div style="margin-top: 4px; font-size: 12px; color: var(--text-tertiary); font-style: italic;">"${next.notes}"</div>` : ''}
                            </div>
                        </div>

                        <div class="portal-session-actions">
                            ${(next.attendanceConfirmed || next.status === 'confirmada') ? `
                                <span class="badge-attendance-confirmed" title="Asistencia confirmada para esta sesión">
                                    <i class="fas fa-check-circle"></i> Asistencia confirmada
                                </span>
                            ` : `
                                <button class="btn-confirm-attendance" onclick="confirmSessionAttendance('${next.id}')" title="Confirmar mi asistencia con mi psicólogo">
                                    <i class="fas fa-check"></i> Confirmar Asistencia
                                </button>
                            `}
                            ${isOnline ? `
                                <button class="btn-telehealth-join" onclick="openTelehealthFromPortal('${next.id}')">
                                    <i class="fas fa-video"></i> Unirme a Videollamada
                                </button>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    }

    if (typeof loadPortalAvailability === 'function') {
        const picker = document.getElementById('portalAvailabilityPicker');
        const dt = picker && picker.value ? picker.value : '';
        loadPortalAvailability(dt);
    }

    if (historyList) {
        if (history.length === 0) {
            historyList.innerHTML = `
                <div style="text-align: center; padding: 20px 10px; color: var(--text-tertiary); font-size: 13px;">
                    <p style="margin: 0;">No tienes sesiones pasadas registradas en tu historial.</p>
                </div>
            `;
        } else {
            historyList.innerHTML = history.map(h => {
                const dateObj = new Date(h.date + 'T12:00:00');
                const dayNum = isNaN(dateObj.getDate()) ? '—' : dateObj.getDate();
                const monthStr = isNaN(dateObj.getDate()) ? '' : dateObj.toLocaleDateString('es-ES', { month: 'short' });
                const status = h.status || 'completada';

                const statusBadges = {
                    completada: '<span class="portal-session-badge portal-badge-completada"><i class="fas fa-check-circle"></i> Asistida</span>',
                    reprogramada: '<span class="portal-session-badge portal-badge-reprogramada"><i class="fas fa-sync-alt"></i> Reprogramada</span>',
                    cancelada: '<span class="portal-session-badge portal-badge-cancelada"><i class="fas fa-times-circle"></i> Cancelada</span>',
                    agendada: '<span class="portal-session-badge portal-badge-agendada"><i class="fas fa-calendar-alt"></i> Agendada</span>'
                };

                return `
                    <div class="portal-session-history-item">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="font-weight: 800; font-size: 15px; color: var(--text-primary); min-width: 45px; text-align: center;">
                                ${dayNum} ${monthStr}
                            </div>
                            <div>
                                <div style="font-size: 13.5px; font-weight: 600; color: var(--text-primary);">
                                    Sesión ${h.type || 'Online'} — ${h.time || 'Horario no especificado'}
                                </div>
                                <div style="font-size: 11.5px; color: var(--text-secondary);">
                                    ${formatDateSafe(h.date)} (${h.duration || 50} min)
                                </div>
                            </div>
                        </div>
                        <div>
                            ${statusBadges[status] || `<span class="portal-session-badge portal-badge-agendada">${status}</span>`}
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

// ============================================
// SELECCIÓN INTELIGENTE DE HORARIOS Y DISPONIBILIDAD
// ============================================

const DEFAULT_SMART_SLOTS = [
    { time: '08:00', label: '08:00 AM', shift: 'morning', recommended: false },
    { time: '09:00', label: '09:00 AM', shift: 'morning', recommended: true },
    { time: '10:00', label: '10:00 AM', shift: 'morning', recommended: true },
    { time: '11:00', label: '11:00 AM', shift: 'morning', recommended: false },
    { time: '12:00', label: '12:00 PM', shift: 'morning', recommended: false },
    { time: '14:00', label: '02:00 PM', shift: 'afternoon', recommended: false },
    { time: '15:00', label: '03:00 PM', shift: 'afternoon', recommended: true },
    { time: '16:00', label: '04:00 PM', shift: 'afternoon', recommended: true },
    { time: '17:00', label: '05:00 PM', shift: 'afternoon', recommended: false },
    { time: '18:00', label: '06:00 PM', shift: 'afternoon', recommended: false }
];

async function fetchPortalAvailability(dateStr) {
    if (!dateStr) return null;
    if (PortalState.portalToken && typeof fetch !== 'undefined' && window.location.protocol !== 'file:') {
        try {
            const res = await fetch(`/api/v1/portal/availability?token=${encodeURIComponent(PortalState.portalToken)}&date=${encodeURIComponent(dateStr)}`);
            if (res.ok) {
                return await res.json();
            }
        } catch (e) {
            console.warn('[Portal] Error consultando disponibilidad en servidor, usando cálculo local:', e);
        }
    }

    // Cálculo local inteligente (modo offline / local file / mock)
    const [y, m, d] = dateStr.split('-').map(Number);
    const targetDate = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = targetDate.getDay();
    const isSunday = dayOfWeek === 0;
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dayOfWeek] || '';

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isToday = dateStr === todayStr;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    let occupied = [];
    try {
        const stored = JSON.parse(localStorage.getItem('psico_therapist_occupied_slots') || '[]');
        if (Array.isArray(stored)) occupied = stored;
    } catch (e) {}

    // Agregar citas del propio portal
    (PortalState.appointments || []).forEach(a => {
        if (a.status !== 'cancelada') {
            occupied.push({ date: a.date, time: String(a.time || '').substring(0, 5) });
        }
    });

    const slots = DEFAULT_SMART_SLOTS.map(slot => {
        const [sh, sm] = slot.time.split(':').map(Number);
        const slotMinutes = sh * 60 + sm;

        if (isSunday) {
            return { ...slot, available: false, reason: 'Día no laborable (Domingo)' };
        }
        if (isToday && slotMinutes <= currentMinutes + 15) {
            return { ...slot, available: false, reason: 'Horario pasado' };
        }
        const isOcc = occupied.some(o => o.date === dateStr && o.time === slot.time);
        if (isOcc) {
            return { ...slot, available: false, reason: 'Horario ocupado' };
        }
        return { ...slot, available: true, reason: null };
    });

    return {
        date: dateStr,
        dayName,
        isWorkingDay: !isSunday,
        slots,
        totalAvailable: slots.filter(s => s.available).length,
        totalOccupied: slots.filter(s => !s.available && s.reason === 'Horario ocupado').length,
        message: isSunday ? 'El consultorio no atiende los domingos. Por favor selecciona de lunes a sábado.' : ''
    };
}

async function handleScheduleDateChange(dateStr) {
    const container = document.getElementById('smartSlotsContainer');
    const summaryEl = document.getElementById('slotAvailabilitySummary');
    const dayBadgeEl = document.getElementById('scheduleDayBadge');
    const feedbackEl = document.getElementById('slotSelectedFeedback');
    const selectEl = document.getElementById('scheduleTime');

    if (!dateStr || !container) return;

    if (summaryEl) summaryEl.textContent = 'Consultando...';
    container.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:20px;color:var(--text-secondary);font-size:12.5px;">
            <i class="fas fa-spinner fa-spin" style="color:var(--accent-primary);"></i> Verificando disponibilidad de agenda...
        </div>
    `;

    const data = await fetchPortalAvailability(dateStr);
    if (!data) return;

    if (dayBadgeEl) {
        dayBadgeEl.textContent = data.dayName;
    }

    if (!data.isWorkingDay) {
        if (summaryEl) {
            summaryEl.textContent = 'No laborable';
            summaryEl.style.color = '#d97706';
            summaryEl.style.background = '#fef3c7';
        }
        if (feedbackEl) feedbackEl.style.display = 'none';
        if (selectEl) selectEl.value = '';
        container.innerHTML = `
            <div class="slot-alert-box alert-closed">
                <div style="font-size: 24px;">🗓️</div>
                <div style="flex:1;">
                    <strong style="display:block;font-size:13px;">Domingo no laborable</strong>
                    <div style="font-size:11.5px;margin-top:2px;opacity:0.9;">El terapeuta atiende de lunes a sábado. Te invitamos a seleccionar el lunes.</div>
                </div>
                <button type="button" class="btn-slot-quick-pick" onclick="selectNextAvailableWorkingDay()">Elegir Lunes</button>
            </div>
        `;
        return;
    }

    if (data.totalAvailable === 0) {
        if (summaryEl) {
            summaryEl.textContent = 'Día Completo (0 disponibles)';
            summaryEl.style.color = '#dc2626';
            summaryEl.style.background = '#fee2e2';
        }
        if (feedbackEl) feedbackEl.style.display = 'none';
        if (selectEl) selectEl.value = '';
        container.innerHTML = `
            <div class="slot-alert-box alert-full">
                <div style="font-size: 22px;">🔒</div>
                <div style="flex:1;">
                    <strong style="display:block;font-size:13px;">Sin disponibilidad en esta fecha</strong>
                    <div style="font-size:11.5px;margin-top:2px;">Todos los horarios están reservados. Te sugerimos revisar el siguiente día disponible.</div>
                </div>
                <button type="button" class="btn-slot-quick-pick" onclick="selectNextAvailableWorkingDay()">Día Siguiente</button>
            </div>
        `;
        return;
    }

    if (summaryEl) {
        summaryEl.textContent = `🟢 ${data.totalAvailable} horarios disponibles`;
        summaryEl.style.color = '#059669';
        summaryEl.style.background = 'rgba(16, 185, 129, 0.12)';
    }

    const morningSlots = data.slots.filter(s => s.shift === 'morning');
    const afternoonSlots = data.slots.filter(s => s.shift === 'afternoon');

    let currentSelected = PortalState.selectedScheduleSlot;
    // Si el horario seleccionado previamente ya no está disponible, seleccionar el primer horario disponible recomendado
    const isCurrentValid = data.slots.some(s => s.time === currentSelected && s.available);
    if (!isCurrentValid) {
        const firstAvail = data.slots.find(s => s.available && s.recommended) || data.slots.find(s => s.available);
        currentSelected = firstAvail ? firstAvail.time : '';
        PortalState.selectedScheduleSlot = currentSelected;
    }

    if (selectEl && currentSelected) {
        selectEl.value = currentSelected;
    }

    const renderShiftGroup = (title, icon, slots) => `
        <div class="slot-shift-section">
            <div class="slot-shift-title">${icon} ${title}</div>
            <div class="slot-chips-grid">
                ${slots.map(s => {
                    const isSel = s.time === currentSelected && s.available;
                    if (!s.available) {
                        const isPast = s.reason === 'Horario pasado';
                        return `
                            <button type="button" class="slot-chip-btn ${isPast ? 'past' : 'occupied'}" disabled title="${s.reason || 'No disponible'}">
                                <span class="slot-chip-time">${s.label}</span>
                                <span class="slot-chip-tag">${isPast ? 'Pasado' : '🔒 Ocupado'}</span>
                            </button>
                        `;
                    }
                    const isRec = s.recommended;
                    return `
                        <button type="button" 
                                class="slot-chip-btn available ${isRec ? 'recommended' : ''} ${isSel ? 'selected' : ''}" 
                                onclick="pickSmartSlot('${s.time}', '${s.label}')">
                            <span class="slot-chip-time">${s.label}</span>
                            <span class="slot-chip-tag">${isRec ? '✨ Sugerido' : 'Libre'}</span>
                        </button>
                    `;
                }).join('')}
            </div>
        </div>
    `;

    container.innerHTML = `
        ${renderShiftGroup('Turno Mañana', '☀️', morningSlots)}
        ${renderShiftGroup('Turno Tarde', '🌤️', afternoonSlots)}
    `;

    if (currentSelected) {
        const selSlotObj = data.slots.find(s => s.time === currentSelected);
        if (selSlotObj && feedbackEl) {
            feedbackEl.style.display = 'block';
            const feedbackText = document.getElementById('selectedSlotText');
            if (feedbackText) feedbackText.textContent = `${selSlotObj.label} (${data.dayName})`;
        }
    } else if (feedbackEl) {
        feedbackEl.style.display = 'none';
    }
}

function pickSmartSlot(timeStr, labelStr) {
    PortalState.selectedScheduleSlot = timeStr;
    const selectEl = document.getElementById('scheduleTime');
    if (selectEl) {
        selectEl.value = timeStr;
    }

    // Actualizar clases activas en los botones
    const allBtns = document.querySelectorAll('.slot-chip-btn.available');
    allBtns.forEach(btn => {
        if (btn.querySelector('.slot-chip-time')?.textContent === labelStr || btn.getAttribute('onclick')?.includes(timeStr)) {
            btn.classList.add('selected');
        } else {
            btn.classList.remove('selected');
        }
    });

    const feedbackEl = document.getElementById('slotSelectedFeedback');
    const feedbackText = document.getElementById('selectedSlotText');
    const dayBadgeEl = document.getElementById('scheduleDayBadge');
    const dayStr = dayBadgeEl?.textContent ? ` · ${dayBadgeEl.textContent}` : '';

    if (feedbackEl) feedbackEl.style.display = 'block';
    if (feedbackText) feedbackText.textContent = `${labelStr || timeStr}${dayStr}`;
}

function selectNextAvailableWorkingDay() {
    const dateInput = document.getElementById('scheduleDate');
    if (!dateInput) return;
    const curr = new Date(dateInput.value + 'T12:00:00');
    curr.setDate(curr.getDate() + 1);
    if (curr.getDay() === 0) {
        curr.setDate(curr.getDate() + 1); // Si cae domingo, pasar a lunes
    }
    const nextStr = curr.toISOString().split('T')[0];
    dateInput.value = nextStr;
    handleScheduleDateChange(nextStr);
}

function openScheduleSessionModal() {
    const modal = document.getElementById('scheduleSessionModal');
    if (!modal) return;
    const form = document.getElementById('scheduleSessionForm');
    if (form) form.reset();

    const dateInput = document.getElementById('scheduleDate');
    let targetDateStr = '';
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (tomorrow.getDay() === 0) {
            tomorrow.setDate(tomorrow.getDate() + 1); // Si mañana es domingo, abrir en lunes
        }
        targetDateStr = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
        dateInput.value = targetDateStr;
    }

    selectPortalModality('Online');
    modal.style.display = 'flex';

    if (targetDateStr) {
        handleScheduleDateChange(targetDateStr);
    }
}

function closeScheduleSessionModal() {
    const modal = document.getElementById('scheduleSessionModal');
    if (modal) modal.style.display = 'none';
}

function selectPortalModality(modality) {
    const onlineLabel = document.getElementById('modalityOnlineLabel');
    const presencialLabel = document.getElementById('modalityPresencialLabel');
    const radios = document.querySelectorAll('input[name="portalModality"]');

    radios.forEach(r => {
        if (r.value === modality) r.checked = true;
    });

    if (modality === 'Online') {
        if (onlineLabel) onlineLabel.classList.add('active');
        if (presencialLabel) presencialLabel.classList.remove('active');
    } else {
        if (onlineLabel) onlineLabel.classList.remove('active');
        if (presencialLabel) presencialLabel.classList.add('active');
    }
}

async function handleScheduleSessionSubmit(e) {
    e.preventDefault();
    const date = document.getElementById('scheduleDate')?.value;
    const time = document.getElementById('scheduleTime')?.value;
    const modality = document.querySelector('input[name="portalModality"]:checked')?.value || 'Online';
    const notes = document.getElementById('scheduleNotes')?.value?.trim() || '';

    if (!date || !time) {
        showToast('Por favor selecciona una fecha y un horario disponible', 'warning');
        return;
    }

    // Verificar si el día es domingo
    const [y, m, d] = date.split('-').map(Number);
    if (new Date(y, m - 1, d, 12, 0, 0).getDay() === 0) {
        showToast('El consultorio no atiende los domingos. Por favor selecciona de lunes a sábado.', 'warning');
        return;
    }

    // Si hay backend disponible, validar contra la API antes de persistir
    if (PortalState.portalToken && PortalState.patientId && typeof fetch !== 'undefined' && window.location.protocol !== 'file:') {
        try {
            const res = await fetch('/api/v1/portal/appointments/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: PortalState.portalToken,
                    patientId: PortalState.patientId,
                    date: date,
                    time: time,
                    duration: 50,
                    type: modality,
                    notes: notes
                })
            });

            if (res.status === 409) {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || 'El horario seleccionado ya no se encuentra disponible. Por favor elige otro.', 'warning');
                handleScheduleDateChange(date);
                return;
            }

            if (!res.ok) {
                const errData = await res.json().catch(() => ({}));
                showToast(errData.error || 'Error agendando cita en el servidor', 'warning');
                return;
            }
        } catch (netErr) {
            console.warn('[Portal] Servidor no disponible, procediendo con guardado local:', netErr);
        }
    }

    const appointmentRecord = {
        id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        patientId: PortalState.patientId,
        patient_id: PortalState.patientId,
        date: date,
        time: time,
        duration: 50,
        type: modality,
        status: 'agendada',
        notes: notes || 'Sesión agendada desde el Portal del Paciente',
        createdAt: new Date().toISOString()
    };

    if (!PortalState.appointments) PortalState.appointments = [];
    PortalState.appointments.push(appointmentRecord);

    // Guardar en puente local para que la app del terapeuta lo vea de inmediato
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_appointments_bridge') || '{}');
        bridge[appointmentRecord.id] = appointmentRecord;
        localStorage.setItem('psico_portal_appointments_bridge', JSON.stringify(bridge));
        localStorage.setItem('psico_portal_appointments_last_update', Date.now().toString());
    } catch (err) {}

    savePatientData();

    closeScheduleSessionModal();
    renderNextSession();
    renderSessionsView();
    showToast('🎉 ¡Sesión agendada exitosamente!', 'success');
}

function openTelehealthFromPortal(appointmentId) {
    const pId = PortalState.patientId || 'patient';
    const roomName = `psiconotes-session-${pId.substring(0, 8)}-${(appointmentId || 'live').substring(0, 8)}`;
    const jitsiUrl = `https://meet.jit.si/${encodeURIComponent(roomName)}#config.prejoinPageEnabled=false&userInfo.displayName=${encodeURIComponent(PortalState.patientName || 'Paciente')}`;
    window.open(jitsiUrl, '_blank');
    showToast('Abriendo sala de teleconsulta cifrada...', 'info');
}

// Exponer funciones globales para eventos onClick en portal.html
window.renderNextSession = renderNextSession;
window.renderSessionsView = renderSessionsView;
window.openScheduleSessionModal = openScheduleSessionModal;
window.closeScheduleSessionModal = closeScheduleSessionModal;
window.selectPortalModality = selectPortalModality;
window.handleScheduleSessionSubmit = handleScheduleSessionSubmit;
window.openTelehealthFromPortal = openTelehealthFromPortal;
window.handleScheduleDateChange = handleScheduleDateChange;
window.pickSmartSlot = pickSmartSlot;
window.selectNextAvailableWorkingDay = selectNextAvailableWorkingDay;
window.fetchPortalAvailability = fetchPortalAvailability;
window.toggleKidMode = toggleKidMode;
window.switchKidView = switchKidView;
window.selectKidWeather = selectKidWeather;
window.selectKidThoughtChip = selectKidThoughtChip;
window.selectKidBodyZone = selectKidBodyZone;
window.selectKidSensation = selectKidSensation;
window.submitKidWeatherAndBody = submitKidWeatherAndBody;
window.pickAvatarChar = pickAvatarChar;
window.pickAvatarAura = pickAvatarAura;
window.pickAvatarAccessory = pickAvatarAccessory;
window.generateRandomKidAvatarName = generateRandomKidAvatarName;
window.saveKidAvatar = saveKidAvatar;
window.initKidBubbles = initKidBubbles;
window.popKidBubble = popKidBubble;
window.skipCurrentBubble = skipCurrentBubble;
window.openCustomBubbleModal = openCustomBubbleModal;
window.closeCustomBubbleModal = closeCustomBubbleModal;
window.confirmCustomBubble = confirmCustomBubble;
window.promptCustomBubble = promptCustomBubble;
window.saveCanvasSnapshot = saveCanvasSnapshot;
window.undoKidCanvas = undoKidCanvas;
window.setCanvasColor = setCanvasColor;
window.setRainbowBrush = setRainbowBrush;
window.setCanvasBrushSize = setCanvasBrushSize;
window.toggleCanvasEraser = toggleCanvasEraser;
window.setCanvasStamp = setCanvasStamp;
window.clearKidCanvas = clearKidCanvas;
window.submitKidDrawing = submitKidDrawing;
window.selectCalmTechnique = selectCalmTechnique;
window.toggleBalloonBreathing = toggleBalloonBreathing;
window.startBalloonBreathing = startBalloonBreathing;
window.pauseBalloonBreathing = pauseBalloonBreathing;
window.stopBalloonBreathing = stopBalloonBreathing;
window.triggerKidSosHelp = triggerKidSosHelp;
window.closeKidCrisisModal = closeKidCrisisModal;
window.alertKidAdultTalk = alertKidAdultTalk;
window.goToKidCalmFromSos = goToKidCalmFromSos;
window.sendKidSosToTherapist = sendKidSosToTherapist;
window.toggleKidAudioMute = toggleKidAudioMute;
window.KidAudioEffects = KidAudioEffects;
window.KidConfetti = KidConfetti;

// ============================================
// FUNCIONES PSIRIS: PALABRA DEL DÍA, MI PSICÓLOGO,
// DOCUMENTOS, PAGOS, ASISTENCIA Y PERFIL
// ============================================

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderTherapistCard() {
    const info = PortalState.therapistInfo || {};
    const name = info.name || PortalState.therapistName || 'Dr. Jose Correa';
    const specialty = info.specialty || 'Psicología Clínica y de la Salud';
    const fpv = info.registryNumber || 'FPV Nº 54567';
    const email = info.email || 'atalantillo@gmail.com';
    const location = info.location || 'Consultorio Clínico / Consulta Online y Presencial';

    const nameEl = document.getElementById('therapistCardName');
    const specEl = document.getElementById('therapistCardSpecialty');
    const fpvEl = document.getElementById('therapistCardFpv');
    const emailEl = document.getElementById('therapistCardEmail');
    const locEl = document.getElementById('therapistCardLocation');

    if (nameEl) nameEl.textContent = name;
    if (specEl) specEl.textContent = specialty;
    if (fpvEl) fpvEl.textContent = fpv;
    if (emailEl) emailEl.textContent = email;
    if (locEl) locEl.textContent = location;
}

function selectDailyWordChip(word) {
    const input = document.getElementById('inputDailyWord');
    if (input) {
        input.value = word;
        submitDailyWord();
    }
}

async function submitDailyWord() {
    const input = document.getElementById('inputDailyWord');
    const word = (input ? input.value : '').trim();
    if (!word) {
        showToast('Escribe una palabra o selecciona una sugerencia', 'warning');
        return;
    }

    PortalState.dailyWord = word;
    const tag = document.getElementById('dailyWordSavedTag');
    if (tag) {
        tag.textContent = `"${word}" guardada ✓`;
        tag.style.display = 'inline-block';
    }

    // Persistir y sincronizar con mood log de hoy
    if (PortalState.patientId && PortalState.portalToken) {
        sendPortalPost('/api/v1/portal/mood', {
            patientId: PortalState.patientId,
            token: PortalState.portalToken,
            mood: 4,
            sleep: 3,
            energy: 3,
            word: word
        });
    }

    showToast(`Palabra del día registrada: "${word}" ✨`, 'success');
}

async function confirmSessionAttendance(appointmentId) {
    if (!appointmentId) return;

    // 1. Actualización local inmediata (optimistic UI)
    const app = (PortalState.appointments || []).find(a => String(a.id) === String(appointmentId));
    if (app) {
        app.attendanceConfirmed = true;
        app.status = 'confirmada';
    }
    savePatientDataLocally();
    renderNextSession();
    renderSessionsView();

    // 2. Sincronización defensiva con backend
    if (PortalState.portalToken && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
        try {
            const res = await fetch(`/api/v1/portal/appointments/${encodeURIComponent(appointmentId)}/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: PortalState.portalToken,
                    patientId: PortalState.patientId
                })
            });

            if (!res.ok) {
                console.warn('[Portal] Servidor devolvió estado no exitoso para confirmación, conservado localmente');
            }
        } catch (netErr) {
            console.warn('[Portal] Red o backend no disponible al confirmar asistencia, registrado localmente');
        }
    }

    showToast('¡Asistencia confirmada! Tu terapeuta ha sido notificado.', 'success');
}

async function loadPortalAvailability(dateStr) {
    const container = document.getElementById('availableSlotsChipsContainer');
    const picker = document.getElementById('portalAvailabilityPicker');
    if (!dateStr) {
        const tmrw = new Date();
        tmrw.setDate(tmrw.getDate() + 1);
        dateStr = tmrw.toISOString().split('T')[0];
    }
    if (picker) picker.value = dateStr;

    if (!container) return;
    container.innerHTML = `<div style="grid-column: 1/-1; font-size: 12px; color: var(--text-tertiary); text-align: center; padding: 10px;"><i class="fas fa-spinner fa-spin"></i> Consultando horarios...</div>`;

    let slots = [];
    if (typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:' && PortalState.portalToken) {
        try {
            const token = PortalState.portalToken || '';
            const res = await fetch(`/api/v1/portal/availability?token=${encodeURIComponent(token)}&date=${encodeURIComponent(dateStr)}`);
            if (res.ok) {
                const data = await res.json();
                slots = data.availableSlots || [];
            }
        } catch (e) {
            console.warn('[Portal] Backend no disponible para disponibilidad, recurriendo a cálculo inteligente local');
        }
    }

    // Fallback defensivo inteligente si el servidor no está disponible o es file://
    if (slots.length === 0) {
        const checkDate = new Date(dateStr + 'T12:00:00');
        const dayOfWeek = checkDate.getDay();
        if (dayOfWeek !== 0) { // Lunes a Sábado
            const hours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
            const occupied = PortalState.therapistOccupiedSlots || [];
            const patientApps = (PortalState.appointments || []).filter(a => a.status !== 'cancelada');
            slots = hours.filter(h => {
                const isOccupied = occupied.some(o => o.date === dateStr && o.time === h);
                const isPatientBooked = patientApps.some(a => a.date === dateStr && a.time === h);
                return !isOccupied && !isPatientBooked;
            }).map((h, idx) => ({
                time: h,
                label: `${h} hrs`,
                recommended: idx === 0 || idx === 3
            }));
        }
    }

    if (slots.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1/-1; background: #fffbeb; border: 1px solid #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 8px; font-size: 12px; text-align: center;">
                No hay turnos disponibles para el ${formatDateSafe(dateStr)}. Por favor selecciona otra fecha.
            </div>
        `;
        return;
    }

    container.innerHTML = slots.map(s => `
        <button type="button" class="portal-slot-chip ${s.recommended ? 'recommended' : ''}" onclick="pickAvailableSlot('${dateStr}', '${s.time}')" title="${s.recommended ? 'Horario recomendado' : ''}">
            ${s.label || s.time}
        </button>
    `).join('');
}

function pickAvailableSlot(dateStr, timeStr) {
    if (typeof openScheduleSessionModal === 'function') {
        openScheduleSessionModal();
        const dateInput = document.getElementById('scheduleSessionDate');
        const timeInput = document.getElementById('scheduleSessionTime');
        if (dateInput) {
            dateInput.value = dateStr;
            dateInput.dispatchEvent(new Event('change'));
        }
        setTimeout(() => {
            if (timeInput) timeInput.value = timeStr;
        }, 300);
    }
}

function renderDocumentsView() {
    const listTherapist = document.getElementById('therapistDocsList');
    const listPatient = document.getElementById('patientDocsList');
    const countTherapist = document.getElementById('therapistDocsCount');
    const countPatient = document.getElementById('patientDocsCount');

    const docs = PortalState.documents || [];
    const therapistDocs = docs.filter(d => d.uploaded_by === 'therapist' || d.uploadedBy === 'therapist');
    const patientDocs = docs.filter(d => d.uploaded_by !== 'therapist' && d.uploadedBy !== 'therapist');

    if (countTherapist) countTherapist.textContent = `${therapistDocs.length} archivo${therapistDocs.length === 1 ? '' : 's'}`;
    if (countPatient) countPatient.textContent = `${patientDocs.length} archivo${patientDocs.length === 1 ? '' : 's'}`;

    if (listTherapist) {
        if (therapistDocs.length === 0) {
            listTherapist.innerHTML = `<div class="empty-state-small">Tu terapeuta no ha compartido documentos aún.</div>`;
        } else {
            listTherapist.innerHTML = therapistDocs.map(d => renderDocumentItem(d, false)).join('');
        }
    }

    if (listPatient) {
        if (patientDocs.length === 0) {
            listPatient.innerHTML = `<div class="empty-state-small">Aún no has compartido documentos con tu terapeuta.</div>`;
        } else {
            listPatient.innerHTML = patientDocs.map(d => renderDocumentItem(d, true)).join('');
        }
    }
}

function renderDocumentItem(d, allowDelete = false) {
    const ext = (d.file_name || d.fileName || '').split('.').pop().toLowerCase();
    let badgeClass = 'other';
    let icon = '📁';
    if (ext === 'pdf') { badgeClass = 'pdf'; icon = '📕'; }
    else if (ext === 'doc' || ext === 'docx') { badgeClass = 'word'; icon = '📘'; }
    else if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) { badgeClass = 'img'; icon = '🖼️'; }

    const sizeKb = d.file_size ? `${Math.round(d.file_size / 1024)} KB` : '';
    const dateFormatted = d.created_at ? formatDateSafe(d.created_at.split('T')[0]) : '';

    return `
        <div class="portal-document-item">
            <div class="doc-item-left">
                <div class="doc-icon-badge ${badgeClass}">${icon}</div>
                <div class="doc-meta">
                    <div class="doc-title">${escapeHtml(d.title || d.file_name || d.fileName)}</div>
                    <div class="doc-sub">
                        <span>${escapeHtml(d.file_name || d.fileName)}</span>
                        ${sizeKb ? `<span>• ${sizeKb}</span>` : ''}
                        ${dateFormatted ? `<span>• ${dateFormatted}</span>` : ''}
                    </div>
                </div>
            </div>
            <div style="display: flex; gap: 6px;">
                ${d.file_data ? `
                    <button class="btn-sm btn-secondary" onclick="downloadPortalDoc('${d.id}')" title="Descargar / Ver">
                        <i class="fas fa-download"></i>
                    </button>
                ` : ''}
                ${allowDelete ? `
                    <button class="btn-sm btn-secondary" onclick="deletePortalDoc('${d.id}')" title="Eliminar" style="color: #dc2626;">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function downloadPortalDoc(docId) {
    const doc = (PortalState.documents || []).find(d => String(d.id) === String(docId));
    if (!doc || !doc.file_data) {
        showToast('Documento no disponible para descarga directa', 'warning');
        return;
    }
    const link = document.createElement('a');
    link.href = doc.file_data;
    link.download = doc.file_name || doc.fileName || 'documento';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

async function handleDocumentUpload(e) {
    e.preventDefault();
    const title = (document.getElementById('docTitleInput').value || '').trim();
    const category = document.getElementById('docCategorySelect').value || 'general';
    const fileInput = document.getElementById('docFileInput');
    const file = fileInput ? fileInput.files[0] : null;

    if (!file) {
        showToast('Selecciona un archivo', 'warning');
        return;
    }

    if (file.size > 15 * 1024 * 1024) {
        showToast('El archivo supera el límite de 15 MB. Por favor sube un archivo más ligero.', 'warning');
        return;
    }

    const btn = document.getElementById('btnUploadDoc');
    if (btn) btn.disabled = true;

    try {
        const reader = new FileReader();
        reader.onload = async () => {
            try {
                const fileData = reader.result;
                const docRecord = {
                    id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
                    patient_id: PortalState.patientId,
                    title: title || file.name,
                    category,
                    file_name: file.name,
                    fileName: file.name,
                    file_type: file.type || 'application/octet-stream',
                    fileType: file.type || 'application/octet-stream',
                    file_size: file.size,
                    fileSize: file.size,
                    file_data: fileData,
                    fileData: fileData,
                    uploaded_by: 'patient',
                    uploadedBy: 'patient',
                    notes: '',
                    created_at: new Date().toISOString()
                };

                // Optimistic local storage & UI
                if (!Array.isArray(PortalState.documents)) PortalState.documents = [];
                PortalState.documents.unshift(docRecord);
                savePatientDataLocally();
                renderDocumentsView();

                // Intentar sincronizar con backend si no es file://
                if (PortalState.portalToken && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
                    try {
                        const payload = {
                            token: PortalState.portalToken,
                            patientId: PortalState.patientId,
                            title: docRecord.title,
                            category: docRecord.category,
                            fileName: docRecord.file_name,
                            fileType: docRecord.file_type,
                            fileSize: docRecord.file_size,
                            fileData: docRecord.file_data
                        };
                        const res = await fetch('/api/v1/portal/documents/upload', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload)
                        });
                        if (res.ok) {
                            const data = await res.json();
                            if (data.document && data.document.id) {
                                docRecord.id = data.document.id;
                                savePatientDataLocally();
                            }
                        }
                    } catch (netErr) {
                        console.warn('[Portal] Servidor no alcanzable para subir documento, almacenado localmente:', netErr);
                    }
                }

                showToast('Documento guardado y compartido exitosamente', 'success');
                const form = document.getElementById('formUploadDocument');
                if (form) form.reset();
            } catch (errInner) {
                console.error('[Portal] Error procesando archivo:', errInner);
                showToast('Error procesando el archivo', 'error');
            } finally {
                if (btn) btn.disabled = false;
            }
        };
        reader.readAsDataURL(file);
    } catch (err) {
        if (btn) btn.disabled = false;
        showToast('Error al leer el archivo seleccionado', 'error');
    }
}

async function deletePortalDoc(docId) {
    if (!confirm('¿Deseas eliminar este documento compartido?')) return;

    PortalState.documents = (PortalState.documents || []).filter(d => String(d.id) !== String(docId));
    savePatientDataLocally();
    renderDocumentsView();

    if (PortalState.portalToken && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
        try {
            await fetch(`/api/v1/portal/documents/${encodeURIComponent(docId)}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: PortalState.portalToken })
            });
        } catch (netErr) {
            console.warn('[Portal] Servidor no alcanzable al eliminar documento, removido localmente:', netErr);
        }
    }
    showToast('Documento eliminado', 'info');
}

function renderPaymentsView() {
    const methodsGrid = document.getElementById('paymentMethodsGrid');
    const reportsList = document.getElementById('paymentReportsList');
    const countEl = document.getElementById('paymentReportsCount');
    const payMethodSelect = document.getElementById('payMethodSelect');

    const allMethods = PortalState.paymentMethods && PortalState.paymentMethods.length > 0 
        ? PortalState.paymentMethods 
        : getDefaultPaymentMethods();

    // Filtrar métodos activos y habilitados
    const activeMethods = allMethods.filter(m => m.enabled !== false && m.active !== false);

    if (methodsGrid) {
        if (activeMethods.length === 0) {
            methodsGrid.innerHTML = `
                <div class="empty-state-small" style="grid-column: 1 / -1; padding: 20px; text-align: center; color: var(--text-secondary);">
                    No hay formas de pago habilitadas actualmente. Por favor consulta con tu terapeuta.
                </div>
            `;
        } else {
            methodsGrid.innerHTML = activeMethods.map(m => `
                <div class="portal-payment-method-card">
                    <div>
                        <div class="pay-method-header">
                            <span class="pay-method-icon">${m.icon || '💳'}</span>
                            <span class="pay-method-title">${escapeHtml(m.name)}</span>
                        </div>
                        <div class="pay-method-body">
                            ${m.bank ? `<div><strong>Banco:</strong> ${escapeHtml(m.bank)}</div>` : ''}
                            ${m.idNumber ? `<div><strong>C.I. / RIF:</strong> ${escapeHtml(m.idNumber)}</div>` : ''}
                            ${m.phone ? `<div><strong>Teléfono:</strong> ${escapeHtml(m.phone)}</div>` : ''}
                            ${m.email ? `<div><strong>Email:</strong> ${escapeHtml(m.email)}</div>` : ''}
                            ${m.holder ? `<div><strong>Titular:</strong> ${escapeHtml(m.holder)}</div>` : ''}
                            ${m.accountNumber ? `<div><strong>Cuenta:</strong> <span style="font-family:monospace;font-size:11px;">${escapeHtml(m.accountNumber)}</span></div>` : ''}
                            ${m.payId ? `<div><strong>Pay ID:</strong> <span style="font-family:monospace;font-weight:700;">${escapeHtml(m.payId)}</span></div>` : ''}
                            ${m.network ? `<div><strong>Red:</strong> ${escapeHtml(m.network)}</div>` : ''}
                            ${m.instructions ? `<div style="margin-top:6px;font-style:italic;color:var(--text-tertiary);">${escapeHtml(m.instructions)}</div>` : ''}
                        </div>
                    </div>
                    <button type="button" class="btn-copy-payment" onclick="copyPaymentDetails('${m.id}')">
                        <i class="fas fa-copy"></i> Copiar Datos
                    </button>
                </div>
            `).join('');
        }
    }

    // Actualizar dinámicamente las opciones del selector de método de pago
    if (payMethodSelect && activeMethods.length > 0) {
        const prevValue = payMethodSelect.value;
        payMethodSelect.innerHTML = activeMethods.map(m => `
            <option value="${escapeHtml(m.id)}">${m.icon ? escapeHtml(m.icon) + ' ' : ''}${escapeHtml(m.name)}</option>
        `).join('');
        if (activeMethods.some(m => m.id === prevValue)) {
            payMethodSelect.value = prevValue;
        }
    }

    const reports = PortalState.paymentReports || [];
    if (countEl) countEl.textContent = `${reports.length} registro${reports.length === 1 ? '' : 's'}`;

    if (reportsList) {
        if (reports.length === 0) {
            reportsList.innerHTML = `<div class="empty-state-small">No has reportado pagos todavía.</div>`;
        } else {
            reportsList.innerHTML = reports.map(r => {
                const statusClass = (r.status || 'pendiente').toLowerCase();
                const statusLabel = r.status === 'verificado' || r.status === 'aprobado' ? 'Aprobado ✓' : (r.status === 'rechazado' ? 'Rechazado' : 'Pendiente ⏳');
                return `
                    <div class="portal-payment-report-item">
                        <div>
                            <div style="font-size: 14px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
                                <span>${r.currency || 'USD'} ${Number(r.amount).toFixed(2)}</span>
                                <span class="report-status-badge status-${statusClass}">${statusLabel}</span>
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary); margin-top: 3px;">
                                <strong>Ref:</strong> ${escapeHtml(r.reference)} • <strong>Fecha:</strong> ${formatDateSafe(r.payment_date || r.paymentDate)}
                            </div>
                            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 2px;">
                                ${escapeHtml(r.concept || 'Sesión de psicoterapia')} (${formatPaymentMethodName(r.payment_method || r.paymentMethod)})
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }
    }
}

function getDefaultPaymentMethods() {
    return [
        { id: 'pago_movil', name: 'Pago Móvil Interbancario', icon: '📱', enabled: true, bank: 'Banesco (0134) / Mercantil (0105)', idNumber: 'V-15890123', phone: '0414-2345678', instructions: 'Transferencias interbancarias inmediatas' },
        { id: 'zelle', name: 'Zelle (USD)', icon: '💵', enabled: true, email: 'atalantillo@gmail.com', holder: 'Lic. Jose Correa', instructions: 'Indicar únicamente el nombre del paciente en la nota' },
        { id: 'transferencia', name: 'Transferencia Bancaria Nacional', icon: '🏦', enabled: true, bank: 'Banesco Banco Universal', accountNumber: '0134-0987-65-0123456789', idNumber: 'V-15890123', holder: 'Consulta Psicológica' },
        { id: 'binance', name: 'Binance Pay (USDT)', icon: '🟡', enabled: true, payId: '892341052', network: 'USDT (Red TRC20 / BEP20)', instructions: 'Transferencias directas sin comisiones' },
        { id: 'efectivo', name: 'Efectivo en Consulta', icon: '💶', enabled: true, instructions: 'Pago directo al inicio de tu sesión presencial' }
    ];
}

function formatPaymentMethodName(id) {
    const methods = PortalState.paymentMethods && PortalState.paymentMethods.length > 0 ? PortalState.paymentMethods : getDefaultPaymentMethods();
    const found = methods.find(x => x.id === id);
    if (found && found.name) return found.name;
    const map = { pago_movil: 'Pago Móvil', zelle: 'Zelle', transferencia: 'Transferencia', binance: 'Binance Pay', efectivo: 'Efectivo' };
    return map[id] || id;
}

function copyPaymentDetails(methodId) {
    const methods = PortalState.paymentMethods && PortalState.paymentMethods.length > 0 ? PortalState.paymentMethods : getDefaultPaymentMethods();
    const m = methods.find(x => x.id === methodId);
    if (!m) return;

    let text = `${m.name}\n`;
    if (m.bank) text += `Banco: ${m.bank}\n`;
    if (m.idNumber) text += `C.I./RIF: ${m.idNumber}\n`;
    if (m.phone) text += `Teléfono: ${m.phone}\n`;
    if (m.email) text += `Email: ${m.email}\n`;
    if (m.holder) text += `Titular: ${m.holder}\n`;
    if (m.accountNumber) text += `Cuenta: ${m.accountNumber}\n`;
    if (m.payId) text += `Binance Pay ID: ${m.payId}\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text.trim()).then(() => {
            showToast(`Datos de ${m.name} copiados al portapapeles ✓`, 'success');
        }).catch(() => {
            showToast('Copia manual: ' + text.trim().substring(0, 40) + '...', 'info');
        });
    } else {
        showToast(`Datos de ${m.name} copiados ✓`, 'success');
    }
}

async function handleReportPayment(e) {
    e.preventDefault();
    const amountVal = parseFloat(document.getElementById('payAmountInput').value);
    const currency = document.getElementById('payCurrencySelect').value || 'USD';
    const paymentMethod = document.getElementById('payMethodSelect').value || 'pago_movil';
    const reference = (document.getElementById('payReferenceInput').value || '').trim();
    const paymentDate = document.getElementById('payDateInput').value || new Date().toISOString().split('T')[0];
    const concept = (document.getElementById('payConceptInput').value || '').trim();
    const receiptFileInput = document.getElementById('payReceiptFile');
    const receiptFile = receiptFileInput && receiptFileInput.files ? receiptFileInput.files[0] : null;

    if (!amountVal || isNaN(amountVal) || amountVal <= 0) {
        showToast('Ingresa un monto válido', 'warning');
        return;
    }
    if (!reference) {
        showToast('Ingresa el número de referencia bancaria', 'warning');
        return;
    }

    const doSubmit = async (receiptData = '') => {
        const reportRecord = {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            patient_id: PortalState.patientId,
            amount: amountVal,
            currency,
            payment_method: paymentMethod,
            paymentMethod,
            reference,
            payment_date: paymentDate,
            paymentDate,
            concept: concept || 'Sesión de psicoterapia',
            receipt_data: receiptData,
            receiptData,
            status: 'pendiente',
            created_at: new Date().toISOString()
        };

        // Guardado optimista local
        if (!Array.isArray(PortalState.paymentReports)) PortalState.paymentReports = [];
        PortalState.paymentReports.unshift(reportRecord);
        savePatientDataLocally();
        renderPaymentsView();

        // Notificar al entorno local y entre pestañas para sincronización inmediata con el terapeuta
        try {
            const bridge = JSON.parse(localStorage.getItem('psico_therapist_payment_reports_bridge') || '[]');
            bridge.unshift({ ...reportRecord, patientName: PortalState.patientName || 'Paciente' });
            localStorage.setItem('psico_therapist_payment_reports_bridge', JSON.stringify(bridge));
            localStorage.setItem('psico_portal_payment_reported', JSON.stringify({
                patientId: PortalState.patientId,
                patientName: PortalState.patientName || 'Paciente',
                report: reportRecord,
                timestamp: Date.now()
            }));
            localStorage.setItem('psico_portal_payment_last_update', Date.now().toString());
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('psico_payment_reported', { detail: reportRecord }));
            }
        } catch (e) {}

        // Sincronización en backend si no es file://
        if (PortalState.portalToken && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
            try {
                const payload = {
                    token: PortalState.portalToken,
                    patientId: PortalState.patientId,
                    amount: amountVal,
                    currency,
                    paymentMethod,
                    reference,
                    paymentDate,
                    concept: reportRecord.concept,
                    receiptData
                };
                const res = await fetch('/api/v1/portal/payments/report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                if (res.ok) {
                    const data = await res.json();
                    if (data.paymentReport && data.paymentReport.id) {
                        reportRecord.id = data.paymentReport.id;
                        savePatientDataLocally();
                    }
                }
            } catch (netErr) {
                console.warn('[Portal] Servidor no alcanzable al reportar pago, registrado localmente:', netErr);
            }
        }

        showToast('Pago reportado exitosamente. Tu terapeuta lo validará en breve.', 'success');
        const form = document.getElementById('formReportPayment');
        if (form) form.reset();
    };

    try {
        if (receiptFile) {
            if (receiptFile.size > 15 * 1024 * 1024) {
                showToast('El comprobante supera el tamaño máximo permitido (15 MB)', 'warning');
                return;
            }
            const reader = new FileReader();
            reader.onload = async () => {
                await doSubmit(reader.result);
            };
            reader.readAsDataURL(receiptFile);
        } else {
            await doSubmit('');
        }
    } catch (err) {
        console.error('[Portal] Error al reportar pago:', err);
        showToast('Error al procesar el comprobante', 'error');
    }
}

function renderProfileView() {
    const patient = PortalState.patientProfile || {};
    const nameEl = document.getElementById('profileDisplayName');
    const avatarEl = document.getElementById('profileLargeAvatar');
    const name = patient.name || PortalState.patientName || 'Paciente';

    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = getInitials(name);

    const nameInput = document.getElementById('profNameInput');
    const birthdateInput = document.getElementById('profBirthdateInput');
    const phoneInput = document.getElementById('profPhoneInput');
    const emailInput = document.getElementById('profEmailInput');
    const occInput = document.getElementById('profOccupationInput');
    const addressInput = document.getElementById('profAddressInput');
    const emerContactInput = document.getElementById('profEmergencyContactInput');
    const emerPhoneInput = document.getElementById('profEmergencyPhoneInput');
    const expInput = document.getElementById('profExpectationsInput');

    if (nameInput) nameInput.value = patient.name || PortalState.patientName || '';
    if (birthdateInput && patient.birthdate) birthdateInput.value = patient.birthdate.split('T')[0];
    if (phoneInput) phoneInput.value = patient.phone || '';
    if (emailInput) emailInput.value = patient.email || '';
    if (occInput) occInput.value = patient.occupation || '';
    if (addressInput) addressInput.value = patient.address || '';
    if (emerContactInput) emerContactInput.value = patient.emergency_contact || patient.emergencyContact || '';
    if (emerPhoneInput) emerPhoneInput.value = patient.emergency_phone || patient.emergencyPhone || '';
    if (expInput) expInput.value = patient.expectations || patient.preconsulta_data?.expectations || '';
}

async function handleSavePatientProfile(e) {
    e.preventDefault();
    const name = (document.getElementById('profNameInput').value || '').trim();
    const birthdate = document.getElementById('profBirthdateInput').value;
    const phone = (document.getElementById('profPhoneInput').value || '').trim();
    const email = (document.getElementById('profEmailInput').value || '').trim();
    const occupation = (document.getElementById('profOccupationInput').value || '').trim();
    const address = (document.getElementById('profAddressInput').value || '').trim();
    const emergencyContact = (document.getElementById('profEmergencyContactInput').value || '').trim();
    const emergencyPhone = (document.getElementById('profEmergencyPhoneInput').value || '').trim();
    const expectations = (document.getElementById('profExpectationsInput').value || '').trim();

    // Actualización inmediata en estado local y header
    PortalState.patientProfile = {
        ...(PortalState.patientProfile || {}),
        name: name || PortalState.patientName,
        birthdate,
        phone,
        email,
        occupation,
        address,
        emergency_contact: emergencyContact,
        emergencyContact,
        emergency_phone: emergencyPhone,
        emergencyPhone,
        expectations
    };
    if (name) {
        PortalState.patientName = name;
        updateHeader();
    }
    savePatientDataLocally();

    // Sincronización en backend si no es file://
    if (PortalState.portalToken && typeof window !== 'undefined' && window.location && window.location.protocol !== 'file:') {
        try {
            const res = await fetch('/api/v1/portal/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    token: PortalState.portalToken,
                    patientId: PortalState.patientId,
                    name,
                    birthdate,
                    phone,
                    email,
                    occupation,
                    address,
                    emergencyContact,
                    emergencyPhone,
                    expectations
                })
            });
            if (res.ok) {
                const data = await res.json();
                if (data.patient) {
                    PortalState.patientProfile = data.patient;
                    if (data.patient.name) PortalState.patientName = data.patient.name;
                    savePatientDataLocally();
                }
            } else {
                console.warn('[Portal] Servidor devolvió error al guardar perfil, persistido localmente');
            }
        } catch (netErr) {
            console.warn('[Portal] Servidor no alcanzable al guardar perfil, persistido localmente:', netErr);
        }
    }

    showToast('Tus datos han sido actualizados y sincronizados con tu expediente ✓', 'success');
}

// Exposición global
window.renderTherapistCard = renderTherapistCard;
window.selectDailyWordChip = selectDailyWordChip;
window.submitDailyWord = submitDailyWord;
window.confirmSessionAttendance = confirmSessionAttendance;
window.loadPortalAvailability = loadPortalAvailability;
window.pickAvailableSlot = pickAvailableSlot;
window.renderDocumentsView = renderDocumentsView;
window.downloadPortalDoc = downloadPortalDoc;
window.handleDocumentUpload = handleDocumentUpload;
window.deletePortalDoc = deletePortalDoc;
window.renderPaymentsView = renderPaymentsView;
window.copyPaymentDetails = copyPaymentDetails;
window.handleReportPayment = handleReportPayment;
window.renderProfileView = renderProfileView;
window.handleSavePatientProfile = handleSavePatientProfile;

// ============================================
// ESCUCHA REACTIVA DE ACTUALIZACIONES DEL TERAPEUTA (CITAS, CANCELACIONES, PERFIL)
// ============================================
if (typeof window !== 'undefined') {
    // Sincronización en tiempo real ante eventos de LocalStorage (entre pestañas)
    window.addEventListener('storage', (e) => {
        if (!e.key || e.key === 'psico_portal_appointments_bridge' || 
            e.key === 'psico_portal_appointments_last_update' || 
            e.key === 'psico_therapist_payment_methods' ||
            e.key === 'psico_payment_methods_updated' ||
            (PortalState.patientId && e.key === `psico_portal_data_${PortalState.patientId}`)) {
            if (e.key === 'psico_therapist_payment_methods') {
                try {
                    const parsed = JSON.parse(e.newValue || '[]');
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        PortalState.paymentMethods = parsed;
                    }
                } catch (err) {}
            }
            if (typeof mergeAppointmentsFromBridge === 'function') mergeAppointmentsFromBridge();
            if (typeof renderNextSession === 'function') renderNextSession();
            if (typeof renderSessionsView === 'function') renderSessionsView();
            if (typeof renderTherapistCard === 'function') renderTherapistCard();
            if (typeof renderPaymentsView === 'function') renderPaymentsView();
        }
    });

    // Sincronización en la misma ventana / contexto
    window.addEventListener('psico_appointment_updated', (e) => {
        if (typeof mergeAppointmentsFromBridge === 'function') mergeAppointmentsFromBridge();
        if (typeof renderNextSession === 'function') renderNextSession();
        if (typeof renderSessionsView === 'function') renderSessionsView();
    });

    window.addEventListener('psico_payment_methods_updated', (e) => {
        try {
            const custom = JSON.parse(localStorage.getItem('psico_therapist_payment_methods') || 'null');
            if (Array.isArray(custom) && custom.length > 0) {
                PortalState.paymentMethods = custom;
            }
        } catch (err) {}
        if (typeof renderPaymentsView === 'function') renderPaymentsView();
    });

    // Auto-actualización cuando el paciente vuelve al tab
    window.addEventListener('focus', () => {
        if (PortalState.portalToken && typeof loadPatientData === 'function') {
            loadPatientData();
        }
    });

    // Sondeo de seguridad cada 20s para verificar cambios remotos si el tab está visible
    setInterval(() => {
        if (typeof document !== 'undefined' && !document.hidden && PortalState.portalToken && typeof loadPatientData === 'function') {
            loadPatientData();
        }
    }, 20000);
}
