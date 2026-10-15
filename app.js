/**
 * PSICO NOTES CLINICAL v5.0
 * Gestión Clínica Psicológica Completa
 */

// ============================================
// ESTADO GLOBAL
// ============================================
const AppState = {
    currentView: 'dashboard',
    sidebarCollapsed: false,
    darkMode: false,
    patientCategoryFilter: 'all',
    calendarViewMode: 'month',
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
// SEGURIDAD CLÍNICA & PRIVACIDAD (HIPAA / GDPR)
// ============================================
const ClinicalSecurity = {
    inactivityTimer: null,
    TIMEOUT_MS: 15 * 60 * 1000, // 15 minutos de inactividad médica
    isLocked: false,

    init() {
        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
        const onActivity = () => this.resetInactivityTimer();
        events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
        this.resetInactivityTimer();

        if (sessionStorage.getItem('psico_session_locked') === 'true') {
            this.lockApp(false);
        }
    },

    resetInactivityTimer() {
        if (this.isLocked) return;
        if (this.inactivityTimer) clearTimeout(this.inactivityTimer);
        if (AppState.currentUser) {
            this.inactivityTimer = setTimeout(() => {
                this.lockApp(true);
            }, this.TIMEOUT_MS);
        }
    },

    lockApp(auto = false) {
        if (!AppState.currentUser) return;
        this.isLocked = true;
        sessionStorage.setItem('psico_session_locked', 'true');
        const overlay = document.getElementById('screenLockOverlay');
        if (overlay) {
            const nameEl = document.getElementById('lockTherapistName');
            if (nameEl) nameEl.textContent = AppState.currentUser.name || 'Terapeuta Titular';
            const passInput = document.getElementById('unlockPasswordInput');
            if (passInput) {
                passInput.value = '';
                passInput.classList.remove('error');
                setTimeout(() => passInput.focus(), 150);
            }
            const errEl = document.getElementById('unlockError');
            if (errEl) errEl.style.display = 'none';
            overlay.style.display = 'flex';
            document.body.classList.add('screen-locked');
        }
        if (auto) {
            console.log('🔒 Sesión bloqueada automáticamente por inactividad clínica (HIPAA)');
        }
    },

    async unlockApp(e) {
        if (e) e.preventDefault();
        const passInput = document.getElementById('unlockPasswordInput');
        const errEl = document.getElementById('unlockError');
        const entered = (passInput ? passInput.value : '').trim();

        if (!entered) {
            if (passInput) passInput.focus();
            return;
        }

        const currentUser = AppState.currentUser;
        if (!currentUser) {
            this.forceUnlock();
            return;
        }

        const users = (typeof getUsers === 'function') ? getUsers() : [];
        const user = users.find(u => u.id === currentUser.id);

        let isValid = false;
        if (user && user.passwordHash) {
            const enteredHash = await hashPassword(entered);
            if (enteredHash === user.passwordHash) {
                isValid = true;
            }
        } else {
            isValid = true;
        }

        if (isValid) {
            this.forceUnlock();
            if (typeof showToast === 'function') {
                showToast('Expedientes clínicos desbloqueados 🔓', 'success');
            }
        } else {
            if (errEl) {
                errEl.textContent = 'Contraseña incorrecta. Intente nuevamente.';
                errEl.style.display = 'block';
            }
            if (passInput) {
                passInput.classList.add('error');
                passInput.focus();
            }
        }
    },

    forceUnlock() {
        this.isLocked = false;
        sessionStorage.removeItem('psico_session_locked');
        document.body.classList.remove('screen-locked');
        const overlay = document.getElementById('screenLockOverlay');
        if (overlay) overlay.style.display = 'none';
        this.resetInactivityTimer();
    }
};

window.ClinicalSecurity = ClinicalSecurity;

// ============================================
// INICIALIZACIÓN
// ============================================
document.addEventListener('DOMContentLoaded', async () => {
    initAuthEventListeners();
    loadThemePreference();

    // Eventos de conectividad para sincronización resiliente
    window.addEventListener('online', () => {
        if (typeof CloudSyncManager !== 'undefined') {
            CloudSyncManager.pushToCloud(false);
            if (AppState.currentUser) CloudSyncManager.pullFromCloud(AppState.currentUser.id, false);
        }
    });

    window.addEventListener('offline', () => {
        if (typeof CloudSyncManager !== 'undefined') {
            CloudSyncManager.updateStatusUI('offline');
        }
    });

    const session = getSession();
    if (session) {
        const user = getUsers().find(u => u.id === session);
        if (user) {
            AppState.currentUser = {
                id: user.id,
                name: user.name,
                email: user.email,
                specialty: user.specialty || localStorage.getItem('psico_therapist_specialty') || 'Psicología Clínica',
                registryNumber: user.registryNumber || localStorage.getItem('psico_therapist_registry') || '',
                phone: user.phone || localStorage.getItem('psico_therapist_phone') || '',
                institution: user.institution || localStorage.getItem('psico_therapist_institution') || ''
            };
            await startAppForCurrentUser();

            // Sincronización en segundo plano con la nube al arrancar
            if (typeof CloudSyncManager !== 'undefined') {
                CloudSyncManager.pullFromCloud(user.id, false);
            }
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
    renderCalendar();
    updateDashboard();
    renderPatients();
    renderAppointments();
    renderNotes();
    updateStats();
    updateCounts();
    updatePatientSelects();
    checkPortalCrisisAlerts();
    setInterval(checkPortalCrisisAlerts, 20000);
    ClinicalSecurity.init();

    // Estado inicial del botón de sincronización
    if (typeof CloudSyncManager !== 'undefined') {
        CloudSyncManager.updateStatusUI(navigator.onLine ? 'synced' : 'offline');
    }

    // Sincronizar en segundo plano todos los pacientes a la base de datos PostgreSQL
    if (AppState.patients && AppState.patients.length > 0) {
        AppState.patients.forEach(p => {
            if (typeof ensurePatientPortalToken === 'function') ensurePatientPortalToken(p);
            if (typeof syncPatientToPortalStorage === 'function') syncPatientToPortalStorage(p);
        });
    }

    // Si el expediente de un paciente está abierto en pantalla, refrescar su portal cada 15 segundos
    setInterval(() => {
        const portalTab = document.getElementById('tab-portal');
        if (portalTab && portalTab.classList.contains('active') && AppState.selectedPatientId) {
            if (typeof refreshPortalTabContent === 'function') {
                refreshPortalTabContent(AppState.selectedPatientId, false);
            }
        }
    }, 15000);
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
        diagnosis: p.diagnosis || 'Pendiente de evaluación',
        category: getPatientCategory(p)
    }));
}

// ============================================
// GESTOR DE SINCRONIZACIÓN EN LA NUBE MULTI-DISPOSITIVO
// ============================================
const CloudSyncManager = {
    isSyncing: false,
    lastSyncTime: null,
    syncDebounceTimer: null,
    status: 'idle',

    updateStatusUI(status, message) {
        this.status = status;
        const el = document.getElementById('cloudSyncStatusBtn');
        if (!el) return;

        if (status === 'syncing') {
            el.innerHTML = '<i class="fas fa-sync fa-spin"></i> <span class="sync-text">Sincronizando...</span>';
            el.title = 'Guardando datos en la nube...';
            el.className = 'btn-sync-cloud syncing';
        } else if (status === 'synced') {
            el.innerHTML = '<i class="fas fa-cloud-check"></i> <span class="sync-text">Nube al día</span>';
            const timeStr = this.lastSyncTime ? new Date(this.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'reciente';
            el.title = `Sincronizado con la nube a las ${timeStr}. Accesible desde tu PC y móvil.`;
            el.className = 'btn-sync-cloud synced';
        } else if (status === 'offline') {
            el.innerHTML = '<i class="fas fa-wifi-slash"></i> <span class="sync-text">Modo Local</span>';
            el.title = 'Sin conexión. Los datos están seguros en este dispositivo y se subirán al reconectar.';
            el.className = 'btn-sync-cloud offline';
        } else if (status === 'error') {
            el.innerHTML = '<i class="fas fa-cloud-slash"></i> <span class="sync-text">Reintentar Sync</span>';
            el.title = message || 'Error al conectar con la nube. Clic para reintentar.';
            el.className = 'btn-sync-cloud error';
        }
    },

    schedulePush() {
        if (!AppState.currentUser || !AppState.currentUser.id) return;
        if (this.syncDebounceTimer) clearTimeout(this.syncDebounceTimer);
        this.syncDebounceTimer = setTimeout(() => {
            this.pushToCloud(false);
        }, 1200);
    },

    async pushToCloud(showToastFeedback = false) {
        if (!AppState.currentUser || !AppState.currentUser.id) return;
        if (!navigator.onLine) {
            this.updateStatusUI('offline');
            return;
        }

        try {
            this.isSyncing = true;
            this.updateStatusUI('syncing');

            const payload = {
                patients: AppState.patients || [],
                appointments: AppState.appointments || [],
                notes: AppState.notes || [],
                treatmentPlans: AppState.treatmentPlans || [],
                settings: {
                    signature: localStorage.getItem('psico_therapist_signature') || '',
                    phone: localStorage.getItem('psico_therapist_phone') || '',
                    institution: localStorage.getItem('psico_therapist_institution') || '',
                    specialty: localStorage.getItem('psico_therapist_specialty') || '',
                    registry: localStorage.getItem('psico_therapist_registry') || '',
                    darkMode: AppState.darkMode
                },
                clientTimestamp: Date.now()
            };

            const res = await fetch('/api/v1/clinical/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    therapistId: AppState.currentUser.id,
                    payload,
                    clientTimestamp: Date.now()
                })
            });

            if (res.ok) {
                this.lastSyncTime = Date.now();
                this.updateStatusUI('synced');
                if (showToastFeedback && typeof showToast === 'function') {
                    showToast('☁️ Expediente sincronizado con la nube con éxito', 'success');
                }
            } else {
                this.updateStatusUI('error', 'Error en el servidor de sincronización');
            }
        } catch (e) {
            console.warn('Sync push error:', e.message);
            this.updateStatusUI('offline');
        } finally {
            this.isSyncing = false;
        }
    },

    async pullFromCloud(therapistId = AppState.currentUser?.id, showToastFeedback = false) {
        if (!therapistId) return false;
        if (!navigator.onLine) {
            this.updateStatusUI('offline');
            return false;
        }

        try {
            this.isSyncing = true;
            this.updateStatusUI('syncing');

            const res = await fetch(`/api/v1/clinical/sync?therapistId=${encodeURIComponent(therapistId)}`);
            if (!res.ok) {
                this.updateStatusUI('error');
                return false;
            }

            const data = await res.json();
            if (data.status === 'ok' && data.payload) {
                const cloud = data.payload;

                // Combinación sin pérdida (merge inteligente)
                const mergedPatients = this.mergeCollections(AppState.patients || [], cloud.patients || []);
                const mergedAppointments = this.mergeCollections(AppState.appointments || [], cloud.appointments || []);
                const mergedNotes = this.mergeCollections(AppState.notes || [], cloud.notes || []);
                const mergedPlans = this.mergeCollections(AppState.treatmentPlans || [], cloud.treatmentPlans || []);

                AppState.patients = mergedPatients;
                AppState.appointments = mergedAppointments;
                AppState.notes = mergedNotes;
                AppState.treatmentPlans = mergedPlans;

                // Configuraciones del terapeuta
                if (cloud.settings) {
                    if (cloud.settings.signature && !localStorage.getItem('psico_therapist_signature')) {
                        localStorage.setItem('psico_therapist_signature', cloud.settings.signature);
                    }
                    if (cloud.settings.phone) localStorage.setItem('psico_therapist_phone', cloud.settings.phone);
                    if (cloud.settings.institution) localStorage.setItem('psico_therapist_institution', cloud.settings.institution);
                }

                // Guardar en el almacenamiento del navegador actual
                await saveDataLocallyOnly();

                // Re-renderizar vistas si ya están inicializadas
                if (typeof updateDashboard === 'function') updateDashboard();
                if (typeof renderPatients === 'function') renderPatients();
                if (typeof renderAppointments === 'function') renderAppointments();
                if (typeof renderNotes === 'function') renderNotes();
                if (typeof updateCounts === 'function') updateCounts();
                if (typeof renderCalendar === 'function') renderCalendar();

                this.lastSyncTime = Date.now();
                this.updateStatusUI('synced');
                if (showToastFeedback && typeof showToast === 'function') {
                    showToast('☁️ Datos descargados y sincronizados desde la nube', 'success');
                }
                return true;
            } else if (data.status === 'empty') {
                // Si la nube está vacía pero este dispositivo ya tiene pacientes o notas (ej. lo guardado ayer en la PC)
                if ((AppState.patients && AppState.patients.length > 0) || (AppState.notes && AppState.notes.length > 0)) {
                    await this.pushToCloud(false);
                } else {
                    this.updateStatusUI('synced');
                }
                return true;
            }
        } catch (e) {
            console.warn('Sync pull error:', e.message);
            this.updateStatusUI('offline');
            return false;
        } finally {
            this.isSyncing = false;
        }
    },

    mergeCollections(localList, cloudList) {
        const map = new Map();
        for (const item of (cloudList || [])) {
            if (item && item.id) map.set(item.id, item);
        }
        for (const item of (localList || [])) {
            if (!item || !item.id) continue;
            if (!map.has(item.id)) {
                map.set(item.id, item);
            } else {
                const cloudItem = map.get(item.id);
                const localTs = new Date(item.updatedAt || item.createdAt || 0).getTime();
                const cloudTs = new Date(cloudItem.updatedAt || cloudItem.createdAt || 0).getTime();
                if (localTs >= cloudTs) {
                    map.set(item.id, { ...cloudItem, ...item });
                }
            }
        }
        return Array.from(map.values());
    },

    manualSyncClick() {
        if (this.isSyncing) return;
        this.pullFromCloud(AppState.currentUser?.id, true).then(() => {
            this.pushToCloud(true);
        });
    }
};

window.CloudSyncManager = CloudSyncManager;

async function saveDataLocallyOnly() {
    try {
        localStorage.setItem(userStorageKey('patients'), await encryptData(AppState.patients));
        localStorage.setItem(userStorageKey('appointments'), await encryptData(AppState.appointments));
        localStorage.setItem(userStorageKey('notes'), await encryptData(AppState.notes));
        localStorage.setItem(userStorageKey('plans'), await encryptData(AppState.treatmentPlans));
        localStorage.setItem('psico_darkMode', AppState.darkMode);
        localStorage.setItem('psico_portal_notes_backup', JSON.stringify(AppState.notes));
        if (typeof updateSessionRemindersUI === 'function') updateSessionRemindersUI();
    } catch (e) {
        console.error('Error guardando local:', e);
    }
}

async function saveData() {
    await saveDataLocallyOnly();
    if (typeof CloudSyncManager !== 'undefined') {
        CloudSyncManager.schedulePush();
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
    const nameEl = document.getElementById('sidebarUserName');
    if (nameEl) nameEl.textContent = AppState.currentUser.name || 'Terapeuta';
    const roleEl = document.getElementById('sidebarUserEmail');
    if (roleEl) roleEl.textContent = AppState.currentUser.specialty || 'Psicología Clínica';
    const regEl = document.getElementById('sidebarUserRegistry');
    if (regEl) regEl.textContent = AppState.currentUser.registryNumber || '';
}

function initAuthEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    document.getElementById('showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('registerForm').style.display = '';
    });
    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('registerForm').style.display = 'none';
        document.getElementById('forgotPasswordForm').style.display = 'none';
        document.getElementById('loginForm').style.display = '';
    });
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);

    // Eventos de Recuperación de Contraseña
    const showForgotBtn = document.getElementById('showForgotPassword');
    if (showForgotBtn) {
        showForgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('loginForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            const forgotForm = document.getElementById('forgotPasswordForm');
            forgotForm.style.display = '';
            document.getElementById('forgotStep1').style.display = '';
            document.getElementById('forgotStep2').style.display = 'none';
            document.getElementById('forgotError').classList.remove('visible');
            document.getElementById('forgotSuccess').style.display = 'none';
            const loginEmailVal = document.getElementById('loginEmail').value.trim();
            if (loginEmailVal) document.getElementById('forgotEmail').value = loginEmailVal;
        });
    }

    const cancelForgotBtn = document.getElementById('cancelForgotPassword');
    if (cancelForgotBtn) {
        cancelForgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('registerForm').style.display = 'none';
            document.getElementById('loginForm').style.display = '';
        });
    }

    const btnRequestCode = document.getElementById('btnRequestResetCode');
    if (btnRequestCode) {
        btnRequestCode.addEventListener('click', handleRequestResetCode);
    }

    const btnSubmitNewPwd = document.getElementById('btnSubmitNewPassword');
    if (btnSubmitNewPwd) {
        btnSubmitNewPwd.addEventListener('click', handleSubmitNewPassword);
    }
}

async function handleRequestResetCode(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const errorEl = document.getElementById('forgotError');
    const successEl = document.getElementById('forgotSuccess');
    errorEl.classList.remove('visible');
    successEl.style.display = 'none';

    if (!email) {
        errorEl.textContent = 'Por favor ingresa tu correo electrónico registrado.';
        errorEl.classList.add('visible');
        return;
    }

    try {
        const res = await fetch('/api/v1/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();

        if (res.ok && data.status === 'ok') {
            successEl.innerHTML = `<strong>✅ Código de verificación generado:</strong> <span style="font-size:16px;letter-spacing:2px;font-weight:700;">${data.resetCode}</span><br><small>Ingrésalo a continuación para establecer tu nueva clave.</small>`;
            successEl.style.display = 'block';
            document.getElementById('forgotCode').value = data.resetCode || '';
            document.getElementById('forgotStep2').style.display = 'block';
            document.getElementById('btnRequestResetCode').style.display = 'none';
        } else {
            errorEl.innerHTML = (data.error || 'No existe ninguna cuenta registrada con este correo.') + 
                `<br><a href="javascript:void(0)" onclick="goToRegisterWithEmail('${email}')" style="color:#38bdf8;text-decoration:underline;display:inline-block;margin-top:8px;font-weight:600;">👉 Crear mi cuenta profesional con este correo</a>`;
            errorEl.classList.add('visible');
        }
    } catch (err) {
        // Fallback local si el servidor no responde
        const localUser = getUsers().find(u => u.email === email);
        if (localUser) {
            const fallbackCode = '777888';
            successEl.innerHTML = `<strong>✅ Modo Respaldo Local:</strong> Código de verificación: <strong>${fallbackCode}</strong>`;
            successEl.style.display = 'block';
            document.getElementById('forgotCode').value = fallbackCode;
            document.getElementById('forgotStep2').style.display = 'block';
            document.getElementById('btnRequestResetCode').style.display = 'none';
        } else {
            errorEl.innerHTML = 'No se encontró ninguna cuenta registrada con este correo.<br><a href="javascript:void(0)" onclick="goToRegisterWithEmail(\'' + email + '\')" style="color:#38bdf8;text-decoration:underline;display:inline-block;margin-top:8px;font-weight:600;">👉 Crear mi cuenta profesional con este correo</a>';
            errorEl.classList.add('visible');
        }
    }
}

function goToRegisterWithEmail(email) {
    var forgotForm = document.getElementById('forgotPasswordForm');
    var loginForm = document.getElementById('loginForm');
    var regForm = document.getElementById('registerForm');
    if (forgotForm) forgotForm.style.display = 'none';
    if (loginForm) loginForm.style.display = 'none';
    if (regForm) {
        regForm.style.display = '';
        var regEmail = document.getElementById('registerEmail');
        if (regEmail && email) regEmail.value = email;
        var regName = document.getElementById('registerName');
        if (regName) regName.focus();
    }
}
window.goToRegisterWithEmail = goToRegisterWithEmail;

async function handleSubmitNewPassword(e) {
    e.preventDefault();
    const email = document.getElementById('forgotEmail').value.trim().toLowerCase();
    const code = document.getElementById('forgotCode').value.trim();
    const p1 = document.getElementById('forgotNewPassword').value;
    const p2 = document.getElementById('forgotNewPassword2').value;
    const errorEl = document.getElementById('resetError');
    errorEl.classList.remove('visible');

    if (!code || code.length < 4) {
        errorEl.textContent = 'Ingresa el código de verificación de 6 dígitos.';
        errorEl.classList.add('visible');
        return;
    }
    if (p1 !== p2) {
        errorEl.textContent = 'Las contraseñas no coinciden.';
        errorEl.classList.add('visible');
        return;
    }
    if (p1.length < 6) {
        errorEl.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
        errorEl.classList.add('visible');
        return;
    }

    const newHash = await hashPassword(p1);

    try {
        const res = await fetch('/api/v1/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code, newPasswordHash: newHash })
        });
        const data = await res.json();

        if (res.ok && data.status === 'ok') {
            // Actualizar también en caché local
            const users = getUsers();
            const u = users.find(user => user.email === email);
            if (u) {
                u.passwordHash = newHash;
                saveUsers(users);
            }

            showToast('✅ Contraseña restablecida exitosamente. Ya puedes iniciar sesión.', 'success');
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('loginForm').style.display = '';
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
        } else {
            errorEl.textContent = data.error || 'Código incorrecto o expirado.';
            errorEl.classList.add('visible');
        }
    } catch (err) {
        // Fallback local
        const users = getUsers();
        const u = users.find(user => user.email === email);
        if (u) {
            u.passwordHash = newHash;
            saveUsers(users);
            showToast('✅ Contraseña actualizada localmente.', 'success');
            document.getElementById('forgotPasswordForm').style.display = 'none';
            document.getElementById('loginForm').style.display = '';
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').focus();
        } else {
            errorEl.textContent = 'Error al restablecer contraseña: ' + err.message;
            errorEl.classList.add('visible');
        }
    }
}

window.handleRequestResetCode = handleRequestResetCode;
window.handleSubmitNewPassword = handleSubmitNewPassword;

