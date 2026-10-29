/**
 * PSICO NOTES CLINICAL - MÓDULO DE ESCALAS Y CUESTIONARIOS PSICOLÓGICOS
 * Evaluaciones estandarizadas con puntuación automática e interpretación clínica
 */

const EXTENDED_CLINICAL_SCALES = {
    phq9: {
        id: 'phq9',
        name: 'PHQ-9 (Cuestionario de Salud del Paciente - Depresión)',
        shortName: 'PHQ-9',
        domain: 'Sintomatología Depresiva',
        maxScore: 27,
        questions: [
            'Poco interés o placer en hacer cosas',
            'Se ha sentido decaído/a, deprimido/a o sin esperanza',
            'Ha tenido problemas para dormir o dormido demasiado',
            'Se ha sentido cansado/a o con poca energía',
            'Sin apetito o ha comido en exceso',
            'Se ha sentido mal consigo mismo/a o que es un fracaso',
            'Ha tenido dificultad para concentrarse (lectura, TV, etc.)',
            'Se ha movido o hablado tan lento que otros lo notaron, o inquieto',
            'Pensamientos de que estaría mejor muerto/a o de hacerse daño'
        ],
        options: [
            { label: 'Nunca (0)', value: 0 },
            { label: 'Varios días (1)', value: 1 },
            { label: 'Más de la mitad de los días (2)', value: 2 },
            { label: 'Casi todos los días (3)', value: 3 }
        ],
        interpret: (s) => {
            if (s <= 4) return { level: 'Mínima / Sin depresión', color: '#4dab87', class: 'success', action: 'Seguimiento rutinario. No requiere intervención farmacológica.' };
            if (s <= 9) return { level: 'Depresión Leve', color: '#7cb342', class: 'info', action: 'Psicoeducación, monitoreo activo y técnicas cognitivas iniciales.' };
            if (s <= 14) return { level: 'Depresión Moderada', color: '#fdcb6e', class: 'warning', action: 'Plan de tratamiento activo en TCC o psicoterapia focalizada.' };
            if (s <= 19) return { level: 'Depresión Moderadamente Severa', color: '#e67e22', class: 'warning', action: 'Intervención psicoterapéutica intensa + considerar interconsulta psiquiátrica.' };
            return { level: 'Depresión Severa', color: '#e16259', class: 'danger', action: '⚠️ Evaluación de riesgo inminente, protocolo de crisis e interconsulta psiquiátrica urgente.' };
        }
    },
    gad7: {
        id: 'gad7',
        name: 'GAD-7 (Escala de Ansiedad Generalizada)',
        shortName: 'GAD-7',
        domain: 'Sintomatología Ansiosa',
        maxScore: 21,
        questions: [
            'Sentirse nervioso/a, ansioso/a o con los nervios de punta',
            'No ser capaz de parar o controlar las preocupaciones',
            'Preocuparse demasiado por diferentes cosas',
            'Dificultad para relajarse',
            'Estar tan inquieto/a que es difícil permanecer sentado/a',
            'Molestarse o irritarse con facilidad',
            'Sentir miedo como si algo terrible fuera a pasar'
        ],
        options: [
            { label: 'Nunca (0)', value: 0 },
            { label: 'Varios días (1)', value: 1 },
            { label: 'Más de la mitad de los días (2)', value: 2 },
            { label: 'Casi todos los días (3)', value: 3 }
        ],
        interpret: (s) => {
            if (s <= 4) return { level: 'Ansiedad Mínima', color: '#4dab87', class: 'success', action: 'Seguimiento sintomático habitual.' };
            if (s <= 9) return { level: 'Ansiedad Leve', color: '#7cb342', class: 'info', action: 'Técnicas de respiración, higiene del sueño y psicoeducación.' };
            if (s <= 14) return { level: 'Ansiedad Moderada', color: '#fdcb6e', class: 'warning', action: 'Restructuración cognitiva, exposición gradual y manejo del estrés.' };
            return { level: 'Ansiedad Severa', color: '#e16259', class: 'danger', action: '⚠️ Tratamiento intensivo, abordaje somático/conductual e interconsulta farmacológica.' };
        }
    },
    bdi2: {
        id: 'bdi2',
        name: 'BDI-II (Inventario de Depresión de Beck - Adaptación Breve)',
        shortName: 'BDI-II',
        domain: 'Severidad Depresiva Clínica',
        maxScore: 30,
        questions: [
            'Tristeza: Sentimiento constante de desánimo o infelicidad',
            'Pesimismo: Desesperanza sobre el futuro',
            'Fracaso: Sensación de haber fallado como persona',
            'Pérdida de Placer: Incapacidad de disfrutar actividades previas',
            'Sentimiento de Culpabilidad: Autoculpabilización constante',
            'Inseguridad y Autoestima: Desvalorización personal',
            'Labilidad Emocional: Ganas frecuentes de llorar',
            'Pérdida de Energía: Cansancio e inquietud somática',
            'Cambios en el Sueño: Dificultad para conciliar o insomnio terminal',
            'Irritabilidad y Frustración: Molestia o malhumor constante'
        ],
        options: [
            { label: 'No lo experimento (0)', value: 0 },
            { label: 'Leve / Ocasional (1)', value: 1 },
            { label: 'Moderado / Frecuente (2)', value: 2 },
            { label: 'Severo / Continuo (3)', value: 3 }
        ],
        interpret: (s) => {
            if (s <= 5) return { level: 'Depresión Mínima', color: '#4dab87', class: 'success', action: 'Estado anímico dentro de rangos adaptativos.' };
            if (s <= 13) return { level: 'Depresión Leve', color: '#7cb342', class: 'info', action: 'Monitoreo de disparadores y activación conductual.' };
            if (s <= 20) return { level: 'Depresión Moderada', color: '#fdcb6e', class: 'warning', action: 'Terapia cognitiva focalizada en esquemas disfuncionales.' };
            return { level: 'Depresión Grave / Severa', color: '#e16259', class: 'danger', action: '⚠️ Intervención estructurada intensiva y derivación clínica.' };
        }
    },
    bai: {
        id: 'bai',
        name: 'BAI (Inventario de Ansiedad de Beck - Síntomas Somáticos)',
        shortName: 'BAI',
        domain: 'Ansiedad Somática y Fisiológica',
        maxScore: 30,
        questions: [
            'Entumecimiento o hormigueo en extremidades',
            'Sensación de calor o sofoco',
            'Temblor en piernas o manos',
            'Incapacidad para relajarse',
            'Miedo a que ocurra lo peor',
            'Sensación de mareo o inestabilidad',
            'Palpitaciones o ritmo cardíaco acelerado',
            'Sensación de ahogo o opresión en el pecho',
            'Miedo a perder el control',
            'Opresión abdominal o malestar estomacal'
        ],
        options: [
            { label: 'En absoluto (0)', value: 0 },
            { label: 'Levemente (1)', value: 1 },
            { label: 'Moderadamente (2)', value: 2 },
            { label: 'Severamente (3)', value: 3 }
        ],
        interpret: (s) => {
            if (s <= 7) return { level: 'Ansiedad Mínima', color: '#4dab87', class: 'success', action: 'Nivel somático fisiológico normal.' };
            if (s <= 15) return { level: 'Ansiedad Leve', color: '#7cb342', class: 'info', action: 'Entrenamiento en relajación muscular e interocepción.' };
            if (s <= 25) return { level: 'Ansiedad Moderada', color: '#fdcb6e', class: 'warning', action: 'Desensibilización somática y control de hiperventilación.' };
            return { level: 'Ansiedad Severa', color: '#e16259', class: 'danger', action: '⚠️ Abordaje psicoeducativo en angustia y derivación médica.' };
        }
    },
    rosenberg: {
        id: 'rosenberg',
        name: 'Escala de Autoestima de Rosenberg',
        shortName: 'Rosenberg',
        domain: 'Autoconcepto y Autoestima',
        maxScore: 40,
        questions: [
            'Siento que soy una persona digna de aprecio, al menos en igual medida que las demás',
            'Siento que tengo cualidades positivas',
            'Soy capaz de hacer las cosas tan bien como la mayoría de la gente',
            'Tengo una actitud positiva hacia mí mismo/a',
            'En general, me siento satisfecho/a conmigo mismo/a',
            'Siento que no tengo mucho de lo que estar orgulloso/a (Invertida)',
            'En general, me inclino a pensar que soy un/a fracasado/a (Invertida)',
            'Me gustaría tener más respeto por mí mismo/a (Invertida)',
            'Hay veces que realmente pienso que no sirvo para nada (Invertida)',
            'A veces me siento inútil (Invertida)'
        ],
        options: [
            { label: 'Muy en desacuerdo (1)', value: 1 },
            { label: 'En desacuerdo (2)', value: 2 },
            { label: 'De acuerdo (3)', value: 3 },
            { label: 'Muy de acuerdo (4)', value: 4 }
        ],
        interpret: (s) => {
            if (s >= 30) return { level: 'Autoestima Alta / Saludable', color: '#4dab87', class: 'success', action: 'Autoconcepto sólido y autoaceptación positiva.' };
            if (s >= 26) return { level: 'Autoestima Media / Normal', color: '#7cb342', class: 'info', action: 'Autoestima adecuada con fluctuaciones ocasionales.' };
            return { level: 'Autoestima Baja', color: '#e16259', class: 'danger', action: 'Trabajo explícito en autocompasión, diálogo interno y valía personal.' };
        }
    },
    pss10: {
        id: 'pss10',
        name: 'PSS-10 (Escala de Estrés Percibido)',
        shortName: 'PSS-10',
        domain: 'Nivel de Estrés e Sobrecarga',
        maxScore: 40,
        questions: [
            '¿Con qué frecuencia se ha sentido afectado/a por algo que ocurrió inesperadamente?',
            '¿Con qué frecuencia ha sentido que no podía controlar las cosas importantes en su vida?',
            '¿Con qué frecuencia se ha sentido nervioso/a o estresado/a?',
            '¿Con qué frecuencia ha manejado con éxito los pequeños problemas cotidianos? (Invertida)',
            '¿Con qué frecuencia ha sentido que afrontaba efectivamente los cambios? (Invertida)',
            '¿Con qué frecuencia se ha sentido seguro/a de su capacidad para manejar problemas? (Invertida)',
            '¿Con qué frecuencia ha sentido que las cosas le iban bien? (Invertida)',
            '¿Con qué frecuencia ha sentido que no podía afrontar todas las cosas que tenía que hacer?',
            '¿Con qué frecuencia ha podido controlar las dificultades de su vida? (Invertida)',
            '¿Con qué frecuencia ha sentido que las dificultades se acumulaban tanto que no podía superarlas?'
        ],
        options: [
            { label: 'Nunca (0)', value: 0 },
            { label: 'Casi nunca (1)', value: 1 },
            { label: 'A veces (2)', value: 2 },
            { label: 'A menudo (3)', value: 3 },
            { label: 'Muy a menudo (4)', value: 4 }
        ],
        interpret: (s) => {
            if (s <= 13) return { level: 'Estrés Percibido Bajo', color: '#4dab87', class: 'success', action: 'Adecuados recursos de afrontamiento y regulación.' };
            if (s <= 26) return { level: 'Estrés Percibido Moderado', color: '#fdcb6e', class: 'warning', action: 'Entrenamiento en gestión del tiempo, límites y pausas activas.' };
            return { level: 'Estrés Percibido Alto / Sobrecarga', color: '#e16259', class: 'danger', action: '⚠️ Alto riesgo de burnout; intervención en factores de estrés crónico.' };
        }
    }
};

