/**
 * PSICO NOTES CLINICAL - MÓDULO DE FINANZAS
 */

// -------------------------------------------------------------
// UTILIDADES DEFENSIVAS LOCALES (A PRUEBA DE FALLOS)
// -------------------------------------------------------------

function roundCurrency(val) {
    return Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
}

const _localOpenModal = (id) => {
    if (typeof document === 'undefined') return;
    const m = document.getElementById(id);
    if (m) {
        m.classList.add('active');
        if (document.body) {
            document.body.style.overflow = 'hidden';
            document.body.classList.add('has-active-modal');
        }
    }
};

const _localCloseModal = (id) => {
    if (typeof document === 'undefined') return;
    const m = document.getElementById(id);
    if (m) {
        m.classList.remove('active');
        if (document.body && !document.querySelector('.modal.active')) {
            document.body.style.overflow = '';
            document.body.classList.remove('has-active-modal');
        }
    }
};

const _localGenerateId = () => {
    return 'id_' + Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const _localFormatDate = (ds) => {
    if (!ds) return '';
    try {
        const d = new Date(ds.includes('T') ? ds : ds + 'T00:00:00');
        return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return ds; }
};

const _localToDateInputValue = (date) => {
    const d = date ? new Date(date) : new Date();
    return d.toISOString().split('T')[0];
};

const _localShowToast = (msg, type = 'info') => {
    console.log(`[TOAST-${type.toUpperCase()}] ${msg}`);
};

const _localShowConfirmModal = (title, msg, onConfirm) => {
    if (typeof confirm === 'function' && confirm(`${title}\n\n${msg}`)) {
        if (typeof onConfirm === 'function') onConfirm();
    }
};

// -------------------------------------------------------------
// RESOLUCIÓN SEGURA DE UTILIDADES GLOBALES (A PRUEBA DE RECURSIÓN)
// En el navegador, openModal, closeModal, showToast, etc. ya existen en window (declaradas por app.js).
// Proveer fallbacks defensivos ÚNICAMENTE en Node.js o entornos de test donde window no existe.
// -------------------------------------------------------------
if (typeof window === 'undefined') {
    if (typeof globalThis.openModal !== 'function') globalThis.openModal = _localOpenModal;
    if (typeof globalThis.closeModal !== 'function') globalThis.closeModal = _localCloseModal;
    if (typeof globalThis.generateId !== 'function') globalThis.generateId = _localGenerateId;
    if (typeof globalThis.formatDate !== 'function') globalThis.formatDate = _localFormatDate;
    if (typeof globalThis.toDateInputValue !== 'function') globalThis.toDateInputValue = _localToDateInputValue;
    if (typeof globalThis.showToast !== 'function') globalThis.showToast = _localShowToast;
    if (typeof globalThis.showConfirmModal !== 'function') globalThis.showConfirmModal = _localShowConfirmModal;
}


const _memStorage = {};

function _storageGet(key) {
    try {
        if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.getItem === 'function') {
            const val = localStorage.getItem(key);
            if (val !== null && typeof val !== 'undefined') return val;
        }
    } catch {}
    return Object.prototype.hasOwnProperty.call(_memStorage, key) ? _memStorage[key] : null;
}

function _storageSet(key, value) {
    const strVal = String(value);
    _memStorage[key] = strVal;
    try {
        if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.setItem === 'function') {
            localStorage.setItem(key, strVal);
        }
    } catch {}
}

function _storageRemove(key) {
    delete _memStorage[key];
    try {
        if (typeof localStorage !== 'undefined' && localStorage && typeof localStorage.removeItem === 'function') {
            localStorage.removeItem(key);
        }
    } catch {}
}

function getFinanceStorageKey(key) {
    let uid = 'anon';
    try {
        if (typeof AppState !== 'undefined' && AppState && AppState.currentUser && AppState.currentUser.id) {
            uid = AppState.currentUser.id;
        } else {
            const localUser = _storageGet('psico_therapist_id') || _storageGet('psico_active_user_id');
            if (localUser) uid = localUser;
        }
    } catch {}
    return `psico_finance_${key}_${uid}`;
}

// -------------------------------------------------------------
// TRANSACCIONES
// -------------------------------------------------------------

function getFinanceTransactions() {
    try {
        const key = getFinanceStorageKey('transactions');
        let stored = _storageGet(key);
        if (!stored && key !== 'psico_finance_transactions_anon') {
            stored = _storageGet('psico_finance_transactions_anon');
        }
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch { return []; }
    return [];
}

function saveFinanceTransactions(txs) {
    try {
        _storageSet(getFinanceStorageKey('transactions'), JSON.stringify(Array.isArray(txs) ? txs : []));
    } catch (e) {
        console.error('Error guardando transacciones financieras:', e);
    }
}

const DEFAULT_FINANCE_CATEGORIES = [
    'Alquiler Consultorio',
    'Supervisión Clínica',
    'Materiales y Test',
    'Formación y Cursos',
    'Servicios Públicos',
    'Plataformas Online',
    'Otros Egresos'
];

function getFinanceCategories() {
    try {
        const key = getFinanceStorageKey('categories');
        let stored = _storageGet(key);
        if (!stored && key !== 'psico_finance_categories_anon') {
            stored = _storageGet('psico_finance_categories_anon');
        }
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    return [...DEFAULT_FINANCE_CATEGORIES];
}

function saveFinanceCategories(cats) {
    try {
        _storageSet(getFinanceStorageKey('categories'), JSON.stringify(Array.isArray(cats) ? cats : DEFAULT_FINANCE_CATEGORIES));
    } catch (e) {
        console.error('Error guardando categorías financieras:', e);
    }
}

// -------------------------------------------------------------
// TARIFAS POR TIEMPO Y SESIÓN
// -------------------------------------------------------------

const DEFAULT_FINANCE_RATES = [
    { id: 'rate_30', durationMinutes: 30, title: 'Consulta Corta / Seguimiento', amount: 30.00, currency: 'USD', description: 'Sesión de 30 minutos de revisión o seguimiento breve', isDefault: false },
    { id: 'rate_45', durationMinutes: 45, title: 'Consulta Estándar Breve', amount: 40.00, currency: 'USD', description: 'Sesión individual de 45 minutos', isDefault: false },
    { id: 'rate_50', durationMinutes: 50, title: 'Consulta Psicoterapéutica Individual', amount: 45.00, currency: 'USD', description: 'Sesión psicoterapéutica estándar de 50 minutos', isDefault: true },
    { id: 'rate_60', durationMinutes: 60, title: 'Consulta Completa / Pareja', amount: 55.00, currency: 'USD', description: 'Sesión de 60 minutos individual o de pareja', isDefault: false },
    { id: 'rate_90', durationMinutes: 90, title: 'Evaluación Inicial / Familia', amount: 80.00, currency: 'USD', description: 'Sesión extendida de 90 minutos para entrevistas profundas', isDefault: false }
];

function getFinanceRates() {
    try {
        const key = getFinanceStorageKey('rates');
        let stored = _storageGet(key);
        if (!stored && key !== 'psico_finance_rates_anon') {
            stored = _storageGet('psico_finance_rates_anon');
        }
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_FINANCE_RATES));
}

function saveFinanceRates(rates) {
    try {
        _storageSet(getFinanceStorageKey('rates'), JSON.stringify(Array.isArray(rates) ? rates : DEFAULT_FINANCE_RATES));
    } catch (e) {
        console.error('Error guardando tarifas de consulta:', e);
    }
}

// -------------------------------------------------------------
// METAS FINANCIERAS
// -------------------------------------------------------------

const DEFAULT_FINANCE_GOALS = [
    { id: 'goal_monthly_income', title: 'Meta de Ingresos Mensuales', targetAmount: 2000.00, period: 'monthly', category: 'income', description: 'Honorarios brutos del mes en curso' },
    { id: 'goal_sessions_month', title: 'Meta de Sesiones Atendidas', targetAmount: 40, unit: 'sesiones', period: 'monthly', category: 'sessions', description: 'Consultas atendidas y cobradas en el mes' },
    { id: 'goal_savings_fund', title: 'Fondo de Reserva del Consultorio', targetAmount: 1000.00, period: 'total', category: 'balance', description: 'Ahorro acumulado o fondo operativo de emergencia' }
];

function getFinanceGoals() {
    try {
        const key = getFinanceStorageKey('goals');
        let stored = _storageGet(key);
        if (!stored && key !== 'psico_finance_goals_anon') {
            stored = _storageGet('psico_finance_goals_anon');
        }
        if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_FINANCE_GOALS));
}

