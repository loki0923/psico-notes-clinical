/**
 * PSICO NOTES CLINICAL - MÓDULO DE FINANZAS
 */

function getFinanceStorageKey(key) {
    const uid = AppState.currentUser ? AppState.currentUser.id : 'anon';
    return `psico_finance_${key}_${uid}`;
}

// -------------------------------------------------------------
// TRANSACCIONES
// -------------------------------------------------------------

function getFinanceTransactions() {
    try {
        return JSON.parse(localStorage.getItem(getFinanceStorageKey('transactions')) || '[]');
    } catch { return []; }
}

function saveFinanceTransactions(txs) {
    localStorage.setItem(getFinanceStorageKey('transactions'), JSON.stringify(txs));
}

function getFinanceCategories() {
    try {
        const stored = localStorage.getItem(getFinanceStorageKey('categories'));
        if (stored) return JSON.parse(stored);
    } catch {}
    return ['Alquiler Consultorio', 'Supervisión Clínica', 'Materiales y Test', 'Formación y Cursos', 'Servicios Públicos', 'Plataformas Online', 'Otros Egresos'];
}

function saveFinanceCategories(cats) {
    localStorage.setItem(getFinanceStorageKey('categories'), JSON.stringify(cats));
}

// -------------------------------------------------------------
// TARIFAS POR TIEMPO Y SESIÓN
// -------------------------------------------------------------

function getFinanceRates() {
    try {
        const stored = localStorage.getItem(getFinanceStorageKey('rates'));
        if (stored) return JSON.parse(stored);
    } catch {}
    return [
        { id: 'rate_30', durationMinutes: 30, title: 'Consulta Corta / Seguimiento', amount: 30.00, currency: 'USD', description: 'Sesión de 30 minutos de revisión o seguimiento breve', isDefault: false },
        { id: 'rate_45', durationMinutes: 45, title: 'Consulta Estándar Breve', amount: 40.00, currency: 'USD', description: 'Sesión individual de 45 minutos', isDefault: false },
        { id: 'rate_50', durationMinutes: 50, title: 'Consulta Psicoterapéutica Individual', amount: 45.00, currency: 'USD', description: 'Sesión psicoterapéutica estándar de 50 minutos', isDefault: true },
        { id: 'rate_60', durationMinutes: 60, title: 'Consulta Completa / Pareja', amount: 55.00, currency: 'USD', description: 'Sesión de 60 minutos individual o de pareja', isDefault: false },
        { id: 'rate_90', durationMinutes: 90, title: 'Evaluación Inicial / Familia', amount: 80.00, currency: 'USD', description: 'Sesión extendida de 90 minutos para entrevistas profundas', isDefault: false }
    ];
}

function saveFinanceRates(rates) {
    localStorage.setItem(getFinanceStorageKey('rates'), JSON.stringify(rates));
}

// -------------------------------------------------------------
// METAS FINANCIERAS
// -------------------------------------------------------------

function getFinanceGoals() {
    try {
        const stored = localStorage.getItem(getFinanceStorageKey('goals'));
        if (stored) return JSON.parse(stored);
    } catch {}
    return [
        { id: 'goal_monthly_income', title: 'Meta de Ingresos Mensuales', targetAmount: 2000.00, period: 'monthly', category: 'income', description: 'Honorarios brutos del mes en curso' },
        { id: 'goal_sessions_month', title: 'Meta de Sesiones Atendidas', targetAmount: 40, unit: 'sesiones', period: 'monthly', category: 'sessions', description: 'Consultas atendidas y cobradas en el mes' },
        { id: 'goal_savings_fund', title: 'Fondo de Reserva del Consultorio', targetAmount: 1000.00, period: 'total', category: 'balance', description: 'Ahorro acumulado o fondo operativo de emergencia' }
    ];
}

function saveFinanceGoals(goals) {
    localStorage.setItem(getFinanceStorageKey('goals'), JSON.stringify(goals));
}

// -------------------------------------------------------------
// COBRO AUTOMÁTICO DE CITAS CON TARIFAS DINÁMICAS
// -------------------------------------------------------------