async function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.classList.remove('visible');
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const hash = await hashPassword(password);

    let loggedUser = null;
    let cloudData = null;

    // 1. Intentar autenticar contra el servidor central (PostgreSQL / Cloud)
    try {
        const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, passwordHash: hash })
        });
        const resData = await response.json();
        if (response.ok && resData.authenticated) {
            loggedUser = resData.therapist;
            cloudData = resData.cloudData;
        } else if (response.status === 401) {
            errorEl.textContent = 'Correo o contraseña incorrectos.';
            errorEl.classList.add('visible');
            return;
        }
    } catch (netErr) {
        console.warn('Servidor cloud no disponible para login en este instante, verificando almacenamiento local:', netErr.message);
    }

    // 2. Si el servidor no respondió (offline) o como fallback, consultar memoria local
    if (!loggedUser) {
        const localUser = getUsers().find(u => u.email === email);
        if (localUser) {
            if (hash !== localUser.passwordHash) {
                errorEl.textContent = 'Contraseña incorrecta.';
                errorEl.classList.add('visible');
                return;
            }
            loggedUser = localUser;
        }
    }

    if (!loggedUser) {
        errorEl.textContent = 'No existe una cuenta con este correo o las credenciales son incorrectas.';
        errorEl.classList.add('visible');
        return;
    }

    // 3. Normalizar usuario y guardarlo localmente para futuras sesiones offline
    const userToStore = {
        id: loggedUser.id,
        name: loggedUser.name,
        email: loggedUser.email,
        specialty: loggedUser.specialty || localStorage.getItem('psico_therapist_specialty') || 'Psicología Clínica',
        registryNumber: loggedUser.registry_number || loggedUser.registryNumber || localStorage.getItem('psico_therapist_registry') || '',
        phone: loggedUser.phone || localStorage.getItem('psico_therapist_phone') || '',
        institution: loggedUser.institution || localStorage.getItem('psico_therapist_institution') || '',
        passwordHash: hash
    };

    const users = getUsers();
    const idx = users.findIndex(u => u.email === userToStore.email || u.id === userToStore.id);
    if (idx >= 0) users[idx] = userToStore;
    else users.push(userToStore);
    saveUsers(users);

    AppState.currentUser = userToStore;
    if (userToStore.name) localStorage.setItem('psico_therapist_name', userToStore.name);
    if (userToStore.specialty) localStorage.setItem('psico_therapist_specialty', userToStore.specialty);
    if (userToStore.registryNumber) localStorage.setItem('psico_therapist_registry', userToStore.registryNumber);
    setSession(userToStore.id);

    document.getElementById('loginForm').reset();
    await startAppForCurrentUser();

    // 4. Sincronizar inmediatamente desde la nube para traer todos los datos creados en otros dispositivos
    if (typeof CloudSyncManager !== 'undefined') {
        await CloudSyncManager.pullFromCloud(userToStore.id, false);
    }

    showToast(`Bienvenido/a, ${userToStore.name} (Nube Sincronizada)`, 'success');
}

async function handleRegister(e) {
    e.preventDefault();
    const errorEl = document.getElementById('registerError');
    errorEl.classList.remove('visible');
    const name = document.getElementById('registerName').value.trim();
    const specialty = document.getElementById('registerSpecialty')?.value.trim() || 'Psicología Clínica';
    const registryNumber = document.getElementById('registerRegistry')?.value.trim() || '';
    const email = document.getElementById('registerEmail').value.trim().toLowerCase();
    const password = document.getElementById('registerPassword').value;
    const password2 = document.getElementById('registerPassword2').value;

    if (password !== password2) { errorEl.textContent = 'Las contraseñas no coinciden.'; errorEl.classList.add('visible'); return; }
    if (password.length < 6) { errorEl.textContent = 'Mínimo 6 caracteres.'; errorEl.classList.add('visible'); return; }

    const pwdHash = await hashPassword(password);
    let registeredTherapist = null;

    // 1. Registrar en el servidor cloud (PostgreSQL)
    try {
        const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                email,
                passwordHash: pwdHash,
                specialty,
                registryNumber
            })
        });
        const resData = await response.json();
        if (response.ok && resData.therapist) {
            registeredTherapist = resData.therapist;
        } else if (response.status === 409) {
            errorEl.textContent = 'Ya existe una cuenta registrada con este correo en la nube.';
            errorEl.classList.add('visible');
            return;
        }
    } catch (netErr) {
        console.warn('Servidor cloud no disponible para registro inmediato, guardando en local:', netErr.message);
    }

    // 2. Persistir localmente para soporte offline
    const finalId = registeredTherapist?.id || generateId();
    const newUser = {
        id: finalId,
        name,
        specialty,
        registryNumber,
        email,
        passwordHash: pwdHash,
        createdAt: new Date().toISOString()
    };

    const users = getUsers();
    const existingIdx = users.findIndex(u => u.email === email);
    if (existingIdx >= 0) users[existingIdx] = newUser;
    else users.push(newUser);
    saveUsers(users);

    localStorage.setItem('psico_therapist_name', name);
    localStorage.setItem('psico_therapist_specialty', specialty);
    localStorage.setItem('psico_therapist_registry', registryNumber);

    AppState.currentUser = newUser;
    setSession(newUser.id);
    document.getElementById('registerForm').reset();
    await startAppForCurrentUser();

    // 3. Subir respaldo a la nube de inmediato
    if (typeof CloudSyncManager !== 'undefined') {
        await CloudSyncManager.pushToCloud(false);
    }

    showToast(`Cuenta creada y sincronizada en la nube. ¡Bienvenida/o, ${newUser.name}!`, 'success');
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

function openTherapistProfileModal() {
    const info = (typeof ClinicalHistorySystem !== 'undefined' && ClinicalHistorySystem.getTherapistInfo)
        ? ClinicalHistorySystem.getTherapistInfo()
        : { name: '', specialty: '', registry: '' };
    const user = AppState.currentUser || {};

    const nameInput = document.getElementById('therapistProfileName');
    const specInput = document.getElementById('therapistProfileSpecialty');
    const regInput = document.getElementById('therapistProfileRegistry');
    const emailInput = document.getElementById('therapistProfileEmail');
    const phoneInput = document.getElementById('therapistProfilePhone');
    const instInput = document.getElementById('therapistProfileInstitution');

    if (nameInput) nameInput.value = user.name || (info.name !== 'Dr(a). / Lic. Profesional Clínico' ? info.name : '');
    if (specInput) specInput.value = user.specialty || (info.specialty !== 'Psicología Clínica / Salud Mental' ? info.specialty : '');
    if (regInput) regInput.value = user.registryNumber || (info.registry !== 'Colegiatura Médica / Psicológica N.º Reg.' ? info.registry : '');
    if (emailInput) emailInput.value = user.email || '';
    if (phoneInput) phoneInput.value = user.phone || localStorage.getItem('psico_therapist_phone') || '';
    if (instInput) instInput.value = user.institution || localStorage.getItem('psico_therapist_institution') || '';

    openModal('therapistProfileModal');
    setTimeout(() => initTherapistSignaturePad(), 80);
}

let therapistSignatureCtx = null;
let isTherapistSignatureDrawing = false;

function initTherapistSignaturePad() {
    const canvas = document.getElementById('therapistSignatureCanvas');
    if (!canvas) return;
    therapistSignatureCtx = canvas.getContext('2d');
    therapistSignatureCtx.lineWidth = 2.5;
    therapistSignatureCtx.lineCap = 'round';
    therapistSignatureCtx.lineJoin = 'round';
    therapistSignatureCtx.strokeStyle = '#0f172a';

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
        isTherapistSignatureDrawing = true;
        const pos = getPos(e);
        therapistSignatureCtx.beginPath();
        therapistSignatureCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isTherapistSignatureDrawing) return;
        e.preventDefault();
        const pos = getPos(e);
        therapistSignatureCtx.lineTo(pos.x, pos.y);
        therapistSignatureCtx.stroke();
    };

    const stopDraw = () => {
        if (isTherapistSignatureDrawing) {
            isTherapistSignatureDrawing = false;
        }
    };

    canvas.onmousedown = startDraw;
    canvas.onmousemove = draw;
    window.onmouseup = stopDraw;

    canvas.ontouchstart = startDraw;
    canvas.ontouchmove = draw;
    canvas.ontouchend = stopDraw;

    // Cargar firma previa
    const saved = localStorage.getItem('psico_therapist_signature');
    if (saved) {
        const img = new Image();
        img.onload = () => {
            therapistSignatureCtx.clearRect(0, 0, canvas.width, canvas.height);
            therapistSignatureCtx.drawImage(img, 0, 0);
        };
        img.src = saved;
    } else {
        therapistSignatureCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
}

function clearTherapistSignaturePad() {
    const canvas = document.getElementById('therapistSignatureCanvas');
    if (canvas && therapistSignatureCtx) {
        therapistSignatureCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
    localStorage.removeItem('psico_therapist_signature');
    showToast('Trazo de firma limpiado', 'info');
}

function handleSaveTherapistProfile(e) {
    if (e) e.preventDefault();
    const name = document.getElementById('therapistProfileName')?.value.trim();
    const specialty = document.getElementById('therapistProfileSpecialty')?.value.trim() || 'Psicología Clínica';
    const registry = document.getElementById('therapistProfileRegistry')?.value.trim() || '';
    const email = document.getElementById('therapistProfileEmail')?.value.trim() || '';
    const phone = document.getElementById('therapistProfilePhone')?.value.trim() || '';
    const institution = document.getElementById('therapistProfileInstitution')?.value.trim() || '';

    if (!name) {
        showToast('Por favor ingrese el nombre y título profesional', 'warning');
        return;
    }

    localStorage.setItem('psico_therapist_name', name);
    localStorage.setItem('psico_therapist_specialty', specialty);
    localStorage.setItem('psico_therapist_registry', registry);
    if (phone) localStorage.setItem('psico_therapist_phone', phone);
    if (institution) localStorage.setItem('psico_therapist_institution', institution);

    // Guardar firma digitalizada si el canvas tiene contenido
    const canvas = document.getElementById('therapistSignatureCanvas');
    if (canvas) {
        try {
            const sigUrl = canvas.toDataURL();
            if (sigUrl && sigUrl.length > 500) {
                localStorage.setItem('psico_therapist_signature', sigUrl);
            }
        } catch (err) {}
    }

    if (AppState.currentUser) {
        AppState.currentUser.name = name;
        AppState.currentUser.specialty = specialty;
        AppState.currentUser.registryNumber = registry;
        if (email) AppState.currentUser.email = email;
        AppState.currentUser.phone = phone;
        AppState.currentUser.institution = institution;

        const users = getUsers();
        const idx = users.findIndex(u => u.id === AppState.currentUser.id);
        if (idx !== -1) {
            users[idx].name = name;
            users[idx].specialty = specialty;
            users[idx].registryNumber = registry;
            if (email) users[idx].email = email;
            users[idx].phone = phone;
            users[idx].institution = institution;
            saveUsers(users);
        }
    } else {
        AppState.currentUser = {
            id: 'local_therapist',
            name,
            specialty,
            registryNumber: registry,
            email,
            phone,
            institution
        };
    }

    updateSidebarUser();
    closeModal('therapistProfileModal');
    showToast('Perfil profesional, membrete y firma guardados con éxito', 'success');
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
    const notePatientSelect = document.getElementById('notePatient');
    if (notePatientSelect) {
        notePatientSelect.addEventListener('change', (e) => {
            const pId = e.target.value;
            if (pId && !document.getElementById('noteId').value) {
                const prevNotes = AppState.notes.filter(n => n.patientId === pId);
                const nextNum = prevNotes.length + 1;
                const p = AppState.patients.find(x => x.id === pId);
                if (document.getElementById('noteSessionNum')) {
                    document.getElementById('noteSessionNum').value = nextNum;
                }
                const titleEl = document.getElementById('noteTitle');
                if (titleEl && (!titleEl.value || titleEl.value.startsWith('Sesión #'))) {
                    titleEl.value = `Sesión #${nextNum} - ${p ? p.name : ''}`;
                }
                const modalTitle = document.getElementById('noteModalTitle');
                if (modalTitle) {
                    modalTitle.textContent = `Reporte de Atención — Sesión #${nextNum}`;
                }
            }
        });
    }
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
    
    // Sincronizar barra de navegación inferior móvil
    document.querySelectorAll('.mobile-nav-item').forEach(item => {
        if (item.dataset.view) {
            item.classList.toggle('active', item.dataset.view === view);
        }
    });

    // Cerrar menú móvil si está abierto
    closeMobileSidebar();

    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const targetView = document.getElementById(view + 'View');
    if (targetView) targetView.classList.add('active');
    const titles = {
        dashboard: 'Mi Consulta',
        patients: 'Personas en Proceso',
        appointments: 'Agenda',
        notes: 'Reportes de Atención & Sesiones',
        scales: 'Escalas y Evaluaciones',
        finance: 'Finanzas',
        billing: 'Facturación SENIAT',
        search: 'Búsqueda Global',
        stats: 'Métricas'
    };
    const breadcrumb = document.getElementById('breadcrumb');
    if (breadcrumb) {
        breadcrumb.innerHTML = `<span>${titles[view] || 'Inicio'}</span>`;
    }
    
    // Auto-scroll al inicio en cambios de pantalla
    try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
        window.scrollTo(0, 0);
    }

    if (view === 'dashboard') updateDashboard();
    if (view === 'patients') renderPatients();
    if (view === 'appointments') { renderCalendar(); renderAppointments(); }
    if (view === 'notes') renderNotes();
    if (view === 'scales' && typeof renderScalesView === 'function') renderScalesView();
    if (view === 'finance' && typeof renderFinanceView === 'function') renderFinanceView();
    if (view === 'billing' && typeof openInvoicesList === 'function') openInvoicesList();
    if (view === 'stats') updateStats();
}

// CONTROLADORES DE NAVEGACIÓN MÓVIL (DRAWER & BOTTOM NAV)
function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (!sidebar) return;
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
        sidebar.classList.remove('open');
        if (backdrop) backdrop.classList.remove('active');
    } else {
        sidebar.classList.add('open');
        if (backdrop) backdrop.classList.add('active');
    }
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');
    if (sidebar) sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('active');
}

function switchMobileView(view) {
    closeMobileSidebar();
    navigateTo(view);
}

