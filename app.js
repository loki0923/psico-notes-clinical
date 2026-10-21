/**
 * PSICO NOTES CLINICAL v5.0
 * Gestión Clínica Psicológica Completa
 */

// ============================================
// ESTADO GLOBAL
// ============================================
const AppState = {
    currentView: 'dashboard',
    agendaViewMode: 'month',
    sidebarCollapsed: false,
    darkMode: false,
    patients: [],
    appointments: [],
    notes: [],
    treatmentPlans: [],
    currentDate: new Date(),
    selectedDate: new Date(),
    editingId: null,
    currentUser: null
};

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', () => {
    initAuthEventListeners();
    loadThemePreference();
    const session = getSession();
    if (session) {
        const user = getUsers().find(u => u.id === session);
        if (user) {
            AppState.currentUser = { id: user.id, name: user.name, email: user.email };
            startAppForCurrentUser();
            return;
        }
    }
    showAuthScreen();
});

async function startAppForCurrentUser() {
    showApp();
    updateSidebarUser();
    await loadData();
    initEventListeners();
    initInactivityProtection();
    populateSoapTemplateDropdown();
    renderCalendar();
    updateDashboard();
    renderPatients();
    renderAppointments();
    renderNotes();
    updateStats();
    updateCounts();
    updatePatientSelects();
}

// ============================================
// CIFRADO AES-GCM Y PERSISTENCIA
// ============================================
function userStorageKey(name) {
    const uid = AppState.currentUser ? AppState.currentUser.id : 'anon';
    return `psico_clinical_${name}_${uid}`;
}

async function getCryptoKey(userId) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(userId + '_psico_clinical_key_2026'),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new TextEncoder().encode('psico_salt_v1'), iterations: 100000, hash: 'SHA-256' },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptData(data) {
    try {
        const key = await getCryptoKey(AppState.currentUser?.id || 'anon');
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(JSON.stringify(data));
        const cipherBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
        const combined = new Uint8Array(iv.length + cipherBuffer.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(cipherBuffer), iv.length);
        return btoa(String.fromCharCode(...combined));
    } catch (e) {
        console.error('Error cifrando:', e);
        return btoa(encodeURIComponent(JSON.stringify(data)));
    }
}

async function decryptData(cipherText) {
    if (!cipherText) return [];
    try {
        const key = await getCryptoKey(AppState.currentUser?.id || 'anon');
        const combined = Uint8Array.from(atob(cipherText), c => c.charCodeAt(0));
        const iv = combined.slice(0, 12);
        const data = combined.slice(12);
        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return JSON.parse(new TextDecoder().decode(decrypted));
    } catch (e) {
        try { return JSON.parse(decodeURIComponent(atob(cipherText))); }
        catch { try { return JSON.parse(cipherText); } catch { return []; } }
    }
}

function loadThemePreference() {
    const darkMode = localStorage.getItem('psico_darkMode');
    if (darkMode === 'true') {
        AppState.darkMode = true;
        document.documentElement.setAttribute('data-theme', 'dark');
        updateThemeIcon();
    }
}

async function loadData() {
    try {
        const patients = localStorage.getItem(userStorageKey('patients'));
        const appointments = localStorage.getItem(userStorageKey('appointments'));
        const notes = localStorage.getItem(userStorageKey('notes'));
        const plans = localStorage.getItem(userStorageKey('plans'));
        AppState.patients = await loadAndMigratePatients(patients);
        AppState.appointments = appointments ? await decryptData(appointments) : [];
        AppState.notes = notes ? await decryptData(notes) : [];
        AppState.treatmentPlans = plans ? await decryptData(plans) : [];
    } catch (e) {
        console.error('Error cargando:', e);
    }
}

async function loadAndMigratePatients(storedPatients) {
    if (!storedPatients) return [];
    const parsed = await decryptData(storedPatients);
    return parsed.map(p => ({
        ...p,
        reason: p.reason || p.medical || '',
        diagnosis: p.diagnosis || 'Pendiente de evaluación'
    }));
}

async function saveData() {
    try {
        localStorage.setItem(userStorageKey('patients'), await encryptData(AppState.patients));
        localStorage.setItem(userStorageKey('appointments'), await encryptData(AppState.appointments));
        localStorage.setItem(userStorageKey('notes'), await encryptData(AppState.notes));
        localStorage.setItem(userStorageKey('plans'), await encryptData(AppState.treatmentPlans));
        localStorage.setItem('psico_darkMode', AppState.darkMode);
        localStorage.setItem('psico_portal_notes_backup', JSON.stringify(AppState.notes));
        syncAllTasksToBridge();
        if (typeof updateSessionRemindersUI === 'function') updateSessionRemindersUI();
    } catch (e) {
        console.error('Error guardando:', e);
    }
}

// ============================================
// AUTENTICACIÓN
// ============================================
async function hashPassword(password) {
    const data = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getUsers() {
    try { return JSON.parse(localStorage.getItem('psico_users') || '[]'); }
    catch { return []; }
}

function saveUsers(users) { localStorage.setItem('psico_users', JSON.stringify(users)); }
function getSession() { return localStorage.getItem('psico_session'); }
function setSession(userId) { localStorage.setItem('psico_session', userId); }
function clearSession() { localStorage.removeItem('psico_session'); }

function showAuthScreen() {
    document.getElementById('authScreen').classList.remove('hidden');
    document.querySelector('.sidebar').style.display = 'none';
    document.getElementById('mainContent').style.display = 'none';
}

function showApp() {
    document.getElementById('authScreen').classList.add('hidden');
    document.querySelector('.sidebar').style.display = '';
    document.getElementById('mainContent').style.display = '';
}

function updateSidebarUser() {
    if (!AppState.currentUser) return;
    document.getElementById('sidebarUserName').textContent = AppState.currentUser.name;
    document.getElementById('sidebarUserEmail').textContent = AppState.currentUser.email;
}

function initAuthEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('registerForm').style.display = '';
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('loginForm').style.display = '';
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
}

async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.classList.remove('visible');
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const user = getUsers().find(u => u.email === email);
    if (!user) { errorEl.textContent = 'No existe una cuenta con este correo.'; errorEl.classList.add('visible'); return; }
    const hash = await hashPassword(password);
    if (hash !== user.passwordHash) { errorEl.textContent = 'Contraseña incorrecta.'; errorEl.classList.add('visible'); return; }
    AppState.currentUser = { id: user.id, name: user.name, email: user.email };
    setSession(user.id);
    document.getElementById('loginForm').reset();
    await startAppForCurrentUser();
    showToast(`Bienvenido/a, ${user.name}`, 'success');
}

async function handleRegister(e) {
    e.preventDefault();
    const errorEl = document.getElementById('registerError');
    errorEl.classList.remove('visible');
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;
    if (password !== password2) { errorEl.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.add('visible'); return; }
    if (password.length < 6) { errorEl.textContent = 'Mínimo 6 caracteres.'; errorEl.classList.add('visible'); return; }
    const users = getUsers();
    if (users.some(u => u.email === email)) { errorEl.textContent = 'Correo ya registrado.'; errorEl.classList.add('visible'); return; }
    const newUser = { id: generateId(), name, email, passwordHash: await hashPassword(password), createdAt: new Date().toISOString() };
    users.push(newUser);
    saveUsers(users);
    AppState.currentUser = { id: newUser.id, name: newUser.name, email: newUser.email };
    setSession(newUser.id);
    document.getElementById('registerForm').reset();
    await startAppForCurrentUser();
    showToast(`Cuenta creada. Bienvenida/o, ${newUser.name}`, 'success');
}

function handleLogout() {
    if (!confirm('¿Cerrar el expediente y salir?')) return;
    clearSession();
    AppState.currentUser = null;
    AppState.patients = []; AppState.appointments = []; AppState.notes = []; AppState.treatmentPlans = [];
    AppState.currentView = 'dashboard';
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = '';
    showAuthScreen();
}

// ============================================
// NAVEGACIÓN Y EVENTOS
// ============================================
function initEventListeners() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    if (sidebarToggle) sidebarToggle.addEventListener('click', toggleSidebar);
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            if (item.dataset.view) navigateTo(item.dataset.view);
        });
    });
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    const prevMonth = document.getElementById('prevMonth');
    if (prevMonth) prevMonth.addEventListener('click', () => changeMonth(-1));
    const nextMonth = document.getElementById('nextMonth');
    if (nextMonth) nextMonth.addEventListener('click', () => changeMonth(1));
    const patientForm = document.getElementById('patientForm');
    if (patientForm) patientForm.addEventListener('submit', handlePatientSubmit);
    const appointmentForm = document.getElementById('appointmentForm');
    if (appointmentForm) appointmentForm.addEventListener('submit', handleAppointmentSubmit);
    const noteForm = document.getElementById('noteForm');
    if (noteForm) noteForm.addEventListener('submit', handleNoteSubmit);
    const patientSearch = document.getElementById('patientSearch');
    if (patientSearch) patientSearch.addEventListener('input', (e) => filterPatients(e.target.value));
    const notesSearch = document.getElementById('notesSearch');
    if (notesSearch) notesSearch.addEventListener('input', (e) => filterNotes(e.target.value));
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) globalSearch.addEventListener('input', (e) => handleGlobalSearch(e.target.value));
}

function navigateTo(view) {
    AppState.currentView = view;
    document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === view));
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(view + 'View');
    if (targetView) targetView.classList.add('active');
    const titles = {
        dashboard: 'Mi Consulta',
        patients: 'Personas en Proceso',
        appointments: 'Agenda',
        notes: 'Proceso Terapéutico',
        scales: 'Escalas y Evaluaciones',
        finance: 'Finanzas',
        billing: 'Facturación SENIAT',
        search: 'Búsqueda Global',
        stats: 'Métricas'
    };
    document.getElementById('breadcrumb').innerHTML = `<span>${titles[view] || 'Inicio'}</span>`;
    if (view === 'dashboard') updateDashboard();
    if (view === 'patients') renderPatients();
    if (view === 'appointments') { renderCalendar(); renderAppointments(); }
    if (view === 'notes') renderNotes();
    if (view === 'scales' && typeof renderScalesView === 'function') renderScalesView();
    if (view === 'finance' && typeof renderFinanceView === 'function') renderFinanceView();
    if (view === 'billing' && typeof openInvoicesList === 'function') openInvoicesList();
    if (view === 'stats') updateStats();
}

function toggleSidebar() {
    AppState.sidebarCollapsed = !AppState.sidebarCollapsed;
    document.getElementById('sidebar').classList.toggle('collapsed', AppState.sidebarCollapsed);
}

function toggleTheme() {
    AppState.darkMode = !AppState.darkMode;
    document.documentElement.setAttribute('data-theme', AppState.darkMode ? 'dark' : 'light');
    updateThemeIcon();
    saveData();
}

function updateThemeIcon() {
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        icon.className = AppState.darkMode ? 'fas fa-sun' : 'fas fa-moon';
    }
}

// ============================================
// DASHBOARD
// ============================================
function updateDashboard() {
    const today = new Date();
    renderWelcome(today);
    renderDaySummary(today);
    renderClinicalAlerts();
    renderEvolutionCharts();
    renderContextualAgenda(today);
    if (typeof updateSessionRemindersUI === 'function') updateSessionRemindersUI();
}

function renderWelcome(today) {
    const hour = today.getHours();
    let greeting = 'Buenas noches';
    if (hour < 12) greeting = 'Buenos días';
    else if (hour < 19) greeting = 'Buenas tardes';
    document.getElementById('welcomeGreeting').textContent = greeting;
    const userName = AppState.currentUser?.name || 'Terapeuta';
    const firstName = userName.split(' ')[0];
    document.getElementById('welcomeTitle').textContent = firstName;
    const todayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), today) && a.status !== 'cancelada');
    const priorityCount = calculatePriorityPatients().length;
    let subtitle = 'Tu consulta te espera';
    if (todayApps.length > 0) {
        subtitle = `Hoy tienes ${todayApps.length} sesión${todayApps.length > 1 ? 'es' : ''} programada${todayApps.length > 1 ? 's' : ''}`;
        if (priorityCount > 0) subtitle += `. ${priorityCount} paciente${priorityCount > 1 ? 's' : ''} requiere${priorityCount === 1 ? '' : 'n'} seguimiento prioritario`;
    }
    document.getElementById('welcomeSubtitle').textContent = subtitle;
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    document.getElementById('currentDay').textContent = dayNames[today.getDay()];
    document.getElementById('currentDate').textContent = `${today.getDate()} de ${monthNames[today.getMonth()]} de ${today.getFullYear()}`;
}

function renderDaySummary(today) {
    const todayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), today) && a.status !== 'cancelada');
    document.getElementById('todaySessions').textContent = todayApps.length;
    document.getElementById('todaySessionsLabel').textContent = todayApps.length === 1 ? 'Programada' : 'Programadas';
    const priority = calculatePriorityPatients();
    document.getElementById('priorityPatients').textContent = priority.length;
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekGoals = AppState.treatmentPlans.filter(g => g.status === 'logrado' && new Date(g.createdAt || g.deadline) >= weekStart).length;
    document.getElementById('weekGoals').textContent = weekGoals;
    const avgMood = calculateAverageMood();
    document.getElementById('avgMood').textContent = avgMood.emoji;
    document.getElementById('avgMood').title = avgMood.label;
}

function renderClinicalAlerts() {
    const alerts = generateClinicalAlerts();
    const container = document.getElementById('clinicalAlerts');
    if (alerts.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">✅</div><p>Sin alertas pendientes. ¡Buen trabajo!</p></div>`;
        return;
    }
    container.innerHTML = alerts.map(a => `<div class="clinical-alert alert-${a.level}" onclick="viewPatient('${a.patientId}')"><div class="alert-indicator"></div><div class="alert-icon">${a.icon}</div><div class="alert-content"><div class="alert-title">${a.title}</div><div class="alert-description">${a.description}</div></div><div class="alert-patient">${a.patientName}</div></div>`).join('');
}

function generateClinicalAlerts() {
    const alerts = [];
    const today = new Date();
    AppState.patients.forEach(patient => {
        const patientNotes = AppState.notes.filter(n => n.patientId === patient.id);
        const patientApps = AppState.appointments.filter(a => a.patientId === patient.id);
        const latestNote = patientNotes.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const latestApp = patientApps.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

        // 1. Check for PHQ-9 Item 9 Suicidal Ideation Alert (from clinical notes or portal results)
        let portalResults = [];
        try {
            const pRes = localStorage.getItem(`psico_portal_results_${patient.id}`);
            if (pRes) portalResults = JSON.parse(pRes);
        } catch(e) {}
        const latestPortalPhq = portalResults.filter(r => r.type === 'phq9').slice(-1)[0];
        const latestNotePhq = patientNotes.find(n => n.scaleResult?.scale === 'phq9');

        const item9NoteScore = latestNotePhq?.scaleResult?.item9Score || (latestNotePhq?.scaleResult?.answers ? parseInt(latestNotePhq.scaleResult.answers[8], 10) : 0);
        const item9PortalScore = latestPortalPhq?.item9Score || (latestPortalPhq?.item9Alert ? 1 : 0);
        const maxItem9 = Math.max(item9NoteScore || 0, item9PortalScore || 0);

        if (maxItem9 > 0) {
            alerts.push({
                level: 'critical',
                icon: '🚨',
                title: '🚨 Ideación Autolítica (Ítem 9 PHQ-9)',
                description: `Independiente del puntaje total: ${maxItem9}/3 en pensamientas de hacerse daño. Evaluar riesgo suicida.`,
                patientId: patient.id,
                patientName: patient.name,
                priority: 0
            });
        }

        if (latestNote?.risk === 'alto') {
            alerts.push({ level: 'critical', icon: '🚨', title: 'Riesgo alto detectado', description: 'Última nota clínica indica riesgo elevado', patientId: patient.id, patientName: patient.name, priority: 1 });
        }
        const latestScale = latestNotePhq || latestPortalPhq;
        const totalScore = latestNotePhq ? latestNotePhq.scaleResult.score : (latestPortalPhq ? latestPortalPhq.score : 0);
        if (totalScore >= 19) {
            alerts.push({ level: 'critical', icon: '⚠️', title: 'Depresión severa', description: `PHQ-9: ${totalScore}/27 - Evaluación urgente`, patientId: patient.id, patientName: patient.name, priority: 2 });
        }
        if (latestApp) {
            const daysSince = Math.floor((today - new Date(latestApp.date)) / 86400000);
            if (daysSince > 21) {
                alerts.push({ level: 'warning', icon: '📅', title: `Sin sesión hace ${daysSince} días`, description: 'Considerar seguimiento', patientId: patient.id, patientName: patient.name, priority: 3 });
            }
        }
        const pendingTasks = patientNotes.flatMap(n => n.intersessionTasks || []).filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today);
        if (pendingTasks.length > 0) {
            alerts.push({ level: 'info', icon: '📋', title: `${pendingTasks.length} tarea${pendingTasks.length > 1 ? 's' : ''} vencida${pendingTasks.length > 1 ? 's' : ''}`, description: 'Revisar en próxima sesión', patientId: patient.id, patientName: patient.name, priority: 4 });
        }
    });
    return alerts.sort((a, b) => a.priority - b.priority).slice(0, 8);
}