function saveFinanceGoals(goals) {
    try {
        _storageSet(getFinanceStorageKey('goals'), JSON.stringify(Array.isArray(goals) ? goals : DEFAULT_FINANCE_GOALS));
    } catch (e) {
        console.error('Error guardando metas financieras:', e);
    }
}

// -------------------------------------------------------------
// COBRO AUTOMÁTICO DE CITAS CON TARIFAS DINÁMICAS
// -------------------------------------------------------------

function registerIncomeFromAppointment(appointment) {
    if (!appointment) return;
    const patient = (typeof AppState !== 'undefined' && AppState.patients) 
        ? AppState.patients.find(p => String(p.id) === String(appointment.patientId)) 
        : null;
    const rates = getFinanceRates();
    
    let selectedRate = null;
    if (appointment.rateId) {
        selectedRate = rates.find(r => String(r.id) === String(appointment.rateId));
    }
    if (!selectedRate) {
        selectedRate = rates.find(r => r.isDefault) || (rates.length > 0 ? rates[0] : null);
    }

    const amount = (typeof appointment.price !== 'undefined' && appointment.price !== null && !isNaN(parseFloat(appointment.price)))
        ? parseFloat(appointment.price)
        : (selectedRate ? parseFloat(selectedRate.amount) : 45.00);

    const durationText = appointment.duration ? ` (${appointment.duration} min)` : (selectedRate ? ` (${selectedRate.durationMinutes} min)` : '');
    const rateTitle = appointment.rateTitle || (selectedRate ? selectedRate.title : 'Sesión psicoterapéutica');

    const tx = {
        id: generateId(),
        type: 'income',
        concept: `${rateTitle}${durationText} - ${patient ? patient.name : 'Paciente'}`,
        amount: roundCurrency(amount),
        currency: 'USD',
        category: 'Consulta Clínica',
        patientId: appointment.patientId,
        appointmentId: appointment.id,
        date: appointment.date || toDateInputValue(new Date()),
        createdAt: new Date().toISOString()
    };

    const txs = getFinanceTransactions();
    if (!txs.some(t => String(t.appointmentId) === String(appointment.id))) {
        txs.push(tx);
        saveFinanceTransactions(txs);
        showToast(`Cobro registrado: $${roundCurrency(amount).toFixed(2)} USD`, 'success');
    }
}

// -------------------------------------------------------------
// VISTA PRINCIPAL DE FINANZAS
// -------------------------------------------------------------

function renderFinanceView() {
    if (typeof document === 'undefined') return;
    const container = document.getElementById('financeContent');
    if (!container) return;

    try {
        const _scope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
        if (!_scope._financeActiveTab) {
            _scope._financeActiveTab = 'transactions';
        }
        const currentTab = _scope._financeActiveTab;

        const txs = getFinanceTransactions() || [];
        const categories = getFinanceCategories() || [];

        let totalIncome = 0;
        let totalExpense = 0;

        (Array.isArray(txs) ? txs : []).forEach(t => {
            if (!t) return;
            const val = roundCurrency(t.amount);
            if (t.type === 'income') totalIncome = roundCurrency(totalIncome + val);
            else totalExpense = roundCurrency(totalExpense + val);
        });

        const netBalance = roundCurrency(totalIncome - totalExpense);
        const pendingDebts = getPendingPatientDebts();
        const pendingCount = Array.isArray(pendingDebts) ? pendingDebts.length : 0;

        let tabHtml = '';
        if (currentTab === 'transactions') {
            tabHtml = renderTransactionsTabHtml(txs, totalIncome, totalExpense, netBalance);
        } else if (currentTab === 'debts') {
            tabHtml = renderDebtsTabHtml();
        } else if (currentTab === 'goals') {
            tabHtml = renderGoalsTabHtml(txs, netBalance);
        } else {
            tabHtml = renderRatesTabHtml();
        }

        container.innerHTML = `
            <div class="page-header">
                <div class="page-header-left">
                    <h1 class="page-title">Finanzas de la Consulta</h1>
                    <p class="page-subtitle">Control de ingresos, egresos, tarifas por tiempo y metas de facturación</p>
                </div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;">
                    ${currentTab === 'transactions' ? `
                        <button class="btn-secondary" onclick="openRateModal()" title="Configurar tarifas por tiempo de sesión">
                            <i class="fas fa-stopwatch"></i> Tarifas
                        </button>
                        <button class="btn-secondary" onclick="openGoalModal()" title="Definir u editar metas financieras">
                            <i class="fas fa-bullseye"></i> Metas
                        </button>
                        <button class="btn-secondary" onclick="openCategoriesModal()" title="Gestionar categorías de gastos">
                            <i class="fas fa-tags"></i> Categorías
                        </button>
                        <button class="btn-primary" onclick="openTransactionModal('income')">
                            <i class="fas fa-plus"></i> Ingreso
                        </button>
                        <button class="btn-secondary" onclick="openTransactionModal('expense')" style="background:#e16259;color:white;border:none;">
                            <i class="fas fa-minus"></i> Egreso
                        </button>
                        ${(Array.isArray(txs) && txs.length > 0) ? `
                            <button class="btn-secondary" onclick="clearAllFinanceTransactions()" style="color:#e16259;border-color:rgba(225,98,89,0.3);" title="Vaciar todo el historial financiero">
                                <i class="fas fa-trash-alt"></i> Vaciar
                            </button>
                        ` : ''}
                    ` : currentTab === 'debts' ? `
                        <button class="btn-primary" onclick="settleAllPatientDebtsGlobal()" style="background:#4dab87;border:none;">
                            <i class="fas fa-check-double"></i> Saldar Todas las Deudas
                        </button>
                    ` : currentTab === 'goals' ? `
                        <button class="btn-primary" onclick="openGoalModal()">
                            <i class="fas fa-bullseye"></i> Nueva Meta Financiera
                        </button>
                    ` : `
                        <button class="btn-primary" onclick="openRateModal()">
                            <i class="fas fa-plus"></i> Añadir Tarifa por Tiempo
                        </button>
                    `}
                </div>
            </div>

            <div class="finance-subtabs">
                <button class="finance-tab-btn ${currentTab === 'transactions' ? 'active' : ''}" onclick="switchFinanceTab('transactions')">
                    <i class="fas fa-receipt"></i> Transacciones y Registro
                </button>
                <button class="finance-tab-btn ${currentTab === 'debts' ? 'active' : ''}" onclick="switchFinanceTab('debts')">
                    <i class="fas fa-hand-holding-usd"></i> Cuentas por Cobrar
                    ${pendingCount > 0 ? `<span class="nav-badge" style="background:#e16259;color:white;margin-left:6px;">${pendingCount}</span>` : ''}
                </button>
                <button class="finance-tab-btn ${currentTab === 'goals' ? 'active' : ''}" onclick="switchFinanceTab('goals')">
                    <i class="fas fa-bullseye"></i> Metas Financieras
                </button>
                <button class="finance-tab-btn ${currentTab === 'rates' ? 'active' : ''}" onclick="switchFinanceTab('rates')">
                    <i class="fas fa-stopwatch"></i> Tarifas por Tiempo de Consulta
                </button>
            </div>

            <div id="financeTabContent">
                ${tabHtml}
            </div>
        `;
    } catch (err) {
        console.error('[Finance] Error al renderizar vista de finanzas:', err);
        container.innerHTML = `
            <div class="empty-state" style="padding:48px 20px;text-align:center;">
                <div class="empty-icon">📊</div>
                <h3 style="margin-bottom:8px;color:var(--text-primary);">Módulo de Finanzas</h3>
                <p style="color:var(--text-secondary);max-width:500px;margin:0 auto 16px auto;">
                    Se ha recuperado el estado operativo del módulo contable.
                </p>
                <button class="btn-primary" onclick="switchFinanceTab('transactions')">
                    <i class="fas fa-sync-alt"></i> Actualizar Finanzas
                </button>
            </div>
        `;
    }
}