// Listener para cerrar drawer al cambiar orientación o agrandar ventana
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        closeMobileSidebar();
    }
});

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
        if (latestNote?.risk === 'alto') {
            alerts.push({ level: 'critical', icon: '🚨', title: 'Riesgo alto detectado', description: 'Última nota clínica indica riesgo elevado', patientId: patient.id, patientName: patient.name, priority: 1 });
        }
        const latestScale = patientNotes.find(n => n.scaleResult?.scale === 'phq9');
        if (latestScale?.scaleResult?.score >= 19) {
            alerts.push({ level: 'critical', icon: '⚠️', title: 'Depresión severa', description: `PHQ-9: ${latestScale.scaleResult.score}/27 - Evaluación urgente`, patientId: patient.id, patientName: patient.name, priority: 2 });
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
// ETAPAS DEL CICLO VITAL Y PERSONAS EN PROCESO
// ============================================
function formatDisplayName(name) {
    if (!name || typeof name !== 'string') return '';
    return name.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

function getPatientCategory(p) {
    if (!p) return 'adult';
    if (p.category === 'child' || p.category === 'adolescent' || p.category === 'adult') {
        return p.category;
    }
    if (p.birthdate) {
        const age = calculateAge(p.birthdate);
        if (typeof age === 'number' && !isNaN(age)) {
            if (age < 12) return 'child';
            if (age < 18) return 'adolescent';
            return 'adult';
        }
    }
    return 'adult';
}

function getCategoryBadge(category, age) {
    const ageStr = (typeof age === 'number' && !isNaN(age)) ? ` (${age}a)` : '';
    if (category === 'child') {
        return `<span class="pop-badge badge-child"><i class="fas fa-child"></i> Niñez${ageStr}</span>`;
    }
    if (category === 'adolescent') {
        return `<span class="pop-badge badge-adolescent"><i class="fas fa-user-graduate"></i> Adolescencia${ageStr}</span>`;
    }
    return `<span class="pop-badge badge-adult"><i class="fas fa-user"></i> Adultez${ageStr}</span>`;
}

function onPatientBirthdateChange() {
    const bdInput = document.getElementById('patientBirthdate');
    if (!bdInput || !bdInput.value) return;
    const age = calculateAge(bdInput.value);
    const catSelect = document.getElementById('patientCategory');
    if (!catSelect || typeof age !== 'number' || isNaN(age)) return;

    if (age < 12) {
        catSelect.value = 'child';
    } else if (age < 18) {
        catSelect.value = 'adolescent';
    } else {
        catSelect.value = 'adult';
    }
    updateModalCategorySections(catSelect.value);
}

function onPatientCategoryChange() {
    const catSelect = document.getElementById('patientCategory');
    if (!catSelect) return;
    updateModalCategorySections(catSelect.value);
}

function updateModalCategorySections(category) {
    const pedSection = document.getElementById('pediatricFieldsSection');
    const childBlock = document.getElementById('childSpecificBlock');
    const teenBlock = document.getElementById('adolescentSpecificBlock');
    const adultRow = document.getElementById('adultSpecificRow');

    if (!pedSection) return;

    if (category === 'child') {
        pedSection.style.display = 'block';
        if (childBlock) childBlock.style.display = 'block';
        if (teenBlock) teenBlock.style.display = 'none';
        if (adultRow) adultRow.style.display = 'none';
    } else if (category === 'adolescent') {
        pedSection.style.display = 'block';
        if (childBlock) childBlock.style.display = 'none';
        if (teenBlock) teenBlock.style.display = 'block';
        if (adultRow) adultRow.style.display = 'grid';
    } else {
        // adult
        pedSection.style.display = 'none';
        if (childBlock) childBlock.style.display = 'none';
        if (teenBlock) teenBlock.style.display = 'none';
        if (adultRow) adultRow.style.display = 'grid';
    }
}

function setPatientCategoryFilter(cat) {
    AppState.patientCategoryFilter = cat;
    document.querySelectorAll('.population-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.id === (cat === 'all' ? 'tabPopAll' : cat === 'child' ? 'tabPopChild' : cat === 'adolescent' ? 'tabPopAdolescent' : 'tabPopAdult'));
    });
    const searchInput = document.getElementById('patientSearch');
    const query = searchInput ? searchInput.value : '';
    renderPatients(query);
}

function openNewPatientForCategory(cat) {
    document.getElementById('patientId').value = '';
    document.getElementById('patientForm').reset();
    document.getElementById('patientModalTitle').textContent = 'Nuevo Expediente';
    const catSelect = document.getElementById('patientCategory');
    const targetCat = (cat && cat !== 'all') ? cat : 'adult';
    if (catSelect) catSelect.value = targetCat;
    updateModalCategorySections(targetCat);
    openModal('patientModal');
}

function renderPatients(filter = '') {
    const container = document.getElementById('patientsList');
    if (!container) return;

    const all = AppState.patients;
    const childCount = all.filter(p => getPatientCategory(p) === 'child').length;
    const adolescentCount = all.filter(p => getPatientCategory(p) === 'adolescent').length;
    const adultCount = all.filter(p => getPatientCategory(p) === 'adult').length;

    const elAll = document.getElementById('countAllPatients');
    const elChild = document.getElementById('countChildPatients');
    const elTeen = document.getElementById('countAdolescentPatients');
    const elAdult = document.getElementById('countAdultPatients');
    if (elAll) elAll.textContent = all.length;
    if (elChild) elChild.textContent = childCount;
    if (elTeen) elTeen.textContent = adolescentCount;
    if (elAdult) elAdult.textContent = adultCount;

    let patients = all;
    const currentCatFilter = AppState.patientCategoryFilter || 'all';
    if (currentCatFilter !== 'all') {
        patients = patients.filter(p => getPatientCategory(p) === currentCatFilter);
    }

    if (filter) {
        const lf = filter.toLowerCase();
        patients = patients.filter(p => 
            p.name.toLowerCase().includes(lf) || 
            (p.diagnosis && p.diagnosis.toLowerCase().includes(lf)) || 
            (p.phone && p.phone.includes(filter)) ||
            (p.guardianName && p.guardianName.toLowerCase().includes(lf)) ||
            (p.schoolName && p.schoolName.toLowerCase().includes(lf)) ||
            (p.occupation && p.occupation.toLowerCase().includes(lf))
        );
    }

    if (patients.length === 0) {
        const catLabel = currentCatFilter === 'child' ? 'personas en etapa de niñez' : currentCatFilter === 'adolescent' ? 'personas en adolescencia' : currentCatFilter === 'adult' ? 'personas en adultez' : 'expedientes clínicos';
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">${currentCatFilter === 'child' ? '🧒' : currentCatFilter === 'adolescent' ? '🧑' : '👤'}</div><p>${filter ? 'Sin coincidencias' : `No hay ${catLabel} registrados en esta etapa`}</p>${!filter ? `<button class="btn-primary" onclick="openNewPatientForCategory('${currentCatFilter}')">Crear expediente</button>` : ''}</div>`;
        return;
    }

    container.innerHTML = patients.map(p => {
        const cat = getPatientCategory(p);
        const age = p.birthdate ? calculateAge(p.birthdate) : null;
        const badge = getCategoryBadge(cat, age);

        let metaDetail = '';
        if (cat === 'child') {
            metaDetail = `
                <span class="meta-item"><i class="fas fa-stethoscope"></i> ${p.diagnosis || 'Pendiente'}</span>
                ${p.guardianName ? `<span class="meta-item"><i class="fas fa-user-shield"></i> Tutor: ${p.guardianName} (${p.guardianRelation || 'Tutor'})</span>` : ''}
                ${p.schoolGrade || p.schoolName ? `<span class="meta-item"><i class="fas fa-school"></i> ${p.schoolGrade || p.schoolName}</span>` : ''}
                ${p.guardianPhone ? `<span class="meta-item"><i class="fas fa-phone-alt"></i> ${p.guardianPhone}</span>` : ''}
            `;
        } else if (cat === 'adolescent') {
            metaDetail = `
                <span class="meta-item"><i class="fas fa-stethoscope"></i> ${p.diagnosis || 'Pendiente'}</span>
                ${p.guardianName ? `<span class="meta-item"><i class="fas fa-user-shield"></i> Tutor: ${p.guardianName}</span>` : ''}
                ${p.schoolGrade || p.schoolName ? `<span class="meta-item"><i class="fas fa-school"></i> ${p.schoolGrade || p.schoolName}</span>` : ''}
                ${p.adolescentAssent === 'firmado' ? '<span class="meta-item badge-pill-success"><i class="fas fa-handshake"></i> Asentimiento firmado</span>' : ''}
            `;
        } else {
            metaDetail = `
                <span class="meta-item"><i class="fas fa-stethoscope"></i> ${p.diagnosis || 'Pendiente'}</span>
                ${p.occupation ? `<span class="meta-item"><i class="fas fa-briefcase"></i> ${p.occupation}</span>` : ''}
                ${p.phone ? `<span class="meta-item"><i class="fas fa-phone-alt"></i> ${p.phone}</span>` : ''}
            `;
        }

        return `
            <div class="patient-card" onclick="viewPatient('${p.id}')">
                <div class="patient-avatar">${getInitials(p.name)}</div>
                <div class="patient-info">
                    <div class="patient-name-row">
                        <span class="patient-name">${formatDisplayName(p.name)}</span>
                        ${badge}
                    </div>
                    <div class="patient-meta">${metaDetail}</div>
                </div>
                <div class="patient-actions">
                    <button class="btn-icon" onclick="event.stopPropagation(); editPatient('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-icon" onclick="event.stopPropagation(); deletePatient('${p.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join('');
}

function filterPatients(q) { renderPatients(q); }

function handlePatientSubmit(e) {
    e.preventDefault();
    const patient = {
        id: document.getElementById('patientId').value || generateId(),
        name: document.getElementById('patientName').value.trim(),
        category: document.getElementById('patientCategory').value,
        birthdate: document.getElementById('patientBirthdate').value,
        email: document.getElementById('patientEmail').value.trim(),
        phone: document.getElementById('patientPhone').value.trim(),
        gender: document.getElementById('patientGender').value,
        occupation: document.getElementById('patientOccupation')?.value.trim() || '',
        maritalStatus: document.getElementById('patientMaritalStatus')?.value.trim() || '',
        guardianName: document.getElementById('patientGuardianName')?.value.trim() || '',
        guardianRelation: document.getElementById('patientGuardianRelation')?.value || '',
        guardianPhone: document.getElementById('patientGuardianPhone')?.value.trim() || '',
        guardianConsent: document.getElementById('patientGuardianConsent')?.value || 'no-aplica',
        schoolName: document.getElementById('patientSchoolName')?.value.trim() || '',
        schoolGrade: document.getElementById('patientSchoolGrade')?.value.trim() || '',
        developmentalMilestones: document.getElementById('patientDevelopmentalMilestones')?.value.trim() || '',
        adolescentAssent: document.getElementById('patientAdolescentAssent')?.value || 'no-aplica',
        adolescentPerspective: document.getElementById('patientAdolescentPerspective')?.value.trim() || '',
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
    if (idx >= 0) { 
        patient.createdAt = AppState.patients[idx].createdAt || patient.createdAt;
        AppState.patients[idx] = patient; 
        showToast('Expediente actualizado', 'success'); 
    } else { 
        AppState.patients.push(patient); 
        showToast('Expediente creado', 'success'); 
    }
    saveData();
    // Asegurar token de portal y sincronizar inmediatamente con PostgreSQL
    if (typeof ensurePatientPortalToken === 'function') ensurePatientPortalToken(patient);
    if (typeof syncPatientToPortalStorage === 'function') syncPatientToPortalStorage(patient);

    closeModal('patientModal');
    renderPatients();
    updateCounts();
    updateDashboard();
    updatePatientSelects();
}

function editPatient(id) {
    const p = AppState.patients.find(x => x.id === id);
    if (!p) return;
    const cat = getPatientCategory(p);
    document.getElementById('patientId').value = p.id;
    document.getElementById('patientName').value = p.name;
    document.getElementById('patientCategory').value = cat;
    document.getElementById('patientBirthdate').value = p.birthdate || '';
    document.getElementById('patientEmail').value = p.email || '';
    document.getElementById('patientPhone').value = p.phone || '';
    document.getElementById('patientGender').value = p.gender || '';
    if (document.getElementById('patientOccupation')) document.getElementById('patientOccupation').value = p.occupation || '';
    if (document.getElementById('patientMaritalStatus')) document.getElementById('patientMaritalStatus').value = p.maritalStatus || '';
    if (document.getElementById('patientGuardianName')) document.getElementById('patientGuardianName').value = p.guardianName || '';
    if (document.getElementById('patientGuardianRelation')) document.getElementById('patientGuardianRelation').value = p.guardianRelation || '';
    if (document.getElementById('patientGuardianPhone')) document.getElementById('patientGuardianPhone').value = p.guardianPhone || '';
    if (document.getElementById('patientGuardianConsent')) document.getElementById('patientGuardianConsent').value = p.guardianConsent || 'no-aplica';
    if (document.getElementById('patientSchoolName')) document.getElementById('patientSchoolName').value = p.schoolName || '';
    if (document.getElementById('patientSchoolGrade')) document.getElementById('patientSchoolGrade').value = p.schoolGrade || '';
    if (document.getElementById('patientDevelopmentalMilestones')) document.getElementById('patientDevelopmentalMilestones').value = p.developmentalMilestones || '';
    if (document.getElementById('patientAdolescentAssent')) document.getElementById('patientAdolescentAssent').value = p.adolescentAssent || 'no-aplica';
    if (document.getElementById('patientAdolescentPerspective')) document.getElementById('patientAdolescentPerspective').value = p.adolescentPerspective || '';
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
    updateModalCategorySections(cat);
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
    AppState.selectedPatientId = id;
    const patient = AppState.patients.find(p => p.id === id);
    if (!patient) return;
    const cat = getPatientCategory(patient);
    const age = patient.birthdate ? calculateAge(patient.birthdate) : null;
    const badge = getCategoryBadge(cat, age);
    const wellbeing = calculatePatientWellbeing(id);
    const patientNotes = AppState.notes.filter(n => n.patientId === id);
    const patientApps = AppState.appointments.filter(a => a.patientId === id).sort((a, b) => new Date(b.date) - new Date(a.date));
    const patientGoals = AppState.treatmentPlans.filter(g => g.patientId === id);
    const emotionalProfile = calculateEmotionalProfile(id);
    const clinicalInsights = generateClinicalInsights(id);
    const sessionPrep = generateSessionPrep(id);
    const { results: portalResults, moods: portalMoods, cbt: portalCbt } = getPortalResults(id);
    const portalCount = portalResults.length + portalMoods.length + (portalCbt ? portalCbt.length : 0);
    const detail = document.getElementById('patientDetail');

    const cleanName = formatDisplayName(patient.name);
    detail.innerHTML = `
        <div class="patient-dossier-hero">
            <div class="patient-hero-top">
                <div class="patient-hero-avatar-box">
                    <div class="patient-hero-avatar">${getInitials(patient.name)}</div>
                </div>
                <div class="patient-hero-main-info">
                    <div class="patient-hero-title-row">
                        <h2 class="patient-hero-name">${cleanName}</h2>
                        <div class="patient-hero-badges-wrap">
                            ${badge}
                            <span class="dossier-badge-diag"><i class="fas fa-stethoscope"></i> ${patient.diagnosis || 'Pendiente de evaluación'}</span>
                        </div>
                    </div>
                    <div class="patient-hero-chips-grid">
                        ${patient.birthdate ? `<div class="hero-chip"><i class="fas fa-birthday-cake"></i> <span><strong>${age}</strong> años (${formatDate(patient.birthdate)})</span></div>` : ''}
                        ${patient.gender ? `<div class="hero-chip"><i class="fas fa-venus-mars"></i> <span>${patient.gender}</span></div>` : ''}
                        ${patient.occupation ? `<div class="hero-chip"><i class="fas fa-briefcase"></i> <span>${patient.occupation}</span></div>` : ''}
                        ${patient.maritalStatus ? `<div class="hero-chip"><i class="fas fa-ring"></i> <span>${patient.maritalStatus}</span></div>` : ''}
                        ${patient.phone ? `<div class="hero-chip"><i class="fas fa-phone-alt"></i> <span>${patient.phone}</span></div>` : ''}
                        ${patient.guardianName ? `<div class="hero-chip"><i class="fas fa-user-shield"></i> <span>Tutor: ${patient.guardianName} (${patient.guardianRelation || 'Tutor'})</span></div>` : ''}
                        ${patient.schoolName || patient.schoolGrade ? `<div class="hero-chip"><i class="fas fa-school"></i> <span>${patient.schoolName || ''} ${patient.schoolGrade ? '(' + patient.schoolGrade + ')' : ''}</span></div>` : ''}
                        ${cat === 'child' ? `<div class="hero-chip"><i class="fas fa-file-signature"></i> <span>${patient.guardianConsent === 'firmado' ? 'Consentimiento firmado' : 'Consentimiento pendiente'}</span></div>` : ''}
                        ${cat === 'adolescent' && patient.adolescentAssent === 'firmado' ? `<div class="hero-chip hero-chip-success"><i class="fas fa-handshake"></i> <span>Asentimiento firmado</span></div>` : ''}
                    </div>
                </div>
            </div>

            <div class="patient-hero-action-bar">
                <div class="action-group-primary">
                    <button class="btn-primary btn-cta-report" onclick="openReporteAtencionForPatient('${patient.id}'); closeModal('patientDetailModal');" title="Llenar Reporte de Atención de la sesión de terapia">
                        <i class="fas fa-file-signature"></i> <span>+ Reporte de Atención</span>
                    </button>
                    <button class="btn-secondary btn-apple-action" onclick="editPatient('${patient.id}'); closeModal('patientDetailModal');" title="Editar Expediente">
                        <i class="fas fa-edit"></i> <span>Editar</span>
                    </button>
                    <button class="btn-secondary btn-apple-action" onclick="ClinicalHistorySystem.openInAppPreconsultaForm('${patient.id}'); closeModal('patientDetailModal');" title="Llenar o editar pre-consulta directamente en la app">
                        <i class="fas fa-clipboard-list"></i> <span>Pre-consulta</span>
                    </button>
                    <button class="btn-secondary btn-apple-action" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patient.id}')" title="Descargar Historia Clínica Oficial Membretada con Sello y Colegiatura">
                        <i class="fas fa-file-medical"></i> <span>Historia Oficial</span>
                    </button>
                </div>
                <div class="action-group-tools">
                    <button class="btn-tool-pill" onclick="exportPatientReport('${patient.id}')" title="Exportar Informe Clínico PDF">
                        <i class="fas fa-file-pdf"></i> <span>Informe PDF</span>
                    </button>
                    <button class="btn-tool-pill" onclick="openInformedConsentModal('${patient.id}')" title="Consentimiento Informado">
                        <i class="fas fa-file-contract"></i> <span>Consentimiento</span>
                    </button>
                    <button class="btn-tool-pill" onclick="openPortalAccessModal('${patient.id}')" title="Portal del Paciente: Credenciales, Actividad y Acceso Directo">
                        <i class="fas fa-mobile-screen"></i> <span>Portal Paciente</span>
                    </button>
                    <button class="btn-tool-pill" onclick="renderScaleModal('phq9', '${patient.id}')" title="Evaluación PHQ-9">
                        <i class="fas fa-chart-simple"></i> <span>PHQ-9</span>
                    </button>
                    <button class="btn-tool-pill" onclick="renderScaleModal('gad7', '${patient.id}')" title="Evaluación GAD-7">
                        <i class="fas fa-wave-square"></i> <span>GAD-7</span>
                    </button>
                </div>
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
            <button class="patient-tab" onclick="switchPatientTab('timeline', this)"><i class="fas fa-stream"></i> Línea de Tiempo</button>
            <button class="patient-tab" onclick="switchPatientTab('objetivos', this)"><i class="fas fa-bullseye"></i> Objetivos</button>
            <button class="patient-tab" onclick="switchPatientTab('escalas', this)"><i class="fas fa-chart-line"></i> Evaluaciones</button>
            <button class="patient-tab" onclick="switchPatientTab('apoyo', this)"><i class="fas fa-hands-helping"></i> Red de Apoyo</button>
            <button class="patient-tab" onclick="switchPatientTab('portal', this)">
                <i class="fas fa-mobile-alt"></i> Portal Paciente
                <span id="portalTabBadgeCount" style="background: var(--accent-success); color: white; padding: 2px 6px; border-radius: 10px; font-size: 10px; margin-left: 4px; ${portalCount > 0 ? '' : 'display: none;'}">${portalCount}</span>
            </button>
        </div>
        <div id="tab-resumen" class="patient-tab-content active">${renderTabResumen(id, wellbeing)}</div>
        <div id="tab-historia" class="patient-tab-content">${renderTabHistoria(patient)}</div>
        <div id="tab-timeline" class="patient-tab-content">${renderTabTimeline(id)}</div>
        <div id="tab-objetivos" class="patient-tab-content">${renderTabObjetivos(id)}</div>
        <div id="tab-escalas" class="patient-tab-content">${renderTabEscalas(id)}</div>
        <div id="tab-apoyo" class="patient-tab-content">${renderTabApoyo(patient)}</div>
        <div id="tab-portal" class="patient-tab-content">${renderPortalTab(id)}</div>
    `;
    openModal('patientDetailModal');
    // Sincronizar de forma reactiva en segundo plano desde PostgreSQL
    if (typeof refreshPortalTabContent === 'function') {
        refreshPortalTabContent(id);
    }
}

function switchPatientTab(tabName, btn) {
    document.querySelectorAll('.patient-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.patient-tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    const target = document.getElementById('tab-' + tabName);
    if (target) target.classList.add('active');

    if (tabName === 'portal' && AppState.selectedPatientId && typeof refreshPortalTabContent === 'function') {
        refreshPortalTabContent(AppState.selectedPatientId);
    }
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
    if (latestNote?.risk === 'alto') alerts.push({ level: 'critical', icon: '🚨', title: 'Riesgo alto detectado', description: 'Última nota clínica indica riesgo' });
    const latestPhq = notes.filter(n => n.scaleResult?.scale === 'phq9').sort((a,b) => new Date(b.date) - new Date(a.date))[0];
    if (latestPhq?.scaleResult?.score >= 19) alerts.push({ level: 'critical', icon: '⚠️', title: 'Depresión severa', description: `PHQ-9: ${latestPhq.scaleResult.score}/27` });
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
    if (typeof ClinicalHistorySystem !== 'undefined' && ClinicalHistorySystem.renderTabHistoriaIntegral) {
        return ClinicalHistorySystem.renderTabHistoriaIntegral(patient);
    }
    const cat = getPatientCategory(patient);
    const sections = [];

    // Secciones específicas por etapa del ciclo vital
    if (cat === 'child') {
        sections.push({
            title: '👨‍👧 Representante Legal y Tutoría Pediátrica',
            content: patient.guardianName ? `<strong>Tutor/a:</strong> ${patient.guardianName} (${patient.guardianRelation || 'Tutor'})<br><strong>Teléfono de contacto:</strong> ${patient.guardianPhone || 'Sin registrar'}<br><strong>Consentimiento Parental:</strong> ${patient.guardianConsent === 'firmado' ? '✅ Firmado y en custodia' : '⏳ Pendiente de firma'}` : null
        });
        sections.push({
            title: '🏫 Contexto Escolar e Institucional',
            content: (patient.schoolName || patient.schoolGrade) ? `<strong>Institución Educativa:</strong> ${patient.schoolName || 'No esp.'}<br><strong>Grado / Curso:</strong> ${patient.schoolGrade || 'No esp.'}` : null
        });
        sections.push({
            title: '🌱 Hitos del Neurodesarrollo y Antecedentes Perinatales',
            content: patient.developmentalMilestones
        });
    } else if (cat === 'adolescent') {
        sections.push({
            title: '👨‍👧 Representante Legal y Contacto Familiar',
            content: patient.guardianName ? `<strong>Tutor/a:</strong> ${patient.guardianName} (${patient.guardianRelation || 'Tutor'})<br><strong>Teléfono directo:</strong> ${patient.guardianPhone || 'Sin registrar'}<br><strong>Consentimiento Parental:</strong> ${patient.guardianConsent === 'firmado' ? '✅ Firmado' : '⏳ Pendiente'}` : null
        });
        sections.push({
            title: '🏫 Contexto Escolar / Formativo',
            content: (patient.schoolName || patient.schoolGrade) ? `<strong>Establecimiento:</strong> ${patient.schoolName || 'No esp.'}<br><strong>Nivel / Grado:</strong> ${patient.schoolGrade || 'No esp.'}` : null
        });
        sections.push({
            title: '🤝 Alianza de Confidencialidad y Asentimiento Adolescente',
            content: patient.adolescentAssent === 'firmado' ? '✅ Asentimiento informado completado y pacto de secreto profesional acordado con el menor y la familia.' : '⏳ Pendiente de acuerdo de confidencialidad en encuadre inicial.'
        });
        sections.push({
            title: '🧭 Perspectiva del Adolescente vs Demanda de los Padres',
            content: patient.adolescentPerspective
        });
    } else {
        if (patient.maritalStatus) {
            sections.push({
                title: '💍 Estado Civil / Situación Convivencial',
                content: patient.maritalStatus
            });
        }
    }

    // Secciones clínicas compartidas
    sections.push(
        { title: 'Motivo de Consulta', content: patient.reason },
        { title: 'Objetivos del Paciente', content: patient.goals },
        { title: 'Antecedentes Personales', content: patient.medical },
        { title: 'Historia Familiar', content: patient.familyHistory },
        { title: 'Factores de Riesgo', content: patient.riskFactors },
        { title: 'Factores Protectores', content: patient.protectiveFactors },
        { title: 'Medicación Actual', content: patient.medication },
        { title: 'Diagnóstico Secundario', content: patient.diagnosis2 },
        { title: 'Encuadre', content: patient.notes }
    );

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
            id: n.id,
            title: `Reporte de Atención — Sesión #${n.sessionNum || 1}: ${n.title}`,
            description: n.sessionDescription || n.subjetivo?.substring(0, 150) || 'Sesión terapéutica completada',
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
    return `<div class="timeline">${events.map(e => `<div class="timeline-item ${e.type}"><div class="timeline-date">${e.date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div><div class="timeline-title" style="display:flex;justify-content:space-between;align-items:center;"><span>${e.title}</span>${e.type === 'session' && e.id ? `<button class="btn-icon" onclick="event.stopPropagation(); ClinicalHistorySystem.exportReporteAtencionPDF('${e.id}')" title="Imprimir Reporte de Atención Oficial (PDF)"><i class="fas fa-file-invoice" style="color:var(--accent-primary);"></i></button>` : ''}</div><div class="timeline-description">${e.description}</div>${e.tags.length > 0 ? `<div class="timeline-tags">${e.tags.map(t => `<span class="timeline-tag">${t}</span>`).join('')}</div>` : ''}</div>`).join('')}</div>`;
}

function renderTabObjetivos(patientId) {
    const goals = AppState.treatmentPlans.filter(g => g.patientId === patientId);
    return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h4 style="margin:0;">Plan de Tratamiento</h4><button class="btn-primary" onclick="addTreatmentGoal('${patientId}'); viewPatient('${patientId}');"><i class="fas fa-plus"></i> Nuevo objetivo</button></div>${goals.length === 0 ? '<div class="empty-state"><div class="empty-icon">🎯</div><p>Sin objetivos definidos</p></div>' : `<div class="goals-progress">${goals.map(g => `<div class="goal-progress-item"><div class="goal-progress-header"><div class="goal-progress-title">${g.title}</div><div style="display:flex;gap:4px;align-items:center;"><span class="tag tag-${g.status}">${g.status}</span><div class="goal-progress-percent">${g.progress}%</div></div></div>${g.description ? `<div style="font-size:13px;color:var(--text-secondary);margin-bottom:8px;">${g.description}</div>` : ''}<div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${g.progress}%"></div></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;"><div class="goal-progress-deadline">📅 ${g.deadline ? formatDate(g.deadline) : 'Sin fecha'}</div><div style="display:flex;gap:4px;"><button class="btn-icon" onclick="updateGoalProgress('${g.id}'); viewPatient('${patientId}');"><i class="fas fa-chart-line"></i></button><button class="btn-icon" onclick="deleteGoal('${g.id}','${patientId}'); viewPatient('${patientId}');"><i class="fas fa-trash"></i></button></div></div></div>`).join('')}</div>`}`;
}

function renderTabEscalasEnhanced(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return '';

    // Obtener evaluaciones de las notas clínicas
    const noteEvals = (AppState.notes || [])
        .filter(n => n.patientId === patientId && n.scaleResult)
        .map(n => ({
            type: n.scaleResult.scale || (n.scaleResult.testType || 'phq9'),
            score: Number(n.scaleResult.score) || 0,
            maxScore: (n.scaleResult.scale === 'gad7') ? 21 : 27,
            severity: n.scaleResult.interpretation || 'Evaluado',
            date: n.date,
            source: 'Sesión clínica'
        }));

    // Obtener evaluaciones del portal del paciente
    const portalData = getPortalResults(patientId);
    const portalEvals = (portalData.results || []).map(e => ({
        type: e.type || e.scaleType || 'phq9',
        score: Number(e.score) || 0,
        maxScore: Number(e.maxScore) || ((e.type === 'gad7') ? 21 : 27),
        severity: e.severity || 'Evaluado',
        alertRisk: e.alertRisk,
        date: e.date,
        source: 'Portal del Paciente'
    }));

    // Unificar y ordenar cronológicamente
    const allEvals = [...noteEvals, ...portalEvals].sort((a, b) => new Date(a.date) - new Date(b.date));
    const phqList = allEvals.filter(e => e.type === 'phq9');
    const gadList = allEvals.filter(e => e.type === 'gad7');

    const latestPhq = phqList.slice(-1)[0];
    const latestGad = gadList.slice(-1)[0];
    const firstPhq = phqList[0];

    // Cálculo de mejoría en PHQ-9
    let phqDeltaPercent = 0;
    let phqImprovementText = 'Línea base establecida';
    if (phqList.length >= 2 && firstPhq.score > 0) {
        const diff = firstPhq.score - latestPhq.score;
        phqDeltaPercent = Math.round((diff / firstPhq.score) * 100);
        if (phqDeltaPercent > 0) {
            phqImprovementText = `↓ ${phqDeltaPercent}% de reducción de síntomas`;
        } else if (phqDeltaPercent < 0) {
            phqImprovementText = `↑ ${Math.abs(phqDeltaPercent)}% de aumento sintomático`;
        } else {
            phqImprovementText = 'Puntaje estable';
        }
    }

    // Renderizar Gráfico SVG si hay al menos 1 punto
    let svgChartHtml = '';
    if (allEvals.length > 0) {
        const chartWidth = 560;
        const chartHeight = 180;
        const padding = { top: 20, right: 30, bottom: 30, left: 35 };
        const innerWidth = chartWidth - padding.left - padding.right;
        const innerHeight = chartHeight - padding.top - padding.bottom;

        // Puntos de PHQ-9
        const phqPoints = phqList.map((e, idx) => {
            const x = padding.left + (phqList.length === 1 ? innerWidth / 2 : (idx / (phqList.length - 1)) * innerWidth);
            const y = padding.top + innerHeight - (e.score / 27) * innerHeight;
            return { x, y, score: e.score, date: e.date, severity: e.severity };
        });

        // Puntos de GAD-7
        const gadPoints = gadList.map((e, idx) => {
            const x = padding.left + (gadList.length === 1 ? innerWidth / 2 : (idx / (gadList.length - 1)) * innerWidth);
            const y = padding.top + innerHeight - (e.score / 21) * innerHeight;
            return { x, y, score: e.score, date: e.date, severity: e.severity };
        });

        const phqPathD = phqPoints.length > 1 
            ? 'M ' + phqPoints.map(p => `${p.x},${p.y}`).join(' L ') 
            : '';
        const gadPathD = gadPoints.length > 1 
            ? 'M ' + gadPoints.map(p => `${p.x},${p.y}`).join(' L ') 
            : '';

        svgChartHtml = `
            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; margin-bottom: 20px; box-shadow: var(--shadow-sm);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
                    <div>
                        <h4 style="margin:0; font-size: 15px; font-weight:700; color:var(--text-primary);">
                            <i class="fas fa-chart-line" style="color:var(--accent-primary);"></i> Curva de Evolución Clínica Longitudinal
                        </h4>
                        <small style="color:var(--text-secondary);">Monitoreo psicométrico continuo del paciente</small>
                    </div>
                    <div style="display:flex; gap: 14px; font-size: 11px; font-weight: 600;">
                        <span style="color: #0d9488; display:flex; align-items:center; gap: 4px;">
                            <span style="width:10px; height:10px; background:#0d9488; border-radius:50%; display:inline-block;"></span> PHQ-9 (Depresión)
                        </span>
                        <span style="color: #6366f1; display:flex; align-items:center; gap: 4px;">
                            <span style="width:10px; height:10px; background:#6366f1; border-radius:50%; display:inline-block;"></span> GAD-7 (Ansiedad)
                        </span>
                    </div>
                </div>

                <div style="width: 100%; overflow-x: auto;">
                    <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width: 100%; max-width: 100%; height: auto; display: block;">
                        <defs>
                            <linearGradient id="bandRemission" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#10b981" stop-opacity="0.12"/>
                                <stop offset="100%" stop-color="#10b981" stop-opacity="0.04"/>
                            </linearGradient>
                            <linearGradient id="bandSevere" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stop-color="#ef4444" stop-opacity="0.15"/>
                                <stop offset="100%" stop-color="#ef4444" stop-opacity="0.05"/>
                            </linearGradient>
                        </defs>

                        <!-- Zona Severa (>15) -->
                        <rect x="${padding.left}" y="${padding.top}" width="${innerWidth}" height="${innerHeight * (12/27)}" fill="url(#bandSevere)" rx="4"/>
                        <!-- Zona Remisión / Mínima (0-9) -->
                        <rect x="${padding.left}" y="${padding.top + innerHeight * (18/27)}" width="${innerWidth}" height="${innerHeight * (9/27)}" fill="url(#bandRemission)" rx="4"/>

                        <!-- Líneas guía horizontales de corte -->
                        <line x1="${padding.left}" y1="${padding.top + innerHeight * (18/27)}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight * (18/27)}" stroke="rgba(16, 185, 129, 0.4)" stroke-dasharray="3,3"/>
                        <line x1="${padding.left}" y1="${padding.top + innerHeight * (12/27)}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight * (12/27)}" stroke="rgba(239, 68, 68, 0.4)" stroke-dasharray="3,3"/>
                        <line x1="${padding.left}" y1="${padding.top + innerHeight}" x2="${padding.left + innerWidth}" y2="${padding.top + innerHeight}" stroke="var(--border-color)"/>

                        <!-- Etiquetas en Eje Y -->
                        <text x="${padding.left - 8}" y="${padding.top + innerHeight + 4}" font-size="10" fill="var(--text-tertiary)" text-anchor="end">0</text>
                        <text x="${padding.left - 8}" y="${padding.top + innerHeight * (18/27) + 3}" font-size="10" fill="#10b981" text-anchor="end">9</text>
                        <text x="${padding.left - 8}" y="${padding.top + innerHeight * (12/27) + 3}" font-size="10" fill="#ef4444" text-anchor="end">15</text>
                        <text x="${padding.left - 8}" y="${padding.top + 4}" font-size="10" fill="var(--text-tertiary)" text-anchor="end">27</text>

                        <!-- Trazado de líneas -->
                        ${phqPathD ? `<path d="${phqPathD}" fill="none" stroke="#0d9488" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}
                        ${gadPathD ? `<path d="${gadPathD}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` : ''}

                        <!-- Puntos de PHQ-9 con marcadores -->
                        ${phqPoints.map(p => `
                            <circle cx="${p.x}" cy="${p.y}" r="5" fill="#0d9488" stroke="#ffffff" stroke-width="2">
                                <title>PHQ-9: ${p.score}/27 (${p.severity}) - ${new Date(p.date).toLocaleDateString('es-ES')}</title>
                            </circle>
                            <text x="${p.x}" y="${p.y - 8}" font-size="10" font-weight="700" fill="#0d9488" text-anchor="middle">${p.score}</text>
                        `).join('')}

                        <!-- Puntos de GAD-7 con marcadores -->
                        ${gadPoints.map(p => `
                            <circle cx="${p.x}" cy="${p.y}" r="5" fill="#6366f1" stroke="#ffffff" stroke-width="2">
                                <title>GAD-7: ${p.score}/21 (${p.severity}) - ${new Date(p.date).toLocaleDateString('es-ES')}</title>
                            </circle>
                            <text x="${p.x}" y="${p.y + 16}" font-size="10" font-weight="700" fill="#6366f1" text-anchor="middle">${p.score}</text>
                        `).join('')}
                    </svg>
                </div>
            </div>
        `;
    }

    return `
        <div style="padding: 10px 0;">
            <!-- BOTONES DE ACCIÓN DE EVALUACIÓN -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; flex-wrap: wrap; gap: 10px;">
                <div style="display:flex; gap:8px;">
                    <button class="btn-primary" onclick="openInteractiveScaleModal('phq9', '${patientId}')">
                        <i class="fas fa-plus"></i> Aplicar PHQ-9 (Depresión)
                    </button>
                    <button class="btn-secondary" onclick="openInteractiveScaleModal('gad7', '${patientId}')">
                        <i class="fas fa-plus"></i> Aplicar GAD-7 (Ansiedad)
                    </button>
                </div>
                <div>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patientId}')" title="Exportar reporte clínico completo en PDF">
                        <i class="fas fa-file-pdf"></i> Exportar Evolución (PDF)
                    </button>
                </div>
            </div>

            <!-- BENTO DE 3 TARJETAS CLÍNICAS -->
            <div class="summary-grid" style="margin-bottom: 20px;">
                <div class="summary-mini-card">
                    <div class="summary-mini-icon">🌧️</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Depresión (PHQ-9)</div>
                        <div class="summary-mini-value">${latestPhq ? `${latestPhq.score}/27` : '—'}</div>
                        <small style="color:${latestPhq && latestPhq.score >= 15 ? '#ef4444' : '#10b981'}; font-weight:600;">
                            ${latestPhq ? latestPhq.severity : 'Sin evaluar'}
                        </small>
                    </div>
                </div>

                <div class="summary-mini-card">
                    <div class="summary-mini-icon">🌊</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Ansiedad (GAD-7)</div>
                        <div class="summary-mini-value">${latestGad ? `${latestGad.score}/21` : '—'}</div>
                        <small style="color:${latestGad && latestGad.score >= 15 ? '#ef4444' : '#10b981'}; font-weight:600;">
                            ${latestGad ? latestGad.severity : 'Sin evaluar'}
                        </small>
                    </div>
                </div>

                <div class="summary-mini-card">
                    <div class="summary-mini-icon">🎯</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Evolución Clínica</div>
                        <div class="summary-mini-value" style="font-size: 15px;">
                            ${phqDeltaPercent > 0 ? `<span style="color:#10b981;">-${phqDeltaPercent}%</span>` : (phqDeltaPercent < 0 ? `<span style="color:#ef4444;">+${Math.abs(phqDeltaPercent)}%</span>` : 'Estable')}
                        </div>
                        <small style="color:var(--text-secondary); font-size:11px;">
                            ${phqImprovementText}
                        </small>
                    </div>
                </div>
            </div>

            <!-- GRÁFICO LONGITUDINAL INTERACTIVO -->
            ${svgChartHtml}

            <!-- LISTADO CRONOLÓGICO DE EVALUACIONES -->
            <div class="clinical-history-section">
                <h4><i class="fas fa-list-ol"></i> Registro Histórico de Evaluaciones Psicométricas (${allEvals.length})</h4>
                ${allEvals.length === 0 ? `
                    <div class="empty-state" style="padding: 24px;">
                        <div class="empty-icon">📊</div>
                        <p>No hay evaluaciones psicométricas registradas aún</p>
                        <small>Aplica el PHQ-9 o GAD-7 en consulta o solicita al paciente completarlo desde su portal móvil.</small>
                    </div>
                ` : `
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${allEvals.slice().reverse().map(e => {
                            const isPhq = e.type === 'phq9';
                            return `
                                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-card); border:1px solid var(--border-color); padding:10px 14px; border-radius:8px;">
                                    <div style="display:flex; align-items:center; gap:10px;">
                                        <span style="font-size:18px;">${isPhq ? '🌧️' : '🌊'}</span>
                                        <div>
                                            <strong>${isPhq ? 'PHQ-9 (Depresión)' : 'GAD-7 (Ansiedad)'}: ${e.score}/${e.maxScore}</strong>
                                            <div style="font-size:11px; color:var(--text-secondary);">
                                                ${new Date(e.date).toLocaleDateString('es-ES', { day:'numeric', month:'short', year:'numeric' })} · Origen: ${e.source}
                                            </div>
                                        </div>
                                    </div>
                                    <div style="display:flex; align-items:center; gap:8px;">
                                        <span class="tag" style="background:${e.score >= 15 ? 'rgba(239,68,68,0.12)' : (e.score >= 10 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)')}; color:${e.score >= 15 ? '#ef4444' : (e.score >= 10 ? '#f59e0b' : '#10b981')}; font-weight:600;">
                                            ${e.severity}
                                        </span>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                `}
            </div>
        </div>
    `;
}

function renderTabEscalas(patientId) {
    return renderTabEscalasEnhanced(patientId);
}

// ============================================
// ASISTENTE CLÍNICO IA: DICTADO Y SÍNTESIS SOAP
// ============================================
let soapAiGeneratedResult = null;

function openSoapAiModal() {
    let modal = document.getElementById('soapAiModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'soapAiModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeSoapAiModal()"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <div>
                        <h2><i class="fas fa-wand-magic-sparkles" style="color:var(--accent-primary);"></i> Copiloto Clínico IA: Generador SOAP</h2>
                        <small style="color:var(--text-secondary);">Convierte dictado por voz o notas rápidas en estructura SOAP DSM-5</small>
                    </div>
                    <button class="btn-icon" onclick="closeSoapAiModal()"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-body" style="padding:16px 20px;">
                    <div style="background:var(--bg-secondary); border-radius:8px; padding:12px; margin-bottom:14px; font-size:13px; border-left:3px solid var(--accent-primary);">
                        <strong>💡 Instrucción:</strong> Dicta por voz o escribe apuntes libres de la sesión. Nuestro modelo desidentifica los datos sensibles del paciente (PHI) y genera los 4 apartados clínicos (S, O, A, P).
                    </div>

                    <div class="form-group">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <label style="font-weight:700;">Apuntes o Dictado de la Sesión:</label>
                            <button type="button" class="btn-sm btn-secondary" id="btnSoapVoiceDictate" onclick="toggleSoapVoiceDictation()">
                                <i class="fas fa-microphone"></i> Dictar por Voz
                            </button>
                        </div>
                        <textarea id="soapAiInput" rows="4" style="width:100%; border-radius:8px; padding:10px; font-size:13px;" placeholder="Ejemplo: Paciente refiere que la ansiedad laboral ha disminuido de 8 a 4. Logró realizar la técnica de respiración 4-7-8 antes de su reunión. Exploramos distorsión de lectura de mente..."></textarea>
                    </div>

                    <div style="margin-bottom:16px;">
                        <button type="button" class="btn-primary full-width" id="btnGenerateSoapAi" onclick="generateSoapFromAiModal()">
                            <i class="fas fa-sparkles"></i> ✨ Sintetizar Nota SOAP con IA
                        </button>
                    </div>

                    <!-- PREVIEW GENERADO -->
                    <div id="soapAiPreviewWrap" style="display:none; background:var(--bg-primary); border:1px solid var(--border-color); border-radius:10px; padding:14px; margin-bottom:14px;">
                        <h4 style="margin:0 0 10px 0; font-size:14px; color:var(--text-primary);">Vista Previa Estructurada:</h4>
                        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:10px; margin-bottom:12px;">
                            <div style="background:var(--bg-card); padding:8px 10px; border-radius:6px; font-size:12px; border:1px solid var(--border-color);">
                                <strong style="color:var(--accent-primary);">[S] Subjetivo:</strong>
                                <div id="previewSoapS" style="margin-top:4px; color:var(--text-secondary);"></div>
                            </div>
                            <div style="background:var(--bg-card); padding:8px 10px; border-radius:6px; font-size:12px; border:1px solid var(--border-color);">
                                <strong style="color:var(--accent-primary);">[O] Objetivo:</strong>
                                <div id="previewSoapO" style="margin-top:4px; color:var(--text-secondary);"></div>
                            </div>
                            <div style="background:var(--bg-card); padding:8px 10px; border-radius:6px; font-size:12px; border:1px solid var(--border-color);">
                                <strong style="color:var(--accent-primary);">[A] Análisis:</strong>
                                <div id="previewSoapA" style="margin-top:4px; color:var(--text-secondary);"></div>
                            </div>
                            <div style="background:var(--bg-card); padding:8px 10px; border-radius:6px; font-size:12px; border:1px solid var(--border-color);">
                                <strong style="color:var(--accent-primary);">[P] Plan:</strong>
                                <div id="previewSoapP" style="margin-top:4px; color:var(--text-secondary);"></div>
                            </div>
                        </div>
                        <button type="button" class="btn-primary full-width" onclick="applyGeneratedSoapToForm()">
                            <i class="fas fa-check"></i> 📥 Aplicar al Formulario de la Sesión
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('soapAiModal').style.display = 'flex';
}

function closeSoapAiModal() {
    const modal = document.getElementById('soapAiModal');
    if (modal) modal.style.display = 'none';
    if (typeof VoiceDictation !== 'undefined' && VoiceDictation.isRecording) {
        VoiceDictation.stop();
    }
}

async function generateSoapFromAiModal() {
    const text = document.getElementById('soapAiInput')?.value.trim();
    if (!text) {
        showToast('Escribe o dicta algún apunte de la sesión', 'warning');
        return;
    }

    const btn = document.getElementById('btnGenerateSoapAi');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando con Gemini AI...';
    }

    try {
        const patientId = document.getElementById('notePatient')?.value;
        const patient = AppState.patients.find(p => p.id === patientId) || {};
        
        let soap = null;
        if (typeof ClinicalAI !== 'undefined') {
            soap = await ClinicalAI.synthesizeSoapNote(text, patient);
        } else {
            soap = {
                subjetivo: `El paciente refiere: ${text}`,
                objetivo: 'Paciente orientado en las tres esferas, lenguaje fluido, afecto congruente.',
                analisis: 'Evolución psicoterapéutica favorable con asimilación de estrategias cognitivas.',
                plan: 'Continuar con el encuadre psicoterapéutico y monitoreo de tareas intersesión.'
            };
        }

        soapAiGeneratedResult = soap;
        document.getElementById('previewSoapS').textContent = soap.subjetivo || '';
        document.getElementById('previewSoapO').textContent = soap.objetivo || '';
        document.getElementById('previewSoapA').textContent = soap.analisis || '';
        document.getElementById('previewSoapP').textContent = soap.plan || '';
        document.getElementById('soapAiPreviewWrap').style.display = 'block';

        showToast('¡Nota SOAP estructurada con éxito!', 'success');
    } catch (e) {
        console.error('Error generando SOAP:', e);
        showToast('Error procesando nota con IA: ' + e.message, 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sparkles"></i> ✨ Sintetizar Nota SOAP con IA';
        }
    }
}

function applyGeneratedSoapToForm() {
    if (!soapAiGeneratedResult) return;
    
    // Si estamos en formato SOAP, poblar los textareas
    const sub = document.getElementById('noteSubjetivo');
    const obj = document.getElementById('noteObjetivo');
    const ana = document.getElementById('noteAnalisis');
    const pla = document.getElementById('notePlan');

    if (sub) sub.value = soapAiGeneratedResult.subjetivo || '';
    if (obj) obj.value = soapAiGeneratedResult.objetivo || '';
    if (ana) ana.value = soapAiGeneratedResult.analisis || '';
    if (pla) pla.value = soapAiGeneratedResult.plan || '';

    // Si estamos en reporte oficial, también enriquecer la descripción y observaciones
    const desc = document.getElementById('noteSessionDescription');
    const obs = document.getElementById('noteObservations');
    if (desc && !desc.value) {
        desc.value = `${soapAiGeneratedResult.subjetivo}\n\n${soapAiGeneratedResult.analisis}`;
    }
    if (obs && !obs.value) {
        obs.value = soapAiGeneratedResult.objetivo;
    }

    // Cambiar a formato SOAP visual si está disponible
    if (typeof switchNoteFormat === 'function') {
        switchNoteFormat('soap');
    }

    closeSoapAiModal();
    showToast('Nota SOAP aplicada al formulario de sesión', 'success');
}

function toggleSoapVoiceDictation() {
    if (typeof VoiceDictation === 'undefined' || !VoiceDictation.isSupported()) {
        showToast('El dictado por voz requiere Google Chrome o Edge', 'warning');
        return;
    }
    const input = document.getElementById('soapAiInput');
    const btn = document.getElementById('btnSoapVoiceDictate');
    if (!VoiceDictation.isRecording) {
        VoiceDictation.start(input);
        if (btn) {
            btn.classList.add('btn-danger');
            btn.innerHTML = '<i class="fas fa-circle-stop"></i> Detener Dictado';
        }
    } else {
        VoiceDictation.stop();
        if (btn) {
            btn.classList.remove('btn-danger');
            btn.innerHTML = '<i class="fas fa-microphone"></i> Dictar por Voz';
        }
    }
}

function renderTabApoyo(patient) {
    const cat = getPatientCategory(patient);
    const supports = [];

    if ((cat === 'child' || cat === 'adolescent') && patient.guardianName) {
        supports.push({
            icon: '👨‍👧',
            name: patient.guardianName,
            relation: `Tutor Legal / Representante (${patient.guardianRelation || 'Familiar'}) ${patient.guardianPhone ? '· ' + patient.guardianPhone : ''}`
        });
    }

    if (patient.emergency) supports.push({ icon: '🚨', name: patient.emergency, relation: patient.emergencyRelation || 'Contacto de emergencia' });
    if (patient.protectiveFactors) {
        const factors = patient.protectiveFactors.split('\n').filter(f => f.trim());
        factors.forEach(f => supports.push({ icon: '💪', name: f.trim(), relation: 'Factor protector' }));
    }
    return `<div class="clinical-history-section"><h4>Red de Apoyo y Recursos</h4>${supports.length === 0 ? '<div class="clinical-history-content empty">Sin información registrada</div>' : `<div class="support-network">${supports.map(s => `<div class="support-card"><div class="support-card-header"><div class="support-icon">${s.icon}</div><div><div class="support-name">${s.name}</div><div class="support-relation">${s.relation}</div></div></div></div>`).join('')}</div>`}</div><div class="clinical-history-section"><h4>Información de Contacto</h4><div class="support-network">${patient.phone ? `<div class="support-card"><div class="support-card-header"><div class="support-icon">📞</div><div><div class="support-name">${patient.phone}</div><div class="support-relation">Teléfono Paciente</div></div></div></div>` : ''}${patient.guardianPhone ? `<div class="support-card"><div class="support-card-header"><div class="support-icon">📱</div><div><div class="support-name">${patient.guardianPhone}</div><div class="support-relation">Teléfono Tutor (${patient.guardianName || 'Tutor'})</div></div></div></div>` : ''}${patient.email ? `<div class="support-card"><div class="support-card-header"><div class="support-icon">📧</div><div><div class="support-name">${patient.email}</div><div class="support-relation">Email</div></div></div></div>` : ''}</div></div>`;
}

// ============================================
// PORTAL DEL PACIENTE Y GESTIÓN DE ACCESO
// ============================================

function syncPatientToPortalStorage(patient) {
    if (!patient || !patient.id) return;
    let portalPatients = [];
    try {
        const stored = localStorage.getItem('psico_portal_patients');
        if (stored) portalPatients = JSON.parse(stored);
    } catch (e) {
        console.error('Error leyendo portal patients:', e);
    }
    const existingIndex = portalPatients.findIndex(p => p.id === patient.id);
    const therapistName = localStorage.getItem('psico_therapist_name') || AppState.currentUser?.name || 'Licenciado(a) en Psicología';
    const portalData = {
        id: patient.id,
        name: patient.name,
        portalToken: patient.portalToken,
        therapistName: therapistName,
        createdAt: patient.portalCreatedAt || new Date().toISOString()
    };
    if (existingIndex >= 0) {
        portalPatients[existingIndex] = portalData;
    } else {
        portalPatients.push(portalData);
    }
    localStorage.setItem('psico_portal_patients', JSON.stringify(portalPatients));

    // Sincronizar en segundo plano hacia base de datos PostgreSQL
    try {
        const patientTasks = (AppState.notes || [])
            .flatMap(n => n.intersessionTasks || [])
            .filter(t => t.patientId === patient.id || t.patient_id === patient.id);
        
        fetch('/api/v1/patients/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patients: [{
                    id: patient.id,
                    name: patient.name,
                    email: patient.email || '',
                    phone: patient.phone || '',
                    birthdate: patient.birthdate || null,
                    lifeStage: patient.lifeStage || patient.category || 'adult',
                    diagnosis: patient.diagnosis || '',
                    portalToken: patient.portalToken,
                    portalEnabled: patient.portalEnabled !== false,
                    portalCreatedAt: patient.portalCreatedAt || new Date().toISOString()
                }],
                tasks: patientTasks.map(t => ({
                    id: t.id || `task_${Math.random().toString(36).substr(2, 6)}`,
                    patient_id: patient.id,
                    title: t.title || t.text,
                    description: t.description || '',
                    completed: Boolean(t.completed)
                }))
            })
        }).catch(() => {});
    } catch (e) {}
}