// -------------------------------------------------------------
// ESCALAS PERSONALIZADAS Y DINÁMICAS (ALMACENAMIENTO LOCAL)
// -------------------------------------------------------------

function getCustomScales() {
    try {
        const uid = (typeof AppState !== 'undefined' && AppState.currentUser) ? AppState.currentUser.id : 'default';
        const raw = localStorage.getItem(`psico_custom_scales_${uid}`);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
}

function saveCustomScales(scales) {
    const uid = (typeof AppState !== 'undefined' && AppState.currentUser) ? AppState.currentUser.id : 'default';
    localStorage.setItem(`psico_custom_scales_${uid}`, JSON.stringify(scales));
}

function getAllClinicalScales() {
    const custom = getCustomScales();
    const merged = { ...EXTENDED_CLINICAL_SCALES };
    Object.keys(custom).forEach(k => {
        const c = custom[k];
        merged[k] = {
            ...c,
            interpret: (typeof c.interpret === 'function') ? c.interpret : function(s) {
                const mild = c.cutoffs?.mild || Math.round(c.maxScore * 0.33);
                const mod = c.cutoffs?.moderate || Math.round(c.maxScore * 0.66);
                if (s <= mild) return { level: 'Puntaje Bajo / Mínimo', color: '#4dab87', class: 'success', action: 'Nivel adaptativo. Mantener seguimiento psicoterapéutico rutinario.' };
                if (s <= mod) return { level: 'Puntaje Moderado', color: '#fdcb6e', class: 'warning', action: 'Sintomatología moderada. Abordaje focalizado en el plan de intervención.' };
                return { level: 'Puntaje Alto / Severo', color: '#e16259', class: 'danger', action: '⚠️ Sintomatología severa o elevada. Priorizar técnicas de estabilización y reevaluación.' };
            }
        };
    });
    return merged;
}

// -------------------------------------------------------------
// VISTA DE ESCALAS Y TESTS EN NAVEGACIÓN
// -------------------------------------------------------------

function renderScalesView() {
    const container = document.getElementById('scalesView');
    if (!container) return;

    const allScales = getAllClinicalScales();
    const allNotes = AppState.notes || [];
    const evaluations = allNotes.filter(n => n.scaleResult).map(n => n.scaleResult);

    const totalAssessments = evaluations.length;
    const highRiskCount = evaluations.filter(e => e.score >= (e.maxScore * 0.65)).length;

    container.innerHTML = `
        <div class="page-header">
            <div class="page-header-left">
                <h1 class="page-title">Escalas y Evaluaciones Psicométricas</h1>
                <p class="page-subtitle">Aplicación e interpretación automatizada de cuestionarios estandarizados</p>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button class="btn-secondary" onclick="openScaleEditorModal()">
                    <i class="fas fa-plus-circle"></i> + Nueva Escala / Test
                </button>
                <button class="btn-primary" onclick="openInteractiveScaleModal()">
                    <i class="fas fa-file-signature"></i> Aplicar Escala
                </button>
            </div>
        </div>

        <div class="summary-cards" style="grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));">
            <div class="summary-card">
                <div class="summary-icon">📊</div>
                <div class="summary-info">
                    <h3>Cuestionarios Aplicados</h3>
                    <div class="summary-value">${totalAssessments}</div>
                    <div class="summary-label">Evaluaciones completadas</div>
                </div>
            </div>
            <div class="summary-card priority">
                <div class="summary-icon">🚨</div>
                <div class="summary-info">
                    <h3>Alertas Severas</h3>
                    <div class="summary-value" style="color:#e16259;">${highRiskCount}</div>
                    <div class="summary-label">Sintomatología moderada/alta</div>
                </div>
            </div>
            <div class="summary-card">
                <div class="summary-icon">🧠</div>
                <div class="summary-info">
                    <h3>Catálogo Disponible</h3>
                    <div class="summary-value">${Object.keys(allScales).length} Escalas</div>
                    <div class="summary-label">Estandarizadas y personalizadas</div>
                </div>
            </div>
        </div>

        <!-- CATÁLOGO DE ESCALAS -->
        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-th-large"></i> Catálogo de Escalas Psicológicas</h2>
                <button class="btn-secondary btn-sm" onclick="openScaleEditorModal()">
                    <i class="fas fa-plus"></i> Añadir Escala
                </button>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(320px, 1fr));gap:16px;">
                ${Object.values(allScales).map(s => `
                    <div class="finance-goal-card" style="justify-content:space-between;">
                        <div>
                            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                                <span style="font-size:11px;font-weight:700;text-transform:uppercase;padding:3px 10px;border-radius:12px;background:var(--accent-light);color:var(--accent-primary);">
                                    ${s.domain}
                                </span>
                                <span style="font-size:12px;color:var(--text-tertiary);font-weight:600;">
                                    ${s.questions ? s.questions.length : 0} ítems
                                </span>
                            </div>
                            <h3 style="margin:0 0 6px 0;font-size:16px;font-weight:700;color:var(--text-primary);">${s.name}</h3>
                            <p style="margin:0;font-size:12px;color:var(--text-secondary);line-height:1.4;">
                                Rango de puntuación: 0 a ${s.maxScore} pts. Genera diagnóstico situacional e informe automático.
                            </p>
                        </div>
                        <div style="margin-top:14px;display:flex;justify-content:flex-end;gap:8px;">
                            <button class="btn-secondary btn-sm" onclick="openScaleEditorModal('${s.id}')" title="Editar escala o test">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn-primary btn-sm" onclick="openInteractiveScaleModal('${s.id}')">
                                <i class="fas fa-file-signature"></i> Aplicar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <!-- HISTORIAL GLOBAL DE EVALUACIONES -->
        <div class="section-block" style="margin-top:24px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:12px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-history"></i> Historial de Evaluaciones de Pacientes</h2>
                <input type="text" placeholder="Filtrar por paciente o escala..." oninput="filterScalesHistory(this.value)" style="padding:6px 12px;border:1px solid var(--border-primary);border-radius:var(--radius-sm);background:var(--bg-card);color:var(--text-primary);font-size:13px;width:240px;">
            </div>

            <div id="scalesHistoryList">
                ${renderScalesHistoryHtml(evaluations)}
            </div>
        </div>
    `;
}

function renderScalesHistoryHtml(evaluations, filterText = '') {
    if (evaluations.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No hay evaluaciones psicométricas registradas aún.</p>
            </div>
        `;
    }

    const text = filterText.toLowerCase();
    const filtered = evaluations.filter(e => {
        const patient = AppState.patients.find(p => String(p.id) === String(e.patientId));
        const pName = patient ? patient.name.toLowerCase() : '';
        const scaleName = (e.scaleName || '').toLowerCase();
        const interp = (e.interpretation || '').toLowerCase();
        return pName.includes(text) || scaleName.includes(text) || interp.includes(text);
    });

    if (filtered.length === 0) {
        return `
            <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>No se encontraron evaluaciones con el filtro ingresado.</p>
            </div>
        `;
    }

    return `
        <div style="display:flex;flex-direction:column;gap:10px;">
            ${filtered.sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => {
                const patient = AppState.patients.find(p => String(p.id) === String(e.patientId));
                return `
                    <div style="padding:14px 18px;background:var(--bg-secondary);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
                        <div style="display:flex;align-items:center;gap:14px;min-width:0;flex:1;">
                            <div style="font-size:24px;flex-shrink:0;">📋</div>
                            <div style="min-width:0;">
                                <div style="font-weight:700;font-size:15px;color:var(--text-primary);">${e.scaleName}</div>
                                <div style="font-size:13px;color:var(--text-secondary);margin-top:2px;">
                                    👤 <strong>${patient ? patient.name : 'Paciente'}</strong> · 📅 ${formatDate(e.date)}
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;align-items:center;gap:14px;flex-shrink:0;">
                            <div style="text-align:right;">
                                <div style="font-size:16px;font-weight:800;color:${e.color || 'var(--accent-primary)'};">
                                    Puntaje: ${e.score} / ${e.maxScore}
                                </div>
                                <div style="font-size:12px;font-weight:600;color:var(--text-secondary);">
                                    ${e.interpretation}
                                </div>
                            </div>
                            ${patient ? `
                                <button class="btn-secondary btn-sm" onclick="viewPatient('${patient.id}')" title="Ver Expediente">
                                    <i class="fas fa-folder-open"></i> Expediente
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function filterScalesHistory(text) {
    const allNotes = AppState.notes || [];
    const evaluations = allNotes.filter(n => n.scaleResult).map(n => n.scaleResult);
    const container = document.getElementById('scalesHistoryList');
    if (container) {
        container.innerHTML = renderScalesHistoryHtml(evaluations, text);
    }
}

// -------------------------------------------------------------
// MODAL INTERACTIVO DE APLICACIÓN DE ESCALA
// -------------------------------------------------------------

function openInteractiveScaleModal(scaleKey = 'phq9', preselectedPatientId = null) {
    const allScales = getAllClinicalScales();
    const scale = allScales[scaleKey] || allScales.phq9 || Object.values(allScales)[0];
    const patients = AppState.patients || [];

    const body = document.getElementById('scaleModalBody');
    if (!body) return;

    window._currentScaleAnswers = {};
    window._selectedScaleKey = scale.id;

    body.innerHTML = `
        <div class="form-group" style="margin-bottom:16px;">
            <div class="form-row">
                <div class="form-group">
                    <label>Seleccionar Escala Psicológica *</label>
                    <select id="interactiveScaleSelect" onchange="switchModalScale(this.value, '${preselectedPatientId || ''}')" style="font-weight:600;">
                        ${Object.values(allScales).map(s => `
                            <option value="${s.id}" ${s.id === scale.id ? 'selected' : ''}>${s.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Paciente *</label>
                    <select id="interactivePatientSelect" required>
                        <option value="">-- Seleccionar Paciente --</option>
                        ${patients.map(p => `
                            <option value="${p.id}" ${String(p.id) === String(preselectedPatientId) ? 'selected' : ''}>${p.name}</option>
                        `).join('')}
                    </select>
                </div>
            </div>
        </div>

        <div style="background:var(--accent-light);border-left:4px solid var(--accent-primary);padding:12px 16px;border-radius:var(--radius-md);margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
                <strong style="color:var(--text-primary);font-size:14px;">${scale.name}</strong>
                <p style="margin:2px 0 0 0;font-size:12px;color:var(--text-secondary);">Responda según la vivencia reciente del paciente.</p>
            </div>
            <div style="text-align:right;">
                <div style="font-size:18px;font-weight:800;color:var(--accent-primary);" id="liveScaleScore">0 / ${scale.maxScore} pts</div>
                <div style="font-size:11px;font-weight:700;color:var(--text-tertiary);" id="liveScaleLevel">Puntuación Inicial</div>
            </div>
        </div>

        <div id="interactiveScaleQuestionsList" style="max-height:55vh;overflow-y:auto;padding-right:6px;">
            ${scale.questions.map((q, i) => `
                <div style="margin-bottom:14px;padding:14px;background:var(--bg-secondary);border-radius:var(--radius-md);border:1px solid var(--border-primary);">
                    <div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:10px;">
                        ${i + 1}. ${q}
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;">
                        ${scale.options.map((opt) => `
                            <label style="display:flex;align-items:center;gap:8px;font-size:13px;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-sm);cursor:pointer;transition:all 0.15s ease;" class="scale-opt-label">
                                <input type="radio" name="scale_q_${i}" value="${opt.value}" onchange="updateLiveScaleScore('${scale.id}', ${i}, ${opt.value})" style="cursor:pointer;">
                                <span>${opt.label}</span>
                            </label>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <div class="modal-actions" style="margin-top:20px;">
            <button type="button" class="btn-secondary" onclick="closeModal('scaleModal')">Cancelar</button>
            <button type="button" class="btn-primary" onclick="submitInteractiveScaleForm('${scale.id}')">
                <i class="fas fa-save"></i> Guardar Evaluación en Expediente
            </button>
        </div>
    `;

    openModal('scaleModal');
}

function switchModalScale(newScaleKey, patientId) {
    openInteractiveScaleModal(newScaleKey, patientId || document.getElementById('interactivePatientSelect')?.value);
}

function updateLiveScaleScore(scaleKey, questionIndex, value) {
    if (!window._currentScaleAnswers) window._currentScaleAnswers = {};
    window._currentScaleAnswers[questionIndex] = parseInt(value, 10);

    const scale = EXTENDED_CLINICAL_SCALES[scaleKey];
    if (!scale) return;

    let totalScore = 0;
    Object.values(window._currentScaleAnswers).forEach(val => {
        totalScore += val;
    });

    const interp = scale.interpret(totalScore);

    const scoreEl = document.getElementById('liveScaleScore');
    const levelEl = document.getElementById('liveScaleLevel');

    if (scoreEl) scoreEl.textContent = `${totalScore} / ${scale.maxScore} pts`;
    if (levelEl) {
        levelEl.textContent = interp.level;
        levelEl.style.color = interp.color;
    }
}

function submitInteractiveScaleForm(scaleKey) {
    const scale = getAllClinicalScales()[scaleKey];
    const patientId = document.getElementById('interactivePatientSelect')?.value;

    if (!patientId) {
        showToast('Seleccione un paciente para la evaluación', 'warning');
        return;
    }

    const answers = window._currentScaleAnswers || {};
    const answeredCount = Object.keys(answers).length;

    if (answeredCount < scale.questions.length) {
        showToast(`Responda todos los ítems (${answeredCount}/${scale.questions.length})`, 'warning');
        return;
    }

    let totalScore = 0;
    Object.values(answers).forEach(val => totalScore += val);

    const interp = scale.interpret(totalScore);

    const scaleResult = {
        id: generateId(),
        patientId: patientId,
        scale: scaleKey,
        scaleName: scale.name,
        shortName: scale.shortName,
        score: totalScore,
        maxScore: scale.maxScore,
        interpretation: interp.level,
        action: interp.action,
        color: interp.color,
        date: new Date().toISOString()
    };

    // Crear nota SOAP automática del resultado
    const note = {
        id: generateId(),
        patientId: patientId,
        date: toDateInputValue(new Date()),
        title: `Evaluación Psicométrica: ${scale.shortName} (${totalScore}/${scale.maxScore} pts)`,
        subjetivo: `Aplicación de prueba estandarizada ${scale.name}.`,
        objetivo: `Puntaje obtenido: ${totalScore} de ${scale.maxScore} puntos. Nivel: ${interp.level}.`,
        analisis: `El perfil psicométrico indica: ${interp.level}. ${interp.action}`,
        plan: `Continuar plan terapéutico considerando recomendaciones: ${interp.action}`,
        risk: interp.color === '#e16259' ? 'alto' : (interp.color === '#fdcb6e' || interp.color === '#e67e22' ? 'medio' : 'bajo'),
        mood: '',
        confidential: false,
        scaleResult: scaleResult,
        createdAt: new Date().toISOString()
    };

    AppState.notes.push(note);
    saveData();
    closeModal('scaleModal');

    showToast(`✅ ${scale.shortName} registrado: ${totalScore} pts (${interp.level})`, 'success');

    // Refrescar vistas activas
    if (AppState.currentView === 'scales') renderScalesView();
    if (AppState.currentView === 'notes') renderNotes();
    updateDashboard();
}

// -------------------------------------------------------------
// RENDERIZADO MEJORADO EN EL EXPEDIENTE DEL PACIENTE
// -------------------------------------------------------------

function renderTabEscalasEnhanced(patientId) {
    const notes = AppState.notes.filter(n => String(n.patientId) === String(patientId) && n.scaleResult).sort((a,b) => new Date(a.date) - new Date(b.date));

    if (notes.length === 0) {
        return `
            <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;">
                ${Object.values(EXTENDED_CLINICAL_SCALES).slice(0, 3).map(s => `
                    <button class="btn-secondary btn-sm" onclick="openInteractiveScaleModal('${s.id}', '${patientId}')">
                        📊 Aplicar ${s.shortName}
                    </button>
                `).join('')}
            </div>
            <div class="empty-state">
                <div class="empty-icon">📊</div>
                <p>No hay evaluaciones psicométricas registradas para este paciente.</p>
            </div>
        `;
    }

    // Agrupar por escala
    const grouped = {};
    notes.forEach(n => {
        const key = n.scaleResult.scale || 'phq9';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(n.scaleResult);
    });

    return `
        <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
                ${Object.values(EXTENDED_CLINICAL_SCALES).map(s => `
                    <button class="btn-secondary btn-sm" onclick="openInteractiveScaleModal('${s.id}', '${patientId}')">
                        <i class="fas fa-plus"></i> ${s.shortName}
                    </button>
                `).join('')}
            </div>
        </div>

        <div style="display:flex;flex-direction:column;gap:20px;">
            ${Object.keys(grouped).map(scaleKey => {
                const list = grouped[scaleKey];
                const scaleDef = EXTENDED_CLINICAL_SCALES[scaleKey] || { name: scaleKey, maxScore: 27 };
                const latest = list[list.length - 1];

                return `
                    <div class="section-block" style="margin:0;">
                        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                            <h4 style="margin:0;font-size:15px;font-weight:700;color:var(--text-primary);">
                                ${scaleDef.name}
                            </h4>
                            <span style="font-size:12px;font-weight:700;padding:2px 10px;border-radius:10px;background:${latest.color || 'var(--accent-primary)'};color:white;">
                                Último: ${latest.score} pts (${latest.interpretation})
                            </span>
                        </div>

                        <!-- LÍNEA DE TENDENCIA VISUAL EN SVG -->
                        ${list.length > 1 ? renderScaleSparklineSvg(list, scaleDef.maxScore) : ''}

                        <div style="display:flex;flex-direction:column;gap:8px;margin-top:12px;">
                            ${list.map(e => `
                                <div style="padding:10px 14px;background:var(--bg-secondary);border-radius:var(--radius-sm);display:flex;justify-content:space-between;align-items:center;">
                                    <div>
                                        <strong>${formatDate(e.date)}</strong> · Puntaje: <strong style="color:${e.color || 'var(--accent-primary)'};">${e.score} / ${e.maxScore}</strong>
                                    </div>
                                    <div style="font-size:12px;font-weight:600;color:var(--text-secondary);">
                                        ${e.interpretation}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

function renderScaleSparklineSvg(list, maxScore) {
    if (list.length < 2) return '';
    const width = 300;
    const height = 45;
    const padding = 10;

    const points = list.map((item, idx) => {
        const x = padding + (idx / (list.length - 1)) * (width - 2 * padding);
        const y = height - padding - (item.score / maxScore) * (height - 2 * padding);
        return `${x},${y}`;
    }).join(' ');

    return `
        <div style="background:var(--bg-secondary);padding:8px 12px;border-radius:var(--radius-sm);margin:8px 0;display:flex;align-items:center;gap:12px;">
            <span style="font-size:11px;font-weight:600;color:var(--text-tertiary);">Tendencia:</span>
            <svg width="${width}" height="${height}" style="overflow:visible;">
                <polyline fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
                ${list.map((item, idx) => {
                    const x = padding + (idx / (list.length - 1)) * (width - 2 * padding);
                    const y = height - padding - (item.score / maxScore) * (height - 2 * padding);
                    return `<circle cx="${x}" cy="${y}" r="4" fill="${item.color || 'var(--accent-primary)'}" />`;
                }).join('')}
            </svg>
        </div>
    `;
}

// -------------------------------------------------------------
// GESTIÓN Y EDICIÓN DE ESCALAS Y TESTS
// -------------------------------------------------------------

function openScaleEditorModal(scaleId = null) {
    const allScales = getAllClinicalScales();
    const scale = scaleId ? allScales[scaleId] : null;

    document.getElementById('scaleEditorModalTitle').textContent = scale ? `Editar Escala: ${scale.shortName}` : '🧪 Crear Nueva Escala o Test Psicológico';
    document.getElementById('customScaleEditId').value = scale ? scale.id : '';
    document.getElementById('scaleFormName').value = scale ? scale.name : '';
    document.getElementById('scaleFormShortName').value = scale ? scale.shortName : '';
    document.getElementById('scaleFormDomain').value = scale ? scale.domain : '';
    document.getElementById('scaleFormMaxScore').value = scale ? scale.maxScore : '';
    document.getElementById('scaleFormQuestions').value = scale && scale.questions ? scale.questions.join('\n') : '';

    if (scale && scale.cutoffs) {
        if (document.getElementById('scaleCutoffMild')) document.getElementById('scaleCutoffMild').value = scale.cutoffs.mild;
        if (document.getElementById('scaleCutoffMod')) document.getElementById('scaleCutoffMod').value = scale.cutoffs.moderate;
        if (document.getElementById('scaleCutoffSev')) document.getElementById('scaleCutoffSev').value = scale.cutoffs.severe;
    } else if (scale) {
        if (document.getElementById('scaleCutoffMild')) document.getElementById('scaleCutoffMild').value = Math.round(scale.maxScore * 0.33);
        if (document.getElementById('scaleCutoffMod')) document.getElementById('scaleCutoffMod').value = Math.round(scale.maxScore * 0.66);
        if (document.getElementById('scaleCutoffSev')) document.getElementById('scaleCutoffSev').value = Math.round(scale.maxScore * 0.67);
    }

    const delBtn = document.getElementById('btnDeleteCustomScale');
    if (delBtn) {
        delBtn.style.display = (scale && scale.isCustom) ? 'inline-flex' : 'none';
    }

    openModal('scaleEditorModal');
}
if (typeof window !== 'undefined') window.openScaleEditorModal = openScaleEditorModal;
if (typeof globalThis !== 'undefined') globalThis.openScaleEditorModal = openScaleEditorModal;

function deleteCustomScale(scaleId) {
    if (!scaleId) return;
    if (typeof confirm === 'function' && !confirm('¿Deseas eliminar esta escala psicométrica?')) return;
    const custom = getCustomScales();
    delete custom[scaleId];
    saveCustomScales(custom);
    closeModal('scaleEditorModal');
    if (typeof renderScalesView === 'function') renderScalesView();
    if (typeof showToast === 'function') showToast('Escala psicométrica eliminada', 'info');
}
if (typeof window !== 'undefined') window.deleteCustomScale = deleteCustomScale;
if (typeof globalThis !== 'undefined') globalThis.deleteCustomScale = deleteCustomScale;

function handleSaveCustomScale(e) {
    e.preventDefault();
    const editId = document.getElementById('customScaleEditId').value.trim();
    const name = document.getElementById('scaleFormName').value.trim();
    const shortName = document.getElementById('scaleFormShortName').value.trim();
    const domain = document.getElementById('scaleFormDomain').value.trim();
    const questionsRaw = document.getElementById('scaleFormQuestions').value.trim();
    const optionsType = document.getElementById('scaleFormOptionsType').value;

    const questions = questionsRaw.split('\n').map(q => q.trim()).filter(q => q.length > 0);
    if (questions.length === 0) {
        showToast('Debe ingresar al menos una pregunta para la escala', 'warning');
        return;
    }

    let options = [
        { label: 'Nunca (0)', value: 0 },
        { label: 'Varios días (1)', value: 1 },
        { label: 'Más de la mitad (2)', value: 2 },
        { label: 'Casi siempre (3)', value: 3 }
    ];
    let maxOptionVal = 3;

    if (optionsType === 'likert_4_14') {
        options = [
            { label: 'Totalmente en desacuerdo (1)', value: 1 },
            { label: 'En desacuerdo (2)', value: 2 },
            { label: 'De acuerdo (3)', value: 3 },
            { label: 'Totalmente de acuerdo (4)', value: 4 }
        ];
        maxOptionVal = 4;
    } else if (optionsType === 'likert_5_04') {
        options = [
            { label: 'Nunca (0)', value: 0 },
            { label: 'Casi nunca (1)', value: 1 },
            { label: 'A veces (2)', value: 2 },
            { label: 'Frecuentemente (3)', value: 3 },
            { label: 'Casi siempre (4)', value: 4 }
        ];
        maxOptionVal = 4;
    } else if (optionsType === 'yes_no_01') {
        options = [
            { label: 'No (0)', value: 0 },
            { label: 'Sí (1)', value: 1 }
        ];
        maxOptionVal = 1;
    }

    const calculatedMax = questions.length * maxOptionVal;
    const manualMax = parseInt(document.getElementById('scaleFormMaxScore').value, 10);
    const maxScore = (!isNaN(manualMax) && manualMax > 0) ? manualMax : calculatedMax;

    const mildCutoff = parseInt(document.getElementById('scaleCutoffMild').value, 10) || Math.round(maxScore * 0.33);
    const modCutoff = parseInt(document.getElementById('scaleCutoffMod').value, 10) || Math.round(maxScore * 0.66);
    const sevCutoff = parseInt(document.getElementById('scaleCutoffSev').value, 10) || (modCutoff + 1);

    const scaleId = editId || ('custom_' + shortName.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.random().toString(36).substr(2, 4));

    const scaleObj = {
        id: scaleId,
        name: name,
        shortName: shortName,
        domain: domain,
        maxScore: maxScore,
        questions: questions,
        options: options,
        cutoffs: {
            mild: mildCutoff,
            moderate: modCutoff,
            severe: sevCutoff
        },
        isCustom: true
    };

    const custom = getCustomScales();
    custom[scaleId] = scaleObj;
    saveCustomScales(custom);

    closeModal('scaleEditorModal');
    if (typeof renderScalesView === 'function') renderScalesView();
    showToast(`✅ Escala "${shortName}" guardada exitosamente`, 'success');
}

const _scalesTargetScope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null));
if (_scalesTargetScope) {
    _scalesTargetScope.handleSaveCustomScale = handleSaveCustomScale;
    if (typeof openScaleEditorModal === 'function') _scalesTargetScope.openScaleEditorModal = openScaleEditorModal;
    if (typeof deleteCustomScale === 'function') _scalesTargetScope.deleteCustomScale = deleteCustomScale;
    if (typeof openInteractiveScaleModal === 'function') _scalesTargetScope.openInteractiveScaleModal = openInteractiveScaleModal;
    if (typeof submitInteractiveScaleForm === 'function') _scalesTargetScope.submitInteractiveScaleForm = submitInteractiveScaleForm;
    if (typeof renderScalesView === 'function') _scalesTargetScope.renderScalesView = renderScalesView;
    if (typeof recordScaleAnswer === 'function') _scalesTargetScope.recordScaleAnswer = recordScaleAnswer;
    if (typeof updateLiveScaleScore === 'function') _scalesTargetScope.updateLiveScaleScore = updateLiveScaleScore;
    if (typeof renderTabEscalasEnhanced === 'function') _scalesTargetScope.renderTabEscalasEnhanced = renderTabEscalasEnhanced;
    if (typeof getCustomScales === 'function') _scalesTargetScope.getCustomScales = getCustomScales;
    if (typeof saveCustomScales === 'function') _scalesTargetScope.saveCustomScales = saveCustomScales;
    if (typeof getAllClinicalScales === 'function') _scalesTargetScope.getAllClinicalScales = getAllClinicalScales;
    _scalesTargetScope.EXTENDED_CLINICAL_SCALES = EXTENDED_CLINICAL_SCALES;
}
