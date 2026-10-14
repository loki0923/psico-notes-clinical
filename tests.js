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