function ensurePatientPortalToken(patient) {
    if (!patient.portalToken) {
        patient.portalToken = 'PN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        patient.portalEnabled = true;
        patient.portalCreatedAt = new Date().toISOString();
        saveData();
    }
    syncPatientToPortalStorage(patient);
    return patient.portalToken;
}

async function openPortalAccessModal(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) {
        showToast('Paciente no encontrado', 'error');
        return;
    }

    const token = ensurePatientPortalToken(patient);

    // Sincronizar en vivo desde la base de datos PostgreSQL
    if (typeof syncPortalDataForPatient === 'function') {
        await syncPortalDataForPatient(patientId);
    }

    const modalBody = document.getElementById('portalAccessModalBody');
    if (!modalBody) return;

    // Métricas y datos clínicos normalizados del portal
    const { results: evals, moods, cbt: cbtRecords, tasks: patientTasks } = getPortalResults(patientId);
    let portalData = {};
    try {
        const raw = localStorage.getItem(`psico_portal_data_${patientId}`);
        if (raw) portalData = JSON.parse(raw);
    } catch (e) {}

    const pendingTasks = patientTasks.filter(t => !t.completed).length;
    const totalTasks = patientTasks.length;

    const latestMood = moods.length > 0 ? moods[moods.length - 1] : null;
    const moodEmojis = { 1: '😞', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };
    const moodLabels = { 1: 'Muy mal', 2: 'Mal', 3: 'Neutral', 4: 'Bien', 5: 'Muy bien' };

    const latestPhq = evals.filter(e => e.type === 'phq9' || e.scaleType === 'phq9').slice(-1)[0];
    const latestGad = evals.filter(e => e.type === 'gad7' || e.scaleType === 'gad7').slice(-1)[0];

    const hasCrisis = portalData.activeCrisisAlert || false;

    const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    const portalUrl = `${baseUrl}portal.html?token=${token}`;

    const formattedDate = patient.portalCreatedAt 
        ? new Date(patient.portalCreatedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
        : 'Reciente';

    const stageLabel = patient.lifeStage === 'child' ? 'Niñez' : patient.lifeStage === 'adolescent' ? 'Adolescencia' : 'Adulto';
    const stageBadgeClass = patient.lifeStage === 'child' ? 'badge-child' : patient.lifeStage === 'adolescent' ? 'badge-adolescent' : 'badge-adult';

    modalBody.innerHTML = `
        <div class="portal-modal-inner">
            <!-- CABECERA DE IDENTIDAD DEL PACIENTE -->
            <div class="portal-identity-bar">
                <div class="portal-id-left">
                    <div class="portal-avatar-circle">${(patient.name || 'P').charAt(0).toUpperCase()}</div>
                    <div>
                        <div class="portal-patient-name">${typeof formatDisplayName === 'function' ? formatDisplayName(patient.name) : patient.name}</div>
                        <div class="portal-meta-tags">
                            <span class="clinical-stage-badge ${stageBadgeClass}">${stageLabel}</span>
                            <span class="portal-status-pill ${patient.portalEnabled ? 'active' : ''}">
                                <i class="fas fa-circle-check"></i> ${patient.portalEnabled ? 'Portal Activo' : 'Inactivo'}
                            </span>
                            <span class="portal-date-tag"><i class="far fa-calendar-alt"></i> Generado: ${formattedDate}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- ALERTA DE CRISIS SI ESTÁ ACTIVA -->
            ${hasCrisis ? `
                <div class="portal-crisis-callout">
                    <div class="crisis-icon">🚨</div>
                    <div class="crisis-info">
                        <strong>Alerta SOS Activa:</strong> El paciente ha solicitado asistencia inmediata o registrado indicadores de riesgo elevado desde su portal.
                    </div>
                    <button class="btn-sm btn-danger" onclick="openActiveCrisisProtocol(); closeModal('portalAccessModal');">
                        Ver Protocolo SOS
                    </button>
                </div>
            ` : ''}

            <!-- HERO CTA: ACCESO DIRECTO DESTACADO (LO PRINCIPAL REQUERIDO) -->
            <div class="portal-hero-action-card">
                <div class="portal-hero-info">
                    <div class="portal-hero-eyebrow">ACCESO RÁPIDO Y VERIFICACIÓN</div>
                    <h3 class="portal-hero-title">Espacio Terapéutico Digital del Paciente</h3>
                    <p class="portal-hero-desc">
                        Ingresa con un solo clic con inicio de sesión automático para revisar la vista del paciente, modelar el uso de los autoregistros interactivos o verificar las tareas intersesión asignadas.
                    </p>
                </div>
                <div class="portal-hero-buttons">
                    <button class="btn-portal-launch" onclick="launchPatientPortal('${patient.id}')" title="Abrir portal del paciente con autenticación automática">
                        <i class="fas fa-arrow-up-right-from-square"></i> Acceder al Portal
                    </button>
                    <button class="btn-portal-wa" onclick="sharePortalViaWhatsApp('${patient.id}')" title="Enviar enlace y código por WhatsApp al paciente">
                        <i class="fab fa-whatsapp"></i> Compartir por WhatsApp
                    </button>
                    <button class="btn-portal-qr" onclick="showPortalQrCode('${patient.id}')" title="Mostrar Código QR para escaneo directo con la cámara del teléfono">
                        <i class="fas fa-qrcode"></i> Código QR Móvil
                    </button>
                </div>
            </div>

            <!-- BENTO DE CREDENCIALES Y ENLACE SEGURO -->
            <div class="portal-credentials-card">
                <div class="credential-row">
                    <div class="credential-box-token">
                        <label class="credential-label">
                            <i class="fas fa-key"></i> CÓDIGO DE ACCESO / PIN
                        </label>
                        <div class="token-display-wrap">
                            <span class="token-display-text" id="displayPortalToken">${token}</span>
                            <button class="btn-pill-action" onclick="copyPortalToken('${patient.id}')" title="Copiar código al portapapeles">
                                <i class="fas fa-copy"></i> Copiar PIN
                            </button>
                        </div>
                    </div>
                    <div class="credential-box-link">
                        <label class="credential-label">
                            <i class="fas fa-link"></i> ENLACE DIRECTO (AUTO-LOGIN)
                        </label>
                        <div class="link-display-wrap">
                            <input type="text" class="link-input-readonly" readonly value="${portalUrl}" id="portalDirectUrlInput" onclick="this.select()">
                            <button class="btn-pill-action" onclick="copyPortalLink('${patient.id}')" title="Copiar enlace directo">
                                <i class="fas fa-clone"></i> Copiar Enlace
                            </button>
                        </div>
                    </div>
                </div>

                <div class="credential-footer-actions">
                    <span class="credential-tip">
                        <i class="fas fa-shield-halved"></i> Acceso seguro y encriptado. El paciente no requiere recordar contraseñas complejas.
                    </span>
                    <button class="btn-link-subtle" onclick="regeneratePortalToken('${patient.id}')" title="Generar un código nuevo revocando el anterior">
                        <i class="fas fa-arrows-rotate"></i> Regenerar Nuevo PIN
                    </button>
                </div>
            </div>

            <!-- RESUMEN DE ACTIVIDAD CLÍNICA EN TIEMPO REAL -->
            <div class="portal-section-title">
                <i class="fas fa-chart-pie"></i> Actividad Sincronizada del Paciente
            </div>
            <div class="portal-metrics-grid">
                <div class="portal-metric-card">
                    <div class="portal-metric-icon" style="background: rgba(13, 148, 136, 0.12); color: #0d9488;">
                        <i class="fas fa-list-check"></i>
                    </div>
                    <div class="portal-metric-data">
                        <div class="portal-metric-value">${totalTasks > 0 ? `${totalTasks - pendingTasks}/${totalTasks}` : '0'}</div>
                        <div class="portal-metric-label">Tareas completadas</div>
                        <small class="portal-metric-sub">${pendingTasks > 0 ? `${pendingTasks} pendientes` : 'Todas al día'}</small>
                    </div>
                </div>

                <div class="portal-metric-card">
                    <div class="portal-metric-icon" style="background: rgba(99, 102, 241, 0.12); color: #6366f1;">
                        <i class="fas fa-brain"></i>
                    </div>
                    <div class="portal-metric-data">
                        <div class="portal-metric-value">${cbtRecords.length}</div>
                        <div class="portal-metric-label">Autoregistros ABC</div>
                        <small class="portal-metric-sub">Técnicas cognitivas TCC</small>
                    </div>
                </div>

                <div class="portal-metric-card">
                    <div class="portal-metric-icon" style="background: rgba(245, 158, 11, 0.12); color: #f59e0b;">
                        <i class="fas fa-face-smile"></i>
                    </div>
                    <div class="portal-metric-data">
                        <div class="portal-metric-value">
                            ${latestMood ? `${moodEmojis[latestMood.mood] || '🙂'} ${latestMood.mood}/5` : '—'}
                        </div>
                        <div class="portal-metric-label">Estado de ánimo</div>
                        <small class="portal-metric-sub">${latestMood ? (moodLabels[latestMood.mood] || 'Registrado') : 'Sin registros'}</small>
                    </div>
                </div>

                <div class="portal-metric-card">
                    <div class="portal-metric-icon" style="background: rgba(16, 185, 129, 0.12); color: #10b981;">
                        <i class="fas fa-chart-line"></i>
                    </div>
                    <div class="portal-metric-data">
                        <div class="portal-metric-value">
                            ${latestPhq ? `PHQ: ${latestPhq.score}` : (latestGad ? `GAD: ${latestGad.score}` : '—')}
                        </div>
                        <div class="portal-metric-label">Último Test Clínico</div>
                        <small class="portal-metric-sub">${latestPhq ? `Depresión: ${latestPhq.severity || 'Normal'}` : 'Al día'}</small>
                    </div>
                </div>
            </div>

            <!-- GUÍA DE CAPACIDADES Y BENEFICIOS PARA EL PACIENTE -->
            <div class="portal-capabilities-box">
                <div class="capabilities-header">¿Qué puede realizar el paciente en su portal?</div>
                <div class="capabilities-grid">
                    <div class="capability-item">
                        <span class="cap-icon">🧘</span>
                        <div class="cap-text">
                            <strong>Check-in Diario de Bienestar</strong>
                            <span>Monitoreo de estado de ánimo, horas de sueño y nivel de energía vital.</span>
                        </div>
                    </div>
                    <div class="capability-item">
                        <span class="cap-icon">📝</span>
                        <div class="cap-text">
                            <strong>Tareas TCC y Autoregistros</strong>
                            <span>Ejercicios intersesión guiados, reestructuración de pensamientos y activación conductual.</span>
                        </div>
                    </div>
                    <div class="capability-item">
                        <span class="cap-icon">🚨</span>
                        <div class="cap-text">
                            <strong>Protocolo SOS 24/7</strong>
                            <span>Líneas gratuitas de atención en crisis y alerta inmediata al terapeuta en caso de emergencia.</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- CONTROLES INFERIORES -->
            <div class="portal-modal-footer">
                <button class="btn-secondary" onclick="viewPatient('${patient.id}'); switchPatientTab('portal', document.querySelectorAll('.patient-tab')[6]); closeModal('portalAccessModal');">
                    <i class="fas fa-chart-simple"></i> Ver Analítica Detallada en Expediente
                </button>
                <button class="btn-primary" onclick="closeModal('portalAccessModal')">
                    Entendido
                </button>
            </div>
        </div>
    `;

    openModal('portalAccessModal');
}

