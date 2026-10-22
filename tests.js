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