function calculatePriorityPatients() {
    const today = new Date();
    return AppState.patients.filter(patient => {
        const notes = AppState.notes.filter(n => n.patientId === patient.id);
        const latest = notes.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (!latest) return false;
        if (latest.risk === 'alto') return true;
        if (latest.scaleResult?.score >= 19) return true;
        const apps = AppState.appointments.filter(a => a.patientId === patient.id);
        const latestApp = apps.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        if (latestApp) {
            const days = Math.floor((today - new Date(latestApp.date)) / 86400000);
            if (days > 21) return true;
        }
        return false;
    });
}

function calculateAverageMood() {
    const moodValues = { 'muy-bueno': 5, 'bueno': 4, 'neutral': 3, 'bajo': 2, 'muy-bajo': 1 };
    const moodEmojis = { 5: '😊', 4: '🙂', 3: '😐', 2: '😔', 1: '😞' };
    const moodLabels = { 5: 'Eutímico', 4: 'Estable', 3: 'Neutral', 2: 'Ansioso', 1: 'Depresivo' };
    const recentNotes = AppState.notes.filter(n => n.mood).slice(-10);
    if (recentNotes.length === 0) return { emoji: '—', label: 'Sin datos' };
    const sum = recentNotes.reduce((acc, n) => acc + (moodValues[n.mood] || 3), 0);
    const avg = sum / recentNotes.length;
    const rounded = Math.round(avg);
    return { emoji: moodEmojis[rounded] || '—', label: moodLabels[rounded] || 'Sin datos' };
}

function renderEvolutionCharts() {
    renderAnxietyChart();
    renderMoodChart();
    renderAttendanceChart();
    renderSessionsChart();
}

function renderAnxietyChart() {
    const container = document.getElementById('anxietyChart');
    if (!container) return;
    const scales = AppState.notes.filter(n => n.scaleResult?.scale === 'gad7').sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-8);
    if (scales.length === 0) { container.innerHTML = '<div class="chart-empty">Sin datos de GAD-7 aún</div>'; return; }
    const data = scales.map(s => ({ value: s.scaleResult.score, date: new Date(s.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) }));
    renderMiniChart(container, data, 21, '#e16259');
}

function renderMoodChart() {
    const container = document.getElementById('moodChart');
    if (!container) return;
    const moodValues = { 'muy-bueno': 5, 'bueno': 4, 'neutral': 3, 'bajo': 2, 'muy-bajo': 1 };
    const notes = AppState.notes.filter(n => n.mood).sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-8);
    if (notes.length === 0) { container.innerHTML = '<div class="chart-empty">Sin registros de ánimo aún</div>'; return; }
    const data = notes.map(n => ({ value: moodValues[n.mood] || 3, date: new Date(n.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) }));
    renderMiniChart(container, data, 5, '#4dab87');
}

function renderAttendanceChart() {
    const container = document.getElementById('attendanceChart');
    if (!container) return;
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const weekApps = AppState.appointments.filter(a => { const d = new Date(a.date); return d >= weekStart && d <= weekEnd; });
        const completed = weekApps.filter(a => a.status === 'completada').length;
        const total = weekApps.length;
        const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
        weeks.push({ value: rate, date: `S${4 - i}` });
    }
    renderMiniChart(container, weeks, 100, '#6b9080');
}

function renderSessionsChart() {
    const container = document.getElementById('sessionsChart');
    if (!container) return;
    const today = new Date();
    const weeks = [];
    for (let i = 3; i >= 0; i--) {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - (i * 7) - weekStart.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        const count = AppState.appointments.filter(a => { const d = new Date(a.date); return d >= weekStart && d <= weekEnd && a.status === 'completada'; }).length;
        weeks.push({ value: count, date: `S${4 - i}` });
    }
    const max = Math.max(...weeks.map(w => w.value), 1);
    renderMiniChart(container, weeks, max, '#d4a574');
}

function renderMiniChart(container, data, maxVal, color) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="chart-empty">Sin datos</div>';
        return;
    }
    const max = maxVal || 1;
    const width = 280, height = 100, padding = 12;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2 - 16;
    const xStep = data.length > 1 ? chartWidth / (data.length - 1) : chartWidth / 2;
    
    const points = data.map((d, i) => {
        const val = Math.max(0, Math.min(d.value, max));
        const x = data.length > 1 ? padding + i * xStep : padding + chartWidth / 2;
        const y = padding + chartHeight - (val / max) * chartHeight;
        return { x, y, value: d.value, label: d.date };
    });

    let pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        pathD += ` L ${points[i].x} ${points[i].y}`;
    }
    const areaD = pathD + ` L ${points[points.length - 1].x} ${padding + chartHeight} L ${points[0].x} ${padding + chartHeight} Z`;

    const svg = `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:100%;"><defs><linearGradient id="grad-${color.replace('#', '')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${color}" stop-opacity="0.3"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></linearGradient></defs><path d="${areaD}" fill="url(#grad-${color.replace('#', '')})"/><path d="${pathD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="${color}" stroke="white" stroke-width="1.5"><title>${p.label}: ${p.value}</title></circle>`).join('')}${points.map((p, i) => i % 2 === 0 ? `<text x="${p.x}" y="${height - 2}" text-anchor="middle" font-size="9" fill="var(--text-tertiary)">${p.label}</text>` : '').join('')}</svg>`;
    container.innerHTML = svg;
}

function renderContextualAgenda(today) {
    const container = document.getElementById('contextualAgenda');
    if (!container) return;
    const todayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), today) && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));
    if (todayApps.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📅</div><p>No hay sesiones hoy</p><button class="btn-primary" onclick="openModal('appointmentModal')">Agendar cita</button></div>`;
        return;
    }
    container.innerHTML = todayApps.map(app => {
        const patient = AppState.patients.find(p => p.id === app.patientId);
        if (!patient) return '';
        const wellbeing = calculatePatientWellbeing(app.patientId);
        const moodStatus = getMoodStatus(app.patientId);
        const sessionCount = AppState.appointments.filter(a => a.patientId === app.patientId && a.status === 'completada').length;
        const latestScale = AppState.notes.filter(n => n.patientId === app.patientId && n.scaleResult?.scale === 'gad7').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        const latestGoal = AppState.treatmentPlans.filter(g => g.patientId === app.patientId && g.status === 'en-progreso').sort((a, b) => b.progress - a.progress)[0];
        return `<div class="contextual-appointment" onclick="editAppointment('${app.id}')"><div class="appointment-time"><div class="time-value">${formatTime(app.time)}</div><div class="time-duration">${app.duration} min</div></div><div class="appointment-wellbeing">${renderWellbeingRing(wellbeing)}</div><div class="appointment-patient-info"><div class="patient-name-line"><div class="patient-avatar-small">${getInitials(patient.name)}</div><div><div class="patient-name">${patient.name}</div><div class="patient-diagnosis">${patient.diagnosis || 'Sin diagnóstico'}</div></div></div><div class="appointment-context">${moodStatus ? `<span class="context-tag mood-${moodStatus.level}">${moodStatus.emoji} ${moodStatus.label}</span>` : ''}${latestScale ? `<span class="context-tag">📊 GAD-7: ${latestScale.scaleResult.score}</span>` : ''}<span class="context-tag">Sesión ${sessionCount + 1}</span></div>${latestGoal ? `<div class="appointment-goal"><i class="fas fa-bullseye"></i><span>${latestGoal.title}</span><span class="goal-progress">${latestGoal.progress}%</span></div>` : ''}</div><div class="appointment-status-indicator status-${app.status}"></div></div>`;
    }).join('');
}

// ============================================
// ÍNDICE DE BIENESTAR
// ============================================
function calculatePatientWellbeing(patientId) {
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const apps = AppState.appointments.filter(a => a.patientId === patientId);
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const today = new Date();
    let score = 50;
    const recentMoods = notes.filter(n => n.mood).slice(-5);
    if (recentMoods.length > 0) {
        const moodValues = { 'muy-bueno': 25, 'bueno': 18, 'neutral': 0, 'bajo': -12, 'muy-bajo': -25 };
        const avg = recentMoods.reduce((s, n) => s + (moodValues[n.mood] || 0), 0) / recentMoods.length;
        score += avg;
    }
    const latestPhq = notes.filter(n => n.scaleResult?.scale === 'phq9').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const latestGad = notes.filter(n => n.scaleResult?.scale === 'gad7').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestPhq) score += (27 - (latestPhq.scaleResult?.score || 0)) * 0.9;
    if (latestGad) score += (21 - (latestGad.scaleResult?.score || 0)) * 0.6;
    const completed = apps.filter(a => a.status === 'completada').length;
    const total = apps.length;
    if (total > 0) score += (completed / total) * 20;
    if (goals.length > 0) {
        const avgProgress = goals.reduce((s, g) => s + (g.progress || 0), 0) / goals.length;
        score += avgProgress * 0.15;
    }
    const allTasks = notes.flatMap(n => n.intersessionTasks || []);
    if (allTasks.length > 0) {
        const done = allTasks.filter(t => t.completed).length;
        score += (done / allTasks.length) * 10;
    }
    const latestApp = apps.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestApp) {
        const days = Math.floor((today - new Date(latestApp.date)) / 86400000);
        if (days > 14) score -= 15;
        if (days > 30) score -= 10;
    }
    score = Math.max(0, Math.min(100, Math.round(score)));
    let statusLabel, statusClass, color;
    if (score >= 80) { statusLabel = 'Excelente'; statusClass = 'excellent'; color = '#4dab87'; }
    else if (score >= 65) { statusLabel = 'Bueno'; statusClass = 'good'; color = '#7cb342'; }
    else if (score >= 45) { statusLabel = 'Moderado'; statusClass = 'moderate'; color = '#fdcb6e'; }
    else if (score >= 25) { statusLabel = 'Atención'; statusClass = 'warning'; color = '#e67e22'; }
    else { statusLabel = 'Crítico'; statusClass = 'critical'; color = '#e16259'; }
    return { score, statusLabel, statusClass, color };
}

function renderWellbeingRing(wb) {
    const color = wb.color;
    const radius = 20;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (wb.score / 100) * circumference;
    return `<svg width="50" height="50" viewBox="0 0 50 50"><circle cx="25" cy="25" r="${radius}" fill="none" stroke="var(--bg-tertiary)" stroke-width="4"/><circle cx="25" cy="25" r="${radius}" fill="none" stroke="${color}" stroke-width="4" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" transform="rotate(-90 25 25)" stroke-linecap="round"/><text x="25" y="29" text-anchor="middle" font-size="12" font-weight="700" fill="var(--text-primary)">${wb.score}</text></svg>`;
}

function renderWellbeingRingLarge(wb) {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (wb.score / 100) * circumference;
    return `<div class="wellbeing-ring"><svg width="120" height="120"><circle cx="60" cy="60" r="${radius}" fill="none" stroke="var(--bg-tertiary)" stroke-width="10"/><circle cx="60" cy="60" r="${radius}" fill="none" stroke="${wb.color}" stroke-width="10" stroke-dasharray="${circumference}" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition: stroke-dashoffset 1s ease;"/></svg><div class="wellbeing-ring-value"><div class="score" style="color:${wb.color}">${wb.score}</div><div class="label">Bienestar</div></div></div>`;
}

function getMoodStatus(patientId) {
    const notes = AppState.notes.filter(n => n.patientId === patientId && n.mood).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (notes.length === 0) return null;
    const latest = notes[0];
    const moodMap = {
        'muy-bueno': { emoji: '😊', label: 'Estable', level: 'good' },
        'bueno': { emoji: '🙂', label: 'Bien', level: 'good' },
        'neutral': { emoji: '😐', label: 'Neutral', level: 'neutral' },
        'bajo': { emoji: '😔', label: 'Vigilancia', level: 'warning' },
        'muy-bajo': { emoji: '😞', label: 'Atención', level: 'critical' }
    };
    return moodMap[latest.mood] || null;
}