function switchFinanceTab(tab) {
    const _scope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
    _scope._financeActiveTab = tab;
    renderFinanceView();
}

// -------------------------------------------------------------
// PESTAÑA 1: TRANSACCIONES
// -------------------------------------------------------------

function renderTransactionsTabHtml(txs, totalIncome, totalExpense, netBalance) {
    const _scope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
    const filterType = _scope._financeFilterType || 'all';
    const searchText = (_scope._financeSearchText || '').toLowerCase();
    const safeTxs = Array.isArray(txs) ? txs : [];

    let filteredTxs = safeTxs.filter(t => {
        if (!t) return false;
        if (filterType === 'income' && t.type !== 'income') return false;
        if (filterType === 'expense' && t.type !== 'expense') return false;
        if (searchText) {
            const concept = (t.concept || '').toLowerCase();
            const cat = (t.category || '').toLowerCase();
            if (!concept.includes(searchText) && !cat.includes(searchText)) return false;
        }
        return true;
    });

    const displayIncome = Number(totalIncome || 0).toFixed(2);
    const displayExpense = Number(totalExpense || 0).toFixed(2);
    const displayNet = Number(netBalance || 0).toFixed(2);

    return `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="summary-icon">💵</div>
                <div class="summary-info">
                    <h3>Ingresos Totales</h3>
                    <div class="summary-value" style="color:#4dab87;">$${displayIncome}</div>
                    <div class="summary-label">Sesiones y honorarios</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">💸</div>
                <div class="summary-info">
                    <h3>Egresos Totales</h3>
                    <div class="summary-value" style="color:#e16259;">$${displayExpense}</div>
                    <div class="summary-label">Gastos operativos</div>
                </div>
            </div>
            <div class="summary-card priority">
                <div class="summary-icon">⚖️</div>
                <div class="summary-info">
                    <h3>Balance Neto</h3>
                    <div class="summary-value" style="color:${(netBalance || 0) >= 0 ? 'var(--text-primary)' : '#e16259'};">$${displayNet}</div>
                    <div class="summary-label">Rentabilidad de la consulta</div>
                </div>
            </div>
        </div>

        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-list"></i> Historial de Transacciones (${filteredTxs.length})</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" placeholder="Buscar concepto..." value="${_scope._financeSearchText || ''}" oninput="setFinanceSearchText(this.value)" style="padding:6px 12px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:13px;">
                    <select onchange="setFinanceFilterType(this.value)" style="padding:6px 10px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:13px;">
                        <option value="all" ${filterType === 'all' ? 'selected' : ''}>Todos</option>
                        <option value="income" ${filterType === 'income' ? 'selected' : ''}>Solo Ingresos 🟢</option>
                        <option value="expense" ${filterType === 'expense' ? 'selected' : ''}>Solo Egresos 🔴</option>
                    </select>
                </div>
            </div>

            ${filteredTxs.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">📊</div>
                    <p>${safeTxs.length === 0 ? 'No hay transacciones financieras registradas' : 'No se encontraron transacciones con el filtro actual'}</p>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${filteredTxs.slice().sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).map(t => {
                        const amt = Number(t.amount || 0).toFixed(2);
                        return `
                        <div style="padding:12px 16px;background:var(--bg-secondary);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;gap:12px;">
                            <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
                                <div style="font-size:20px;flex-shrink:0;">${t.type === 'income' ? '🟢' : '🔴'}</div>
                                <div style="min-width:0;">
                                    <div style="font-weight:600;font-size:14px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.concept}</div>
                                    <div style="font-size:12px;color:var(--text-tertiary);">${formatDate(t.date)} · ${t.category || 'General'}</div>
                                </div>
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                                <div style="font-size:16px;font-weight:700;color:${t.type === 'income' ? '#4dab87' : '#e16259'};">
                                    ${t.type === 'income' ? '+' : '-'}$${amt}
                                </div>
                                <button class="btn-icon" onclick="openEditTransactionModal('${t.id}')" title="Editar Transacción"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon" style="color:#e16259;" onclick="deleteTransaction('${t.id}')" title="Eliminar Transacción"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `;
                    }).join('')}
                </div>
            `}
        </div>
    `;
}

function setFinanceFilterType(val) {
    window._financeFilterType = val;
    renderFinanceView();
}

function setFinanceSearchText(val) {
    window._financeSearchText = val;
    renderFinanceView();
}

// -------------------------------------------------------------
// PESTAÑA 2: METAS FINANCIERAS
// -------------------------------------------------------------

