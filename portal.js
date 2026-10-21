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
    currentFilter: 'pending'
};

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

const ROSENBERG_QUESTIONS = [
    "Siento que soy una persona digna de aprecio, al menos en igual medida que las demás",
    "Siento que tengo cualidades positivas",
    "Soy capaz de hacer las cosas tan bien como la mayoría de la gente",
    "Tengo una actitud positiva hacia mí mismo/a",
    "En general, me siento satisfecho/a conmigo mismo/a",
    "Siento que no tengo mucho de lo que estar orgulloso/a (Invertida)",
    "En general, me inclino a pensar que soy un/a fracasado/a (Invertida)",
    "Me gustaría tener más respeto por mí mismo/a (Invertida)",
    "Hay veces que realmente pienso que no sirvo para nada (Invertida)",
    "A veces me siento inútil (Invertida)"
];

const PSS10_QUESTIONS = [
    "¿Con qué frecuencia se ha sentido afectado/a por algo que ocurrió inesperadamente?",
    "¿Con qué frecuencia ha sentido que no podía controlar las cosas importantes en su vida?",
    "¿Con qué frecuencia se ha sentido nervioso/a o estresado/a?",
    "¿Con qué frecuencia ha manejado con éxito los pequeños problemas cotidianos? (Invertida)",
    "¿Con qué frecuencia ha sentido que afrontaba efectivamente los cambios? (Invertida)",
    "¿Con qué frecuencia se ha sentido seguro/a de su capacidad para manejar problemas? (Invertida)",
    "¿Con qué frecuencia ha sentido que las cosas le iban bien? (Invertida)",
    "¿Con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?",
    "¿Con qué frecuencia ha podido controlar las dificultades de su vida? (Invertida)",
    "¿Con qué frecuencia ha sentido que las dificultades se acumulaban tanto que no podía superarlas?"
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

document.addEventListener('DOMContentLoaded', () => {
    checkExistingSession();
});

function checkExistingSession() {
    const saved = localStorage.getItem('psico_portal_session');
    if (saved) {
        try {
            const session = JSON.parse(saved);
            if (session.patientId && session.portalToken) {
                const patients = loadPortalPatients();
                const patient = patients.find(p => 
                    p.id === session.patientId && 
                    p.portalToken === session.portalToken
                );
                if (patient) {
                    PortalState.patientId = patient.id;
                    PortalState.patientName = patient.name;
                    PortalState.therapistName = patient.therapistName || 'Tu terapeuta';
                    PortalState.portalToken = patient.portalToken;
                    showWelcomeBack();
                    return;
                }
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
    document.getElementById('portalPatientName').textContent = `Hola, ${PortalState.patientName.split(' ')[0]}`;
    document.getElementById('portalPatientAvatar').textContent = getInitials(PortalState.patientName);
}

function handleAccess() {
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
    enterPortal();
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

function enterPortal() {
    document.getElementById('accessScreen').style.display = 'none';
    document.getElementById('portalApp').style.display = 'block';
    document.getElementById('portalApp').classList.add('active');
    loadPatientData();
    loadTasksFromNotes();
    updateHeader();
    updateDailyReflection();
    renderTasks();
    updateTestsLastResults();
    updateProgress();
    checkContainmentBanner();
    showToast(`Bienvenido/a, ${PortalState.patientName.split(' ')[0]}`, 'success');
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

function loadPatientData() {
    try {
        const stored = localStorage.getItem(`psico_portal_data_${PortalState.patientId}`);
        if (stored) {
            const data = JSON.parse(stored);
            PortalState.tasks = data.tasks || [];
            PortalState.evaluations = data.evaluations || [];
            PortalState.moodLog = data.moodLog || [];
        } else {
            PortalState.tasks = [];
            PortalState.evaluations = [];
            PortalState.moodLog = [];
        }
    } catch (e) {
        console.error('Error cargando datos del portal:', e);
    }
}

function savePatientData() {
    try {
        const data = {
            tasks: PortalState.tasks,
            evaluations: PortalState.evaluations,
            moodLog: PortalState.moodLog,
            lastUpdate: new Date().toISOString()
        };
        localStorage.setItem(`psico_portal_data_${PortalState.patientId}`, JSON.stringify(data));
        
        // Sincronizar evaluaciones y moodLog a las claves globales que lee app.js
        if (PortalState.patientId) {
            localStorage.setItem(`psico_portal_results_${PortalState.patientId}`, JSON.stringify(PortalState.evaluations));
            localStorage.setItem(`psico_portal_mood_${PortalState.patientId}`, JSON.stringify(PortalState.moodLog));
        }
    } catch (e) {
        console.error('Error guardando datos del portal:', e);
    }
}

function loadTasksFromNotes() {
    if (!PortalState.patientId) return;
    try {
        let bridge = {};
        try {
            bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        } catch (e) {}

        let patientTasks = Object.values(bridge).filter(t => String(t.patientId) === String(PortalState.patientId));

        // Fallback: Check psico_portal_notes_backup if bridge was empty or missing tasks
        try {
            const backupNotes = JSON.parse(localStorage.getItem('psico_portal_notes_backup') || '[]');
            const matchingNotes = backupNotes.filter(n => String(n.patientId) === String(PortalState.patientId));
            
            matchingNotes.forEach(note => {
                if (Array.isArray(note.intersessionTasks)) {
                    note.intersessionTasks.forEach(task => {
                        if (task.title && task.title.trim()) {
                            const taskId = task.id || `task_${note.id}_${Math.random().toString(36).substr(2, 5)}`;
                            const taskKey = `${PortalState.patientId}_${taskId}`;
                            if (!bridge[taskKey]) {
                                bridge[taskKey] = {
                                    id: taskId,
                                    title: task.title,
                                    description: task.description || '',
                                    dueDate: task.dueDate || '',
                                    completed: !!task.completed,
                                    completedAt: task.completedAt || null,
                                    patientId: PortalState.patientId,
                                    noteId: note.id,
                                    noteTitle: note.title,
                                    noteDate: note.date,
                                    assignedAt: new Date().toISOString()
                                };
                            }
                        }
                    });
                }
            });
            patientTasks = Object.values(bridge).filter(t => String(t.patientId) === String(PortalState.patientId));
            localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));
        } catch (e) {
            console.error('Error cargando notas de respaldo:', e);
        }

        const currentTasks = PortalState.tasks || [];
        patientTasks.forEach(task => {
            const existing = currentTasks.find(t => String(t.id) === String(task.id) || (t.title === task.title && t.dueDate === task.dueDate));
            if (existing) {
                if (existing.completed) {
                    task.completed = true;
                    task.completedAt = existing.completedAt || new Date().toISOString();
                }
                if (existing.id) task.id = existing.id;
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
    if (viewName === 'home') checkContainmentBanner();
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
    checkContainmentBanner();
    document.getElementById('moodConfirmation').style.display = 'flex';
    setTimeout(() => {
        document.getElementById('moodConfirmation').style.display = 'none';
        document.querySelectorAll('.mood-btn').forEach(btn => btn.classList.remove('selected'));
    }, 3000);
    if (value === 1) {
        showToast('🚨 Mensaje de contención: Contacta a tu terapeuta o llama al 0800-PSICO si te sientes en riesgo.', 'error');
    } else {
        showToast('Estado de ánimo registrado', 'success');
    }
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
    const task = (PortalState.tasks || []).find(t => String(t.id) === String(taskId));
    if (!task) return;
    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date().toISOString() : null;
    updateTaskInBridge(task);
    savePatientData();
    renderTasks();
    if (task.completed) {
        showToast('¡Tarea completada! 🎉', 'success');
    }
}

function updateTaskInBridge(task) {
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        const taskKey = `${task.patientId}_${task.id}`;
        if (bridge[taskKey]) {
            bridge[taskKey].completed = task.completed;
            bridge[taskKey].completedAt = task.completedAt;
        } else {
            bridge[taskKey] = { ...task };
        }
        localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));

        // Also update psico_portal_notes_backup if present
        const backupNotes = JSON.parse(localStorage.getItem('psico_portal_notes_backup') || '[]');
        let updatedNotes = false;
        backupNotes.forEach(note => {
            if (Array.isArray(note.intersessionTasks)) {
                note.intersessionTasks.forEach(t => {
                    if (String(t.id) === String(task.id)) {
                        t.completed = task.completed;
                        t.completedAt = task.completedAt;
                        updatedNotes = true;
                    }
                });
            }
        });
        if (updatedNotes) {
            localStorage.setItem('psico_portal_notes_backup', JSON.stringify(backupNotes));
        }
    } catch (e) {
        console.error('Error actualizando tarea en puente:', e);
    }
}

function updateTestsLastResults() {
    const phq9 = PortalState.evaluations.filter(e => e.type === 'phq9').slice(-1)[0];
    const gad7 = PortalState.evaluations.filter(e => e.type === 'gad7').slice(-1)[0];
    const rosenberg = PortalState.evaluations.filter(e => e.type === 'rosenberg').slice(-1)[0];
    const pss10 = PortalState.evaluations.filter(e => e.type === 'pss10').slice(-1)[0];
    const mood = PortalState.moodLog.slice(-1)[0];

    const phqEl = document.getElementById('lastPhq9');
    if (phqEl) phqEl.textContent = phq9 ? `Último: ${formatDateSafe(phq9.date)} · Puntaje ${phq9.score}/27` : 'Sin realizar aún';

    const gadEl = document.getElementById('lastGad7');
    if (gadEl) gadEl.textContent = gad7 ? `Último: ${formatDateSafe(gad7.date)} · Puntaje ${gad7.score}/21` : 'Sin realizar aún';

    const rosEl = document.getElementById('lastRosenberg');
    if (rosEl) rosEl.textContent = rosenberg ? `Último: ${formatDateSafe(rosenberg.date)} · Puntaje ${rosenberg.score}/40` : 'Sin realizar aún';

    const pssEl = document.getElementById('lastPss10');
    if (pssEl) pssEl.textContent = pss10 ? `Último: ${formatDateSafe(pss10.date)} · Puntaje ${pss10.score}/40` : 'Sin realizar aún';

    const moodEl = document.getElementById('lastMood');
    if (moodEl) moodEl.textContent = mood ? `Hoy: ${getMoodLabel(mood.value)}` : 'Sin registro hoy';
}

function canTakeTestThisWeek(testType) {
    if (testType === 'mood') return { allowed: true };
    if (window._overrideTestLimit === testType) return { allowed: true, isOverride: true };

    const lastEval = PortalState.evaluations
        .filter(e => e.type === testType)
        .sort((a, b) => new Date(b.date || b.timestamp) - new Date(a.date || a.timestamp))[0];

    if (!lastEval) return { allowed: true };

    const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const lastTime = new Date(lastEval.date || lastEval.timestamp).getTime();
    const timeSince = Date.now() - lastTime;

    if (timeSince < ONE_WEEK_MS) {
        const daysLeft = Math.ceil((ONE_WEEK_MS - timeSince) / (24 * 60 * 60 * 1000));
        return {
            allowed: false,
            daysLeft: daysLeft,
            lastDate: lastEval.date || new Date(lastTime).toISOString()
        };
    }
    return { allowed: true };
}

function enableTestOverride(testType) {
    window._overrideTestLimit = testType;
    showToast('Prueba habilitada por indicación terapéutica', 'info');
    openTest(testType);
}

function openTest(testType) {
    const modal = document.getElementById('testModal');
    const title = document.getElementById('testModalTitle');
    const body = document.getElementById('testModalBody');

    const check = canTakeTestThisWeek(testType);
    if (!check.allowed) {
        title.textContent = '⏳ Límite de Frecuencia Semanal';
        body.innerHTML = `
            <div style="text-align:center; padding:16px 8px;">
                <div style="font-size:40px; margin-bottom:12px;">⏳</div>
                <h4 style="margin:0 0 8px 0; color:var(--text-primary); font-size:16px;">Evaluación Completada Recientemente</h4>
                <p style="font-size:13px; color:var(--text-secondary); line-height:1.5; margin-bottom:16px;">
                    Completaste este cuestionario el <strong>${formatDateSafe(check.lastDate)}</strong>.
                    Para garantizar la validez psicométrica y evitar la sobre-evaluación, se recomienda realizar las escalas sintomáticas con un intervalo mínimo de 1 semana (salvo indicación clínica explícita).
                </p>
                <div style="background:var(--bg-secondary); padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-secondary); font-size:13px; font-weight:600; color:var(--accent-primary); margin-bottom:20px;">
                    Próxima aplicación recomendada en aproximadamente <strong>${check.daysLeft} día(s)</strong>.
                </div>
                <div style="display:flex; flex-direction:column; gap:10px;">
                    <button class="btn-primary full-width" onclick="closeTestModal()">Entendido</button>
                    <button class="btn-secondary full-width" onclick="enableTestOverride('${testType}')" style="font-size:12px;">
                        Tengo indicación directa de mi terapeuta para repetir la prueba hoy
                    </button>
                </div>
            </div>
        `;
        modal.style.display = 'flex';
        return;
    }

    if (testType === 'phq9') {
        title.textContent = 'Evaluación del Estado de Ánimo (PHQ-9)';
        body.innerHTML = renderTestQuestions(PHQ9_QUESTIONS, 'phq9');
    } else if (testType === 'gad7') {
        title.textContent = 'Evaluación de Ansiedad (GAD-7)';
        body.innerHTML = renderTestQuestions(GAD7_QUESTIONS, 'gad7');
    } else if (testType === 'rosenberg') {
        title.textContent = 'Escala de Autoestima de Rosenberg';
        body.innerHTML = renderTestQuestions(ROSENBERG_QUESTIONS, 'rosenberg');
    } else if (testType === 'pss10') {
        title.textContent = 'Escala de Estrés Percibido (PSS-10)';
        body.innerHTML = renderTestQuestions(PSS10_QUESTIONS, 'pss10');
    } else if (testType === 'mood') {
        title.textContent = 'Registro de Ánimo Diario';
        body.innerHTML = renderMoodQuestions();
    }
    modal.style.display = 'flex';
}

function renderTestQuestions(questions, testType) {
    let options = [
        { label: 'Nunca (0)', val: 0 },
        { label: 'Varios días (1)', val: 1 },
        { label: 'Más de la mitad de los días (2)', val: 2 },
        { label: 'Casi todos los días (3)', val: 3 }
    ];
    let subtitle = 'En las últimas 2 semanas, ¿con qué frecuencia te han molestado los siguientes problemas?';

    if (testType === 'rosenberg') {
        subtitle = 'Por favor responde qué tan de acuerdo o en desacuerdo estás con cada afirmación:';
        options = [
            { label: 'Muy en desacuerdo (1)', val: 1 },
            { label: 'En desacuerdo (2)', val: 2 },
            { label: 'De acuerdo (3)', val: 3 },
            { label: 'Muy de acuerdo (4)', val: 4 }
        ];
    } else if (testType === 'pss10') {
        subtitle = 'En el último mes, ¿con qué frecuencia te has sentido de la siguiente manera?';
        options = [
            { label: 'Nunca (0)', val: 0 },
            { label: 'Casi nunca (1)', val: 1 },
            { label: 'A veces (2)', val: 2 },
            { label: 'A menudo (3)', val: 3 },
            { label: 'Muy a menudo (4)', val: 4 }
        ];
    }

    return `
        <p style="color: var(--text-secondary); font-size: 13px; margin-bottom: 16px;">
            ${subtitle}
        </p>
        <form id="testForm">
            ${questions.map((q, i) => `
                <div class="test-question">
                    <div class="test-question-text">${i + 1}. ${q}</div>
                    <div class="test-options">
                        ${options.map((opt) => `
                            <label class="test-option" onclick="selectOption(this, '${testType}_${i}', ${opt.val})">
                                <input type="radio" name="${testType}_${i}" value="${opt.val}">
                                <span>${opt.label}</span>
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

function getContainmentBoxHTML(reason = '') {
    const therapist = PortalState.therapistName || 'tu terapeuta';
    return `
        <div class="containment-alert-box" style="background:#fdf2f2; border:1px solid #f8b4b4; border-left:6px solid #e16259; border-radius:12px; padding:16px; margin:16px 0; text-align:left; color:#5c1d1d;">
            <div style="display:flex; align-items:center; gap:8px; font-weight:700; font-size:15px; color:#c53030; margin-bottom:8px;">
                <span>🚨</span>
                <span>Estamos aquí para acompañarte</span>
            </div>
            <p style="margin:0 0 10px 0; font-size:13px; color:#5c1d1d; line-height:1.5;">
                ${reason || 'Hemos notado que estás pasando por un momento con el ánimo muy bajo o de alto malestar emocional. Recuerda que no estás solo/a y que tu seguridad y bienestar son lo más importante.'}
            </p>
            <div style="background:#ffffff; border:1px solid #fecaca; border-radius:8px; padding:12px; font-size:13px; line-height:1.6; color:#702424; margin-bottom:10px;">
                <div style="font-weight:700; color:#9b2c2c; margin-bottom:6px;">📞 Contactos de Emergencia y Apoyo Inmediato:</div>
                <div>• <strong>Tu Terapeuta:</strong> ${therapist} (Ponte en contacto directo o deja un mensaje)</div>
                <div>• <strong>Línea de Crisis y Apoyo Emocional 24/7:</strong> 0800-PSICO / 0212-241-92-88</div>
                <div>• <strong>Emergencias Generales:</strong> Llamar al 911 o acudir al centro de salud más cercano.</div>
            </div>
            <div style="font-size:12px; font-style:italic; color:#8c2b2b;">
                Si sientes que estás en riesgo inminente o necesitas ayuda urgente, no dudes en comunicarte inmediatamente con estos servicios.
            </div>
        </div>
    `;
}

function checkContainmentBanner() {
    const container = document.getElementById('containmentBannerContainer');
    if (!container) return;

    const lastMood = PortalState.moodLog.slice(-1)[0];
    const lastPhq = PortalState.evaluations.filter(e => e.type === 'phq9').slice(-1)[0];

    const isVeryLowMood = lastMood && lastMood.value === 1;
    const isSeverePhq = lastPhq && (lastPhq.score >= 15 || lastPhq.item9Score > 0 || lastPhq.item9Alert);

    if (isVeryLowMood || isSeverePhq) {
        let msg = '';
        if (isSeverePhq && (lastPhq.item9Score > 0 || lastPhq.item9Alert)) {
            msg = 'Atención: Tu última evaluación registró ideación de hacerse daño o autolesión. Si te sientes en riesgo, por favor contacta a tu terapeuta o llama a las líneas de emergencia de inmediato.';
        } else if (isSeverePhq) {
            msg = 'Tus resultados indican un nivel de depresión o malestar severo. Si te sientes en riesgo o sobrepasado/a, comunícate con tu terapeuta o utiliza las líneas de crisis.';
        } else {
            msg = 'Registraste un estado de ánimo muy bajo. Queremos recordarte que no estás solo/a y estamos para apoyarte.';
        }
        container.innerHTML = getContainmentBoxHTML(msg);
        container.style.display = 'block';
    } else {
        container.innerHTML = '';
        container.style.display = 'none';
    }
}

function submitTest(testType, questionCount) {
    let total = 0;
    let answered = 0;
    const answers = [];
    for (let i = 0; i < questionCount; i++) {
        const selected = document.querySelector(`input[name="${testType}_${i}"]:checked`);
        if (selected) {
            const rawVal = parseInt(selected.value, 10);
            let scoreVal = rawVal;
            if (testType === 'rosenberg' && [5, 6, 7, 8, 9].includes(i)) {
                scoreVal = 5 - rawVal; // Inversión: 1->4, 2->3, 3->2, 4->1
            } else if (testType === 'pss10' && [3, 4, 5, 6, 8].includes(i)) {
                scoreVal = 4 - rawVal; // Inversión: 0->4, 1->3, 2->2, 3->1, 4->0
            }
            total += scoreVal;
            answers.push(rawVal);
            answered++;
        }
    }
    if (answered < questionCount) {
        showToast('Por favor responde todas las preguntas', 'warning');
        return;
    }

    window._overrideTestLimit = null; // Reiniciar override si se usó

    const item9Score = testType === 'phq9' ? (answers[8] || 0) : 0;
    const item9Alert = item9Score > 0;

    let maxScore = questionCount * 3;
    if (testType === 'rosenberg') maxScore = questionCount * 4;
    else if (testType === 'pss10') maxScore = questionCount * 4;

    const evaluation = {
        id: generateId(),
        type: testType,
        score: total,
        maxScore: maxScore,
        item9Score: item9Score,
        item9Alert: item9Alert,
        answers: answers,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    PortalState.evaluations.push(evaluation);
    savePatientData();
    checkContainmentBanner();
    showTestResult(testType, total, maxScore, item9Score);
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
    const avgMood = answers.reduce((a, b) => a + b, 0) / answers.length;
    const roundMood = Math.round(avgMood);
    const moodEntry = {
        id: generateId(),
        value: roundMood,
        details: answers,
        date: new Date().toISOString(),
        timestamp: Date.now()
    };
    PortalState.moodLog.push(moodEntry);
    savePatientData();
    closeTestModal();
    checkContainmentBanner();

    if (roundMood <= 1.5) {
        showToast('🚨 Mensaje de contención: Contacta a tu terapeuta o llama al 0800-PSICO si te sientes en riesgo.', 'error');
    } else {
        showToast('Registro guardado con éxito', 'success');
    }
}

function showTestResult(testType, score, maxScore, item9Score = 0) {
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

    const isContainmentNeeded = (testType === 'phq9' && (score >= 15 || item9Score > 0));
    let containmentHtml = '';
    if (isContainmentNeeded) {
        const reason = item9Score > 0
            ? '🚨 ALERTA CRÍTICA: Has indicado presencia de pensamientos de hacerte daño o ideación de muerte (Ítem 9 del PHQ-9). Por favor comunícate de inmediato con tu terapeuta o con la línea de ayuda de emergencia.'
            : 'Resultados de depresión severa registrados. Recuerda que cuentas con el apoyo de tu terapeuta y líneas de atención rápida.';
        containmentHtml = getContainmentBoxHTML(reason);
    }

    body.innerHTML = `
        <div class="test-result">
            <div class="test-result-icon">${icon}</div>
            <div class="test-result-title">${level}${item9Score > 0 ? ' 🚨' : ''}</div>
            <div class="test-result-score">${score} / ${maxScore}</div>
            <div class="test-result-message">${message}</div>
            ${containmentHtml}
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