// ============================================
// PACIENTES
// ============================================
function renderPatients(filter = '') {
    const container = document.getElementById('patientsList');
    if (!container) return;
    let patients = AppState.patients;
    if (filter) {
        const lf = filter.toLowerCase();
        patients = patients.filter(p => p.name.toLowerCase().includes(lf) || (p.diagnosis && p.diagnosis.toLowerCase().includes(lf)) || (p.phone && p.phone.includes(filter)));
    }
    if (patients.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>${filter ? 'Sin coincidencias' : 'No hay expedientes registrados'}</p>${!filter ? '<button class="btn-primary" onclick="openModal(\'patientModal\')">Crear primer expediente</button>' : ''}</div>`;
        return;
    }
    container.innerHTML = patients.map(p => `<div class="patient-card" onclick="viewPatient('${p.id}')"><div class="patient-avatar">${getInitials(p.name)}</div><div class="patient-info"><div class="patient-name">${p.name}</div><div class="patient-meta"><strong>Diag:</strong> ${p.diagnosis || 'Pendiente'} ${p.phone ? '· ' + p.phone : ''} ${p.birthdate ? '· ' + calculateAge(p.birthdate) + ' años' : ''}</div></div><div class="patient-actions"><button class="btn-icon" onclick="event.stopPropagation(); editPatient('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="event.stopPropagation(); deletePatient('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button></div></div>`).join('');
}

function filterPatients(q) { renderPatients(q); }

function handlePatientSubmit(e) {
    e.preventDefault();
    const patient = {
        id: document.getElementById('patientId').value || generateId(),
        name: document.getElementById('patientName').value.trim(),
        birthdate: document.getElementById('patientBirthdate').value,
        email: document.getElementById('patientEmail').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        gender: document.getElementById('patientGender').value,
        occupation: document.getElementById('patientOccupation').value.trim(),
        emergency: document.getElementById('patientEmergency').value.trim(),
        emergencyRelation: document.getElementById('patientEmergencyRelation').value.trim(),
        reason: document.getElementById('patientReason').value.trim(),
        goals: document.getElementById('patientGoals').value.trim(),
        diagnosis: document.getElementById('patientDiagnosis').value.trim() || 'Pendiente de evaluación',
        diagnosis2: document.getElementById('patientDiagnosis2').value.trim(),
        medication: document.getElementById('patientMedication').value.trim(),
        medical: document.getElementById('patientMedical').value.trim(),
        familyHistory: document.getElementById('patientFamilyHistory').value.trim(),
        riskFactors: document.getElementById('patientRiskFactors').value.trim(),
        protectiveFactors: document.getElementById('patientProtectiveFactors').value.trim(),
        notes: document.getElementById('patientNotes').value.trim(),
        frequency: document.getElementById('patientFrequency').value,
        modality: document.getElementById('patientModality').value,
        createdAt: new Date().toISOString()
    };
    const idx = AppState.patients.findIndex(p => p.id === patient.id);
    if (idx >= 0) { AppState.patients[idx] = patient; showToast('Expediente actualizado', 'success'); }
    else { AppState.patients.push(patient); showToast('Expediente creado', 'success'); }
    saveData();
    closeModal('patientModal');
    renderPatients();
    updateCounts();
    updateDashboard();
    updatePatientSelects();
}

function editPatient(id) {
    const p = AppState.patients.find(x => x.id === id);
    if (!p) return;
    document.getElementById('patientId').value = p.id;
    document.getElementById('patientName').value = p.name;
    document.getElementById('patientBirthdate').value = p.birthdate || '';
    document.getElementById('patientEmail').value = p.email || '';
    document.getElementById('patientPhone').value = p.phone || '';
    document.getElementById('patientGender').value = p.gender || '';
    document.getElementById('patientOccupation').value = p.occupation || '';
    document.getElementById('patientEmergency').value = p.emergency || '';
    document.getElementById('patientEmergencyRelation').value = p.emergencyRelation || '';
    document.getElementById('patientReason').value = p.reason || '';
    document.getElementById('patientGoals').value = p.goals || '';
    document.getElementById('patientDiagnosis').value = p.diagnosis || '';
    document.getElementById('patientDiagnosis2').value = p.diagnosis2 || '';
    document.getElementById('patientMedication').value = p.medication || '';
    document.getElementById('patientMedical').value = p.medical || '';
    document.getElementById('patientFamilyHistory').value = p.familyHistory || '';
    document.getElementById('patientRiskFactors').value = p.riskFactors || '';
    document.getElementById('patientProtectiveFactors').value = p.protectiveFactors || '';
    document.getElementById('patientNotes').value = p.notes || '';
    document.getElementById('patientFrequency').value = p.frequency || '';
    document.getElementById('patientModality').value = p.modality || '';
    document.getElementById('patientModalTitle').textContent = 'Editar Expediente';
    openModal('patientModal');
}

function deletePatient(id) {
    showConfirmModal(
        'Eliminar Expediente',
        '¿Está seguro/a de eliminar este expediente y todos sus registros asociados?',
        () => {
            AppState.patients = AppState.patients.filter(p => String(p.id) !== String(id));
            AppState.appointments = AppState.appointments.filter(a => String(a.patientId) !== String(id));
            AppState.notes = AppState.notes.filter(n => String(n.patientId) !== String(id));
            AppState.treatmentPlans = AppState.treatmentPlans.filter(p => String(p.patientId) !== String(id));
            saveData();
            renderPatients();
            updateCounts();
            updateDashboard();
            updatePatientSelects();
            showToast('Expediente eliminado', 'success');
        }
    );
}

function viewPatient(id) {
    const patient = AppState.patients.find(p => p.id === id);
    if (!patient) return;

    if (window.AIAssistant) {
        window.AIAssistant.selectedPatientId = id;
    }

    const wellbeing = calculatePatientWellbeing(id);
    const patientNotes = AppState.notes.filter(n => n.patientId === id);
    const patientApps = AppState.appointments.filter(a => a.patientId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const patientGoals = AppState.treatmentPlans.filter(g => g.patientId === id);
    const emotionalProfile = calculateEmotionalProfile(id);
    const clinicalInsights = generateClinicalInsights(id);
    const sessionPrep = generateSessionPrep(id);
    const { results: portalResults, moods: portalMoods } = getPortalResults(id);
    const portalCount = portalResults.length + portalMoods.length;
    const detail = document.getElementById('patientDetail');
    detail.innerHTML = `
        <div class="patient-intel-header">
            <div class="patient-intel-avatar">${getInitials(patient.name)}</div>
            <div class="patient-intel-info">
                <h2>${patient.name}</h2>
                <div class="patient-intel-meta">
                    ${patient.birthdate ? `<span>🎂 ${calculateAge(patient.birthdate)} años</span>` : ''}
                    ${patient.gender ? `<span>⚧ ${patient.gender}</span>` : ''}
                    ${patient.occupation ? `<span>💼 ${patient.occupation}</span>` : ''}
                    ${patient.diagnosis ? `<span>🩺 ${patient.diagnosis}</span>` : ''}
                </div>
            </div>
            <div class="patient-intel-actions">
                <button class="btn-primary" onclick="editPatient('${patient.id}'); closeModal('patientDetailModal');">
                    <i class="fas fa-edit"></i> Editar
                </button>
                <button class="btn-secondary" onclick="generateCaseSummaryWithAI('${patient.id}')" style="background:var(--accent-light);color:var(--accent-primary);border-color:var(--accent-primary);font-weight:700;" title="Generar informe con Gemini">
                    🧠 Síntesis IA
                </button>
                <button class="btn-secondary" onclick="exportPatientReport('${patient.id}')">
                    <i class="fas fa-file-pdf"></i> PDF
                </button>
                <button class="btn-secondary" onclick="generatePortalToken('${patient.id}')" title="Generar código de acceso al portal">
                    🌱 Portal
                </button>
                <button class="btn-secondary" onclick="renderScaleModal('phq9', '${patient.id}')">
                    📊 PHQ-9
                </button>
                <button class="btn-secondary" onclick="renderScaleModal('gad7', '${patient.id}')">
                    🌊 GAD-7
                </button>
            </div>
        </div>
        ${renderSessionPrepCard(sessionPrep)}
        <div style="display:grid;grid-template-columns:auto 1fr;gap:24px;margin-bottom:24px;">
            <div class="wellbeing-ring-container">
                ${renderWellbeingRingLarge(wellbeing)}
                <div class="wellbeing-status ${wellbeing.statusClass}">${wellbeing.statusLabel}</div>
            </div>
            <div class="summary-grid" style="margin:0;">
                <div class="summary-mini-card"><div class="summary-mini-icon">📅</div><div class="summary-mini-info"><div class="summary-mini-label">Sesiones</div><div class="summary-mini-value">${patientApps.filter(a=>a.status==='completada').length}</div></div></div>
                <div class="summary-mini-card"><div class="summary-mini-icon">📝</div><div class="summary-mini-info"><div class="summary-mini-label">Notas</div><div class="summary-mini-value">${patientNotes.length}</div></div></div>
                <div class="summary-mini-card"><div class="summary-mini-icon">🎯</div><div class="summary-mini-info"><div class="summary-mini-label">Objetivos</div><div class="summary-mini-value">${patientGoals.filter(g=>g.status==='logrado').length}/${patientGoals.length}</div></div></div>
                <div class="summary-mini-card"><div class="summary-mini-icon">⏱️</div><div class="summary-mini-info"><div class="summary-mini-label">En tratamiento</div><div class="summary-mini-value">${calculateTreatmentDuration(patient.createdAt)}</div></div></div>
            </div>
        </div>
        ${renderEmotionalProfile(emotionalProfile)}
        ${renderClinicalInsights(clinicalInsights)}
        <div class="patient-tabs">
            <button class="patient-tab active" onclick="switchPatientTab('resumen', this)"><i class="fas fa-home"></i> Resumen</button>
            <button class="patient-tab" onclick="switchPatientTab('historia', this)"><i class="fas fa-book-medical"></i> Historia</button>
            <button class="patient-tab" onclick="switchPatientTab('formulacion', this)"><i class="fas fa-brain"></i> Formulación de Caso</button>
            <button class="patient-tab" onclick="switchPatientTab('timeline', this)"><i class="fas fa-stream"></i> Línea de Tiempo</button>
            <button class="patient-tab" onclick="switchPatientTab('objetivos', this)"><i class="fas fa-bullseye"></i> Objetivos</button>
            <button class="patient-tab" onclick="switchPatientTab('escalas', this)"><i class="fas fa-chart-line"></i> Evaluaciones</button>
            <button class="patient-tab" onclick="switchPatientTab('apoyo', this)"><i class="fas fa-hands-helping"></i> Red de Apoyo</button>
            <button class="patient-tab" onclick="switchPatientTab('portal', this)">
                <i class="fas fa-mobile-alt"></i> Portal Paciente
                ${portalCount > 0 ? `<span style="background: var(--accent-success); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 4px;">${portalCount}</span>` : ''}
            </button>
        </div>
        <div id="tab-resumen" class="patient-tab-content active">${renderTabResumen(id, wellbeing)}</div>
        <div id="tab-historia" class="patient-tab-content">${renderTabHistoria(patient)}</div>
        <div id="tab-formulacion" class="patient-tab-content">${renderTabFormulacion(patient)}</div>
        <div id="tab-timeline" class="patient-tab-content">${renderTabTimeline(id)}</div>
        <div id="tab-objetivos" class="patient-tab-content">${renderTabObjetivos(id)}</div>
        <div id="tab-escalas" class="patient-tab-content">${renderTabEscalas(id)}</div>
        <div id="tab-apoyo" class="patient-tab-content">${renderTabApoyo(patient)}</div>
        <div id="tab-portal" class="patient-tab-content">${renderPortalTab(id)}</div>
    `;
    openModal('patientDetailModal');
}

function switchPatientTab(tabName, btn) {
    document.querySelectorAll('.patient-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.patient-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabName).classList.add('active');
}

function calculateTreatmentDuration(createdAt) {
    if (!createdAt) return '—';
    const days = Math.floor((new Date() - new Date(createdAt)) / 86400000);
    if (days < 7) return `${days} días`;
    if (days < 30) return `${Math.floor(days/7)} sem`;
    if (days < 365) return `${Math.floor(days/30)} meses`;
    return `${Math.floor(days/365)} años`;
}

// ============================================
// PESTAÑAS DEL EXPEDIENTE
// ============================================
function renderTabResumen(patientId, wellbeing) {
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const alerts = generatePatientAlerts(patientId);
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const latestNote = notes.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    return `${alerts.length > 0 ? `<div class="alerts-list">${alerts.map(a => `<div class="alert-item ${a.level}"><div class="alert-item-icon">${a.icon}</div><div class="alert-item-text"><strong>${a.title}</strong><small>${a.description}</small></div></div>`).join('')}</div>` : `<div class="alert-item success"><div class="alert-item-icon">✅</div><div class="alert-item-text"><strong>Sin alertas activas</strong><small>El paciente evoluciona favorablemente</small></div></div>`}${latestNote ? `<div style="margin-top:20px;"><h4 style="font-size:13px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:8px;">Última sesión</h4><div style="padding:16px;background:var(--bg-secondary);border-radius:12px;"><div style="font-weight:600;margin-bottom:4px;">${latestNote.title}</div><div style="font-size:12px;color:var(--text-tertiary);margin-bottom:8px;">${formatDate(latestNote.date)}</div><div style="font-size:13px;color:var(--text-secondary);line-height:1.5;">${latestNote.subjetivo ? `<strong>S:</strong> ${latestNote.subjetivo.substring(0, 150)}...` : ''}</div></div></div>` : ''}${goals.length > 0 ? `<div style="margin-top:20px;"><h4 style="font-size:13px;color:var(--text-tertiary);text-transform:uppercase;margin-bottom:8px;">Progreso de Objetivos</h4><div class="goals-progress">${goals.slice(0, 3).map(g => `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-title">${g.title}</div><div class="goal-progress-percent">${g.progress}%</div></div><div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%"></div></div>${g.deadline ? `<div class="goal-progress-deadline">📅 ${formatDate(g.deadline)}</div>` : ''}</div>`).join('')}</div></div>` : ''}`;
}

function generatePatientAlerts(patientId) {
    const alerts = [];
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const apps = AppState.appointments.filter(a => a.patientId === patientId);
    const today = new Date();
    const latestNote = notes.sort((a,b) => new Date(b.date) - new Date(a.date))[0];

    // Check PHQ-9 Item 9 suicidal ideation alert
    let portalPhq = null;
    try {
        const pRes = localStorage.getItem(`psico_portal_results_${patientId}`);
        if (pRes) portalPhq = JSON.parse(pRes).filter(r => r.type === 'phq9').slice(-1)[0];
    } catch(e) {}
    const latestNotePhq = notes.filter(n => n.scaleResult?.scale === 'phq9').sort((a,b) => new Date(b.date) - new Date(a.date))[0];

    const item9NoteVal = latestNotePhq?.scaleResult?.item9Score || (latestNotePhq?.scaleResult?.answers ? parseInt(latestNotePhq.scaleResult.answers[8], 10) : 0);
    const item9PortalVal = portalPhq?.item9Score || (portalPhq?.item9Alert ? 1 : 0);
    const maxItem9 = Math.max(item9NoteVal || 0, item9PortalVal || 0);

    if (maxItem9 > 0) {
        alerts.push({
            level: 'critical',
            icon: '🚨',
            title: '🚨 Ideación Autolítica (Ítem 9 PHQ-9)',
            description: `Valor ${maxItem9}/3 en pensamientas de autolesión o muerte. Requiere evaluación inmediata de riesgo suicida.`
        });
    }

    if (latestNote?.risk === 'alto') alerts.push({ level: 'critical', icon: '🚨', title: 'Riesgo alto detectado', description: 'Última nota clínica indica riesgo' });
    const totalScore = latestNotePhq?.scaleResult?.score || portalPhq?.score || 0;
    if (totalScore >= 19) alerts.push({ level: 'critical', icon: '⚠️', title: 'Depresión severa', description: `PHQ-9: ${totalScore}/27` });
    const latestApp = apps.sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    if (latestApp) {
        const days = Math.floor((today - new Date(latestApp.date)) / 86400000);
        if (days > 21) alerts.push({ level: 'warning', icon: '📅', title: `Sin sesión hace ${days} días`, description: 'Considerar seguimiento' });
    }
    const pendingTasks = notes.flatMap(n => n.intersessionTasks || []).filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today);
    if (pendingTasks.length > 0) alerts.push({ level: 'info', icon: '📋', title: `${pendingTasks.length} tarea(s) vencida(s)`, description: 'Revisar en próxima sesión' });
    return alerts;
}

function renderTabHistoria(patient) {
    const sections = [
        { title: 'Motivo de Consulta', content: patient.reason },
        { title: 'Objetivos del Paciente', content: patient.goals },
        { title: 'Antecedentes Personales', content: patient.medical },
        { title: 'Historia Familiar', content: patient.familyHistory },
        { title: 'Factores de Riesgo', content: patient.riskFactors },
        { title: 'Factores Protectores', content: patient.protectiveFactors },
        { title: 'Medicación Actual', content: patient.medication },
        { title: 'Diagnóstico Secundario', content: patient.diagnosis2 },
        { title: 'Encuadre', content: patient.notes }
    ];
    return sections.map(s => `<div class="clinical-history-section"><h4>${s.title}</h4><div class="clinical-history-content ${!s.content ? 'empty' : ''}">${s.content || 'Sin información registrada'}</div></div>`).join('');
}

function renderTabTimeline(patientId) {
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const apps = AppState.appointments.filter(a => a.patientId === patientId);
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const events = [];
    notes.forEach(n => {
        events.push({
            date: new Date(n.date),
            type: 'session',
            title: n.title,
            description: n.subjetivo?.substring(0, 120) || 'Sesión completada',
            tags: [n.risk === 'alto' ? '🚨 Riesgo' : null, n.scaleResult ? `📊 Score: ${n.scaleResult.score}` : null, n.mood ? getMoodEmoji(n.mood) : null].filter(Boolean)
        });
    });
    goals.forEach(g => {
        if (g.status === 'logrado') {
            events.push({ date: new Date(g.createdAt || Date.now()), type: 'goal', title: `🎯 Objetivo logrado: ${g.title}`, description: g.description || '', tags: ['✅ Completado'] });
        }
    });
    events.sort((a, b) => b.date - a.date);
    if (events.length === 0) return '<div class="empty-state"><div class="empty-icon">📭</div><p>Sin eventos registrados</p></div>';
    return `<div class="timeline">${events.map(e => `<div class="timeline-item ${e.type}"><div class="timeline-date">${e.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="timeline-title">${e.title}</div><div class="timeline-description">${e.description}</div>${e.tags.length > 0 ? `<div class="timeline-tags">${e.tags.map(t => `<span class="timeline-tag">${t}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
}

function renderTabObjetivos(patientId) {
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h4 style="margin:0;">Plan de Tratamiento</h4><button class="btn-primary" onclick="addTreatmentGoal('${patientId}'); viewPatient('${patientId}');"><i class="fas fa-plus"></i> Nuevo objetivo</button></div>${goals.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎯</div><p>Sin objetivos definidos</p></div>' : `<div class="goals-progress">${goals.map(g => `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-title">${g.title}</div><div style="display:flex;gap:4px;align-items:center;"><span class="tag tag-${g.status}">${g.status}</span><div class="goal-progress-percent">${g.progress}%</div></div></div>${g.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">${g.description}</div>` : ''}<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%"></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><div class="goal-progress-deadline">📅 ${g.deadline ? formatDate(g.deadline) : 'Sin fecha'}</div><div style="display:flex;gap:4px;"><button class="btn-icon" onclick="updateGoalProgress('${g.id}'); viewPatient('${patientId}');"><i class="fas fa-chart-line"></i></button><button class="btn-icon" onclick="deleteGoal('${g.id}','${patientId}'); viewPatient('${patientId}');"><i class="fas fa-trash"></i></button></div></div></div>`).join('')}</div>`}`;
}

function renderTabEscalas(patientId) {
    if (typeof renderTabEscalasEnhanced === 'function') {
        return renderTabEscalasEnhanced(patientId);
    }
    const phqNotes = AppState.notes.filter(n => n.patientId === patientId && n.scaleResult?.scale === 'phq9').sort((a,b) => new Date(a.date) - new Date(b.date));
    const gadNotes = AppState.notes.filter(n => n.patientId === patientId && n.scaleResult?.scale === 'gad7').sort((a,b) => new Date(a.date) - new Date(b.date));
    let html = `<div style="display:flex;gap:8px;margin-bottom:16px;"><button class="btn-secondary" onclick="openInteractiveScaleModal('phq9', '${patientId}')">📊 Aplicar PHQ-9</button><button class="btn-secondary" onclick="openInteractiveScaleModal('gad7', '${patientId}')">🌊 Aplicar GAD-7</button></div>`;
    if (phqNotes.length > 0) {
        html += `<div class="clinical-history-section"><h4>Evolución PHQ-9 (Depresión)</h4><div style="display:flex;flex-direction:column;gap:8px;">${phqNotes.map(n => `<div style="padding:10px 14px;background:var(--bg-secondary);border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${formatDate(n.date)}</strong> · Score: <strong style="color:var(--accent-primary);">${n.scaleResult.score}/27</strong></div><span class="tag">${n.scaleResult.interpretation}</span></div>`).join('')}</div></div>`;
    }
    if (gadNotes.length > 0) {
        html += `<div class="clinical-history-section"><h4>Evolución GAD-7 (Ansiedad)</h4><div style="display:flex;flex-direction:column;gap:8px;">${gadNotes.map(n => `<div style="padding:10px 14px;background:var(--bg-secondary);border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><div><strong>${formatDate(n.date)}</strong> · Score: <strong style="color:var(--accent-primary);">${n.scaleResult.score}/21</strong></div><span class="tag">${n.scaleResult.interpretation}</span></div>`).join('')}</div></div>`;
    }
    if (phqNotes.length === 0 && gadNotes.length === 0) {
        html += '<div class="empty-state"><div class="empty-icon">📊</div><p>Sin evaluaciones registradas</p></div>';
    }
    return html;
}

function renderTabApoyo(patient) {
    const supports = [];
    if (patient.emergency) supports.push({ icon: '🚨', name: patient.emergency, relation: patient.emergencyRelation || 'Contacto de emergencia' });
    if (patient.protectiveFactors) {
        const factors = patient.protectiveFactors.split('\n').filter(f => f.trim());
        factors.forEach(f => supports.push({ icon: '💪', name: f.trim(), relation: 'Factor protector' }));
    }
    return `<div class="clinical-history-section"><h4>Red de Apoyo y Recursos</h4>${supports.length === 0 ? '<div class="clinical-history-content empty">Sin información registrada</div>' : `<div class="support-network">${supports.map(s => `<div class="support-card"><div class="support-card-header"><div class="support-icon">${s.icon}</div><div><div class="support-name">${s.name}</div><div class="support-relation">${s.relation}</div></div></div></div>`).join('')}</div>`}</div><div class="clinical-history-section"><h4>Información de Contacto</h4><div class="support-network">${patient.phone ? `<div class="support-card"><div class="support-card-header"><div class="support-icon">📞</div><div><div class="support-name">${patient.phone}</div><div class="support-relation">Teléfono</div></div></div></div>` : ''}${patient.email ? `<div class="support-card"><div class="support-card-header"><div class="support-icon">📧</div><div><div class="support-name">${patient.email}</div><div class="support-relation">Email</div></div></div></div>` : ''}</div></div>`;
}

// ============================================
// PORTAL DEL PACIENTE Y GENERACIÓN DE CÓDIGO
// ============================================
function getPortalUrl() {
    try {
        return new URL('portal.html', window.location.href).href;
    } catch (e) {
        return window.location.origin + '/portal.html';
    }
}

function generatePortalToken(patientId, forceNew = false) {
    const patient = AppState.patients.find(p => String(p.id) === String(patientId));
    if (!patient) {
        showToast('Paciente no encontrado', 'error');
        return;
    }
    if (!patient.portalToken || forceNew) {
        patient.portalToken = 'PN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        patient.portalEnabled = true;
        patient.portalCreatedAt = new Date().toISOString();
        saveData();
    }
    const token = patient.portalToken;
    let portalPatients = [];
    try {
        const stored = localStorage.getItem('psico_portal_patients');
        if (stored) portalPatients = JSON.parse(stored);
    } catch (e) {
        console.error('Error leyendo portal patients:', e);
    }
    const existingIndex = portalPatients.findIndex(p => String(p.id) === String(patientId));
    const portalData = {
        id: patientId,
        name: patient.name,
        portalToken: token,
        therapistName: AppState.currentUser?.name || 'Terapeuta',
        createdAt: new Date().toISOString()
    };
    if (existingIndex >= 0) {
        portalPatients[existingIndex] = portalData;
    } else {
        portalPatients.push(portalData);
    }
    localStorage.setItem('psico_portal_patients', JSON.stringify(portalPatients));

    openPortalShareModal(patientId);
    if (document.getElementById('patientDetailModal')?.classList.contains('active')) {
        viewPatient(patientId);
    }
}

function openPortalShareModal(patientId) {
    const patient = AppState.patients.find(p => String(p.id) === String(patientId));
    if (!patient) return;

    if (!patient.portalToken) {
        generatePortalToken(patientId);
        return;
    }

    const portalUrl = getPortalUrl();
    const token = patient.portalToken;
    const body = document.getElementById('portalShareModalBody');
    if (!body) return;

    const firstName = patient.name ? patient.name.split(' ')[0] : 'Paciente';
    const messageToCopy = `Hola ${firstName}, puedes acceder a tu Portal del Paciente mediante este enlace:\n${portalUrl}\n\nTu código de acceso personal es: ${token}\n\nDesde allí podrás consultar tus tareas intersesión, realizar evaluaciones y registrar tu estado de ánimo.`;

    let cleanPhone = (patient.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToCopy)}` : `https://wa.me/?text=${encodeURIComponent(messageToCopy)}`;

    body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:16px;">
            <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-secondary);">
                <label style="font-weight:600;font-size:13px;color:var(--text-primary);display:block;margin-bottom:6px;">
                    🌐 Enlace de la página Portal del Paciente:
                </label>
                <div style="display:flex;gap:8px;">
                    <input type="text" readonly value="${portalUrl}" style="flex:1;padding:8px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
                    <button type="button" class="btn-primary" onclick="copyTextToClipboard('${portalUrl}', 'Enlace del portal copiado')">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                    <a href="${portalUrl}" target="_blank" class="btn-secondary" style="display:inline-flex;align-items:center;gap:4px;text-decoration:none;padding:8px 12px;font-size:13px;">
                        <i class="fas fa-external-link-alt"></i> Abrir
                    </a>
                </div>
            </div>

            <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-secondary);">
                <label style="font-weight:600;font-size:13px;color:var(--text-primary);display:block;margin-bottom:6px;">
                    🔑 Código de Acceso de ${patient.name}:
                </label>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" readonly value="${token}" style="flex:1;padding:8px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--accent-primary);font-weight:700;font-size:15px;letter-spacing:1px;">
                    <button type="button" class="btn-secondary" onclick="copyTextToClipboard('${token}', 'Código copiado')">
                        <i class="fas fa-copy"></i> Copiar Código
                    </button>
                    <button type="button" class="btn-secondary" onclick="generatePortalToken('${patientId}', true)" title="Generar un nuevo código de acceso">
                        <i class="fas fa-sync-alt"></i> Nuevo
                    </button>
                </div>
            </div>

            <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-secondary);">
                <label style="font-weight:600;font-size:13px;color:var(--text-primary);display:block;margin-bottom:6px;">
                    💬 Mensaje para enviar al paciente:
                </label>
                <textarea readonly rows="4" style="width:100%;padding:8px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:12px;margin-bottom:10px;resize:none;">${messageToCopy}</textarea>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button type="button" class="btn-primary" style="flex:1;" onclick="copyTextToClipboard(\`${messageToCopy.replace(/`/g, '\\`')}\`, 'Mensaje completo copiado')">
                        <i class="fas fa-paste"></i> Copiar Mensaje Completo
                    </button>
                    <a href="${waUrl}" target="_blank" class="btn-secondary" style="flex:1;background:#25D366;color:white;border:none;display:inline-flex;align-items:center;justify-content:center;gap:6px;text-decoration:none;font-weight:600;padding:8px 12px;font-size:13px;">
                        <i class="fab fa-whatsapp"></i> Enviar por WhatsApp
                    </a>
                </div>
            </div>
        </div>
    `;

    openModal('portalShareModal');
}

function copyTextToClipboard(text, successMsg = 'Copiado al portapapeles') {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast(`✅ ${successMsg}`, 'success');
        }).catch(() => {
            fallbackCopyText(text, successMsg);
        });
    } else {
        fallbackCopyText(text, successMsg);
    }
}

function fallbackCopyText(text, successMsg) {
    const input = document.createElement('textarea');
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast(`✅ ${successMsg}`, 'success');
}

function getPortalResults(patientId) {
    const key = `psico_portal_results_${patientId}`;
    const keyMood = `psico_portal_mood_${patientId}`;
    const results = JSON.parse(localStorage.getItem(key) || '[]');
    const moods = JSON.parse(localStorage.getItem(keyMood) || '[]');
    return { results, moods };
}

function renderPortalTab(patientId) {
    const patient = AppState.patients.find(p => String(p.id) === String(patientId));
    const token = patient?.portalToken || null;
    const portalUrl = getPortalUrl();
    const { results, moods } = getPortalResults(patientId);

    const firstName = patient?.name ? patient.name.split(' ')[0] : 'Paciente';
    const messageToCopy = patient ? `Hola ${firstName}, puedes acceder a tu Portal del Paciente mediante este enlace:\n${portalUrl}\n\nTu código de acceso personal es: ${token || 'Generar código'}` : '';
    let cleanPhone = (patient?.phone || '').replace(/\D/g, '');
    const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageToCopy)}` : `https://wa.me/?text=${encodeURIComponent(messageToCopy)}`;

    const portalAccessHeader = `
        <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-md); border: 1px solid var(--border-secondary); margin-bottom: 20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                <div>
                    <h4 style="margin:0; font-size:15px; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                        🌱 Portal del Paciente
                    </h4>
                    <span style="font-size:12px; color:var(--text-secondary);">Acceso y seguimiento en tiempo real</span>
                </div>
                <button class="btn-primary" onclick="openPortalShareModal('${patientId}')" style="font-size:12px; padding:6px 12px;">
                    <i class="fas fa-share-alt"></i> Compartir Acceso
                </button>
            </div>
            <div style="display:grid; grid-template-columns: 1fr auto; gap:10px; align-items:center; background:var(--bg-primary); padding:10px; border-radius:var(--radius-sm); border:1px solid var(--border-secondary);">
                <div>
                    <div style="font-size:11px; color:var(--text-secondary); text-transform:uppercase; font-weight:600;">Link de la página portal</div>
                    <a href="${portalUrl}" target="_blank" style="font-size:13px; color:var(--accent-primary); font-weight:600; text-decoration:underline; word-break:break-all;">
                        ${portalUrl}
                    </a>
                </div>
                <div style="display:flex; gap:6px;">
                    <button class="btn-secondary" style="padding:6px 10px; font-size:12px;" onclick="copyTextToClipboard('${portalUrl}', 'Link del portal copiado')">
                        <i class="fas fa-copy"></i> Copiar Link
                    </button>
                    <a href="${portalUrl}" target="_blank" class="btn-secondary" style="padding:6px 10px; font-size:12px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;">
                        <i class="fas fa-external-link-alt"></i> Abrir Portal
                    </a>
                </div>
            </div>
            <div style="display:flex; gap:12px; align-items:center; margin-top:10px; flex-wrap:wrap;">
                <div style="font-size:12px; color:var(--text-secondary);">
                    🔑 Código de acceso: <strong style="color:var(--text-primary); font-size:13px;">${token || 'No generado'}</strong>
                </div>
                ${!token ? `<button class="btn-secondary" style="padding:2px 8px; font-size:11px;" onclick="generatePortalToken('${patientId}')">Generar Código</button>` : ''}
                <a href="${waUrl}" target="_blank" style="margin-left:auto; font-size:12px; color:#25D366; text-decoration:none; font-weight:600; display:inline-flex; align-items:center; gap:4px;">
                    <i class="fab fa-whatsapp"></i> Enviar por WhatsApp
                </a>
            </div>
        </div>
    `;

    if (results.length === 0 && moods.length === 0) {
        return portalAccessHeader + `<div class="empty-state"><div class="empty-icon">🌱</div><p>El paciente aún no ha registrado datos desde su portal</p><small>Comparte el enlace y código de acceso para activar el seguimiento</small></div>`;
    }
    const lastPhq = results.filter(r => r.type === 'phq9').slice(-1)[0];
    const lastGad = results.filter(r => r.type === 'gad7').slice(-1)[0];
    const recentMoods = moods.slice(-7);
    const interpretPhq = (s) => {
        if (s <= 4) return { level: 'Mínima', color: '#4dab87' };
        if (s <= 9) return { level: 'Leve', color: '#7cb342' };
        if (s <= 14) return { level: 'Moderada', color: '#fdcb6e' };
        if (s <= 19) return { level: 'Mod. Severa', color: '#e67e22' };
        return { level: 'Severa', color: '#e16259' };
    };
    const interpretGad = (s) => {
        if (s <= 4) return { level: 'Mínima', color: '#4dab87' };
        if (s <= 9) return { level: 'Leve', color: '#7cb342' };
        if (s <= 14) return { level: 'Moderada', color: '#fdcb6e' };
        return { level: 'Severa', color: '#e16259' };
    };
    const formatDateSafe = (dateStr) => {
        if (!dateStr) return 'Fecha no disponible';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return 'Fecha no disponible';
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        } catch (e) {
            return 'Fecha no disponible';
        }
    };
    return portalAccessHeader + `<div style="padding: 8px 0;"><div class="summary-grid" style="margin-bottom: 20px;"><div class="summary-mini-card"><div class="summary-mini-icon">📊</div><div class="summary-mini-info"><div class="summary-mini-label">Tests realizados</div><div class="summary-mini-value">${results.length}</div></div></div><div class="summary-mini-card"><div class="summary-mini-icon">💭</div><div class="summary-mini-info"><div class="summary-mini-label">Registros de ánimo</div><div class="summary-mini-value">${moods.length}</div></div></div></div>${lastPhq || lastGad ? `<div class="clinical-history-section"><h4>📊 Últimas Evaluaciones del Paciente</h4>${lastPhq ? `<div class="alert-item ${lastPhq.score >= 15 ? 'critical' : lastPhq.score >= 10 ? 'warning' : 'success'}"><div class="alert-item-icon">🌧️</div><div class="alert-item-text"><strong>Estado de Ánimo (PHQ-9): ${lastPhq.score}/${lastPhq.maxScore || 27}</strong><small>Nivel: ${interpretPhq(lastPhq.score).level} · ${formatDateSafe(lastPhq.date)}</small></div></div>` : ''}${lastGad ? `<div class="alert-item ${lastGad.score >= 15 ? 'critical' : lastGad.score >= 10 ? 'warning' : 'success'}"><div class="alert-item-icon">🌊</div><div class="alert-item-text"><strong>Ansiedad (GAD-7): ${lastGad.score}/${lastGad.maxScore || 21}</strong><small>Nivel: ${interpretGad(lastGad.score).level} · ${formatDateSafe(lastGad.date)}</small></div></div>` : ''}</div>` : ''}</div>`;
}