function renderGoalsTabHtml(txs, netBalance) {
    const goals = getFinanceGoals();

    // Calcular datos del mes actual
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const currentMonthIncomesList = txs.filter(t => t.type === 'income' && (t.date || '').startsWith(currentMonthStr));
    const currentMonthIncomeSum = roundCurrency(currentMonthIncomesList.reduce((acc, t) => roundCurrency(acc + roundCurrency(t.amount)), 0));
    const currentMonthSessionsCount = currentMonthIncomesList.length;

    let completedGoals = 0;

    const goalsWithProgress = goals.map(g => {
        let currentVal = 0;
        let isSessionsUnit = g.category === 'sessions' || g.unit === 'sesiones';

        if (g.category === 'income') {
            currentVal = g.period === 'monthly' ? currentMonthIncomeSum : roundCurrency(txs.filter(t => t.type === 'income').reduce((a, b) => roundCurrency(a + roundCurrency(b.amount)), 0));
        } else if (g.category === 'sessions') {
            currentVal = g.period === 'monthly' ? currentMonthSessionsCount : txs.filter(t => t.type === 'income').length;
        } else if (g.category === 'balance') {
            currentVal = netBalance;
        } else {
            currentVal = parseFloat(g.currentAmount) || 0;
        }

        const target = parseFloat(g.targetAmount) || 1;
        let pct = Math.min(100, Math.max(0, Math.round((currentVal / target) * 100)));
        if (pct >= 100) completedGoals++;

        return {
            ...g,
            currentVal,
            pct,
            isSessionsUnit
        };
    });

    return `
        <div class="summary-cards" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
            <div class="summary-card">
                <div class="summary-icon">🎯</div>
                <div class="summary-info">
                    <h3>Metas Activas</h3>
                    <div class="summary-value">${goals.length}</div>
                    <div class="summary-label">Objetivos en seguimiento</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">🏆</div>
                <div class="summary-info">
                    <h3>Metas Alcanzadas</h3>
                    <div class="summary-value" style="color:#4dab87;">${completedGoals} / ${goals.length}</div>
                    <div class="summary-label">Cumplidas al 100%</div>
                </div>
            </div>
            <div class="summary-card priority">
                <div class="summary-icon">📅</div>
                <div class="summary-info">
                    <h3>Ingresos Mes En Curso</h3>
                    <div class="summary-value" style="color:var(--accent-primary);">$${currentMonthIncomeSum.toFixed(2)}</div>
                    <div class="summary-label">${currentMonthSessionsCount} sesiones realizadas</div>
                </div>
            </div>
        </div>

        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-bullseye"></i> Objetivos y Progreso Financiero</h2>
                <button class="btn-primary btn-sm" onclick="openGoalModal()">
                    <i class="fas fa-plus"></i> Nueva Meta
                </button>
            </div>

            ${goalsWithProgress.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">🎯</div>
                    <p>No tienes metas financieras registradas. ¡Crea una para motivar el crecimiento de tu consulta!</p>
                </div>
            ` : `
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;">
                    ${goalsWithProgress.map(g => `
                        <div class="finance-goal-card">
                            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
                                <div>
                                    <span style="font-size:11px;font-weight:700;text-transform:uppercase;padding:2px 8px;border-radius:10px;background:var(--accent-light);color:var(--accent-primary);display:inline-block;margin-bottom:6px;">
                                        ${g.period === 'monthly' ? '📅 Mensual' : '🏁 Total / Acumulado'}
                                    </span>
                                    <h3 style="margin:0;font-size:16px;color:var(--text-primary);font-weight:700;">${g.title}</h3>
                                    ${g.description ? `<p style="margin:4px 0 0 0;font-size:12px;color:var(--text-tertiary);">${g.description}</p>` : ''}
                                </div>
                                <div style="display:flex;gap:4px;">
                                    <button class="btn-icon" onclick="openGoalModal('${g.id}')" title="Editar Meta"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon" style="color:#e16259;" onclick="deleteGoal('${g.id}')" title="Eliminar Meta"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>

                            <div style="margin-top:6px;">
                                <div style="display:flex;justify-content:space-between;align-items:baseline;font-size:13px;">
                                    <span style="color:var(--text-secondary);">Progreso:</span>
                                    <span style="font-weight:700;color:${g.pct >= 100 ? '#27ae60' : 'var(--text-primary)'}; font-size:15px;">
                                        ${g.isSessionsUnit ? `${Math.round(g.currentVal)} de ${g.targetAmount} sesiones` : `$${Number(g.currentVal || 0).toFixed(2)} de $${Number(g.targetAmount || 0).toFixed(2)}`}
                                    </span>
                                </div>

                                <div class="finance-progress-track">
                                    <div class="finance-progress-bar ${g.pct >= 100 ? 'completed' : ''}" style="width: ${g.pct}%;"></div>
                                </div>

                                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-tertiary);">
                                    <span>${g.pct}% Alcanzado</span>
                                    <span>${g.pct >= 100 ? '🎉 ¡Meta Cumplida!' : g.isSessionsUnit ? `Faltan ${Math.max(0, Math.round(Number(g.targetAmount || 0) - Number(g.currentVal || 0)))} sesiones` : `Faltan $${Number(Math.max(0, Number(g.targetAmount || 0) - Number(g.currentVal || 0))).toFixed(2)}`}</span>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function openGoalModal(goalId = null) {
    const goals = getFinanceGoals();
    const g = goalId ? goals.find(item => String(item.id) === String(goalId)) : null;

    const body = document.getElementById('financeGoalModalBody');
    if (!body) return;
    const titleEl = document.getElementById('financeGoalModalTitle');
    if (titleEl) titleEl.textContent = g ? 'Editar Meta Financiera' : 'Nueva Meta Financiera';

    body.innerHTML = `
        <form onsubmit="handleGoalSubmit(event, '${g ? g.id : ''}')" class="modal-form">
            <div class="form-group">
                <label>Título de la Meta *</label>
                <input type="text" id="goalTitle" required placeholder="Ej: Facturación Mensual Objetivo" value="${g ? g.title : ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Monto Objetivo u Cantidad *</label>
                    <input type="number" step="0.01" id="goalTarget" required placeholder="Ej: 2000" value="${g ? g.targetAmount : ''}">
                </div>
                <div class="form-group">
                    <label>Tipo de Indicador *</label>
                    <select id="goalCategory">
                        <option value="income" ${g && g.category === 'income' ? 'selected' : ''}>💵 Ingresos Totales ($)</option>
                        <option value="sessions" ${g && g.category === 'sessions' ? 'selected' : ''}>👥 Cantidad de Sesiones Atendidas</option>
                        <option value="balance" ${g && g.category === 'balance' ? 'selected' : ''}>⚖️ Balance Neto de la Consulta ($)</option>
                    </select>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Período *</label>
                    <select id="goalPeriod">
                        <option value="monthly" ${g && g.period === 'monthly' ? 'selected' : ''}>📅 Mensual (Sincronizado con el mes en curso)</option>
                        <option value="total" ${g && g.period === 'total' ? 'selected' : ''}>🏁 Total Acumulado</option>
                    </select>
                </div>
            </div>
            <div class="form-group">
                <label>Descripción / Nota Opcional</label>
                <textarea id="goalDescription" rows="2" placeholder="Ej: Honorarios mínimos para cubrir gastos fijos y ahorro...">${g && g.description ? g.description : ''}</textarea>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('financeGoalModal')">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Meta</button>
            </div>
        </form>
    `;
    openModal('financeGoalModal');
}

function handleGoalSubmit(e, goalId) {
    e.preventDefault();
    const goals = getFinanceGoals();

    const title = document.getElementById('goalTitle').value.trim();
    const targetAmount = parseFloat(document.getElementById('goalTarget').value) || 0;
    const category = document.getElementById('goalCategory').value;
    const period = document.getElementById('goalPeriod').value;
    const description = document.getElementById('goalDescription').value.trim();

    if (goalId) {
        const idx = goals.findIndex(g => String(g.id) === String(goalId));
        if (idx !== -1) {
            goals[idx] = { ...goals[idx], title, targetAmount, category, period, description };
        }
    } else {
        goals.push({
            id: generateId(),
            title,
            targetAmount,
            category,
            period,
            description,
            createdAt: new Date().toISOString()
        });
    }

    saveFinanceGoals(goals);
    closeModal('financeGoalModal');
    renderFinanceView();
    showToast('Meta financiera guardada', 'success');
}

function deleteGoal(goalId) {
    showConfirmModal(
        'Eliminar Meta',
        '¿Desea eliminar esta meta financiera?',
        () => {
            let goals = getFinanceGoals();
            goals = goals.filter(g => String(g.id) !== String(goalId));
            saveFinanceGoals(goals);
            renderFinanceView();
            showToast('🗑️ Meta eliminada', 'info');
        }
    );
}