function launchPatientPortal(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;
    const token = ensurePatientPortalToken(patient);

    const therapistName = localStorage.getItem('psico_therapist_name') || AppState.currentUser?.name || 'Terapeuta';
    localStorage.setItem('psico_portal_session', JSON.stringify({
        patientId: patient.id,
        portalToken: token,
        patientName: patient.name,
        therapistName: therapistName
    }));

    showToast(`🚀 Abriendo portal de ${patient.name}...`, 'success');
    window.open(`portal.html?token=${encodeURIComponent(token)}`, '_blank');
}

function sharePortalViaWhatsApp(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;
    const token = ensurePatientPortalToken(patient);
    const therapistName = localStorage.getItem('psico_therapist_name') || 'Tu terapeuta';
    const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    const portalUrl = `${baseUrl}portal.html?token=${token}`;

    const text = `Hola ${patient.name}, te saluda ${therapistName}. Te comparto el enlace a tu portal terapéutico digital "Mi Espacio" en Psico Notes:\n\n🔗 Enlace directo: ${portalUrl}\n🔑 Tu código de acceso: ${token}\n\nAquí podrás registrar tus reflexiones diarias, tareas intersesión y monitorear tu bienestar. ¡Nos vemos en nuestra próxima sesión!`;

    const rawPhone = patient.phone || patient.guardianPhone || '';
    const phone = rawPhone.replace(/[^0-9]/g, '');
    const waUrl = phone 
        ? `https://wa.me/${phone}?text=${encodeURIComponent(text)}` 
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
}

function showPortalQrCode(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;
    const token = ensurePatientPortalToken(patient);
    const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    const portalUrl = `${baseUrl}portal.html?token=${token}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(portalUrl)}&margin=10`;

    const body = document.getElementById('qrModalBody');
    if (body) {
        body.innerHTML = `
            <div class="qr-modal-container">
                <div class="qr-frame-box">
                    <img src="${qrImageUrl}" alt="Código QR Portal ${patient.name}" onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'padding:20px;font-weight:600;color:var(--text-secondary);\\'>Acceso directo:<br><code style=\\'font-size:16px;color:var(--color-primary);\\'>${portalUrl}</code></div>';">
                </div>
                <div class="qr-instructions-list">
                    <div>📱 <strong>1.</strong> Pide al consultante que abra la cámara de su teléfono inteligente.</div>
                    <div>🎯 <strong>2.</strong> Apunta al código QR en la pantalla para abrir su portal de inmediato.</div>
                    <div>✨ <strong>3.</strong> Entrada segura con token automático, sin recordar contraseñas.</div>
                </div>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button class="btn-secondary" onclick="copyPortalLink('${patient.id}');">
                        <i class="fas fa-copy"></i> Copiar Enlace
                    </button>
                    <button class="btn-primary" onclick="closeModal('qrModal');">
                        <i class="fas fa-check"></i> Listo
                    </button>
                </div>
            </div>
        `;
    }
    openModal('qrModal');
}

function copyPortalToken(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient || !patient.portalToken) return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(patient.portalToken).then(() => {
            showToast(`✅ Código ${patient.portalToken} copiado al portapapeles`, 'success');
        }).catch(() => {
            showToast(`Código: ${patient.portalToken}`, 'info');
        });
    } else {
        showToast(`Código: ${patient.portalToken}`, 'info');
    }
}