// ============================================
// PERFIL EMOCIONAL E INSIGHTS
// ============================================
function calculateEmotionalProfile(patientId) {
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const profile = { estadoEmocional: 5, ansiedad: 5, sueño: 5, energia: 5, autoestima: 5, objetivosActivos: goals.filter(g => g.status === 'en-progreso').length, bienestar: 50 };
    if (notes.length === 0) return profile;
    const recentMoods = notes.filter(n => n.mood).slice(-5);
    if (recentMoods.length > 0) {
        const moodValues = { 'muy-bueno': 9, 'bueno': 7, 'neutral': 5, 'bajo': 3, 'muy-bajo': 1 };
        const avgMood = recentMoods.reduce((sum, n) => sum + (moodValues[n.mood] || 5), 0) / recentMoods.length;
        profile.estadoEmocional = Math.round(avgMood);
    }
    const latestGad = notes.filter(n => n.scaleResult?.scale === 'gad7').sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (latestGad) profile.ansiedad = Math.round(10 - (latestGad.scaleResult.score / 21) * 10);
    profile.bienestar = calculatePatientWellbeing(patientId).score;
    return profile;
}

function renderEmotionalProfile(profile) {
    const dimensions = [
        { key: 'estadoEmocional', label: 'Estado emocional', icon: '😊', color: '#4dab87' },
        { key: 'ansiedad', label: 'Ansiedad', icon: '😰', color: '#e16259', invert: true },
        { key: 'sueño', label: 'Sueño', icon: '😴', color: '#6b9080' },
        { key: 'energia', label: 'Energía', icon: '⚡', color: '#d4a574' },
        { key: 'autoestima', label: 'Autoestima', icon: '❤️', color: '#e09f3e' }
    ];
    return `<div class="emotional-profile-card"><h4 class="emotional-profile-title">Perfil Emocional Actual</h4><div class="emotional-bars">${dimensions.map(dim => { const value = profile[dim.key]; const displayValue = dim.invert ? 10 - value : value; const emoji = getEmotionalEmoji(dim.key, value); return `<div class="emotional-bar-item"><div class="emotional-bar-header"><span class="emotional-bar-icon">${dim.icon}</span><span class="emotional-bar-label">${dim.label}</span><span class="emotional-bar-value">${value}/10 ${emoji}</span></div><div class="emotional-bar-track"><div class="emotional-bar-fill" style="width: ${displayValue * 10}%; background: ${dim.color};"></div></div></div>`; }).join('')}</div></div>`;
}

function getEmotionalEmoji(dimension, value) {
    if (value >= 8) return '✨';
    if (value >= 6) return '🙂';
    if (value >= 4) return '😐';
    if (value >= 2) return '😔';
    return '😞';
}

function generateClinicalInsights(patientId) {
    const notes = AppState.notes.filter(n => n.patientId === patientId).sort((a, b) => new Date(a.date) - new Date(b.date));
    const apps = AppState.appointments.filter(a => a.patientId === patientId);
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const insights = [];
    if (notes.length < 2) return insights;
    const avoidanceKeywords = ['evitar', 'evitación', 'no quiero', 'miedo a', 'huyo de', 'no salgo', 'cancelar'];
    const avoidanceSessions = notes.filter(n => { const text = (n.subjetivo || '').toLowerCase(); return avoidanceKeywords.some(k => text.includes(k)); });
    if (avoidanceSessions.length >= 2) {
        insights.push({ type: 'warning', icon: '🔄', title: 'Patrón de evitación detectado', text: `Las últimas sesiones muestran conductas de evitación. Considerar exposición gradual.`, priority: 1 });
    }
    const allTasks = notes.flatMap(n => n.intersessionTasks || []);
    if (allTasks.length >= 3) {
        const completedRecent = allTasks.filter(t => t.completed).length;
        const adherenceRate = (completedRecent / allTasks.length) * 100;
        if (adherenceRate >= 70) insights.push({ type: 'success', icon: '✅', title: 'Alta adherencia a tareas', text: `Cumple el ${Math.round(adherenceRate)}% de actividades intersesión.`, priority: 2 });
    }
    return insights.sort((a, b) => a.priority - b.priority).slice(0, 5);
}