// -------------------------------------------------------------
// PESTAÑA 3: TARIFAS DE CONSULTA POR TIEMPO
// -------------------------------------------------------------

function renderRatesTabHtml() {
    const rates = getFinanceRates();

    return `
        <div style="background:var(--accent-light);border-left:4px solid var(--accent-primary);padding:14px 18px;border-radius:var(--radius-md);margin-bottom:20px;display:flex;gap:12px;align-items:center;">
            <div style="font-size:24px;color:var(--accent-primary);"><i class="fas fa-clock"></i></div>
            <div style="font-size:13px;color:var(--text-secondary);line-height:1.4;">
                <strong style="color:var(--text-primary);">Configuración de Tarifas de Consulta:</strong> Define los precios por duración de sesión (ej. 30, 45, 50, 60 o 90 min) y modalidad. La <strong>Tarifa Predeterminada</strong> se utilizará para registrar ingresos automáticamente al agendar o completar consultas.
            </div>
        </div>

        <div class="section-block">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-stopwatch"></i> Listado de Tarifas por Duración (${rates.length})</h2>
                <button class="btn-primary btn-sm" onclick="openRateModal()">
                    <i class="fas fa-plus"></i> Nueva Tarifa por Tiempo
                </button>
            </div>

            ${rates.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">⏱️</div>
                    <p>No tienes tarifas por tiempo configuradas. Agrega una nueva tarifa para establecer precios por duración.</p>
                </div>
            ` : `
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(min(100%, 280px), 1fr));gap:16px;">
                    ${(Array.isArray(rates) ? rates : []).slice().sort((a,b) => (Number(a.durationMinutes) || 0) - (Number(b.durationMinutes) || 0)).map(r => `
                        <div class="finance-rate-card ${r.isDefault ? 'default-rate' : ''}">
                            <div>
                                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                    <span style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:12px;background:var(--bg-secondary);border:1px solid var(--border-primary);color:var(--text-primary);">
                                        ⏱️ ${r.durationMinutes} Minutos
                                    </span>
                                    ${r.isDefault ? `
                                        <span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:12px;background:#27ae60;color:white;display:inline-flex;align-items:center;gap:4px;">
                                            ⭐ Predeterminada
                                        </span>
                                    ` : ''}
                                </div>
                                <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:var(--text-primary);">${r.title || 'Tarifa de Consulta'}</h3>
                                <div style="font-size:22px;font-weight:800;color:var(--accent-primary);margin:6px 0;">
                                    $${Number(r.amount || 0).toFixed(2)} <span style="font-size:12px;font-weight:500;color:var(--text-tertiary);">${r.currency || 'USD'}</span>
                                </div>
                                ${r.description ? `<p style="margin:4px 0 0 0;font-size:12px;color:var(--text-secondary);line-height:1.4;">${r.description}</p>` : ''}
                            </div>

                            <div style="display:flex;justify-content:space-between;align-items:center;padding-top:10px;border-top:1px dashed var(--border-primary);margin-top:8px;">
                                ${!r.isDefault ? `
                                    <button class="btn-secondary btn-sm" onclick="setDefaultRate('${r.id}')" style="font-size:11px;">
                                        ⭐ Hacer Predeterminada
                                    </button>
                                ` : `
                                    <span style="font-size:11px;color:var(--text-tertiary);">Usada para nuevos cobros</span>
                                `}
                                <div style="display:flex;gap:4px;">
                                    <button class="btn-icon" onclick="openRateModal('${r.id}')" title="Editar Tarifa"><i class="fas fa-edit"></i></button>
                                    <button class="btn-icon" style="color:#e16259;" onclick="deleteRate('${r.id}')" title="Eliminar Tarifa"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function openRateModal(rateId = null) {
    const rates = getFinanceRates();
    const r = rateId ? rates.find(item => String(item.id) === String(rateId)) : null;

    const body = document.getElementById('financeRateModalBody');
    if (!body) return;
    const titleEl = document.getElementById('financeRateModalTitle');
    if (titleEl) titleEl.textContent = r ? 'Editar Tarifa por Tiempo' : 'Nueva Tarifa por Tiempo';

    body.innerHTML = `
        <form onsubmit="handleRateSubmit(event, '${r ? r.id : ''}')" class="modal-form">
            <div class="form-group">
                <label>Nombre / Modalidad de la Consulta *</label>
                <input type="text" id="rateTitle" required placeholder="Ej: Consulta Psicoterapéutica Individual" value="${r ? r.title : ''}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Duración (Minutos) *</label>
                    <input type="number" id="rateDuration" required placeholder="Ej: 50" value="${r ? r.durationMinutes : 50}">
                </div>
                <div class="form-group">
                    <label>Precio ($ USD) *</label>
                    <input type="number" step="0.01" id="rateAmount" required placeholder="Ej: 45.00" value="${r ? r.amount : ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Descripción / Indicaciones</label>
                <textarea id="rateDescription" rows="2" placeholder="Ej: Sesión estándar de 50 minutos para terapia individual...">${r && r.description ? r.description : ''}</textarea>
            </div>
            <div class="form-group">
                <label class="checkbox-label" style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                    <input type="checkbox" id="rateIsDefault" ${r && r.isDefault ? 'checked' : (!r && rates.length === 0 ? 'checked' : '')}>
                    ⭐ Establecer como tarifa predeterminada para sesiones
                </label>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('financeRateModal')">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Tarifa</button>
            </div>
        </form>
    `;
    openModal('financeRateModal');
}

function handleRateSubmit(e, rateId) {
    e.preventDefault();
    let rates = getFinanceRates();

    const title = document.getElementById('rateTitle').value.trim();
    const durationMinutes = parseInt(document.getElementById('rateDuration').value) || 50;
    const amount = parseFloat(document.getElementById('rateAmount').value) || 0;
    const description = document.getElementById('rateDescription').value.trim();
    const isDefault = document.getElementById('rateIsDefault').checked;

    if (isDefault) {
        rates.forEach(r => r.isDefault = false);
    }

    if (rateId) {
        const idx = rates.findIndex(r => String(r.id) === String(rateId));
        if (idx !== -1) {
            rates[idx] = { ...rates[idx], title, durationMinutes, amount, description, isDefault };
        }
    } else {
        rates.push({
            id: generateId(),
            title,
            durationMinutes,
            amount,
            currency: 'USD',
            description,
            isDefault: isDefault || rates.length === 0
        });
    }

    saveFinanceRates(rates);
    closeModal('financeRateModal');
    renderFinanceView();
    showToast('Tarifa por tiempo guardada con éxito', 'success');
}

function setDefaultRate(rateId) {
    let rates = getFinanceRates();
    rates.forEach(r => {
        r.isDefault = String(r.id) === String(rateId);
    });
    saveFinanceRates(rates);
    renderFinanceView();
    showToast('⭐ Tarifa predeterminada actualizada', 'success');
}

function deleteRate(rateId) {
    showConfirmModal(
        'Eliminar Tarifa',
        '¿Desea eliminar esta tarifa de precios por tiempo?',
        () => {
            let rates = getFinanceRates();
            rates = rates.filter(r => String(r.id) !== String(rateId));
            saveFinanceRates(rates);
            renderFinanceView();
            showToast('🗑️ Tarifa eliminada', 'info');
        }
    );
}

// -------------------------------------------------------------
// MODALES GENERALES DE TRANSACCIONES Y CATEGORÍAS
// -------------------------------------------------------------

function openTransactionModal(type = 'income') {
    const categories = getFinanceCategories();
    const body = document.getElementById('financeTransactionModalBody');
    if (!body) return;
    const titleEl = document.getElementById('financeTransactionModalTitle');
    if (titleEl) titleEl.textContent = type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso';
    
    body.innerHTML = `
        <form onsubmit="handleTransactionSubmit(event, '${type}')" class="modal-form">
            <div class="form-group">
                <label>Concepto *</label>
                <input type="text" id="txConcept" required placeholder="${type === 'income' ? 'Ej: Honorarios sesión...' : 'Ej: Alquiler consultorio marzo...'}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Monto ($) *</label>
                    <input type="number" step="0.01" id="txAmount" required placeholder="0.00">
                </div>
                <div class="form-group">
                    <label>Fecha *</label>
                    <input type="date" id="txDate" required value="${toDateInputValue(new Date())}">
                </div>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="txCategory">
                    ${type === 'income' ? '<option value="Consulta Clínica">Consulta Clínica</option><option value="Supervisión Emitida">Supervisión Emitida</option><option value="Taller / Docencia">Taller / Docencia</option>' : categories.map(c => `<option value="${c}">${c}</option>`).join('')}
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('financeTransactionModal')">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Transacción</button>
            </div>
        </form>
    `;
    openModal('financeTransactionModal');
}

function handleTransactionSubmit(e, type) {
    e.preventDefault();
    const tx = {
        id: generateId(),
        type,
        concept: document.getElementById('txConcept').value.trim(),
        amount: parseFloat(document.getElementById('txAmount').value) || 0,
        date: document.getElementById('txDate').value,
        category: document.getElementById('txCategory').value,
        createdAt: new Date().toISOString()
    };
    const txs = getFinanceTransactions();
    txs.push(tx);
    saveFinanceTransactions(txs);
    closeModal('financeTransactionModal');
    renderFinanceView();
    showToast('Transacción registrada', 'success');
}

function openEditTransactionModal(id) {
    const txs = getFinanceTransactions();
    const tx = txs.find(t => String(t.id) === String(id));
    if (!tx) return;

    const categories = getFinanceCategories();
    const body = document.getElementById('financeTransactionModalBody');
    document.getElementById('financeTransactionModalTitle').textContent = `Editar ${tx.type === 'income' ? 'Ingreso' : 'Egreso'}`;

    body.innerHTML = `
        <form onsubmit="handleTransactionEditSubmit(event, '${tx.id}')" class="modal-form">
            <div class="form-group">
                <label>Concepto *</label>
                <input type="text" id="txConcept" required value="${tx.concept}">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Monto ($) *</label>
                    <input type="number" step="0.01" id="txAmount" required value="${tx.amount}">
                </div>
                <div class="form-group">
                    <label>Fecha *</label>
                    <input type="date" id="txDate" required value="${tx.date}">
                </div>
            </div>
            <div class="form-group">
                <label>Categoría</label>
                <select id="txCategory">
                    ${tx.type === 'income' 
                        ? ['Consulta Clínica', 'Supervisión Emitida', 'Taller / Docencia', 'Otros Ingresos'].map(c => `<option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>`).join('')
                        : categories.map(c => `<option value="${c}" ${tx.category === c ? 'selected' : ''}>${c}</option>`).join('')
                    }
                </select>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('financeTransactionModal')">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Cambios</button>
            </div>
        </form>
    `;
    openModal('financeTransactionModal');
}

function handleTransactionEditSubmit(e, id) {
    e.preventDefault();
    const txs = getFinanceTransactions();
    const idx = txs.findIndex(t => String(t.id) === String(id));
    if (idx !== -1) {
        txs[idx].concept = document.getElementById('txConcept').value.trim();
        txs[idx].amount = parseFloat(document.getElementById('txAmount').value) || 0;
        txs[idx].date = document.getElementById('txDate').value;
        txs[idx].category = document.getElementById('txCategory').value;
        saveFinanceTransactions(txs);
        closeModal('financeTransactionModal');
        renderFinanceView();
        showToast('Transacción actualizada con éxito', 'success');
    }
}

function deleteTransaction(id) {
    showConfirmModal(
        'Eliminar Transacción',
        '¿Está seguro/a de eliminar esta transacción del registro financiero?',
        () => {
            let txs = getFinanceTransactions();
            txs = txs.filter(t => String(t.id) !== String(id));
            saveFinanceTransactions(txs);
            renderFinanceView();
            showToast('🗑️ Transacción eliminada', 'info');
        }
    );
}

function clearAllFinanceTransactions() {
    showConfirmModal(
        'Vaciar Registro Financiero',
        '⚠️ ¿Desea eliminar TODAS las transacciones registradas en finanzas? Esta acción no se puede deshacer.',
        () => {
            saveFinanceTransactions([]);
            renderFinanceView();
            showToast('🗑️ Registro de finanzas vaciado correctamente', 'info');
        }
    );
}

function openCategoriesModal() {
    const cats = getFinanceCategories();
    const body = document.getElementById('financeCategoriesModalBody');
    if (!body) return;
    body.innerHTML = `
        <div style="display:flex;gap:8px;margin-bottom:16px;">
            <input type="text" id="newCatInput" placeholder="Nueva categoría..." style="flex:1;padding:8px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-input);color:var(--text-primary);">
            <button class="btn-primary" onclick="addFinanceCategory()"><i class="fas fa-plus"></i></button>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;" id="catsList">
            ${cats.map((c, idx) => `
                <div style="padding:8px 12px;background:var(--bg-secondary);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                    <span>${c}</span>
                    <button class="btn-icon" onclick="removeFinanceCategory(${idx})"><i class="fas fa-trash"></i></button>
                </div>
            `).join('')}
        </div>
    `;
    openModal('financeCategoriesModal');
}

function addFinanceCategory() {
    const input = document.getElementById('newCatInput');
    if (!input || !input.value.trim()) return;
    const cats = getFinanceCategories();
    cats.push(input.value.trim());
    saveFinanceCategories(cats);
    openCategoriesModal();
    showToast('Categoría añadida', 'success');
}

function removeFinanceCategory(idx) {
    const cats = getFinanceCategories();
    cats.splice(idx, 1);
    saveFinanceCategories(cats);
    openCategoriesModal();
    showToast('Categoría eliminada', 'info');
}

// -------------------------------------------------------------
// GESTIÓN DE CUENTAS POR COBRAR Y RECORDATORIOS DE PAGO
// -------------------------------------------------------------

function getPendingPatientDebts() {
    try {
        const state = (typeof AppState !== 'undefined' && AppState) ? AppState : {};
        const apps = Array.isArray(state.appointments) ? state.appointments : [];
        const patients = Array.isArray(state.patients) ? state.patients : [];
        const txs = getFinanceTransactions();
        const rates = getFinanceRates();
        const defaultRate = (Array.isArray(rates) && (rates.find(r => r && r.isDefault) || rates[0])) || { amount: 45 };

        const unpaidApps = apps.filter(app => {
            if (!app) return false;
            if (app.status === 'cancelada') return false;
            if (app.paymentStatus === 'pagado') return false;
            const hasTx = Array.isArray(txs) && txs.some(t => t && String(t.appointmentId) === String(app.id));
            if (hasTx) return false;
            
            const dateStr = app.date || '';
            const timeStr = app.time || '00:00';
            const appDate = dateStr ? new Date(dateStr + 'T' + timeStr) : new Date(0);
            return app.status === 'completada' || app.paymentStatus === 'pendiente' || appDate <= new Date();
        });

        const debtsByPatient = {};
        unpaidApps.forEach(app => {
            const pId = app.patientId;
            if (!pId) return;
            if (!debtsByPatient[pId]) {
                const patient = patients.find(p => p && String(p.id) === String(pId));
                debtsByPatient[pId] = {
                    patientId: pId,
                    patientName: patient ? (patient.name || 'Paciente Sin Nombre') : 'Paciente Sin Nombre',
                    patientPhone: patient ? (patient.phone || '') : '',
                    patientEmail: patient ? (patient.email || '') : '',
                    appointments: [],
                    totalDebt: 0
                };
            }
            const appAmount = roundCurrency(app.price || app.rateAmount || (defaultRate && defaultRate.amount) || 45);
            debtsByPatient[pId].appointments.push({
                ...app,
                amount: appAmount
            });
            debtsByPatient[pId].totalDebt = roundCurrency(debtsByPatient[pId].totalDebt + appAmount);
        });

        return Object.values(debtsByPatient);
    } catch (e) {
        console.warn('[Finance] Error calculando deudas de pacientes:', e);
        return [];
    }
}

function renderDebtsTabHtml() {
    const debts = getPendingPatientDebts() || [];
    const totalPending = roundCurrency(debts.reduce((sum, d) => roundCurrency(sum + Number(d.totalDebt || 0)), 0));
    const totalSessions = debts.reduce((sum, d) => sum + (Array.isArray(d.appointments) ? d.appointments.length : 0), 0);

    return `
        <div class="summary-cards">
            <div class="summary-card priority">
                <div class="summary-icon">🔴</div>
                <div class="summary-info">
                    <h3>Total Deudas Pendientes</h3>
                    <div class="summary-value" style="color:#e16259;">$${Number(totalPending || 0).toFixed(2)}</div>
                    <div class="summary-label">Cuentas por cobrar acumuladas</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">👥</div>
                <div class="summary-info">
                    <h3>Pacientes con Deuda</h3>
                    <div class="summary-value">${debts.length}</div>
                    <div class="summary-label">En mora o pendiente</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">📅</div>
                <div class="summary-info">
                    <h3>Sesiones Impagadas</h3>
                    <div class="summary-value">${totalSessions}</div>
                    <div class="summary-label">Consultas sin saldar</div>
                </div>
            </div>
        </div>

        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-hand-holding-usd"></i> Cuentas por Cobrar por Paciente</h2>
            </div>

            ${debts.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">✅</div>
                    <p>¡Excelente! No hay cuentas ni honorarios pendientes de cobro.</p>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:16px;">
                    ${debts.map(d => `
                        <div class="finance-goal-card" style="flex-direction:column;align-items:stretch;gap:12px;">
                            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
                                <div>
                                    <h3 style="margin:0;font-size:17px;font-weight:700;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                                        👤 ${d.patientName}
                                        ${d.patientPhone ? `<span style="font-size:12px;font-weight:500;color:var(--text-tertiary);">📞 ${d.patientPhone}</span>` : ''}
                                    </h3>
                                    <p style="margin:4px 0 0 0;font-size:12px;color:var(--text-secondary);">
                                        ${(d.appointments || []).length} sesión(es) impagada(s)
                                    </p>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:20px;font-weight:800;color:#e16259;">
                                        $${Number(d.totalDebt || 0).toFixed(2)} USD
                                    </div>
                                    <div style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Pendiente de pago</div>
                                </div>
                            </div>

                            <!-- DETALLE DE SESIONES PENDIENTES -->
                            <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:6px;">
                                ${(d.appointments || []).map(a => `
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
                                        <span>🗓️ <strong>${formatDate(a.date)}</strong> (${a.time || 'Sesión'}) · ${a.type || 'Individual'}</span>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <strong style="color:var(--text-primary);">$${Number(a.amount || 0).toFixed(2)}</strong>
                                            <button class="btn-secondary btn-sm" onclick="settlePatientDebt('${d.patientId}', '${a.id}')" title="Marcar esta sesión como pagada">
                                                💵 Saldar Cita
                                            </button>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>

                            <!-- ACCIONES DE RECORDATORIO -->
                            <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;">
                                <button class="btn-secondary btn-sm" onclick="copyPaymentReminderText('${d.patientId}')">
                                    <i class="fas fa-copy"></i> Copiar Recordatorio
                                </button>
                                <button class="btn-primary btn-sm" onclick="sendPaymentReminderWhatsApp('${d.patientId}')" style="background:#25D366;border:none;">
                                    <i class="fab fa-whatsapp"></i> Recordatorio WhatsApp
                                </button>
                                <button class="btn-primary btn-sm" onclick="settlePatientDebt('${d.patientId}')" style="background:#4dab87;border:none;">
                                    <i class="fas fa-check-circle"></i> Saldar Todo ($${Number(d.totalDebt || 0).toFixed(2)})
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function sendPaymentReminderWhatsApp(patientId) {
    const debts = getPendingPatientDebts();
    const patientDebt = debts.find(d => String(d.patientId) === String(patientId));
    if (!patientDebt) return;

    const therapistName = AppState.currentUser ? AppState.currentUser.name : 'Su Terapeuta';
    const datesList = patientDebt.appointments.map(a => `${formatDate(a.date)} (${a.time || 'Sesión'}) - $${a.amount.toFixed(2)}`).join('\n• ');

    const message = `Hola ${patientDebt.patientName}, espero que te encuentres muy bien. 👋\n\nTe escribo para hacer un cordial recordatorio sobre el pago pendiente de las siguientes sesiones de consulta psicológica con ${therapistName}:\n\n• ${datesList}\n\n📌 *Monto Total Pendiente: $${patientDebt.totalDebt.toFixed(2)} USD*\n\nPor favor infórmame al realizar la transferencia o pago móvil. ¡Quedo atento/a a tus comentarios! 😊`;

    const encodedMsg = encodeURIComponent(message);
    const rawPhone = (patientDebt.patientPhone || '').replace(/\D/g, '');

    if (rawPhone.length >= 7) {
        window.open(`https://wa.me/${rawPhone}?text=${encodedMsg}`, '_blank');
    } else {
        navigator.clipboard.writeText(message);
        showToast('📋 Número no válido para WhatsApp directos. Mensaje de cobro copiado al portapapeles.', 'info');
    }
}

function copyPaymentReminderText(patientId) {
    const debts = getPendingPatientDebts();
    const patientDebt = debts.find(d => String(d.patientId) === String(patientId));
    if (!patientDebt) return;

    const therapistName = AppState.currentUser ? AppState.currentUser.name : 'Su Terapeuta';
    const datesList = patientDebt.appointments.map(a => `${formatDate(a.date)} (${a.time || 'Sesión'}) - $${a.amount.toFixed(2)}`).join('\n• ');

    const message = `Hola ${patientDebt.patientName}, espero que te encuentres muy bien. 👋\n\nTe escribo para hacer un cordial recordatorio sobre el pago pendiente de las siguientes sesiones de consulta psicológica con ${therapistName}:\n\n• ${datesList}\n\n📌 *Monto Total Pendiente: $${patientDebt.totalDebt.toFixed(2)} USD*\n\nPor favor infórmame al realizar el pago. ¡Quedo atento/a! 😊`;

    navigator.clipboard.writeText(message);
    showToast('📋 Mensaje de cobro copiado al portapapeles', 'success');
}

function settlePatientDebt(patientId, appointmentId = null) {
    const state = (typeof AppState !== 'undefined' && AppState) ? AppState : {};
    const apps = Array.isArray(state.appointments) ? state.appointments : [];
    const patients = Array.isArray(state.patients) ? state.patients : [];
    const txs = getFinanceTransactions() || [];
    const rates = getFinanceRates();
    const defaultRate = (Array.isArray(rates) && (rates.find(r => r && r.isDefault) || rates[0])) || { amount: 45 };

    const patient = patients.find(p => p && String(p.id) === String(patientId));

    let appsToSettle = [];
    if (appointmentId) {
        appsToSettle = apps.filter(a => a && String(a.id) === String(appointmentId));
    } else {
        appsToSettle = apps.filter(a => a && String(a.patientId) === String(patientId) && a.paymentStatus !== 'pagado');
    }

    if (appsToSettle.length === 0) return;

    let totalSettled = 0;
    appsToSettle.forEach(app => {
        app.paymentStatus = 'pagado';
        const amt = parseFloat(app.price || app.rateAmount || (defaultRate && defaultRate.amount) || 45);
        totalSettled += amt;

        txs.push({
            id: generateId(),
            type: 'income',
            concept: `Honorarios Sesión ${formatDate(app.date)} - ${patient ? (patient.name || 'Paciente') : 'Paciente'}`,
            amount: amt,
            currency: 'USD',
            category: 'Consulta Clínica',
            patientId: patientId,
            appointmentId: app.id,
            date: app.date || toDateInputValue(new Date()),
            createdAt: new Date().toISOString()
        });
    });

    saveFinanceTransactions(txs);
    if (typeof saveData === 'function') saveData();
    showToast(`✅ Pago saldado: $${Number(totalSettled || 0).toFixed(2)} USD (${patient ? (patient.name || 'Paciente') : 'Paciente'})`, 'success');

    if (state.currentView === 'finance') renderFinanceView();
    if (state.currentView === 'patients' && typeof renderPatients === 'function') renderPatients();
    if (typeof updateDashboard === 'function') updateDashboard();
}

function settleAllPatientDebtsGlobal() {
    const debts = getPendingPatientDebts();
    if (debts.length === 0) return;

    showConfirmModal(
        'Saldar Deudas Globales',
        `¿Desea marcar TODAS las ${debts.length} cuentas pendientes como pagadas y registrar los ingresos en finanzas?`,
        () => {
            debts.forEach(d => {
                settlePatientDebt(d.patientId);
            });
            showToast('✅ Todas las deudas han sido saldadas correctamente', 'success');
        }
    );
}

// =============================================================
// EXPOSICIÓN GLOBAL EXHAUSTIVA PARA DOM onclick Y NAVEGACIÓN WEB
// =============================================================
const _financeTargetScope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null));
if (_financeTargetScope) {
    _financeTargetScope.roundCurrency = roundCurrency;
    _financeTargetScope.getFinanceStorageKey = getFinanceStorageKey;
    _financeTargetScope.getFinanceTransactions = getFinanceTransactions;
    _financeTargetScope.saveFinanceTransactions = saveFinanceTransactions;
    _financeTargetScope.getFinanceCategories = getFinanceCategories;
    _financeTargetScope.saveFinanceCategories = saveFinanceCategories;
    _financeTargetScope.getFinanceRates = getFinanceRates;
    _financeTargetScope.saveFinanceRates = saveFinanceRates;
    _financeTargetScope.getFinanceGoals = getFinanceGoals;
    _financeTargetScope.saveFinanceGoals = saveFinanceGoals;
    _financeTargetScope.registerIncomeFromAppointment = registerIncomeFromAppointment;
    _financeTargetScope.renderFinanceView = renderFinanceView;
    _financeTargetScope.switchFinanceTab = switchFinanceTab;
    _financeTargetScope.renderTransactionsTabHtml = renderTransactionsTabHtml;
    _financeTargetScope.renderGoalsTabHtml = renderGoalsTabHtml;
    _financeTargetScope.renderRatesTabHtml = renderRatesTabHtml;
    _financeTargetScope.renderDebtsTabHtml = renderDebtsTabHtml;
    _financeTargetScope.openGoalModal = openGoalModal;
    _financeTargetScope.handleGoalSubmit = handleGoalSubmit;
    _financeTargetScope.deleteGoal = deleteGoal;
    _financeTargetScope.openRateModal = openRateModal;
    _financeTargetScope.handleRateSubmit = handleRateSubmit;
    _financeTargetScope.setDefaultRate = setDefaultRate;
    _financeTargetScope.deleteRate = deleteRate;
    _financeTargetScope.openTransactionModal = openTransactionModal;
    _financeTargetScope.handleTransactionSubmit = handleTransactionSubmit;
    _financeTargetScope.openEditTransactionModal = openEditTransactionModal;
    _financeTargetScope.handleTransactionEditSubmit = handleTransactionEditSubmit;
    _financeTargetScope.deleteTransaction = deleteTransaction;
    _financeTargetScope.clearAllFinanceTransactions = clearAllFinanceTransactions;
    _financeTargetScope.openCategoriesModal = openCategoriesModal;
    _financeTargetScope.addFinanceCategory = addFinanceCategory;
    _financeTargetScope.removeFinanceCategory = removeFinanceCategory;
    _financeTargetScope.getPendingPatientDebts = getPendingPatientDebts;
    _financeTargetScope.sendPaymentReminderWhatsApp = sendPaymentReminderWhatsApp;
    _financeTargetScope.copyPaymentReminderText = copyPaymentReminderText;
    _financeTargetScope.settlePatientDebt = settlePatientDebt;
    _financeTargetScope.settleAllPatientDebtsGlobal = settleAllPatientDebtsGlobal;
    _financeTargetScope.setFinanceFilterType = setFinanceFilterType;
    _financeTargetScope.setFinanceSearchText = setFinanceSearchText;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        roundCurrency,
        getFinanceStorageKey,
        getFinanceTransactions,
        saveFinanceTransactions,
        getFinanceCategories,
        saveFinanceCategories,
        getFinanceRates,
        saveFinanceRates,
        getFinanceGoals,
        saveFinanceGoals,
        registerIncomeFromAppointment,
        renderFinanceView,
        switchFinanceTab,
        renderTransactionsTabHtml,
        renderGoalsTabHtml,
        renderRatesTabHtml,
        renderDebtsTabHtml,
        openGoalModal,
        handleGoalSubmit,
        deleteGoal,
        openRateModal,
        handleRateSubmit,
        setDefaultRate,
        deleteRate,
        openTransactionModal,
        handleTransactionSubmit,
        openEditTransactionModal,
        handleTransactionEditSubmit,
        deleteTransaction,
        clearAllFinanceTransactions,
        openCategoriesModal,
        addFinanceCategory,
        removeFinanceCategory,
        getPendingPatientDebts,
        sendPaymentReminderWhatsApp,
        copyPaymentReminderText,
        settlePatientDebt,
        settleAllPatientDebtsGlobal,
        setFinanceFilterType,
        setFinanceSearchText
    };
}