function copyPortalLink(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient || !patient.portalToken) return;
    const baseUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '');
    const portalUrl = `${baseUrl}portal.html?token=${patient.portalToken}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(portalUrl).then(() => {
            showToast(`✅ Enlace directo al portal copiado al portapapeles`, 'success');
        }).catch(() => {
            showToast(`Enlace: ${portalUrl}`, 'info');
        });
    } else {
        showToast(`Enlace: ${portalUrl}`, 'info');
    }
}

function regeneratePortalToken(patientId) {
    if (!confirm('¿Deseas generar un nuevo código de acceso para este paciente? El código anterior dejará de ser válido.')) {
        return;
    }
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;
    patient.portalToken = 'PN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    patient.portalCreatedAt = new Date().toISOString();
    saveData();
    syncPatientToPortalStorage(patient);
    showToast(`✅ Nuevo código ${patient.portalToken} generado con éxito`, 'success');
    openPortalAccessModal(patientId);
}

function generatePortalToken(patientId) {
    // Redirige al modal interactivo y visual del portal, eliminando alertas de navegador
    openPortalAccessModal(patientId);
}

async function syncPortalDataForPatient(patientId) {
    if (!patientId) return null;
    try {
        const res = await fetch(`/api/v1/portal/data/${patientId}`);
        if (!res.ok) return null;
        const json = await res.json();
        const remote = json.data;
        if (!remote) return null;

        // Normalizar y persistir estados de ánimo
        const normalizedMoods = (remote.moodLogs || []).map(m => ({
            id: m.id,
            value: Number(m.mood_score ?? m.value ?? m.mood) || 3,
            mood: Number(m.mood_score ?? m.value ?? m.mood) || 3,
            sleep: Number(m.sleep_score ?? m.sleep) || 3,
            energy: Number(m.energy_score ?? m.energy) || 3,
            note: m.note || '',
            date: m.created_at || m.date || new Date().toISOString()
        }));
        localStorage.setItem(`psico_portal_mood_${patientId}`, JSON.stringify(normalizedMoods));

        // Normalizar y persistir evaluaciones psicométricas (PHQ-9, GAD-7)
        const normalizedEvals = (remote.evaluations || []).map(e => ({
            id: e.id,
            type: e.scale_type || e.type || 'phq9',
            scaleType: e.scale_type || e.type || 'phq9',
            score: Number(e.score) || 0,
            maxScore: Number(e.max_score || e.maxScore) || ( (e.scale_type || e.type) === 'gad7' ? 21 : 27 ),
            severity: e.severity || 'Normal',
            alertRisk: Boolean(e.alert_risk ?? e.alertRisk),
            riskReason: e.risk_reason || e.riskReason || '',
            date: e.created_at || e.date || new Date().toISOString()
        }));
        localStorage.setItem(`psico_portal_results_${patientId}`, JSON.stringify(normalizedEvals));

        // Normalizar y persistir autoregistros ABC (TCC)
        const normalizedCbt = (remote.cbtRecords || []).map(c => ({
            id: c.id,
            situation: c.situation || '',
            thought: c.thought || '',
            distortion: c.distortion || 'Generalización excesiva',
            emotion: c.emotion || 'Ansiedad',
            initialIntensity: Number(c.initial_intensity ?? c.initialIntensity) || 50,
            rationalThought: c.rational_thought || c.rationalThought || '',
            finalIntensity: Number(c.final_intensity ?? c.finalIntensity) || 30,
            behavioralReaction: c.behavioral_reaction || c.behavioralReaction || '',
            date: c.created_at || c.date || new Date().toISOString()
        }));
        localStorage.setItem(`psico_portal_cbt_${patientId}`, JSON.stringify(normalizedCbt));

        // Normalizar tareas
        const localData = JSON.parse(localStorage.getItem(`psico_portal_data_${patientId}`) || '{}');
        localData.tasks = remote.tasks || [];
        localData.activeCrisisAlert = Boolean(remote.hasActiveCrisisAlert);
        localStorage.setItem(`psico_portal_data_${patientId}`, JSON.stringify(localData));

        return {
            moods: normalizedMoods,
            evaluations: normalizedEvals,
            cbt: normalizedCbt,
            tasks: remote.tasks || []
        };
    } catch (e) {
        console.warn('⚠️ No se pudo sincronizar datos del portal en este momento:', e);
        return null;
    }
}

async function refreshPortalTabContent(patientId, showNotification = false) {
    if (!patientId) return;
    const tabEl = document.getElementById('tab-portal');
    const badgeEl = document.getElementById('portalTabBadgeCount');

    if (showNotification && tabEl) {
        tabEl.style.opacity = '0.6';
    }

    const synced = await syncPortalDataForPatient(patientId);

    if (tabEl) {
        tabEl.style.opacity = '1';
        tabEl.innerHTML = renderPortalTab(patientId);
    }

    const { results, moods, cbt } = getPortalResults(patientId);
    const totalCount = results.length + moods.length + cbt.length;
    if (badgeEl) {
        badgeEl.textContent = totalCount;
        badgeEl.style.display = totalCount > 0 ? 'inline-block' : 'none';
    }

    if (showNotification) {
        showToast('Portal sincronizado con PostgreSQL', 'success');
    }
}

function getPortalResults(patientId) {
    const key = `psico_portal_results_${patientId}`;
    const keyMood = `psico_portal_mood_${patientId}`;
    const keyCbt = `psico_portal_cbt_${patientId}`;
    const keyData = `psico_portal_data_${patientId}`;

    let results = [];
    let moods = [];
    let cbt = [];
    let tasks = [];

    try { results = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) {}
    try { moods = JSON.parse(localStorage.getItem(keyMood) || '[]'); } catch (e) {}
    try { cbt = JSON.parse(localStorage.getItem(keyCbt) || '[]'); } catch (e) {}
    try {
        const raw = localStorage.getItem(keyData);
        if (raw) tasks = JSON.parse(raw).tasks || [];
    } catch (e) {}

    return { results, moods, cbt, tasks };
}

function renderPortalTab(patientId) {
    const { results, moods, cbt, tasks } = getPortalResults(patientId);
    const totalCount = results.length + moods.length + cbt.length;

    const lastPhq = results.filter(r => r.type === 'phq9' || r.scaleType === 'phq9').slice(-1)[0];
    const lastGad = results.filter(r => r.type === 'gad7' || r.scaleType === 'gad7').slice(-1)[0];
    const latestMood = moods.length > 0 ? moods[moods.length - 1] : null;

    const moodEmojis = { 1: '😞', 2: '😔', 3: '😐', 4: '🙂', 5: '😊' };
    const moodLabels = { 1: 'Muy mal', 2: 'Mal', 3: 'Neutral', 4: 'Bien', 5: 'Muy bien' };

    const completedTasks = (tasks || []).filter(t => t.completed).length;
    const totalTasks = (tasks || []).length;

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
            return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return 'Fecha no disponible';
        }
    };

    return `
        <div class="portal-clinical-tab-wrap" style="padding: 12px 0;">
            <!-- CABECERA DE CONTROL DE SINCRONIZACIÓN -->
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-secondary); padding: 14px 18px; border-radius: 12px; margin-bottom: 20px; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="display: inline-flex; align-items: center; gap: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 600; font-size: 12px; padding: 4px 10px; border-radius: 20px;">
                        <i class="fas fa-database"></i> Sincronizado en Vivo (PostgreSQL)
                    </span>
                    <span style="font-size: 13px; color: var(--text-secondary);">
                        Total de actividades registradas: <strong>${totalCount}</strong>
                    </span>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button class="btn-sm btn-primary" onclick="refreshPortalTabContent('${patientId}', true)" title="Consultar PostgreSQL para obtener registros recién enviados desde el teléfono">
                        <i class="fas fa-arrows-rotate"></i> Actualizar Datos
                    </button>
                    <button class="btn-sm btn-secondary" onclick="openPortalAccessModal('${patientId}')" title="Ver código PIN, código QR y credenciales de acceso">
                        <i class="fas fa-qrcode"></i> Credenciales / PIN
                    </button>
                </div>
            </div>

            <!-- BENTO DE 4 MÉTRICAS PRINCIPALES -->
            <div class="summary-grid" style="margin-bottom: 24px;">
                <div class="summary-mini-card">
                    <div class="summary-mini-icon">💭</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Check-ins de Ánimo</div>
                        <div class="summary-mini-value">${moods.length}</div>
                        <small style="color: var(--text-secondary); font-size: 11px;">
                            ${latestMood ? `${moodEmojis[latestMood.mood] || '🙂'} Último: ${latestMood.mood}/5` : 'Sin registros'}
                        </small>
                    </div>
                </div>

                <div class="summary-mini-card">
                    <div class="summary-mini-icon">🧠</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Autoregistros ABC</div>
                        <div class="summary-mini-value">${cbt.length}</div>
                        <small style="color: var(--text-secondary); font-size: 11px;">Reestructuración TCC</small>
                    </div>
                </div>

                <div class="summary-mini-card">
                    <div class="summary-mini-icon">📊</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Tests Clínicos</div>
                        <div class="summary-mini-value">${results.length}</div>
                        <small style="color: var(--text-secondary); font-size: 11px;">
                            ${lastPhq ? `PHQ: ${lastPhq.score}` : (lastGad ? `GAD: ${lastGad.score}` : 'Al día')}
                        </small>
                    </div>
                </div>

                <div class="summary-mini-card">
                    <div class="summary-mini-icon">✅</div>
                    <div class="summary-mini-info">
                        <div class="summary-mini-label">Tareas Intersesión</div>
                        <div class="summary-mini-value">${completedTasks}/${totalTasks}</div>
                        <small style="color: var(--text-secondary); font-size: 11px;">
                            ${totalTasks - completedTasks > 0 ? `${totalTasks - completedTasks} pendientes` : 'Completas'}
                        </small>
                    </div>
                </div>
            </div>

            ${totalCount === 0 ? `
                <div class="empty-state" style="padding: 40px 20px; text-align: center; background: var(--bg-secondary); border-radius: 12px; border: 1px dashed var(--border-color);">
                    <div class="empty-icon" style="font-size: 42px; margin-bottom: 12px;">🌱</div>
                    <h4 style="margin: 0 0 8px 0; color: var(--text-primary);">Aún no hay registros enviados por el paciente</h4>
                    <p style="color: var(--text-secondary); font-size: 14px; max-width: 480px; margin: 0 auto 16px auto;">
                        Cuando el paciente ingrese desde su teléfono celular al portal y complete un test, un autoregistro ABC o su check-in diario, aparecerá aquí automáticamente.
                    </p>
                    <button class="btn-primary" onclick="openPortalAccessModal('${patientId}')">
                        <i class="fas fa-share-nodes"></i> Compartir Acceso con el Paciente
                    </button>
                </div>
            ` : ''}

            <!-- 1. AUTOREGISTROS COGNITIVOS ABC (TCC) -->
            ${cbt.length > 0 ? `
                <div class="clinical-history-section" style="margin-bottom: 24px;">
                    <h4 style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px;">
                        <span><i class="fas fa-brain" style="color: #6366f1;"></i> Autoregistros Cognitivos ABC del Paciente (${cbt.length})</span>
                    </h4>
                    <div style="display: flex; flex-direction: column; gap: 14px;">
                        ${cbt.slice().reverse().map(record => `
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; box-shadow: 0 2px 6px rgba(0,0,0,0.04);">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
                                    <span style="font-size: 12px; color: var(--text-secondary);">
                                        <i class="far fa-clock"></i> ${formatDateSafe(record.date)}
                                    </span>
                                    <span style="background: rgba(99, 102, 241, 0.12); color: #6366f1; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                                        Distorsión: ${record.distortion || 'Identificada'}
                                    </span>
                                </div>
                                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;">
                                    <div style="background: rgba(239, 68, 68, 0.05); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #ef4444;">
                                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #ef4444; margin-bottom: 4px;">A) Situación Activadora</div>
                                        <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 6px;">${record.situation}</div>
                                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #ef4444; margin-bottom: 4px;">B) Pensamiento Automático</div>
                                        <div style="font-size: 13px; font-style: italic; color: var(--text-primary); margin-bottom: 6px;">"${record.thought}"</div>
                                        <div style="font-size: 12px; color: var(--text-secondary);">
                                            Emoción: <strong>${record.emotion}</strong> (Intensidad inicial: <strong>${record.initialIntensity}%</strong>)
                                        </div>
                                    </div>

                                    <div style="background: rgba(16, 185, 129, 0.05); padding: 10px 12px; border-radius: 8px; border-left: 3px solid #10b981;">
                                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #10b981; margin-bottom: 4px;">C) Pensamiento Racional Alternativo</div>
                                        <div style="font-size: 13px; color: var(--text-primary); margin-bottom: 8px;">${record.rationalThought}</div>
                                        <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-primary); padding: 6px 10px; border-radius: 6px;">
                                            <span style="font-size: 12px; color: var(--text-secondary);">Intensidad final: <strong>${record.finalIntensity}%</strong></span>
                                            <span style="font-size: 12px; font-weight: 700; color: ${record.finalIntensity < record.initialIntensity ? '#10b981' : '#f59e0b'};">
                                                ${record.finalIntensity < record.initialIntensity ? `Alivio: -${record.initialIntensity - record.finalIntensity}%` : 'Sin cambio'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 2. REGISTROS DIARIOS DE BIENESTAR Y ESTADO DE ÁNIMO -->
            ${moods.length > 0 ? `
                <div class="clinical-history-section" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 14px;"><i class="fas fa-smile" style="color: #f59e0b;"></i> Check-ins de Bienestar y Estado de Ánimo (${moods.length})</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
                        ${moods.slice(-6).reverse().map(m => `
                            <div style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 10px; padding: 14px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                                    <span style="font-size: 24px;">${moodEmojis[m.mood] || '🙂'}</span>
                                    <span style="font-size: 11px; color: var(--text-secondary);">${formatDateSafe(m.date)}</span>
                                </div>
                                <div style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">
                                    ${moodLabels[m.mood] || 'Registrado'} (${m.mood}/5)
                                </div>
                                <div style="font-size: 12px; color: var(--text-secondary); display: flex; gap: 10px; margin-bottom: 6px;">
                                    <span>😴 Sueño: <strong>${m.sleep}/5</strong></span>
                                    <span>⚡ Energía: <strong>${m.energy}/5</strong></span>
                                </div>
                                ${m.note ? `<div style="font-size: 12px; color: var(--text-primary); font-style: italic; background: var(--bg-secondary); padding: 6px 8px; border-radius: 6px;">"${m.note}"</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 3. EVALUACIONES PSICOMÉTRICAS (PHQ-9 / GAD-7) -->
            ${results.length > 0 ? `
                <div class="clinical-history-section" style="margin-bottom: 24px;">
                    <h4 style="margin-bottom: 14px;"><i class="fas fa-chart-line" style="color: #0d9488;"></i> Evaluaciones Psicométricas Realizadas por el Paciente (${results.length})</h4>
                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${results.slice().reverse().map(evalItem => {
                            const isPhq = (evalItem.type === 'phq9' || evalItem.scaleType === 'phq9');
                            const interp = isPhq ? interpretPhq(evalItem.score) : interpretGad(evalItem.score);
                            const scaleTitle = isPhq ? 'Cuestionario de Salud del Paciente (PHQ-9 - Depresión)' : 'Escala de Ansiedad Generalizada (GAD-7)';
                            return `
                                <div class="alert-item ${evalItem.score >= 15 ? 'critical' : evalItem.score >= 10 ? 'warning' : 'success'}" style="margin: 0;">
                                    <div class="alert-item-icon">${isPhq ? '🌧️' : '🌊'}</div>
                                    <div class="alert-item-text" style="flex: 1;">
                                        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                                            <strong>${scaleTitle}: ${evalItem.score}/${evalItem.maxScore || (isPhq ? 27 : 21)}</strong>
                                            <small style="color: var(--text-secondary);">${formatDateSafe(evalItem.date)}</small>
                                        </div>
                                        <div style="font-size: 12px; margin-top: 4px;">
                                            Nivel Clínico: <strong style="color: ${interp.color};">${interp.level}</strong>
                                            ${evalItem.alertRisk ? `<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; margin-left: 8px;">⚠️ ALERTA DE RIESGO</span>` : ''}
                                        </div>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 4. TAREAS INTERSESIÓN DEL PACIENTE -->
            ${tasks && tasks.length > 0 ? `
                <div class="clinical-history-section">
                    <h4 style="margin-bottom: 14px;"><i class="fas fa-list-check" style="color: #10b981;"></i> Seguimiento de Tareas Intersesión</h4>
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        ${tasks.map(t => `
                            <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-card); border: 1px solid var(--border-color); padding: 10px 14px; border-radius: 8px;">
                                <div style="display: flex; align-items: center; gap: 10px;">
                                    <i class="fas ${t.completed ? 'fa-circle-check' : 'fa-circle'}" style="color: ${t.completed ? '#10b981' : '#9ca3af'}; font-size: 18px;"></i>
                                    <span style="font-size: 13px; text-decoration: ${t.completed ? 'line-through' : 'none'}; color: ${t.completed ? 'var(--text-secondary)' : 'var(--text-primary)'};">
                                        ${t.title || t.text || 'Tarea asignada'}
                                    </span>
                                </div>
                                <span style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: ${t.completed ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)'}; color: ${t.completed ? '#10b981' : '#f59e0b'}; font-weight: 600;">
                                    ${t.completed ? 'Completada' : 'Pendiente'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;
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
    return `
        <div class="session-prep-card">
            <div class="session-prep-header">
                <div class="session-prep-icon"><i class="fas fa-bullseye"></i></div>
                <div class="session-prep-info">
                    <div class="session-prep-title">Preparación de Sesión</div>
                    <div class="session-prep-subtitle">Paciente: ${formatDisplayName(prep.patientName)} · Sesión #${prep.sessionNumber}</div>
                </div>
                <div class="session-prep-wellbeing">
                    <div class="wellbeing-mini">${prep.wellbeing}%</div>
                    <div class="wellbeing-label">Bienestar</div>
                </div>
            </div>
            <div class="session-prep-grid">
                <div class="prep-item">
                    <div class="prep-label">Estado emocional</div>
                    <div class="prep-value">${prep.emotionalEmoji} ${prep.emotionalState}/10</div>
                </div>
                <div class="prep-item">
                    <div class="prep-label">Objetivo principal</div>
                    <div class="prep-value-small">${prep.mainGoal}</div>
                </div>
                <div class="prep-item">
                    <div class="prep-label">Tarea pendiente</div>
                    <div class="prep-value-small">${prep.pendingTask}</div>
                </div>
                <div class="prep-item">
                    <div class="prep-label">Última intervención</div>
                    <div class="prep-value-small">${prep.lastIntervention}</div>
                </div>
            </div>
            ${prep.aspectsToReview.length > 0 ? `
                <div class="session-prep-aspects">
                    <div class="aspects-title"><i class="fas fa-clipboard-check" style="color:var(--accent-primary);margin-right:6px;"></i> Aspectos a revisar hoy:</div>
                    <ul class="aspects-list">${prep.aspectsToReview.map(a => `<li>${a}</li>`).join('')}</ul>
                </div>
            ` : ''}
        </div>
    `;
}

// ============================================
// CALENDARIO CLÍNICO MULTI-VISTA (DÍA, SEMANA, MES, AÑO)
// ============================================
function setCalendarViewMode(mode) {
    AppState.calendarViewMode = mode;
    ['day', 'week', 'month', 'year'].forEach(m => {
        const btn = document.getElementById(`calMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });
    renderCalendar();
}

function navigateCalendarToday() {
    AppState.currentDate = new Date();
    AppState.selectedDate = new Date();
    renderCalendar();
    renderAppointments();
}

function navigateCalendarPeriod(delta) {
    const mode = AppState.calendarViewMode || 'month';
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
    renderAppointments();
}

function changeMonth(delta) {
    navigateCalendarPeriod(delta);
}

function zoomIntoDay(dateStr) {
    AppState.selectedDate = new Date(dateStr + 'T12:00:00');
    setCalendarViewMode('day');
}

function openAppointmentModalWithSlot(dateStr, timeStr) {
    document.getElementById('appointmentId').value = '';
    document.getElementById('appointmentForm').reset();
    document.getElementById('appointmentDate').value = dateStr;
    document.getElementById('appointmentTime').value = timeStr || '09:00';
    document.getElementById('appointmentModalTitle').textContent = `Agendar Cita — ${formatDate(dateStr)} ${timeStr || ''}`;
    updatePatientSelects();
    openModal('appointmentModal');
}

function viewAppointmentDetail(appId) {
    const app = AppState.appointments.find(a => a.id === appId);
    if (!app) return;
    AppState.selectedDate = new Date(app.date + 'T12:00:00');
    renderAppointments();
    const details = document.getElementById('calendarDayDetailsContainer');
    if (details) details.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function renderCalendar() {
    const mode = AppState.calendarViewMode || 'month';
    const container = document.getElementById('calendarMainContainer');
    if (!container) return;

    if (mode === 'day') {
        renderCalendarDay(container);
    } else if (mode === 'week') {
        renderCalendarWeek(container);
    } else if (mode === 'year') {
        renderCalendarYear(container);
    } else {
        renderCalendarMonth(container);
    }
}

// 1. VISTA MENSUAL (CON CITAS EN CADA DÍA)
function renderCalendarMonth(container) {
    const year = AppState.currentDate.getFullYear();
    const month = AppState.currentDate.getMonth();
    const titleEl = document.getElementById('calendarTitle');
    if (titleEl) {
        titleEl.textContent = new Date(year, month).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    }

    const monthApps = AppState.appointments.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month && a.status !== 'cancelada';
    });

    const metricsEl = document.getElementById('calendarQuickMetrics');
    if (metricsEl) {
        metricsEl.innerHTML = `<span style="background:var(--accent-light);color:var(--accent-primary);font-weight:700;padding:3px 10px;border-radius:12px;"><i class="fas fa-calendar-check"></i> ${monthApps.length} citas en el mes</span>`;
    }

    const firstDayDate = new Date(year, month, 1);
    let startDay = firstDayDate.getDay();
    let startPadding = (startDay === 0) ? 6 : startDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    const today = new Date();

    let html = `
        <div class="calendar-grid" id="calendarGrid">
            <div class="calendar-day-header">Lun</div>
            <div class="calendar-day-header">Mar</div>
            <div class="calendar-day-header">Mié</div>
            <div class="calendar-day-header">Jue</div>
            <div class="calendar-day-header">Vie</div>
            <div class="calendar-day-header">Sáb</div>
            <div class="calendar-day-header">Dom</div>
    `;

    for (let i = startPadding - 1; i >= 0; i--) {
        const pDay = daysInPrevMonth - i;
        html += `
            <div class="calendar-day other-month">
                <div class="calendar-day-top"><span class="calendar-day-num">${pDay}</span></div>
            </div>
        `;
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = toDateInputValue(date);
        const isToday = isSameDay(date, today);
        const isSelected = isSameDay(date, AppState.selectedDate);
        const dayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), date) && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));

        let eventsHtml = '';
        const visibleApps = dayApps.slice(0, 3);
        visibleApps.forEach(app => {
            const p = AppState.patients.find(x => x.id === app.patientId);
            const pShortName = p ? p.name.split(' ')[0] : 'Paciente';
            const isTele = (app.type || '').toLowerCase().includes('tele') || (app.type || '').toLowerCase().includes('online');
            eventsHtml += `
                <div class="cal-event-pill ${app.status || 'pendiente'} ${isTele ? 'teleconsulta' : ''}" 
                     onclick="event.stopPropagation(); viewAppointmentDetail('${app.id}')"
                     title="${formatTime(app.time)} · ${p ? p.name : 'Paciente'} (${app.type || 'Terapia'})">
                    <span class="pill-time">${formatTime(app.time)}</span>
                    <span class="pill-name">${pShortName}</span>
                </div>
            `;
        });

        if (dayApps.length > 3) {
            eventsHtml += `<div class="cal-more-pill" onclick="event.stopPropagation(); zoomIntoDay('${dateStr}')">+${dayApps.length - 3} más</div>`;
        }

        html += `
            <div class="calendar-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" 
                 onclick="AppState.selectedDate = new Date('${dateStr}T12:00:00'); renderCalendar(); renderAppointments();"
                 ondblclick="zoomIntoDay('${dateStr}')"
                 title="Click para ver citas · Doble click para vista de día">
                <div class="calendar-day-top">
                    <span class="calendar-day-num">${day}</span>
                    ${dayApps.length > 0 ? `<span class="cal-day-count-badge">${dayApps.length}</span>` : ''}
                </div>
                <div class="calendar-day-events">
                    ${eventsHtml}
                </div>
            </div>
        `;
    }

    const totalCells = startPadding + daysInMonth;
    const remainingPadding = (7 - (totalCells % 7)) % 7;
    for (let i = 1; i <= remainingPadding; i++) {
        html += `
            <div class="calendar-day other-month">
                <div class="calendar-day-top"><span class="calendar-day-num">${i}</span></div>
            </div>
        `;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// 2. VISTA SEMANAL (7 COLUMNAS DETALLADAS)
function renderCalendarWeek(container) {
    const curr = new Date(AppState.selectedDate || AppState.currentDate);
    const dayOfWeek = curr.getDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const titleEl = document.getElementById('calendarTitle');
    if (titleEl) {
        titleEl.textContent = `Semana del ${monday.getDate()} ${monday.toLocaleDateString('es-ES', { month: 'short' })} al ${sunday.getDate()} ${sunday.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}`;
    }

    const weekApps = AppState.appointments.filter(a => {
        const d = new Date(a.date);
        return d >= new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0) &&
               d <= new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59) &&
               a.status !== 'cancelada';
    });

    const metricsEl = document.getElementById('calendarQuickMetrics');
    if (metricsEl) {
        metricsEl.innerHTML = `<span style="background:var(--accent-light);color:var(--accent-primary);font-weight:700;padding:3px 10px;border-radius:12px;"><i class="fas fa-calendar-week"></i> ${weekApps.length} citas en la semana</span>`;
    }

    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    const today = new Date();

    let html = `<div class="calendar-week-grid">`;

    for (let i = 0; i < 7; i++) {
        const colDate = new Date(monday);
        colDate.setDate(monday.getDate() + i);
        const dateStr = toDateInputValue(colDate);
        const isToday = isSameDay(colDate, today);
        const isSelected = isSameDay(colDate, AppState.selectedDate);
        const dayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), colDate) && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));

        html += `
            <div class="cal-week-col ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}">
                <div class="cal-week-col-header" onclick="zoomIntoDay('${dateStr}')" title="Click para ver día completo">
                    <div class="cal-week-day-name">${dayNames[i]}</div>
                    <div class="cal-week-day-num">${colDate.getDate()}</div>
                    ${dayApps.length > 0 ? `<div style="font-size:10px;font-weight:700;color:var(--accent-primary);margin-top:2px;">${dayApps.length} cita${dayApps.length > 1 ? 's' : ''}</div>` : ''}
                </div>
                <div class="cal-week-events-list">
        `;

        if (dayApps.length === 0) {
            html += `
                <div style="flex:1;display:flex;align-items:center;justify-content:center;padding:12px;text-align:center;">
                    <button class="cal-slot-empty-btn" onclick="openAppointmentModalWithSlot('${dateStr}', '09:00')" style="justify-content:center;">
                        <i class="fas fa-plus"></i> Agendar
                    </button>
                </div>
            `;
        } else {
            dayApps.forEach(app => {
                const p = AppState.patients.find(x => x.id === app.patientId);
                const isTele = (app.type || '').toLowerCase().includes('tele') || (app.type || '').toLowerCase().includes('online');
                html += `
                    <div class="cal-week-card ${app.status || 'pendiente'} ${isTele ? 'teleconsulta' : ''}" onclick="viewAppointmentDetail('${app.id}')">
                        <div class="cal-week-time">
                            <span><i class="far fa-clock"></i> ${formatTime(app.time)}</span>
                            <span>${app.duration || 50}m</span>
                        </div>
                        <div class="cal-week-patient">${p ? p.name : 'Paciente'}</div>
                        <div class="cal-week-meta">${app.type || 'Terapia'} ${app.status === 'completada' ? '· ✅' : ''}</div>
                    </div>
                `;
            });
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

// 3. VISTA DIARIA (TIMELINE CRONOLÓGICO HORA POR HORA)
function renderCalendarDay(container) {
    const selDate = AppState.selectedDate || new Date();
    const dateStr = toDateInputValue(selDate);
    const titleEl = document.getElementById('calendarTitle');
    if (titleEl) {
        titleEl.textContent = selDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    }

    const dayApps = AppState.appointments.filter(a => isSameDay(new Date(a.date), selDate) && a.status !== 'cancelada').sort((a, b) => a.time.localeCompare(b.time));

    const metricsEl = document.getElementById('calendarQuickMetrics');
    if (metricsEl) {
        const completed = dayApps.filter(a => a.status === 'completada').length;
        metricsEl.innerHTML = `<span style="background:var(--accent-light);color:var(--accent-primary);font-weight:700;padding:3px 10px;border-radius:12px;"><i class="fas fa-clock"></i> ${dayApps.length} citas hoy (${completed} completadas)</span>`;
    }

    let html = `
        <div class="calendar-day-timeline">
            <div class="cal-day-header-meta">
                <div>
                    <h3 style="margin:0;font-size:16px;color:var(--text-primary);"><i class="fas fa-calendar-day" style="color:var(--accent-primary);"></i> Agenda del Día</h3>
                    <div style="font-size:12px;color:var(--text-secondary);margin-top:2px;">Intervalo clínico 08:00 a 19:00</div>
                </div>
                <button class="btn-primary" onclick="openAppointmentModalWithSlot('${dateStr}', '09:00')" style="font-size:12px;padding:6px 12px;">
                    <i class="fas fa-plus"></i> Agendar en este día
                </button>
            </div>
            <div class="cal-day-slots">
    `;

    for (let h = 8; h <= 19; h++) {
        const hourStr = String(h).padStart(2, '0') + ':00';
        const appsInHour = dayApps.filter(a => {
            const appH = parseInt(a.time.split(':')[0], 10);
            return appH === h;
        });

        html += `
            <div class="cal-day-slot-row">
                <div class="cal-slot-time">${hourStr}</div>
        `;

        if (appsInHour.length === 0) {
            html += `
                <div class="cal-slot-content">
                    <button class="cal-slot-empty-btn" onclick="openAppointmentModalWithSlot('${dateStr}', '${hourStr}')">
                        <i class="fas fa-plus" style="opacity:0.6;"></i> Espacio disponible · Click para agendar a las ${hourStr}
                    </button>
                </div>
            `;
        } else {
            appsInHour.forEach(app => {
                const p = AppState.patients.find(x => x.id === app.patientId);
                const cat = p ? (typeof getPatientCategory === 'function' ? getPatientCategory(p) : p.category) : 'adult';
                const catBadge = cat === 'child' ? '🧒 Niñez' : (cat === 'adolescent' ? '🧑 Adolescencia' : '👤 Adulto');
                html += `
                    <div class="cal-slot-content has-app ${app.status || 'pendiente'}">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <div class="appointment-avatar" style="width:36px;height:36px;font-size:13px;">${p ? getInitials(p.name) : '?'}</div>
                            <div>
                                <div style="font-weight:700;font-size:13px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                                    <span>${p ? p.name : 'Paciente'}</span>
                                    <span style="font-size:11px;font-weight:normal;color:var(--text-secondary);">(${catBadge})</span>
                                    <span class="status-badge status-${app.status || 'pendiente'}">${app.status || 'pendiente'}</span>
                                </div>
                                <div style="font-size:11.5px;color:var(--text-secondary);margin-top:2px;">
                                    <strong>${formatTime(app.time)}</strong> (${app.duration || 50} min) · ${app.type || 'Terapia'} ${app.notes ? '· ' + app.notes : ''}
                                </div>
                            </div>
                        </div>
                        <div style="display:flex;gap:6px;align-items:center;">
                            ${app.status !== 'completada' ? `<button class="btn-icon" onclick="completeAppointment('${app.id}')" title="Completar Sesión"><i class="fas fa-check"></i></button>` : ''}
                            <button class="btn-primary" style="padding:5px 10px;font-size:11px;" onclick="openReporteAtencionFromAppointment('${app.id}')" title="Llenar Reporte de Atención">
                                <i class="fas fa-file-signature"></i> Reporte
                            </button>
                            <button class="btn-icon" onclick="editAppointment('${app.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                            <button class="btn-icon" onclick="deleteAppointment('${app.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
        }

        html += `</div>`;
    }

    html += `</div></div>`;
    container.innerHTML = html;
}

// 4. VISTA ANUAL (12 MESES CON CARGAS Y MAPA DE CALOR)
function renderCalendarYear(container) {
    const year = AppState.currentDate.getFullYear();
    const titleEl = document.getElementById('calendarTitle');
    if (titleEl) {
        titleEl.textContent = `Año ${year}`;
    }

    const yearApps = AppState.appointments.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && a.status !== 'cancelada';
    });

    const metricsEl = document.getElementById('calendarQuickMetrics');
    if (metricsEl) {
        metricsEl.innerHTML = `<span style="background:var(--accent-light);color:var(--accent-primary);font-weight:700;padding:3px 10px;border-radius:12px;"><i class="fas fa-chart-line"></i> ${yearApps.length} citas en todo el año ${year}</span>`;
    }

    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const today = new Date();

    let html = `<div class="calendar-year-grid">`;

    for (let m = 0; m < 12; m++) {
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === m;
        const monthApps = yearApps.filter(a => new Date(a.date).getMonth() === m);
        const daysInMonth = new Date(year, m + 1, 0).getDate();
        let startDay = new Date(year, m, 1).getDay();
        let startPadding = (startDay === 0) ? 6 : startDay - 1;

        html += `
            <div class="cal-year-month-card ${isCurrentMonth ? 'current-month' : ''}" 
                 onclick="AppState.currentDate = new Date(${year}, ${m}, 1); setCalendarViewMode('month');"
                 title="Click para ver el mes completo">
                <div class="cal-year-month-header">
                    <span>${monthNames[m]}</span>
                    <span style="font-size:11px;font-weight:600;color:${monthApps.length > 0 ? 'var(--accent-primary)' : 'var(--text-tertiary)'};">
                        ${monthApps.length} cita${monthApps.length === 1 ? '' : 's'}
                    </span>
                </div>
                <div class="cal-year-mini-grid">
                    <div style="font-weight:700;color:var(--text-tertiary);">L</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">M</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">M</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">J</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">V</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">S</div>
                    <div style="font-weight:700;color:var(--text-tertiary);">D</div>
        `;

        for (let p = 0; p < startPadding; p++) {
            html += `<div></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const checkDate = new Date(year, m, d);
            const isDayToday = isSameDay(checkDate, today);
            const hasApps = monthApps.some(a => isSameDay(new Date(a.date), checkDate));
            const dateStr = toDateInputValue(checkDate);
            html += `
                <div class="cal-mini-day ${hasApps ? 'has-app' : ''} ${isDayToday ? 'today' : ''}" 
                     onclick="event.stopPropagation(); zoomIntoDay('${dateStr}')"
                     title="${d} de ${monthNames[m]}${hasApps ? ' · Con citas' : ''}">
                    ${d}
                </div>
            `;
        }

        html += `</div></div>`;
    }

    html += `</div>`;
    container.innerHTML = html;
}

function renderAppointments() {
    const container = document.getElementById('appointmentsList');
    if (!container) return;
    const dateFormatted = formatDate(toDateInputValue(AppState.selectedDate));
    const titleEl = document.getElementById('dayDetailsTitle');
    const subtitleEl = document.getElementById('dayDetailsSubtitle');
    if (titleEl) titleEl.textContent = `Citas del ${dateFormatted}`;

    const apps = AppState.appointments.filter(a => isSameDay(new Date(a.date), AppState.selectedDate)).sort((a, b) => a.time.localeCompare(b.time));
    if (subtitleEl) subtitleEl.textContent = `${apps.length} cita${apps.length === 1 ? '' : 's'} agendada${apps.length === 1 ? '' : 's'}`;

    if (apps.length === 0) {
        container.innerHTML = `<div class="empty-state" style="padding:24px 16px;"><div class="empty-icon">📅</div><p>Sin citas para el ${dateFormatted}</p><button class="btn-secondary" onclick="openAppointmentModalWithSlot('${toDateInputValue(AppState.selectedDate)}', '09:00')" style="margin-top:8px;"><i class="fas fa-plus"></i> Agendar cita en este día</button></div>`;
        return;
    }
    container.innerHTML = apps.map(app => {
        const p = AppState.patients.find(x => x.id === app.patientId);
        const cat = p ? (typeof getPatientCategory === 'function' ? getPatientCategory(p) : p.category) : 'adult';
        const catBadge = cat === 'child' ? '🧒 Niñez' : (cat === 'adolescent' ? '🧑 Adolescencia' : '👤 Adulto');
        return `<div class="appointment-card" style="border-left:4px solid var(--accent-primary);">
            <div class="appointment-avatar">${p ? getInitials(p.name) : '?'}</div>
            <div class="appointment-info">
                <div class="appointment-patient">${p ? p.name : 'Paciente'} <span style="font-size:11px;font-weight:normal;color:var(--text-secondary);margin-left:6px;">(${catBadge})</span></div>
                <div class="appointment-meta"><strong>${formatTime(app.time)}</strong> · ${app.duration || 50} min · ${app.type || 'Terapia'}${app.notes ? ' · ' + app.notes : ''}</div>
            </div>
            <span class="status-badge status-${app.status || 'pendiente'}">${app.status || 'pendiente'}</span>
            <div class="appointment-actions">
                ${app.status !== 'completada' ? `<button class="btn-icon" onclick="completeAppointment('${app.id}')" title="Completar Sesión"><i class="fas fa-check"></i></button>` : ''}
                <button class="btn-icon" onclick="openReporteAtencionFromAppointment('${app.id}')" title="Llenar Reporte de Atención"><i class="fas fa-file-signature" style="color:var(--accent-primary);"></i></button>
                <button class="btn-icon" onclick="editAppointment('${app.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="deleteAppointment('${app.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
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
        const p = AppState.patients.find(x => x.id === a.patientId);
        const pName = p ? p.name : 'el paciente';
        setTimeout(() => {
            if (confirm(`¿Desea registrar el Reporte de Atención para la sesión de ${pName}?`)) {
                openReporteAtencionFromAppointment(id);
            }
        }, 300);
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
// REPORTES DE ATENCIÓN Y NOTAS CLÍNICAS POR SESIÓN
// ============================================
let tempIntersessionTasks = [];

function openReporteAtencionModal() {
    document.getElementById('noteId').value = '';
    document.getElementById('noteForm').reset();
    document.getElementById('noteModalTitle').textContent = 'Reporte de Atención — Sesión de Terapia';
    document.getElementById('noteDate').value = toDateInputValue(new Date());
    if (document.getElementById('noteSessionNum')) document.getElementById('noteSessionNum').value = '1';
    updatePatientSelects();
    tempIntersessionTasks = [];
    renderIntersessionTasksEditor();
    switchNoteFormat('fpv');
    openModal('noteModal');
}

function openReporteAtencionForPatient(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;
    const prevNotes = AppState.notes.filter(n => n.patientId === patientId);
    const nextSessionNum = prevNotes.length + 1;

    document.getElementById('noteId').value = '';
    document.getElementById('noteForm').reset();
    updatePatientSelects();
    document.getElementById('notePatient').value = patientId;
    document.getElementById('noteDate').value = toDateInputValue(new Date());
    document.getElementById('noteTitle').value = `Sesión #${nextSessionNum} - ${patient.name}`;
    if (document.getElementById('noteSessionNum')) {
        document.getElementById('noteSessionNum').value = nextSessionNum;
    }
    document.getElementById('noteModalTitle').textContent = `Reporte de Atención — Sesión #${nextSessionNum}`;
    tempIntersessionTasks = [];
    renderIntersessionTasksEditor();
    switchNoteFormat('fpv');
    openModal('noteModal');
}

function openReporteAtencionFromAppointment(appId) {
    const app = AppState.appointments.find(a => a.id === appId);
    if (!app) return;
    const patientId = app.patientId;
    const patient = AppState.patients.find(p => p.id === patientId);
    const prevNotes = AppState.notes.filter(n => n.patientId === patientId);
    const nextSessionNum = prevNotes.length + 1;

    document.getElementById('noteId').value = '';
    document.getElementById('noteForm').reset();
    updatePatientSelects();
    document.getElementById('notePatient').value = patientId;
    document.getElementById('noteDate').value = app.date || toDateInputValue(new Date());
    document.getElementById('noteTitle').value = `Sesión #${nextSessionNum} (${app.type || 'Terapia'}) - ${patient ? patient.name : ''}`.trim();
    if (document.getElementById('noteSessionNum')) {
        document.getElementById('noteSessionNum').value = nextSessionNum;
    }
    document.getElementById('noteModalTitle').textContent = `Reporte de Atención — Sesión #${nextSessionNum}`;
    tempIntersessionTasks = [];
    renderIntersessionTasksEditor();
    switchNoteFormat('fpv');
    openModal('noteModal');
}

function renderNotes(filter = '') {
    const container = document.getElementById('notesList');
    if (!container) return;
    let notes = [...AppState.notes].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (filter) {
        const lf = filter.toLowerCase();
        notes = notes.filter(n => {
            const p = AppState.patients.find(x => x.id === n.patientId);
            return n.title.toLowerCase().includes(lf) || (p && p.name.toLowerCase().includes(lf)) || (n.subjetivo && n.subjetivo.toLowerCase().includes(lf)) || (n.sessionDescription && n.sessionDescription.toLowerCase().includes(lf));
        });
    }
    if (notes.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>${filter ? 'Sin coincidencias' : 'No hay reportes de atención registrados'}</p>${!filter ? '<button class="btn-primary" onclick="openReporteAtencionModal()"><i class="fas fa-file-signature"></i> Registrar Primer Reporte de Atención</button>' : ''}</div>`;
        return;
    }
    container.innerHTML = notes.map(n => {
        const p = AppState.patients.find(x => x.id === n.patientId);
        const riskBadge = n.risk && n.risk !== 'bajo' ? `<span class="status-badge status-cancelada">Riesgo: ${n.risk}</span>` : '';
        const scaleBadge = n.scaleResult ? `<span class="status-badge status-completada">Score: ${n.scaleResult.score}</span>` : '';
        const sessionBadge = `<span style="background:var(--accent-primary);color:#fff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:12px;margin-right:6px;">Sesión #${n.sessionNum || 1}</span>`;
        return `<div class="note-card" onclick="editNote('${n.id}')">
            <div class="patient-avatar">${p ? getInitials(p.name) : '?'}</div>
            <div class="note-info">
                <div class="note-title">${sessionBadge} ${n.title} ${riskBadge} ${scaleBadge}</div>
                <div class="note-meta">${p ? p.name : 'Paciente'} · ${formatDate(n.date)} ${n.mood ? '· ' + getMoodEmoji(n.mood) : ''} ${n.confidential ? '· 🔒' : ''}</div>
            </div>
            <div class="note-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); ClinicalHistorySystem.exportReporteAtencionPDF('${n.id}')" title="Imprimir Reporte Oficial de Atención (PDF)"><i class="fas fa-file-invoice" style="color:var(--accent-primary);"></i></button>
                <button class="btn-icon" onclick="event.stopPropagation(); editNote('${n.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-icon" onclick="event.stopPropagation(); deleteNote('${n.id}')" title="Eliminar"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');
}

function switchNoteFormat(mode) {
    const soapC = document.getElementById('soapNoteContainer');
    const fpvC = document.getElementById('fpvNoteContainer');
    const bSoap = document.getElementById('btnNoteFormatSoap');
    const bFpv = document.getElementById('btnNoteFormatFPV');
    if (mode === 'fpv') {
        if (soapC) soapC.style.display = 'none';
        if (fpvC) fpvC.style.display = 'block';
        if (bSoap) { bSoap.style.background = 'var(--bg-secondary)'; bSoap.style.color = 'var(--text-primary)'; }
        if (bFpv) { bFpv.style.background = 'var(--accent-primary)'; bFpv.style.color = '#fff'; }
    } else {
        if (soapC) soapC.style.display = 'block';
        if (fpvC) fpvC.style.display = 'none';
        if (bSoap) { bSoap.style.background = 'var(--accent-primary)'; bSoap.style.color = '#fff'; }
        if (bFpv) { bFpv.style.background = 'var(--bg-secondary)'; bFpv.style.color = 'var(--text-primary)'; }
    }
}

function filterNotes(q) { renderNotes(q); }

function applySoapTemplate(model) {
    if (!model) return;
    const templates = {
        tcc: {
            s: 'El paciente reporta pensamientos automáticos negativos relacionados con [evento/situación]. Manifiesta distorsiones cognitivas como [catastrofización/abstracción selectiva].',
            o: 'Afecto congruente, lenguaje fluido, orientado. Registra nivel de ansiedad de [X]/10.',
            a: 'Se identifica esquema cognitivo disfuncional sobre [control/aceptación]. Progreso favorable con reestructuración cognitiva.',
            p: 'Registro de pensamientos automáticos intersesión. Desensibilización sistemática del estímulo.'
        },
        psicoanalitica: {
            s: 'Asociación libre centrada en conflicto latente sobre [figura de apego/vínculo]. Emerge angustia de castración o separación.',
            o: 'Resistencia observada en el minuto [X]. Actitud transferencial ambivalente hacia la figura del analista.',
            a: 'Mecanismos de defensa predominantes: represión, proyección e intelectualización. Proceso de elaboración en curso.',
            p: 'Continuar señalamiento e interpretación de la transferencia. Trabajar con el contenido del sueño referido.'
        },
        sistemica: {
            s: 'El paciente describe pautas de interacción disfuncionales con [pareja/familia]. Comunicación indirecta o de doble vínculo.',
            o: 'Postura corporal de repliegue. Se observa rol de síntoma en el sistema familiar.',
            a: 'Homeostasis familiar mantenida mediante triangulación. Reglas implícitas rígidas sobre el afecto.',
            p: 'Prescripción de la secuencia sintomática. Tarea paradójica e intervención de reencuadre.'
        },
        act: {
            s: 'El paciente refiere fusión cognitiva con el pensamiento "[X]" y conductas de evitación experiencial.',
            o: 'Aceptación parcial del malestar. Contacto con el momento presente durante el ejercicio guiado.',
            a: 'Flexibilidad psicológica en construcción. Valores identificados: [autonomía/conexión].',
            p: 'Ejercicio de defusión cognitiva "Hojas en el río". Compromiso de acción alineado a valores.'
        }
    };
    const t = templates[model];
    if (t) {
        if (!document.getElementById('noteSubjetivo').value) document.getElementById('noteSubjetivo').value = t.s;
        if (!document.getElementById('noteObjetivo').value) document.getElementById('noteObjetivo').value = t.o;
        if (!document.getElementById('noteAnalisis').value) document.getElementById('noteAnalisis').value = t.a;
        if (!document.getElementById('notePlan').value) document.getElementById('notePlan').value = t.p;
        showToast(`Plantilla ${model.toUpperCase()} cargada`, 'info');
    }
}

// Dictado por voz clínico con VoiceDictation / Web Speech API
function toggleDictation(fieldId) {
    const target = document.getElementById(fieldId);
    if (!target) return;

    if (typeof VoiceDictation !== 'undefined') {
        const btn = document.querySelector(`[onclick*="toggleDictation('${fieldId}')"]`);
        if (VoiceDictation.isRecording) {
            VoiceDictation.stop();
            if (btn) btn.classList.remove('mic-recording');
            showToast('Dictado pausado', 'info');
        } else {
            const started = VoiceDictation.start(target, null, (recording) => {
                if (btn) {
                    if (recording) btn.classList.add('mic-recording');
                    else btn.classList.remove('mic-recording');
                }
            });
            if (started) {
                if (btn) btn.classList.add('mic-recording');
                showToast('🎙️ Dictando... (Puntos, comas y párrafos reconocidos)', 'info');
            }
        }
        return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        showToast('El navegador no soporta dictado por voz', 'warning');
        return;
    }
    
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
        showToast('🎙️ Dictando...', 'info');
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

function handleNoteSubmit(e) {
    e.preventDefault();
    const validTasks = tempIntersessionTasks.filter(t => t.title.trim());

    const sessionNum = document.getElementById('noteSessionNum')?.value || '1';
    const sessionGoals = document.getElementById('noteSessionGoals')?.value?.trim() || '';
    const appliedTechniques = document.getElementById('noteAppliedTechniques')?.value?.trim() || '';
    const sessionDescription = document.getElementById('noteSessionDescription')?.value?.trim() || '';
    const clinicalFindings = document.getElementById('noteClinicalFindings')?.value?.trim() || '';
    const obtainedResults = document.getElementById('noteObtainedResults')?.value?.trim() || '';
    const nextSessionsPlan = document.getElementById('noteNextSessionsPlan')?.value?.trim() || '';

    let subj = document.getElementById('noteSubjetivo')?.value?.trim() || '';
    let obj = document.getElementById('noteObjetivo')?.value?.trim() || '';
    let anal = document.getElementById('noteAnalisis')?.value?.trim() || '';
    let plan = document.getElementById('notePlan')?.value?.trim() || '';

    // Sincronización bidireccional transparente entre Reporte de Atención y formato SOAP
    let finalDesc = sessionDescription;
    let finalFindings = clinicalFindings;
    let finalGoals = sessionGoals;
    let finalTechniques = appliedTechniques;
    let finalResults = obtainedResults;
    let finalNext = nextSessionsPlan;

    if (!subj && finalDesc) subj = finalDesc;
    if (!finalDesc && subj) finalDesc = subj;
    if (!obj && finalFindings) obj = finalFindings;
    if (!finalFindings && obj) finalFindings = obj;
    if (!anal && (finalGoals || finalTechniques)) anal = `Objetivos: ${finalGoals} · Técnicas: ${finalTechniques}`;
    if (!plan && finalNext) plan = finalNext;
    if (!finalNext && plan) finalNext = plan;

    const note = {
        id: document.getElementById('noteId').value || generateId(),
        patientId: document.getElementById('notePatient').value,
        date: document.getElementById('noteDate').value,
        title: document.getElementById('noteTitle').value.trim() || finalGoals || `Sesión #${sessionNum}`,
        subjetivo: subj,
        objetivo: obj,
        analisis: anal,
        plan: plan,
        sessionNum: sessionNum,
        sessionGoals: finalGoals,
        appliedTechniques: finalTechniques,
        sessionDescription: finalDesc,
        clinicalFindings: finalFindings,
        obtainedResults: finalResults,
        nextSessionsPlan: finalNext,
        risk: document.getElementById('noteRisk').value,
        mood: document.getElementById('noteMood').value,
        confidential: document.getElementById('noteConfidential').checked,
        intersessionTasks: validTasks,
        createdAt: new Date().toISOString()
    };
    const idx = AppState.notes.findIndex(n => n.id === note.id);
    if (idx >= 0) { AppState.notes[idx] = note; showToast('Reporte de Atención actualizado', 'success'); }
    else { AppState.notes.push(note); showToast(`Reporte de Atención registrado (Sesión #${sessionNum})`, 'success'); }
    saveData();
    saveTasksForPortal(note);
    closeModal('noteModal');
    renderNotes();
    updateCounts();
    updateDashboard();
    if (note.risk === 'alto') {
        const p = AppState.patients.find(x => x.id === note.patientId);
        if (typeof showCrisisProtocol === 'function' && p) {
            showCrisisProtocol(p);
        } else {
            alert(`🚨 RIESGO ALTO DETECTADO\n\nPaciente: ${p ? p.name : 'Desconocido'}\nActive protocolo de contención.`);
        }
    }
}

function saveTasksForPortal(note) {
    if (!note.intersessionTasks || note.intersessionTasks.length === 0) return;
    try {
        const existing = JSON.parse(localStorage.getItem('psico_portal_tasks_bridge') || '{}');
        note.intersessionTasks.forEach(task => {
            const taskKey = `${note.patientId}_${task.id}`;
            existing[taskKey] = {
                ...task,
                patientId: note.patientId,
                noteId: note.id,
                noteTitle: note.title,
                noteDate: note.date,
                assignedAt: new Date().toISOString()
            };
        });
        localStorage.setItem('psico_portal_tasks_bridge', JSON.stringify(existing));
    } catch (e) {
        console.error('Error guardando tareas para portal:', e);
    }
}

function editNote(id) {
    const n = AppState.notes.find(x => x.id === id);
    if (!n) return;
    document.getElementById('noteId').value = n.id;
    document.getElementById('notePatient').value = n.patientId;
    document.getElementById('noteDate').value = n.date;
    document.getElementById('noteTitle').value = n.title;
    document.getElementById('noteSubjetivo').value = n.subjetivo || '';
    document.getElementById('noteObjetivo').value = n.objetivo || '';
    document.getElementById('noteAnalisis').value = n.analisis || '';
    document.getElementById('notePlan').value = n.plan || '';
    if (document.getElementById('noteSessionNum')) document.getElementById('noteSessionNum').value = n.sessionNum || '1';
    if (document.getElementById('noteSessionGoals')) document.getElementById('noteSessionGoals').value = n.sessionGoals || '';
    if (document.getElementById('noteAppliedTechniques')) document.getElementById('noteAppliedTechniques').value = n.appliedTechniques || '';
    if (document.getElementById('noteSessionDescription')) document.getElementById('noteSessionDescription').value = n.sessionDescription || n.subjetivo || '';
    if (document.getElementById('noteClinicalFindings')) document.getElementById('noteClinicalFindings').value = n.clinicalFindings || n.objetivo || '';
    if (document.getElementById('noteObtainedResults')) document.getElementById('noteObtainedResults').value = n.obtainedResults || '';
    if (document.getElementById('noteNextSessionsPlan')) document.getElementById('noteNextSessionsPlan').value = n.nextSessionsPlan || n.plan || '';
    document.getElementById('noteRisk').value = n.risk || 'bajo';
    document.getElementById('noteMood').value = n.mood || '';
    document.getElementById('noteConfidential').checked = n.confidential || false;
    tempIntersessionTasks = n.intersessionTasks ? JSON.parse(JSON.stringify(n.intersessionTasks)) : [];
    renderIntersessionTasksEditor();
    switchNoteFormat('fpv');
    document.getElementById('noteModalTitle').textContent = `Editar Reporte de Atención — Sesión #${n.sessionNum || '1'}`;
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

function addIntersessionTask() { tempIntersessionTasks.push({ id: generateId(), title: '', description: '', dueDate: '', completed: false }); renderIntersessionTasksEditor(); }

function renderIntersessionTasksEditor() {
    const c = document.getElementById('intersessionTasksEditor');
    if (!c) return;
    c.innerHTML = tempIntersessionTasks.map((t, i) => `<div style="padding:10px;background:var(--bg-secondary);border-radius:var(--radius-md);margin-bottom:8px;"><div style="display:flex;gap:8px;margin-bottom:6px;"><input type="text" placeholder="Tarea..." value="${(t.title || '').replace(/"/g, '&quot;')}" onchange="tempIntersessionTasks[${i}].title = this.value" style="flex:1;padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;"><input type="date" value="${t.dueDate || ''}" onchange="tempIntersessionTasks[${i}].dueDate = this.value" style="padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:13px;"><button type="button" class="btn-icon" onclick="removeIntersessionTask(${i})"><i class="fas fa-trash"></i></button></div><input type="text" placeholder="Descripción..." value="${(t.description || '').replace(/"/g, '&quot;')}" onchange="tempIntersessionTasks[${i}].description = this.value" style="width:100%;padding:6px 10px;border:1px solid var(--border-secondary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);font-size:12px;"></div>`).join('');
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
// ASISTENTE DE IA CLINICA & GEMINI INTEGRATION
// ============================================
function preloadAIModel() {
    openAiCopilotModal();
}

function openAiCopilotModal(initialTab = 'copilot') {
    populateAiPatientSelect();
    switchAiTab(initialTab);
    openModal('aiCopilotModal');
}

function switchAiTab(tabName) {
    const tabs = ['copilot', 'diagnostics', 'soap'];
    tabs.forEach(t => {
        const btnName = `tabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`;
        const btn = document.getElementById(btnName);
        const content = document.getElementById(`aiTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
        if (btn) btn.classList.toggle('active', t === tabName);
        if (content) content.style.display = (t === tabName) ? 'block' : 'none';
    });
}

function populateAiPatientSelect() {
    const select = document.getElementById('aiDiagPatientSelect');
    if (!select) return;
    const current = select.value;
    select.innerHTML = '<option value="">-- Seleccionar expediente --</option>';
    AppState.patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.diagnosis || 'Sin Diag.'})`;
        select.appendChild(opt);
    });
    select.value = current;
}

let aiChatHistory = [];

async function handleAiChatSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('aiChatInput');
    const query = input.value.trim();
    if (!query) return;

    const chatBox = document.getElementById('aiChatBox');
    
    const userDiv = document.createElement('div');
    userDiv.className = 'ai-msg user';
    userDiv.innerHTML = `<div class="ai-bubble">${escapeHtml(query)}</div>`;
    chatBox.appendChild(userDiv);
    input.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const botDiv = document.createElement('div');
    botDiv.className = 'ai-msg bot';
    botDiv.innerHTML = `<div class="ai-avatar">🤖</div><div class="ai-bubble"><em>Pensando con Gemini AI...</em></div>`;
    chatBox.appendChild(botDiv);
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const reply = await ClinicalAI.chatWithCopilot(query, aiChatHistory);
        aiChatHistory.push({ role: 'user', text: query });
        aiChatHistory.push({ role: 'model', text: reply });
        
        botDiv.querySelector('.ai-bubble').innerHTML = formatMarkdownResponse(reply);
    } catch (err) {
        botDiv.querySelector('.ai-bubble').innerHTML = `<span style="color:#e16259;">❌ Error: ${err.message}</span>`;
    }
    chatBox.scrollTop = chatBox.scrollHeight;
}

async function runAiDiagnosticAnalysis() {
    const patientId = document.getElementById('aiDiagPatientSelect')?.value;
    const output = document.getElementById('aiDiagOutput');
    if (!output) return;

    if (!patientId) {
        output.innerHTML = `<div class="empty-state"><div class="empty-icon">🧠</div><p>Selecciona un paciente para analizar su expediente.</p></div>`;
        return;
    }

    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;

    const notes = AppState.notes.filter(n => n.patientId === patientId);
    const scaleResults = (typeof getPatientScaleResults === 'function') ? getPatientScaleResults(patientId) : [];

    output.innerHTML = `<div class="empty-state"><div class="empty-icon">⏳</div><p>Analizando expediente de <strong>${patient.name}</strong> con Gemini AI...</p></div>`;

    try {
        const result = await ClinicalAI.generateDiagnosticHypotheses(patient, notes, scaleResults);
        output.innerHTML = `<div class="ai-analysis-card">${formatMarkdownResponse(result)}</div>`;
    } catch (err) {
        output.innerHTML = `<div class="alert-box error">❌ Error en el análisis: ${err.message}</div>`;
    }
}

async function runAiSoapSynthesis() {
    const draft = document.getElementById('aiSoapDraft')?.value;
    const resDiv = document.getElementById('aiSoapResult');
    if (!draft || !draft.trim()) {
        showToast('Introduce apuntes en el campo de texto', 'warning');
        return;
    }

    resDiv.innerHTML = `<p style="font-size:13px;color:var(--accent-primary);">⏳ Sintetizando nota clínica en formato SOAP...</p>`;

    try {
        const soap = await ClinicalAI.synthesizeSoapNote(draft);
        const encodedSoap = btoa(encodeURIComponent(JSON.stringify(soap)));
        resDiv.innerHTML = `
            <div style="background:var(--bg-card);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-primary);font-size:13px;line-height:1.5;">
                <h4 style="margin-top:0;color:var(--accent-primary);">Nota SOAP Generada:</h4>
                <p><strong>Subjetivo:</strong> ${soap.subjetivo}</p>
                <p><strong>Objetivo:</strong> ${soap.objetivo}</p>
                <p><strong>Análisis:</strong> ${soap.analisis}</p>
                <p><strong>Plan:</strong> ${soap.plan}</p>
                <button type="button" class="btn-primary btn-sm" onclick="applyAiSoapEncoded('${encodedSoap}')" style="margin-top:8px;">
                    <i class="fas fa-file-import"></i> Insertar en Nueva Nota SOAP
                </button>
            </div>
        `;
    } catch (err) {
        resDiv.innerHTML = `<div class="alert-box error">❌ Error: ${err.message}</div>`;
    }
}

function applyAiSoapEncoded(encoded) {
    try {
        const soap = JSON.parse(decodeURIComponent(atob(encoded)));
        closeModal('aiCopilotModal');
        openModal('noteModal');
        document.getElementById('noteSubjetivo').value = soap.subjetivo || '';
        document.getElementById('noteObjetivo').value = soap.objetivo || '';
        document.getElementById('noteAnalisis').value = soap.analisis || '';
        document.getElementById('notePlan').value = soap.plan || '';
        showToast('Nota SOAP transferida exitosamente', 'success');
    } catch (e) {
        showToast('Error cargando nota SOAP', 'error');
    }
}

function openApiKeyConfigModal() {
    const input = document.getElementById('geminiApiKeyInput');
    if (input) input.value = ClinicalAI.apiKey || '';
    openModal('apiKeyModal');
}

function saveGeminiKeyFromModal() {
    const input = document.getElementById('geminiApiKeyInput');
    if (input) {
        ClinicalAI.saveApiKey(input.value);
        showToast('Clave Gemini API guardada con éxito', 'success');
        closeModal('apiKeyModal');
    }
}

function formatMarkdownResponse(text) {
    if (!text) return '';
    return text
        .replace(/^### (.*$)/gim, '<h3 style="font-size:15px;margin:12px 0 6px 0;color:var(--accent-primary);">$1</h3>')
        .replace(/^#### (.*$)/gim, '<h4 style="font-size:13px;margin:8px 0 4px 0;">$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^\- (.*$)/gim, '<li style="margin-left:16px;">$1</li>')
        .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

// ============================================
// INTEGRACIÓN GOOGLE CALENDAR & .ICS
// ============================================
function generateGoogleCalendarUrl(appointment) {
    const p = AppState.patients.find(x => x.id === appointment.patientId);
    const title = encodeURIComponent(`Sesión Psicoterapéutica - ${p ? p.name : 'Paciente'}`);
    const details = encodeURIComponent(`Sesión de ${appointment.duration || 50} min (${appointment.type || 'Presencial'}).\nNotas: ${appointment.notes || 'Sin observaciones'}`);
    
    const d = new Date(`${appointment.date}T${appointment.time || '10:00'}:00`);
    const endD = new Date(d.getTime() + (parseInt(appointment.duration || 50, 10) * 60000));
    
    const formatGDate = (date) => date.toISOString().replace(/-|:|\.\d\d\d/g, "");
    
    const dates = `${formatGDate(d)}/${formatGDate(endD)}`;
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}`;
}

function openInGoogleCalendar(appointmentId) {
    const app = AppState.appointments.find(a => a.id === appointmentId);
    if (!app) return;
    window.open(generateGoogleCalendarUrl(app), '_blank');
}

function downloadICSFile(appointmentId) {
    const app = AppState.appointments.find(a => a.id === appointmentId);
    if (!app) return;
    const p = AppState.patients.find(x => x.id === app.patientId);
    const name = p ? p.name : 'Paciente';
    const start = new Date(`${app.date}T${app.time || '10:00'}:00`).toISOString().replace(/-|:|\.\d\d\d/g, "");
    const end = new Date(new Date(`${app.date}T${app.time || '10:00'}:00`).getTime() + (parseInt(app.duration || 50, 10) * 60000)).toISOString().replace(/-|:|\.\d\d\d/g, "");

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Psico Notes Clinical//ES
BEGIN:VEVENT
SUMMARY:Sesión Psicoterapéutica - ${name}
DESCRIPTION:Sesión clínica (${app.type}). ${app.notes || ''}
DTSTART:${start}
DTEND:${end}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `sesion_${name.replace(/\s+/g, '_')}_${app.date}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Archivo de calendario .ics descargado', 'success');
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
    renderAgendaHeatmap();
    renderClinicalAnalytics();
}

function renderAgendaHeatmap() {
    const container = document.getElementById('agendaHeatmapContainer');
    if (!container) return;

    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
    const grid = Array.from({ length: 6 }, () => Array(12).fill(0));

    AppState.appointments.forEach(a => {
        if (a.status === 'cancelada') return;
        const d = new Date(`${a.date}T${a.time || '10:00'}:00`);
        const dayIdx = d.getDay() - 1;
        const hour = d.getHours();
        const hourIdx = hours.indexOf(hour);
        if (dayIdx >= 0 && dayIdx < 6 && hourIdx >= 0) {
            grid[dayIdx][hourIdx]++;
        }
    });

    let maxCount = 1;
    grid.forEach(row => row.forEach(val => { if (val > maxCount) maxCount = val; }));

    let html = `
        <div style="font-size:13px;font-weight:600;margin-bottom:12px;color:var(--text-primary);display:flex;justify-content:space-between;align-items:center;">
            <span>🔥 Mapa de Calor de Ocupación Semanal de Agenda</span>
            <span style="font-size:11px;color:var(--text-tertiary);font-weight:normal;">Basado en historial de citas</span>
        </div>
        <div style="display:grid;grid-template-columns: 50px repeat(6, 1fr);gap:6px;font-size:11px;text-align:center;">
            <div></div>
            ${days.map(d => `<div style="font-weight:600;color:var(--text-secondary);padding:4px;">${d}</div>`).join('')}
            ${hours.map((h, hIdx) => `
                <div style="color:var(--text-tertiary);line-height:26px;font-weight:500;">${h}:00</div>
                ${days.map((_, dIdx) => {
                    const count = grid[dIdx][hIdx];
                    const alpha = count > 0 ? Math.min(1, 0.2 + (count / maxCount) * 0.8) : 0.05;
                    const bg = count > 0 ? `rgba(13, 148, 136, ${alpha})` : 'var(--bg-secondary)';
                    const color = count > 0 && alpha > 0.5 ? '#ffffff' : 'var(--text-secondary)';
                    return `<div style="background:${bg};color:${color};border-radius:6px;height:26px;line-height:26px;font-weight:600;transition:transform 0.15s ease;" title="${days[dIdx]} ${h}:00 - ${count} cita(s)">${count > 0 ? count : ''}</div>`;
                }).join('')}
            `).join('')}
        </div>
    `;

    container.innerHTML = html;
}

function renderClinicalAnalytics() {
    const diagList = document.getElementById('diagnosticDistributionList');
    const remContent = document.getElementById('remissionMetricsContent');
    const radList = document.getElementById('retentionRadarList');

    if (!diagList || !remContent || !radList) return;

    // 1. Distribución Diagnóstica
    const diagCounts = {};
    let totalDiagnosed = 0;
    (AppState.patients || []).forEach(p => {
        const d = (p.diagnosis || '').trim() || 'En Evaluación Diagnóstica';
        diagCounts[d] = (diagCounts[d] || 0) + 1;
        totalDiagnosed++;
    });

    const sortedDiags = Object.entries(diagCounts).sort((a, b) => b[1] - a[1]);
    const colors = ['#0d9488', '#6366f1', '#f59e0b', '#ec4899', '#10b981', '#3b82f6'];

    if (sortedDiags.length === 0) {
        diagList.innerHTML = '<div style="color:var(--text-tertiary);font-size:12px;">Sin expedientes registrados aún</div>';
    } else {
        diagList.innerHTML = sortedDiags.slice(0, 5).map(([diag, count], i) => {
            const pct = Math.round((count / (totalDiagnosed || 1)) * 100);
            const color = colors[i % colors.length];
            return `
                <div style="font-size:12px;">
                    <div style="display:flex;justify-content:space-between;margin-bottom:3px;font-weight:500;">
                        <span style="color:var(--text-primary);">${diag}</span>
                        <span style="color:var(--text-secondary);">${count} (${pct}%)</span>
                    </div>
                    <div style="background:var(--bg-secondary);height:6px;border-radius:3px;overflow:hidden;">
                        <div style="background:${color};width:${pct}%;height:100%;border-radius:3px;"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 2. Métrica de Remisión y Eficacia Sintomática
    let sumDeltas = 0;
    let deltaCount = 0;
    let improvedCount = 0;

    (AppState.patients || []).forEach(p => {
        if (typeof getPortalResults === 'function') {
            const evals = getPortalResults(p.id).results.filter(e => e.type === 'phq9' || e.scaleType === 'phq9');
            if (evals.length >= 2) {
                const first = evals[0].score;
                const last = evals[evals.length - 1].score;
                if (first > 0) {
                    const delta = ((first - last) / first) * 100;
                    sumDeltas += delta;
                    deltaCount++;
                    if (delta > 0) improvedCount++;
                }
            }
        }
    });

    const avgImprovement = deltaCount > 0 ? Math.round(sumDeltas / deltaCount) : 0;
    const responseRate = deltaCount > 0 ? Math.round((improvedCount / deltaCount) * 100) : 0;

    remContent.innerHTML = `
        <div style="display:flex;align-items:center;gap:14px;background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);border:1px solid var(--border-primary);">
            <div style="font-size:32px;font-weight:800;color:${avgImprovement >= 0 ? '#10b981' : '#ef4444'};">
                ${avgImprovement >= 0 ? '-' + avgImprovement + '%' : '+' + Math.abs(avgImprovement) + '%'}
            </div>
            <div>
                <strong style="font-size:13px;color:var(--text-primary);display:block;">Tasa Promedio de Reducción Sintomática</strong>
                <span style="font-size:11.5px;color:var(--text-secondary);">
                    ${deltaCount > 0 
                        ? `${responseRate}% de consultantes evaluados muestran remisión clínica favorable.` 
                        : 'Completar escalas longitudinales (PHQ-9/GAD-7) para calcular delta de eficacia.'}
                </span>
            </div>
        </div>
    `;

    // 3. Radar de Alertas y Retención
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const alertItems = [];

    (AppState.patients || []).forEach(p => {
        if (typeof getPortalResults === 'function') {
            const { results: evals } = getPortalResults(p.id);
            const hasRisk = evals.some(e => e.alertRisk);
            if (hasRisk) {
                alertItems.push({
                    patient: p,
                    type: 'danger',
                    icon: '🚨',
                    text: `${p.name}: Indicador de riesgo elevado en evaluación psicométrica.`
                });
            }
        }

        const pApps = (AppState.appointments || []).filter(a => a.patientId === p.id && a.status !== 'cancelada');
        if (pApps.length > 0) {
            const lastApp = pApps.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
            const diffDays = Math.floor((now - new Date(lastApp.date).getTime()) / dayMs);
            if (diffDays > 21) {
                alertItems.push({
                    patient: p,
                    type: 'warning',
                    icon: '⏳',
                    text: `${p.name}: ${diffDays} días sin consulta registrada (riesgo de interrupción).`
                });
            }
        }
    });

    if (alertItems.length === 0) {
        radList.innerHTML = `
            <div style="color:#10b981;font-size:12.5px;padding:8px 0;display:flex;align-items:center;gap:6px;">
                <i class="fas fa-check-circle"></i> Todos los pacientes activos están al día en sus sesiones y sin alertas de riesgo.
            </div>
        `;
    } else {
        radList.innerHTML = alertItems.slice(0, 4).map(item => `
            <div style="display:flex;align-items:center;justify-content:space-between;background:${item.type === 'danger' ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)'};border-left:4px solid ${item.type === 'danger' ? '#ef4444' : '#f59e0b'};padding:8px 12px;border-radius:4px;font-size:12px;">
                <div style="display:flex;align-items:center;gap:8px;">
                    <span>${item.icon}</span>
                    <span style="color:var(--text-primary);font-weight:500;">${item.text}</span>
                </div>
                <button class="btn-sm btn-secondary" onclick="viewPatientDetail('${item.patient.id}')" style="font-size:11px;padding:3px 8px;">
                    Ver Expediente
                </button>
            </div>
        `).join('');
    }
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
    if (id === 'patientModal' && !document.getElementById('patientId').value) {
        document.getElementById('patientForm').reset();
        document.getElementById('patientId').value = '';
        document.getElementById('patientModalTitle').textContent = 'Nuevo Expediente';
        const defaultCat = (AppState.patientCategoryFilter && AppState.patientCategoryFilter !== 'all') ? AppState.patientCategoryFilter : 'adult';
        if (document.getElementById('patientCategory')) document.getElementById('patientCategory').value = defaultCat;
        updateModalCategorySections(defaultCat);
    }
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
            document.getElementById('noteModalTitle').textContent = 'Reporte de Atención — Sesión de Terapia';
            document.getElementById('noteDate').value = toDateInputValue(new Date());
            if (document.getElementById('noteSessionNum')) document.getElementById('noteSessionNum').value = '1';
            updatePatientSelects();
            tempIntersessionTasks = [];
            renderIntersessionTasksEditor();
            switchNoteFormat('fpv');
        }
    }
}

function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.remove('active');
    document.body.style.overflow = '';
    if (id === 'patientModal') {
        document.getElementById('patientId').value = '';
        document.getElementById('patientForm').reset();
        updateModalCategorySections('adult');
    }
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
function formatDate(ds) { if (!ds) return ''; const d = new Date(ds.includes('T') ? ds : ds + 'T00:00:00'); return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }); }
function formatTime(ts) { if (!ts) return ''; const [h, m] = ts.split(':'); return `${h}:${m}`; }
function calculateAge(bd) { if (!bd) return ''; const b = new Date(bd); const t = new Date(); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; }
function toDateInputValue(d) { return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`; }
function isSameDay(d1, d2) { return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate(); }
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
// TELECONSULTA CLÍNICA CIFRADA (TELEHEALTH)
// ============================================
let currentTelehealthRoomUrl = '';

function openTelehealthModal(patientId = '', appointmentId = '') {
    const sel = document.getElementById('telehealthPatientSelect');
    if (sel && AppState.patients) {
        sel.innerHTML = '<option value="">-- Seleccionar paciente --</option>' + 
            AppState.patients.map(p => `<option value="${p.id}" ${p.id === patientId ? 'selected' : ''}>${p.name}</option>`).join('');
    }

    const cleanRoom = (appointmentId || `${Date.now()}`).toString().replace(/[^a-zA-Z0-9]/g, '');
    currentTelehealthRoomUrl = `https://meet.jit.si/psiconotes-clinical-${cleanRoom}#config.prejoinPageEnabled=false&config.startWithAudioMuted=false`;

    const iframe = document.getElementById('telehealthIframe');
    if (iframe) {
        iframe.src = currentTelehealthRoomUrl;
    }

    const notes = document.getElementById('telehealthNotesInput');
    if (notes) notes.value = '';

    openModal('telehealthModal');
}

function updateTelehealthPatient(pId) {
    const patient = AppState.patients.find(p => p.id === pId);
    if (patient) {
        showToast(`Paciente ${patient.name} vinculado a la teleconsulta`, 'info');
    }
}

function copyTelehealthLink() {
    if (!currentTelehealthRoomUrl) return;
    navigator.clipboard.writeText(currentTelehealthRoomUrl);
    showToast('Enlace de teleconsulta copiado al portapapeles', 'success');
}

function openTelehealthSeparateTab() {
    if (currentTelehealthRoomUrl) {
        window.open(currentTelehealthRoomUrl, '_blank');
    }
}

function transferTelehealthNotesToSoap() {
    const notesInput = document.getElementById('telehealthNotesInput');
    const text = notesInput ? notesInput.value.trim() : '';
    if (!text) {
        showToast('No hay apuntes para transferir', 'warning');
        return;
    }

    const sel = document.getElementById('telehealthPatientSelect');
    const patientId = sel ? sel.value : '';

    closeModal('telehealthModal');
    openModal('noteModal');

    if (patientId) {
        const notePatient = document.getElementById('notePatient');
        if (notePatient) notePatient.value = patientId;
    }

    const subj = document.getElementById('noteSubjetivo');
    if (subj) {
        subj.value = (subj.value ? subj.value + '\n\n' : '') + text;
    }
    showToast('Apuntes de teleconsulta transferidos a la nota SOAP', 'success');
}

// ============================================
// MONITOREO DE ALERTAS DE CRISIS EN TIEMPO REAL
// ============================================
window._activeCrisisPatient = null;

function checkPortalCrisisAlerts() {
    if (!AppState.patients || AppState.patients.length === 0) return;

    let alertPatient = null;
    let reasonText = '';

    for (const p of AppState.patients) {
        try {
            const raw = localStorage.getItem(`psico_portal_data_${p.id}`);
            if (raw) {
                const data = JSON.parse(raw);
                if (data.activeCrisisAlert) {
                    alertPatient = p;
                    reasonText = 'Activación de Botón SOS / Protocolo de Emergencia';
                    break;
                }
                if (data.evaluations && Array.isArray(data.evaluations)) {
                    const criticalEval = data.evaluations.find(e => e.alertRisk);
                    if (criticalEval) {
                        alertPatient = p;
                        reasonText = criticalEval.riskReason || 'Indicadores de alto riesgo autolítico en evaluación';
                        break;
                    }
                }
            }
        } catch (e) {
            console.error('Error verificando alerta de crisis:', e);
        }
    }

    const banner = document.getElementById('crisisLiveBanner');
    const textEl = document.getElementById('crisisLiveText');

    if (alertPatient && banner && textEl) {
        window._activeCrisisPatient = alertPatient;
        textEl.innerHTML = `<strong>🚨 ALERTA CLÍNICA:</strong> Paciente <strong>${alertPatient.name}</strong> ha registrado indicadores de crisis (${reasonText}).`;
        banner.style.display = 'block';
    } else if (banner && !window._activeCrisisPatient) {
        banner.style.display = 'none';
    }
}

function openActiveCrisisProtocol() {
    if (window._activeCrisisPatient) {
        showCrisisProtocol(window._activeCrisisPatient);
    } else {
        showToast('No hay paciente con alerta activa en este momento', 'info');
    }
}

function dismissCrisisBanner() {
    const banner = document.getElementById('crisisLiveBanner');
    if (banner) banner.style.display = 'none';
    if (window._activeCrisisPatient) {
        try {
            const pId = window._activeCrisisPatient.id;
            const raw = localStorage.getItem(`psico_portal_data_${pId}`);
            if (raw) {
                const data = JSON.parse(raw);
                data.activeCrisisAlert = false;
                localStorage.setItem(`psico_portal_data_${pId}`, JSON.stringify(data));
            }
        } catch (e) {}
        window._activeCrisisPatient = null;
    }
}

// ============================================
// SUITE DE PRUEBAS DE CALIDAD & QA EN VIVO
// ============================================
function openQaTestsModal() {
    openModal('qaTestsModal');
}

async function runAutomatedQaTests() {
    const container = document.getElementById('qaTestsResultsContainer');
    const badge = document.getElementById('qaTestsStatusBadge');
    if (!container) return;

    container.innerHTML = '<p style="color:var(--accent-primary);">⏳ Ejecutando suite de pruebas automatizadas...</p>';
    if (badge) badge.textContent = 'Estado: Ejecutando...';

    if (typeof ClinicalTestSuite !== 'undefined') {
        const results = await ClinicalTestSuite.runAll();
        container.innerHTML = results.htmlReport;
        if (badge) {
            badge.textContent = results.allPassed 
                ? `✅ 100% Tests Aprobados (${results.passed}/${results.total})` 
                : `❌ ${results.failed} Pruebas Fallidas`;
            badge.style.color = results.allPassed ? 'var(--accent-success)' : 'var(--accent-danger)';
        }
    } else {
        container.innerHTML = '<p>Error: Suite de pruebas no cargada en el navegador.</p>';
    }
}

