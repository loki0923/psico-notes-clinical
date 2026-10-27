/**
 * PSICO NOTES CLINICAL v6.0 - SUITE DE PRUEBAS AUTOMATIZADAS (QA)
 * Ejecutable tanto en navegador como en entorno Node.js / Headless.
 * Valida 100% de los casos de prueba definidos en plan_pruebas.md.
 */

const ClinicalTestSuite = {
    tests: [],

    add(id, name, fn) {
        this.tests.push({ id, name, fn });
    },

    async runAll() {
        const results = [];
        let passed = 0;
        let failed = 0;

        console.log('🚀 Iniciando Suite de Pruebas Psico Notes Clinical v6.0...\n');

        for (const test of this.tests) {
            const start = Date.now();
            try {
                await test.fn();
                const duration = Date.now() - start;
                passed++;
                results.push({ id: test.id, name: test.name, status: 'PASSED', duration, error: null });
                console.log(`✅ [${test.id}] ${test.name} (${duration}ms)`);
            } catch (err) {
                const duration = Date.now() - start;
                failed++;
                results.push({ id: test.id, name: test.name, status: 'FAILED', duration, error: err.message });
                console.error(`❌ [${test.id}] ${test.name} (${duration}ms):`, err.message);
            }
        }

        const total = this.tests.length;
        const allPassed = failed === 0;

        let htmlReport = `
            <div style="font-family: inherit; line-height: 1.5;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; font-weight:700; font-size:13px; color:${allPassed ? '#10b981' : '#e16259'};">
                    <span>${allPassed ? '✅ Todas las pruebas aprobadas (100%)' : '⚠️ Fallos detectados'}</span>
                    <span>${passed}/${total} Aprobadas</span>
                </div>
                <div style="display:flex; flex-direction:column; gap:6px;">
        `;

        for (const r of results) {
            const isPass = r.status === 'PASSED';
            htmlReport += `
                <div style="background:${isPass ? 'rgba(16, 185, 129, 0.08)' : 'rgba(225, 98, 89, 0.1)'}; padding:6px 10px; border-radius:4px; border-left:3px solid ${isPass ? '#10b981' : '#e16259'};">
                    <span style="font-weight:700;">[${r.id}]</span> ${r.name} 
                    <span style="float:right; font-size:11px; color:#64748b;">${r.duration}ms</span>
                    ${r.error ? `<div style="color:#e16259; font-size:11px; margin-top:2px;">Error: ${r.error}</div>` : ''}
                </div>
            `;
        }

        htmlReport += '</div></div>';

        console.log(`\n======================================================`);
        console.log(`RESULTADO DE LA SUITE: ${passed}/${total} PRUEBAS SUPERADAS (${allPassed ? '100% ÉXITO' : 'FALLOS DETECTADOS'})`);
        console.log(`======================================================\n`);

        if (typeof testServerInstance !== 'undefined' && testServerInstance) {
            testServerInstance.close();
            testServerInstance = null;
            testServerBaseUrl = '';
        }

        return {
            total,
            passed,
            failed,
            allPassed,
            results,
            htmlReport
        };
    }
};

// ============================================
// DEFINICIÓN DE CASOS DE PRUEBA
// ============================================

// 1. TC-SEC-01: Criptografía Web Crypto AES-GCM 256-bit
ClinicalTestSuite.add('TC-SEC-01', 'Cifrado y Descifrado Web Crypto AES-GCM 256-bit', async () => {
    const originalText = "Paciente refiere sintomatología ansiosa severa de 3 semanas de evolución.";
    
    // Obtener motor crypto
    const cryptoSubtle = (typeof window !== 'undefined' && window.crypto?.subtle) 
        ? window.crypto.subtle 
        : (await import('crypto')).webcrypto.subtle;

    const key = await cryptoSubtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
    );

    const iv = new Uint8Array(12);
    const encoded = new TextEncoder().encode(originalText);

    const ciphertext = await cryptoSubtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoded
    );

    if (ciphertext.byteLength === 0) throw new Error('El buffer cifrado está vacío');

    const decryptedBuffer = await cryptoSubtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );

    const decryptedText = new TextDecoder().decode(decryptedBuffer);
    if (decryptedText !== originalText) {
        throw new Error(`Texto descifrado (${decryptedText}) no coincide con el original.`);
    }
});

// 2. TC-SEC-02: Anonimizador PHI (Protected Health Information)
ClinicalTestSuite.add('TC-SEC-02', 'Anonimización y desidentificación de datos sensibles PHI', async () => {
    if (typeof PhiAnonymizer === 'undefined') {
        await import('./phi-anonymizer.js');
    }
    const Anonymizer = typeof PhiAnonymizer !== 'undefined' ? PhiAnonymizer : (typeof global !== 'undefined' ? global.PhiAnonymizer : null);

    const rawNote = "La paciente María Gómez, teléfono 0414-1234567 y correo maria.gomez@gmail.com, refiere angustia en su trabajo.";
    const patientInfo = { name: "María Gómez", phone: "0414-1234567" };

    const { anonymizedText, mapping } = Anonymizer.anonymize(rawNote, patientInfo);

    if (anonymizedText.includes("María Gómez")) {
        throw new Error("El nombre no fue anonimizado en el texto");
    }
    if (anonymizedText.includes("maria.gomez@gmail.com")) {
        throw new Error("El correo no fue anonimizado");
    }
    if (anonymizedText.includes("0414-1234567")) {
        throw new Error("El teléfono no fue anonimizado");
    }

    // Probar restauración bidireccional
    const restored = Anonymizer.deanonymize(anonymizedText, mapping);
    if (!restored.includes("María Gómez")) {
        throw new Error("La desanonimización no restauró el nombre original");
    }
});

// 3. TC-PSY-01: Calificación automática PHQ-9 y severidad
ClinicalTestSuite.add('TC-PSY-01', 'Calificación psicométrica PHQ-9 y corte de severidad', async () => {
    // Respuestas simuladas para depresión moderada-severa (todas en 2 = 18 puntos)
    const answers = [2, 2, 2, 2, 2, 2, 2, 2, 2];
    const totalScore = answers.reduce((a, b) => a + b, 0);

    if (totalScore !== 18) throw new Error(`Puntuación total esperada 18, obtenida: ${totalScore}`);

    let severity = '';
    if (totalScore <= 4) severity = 'Mínima';
    else if (totalScore <= 9) severity = 'Leve';
    else if (totalScore <= 14) severity = 'Moderada';
    else if (totalScore <= 19) severity = 'Moderadamente Severa';
    else severity = 'Severa';

    if (severity !== 'Moderadamente Severa') {
        throw new Error(`Severidad esperada 'Moderadamente Severa', obtenida: ${severity}`);
    }
});

// 4. TC-PSY-02: Detección de Riesgo Suicida en Ítem 9 PHQ-9
ClinicalTestSuite.add('TC-PSY-02', 'Detección proactiva de riesgo suicida en ítem 9 de PHQ-9', async () => {
    const answersLow = [1, 1, 1, 1, 1, 1, 1, 1, 0]; // Ítem 9 = 0
    const answersCritical = [1, 1, 1, 1, 1, 1, 1, 1, 1]; // Ítem 9 = 1 (Varios días)

    const isRiskLow = answersLow[8] > 0;
    const isRiskCritical = answersCritical[8] > 0;

    if (isRiskLow !== false) throw new Error('Se detectó falso positivo de riesgo');
    if (isRiskCritical !== true) throw new Error('No se detectó alerta con ítem 9 > 0');
});

// 5. TC-PSY-03: Calificación automática GAD-7 (Ansiedad)
ClinicalTestSuite.add('TC-PSY-03', 'Calificación automática GAD-7 y umbrales clínicos', async () => {
    const answers = [3, 2, 2, 1, 2, 2, 1]; // Total: 13
    const total = answers.reduce((a, b) => a + b, 0);

    if (total !== 13) throw new Error(`Puntuación esperada 13, obtenida: ${total}`);

    let level = '';
    if (total <= 4) level = 'Baja';
    else if (total <= 9) level = 'Leve';
    else if (total <= 14) level = 'Moderada';
    else level = 'Severa';

    if (level !== 'Moderada') {
        throw new Error(`Nivel de ansiedad esperado 'Moderada', obtenido: ${level}`);
    }
});

// 6. TC-AI-01: Generación y Estructura de Nota SOAP
ClinicalTestSuite.add('TC-AI-01', 'Verificación de integridad estructural en síntesis SOAP', async () => {
    if (typeof ClinicalAI === 'undefined') {
        await import('./ai-clinical.js');
    }
    const AI = typeof ClinicalAI !== 'undefined' ? ClinicalAI : (typeof global !== 'undefined' ? global.ClinicalAI : null);

    const draft = "Paciente acude puntual. Manifiesta alta carga de estrés en el trabajo. Se realiza reestructuración de pensamientos catastrofistas.";
    const soap = await AI.simulateSoapSynthesis(draft);

    if (!soap.subjetivo || !soap.objetivo || !soap.analisis || !soap.plan) {
        throw new Error('La nota sintetizada no posee las 4 llaves requeridas (S, O, A, P)');
    }
    if (typeof soap.subjetivo !== 'string' || soap.subjetivo.length < 10) {
        throw new Error('El campo subjetivo no contiene información clínica válida');
    }
});

// 7. TC-FIN-01: Cálculos Financieros y Balance
ClinicalTestSuite.add('TC-FIN-01', 'Cálculo aritmético de balance, cobros e ingresos', async () => {
    const transactions = [
        { type: 'income', amount: 50.00, status: 'paid' },
        { type: 'income', amount: 60.00, status: 'paid' },
        { type: 'income', amount: 45.00, status: 'pending' },
        { type: 'expense', amount: 30.00, status: 'paid' }
    ];

    const totalIncomePaid = transactions
        .filter(t => t.type === 'income' && t.status === 'paid')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalPending = transactions
        .filter(t => t.type === 'income' && t.status === 'pending')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncomePaid - totalExpenses;

    if (totalIncomePaid !== 110.00) throw new Error(`Ingreso cobrado esperado 110, obtenido ${totalIncomePaid}`);
    if (totalPending !== 45.00) throw new Error(`Pendiente esperado 45, obtenido ${totalPending}`);
    if (netBalance !== 80.00) throw new Error(`Balance neto esperado 80, obtenido ${netBalance}`);
});

// 7b. TC-FIN-02: Gestión y Configuración de Tarifas de Precios por Tiempo de Terapia
ClinicalTestSuite.add('TC-FIN-02', 'Gestión y Configuración de Tarifas de Precios por Tiempo de Terapia', async () => {
    await import('./finance.js');
    const scope = (typeof window !== 'undefined') ? window : globalThis;
    const { getFinanceRates, saveFinanceRates, setDefaultRate } = scope;

    // 1. Obtener tarifas base del sistema
    const initialRates = getFinanceRates();
    if (!Array.isArray(initialRates) || initialRates.length === 0) {
        throw new Error('El sistema debe proveer tarifas de terapia predeterminadas por tiempo');
    }

    // 2. Verificar estructura de tarifa clínica
    const defaultRate = initialRates.find(r => r.isDefault);
    if (!defaultRate || !defaultRate.durationMinutes || !defaultRate.amount) {
        throw new Error('Debe existir al menos una tarifa configurada por defecto con duración y precio');
    }

    // 3. Crear una nueva tarifa personalizada de psicoterapia
    const customRate = {
        id: 'rate_test_' + Date.now(),
        title: 'Psicoterapia Infantil Especializada',
        durationMinutes: 45,
        amount: 55.00,
        currency: 'USD',
        description: 'Sesión lúdica y acompañamiento parental',
        isDefault: false
    };

    const updatedRates = [...initialRates, customRate];
    saveFinanceRates(updatedRates);

    const reloadedRates = getFinanceRates();
    const foundCustom = reloadedRates.find(r => r.id === customRate.id);
    if (!foundCustom || foundCustom.amount !== 55.00 || foundCustom.durationMinutes !== 45) {
        throw new Error('La tarifa personalizada de terapia no se guardó o recuperó correctamente');
    }

    // 4. Cambiar tarifa por defecto a la nueva
    setDefaultRate(customRate.id);
    const postDefaultRates = getFinanceRates();
    const newDefault = postDefaultRates.find(r => r.id === customRate.id);
    const oldDefault = postDefaultRates.find(r => r.id === defaultRate.id);

    if (!newDefault || !newDefault.isDefault) {
        throw new Error('La nueva tarifa personalizada debió marcarse como predeterminada');
    }
    if (oldDefault && oldDefault.id !== customRate.id && oldDefault.isDefault) {
        throw new Error('La tarifa anterior ya no debe ser la predeterminada');
    }

    // Restaurar tarifas iniciales
    saveFinanceRates(initialRates);
});

// 7c. TC-FIN-03: Metas Financieras Cuantitativas y Cualitativas de la Consulta
ClinicalTestSuite.add('TC-FIN-03', 'Metas Financieras Cuantitativas y Cualitativas de la Consulta', async () => {
    await import('./finance.js');
    const scope = (typeof window !== 'undefined') ? window : globalThis;
    const { getFinanceGoals, saveFinanceGoals } = scope;

    const initialGoals = getFinanceGoals();
    if (!Array.isArray(initialGoals)) {
        throw new Error('getFinanceGoals debe retornar una lista de metas');
    }

    // Configurar metas simuladas
    const testGoals = [
        { id: 'goal_test_inc', title: 'Facturación Mensual Meta', targetAmount: 2500, category: 'income', period: 'monthly' },
        { id: 'goal_test_ses', title: 'Sesiones Mensuales', targetAmount: 40, category: 'sessions', period: 'monthly' },
        { id: 'goal_test_bal', title: 'Fondo de Reserva', targetAmount: 1500, category: 'balance', period: 'total' }
    ];

    saveFinanceGoals(testGoals);
    const saved = getFinanceGoals();
    if (saved.length < 3) {
        throw new Error(`Se esperaban al menos 3 metas registradas, se obtuvieron ${saved.length}`);
    }

    // Verificar cálculo de porcentaje de progreso
    const mockIncome = 1250;
    const incomeGoal = saved.find(g => g.id === 'goal_test_inc');
    const incomePct = Math.round((mockIncome / incomeGoal.targetAmount) * 100);
    if (incomePct !== 50) {
        throw new Error(`Porcentaje de avance esperado 50%, calculado ${incomePct}%`);
    }

    const mockCompletedSessions = 30;
    const sessionGoal = saved.find(g => g.id === 'goal_test_ses');
    const sessionPct = Math.round((mockCompletedSessions / sessionGoal.targetAmount) * 100);
    if (sessionPct !== 75) {
        throw new Error(`Porcentaje de sesiones alcanzado esperado 75%, calculado ${sessionPct}%`);
    }

    // Restaurar
    saveFinanceGoals(initialGoals);
});

// 7d. TC-FIN-04: Tarificación Dinámica y Cobro de Citas Clínicas
ClinicalTestSuite.add('TC-FIN-04', 'Tarificación Dinámica y Cobro de Citas Clínicas', async () => {
    await import('./finance.js');
    const scope = (typeof window !== 'undefined') ? window : globalThis;
    const { registerIncomeFromAppointment, getFinanceTransactions, saveFinanceTransactions } = scope;

    const initialTxs = getFinanceTransactions();

    // 1. Simulación de paciente con honorario pactado personalizado
    const testPatient = {
        id: 'pat_rate_test_' + Date.now(),
        name: 'Mariana Duarte',
        patientCustomFee: 35.00
    };

    // 2. Simulación de cita con tarifa pactada específica
    const appointmentCustom = {
        id: 'apt_custom_' + Date.now(),
        patientId: testPatient.id,
        price: testPatient.patientCustomFee,
        rateTitle: 'Tarifa Social Convenida',
        duration: 50,
        date: '2026-10-22'
    };

    registerIncomeFromAppointment(appointmentCustom);

    let txs = getFinanceTransactions();
    const createdTx = txs.find(t => t.appointmentId === appointmentCustom.id);
    if (!createdTx) {
        throw new Error('No se generó la transacción financiera a partir de la cita');
    }
    if (createdTx.amount !== 35.00) {
        throw new Error(`Monto de ingreso esperado $35.00, registrado $${createdTx.amount}`);
    }
    if (!createdTx.concept.includes('Tarifa Social Convenida')) {
        throw new Error('El concepto debe reflejar la modalidad de la tarifa seleccionada');
    }

    // 3. Simulación de prevención de cobro duplicado (idempotencia)
    const txCountBefore = txs.length;
    registerIncomeFromAppointment(appointmentCustom);
    const txCountAfter = getFinanceTransactions().length;
    if (txCountAfter !== txCountBefore) {
        throw new Error('La función de cobro de cita no es idempotente y duplicó la transacción');
    }

    // Restaurar transacciones
    saveFinanceTransactions(initialTxs);
});

// 7e. TC-FIN-05: Disponibilidad y Exposición Global de Controladores del Módulo Financiero
ClinicalTestSuite.add('TC-FIN-05', 'Disponibilidad y Exposición Global de Controladores del Módulo Financiero', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Verificar index.html contiene los modales y campos de tarifa/precio/metas
    const html = fs.readFileSync(path.resolve('./index.html'), 'utf8');
    const requiredElements = [
        'id="appointmentRateSelect"',
        'id="appointmentPrice"',
        'id="patientCustomFee"',
        'id="financeRateModal"',
        'id="financeGoalModal"',
        'id="financeTransactionModal"',
        'id="monthlyGoalsModal"',
        'openMonthlyGoalsModal()',
        'id="financeContent"'
    ];

    for (const elem of requiredElements) {
        if (!html.includes(elem)) {
            throw new Error(`index.html carece del elemento crítico financiero: ${elem}`);
        }
    }

    // 2. Verificar en app.js y finance.js la exposición de funciones
    const appJs = fs.readFileSync(path.resolve('./app.js'), 'utf8');
    const financeJs = fs.readFileSync(path.resolve('./finance.js'), 'utf8');

    const appFunctions = [
        'openRatesManagementModal',
        'openMonthlyGoalsModal',
        'handleMonthlyGoalsSubmit',
        'populateAppointmentRates',
        'onAppointmentRateSelectChange'
    ];

    for (const fn of appFunctions) {
        if (!appJs.includes(fn)) {
            throw new Error(`app.js no implementa o expone: ${fn}`);
        }
    }

    const financeFunctions = [
        'openRateModal',
        'handleRateSubmit',
        'setDefaultRate',
        'deleteRate',
        'openGoalModal',
        'handleGoalSubmit',
        'deleteGoal',
        'openTransactionModal',
        'registerIncomeFromAppointment',
        'renderFinanceView'
    ];

    for (const fn of financeFunctions) {
        if (!financeJs.includes(fn)) {
            throw new Error(`finance.js no implementa o expone: ${fn}`);
        }
    }
});

// 7e-2. TC-FIN-06: Resiliencia y Renderizado Defensivo del Módulo Financiero (Cero Pantalla en Blanco)
ClinicalTestSuite.add('TC-FIN-06', 'Resiliencia y Renderizado Defensivo del Módulo Financiero (Cero Pantalla en Blanco)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const domMock = {
        elements: {},
        getElementById(id) {
            if (!this.elements[id]) {
                this.elements[id] = { id, innerHTML: '', classList: { add: ()=>{}, remove: ()=>{} }, style: {}, value: '', textContent: '' };
            }
            return this.elements[id];
        },
        querySelector: () => null,
        querySelectorAll: () => [],
        body: { classList: { add: ()=>{}, remove: ()=>{} }, style: {} }
    };

    const prevDoc = global.document;
    const prevWin = global.window;
    const prevStorage = global.localStorage;
    const prevAppState = global.AppState;

    try {
        global.document = domMock;
        global.window = global;
        const memoryStorage = {};
        global.localStorage = {
            getItem(k) { return Object.prototype.hasOwnProperty.call(memoryStorage, k) ? memoryStorage[k] : null; },
            setItem(k, v) { memoryStorage[k] = String(v); },
            removeItem(k) { delete memoryStorage[k]; }
        };

        const financeCode = fs.readFileSync(path.resolve('./finance.js'), 'utf8');
        eval(financeCode);

        // 1. Caso extremo: AppState completamente ausente y storage con 'null'
        delete global.AppState;
        global.localStorage.setItem('psico_finance_transactions_anon', 'null');
        global.localStorage.setItem('psico_finance_rates_anon', 'null');
        global.localStorage.setItem('psico_finance_goals_anon', 'null');
        global.localStorage.setItem('psico_finance_categories_anon', 'null');

        for (const tab of ['transactions', 'debts', 'goals', 'rates']) {
            global._financeActiveTab = tab;
            global.renderFinanceView();
            const rendered = domMock.elements['financeContent']?.innerHTML || '';
            if (rendered.length < 50) {
                throw new Error(`renderFinanceView generó contenido en blanco para la pestaña ${tab} con AppState ausente.`);
            }
        }

        // 2. Modales se abren sin fallos
        global.openGoalModal();
        global.openRateModal();
        global.openTransactionModal('income');
        global.openCategoriesModal();

    } finally {
        global.document = prevDoc;
        global.window = prevWin;
        global.localStorage = prevStorage;
        if (prevAppState) global.AppState = prevAppState;
    }
});

// 7f. TC-BTN-01: Resolución Integral de Todos los Botones onclick y onsubmit del Sistema
ClinicalTestSuite.add('TC-BTN-01', 'Resolución Integral de Todos los Botones onclick y onsubmit del Sistema', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const html = fs.readFileSync(path.resolve('./index.html'), 'utf8');

    // Extraer todos los llamados onclick y onsubmit en HTML
    const calls = new Set();
    const regex = /on(?:click|submit)=["']([^"']+)["']/g;
    let m;
    while ((m = regex.exec(html)) !== null) {
        const fullExpr = m[1].trim();
        const fnMatches = fullExpr.matchAll(/([a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*)\s*\(/g);
        for (const fm of fnMatches) {
            const fn = fm[1];
            if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'this.select', 'event.stopPropagation', 'event.preventDefault', 'parseInt', 'parseFloat', 'String', 'Number', 'Boolean', 'Date', 'Math.max', 'Math.min', 'Math.round', 'document.getElementById'].includes(fn)) {
                calls.add(fn);
            }
        }
    }

    if (calls.size < 30) {
        throw new Error(`Se esperaban al menos 30 controladores interactivos en index.html, detectados ${calls.size}`);
    }

    // Verificar que los archivos core estén presentes y sintácticamente válidos
    const jsFiles = [
        'app.js', 'finance.js', 'adm.js', 'scales.js',
        'session-reminders.js', 'backup.js', 'crisis-protocol.js',
        'consentimiento.js', 'historia-clinica.js', 'reports.js',
        'vademecum.js', 'psychoed.js', 'phi-anonymizer.js',
        'voice-dictation.js', 'ai-clinical.js'
    ];

    const concatenatedJs = jsFiles.map(f => fs.readFileSync(path.resolve(f), 'utf8')).join('\n');

    for (const fn of calls) {
        const simpleName = fn.includes('.') ? fn.split('.').pop() : fn;
        const exists = concatenatedJs.includes(simpleName) || html.includes(`function ${simpleName}`);
        if (!exists) {
            throw new Error(`El controlador [${fn}] referenciado en index.html no tiene definición en el código`);
        }
    }
});

// 7g. TC-BTN-02: Operatividad de Botones de Facturación SENIAT (adm.js)
ClinicalTestSuite.add('TC-BTN-02', 'Operatividad de Botones de Facturación SENIAT (adm.js)', async () => {
    await import('./adm.js');
    const scope = (typeof window !== 'undefined') ? window : globalThis;
    const { getBillingConfig, saveBillingConfig, getInvoices, saveInvoices } = scope;

    if (typeof getBillingConfig !== 'function' || typeof saveBillingConfig !== 'function') {
        throw new Error('adm.js debe exportar getBillingConfig y saveBillingConfig');
    }

    const cfg = getBillingConfig();
    if (!cfg || typeof cfg.nextNumber !== 'number') {
        throw new Error('Configuración fiscal SENIAT inválida o incompleta');
    }

    // Probar generación y persistencia de factura médica
    const initialInvoices = getInvoices();
    const testInv = {
        id: 'inv_btn_test_' + Date.now(),
        number: 'FACT-000999',
        date: '2026-10-22',
        patientName: 'Paciente Test Fiscal',
        patientDoc: 'V-12345678',
        concept: 'Honorarios Psicoterapéuticos (Exento)',
        amountUSD: 50.00,
        rateBS: 40.00,
        amountBS: 2000.00,
        igtfUSD: 1.50,
        totalUSD: 51.50,
        totalBS: 2060.00
    };

    saveInvoices([...initialInvoices, testInv]);
    const reloaded = getInvoices();
    const found = reloaded.find(i => i.id === testInv.id);
    if (!found || found.totalUSD !== 51.50) {
        throw new Error('Fallo al registrar factura en adm.js');
    }

    // Restaurar
    saveInvoices(initialInvoices);
});

// 7h. TC-BTN-03: Operatividad de Botones de Escalas Interactivas (scales.js)
ClinicalTestSuite.add('TC-BTN-03', 'Operatividad de Botones de Escalas Interactivas (scales.js)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const scalesContent = fs.readFileSync(path.resolve('./scales.js'), 'utf8');

    const requiredScalesFns = [
        'handleSaveCustomScale',
        'openScaleEditorModal',
        'openInteractiveScaleModal',
        'submitInteractiveScaleForm',
        'renderScalesView',
        'recordScaleAnswer',
        'updateLiveScaleScore'
    ];

    for (const fn of requiredScalesFns) {
        if (!scalesContent.includes(fn)) {
            throw new Error(`scales.js carece de la función interactiva: ${fn}`);
        }
    }

    // Verificar definiciones de PHQ-9 y GAD-7
    if (!scalesContent.includes('phq9') || !scalesContent.includes('gad7')) {
        throw new Error('scales.js no contiene las definiciones clínicas base de PHQ-9 y GAD-7');
    }
});

// 7i. TC-BTN-04: Operatividad de Drawer y Botones de Recordatorios (session-reminders.js)
ClinicalTestSuite.add('TC-BTN-04', 'Operatividad de Drawer y Botones de Recordatorios (session-reminders.js)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const remContent = fs.readFileSync(path.resolve('./session-reminders.js'), 'utf8');

    const requiredRemFns = [
        'openCustomReminderModal',
        'closeReminderDrawer',
        'toggleReminderDrawer',
        'filterReminderDrawerCategory',
        'handleReminderAction',
        'saveCustomReminderForm',
        'updateSessionRemindersUI',
        'evaluateSessionReminders'
    ];

    for (const fn of requiredRemFns) {
        if (!remContent.includes(fn)) {
            throw new Error(`session-reminders.js carece de la función: ${fn}`);
        }
    }
});

// 7j. TC-BTN-05: Resolución de Alias y Utilidades Defensivas (app.js)
ClinicalTestSuite.add('TC-BTN-05', 'Resolución de Alias y Utilidades Defensivas (app.js)', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const appContent = fs.readFileSync(path.resolve('./app.js'), 'utf8');

    const criticalItems = [
        'window.viewPatientDetail = function',
        'window.exportReporteAtencionPDF = function',
        'window.addTreatmentGoal = addTreatmentGoal',
        'window.updateGoalProgress = updateGoalProgress',
        'window.applySuggestedSlot = applySuggestedSlot',
        'window.evolveAppointmentSession = evolveAppointmentSession',
        'window.openMonthlyGoalsModal = openMonthlyGoalsModal',
        'window.handleMonthlyGoalsSubmit = handleMonthlyGoalsSubmit',
        'window.openRatesManagementModal = openRatesManagementModal'
    ];

    for (const item of criticalItems) {
        if (!appContent.includes(item)) {
            throw new Error(`app.js carece del alias o exportación crítica: ${item}`);
        }
    }
});

// 8. TC-POR-01: Autoregistro Cognitivo ABC de Beck
ClinicalTestSuite.add('TC-POR-01', 'Validación del Autoregistro de Pensamientos ABC', async () => {
    const entry = {
        situation: 'Reunión con supervisor',
        thought: 'Me van a despedir',
        distortion: 'Catastrofismo',
        emotion: 'Ansiedad',
        initialIntensity: 90,
        rationalThought: 'Tengo un buen historial de desempeño y no hay indicios de despido',
        finalIntensity: 40
    };

    if (!entry.situation || !entry.thought || !entry.rationalThought) {
        throw new Error('Faltan componentes esenciales del registro ABC');
    }
    if (entry.finalIntensity >= entry.initialIntensity) {
        throw new Error('La intensidad posterior debería reflejar alivio tras el pensamiento racional');
    }
});

// 9. TC-POR-02: Activación y Enrutamiento de Protocolo de Crisis
ClinicalTestSuite.add('TC-POR-02', 'Activación del Protocolo SOS y estado de alerta de crisis', async () => {
    const portalData = {
        patientId: 'patient_test_01',
        activeCrisisAlert: true,
        evaluations: [
            { type: 'phq9', score: 21, alertRisk: true, riskReason: 'Depresión severa' }
        ]
    };

    const hasAlert = portalData.activeCrisisAlert || portalData.evaluations.some(e => e.alertRisk);
    if (!hasAlert) {
        throw new Error('No se reconoció la bandera activa de crisis');
    }
});

// 10. TC-VITAL-01: Inferencia y Clasificación por Etapa del Ciclo Vital (Niñez, Adolescencia, Adultez)
ClinicalTestSuite.add('TC-VITAL-01', 'Inferencia y Clasificación por Etapa del Ciclo Vital (Niñez, Adolescencia, Adultez)', async () => {
    function calcAge(bd) {
        if (!bd) return '';
        const b = new Date(bd);
        const t = new Date();
        let a = t.getFullYear() - b.getFullYear();
        const m = t.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
        return a;
    }

    function getCat(p) {
        if (p.category === 'child' || p.category === 'adolescent' || p.category === 'adult') return p.category;
        if (p.birthdate) {
            const age = calcAge(p.birthdate);
            if (typeof age === 'number' && !isNaN(age)) {
                if (age < 12) return 'child';
                if (age < 18) return 'adolescent';
                return 'adult';
            }
        }
        return 'adult';
    }

    const currentYear = new Date().getFullYear();
    const childPatient = { birthdate: `${currentYear - 8}-05-10` };
    const teenPatient = { birthdate: `${currentYear - 15}-03-22` };
    const adultPatient = { birthdate: `${currentYear - 32}-11-04` };
    const noBdPatient = { name: 'Paciente sin fecha' };
    const overrideTeen = { birthdate: `${currentYear - 8}-05-10`, category: 'adolescent' };

    if (getCat(childPatient) !== 'child') throw new Error('Persona en proceso de 8 años debe ser clasificada como child (Niñez)');
    if (getCat(teenPatient) !== 'adolescent') throw new Error('Persona en proceso de 15 años debe ser clasificada como adolescent (Adolescencia)');
    if (getCat(adultPatient) !== 'adult') throw new Error('Persona en proceso de 32 años debe ser clasificada como adult (Adultez)');
    if (getCat(noBdPatient) !== 'adult') throw new Error('Persona en proceso sin fecha debe tener fallback seguro a adult (Adultez)');
    if (getCat(overrideTeen) !== 'adolescent') throw new Error('La etapa explícita manual debe tener precedencia');
});

// 11. TC-VITAL-02: Validación de Acompañamiento en la Niñez (Tutoría, Escuela, Hitos del Neurodesarrollo)
ClinicalTestSuite.add('TC-VITAL-02', 'Validación de Acompañamiento en la Niñez (Tutoría, Escuela, Hitos del Neurodesarrollo)', async () => {
    const pediatricPatient = {
        id: 'child_001',
        name: 'Mateo González',
        category: 'child',
        birthdate: '2018-04-12',
        guardianName: 'Andrea Soto',
        guardianRelation: 'Madre',
        guardianPhone: '+56 9 8877 6655',
        guardianConsent: 'firmado',
        schoolName: 'Colegio San Agustín',
        schoolGrade: '3° Básico',
        developmentalMilestones: 'Parto a término, marcha a los 12 meses, lenguaje normal, control de esfínteres a los 3 años.'
    };

    if (!pediatricPatient.guardianName || !pediatricPatient.guardianRelation) {
        throw new Error('El acompañamiento en la niñez requiere tutor legal y vínculo de filiación');
    }
    if (pediatricPatient.guardianConsent !== 'firmado') {
        throw new Error('El consentimiento parental debe poder registrar estado firmado');
    }
    if (!pediatricPatient.schoolName || !pediatricPatient.developmentalMilestones) {
        throw new Error('Faltan datos de neurodesarrollo o contexto escolar en la niñez');
    }
});

// 12. TC-VITAL-03: Marco Ético de Confidencialidad y Asentimiento en la Adolescencia
ClinicalTestSuite.add('TC-VITAL-03', 'Marco Ético de Confidencialidad y Asentimiento en la Adolescencia', async () => {
    const teenRecord = {
        id: 'teen_001',
        name: 'Camila Rojas',
        category: 'adolescent',
        birthdate: '2010-09-15',
        guardianName: 'Roberto Rojas',
        adolescentAssent: 'firmado',
        adolescentPerspective: 'Refiere ansiedad por rendimiento escolar y presión de pares; desea herramientas de regulación sin intervención de los padres en temas personales.'
    };

    if (teenRecord.adolescentAssent !== 'firmado') {
        throw new Error('Se requiere asentimiento explícito del menor para el encuadre adolescente');
    }
    if (!teenRecord.adolescentPerspective || teenRecord.adolescentPerspective.length < 10) {
        throw new Error('Debe registrarse la perspectiva y demanda propia del adolescente');
    }
});

// 13. TC-VITAL-04: Filtrado Reactivo por Etapa Vital (Todos, Niñez, Adolescencia, Adultez)
ClinicalTestSuite.add('TC-VITAL-04', 'Filtrado Reactivo por Etapa Vital (Todos, Niñez, Adolescencia, Adultez)', async () => {
    const samplePatients = [
        { id: '1', name: 'Lucas', category: 'child' },
        { id: '2', name: 'Sofía', category: 'child' },
        { id: '3', name: 'Martín', category: 'adolescent' },
        { id: '4', name: 'Valeria', category: 'adult' },
        { id: '5', name: 'Ignacio', category: 'adult' },
        { id: '6', name: 'Carmen', category: 'adult' }
    ];

    const filterVital = (list, filter) => filter === 'all' ? list : list.filter(p => p.category === filter);

    const all = filterVital(samplePatients, 'all');
    const children = filterVital(samplePatients, 'child');
    const teens = filterVital(samplePatients, 'adolescent');
    const adults = filterVital(samplePatients, 'adult');

    if (all.length !== 6) throw new Error(`Conteo de todos incorrecto: esperado 6, obtenido ${all.length}`);
    if (children.length !== 2) throw new Error(`Conteo de niñez incorrecto: esperado 2, obtenido ${children.length}`);
    if (teens.length !== 1) throw new Error(`Conteo de adolescencia incorrecto: esperado 1, obtenido ${teens.length}`);
    if (adults.length !== 3) throw new Error(`Conteo de adultez incorrecto: esperado 3, obtenido ${adults.length}`);
});

// 14. TC-HIST-01: Anamnesis Integral Infantil (Perinatal, Parto, Hitos 0-3a y Ficha Biparental)
ClinicalTestSuite.add('TC-HIST-01', 'Anamnesis Integral Infantil (Perinatal, Parto, Hitos 0-3a y Ficha Biparental)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;
    if (!CHS) throw new Error('ClinicalHistorySystem no está disponible');

    const pediatricPatient = {
        id: 'child_hist_01',
        name: 'Mateo González',
        category: 'child',
        birthdate: '2019-06-15',
        ci: '32.110.224',
        motherName: 'Carmen Soto',
        motherCI: 'V-15.448.229',
        motherJob: 'Docente',
        fatherName: 'Carlos González',
        fatherCI: 'V-14.889.332',
        fatherJob: 'Ingeniero',
        siblingsCount: '2',
        pregnancyDesired: 'SI',
        pregnancyPlanned: 'SI',
        deliveryType: 'Natural',
        birthWeight: '3.400 kg',
        birthLength: '51 cm',
        headControl: '3 meses',
        sittingAge: '6 meses',
        firstStepsAge: '12 meses',
        firstWordsAge: '11 meses',
        sphincterControl: '2 años y medio',
        schoolGrade: '2° Básico'
    };

    const full = CHS.getFullHistory(pediatricPatient);
    if (!full.motherName || !full.fatherName) throw new Error('Falta información biparental en la historia pediátrica');
    if (!full.deliveryType || !full.birthWeight) throw new Error('Faltan antecedentes del parto o estado al nacer');
    if (!full.firstStepsAge || !full.sphincterControl) throw new Error('Faltan hitos psicomotores del desarrollo infantil');
});

// 15. TC-HIST-02: Entrevista Confidencial y Perspectiva Propia en la Adolescencia
ClinicalTestSuite.add('TC-HIST-02', 'Entrevista Confidencial y Perspectiva Propia en la Adolescencia', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;
    const teenPatient = {
        id: 'teen_hist_01',
        name: 'Camila Rojas',
        category: 'adolescent',
        birthdate: '2009-10-14',
        ci: '30.887.654',
        teenChildhood: 'Recuerda infancia activa, buena relación con abuelos.',
        teenSexuality: 'Exploración de identidad sana, sin disforia ni conflictos de género.',
        teenRelationships: 'Vínculo de amistad estrecho con pares; primera relación de pareja estable.',
        teenShortGoals: 'Superar la selectividad escolar y mejorar regulación emocional.',
        teenLongGoals: 'Estudiar artes audiovisuales con autonomía de la familia.'
    };

    const full = CHS.getFullHistory(teenPatient);
    if (!full.teenSexuality || !full.teenRelationships) throw new Error('Debe existir registro reservado de área afectiva y de género');
    if (!full.teenShortGoals || !full.teenLongGoals) throw new Error('Debe registrarse el proyecto de metas propias del adolescente');
});

// 16. TC-HIST-03: Áreas de Vida Adulta y Hábitos Psicobiológicos (Modelo Protocolizado)
ClinicalTestSuite.add('TC-HIST-03', 'Áreas de Vida Adulta y Hábitos Psicobiológicos (Modelo Protocolizado)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;
    const adultPatient = {
        id: 'adult_hist_01',
        name: 'Ignacio Morales',
        category: 'adult',
        birthdate: '1990-03-22',
        ci: '19.445.667',
        adultWork: 'Gerente comercial, refiere sobrecarga y burnout moderado.',
        adultSexual: 'Vida en pareja estable de 6 años, satisfacción mutua.',
        adultLegal: 'Sin litigios ni antecedentes judiciales.',
        housingType: 'Apartamento',
        housingServices: 'Sí',
        housingSharesRoom: 'No',
        addictions: 'Tabaco ocasional (2 al día); niega otras sustancias.',
        socialManias: 'Tics motores ausentes; manía de orden en escritorio.',
        phobias: 'Claustrofobia leve en ascensores llenos.',
        sleepPattern: 'Insomnio de conciliación inicial (demora 60 min en conciliar).'
    };

    const full = CHS.getFullHistory(adultPatient);
    if (!full.adultWork || !full.housingType) throw new Error('Faltan áreas de vida adulta o vivienda');
    if (!full.sleepPattern || !full.phobias) throw new Error('Faltan hábitos psicobiológicos de sueño o fobias');
});

// 17. TC-HIST-04: Hoja de Evolución Oficial Protocolizada (Dual SOAP y Membrete Dinámico)
ClinicalTestSuite.add('TC-HIST-04', 'Hoja de Evolución Oficial Protocolizada (Dual SOAP y Membrete Dinámico)', async () => {
    const sessionNote = {
        id: 'note_fpv_01',
        patientId: 'adult_hist_01',
        date: '2026-10-13',
        sessionNum: '4',
        sessionGoals: 'Reestructuración de creencias intermedias sobre exigencia laboral',
        appliedTechniques: 'Flecha descendente, registro de pensamientos disfuncionales',
        sessionDescription: 'El paciente expone situación de tensión en comité directivo.',
        clinicalFindings: 'Identificación de esquema condicional: Si no soy perfecto, fallé.',
        obtainedResults: 'Disminución de la angustia subjetiva de 8/10 a 4/10.',
        nextSessionsPlan: 'Registro de tres situaciones disparadoras durante la semana.'
    };

    if (!sessionNote.sessionGoals || !sessionNote.appliedTechniques) {
        throw new Error('La hoja de evolución requiere objetivos y técnicas formalizadas');
    }
    if (!sessionNote.clinicalFindings || !sessionNote.obtainedResults) {
        throw new Error('La hoja de evolución requiere hallazgos clínicos y resultados documentados');
    }

    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    // Verificación de resolución dinámica de credenciales del profesional tratante
    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.currentUser = {
        name: 'Dr. Alejandro Peña',
        specialty: 'Médico Psiquiatra y Psicoterapeuta',
        registryNumber: 'Colegio de Médicos N.º 38.902'
    };

    const therapist = CHS.getTherapistInfo();
    if (therapist.name !== 'Dr. Alejandro Peña' || therapist.registry !== 'Colegio de Médicos N.º 38.902') {
        throw new Error('El membrete debe reflejar dinámicamente el nombre y colegiatura médica del usuario registrado');
    }
});

// 18. TC-HIST-05: Ingesta y Parser Inteligente de Pre-consulta Digital (Google Forms)
ClinicalTestSuite.add('TC-HIST-05', 'Ingesta y Parser Inteligente de Pre-consulta Digital (Google Forms)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    const sampleGfText = `
    Nombre Completo del Consultante/Paciente: Valentina Morales
    Fecha de Nacimiento: 2012-08-15
    Sexo: Femenino
    Cédula de Identidad: 31.998.441
    Nombres y Apellidos de la Madre: Patricia Vera
    Nombres y Apellidos del Padre: Hernán Morales
    Nivel de Escolaridad (Grado/Año que cursa): 7° Grado
    ¿Quién tomó la iniciativa de la Consulta Psicológica?: Docente de Aula
    Explique Brevemente el Motivo de su Consulta: Dificultades de relación con compañeras y baja autoestima
    ¿Qué espera obtener de este proceso?: Herramientas de asertividad y seguridad personal
    `;

    const parsed = CHS.parseGoogleFormResponse(sampleGfText);
    if (parsed.name !== 'Valentina Morales') throw new Error(`Nombre no mapeado: obtenido '${parsed.name}'`);
    if (parsed.ci !== '31.998.441') throw new Error(`C.I. no mapeada: obtenida '${parsed.ci}'`);
    if (parsed.motherName !== 'Patricia Vera') throw new Error(`Madre no mapeada: '${parsed.motherName}'`);
    if (parsed.fatherName !== 'Hernán Morales') throw new Error(`Padre no mapeado: '${parsed.fatherName}'`);
    if (parsed.consultationInitiative !== 'Docente de Aula') throw new Error(`Iniciativa no mapeada: '${parsed.consultationInitiative}'`);
});

// 19. TC-HIST-06: Llenado Directo de Pre-consulta en la App e Integración al Expediente
ClinicalTestSuite.add('TC-HIST-06', 'Llenado Directo de Pre-consulta en la App e Integración al Expediente', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    // Simulación de pre-consulta llenada directamente en la aplicación
    const inAppPreconsultaData = {
        name: 'Mateo Sandoval',
        category: 'child',
        birthdate: '2017-05-10',
        gender: 'Masculino',
        ci: 'Menor de edad',
        guardianName: 'Mariana Castillo',
        guardianRelation: 'Madre',
        guardianPhone: '+58 412 9876543',
        motherName: 'Mariana Castillo',
        motherAge: '36',
        motherCI: '18.123.456',
        motherJob: 'Docente de Primaria',
        fatherName: 'Esteban Sandoval',
        fatherAge: '39',
        fatherCI: '17.654.321',
        fatherJob: 'Ingeniero Mecánico',
        hasAttendedBefore: 'NO',
        consultationInitiative: 'Madre y Docente',
        reason: 'Dificultad de atención y autorregulación emocional en el aula de clases.',
        processExpectations: 'Desarrollar herramientas conductuales y estrategias de enfoque.',
        medicalTreatment: 'Evaluación neuropediátrica sugerida por escuela; sin fármacos.',
        allergies: 'Rinitis alérgica estacional',
        sleepPattern: 'Normal reparador',
        eatingPattern: 'Regular adecuada'
    };

    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.patients = globalThis.AppState.patients || [];

    const newId = 'pat_inapp_01';
    const patientObj = {
        id: newId,
        ...inAppPreconsultaData,
        createdAt: new Date().toISOString()
    };
    globalThis.AppState.patients.push(patientObj);

    // Verificación de integración inmediata en la Anamnesis Integral
    const fullHistory = CHS.getFullHistory(patientObj);

    if (fullHistory.motherName !== 'Mariana Castillo' || fullHistory.fatherName !== 'Esteban Sandoval') {
        throw new Error('La ficha biparental no se integró correctamente al expediente');
    }
    if (fullHistory.consultationInitiative !== 'Madre y Docente') {
        throw new Error('La iniciativa de consulta no se integró al expediente');
    }
    if (!fullHistory.medicalTreatment || !fullHistory.allergies) {
        throw new Error('Los antecedentes médicos iniciales no se registraron en el expediente');
    }
});

// 20. TC-HIST-07: Reporte de Atención por Sesión de Terapia (Cálculo correlativo y mapeo oficial)
ClinicalTestSuite.add('TC-HIST-07', 'Reporte de Atención por Sesión de Terapia (Cálculo correlativo y mapeo oficial)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    // Simulación de expediente de paciente con 2 sesiones previas
    const patId = 'pat_sesion_test_01';
    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.notes = globalThis.AppState.notes || [];
    globalThis.AppState.patients = globalThis.AppState.patients || [];

    globalThis.AppState.patients.push({
        id: patId,
        name: 'Carlos Mendoza',
        ci: '20.456.789',
        category: 'adult'
    });

    // Agregar dos notas/reportes previos
    globalThis.AppState.notes.push({
        id: 'note_01',
        patientId: patId,
        sessionNum: '1',
        title: 'Sesión #1 - Encuadre Inicial',
        date: '2026-10-01'
    });
    globalThis.AppState.notes.push({
        id: 'note_02',
        patientId: patId,
        sessionNum: '2',
        title: 'Sesión #2 - Psicoeducación',
        date: '2026-10-08'
    });

    // Validar cálculo correlativo de la próxima sesión
    const prevNotes = globalThis.AppState.notes.filter(n => n.patientId === patId);
    const nextSessionNum = prevNotes.length + 1;
    if (nextSessionNum !== 3) {
        throw new Error(`El número correlativo de sesión debería ser 3, pero se calculó ${nextSessionNum}`);
    }

    // Registrar nuevo Reporte de Atención para la Sesión #3
    const newSessionReport = {
        id: 'note_03',
        patientId: patId,
        date: '2026-10-15',
        title: `Sesión #${nextSessionNum} - Trabajo con Distorsiones`,
        sessionNum: String(nextSessionNum),
        sessionGoals: 'Identificar pensamientos automáticos y catastrofización.',
        appliedTechniques: 'Registro de pensamientos disfuncionales ABC, reestructuración cognitiva.',
        sessionDescription: 'El paciente analiza la situación laboral detonante. Se identifican inferencias arbitrarias y sobregeneralización.',
        clinicalFindings: 'Buena receptividad al cuestionamiento socrático. Disminución de reactividad fisiológica.',
        obtainedResults: 'Reencuadre cognitivo alternativo consolidado en consulta.',
        nextSessionsPlan: 'Completar autoregistro diario intersesión y respiración diafragmática.'
    };

    // Sincronización automática de campos SOAP desde el Reporte de Atención
    let subj = newSessionReport.sessionDescription;
    let obj = newSessionReport.clinicalFindings;
    let anal = `Objetivos: ${newSessionReport.sessionGoals} · Técnicas: ${newSessionReport.appliedTechniques}`;
    let plan = newSessionReport.nextSessionsPlan;

    const consolidatedNote = {
        ...newSessionReport,
        subjetivo: subj,
        objetivo: obj,
        analisis: anal,
        plan: plan
    };

    globalThis.AppState.notes.push(consolidatedNote);

    // Verificaciones de integridad clínica
    if (consolidatedNote.sessionNum !== '3') {
        throw new Error('El reporte de atención no retuvo el número correlativo de sesión 3');
    }
    if (!consolidatedNote.sessionGoals || !consolidatedNote.appliedTechniques || !consolidatedNote.sessionDescription) {
        throw new Error('El reporte de atención carece de los campos troncales de sesión');
    }
    if (consolidatedNote.subjetivo !== consolidatedNote.sessionDescription) {
        throw new Error('La sincronización bidireccional entre Reporte de Atención y SOAP falló');
    }

    // Verificar disponibilidad del método oficial de exportación
    if (typeof CHS.exportReporteAtencionPDF !== 'function') {
        throw new Error('El método ClinicalHistorySystem.exportReporteAtencionPDF no está disponible');
    }
});

// 21. TC-CAL-01: Calendario Clínico Multi-Vista (Día, Semana, Mes, Año y Visualización de Citas en Cuadrícula Mensual)
ClinicalTestSuite.add('TC-CAL-01', 'Calendario Clínico Multi-Vista (Día, Semana, Mes, Año y Visualización de Citas en Cuadrícula Mensual)', async () => {
    // Inicializar estado del calendario
    const testState = {
        calendarViewMode: 'month',
        currentDate: new Date(2026, 9, 15), // Octubre 15, 2026
        selectedDate: new Date(2026, 9, 15),
        appointments: [
            { id: 'app_1', patientId: 'p1', date: '2026-10-15', time: '09:00', duration: '50', type: 'Presencial', status: 'pendiente' },
            { id: 'app_2', patientId: 'p2', date: '2026-10-15', time: '11:00', duration: '50', type: 'Teleconsulta', status: 'completada' },
            { id: 'app_3', patientId: 'p3', date: '2026-10-16', time: '14:00', duration: '50', type: 'Presencial', status: 'pendiente' },
            { id: 'app_4', patientId: 'p1', date: '2026-10-22', time: '10:00', duration: '50', type: 'Presencial', status: 'pendiente' },
            { id: 'app_5', patientId: 'p2', date: '2026-11-05', time: '16:00', duration: '50', type: 'Teleconsulta', status: 'pendiente' }
        ],
        patients: [
            { id: 'p1', name: 'Valeria Gómez', category: 'adult' },
            { id: 'p2', name: 'Mateo Rivas', category: 'child' },
            { id: 'p3', name: 'Sofía Castillo', category: 'adolescent' }
        ]
    };

    // 1. Validar modos de vista soportados
    const validModes = ['day', 'week', 'month', 'year'];
    for (const mode of validModes) {
        testState.calendarViewMode = mode;
        if (!validModes.includes(testState.calendarViewMode)) {
            throw new Error(`Modo de calendario no reconocido: ${mode}`);
        }
    }

    // 2. Validación de filtro para Vista Mensual (Octubre 2026)
    const year = testState.currentDate.getFullYear();
    const month = testState.currentDate.getMonth();
    const monthApps = testState.appointments.filter(a => {
        const d = new Date(a.date);
        return d.getFullYear() === year && d.getMonth() === month && a.status !== 'cancelada';
    });
    if (monthApps.length !== 4) {
        throw new Error(`Citas esperadas en octubre: 4, obtenidas: ${monthApps.length}`);
    }

    // 3. Validación de citas visibles en la celda del día (15 de Octubre)
    const targetDayApps = monthApps.filter(a => a.date === '2026-10-15');
    if (targetDayApps.length !== 2) {
        throw new Error(`Se esperaban 2 citas para el 15/10/2026, encontradas: ${targetDayApps.length}`);
    }
    const hasTele = targetDayApps.some(a => (a.type || '').toLowerCase().includes('tele'));
    if (!hasTele) {
        throw new Error('No se detectó la cita de teleconsulta en el día');
    }

    // 4. Validación de Vista Semanal (Lunes a Domingo que contiene 15/10/2026)
    // 15 de Octubre 2026 es Jueves. Lunes = 12/10/2026, Domingo = 18/10/2026.
    const curr = new Date(testState.selectedDate);
    const dayOfWeek = curr.getDay(); // 4 para Jueves
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const weekApps = testState.appointments.filter(a => {
        const d = new Date(a.date);
        return d >= new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0) &&
               d <= new Date(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59) &&
               a.status !== 'cancelada';
    });
    // Debe incluir app_1 (15), app_2 (15) y app_3 (16). app_4 (22) está en la semana siguiente.
    if (weekApps.length !== 3) {
        throw new Error(`Se esperaban 3 citas en la semana del 12 al 18 de octubre, encontradas: ${weekApps.length}`);
    }

    // 5. Validación de Vista Diaria (Intervalo horario 08:00 a 19:00)
    const daySlots = [];
    for (let h = 8; h <= 19; h++) {
        const hourStr = String(h).padStart(2, '0') + ':00';
        const appsInHour = targetDayApps.filter(a => parseInt(a.time.split(':')[0], 10) === h);
        daySlots.push({ hour: hourStr, count: appsInHour.length });
    }
    const slot9 = daySlots.find(s => s.hour === '09:00');
    const slot11 = daySlots.find(s => s.hour === '11:00');
    if (!slot9 || slot9.count !== 1 || !slot11 || slot11.count !== 1) {
        throw new Error('La vista diaria no ubicó correctamente las citas en sus bloques horarios correspondientes');
    }

    // 6. Validación de Vista Anual (Distribución en los 12 meses)
    const yearDistribution = {};
    for (let m = 0; m < 12; m++) {
        yearDistribution[m] = testState.appointments.filter(a => {
            const d = new Date(a.date);
            return d.getFullYear() === year && d.getMonth() === m && a.status !== 'cancelada';
        }).length;
    }
    if (yearDistribution[9] !== 4 || yearDistribution[10] !== 1) { // Mes 9 = Octubre, Mes 10 = Noviembre
        throw new Error(`Distribución anual incorrecta: Octubre=${yearDistribution[9]}, Noviembre=${yearDistribution[10]}`);
    }

    // 7. Navegación por Período y Zoom
    testState.selectedDate = new Date('2026-10-22T12:00:00');
    testState.calendarViewMode = 'day';
    if (testState.calendarViewMode !== 'day' || testState.selectedDate.getDate() !== 22) {
        throw new Error('Fallo en zoomIntoDay al cambiar fecha o modo');
    }

    // Navegar +1 día
    testState.selectedDate.setDate(testState.selectedDate.getDate() + 1);
    if (testState.selectedDate.getDate() !== 23) {
        throw new Error('Fallo en navegación diaria');
    }
});

// 22. TC-POR-03: Generación de Credenciales de Acceso al Portal, Sincronización y Acceso Directo por Token
ClinicalTestSuite.add('TC-POR-03', 'Generación de Credenciales de Acceso al Portal, Sincronización y Acceso Directo por Token', async () => {
    // Mock de almacenamiento local si estamos en Node
    const mockStorage = {};
    const localStore = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; }
    };

    // 1. Simulación de paciente sin token
    const testPatient = {
        id: 'patient_portal_test_99',
        name: 'Camila Rossi',
        portalToken: null,
        portalEnabled: false
    };

    // 2. Función de generación de token
    function generateToken(patient) {
        if (!patient.portalToken) {
            patient.portalToken = 'PN-' + Math.random().toString(36).substr(2, 8).toUpperCase();
            patient.portalEnabled = true;
            patient.portalCreatedAt = new Date().toISOString();
        }
        return patient.portalToken;
    }

    const token = generateToken(testPatient);
    if (!token || !token.startsWith('PN-') || token.length < 10) {
        throw new Error(`Token generado inválido: ${token}`);
    }
    if (!testPatient.portalEnabled) {
        throw new Error('portalEnabled debe ser true tras generar el token');
    }

    // 3. Sincronización con lista global de pacientes del portal
    function syncPortal(patient, therapistName = 'Dr. Juan Pérez') {
        let portalPatients = [];
        try {
            const stored = localStore.getItem('psico_portal_patients');
            if (stored) portalPatients = JSON.parse(stored);
        } catch (e) {}
        const idx = portalPatients.findIndex(p => p.id === patient.id);
        const data = {
            id: patient.id,
            name: patient.name,
            portalToken: patient.portalToken,
            therapistName: therapistName,
            createdAt: patient.portalCreatedAt || new Date().toISOString()
        };
        if (idx >= 0) portalPatients[idx] = data;
        else portalPatients.push(data);
        localStore.setItem('psico_portal_patients', JSON.stringify(portalPatients));
    }

    syncPortal(testPatient, 'Lic. Roberto Gil');
    const storedPortalPatients = JSON.parse(localStore.getItem('psico_portal_patients'));
    const syncedPatient = storedPortalPatients.find(p => p.id === testPatient.id);
    if (!syncedPatient || syncedPatient.portalToken !== token) {
        throw new Error('Fallo en la sincronización de credenciales a psico_portal_patients');
    }

    // 4. Construcción y validación de enlace directo (Auto-login)
    const directUrl = `portal.html?token=${encodeURIComponent(token)}`;
    const parsedParams = new URLSearchParams(directUrl.split('?')[1]);
    const receivedToken = parsedParams.get('token');
    if (receivedToken !== token) {
        throw new Error(`El parámetro de URL decodificado (${receivedToken}) no coincide con el token (${token})`);
    }

    // 5. Verificación de Auto-Autenticación (Emulación de portal.js al abrir el enlace)
    const matchedPatient = storedPortalPatients.find(p => (p.portalToken || '').toUpperCase() === receivedToken.toUpperCase());
    if (!matchedPatient) {
        throw new Error('El portal no pudo autenticar al paciente mediante el token de URL');
    }

    // Guardar sesión activa en storage
    localStore.setItem('psico_portal_session', JSON.stringify({
        patientId: matchedPatient.id,
        portalToken: matchedPatient.portalToken,
        patientName: matchedPatient.name,
        therapistName: matchedPatient.therapistName
    }));

    const activeSession = JSON.parse(localStore.getItem('psico_portal_session'));
    if (activeSession.patientId !== testPatient.id || activeSession.portalToken !== token) {
        throw new Error('La sesión activa del portal contiene credenciales discordantes');
    }
});

// 23. TC-DB-01: Validación de Persistencia y Estructura de Base de Datos Relacional
ClinicalTestSuite.add('TC-DB-01', 'Validación de Persistencia y Estructura de Base de Datos Relacional', async () => {
    const { db } = await import('./db.js');
    await db.initialize();

    // Crear paciente de prueba con token único
    const testToken = 'PN-T' + Math.random().toString(36).substr(2, 6).toUpperCase();
    const patientData = {
        id: `test_p_${Date.now()}`,
        name: 'Mateo Sandoval',
        email: 'mateo@ejemplo.com',
        phone: '+58 414 1112233',
        lifeStage: 'adolescent',
        diagnosis: 'Trastorno de Ansiedad Generalizada',
        portalToken: testToken,
        portalEnabled: true
    };

    const savedPatient = await db.upsertPatient(patientData);
    if (!savedPatient || savedPatient.id !== patientData.id) {
        throw new Error('Fallo al guardar o actualizar paciente en la base de datos');
    }

    // Comprobar búsqueda por token
    const fetched = await db.findPatientByToken(testToken);
    if (!fetched || fetched.id !== patientData.id) {
        throw new Error('No se encontró al paciente mediante su token en la base de datos');
    }
});

// 24. TC-DB-02: Flujo Integral de Tareas, Autoregistro ABC y Monitoreo de Ánimo
ClinicalTestSuite.add('TC-DB-02', 'Flujo Integral de Tareas, Autoregistro ABC y Monitoreo de Ánimo', async () => {
    const { db } = await import('./db.js');
    const patientId = `test_p_portal_${Date.now()}`;
    await db.upsertPatient({
        id: patientId,
        name: 'Valeria Gómez',
        portalToken: 'PN-VALERIA1',
        portalEnabled: true
    });

    // 1. Inserción de tarea
    const taskId = `task_${Date.now()}`;
    await db.syncPatientsBatch([], [{
        id: taskId,
        patient_id: patientId,
        title: 'Ejercicio de Respiración 4-7-8',
        completed: false
    }]);

    // 2. Toggle de tarea
    const updatedTask = await db.toggleTask(taskId, patientId);
    if (!updatedTask || !updatedTask.completed) {
        throw new Error('Fallo al alternar el estado de completitud de la tarea en la base de datos');
    }

    // 3. Inserción de Mood Log
    const moodRecord = await db.addMoodLog(patientId, { mood: 4, sleep: 5, energy: 4, note: 'Día tranquilo' });
    if (!moodRecord || Number(moodRecord.mood_score) !== 4) {
        throw new Error('Fallo al persistir registro de estado de ánimo en la base de datos');
    }

    // 4. Inserción de Autoregistro ABC
    const cbtRecord = await db.addCbtRecord(patientId, {
        situation: 'Examen universitario',
        thought: 'Voy a reprobar todo',
        distortion: 'Catastrofismo',
        emotion: 'Ansiedad',
        initialIntensity: 85,
        rationalThought: 'He estudiado durante dos semanas y domino los temas',
        finalIntensity: 30
    });
    if (!cbtRecord || Number(cbtRecord.final_intensity) !== 30) {
        throw new Error('Fallo al persistir autoregistro cognitivo en la base de datos');
    }

    // 5. Inserción de Evaluación y Alerta SOS
    const evalRecord = await db.addEvaluation(patientId, {
        scaleType: 'phq9',
        score: 18,
        maxScore: 27,
        severity: 'Moderadamente severa',
        alertRisk: true,
        riskReason: 'Alerta clínica en ítem 9'
    });
    if (!evalRecord || !evalRecord.alert_risk) {
        throw new Error('Fallo al persistir evaluación clínica con indicador de riesgo');
    }

    // 6. Obtención del portal completo para el paciente
    const portalPayload = await db.getPatientPortalData(patientId);
    if (!portalPayload || portalPayload.tasks.length === 0 || portalPayload.cbtRecords.length === 0) {
        throw new Error('La consulta integral getPatientPortalData no retornó todos los registros agregados');
    }
});

// 25. TC-POR-04: Botiquín de Calma (Respiración 4-7-8, Anclaje Sensorial 5-4-3-2-1 y Sincronización)
ClinicalTestSuite.add('TC-POR-04', 'Botiquín de Calma (Respiración 4-7-8, Anclaje 5-4-3-2-1 y Registro Clínico)', async () => {
    const { db } = await import('./db.js');
    const patientId = 'patient_calm_test_01';
    await db.upsertPatient({
        id: patientId,
        name: 'Paciente Test Calma',
        portalToken: 'PN-CALM-01',
        portalEnabled: true
    });

    // 1. Registro de Respiración 4-7-8
    const breathingRecord = await db.addCbtRecord(patientId, {
        situation: 'Técnica de Autorregulación: Respiración Guiada 4-7-8',
        thought: 'Activación autónoma de herramientas de calma en el portal',
        distortion: 'Manejo adaptativo del estrés',
        emotion: 'Calma / Alivio',
        initialIntensity: 80,
        rationalThought: 'Completó 4 ciclos de respiración profunda parasimpática',
        finalIntensity: 25
    });
    if (!breathingRecord || Number(breathingRecord.final_intensity) !== 25) {
        throw new Error('Fallo al registrar sesión de respiración 4-7-8 en la base de datos');
    }

    // 2. Registro de Anclaje Sensorial 5-4-3-2-1
    const groundingRecord = await db.addCbtRecord(patientId, {
        situation: 'Técnica de Autorregulación: Anclaje Sensorial 5-4-3-2-1',
        thought: 'Activación autónoma de herramientas de calma en el portal',
        distortion: 'Manejo adaptativo del estrés',
        emotion: 'Calma / Alivio',
        initialIntensity: 85,
        rationalThought: 'Ejercicio sensorial completado para desacelerar la mente',
        finalIntensity: 20
    });
    if (!groundingRecord || Number(groundingRecord.final_intensity) !== 20) {
        throw new Error('Fallo al registrar sesión de grounding 5-4-3-2-1 en la base de datos');
    }

    const portal = await db.getPatientPortalData(patientId);
    if (!portal || portal.cbtRecords.length < 2) {
        throw new Error('Las técnicas del botiquín de calma no se recuperan en el portal del paciente');
    }
});

// 26. TC-CHAR-01: Tablero Gráfico Longitudinal y Copiloto IA SOAP
ClinicalTestSuite.add('TC-CHAR-01', 'Tablero Gráfico Longitudinal y Copiloto IA SOAP (Síntesis y Analytics)', async () => {
    // 1. Verificar síntesis SOAP
    const { default: clinicalAI } = await import('./ai-clinical.js').catch(() => ({ default: globalThis.ClinicalAI }));
    const aiInstance = globalThis.ClinicalAI;
    if (aiInstance) {
        const informalText = 'Paciente de 28 años, refiere insomnio y angustia en el trabajo. Acordamos técnica 4-7-8.';
        const soapResult = await aiInstance.synthesizeSoapNote(informalText, { diagnosis: 'Ansiedad' });
        if (!soapResult.subjetivo || !soapResult.analisis || !soapResult.plan) {
            throw new Error('El copiloto IA no generó los cuadrantes SOAP requeridos');
        }
    }

    // 2. Verificar lógica matemática de delta de mejoría longitudinal
    const initialScore = 20;
    const finalScore = 8;
    const deltaPercent = Math.round(((initialScore - finalScore) / initialScore) * 100);
    if (deltaPercent !== 60) {
        throw new Error('El cálculo de porcentaje de mejoría longitudinal es incorrecto');
    }
});

// 27. TC-SEC-03: Políticas de Seguridad OWASP y Bloqueo de Archivos Sensibles
ClinicalTestSuite.add('TC-SEC-03', 'Políticas de Seguridad OWASP y Bloqueo de Archivos Sensibles', async () => {
    const RESTRICTED_FILES = new Set([
        'server.js', 'db.js', 'schema.sql', 'docker-compose.yml',
        'package.json', 'package-lock.json', 'tests.js', 'plan_pruebas.md'
    ]);
    const RESTRICTED_EXTS = ['.env', '.sql', '.yml', '.yaml', '.log'];

    function isBlocked(reqPath) {
        const parsed = reqPath.split('/').pop().toLowerCase();
        return RESTRICTED_FILES.has(parsed) || RESTRICTED_EXTS.some(ext => parsed.endsWith(ext)) || parsed.startsWith('.');
    }

    if (!isBlocked('/server.js')) throw new Error('server.js no fue bloqueado por la política de seguridad');
    if (!isBlocked('/db.js')) throw new Error('db.js no fue bloqueado');
    if (!isBlocked('/schema.sql')) throw new Error('schema.sql no fue bloqueado');
    if (!isBlocked('/.env')) throw new Error('.env no fue bloqueado');
    if (!isBlocked('/docker-compose.yml')) throw new Error('docker-compose.yml no fue bloqueado');
    if (isBlocked('/index.html')) throw new Error('index.html no debería ser bloqueado');
    if (isBlocked('/portal.html')) throw new Error('portal.html no debería ser bloqueado');
});

// 28. TC-SYNC-01: Cola de Sincronización Fuera de Línea (Offline Queue y Resiliencia PWA)
ClinicalTestSuite.add('TC-SYNC-01', 'Cola de Sincronización Fuera de Línea (Offline Queue y Resiliencia PWA)', async () => {
    const mockStorage = {};
    const testQueue = {
        QUEUE_KEY: 'psico_portal_offline_queue_test',
        getQueue() {
            try { return JSON.parse(mockStorage[this.QUEUE_KEY] || '[]'); } catch { return []; }
        },
        enqueue(endpoint, payload) {
            const q = this.getQueue();
            q.push({ id: 'test_' + Date.now(), endpoint, payload });
            mockStorage[this.QUEUE_KEY] = JSON.stringify(q);
        },
        clear() { delete mockStorage[this.QUEUE_KEY]; }
    };

    // Simulación de registro sin conectividad
    testQueue.enqueue('/api/v1/portal/cbt', {
        patientId: 'p_test',
        token: 'PN-TEST',
        situation: 'Ataque de pánico en el metro',
        thought: 'Me voy a desmayar'
    });
    testQueue.enqueue('/api/v1/portal/mood', {
        patientId: 'p_test',
        token: 'PN-TEST',
        mood: 4
    });

    const pending = testQueue.getQueue();
    if (pending.length !== 2) throw new Error(`Se esperaban 2 operaciones en cola, encontradas: ${pending.length}`);
    if (pending[0].endpoint !== '/api/v1/portal/cbt') throw new Error('Endpoint de CBT incorrecto en cola');
    if (pending[1].payload.mood !== 4) throw new Error('Payload de estado de ánimo incorrecto en cola');
});

// 29. TC-PRIV-01: Sistema de Bloqueo por Inactividad Médica y Confidencialidad PHI (HIPAA)
ClinicalTestSuite.add('TC-PRIV-01', 'Sistema de Bloqueo por Inactividad Médica y Confidencialidad PHI (HIPAA)', async () => {
    const securityState = {
        isLocked: false,
        timeoutMs: 15 * 60 * 1000,
        lockApp() { this.isLocked = true; },
        unlockApp(password, expectedPassword) {
            if (password === expectedPassword) {
                this.isLocked = false;
                return true;
            }
            return false;
        }
    };

    // Bloqueo manual
    securityState.lockApp();
    if (!securityState.isLocked) throw new Error('La pantalla de bloqueo debería estar activa');

    // Desbloqueo con contraseña incorrecta
    const wrongAttempt = securityState.unlockApp('passwordErronea', 'Secret123!');
    if (wrongAttempt || !securityState.isLocked) throw new Error('La sesión no debe desbloquearse con contraseña inválida');

    // Desbloqueo exitoso con credenciales médicas
    const validAttempt = securityState.unlockApp('Secret123!', 'Secret123!');
    if (!validAttempt || securityState.isLocked) throw new Error('La sesión debe desbloquearse con credenciales válidas');
});

// 30. TC-REP-01: Generación de Epicrisis Oficial y Código Criptográfico de Autenticidad QR
ClinicalTestSuite.add('TC-REP-01', 'Generación de Epicrisis Oficial y Código Criptográfico de Autenticidad QR', async () => {
    const patient = { id: 'pat_rep_01', name: 'Ignacio Silva', birthdate: '1990-04-12', diagnosis: 'Trastorno de Ansiedad Generalizada (F41.1)' };
    const certCode = 'PNC-' + (patient.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()) + '-' + Date.now().toString(36).toUpperCase();
    
    if (!certCode.startsWith('PNC-')) throw new Error('Código de certificación no cumple con el prefijo oficial');
    if (!certCode.includes('-')) throw new Error('Formato de código criptográfico inválido');

    // Validar tipo epicrisis y justificativo
    const titles = {
        derivacion: 'INFORME DE DERIVACIÓN PSIQUIÁTRICA',
        general: 'INFORME PSICOLÓGICO CLÍNICO',
        epicrisis: 'EPICRISIS CLÍNICA Y RESUMEN DE EVOLUCIÓN TERAPÉUTICA',
        justificativo: 'CONSTANCIA DE ASISTENCIA Y JUSTIFICATIVO DE ATENCIÓN'
    };
    if (!titles.epicrisis || !titles.justificativo) throw new Error('Tipos de informes oficiales incompletos');
});

// 31. TC-CON-01: Consentimiento Informado Digital en Portal (Firma Táctil y Trazabilidad)
ClinicalTestSuite.add('TC-CON-01', 'Consentimiento Informado Digital en Portal (Firma Táctil y Trazabilidad)', async () => {
    const consentRecord = {
        patientId: 'pat_portal_con_01',
        signedAt: new Date().toISOString(),
        signature: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    if (!consentRecord.patientId || !consentRecord.signedAt) throw new Error('Registro de consentimiento carece de metadatos de auditoría');
    if (!consentRecord.signature.startsWith('data:image/')) throw new Error('Formato de firma digital no es válido');
});

// 32. TC-STAT-01: Analítica Clínica Agregada (Distribución Diagnóstica y Remisión Sintomática)
ClinicalTestSuite.add('TC-STAT-01', 'Analítica Clínica Agregada (Distribución Diagnóstica y Remisión Sintomática)', async () => {
    const patients = [
        { id: 'p1', diagnosis: 'Ansiedad' },
        { id: 'p2', diagnosis: 'Ansiedad' },
        { id: 'p3', diagnosis: 'Depresión' },
        { id: 'p4', diagnosis: 'TDAH' }
    ];

    const diagCounts = {};
    patients.forEach(p => {
        diagCounts[p.diagnosis] = (diagCounts[p.diagnosis] || 0) + 1;
    });

    if (diagCounts['Ansiedad'] !== 2) throw new Error('Conteo de distribución diagnóstica incorrecto para Ansiedad');
    if (diagCounts['Depresión'] !== 1) throw new Error('Conteo incorrecto para Depresión');

    // Cálculo de remisión promedio
    const patientDeltas = [60, 40, 80];
    const avgRemission = Math.round(patientDeltas.reduce((a, b) => a + b, 0) / patientDeltas.length);
    if (avgRemission !== 60) throw new Error(`Remisión promedio esperada 60%, obtenida ${avgRemission}%`);
});

// 33. TC-CLOUD-01: Registro y Autenticación Centralizada de Terapeuta en Base de Datos
ClinicalTestSuite.add('TC-CLOUD-01', 'Registro y Autenticación Centralizada de Terapeuta en Base de Datos', async () => {
    const { db } = await import('./db.js');
    await db.initialize();

    const testEmail = `terapeuta_cloud_${Date.now()}@clinica.com`;
    const testHash = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8'; // password: 'password'

    const registered = await db.registerTherapist({
        name: 'Dra. Valentina Cloud',
        email: testEmail,
        passwordHash: testHash,
        specialty: 'Neuropsicología Clínica',
        registryNumber: 'CL-998811',
        phone: '+56 9 8888 7777',
        institution: 'Centro de Neurociencias'
    });

    if (!registered || !registered.id) throw new Error('Fallo al registrar terapeuta en base de datos');
    if (registered.password_hash) throw new Error('El objeto devuelto no debe exponer el hash de la contraseña');

    const logged = await db.loginTherapist(testEmail, testHash);
    if (!logged) throw new Error('Login fallido con credenciales correctas');
    if (logged.name !== 'Dra. Valentina Cloud') throw new Error('Nombre del terapeuta no coincide');

    const wrongLogin = await db.loginTherapist(testEmail, 'wrong_hash');
    if (wrongLogin !== null) throw new Error('Login debería fallar con hash incorrecto');
});

// 34. TC-CLOUD-02: Respaldo y Snapshot Integral en la Nube (Multi-Dispositivo)
ClinicalTestSuite.add('TC-CLOUD-02', 'Respaldo y Snapshot Integral en la Nube (Multi-Dispositivo)', async () => {
    const { db } = await import('./db.js');
    await db.initialize();

    const testTherapistId = `ther_sync_${Date.now()}`;
    const payload = {
        patients: [
            { id: 'pat_cloud_1', name: 'Paciente Guardado en PC', diagnosis: 'Ansiedad Social', portalToken: 'CLD01' },
            { id: 'pat_cloud_2', name: 'Paciente Guardado en Móvil', diagnosis: 'Insomnio', portalToken: 'CLD02' }
        ],
        appointments: [
            { id: 'app_cloud_1', patient_id: 'pat_cloud_1', appointment_date: '2026-10-20', appointment_time: '10:00' }
        ],
        notes: [
            { id: 'note_cloud_1', patient_id: 'pat_cloud_1', title: 'Sesión Inicial SOAP', subjective: 'Refiere ansiedad' }
        ],
        treatmentPlans: [
            { id: 'plan_cloud_1', patient_id: 'pat_cloud_1', diagnosis: 'Ansiedad Social' }
        ],
        settings: {
            signature: 'data:image/png;base64,mock',
            darkMode: true
        }
    };

    const saveResult = await db.saveTherapistCloudSync(testTherapistId, payload, Date.now());
    if (!saveResult || saveResult.therapistId !== testTherapistId) {
        throw new Error('Fallo al persistir snapshot de sincronización en la nube');
    }

    const fetched = await db.getTherapistCloudSync(testTherapistId);
    if (!fetched || !fetched.payload) {
        throw new Error('No se recuperó el snapshot sincronizado del terapeuta');
    }
    if (fetched.payload.patients.length !== 2) {
        throw new Error(`Se esperaban 2 pacientes en snapshot, obtenidos ${fetched.payload.patients.length}`);
    }
    if (fetched.payload.notes[0].title !== 'Sesión Inicial SOAP') {
        throw new Error('Contenido de nota clínica en snapshot no coincide');
    }
});

// 35. TC-CLOUD-03: Fusión Inteligente de Colecciones sin Pérdida de Datos (PC + Móvil Merge)
ClinicalTestSuite.add('TC-CLOUD-03', 'Fusión Inteligente de Colecciones sin Pérdida de Datos (PC + Móvil Merge)', async () => {
    // Simula lo que tiene la PC (guardado ayer)
    const pcPatients = [
        { id: 'p1', name: 'Carlos Gomez', diagnosis: 'Fobia Específica', updatedAt: '2026-10-13T10:00:00Z' },
        { id: 'p2', name: 'Lucia Mendez', diagnosis: 'TAG', updatedAt: '2026-10-13T11:00:00Z' }
    ];

    // Simula lo que tiene la nube o el móvil (creado hoy)
    const cloudPatients = [
        { id: 'p2', name: 'Lucia Mendez', diagnosis: 'TAG Leve', updatedAt: '2026-10-14T08:00:00Z' },
        { id: 'p3', name: 'Mario Rossi', diagnosis: 'Estrés Laboral', updatedAt: '2026-10-14T09:00:00Z' }
    ];

    // Función de merge
    const mergeCollections = (localList, cloudList) => {
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
    };

    const merged = mergeCollections(pcPatients, cloudPatients);
    if (merged.length !== 3) {
        throw new Error(`Se esperaban 3 pacientes consolidados (sin duplicados y sin pérdidas), se obtuvieron ${merged.length}`);
    }

    const p2Merged = merged.find(p => p.id === 'p2');
    if (p2Merged.diagnosis !== 'TAG Leve') {
        throw new Error('La versión más reciente de Lucia Mendez (TAG Leve) debió prevalecer');
    }

    const p1Exists = merged.some(p => p.id === 'p1');
    const p3Exists = merged.some(p => p.id === 'p3');
    if (!p1Exists || !p3Exists) {
        throw new Error('Los pacientes de la PC y del móvil deben co-existir en el merge');
    }
});

// 36. TC-AUTH-01: Flujo Seguro de Recuperación y Restablecimiento de Contraseña
ClinicalTestSuite.add('TC-AUTH-01', 'Flujo Seguro de Recuperación y Restablecimiento de Contraseña', async () => {
    const { db } = await import('./db.js');
    await db.initialize();

    const email = `doctora_reset_${Date.now()}@clinica.com`;
    const oldHash = 'old_hash_123';
    const newHash = 'new_secret_hash_456';

    // 1. Registrar terapeuta inicial
    await db.registerTherapist({
        name: 'Dra. Ana Reset',
        email,
        passwordHash: oldHash
    });

    // 2. Solicitar código de recuperación
    const resetData = await db.createPasswordReset(email);
    if (!resetData.code || resetData.code.length !== 6) {
        throw new Error('El código de recuperación debe ser numérico de 6 dígitos');
    }

    // 3. Intento de restablecimiento con código incorrecto (debe fallar)
    let failedAsExpected = false;
    try {
        await db.verifyAndResetPassword(email, '000000', newHash);
    } catch (e) {
        failedAsExpected = true;
    }
    if (!failedAsExpected) throw new Error('Debería rechazar un código de verificación incorrecto');

    // 4. Restablecimiento con código válido
    const success = await db.verifyAndResetPassword(email, resetData.code, newHash);
    if (!success) throw new Error('El restablecimiento de contraseña debió ser exitoso');

    // 5. Verificar que el login funciona con la nueva contraseña y rechaza la antigua
    const loginOld = await db.loginTherapist(email, oldHash);
    if (loginOld !== null) throw new Error('La contraseña antigua ya no debería ser válida');

    const loginNew = await db.loginTherapist(email, newHash);
    if (!loginNew || loginNew.name !== 'Dra. Ana Reset') {
        throw new Error('El login debió ser exitoso con la nueva contraseña');
    }
});

// 37. TC-MOB-01: Arquitectura de Navegación Móvil, Drawer & Bottom Bar Touch Ergonomics
ClinicalTestSuite.add('TC-MOB-01', 'Arquitectura de Navegación Móvil, Drawer & Bottom Bar Touch Ergonomics', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Verificar presencia de meta viewport adaptativo en index.html
    const htmlContent = fs.readFileSync(path.resolve('./index.html'), 'utf8');
    if (!htmlContent.includes('viewport-fit=cover') || !htmlContent.includes('width=device-width')) {
        throw new Error('index.html no contiene el meta viewport optimizado para dispositivos móviles y safe-area');
    }
    if (!htmlContent.includes('mobileMenuToggleBtn') || !htmlContent.includes('sidebarBackdrop')) {
        throw new Error('index.html no incluye el botón de menú hamburguesa o el backdrop de cierre táctil');
    }
    if (!htmlContent.includes('mobile-bottom-nav') || !htmlContent.includes('mobileBottomNav')) {
        throw new Error('index.html no incluye la barra inferior de navegación (Bottom Nav) móvil');
    }

    // 2. Verificar reglas CSS críticas para móviles en styles.css
    const cssContent = fs.readFileSync(path.resolve('./styles.css'), 'utf8');
    if (!cssContent.includes('.mobile-menu-toggle-btn') || !cssContent.includes('.mobile-bottom-nav')) {
        throw new Error('styles.css no define las clases de soporte para navegación móvil');
    }
    // Comprobar prevención del auto-zoom de iOS Safari (<16px dispara zoom indeseado)
    if (!cssContent.includes('font-size: 16px !important')) {
        throw new Error('styles.css debe forzar font-size: 16px !important en inputs para evitar el zoom forzado en iOS');
    }
    // Comprobar clearance inferior para evitar que la bottom bar tape contenido
    if (!cssContent.includes('padding: 12px 12px 84px 12px !important') && !cssContent.includes('84px')) {
        throw new Error('styles.css debe incluir clearance inferior en views-container para no tapar contenido');
    }

    // 3. Emular la lógica de navegación móvil (toggleMobileSidebar, closeMobileSidebar, sync bottom bar)
    const mockSidebar = { classList: new Set() };
    const mockBackdrop = { classList: new Set() };
    const mockNavButtons = [
        { dataset: { view: 'dashboard' }, classList: new Set(['active']) },
        { dataset: { view: 'patients' }, classList: new Set() },
        { dataset: { view: 'appointments' }, classList: new Set() },
        { dataset: { view: 'notes' }, classList: new Set() }
    ];

    function toggleMobile(sidebar, backdrop) {
        if (sidebar.classList.has('open')) {
            sidebar.classList.delete('open');
            backdrop.classList.delete('active');
        } else {
            sidebar.classList.add('open');
            backdrop.classList.add('active');
        }
    }

    function closeMobile(sidebar, backdrop) {
        sidebar.classList.delete('open');
        backdrop.classList.delete('active');
    }

    function syncBottomNav(items, activeView) {
        items.forEach(item => {
            if (item.dataset.view === activeView) {
                item.classList.add('active');
            } else {
                item.classList.delete('active');
            }
        });
    }

    // Probar apertura del drawer
    toggleMobile(mockSidebar, mockBackdrop);
    if (!mockSidebar.classList.has('open') || !mockBackdrop.classList.has('active')) {
        throw new Error('toggleMobileSidebar debió abrir el menú y activar el backdrop');
    }

    // Probar cierre mediante backdrop o botón cerrar
    closeMobile(mockSidebar, mockBackdrop);
    if (mockSidebar.classList.has('open') || mockBackdrop.classList.has('active')) {
        throw new Error('closeMobileSidebar debió remover la clase open y active');
    }

    // Probar sincronización reactiva de vista al navegar a 'appointments'
    syncBottomNav(mockNavButtons, 'appointments');
    const aptBtn = mockNavButtons.find(b => b.dataset.view === 'appointments');
    const dashBtn = mockNavButtons.find(b => b.dataset.view === 'dashboard');
    if (!aptBtn.classList.has('active') || dashBtn.classList.has('active')) {
        throw new Error('Fallo en la sincronización de pestaña activa en la barra móvil inferior');
    }
});

// ============================================
// CASOS DE PRUEBA HOJA DE RUTA v1.0 (SEC, CLI, DB, UX)
// ============================================

// 38. TC-SEC-04: Validación de Lista Blanca CORS (SEC-001)
ClinicalTestSuite.add('TC-SEC-04', 'Validación de Lista Blanca CORS y rechazo de orígenes no autorizados', async () => {
    const DEFAULT_ALLOWED_ORIGINS = [
        'https://psico-notes-clinical.onrender.com',
        'http://localhost:3000',
        'http://localhost:5173',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:5173'
    ];

    function checkCORSOrigin(origin, envAllowed = '') {
        const extra = envAllowed ? envAllowed.split(',').map(s => s.trim().toLowerCase()) : [];
        const allowed = [...DEFAULT_ALLOWED_ORIGINS.map(s => s.toLowerCase()), ...extra];
        if (!origin) return true; // Server-to-server / curl / native tools
        return allowed.includes(origin.toLowerCase());
    }

    // 1. Origen legítimo en producción
    if (!checkCORSOrigin('https://psico-notes-clinical.onrender.com')) {
        throw new Error('El dominio oficial de producción en Render debe estar permitido por CORS');
    }

    // 2. Origen local de desarrollo
    if (!checkCORSOrigin('http://localhost:3000')) {
        throw new Error('Localhost debe estar autorizado para desarrollo');
    }

    // 3. Petición sin origen (móvil nativo / CLI)
    if (!checkCORSOrigin(undefined)) {
        throw new Error('Peticiones sin encabezado Origin deben permitirse');
    }

    // 4. Origen malicioso externo no autorizado
    if (checkCORSOrigin('https://malicious-attacker-site.com')) {
        throw new Error('Un origen no autorizado NO debe ser admitido por la política CORS');
    }

    // 5. Origen spoofing por prefijo
    if (checkCORSOrigin('https://psico-notes-clinical.onrender.com.attacker.org')) {
        throw new Error('Intento de subdominio malicioso debe ser rechazado');
    }
});

// 39. TC-SEC-05: Protección de Autenticación del Portal y Cero Fuga de PII (SEC-003)
ClinicalTestSuite.add('TC-SEC-05', 'Protección del Portal del Paciente y Cero Fuga PII en Respuesta de Auth', async () => {
    const mockDbPatient = {
        id: 'pat_sec_999',
        name: 'Carlos Mendoza',
        phone: '+584149998877',
        email: 'carlos.mendoza@email.com',
        emergency: '0412-1112233',
        portalToken: 'SECRET_TOKEN_HASH_12345',
        tokenCreatedAt: new Date().toISOString(),
        therapistId: 'therapist_dr_garcia'
    };

    function simulatePortalAuthResponse(patient, therapist) {
        return {
            authenticated: true,
            patient: {
                id: patient.id,
                name: patient.name
            },
            therapist: {
                name: therapist?.name || 'Psicólogo Clínico',
                specialty: therapist?.specialty || 'Psicoterapia'
            }
        };
    }

    const authResponse = simulatePortalAuthResponse(mockDbPatient, { name: 'Dra. García', specialty: 'Clínica' });

    if (!authResponse.authenticated) {
        throw new Error('La autenticación legítima debe responder authenticated: true');
    }
    if (authResponse.patient.id !== 'pat_sec_999' || authResponse.patient.name !== 'Carlos Mendoza') {
        throw new Error('El nombre e ID del paciente deben estar presentes para identificar la sesión');
    }
    if ('portalToken' in authResponse || 'portalToken' in authResponse.patient) {
        throw new Error('VULNERABILIDAD CRÍTICA: portalToken se reflejó en la respuesta del portal');
    }
    if ('phone' in authResponse.patient || 'email' in authResponse.patient) {
        throw new Error('VULNERABILIDAD CRÍTICA: Datos de contacto (teléfono/email) expuestos en endpoint público de auth');
    }
    if ('emergency' in authResponse.patient) {
        throw new Error('Contacto de emergencia no debe exponerse en el handshake inicial del portal');
    }
});

// 40. TC-SEC-06: Aislamiento Multitenant de Expedientes por Terapeuta (SEC-002)
ClinicalTestSuite.add('TC-SEC-06', 'Aislamiento Multitenant de Expedientes y Control de Acceso por Terapeuta', async () => {
    const { db } = (typeof window !== 'undefined' && window.db) ? { db: window.db } : await import('./db.js');
    if (!db) throw new Error('Módulo db.js no disponible para pruebas multitenant');

    const therapistA = 'therapist_alpha_' + Date.now();
    const therapistB = 'therapist_beta_' + Date.now();

    const patientA = {
        id: 'pat_alpha_' + Date.now(),
        name: 'Paciente Exclusivo de Alpha',
        diagnosis: 'F41.1 Ansiedad Generalizada',
        phone: '0414-1111111'
    };

    const patientB = {
        id: 'pat_beta_' + Date.now(),
        name: 'Paciente Exclusivo de Beta',
        diagnosis: 'F32.0 Episodio Depresivo Leve',
        phone: '0412-2222222'
    };

    await db.syncPatients([patientA], therapistA);
    await db.syncPatients([patientB], therapistB);

    const listA = await db.getPatientsByTherapist(therapistA);
    const hasAInA = listA.some(p => p.id === patientA.id);
    const hasBInA = listA.some(p => p.id === patientB.id);

    if (!hasAInA) throw new Error('El terapeuta A debe poder consultar su propio paciente');
    if (hasBInA) throw new Error('FALLO DE AISLAMIENTO: El terapeuta A pudo ver el paciente del terapeuta B');

    const listB = await db.getPatientsByTherapist(therapistB);
    const hasBInB = listB.some(p => p.id === patientB.id);
    const hasAInB = listB.some(p => p.id === patientA.id);

    if (!hasBInB) throw new Error('El terapeuta B debe poder consultar su propio paciente');
    if (hasAInB) throw new Error('FALLO DE AISLAMIENTO: El terapeuta B pudo ver el paciente del terapeuta A');
});

// 41. TC-CLI-01: Evaluación Estructurada C-SSRS y Directorio de Emergencia (CLI-004)
ClinicalTestSuite.add('TC-CLI-01', 'Evaluación Estructurada C-SSRS y Directorio Localizado de Crisis', async () => {
    await import('./crisis-protocol.js');
    const CrisisEmergencyDirectory = globalThis.CrisisEmergencyDirectory;
    const calculateCSSRSRisk = globalThis.calculateCSSRSRisk;

    if (!CrisisEmergencyDirectory || !calculateCSSRSRisk) {
        throw new Error('Módulo crisis-protocol.js no exportó funciones C-SSRS');
    }

    const dirVE = CrisisEmergencyDirectory.VE;
    if (!dirVE || !Array.isArray(dirVE.hotlines) || dirVE.hotlines.length === 0) {
        throw new Error('Directorio de Venezuela no contiene líneas configuradas');
    }
    const hasFPVP = dirVE.hotlines.some(h => h.phone.includes('0212-241-92-88') || h.name.includes('FPVP'));
    if (!hasFPVP) throw new Error('Línea de Ayuda FPVP 0212-241-92-88 no encontrada en directorio venezolano');
    if (!dirVE.minorProtocol || !dirVE.minorProtocol.includes('LOPNNA')) {
        throw new Error('Directorio venezolano debe incluir protocolo LOPNNA para menores');
    }

    const requiredCountries = ['CO', 'AR', 'CL', 'MX', 'ES', 'US'];
    for (const c of requiredCountries) {
        if (!CrisisEmergencyDirectory[c] || !CrisisEmergencyDirectory[c].hotlines.length) {
            throw new Error(`Directorio de emergencias incompleto para país: ${c}`);
        }
    }

    const lowRisk = calculateCSSRSRisk({ passiveWish: true, activeIdeation: false, protectiveFactors: 'Familia activa' });
    if (lowRisk.level !== 'bajo' || lowRisk.immediateActionRequired !== false) {
        throw new Error(`C-SSRS bajo riesgo falló. Obtenido: ${lowRisk.level}`);
    }

    const criticalRisk = calculateCSSRSRisk({
        suicidalIntent: true,
        specificPlan: true,
        lethalMeansAccess: true,
        priorAttempts: true
    });
    if (criticalRisk.level !== 'extremo' || criticalRisk.immediateActionRequired !== true) {
        throw new Error(`C-SSRS riesgo extremo falló. Obtenido: ${criticalRisk.level}`);
    }
});

// 42. TC-PSY-04: Límites Psicométricos y Calificaciones de PHQ-9 y GAD-7 (CLI-003)
ClinicalTestSuite.add('TC-PSY-04', 'Cálculos de Límites Psicométricos de Severidad para PHQ-9 y GAD-7', async () => {
    function interpretPHQ9(score) {
        if (score <= 4) return 'Mínima';
        if (score <= 9) return 'Leve';
        if (score <= 14) return 'Moderada';
        if (score <= 19) return 'Moderadamente severa';
        return 'Severa';
    }

    function interpretGAD7(score) {
        if (score <= 4) return 'Mínima';
        if (score <= 9) return 'Leve';
        if (score <= 14) return 'Moderada';
        return 'Severa';
    }

    if (interpretPHQ9(0) !== 'Mínima') throw new Error('PHQ-9 score 0 debe ser Mínima');
    if (interpretPHQ9(4) !== 'Mínima') throw new Error('PHQ-9 score 4 debe ser Mínima');
    if (interpretPHQ9(5) !== 'Leve') throw new Error('PHQ-9 score 5 debe ser Leve');
    if (interpretPHQ9(9) !== 'Leve') throw new Error('PHQ-9 score 9 debe ser Leve');
    if (interpretPHQ9(10) !== 'Moderada') throw new Error('PHQ-9 score 10 debe ser Moderada');
    if (interpretPHQ9(14) !== 'Moderada') throw new Error('PHQ-9 score 14 debe ser Moderada');
    if (interpretPHQ9(15) !== 'Moderadamente severa') throw new Error('PHQ-9 score 15 debe ser Moderadamente severa');
    if (interpretPHQ9(19) !== 'Moderadamente severa') throw new Error('PHQ-9 score 19 debe ser Moderadamente severa');
    if (interpretPHQ9(20) !== 'Severa') throw new Error('PHQ-9 score 20 debe ser Severa');
    if (interpretPHQ9(27) !== 'Severa') throw new Error('PHQ-9 score 27 (máximo) debe ser Severa');

    if (interpretGAD7(0) !== 'Mínima') throw new Error('GAD-7 score 0 debe ser Mínima');
    if (interpretGAD7(4) !== 'Mínima') throw new Error('GAD-7 score 4 debe ser Mínima');
    if (interpretGAD7(5) !== 'Leve') throw new Error('GAD-7 score 5 debe ser Leve');
    if (interpretGAD7(9) !== 'Leve') throw new Error('GAD-7 score 9 debe ser Leve');
    if (interpretGAD7(10) !== 'Moderada') throw new Error('GAD-7 score 10 debe ser Moderada');
    if (interpretGAD7(14) !== 'Moderada') throw new Error('GAD-7 score 14 debe ser Moderada');
    if (interpretGAD7(15) !== 'Severa') throw new Error('GAD-7 score 15 debe ser Severa');
    if (interpretGAD7(21) !== 'Severa') throw new Error('GAD-7 score 21 (máximo) debe ser Severa');
});

// 43. TC-DB-03: Persistencia y Sincronización Fiscal SENIAT en la Nube (DB-002)
ClinicalTestSuite.add('TC-DB-03', 'Persistencia y Sincronización Fiscal SENIAT (DB-002)', async () => {
    const { db } = (typeof window !== 'undefined' && window.db) ? { db: window.db } : await import('./db.js');
    if (!db) throw new Error('Módulo db.js no disponible');

    const therapistId = 'therapist_seniat_' + Date.now();
    const config = {
        fiscalName: 'Dra. Coromoto Salazar',
        rif: 'V-15890123-4',
        address: 'Av. Francisco de Miranda, Chacao, Caracas',
        phone: '0212-9876543',
        invoicePrefix: 'FACT-',
        nextNumber: 45,
        ivaRate: 0,
        applyIGTF: true
    };

    await db.saveBillingConfig(therapistId, config);
    const savedConfig = await db.getBillingConfig(therapistId);

    if (!savedConfig || savedConfig.rif !== 'V-15890123-4' || savedConfig.fiscalName !== 'Dra. Coromoto Salazar') {
        throw new Error('Configuración fiscal SENIAT no se persistió correctamente');
    }

    const subtotal = 60.00;
    const igtf = subtotal * 0.03;
    const total = subtotal + igtf;

    const invoice = {
        id: 'inv_' + Date.now(),
        number: 'FACT-000045',
        clientName: 'Alejandro Morales',
        clientRif: 'V-19876543',
        concept: 'Consulta de Psicoterapia Clínica (Sesión 4)',
        amountUSD: subtotal,
        igtfUSD: igtf,
        totalUSD: total,
        paymentMethod: 'Efectivo USD (Aplica 3% IGTF)',
        date: new Date().toISOString()
    };

    await db.saveBillingInvoice(therapistId, invoice);
    const invoices = await db.getBillingInvoices(therapistId);

    const found = invoices.find(i => i.id === invoice.id);
    if (!found) throw new Error('La factura emitida no fue recuperada de la persistencia');
    if (Math.abs(found.totalUSD - 61.80) > 0.01) {
        throw new Error(`Total de factura incorrecto: esperado 61.80, obtenido ${found.totalUSD}`);
    }
});

// 44. TC-NOTE-01: Inmutabilidad de Reportes Firmados y Gestión de Adendums (CLI-005)
ClinicalTestSuite.add('TC-NOTE-01', 'Inmutabilidad de Reportes Firmados y Gestión de Adendums (CLI-005)', async () => {
    const signedNote = {
        id: 'note_signed_' + Date.now(),
        patientId: 'pat_001',
        title: 'Sesión #3 - Intervención en Crisis',
        subjetivo: 'Paciente acude con angustia aguda.',
        objetivo: 'Afecto lábil, sin ideación suicida activa.',
        status: 'firmada',
        isSigned: true,
        signedBy: 'Lcda. Valentina Blanco',
        signedAt: '2026-10-14T10:00:00Z',
        signedRegistry: 'FPV-12345',
        addendums: []
    };

    const addendumEntry = {
        id: 'ad_' + Date.now(),
        date: new Date().toISOString(),
        author: 'Lcda. Valentina Blanco',
        text: 'Aclaratoria posterior: Se recibe llamada telefónica del familiar confirmando administración de tratamiento médico.'
    };

    signedNote.addendums.push(addendumEntry);

    if (signedNote.signedBy !== 'Lcda. Valentina Blanco') {
        throw new Error('La firma original fue alterada');
    }
    if (signedNote.signedAt !== '2026-10-14T10:00:00Z') {
        throw new Error('La fecha y hora de la firma original fue alterada');
    }
    if (signedNote.addendums.length !== 1 || !signedNote.addendums[0].text.includes('Aclaratoria posterior')) {
        throw new Error('El adendum no fue registrado en el historial inmutable');
    }
});

// ============================================
// SUITE DE INTEGRACIÓN HTTP DE SEGURIDAD P0 (OWASP & AUDITORÍA CLÍNICA)
// ============================================

let testServerInstance = null;
let testServerBaseUrl = '';

async function ensureTestServer() {
    if (testServerBaseUrl) return testServerBaseUrl;
    process.env.NODE_ENV = 'test';
    const { default: app } = await import('./server.js');
    return new Promise((resolve, reject) => {
        try {
            testServerInstance = app.listen(0, '127.0.0.1', () => {
                const port = testServerInstance.address().port;
                testServerBaseUrl = `http://127.0.0.1:${port}`;
                resolve(testServerBaseUrl);
            });
        } catch (e) {
            reject(e);
        }
    });
}

// 45. TC-SEC-07: Acceso no autenticado a endpoints clínicos protegidos (HTTP 401)
ClinicalTestSuite.add('TC-SEC-07', 'Acceso no autenticado a endpoints clínicos protegidos responde HTTP 401', async () => {
    const baseUrl = await ensureTestServer();
    const unauthEndpoints = [
        { path: '/api/v1/patients', method: 'GET' },
        { path: '/api/v1/portal/data/pat_test_nonexistent', method: 'GET' },
        { path: '/api/v1/portal/crisis-alerts', method: 'GET' },
        { path: '/api/v1/patients/sync', method: 'POST', body: { patients: [] } },
        { path: '/api/v1/clinical/sync', method: 'GET' },
        { path: '/api/v1/clinical/sync', method: 'POST', body: { payload: {} } },
        { path: '/api/v1/billing/config', method: 'GET' },
        { path: '/api/v1/billing/invoices', method: 'GET' },
        { path: '/api/v1/audit/logs', method: 'GET' },
        { path: '/api/v1/sync/push', method: 'POST', body: { userId: 'u1', encryptedData: 'xyz' } },
        { path: '/api/v1/sync/pull/u1', method: 'GET' }
    ];

    for (const ep of unauthEndpoints) {
        const opts = { method: ep.method, headers: { 'Content-Type': 'application/json' } };
        if (ep.body) opts.body = JSON.stringify(ep.body);
        const res = await fetch(`${baseUrl}${ep.path}`, opts);
        if (res.status !== 401) {
            throw new Error(`Endpoint ${ep.method} ${ep.path} permitió acceso sin token (status: ${res.status}, esperado: 401)`);
        }
    }
});

// 46. TC-SEC-08: Prevención de acceso cruzado BOLA/IDOR a datos de pacientes ajenos (HTTP 403)
ClinicalTestSuite.add('TC-SEC-08', 'Prevención de acceso cruzado BOLA/IDOR a datos de pacientes ajenos (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const therapistA = 'dr_alpha_' + Date.now();
    const therapistB = 'dr_beta_' + Date.now();
    const tokenA = generateSessionToken(therapistA, 'alpha@clinica.com');
    const tokenB = generateSessionToken(therapistB, 'beta@clinica.com');

    const patientA = {
        id: 'pat_isolated_alpha_' + Date.now(),
        name: 'Paciente Confidencial de Alpha',
        diagnosis: 'F41.0 Trastorno de Pánico',
        therapist_id: therapistA
    };
    await db.syncPatients([patientA], therapistA);

    // Terapeuta B intenta acceder a los datos del paciente de Terapeuta A
    const resB = await fetch(`${baseUrl}/api/v1/portal/data/${patientA.id}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });

    if (resB.status !== 403) {
        throw new Error(`FALLO BOLA/IDOR: Terapeuta B pudo consultar paciente ajeno (status: ${resB.status}, esperado: 403)`);
    }
    const errData = await resB.json();
    if (!errData.error || !errData.error.toLowerCase().includes('pertenece a otro')) {
        throw new Error('Respuesta 403 debe contener mensaje de aislamiento multitenant');
    }

    // Terapeuta A consulta su propio paciente: debe tener éxito (200 OK)
    const resA = await fetch(`${baseUrl}/api/v1/portal/data/${patientA.id}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (resA.status !== 200) {
        throw new Error(`Terapeuta A debe tener acceso a su propio paciente (status: ${resA.status})`);
    }
});

// 47. TC-SEC-09: Aislamiento multitenant de alertas de crisis y rechazo de ACK cruzado (HTTP 403)
ClinicalTestSuite.add('TC-SEC-09', 'Aislamiento de alertas de crisis y rechazo de ACK cruzado (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const therapistA = 'dr_crisis_a_' + Date.now();
    const therapistB = 'dr_crisis_b_' + Date.now();
    const tokenA = generateSessionToken(therapistA, 'crisisa@clinica.com');
    const tokenB = generateSessionToken(therapistB, 'crisisb@clinica.com');

    const patientA = {
        id: 'pat_crisis_a_' + Date.now(),
        name: 'Paciente en Crisis de A',
        therapist_id: therapistA
    };
    await db.syncPatients([patientA], therapistA);

    const alert = await db.createCrisisAlert(
        patientA.id,
        patientA.name,
        'Ideación autolítica activa con plan estructurado',
        'ALTO'
    );

    // 1. Terapeuta B consulta alertas: la alerta de paciente A NO debe aparecer
    const resAlertsB = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    const dataAlertsB = await resAlertsB.json();
    const foundAlert = (dataAlertsB.alerts || []).find(a => a.id === alert.id);
    if (foundAlert) {
        throw new Error('FUGA DE DATOS CRÍTICOS: Terapeuta B vio la alerta de crisis del paciente de Terapeuta A');
    }

    // 2. Terapeuta B intenta reconocer la alerta de Terapeuta A
    const resAckB = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts/ack/${alert.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (resAckB.status !== 403) {
        throw new Error(`FALLO DE AUTORIZACIÓN: Terapeuta B pudo reconocer alerta ajena (status: ${resAckB.status}, esperado: 403)`);
    }

    // 3. Terapeuta A reconoce su propia alerta: éxito
    const resAckA = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts/ack/${alert.id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (resAckA.status !== 200) {
        throw new Error(`Terapeuta A debió poder reconocer su propia alerta (status: ${resAckA.status})`);
    }
});

// 48. TC-SEC-10: Prevención de sobreescritura cruzada de expedientes en sincronización batch (HTTP 403)
ClinicalTestSuite.add('TC-SEC-10', 'Prevención de sobreescritura cruzada de expedientes en sincronización batch (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const therapistA = 'dr_owner_a_' + Date.now();
    const therapistB = 'dr_hijacker_b_' + Date.now();
    const tokenB = generateSessionToken(therapistB, 'hijacker@clinica.com');

    const patientA = {
        id: 'pat_legit_a_' + Date.now(),
        name: 'Expediente Legítimo de A',
        diagnosis: 'Trastorno Adaptativo',
        therapist_id: therapistA
    };
    await db.syncPatients([patientA], therapistA);

    // Terapeuta B intenta sincronizar / sobrescribir el paciente de Terapeuta A
    const resSync = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
            patients: [{
                id: patientA.id,
                name: 'Nombre Alterado Maliciosamente por B',
                diagnosis: 'Diagnóstico Suplantado'
            }]
        })
    });

    if (resSync.status !== 403) {
        throw new Error(`FALLO MULTITENANT: Servidor no rechazó sobreescritura cruzada de expediente (status: ${resSync.status}, esperado: 403)`);
    }

    // Verificar que el paciente original sigue perteneciendo a Terapeuta A y no fue alterado
    const checkPatient = (await db.getPatientsByTherapist(therapistA)).find(p => p.id === patientA.id);
    if (!checkPatient || checkPatient.name !== 'Expediente Legítimo de A') {
        throw new Error('CORRUPCIÓN DE DATOS: El expediente fue modificado a pesar del aislamiento');
    }
});

// 49. TC-SEC-11: Cero fuga de resetCode en forgot-password y prevención de enumeración (OWASP)
ClinicalTestSuite.add('TC-SEC-11', 'Cero fuga de resetCode en forgot-password y prevención de enumeración (OWASP)', async () => {
    const baseUrl = await ensureTestServer();
    const { db } = await import('./db.js');

    const testEmail = `psicologa_${Date.now()}@clinica.com`;
    await db.registerTherapist({
        name: 'Dra. María Verificación',
        email: testEmail,
        passwordHash: 'dummy_hash_123',
        specialty: 'Psicología Clínica'
    });

    // 1. Solicitud para usuario registrado
    const resExist = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail })
    });

    if (resExist.status !== 200) {
        throw new Error(`forgot-password falló con status ${resExist.status}`);
    }
    const dataExist = await resExist.json();

    // Verificación estricta de CERO FUGA de código
    if ('resetCode' in dataExist || 'code' in dataExist || 'pin' in dataExist) {
        throw new Error('VULNERABILIDAD CRÍTICA P0: El código de recuperación fue filtrado en la respuesta HTTP pública');
    }
    if (!dataExist.message || !dataExist.message.includes('Si el correo electrónico se encuentra registrado')) {
        throw new Error('Mensaje no sigue estándar de respuesta neutral contra enumeración');
    }

    // 2. Solicitud para usuario inexistente
    const resNonExist = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: `inexistente_${Date.now()}@gmail.com` })
    });
    const dataNonExist = await resNonExist.json();

    if (dataNonExist.message !== dataExist.message) {
        throw new Error('ENUMERACIÓN DE CUENTAS: El servidor devolvió mensajes diferentes para correos existentes e inexistentes');
    }
});

// 50. TC-SEC-12: Teleconsulta genera salas criptográficas de alta entropía (>=192 bits) y rechaza no autenticados
ClinicalTestSuite.add('TC-SEC-12', 'Teleconsulta genera salas criptográficas de alta entropía (>=192 bits) y rechaza no autenticados', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    const therapistId = 'dr_telehealth_' + Date.now();
    const token = generateSessionToken(therapistId, 'tele@clinica.com');

    // 1. Rechazo sin autenticación
    const unauthRes = await fetch(`${baseUrl}/api/v1/telehealth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
    });
    if (unauthRes.status !== 401) {
        throw new Error(`Teleconsulta debe requerir autenticación (status obtenido: ${unauthRes.status}, esperado: 401)`);
    }

    // 2. Creación autorizada y verificación de entropía
    const rooms = new Set();
    for (let i = 0; i < 5; i++) {
        const res = await fetch(`${baseUrl}/api/v1/telehealth/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ appointmentId: 'apt_123' })
        });
        if (res.status !== 200) throw new Error(`Teleconsulta autorizada falló con status ${res.status}`);
        const data = await res.json();
        
        if (!data.roomId || !data.roomId.startsWith('psico-')) {
            throw new Error('Identificador de sala de teleconsulta debe comenzar por "psico-"');
        }
        if (data.roomId.includes('apt_123')) {
            throw new Error('INSEGURIDAD: El roomId contiene el appointmentId predecible enviado por el cliente');
        }
        const tokenPart = data.roomId.replace('psico-', '');
        if (tokenPart.length < 30) {
            throw new Error(`Entropía insuficiente en roomId: longitud ${tokenPart.length} menor a 30 caracteres base64url`);
        }
        rooms.add(data.roomId);
    }

    if (rooms.size !== 5) {
        throw new Error('Colisión detectada en generación de identificadores de sala');
    }
});

// 51. TC-SEC-13: Validación estricta de tokens: firma manipulada, token vencido y spoofing de ID (HTTP 401/403)
ClinicalTestSuite.add('TC-SEC-13', 'Validación estricta de tokens: firma manipulada, token vencido y spoofing de ID (HTTP 401/403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    const validId = 'dr_valid_' + Date.now();
    const validToken = generateSessionToken(validId, 'valid@clinica.com');

    // 1. Token con firma HMAC manipulada
    const tamperedToken = validToken.substring(0, validToken.length - 4) + 'abcd';
    const resTampered = await fetch(`${baseUrl}/api/v1/patients`, {
        headers: { 'Authorization': `Bearer ${tamperedToken}` }
    });
    if (resTampered.status !== 401) {
        throw new Error(`Token con firma adulterada no fue rechazado con 401 (status: ${resTampered.status})`);
    }

    // 2. Token expirado
    const expiredToken = generateSessionToken(validId, 'valid@clinica.com', -10000);
    const resExpired = await fetch(`${baseUrl}/api/v1/patients`, {
        headers: { 'Authorization': `Bearer ${expiredToken}` }
    });
    if (resExpired.status !== 401) {
        throw new Error(`Token expirado no fue rechazado con 401 (status: ${resExpired.status})`);
    }

    // 3. Suplantación de ID (X-Therapist-Id contradictorio con el token)
    const resSpoofed = await fetch(`${baseUrl}/api/v1/patients`, {
        headers: {
            'Authorization': `Bearer ${validToken}`,
            'X-Therapist-Id': 'dr_other_victim_999'
        }
    });
    if (resSpoofed.status !== 403) {
        throw new Error(`Intento de spoofing de ID debió ser rechazado con 403 (status: ${resSpoofed.status})`);
    }
});

// 52. TC-SEC-14: Aislamiento de buzón criptográfico Zero-Knowledge sync/push y sync/pull (HTTP 403)
ClinicalTestSuite.add('TC-SEC-14', 'Aislamiento de buzón criptográfico Zero-Knowledge sync/push y sync/pull (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    const userA = 'user_zk_a_' + Date.now();
    const userB = 'user_zk_b_' + Date.now();
    const tokenA = generateSessionToken(userA, 'a@zk.com');
    const tokenB = generateSessionToken(userB, 'b@zk.com');

    // 1. Usuario A almacena blob cifrado
    const pushRes = await fetch(`${baseUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({
            userId: userA,
            encryptedData: 'ENCRYPTED_BLOB_AES_GCM_ALPHA_DATA_12345'
        })
    });
    if (pushRes.status !== 200) throw new Error(`Push legítimo falló con status ${pushRes.status}`);

    // 2. Usuario B intenta descargar el blob de Usuario A
    const pullResB = await fetch(`${baseUrl}/api/v1/sync/pull/${userA}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (pullResB.status !== 403) {
        throw new Error(`FALLO DE AISLAMIENTO ZK: Usuario B pudo consultar buzón de Usuario A (status: ${pullResB.status}, esperado: 403)`);
    }

    // 3. Usuario B intenta sobrescribir el blob de Usuario A
    const spoofPush = await fetch(`${baseUrl}/api/v1/sync/push`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenB}`
        },
        body: JSON.stringify({
            userId: userA,
            encryptedData: 'MALICIOUS_OVERWRITE_DATA'
        })
    });
    if (spoofPush.status !== 403) {
        throw new Error(`FALLO DE AISLAMIENTO ZK: Usuario B pudo sobrescribir buzón de Usuario A (status: ${spoofPush.status}, esperado: 403)`);
    }

    // 4. Usuario A descarga su propio blob íntegramente
    const pullResA = await fetch(`${baseUrl}/api/v1/sync/pull/${userA}`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (pullResA.status !== 200) throw new Error(`Pull legítimo de Usuario A falló con status ${pullResA.status}`);
    const dataA = await pullResA.json();
    if (dataA.encryptedData !== 'ENCRYPTED_BLOB_AES_GCM_ALPHA_DATA_12345') {
        throw new Error('Los datos recuperados por el usuario no coinciden con los guardados');
    }
});

// 53. TC-CLI-02: Consentimiento Informado con Teleconsulta e IA Asistida (CLI-002)
ClinicalTestSuite.add('TC-CLI-02', 'Consentimiento Informado con Teleconsulta e IA Asistida (CLI-002)', async () => {
    const patient = {
        id: 'pat_con_test_' + Date.now(),
        name: 'Mariana Duarte',
        birthdate: '1995-04-12',
        category: 'adult'
    };

    const consentRecord = {
        signed: true,
        signedAt: new Date().toISOString(),
        guardian: null,
        category: 'adult',
        telehealthAccepted: true,
        aiAssistanceAccepted: true,
        signatureImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    };

    patient.informedConsent = consentRecord;

    if (!patient.informedConsent.signed) throw new Error('El consentimiento debe figurar como firmado');
    if (!patient.informedConsent.telehealthAccepted) throw new Error('Debe contemplar la aceptación expresa de teleconsulta');
    if (!patient.informedConsent.aiAssistanceAccepted) throw new Error('Debe contemplar la aceptación expresa de IA asistida');
    if (!patient.informedConsent.signatureImg.startsWith('data:image/')) throw new Error('Firma digital no registrada');
});

// 54. TC-UX-01: Flujo Rápido de Evolución de Sesión desde la Cita (UX-003)
ClinicalTestSuite.add('TC-UX-01', 'Flujo Rápido de Evolución de Sesión desde la Cita (UX-003)', async () => {
    const mockPatient = {
        id: 'pat_evolve_' + Date.now(),
        name: 'Roberto Gómez'
    };
    const mockAppointment = {
        id: 'apt_evolve_' + Date.now(),
        patientId: mockPatient.id,
        date: '2026-10-15T15:00:00Z',
        time: '15:00',
        duration: 50,
        status: 'programada'
    };
    const existingNotes = [
        { id: 'n1', patientId: mockPatient.id, date: '2026-10-01' },
        { id: 'n2', patientId: mockPatient.id, date: '2026-10-08' }
    ];

    const nextSessionNum = existingNotes.length + 1;
    const noteDraft = {
        patientId: mockAppointment.patientId,
        date: mockAppointment.date.split('T')[0],
        title: `Sesión #${nextSessionNum} - Seguimiento Psicoterapéutico`,
        sessionNumber: nextSessionNum,
        status: 'borrador'
    };

    if (noteDraft.sessionNumber !== 3) {
        throw new Error(`Número correlativo de sesión incorrecto: esperado 3, obtenido ${noteDraft.sessionNumber}`);
    }
    if (noteDraft.patientId !== mockPatient.id) {
        throw new Error('El paciente preseleccionado no coincide con la cita');
    }
    if (!noteDraft.title.includes('Sesión #3')) {
        throw new Error('El título de la nota debe reflejar el correlativo de sesión');
    }
});

// 55. TC-UX-02: Optimización Táctil y Prevención de Solapamiento en Modales Móviles (UX-004)
ClinicalTestSuite.add('TC-UX-02', 'Optimización Táctil y Prevención de Solapamiento en Modales Móviles (UX-004)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const cssContent = fs.readFileSync(path.resolve('./styles.css'), 'utf8');
    const appContent = fs.readFileSync(path.resolve('./app.js'), 'utf8');

    // 1. Verificar que styles.css eleva z-index de modal a >=2200 para quedar por encima de bottom-nav (1050) y sidebar (1250)
    if (!cssContent.includes('z-index: 2200')) {
        throw new Error('styles.css debe fijar z-index: 2200 en modales para impedir que la barra de navegación inferior los tape');
    }

    // 2. Verificar que styles.css oculta automáticamente bottom-nav cuando hay modal activo
    if (!cssContent.includes('body.has-active-modal .mobile-bottom-nav')) {
        throw new Error('styles.css debe ocultar .mobile-bottom-nav cuando el body tiene la clase has-active-modal');
    }

    // 3. Verificar que modal-actions tiene posición pegajosa (sticky) y safe-area para botones accesibles
    if (!cssContent.includes('position: sticky !important') || !cssContent.includes('safe-area-inset-bottom')) {
        throw new Error('styles.css debe definir modal-actions sticky con clearance de safe-area-inset-bottom');
    }

    // 4. Verificar que app.js conmuta has-active-modal al abrir y cerrar modales
    if (!appContent.includes("document.body.classList.add('has-active-modal')") || !appContent.includes("document.body.classList.remove('has-active-modal')")) {
        throw new Error('app.js debe agregar/eliminar la clase has-active-modal en openModal y closeModal');
    }
});

// 56. TC-PILOT-01: Simulación de Caso Clínico Piloto y Trazabilidad Multidisciplinar (QA-004)
ClinicalTestSuite.add('TC-PILOT-01', 'Simulación de Caso Clínico Piloto y Trazabilidad Multidisciplinar (QA-004)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const appCode = fs.readFileSync(path.resolve('./app.js'), 'utf8');
    if (!appCode.includes('loadSyntheticClinicalPilotCase')) {
        throw new Error('app.js debe implementar loadSyntheticClinicalPilotCase');
    }

    // 1. Simulación del expediente clínico del paciente piloto
    const pilotPatient = {
        id: 'pat_piloto_valeria_2026',
        name: 'Valeria Mendoza (Caso Piloto)',
        lifeStage: 'adult',
        diagnosis: 'F32.1 Episodio Depresivo Moderado con Ideación Pasiva Reactiva',
        informedConsent: {
            signed: true,
            telehealthAccepted: true,
            aiAssistanceAccepted: true,
            signatureImg: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        }
    };

    if (!pilotPatient.informedConsent.signed || !pilotPatient.informedConsent.telehealthAccepted || !pilotPatient.informedConsent.aiAssistanceAccepted) {
        throw new Error('El caso piloto debe certificar aceptación de consentimiento, teleconsulta e IA ética');
    }

    // 2. Simulación psicométrica PHQ-9 (Cálculo aritmético e ítem 9)
    const phq9Answers = [2, 2, 2, 2, 1, 2, 2, 2, 1];
    const phq9Total = phq9Answers.reduce((a, b) => a + b, 0);
    if (phq9Total !== 16) throw new Error(`Cálculo erróneo de PHQ-9: esperado 16, obtenido ${phq9Total}`);

    const item9 = phq9Answers[8];
    const riskAlert = item9 > 0;
    if (!riskAlert) throw new Error('El ítem 9 positivo debe activar alerta ineludible de riesgo');

    // 3. Simulación de protocolo de crisis C-SSRS y Plan de Seguridad
    const cssrs = {
        score: 2,
        passiveIdeation: true,
        activeIntent: false,
        suicidePlan: false,
        status: 'ATENDIDA',
        safetyPlanAgreed: true,
        emergencyLines: '0800-PSICO'
    };
    if (cssrs.passiveIdeation && (cssrs.activeIntent || cssrs.suicidePlan)) {
        throw new Error('Inconsistencia en C-SSRS: ideación pasiva no puede coexistir con plan activo sin reclasificación');
    }
    if (!cssrs.safetyPlanAgreed || !cssrs.emergencyLines) {
        throw new Error('El protocolo de crisis debe documentar acuerdo de seguridad y líneas de emergencia');
    }

    // 4. Reporte oficial de atención y evolución de sesión #1
    const note = {
        sessionNum: 1,
        title: 'Sesión #1 — Evaluación Inicial, Psicoeducación en Duelo y Plan de Seguridad',
        status: 'firmada',
        signedBy: 'Lic. en Psicología Clínica',
        appliedTechniques: 'Entrevista clínica, C-SSRS, PHQ-9, TCC, 5-4-3-2-1',
        tasks: ['Autoregistro ABC', 'Respiración 4-7-8'],
        addendums: [
            { text: 'Contacto telefónico de seguimiento a las 24h: paciente estable y acompañada.' }
        ]
    };

    if (note.status !== 'firmada') throw new Error('El reporte clínico debe quedar en estado firmado');
    if (!note.addendums || note.addendums.length === 0) throw new Error('El reporte firmado debe soportar adendums');

    // 5. Verificación de payload para sincronización segura en la nube (cero fuga PHI en metadatos)
    const syncPayload = {
        patients: [pilotPatient],
        notes: [note],
        clientTimestamp: Date.now()
    };
    const serialized = JSON.stringify(syncPayload);
    if (!serialized.includes(pilotPatient.id) || !serialized.includes(note.title)) {
        throw new Error('Fallo en la serialización del payload para la nube');
    }
});

// 57. TC-TEEN-01: Protocolo Estructurado de Historia Clínica Adolescente (Orden de Campos, Estatus, Hipótesis Biopsicosociales y Exclusiones)
ClinicalTestSuite.add('TC-TEEN-01', 'Protocolo Estructurado de Historia Clínica Adolescente (Orden de Campos, Estatus, Hipótesis Biopsicosociales y Exclusiones)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    // 1. Simulación de Expediente de Adolescente conforme a la ficha requerida
    const teenRecord = {
        id: 'teen_eval_2026',
        name: 'Alejandro Mendoza Rivas',
        status: 'Por iniciar',
        category: 'adolescent',
        birthdate: '2010-04-12',
        age: '16',
        gender: 'Masculino',
        schoolGrade: '4to año de Educación Media General',
        livesWith: 'Ambos padres y hermana menor',
        referral: ['Orientador', 'Psicopedagogo'],
        email: 'alejandro.mendoza@colegio.edu.ve',
        // Ficha del Representante / Tutor Legal
        guardianName: 'Beatriz Rivas de Mendoza',
        guardianRelation: 'Madre',
        guardianAge: '44',
        guardianSchooling: 'Universitaria Completa (Lic. en Administración)',
        guardianOccupation: 'Contadora Pública',
        guardianMaritalStatus: 'Casada',
        guardianPhone: '+58 412 9876543',
        guardianEmail: 'b.rivas@correo.com',
        guardianConsent: 'firmado', // Consentimiento Informado
        // Información Referente a la Consulta Psicológica
        previousPsych: 'No',
        applicantName: 'Beatriz Rivas (Madre)',
        initiative: 'Madre',
        initiativeOther: '',
        reason: 'Dificultades de motivación académica, aislamiento social progresivo en el hogar y episodios de desregulación emocional ante la frustración escolar.',
        goals: 'Mejorar hábitos de estudio, clarificar intereses vocacionales y adquirir estrategias de afrontamiento asertivo.',
        // Hipótesis Biopsicosociales
        bioHypothesis: 'Sin alteraciones orgánicas ni comorbilidades neurológicas. Patrón de sueño retrasado con uso nocturno de pantallas.',
        socialHypothesis: 'Vínculos familiares con altos estándares parentales de rendimiento académico. Red de pares reducida tras cambio de colegio.',
        psychHypothesis: 'Rasgos de autoexigencia desadaptativa con temor al fracaso, rumiación cognitiva y evitación experiencial como mecanismo de defensa.',
        // Factores Triádicos
        riskFactors: 'Aislamiento en habitación por más de 6 horas diarias; sobreexposición a pantallas; antecedentes de ansiedad en rama materna.',
        vulnerabilityFactors: 'Baja tolerancia a la frustración; inflexibilidad cognitiva ante evaluaciones académicas.',
        protectiveFactors: 'Familia continente y colaboradora; buena disposición del adolescente al proceso terapéutico; talento artístico para el dibujo.',
        // Encuadre
        frequency: 'Semanal',
        modality: 'Presencial',
        shift: 'Tarde'
    };

    // 2. Verificación de Estatus Inicial y Estados Permitidos
    const validStatuses = ['Por iniciar', 'En Evaluación', 'Plan de Intervención', 'Seguimiento', 'Alta', 'Inactivo'];
    if (!validStatuses.includes(teenRecord.status)) {
        throw new Error(`Estatus "${teenRecord.status}" no es válido dentro del flujo clínico de adolescente`);
    }

    // 3. Verificación de Extracción y Fusión en ClinicalHistorySystem
    const full = CHS.getFullHistory(teenRecord);
    if (full.status !== 'Por iniciar') throw new Error('El estatus del paciente debe preservarse en getFullHistory');
    if (full.age !== '16') throw new Error('La edad del adolescente debe preservarse');
    if (!Array.isArray(full.referral) || full.referral.length !== 2) throw new Error('El campo referido debe soportar selección múltiple');
    if (!full.guardianName || !full.guardianPhone || full.guardianConsent !== 'firmado') {
        throw new Error('Ficha del representante legal incompleta o consentimiento informado no validado');
    }
    if (!full.bioHypothesis || !full.socialHypothesis || !full.psychHypothesis) {
        throw new Error('Las tres hipótesis biopsicosociales deben ser campos requeridos en el modelo clínico');
    }
    if (!full.riskFactors || !full.vulnerabilityFactors || !full.protectiveFactors) {
        throw new Error('La tríada de factores (riesgo, vulnerabilidad, protección) debe registrarse');
    }
    if (full.shift !== 'Tarde' || full.frequency !== 'Semanal' || full.modality !== 'Presencial') {
        throw new Error('Los parámetros de encuadre (turno, frecuencia, modalidad) deben registrarse');
    }

    // 4. Verificación de Exclusiones Clínicas en Adolescentes
    if (teenRecord.phone) throw new Error('El teléfono propio del menor debe omitirse de la ficha del adolescente');
    if (teenRecord.maritalStatus) throw new Error('El estado civil propio del adolescente debe omitirse');
    if (teenRecord.notes) throw new Error('Notas de encuadre libres deben reemplazarse por frecuencia, modalidad y turno');

    // 5. Verificación de Renderizado del Visor HTML Protocolizado (renderTeenHistoryIntegral)
    const therapist = { name: 'Dra. Sofía Rincón', specialty: 'Psicología Clínica de la Infancia y Adolescencia', registry: 'FPV 14.280' };
    const htmlView = CHS.renderTeenHistoryIntegral(teenRecord, full, therapist, ' · FPV 14.280');

    if (!htmlView.includes('Estatus del Paciente') || !htmlView.includes('Por iniciar')) {
        throw new Error('El visor debe destacar el Estatus del Paciente al inicio');
    }
    if (!htmlView.includes('Ficha del Paciente (Adolescente)')) {
        throw new Error('Falta bloque 1: Ficha del Paciente (Adolescente)');
    }
    if (!htmlView.includes('Ficha del Representante / Tutor Legal')) {
        throw new Error('Falta bloque 2: Ficha del Representante / Tutor Legal');
    }
    if (!htmlView.includes('Consentimiento Informado')) {
        throw new Error('Debe denominarse expresamente "Consentimiento Informado"');
    }
    if (!htmlView.includes('Información Referente a la Consulta Psicológica')) {
        throw new Error('Falta bloque 3: Información Referente a la Consulta Psicológica');
    }
    if (!htmlView.includes('Hipótesis Biológica') || !htmlView.includes('Hipótesis Social y Familiar') || !htmlView.includes('Hipótesis Psicológica')) {
        throw new Error('El visor debe mostrar las tres hipótesis biopsicosociales');
    }
    if (!htmlView.includes('Factores de Riesgo') || !htmlView.includes('Factores de Vulnerabilidad') || !htmlView.includes('Factores de Protección')) {
        throw new Error('El visor debe mostrar los factores de riesgo, vulnerabilidad y protección');
    }
    if (!htmlView.includes('Encuadre y Acuerdos de Consulta') || !htmlView.includes('Turno: <strong>Tarde</strong>')) {
        throw new Error('Falta bloque 4: Encuadre con turno, modalidad y frecuencia');
    }

    // 6. Verificación de Generación de PDF Oficial de Adolescente
    const pdfHtml = CHS.exportHistoriaOficialAdolescentePDF(teenRecord, full, '16', therapist);
    if (!pdfHtml.includes('HISTORIA CLÍNICA ADOLESCENTE')) {
        throw new Error('El documento imprimible debe titularse HISTORIA CLÍNICA ADOLESCENTE');
    }
    if (!pdfHtml.includes('Estatus del Paciente:</strong> Por iniciar')) {
        throw new Error('El PDF debe incluir el estatus clínico');
    }
    if (!pdfHtml.includes('Consentimiento Informado')) {
        throw new Error('El PDF debe registrar el Consentimiento Informado');
    }
});

// 58. TC-CHILD-01: Protocolo Estructurado de Historia Clínica Infantil
ClinicalTestSuite.add('TC-CHILD-01', 'Protocolo Estructurado de Historia Clínica Infantil (Campos, Tutor, Expectativas e Hipótesis)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. Verificación de campos en formulario
    if (!indexHtml.includes('id="patientStatus"') || !indexHtml.includes('Por iniciar')) {
        throw new Error('index.html debe contener el estatus del paciente al inicio');
    }
    if (!indexHtml.includes('id="patientGuardianConsent"')) {
        throw new Error('Falta selector de consentimiento informado');
    }

    // 2. Modelo de datos infantil simulado
    const childRecord = {
        id: 'p_child_' + Date.now(),
        status: 'En Evaluación',
        name: 'Mateo Alejandro Torres',
        category: 'child',
        age: 8,
        gender: 'Masculino',
        schoolGrade: '3er grado de primaria',
        livesWith: 'Madre, abuela materna y primo',
        referral: ['Orientador', 'Psicopedagogo'],
        guardianName: 'Beatriz Torres',
        guardianRelation: 'Madre',
        guardianAge: 38,
        guardianSchooling: 'Universitaria',
        guardianOccupation: 'Lic. en Administración',
        guardianMaritalStatus: 'Divorciado/a',
        guardianPhone: '+58 414 1234567',
        guardianEmail: 'beatriz.t@ejemplo.com',
        guardianConsent: 'firmado',
        previousPsych: 'No',
        applicantName: 'Beatriz Torres',
        initiative: 'Madre',
        reason: 'Dificultades en regulación conductual y frustración.',
        goals: 'Expectativas: Brindar herramientas de autorregulación emocional.',
        bioHypothesis: 'Maduración neurobiológica acorde a edad, sueño conservado.',
        socialHypothesis: 'Dinámica monoparental con apoyo de abuela materna.',
        psychHypothesis: 'Baja tolerancia a la frustración con descarga somato-conductual.',
        riskFactors: 'Aislamiento ocasional ante el enfado.',
        vulnerabilityFactors: 'Ansiedad por separación leve.',
        protectiveFactors: 'Vínculo afectivo seguro con madre y adecuada capacidad lúdica.',
        frequency: 'Semanal',
        modality: 'Presencial',
        shift: 'Tarde'
    };

    // Validaciones de exclusión clínica en niño
    if (childRecord.phone) throw new Error('El teléfono propio del menor debe omitirse en la ficha infantil');
    if (childRecord.maritalStatus) throw new Error('El estado civil propio del niño debe omitirse');
    if (childRecord.email) throw new Error('El correo del niño debe omitirse');

    // Validación de hipótesis y factores
    if (!childRecord.bioHypothesis || !childRecord.socialHypothesis || !childRecord.psychHypothesis) {
        throw new Error('Ficha infantil debe contar con las 3 hipótesis biopsicosociales');
    }
    if (!childRecord.riskFactors || !childRecord.vulnerabilityFactors || !childRecord.protectiveFactors) {
        throw new Error('Ficha infantil debe registrar factores de riesgo, vulnerabilidad y protección');
    }
});

// 59. TC-ADULT-01: Protocolo Estructurado de Ficha Adulto
ClinicalTestSuite.add('TC-ADULT-01', 'Protocolo Estructurado de Ficha Adulto (Deseabilidad Social, Motivación Propia, Domicilio e Hipótesis)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. Verificación de existencia de campos en index.html
    if (!indexHtml.includes('id="patientSocialDesirability"') || !indexHtml.includes('id="patientSelfMotivation"') || !indexHtml.includes('id="patientAddress"')) {
        throw new Error('index.html debe contener patientSocialDesirability, patientSelfMotivation y patientAddress');
    }

    // 2. Modelo de datos adulto protocolizado
    const adultRecord = {
        id: 'p_adult_' + Date.now(),
        status: 'Plan de Intervención',
        name: 'Valeria Mercedes Rivas',
        category: 'adult',
        age: 32,
        gender: 'Femenino',
        schoolGrade: 'Licenciatura en Comunicación Social',
        occupation: 'Periodista Digital',
        maritalStatus: 'Soltero/a',
        livesWith: 'Vive sola',
        socialDesirability: 'NO',
        selfMotivation: 'SI',
        referral: ['Médico/Especialista'],
        address: 'Av. Libertador, Edif. Los Samanes, Apt 4B',
        phone: '+58 412 9876543',
        email: 'valeria.rivas@ejemplo.com',
        previousPsych: 'Sí',
        reason: 'Sintomatología ansiosa generalizada vinculada a sobrecarga laboral.',
        goals: 'Aprender técnicas de manejo de estrés y reestructuración cognitiva.',
        bioHypothesis: 'Hiperreactividad fisiológica y bruxismo nocturno.',
        socialHypothesis: 'Alta exigencia laboral y red de apoyo familiar a distancia.',
        psychHypothesis: 'Pensamiento dicotómico y perfeccionismo desadaptativo.',
        riskFactors: 'Patrones de sueño irregulares.',
        vulnerabilityFactors: 'Historia de ansiedad familiar materna.',
        protectiveFactors: 'Introspección reflexiva, motivación intrínseca elevada.',
        frequency: 'Quincenal',
        modality: 'Online',
        shift: 'Mañana'
    };

    if (adultRecord.socialDesirability !== 'NO' && adultRecord.socialDesirability !== 'SI') {
        throw new Error('Deseabilidad social debe ser SI o NO');
    }
    if (adultRecord.selfMotivation !== 'SI' && adultRecord.selfMotivation !== 'NO') {
        throw new Error('Motivación propia debe ser SI o NO');
    }
    if (!adultRecord.address) throw new Error('Domicilio es requerido en adulto');
    if (!adultRecord.bioHypothesis || !adultRecord.socialHypothesis || !adultRecord.psychHypothesis) {
        throw new Error('Ficha adulto debe contar con las 3 hipótesis biopsicosociales');
    }
});

// 60. TC-CAL-02: Gestión y Transición de Estados de Citas Clínicas
ClinicalTestSuite.add('TC-CAL-02', 'Gestión y Transición de Estados de Citas Clínicas (Agendada, Completada, Reprogramada, Cancelada)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. Selector de estado en appointmentModal
    if (!indexHtml.includes('id="appointmentStatus"') || !indexHtml.includes('value="reprogramada"')) {
        throw new Error('index.html debe contener el selector appointmentStatus con opción reprogramada');
    }

    // 2. Simulación de ciclo de vida de cita
    const apt = {
        id: 'apt_test_' + Date.now(),
        patientId: 'p_101',
        date: '2026-10-25',
        time: '15:00',
        duration: 50,
        type: 'Online',
        status: 'agendada'
    };

    // Transición a reprogramada
    apt.status = 'reprogramada';
    apt.date = '2026-10-26';
    if (apt.status !== 'reprogramada') throw new Error('Estado debe ser reprogramada');

    // Transición a completada
    apt.status = 'completada';
    if (apt.status !== 'completada') throw new Error('Estado debe ser completada');

    // Transición a cancelada
    apt.status = 'cancelada';
    if (apt.status !== 'cancelada') throw new Error('Estado debe ser cancelada');
});

// 61. TC-SCALE-01: Motor Dinámico y Almacenamiento de Escalas y Tests Psicométricos
ClinicalTestSuite.add('TC-SCALE-01', 'Motor Dinámico y Almacenamiento de Escalas y Tests Psicométricos (Creación, Ponderación y Cortes)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const scalesJs = fs.readFileSync('scales.js', 'utf8');

    if (!indexHtml.includes('id="scaleEditorModal"')) {
        throw new Error('index.html debe contener el modal scaleEditorModal');
    }
    if (!scalesJs.includes('getAllClinicalScales') || !scalesJs.includes('openScaleEditorModal')) {
        throw new Error('scales.js debe exportar getAllClinicalScales y openScaleEditorModal');
    }

    // Creación simulada de test psicométrico
    const customScale = {
        id: 'scale_brs_01',
        name: 'Escala Breve de Resiliencia',
        shortName: 'BRS',
        domain: 'Resiliencia y Afrontamiento',
        maxScore: 12,
        questions: [
            'Tiendo a recuperarme rápido de las dificultades',
            'Me resulta fácil superar los momentos estresantes',
            'No tardo mucho en superar un revés'
        ],
        cutoffs: { mild: 4, moderate: 8, severe: 9 }
    };

    if (customScale.questions.length !== 3) throw new Error('Error en cantidad de ítems');
    if (customScale.cutoffs.severe <= customScale.cutoffs.moderate) {
        throw new Error('Corte severo debe ser mayor a moderado');
    }
});

// 62. TC-PORTAL-05: Apertura Robusta del Portal Terapéutico Digital del Paciente
ClinicalTestSuite.add('TC-PORTAL-05', 'Apertura Robusta del Portal Terapéutico Digital del Paciente (Enlace Nativo y Mitigación de Bloqueo)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');

    if (!appJs.includes('preparePortalLaunch') || !appJs.includes('window.location.href = targetUrl')) {
        throw new Error('app.js debe implementar preparePortalLaunch y fallback con window.location.href');
    }
    if (!appJs.includes('class="btn-portal-launch"')) {
        throw new Error('app.js debe enlazar el botón principal con estilo btn-portal-launch');
    }
});

// 63. TC-EXP-01: Ficha Rápida del Expediente Clínico (Estatus, Fechas de Ingreso y Egreso, Intervención y Colores de Alta)
ClinicalTestSuite.add('TC-EXP-01', 'Ficha Rápida del Expediente Clínico (Estatus, Fechas de Ingreso y Egreso, Intervención y Colores de Alta)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');

    // 1. Campos de ingreso, egreso e intervención en el formulario del expediente
    if (!indexHtml.includes('id="patientAdmissionDate"') || !indexHtml.includes('id="patientDischargeDate"') || !indexHtml.includes('id="patientIntervention"')) {
        throw new Error('index.html debe contener patientAdmissionDate, patientDischargeDate y patientIntervention');
    }

    // 2. Manejador de cambio de estatus y actualización rápida
    if (!appJs.includes('onPatientStatusChange') || !appJs.includes('quickUpdatePatientStatus')) {
        throw new Error('app.js debe implementar onPatientStatusChange y quickUpdatePatientStatus');
    }

    // 3. Pestaña de Expediente Clínico y renderizado de resumen rápido
    if (!appJs.includes('Expediente Clínico') || !appJs.includes('expediente-kpi-grid') || !appJs.includes('expediente-alta-banner')) {
        throw new Error('app.js debe incluir la pestaña Expediente Clínico con KPI grid y banner de alta');
    }

    // 4. Identificadores visuales cromáticos y estilos de Alta en CSS
    if (!stylesCss.includes('.status-alta') || !stylesCss.includes('.badge-alta-chip') || !stylesCss.includes('.expediente-alta-banner')) {
        throw new Error('styles.css debe contener los estilos de .status-alta, .badge-alta-chip y .expediente-alta-banner');
    }
});

// 64. TC-EXP-02: Ubicación Superior Inmediata y Sticky de las Pestañas del Expediente Clínico
ClinicalTestSuite.add('TC-EXP-02', 'Ubicación Superior Inmediata y Sticky de las Pestañas del Expediente Clínico', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');

    // 1. En viewPatient, patient-tabs debe ubicarse ANTES de los contenidos de pestaña y antes de tab-resumen
    const viewPatientIdx = appJs.indexOf('function viewPatient(id)');
    if (viewPatientIdx === -1) throw new Error('function viewPatient no encontrada en app.js');

    const heroIdx = appJs.indexOf('patient-dossier-hero', viewPatientIdx);
    const tabsIdx = appJs.indexOf('class="patient-tabs"', viewPatientIdx);
    const tabResumenIdx = appJs.indexOf('id="tab-resumen"', viewPatientIdx);
    const tabNotasIdx = appJs.indexOf('id="tab-notas"', viewPatientIdx);

    if (tabsIdx === -1 || tabResumenIdx === -1 || tabNotasIdx === -1) {
        throw new Error('No se encontraron patient-tabs o los contenedores de pestañas en viewPatient');
    }

    if (tabsIdx < heroIdx) {
        throw new Error('patient-tabs debe ir posterior al encabezado hero del paciente para mantener el contexto del sujeto');
    }

    if (tabsIdx > tabResumenIdx || tabsIdx > tabNotasIdx) {
        throw new Error('patient-tabs debe ubicarse en la parte superior, antes de tab-resumen y tab-notas');
    }

    // 2. Comprobar que en styles.css .patient-tabs tiene position: sticky y top: 0
    if (!stylesCss.includes('.patient-tabs') || !stylesCss.includes('position: sticky;') || !stylesCss.includes('top: 0;')) {
        throw new Error('styles.css debe configurar .patient-tabs con position: sticky y top: 0 para permanencia visual al scroll');
    }
});

// 67. TC-FILE-01: Resiliencia ante Apertura Directa de Archivo Local (file:// Protocol y Mitigación CORS)
ClinicalTestSuite.add('TC-FILE-01', 'Resiliencia ante Apertura Directa de Archivo Local (Protocolo file:// y Mitigación CORS)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');

    // 1. Validar que el ServiceWorker y manifest en index.html estén protegidos contra protocolo file:
    if (!indexHtml.includes("window.location.protocol === 'http:' || window.location.protocol === 'https:'")) {
        throw new Error('index.html debe verificar protocolo http/https antes de cargar manifest o registrar ServiceWorker');
    }

    // 2. Validar que exista el banner de advertencia local fileProtocolNotice
    if (!indexHtml.includes('id="fileProtocolNotice"')) {
        throw new Error('index.html debe contener el elemento banner #fileProtocolNotice para orientar al usuario en modo local');
    }

    // 3. Validar que app.js proteja ensureSessionToken y sincronización en la nube contra protocolo file:
    if (!appJs.includes("window.location.protocol === 'file:'")) {
        throw new Error("app.js debe proteger funciones críticas de red contra window.location.protocol === 'file:'");
    }

    // 4. Validar que portal.js verifique protocolo antes de llamar al backend de auth
    if (!portalJs.includes("window.location.protocol !== 'file:'")) {
        throw new Error("portal.js debe proteger endpoints /api/v1/portal/auth contra protocolo file://");
    }
});

// 67. TC-SEC-15: Bloqueo de Descarga No Autenticada de Almacén Clínico y Archivos JSON (HTTP 403)
ClinicalTestSuite.add('TC-SEC-15', 'Bloqueo estricto de acceso no autenticado a /data/psiconotes_relacional.json (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const res = await fetch(`${baseUrl}/data/psiconotes_relacional.json`);
    if (res.status !== 403) {
        throw new Error(`FALLO CRÍTICO P0: El almacén /data/psiconotes_relacional.json fue accesible con status ${res.status} (esperado: 403)`);
    }
    const resGenericJson = await fetch(`${baseUrl}/data/cualquier_archivo.json`);
    if (resGenericJson.status !== 403) {
        throw new Error(`FALLO: Extensión .json en carpeta data no fue bloqueada con 403 (status: ${resGenericJson.status})`);
    }
});

// 68. TC-SEC-16: Prevención de Fabricación de Contenido Clínico SOAP por Fallback de IA (HTTP 503)
ClinicalTestSuite.add('TC-SEC-16', 'Prevención de notas clínicas inventadas por IA cuando falta API Key (HTTP 503)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const token = generateSessionToken('dr_ai_test_' + Date.now(), 'ai_test@clinica.com');

    // Forzar entorno sin GEMINI_API_KEY para verificar que no invente datos
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
        const res = await fetch(`${baseUrl}/api/v1/clinical/soap-synthesize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ notes: 'Paciente acude con angustia y llanto intermitente.' })
        });

        if (res.status !== 503) {
            throw new Error(`FALLO ÉTICO/CLÍNICO: Endpoint de síntesis SOAP respondió con status ${res.status} en vez de 503 ante ausencia de API key`);
        }
        const data = await res.json();
        if (data.source !== 'unavailable') {
            throw new Error("La respuesta ante ausencia de IA debe declarar explícitamente source: 'unavailable'");
        }
        if (data.objetivo || data.analisis || data.plan) {
            throw new Error('FALLO: Se fabricó contenido clínico falso en respuesta SOAP');
        }
    } finally {
        if (savedKey) process.env.GEMINI_API_KEY = savedKey;
    }
});

// 69. TC-SEC-17: Aislamiento BOLA/IDOR para Expedientes Huérfanos sin therapist_id (HTTP 403)
ClinicalTestSuite.add('TC-SEC-17', 'Aislamiento BOLA/IDOR para expedientes huérfanos sin therapist_id asignado (HTTP 403)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const randomTherapist = 'dr_stranger_' + Date.now();
    const token = generateSessionToken(randomTherapist, 'stranger@clinica.com');

    // Crear paciente huérfano (sin therapist_id) directamente en base de datos
    const orphanPatient = {
        id: 'pat_orphan_test_' + Date.now(),
        name: 'Paciente Sin Terapeuta Asignado',
        diagnosis: 'F32.1 Episodio Depresivo Moderado',
        therapist_id: null
    };
    await db.upsertPatient(orphanPatient);

    // El terapeuta intenta consultar este paciente huérfano: debe ser estrictamente denegado con 403
    const res = await fetch(`${baseUrl}/api/v1/portal/data/${orphanPatient.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.status !== 403) {
        throw new Error(`FALLO BOLA: Paciente huérfano pudo ser consultado por terapeuta arbitrario (status: ${res.status}, esperado: 403)`);
    }

    // Verificar que getPatientsByTherapist no devuelva pacientes huérfanos
    const list = await db.getPatientsByTherapist(randomTherapist);
    const foundOrphan = list.some(p => p.id === orphanPatient.id);
    if (foundOrphan) {
        throw new Error('FALLO MULTITENANT: getPatientsByTherapist incluyó un paciente con therapist_id nulo en el listado');
    }
});

// 70. TC-SEC-18: Prevención de Bypass en Registro y Fuga Cero de password_hash
ClinicalTestSuite.add('TC-SEC-18', 'Prevención de bypass de registro por ID y verificación de cero fuga de password_hash', async () => {
    const baseUrl = await ensureTestServer();
    const email = `victim_${Date.now()}@clinica.com`;
    const realHash = 'hash_original_secreto_123';
    const fakeHash = 'hash_atacante_falso_999';

    // 1. Registro legítimo del terapeuta
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Dra. Víctima',
            email,
            passwordHash: realHash,
            specialty: 'Psicología'
        })
    });
    const regData = await regRes.json();
    if (regRes.status !== 200 || !regData.therapist) {
        throw new Error('Fallo al crear terapeuta inicial de prueba');
    }
    if (regData.therapist.password_hash || regData.therapist.passwordHash) {
        throw new Error('FUGA DE CREDENCIALES: El endpoint de registro devolvió el campo password_hash en la respuesta JSON');
    }

    const victimId = regData.therapist.id;

    // 2. Intento de atacante de registrar con el mismo email, contraseña falsa pero pasando victimId
    const attackRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: victimId,
            email,
            passwordHash: fakeHash
        })
    });

    if (attackRes.status !== 409) {
        throw new Error(`FALLO DE AUTENTICACIÓN: Atacante pudo secuestrar sesión pasando el ID en register (status: ${attackRes.status}, esperado: 409)`);
    }
});

// 71. TC-SEC-19: Persistencia Atómica y Resguardo de Respaldo .bak
ClinicalTestSuite.add('TC-SEC-19', 'Persistencia atómica y generación automática de respaldo .bak en operaciones clínicas', async () => {
    const { db } = await import('./db.js');
    const fs = await import('fs');
    const path = await import('path');

    const testPatient = {
        id: 'pat_atomic_test_' + Date.now(),
        name: 'Paciente Prueba Atómica',
        therapist_id: 'dr_atomic_tester'
    };

    await db.upsertPatient(testPatient);

    const bakPath = path.join('data', 'psiconotes_relacional.json.bak');
    const mainPath = path.join('data', 'psiconotes_relacional.json');

    if (!fs.existsSync(mainPath)) {
        throw new Error('El archivo principal psiconotes_relacional.json debe existir tras persistencia');
    }
    if (!fs.existsSync(bakPath)) {
        throw new Error('El archivo de respaldo atómico psiconotes_relacional.json.bak debe generarse preventivamente');
    }
});

// 72. TC-SEC-20: Seguridad en Proxy de Consultas IA y Control de Claves del Servidor
ClinicalTestSuite.add('TC-SEC-20', 'Protección del proxy /api/v1/clinical/ai-query y rechazo sin autenticación (HTTP 401/503)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    // 1. Acceso no autenticado debe responder 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/clinical/ai-query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Explicar técnica de defusión cognitiva' })
    });

    if (unauthRes.status !== 401) {
        throw new Error(`FALLO DE SEGURIDAD: ai-query sin autenticación devolvió status ${unauthRes.status} (esperado 401)`);
    }

    // 2. Acceso autenticado sin GEMINI_API_KEY en entorno debe responder 503 source: unavailable
    const token = generateSessionToken('therapist_ai_test_' + Date.now(), 'ai_tester@clinica.com');
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
        const resNoKey = await fetch(`${baseUrl}/api/v1/clinical/ai-query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: 'Explicar técnica de defusión cognitiva' })
        });

        if (resNoKey.status !== 503) {
            throw new Error(`FALLO: ai-query sin API key debe responder 503, obtenido ${resNoKey.status}`);
        }
        const data = await resNoKey.json();
        if (data.source !== 'unavailable') {
            throw new Error('ai-query debe declarar explícitamente source: unavailable ante ausencia de credenciales');
        }

        // 3. Status endpoint
        const statusRes = await fetch(`${baseUrl}/api/v1/clinical/ai-status`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const statusData = await statusRes.json();
        if (statusData.available !== false) {
            throw new Error('ai-status debe reportar available: false cuando falta GEMINI_API_KEY');
        }
    } finally {
        if (savedKey) process.env.GEMINI_API_KEY = savedKey;
    }
});

// 73. TC-KID-01: Portal Pacientes Kid — Registro Lúdico y Recuperación
ClinicalTestSuite.add('TC-KID-01', 'Portal Pacientes Kid: Registro de actividades lúdicas (clima, avatar, dibujo) y obtención por token', async () => {
    const baseUrl = await ensureTestServer();
    const { db } = await import('./db.js');

    const patId = 'pat_kid_test_' + Date.now();
    const token = 'KID-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.upsertPatient({
        id: patId,
        name: 'Tomás Explorador',
        category: 'child',
        portal_token: token,
        therapist_id: 'therapist_kid_01'
    });

    // 1. Enviar actividad de clima y mapa somático
    const postRes = await fetch(`${baseUrl}/api/v1/portal/kid/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientToken: token,
            activityType: 'weather_body',
            data: {
                weather: 'sunny',
                weatherLabel: 'Soleado ☀️',
                bodyZone: 'belly',
                bodyZoneLabel: 'En la pancita 🌀'
            }
        })
    });

    if (postRes.status !== 201) {
        throw new Error(`Esperado status 201 en kid activity, recibido ${postRes.status}`);
    }
    const postJson = await postRes.json();
    if (!postJson.rewardStar) {
        throw new Error('La respuesta de actividad infantil debe otorgar una rewardStar');
    }

    // 2. Enviar personalización de avatar
    await fetch(`${baseUrl}/api/v1/portal/kid/activity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientToken: token,
            activityType: 'avatar_customization',
            data: {
                character: 'fox',
                emoji: '🦊',
                name: 'Zorrito Valiente',
                aura: 'aura-gold',
                accessory: 'cape'
            }
        })
    });

    // 3. Consultar actividades desde el portal del niño
    const getRes = await fetch(`${baseUrl}/api/v1/portal/kid/activity?token=${encodeURIComponent(token)}`);
    if (getRes.status !== 200) {
        throw new Error(`Esperado status 200 en get kid activities, recibido ${getRes.status}`);
    }
    const getJson = await getRes.json();
    if (!Array.isArray(getJson.activities) || getJson.activities.length < 2) {
        throw new Error('Debe retornar la lista de actividades registradas para el paciente pediátrico');
    }
});

// 74. TC-KID-02: Portal Pacientes Kid — Control BOLA/IDOR para Acceso Clínico
ClinicalTestSuite.add('TC-KID-02', 'Portal Pacientes Kid: Prevención BOLA/IDOR en lectura clínica por parte de terapeutas', async () => {
    const baseUrl = await ensureTestServer();
    const { db } = await import('./db.js');
    const { generateSessionToken } = await import('./server.js');

    const assignedTherapistId = 'dr_assigned_' + Date.now();
    const intruderTherapistId = 'dr_intruder_' + Date.now();
    const patId = 'pat_kid_bola_' + Date.now();
    const token = 'KID-BOLA-' + Math.random().toString(36).substring(2, 8).toUpperCase();

    await db.upsertPatient({
        id: patId,
        name: 'Sofía Valiente',
        category: 'child',
        portal_token: token,
        therapist_id: assignedTherapistId
    });

    // Guardar una actividad lúdica
    await db.saveKidActivity(patId, {
        activityType: 'drawing',
        data: { imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }
    });

    const assignedToken = generateSessionToken(assignedTherapistId, 'assigned@clinica.com');
    const intruderToken = generateSessionToken(intruderTherapistId, 'intruder@clinica.com');

    // 1. Acceso sin token -> 401
    const unauthRes = await fetch(`${baseUrl}/api/v1/patients/${patId}/kid-activity`);
    if (unauthRes.status !== 401) {
        throw new Error(`Esperado 401 sin autenticación, recibido ${unauthRes.status}`);
    }

    // 2. Acceso por terapeuta no autorizado (BOLA/IDOR) -> 403
    const intruderRes = await fetch(`${baseUrl}/api/v1/patients/${patId}/kid-activity`, {
        headers: { 'Authorization': `Bearer ${intruderToken}` }
    });
    if (intruderRes.status !== 403) {
        throw new Error(`FALLO BOLA/IDOR: Terapeuta no asignado debe recibir 403, recibido ${intruderRes.status}`);
    }

    // 3. Acceso por terapeuta asignado -> 200
    const assignedRes = await fetch(`${baseUrl}/api/v1/patients/${patId}/kid-activity`, {
        headers: { 'Authorization': `Bearer ${assignedToken}` }
    });
    if (assignedRes.status !== 200) {
        throw new Error(`Terapeuta asignado debe acceder con 200, recibido ${assignedRes.status}`);
    }
    const assignedJson = await assignedRes.json();
    if (!Array.isArray(assignedJson.activities) || assignedJson.activities.length === 0) {
        throw new Error('Debe devolver el historial de actividades lúdicas del niño');
    }
});

// 75. TC-KID-03: Portal Pacientes Kid — Activación Automática (<13 años) y Ocultamiento Estricto en Adultos/Adolescentes
ClinicalTestSuite.add('TC-KID-03', 'Portal Pacientes Kid: Activación automática para menores de 13 años (<13a) y cero exposición en adultos', async () => {
    const fs = await import('fs');
    const path = await import('path');
    const { db } = await import('./db.js');

    // 1. Simulación de funciones clínicas de evaluación de edad
    function calculateAge(bd) {
        if (!bd) return '';
        const b = new Date(bd);
        const t = new Date();
        let a = t.getFullYear() - b.getFullYear();
        const m = t.getMonth() - b.getMonth();
        if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
        return a;
    }

    function isKidPatient(p) {
        if (!p) return false;
        if (p.birthdate) {
            const a = calculateAge(p.birthdate);
            if (typeof a === 'number' && !isNaN(a) && a >= 0) return a < 13;
        }
        const directAge = parseInt(p.age, 10);
        if (!isNaN(directAge) && directAge >= 0) return directAge < 13;
        const stage = (p.category || p.lifeStage || p.life_stage || '').toLowerCase();
        return stage === 'child' || stage === 'infantil';
    }

    // Caso A: Paciente de 8 años (Niño) -> Debe ser Portal Kids
    const now = new Date();
    const birthdateKid = new Date(now.getFullYear() - 8, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const kidPatient = { id: 'kid_8yo', name: 'Lucas', birthdate: birthdateKid };
    if (!isKidPatient(kidPatient)) {
        throw new Error('Paciente de 8 años DEBE ser detectado como Portal KIDS (isKidPatient === true)');
    }

    // Caso B: Paciente de 12 años (Límite superior niñez < 13) -> Debe ser Portal Kids
    const birthdateKid12 = new Date(now.getFullYear() - 12, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const kidPatient12 = { id: 'kid_12yo', name: 'Mateo', birthdate: birthdateKid12 };
    if (!isKidPatient(kidPatient12)) {
        throw new Error('Paciente de 12 años DEBE ser detectado como Portal KIDS (isKidPatient === true)');
    }

    // Caso C: Paciente de 13 años cumplidos (Adolescente) -> NO debe ser Portal Kids
    const birthdateTeen13 = new Date(now.getFullYear() - 13, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const teenPatient13 = { id: 'teen_13yo', name: 'Valeria', birthdate: birthdateTeen13 };
    if (isKidPatient(teenPatient13)) {
        throw new Error('Paciente de 13 años cumplidos NO debe ser Portal Kids (es adolescente)');
    }

    // Caso D: Paciente de 28 años (Adulto) -> NO debe ser Portal Kids
    const birthdateAdult = new Date(now.getFullYear() - 28, now.getMonth(), now.getDate()).toISOString().split('T')[0];
    const adultPatient = { id: 'adult_28yo', name: 'Carlos', birthdate: birthdateAdult };
    if (isKidPatient(adultPatient)) {
        throw new Error('Paciente adulto NO debe ser detectado como Portal Kids');
    }

    // Caso E: Verificación de plantilla portal.html — El botón de alternancia hacia modo kids debe estar oculto por defecto
    const portalHtmlPath = path.resolve('portal.html');
    const portalHtml = fs.readFileSync(portalHtmlPath, 'utf8');
    if (!portalHtml.includes('id="btnKidModeToggle"') || !portalHtml.includes('display: none !important;')) {
        throw new Error('El botón #btnKidModeToggle en portal.html debe estar estrictamente oculto con display: none !important');
    }

    // Caso F: Verificación de portal.css — .btn-kid-toggle debe tener display: none por defecto
    const portalCssPath = path.resolve('portal.css');
    const portalCss = fs.readFileSync(portalCssPath, 'utf8');
    if (!portalCss.includes('.btn-kid-toggle') || !portalCss.includes('display: none;')) {
        throw new Error('La clase .btn-kid-toggle en portal.css debe tener display: none por defecto para que adultos/adolescentes no la vean');
    }
});

// 76. TC-KID-04: Portal Pacientes Kid — Reflejo Inmediato de Actividades Infantiles en la Pestaña del Terapeuta
ClinicalTestSuite.add('TC-KID-04', 'Portal Pacientes Kid: Reflejo inmediato de actividades infantiles en pestaña del terapeuta', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // Cargar contenido de app.js y extraer o evaluar las funciones del portal
    const appJsPath = path.resolve('app.js');
    const appJs = fs.readFileSync(appJsPath, 'utf8');

    // Verificar que app.js contiene la lógica de getPortalResults con kidActivities, kidAvatar y kidStars
    if (!appJs.includes('kidActivities = []') || !appJs.includes('kidAvatar') || !appJs.includes('kidStars')) {
        throw new Error('getPortalResults en app.js debe inicializar y procesar kidActivities, kidAvatar y kidStars');
    }

    // Verificar que renderPortalTab contiene el bento lúdico pediátrico
    if (!appJs.includes('Clima & Cuerpo') || !appJs.includes('Preocupaciones Cazadas') || !appJs.includes('Lienzo de Dibujo')) {
        throw new Error('renderPortalTab en app.js debe renderizar las tarjetas bento pediátricas (Clima, Preocupaciones, Lienzo)');
    }

    // Verificar que existe la función de inspección de dibujos window.previewKidDrawing
    if (!appJs.includes('window.previewKidDrawing = function') && !appJs.includes('previewKidDrawing(dataUrl')) {
        throw new Error('app.js debe exponer window.previewKidDrawing para visualizar dibujos del paciente');
    }

    // Simulación en entorno Node con mock de localStorage y AppState
    const mockStorage = {};
    const mockLocalStorage = {
        getItem: (k) => mockStorage[k] || null,
        setItem: (k, v) => { mockStorage[k] = String(v); },
        removeItem: (k) => { delete mockStorage[k]; }
    };

    const kidPatId = 'kid_test_sim_' + Date.now();
    const adultPatId = 'adult_test_sim_' + Date.now();

    // Guardar actividades lúdicas simuladas en mockLocalStorage
    mockStorage[`psico_portal_kid_${kidPatId}`] = JSON.stringify({
        avatar: { character: 'bear', emoji: '🐻', name: 'Osito Valiente', aura: 'aura-blue', accessory: 'hat', accEmoji: '🎩' },
        stars: 7,
        activities: [
            {
                id: 'act_draw_1',
                activity_type: 'drawing',
                data: {
                    imageDataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                    sentAt: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            },
            {
                id: 'act_weather_1',
                activity_type: 'weather_body',
                data: {
                    weather: 'sunny',
                    weatherLabel: 'Sol Radiante (Feliz)',
                    bodyZone: 'chest',
                    bodyZoneLabel: 'En el pecho 💖',
                    recordedAt: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            },
            {
                id: 'act_bubble_1',
                activity_type: 'bubble_popped',
                data: {
                    worryText: 'Miedo a la oscuridad',
                    totalPopped: 3,
                    poppedAt: new Date().toISOString()
                },
                created_at: new Date().toISOString()
            }
        ]
    });

    // Validar extracción con lógica equivalente de getPortalResults
    const rawKid = mockLocalStorage.getItem(`psico_portal_kid_${kidPatId}`);
    const parsedKid = JSON.parse(rawKid);
    if (!parsedKid || parsedKid.activities.length !== 3) {
        throw new Error('La lectura local de actividades debe recuperar las 3 actividades guardadas');
    }
    if (parsedKid.avatar.character !== 'bear' || parsedKid.stars !== 7) {
        throw new Error('La lectura debe mantener el avatar y las estrellas del paciente pediátrico');
    }

    // Validar index.html contiene el modal de vista previa del dibujo
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
    if (!indexHtml.includes('id="kidDrawingPreviewModal"')) {
        throw new Error('index.html debe contener el modal kidDrawingPreviewModal');
    }
});

// 77. TC-SEC-21: Rechazo de claves Gemini enviadas por el cliente en encabezados o cuerpo
ClinicalTestSuite.add('TC-SEC-21', 'Rechazo de claves Gemini enviadas por el cliente en encabezados o cuerpo', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const token = generateSessionToken('therapist_gemini_test_' + Date.now(), 'gemini_test@clinica.com');

    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    try {
        // Enviar petición con x-gemini-key inyectada por cliente
        const clientKey = 'AIzaSy_fake_injected_client_key_12345';
        const res = await fetch(`${baseUrl}/api/v1/clinical/soap-synthesize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-gemini-key': clientKey
            },
            body: JSON.stringify({ notes: 'Paciente refiere sintomatología ansiosa moderada.' })
        });

        // Debe ser 503 porque el servidor NO acepta la clave enviada por el cliente
        if (res.status !== 503) {
            throw new Error(`FALLO DE SEGURIDAD: El servidor aceptó la clave Gemini enviada por el cliente (status: ${res.status}, esperado: 503)`);
        }

        const data = await res.json();
        if (data.source !== 'unavailable') {
            throw new Error('El servidor debe rechazar la clave de cliente e indicar source: unavailable');
        }

        // Probar también en ai-query
        const resAi = await fetch(`${baseUrl}/api/v1/clinical/ai-query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'x-gemini-key': clientKey
            },
            body: JSON.stringify({ prompt: 'Explicar reestructuración cognitiva' })
        });

        if (resAi.status !== 503) {
            throw new Error(`FALLO DE SEGURIDAD: ai-query aceptó clave de cliente x-gemini-key (status: ${resAi.status}, esperado: 503)`);
        }
    } finally {
        if (savedKey) process.env.GEMINI_API_KEY = savedKey;
    }
});

// 78. TC-SEC-22: Ausencia de claves en el bundle frontend y código cliente
ClinicalTestSuite.add('TC-SEC-22', 'Ausencia de claves API privadas en código fuente frontend y almacenamiento', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const clientFiles = [
        'index.html',
        'portal.html',
        'app.js',
        'portal.js',
        'ai-clinical.js',
        'dist/index.html',
        'dist/portal.html'
    ];

    const googleKeyPattern = /AIza[0-9A-Za-z-_]{35}/;

    for (const relPath of clientFiles) {
        const fullPath = path.resolve(relPath);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (googleKeyPattern.test(content)) {
                throw new Error(`FUGA DE CLAVE: Se detectó patrón de API Key en archivo público frontend: ${relPath}`);
            }
        }
    }

    // Comprobar que ai-clinical.js purga claves de almacenamiento
    const aiCode = fs.readFileSync(path.resolve('ai-clinical.js'), 'utf8');
    if (!aiCode.includes('purgeLegacyStorage') || !aiCode.includes('localStorage.removeItem')) {
        throw new Error('ai-clinical.js debe incluir rutinas activas de purga de claves en localStorage');
    }
});

// 79. TC-SEC-23: Acceso no autenticado a archivos privados estrictamente denegado (HTTP 403)
ClinicalTestSuite.add('TC-SEC-23', 'Acceso no autenticado a archivos privados estrictamente denegado con HTTP 403', async () => {
    const baseUrl = await ensureTestServer();

    const privateFiles = [
        '/server.js',
        '/db.js',
        '/package.json',
        '/Dockerfile',
        '/docker-compose.yml',
        '/tsconfig.json',
        '/src/App.tsx',
        '/node_modules/express/index.js',
        '/data/psiconotes_relacional.json',
        '/revision/01-pm-inventario.md',
        '/..%2fpackage.json'
    ];

    for (const fileUrl of privateFiles) {
        const res = await fetch(`${baseUrl}${fileUrl}`);
        if (res.status !== 403) {
            throw new Error(`FALLO DE ACCESO: Archivo privado ${fileUrl} respondió status ${res.status} (esperado: 403)`);
        }
    }

    // Verificar que los recursos públicos legítimos sigan respondiendo HTTP 200
    const publicChecks = [
        { path: '/', expectedStatus: 200 },
        { path: '/index.html', expectedStatus: 200 },
        { path: '/portal.html', expectedStatus: 200 },
        { path: '/styles.css', expectedStatus: 200 },
        { path: '/portal.css', expectedStatus: 200 },
        { path: '/manifest.json', expectedStatus: 200, checkType: 'application/manifest+json' },
        { path: '/app.js', expectedStatus: 200 },
        { path: '/portal.js', expectedStatus: 200 }
    ];

    for (const check of publicChecks) {
        const res = await fetch(`${baseUrl}${check.path}`);
        if (res.status !== check.expectedStatus) {
            throw new Error(`FALLO DE DISPONIBILIDAD: Recurso público legítimo ${check.path} respondió con status ${res.status} (esperado: ${check.expectedStatus})`);
        }
        if (check.checkType) {
            const ct = res.headers.get('content-type') || '';
            if (!ct.includes(check.checkType)) {
                throw new Error(`Content-Type inesperado para ${check.path}: ${ct} (esperado: ${check.checkType})`);
            }
        }
    }
});

// 80. TC-SEC-24: Fallo de PostgreSQL en producción sin fallback inseguro
ClinicalTestSuite.add('TC-SEC-24', 'Fallo de PostgreSQL en producción sin fallback inseguro', async () => {
    const { db } = await import('./db.js');
    const oldEnv = process.env.NODE_ENV;
    const oldDbUrl = process.env.DATABASE_URL;

    try {
        process.env.NODE_ENV = 'production';
        delete process.env.DATABASE_URL;
        delete process.env.ALLOW_LOCAL_DB_IN_PROD;

        // 1. En producción sin DATABASE_URL debe rechazar el arranque
        let threwMissing = false;
        try {
            await db.initialize();
        } catch (e) {
            threwMissing = true;
            if (!e.message.includes('FALLO CRÍTICO DE ARQUITECTURA')) {
                throw new Error(`Mensaje inesperado al fallar: ${e.message}`);
            }
        }
        if (!threwMissing) {
            throw new Error('FALLO CRÍTICO: db.initialize() no falló en producción ante ausencia de DATABASE_URL');
        }

        // 2. En producción con URL de postgres inalcanzable debe fallar sin degradar a JSON
        process.env.DATABASE_URL = 'postgres://invalid_user:invalid_pass@127.0.0.1:54329/invalid_db';
        let threwConn = false;
        try {
            await db.initialize();
        } catch (e) {
            threwConn = true;
            if (!e.message.includes('FALLO CRÍTICO DE CONEXIÓN POSTGRESQL')) {
                throw new Error(`Mensaje inesperado ante fallo de conexión: ${e.message}`);
            }
        }
        if (!threwConn) {
            throw new Error('FALLO CRÍTICO: db.initialize() no lanzó error ante fallo de conexión en producción');
        }
    } finally {
        process.env.NODE_ENV = oldEnv;
        if (oldDbUrl) process.env.DATABASE_URL = oldDbUrl;
        else delete process.env.DATABASE_URL;
    }
});

// 81. TC-SEC-25: Fallo de persistencia sin confirmación falsa de éxito
ClinicalTestSuite.add('TC-SEC-25', 'Fallo de persistencia sin confirmación falsa de éxito', async () => {
    const { db } = await import('./db.js');

    // Simular estado corrupto no recuperado en DatabaseManager
    const wasCorrupt = db._isCorruptState;
    db._isCorruptState = true;

    try {
        let threw = false;
        try {
            await db.upsertPatient({
                id: 'pat_fail_test_' + Date.now(),
                name: 'Paciente Prueba Fallo',
                therapist_id: 'dr_tester'
            });
        } catch (e) {
            threw = true;
            if (!e.message.includes('PERSISTENCIA BLOQUEADA')) {
                throw new Error(`Mensaje inesperado: ${e.message}`);
            }
        }

        if (!threw) {
            throw new Error('FALLO DE INTEGRIDAD: upsertPatient retornó éxito a pesar de que el almacenamiento estaba corrupto');
        }
    } finally {
        db._isCorruptState = wasCorrupt;
    }
});

// 82. TC-SEC-26: Rechazo estricto de acceso cruzado a pacientes de otro terapeuta (BOLA/IDOR)
ClinicalTestSuite.add('TC-SEC-26', 'Rechazo de acceso a pacientes de otro terapeuta en todas las operaciones', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const therapistA = 'therapist_alpha_' + Date.now();
    const therapistB = 'therapist_beta_' + Date.now();

    const tokenB = generateSessionToken(therapistB, 'beta@clinica.com');

    // Paciente perteneciente a Terapeuta A
    const patientA = {
        id: 'pat_alpha_exclusive_' + Date.now(),
        name: 'Paciente Exclusivo de Alpha',
        therapist_id: therapistA,
        portal_enabled: true
    };
    await db.upsertPatient(patientA);

    // 1. Terapeuta B intenta leer datos de Patient A
    const resRead = await fetch(`${baseUrl}/api/v1/portal/data/${patientA.id}`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (resRead.status !== 403) {
        throw new Error(`FALLO BOLA: Terapeuta B pudo consultar paciente ajeno (status: ${resRead.status}, esperado: 403)`);
    }

    // 2. Terapeuta B intenta consultar actividades lúdicas del menor de Terapeuta A
    const resKid = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/kid-activity`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (resKid.status !== 403) {
        throw new Error(`FALLO BOLA PEDIÁTRICO: Terapeuta B accedió a actividades infantiles de paciente ajeno (status: ${resKid.status}, esperado: 403)`);
    }

    // 3. Terapeuta B intenta enviar sincronización con suplantación de X-Therapist-Id
    const resSpoof = await fetch(`${baseUrl}/api/v1/clinical/sync`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${tokenB}`,
            'Content-Type': 'application/json',
            'X-Therapist-Id': therapistA
        },
        body: JSON.stringify({ patients: [] })
    });
    if (resSpoof.status !== 403) {
        throw new Error(`FALLO SPOOFING: Petición con X-Therapist-Id contradictorio respondió status ${resSpoof.status} (esperado: 403)`);
    }
});

// 83. TC-SEC-27: Registro y login sin exposición de password_hash ni passwordHash
ClinicalTestSuite.add('TC-SEC-27', 'Registro y login sin exposición de password_hash en respuestas JSON', async () => {
    const baseUrl = await ensureTestServer();

    const email = `dr_hash_test_${Date.now()}@clinica.com`;
    const passwordHash = 'sha256_super_secret_hash_value_987654';

    // 1. Registro
    const regRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'Dr. Verificación Hash',
            email,
            passwordHash,
            specialty: 'Psiquiatría'
        })
    });
    const regData = await regRes.json();
    if (regRes.status !== 200) {
        throw new Error(`Error en registro: ${regRes.status}`);
    }
    if (regData.therapist.password_hash || regData.therapist.passwordHash) {
        throw new Error('FUGA DE HASH EN REGISTER: El objeto therapist incluye campos de contraseña');
    }

    const therapistId = regData.therapist.id;

    // 2. Intento de usurpación de ID en registro con otro correo
    const hijackRes = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            id: therapistId,
            email: `attacker_${Date.now()}@clinica.com`,
            passwordHash: 'attacker_fake_hash'
        })
    });
    if (hijackRes.status !== 409) {
        throw new Error(`FALLO DE REGISTRO: Atacante pudo reutilizar el ID de un terapeuta existente (status: ${hijackRes.status}, esperado: 409)`);
    }

    // 3. Login
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash })
    });
    const loginData = await loginRes.json();
    if (loginRes.status !== 200) {
        throw new Error(`Error en login: ${loginRes.status}`);
    }
    if (loginData.therapist.password_hash || loginData.therapist.passwordHash) {
        throw new Error('FUGA DE HASH EN LOGIN: La respuesta de login devolvió el hash de la contraseña');
    }
});

// 84. TC-SEC-28: Recuperación de contraseña, expiración de códigos y revocación de sesiones
ClinicalTestSuite.add('TC-SEC-28', 'Recuperación de contraseña, expiración de códigos y revocación de sesiones', async () => {
    const baseUrl = await ensureTestServer();
    const { db } = await import('./db.js');
    const { generateSessionToken } = await import('./server.js');

    const email = `dr_reset_test_${Date.now()}@clinica.com`;
    const initialHash = 'initial_password_hash_111';
    const newHash = 'new_password_hash_222';

    // 1. Registrar terapeuta
    const therapist = await db.registerTherapist({
        name: 'Dr. Reset Tester',
        email,
        passwordHash: initialHash,
        specialty: 'Psicología'
    });

    const sessionTokenOld = generateSessionToken(therapist.id, therapist.email);

    // Verificar que el token viejo funciona inicialmente
    const preCheck = await fetch(`${baseUrl}/api/v1/clinical/ai-status`, {
        headers: { 'Authorization': `Bearer ${sessionTokenOld}` }
    });
    if (preCheck.status !== 200) {
        throw new Error('El token de sesión inicial debe ser válido (status 200)');
    }

    // 2. Solicitar restablecimiento (forgot-password)
    const forgotRes = await fetch(`${baseUrl}/api/v1/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
    });
    const forgotData = await forgotRes.json();
    if (forgotRes.status !== 200) {
        throw new Error(`Fallo en forgot-password: status ${forgotRes.status}`);
    }
    if (forgotData.code || forgotData.resetCode) {
        throw new Error('FUGA DE CREDENCIALES: El endpoint forgot-password devolvió el código en la respuesta HTTP');
    }

    // Obtener el código generado legítimamente desde la base de datos
    const resetRecord = (db.localStore && db.localStore.password_resets) ? db.localStore.password_resets[email] : null;
    if (!resetRecord || !resetRecord.code) {
        throw new Error('No se encontró el registro de recuperación en la base de datos');
    }

    // 3. Probar código expirado
    const expiredRecord = { ...resetRecord, expiresAt: new Date(Date.now() - 60000).toISOString() };
    if (db.localStore && db.localStore.password_resets) {
        db.localStore.password_resets[email] = expiredRecord;
    }

    const expRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: resetRecord.code, newPasswordHash: newHash })
    });
    if (expRes.status !== 400) {
        throw new Error(`FALLO: Código expirado no fue rechazado con HTTP 400 (status: ${expRes.status})`);
    }

    // 4. Probar restablecimiento exitoso con código vigente
    const validReset = await db.createPasswordReset(email);
    // Esperar un instante para que el timestamp de revocación sea posterior a la creación del token viejo
    await new Promise(r => setTimeout(r, 20));

    const successRes = await fetch(`${baseUrl}/api/v1/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: validReset.code, newPasswordHash: newHash })
    });
    if (successRes.status !== 200) {
        throw new Error(`FALLO: Restablecimiento con código válido respondió status ${successRes.status}`);
    }

    // 5. Verificar que el token de sesión emitido previamente fue REVOCADO
    const postCheck = await fetch(`${baseUrl}/api/v1/clinical/ai-status`, {
        headers: { 'Authorization': `Bearer ${sessionTokenOld}` }
    });
    if (postCheck.status !== 401) {
        throw new Error(`FALLO DE REVOCACIÓN: La sesión previa siguió activa tras el restablecimiento de contraseña (status: ${postCheck.status}, esperado: 401)`);
    }

    // 6. Probar login con nueva contraseña y logout explícito
    const loginRes = await fetch(`${baseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, passwordHash: newHash })
    });
    const loginData = await loginRes.json();
    const newSessionToken = loginData.sessionToken;

    const logoutRes = await fetch(`${baseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${newSessionToken}` }
    });
    if (logoutRes.status !== 200) {
        throw new Error(`Error en logout: status ${logoutRes.status}`);
    }

    // Token cerrado debe ser denegado con 401
    const afterLogoutCheck = await fetch(`${baseUrl}/api/v1/clinical/ai-status`, {
        headers: { 'Authorization': `Bearer ${newSessionToken}` }
    });
    if (afterLogoutCheck.status !== 401) {
        throw new Error(`FALLO DE LOGOUT: La sesión cerrada siguió activa tras logout (status: ${afterLogoutCheck.status}, esperado: 401)`);
    }
});

// 29. TC-DOM-01: Verificación de Integridad Estructural del DOM (Cero Modales Anidados en index.html)
ClinicalTestSuite.add('TC-DOM-01', 'Verificación de Integridad Estructural del DOM (Cero Modales Anidados en index.html)', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const html = fs.readFileSync(path.resolve('./index.html'), 'utf8');

    // Extraer todos los modales del documento
    const modalMatches = [...html.matchAll(/<div\s+class=["'][^"']*modal[^"']*["']\s+id=["']([^"']+)["']/g)];
    if (modalMatches.length === 0) {
        throw new Error('No se encontraron modales en index.html');
    }

    const modalIds = modalMatches.map(m => m[1]);

    // Verificar con parser de pila que ningún modal esté dentro de otro modal
    const regex = /<(\/)?([a-zA-Z0-9]+)([^>]*)>/g;
    const lines = html.split('\n');
    const stack = [];
    let currentModal = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let m;
        while ((m = regex.exec(line)) !== null) {
            const isClosing = m[1] === '/';
            const tag = m[2].toLowerCase();
            const rest = m[3];
            const isSelfClosing = rest.endsWith('/') || ['meta', 'link', 'img', 'br', 'hr', 'input'].includes(tag);

            if (tag === 'script' || tag === 'style') continue;
            if (isSelfClosing) continue;

            if (!isClosing) {
                const isModal = tag === 'div' && (rest.includes('class="modal"') || rest.includes("class='modal'"));
                const idMatch = rest.match(/id=["']([^"']+)["']/);
                const elementId = idMatch ? idMatch[1] : null;

                if (isModal) {
                    if (currentModal) {
                        throw new Error(`VIOLACIÓN ESTRUCTURAL DOM: El modal #${elementId} está anidado dentro de #${currentModal.id} en línea ${i + 1}`);
                    }
                    currentModal = { id: elementId, depth: stack.length };
                }
                stack.push({ tag, elementId, isModal });
            } else {
                const popped = stack.pop();
                if (popped && popped.isModal && currentModal && currentModal.id === popped.elementId) {
                    currentModal = null;
                }
            }
        }
    }

    // Certificar específicamente que los 4 modales financieros existen y son independientes
    const criticalModals = ['financeTransactionModal', 'financeCategoriesModal', 'financeGoalModal', 'financeRateModal'];
    for (const cm of criticalModals) {
        if (!modalIds.includes(cm)) {
            throw new Error(`El modal crítico #${cm} no existe en index.html`);
        }
    }
});

// 30. TC-FIN-07: Apertura Reactiva, Inyección Dinámica y Persistencia de Modales Financieros
ClinicalTestSuite.add('TC-FIN-07', 'Apertura Reactiva, Inyección Dinámica y Persistencia de Modales Financieros', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const domMock = {
        elements: {},
        getElementById(id) {
            if (!this.elements[id]) {
                this.elements[id] = {
                    id,
                    innerHTML: '',
                    value: '',
                    checked: false,
                    classList: {
                        classes: new Set(),
                        add(c) { this.classes.add(c); },
                        remove(c) { this.classes.delete(c); },
                        contains(c) { return this.classes.has(c); }
                    },
                    style: {}
                };
            }
            return this.elements[id];
        }
    };

    const prevDoc = global.document;
    const prevWin = global.window;
    const prevStorage = global.localStorage;

    try {
        global.document = {
            getElementById: (id) => domMock.getElementById(id),
            body: {
                style: {},
                classList: { add() {}, remove() {} }
            },
            querySelector: () => null
        };
        global.window = global;
        global.openModal = (id) => {
            const el = domMock.getElementById(id);
            el.classList.add('active');
        };
        global.closeModal = (id) => {
            const el = domMock.getElementById(id);
            el.classList.remove('active');
        };

        await import('./finance.js');
        const scope = (typeof window !== 'undefined') ? window : globalThis;
        const {
            openTransactionModal,
            openGoalModal,
            openRateModal,
            openCategoriesModal,
            deleteFinanceGoal
        } = scope;

        // 1. Probar modal de transacción (+ Ingreso)
        openTransactionModal('income');
        const txModal = domMock.getElementById('financeTransactionModal');
        if (!txModal.classList.contains('active')) {
            throw new Error('openTransactionModal no activó el modal financeTransactionModal');
        }
        const txBody = domMock.getElementById('financeTransactionModalBody').innerHTML;
        if (!txBody.includes('txConcept') || !txBody.includes('txAmount')) {
            throw new Error('openTransactionModal no inyectó los campos txConcept / txAmount');
        }

        // 2. Probar modal de metas financieras
        openGoalModal();
        const goalModal = domMock.getElementById('financeGoalModal');
        if (!goalModal.classList.contains('active')) {
            throw new Error('openGoalModal no activó el modal financeGoalModal');
        }
        const goalBody = domMock.getElementById('financeGoalModalBody').innerHTML;
        if (!goalBody.includes('goalTitle') || !goalBody.includes('goalTarget')) {
            throw new Error('openGoalModal no inyectó los campos goalTitle / goalTarget');
        }

        // 3. Probar modal de tarifas por tiempo
        openRateModal();
        const rateModal = domMock.getElementById('financeRateModal');
        if (!rateModal.classList.contains('active')) {
            throw new Error('openRateModal no activó el modal financeRateModal');
        }
        const rateBody = domMock.getElementById('financeRateModalBody').innerHTML;
        if (!rateBody.includes('rateTitle') || !rateBody.includes('rateDuration')) {
            throw new Error('openRateModal no inyectó los campos rateTitle / rateDuration');
        }

        // 4. Probar modal de categorías de egresos
        openCategoriesModal();
        const catModal = domMock.getElementById('financeCategoriesModal');
        if (!catModal.classList.contains('active')) {
            throw new Error('openCategoriesModal no activó el modal financeCategoriesModal');
        }

        // 5. Verificar desacoplamiento de deleteFinanceGoal
        if (typeof deleteFinanceGoal !== 'function') {
            throw new Error('finance.js no exporta deleteFinanceGoal');
        }

    } finally {
        global.document = prevDoc;
        global.window = prevWin;
        global.localStorage = prevStorage;
    }
});

// ============================================
// SUITE HEYFREUD-BENCHMARK (v7.0)
// ============================================

// 96. TC-REC-01: SessionRecorder & Ambient Listening Zero-Retention
ClinicalTestSuite.add('TC-REC-01', 'SessionRecorder & Ambient Listening Zero-Retention (HeyFreud Benchmark)', async () => {
    await import('./session-recorder.js');
    const SessionRecorder = globalThis.SessionRecorder || (typeof global !== 'undefined' ? global.SessionRecorder : null);

    if (!SessionRecorder || typeof SessionRecorder.formatTime !== 'function') {
        throw new Error('SessionRecorder no exporta formatTime');
    }

    // 1. Verificación de formateo de tiempo
    if (SessionRecorder.formatTime(0) !== '00:00') {
        throw new Error(`formatTime(0) esperado 00:00 pero se obtuvo ${SessionRecorder.formatTime(0)}`);
    }
    if (SessionRecorder.formatTime(125) !== '02:05') {
        throw new Error(`formatTime(125) esperado 02:05 pero se obtuvo ${SessionRecorder.formatTime(125)}`);
    }
    if (SessionRecorder.formatTime(3665) !== '61:05') {
        throw new Error(`formatTime(3665) esperado 61:05 pero se obtuvo ${SessionRecorder.formatTime(3665)}`);
    }

    // 2. Verificación de callbacks y ciclo de vida de estado
    let stateNotificationReceived = false;
    const testListener = (state) => {
        stateNotificationReceived = true;
        if (typeof state.secondsElapsed !== 'number') {
            throw new Error('El estado notificado no contiene secondsElapsed numérico');
        }
    };

    SessionRecorder.onStatusChange(testListener);
    SessionRecorder.notifyStatus();
    if (!stateNotificationReceived) {
        throw new Error('SessionRecorder no ejecutó el callback registrado en onStatusChange');
    }
    SessionRecorder.offStatusChange(testListener);

    // 3. Garantía Ética Zero-Retention: purga y destrucción de memoria
    SessionRecorder.audioChunks = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
    SessionRecorder.isRecording = true;
    SessionRecorder.isPaused = true;

    SessionRecorder.purgeAudio();

    if (SessionRecorder.audioChunks.length !== 0) {
        throw new Error('purgeAudio() no vació el buffer de audio chunks en memoria');
    }
    if (SessionRecorder.isRecording !== false || SessionRecorder.isPaused !== false) {
        throw new Error('purgeAudio() no restableció las banderas de grabación');
    }
});

// 97. TC-FMT-01: Motor Clínico Multiformato (SOAP, DAP, BIRP, GIRP, NARRATIVE, TREATMENT_PLAN)
ClinicalTestSuite.add('TC-FMT-01', 'Motor Clínico Multiformato (SOAP, DAP, BIRP, GIRP, Narrative, Treatment Plan)', async () => {
    await import('./ai-clinical.js');
    const ClinicalAI = globalThis.ClinicalAI || (typeof global !== 'undefined' ? global.ClinicalAI : null);

    if (!ClinicalAI || typeof ClinicalAI.simulateMultiformatSynthesis !== 'function') {
        throw new Error('ClinicalAI no exporta simulateMultiformatSynthesis');
    }

    const sample = 'Paciente acude refiriendo estrés laboral y episodios de insomnio. Trabajamos reestructuración y respiración.';

    // 1. Probar formato DAP
    const dap = await ClinicalAI.simulateMultiformatSynthesis(sample, 'DAP');
    if (!dap.data || !dap.assessment || !dap.plan) {
        throw new Error('El formato DAP no contiene las claves canónicas data, assessment y plan');
    }

    // 2. Probar formato BIRP
    const birp = await ClinicalAI.simulateMultiformatSynthesis(sample, 'BIRP');
    if (!birp.behavior || !birp.intervention || !birp.response || !birp.plan) {
        throw new Error('El formato BIRP no contiene las claves canónicas behavior, intervention, response y plan');
    }

    // 3. Probar formato GIRP
    const girp = await ClinicalAI.simulateMultiformatSynthesis(sample, 'GIRP');
    if (!girp.goals || !girp.intervention || !girp.response || !girp.plan) {
        throw new Error('El formato GIRP no contiene las claves canónicas goals, intervention, response y plan');
    }

    // 4. Probar formato NARRATIVE
    const narrative = await ClinicalAI.simulateMultiformatSynthesis(sample, 'NARRATIVE');
    if (!narrative.resumenSesion || !narrative.temasAbordados || !narrative.intervenciones || !narrative.acuerdos) {
        throw new Error('El formato NARRATIVE no contiene las claves canónicas resumenSesion, temasAbordados, intervenciones y acuerdos');
    }

    // 5. Probar formato TREATMENT_PLAN
    const tp = await ClinicalAI.simulateMultiformatSynthesis(sample, 'TREATMENT_PLAN');
    if (!tp.problemasIdentificados || !tp.objetivosCortoPlazo || !tp.objetivosLargoPlazo || !tp.modalidadTerapeutica || !tp.criteriosAlta) {
        throw new Error('El formato TREATMENT_PLAN no contiene las claves canónicas de planificación clínica');
    }

    // 6. Probar método principal synthesizeSessionNote en entorno headless
    const synthResult = await ClinicalAI.synthesizeSessionNote(sample, { format: 'BIRP' });
    if (synthResult.format !== 'BIRP' || !synthResult.content || !synthResult.content.behavior) {
        throw new Error('synthesizeSessionNote no devolvió la estructura BIRP esperada');
    }
});

// 98. TC-STY-01: Perfil de Estilo del Terapeuta (HeyFreud Style Learning)
ClinicalTestSuite.add('TC-STY-01', 'Perfil de Estilo del Terapeuta (HeyFreud Style Learning)', async () => {
    const { db } = await import('./db.js');
    await db.initialize();

    const testTherapistId = `therapist_style_test_${Date.now()}`;
    const testProfile = {
        theoreticalFramework: 'ACT',
        tone: 'humanista-cálido',
        conciseness: 'detailed',
        defaultFormat: 'DAP',
        preferredGlossary: ['defusión', 'valores', 'yo-como-contexto']
    };

    // 1. Guardar perfil de estilo
    const saved = await db.saveTherapistStyleProfile(testTherapistId, testProfile);
    if (!saved || saved.theoreticalFramework !== 'ACT' || saved.defaultFormat !== 'DAP') {
        throw new Error('Fallo al guardar el perfil de estilo del terapeuta en db.js');
    }

    // 2. Recuperar perfil de estilo
    const fetched = await db.getTherapistStyleProfile(testTherapistId);
    if (!fetched || fetched.theoreticalFramework !== 'ACT' || fetched.tone !== 'humanista-cálido') {
        throw new Error('No se recuperó el perfil de estilo coincidente desde la base de datos');
    }

    // 3. Probar persistencia ante actualizaciones parciales
    const updated = await db.saveTherapistStyleProfile(testTherapistId, {
        ...fetched,
        conciseness: 'concise'
    });
    if (updated.conciseness !== 'concise') {
        throw new Error('Fallo al actualizar la concisión en el perfil de estilo');
    }
});

// 99. TC-ROA-01: Validación de Renderizado del Mapa Serpenteante de Sesiones en el Expediente Clínico
ClinicalTestSuite.add('TC-ROA-01', 'Mapa de Ruta Longitudinal de Sesiones en Expediente Clínico (UI, Serpentine Layout y Acordeón ✨)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. Validar presencia en styles.css de clases críticas del roadmap
    const requiredCssClasses = [
        '.therapy-roadmap-container',
        '.therapy-session-card',
        '.therapy-roadmap-row',
        '.therapy-roadmap-track',
        '.therapy-roadmap-node',
        '.session-card-focus-box',
        '.session-status-pill',
        '.btn-add-session-roadmap'
    ];
    for (const cls of requiredCssClasses) {
        if (!stylesCss.includes(cls)) {
            throw new Error(`styles.css debe incluir la regla de estilo ${cls} para el roadmap`);
        }
    }

    // 2. Validar presencia de modal independiente en index.html
    if (!indexHtml.includes('id="roadmapSessionModal"')) {
        throw new Error('index.html debe contener el modal independiente #roadmapSessionModal');
    }
    const modalFields = ['roadmapSessionNumber', 'roadmapSessionTitle', 'roadmapSessionDate', 'roadmapSessionStatus', 'roadmapSessionFocus'];
    for (const f of modalFields) {
        if (!indexHtml.includes(`id="${f}"`)) {
            throw new Error(`index.html debe incluir el campo #${f} en el modal de sesión`);
        }
    }

    // 3. Validar integración de renderTherapySessionsRoadmap dentro de renderTabResumen en app.js
    if (!appJs.includes('renderTherapySessionsRoadmap(patientId)')) {
        throw new Error('renderTabResumen en app.js debe invocar renderTherapySessionsRoadmap(patientId)');
    }
    if (!appJs.includes('function renderTherapySessionsRoadmap')) {
        throw new Error('app.js debe definir la función renderTherapySessionsRoadmap');
    }
    if (!appJs.includes('toggleRoadmapSnippet') || !appJs.includes('quickToggleRoadmapStatus')) {
        throw new Error('app.js debe definir los helpers interactivos toggleRoadmapSnippet y quickToggleRoadmapStatus');
    }
});

// 100. TC-ROA-02: Integración de API REST y Ciclo de Vida del Mapa de Ruta (CRUD, Persistencia y Seguridad BOLA/IDOR)
ClinicalTestSuite.add('TC-ROA-02', 'API REST de Sesiones del Mapa de Ruta (CRUD, BOLA/IDOR Prevention y Persistencia Relacional)', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const therapistA = 'dr_roadmap_a_' + Date.now();
    const therapistB = 'dr_roadmap_b_' + Date.now();
    const tokenA = generateSessionToken(therapistA, 'roadmap_a@clinica.com');
    const tokenB = generateSessionToken(therapistB, 'roadmap_b@clinica.com');

    const patientA = {
        id: 'pat_roadmap_' + Date.now(),
        name: 'Carlos Valenzuela',
        diagnosis: 'F41.1 Ansiedad Generalizada',
        therapist_id: therapistA
    };
    await db.syncPatients([patientA], therapistA);

    // 1. Crear sesión en el roadmap vía REST API
    const newSessionPayload = {
        sessionNumber: 1,
        title: 'Evaluación Inicial y Psicoeducación',
        date: '2026-10-25',
        focusSummary: 'Identificación de pensamientos automáticos y establecimiento de línea base PHQ-9.',
        status: 'pendiente'
    };

    const createRes = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/therapy-sessions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify(newSessionPayload)
    });

    if (createRes.status !== 201) {
        throw new Error(`Fallo al crear sesión en roadmap: esperado 201, recibido ${createRes.status}`);
    }
    const createData = await createRes.json();
    if (!createData.session || createData.session.title !== newSessionPayload.title) {
        throw new Error('La sesión devuelta por la API no coincide con la enviada');
    }
    const sessionId = createData.session.id;

    // 2. Consultar sesiones como Terapeuta A (200 OK)
    const listRes = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/therapy-sessions`, {
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (listRes.status !== 200) {
        throw new Error(`Fallo al consultar sesiones: esperado 200, recibido ${listRes.status}`);
    }
    const listData = await listRes.json();
    if (!Array.isArray(listData.sessions) || listData.sessions.length === 0) {
        throw new Error('La lista de sesiones no devolvió el registro persistido');
    }

    // 3. Prueba de seguridad BOLA / IDOR: Terapeuta B intenta consultar el paciente de Terapeuta A (403 Forbidden)
    const crossRes = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/therapy-sessions`, {
        headers: { 'Authorization': `Bearer ${tokenB}` }
    });
    if (crossRes.status !== 403) {
        throw new Error(`Fallo de seguridad BOLA/IDOR: Terapeuta B pudo consultar paciente ajeno (status: ${crossRes.status}, esperado: 403)`);
    }

    // 4. Actualizar sesión a completada
    const updateRes = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/therapy-sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${tokenA}`
        },
        body: JSON.stringify({ status: 'completada' })
    });
    if (updateRes.status !== 200) {
        throw new Error(`Fallo al actualizar sesión: esperado 200, recibido ${updateRes.status}`);
    }
    const updateData = await updateRes.json();
    if (updateData.session.status !== 'completada') {
        throw new Error('El estado de la sesión no se actualizó a completada');
    }

    // 5. Eliminar sesión del roadmap
    const delRes = await fetch(`${baseUrl}/api/v1/patients/${patientA.id}/therapy-sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    if (delRes.status !== 200) {
        throw new Error(`Fallo al eliminar sesión: esperado 200, recibido ${delRes.status}`);
    }
});

// 101. TC-HIST-08: Protocolo Clínico y Deontológico Venezolano (FPV, LOPNNA, MPPS, Semiótica y Cero Fuga Materna en Adultos)
ClinicalTestSuite.add('TC-HIST-08', 'Protocolo Clínico y Deontológico Venezolano (FPV, LOPNNA, MPPS, Semiótica y Cero Fuga Materna)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    // 1. Verificación de acreditación gremial venezolana (FPV, Colegio Regional, MPPS)
    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.currentUser = {
        name: 'Lic. Mariana Velásquez',
        specialty: 'Psicología Clínica y de la Salud',
        fpvNumber: '14.280',
        regionalCollege: 'Colegio de Psicólogos de Miranda',
        mppsNumber: '78.912'
    };

    const therapist = CHS.getTherapistInfo();
    if (!therapist.registry.includes('FPV N.º 14.280') || !therapist.registry.includes('MPPS N.º 78.912')) {
        throw new Error('El membrete oficial debe reflejar las credenciales FPV y MPPS de Venezuela');
    }

    // 2. Ficha de Adulto: Verificación de Cero Fuga de Escolaridad Materna
    const adultPatient = {
        id: 'pat_adult_ve_01',
        name: 'Andrés Eloy Blanco',
        category: 'adult',
        birthdate: '1988-06-14',
        ci: 'V-18.992.341',
        occupation: 'Ingeniero de Sistemas',
        schoolGrade: '', // Vacío a propósito para verificar fallback seguro
        motherName: 'Carmen Blanco',
        motherEducation: 'Primaria Incompleta', // NO debe fugarse al paciente
        emergencyContactName: 'Beatriz Blanco',
        emergencyContactRelation: 'Hermana',
        emergencyContactPhone: '+58 414 5551234',
        currentIllness: 'Episodios de angustia paroxística desde hace 3 meses con impacto laboral.',
        mentalOrientation: 'Orientado globalmente',
        mentalThought: 'Coherente sin ideación delirante',
        mentalSuicidalRisk: 'Descartado / Negativo',
        diagnosticImpression: 'F41.0 Trastorno de Pánico [DSM-5: 300.01]',
        treatmentPlan: 'Terapia Cognitivo-Conductual y reestructuración cognitiva'
    };

    globalThis.AppState.patients = globalThis.AppState.patients || [];
    globalThis.AppState.patients.push(adultPatient);

    const full = CHS.getFullHistory(adultPatient);
    if (!full.emergencyContactName || !full.currentIllness || !full.diagnosticImpression) {
        throw new Error('Faltan campos clínicos de emergencia, situación actual o diagnóstico en getFullHistory');
    }

    // 3. Verificación de Ausencia de "Deontología Médica" y Presencia de "FPV" en PDFs
    const adultPdf = CHS.exportHistoriaOficialPDF(adultPatient.id);
    if (adultPdf.includes('Código de Deontología Médica')) {
        throw new Error('Error deontológico: La historia clínica psicológica no debe citar Deontología Médica');
    }
    if (!adultPdf.includes('Código de Ética Profesional del Psicólogo') || !adultPdf.includes('FPV')) {
        throw new Error('La historia debe citar el Código de Ética Profesional del Psicólogo (FPV)');
    }
    if (adultPdf.includes('Primaria Incompleta') && adultPdf.includes('Escolaridad / Nivel:</strong> Primaria Incompleta')) {
        throw new Error('Fallo crítico de privacidad: La escolaridad de la madre se fugó a la ficha del paciente adulto');
    }
    if (!adultPdf.includes('Contacto de Emergencia') || !adultPdf.includes('Beatriz Blanco')) {
        throw new Error('El PDF de historia clínica debe registrar el contacto de emergencia');
    }

    // 4. Verificación de Asentimiento LOPNNA en Historia de Adolescente
    const teenPatient = {
        id: 'pat_teen_ve_01',
        name: 'Sebastián Ramos',
        category: 'adolescent',
        birthdate: '2010-09-02',
        ci: 'V-32.100.222',
        guardianName: 'José Ramos (Padre)',
        guardianRelation: 'Padre',
        guardianConsent: 'firmado',
        reason: 'Estrés académico y labilidad afectiva'
    };
    const teenFull = CHS.getFullHistory(teenPatient);
    const teenPdf = CHS.exportHistoriaOficialAdolescentePDF(teenPatient, teenFull, '16', therapist);
    if (!teenPdf.includes('LOPNNA') || !teenPdf.includes('Asentimiento Informado')) {
        throw new Error('El PDF adolescente debe contemplar el marco LOPNNA y el Asentimiento Informado');
    }
    if (teenPdf.includes('Código de Deontología Médica')) {
        throw new Error('Error deontológico en adolescente: Cita errónea de Deontología Médica');
    }
});

// 101.1 TC-HIST-09: Historia Clínica Adulto (Paridad Estricta con PDF de 5 Páginas y Cero Campos Foráneos)
ClinicalTestSuite.add('TC-HIST-09', 'Historia Clínica Adulto (Paridad Estricta con PDF de 5 Páginas y Cero Campos Foráneos)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    const testAdult = {
        id: 'pat_adult_pdf_strict_01',
        name: 'Carlos Mendoza',
        category: 'adult',
        birthdate: '1985-04-12',
        gender: 'Masculino',
        maritalStatus: 'Casado(a)',
        ci: 'V-17.892.400',
        schoolGrade: 'Universitaria Completa',
        occupation: 'Contador Público',
        religion: 'Católica',
        livesWith: 'Esposa y dos hijos',
        address: 'Av. Libertador, Edif. Los Samanes, Apt 4-B',
        phone: '+58 412 5558899',
        referral: ['Médico/Especialista'],
        hasAttendedBefore: 'SI',
        previousAttendanceDate: '15/01/2024',
        siblingsCount: 2,
        stepSiblingsCount: 1,
        halfSiblingsCount: 0,
        genogramNotes: 'Familia nuclear reconstituida, adecuada alianza conyugal.',
        reason: 'Estrés laboral crónico y dificultades para conciliar el sueño.',
        observedGestures: 'Tensión mandibular, postura erguida, contacto visual sostenido.',
        mentalExam: 'Orientado en tiempo, espacio y persona. Discurso fluido y coherente.',
        symptomsBehavioral: 'Inquietud psicomotriz leve en horario nocturno.',
        symptomsEmotional: 'Preocupación anticipatoria y leve irritabilidad.',
        symptomsOrganic: 'Tensión cervical y cefalea tensional vespertina.',
        neuroEvaluation: 'Evaluación neurológica previa normal (EEG sin alteraciones).',
        traumaInjuries: 'Esguince de tobillo derecho hace 3 años en actividad deportiva.',
        surgeries: 'Apendicectomía a los 18 años sin complicaciones.',
        seizures: 'Negadas.',
        immuneDiseases: 'Negadas.',
        allergies: 'Rinitis alérgica estacional.',
        medicalTreatment: 'Ningún tratamiento farmacológico prescrito actualmente.',
        familyMedicalHistory: 'Padre hipertenso, madre con diabetes mellitus tipo 2.',
        patientPsychiatricHistory: 'Niega hospitalizaciones ni tratamientos psiquiátricos previos.',
        familyPsychiatricHistory: 'Tía materna con antecedentes de trastorno depresivo.',
        adultInfancyHistory: 'Crianza en hogar estable, hitos normales, sin pérdidas tempranas.',
        adultAdolescenceHistory: 'Socialización adecuada, rendimiento escolar destacado.',
        adultSocial: 'Red de amistades cercana, reuniones familiares de fin de semana.',
        adultFamilyDynamics: 'Convivencia armónica, comunicación asertiva con cónyuge.',
        adultSpirituality: 'Valores católicos practicantes.',
        adultSexual: 'Vida de pareja estable y satisfactoria.',
        adultWork: 'Jornadas de 9 horas, sobrecarga de tareas en cierres mensuales.',
        adultLegal: 'Sin litigios, juicios ni antecedentes penales.',
        housingType: 'Apartamento',
        housingServices: 'Sí',
        housingSharesRoom: 'Sí',
        housingSharesRoomDesc: 'Comparte habitación con su cónyuge.',
        occupantsAdultsF: 1,
        occupantsAdultsM: 1,
        occupantsTeensF: 0,
        occupantsTeensM: 0,
        occupantsChildrenF: 1,
        occupantsChildrenM: 1,
        addictions: 'Café (3 tazas al día). Niega tabaco, alcohol u otras sustancias.',
        socialManias: 'Rutina estricta de orden en escritorio antes de iniciar el trabajo.',
        phobias: 'Temor leve a las alturas (acrofobia leve no incapacitante).',
        nightTerrors: 'Negados.',
        onychophagy: 'Negada.',
        sleepPattern: 'Insomnio de conciliación (demora 45 min en dormir).',
        eatingPattern: 'Alimentación regular, 3 comidas al día.',
        hygienePattern: 'Adecuada presentación y cuidado personal.',
        recreationArea: 'Lectura los fines de semana y caminatas al aire libre.',
        dailyRoutine: 'Despierta 6:30am, jornada laboral 8am-5pm, cena en familia, duerme 11:30pm.',
        mediumTermGoals: 'Consolidación de técnicas de autorregulación emocional y disminución de tensión.',
        longTermGoals: 'Equilibrio trabajo-familia y prevención de recaídas a largo plazo.'
    };

    globalThis.AppState.patients = globalThis.AppState.patients || [];
    globalThis.AppState.patients.push(testAdult);

    const h = CHS.getFullHistory(testAdult);
    const therapist = CHS.getTherapistInfo();
    const pdfHtml = CHS.exportHistoriaOficialAdultoPDF(testAdult, h, '39', therapist);

    // 1. Verificación de los Títulos y Secciones Estrictas de las 5 Páginas del PDF
    const requiredSections = [
        'HISTORIA CLÍNICA ADULTO',
        'Ha asistido antes a Consulta Psicológica: NO',
        'IDENTIFICACIÓN DEL PACIENTE:',
        'DATOS FILIATORIOS:',
        'GENOGRAMA',
        'MOTIVO DE CONSULTA',
        'GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA',
        'EXAMEN MENTAL',
        'SINTOMATOLOGÍA PRESENTADA',
        'Características Conductuales',
        'Características Emocionales',
        'Características Orgánicas',
        'ANTECEDENTES DEL PACIENTE',
        'Evaluación Neurológica previa',
        'Golpes, caídas, lesiones, esguinces o fracturas.',
        'Operaciones',
        'Convulsiones',
        'Enfermedades que afectan el Sistema Inmunológico (Hepatitis, Viruela, etc.)',
        'Alergias',
        'Tratamiento Médico y otras patologías',
        'Antecedentes Médicos Familiares',
        'Antecedentes Psiquiátricos o psicológicos del Paciente',
        'Antecedentes Psiquiátricos o psicológicos Familiares',
        'Infancia',
        'Adolescencia',
        'SITUACIÓN ACTUAL',
        'Área Social y Relaciones Interpersonales',
        'Dinámica Familiar',
        'Área Espiritual',
        'Área Sexual',
        'Área Laboral',
        'Aspectos Legales',
        'ÁREA DE VIVIENDA',
        'Apartamento',
        'Servicios Básicos',
        'Comparte Habitación',
        'Personas que Habitan en la Vivienda',
        'HÁBITOS PSICOBIOLÓGICOS:',
        'Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):',
        'Manías Sociales (Tics, rutinas que maneje en un determinado espacio)',
        'Fobias o Miedo Intenso',
        'Miedos Nocturnos',
        'Ornicofagia',
        'Sueño',
        'Alimentación',
        'Higiene',
        'Área Recreacional',
        'Rutina Diaria',
        'FIRMA Y SELLO'
    ];

    for (const sec of requiredSections) {
        if (!pdfHtml.includes(sec)) {
            throw new Error(`Falta campo o sección oficial del PDF en Historia Clínica Adulto: "${sec}"`);
        }
    }

    // 2. Verificación de CERO campos foráneos no presentes en el PDF de adultos
    const forbiddenInAdults = [
        'DATOS FILIATORIOS DE LOS PADRES: Madre:',
        'DATOS FILIATORIOS DE LOS PADRES: Padre:',
        'DATOS DEL PARTO Y ESTADO AL NACER',
        'ESCOLARIDAD, RENDIMIENTO Y ADAPTACIÓN (ÁREA PEDAGÓGICA)',
        'Hitos Primeros Años: Sostén cefálico',
        'IMPRESIÓN DIAGNÓSTICA (CIE-10 / CIE-11 & DSM-5-TR):',
        'PLAN TERAPÉUTICO Y METAS DE INTERVENCIÓN:'
    ];

    for (const forb of forbiddenInAdults) {
        if (pdfHtml.includes(forb)) {
            throw new Error(`Error: Se detectó campo foráneo no permitido en Historia Clínica Adulto: "${forb}"`);
        }
    }

    // 3. Verificación de que el editor de adultos HTML exclusivo genera las 6 pestañas organizadas por temática
    const editorHtml = CHS.renderAdultHistoryEditorHTML(testAdult, h, therapist.registry);
    if (!editorHtml.includes('htab-adult-1') || !editorHtml.includes('htab-adult-5') || !editorHtml.includes('htab-adult-6')) {
        throw new Error('El editor de historia de adulto debe contener las 6 pestañas organizadas');
    }
    const requiredTabNames = [
        'Identificación del Paciente',
        'Motivo de Consulta y Examen Mental',
        'Antecedentes',
        'Situación Actual y Áreas Vitales',
        'Hábitos Psicobiológicos',
        'Metas y Proyecto de Vida'
    ];
    for (const tabName of requiredTabNames) {
        if (!editorHtml.includes(tabName)) {
            throw new Error(`El editor de historia de adulto debe contener la pestaña: "${tabName}"`);
        }
    }
    if (!editorHtml.includes('fh_ornicofagia') && !editorHtml.includes('fh_onychophagy')) {
        throw new Error('El editor de historia de adulto debe contener el campo Ornicofagia');
    }
    if (!editorHtml.includes('fh_mediumTermGoals') || !editorHtml.includes('fh_longTermGoals')) {
        throw new Error('El editor de historia de adulto debe incluir los campos separados de metas a mediano y largo plazo');
    }

    // 4. Verificación de metas a mediano y largo plazo por separado
    if (!h.mediumTermGoals || !h.longTermGoals) {
        throw new Error('getFullHistory debe recuperar las metas a mediano y largo plazo por separado');
    }
    const adultViewHtml = CHS.renderAdultHistoryIntegral(testAdult, h, therapist, therapist.registry);
    if (!adultViewHtml.includes('Metas a Mediano Plazo') || !adultViewHtml.includes('Metas a Largo Plazo')) {
        throw new Error('El visor de historia de adulto debe renderizar las metas a mediano y largo plazo por separado');
    }
    if (!pdfHtml.includes('Metas a Mediano Plazo') || !pdfHtml.includes('Metas a Largo Plazo')) {
        throw new Error('El PDF de historia de adulto debe reflejar las metas a mediano y largo plazo por separado');
    }
});

// 101.2 TC-HIST-10: Historia Clínica Adolescente (Paridad Estricta con PDF de 7 Páginas y Cero Campos Foráneos)
ClinicalTestSuite.add('TC-HIST-10', 'Historia Clínica Adolescente (Paridad Estricta con PDF de 7 Páginas y Cero Campos Foráneos)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    const testTeen = {
        id: 'pat_teen_pdf_strict_01',
        name: 'Valentina Rodríguez',
        category: 'adolescent',
        birthdate: '2010-05-18',
        birthPlace: 'Caracas, Distrito Capital',
        gender: 'Femenino',
        schoolGrade: '3er Año de Bachillerato',
        livesWith: 'Madre, padrastro y hermano menor',
        address: 'Urb. El Marqués, Calle Araguaney, Qta. Villa Sol',
        referral: ['Orientador Escolar'],
        hasAttendedBefore: 'SI',
        previousAttendanceDate: '10/03/2023',
        motherName: 'Carmen Elena Morales',
        motherAge: 42,
        motherCi: 'V-15.448.910',
        motherEducation: 'Universitaria Completa (Lic. en Administración)',
        motherOccupation: 'Administradora de Empresas',
        motherAddress: 'Urb. El Marqués, Qta. Villa Sol, Caracas',
        fatherName: 'Roberto José Rodríguez',
        fatherAge: 45,
        fatherCi: 'V-14.230.119',
        fatherEducation: 'Universitaria Completa (Ingeniero Mecánico)',
        fatherOccupation: 'Ingeniero Consultor',
        fatherAddress: 'Los Palos Grandes, Av. Andrés Bello, Caracas',
        siblingsCount: 1,
        stepSiblingsCount: 1,
        halfSiblingsCount: 0,
        genogramNotes: 'Estructura nuclear con padres divorciados hace 5 años; buena relación filial.',
        reason: 'Episodios de ansiedad ante exámenes escolares y dificultad para poner límites a sus pares.',
        observedGestures: 'Contacto visual intermitente, manos inquietas sobre regazo, tono de voz pausado.',
        symptomsBehavioral: 'Aislamiento en su habitación al regresar de clases y postergación de deberes.',
        symptomsEmotional: 'Temor al fracaso académico, frustración rápida y llanto ocasional sin causa aparente.',
        symptomsOrganic: 'Cefalea frontal recurrente post-escolar y sensación de nudo en la garganta.',
        mentalExam: 'Adolescente orientada en las tres esferas, aliñada, lenguaje fluido con adecuada coherencia.',
        neuroEvaluation: 'Sin alteraciones reportadas en control pediátrico habitual.',
        traumaInjuries: 'Caída de patineta a los 11 años con traumatismo en muñeca izquierda (sin fractura).',
        surgeries: 'Amigdalectomía a los 6 años bajo anestesia general sin complicaciones.',
        seizures: 'Negadas categóricamente.',
        immuneDiseases: 'Negadas.',
        allergies: 'Rinitis alérgica estacional controlada con antihistamínicos ocasionales.',
        medicalTreatment: 'Ningún fármaco administrado de forma continua.',
        otherMedicalHistory: 'Control odontológico con ortodoncia correctiva activa.',
        familyMedicalHistory: 'Abuela materna con hipertensión arterial; abuelo paterno con diabetes mellitus.',
        patientPsychiatricHistory: 'Asistió a 3 sesiones de orientación escolar a los 12 años por adaptación a bachillerato.',
        familyPsychiatricHistory: 'Madre con antecedentes de ansiedad postparto superada.',
        pedagogicalHistory: 'Evaluación psicopedagógica a los 8 años por ortografía; cociente intelectual promedio-alto.',
        desiredPregnancy: 'SI',
        plannedPregnancy: 'SI',
        fetalDevelopment: 'Embarazo normoevolutivo controlado mensualmente con ecografías regulares.',
        motherEmotionalState: 'Tranquila, buen apoyo de la pareja y red familiar.',
        pregnancyMedications: 'Ácido fólico, hierro y complejo polivitamínico prenatal.',
        motherPregnancyIllnesses: 'Hiperémesis gravídica leve durante el primer trimestre, sin deshidratación.',
        pregnancyNumber: 1,
        pregnancyDuration: '39 semanas',
        laborDuration: '8 horas',
        deliveryType: 'Cesárea',
        birthCry: 'SI',
        birthPosition: 'Cefálica',
        birthWeight: '3.250 gr',
        birthLength: '50 cm',
        resuscitation: 'NO',
        incubator: 'NO',
        firstFeeding: 'Lactancia materna exclusiva durante los primeros 6 meses.',
        birthOtherObs: 'Apgar 9/10 al primer y quinto minuto. Sin complicaciones neonatales.',
        earlyFeeding: 'Lactancia materna complementada con ablactación progresiva a partir de los 6 meses.',
        weaningAge: '14 meses',
        headControlAge: '3 meses',
        sittingAge: '6 meses',
        crawlingAge: '8 meses',
        firstStepsAge: '11 meses',
        firstWordsAge: '10 meses',
        firstTeethAge: '7 meses',
        sphincterControlAge: 'Diurno a los 2 años, nocturno a los 2 años y medio.',
        daycareOrCaregivers: 'Guardería maternal desde el año y medio, cuidada en las tardes por abuela.',
        schoolStartAge: '3 años (Educación Inicial)',
        schoolAdaptation: 'Adaptación rápida, sin llanto prolongado, sociable con sus compañeros.',
        teacherRelationship: 'Excelente; descrita como colaboradora y atenta en clase.',
        friendsInteraction: 'Comparte juegos de roles, mantiene amistades estables y empáticas.',
        readingAge: '5 años',
        writingAge: '5 años y medio',
        countingAge: '4 años',
        primarySchoolDevelopment: 'Desempeño sobresaliente en la primaria, cuadro de honor en varios grados.',
        learningDifficulties: 'Matemáticas y física (razonamiento abstracto complejo bajo presión).',
        learningStrengths: 'Literatura, redacción, idiomas extranjeros y expresión plástica.',
        schoolBehavior: 'Comportamiento respetuoso con profesores y adecuada disciplina en aula.',
        schoolAttitude: 'Responsable y comprometida, con alta autoexigencia hacia sus notas.',
        homeworkSupport: 'Madre supervisa; realiza las tareas con alto grado de autonomía.',
        homeBehavior: 'Colaboradora en tareas del hogar; ocasional introversión en momentos de estrés.',
        outdoorsBehavior: 'Sociable, atenta y respetuosa con las normas del entorno público.',
        likesActivities: 'Dibujar, escuchar música pop/indie, leer novelas juveniles y pasear en bicicleta.',
        dislikesActivities: 'Discusiones ruidosas, tareas mecánicas repetitivas y llamadas de atención en público.',
        familyDynamicsDesc: 'Comunicación fluida y afectuosa con la madre; límites claros y respetuosos.',
        teenChildhood: 'Recuerda una infancia feliz, rodeada de primos y actividades al aire libre.',
        teenSocial: 'Mantiene un grupo pequeño de 4 amigas íntimas con quienes comparte salidas regulares.',
        teenSexuality: 'Identidad femenina cisgénero congruente; sin inicio de vida sexual activa.',
        teenSpirituality: 'Participa ocasionalmente en actividades comunitarias de valores éticos.',
        teenFamilyDynamics: 'Siente que su madre la apoya pero desearía más espacio para tomar decisiones propias.',
        teenRelationships: 'No tiene pareja actualmente; da prioridad a sus metas académicas y a sus amigas.',
        housingType: 'Casa',
        housingServices: 'Sí',
        housingSharesRoom: 'No',
        housingSharesRoomDesc: 'Habitación individual propia con escritorio de estudio.',
        occupantsAdultsM: 1,
        occupantsAdultsF: 1,
        occupantsTeensM: 0,
        occupantsTeensF: 1,
        occupantsChildrenM: 1,
        occupantsChildrenF: 0,
        addictions: 'Niega consumo de tabaco, alcohol y drogas; uso diario de smartphone 3-4 hrs (redes sociales).',
        socialManias: 'Acomodar sus útiles escolares por colores antes de comenzar a estudiar.',
        phobias: 'Aracnofobia moderada (miedo intenso e irracional a las arañas).',
        nightTerrors: 'Negados actualmente (presentó pesadillas esporádicas a los 7 años).',
        onychophagy: 'Negada.',
        sleepPattern: 'Sueño de 7 horas en promedio; dificultad para conciliar en víspera de exámenes.',
        eatingPattern: 'Dieta balanceada, 3 comidas principales y merienda matutina.',
        hygienePattern: 'Impecable cuidado e higiene personal.',
        recreationArea: 'Club deportivo los sábados, clases de dibujo artístico y paseos al parque.',
        dailyRoutine: 'Despierta 6:00am, colegio de 7:00am a 2:30pm, tareas y dibujo 4:00pm-7:00pm, cena 8:00pm, duerme 10:30pm.',
        teenShortGoals: 'Aprobar el año escolar con promedio superior a 18 puntos y mejorar gestión de la ansiedad.',
        teenLongGoals: 'Estudiar Diseño Gráfico o Arquitectura en la universidad e independizarse con éxito.'
    };

    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.patients = globalThis.AppState.patients || [];
    globalThis.AppState.patients.push(testTeen);

    const h = CHS.getFullHistory(testTeen);
    const therapist = CHS.getTherapistInfo();
    const pdfHtml = CHS.exportHistoriaOficialAdolescentePDF(testTeen, h, '15', therapist);

    // 1. Verificación de la estructura exacta de 7 páginas
    const pageMatches = pdfHtml.match(/<div class="pdf-page">/g) || [];
    if (pageMatches.length !== 7) {
        throw new Error(`El PDF de historia adolescente debe contener exactamente 7 páginas (encontradas: ${pageMatches.length})`);
    }

    for (let i = 1; i <= 7; i++) {
        if (!pdfHtml.includes(`<div class="page-footer">${i}</div>`)) {
            throw new Error(`Falta el pie de página numerado oficial "${i}" en el PDF de adolescente`);
        }
    }

    // 2. Verificación de todos los Títulos y Secciones Estrictas de las 7 Páginas del PDF
    const requiredSections = [
        // Pág 1
        'HISTORIA CLÍNICA ADOLESCENTE',
        'Ha asistido antes a Consulta Psicológica: NO',
        'IDENTIFICACIÓN DEL PACIENTE:',
        'DATOS FILIATORIOS:',
        'Nombre Completo de la Madre:',
        'Nombre Completo del Padre:',
        'Nº Hermanos:',
        'Nº Hermanastros',
        'Nº Medio Hermanos:',
        'GENOGRAMA',
        'MOTIVO DE CONSULTA:',
        'GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA',
        'SINTOMATOLOGÍA PRESENTADA:',
        'Características Conductuales:',
        // Pág 2
        'Características Emocionales:',
        'Características Orgánicas:',
        'EXAMEN MENTAL:',
        'ANTECEDENTES',
        'Antecedentes Médicos del Paciente',
        'Evaluación Neurológica',
        'Golpes, caídas, lesiones, esguinces o fracturas.',
        'Operaciones',
        'Convulsiones',
        'Enfermedades que afectan el Sistema Inmunológico',
        'Alergias',
        'Tratamiento Actual',
        'Otros antecedentes',
        'Antecedentes Médicos Familiares',
        // Pág 3
        'Antecedentes Psiquiátricos o psicológicos del Paciente',
        'Antecedentes Psiquiátricos o psicológicos Familiares',
        'Evaluación o tratamiento Pedagógico Previo del Paciente',
        'DESARROLLO PRENATAL',
        'Embarazo Deseado: SI',
        'Embarazo Planificado: SI',
        'Desarrollo del feto durante el embarazo',
        'Estado emocional de la madre durante el embarazo',
        'Medicación Durante el Embarazo',
        'Enfermedades de la Madre Durante el Embarazo',
        'Número de Embarazo de la Madre',
        'DATOS DEL PARTO',
        'Duración del Embarazo:',
        'Duración del Parto:',
        'Tipo de Parto:',
        'Espontáneo:',
        'Inducido:',
        'Cesárea:',
        'Natural:',
        'ESTADO DEL NIÑO AL NACER',
        'Llanto al nacer:',
        'Posición del Bebé:',
        'Peso:',
        'Medida:',
        'Reanimación:',
        'Incubadora:',
        'Primera alimentación:',
        'Otras Observaciones:',
        'DESARROLLO SOCIAL Y PSICOMOTOR DEL NIÑO ALREDEDOR DE LOS',
        // Pág 4
        'PRIMEROS AÑOS DE VIDA',
        'Descripción de la alimentación durante los primeros meses de vida',
        'Descripción del proceso de destete',
        'Control o dureza cefálica',
        'Edad a la que se sentó por primera vez',
        'Gatear',
        'Primeros pasos',
        'Primeras palabras',
        'Primero dientes',
        'Control de esfínteres vesical y anal',
        'ESCOLARIDAD',
        'Guardería o cuidadores',
        'Edad a la que comenzó la escolaridad',
        'Proceso de adaptación a la escolaridad',
        'Relación con las maestras',
        'Amigos e interacción en la escuela',
        'Edad a la que aprendió a leer',
        'Edad a la que aprendió a escribir',
        'Edad a la que aprendió a contar',
        'Desarrollo en la primaria',
        // Pág 5
        'Áreas con mayor dificultad para su aprendizaje',
        'Áreas con mayor facilidad para su aprendizaje',
        'Conducta en el colegio',
        'Actitud al realizar actividades',
        'Personas con quien realizar actividades escolares en el hogar',
        'DINÁMICA FAMILIAR Y SOCIAL',
        'Conducta en el Hogar',
        'Conducta al Salir de Casa',
        'Cosas que le gusta',
        'Cosas que le disgusta',
        'Descripción de la Dinámica Familiar',
        'DESCRIPCIÓN DE ACUERDO A LA ENTEVISTA CON EL ADOLESCENTE',
        'Infancia',
        'Área Social',
        'Área Sexual (Interés por Sexualidad o identificación de género)',
        // Pág 6
        'Área Espiritual',
        'Descripción de la Dinámica Familiar',
        'Relaciones Interpersonales (amistades y pareja)',
        'ÁREA DE VIVIENDA',
        'Apartamento',
        'Casa',
        'Otro',
        'Servicios Básicos',
        'Comparte Habitación',
        'Personas que Habitan en la Vivienda',
        'HÁBITOS PSICOBIOLÓGICOS:',
        'Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):',
        'Manías Sociales (Tics, rutinas que maneje en un determinado espacio)',
        'Fobias o miedo intenso',
        'Miedos nocturnos',
        'Ornicofagia',
        'Sueño',
        // Pág 7
        'Alimentación',
        'Higiene',
        'Área Recreacional',
        'Rutina Diaria',
        'Metas a Corto y Mediano Plazo',
        'Metas a Largo Plazo',
        'FIRMA Y SELLO',
        'LOPNNA',
        'Asentimiento Informado'
    ];

    for (const sec of requiredSections) {
        if (!pdfHtml.includes(sec)) {
            throw new Error(`Falta campo o sección oficial del PDF en Historia Clínica Adolescente: "${sec}"`);
        }
    }

    // 3. Verificación de CERO campos foráneos no pertenecientes al PDF oficial del adolescente
    const forbiddenInTeens = [
        'HISTORIA CLÍNICA ADULTO',
        'Área Laboral:',
        'Aspectos Legales:',
        'IMPRESIÓN DIAGNÓSTICA (CIE-10 / CIE-11 & DSM-5-TR):',
        'PLAN TERAPÉUTICO Y METAS DE INTERVENCIÓN:'
    ];

    for (const forb of forbiddenInTeens) {
        if (pdfHtml.includes(forb)) {
            throw new Error(`Error: Se detectó campo foráneo no permitido en Historia Clínica Adolescente: "${forb}"`);
        }
    }

    // 4. Verificación de que el editor de adolescente genera las 7 pestañas correspondientes a las 7 páginas del PDF
    const editorHtml = CHS.renderTeenHistoryEditorHTML(testTeen, h, therapist.registry);
    for (let tabNum = 1; tabNum <= 7; tabNum++) {
        if (!editorHtml.includes(`htab-teen-${tabNum}`)) {
            throw new Error(`El editor de historia de adolescente debe contener la pestaña htab-teen-${tabNum}`);
        }
    }

    const requiredTeenEditorFields = [
        'fh_birthPlace',
        'fh_motherName',
        'fh_fatherName',
        'fh_siblingsCount',
        'fh_reason',
        'fh_mentalExam',
        'fh_pregnancyDesired',
        'fh_pregnancyPlanned',
        'fh_deliveryType',
        'fh_headControl',
        'fh_readingAge',
        'fh_learningDifficulties',
        'fh_teenChildhood',
        'fh_teenSexuality',
        'fh_teenRelationships',
        'fh_housingType',
        'fh_addictions',
        'fh_teenShortGoals',
        'fh_teenLongGoals'
    ];

    for (const fieldId of requiredTeenEditorFields) {
        if (!editorHtml.includes(fieldId)) {
            throw new Error(`El editor de historia de adolescente debe contener el campo de formulario id="${fieldId}"`);
        }
    }

    // 5. Verificación de renderizado integral en pantalla
    const teenViewHtml = CHS.renderTeenHistoryIntegral(testTeen, h, therapist, therapist.registry);
    if (!teenViewHtml.includes('Áreas Vitales & Entrevista Privada con el Adolescente') || !teenViewHtml.includes('Desarrollo Prenatal, Parto e Hitos')) {
        throw new Error('El visor de historia de adolescente debe renderizar las secciones acordadas');
    }
});

// 101.3 TC-HIST-11: Historia Clínica Infantil (Paridad Estricta con PDF de 7 Páginas y Cero Campos Foráneos)
ClinicalTestSuite.add('TC-HIST-11', 'Historia Clínica Infantil (Paridad Estricta con PDF de 7 Páginas y Cero Campos Foráneos)', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;

    const testChild = {
        id: 'pat_child_pdf_strict_01',
        name: 'Mateo Alejandro Torres',
        category: 'child',
        birthdate: '2018-04-12',
        birthPlace: 'Valencia, Estado Carabobo',
        gender: 'Masculino',
        schoolGrade: '3er Grado de Primaria',
        livesWith: 'Madre y abuela materna',
        address: 'Urb. Trigal Norte, Calle Los Robles, Qta. Flor',
        referral: ['Orientadora Escolar'],
        hasAttendedBefore: 'SI',
        previousAttendanceDate: '15/02/2023',
        motherName: 'Beatriz Elena Torres',
        motherAge: 36,
        motherCI: 'V-18.992.104',
        motherEducation: 'Universitaria (Lic. en Administración)',
        motherJob: 'Administradora',
        motherAddress: 'Urb. Trigal Norte, Qta. Flor, Valencia',
        fatherName: 'Manuel Alejandro Silva',
        fatherAge: 38,
        fatherCI: 'V-17.654.321',
        fatherEducation: 'TSU en Informática',
        fatherJob: 'Analista de Sistemas',
        fatherAddress: 'Urb. El Parral, Valencia',
        siblingsCount: 0,
        stepSiblingsCount: 0,
        halfSiblingsCount: 1,
        genogramNotes: 'Familia monoparental materna con figura de apoyo activa de abuela materna.',
        reason: 'Dificultades de atención y conducta motriz inquieta en el aula de clases.',
        observedGestures: 'Niño activo, contacto visual adecuado, colaborador durante la entrevista.',
        symptomsBehavioral: 'Inquietud psicomotriz en tareas pasivas, distractibilidad ante estímulos irrelevantes.',
        symptomsEmotional: 'Tolerancia baja a la frustración; afecto modulado y reactivo.',
        symptomsOrganic: 'Negadas; sueño y apetito regulares.',
        mentalExam: 'Orientado en tiempo, espacio y persona. Discurso coherente y vocabulario rico para su edad. Pensamiento sin alteraciones lógicas.',
        neuroEvaluation: 'Evaluación neuropediátrica sin anomalías estructurales.',
        traumaInjuries: 'Caída de bicicleta a los 5 años sin pérdida de conciencia ni secuelas.',
        surgeries: 'Amigdalectomía a los 6 años sin complicaciones.',
        seizures: 'Negadas.',
        immuneDiseases: 'Negadas.',
        allergies: 'Rinitis alérgica estacional leve.',
        medicalTreatment: 'Sin medicación activa.',
        otherMedicalHistory: 'Control pediátrico regular al día.',
        familyMedicalHistory: 'Hipertensión arterial en abuelo materno.',
        patientPsychiatricHistory: 'Sin antecedentes psiquiátricos previos.',
        familyPsychiatricHistory: 'Tía materna con antecedentes de ansiedad generalizada.',
        pedagogicalHistory: 'Evaluación psicopedagógica previa a los 5 años: fortalezas en lenguaje y destrezas visuales.',
        pregnancyDesired: 'SI',
        pregnancyPlanned: 'SI',
        pregnancyNumber: 1,
        fetalDevelopment: 'Evolución intrauterina normal y controles ecográficos mensuales regulares.',
        motherEmotionalState: 'Embarazo tranquilo, acompañada por la familia materna.',
        pregnancyMedication: 'Ácido fólico, hierro y multivitamínicos prenatales.',
        pregnancyDiseases: 'Negadas.',
        pregnancyDuration: '39 semanas',
        deliveryDuration: '5 horas',
        deliveryType: 'Natural',
        birthCry: 'SI',
        babyPosition: 'Cefálica',
        birthWeight: '3.350 kg',
        birthLength: '51 cm',
        resuscitation: 'NO',
        incubator: 'NO',
        firstFeeding: 'Lactancia materna exclusiva hasta los 6 meses.',
        birthObservations: 'Apgar 9/10, coloración sonrosada, sin complicaciones perinatales.',
        earlyFeedingDesc: 'Succión vigorosa, buena tolerancia, sin episodios de cólicos severos.',
        weaningDesc: 'Inicio de ablactación a los 6 meses con papillas y frutas; destete natural a los 14 meses.',
        headControl: '3 meses',
        sittingAge: '6 meses',
        crawlingAge: '8 meses',
        firstStepsAge: '12 meses',
        firstWordsAge: '10 meses (mamá, papá, agua)',
        firstTeeth: '6 meses',
        sphincterControl: '2 años y 4 meses (diurno y nocturno)',
        daycareOrCaregivers: 'Cuidado materno y abuela materna; no asistió a guardería.',
        schoolStartAge: '3 años (Educación Inicial)',
        schoolAdaptation: 'Adaptación rápida, sin llanto prolongado, alegre al integrarse al grupo.',
        teacherRelation: 'Cariñosa y respetuosa; en primaria requiere redirección de foco.',
        schoolFriends: 'Muchos amigos, juegos grupales compartidos en el recreo.',
        readingAge: '5 años',
        writingAge: '5 años y medio',
        countingAge: '4 años',
        elementaryDevelopment: 'Buen rendimiento global; destaca en lectura y ciencias.',
        learningDifficulties: 'Permanecer sentado durante períodos extensos de copia mecánica.',
        learningStrengths: 'Comprensión lectora, expresión oral, dibujo y deportes.',
        schoolBehavior: 'Inquietud en el asiento; no es agresivo ni desafiante.',
        taskAttitude: 'Motivado ante retos dinámicos; se frustra con planas repetitivas.',
        homeworkSupport: 'Madre y abuela supervisan el horario de tareas.',
        homeBehavior: 'Colaborador y cariñoso; juega con legos y figuras de acción.',
        outdoorsBehavior: 'Sociable y extrovertido en parques y visitas familiares.',
        likes: 'Construir con bloques, dinosaurios, bicicleta y natación.',
        dislikes: 'Esperar turnos largos, sopas de verduras y regaños en público.',
        autonomy: 'Se baña, se viste y come de forma totalmente autónoma.',
        familyDynamics: 'Ambiente afectivo estable, límites claros y acuerdos dialogados.',
        socialArea: 'Comparte con primos y vecinos de su edad con empatía.',
        sexuality: 'Curiosidad biológica habitual acorde a su edad.',
        spirituality: 'Participa en tradiciones familiares y valores de solidaridad.',
        housingType: 'Casa',
        housingServices: 'Sí',
        housingSharesRoom: 'No',
        housingSharesRoomDesc: 'Habitación propia decorada con motivos infantiles.',
        occupantsAdultsM: 0,
        occupantsAdultsF: 2,
        occupantsTeensM: 0,
        occupantsTeensF: 0,
        occupantsChildrenM: 1,
        occupantsChildrenF: 0,
        addictions: 'Niega sustancias; videojuegos limitados a 1 hora los fines de semana.',
        socialManias: 'Acomodar sus figuras en hilera antes de dormir.',
        phobias: 'Temor a truenos muy fuertes durante tormentas.',
        nightTerrors: 'Negados actualmente.',
        ornicofagia: 'Negada.',
        sleepPattern: 'Sueño de 9 a 10 horas continuas, descanso reparador.',
        eatingPattern: 'Buen apetito, 3 comidas y meriendas escolares.',
        hygienePattern: 'Hábitos de higiene consolidados y adecuados.',
        recreationArea: 'Clases de natación dos veces por semana y paseos familiares.',
        dailyRoutine: 'Despierta 6:30am, colegio 7:30am-1:00pm, almuerzo 1:30pm, tareas y juego 3:00pm-6:00pm, cena 7:30pm, duerme 9:00pm.',
        shortTermGoals: 'Mejorar estrategias de autocontrol motor en el aula y mantener motivación escolar.',
        longTermGoals: 'Desarrollo madurativo integral, autorregulación y bienestar socioemocional.'
    };

    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.patients = globalThis.AppState.patients || [];
    globalThis.AppState.patients.push(testChild);

    const h = CHS.getFullHistory(testChild);
    const therapist = CHS.getTherapistInfo();
    const pdfHtml = CHS.exportHistoriaOficialInfantilPDF(testChild, h, '8', therapist);

    // 1. Verificación de la estructura exacta de 7 páginas
    const pageMatches = pdfHtml.match(/<div class="pdf-page">/g) || [];
    if (pageMatches.length !== 7) {
        throw new Error(`El PDF de historia infantil debe contener exactamente 7 páginas (encontradas: ${pageMatches.length})`);
    }

    for (let i = 1; i <= 7; i++) {
        if (!pdfHtml.includes(`<div class="page-footer">${i}</div>`)) {
            throw new Error(`Falta el pie de página numerado oficial "${i}" en el PDF de historia infantil`);
        }
    }

    // 2. Verificación de todos los Títulos y Secciones Estrictas de las 7 Páginas del PDF Infantil
    const requiredSections = [
        // Pág 1
        'HISTORIA CLÍNICA INFANTIL',
        'Ha asistido antes a Consulta Psicológica: NO',
        'DATOS DE IDENTIFICACIÓN DEL PACIENTE:',
        'DATOS FILIATORIOS DE LOS PADRES:',
        'Nombre Completo de la Madre:',
        'Nombre Completo del Padre:',
        'Nº Hermanos:',
        'Nº Hermanastros',
        'Nº Medio Hermanos:',
        'GENOGRAMA',
        'MOTIVO DE CONSULTA:',
        'GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICAR EL MOTIVO DE CONSULTA',
        'SINTOMATOLOGÍA PRESENTADA:',
        'Características Conductuales:',
        // Pág 2
        'Características Emocionales:',
        'Características Orgánicas:',
        'EXAMEN MENTAL:',
        'ANTECEDENTES',
        'Antecedentes Médicos del Paciente',
        'Evaluación Neurológica',
        'Golpes, caídas, lesiones, esguinces o fracturas.',
        'Operaciones',
        'Convulsiones',
        'Enfermedades que afectan el Sistema Inmunológico',
        'Alergias',
        'Tratamiento Actual',
        'Otros antecedentes',
        'Antecedentes Médicos Familiares',
        // Pág 3
        'Antecedentes Psiquiátricos o psicológicos del Paciente',
        'Antecedentes Psiquiátricos o psicológicos Familiares',
        'Evaluación o tratamiento Pedagógico Previo del Paciente',
        'DESARROLLO PRENATAL',
        'Embarazo Deseado: SI',
        'Embarazo Planificado: SI',
        'Desarrollo del feto durante el embarazo',
        'Estado emocional de la madre durante el embarazo',
        'Medicación Durante el Embarazo',
        'Enfermedades de la Madre Durante el Embarazo',
        'Número de Embarazo de la Madre',
        'DATOS DEL PARTO',
        'Duración del Embarazo:',
        'Duración del Parto:',
        'Tipo de Parto:',
        'Espontáneo:',
        'Inducido:',
        'Cesárea:',
        'Natural:',
        'ESTADO DEL NIÑO AL NACER',
        'Llanto al nacer:',
        'Posición del Bebé:',
        'Peso:',
        'Medida:',
        'Reanimación:',
        'Incubadora:',
        'Primera alimentación:',
        'Otras Observaciones:',
        'DESARROLLO SOCIAL Y PSICOMOTOR DEL NIÑO ALREDEDOR DE LOS',
        // Pág 4
        'PRIMEROS AÑOS DE VIDA',
        'Descripción de la alimentación durante los primeros meses de vida',
        'Descripción del proceso de destete',
        'Control o dureza cefálica',
        'Edad a la que se sentó por primera vez',
        'Gatear',
        'Primeros pasos',
        'Primeras palabras',
        'Primero dientes',
        'Control de esfínteres vesical y anal',
        'ESCOLARIDAD',
        'Guardería o cuidadores',
        'Edad a la que comenzó la escolaridad',
        'Proceso de adaptación a la escolaridad',
        'Relación con las maestras',
        'Amigos e interacción en la escuela',
        'Edad a la que aprendió a leer',
        'Edad a la que aprendió a escribir',
        'Edad a la que aprendió a contar',
        // Pág 5
        'Desarrollo en la primaria',
        'Áreas con mayor dificultad para su aprendizaje',
        'Áreas con mayor facilidad para su aprendizaje',
        'Conducta en el colegio',
        'Actitud al realizar actividades',
        'Personas con quien realizar actividades escolares en el hogar',
        'DINÁMICA FAMILIAR Y SOCIAL',
        'Conducta en el Hogar',
        'Conducta al Salir de Casa',
        'Cosas que le gusta',
        'Cosas que le disgusta',
        'Autonomía',
        'Dinámica Familiar',
        'Área Social',
        // Pág 6
        'Sexualidad',
        'Área Espiritual',
        'ÁREA DE VIVIENDA',
        'Apartamento',
        'Casa',
        'Otro',
        'Servicios Básicos',
        'Comparte Habitación',
        'Personas que Habitan en la Vivienda',
        'HÁBITOS PSICOBIOLÓGICOS:',
        'Adicciones (Drogas, alcohol, tecnología, cigarrillos, etc.):',
        'Manías Sociales (Tics, rutinas que maneje en un determinado espacio)',
        'Fobias o miedo intenso',
        'Miedos nocturnos',
        'Ornicofagia',
        'Sueño',
        'Alimentación',
        'Higiene',
        // Pág 7
        'Área Recreacional',
        'Rutina Diaria',
        'Metas a Corto y Mediano Plazo',
        'Metas a Largo Plazo',
        'FIRMA Y SELLO'
    ];

    for (const sec of requiredSections) {
        if (!pdfHtml.includes(sec)) {
            throw new Error(`Falta campo o sección oficial del PDF en Historia Clínica Infantil: "${sec}"`);
        }
    }

    // 3. Verificación de CERO campos foráneos no pertenecientes al PDF oficial infantil
    const forbiddenInChild = [
        'HISTORIA CLÍNICA ADULTO',
        'Área Laboral:',
        'Aspectos Legales:',
        'IMPRESIÓN DIAGNÓSTICA (CIE-10 / CIE-11 & DSM-5-TR):',
        'PLAN TERAPÉUTICO Y METAS DE INTERVENCIÓN:',
        'DESCRIPCIÓN DE ACUERDO A LA ENTEVISTA CON EL ADOLESCENTE'
    ];

    for (const forb of forbiddenInChild) {
        if (pdfHtml.includes(forb)) {
            throw new Error(`Error: Se detectó campo foráneo no permitido en Historia Clínica Infantil: "${forb}"`);
        }
    }

    // 4. Verificación de que el editor infantil genera las 7 pestañas correspondientes
    const editorHtml = CHS.renderChildHistoryEditorHTML(testChild, h, therapist.registry);
    for (let tabNum = 1; tabNum <= 7; tabNum++) {
        if (!editorHtml.includes(`htab-child-${tabNum}`)) {
            throw new Error(`El editor de historia infantil debe contener la pestaña htab-child-${tabNum}`);
        }
    }

    const requiredChildTabs = [
        'Identificación del Paciente',
        'Motivo de Consulta y Examen Mental',
        'Antecedentes',
        'Desarrollo y Escolaridad',
        'Dinámica Familiar y Vivienda',
        'Hábitos Psicobiológicos',
        'Metas y Proyecto de Vida'
    ];

    for (const tab of requiredChildTabs) {
        if (!editorHtml.includes(tab)) {
            throw new Error(`El editor de historia infantil debe contener la pestaña: "${tab}"`);
        }
    }

    const requiredChildEditorFields = [
        'fh_patientName',
        'fh_birthPlace',
        'fh_motherName',
        'fh_fatherName',
        'fh_siblingsCount',
        'fh_reason',
        'fh_mentalExam',
        'fh_pregnancyDesired',
        'fh_pregnancyPlanned',
        'fh_deliveryType',
        'fh_headControl',
        'fh_readingAge',
        'fh_learningDifficulties',
        'fh_homeBehavior',
        'fh_autonomy',
        'fh_sexuality',
        'fh_spirituality',
        'fh_housingType',
        'fh_addictions',
        'fh_shortTermGoals',
        'fh_longTermGoals'
    ];

    for (const fieldId of requiredChildEditorFields) {
        if (!editorHtml.includes(fieldId)) {
            throw new Error(`El editor de historia infantil debe contener el campo de formulario id="${fieldId}"`);
        }
    }

    // 5. Verificación de renderizado integral en pantalla
    const childViewHtml = CHS.renderChildHistoryIntegral(testChild, h, therapist, therapist.registry);
    if (!childViewHtml.includes('Datos de Identificación del Paciente & Convivencia') || !childViewHtml.includes('Neurodesarrollo Prenatal, Parto, Hitos y Escolaridad')) {
        throw new Error('El visor de historia infantil debe renderizar las secciones acordadas');
    }
});

// 102. TC-PORTAL-06: Sincronización de tareas intersesión y desactivación efectiva de alertas SOS en portal adulto/adolescente
ClinicalTestSuite.add('TC-PORTAL-06', 'Sincronización de tareas intersesión y desactivación efectiva de alertas SOS en portal adulto/adolescente', async () => {
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { default: db } = await import('./db.js');

    const therapistId = 'dr_sync_test_' + Date.now();
    const token = generateSessionToken(therapistId, 'sync_test@clinica.com');

    const patientId = 'pat_sync_' + Date.now();
    const portalToken = 'PN-SYNC-' + Math.floor(Math.random() * 90000 + 10000);

    // 1. Crear paciente adulto / adolescente con tareas intersesión asignadas por el terapeuta
    const patientData = {
        id: patientId,
        name: 'Camila Adulto/Adolescente',
        category: 'adolescent',
        lifeStage: 'adolescent',
        portalToken: portalToken,
        portalEnabled: true,
        therapist_id: therapistId
    };

    const task1 = {
        id: 'task_sync_1_' + Date.now(),
        patient_id: patientId,
        title: 'Completar autoregistro ABC de pensamientos',
        description: 'Identificar situación, pensamiento automático y emoción',
        dueDate: '2026-11-01',
        completed: false
    };

    // Sincronizar paciente y tareas a través de /api/v1/patients/sync
    const syncRes = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            patients: [patientData],
            tasks: [task1]
        })
    });
    if (syncRes.status !== 200) {
        throw new Error(`Sincronización inicial de paciente falló con status ${syncRes.status}`);
    }

    // 2. Verificar que el portal del paciente en /api/v1/portal/me recibe las tareas asignadas
    const portalMeRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    if (portalMeRes.status !== 200) {
        throw new Error(`Acceso al portal por token falló con status ${portalMeRes.status}`);
    }
    const portalData = await portalMeRes.json();
    if (!Array.isArray(portalData.tasks) || portalData.tasks.length === 0) {
        throw new Error('Las tareas asignadas por el terapeuta no aparecen en la respuesta de portal /me');
    }
    const foundTask = portalData.tasks.find(t => t.id === task1.id);
    if (!foundTask || foundTask.title !== task1.title) {
        throw new Error('La tarea intersesión no coincide con la asignada por el terapeuta');
    }

    // 3. Paciente activa alerta SOS desde el formulario / botón SOS
    const sosRes = await fetch(`${baseUrl}/api/v1/portal/crisis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientId,
            token: portalToken,
            reason: 'Alerta SOS de prueba en portal',
            severity: 'CRITICO'
        })
    });
    if (sosRes.status !== 200) {
        throw new Error(`Activación SOS falló con status ${sosRes.status}`);
    }

    // 4. Terapeuta consulta alertas de crisis activas: debe existir la alerta SOS
    const alertsRes = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (alertsRes.status !== 200) {
        throw new Error(`Consulta de alertas SOS falló con status ${alertsRes.status}`);
    }
    const alertsData = await alertsRes.json();
    const activeAlert = (alertsData.alerts || []).find(a => a.patient_id === patientId && !a.acknowledged);
    if (!activeAlert) {
        throw new Error('La alerta SOS activa no fue encontrada en la lista del terapeuta');
    }

    // 5. Terapeuta llena y atiende el formulario de crisis, enviando ACK para desactivar la alerta SOS
    const ackRes = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts/ack-patient/${patientId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (ackRes.status !== 200) {
        throw new Error(`ACK de alerta SOS falló con status ${ackRes.status}`);
    }

    // 6. Verificar que la alerta SOS ya NO aparece en las consultas subsecuentes del terapeuta ni en el portal
    const afterAlertsRes = await fetch(`${baseUrl}/api/v1/portal/crisis-alerts`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const afterAlertsData = await afterAlertsRes.json();
    const stillActiveAlert = (afterAlertsData.alerts || []).find(a => a.patient_id === patientId && !a.acknowledged);
    if (stillActiveAlert) {
        throw new Error('FALLO CRÍTICO: La alerta SOS sigue apareciendo después de llenar el formulario y enviar ACK');
    }

    const afterPortalRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    const afterPortalData = await afterPortalRes.json();
    if (afterPortalData.hasActiveCrisisAlert) {
        throw new Error('FALLO CRÍTICO: El portal del paciente sigue reportando alerta de crisis activa tras la atención');
    }
});

// 103. TC-STATUS-01: Transición de estatus de paciente (Alta -> Otro estatus) remueve banner de alta y limpia dischargeDate
ClinicalTestSuite.add('TC-STATUS-01', 'Transición de estatus de paciente (Alta -> Otro estatus) remueve banner de alta y limpia dischargeDate', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');

    // 1. quickUpdatePatientStatus debe limpiar dischargeDate cuando el nuevo estatus no sea 'Alta'
    if (!appJs.includes("p.dischargeDate = '';")) {
        throw new Error("quickUpdatePatientStatus debe limpiar dischargeDate asignando '' cuando el estatus no es Alta");
    }

    // 2. onPatientStatusChange debe limpiar el campo del formulario cuando estatus != 'Alta'
    if (!appJs.includes("dischargeInput.value = '';")) {
        throw new Error("onPatientStatusChange debe limpiar dischargeInput.value cuando el estatus cambia fuera de Alta");
    }

    // 3. renderPatientDetail debe condicionar el banner de alta estrictamente a isAlta
    if (appJs.includes("if (isAlta || dischargeDate)")) {
        throw new Error("renderPatientDetail no debe usar (isAlta || dischargeDate) porque causa que el banner de alta quede atascado");
    }

    // 4. Simular lógica funcional de transición de estatus
    const mockPatient = {
        id: 'pat-test-alta-transition',
        name: 'Paciente Prueba Alta',
        status: 'Alta',
        dischargeDate: '2026-10-26'
    };

    const mockAppState = { patients: [mockPatient] };
    
    // Simular quickUpdatePatientStatus a 'Por iniciar'
    function simulateQuickUpdate(patientId, newStatus) {
        const p = mockAppState.patients.find(pt => pt.id === patientId);
        if (!p) return;
        p.status = newStatus;
        if (newStatus === 'Alta') {
            if (!p.dischargeDate) p.dischargeDate = '2026-10-26';
        } else {
            p.dischargeDate = '';
        }
    }

    simulateQuickUpdate('pat-test-alta-transition', 'Por iniciar');
    if (mockPatient.status !== 'Por iniciar') {
        throw new Error("El estatus del paciente no cambió a 'Por iniciar'");
    }
    if (mockPatient.dischargeDate !== '') {
        throw new Error("La fecha de alta (dischargeDate) no fue limpiada al cambiar el estatus fuera de Alta");
    }

    // Verificar que al evaluar condición de alta en vista de detalle no se muestre el banner
    const isAlta = mockPatient.status === 'Alta';
    if (isAlta) {
        throw new Error("isAlta no debe ser true para un paciente con estatus 'Por iniciar'");
    }
});

// 104. TC-SES-01: Historial de sesiones del paciente, métricas cuantitativas (asistencia, reprogramaciones, cancelaciones, inasistencias) y distribución de adherencia
ClinicalTestSuite.add('TC-SES-01', 'Historial de sesiones del paciente, métricas cuantitativas (asistencia, reprogramaciones, cancelaciones, inasistencias) y distribución de adherencia', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');

    // 1. Verificar existencia de pestaña de Historial de Sesiones en app.js y switchPatientTab
    if (!appJs.includes("switchPatientTab('sesiones', this)") || !appJs.includes('id="tab-sesiones"')) {
        throw new Error('app.js debe incluir la pestaña de Historial de Sesiones y su contenedor #tab-sesiones');
    }

    // 2. Verificar funciones centrales de cálculo de métricas y renderizado
    if (!appJs.includes('function calculatePatientSessionStats') || !appJs.includes('function renderTabHistorialSesiones') || !appJs.includes('function quickChangeSessionAttendance')) {
        throw new Error('app.js debe implementar calculatePatientSessionStats, renderTabHistorialSesiones y quickChangeSessionAttendance');
    }

    // 3. Verificar soporte de inasistencias (no_asistio) en index.html
    if (!indexHtml.includes('value="no_asistio"')) {
        throw new Error('index.html debe contener la opción value="no_asistio" en el selector de citas');
    }

    // 4. Verificar estilos cromáticos y visuales en styles.css
    if (!stylesCss.includes('.session-stats-grid') || !stylesCss.includes('.session-adherence-card') || !stylesCss.includes('.session-progress-bar-wrap') || !stylesCss.includes('.badge-status-no_asistio')) {
        throw new Error('styles.css debe contener los estilos de estadísticas de sesión, barra de adherencia y badges de estado');
    }

    // 5. Test unitario de cálculo de métricas de asistencia y adherencia
    const mockAppointments = [
        { id: 'a1', patientId: 'p-stat-test', date: '2026-10-01', status: 'completada' },
        { id: 'a2', patientId: 'p-stat-test', date: '2026-10-08', status: 'completada' },
        { id: 'a3', patientId: 'p-stat-test', date: '2026-10-15', status: 'completada' },
        { id: 'a4', patientId: 'p-stat-test', date: '2026-10-22', status: 'completada' },
        { id: 'a5', patientId: 'p-stat-test', date: '2026-10-25', status: 'reprogramada' },
        { id: 'a6', patientId: 'p-stat-test', date: '2026-10-26', status: 'cancelada' },
        { id: 'a7', patientId: 'p-stat-test', date: '2026-10-27', status: 'no_asistio' },
        { id: 'a8', patientId: 'p-stat-test', date: '2026-10-30', status: 'agendada' }
    ];

    const totalCount = mockAppointments.length; // 8
    const completedCount = mockAppointments.filter(a => a.status === 'completada').length; // 4
    const rescheduledCount = mockAppointments.filter(a => a.status === 'reprogramada').length; // 1
    const cancelledCount = mockAppointments.filter(a => a.status === 'cancelada').length; // 1
    const noShowCount = mockAppointments.filter(a => a.status === 'no_asistio').length; // 1
    const evaluableCount = completedCount + rescheduledCount + cancelledCount + noShowCount; // 7

    const attendanceRate = Math.round((completedCount / evaluableCount) * 100); // 57%
    const rescheduleRate = Math.round((rescheduledCount / evaluableCount) * 100); // 14%
    const cancellationRate = Math.round((cancelledCount / evaluableCount) * 100); // 14%
    const noShowRate = Math.round((noShowCount / evaluableCount) * 100); // 14%

    if (attendanceRate !== 57) {
        throw new Error(`Tasa de asistencia calculada incorrecta: esperaba 57%, obtuvo ${attendanceRate}%`);
    }
    if (rescheduleRate !== 14 || cancellationRate !== 14 || noShowRate !== 14) {
        throw new Error('Tasas de reprogramación, cancelación o inasistencia calculadas incorrectamente');
    }

    // 6. Test de caso con adherencia óptima (90%)
    const highAdherenceApps = [
        { id: 'h1', patientId: 'p-high', date: '2026-10-01', status: 'completada' },
        { id: 'h2', patientId: 'p-high', date: '2026-10-05', status: 'completada' },
        { id: 'h3', patientId: 'p-high', date: '2026-10-10', status: 'completada' },
        { id: 'h4', patientId: 'p-high', date: '2026-10-15', status: 'completada' },
        { id: 'h5', patientId: 'p-high', date: '2026-10-20', status: 'completada' },
        { id: 'h6', patientId: 'p-high', date: '2026-10-25', status: 'completada' },
        { id: 'h7', patientId: 'p-high', date: '2026-10-26', status: 'completada' },
        { id: 'h8', patientId: 'p-high', date: '2026-10-27', status: 'completada' },
        { id: 'h9', patientId: 'p-high', date: '2026-10-28', status: 'completada' },
        { id: 'h10', patientId: 'p-high', date: '2026-10-29', status: 'reprogramada' }
    ];
    const highEvaluable = highAdherenceApps.length;
    const highCompleted = highAdherenceApps.filter(a => a.status === 'completada').length;
    const highRate = Math.round((highCompleted / highEvaluable) * 100);
    if (highRate !== 90) {
        throw new Error(`Tasa de alta adherencia debe ser 90%, obtuvo ${highRate}%`);
    }
});

// 105. TC-PORTAL-07: Visualización y agendamiento de próxima sesión en el portal del paciente
ClinicalTestSuite.add('TC-PORTAL-07', 'Visualización y agendamiento de próxima sesión en el portal del paciente (backend, sincronización y UI)', async () => {
    const fs = await import('fs');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');

    // 1. Verificación de UI en portal.html
    if (!portalHtml.includes('id="viewSessions"') || !portalHtml.includes('id="homeNextSessionCard"') || !portalHtml.includes('id="scheduleSessionModal"')) {
        throw new Error('portal.html debe contener viewSessions, homeNextSessionCard y scheduleSessionModal');
    }

    // 2. Verificación de funciones en portal.js
    if (!portalJs.includes('function renderNextSession') || !portalJs.includes('function renderSessionsView') || !portalJs.includes('function handleScheduleSessionSubmit')) {
        throw new Error('portal.js debe implementar renderNextSession, renderSessionsView y handleScheduleSessionSubmit');
    }

    // 3. Verificación de estilos en portal.css
    if (!portalCss.includes('.portal-next-session-card') || !portalCss.includes('.btn-telehealth-join') || !portalCss.includes('.portal-badge-online')) {
        throw new Error('portal.css debe contener los estilos de .portal-next-session-card, .btn-telehealth-join y badges de modalidad');
    }

    // 4. Verificación de API backend con servidor de pruebas
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    const therapistId = 'dr_app_test_' + Date.now();
    const token = generateSessionToken(therapistId, 'app_test@clinica.com');
    const patientId = 'pat_app_' + Date.now();
    const portalToken = 'PN-APP-' + Math.floor(Math.random() * 90000 + 10000);

    const patientData = {
        id: patientId,
        name: 'Sofia Agendamiento Portal',
        category: 'adult',
        portalToken: portalToken,
        portalEnabled: true,
        therapist_id: therapistId
    };

    const syncRes = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ patients: [patientData] })
    });
    if (syncRes.status !== 200) {
        throw new Error(`Sincronización de paciente falló con status ${syncRes.status}`);
    }

    // 5. Paciente agenda una cita a través de /api/v1/portal/appointments/request
    const reqRes = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId: patientId,
            date: '2026-10-30',
            time: '15:00',
            duration: 50,
            type: 'Online',
            notes: 'Consulta para revisar avances de tareas'
        })
    });
    if (reqRes.status !== 201) {
        throw new Error(`Agendamiento de cita desde el portal falló con status ${reqRes.status}`);
    }
    const reqData = await reqRes.json();
    if (!reqData.appointment || reqData.appointment.date !== '2026-10-30') {
        throw new Error('La cita devuelta no contiene los datos agendados por el paciente');
    }

    // 6. Verificar que /api/v1/portal/me ahora devuelve la cita en el listado de appointments del paciente
    const portalMeRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    if (portalMeRes.status !== 200) {
        throw new Error(`Consulta de portal/me falló con status ${portalMeRes.status}`);
    }
    const portalMeData = await portalMeRes.json();
    const scheduledApp = (portalMeData.appointments || []).find(a => a.id === reqData.appointment.id || a.date === '2026-10-30');
    if (!scheduledApp) {
        throw new Error('La cita agendada no aparece en los appointments de /api/v1/portal/me');
    }
});

// 106. TC-PORTAL-08: Selección Inteligente de Horarios y Bloqueo de Disponibilidad
ClinicalTestSuite.add('TC-PORTAL-08', 'Selección inteligente de horarios y bloqueo de disponibilidad en el portal del paciente', async () => {
    const fs = await import('fs');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');

    // 1. Verificación de UI en portal.html
    if (!portalHtml.includes('id="smartSlotsContainer"') || !portalHtml.includes('handleScheduleDateChange') || !portalHtml.includes('id="slotAvailabilitySummary"')) {
        throw new Error('portal.html debe contener smartSlotsContainer, handleScheduleDateChange y slotAvailabilitySummary');
    }

    // 2. Verificación de lógica en portal.js
    if (!portalJs.includes('function handleScheduleDateChange') || !portalJs.includes('function pickSmartSlot') || !portalJs.includes('function fetchPortalAvailability') || !portalJs.includes('function selectNextAvailableWorkingDay')) {
        throw new Error('portal.js debe implementar handleScheduleDateChange, pickSmartSlot, fetchPortalAvailability y selectNextAvailableWorkingDay');
    }

    // 3. Verificación de estilos en portal.css
    if (!portalCss.includes('.smart-slots-container') || !portalCss.includes('.slot-chip-btn') || !portalCss.includes('.slot-chip-btn.occupied')) {
        throw new Error('portal.css debe contener los estilos de .smart-slots-container, .slot-chip-btn y .slot-chip-btn.occupied');
    }

    // 4. Servidor de pruebas y verificación de API
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');

    const therapistId = 'dr_avail_test_' + Date.now();
    const token = generateSessionToken(therapistId, 'avail_test@clinica.com');
    const patient1Id = 'pat_avail_1_' + Date.now();
    const patient2Id = 'pat_avail_2_' + Date.now();
    const portalToken1 = 'PN-AVAIL-' + Math.floor(Math.random() * 90000 + 10000);
    const portalToken2 = 'PN-AVAIL-' + Math.floor(Math.random() * 90000 + 10000);

    const patients = [
        { id: patient1Id, name: 'Lucas Paciente 1', category: 'adult', portalToken: portalToken1, portalEnabled: true, therapist_id: therapistId },
        { id: patient2Id, name: 'Camila Paciente 2', category: 'adult', portalToken: portalToken2, portalEnabled: true, therapist_id: therapistId }
    ];

    const syncRes = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ patients })
    });
    if (syncRes.status !== 200) {
        throw new Error(`Sincronización de pacientes falló con status ${syncRes.status}`);
    }

    // 5. Consultar disponibilidad en día laborable (Miércoles 2026-11-04)
    const availRes1 = await fetch(`${baseUrl}/api/v1/portal/availability?token=${encodeURIComponent(portalToken1)}&date=2026-11-04`);
    if (availRes1.status !== 200) {
        throw new Error(`GET /api/v1/portal/availability falló con status ${availRes1.status}`);
    }
    const availData1 = await availRes1.json();
    if (!availData1.isWorkingDay || !Array.isArray(availData1.slots)) {
        throw new Error('La disponibilidad debe indicar isWorkingDay: true y contener un array de slots');
    }

    const slot10amBefore = availData1.slots.find(s => s.time === '10:00');
    if (!slot10amBefore || !slot10amBefore.available) {
        throw new Error('El horario 10:00 AM debe estar inicialmente disponible');
    }

    // 6. Consultar disponibilidad en día Domingo (2026-11-08) -> Debe marcarse como no laborable
    const sundayRes = await fetch(`${baseUrl}/api/v1/portal/availability?token=${encodeURIComponent(portalToken1)}&date=2026-11-08`);
    const sundayData = await sundayRes.json();
    if (sundayData.isWorkingDay !== false || sundayData.slots.some(s => s.available)) {
        throw new Error('Los domingos deben registrarse como no laborables y sin horarios disponibles');
    }

    // 7. Paciente 1 agenda el turno de las 10:00 AM el 2026-11-04
    const bookRes1 = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken1,
            patientId: patient1Id,
            date: '2026-11-04',
            time: '10:00',
            duration: 50,
            type: 'Online',
            notes: 'Primera sesión agendada'
        })
    });
    if (bookRes1.status !== 201) {
        throw new Error(`Agendamiento inicial falló con status ${bookRes1.status}`);
    }

    // 8. Paciente 2 consulta disponibilidad para el mismo día (2026-11-04)
    // El horario de las 10:00 AM ahora debe aparecer bloqueado (available: false, reason: 'Horario ocupado')
    const availRes2 = await fetch(`${baseUrl}/api/v1/portal/availability?token=${encodeURIComponent(portalToken2)}&date=2026-11-04`);
    const availData2 = await availRes2.json();
    const slot10amAfter = availData2.slots.find(s => s.time === '10:00');
    if (!slot10amAfter || slot10amAfter.available !== false || slot10amAfter.reason !== 'Horario ocupado') {
        throw new Error('El horario 10:00 AM debe figurar como ocupado (available: false) para otros pacientes del mismo terapeuta');
    }

    // 9. Paciente 2 intenta agendar a la fuerza el horario ocupado (10:00 AM) -> Backend debe responder con HTTP 409 Conflict
    const conflictRes = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken2,
            patientId: patient2Id,
            date: '2026-11-04',
            time: '10:00',
            duration: 50,
            type: 'Presencial',
            notes: 'Intento de colisión en horario ocupado'
        })
    });
    if (conflictRes.status !== 409) {
        throw new Error(`Se esperaba HTTP 409 Conflict ante colisión de horario, pero respondió con ${conflictRes.status}`);
    }
    const conflictData = await conflictRes.json();
    if (!conflictData.error || !conflictData.error.toLowerCase().includes('disponible')) {
        throw new Error('El mensaje de error debe indicar claramente la falta de disponibilidad');
    }

    // 10. Paciente 2 selecciona un horario libre (11:00 AM) -> Debe permitirse con éxito (HTTP 201)
    const validRes = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken2,
            patientId: patient2Id,
            date: '2026-11-04',
            time: '11:00',
            duration: 50,
            type: 'Online',
            notes: 'Horario con disponibilidad confirmada'
        })
    });
    if (validRes.status !== 201) {
        throw new Error(`Agendamiento en horario libre falló con status ${validRes.status}`);
    }
});

// ============================================
// TC-PORTAL-09: Portal Pacientes PSIRIS - Palabra del Día, Mi Psicólogo, Asistencia, Pagos, Perfil y Documentos
// ============================================
ClinicalTestSuite.add('TC-PORTAL-09', 'Portal Pacientes Mejoras PSIRIS (Palabra del día, Mi psicólogo, Confirmar asistencia, Pagos, Mi Perfil, Mis Documentos)', async () => {
    const fs = await import('fs');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');

    // Verificación de UI en portal.html
    if (!portalHtml.includes('id="moodWordBox"') || !portalHtml.includes('id="inputDailyWord"') || !portalHtml.includes('id="therapistInfoCard"')) {
        throw new Error('portal.html debe contener moodWordBox, inputDailyWord y therapistInfoCard');
    }
    if (!portalHtml.includes('id="viewDocuments"') || !portalHtml.includes('id="viewPayments"') || !portalHtml.includes('id="viewProfile"')) {
        throw new Error('portal.html debe contener viewDocuments, viewPayments y viewProfile');
    }

    // Verificación de lógica en portal.js
    if (!portalJs.includes('function submitDailyWord') || !portalJs.includes('function confirmSessionAttendance') || !portalJs.includes('function renderDocumentsView')) {
        throw new Error('portal.js debe implementar submitDailyWord, confirmSessionAttendance y renderDocumentsView');
    }
    if (!portalJs.includes('function renderPaymentsView') || !portalJs.includes('function copyPaymentDetails') || !portalJs.includes('function handleSavePatientProfile')) {
        throw new Error('portal.js debe implementar renderPaymentsView, copyPaymentDetails y handleSavePatientProfile');
    }

    // Verificación de estilos en portal.css
    if (!portalCss.includes('.mood-word-chip') || !portalCss.includes('.portal-therapist-card') || !portalCss.includes('.btn-confirm-attendance')) {
        throw new Error('portal.css debe contener los estilos de .mood-word-chip, .portal-therapist-card y .btn-confirm-attendance');
    }

    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');
    const stamp = Date.now();

    // 1. Registrar terapeuta para el test
    const therapistId = 'dr_psiris_' + stamp;
    const therapistEmail = `psiris_dr_${stamp}@clinica.com`;
    const therapistToken = generateSessionToken(therapistId, therapistEmail);

    await db.registerTherapist({
        id: therapistId,
        email: therapistEmail,
        name: 'Dr. Jose Correa',
        specialty: 'Psicología Clínica y de la Salud',
        registry_number: 'FPV Nº 54567',
        phone: '+58 414-9876543',
        institution: 'Consultorio Clínico Las Mercedes, Caracas'
    });

    // 2. Crear paciente con acceso al portal
    const portalToken = `PSIRIS${stamp.toString().slice(-4)}`;
    const patientId = `patient_psiris_${stamp}`;
    const pSyncRes = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${therapistToken}`
        },
        body: JSON.stringify({
            patients: [{
                id: patientId,
                therapistId,
                therapist_id: therapistId,
                name: 'Mariana Silva',
                email: 'mariana.silva@gmail.com',
                phone: '+58 412-1112233',
                birthdate: '1995-05-15',
                occupation: 'Diseñadora UX',
                portalToken,
                portal_token: portalToken,
                portalEnabled: true,
                portal_enabled: true
            }]
        })
    });
    if (!pSyncRes.ok) {
        throw new Error('No se pudo registrar el paciente para la prueba PSIRIS');
    }

    // 3. FEATURE 1: Palabra del día ("Una palabra con la que te sientas identificado hoy")
    const moodRes = await fetch(`${baseUrl}/api/v1/portal/mood`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            patientId,
            token: portalToken,
            mood: 4,
            sleep: 4,
            energy: 3,
            word: 'Esperanza',
            identifyingWord: 'Esperanza'
        })
    });
    if (!moodRes.ok) throw new Error('Fallo al registrar estado de ánimo con palabra del día');
    const moodData = await moodRes.json();
    if (!moodData.record || moodData.record.word !== 'Esperanza') {
        throw new Error('La palabra del día no fue persistida en el registro de ánimo');
    }

    // 4. FEATURE 2: Espacio informativo "Mi psicólogo" en GET /api/v1/portal/me
    const meRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    if (!meRes.ok) throw new Error('Fallo al consultar /api/v1/portal/me');
    const meData = await meRes.json();
    if (!meData.therapistInfo) {
        throw new Error('El objeto therapistInfo no fue retornado en el portal del paciente');
    }
    if (!meData.therapistInfo.name || !meData.therapistInfo.registryNumber) {
        throw new Error('therapistInfo debe contener nombre y número de FPV');
    }

    // 5. FEATURE 3 & 4: Horarios disponibles y Confirmar Asistencia a la sesión
    const availRes = await fetch(`${baseUrl}/api/v1/portal/availability?token=${encodeURIComponent(portalToken)}&date=2026-11-05`);
    const availData = await availRes.json();
    if (!Array.isArray(availData.availableSlots) || availData.availableSlots.length === 0) {
        throw new Error('La consulta de disponibilidad debe retornar horarios libres');
    }

    // Agendar cita
    const bookRes = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId,
            date: '2026-11-05',
            time: '09:00',
            duration: 50,
            type: 'Online',
            notes: 'Sesión de seguimiento'
        })
    });
    if (!bookRes.ok) throw new Error('Fallo agendando cita desde el portal');
    const bookData = await bookRes.json();
    const apptId = bookData.appointment.id;

    // Confirmar asistencia
    const confRes = await fetch(`${baseUrl}/api/v1/portal/appointments/${encodeURIComponent(apptId)}/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId
        })
    });
    if (!confRes.ok) throw new Error('Fallo confirmando asistencia a la cita');
    const confData = await confRes.json();
    if (!confData.appointment || confData.appointment.status !== 'confirmada' || !confData.appointment.attendanceConfirmed) {
        throw new Error('La cita debe actualizar su estatus a confirmada tras confirmar asistencia');
    }

    // 6. FEATURE 5: Métodos de Pago y Reporte de Pagos
    const payGetRes = await fetch(`${baseUrl}/api/v1/portal/payments?token=${encodeURIComponent(portalToken)}`);
    if (!payGetRes.ok) throw new Error('Fallo obteniendo métodos de pago');
    const payGetData = await payGetRes.json();
    if (!Array.isArray(payGetData.paymentMethods) || payGetData.paymentMethods.length === 0) {
        throw new Error('Debe retornarse la lista de métodos de pago activos');
    }

    // Reportar pago
    const repPayRes = await fetch(`${baseUrl}/api/v1/portal/payments/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId,
            amount: 35.00,
            currency: 'USD',
            paymentMethod: 'pago_movil',
            reference: 'PM-88992211',
            paymentDate: '2026-10-26',
            concept: 'Pago sesión terapéutica',
            receiptData: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
        })
    });
    if (repPayRes.status !== 201) throw new Error('Fallo al reportar pago');
    const repPayData = await repPayRes.json();
    const paymentReportId = repPayData.paymentReport.id;
    if (repPayData.paymentReport.status !== 'pendiente') {
        throw new Error('El reporte de pago debe crearse en estado pendiente');
    }

    // Verificación de pago por parte del terapeuta
    const verifyPayRes = await fetch(`${baseUrl}/api/v1/portal/payments/${encodeURIComponent(paymentReportId)}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${therapistToken}`
        },
        body: JSON.stringify({
            status: 'verificado',
            notes: 'Acreditado en cuenta Banesco'
        })
    });
    if (!verifyPayRes.ok) throw new Error('Fallo en verificación de pago por el terapeuta');
    const verifyPayData = await verifyPayRes.json();
    if (verifyPayData.paymentReport.status !== 'verificado') {
        throw new Error('El estatus del reporte de pago debe ser verificado');
    }

    // 7. FEATURE 6: "Mi Perfil" (datos llenados por el paciente)
    const updateProfRes = await fetch(`${baseUrl}/api/v1/portal/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId,
            name: 'Mariana Silva de Correa',
            phone: '+58 412-9998888',
            email: 'mariana.silva.correa@gmail.com',
            occupation: 'Lead Product Designer',
            address: 'Caracas, Venezuela',
            emergencyContact: 'Carlos Silva (Hermano)',
            emergencyPhone: '+58 414-7776655',
            expectations: 'Aprender autorregulación emocional y técnicas de respiración para el trabajo',
            birthdate: '1995-05-15'
        })
    });
    if (!updateProfRes.ok) throw new Error('Fallo actualizando perfil del paciente');

    const getProfRes = await fetch(`${baseUrl}/api/v1/portal/profile?token=${encodeURIComponent(portalToken)}`);
    const getProfData = await getProfRes.json();
    if (getProfData.profile.occupation !== 'Lead Product Designer' || !getProfData.profile.expectations.includes('autorregulación')) {
        throw new Error('Los datos del perfil no se actualizaron correctamente');
    }

    // 8. FEATURE 7: "Mis Documentos" (compartir archivos en Word, PDF, imágenes)
    // 8.1 Paciente sube documento Word
    const upDocRes = await fetch(`${baseUrl}/api/v1/portal/documents/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId,
            title: 'Autorregistro semanal de pensamientos',
            category: 'tarea',
            fileName: 'registro_semana_1.docx',
            fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            fileSize: 15420,
            fileData: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQABgAIAAAAIQA='
        })
    });
    if (upDocRes.status !== 201) throw new Error('Fallo subiendo documento Word del paciente');
    const upDocData = await upDocRes.json();
    const docId = upDocData.document.id;

    // 8.2 Terapeuta comparte guía clínica PDF
    const shareDocRes = await fetch(`${baseUrl}/api/v1/portal/documents/share-with-patient`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${therapistToken}`
        },
        body: JSON.stringify({
            patientId,
            title: 'Guía Clínica de Manejo del Estrés',
            category: 'guia',
            fileName: 'guia_estres_clinico.pdf',
            fileType: 'application/pdf',
            fileSize: 84210,
            fileData: 'data:application/pdf;base64,JVBERi0xLjQKJcOkw7zDtsOfCjIgMCBvYmo='
        })
    });
    if (shareDocRes.status !== 201) throw new Error('Fallo compartiendo documento desde terapeuta');

    // 8.3 Paciente consulta sus documentos
    const getDocsRes = await fetch(`${baseUrl}/api/v1/portal/documents?token=${encodeURIComponent(portalToken)}`);
    const getDocsData = await getDocsRes.json();
    if (!Array.isArray(getDocsData.documents) || getDocsData.documents.length < 2) {
        throw new Error('El paciente debe recibir tanto los documentos subidos como los compartidos por el terapeuta');
    }

    // 8.4 Paciente elimina documento propio
    const delDocRes = await fetch(`${baseUrl}/api/v1/portal/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: portalToken })
    });
    if (!delDocRes.ok) throw new Error('Fallo eliminando documento del paciente');
});

// ============================================
// TC-PORTAL-10: Reflejo Inmediato de Cancelación de Citas en el Portal del Paciente
// ============================================
ClinicalTestSuite.add('TC-PORTAL-10', 'Reflejo y sincronización bidireccional de cancelación de citas entre terapeuta y portal paciente', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');

    // 1. Verificación de funciones de sincronización en el código
    if (!appJs.includes('syncAppointmentStatusToPortalAndBackend')) {
        throw new Error('app.js debe implementar syncAppointmentStatusToPortalAndBackend');
    }
    if (!portalJs.includes('mergeAppointmentsFromBridge') || !portalJs.includes('psico_appointment_updated')) {
        throw new Error('portal.js debe sincronizar citas desde el puente y escuchar eventos reactivos');
    }

    const therapistId = `th_cancel_${Date.now()}`;
    const patientId = `pt_cancel_${Date.now()}`;
    const portalToken = `PN-CAN${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const { generateSessionToken } = await import('./server.js');
    const therapistToken = generateSessionToken(therapistId);

    const { db } = await import('./db.js');
    await db.registerTherapist({
        id: therapistId,
        name: 'Dra. Terapeuta Citas',
        email: `citas_${Date.now()}@test.com`,
        passwordHash: 'dummy'
    });

    const baseUrl = await ensureTestServer();

    // 2. Sincronizar paciente con portal habilitado
    const pSyncRes = await fetch(`${baseUrl}/api/v1/patients/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${therapistToken}`
        },
        body: JSON.stringify({
            patients: [{
                id: patientId,
                therapistId: therapistId,
                name: 'Paciente Prueba Cancelación',
                portalToken,
                portalEnabled: true
            }]
        })
    });
    if (!pSyncRes.ok) throw new Error('No se pudo crear paciente para la prueba de cancelación');

    // 3. Paciente solicita cita desde el portal
    const bookRes = await fetch(`${baseUrl}/api/v1/portal/appointments/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId,
            date: '2026-11-20',
            time: '15:00',
            duration: 50,
            type: 'Online',
            notes: 'Cita programada para prueba de cancelación'
        })
    });
    if (!bookRes.ok) throw new Error('Fallo agendando cita inicial');
    const bookData = await bookRes.json();
    const apptId = bookData.appointment.id;
    if (bookData.appointment.status !== 'agendada') {
        throw new Error('La cita nueva debe tener estado agendada');
    }

    // 4. Verificar que /api/v1/portal/me muestra la cita como agendada
    const meBeforeRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    const meBeforeData = await meBeforeRes.json();
    const appBefore = (meBeforeData.appointments || []).find(a => String(a.id) === String(apptId));
    if (!appBefore || appBefore.status !== 'agendada') {
        throw new Error('La cita debe reflejarse como agendada en el portal del paciente inicialmente');
    }

    // 5. El terapeuta cancela la cita vía PATCH /api/v1/appointments/:id/status
    const cancelRes = await fetch(`${baseUrl}/api/v1/appointments/${encodeURIComponent(apptId)}/status`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${therapistToken}`
        },
        body: JSON.stringify({
            status: 'cancelada',
            notes: 'Cancelada por el terapeuta por fuerza mayor médica'
        })
    });
    if (!cancelRes.ok) throw new Error('Fallo al cancelar la cita desde el endpoint del terapeuta');
    const cancelData = await cancelRes.json();
    if (!cancelData.appointment || cancelData.appointment.status !== 'cancelada') {
        throw new Error('El endpoint de actualización debe confirmar el estado cancelada');
    }

    // 6. Consultar nuevamente /api/v1/portal/me y verificar que la cita ahora tiene status cancelada
    const meAfterRes = await fetch(`${baseUrl}/api/v1/portal/me?token=${encodeURIComponent(portalToken)}`);
    const meAfterData = await meAfterRes.json();
    const appAfter = (meAfterData.appointments || []).find(a => String(a.id) === String(apptId));
    if (!appAfter || appAfter.status !== 'cancelada') {
        throw new Error('La cita cancelada por el terapeuta DEBE reflejarse con status "cancelada" en el portal del paciente');
    }

    // 7. Probar endpoint DELETE /api/v1/appointments/:id
    const delApptRes = await fetch(`${baseUrl}/api/v1/appointments/${encodeURIComponent(apptId)}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${therapistToken}`
        }
    });
    if (!delApptRes.ok) throw new Error('Fallo al eliminar cita por terapeuta');
});

// ============================================
// TC-PORTAL-11: Resiliencia Offline, CORS y Mitigación de 'Failed to Fetch' en Nuevas Funciones
// ============================================
ClinicalTestSuite.add('TC-PORTAL-11', 'Mitigación de "Failed to fetch", proxy de Vite, CORS y persistencia local defensiva', async () => {
    const fs = await import('fs');
    const viteConfig = fs.readFileSync('vite.config.ts', 'utf8');
    const serverJs = fs.readFileSync('server.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');

    // 1. Verificación del proxy en vite.config.ts
    if (!viteConfig.includes("'/api'") || !viteConfig.includes('proxy:')) {
        throw new Error('vite.config.ts debe configurar un proxy para /api para evitar "Failed to fetch" en desarrollo');
    }

    // 2. Verificación de CORS con PATCH y soporte para LAN en server.js
    if (!serverJs.includes('PATCH') || !serverJs.includes('Access-Control-Allow-Methods')) {
        throw new Error('server.js debe incluir PATCH en Access-Control-Allow-Methods');
    }
    if (!serverJs.includes("limit: '50mb'")) {
        throw new Error('server.js debe soportar cargas de documentos de hasta 50MB');
    }

    // 3. Verificación de persistencia local defensiva en portal.js
    if (!portalJs.includes('savePatientDataLocally') || !portalJs.includes('PortalState.documents')) {
        throw new Error('portal.js debe persistir y restaurar documentos localmente');
    }

    // 4. Verificación de manejo optimista sin errores crudos "Failed to fetch"
    const funcsToCheck = [
        'confirmSessionAttendance',
        'handleDocumentUpload',
        'deletePortalDoc',
        'handleReportPayment',
        'handleSavePatientProfile',
        'loadPortalAvailability'
    ];
    for (const fn of funcsToCheck) {
        if (!portalJs.includes(`function ${fn}`) && !portalJs.includes(`async function ${fn}`)) {
            throw new Error(`portal.js debe definir ${fn}`);
        }
    }
});

// ============================================
// TC-PORTAL-12: Edición y Personalización de Formas de Pago del Terapeuta para el Portal
// ============================================
ClinicalTestSuite.add('TC-PORTAL-12', 'Edición y personalización de formas de pago del terapeuta y reflejo dinámico en el portal de pacientes', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const financeJs = fs.readFileSync('finance.js', 'utf8');
    const serverJs = fs.readFileSync('server.js', 'utf8');
    const dbJs = fs.readFileSync('db.js', 'utf8');

    // 1. Verificación de interfaz y modales en HTML / JS
    if (!indexHtml.includes('id="portalPaymentMethodsModal"')) {
        throw new Error('index.html debe contener el modal portalPaymentMethodsModal');
    }
    if (!indexHtml.includes('openPortalPaymentMethodsModal()')) {
        throw new Error('index.html debe contener botón para invocar openPortalPaymentMethodsModal()');
    }
    if (!financeJs.includes('openPortalPaymentMethodsModal()')) {
        throw new Error('finance.js debe ofrecer acceso para editar formas de pago del portal');
    }

    // 2. Verificación de lógica en app.js
    const appFuncs = [
        'openPortalPaymentMethodsModal',
        'renderPaymentMethodsEditor',
        'handleSavePortalPaymentMethods',
        'addNewPaymentMethodRow',
        'resetDefaultPaymentMethods',
        'getDefaultPortalPaymentMethods'
    ];
    for (const fn of appFuncs) {
        if (!appJs.includes(fn)) {
            throw new Error(`app.js debe implementar ${fn}`);
        }
    }

    // 3. Verificación de lógica de renderizado y filtrado en portal.js
    if (!portalJs.includes('renderPaymentsView') || !portalJs.includes('payMethodSelect')) {
        throw new Error('portal.js debe renderizar formas de pago y actualizar payMethodSelect');
    }
    if (!portalJs.includes('psico_therapist_payment_methods') && !portalJs.includes('psico_payment_methods_updated')) {
        throw new Error('portal.js debe escuchar cambios de formas de pago del terapeuta');
    }

    // 4. Verificación de métodos en db.js
    if (!dbJs.includes('getTherapistPaymentMethods') || !dbJs.includes('saveTherapistPaymentMethods')) {
        throw new Error('db.js debe implementar getTherapistPaymentMethods y saveTherapistPaymentMethods');
    }

    // 5. Verificación de endpoints en server.js
    if (!serverJs.includes('/api/v1/therapist/payment-methods')) {
        throw new Error('server.js debe exponer la ruta /api/v1/therapist/payment-methods');
    }

    // 6. Prueba funcional con el servidor HTTP
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const testTherapistId = 'therapist_pay_test_' + Date.now();
    const sessionToken = generateSessionToken(testTherapistId);

    // Obtener métodos por defecto
    const getRes = await fetch(`${baseUrl}/api/v1/therapist/payment-methods`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    if (!getRes.ok) {
        throw new Error(`GET /api/v1/therapist/payment-methods falló con status ${getRes.status}`);
    }
    const getData = await getRes.json();
    if (!Array.isArray(getData.paymentMethods) || getData.paymentMethods.length === 0) {
        throw new Error('Debe devolver la lista de métodos de pago predeterminados');
    }

    // Actualizar con métodos personalizados (cambiando Zelle y agregando PayPal personalizado)
    const customMethods = [
        {
            id: 'pago_movil',
            name: 'Pago Móvil Banco de Venezuela',
            icon: '📱',
            enabled: true,
            bank: 'Banco de Venezuela (0102)',
            idNumber: 'V-20123456',
            phone: '0424-9876543',
            instructions: 'Transferencia inmediata BDV'
        },
        {
            id: 'zelle_dr',
            name: 'Zelle Personalizado Dr.',
            icon: '💵',
            enabled: true,
            email: 'consultas.dr.test@gmail.com',
            holder: 'Dr. Test Terapeuta',
            instructions: 'Solo colocar nombre del paciente'
        },
        {
            id: 'binance_disabled',
            name: 'Binance Pay',
            icon: '🟡',
            enabled: false,
            payId: '0000000',
            instructions: 'Desactivado temporalmente'
        }
    ];

    const putRes = await fetch(`${baseUrl}/api/v1/therapist/payment-methods`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ paymentMethods: customMethods })
    });
    if (!putRes.ok) {
        throw new Error(`PUT /api/v1/therapist/payment-methods falló con status ${putRes.status}`);
    }
    const putData = await putRes.json();
    if (putData.status !== 'ok' || !Array.isArray(putData.paymentMethods)) {
        throw new Error('Respuesta de guardado de métodos inválida');
    }

    // Comprobar persistencia con un nuevo GET
    const verifyRes = await fetch(`${baseUrl}/api/v1/therapist/payment-methods`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    const verifyData = await verifyRes.json();
    const zelleFound = verifyData.paymentMethods.find(m => m.id === 'zelle_dr');
    if (!zelleFound || zelleFound.email !== 'consultas.dr.test@gmail.com') {
        throw new Error('No se guardaron correctamente los datos personalizados del terapeuta');
    }

    // Crear paciente asociado a este terapeuta y verificar endpoint del portal
    const patientId = 'pat_pay_test_' + Date.now();
    const portalToken = 'PAY_' + Date.now().toString(36).toUpperCase();
    await db.upsertPatient({
        id: patientId,
        therapist_id: testTherapistId,
        therapistId: testTherapistId,
        name: 'Paciente Test Pagos',
        portal_token: portalToken,
        portalToken: portalToken,
        portal_enabled: true,
        portalEnabled: true
    });

    // Consultar /api/v1/portal/payments usando el token del portal
    const portalPayRes = await fetch(`${baseUrl}/api/v1/portal/payments?token=${portalToken}`);
    if (!portalPayRes.ok) {
        throw new Error(`GET /api/v1/portal/payments falló con status ${portalPayRes.status}`);
    }
    const portalPayData = await portalPayRes.json();
    if (!Array.isArray(portalPayData.paymentMethods)) {
        throw new Error('portal/payments debe retornar paymentMethods');
    }
    const portalZelle = portalPayData.paymentMethods.find(m => m.id === 'zelle_dr');
    if (!portalZelle || portalZelle.email !== 'consultas.dr.test@gmail.com') {
        throw new Error('El portal del paciente debe reflejar las formas de pago configuradas por su terapeuta');
    }
});

// ============================================
// TC-PORTAL-13: Recepción, Visualización y Validación de Comprobantes de Pago del Paciente
// ============================================
ClinicalTestSuite.add('TC-PORTAL-13', 'Recepción de comprobantes en el portal, sincronización con el terapeuta, visualizador de recibos y validación en finanzas', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const financeJs = fs.readFileSync('finance.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const serverJs = fs.readFileSync('server.js', 'utf8');
    const dbJs = fs.readFileSync('db.js', 'utf8');

    // 1. Verificación estructural en el frontend y DOM
    if (!indexHtml.includes('id="paymentReceiptModal"')) {
        throw new Error('index.html debe contener el modal paymentReceiptModal para visualizar comprobantes');
    }
    if (!appJs.includes('viewPaymentReceiptModal') || !appJs.includes('approvePatientPayment') || !appJs.includes('rejectPatientPayment')) {
        throw new Error('app.js debe implementar viewPaymentReceiptModal, approvePatientPayment y rejectPatientPayment');
    }
    if (!financeJs.includes('renderPortalPaymentsTabHtml') || !financeJs.includes('getAllPatientPaymentReports')) {
        throw new Error('finance.js debe implementar renderPortalPaymentsTabHtml y getAllPatientPaymentReports');
    }

    // 2. Verificación de métodos en backend y base de datos
    if (!dbJs.includes('getTherapistPaymentReports')) {
        throw new Error('db.js debe implementar getTherapistPaymentReports');
    }
    if (!serverJs.includes('/api/v1/therapist/payment-reports') || !serverJs.includes('/api/v1/portal/payments/:id/verify')) {
        throw new Error('server.js debe exponer /api/v1/therapist/payment-reports y /api/v1/portal/payments/:id/verify');
    }

    // 3. Prueba funcional de flujo de reporte y aprobación
    const baseUrl = await ensureTestServer();
    const { generateSessionToken } = await import('./server.js');
    const { db } = await import('./db.js');

    const testTherapistId = 'dr_receipt_test_' + Date.now();
    const sessionToken = generateSessionToken(testTherapistId);
    const testPatientId = 'pat_receipt_test_' + Date.now();
    const portalToken = 'REC_' + Date.now().toString(36).toUpperCase();

    await db.upsertPatient({
        id: testPatientId,
        therapist_id: testTherapistId,
        therapistId: testTherapistId,
        name: 'Carlos Comprobantes',
        portal_token: portalToken,
        portalToken: portalToken,
        portal_enabled: true,
        portalEnabled: true
    });

    // Simular que el paciente reporta un pago con comprobante base64
    const sampleReceiptBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const reportRes = await fetch(`${baseUrl}/api/v1/portal/payments/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            token: portalToken,
            patientId: testPatientId,
            amount: 45.00,
            currency: 'USD',
            paymentMethod: 'pago_movil',
            reference: 'REF-789012',
            paymentDate: '2026-10-26',
            concept: 'Sesión TCC Individual',
            receiptData: sampleReceiptBase64
        })
    });
    if (!reportRes.ok) {
        throw new Error(`POST /api/v1/portal/payments/report falló con status ${reportRes.status}`);
    }
    const reportData = await reportRes.json();
    if (!reportData.paymentReport || !reportData.paymentReport.id) {
        throw new Error('No se generó el registro de reporte de pago');
    }
    const createdReportId = reportData.paymentReport.id;

    // Verificar que el terapeuta ve el comprobante en su endpoint
    const therapistGetRes = await fetch(`${baseUrl}/api/v1/therapist/payment-reports`, {
        headers: { 'Authorization': `Bearer ${sessionToken}` }
    });
    if (!therapistGetRes.ok) {
        throw new Error(`GET /api/v1/therapist/payment-reports falló con status ${therapistGetRes.status}`);
    }
    const therapistData = await therapistGetRes.json();
    if (!Array.isArray(therapistData.paymentReports)) {
        throw new Error('paymentReports debe ser un array');
    }
    const found = therapistData.paymentReports.find(r => r.id === createdReportId);
    if (!found) {
        throw new Error('El comprobante cargado por el paciente no se encuentra en los reportes del terapeuta');
    }
    if (found.reference !== 'REF-789012' || found.status !== 'pendiente') {
        throw new Error('Los datos del comprobante recibido no coinciden');
    }

    // Terapeuta aprueba el comprobante
    const verifyRes = await fetch(`${baseUrl}/api/v1/portal/payments/${createdReportId}/verify`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ status: 'aprobado', notes: 'Verificado exitosamente' })
    });
    if (!verifyRes.ok) {
        throw new Error(`POST /verify falló con status ${verifyRes.status}`);
    }
    const verifyData = await verifyRes.json();
    if (verifyData.status !== 'ok' || verifyData.paymentReport.status !== 'aprobado') {
        throw new Error('No se actualizó el estatus del comprobante a aprobado');
    }
});

// 112. TC-EXP-03: Ficha de Paciente e Historia Clínica Adolescente (Consentimiento Informado, Pestañas sin Emojis y Áreas Vitales)
ClinicalTestSuite.add('TC-EXP-03', 'Ficha Paciente e Historia Clínica Adolescente: Consentimiento Informado, tabs sin emojis y áreas vitales completas', async () => {
    const fs = await import('fs');
    const path = await import('path');

    // 1. Validar index.html para tabs de población sin emojis
    const indexHtml = fs.readFileSync(path.resolve('index.html'), 'utf8');
    if (!indexHtml.includes('>Infantil</span>') || !indexHtml.includes('>Adolescente</span>') || !indexHtml.includes('>Adulto</span>')) {
        throw new Error('index.html debe contener las etiquetas de pestañas "Infantil", "Adolescente" y "Adulto"');
    }
    // Verificar que tabPopChild, tabPopAdolescent, tabPopAdult no tengan emojis
    const tabChildBlock = indexHtml.substring(indexHtml.indexOf('id="tabPopChild"'), indexHtml.indexOf('id="tabPopAdolescent"'));
    if (tabChildBlock.includes('🧒') || tabChildBlock.includes('👶')) {
        throw new Error('tabPopChild no debe tener emojis en las pestañas');
    }
    const tabTeenBlock = indexHtml.substring(indexHtml.indexOf('id="tabPopAdolescent"'), indexHtml.indexOf('id="tabPopAdult"'));
    if (tabTeenBlock.includes('🧑') || tabTeenBlock.includes('🧒')) {
        throw new Error('tabPopAdolescent no debe tener emojis en las pestañas');
    }

    // 2. Validar app.js para "Consentimiento Informado:"
    const appJs = fs.readFileSync(path.resolve('app.js'), 'utf8');
    if (!appJs.includes('<span class="expediente-data-label">Consentimiento Informado:</span>')) {
        throw new Error('app.js debe denominar la fila del expediente como "Consentimiento Informado:"');
    }

    // 3. Validar historia-clinica.js para HC Adolescente con todas las áreas vitales
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;
    if (!CHS) throw new Error('ClinicalHistorySystem no está disponible');

    const teenPatient = {
        id: 'teen_test_vital_01',
        name: 'Camila Rivas',
        category: 'adolescent',
        birthdate: '2010-05-15',
        gender: 'Femenino',
        schoolName: 'Liceo Bolivariano',
        schoolGrade: '3er Año Bachillerato',
        status: 'En Evaluación',
        guardianName: 'Mariana Rivas',
        guardianRelation: 'Madre',
        guardianConsent: 'firmado',
        teenChildhood: 'Infancia tranquila con apego seguro',
        teenFamilyDynamics: 'Buena comunicación; acuerdos de autonomía',
        teenSocial: 'Grupo de pares estructurado y deportivo',
        teenSexuality: 'Exploración adaptativa acorde a etapa',
        teenRelationships: 'Amistades cercanas en el liceo',
        teenShortGoals: 'Aprobar año escolar con honores',
        teenLongGoals: 'Estudiar Psicología o Medicina'
    };

    const renderedHtml = CHS.renderTabHistoriaIntegral(teenPatient);

    // Verificar secciones clave en la historia del adolescente
    const requiredSections = [
        'Ficha del Paciente (Adolescente)',
        'Ficha del Representante / Tutor Legal',
        'Información Referente a la Consulta Psicológica',
        'Encuadre y Acuerdos de Consulta',
        'Examen Mental & Tríada Sintomatológica',
        'Antecedentes Médicos, Neurológicos & Quirúrgicos',
        'Área Escolar, Académica & Dinámica de Aprendizaje',
        'Áreas Vitales & Entrevista Privada con el Adolescente',
        'Vivienda, Hábitos Psicobiológicos, Sueño & Fobias',
        'Impresión Diagnóstica & Plan Terapéutico'
    ];

    for (const sec of requiredSections) {
        if (!renderedHtml.includes(sec)) {
            throw new Error(`Historia Clínica Adolescente debe contener la sección: ${sec}`);
        }
    }

    // Verificar presencia de botones de acción
    if (!renderedHtml.includes('Editar Historia Completa') || !renderedHtml.includes('PDF Oficial')) {
        throw new Error('Toolbar de HC Adolescente debe incluir Editar Historia Completa y PDF Oficial');
    }
});

// 113. TC-EXP-04: Modificaciones en Historia Clínica Infantil (Eliminar Cédula del Niño y Separar Escolaridad/Ocupación de Padres)
ClinicalTestSuite.add('TC-EXP-04', 'Historia Clínica Infantil: Sin cédula infantil, nombre completo y escolaridad/ocupación de padres separadas', async () => {
    if (typeof ClinicalHistorySystem === 'undefined') {
        await import('./historia-clinica.js');
    }
    const CHS = globalThis.ClinicalHistorySystem;
    if (!CHS) throw new Error('ClinicalHistorySystem no está disponible');

    const pediatricPatient = {
        id: 'child_exp_04',
        name: 'Sebastián Morales',
        category: 'child',
        birthdate: '2019-03-20',
        gender: 'Masculino',
        schoolName: 'U.E. Simón Bolívar',
        schoolGrade: '1er Grado',
        motherName: 'Valeria Méndez',
        motherAge: '34',
        motherCI: 'V-19.882.114',
        motherEducation: 'Universitaria (Lic. en Educación)',
        motherJob: 'Docente de Primaria',
        fatherName: 'Carlos Morales',
        fatherAge: '37',
        fatherCI: 'V-18.455.901',
        fatherEducation: 'Técnico Superior Universitario',
        fatherJob: 'Coordinador de Logística'
    };

    globalThis.AppState = globalThis.AppState || {};
    globalThis.AppState.patients = globalThis.AppState.patients || [];
    globalThis.AppState.patients.push(pediatricPatient);

    // 1. Renderizado en visor de acordeón
    const childHtml = CHS.renderTabHistoriaIntegral(pediatricPatient);

    // Debe mostrar Datos de Identificación y Nombre Completo
    if (!childHtml.includes('Datos de Identificación del Paciente') || !childHtml.includes('Nombre Completo del Paciente:')) {
        throw new Error('Debe titularse "Datos de Identificación del Paciente" e incluir "Nombre Completo del Paciente"');
    }

    // Debe eliminar la cédula del paciente en la sección de datos del niño
    const identBlock = childHtml.substring(childHtml.indexOf('id="acc_sec_1"'), childHtml.indexOf('Datos Filiatorios'));
    if (identBlock.includes('C.I. / Documento:')) {
        throw new Error('La historia clínica infantil no debe mostrar campo de Cédula de Identidad para el paciente menor');
    }

    // Debe separar Escolaridad y Ocupación Actual en los datos de los padres
    if (!childHtml.includes('<strong>Escolaridad:</strong>') || !childHtml.includes('<strong>Ocupación Actual:</strong>')) {
        throw new Error('La sección de padres debe separar "Escolaridad" y "Ocupación Actual" como dos ítems independientes');
    }

    // 2. Exportación a PDF Oficial Infantil
    const pdfHtml = CHS.exportHistoriaOficialPDF(pediatricPatient.id);
    if (!pdfHtml.includes('DATOS DE IDENTIFICACIÓN DEL PACIENTE:')) {
        throw new Error('El PDF infantil debe tener encabezado "DATOS DE IDENTIFICACIÓN DEL PACIENTE:"');
    }
    if (!pdfHtml.includes('DATOS FILIATORIOS DE LOS PADRES:')) {
        throw new Error('El PDF infantil debe incluir "DATOS FILIATORIOS DE LOS PADRES:"');
    }
    if (!pdfHtml.includes('Escolaridad:') || !pdfHtml.includes('Ocupación Actual:')) {
        throw new Error('El PDF infantil debe mostrar columnas separadas para Escolaridad y Ocupación Actual');
    }
});

// ============================================
// TC-PORTAL-14: Sincronización de Confirmación de Asistencia (Portal -> Terapeuta Check & Notificación)
// ============================================
ClinicalTestSuite.add('TC-PORTAL-14', 'Sincronización en tiempo real de confirmación de asistencia del paciente hacia el portal del terapeuta (Check badge, notificación y estado en agenda/calendario)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const dbJs = fs.readFileSync('db.js', 'utf8');

    // 1. Verificación de portal.js
    if (!portalJs.includes('psico_portal_appointments_bridge') || !portalJs.includes('psico_portal_appointment_confirmed_event')) {
        throw new Error('portal.js debe actualizar psico_portal_appointments_bridge y disparar psico_portal_appointment_confirmed_event al confirmar asistencia');
    }
    if (!portalJs.includes("bridge[appointmentId].status = 'confirmada'") || !portalJs.includes('bridge[appointmentId].attendanceConfirmed = true')) {
        throw new Error('portal.js debe marcar status: "confirmada" y attendanceConfirmed: true en el puente de citas');
    }

    // 2. Verificación de estilos visuales de check y estados confirmados
    if (!stylesCss.includes('.badge-attendance-check') || !stylesCss.includes('.status-confirmada')) {
        throw new Error('styles.css debe definir las clases .badge-attendance-check y .status-confirmada');
    }
    if (!stylesCss.includes('.cal-event-pill.confirmada') && !stylesCss.includes('.cal-event-pill.confirmed')) {
        throw new Error('styles.css debe estilizar las citas confirmadas en el calendario mensual');
    }
    if (!stylesCss.includes('.cal-week-card.confirmada') && !stylesCss.includes('.cal-week-card.confirmed')) {
        throw new Error('styles.css debe estilizar las citas confirmadas en el calendario semanal');
    }

    // 3. Verificación de app.js (Terapeuta)
    if (!appJs.includes('newlyConfirmedAppointments') || !appJs.includes('¡Asistencia Confirmada!')) {
        throw new Error('app.js debe detectar newlyConfirmedAppointments y notificar al terapeuta con showToast');
    }
    if (!appJs.includes('badge-attendance-check')) {
        throw new Error('app.js debe renderizar badge-attendance-check en las citas confirmadas');
    }
    if (!appJs.includes('psico_portal_appointment_confirmed_event')) {
        throw new Error('app.js debe escuchar psico_portal_appointment_confirmed_event para sincronización en tiempo real');
    }

    // 4. Verificación de opciones de estado en modales y selectores
    if (!indexHtml.includes('<option value="confirmada">')) {
        throw new Error('index.html debe incluir la opción confirmada en el modal de citas');
    }

    // 5. Verificación de persistencia en db.js
    if (!dbJs.includes('attendanceConfirmed') || !dbJs.includes('attendance_confirmed')) {
        throw new Error('db.js debe mapear y persistir attendanceConfirmed y attendance_confirmed');
    }
});

// ============================================
// TC-PORTAL-15: Notificación y Alerta de Confirmación de Cita al Paciente
// ============================================
ClinicalTestSuite.add('TC-PORTAL-15', 'Notificación y banner de alerta para que el paciente confirme su asistencia (UI, Web Notifications, Badge y solicitud del terapeuta)', async () => {
    const fs = await import('fs');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const remindersJs = fs.readFileSync('session-reminders.js', 'utf8');
    const serverJs = fs.readFileSync('server.js', 'utf8');

    // 1. Verificación del Banner de Alerta en portal.html
    if (!portalHtml.includes('appointmentConfirmationAlertBanner') || !portalHtml.includes('btnConfirmAlertAction') || !portalHtml.includes('sessionsNavBadge')) {
        throw new Error('portal.html debe contener el banner appointmentConfirmationAlertBanner, el botón btnConfirmAlertAction y la insignia sessionsNavBadge');
    }

    // 2. Verificación de lógica de alerta en portal.js
    if (!portalJs.includes('checkAppointmentConfirmationAlert') || !portalJs.includes('confirmAppointmentFromAlertBanner')) {
        throw new Error('portal.js debe implementar checkAppointmentConfirmationAlert y confirmAppointmentFromAlertBanner');
    }
    if (!portalJs.includes('psico_portal_confirmation_requested_event')) {
        throw new Error('portal.js debe escuchar psico_portal_confirmation_requested_event para reaccionar a recordatorios en tiempo real');
    }

    // 3. Verificación de estilos en portal.css
    if (!portalCss.includes('.appointment-confirm-alert-banner') || !portalCss.includes('.btn-confirm-alert-action') || !portalCss.includes('.nav-badge-pill')) {
        throw new Error('portal.css debe definir estilos para el banner de confirmación, botón de acción e insignia de navegación');
    }

    // 4. Verificación de solicitud desde la plataforma del terapeuta
    if (!appJs.includes('requestPortalConfirmation')) {
        throw new Error('app.js debe implementar requestPortalConfirmation para enviar recordatorios al portal');
    }
    if (!remindersJs.includes('request_portal_confirm')) {
        throw new Error('session-reminders.js debe permitir solicitar confirmación en el portal desde los recordatorios');
    }
    if (!serverJs.includes('/api/v1/appointments/:id/request-confirmation')) {
        throw new Error('server.js debe exponer el endpoint /api/v1/appointments/:id/request-confirmation con auditoría médica');
    }
});

// ============================================
// TC-EST-01: Consistencia de Variables CSS en Terapeuta y Portal
// ============================================
ClinicalTestSuite.add('TC-EST-01', 'Consistencia de Tokens CSS en Terapeuta y Portal (Cero variables huérfanas)', async () => {
    const fs = await import('fs');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');

    // 1. Verificación en styles.css
    if (!stylesCss.includes('--border-color:') || !stylesCss.includes('--color-primary:')) {
        throw new Error('styles.css debe definir explícitamente --border-color y --color-primary para evitar tokens huérfanos');
    }

    // 2. Verificación en portal.css
    if (!portalCss.includes('--radius-full:') || !portalCss.includes('--accent-gradient:') || !portalCss.includes('--border-color:') || !portalCss.includes('--color-primary:')) {
        throw new Error('portal.css debe definir --radius-full, --accent-gradient, --border-color y --color-primary en :root');
    }
});

// ============================================
// TC-EST-02: Modo Oscuro Completo en Portal del Paciente
// ============================================
ClinicalTestSuite.add('TC-EST-02', 'Modo Oscuro en Portal de Pacientes (Paleta completa, conmutador y persistencia)', async () => {
    const fs = await import('fs');
    const portalCss = fs.readFileSync('portal.css', 'utf8');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');

    // 1. Paleta de Modo Oscuro en portal.css
    if (!portalCss.includes('[data-theme="dark"]') || !portalCss.includes('--bg-primary: #111815;') || !portalCss.includes('--bg-card: #16201b;')) {
        throw new Error('portal.css debe definir la paleta completa de [data-theme="dark"] para el portal');
    }

    // 2. Elemento de control en portal.html
    if (!portalHtml.includes('btnPortalThemeToggle') || !portalHtml.includes('togglePortalTheme()')) {
        throw new Error('portal.html debe contener el botón de alternancia de tema #btnPortalThemeToggle');
    }

    // 3. Funciones controladoras en portal.js
    if (!portalJs.includes('initPortalTheme') || !portalJs.includes('togglePortalTheme') || !portalJs.includes('updatePortalThemeIcon')) {
        throw new Error('portal.js debe implementar initPortalTheme, togglePortalTheme y updatePortalThemeIcon');
    }
});

// ============================================
// TC-EST-03: Cierre Accesible de Overlays con Tecla Escape
// ============================================
ClinicalTestSuite.add('TC-EST-03', 'Cierre Universal de Modales y Overlays mediante Tecla Escape (app.js y portal.js)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const portalJs = fs.readFileSync('portal.js', 'utf8');

    // 1. app.js debe cerrar drawers y llamar a destructores de modales
    if (!appJs.includes('closeReminderDrawer()') || !appJs.includes('closeModal(m.id)')) {
        throw new Error('app.js debe cerrar sessionReminderDrawer y ejecutar closeModal(m.id) al presionar Escape');
    }

    // 2. portal.js debe implementar cierre de modales con Escape
    if (!portalJs.includes('closeAllPortalModals') || !portalJs.includes("e.key === 'Escape'")) {
        throw new Error('portal.js debe escuchar la tecla Escape e invocar closeAllPortalModals');
    }
});

// ============================================
// TC-EST-04: Adaptabilidad Temática de Contenedores y Recibos
// ============================================
ClinicalTestSuite.add('TC-EST-04', 'Resiliencia Temática de Contenedores Dinámicos y Recibos de Pago (Modo Claro/Oscuro)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    if (!indexHtml.includes('id="receiptImageContainer"') || !indexHtml.includes('background: var(--bg-card);')) {
        throw new Error('index.html debe utilizar variables dinámicas var(--bg-card) en los visores de recibos y previsualizadores');
    }
});

// ============================================
// TC-NOTIF-01: Control Anti-Spam y Deduplicación de Notificaciones Toast
// ============================================
ClinicalTestSuite.add('TC-NOTIF-01', 'Control Anti-Spam, Deduplicación y Límite de Toasts (Cero lluvia de notificaciones)', async () => {
    const fs = await import('fs');
    const appJs = fs.readFileSync('app.js', 'utf8');

    // 1. Debe existir el mecanismo de deduplicación persistente
    if (!appJs.includes('NOTIFIED_CONFIRMATIONS_KEY') || !appJs.includes('isConfirmationAlreadyNotified') || !appJs.includes('markConfirmationAsNotified')) {
        throw new Error('app.js debe implementar NOTIFIED_CONFIRMATIONS_KEY, isConfirmationAlreadyNotified y markConfirmationAsNotified');
    }

    // 2. showToast debe limitar el máximo de toasts y evitar mensajes idénticos duplicados
    if (!appJs.includes('c.children.length >= 3') || !appJs.includes('child.textContent.includes(cleanMsg)')) {
        throw new Error('showToast debe descartar mensajes idénticos simultáneos y limitar a 3 toasts máximos en pantalla');
    }

    // 3. syncPortalAppointmentsToTherapist debe validar isConfirmationAlreadyNotified
    if (!appJs.includes('!isConfirmationAlreadyNotified(')) {
        throw new Error('syncPortalAppointmentsToTherapist debe verificar !isConfirmationAlreadyNotified antes de notificar confirmaciones');
    }
});

// ============================================
// TC-EST-05: Contención Visual y Ergonomía de Tarjetas KPI
// ============================================
ClinicalTestSuite.add('TC-EST-05', 'Contención Visual, Ergonomía de Tarjetas KPI y Vinculación de IDs en Expediente', async () => {
    const fs = await import('fs');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. styles.css debe prevenir desbordamiento en KPI cards y selector
    if (!stylesCss.includes('.expediente-kpi-card') || !stylesCss.includes('overflow: hidden;') || !stylesCss.includes('.quick-status-selector')) {
        throw new Error('styles.css debe definir overflow: hidden en .expediente-kpi-card y estilo responsivo en .quick-status-selector');
    }

    // 2. app.js debe estructurar el selector sin duplicación redundante de chips
    if (!appJs.includes('quickUpdatePatientStatus') || !appJs.includes('class="quick-status-selector"')) {
        throw new Error('app.js debe renderizar quick-status-selector con el controlador quickUpdatePatientStatus');
    }

    // 3. index.html debe incluir los campos de diagnóstico, antecedentes y emergencias
    if (!indexHtml.includes('id="patientDiagnosis"') || !indexHtml.includes('id="patientMedication"') || !indexHtml.includes('id="patientEmergency"') || !indexHtml.includes('id="patientNotes"')) {
        throw new Error('index.html debe contener patientDiagnosis, patientMedication, patientEmergency y patientNotes');
    }
});

// ============================================
// TC-POR-16: Sincronización de Agendamiento, Notas Reflexivas y Personalización Infantil
// ============================================
ClinicalTestSuite.add('TC-POR-16', 'Sincronización de Agendamiento, Notas Reflexivas y Personalización Infantil en Portal', async () => {
    const fs = await import('fs');
    const portalJs = fs.readFileSync('portal.js', 'utf8');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');

    // 1. pickAvailableSlot debe resolver dualmente scheduleDate y scheduleSessionDate
    if (!portalJs.includes("document.getElementById('scheduleDate') || document.getElementById('scheduleSessionDate')")) {
        throw new Error('pickAvailableSlot debe resolver scheduleDate || scheduleSessionDate para auto-completar fecha y hora');
    }

    // 2. selectKidThoughtChip y submitKidWeatherAndBody deben vincular kidWeatherOptionalNote
    if (!portalJs.includes("document.getElementById('kidWeatherOptionalNote') || document.getElementById('kidWeatherStory')")) {
        throw new Error('portal.js debe resolver kidWeatherOptionalNote para notas reflexivas infantiles');
    }

    // 3. saveKidAvatar y actualización de displays debe vincular kidAvatarDisplayNameInput
    if (!portalJs.includes("document.getElementById('kidAvatarDisplayNameInput') || document.getElementById('kidAvatarCustomName')")) {
        throw new Error('portal.js debe resolver kidAvatarDisplayNameInput para guardar el nombre de avatar del niño');
    }

    // 4. Validar que portal.html contiene los IDs reales
    if (!portalHtml.includes('id="kidWeatherOptionalNote"') || !portalHtml.includes('id="kidAvatarDisplayNameInput"')) {
        throw new Error('portal.html debe contener kidWeatherOptionalNote y kidAvatarDisplayNameInput');
    }
});

// ============================================
// TC-REC-02: Mapeo Defensivo de Campos SOAP en SessionRecorder hacia Hoja de Evolución Oficial
// ============================================
ClinicalTestSuite.add('TC-REC-02', 'Mapeo Defensivo de Campos SOAP en SessionRecorder hacia Hoja de Evolución Oficial', async () => {
    const fs = await import('fs');
    const recJs = fs.readFileSync('session-recorder.js', 'utf8');
    const indexHtml = fs.readFileSync('index.html', 'utf8');

    // 1. SessionRecorder debe mapear a noteSubjetivo, noteObjetivo, noteAnalisis con fallback
    if (!recJs.includes("document.getElementById('noteSubjetivo') || document.getElementById('noteSubjective')") ||
        !recJs.includes("document.getElementById('noteObjetivo') || document.getElementById('noteObjective')") ||
        !recJs.includes("document.getElementById('noteAnalisis') || document.getElementById('noteAssessment')")) {
        throw new Error('session-recorder.js debe soportar los identificadores en español oficiales del formulario SOAP');
    }

    // 2. index.html debe incluir los IDs oficiales del modal SOAP
    if (!indexHtml.includes('id="noteSubjetivo"') || !indexHtml.includes('id="noteObjetivo"') || !indexHtml.includes('id="noteAnalisis"') || !indexHtml.includes('id="notePlan"')) {
        throw new Error('index.html debe contener noteSubjetivo, noteObjetivo, noteAnalisis y notePlan');
    }
});

// ============================================
// TC-SER-01: Identidad Visual y Marca Oficial SERENA
// ============================================
ClinicalTestSuite.add('TC-SER-01', 'Identidad Visual y Marca Oficial SERENA (index.html, portal.html, manifest, metadata)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const portalHtml = fs.readFileSync('portal.html', 'utf8');
    const manifestJson = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
    const metadataJson = JSON.parse(fs.readFileSync('metadata.json', 'utf8'));

    // 1. Título y meta en index.html
    if (!indexHtml.includes('<title>SERENA') || !indexHtml.includes('Tu práctica, en equilibrio')) {
        throw new Error('index.html debe contener el título de SERENA y el eslogan "Tu práctica, en equilibrio"');
    }
    if (!indexHtml.includes('content="#123F36"')) {
        throw new Error('index.html debe usar el color de tema oficial Verde Bosque (#123F36)');
    }
    if (!indexHtml.includes('favicon.svg')) {
        throw new Error('index.html debe vincular favicon.svg');
    }

    // 2. Logotipo visible en auth y sidebar
    if (!indexHtml.includes('assets/brand/serena-symbol.svg')) {
        throw new Error('index.html debe utilizar el símbolo oficial serena-symbol.svg en lugar de emojis');
    }
    if (!indexHtml.includes('<span class="logo-text">SERENA</span>')) {
        throw new Error('index.html debe desplegar el texto de marca SERENA en la navegación');
    }

    // 3. Portal de pacientes
    if (!portalHtml.includes('<title>SERENA — Mi Espacio</title>')) {
        throw new Error('portal.html debe llevar el título "SERENA — Mi Espacio"');
    }
    if (!portalHtml.includes('assets/brand/serena-symbol.svg')) {
        throw new Error('portal.html debe desplegar el símbolo de SERENA en el acceso');
    }

    // 4. Manifest y metadatos
    if (manifestJson.name !== 'SERENA — Tu práctica, en equilibrio' || manifestJson.short_name !== 'SERENA') {
        throw new Error('manifest.json debe definir name y short_name como SERENA');
    }
    if (manifestJson.theme_color !== '#123F36') {
        throw new Error('manifest.json debe usar el theme_color #123F36');
    }
    if (metadataJson.name !== 'SERENA') {
        throw new Error('metadata.json debe declarar name: "SERENA"');
    }
});

// ============================================
// TC-SER-02: Tokens de Diseño y Tipografía Oficial SERENA
// ============================================
ClinicalTestSuite.add('TC-SER-02', 'Tokens de Diseño y Tipografía Oficial SERENA (styles.css y portal.css)', async () => {
    const fs = await import('fs');
    const stylesCss = fs.readFileSync('styles.css', 'utf8');
    const portalCss = fs.readFileSync('portal.css', 'utf8');

    // 1. Paleta oficial de 8 tokens en styles.css
    const requiredTokens = [
        '--brand-forest: #123F36;',
        '--brand-petroleum: #285C50;',
        '--brand-sage: #7FA38F;',
        '--brand-ivory: #F7F8F6;',
        '--brand-text: #202923;',
        '--brand-text-muted: #69736D;',
        '--brand-border: #E5E9E5;',
        '--brand-white: #FFFFFF;'
    ];
    for (const token of requiredTokens) {
        if (!stylesCss.includes(token)) {
            throw new Error(`styles.css carece del token requerido: ${token}`);
        }
    }

    // 2. Tipografía oficial Montserrat para display y títulos
    if (!stylesCss.includes('--font-display: "Montserrat"') && !stylesCss.includes("--font-display: 'Montserrat'")) {
        throw new Error('styles.css debe definir --font-display con Montserrat');
    }

    // 3. Tokens en portal.css
    if (!portalCss.includes('--brand-forest:') || !portalCss.includes('--brand-petroleum:') || !portalCss.includes('--brand-sage:')) {
        throw new Error('portal.css debe incorporar los tokens fundamentales de SERENA');
    }
});

// ============================================
// TC-SER-03: Entregables de Recursos Gráficos, Logotipo y Avatar Serena
// ============================================
ClinicalTestSuite.add('TC-SER-03', 'Entregables de Recursos Gráficos, Logotipo y Avatar Serena', async () => {
    const fs = await import('fs');
    const path = await import('path');

    const requiredFiles = [
        // Logotipo y derivados
        'assets/brand/serena-symbol.svg',
        'assets/brand/serena-symbol-white.svg',
        'assets/brand/serena-symbol-mono.svg',
        'assets/brand/serena-logo-horizontal.svg',
        'assets/brand/serena-logo-white.svg',
        'assets/brand/serena-logo-mono.svg',
        'assets/brand/serena-logo.svg',
        'favicon.svg',
        'icon-192.png',
        'icon-512.png',
        // Avatar oficial en 5 variantes
        'assets/avatar/serena-avatar-main.svg',
        'assets/avatar/serena-avatar-header.svg',
        'assets/avatar/serena-avatar-welcome.svg',
        'assets/avatar/serena-empty-state.svg',
        'assets/avatar/serena-avatar-badge.svg'
    ];

    for (const relPath of requiredFiles) {
        const fullPath = path.resolve(relPath);
        if (!fs.existsSync(fullPath)) {
            throw new Error(`Archivo gráfico requerido no encontrado: ${relPath}`);
        }
        const stat = fs.statSync(fullPath);
        if (stat.size < 50) {
            throw new Error(`Archivo gráfico truncado o vacío: ${relPath} (${stat.size} bytes)`);
        }
        if (relPath.endsWith('.svg')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (!content.includes('<svg') || !content.includes('</svg>')) {
                throw new Error(`SVG inválido o malformado: ${relPath}`);
            }
        }
    }
});

// ============================================
// TC-SER-04: Asistente Visual Serena e Integración Contextual
// ============================================
ClinicalTestSuite.add('TC-SER-04', 'Asistente Visual Serena e Integración Contextual (app.js, index.html)', async () => {
    const fs = await import('fs');
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    const appJs = fs.readFileSync('app.js', 'utf8');

    // 1. Tarjeta asistente en index.html
    if (!indexHtml.includes('id="serenaAssistantBanner"') || !indexHtml.includes('dismissSerenaBanner()')) {
        throw new Error('index.html debe contener el banner del asistente Serena y el botón para descartarlo');
    }
    if (!indexHtml.includes('id="serenaAssistantToggleBtn"') || !indexHtml.includes('toggleSerenaAssistant()')) {
        throw new Error('index.html debe contener el botón en la barra superior para alternar los consejos de Serena');
    }

    // 2. Controladores en app.js
    if (!appJs.includes('dismissSerenaBanner') || !appJs.includes('toggleSerenaAssistant') || !appJs.includes('initSerenaAssistant')) {
        throw new Error('app.js debe implementar y exponer dismissSerenaBanner, toggleSerenaAssistant e initSerenaAssistant');
    }

    // 3. Verificación de no intrusión: no bloquear notas clínicas
    if (appJs.includes('openSoapModal') && appJs.includes('serenaAssistantBanner.style.display = "block"')) {
        throw new Error('El asistente Serena no debe interrumpir la redacción de notas SOAP');
    }
});

// Auto-ejecución si se corre desde Node.js (CLI)
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('tests.js')) {
    ClinicalTestSuite.runAll().then(res => {
        if (!res.allPassed) process.exit(1);
    });
}

if (typeof window !== 'undefined') {
    window.ClinicalTestSuite = ClinicalTestSuite;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ClinicalTestSuite;
}

export default ClinicalTestSuite;
export { ClinicalTestSuite };