function registerIncomeFromAppointment(appointment) {
    if (!appointment) return;
    const patient = AppState.patients.find(p => String(p.id) === String(appointment.patientId));
    const rates = getFinanceRates();
    
    let selectedRate = rates.find(r => r.isDefault);
    if (!selectedRate && rates.length > 0) selectedRate = rates[0];

    const amount = selectedRate ? parseFloat(selectedRate.amount) : 45;
    const durationText = selectedRate ? ` (${selectedRate.durationMinutes} min)` : '';

    const tx = {
        id: generateId(),
        type: 'income',
        concept: `Sesión psicoterapéutica${durationText} - ${patient ? patient.name : 'Paciente'}`,
        amount: amount,
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
        showToast(`Cobro registrado: $${amount.toFixed(2)}`, 'success');
    }
}

// -------------------------------------------------------------
// VISTA PRINCIPAL DE FINANZAS
// -------------------------------------------------------------

function renderFinanceView() {
    const container = document.getElementById('financeContent');
    if (!container) return;

    if (!window._financeActiveTab) {
        window._financeActiveTab = 'transactions';
    }
    const currentTab = window._financeActiveTab;

    const txs = getFinanceTransactions();
    const categories = getFinanceCategories();

    let totalIncome = 0;
    let totalExpense = 0;

    txs.forEach(t => {
        const val = parseFloat(t.amount) || 0;
        if (t.type === 'income') totalIncome += val;
        else totalExpense += val;
    });

    const netBalance = totalIncome - totalExpense;

    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-left">
                <h1 class="page-title">Finanzas de la Consulta</h1>
                <p class="page-subtitle">Control de ingresos, egresos, tarifas por tiempo y metas de facturación</p>
            </div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${currentTab === 'transactions' ? `
                    <button class="btn-secondary" onclick="openCategoriesModal()">
                        <i class="fas fa-tags"></i> Categorías
                    </button>
                    <button class="btn-primary" onclick="openTransactionModal('income')">
                        <i class="fas fa-plus"></i> Ingreso
                    </button>
                    <button class="btn-secondary" onclick="openTransactionModal('expense')" style="background:#e16259;color:white;border:none;">
                        <i class="fas fa-minus"></i> Egreso
                    </button>
                    ${txs.length > 0 ? `
                        <button class="btn-secondary" onclick="clearAllFinanceTransactions()" style="color:#e16259;border-color:rgba(225,98,89,0.3);" title="Vaciar todo el historial financiero">
                            <i class="fas fa-trash-alt"></i> Vaciar Registro
                        </button>
                    ` : ''}
                ` : currentTab === 'debts' ? `
                    <button class="btn-primary" onclick="settleAllPatientDebtsGlobal()" style="background:#4dab87;border-none;">
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
                ${getPendingPatientDebts().length > 0 ? `<span class="nav-badge" style="background:#e16259;color:white;margin-left:6px;">${getPendingPatientDebts().length}</span>` : ''}
            </button>
            <button class="finance-tab-btn ${currentTab === 'goals' ? 'active' : ''}" onclick="switchFinanceTab('goals')">
                <i class="fas fa-bullseye"></i> Metas Financieras
            </button>
            <button class="finance-tab-btn ${currentTab === 'rates' ? 'active' : ''}" onclick="switchFinanceTab('rates')">
                <i class="fas fa-stopwatch"></i> Tarifas por Tiempo de Consulta
            </button>
        </div>

        <div id="financeTabContent">
            ${currentTab === 'transactions' ? renderTransactionsTabHtml(txs, totalIncome, totalExpense, netBalance) :
              currentTab === 'debts' ? renderDebtsTabHtml() :
              currentTab === 'goals' ? renderGoalsTabHtml(txs, netBalance) :
              renderRatesTabHtml()}
        </div>
    `;
}

function switchFinanceTab(tab) {
    window._financeActiveTab = tab;
    renderFinanceView();
}

// -------------------------------------------------------------
// PESTAÑA 1: TRANSACCIONES
// -------------------------------------------------------------

function renderTransactionsTabHtml(txs, totalIncome, totalExpense, netBalance) {
    const filterType = window._financeFilterType || 'all';
    const searchText = (window._financeSearchText || '').toLowerCase();

    let filteredTxs = txs.filter(t => {
        if (filterType === 'income' && t.type !== 'income') return false;
        if (filterType === 'expense' && t.type !== 'expense') return false;
        if (searchText) {
            const concept = (t.concept || '').toLowerCase();
            const cat = (t.category || '').toLowerCase();
            if (!concept.includes(searchText) && !cat.includes(searchText)) return false;
        }
        return true;
    });

    return `
        <div class="summary-cards">
            <div class="summary-card">
                <div class="summary-icon">💵</div>
                <div class="summary-info">
                    <h3>Ingresos Totales</h3>
                    <div class="summary-value" style="color:#4dab87;">$${totalIncome.toFixed(2)}</div>
                    <div class="summary-label">Sesiones y honorarios</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">💸</div>
                <div class="summary-info">
                    <h3>Egresos Totales</h3>
                    <div class="summary-value" style="color:#e16259;">$${totalExpense.toFixed(2)}</div>
                    <div class="summary-label">Gastos operativos</div>
                </div>
            </div>
            <div class="summary-card priority">
                <div class="summary-icon">⚖️</div>
                <div class="summary-info">
                    <h3>Balance Neto</h3>
                    <div class="summary-value" style="color:${netBalance >= 0 ? 'var(--text-primary)' : '#e16259'};">$${netBalance.toFixed(2)}</div>
                    <div class="summary-label">Rentabilidad de la consulta</div>
                </div>
            </div>
        </div>

        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-list"></i> Historial de Transacciones (${filteredTxs.length})</h2>
                <div style="display:flex;gap:8px;align-items:center;">
                    <input type="text" placeholder="Buscar concepto..." value="${window._financeSearchText || ''}" oninput="setFinanceSearchText(this.value)" style="padding:6px 12px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:13px;">
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
                    <p>${txs.length === 0 ? 'No hay transacciones financieras registradas' : 'No se encontraron transacciones con el filtro actual'}</p>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${filteredTxs.sort((a,b) => new Date(b.date) - new Date(a.date)).map(t => `
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
                                    ${t.type === 'income' ? '+' : '-'}$${parseFloat(t.amount).toFixed(2)}
                                </div>
                                <button class="btn-icon" onclick="openEditTransactionModal('${t.id}')" title="Editar Transacción"><i class="fas fa-edit"></i></button>
                                <button class="btn-icon" style="color:#e16259;" onclick="deleteTransaction('${t.id}')" title="Eliminar Transacción"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
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
    const currentMonthIncomeSum = currentMonthIncomesList.reduce((acc, t) => acc + (parseFloat(t.amount) || 0), 0);
    const currentMonthSessionsCount = currentMonthIncomesList.length;

    let completedGoals = 0;

    const goalsWithProgress = goals.map(g => {
        let currentVal = 0;
        let isSessionsUnit = g.category === 'sessions' || g.unit === 'sesiones';

        if (g.category === 'income') {
            currentVal = g.period === 'monthly' ? currentMonthIncomeSum : txs.filter(t => t.type === 'income').reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
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
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
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
                                        ${g.isSessionsUnit ? `${Math.round(g.currentVal)} de ${g.targetAmount} sesiones` : `$${g.currentVal.toFixed(2)} de $${parseFloat(g.targetAmount).toFixed(2)}`}
                                    </span>
                                </div>

                                <div class="finance-progress-track">
                                    <div class="finance-progress-bar ${g.pct >= 100 ? 'completed' : ''}" style="width: ${g.pct}%;"></div>
                                </div>

                                <div style="display:flex;justify-content:space-between;align-items:center;font-size:12px;color:var(--text-tertiary);">
                                    <span>${g.pct}% Alcanzado</span>
                                    <span>${g.pct >= 100 ? '🎉 ¡Meta Cumplida!' : g.isSessionsUnit ? `Faltan ${Math.max(0, Math.round(g.targetAmount - g.currentVal))} sesiones` : `Faltan $${Math.max(0, g.targetAmount - g.currentVal).toFixed(2)}`}</span>
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
    document.getElementById('financeGoalModalTitle').textContent = g ? 'Editar Meta Financiera' : 'Nueva Meta Financiera';

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
                <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(300px, 1fr));gap:16px;">
                    ${rates.sort((a,b) => a.durationMinutes - b.durationMinutes).map(r => `
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
                                <h3 style="margin:0 0 4px 0;font-size:16px;font-weight:700;color:var(--text-primary);">${r.title}</h3>
                                <div style="font-size:22px;font-weight:800;color:var(--accent-primary);margin:6px 0;">
                                    $${parseFloat(r.amount).toFixed(2)} <span style="font-size:12px;font-weight:500;color:var(--text-tertiary);">${r.currency || 'USD'}</span>
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
    document.getElementById('financeRateModalTitle').textContent = r ? 'Editar Tarifa por Tiempo' : 'Nueva Tarifa por Tiempo';

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
    document.getElementById('financeTransactionModalTitle').textContent = type === 'income' ? 'Registrar Ingreso' : 'Registrar Egreso';
    
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
    const apps = AppState.appointments || [];
    const txs = getFinanceTransactions();
    const rates = getFinanceRates();
    const defaultRate = rates.find(r => r.isDefault) || rates[0] || { amount: 45 };

    const unpaidApps = apps.filter(app => {
        if (app.status === 'cancelada') return false;
        if (app.paymentStatus === 'pagado') return false;
        const hasTx = txs.some(t => String(t.appointmentId) === String(app.id));
        if (hasTx) return false;
        
        const appDate = new Date(app.date + 'T' + (app.time || '00:00'));
        return app.status === 'completada' || app.paymentStatus === 'pendiente' || appDate <= new Date();
    });

    const debtsByPatient = {};
    unpaidApps.forEach(app => {
        const pId = app.patientId;
        if (!debtsByPatient[pId]) {
            const patient = AppState.patients.find(p => String(p.id) === String(pId));
            debtsByPatient[pId] = {
                patientId: pId,
                patientName: patient ? patient.name : 'Paciente Sin Nombre',
                patientPhone: patient ? patient.phone : '',
                patientEmail: patient ? patient.email : '',
                appointments: [],
                totalDebt: 0
            };
        }
        const appAmount = parseFloat(app.price || app.rateAmount || defaultRate.amount || 45);
        debtsByPatient[pId].appointments.push({
            ...app,
            amount: appAmount
        });
        debtsByPatient[pId].totalDebt += appAmount;
    });

    return Object.values(debtsByPatient);
}

function renderDebtsTabHtml() {
    const debts = getPendingPatientDebts();
    const totalPending = debts.reduce((sum, d) => sum + d.totalDebt, 0);
    const totalSessions = debts.reduce((sum, d) => sum + d.appointments.length, 0);

    return `
        <div class="summary-cards">
            <div class="summary-card priority">
                <div class="summary-icon">🔴</div>
                <div class="summary-info">
                    <h3>Total Deudas Pendientes</h3>
                    <div class="summary-value" style="color:#e16259;">$${totalPending.toFixed(2)}</div>
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
                                        ${d.appointments.length} sesión(es) impagada(s)
                                    </p>
                                </div>
                                <div style="text-align:right;">
                                    <div style="font-size:20px;font-weight:800;color:#e16259;">
                                        $${d.totalDebt.toFixed(2)} USD
                                    </div>
                                    <div style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Pendiente de pago</div>
                                </div>
                            </div>

                            <!-- DETALLE DE SESIONES PENDIENTES -->
                            <div style="background:var(--bg-secondary);padding:10px 14px;border-radius:var(--radius-sm);display:flex;flex-direction:column;gap:6px;">
                                ${d.appointments.map(a => `
                                    <div style="display:flex;justify-content:space-between;align-items:center;font-size:13px;">
                                        <span>🗓️ <strong>${formatDate(a.date)}</strong> (${a.time || 'Sesión'}) · ${a.type || 'Individual'}</span>
                                        <div style="display:flex;align-items:center;gap:8px;">
                                            <strong style="color:var(--text-primary);">$${a.amount.toFixed(2)}</strong>
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
                                    <i class="fas fa-check-circle"></i> Saldar Todo ($${d.totalDebt.toFixed(2)})
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
    const apps = AppState.appointments || [];
    const txs = getFinanceTransactions();
    const rates = getFinanceRates();
    const defaultRate = rates.find(r => r.isDefault) || rates[0] || { amount: 45 };

    const patient = AppState.patients.find(p => String(p.id) === String(patientId));

    let appsToSettle = [];
    if (appointmentId) {
        appsToSettle = apps.filter(a => String(a.id) === String(appointmentId));
    } else {
        appsToSettle = apps.filter(a => String(a.patientId) === String(patientId) && a.paymentStatus !== 'pagado');
    }

    if (appsToSettle.length === 0) return;

    let totalSettled = 0;
    appsToSettle.forEach(app => {
        app.paymentStatus = 'pagado';
        const amt = parseFloat(app.price || app.rateAmount || defaultRate.amount || 45);
        totalSettled += amt;

        txs.push({
            id: generateId(),
            type: 'income',
            concept: `Honorarios Sesión ${formatDate(app.date)} - ${patient ? patient.name : 'Paciente'}`,
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
    saveData();
    showToast(`✅ Pago saldado: $${totalSettled.toFixed(2)} USD (${patient ? patient.name : 'Paciente'})`, 'success');

    if (AppState.currentView === 'finance') renderFinanceView();
    if (AppState.currentView === 'patients') renderPatients();
    updateDashboard();
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