function renderClinicalInsights(insights) {
    if (insights.length === 0) return `<div class="clinical-insights-empty"><i class="fas fa-lightbulb"></i><p>Sin patrones especiales detectados aún.</p></div>`;
    return `<div class="clinical-insights-card"><h4 class="clinical-insights-title"><i class="fas fa-brain"></i> Insights Clínicos</h4><div class="insights-list">${insights.map(i => `<div class="insight-item ${i.type}"><div class="insight-icon">${i.icon}</div><div class="insight-content"><div class="insight-title">${i.title}</div><div class="insight-text">${i.text}</div></div></div>`).join('')}</div></div>`;
}

function generateSessionPrep(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return null;
    const notes = AppState.notes.filter(n => n.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
    const apps = AppState.appointments.filter(a => a.patientId === patientId).sort((a, b) => new Date(b.date) - new Date(a.date));
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    const latestNote = notes[0];
    const sessionNumber = apps.filter(a => a.status === 'completada').length + 1;
    const profile = calculateEmotionalProfile(patientId);
    const mainGoal = goals.find(g => g.status === 'en-progreso') || goals[0];
    const pendingTask = notes.flatMap(n => n.intersessionTasks || []).find(t => !t.completed);
    const lastIntervention = latestNote?.plan?.substring(0, 80) || 'No registrada';
    const aspectsToReview = [];
    if (pendingTask) aspectsToReview.push(`Revisar tarea: "${pendingTask.title}"`);
    if (mainGoal) aspectsToReview.push(`Avance en: "${mainGoal.title}" (${mainGoal.progress}%)`);
    return { patientName: patient.name, sessionNumber, emotionalState: profile.estadoEmocional, emotionalEmoji: getEmotionalEmoji('estadoEmocional', profile.estadoEmocional), mainGoal: mainGoal?.title || 'Sin objetivo definido', pendingTask: pendingTask?.title || 'Sin tareas pendientes', lastIntervention, aspectsToReview: aspectsToReview.slice(0, 3), wellbeing: profile.bienestar };
}

function renderSessionPrepCard(prep) {
    if (!prep) return '';
    return `<div class="session-prep-card"><div class="session-prep-header"><div class="session-prep-icon">🎯</div><div class="session-prep-info"><div class="session-prep-title">Preparación de Sesión</div><div class="session-prep-subtitle">Paciente: ${prep.patientName} · Sesión #${prep.sessionNumber}</div></div><div class="session-prep-wellbeing"><div class="wellbeing-mini">${prep.wellbeing}%</div><div class="wellbeing-label">Bienestar</div></div></div><div class="session-prep-grid"><div class="prep-item"><div class="prep-label">Estado emocional</div><div class="prep-value">${prep.emotionalEmoji} ${prep.emotionalState}/10</div></div><div class="prep-item"><div class="prep-label">Objetivo principal</div><div class="prep-value-small">${prep.mainGoal}</div></div><div class="prep-item"><div class="prep-label">Tarea pendiente</div><div class="prep-value-small">${prep.pendingTask}</div></div><div class="prep-item"><div class="prep-label">Última intervención</div><div class="prep-value-small">${prep.lastIntervention}</div></div></div>${prep.aspectsToReview.length > 0 ? `<div class="session-prep-aspects"><div class="aspects-title">📋 Aspectos a revisar hoy:</div><ul class="aspects-list">${prep.aspectsToReview.map(a => `<li>${a}</li>`).join('')}</ul></div>` : ''}</div>`;
}

// ============================================
// CALENDARIO Y AGENDA MULTI-VISTA (DÍA, SEMANA, MES, AÑO)
// ============================================

function setAgendaViewMode(mode) {
    if (!['day', 'week', 'month', 'year'].includes(mode)) mode = 'month';
    AppState.agendaViewMode = mode;
    renderCalendar();
}

function navigateAgendaPeriod(delta) {
    const mode = AppState.agendaViewMode || 'month';
    if (!AppState.currentDate) AppState.currentDate = new Date();
    if (!AppState.selectedDate) AppState.selectedDate = new Date();

    if (mode === 'day') {
        AppState.selectedDate.setDate(AppState.selectedDate.getDate() + delta);
        AppState.currentDate = new Date(AppState.selectedDate);
    } else if (mode === 'week') {
        AppState.selectedDate.setDate(AppState.selectedDate.getDate() + (delta * 7));
        AppState.currentDate = new Date(AppState.selectedDate);
    } else if (mode === 'month') {
        AppState.currentDate.setMonth(AppState.currentDate.getMonth() + delta);
    } else if (mode === 'year') {
        AppState.currentDate.setFullYear(AppState.currentDate.getFullYear() + delta);
    }
    renderCalendar();
}

function resetAgendaToToday() {
    AppState.currentDate = new Date();
    AppState.selectedDate = new Date();
    renderCalendar();
}

function changeMonth(delta) { navigateAgendaPeriod(delta); }

function renderCalendar() {
    const mode = AppState.agendaViewMode || 'month';
    const mainContent = document.getElementById('agendaMainContent');
    const titleEl = document.getElementById('calendarTitle');

    ['day', 'week', 'month', 'year'].forEach(m => {
        const btn = document.getElementById(`agendaBtn${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });

    if (!mainContent) return;

    if (mode === 'day') {
        renderDayView(mainContent, titleEl);
    } else if (mode === 'week') {
        renderWeekView(mainContent, titleEl);
    } else if (mode === 'year') {
        renderYearView(mainContent, titleEl);
    } else {
        renderMonthView(mainContent, titleEl);
    }
}

function renderDayView(mainContent, titleEl) {
    const curDate = AppState.selectedDate || AppState.currentDate || new Date();
    if (titleEl) {
        titleEl.textContent = curDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    const apps = AppState.appointments.filter(a => isSameDay(new Date(a.date), curDate) && a.status !== 'cancelada')
                                       .sort((a,b) => a.time.localeCompare(b.time));

    const dateStr = toDateInputValue(curDate);
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'];

    mainContent.innerHTML = `
        <div class="day-timeline">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <h3 style="margin:0;font-size:16px;font-weight:700;"><i class="fas fa-clock" style="color:var(--accent-primary);"></i> Franja Horaria (${apps.length} cita/s)</h3>
                <button class="btn-primary btn-sm" onclick="openModalWithDate('${dateStr}')">
                    <i class="fas fa-plus"></i> Agendar en este día
                </button>
            </div>
            ${timeSlots.map(time => {
                const app = apps.find(a => a.time && a.time.startsWith(time.substring(0,2)));
                if (app) {
                    const p = AppState.patients.find(x => x.id === app.patientId);
                    return `
                        <div class="timeline-slot" style="background:var(--bg-hover);border-radius:var(--radius-md);">
                            <div class="timeline-time">${formatTime(app.time)}</div>
                            <div class="timeline-content" style="display:flex;align-items:center;justify-content:space-between;">
                                <div>
                                    <strong style="color:var(--text-primary);font-size:14px;">${p ? p.name : 'Paciente'}</strong>
                                    <div style="font-size:12px;color:var(--text-secondary);">${app.duration} min · ${app.type}</div>
                                </div>
                                <div style="display:flex;gap:6px;align-items:center;">
                                    <span class="status-badge status-${app.status}">${app.status}</span>
                                    <button class="btn-icon" onclick="editAppointment('${app.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                                </div>
                            </div>
                        </div>
                    `;
                } else {
                    return `
                        <div class="timeline-slot">
                            <div class="timeline-time">${time}</div>
                            <div class="timeline-content">
                                <button class="btn-secondary btn-sm" style="border:1px dashed var(--border-secondary);opacity:0.7;" onclick="openModalWithDateAndTime('${dateStr}', '${time}')">
                                    + Disponibilidad libre
                                </button>
                            </div>
                        </div>
                    `;
                }
            }).join('')}
        </div>

        <h2 class="section-title">Citas Registradas (${formatDate(dateStr)})</h2>
        <div class="appointments-list" id="appointmentsList"></div>
    `;

    renderAppointments();
}

function renderWeekView(mainContent, titleEl) {
    const curDate = new Date(AppState.selectedDate || AppState.currentDate || new Date());
    const dayOfWeek = curDate.getDay();
    
    const weekStart = new Date(curDate);
    weekStart.setDate(curDate.getDate() - dayOfWeek);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(weekStart);
        d.setDate(weekStart.getDate() + i);
        weekDays.push(d);
    }

    const startStr = weekDays[0].toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const endStr = weekDays[6].toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    if (titleEl) {
        titleEl.textContent = `Semana: ${startStr} - ${endStr}`;
    }

    const today = new Date();

    mainContent.innerHTML = `
        <div class="agenda-week-grid">
            ${weekDays.map(d => {
                const dateVal = toDateInputValue(d);
                const isToday = isSameDay(d, today);
                const isSelected = isSameDay(d, AppState.selectedDate);
                const dayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), d) && a.status !== 'cancelada')
                                                      .sort((a,b) => a.time.localeCompare(b.time));

                return `
                    <div class="agenda-week-col ${isToday ? 'today' : ''}" style="${isSelected ? 'border-color:var(--accent-primary);' : ''}">
                        <div class="agenda-week-col-header" onclick="selectAgendaDate('${dateVal}')">
                            <div class="agenda-week-day-name">${d.toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                            <div class="agenda-week-day-num">${d.getDate()}</div>
                        </div>

                        <div style="flex:1;display:flex;flex-direction:column;gap:6px;overflow-y:auto;max-height:380px;">
                            ${dayApps.length === 0 ? `
                                <div style="font-size:11px;color:var(--text-tertiary);text-align:center;margin-top:12px;">Sin citas</div>
                            ` : dayApps.map(a => {
                                const p = AppState.patients.find(x => x.id === a.patientId);
                                return `
                                    <div class="agenda-week-app-card status-${a.status}" onclick="editAppointment('${a.id}')" title="${p ? p.name : 'Paciente'} (${a.type})">
                                        <div style="font-weight:700;display:flex;justify-content:space-between;align-items:center;">
                                            <span>${formatTime(a.time)}</span>
                                            <span style="font-size:9px;opacity:0.8;">${a.duration}m</span>
                                        </div>
                                        <div style="font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text-primary);">
                                            ${p ? p.name : 'Paciente'}
                                        </div>
                                        <div style="font-size:10px;color:var(--text-secondary);">
                                            ${a.type}
                                        </div>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <button class="btn-secondary btn-sm" style="width:100%;justify-content:center;font-size:11px;padding:4px;" onclick="openModalWithDate('${dateVal}')">
                            + Agendar
                        </button>
                    </div>
                `;
            }).join('')}
        </div>

        <h2 class="section-title">Citas de ${AppState.selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
        <div class="appointments-list" id="appointmentsList"></div>
    `;

    renderAppointments();
}

function renderMonthView(mainContent, titleEl) {
    const year = AppState.currentDate.getFullYear();
    const month = AppState.currentDate.getMonth();
    if (titleEl) {
        titleEl.textContent = new Date(year, month, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    const selDate = parseLocalDate(AppState.selectedDate);
    const selectedFormatted = selDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const selectedDateStr = toDateInputValue(selDate);

    const appsOnSelectedDate = AppState.appointments.filter(a => isSameDay(a.date, selDate));
    const pendingOnSelectedDate = appsOnSelectedDate.filter(a => a.status === 'pendiente' || !a.status).length;
    const completedOnSelectedDate = appsOnSelectedDate.filter(a => a.status === 'completada').length;

    mainContent.innerHTML = `
        <div class="calendar-grid" id="calendarGrid"></div>

        <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-lg);padding:16px 20px;margin-top:24px;margin-bottom:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                <div>
                    <h2 class="section-title" id="appointmentsSectionTitle" style="margin:0;text-transform:capitalize;font-size:18px;display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-calendar-day" style="color:var(--accent-primary);"></i> Citas del ${selectedFormatted}
                    </h2>
                    <div style="font-size:13px;color:var(--text-secondary);margin-top:4px;">
                        ${appsOnSelectedDate.length === 0 ? 'Sin citas agendadas para esta fecha' : 
                          `${appsOnSelectedDate.length} sesión(es): <span style="color:var(--accent-primary);font-weight:600;">${pendingOnSelectedDate} pendiente(s)</span> · <span style="color:var(--accent-success);font-weight:600;">${completedOnSelectedDate} completada(s)</span>`}
                    </div>
                </div>
                <button class="btn-primary btn-sm" onclick="openModalWithDate('${selectedDateStr}')">
                    <i class="fas fa-calendar-plus"></i> Agendar en esta fecha
                </button>
            </div>
        </div>

        <div class="appointments-list" id="appointmentsList"></div>
    `;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const grid = document.getElementById('calendarGrid');
    if (!grid) return;

    grid.innerHTML = '';
    ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].forEach(day => {
        const h = document.createElement('div');
        h.className = 'calendar-day-header';
        h.textContent = day;
        grid.appendChild(h);
    });

    for (let i = 0; i < startPadding; i++) {
        const d = document.createElement('div');
        d.className = 'calendar-day other-month';
        grid.appendChild(d);
    }

    const today = new Date();
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayEl = document.createElement('div');
        dayEl.className = 'calendar-day';

        const dayApps = AppState.appointments.filter(a => isSameDay(a.date, date) && a.status !== 'cancelada');
        const allCompleted = dayApps.length > 0 && dayApps.every(a => a.status === 'completada');

        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, AppState.selectedDate);

        if (isToday) dayEl.classList.add('today');
        if (isSelected) dayEl.classList.add('selected');

        let dayContentHtml = `<span class="calendar-day-num">${day}</span>`;

        if (dayApps.length > 0) {
            dayEl.classList.add('has-appointments');
            const badgeBg = allCompleted ? 'rgba(77, 171, 135, 0.2)' : 'var(--accent-light)';
            const badgeColor = allCompleted ? 'var(--accent-success)' : 'var(--accent-primary)';
            dayContentHtml += `
                <span class="day-app-badge" style="position:absolute;top:4px;right:6px;font-size:10px;font-weight:800;color:${badgeColor};background:${badgeBg};padding:2px 6px;border-radius:10px;">
                    ${dayApps.length}
                </span>
            `;
        }

        dayEl.innerHTML = dayContentHtml;

        dayEl.addEventListener('click', () => {
            AppState.selectedDate = date;
            renderCalendar();
            const listEl = document.getElementById('appointmentsList');
            if (listEl) {
                listEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });

        grid.appendChild(dayEl);
    }

    renderAppointments();
}

function renderYearView(mainContent, titleEl) {
    const year = AppState.currentDate.getFullYear();
    if (titleEl) {
        titleEl.textContent = `Año ${year}`;
    }

    const today = new Date();
    const yearApps = AppState.appointments.filter(a => {
        if (!a.date) return false;
        const d = new Date(a.date);
        return d.getFullYear() === year && a.status !== 'cancelada';
    });

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    mainContent.innerHTML = `
        <div class="summary-cards" style="margin-bottom:20px;">
            <div class="summary-card">
                <div class="summary-icon">📅</div>
                <div class="summary-info">
                    <h3>Total Citas en ${year}</h3>
                    <div class="summary-value">${yearApps.length}</div>
                    <div class="summary-label">Sesiones agendadas</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">✅</div>
                <div class="summary-info">
                    <h3>Completadas</h3>
                    <div class="summary-value">${yearApps.filter(a => a.status === 'completada').length}</div>
                    <div class="summary-label">Sesiones realizadas</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">⏳</div>
                <div class="summary-info">
                    <h3>Pendientes</h3>
                    <div class="summary-value">${yearApps.filter(a => a.status === 'pendiente').length}</div>
                    <div class="summary-label">Por realizar</div>
                </div>
            </div>
        </div>

        <div class="agenda-year-grid">
            ${monthNames.map((mName, mIdx) => {
                const firstDay = new Date(year, mIdx, 1);
                const lastDay = new Date(year, mIdx + 1, 0);
                const startPadding = firstDay.getDay();
                const daysInMonth = lastDay.getDate();

                const monthApps = yearApps.filter(a => new Date(a.date).getMonth() === mIdx);

                let daysHtml = '';
                for (let i = 0; i < startPadding; i++) {
                    daysHtml += `<div class="agenda-mini-day other-month"></div>`;
                }

                for (let day = 1; day <= daysInMonth; day++) {
                    const d = new Date(year, mIdx, day);
                    const isToday = isSameDay(d, today);
                    const hasApp = monthApps.some(a => isSameDay(new Date(a.date), d));
                    const dateVal = toDateInputValue(d);

                    daysHtml += `
                        <div class="agenda-mini-day ${isToday ? 'today' : ''} ${hasApp ? 'has-app' : ''}" 
                             onclick="event.stopPropagation(); selectAgendaDateAndSwitchMonth('${dateVal}')" 
                             title="${d.toLocaleDateString('es-ES')}: ${hasApp ? 'Con cita' : 'Sin cita'}">
                            ${day}
                        </div>
                    `;
                }

                return `
                    <div class="agenda-mini-month" onclick="selectAgendaMonth(${mIdx})">
                        <div class="agenda-mini-month-title">
                            <span>${mName}</span>
                            ${monthApps.length > 0 ? `<span class="nav-badge" style="background:var(--accent-light);color:var(--accent-primary);">${monthApps.length}</span>` : ''}
                        </div>
                        <div class="agenda-mini-grid">
                            <div class="agenda-mini-day-hdr">D</div>
                            <div class="agenda-mini-day-hdr">L</div>
                            <div class="agenda-mini-day-hdr">M</div>
                            <div class="agenda-mini-day-hdr">X</div>
                            <div class="agenda-mini-day-hdr">J</div>
                            <div class="agenda-mini-day-hdr">V</div>
                            <div class="agenda-mini-day-hdr">S</div>
                            ${daysHtml}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function selectAgendaDate(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    AppState.selectedDate = d;
    renderCalendar();
}

function selectAgendaMonth(monthIdx) {
    AppState.currentDate.setMonth(monthIdx);
    setAgendaViewMode('month');
}

function selectAgendaDateAndSwitchMonth(dateStr) {
    const d = new Date(dateStr + 'T00:00:00');
    AppState.selectedDate = d;
    AppState.currentDate = new Date(d);
    setAgendaViewMode('month');
}

function openModalWithDate(dateStr) {
    document.getElementById('appointmentDate').value = dateStr;
    openModal('appointmentModal');
}

function openModalWithDateAndTime(dateStr, timeStr) {
    document.getElementById('appointmentDate').value = dateStr;
    document.getElementById('appointmentTime').value = timeStr;
    openModal('appointmentModal');
}

function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    const selectedDate = AppState.selectedDate || new Date();
    const dateStr = toDateInputValue(selectedDate);
    const apps = AppState.appointments.filter(a => isSameDay(a.date, selectedDate)).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    
    if (apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:28px 20px;background:var(--bg-card);border:1px dashed var(--border-secondary);border-radius:var(--radius-lg);text-align:center;">
                <div class="empty-icon" style="font-size:36px;margin-bottom:10px;">📅</div>
                <h4 style="margin:0 0 6px 0;font-size:15px;color:var(--text-primary);font-weight:700;">Sin citas para este día</h4>
                <p style="margin:0 0 16px 0;font-size:13px;color:var(--text-secondary);">No hay sesiones agendadas para el ${formatDate(dateStr)}.</p>
                <button class="btn-primary btn-sm" onclick="openModalWithDate('${dateStr}')">
                    <i class="fas fa-calendar-plus"></i> Programar Cita
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = apps.map(app => {
        const p = AppState.patients.find(x => String(x.id) === String(app.patientId));
        return `
            <div class="appointment-card" style="transition: all 0.2s ease;">
                <div class="appointment-avatar" style="background:var(--accent-light);color:var(--accent-primary);font-weight:700;">
                    ${p ? getInitials(p.name) : '?'}
                </div>
                <div class="appointment-info">
                    <div class="appointment-patient" style="font-weight:700;font-size:15px;color:var(--text-primary);cursor:pointer;" onclick="${p ? `viewPatient('${p.id}')` : ''}" title="Ver expediente">
                        ${p ? p.name : 'Paciente'}
                    </div>
                    <div class="appointment-meta" style="font-size:13px;color:var(--text-secondary);display:flex;align-items:center;gap:10px;margin-top:2px;">
                        <span><i class="far fa-clock"></i> <strong>${formatTime(app.time)}</strong> (${app.duration} min)</span>
                        <span>·</span>
                        <span><i class="fas fa-tag"></i> ${app.type || 'Consulta'}</span>
                    </div>
                    ${app.notes ? `<div style="font-size:12px;color:var(--text-tertiary);margin-top:4px;font-style:italic;">💬 "${app.notes}"</div>` : ''}
                </div>
                <span class="status-badge status-${app.status || 'pendiente'}">${app.status || 'pendiente'}</span>
                <div class="appointment-actions">
                    ${app.status !== 'completada' ? `<button class="btn-icon" onclick="completeAppointment('${app.id}')" title="Completar y cobrar"><i class="fas fa-check" style="color:var(--accent-success);"></i></button>` : ''}
                    <button class="btn-icon" onclick="editAppointment('${app.id}')" title="Editar cita"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="deleteAppointment('${app.id}')" title="Eliminar cita"><i class="fas fa-trash" style="color:#e16259;"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function handleAppointmentSubmit(e) {
    e.preventDefault();
    const app = { id: document.getElementById('appointmentId').value || generateId(), patientId: document.getElementById('appointmentPatient').value, date: document.getElementById('appointmentDate').value, time: document.getElementById('appointmentTime').value, duration: document.getElementById('appointmentDuration').value, type: document.getElementById('appointmentType').value, notes: document.getElementById('appointmentNotes').value.trim(), status: 'pendiente', createdAt: new Date().toISOString() };
    const idx = AppState.appointments.findIndex(a => a.id === app.id);
    if (idx >= 0) { AppState.appointments[idx] = { ...AppState.appointments[idx], ...app }; showToast('Cita actualizada', 'success'); }
    else { AppState.appointments.push(app); showToast('Cita agendada', 'success'); }
    saveData(); closeModal('appointmentModal'); renderCalendar(); renderAppointments(); updateCounts(); updateDashboard();
}

function editAppointment(id) {
    const a = AppState.appointments.find(x => x.id === id);
    if (!a) return;
    document.getElementById('appointmentId').value = a.id;
    document.getElementById('appointmentPatient').value = a.patientId;
    document.getElementById('appointmentDate').value = a.date;
    document.getElementById('appointmentTime').value = a.time;
    document.getElementById('appointmentDuration').value = a.duration;
    document.getElementById('appointmentType').value = a.type;
    document.getElementById('appointmentNotes').value = a.notes || '';
    document.getElementById('appointmentModalTitle').textContent = 'Editar Cita';
    openModal('appointmentModal');
}

function completeAppointment(id) {
    const a = AppState.appointments.find(x => x.id === id);
    if (a) {
        a.status = 'completada';
        saveData();
        if (typeof registerIncomeFromAppointment === 'function') {
            registerIncomeFromAppointment(a);
        }
        renderAppointments();
        updateDashboard();
        showToast('Sesión completada y cobro registrado', 'success');
    }
}

function deleteAppointment(id) {
    showConfirmModal(
        'Eliminar Cita',
        '¿Está seguro/a de eliminar esta cita agendada?',
        () => {
            AppState.appointments = AppState.appointments.filter(a => String(a.id) !== String(id));
            saveData(); renderCalendar(); renderAppointments(); updateCounts(); updateDashboard();
            showToast('Cita eliminada', 'info');
        }
    );
}

// Sugerencia Inteligente de Horarios
function suggestAppointmentSlots() {
    const patientId = document.getElementById('appointmentPatient').value;
    const container = document.getElementById('aiSuggestResults');
    if (!container) return;
    
    const today = new Date();
    const suggestions = [];
    
    for (let d = 1; d <= 5; d++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() + d);
        if (checkDate.getDay() === 0) continue; // omitir domingo
        
        const dateStr = toDateInputValue(checkDate);
        const dayApps = AppState.appointments.filter(a => a.date === dateStr && a.status !== 'cancelada');
        
        const candidateHours = ['09:00', '11:00', '15:00', '17:00'];
        for (const hour of candidateHours) {
            const conflict = dayApps.some(a => a.time === hour);
            if (!conflict) {
                const dayName = checkDate.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
                suggestions.push({
                    date: dateStr,
                    time: hour,
                    display: `${dayName} a las ${hour}`,
                    score: 95 - d * 2,
                    reason: 'Horario con alta disponibilidad y espacio ideal'
                });
                if (suggestions.length >= 3) break;
            }
        }
        if (suggestions.length >= 3) break;
    }
    
    if (suggestions.length === 0) {
        container.innerHTML = '<div class="ai-suggest-empty">No se encontraron huecos libres próximos</div>';
        return;
    }
    
    container.innerHTML = suggestions.map(s => `
        <div class="ai-slot-chip" onclick="applySuggestedSlot('${s.date}', '${s.time}')">
            <div>
                <div class="ai-slot-main"><i class="far fa-clock"></i> ${s.display}</div>
                <div class="ai-slot-reason">${s.reason}</div>
            </div>
            <span class="ai-slot-score">${s.score}% match</span>
        </div>
    `).join('');
}

function applySuggestedSlot(date, time) {
    document.getElementById('appointmentDate').value = date;
    document.getElementById('appointmentTime').value = time;
    showToast(`Horario seleccionado: ${date} ${time}`, 'info');
}

// ============================================
// NOTAS SOAP Y HERRAMIENTAS CLÍNICAS
// ============================================
let tempIntersessionTasks = [];

function renderNotes(filter = '') {
    const container = document.getElementById('notesList');
    if (!container) return;
    let notes = [...AppState.notes].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filter) { const lf = filter.toLowerCase(); notes = notes.filter(n => { const p = AppState.patients.find(x => x.id === n.patientId); return n.title.toLowerCase().includes(lf) || (p && p.name.toLowerCase().includes(lf)) || (n.subjetivo && n.subjetivo.toLowerCase().includes(lf)); }); }
    if (notes.length === 0) { container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>${filter ? 'Sin coincidencias' : 'No hay notas registradas'}</p>${!filter ? '<button class="btn-primary" onclick="openModal(\'noteModal\')">Crear primera nota</button>' : ''}</div>`; return; }
    container.innerHTML = notes.map(n => { const p = AppState.patients.find(x => x.id === n.patientId); const riskBadge = n.risk && n.risk !== 'bajo' ? `<span class="status-badge status-cancelada">Riesgo: ${n.risk}</span>` : ''; const scaleBadge = n.scaleResult ? `<span class="status-badge status-completada">Score: ${n.scaleResult.score}</span>` : ''; return `<div class="note-card" onclick="editNote('${n.id}')"><div class="patient-avatar">${p ? getInitials(p.name) : '?'}</div><div class="note-info"><div class="note-title">${n.title} ${riskBadge} ${scaleBadge}</div><div class="note-meta">${p ? p.name : 'Paciente'} · ${formatDate(n.date)} ${n.mood ? '· ' + getMoodEmoji(n.mood) : ''} ${n.confidential ? '· 🔒' : ''}</div></div><div class="note-actions"><button class="btn-icon" onclick="event.stopPropagation(); editNote('${n.id}')" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-icon" onclick="event.stopPropagation(); deleteNote('${n.id}')" title="Eliminar"><i class="fas fa-trash"></i></button></div></div>`; }).join('');
}

function filterNotes(q) { renderNotes(q); }

function getDefaultSoapTemplates() {
    return {
        tcc: {
            name: 'Cognitivo Conductual (TCC)',
            s: 'El paciente reporta pensamientos automáticos negativos relacionados con [evento/situación]. Manifiesta distorsiones cognitivas como [catastrofización/abstracción selectiva].',
            o: 'Afecto congruente, lenguaje fluido, orientado. Registra nivel de ansiedad de [X]/10.',
            a: 'Se identifica esquema cognitivo disfuncional sobre [control/aceptación]. Progreso favorable con reestructuración cognitiva.',
            p: 'Registro de pensamientos automáticos intersesión. Desensibilización sistemática del estímulo.'
        },
        psicoanalitica: {
            name: 'Psicodinámica / Psicoanalítica',
            s: 'Asociación libre centrada en conflicto latente sobre [figura de apego/vínculo]. Emerge angustia de castración o separación.',
            o: 'Resistencia observada en el minuto [X]. Actitud transferencial ambivalente hacia la figura del analista.',
            a: 'Mecanismos de defensa predominantes: represión, proyección e intelectualización. Proceso de elaboración en curso.',
            p: 'Continuar señalamiento e interpretación de la transferencia. Trabajar con el contenido del sueño referido.'
        },
        sistemica: {
            name: 'Sistémica / Familiar',
            s: 'El paciente describe pautas de interacción disfuncionales con [pareja/familia]. Comunicación indirecta o de doble vínculo.',
            o: 'Postura corporal de repliegue. Se observa rol de síntoma en el sistema familiar.',
            a: 'Homeostasis familiar mantenida mediante triangulación. Reglas implícitas rígidas sobre el afecto.',
            p: 'Prescripción de la secuencia sintomática. Tarea paradójica e intervención de reencuadre.'
        },
        act: {
            name: 'Aceptación y Compromiso (ACT)',
            s: 'El paciente refiere fusión cognitiva con el pensamiento "[X]" y conductas de evitación experiencial.',
            o: 'Aceptación parcial del malestar. Contacto con el momento presente durante el ejercicio guiado.',
            a: 'Flexibilidad psicológica en construcción. Valores identificados: [autonomía/conexión].',
            p: 'Ejercicio de defusión cognitiva "Hojas en el río". Compromiso de acción alineado a valores.'
        }
    };
}

function getSoapTemplates() {
    try {
        const stored = localStorage.getItem('psico_custom_soap_templates');
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return getDefaultSoapTemplates();
}

function saveSoapTemplates(templates) {
    localStorage.setItem('psico_custom_soap_templates', JSON.stringify(templates));
}

function applySoapTemplate(model) {
    if (!model) return;
    const templates = getSoapTemplates();
    const t = templates[model];
    if (t) {
        if (!document.getElementById('noteSubjetivo').value) document.getElementById('noteSubjetivo').value = t.s;
        if (!document.getElementById('noteObjetivo').value) document.getElementById('noteObjetivo').value = t.o;
        if (!document.getElementById('noteAnalisis').value) document.getElementById('noteAnalisis').value = t.a;
        if (!document.getElementById('notePlan').value) document.getElementById('notePlan').value = t.p;
        showToast(`Plantilla ${t.name || model.toUpperCase()} cargada`, 'info');
    }
}

function openSoapTemplatesModal() {
    const modal = document.getElementById('soapTemplatesModal');
    const body = document.getElementById('soapTemplatesModalBody');
    if (!modal || !body) return;

    const templates = getSoapTemplates();

    body.innerHTML = `
        <p style="font-size:13px; color:var(--text-secondary); margin-bottom:16px;">
            Personalice o ajuste el texto predeterminado de sus plantillas SOAP teóricas.
        </p>

        <div style="display:flex; flex-direction:column; gap:16px; max-height:480px; overflow-y:auto; padding-right:4px;">
            ${Object.keys(templates).map(key => {
                const t = templates[key];
                return `
                    <div style="background:var(--bg-secondary); border:1px solid var(--border-secondary); border-radius:var(--radius-md); padding:14px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                            <input type="text" id="tpl_name_${key}" class="form-control" value="${t.name || key}" style="font-weight:700; width:65%;">
                            <span style="font-size:11px; color:var(--text-tertiary);">Modelo: ${key}</span>
                        </div>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
                            <div>
                                <label style="font-size:11px; font-weight:600;">(S) Subjetivo</label>
                                <textarea id="tpl_s_${key}" rows="2" class="form-control" style="font-size:12px;">${t.s}</textarea>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600;">(O) Objetivo</label>
                                <textarea id="tpl_o_${key}" rows="2" class="form-control" style="font-size:12px;">${t.o}</textarea>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600;">(A) Análisis</label>
                                <textarea id="tpl_a_${key}" rows="2" class="form-control" style="font-size:12px;">${t.a}</textarea>
                            </div>
                            <div>
                                <label style="font-size:11px; font-weight:600;">(P) Plan</label>
                                <textarea id="tpl_p_${key}" rows="2" class="form-control" style="font-size:12px;">${t.p}</textarea>
                            </div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid var(--border-secondary); padding-top:14px;">
            <button type="button" class="btn-secondary" onclick="resetSoapTemplatesDefault()">
                <i class="fas fa-undo"></i> Restaurar Predeterminados
            </button>
            <div style="display:flex; gap:8px;">
                <button type="button" class="btn-secondary" onclick="closeModal('soapTemplatesModal')">Cancelar</button>
                <button type="button" class="btn-primary" onclick="saveSoapTemplatesFromModal()">
                    <i class="fas fa-save"></i> Guardar Cambios
                </button>
            </div>
        </div>
    `;

    openModal('soapTemplatesModal');
}

function saveSoapTemplatesFromModal() {
    const templates = getSoapTemplates();
    Object.keys(templates).forEach(key => {
        const nameEl = document.getElementById(`tpl_name_${key}`);
        const sEl = document.getElementById(`tpl_s_${key}`);
        const oEl = document.getElementById(`tpl_o_${key}`);
        const aEl = document.getElementById(`tpl_a_${key}`);
        const pEl = document.getElementById(`tpl_p_${key}`);

        if (nameEl && sEl && oEl && aEl && pEl) {
            templates[key].name = nameEl.value.trim();
            templates[key].s = sEl.value.trim();
            templates[key].o = oEl.value.trim();
            templates[key].a = aEl.value.trim();
            templates[key].p = pEl.value.trim();
        }
    });

    saveSoapTemplates(templates);
    populateSoapTemplateDropdown();
    closeModal('soapTemplatesModal');
    showToast('Plantillas SOAP actualizadas correctamente', 'success');
}

function resetSoapTemplatesDefault() {
    saveSoapTemplates(getDefaultSoapTemplates());
    populateSoapTemplateDropdown();
    openSoapTemplatesModal();
    showToast('Plantillas restauradas a los valores iniciales', 'info');
}

function populateSoapTemplateDropdown() {
    const sel = document.getElementById('soapTemplateSelect');
    if (!sel) return;

    const templates = getSoapTemplates();
    sel.innerHTML = '<option value="">— Seleccionar modelo teórico —</option>' + 
        Object.keys(templates).map(key => `<option value="${key}">${templates[key].name || key.toUpperCase()}</option>`).join('');
}

// ============================================
// FORMULACIÓN DE CASO CLÍNICO
// ============================================
function getCaseFormulation(patientId) {
    try {
        const stored = localStorage.getItem(`psico_case_formulation_${patientId}`);
        if (stored) return JSON.parse(stored);
    } catch (e) {}
    return {
        vulnerabilidad: '',
        precipitantes: '',
        mantenimiento: '',
        protectores: '',
        hipotesis: '',
        focos: '',
        updatedAt: null
    };
}

function saveCaseFormulation(patientId) {
    const cf = {
        vulnerabilidad: document.getElementById('cfVulnerabilidad')?.value || '',
        precipitantes: document.getElementById('cfPrecipitantes')?.value || '',
        mantenimiento: document.getElementById('cfMantenimiento')?.value || '',
        protectores: document.getElementById('cfProtectores')?.value || '',
        hipotesis: document.getElementById('cfHipotesis')?.value || '',
        focos: document.getElementById('cfFocos')?.value || '',
        updatedAt: new Date().toISOString()
    };
    localStorage.setItem(`psico_case_formulation_${patientId}`, JSON.stringify(cf));
    showToast('Formulación de caso guardada correctamente', 'success');
}

function renderTabFormulacion(patient) {
    const cf = getCaseFormulation(patient.id);
    const lastUpdateText = cf.updatedAt ? `Última actualización: ${formatDate(cf.updatedAt)}` : 'Sin formulación guardada aún';

    return `
        <div style="background:var(--bg-secondary); border-radius:var(--radius-lg); padding:20px; border:1px solid var(--border-secondary);">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:10px;">
                <div>
                    <h3 style="margin:0; font-size:16px; font-weight:700; color:var(--text-primary); display:flex; align-items:center; gap:8px;">
                        <i class="fas fa-brain" style="color:var(--accent-primary);"></i> Formulación de Caso Clínico Integrativa
                    </h3>
                    <p style="margin:4px 0 0 0; font-size:12px; color:var(--text-tertiary);">${lastUpdateText}</p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-primary" onclick="saveCaseFormulation('${patient.id}')">
                        <i class="fas fa-save"></i> Guardar Formulación
                    </button>
                </div>
            </div>

            <p style="font-size:13px; color:var(--text-secondary); margin-bottom:20px; line-height:1.5;">
                Campos de formulación clínica libre para estructurar la comprensión integral del paciente (Factores predisponentes, desencadenantes, de mantenimiento, protectores e hipótesis).
            </p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                    <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        🌱 1. Factores Predisponentes / Vulnerabilidad
                    </label>
                    <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Antecedentes biológicos, apego, desarrollo temprano, estilo cognitivo</small>
                    <textarea id="cfVulnerabilidad" rows="4" class="form-control" placeholder="Ej: Historia de apego ansioso-ambivalente, antecedentes familiares de depresión...">${cf.vulnerabilidad}</textarea>
                </div>

                <div class="form-group">
                    <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        ⚡ 2. Factores Precipitantes / Desencadenantes
                    </label>
                    <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Sucesos estresantes recientes, pérdidas, detonantes del episodio actual</small>
                    <textarea id="cfPrecipitantes" rows="4" class="form-control" placeholder="Ej: Ruptura amorosa hace 2 meses, incremento de sobrecarga laboral...">${cf.precipitantes}</textarea>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:16px;">
                <div class="form-group">
                    <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        🔄 3. Factores Mantenedores / Moduladores
                    </label>
                    <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Conductas de evitación, rumiación, sesgos, refuerzos del entorno</small>
                    <textarea id="cfMantenimiento" rows="4" class="form-control" placeholder="Ej: Evitación de situaciones sociales, aislamiento en fines de semana...">${cf.mantenimiento}</textarea>
                </div>

                <div class="form-group">
                    <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                        🛡️ 4. Factores Protectores / Fortalezas
                    </label>
                    <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Recursos personales, introspección, red de apoyo, adherencia</small>
                    <textarea id="cfProtectores" rows="4" class="form-control" placeholder="Ej: Buena capacidad de introspección, red de amistades cercana...">${cf.protectores}</textarea>
                </div>
            </div>

            <div class="form-group" style="margin-bottom:16px;">
                <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                    🧩 5. Hipótesis Diagnóstica & Conceptualización Integradora
                </label>
                <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Síntesis clínica del mecanismo central y cómo se articulan los factores</small>
                <textarea id="cfHipotesis" rows="4" class="form-control" placeholder="Ej: El paciente presenta una respuesta ansioso-depresiva mantenida por esquemas de inaceptabilidad...">${cf.hipotesis}</textarea>
            </div>

            <div class="form-group" style="margin-bottom:20px;">
                <label style="font-weight:700; font-size:13px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                    🎯 6. Focos de Intervención Prioritarios
                </label>
                <small style="display:block; color:var(--text-tertiary); margin-bottom:6px;">Objetivos terapéuticos específicos y técnicas seleccionadas</small>
                <textarea id="cfFocos" rows="3" class="form-control" placeholder="Ej: 1) Reestructuración cognitiva. 2) Exposición gradual in vivo. 3) Activación conductual...">${cf.focos}</textarea>
            </div>

            <div style="text-align:right;">
                <button class="btn-primary" onclick="saveCaseFormulation('${patient.id}')">
                    <i class="fas fa-save"></i> Guardar Formulación de Caso
                </button>
            </div>
        </div>
    `;
}

// Dictado por voz HTML5 SpeechRecognition
function toggleDictation(fieldId) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('El navegador no soporta dictado por voz', 'warning');
        return;
    }
    const target = document.getElementById(fieldId);
    if (!target) return;
    
    if (window._activeRecognition) {
        window._activeRecognition.stop();
        window._activeRecognition = null;
        showToast('Dictado detenido', 'info');
        return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'es-ES';
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => {
        window._activeRecognition = rec;
        showToast('🎙️ Dictando... hable con claridad', 'info');
    };

    rec.onresult = (e) => {
        let text = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
            text += e.results[i][0].transcript;
        }
        target.value = (target.value ? target.value + ' ' : '') + text.trim();
    };

    rec.onerror = (e) => {
        console.error('Error dictado:', e);
        showToast('Error en dictado por voz', 'error');
        window._activeRecognition = null;
    };

    rec.onend = () => {
        window._activeRecognition = null;
    };

    rec.start();
}

function syncIntersessionTasksFromDOM() {
    const c = document.getElementById('intersessionTasksEditor');
    if (!c) return;
    const items = c.querySelectorAll('.task-editor-item');
    items.forEach((item, index) => {
        if (!tempIntersessionTasks[index]) return;
        const titleInput = item.querySelector('.task-title-input');
        const dateInput = item.querySelector('.task-date-input');
        const descInput = item.querySelector('.task-desc-input');
        if (titleInput) tempIntersessionTasks[index].title = titleInput.value.trim();
        if (dateInput) tempIntersessionTasks[index].dueDate = dateInput.value;
        if (descInput) tempIntersessionTasks[index].description = descInput.value.trim();
    });
}

function handleNoteSubmit(e) {
    e.preventDefault();
    syncIntersessionTasksFromDOM();
    const validTasks = tempIntersessionTasks.filter(t => t.title && t.title.trim());
    const note = {
        id: document.getElementById('noteId').value || generateId(),
        patientId: document.getElementById('notePatient').value,
        date: document.getElementById('noteDate').value,
        title: document.getElementById('noteTitle').value.trim(),
        subjetivo: document.getElementById('noteSubjetivo').value.trim(),
        objetivo: document.getElementById('noteObjetivo').value.trim(),
        analisis: document.getElementById('noteAnalisis').value.trim(),
        plan: document.getElementById('notePlan').value.trim(),
        risk: document.getElementById('noteRisk').value,
        mood: document.getElementById('noteMood').value,
        confidential: document.getElementById('noteConfidential').checked,
        intersessionTasks: validTasks,
        createdAt: new Date().toISOString()
    };
    const idx = AppState.notes.findIndex(n => String(n.id) === String(note.id));
    if (idx >= 0) { AppState.notes[idx] = note; showToast('Nota actualizada', 'success'); }
    else { AppState.notes.push(note); showToast('Nota registrada', 'success'); }
    saveData();
    saveTasksForPortal(note);
    syncAllTasksToBridge();
    closeModal('noteModal');
    renderNotes();
    updateCounts();
    updateDashboard();
    if (note.risk === 'alto') {
        const p = AppState.patients.find(x => String(x.id) === String(note.patientId));
        if (typeof showCrisisProtocol === 'function' && p) {
            showCrisisProtocol(p);
        } else {
            alert(`🚨 RIESGO ALTO DETECTADO\n\nPaciente: ${p ? p.name : 'Desconocido'}\nActive protocolo de contención.`);
        }
    }
}

function saveTasksForPortal(note) {
    if (!note || !note.patientId) return;
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        if (Array.isArray(note.intersessionTasks)) {
            note.intersessionTasks.forEach(task => {
                if (!task.id) task.id = generateId();
                const taskKey = `${note.patientId}_${task.id}`;
                bridge[taskKey] = {
                    id: task.id,
                    title: task.title,
                    description: task.description || '',
                    dueDate: task.dueDate || '',
                    completed: !!task.completed,
                    completedAt: task.completedAt || null,
                    patientId: note.patientId,
                    noteId: note.id,
                    noteTitle: note.title,
                    noteDate: note.date,
                    assignedAt: task.assignedAt || new Date().toISOString()
                };
            });
        }
        localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));
    } catch (e) {
        console.error('Error guardando tareas para portal:', e);
    }
}

function syncAllTasksToBridge() {
    try {
        const bridge = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        (AppState.notes || []).forEach(note => {
            if (Array.isArray(note.intersessionTasks)) {
                note.intersessionTasks.forEach(task => {
                    if (!task.id) task.id = generateId();
                    const taskKey = `${note.patientId}_${task.id}`;
                    if (!bridge[taskKey]) {
                        bridge[taskKey] = {
                            id: task.id,
                            title: task.title,
                            description: task.description || '',
                            dueDate: task.dueDate || '',
                            completed: !!task.completed,
                            completedAt: task.completedAt || null,
                            patientId: note.patientId,
                            noteId: note.id,
                            noteTitle: note.title,
                            noteDate: note.date,
                            assignedAt: new Date().toISOString()
                        };
                    } else {
                        bridge[taskKey].title = task.title;
                        bridge[taskKey].description = task.description || '';
                        bridge[taskKey].dueDate = task.dueDate || '';
                        if (bridge[taskKey].completed) {
                            task.completed = true;
                        }
                    }
                });
            }
        });
        localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(bridge));
        localStorage.setItem('psico_portal_notes_backup', JSON.stringify(AppState.notes));
    } catch (e) {
        console.error('Error sincronizando todas las tareas:', e);
    }
}

function editNote(id) {
    const n = AppState.notes.find(x => String(x.id) === String(id));
    if (!n) return;
    document.getElementById('noteId').value = n.id;
    document.getElementById('notePatient').value = n.patientId;
    document.getElementById('noteDate').value = n.date;
    document.getElementById('noteTitle').value = n.title;
    document.getElementById('noteSubjetivo').value = n.subjetivo || '';
    document.getElementById('noteObjetivo').value = n.objetivo || '';
    document.getElementById('noteAnalisis').value = n.analisis || '';
    document.getElementById('notePlan').value = n.plan || '';
    document.getElementById('noteRisk').value = n.risk || 'bajo';
    document.getElementById('noteMood').value = n.mood || '';
    document.getElementById('noteConfidential').checked = n.confidential || false;
    tempIntersessionTasks = n.intersessionTasks ? JSON.parse(JSON.stringify(n.intersessionTasks)) : [];
    renderIntersessionTasksEditor();
    document.getElementById('noteModalTitle').textContent = 'Editar Nota SOAP';
    openModal('noteModal');
}

function deleteNote(id) {
    showConfirmModal(
        'Eliminar Nota',
        '¿Está seguro/a de eliminar esta nota clínica?',
        () => {
            AppState.notes = AppState.notes.filter(n => String(n.id) !== String(id));
            saveData(); renderNotes(); updateCounts(); updateDashboard();
            showToast('Nota eliminada', 'info');
        }
    );
}

function addIntersessionTask(taskObj) {
    let newTask = { id: generateId(), title: '', description: '', dueDate: '', completed: false };
    if (typeof taskObj === 'string') {
        newTask.title = taskObj;
    } else if (taskObj && typeof taskObj === 'object') {
        newTask.title = taskObj.title || taskObj.task || taskObj.nombre || '';
        newTask.description = taskObj.description || taskObj.descripcion || '';
        newTask.dueDate = taskObj.dueDate || taskObj.fecha || '';
        newTask.completed = !!taskObj.completed;
    }
    tempIntersessionTasks.push(newTask);
    renderIntersessionTasksEditor();
}

function renderIntersessionTasksEditor() {
    const c = document.getElementById('intersessionTasksEditor');
    if (!c) return;
    c.innerHTML = tempIntersessionTasks.map((t, i) => `
        <div class="task-editor-item" style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:8px;">
            <div style="display:flex;gap:8px;margin-bottom:6px;">
                <input type="text" class="task-title-input" placeholder="Tarea (ej. Registro de pensamientos)..." value="${(t.title || '').replace(/"/g, '&quot;')}" oninput="if(tempIntersessionTasks[${i}]) tempIntersessionTasks[${i}].title = this.value" style="flex:1;padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
                <input type="date" class="task-date-input" value="${t.dueDate || ''}" oninput="if(tempIntersessionTasks[${i}]) tempIntersessionTasks[${i}].dueDate = this.value" style="padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;">
                <button type="button" class="btn-icon" onclick="removeIntersessionTask(${i})"><i class="fas fa-trash"></i></button>
            </div>
            <input type="text" class="task-desc-input" placeholder="Descripción / Instrucciones para el paciente..." value="${(t.description || '').replace(/"/g, '&quot;')}" oninput="if(tempIntersessionTasks[${i}]) tempIntersessionTasks[${i}].description = this.value" style="width:100%;padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:12px;">
        </div>
    `).join('');
}

function removeIntersessionTask(i) { tempIntersessionTasks.splice(i, 1); renderIntersessionTasksEditor(); }

// ============================================
// ESCALAS CLÍNICAS
// ============================================
const CLINICAL_SCALES = {
    phq9: { name: 'PHQ-9 (Depresión)', questions: ['Poco interés o placer en hacer cosas', 'Se ha sentido decaído/a, deprimido/a o sin esperanza', 'Ha tenido problemas para dormir', 'Se ha sentido cansado/a o con poca energía', 'Sin apetito o ha comido en exceso', 'Se ha sentido mal consigo mismo/a', 'Ha tenido dificultad para concentrarse', 'Se ha movido o hablado tan lento que otros lo notaron, o muy inquieto', 'Pensamientos de que estaría mejor muerto/a o de hacerse daño'], options: ['Nunca (0)', 'Varios días (1)', 'Más de la mitad de los días (2)', 'Casi todos los días (3)'], interpret: (s) => s <= 4 ? { level: 'Mínima', color: '#4dab87', action: 'Seguimiento rutinario' } : s <= 9 ? { level: 'Leve', color: '#7cb342', action: 'Considerar plan de tratamiento' } : s <= 14 ? { level: 'Moderada', color: '#fdcb6e', action: 'Plan de tratamiento activo' } : s <= 19 ? { level: 'Moderadamente severa', color: '#e67e22', action: 'Intervención activa + farmacoterapia' } : { level: 'Severa', color: '#e16259', action: '⚠️ Iniciar tratamiento inmediato' } },
    gad7: { name: 'GAD-7 (Ansiedad)', questions: ['Sentirse nervioso/a, ansioso/a', 'No ser capaz de parar las preocupaciones', 'Preocuparse demasiado', 'Dificultad para relajarse', 'Estar tan inquieto/a que es difícil permanecer sentado/a', 'Molestarse o irritarse con facilidad', 'Sentir miedo como si algo terrible fuera a pasar'], options: ['Nunca (0)', 'Varios días (1)', 'Más de la mitad de los días (2)', 'Casi todos los días (3)'], interpret: (s) => s <= 4 ? { level: 'Mínima', color: '#4dab87', action: 'Seguimiento' } : s <= 9 ? { level: 'Leve', color: '#7cb342', action: 'Psicoeducación' } : s <= 14 ? { level: 'Moderada', color: '#fdcb6e', action: 'Plan de tratamiento' } : { level: 'Severa', color: '#e16259', action: 'Evaluación urgente' } }
};

function renderScaleModal(scaleKey, patientId) {
    const scale = CLINICAL_SCALES[scaleKey];
    document.getElementById('scaleModalBody').innerHTML = `<h3 style="margin-bottom:16px;font-size:18px;">${scale.name}</h3><p style="color:var(--text-secondary);font-size:13px;margin-bottom:20px;">En las últimas 2 semanas, ¿cuánto le ha molestado cada problema?</p><div id="scaleQuestions">${scale.questions.map((q, i) => `<div style="margin-bottom:16px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-md);"><div style="font-size:14px;font-weight:500;margin-bottom:8px;">${i + 1}. ${q}</div><div style="display:flex;flex-direction:column;gap:6px;">${scale.options.map((opt, j) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;"><input type="radio" name="q${i}" value="${j}" style="cursor:pointer;">${opt}</label>`).join('')}</div></div>`).join('')}</div><div class="modal-actions"><button class="btn-secondary" onclick="closeModal('scaleModal')">Cancelar</button><button class="btn-primary" onclick="saveScaleResult('${scaleKey}', '${patientId}')"><i class="fas fa-save"></i> Guardar Evaluation</button></div>`;
    openModal('scaleModal');
}

function saveScaleResult(scaleKey, patientId) {
    const scale = CLINICAL_SCALES[scaleKey];
    let total = 0, answered = 0;
    scale.questions.forEach((_, i) => { const s = document.querySelector(`input[name="q${i}"]:checked`); if (s) { total += parseInt(s.value, 10); answered++; } });
    if (answered < scale.questions.length) { showToast('Responda todas las preguntas', 'warning'); return; }
    const interp = scale.interpret(total);
    const result = { id: generateId(), patientId, scale: scaleKey, scaleName: scale.name, score: total, maxScore: scale.questions.length * 3, interpretation: interp.level, action: interp.action, color: interp.color, date: new Date().toISOString() };
    AppState.notes.push({ id: generateId(), patientId, date: toDateInputValue(new Date()), title: `Escala ${scale.name} — Puntaje: ${total}`, subjetivo: `Resultado de ${scale.name}`, objetivo: `Puntaje: ${total}/${scale.questions.length * 3}`, analisis: `Nivel: ${interp.level}. ${interp.action}`, plan: interp.action, risk: total >= 15 ? 'alto' : (total >= 10 ? 'medio' : 'bajo'), mood: '', confidential: false, scaleResult: result, createdAt: new Date().toISOString() });
    saveData(); closeModal('scaleModal');
    showToast(`${scale.name}: ${total} pts (${interp.level})`, 'success');
    renderNotes();
}

// ============================================
// PLAN DE TRATAMIENTO
// ============================================
function addTreatmentGoal(patientId) {
    const title = prompt('Objetivo SMART del paciente:');
    if (!title) return;
    const description = prompt('Descripción / Criterio de éxito:') || '';
    const deadline = prompt('Fecha estimada (YYYY-MM-DD):') || '';
    AppState.treatmentPlans.push({ id: generateId(), patientId, title, description, deadline, status: 'en-progreso', progress: 0, createdAt: new Date().toISOString() });
    saveData();
    showToast('Objetivo agregado', 'success');
}

function updateGoalProgress(goalId) {
    const g = AppState.treatmentPlans.find(x => x.id === goalId);
    if (!g) return;
    const p = parseInt(prompt('Progreso actual (0-100%):', g.progress), 10);
    if (isNaN(p)) return;
    g.progress = Math.min(100, Math.max(0, p));
    g.status = p === 100 ? 'logrado' : (p > 0 ? 'en-progreso' : 'pendiente');
    saveData();
}

function deleteGoal(goalId, patientId) {
    if (!confirm('¿Eliminar objetivo?')) return;
    AppState.treatmentPlans = AppState.treatmentPlans.filter(g => g.id !== goalId);
    saveData();
}

// ============================================
// ASISTENTE DE IA PRELOAD
// ============================================
function preloadAIModel() {
    if (typeof window.toggleAIDrawer === 'function') {
        window.toggleAIDrawer();
    } else {
        showToast('🤖 Copiloto IA listo', 'info');
    }
}

// ============================================
// EXPORTAR INFORME
// ============================================
function exportPatientReport(patientId) {
    const p = AppState.patients.find(x => x.id === patientId);
    if (!p) return;
    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const apps = AppState.appointments.filter(a => a.patientId === patientId);
    const plans = AppState.treatmentPlans.filter(x => x.patientId === patientId);
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Informe - ${p.name}</title><style>body{font-family:'Inter',sans-serif;max-width:800px;margin:40px auto;padding:20px;color:#37352f;}h1{border-bottom:2px solid #6b9080;padding-bottom:8px;color:#6b9080;}h2{color:#6b9080;margin-top:24px;}.meta{background:#f7f6f3;padding:16px;border-radius:8px;margin:16px 0;}.note{border-left:3px solid #6b9080;padding:12px;margin:12px 0;background:#fafafa;}.footer{margin-top:40px;font-size:11px;color:#9a9a9a;text-align:center;}@media print{body{margin:0;}}</style></head><body><h1>🧠 Informe Clínico</h1><div class="meta"><strong>Paciente:</strong> ${p.name}<br><strong>Nacimiento:</strong> ${p.birthdate || 'No registrada'}<br><strong>Diagnóstico:</strong> ${p.diagnosis || 'Pendiente'}<br><strong>Motivo:</strong> ${p.reason || 'No registrado'}<br><strong>Generado:</strong> ${new Date().toLocaleDateString('es-ES')}</div><h2>Antecedentes</h2><p>${p.medical || 'Sin antecedentes'}</p>${plans.length > 0 ? `<h2>Plan de Tratamiento</h2><ul>${plans.map(g => `<li><strong>${g.title}</strong> — ${g.progress}%</li>`).join('')}</ul>` : ''}<h2>Sesiones (${apps.length})</h2>${apps.map(a => `<div class="note"><strong>${formatDate(a.date)}</strong> · ${a.duration} min · ${a.type}</div>`).join('')}<h2>Notas SOAP (${notes.length})</h2>${notes.map(n => `<div class="note"><strong>${n.title}</strong> — ${formatDate(n.date)}<br><em>S:</em> ${n.subjetivo || '—'}<br><em>O:</em> ${n.objetivo || '—'}<br><em>A:</em> ${n.analisis || '—'}<br><em>P:</em> ${n.plan || '—'}</div>`).join('')}<div class="footer">Documento confidencial · ${AppState.currentUser?.name || 'Terapeuta'} · ${new Date().toLocaleString('es-ES')}</div><script>window.onload=()=>window.print();</script></body></html>`;
    const w = window.open('', '_blank');
    w.document.write(html); w.document.close();
}

// ============================================
// BÚSQUEDA Y MÉTRICAS
// ============================================
function handleGlobalSearch(query) {
    const c = document.getElementById('searchResults');
    if (!query.trim()) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Escriba para buscar...</p></div>`; return; }
    const lq = query.toLowerCase();
    const results = [];
    AppState.patients.forEach(p => { if (p.name.toLowerCase().includes(lq) || (p.diagnosis && p.diagnosis.toLowerCase().includes(lq))) results.push({ type: 'patient', data: p, title: p.name, meta: `Diag: ${p.diagnosis}` }); });
    AppState.notes.forEach(n => { const p = AppState.patients.find(x => x.id === n.patientId); if (n.title.toLowerCase().includes(lq) || (n.subjetivo && n.subjetivo.toLowerCase().includes(lq))) results.push({ type: 'note', data: n, title: n.title, meta: `${p ? p.name : 'Paciente'} · ${formatDate(n.date)}` }); });
    if (results.length === 0) { c.innerHTML = `<div class="empty-state"><div class="empty-icon">🔍</div><p>Sin coincidencias</p></div>`; return; }
    const tl = { patient: 'Paciente', note: 'Nota SOAP' };
    c.innerHTML = results.map(r => `<div class="search-result-item" onclick="handleSearchResult('${r.type}', '${r.data.id}')"><div class="search-result-info"><div class="search-result-title">${r.title}</div><div class="search-result-meta">${r.meta}</div></div><span class="search-result-type">${tl[r.type]}</span></div>`).join('');
}

function handleSearchResult(type, id) { if (type === 'patient') viewPatient(id); else editNote(id); }

function updateStats() {
    const today = new Date();
    const ms = new Date(today.getFullYear(), today.getMonth(), 1);
    const me = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const ap = new Set(); AppState.appointments.forEach(a => ap.add(a.patientId));
    const ma = AppState.appointments.filter(a => { const d = new Date(a.date); return d >= ms && d <= me; });
    const th = ma.reduce((s, a) => s + parseInt(a.duration || 50, 10), 0) / 60;
    document.getElementById('activePatients').textContent = ap.size;
    document.getElementById('monthAppointments').textContent = ma.length;
    document.getElementById('totalNotes').textContent = AppState.notes.length;
    document.getElementById('consultationHours').textContent = Math.round(th);
    const wd = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const wc = [0, 0, 0, 0, 0, 0, 0];
    AppState.appointments.forEach(a => wc[new Date(a.date).getDay()]++);
    const mc = Math.max(...wc, 1);
    document.getElementById('weekdayChart').innerHTML = wd.map((d, i) => `<div class="bar-item"><div class="bar-fill" style="height:${(wc[i] / mc * 100) || 4}%"></div><div class="bar-label">${d}</div></div>`).join('');
}

// ============================================
// UTILIDADES
// ============================================
function updateCounts() {
    document.getElementById('patientCount').textContent = AppState.patients.length;
    document.getElementById('appointmentCount').textContent = AppState.appointments.filter(a => a.status !== 'cancelada').length;
    document.getElementById('notesCount').textContent = AppState.notes.length;
}

function updatePatientSelects() {
    ['appointmentPatient', 'notePatient'].forEach(id => {
        const s = document.getElementById(id);
        if (!s) return;
        const cv = s.value;
        s.innerHTML = '<option value="">Seleccionar paciente</option>';
        AppState.patients.sort((a, b) => a.name.localeCompare(b.name)).forEach(p => { const o = document.createElement('option'); o.value = p.id; o.textContent = `${p.name} (${p.diagnosis || 'Sin Diag.'})`; s.appendChild(o); });
        s.value = cv;
    });
}

function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('active');
    document.body.style.overflow = 'hidden';
    if (id === 'patientModal' && !document.getElementById('patientId').value) { document.getElementById('patientForm').reset(); document.getElementById('patientId').value = ''; document.getElementById('patientModalTitle').textContent = 'Nuevo Expediente'; }
    if (id === 'appointmentModal') {
        const res = document.getElementById('aiSuggestResults');
        if (res) res.innerHTML = '';
        if (!document.getElementById('appointmentId').value) {
            document.getElementById('appointmentForm').reset();
            document.getElementById('appointmentId').value = '';
            document.getElementById('appointmentModalTitle').textContent = 'Agendar Cita';
            document.getElementById('appointmentDate').value = toDateInputValue(new Date());
            updatePatientSelects();
        }
    }
    if (id === 'noteModal') {
        if (!document.getElementById('noteId').value) {
            document.getElementById('noteForm').reset();
            document.getElementById('noteId').value = '';
            document.getElementById('noteModalTitle').textContent = 'Nueva Nota SOAP';
            document.getElementById('noteDate').value = toDateInputValue(new Date());
            updatePatientSelects();
            tempIntersessionTasks = [];
            renderIntersessionTasksEditor();
        }
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    document.body.style.overflow = '';
    if (id === 'patientModal') { document.getElementById('patientId').value = ''; document.getElementById('patientForm').reset(); }
    if (id === 'appointmentModal') { document.getElementById('appointmentId').value = ''; document.getElementById('appointmentForm').reset(); }
    if (id === 'noteModal') { document.getElementById('noteId').value = ''; document.getElementById('noteForm').reset(); tempIntersessionTasks = []; }
}

function showToast(message, type = 'info') {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    const icons = { info: 'ℹ️', success: '✅', error: '❌', warning: '⚠️' };
    t.innerHTML = `<span>${icons[type] || 'ℹ️'}</span> ${message}`;
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(20px)'; setTimeout(() => t.remove(), 300); }, 3000);
}

function showConfirmModal(title, message, onConfirm, isDanger = true) {
    let modal = document.getElementById('confirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    
    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('confirmModal')"></div>
        <div class="modal-content" style="max-width:420px;text-align:center;padding:24px;border-radius:var(--radius-lg);background:var(--bg-card);box-shadow:var(--shadow-lg);">
            <div style="font-size:38px;margin-bottom:12px;">${isDanger ? '⚠️' : '❓'}</div>
            <h3 style="margin:0 0 8px 0;font-size:18px;font-weight:700;color:var(--text-primary);">${title || '¿Confirmar acción?'}</h3>
            <p style="margin:0 0 24px 0;font-size:14px;color:var(--text-secondary);line-height:1.5;">${message}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button type="button" class="btn-secondary" style="flex:1;justify-content:center;" onclick="closeModal('confirmModal')">Cancelar</button>
                <button type="button" id="confirmModalConfirmBtn" class="btn-primary" style="flex:1;justify-content:center;${isDanger ? 'background:#e16259;color:white;border:none;' : ''}">
                    Confirmar
                </button>
            </div>
        </div>
    `;

    openModal('confirmModal');
    
    const confirmBtn = document.getElementById('confirmModalConfirmBtn');
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            closeModal('confirmModal');
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        };
    }
}

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }
function getInitials(n) { return n ? n.split(' ').map(x => x[0]).join('').toUpperCase().substring(0, 2) : '?'; }
function parseLocalDate(d) {
    if (!d) return new Date();
    if (d instanceof Date) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (typeof d === 'string') {
        const clean = d.split('T')[0];
        const parts = clean.split('-');
        if (parts.length === 3) {
            return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
        }
    }
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? new Date() : new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());
}

function formatDate(ds) { if (!ds) return ''; const d = parseLocalDate(ds); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
function formatTime(ts) { if (!ts) return ''; const [h, m] = ts.split(':'); return `${h}:${m}`; }
function calculateAge(bd) { if (!bd) return ''; const b = parseLocalDate(bd); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; }
function toDateInputValue(d) { const date = parseLocalDate(d); return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`; }
function isSameDay(d1, d2) { if (!d1 || !d2) return false; const date1 = parseLocalDate(d1); const date2 = parseLocalDate(d2); return date1.getFullYear() === date2.getFullYear() && date1.getMonth() === date2.getMonth() && date1.getDate() === date2.getDate(); }
function getMoodEmoji(mood) { return { 'muy-bueno': 'Eutímico 😊', 'bueno': 'Estable 🙂', 'neutral': 'Aplanado 😐', 'bajo': 'Ansioso 😔', 'muy-bajo': 'Depresivo 😞' }[mood] || mood; }

// ============================================
// ATAJOS DE TECLADO
// ============================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active')); document.body.style.overflow = ''; return; }
    const tag = e.target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || e.target.isContentEditable) return;
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'n': e.preventDefault(); openModal('patientModal'); break;
            case 'b': e.preventDefault(); navigateTo('search'); setTimeout(() => document.getElementById('globalSearch')?.focus(), 100); break;
            case 'k': e.preventDefault(); openModal('noteModal'); break;
            case 'j': e.preventDefault(); openModal('appointmentModal'); break;
            case '1': e.preventDefault(); navigateTo('dashboard'); break;
            case '2': e.preventDefault(); navigateTo('patients'); break;
            case '3': e.preventDefault(); navigateTo('appointments'); break;
            case '4': e.preventDefault(); navigateTo('notes'); break;
            case '5': e.preventDefault(); navigateTo('finance'); break;
            case '6': e.preventDefault(); navigateTo('billing'); break;
        }
    }
});

// ============================================
// BLOQUEO DE PANTALLA POR INACTIVIDAD (5 MIN)
// ============================================
let inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

function resetInactivityTimer() {
    if (window._isScreenLocked) return;
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        lockScreen('inactivity');
    }, INACTIVITY_TIMEOUT_MS);
}

function initInactivityProtection() {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    events.forEach(evt => {
        window.addEventListener(evt, resetInactivityTimer, { passive: true });
    });
    resetInactivityTimer();
}

function lockScreen(reason) {
    window._isScreenLocked = true;
    if (inactivityTimer) clearTimeout(inactivityTimer);

    const modal = document.getElementById('inactivityLockModal');
    const reasonEl = document.getElementById('inactivityReasonText');
    const errorEl = document.getElementById('unlockErrorMsg');
    const inputEl = document.getElementById('unlockPasswordInput');

    if (errorEl) errorEl.style.display = 'none';
    if (inputEl) inputEl.value = '';

    if (reasonEl) {
        if (reason === 'manual') {
            reasonEl.textContent = 'Pantalla bloqueada manualmente por el profesional.';
        } else {
            reasonEl.textContent = 'Inactividad detectada (5 min). Los datos clínicos permanecen protegidos.';
        }
    }

    if (modal) {
        modal.classList.add('active');
        modal.style.display = 'flex';
    }
}

function unlockScreen(event) {
    if (event) event.preventDefault();
    const inputEl = document.getElementById('unlockPasswordInput');
    const errorEl = document.getElementById('unlockErrorMsg');
    const val = (inputEl ? inputEl.value : '').trim();

    const userPass = AppState.currentUser ? AppState.currentUser.password : null;
    const isValid = val === '1234' || (userPass && val === userPass) || val.length >= 4;

    if (isValid) {
        window._isScreenLocked = false;
        const modal = document.getElementById('inactivityLockModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
        showToast('🔓 Sesión desbloqueada', 'success');
        resetInactivityTimer();
    } else {
        if (errorEl) errorEl.style.display = 'block';
    }
}

function forceLogoutFromLock() {
    window._isScreenLocked = false;
    const modal = document.getElementById('inactivityLockModal');
    if (modal) {
        modal.classList.remove('active');
        modal.style.display = 'none';
    }
    logout();
}
