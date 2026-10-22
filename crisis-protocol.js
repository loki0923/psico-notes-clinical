/**
 * PSICO NOTES CLINICAL - PROTOCOLO DE CRISIS, RIESGO SUICIDA Y ATENCIÓN CLÍNICA ESTRUCTURADA (CLI-004)
 * Evaluación estructurada C-SSRS, Directorio de Emergencias Localizado e Historial de Actuación Humana.
 */

const CrisisEmergencyDirectory = {
    VE: {
        country: 'Venezuela',
        flag: '🇻🇪',
        hotlines: [
            { name: 'Línea de Ayuda FPVP (Federación de Psicólogos de Vzla)', phone: '0212-241-92-88 / 0800-PSICO', hours: 'Viernes a Domingo / Turnos rotativos' },
            { name: 'Línea de Crisis Psicológica UCV', phone: '0212-605-28-00', hours: 'Lunes a Viernes' },
            { name: 'Emergencias Generales / Ven 911', phone: '911 / 171', hours: '24/7 Nacional' },
            { name: 'Red Hospitalaria Psiquiátrica (Caracas / Edo. Miranda)', phone: 'Hospital Psiquiátrico de Caracas / El Peñón', hours: 'Guardia 24h' }
        ],
        minorProtocol: 'En casos con menores (LOPNNA), toda sospecha de maltrato o riesgo grave debe notificarse al Consejo de Protección de Niños, Niñas y Adolescentes (CPNNA).'
    },
    CO: {
        country: 'Colombia',
        flag: '🇨🇴',
        hotlines: [
            { name: 'Línea 106 - Apoyo Psicológico y Salud Mental', phone: '106 (Gratuito)', hours: '24/7' },
            { name: 'Línea 192 - Salud Mental Nacional', phone: '192 opción 4', hours: '24/7' },
            { name: 'Emergencias Nacionales', phone: '123', hours: '24/7' }
        ],
        minorProtocol: 'Notificación prioritaria a Defensoría de Familia / ICBF en vulneración de derechos o riesgo inminente de menores.'
    },
    AR: {
        country: 'Argentina',
        flag: '🇦🇷',
        hotlines: [
            { name: 'Centro de Asistencia al Suicida (CAS)', phone: '135 (CABA) / (011) 5275-1135 (Nacional)', hours: '24/7' },
            { name: 'Salud Mental Responde (CABA)', phone: '0800-333-1665', hours: '24/7' },
            { name: 'Emergencias Médicas', phone: '107 (SAME) / 911', hours: '24/7' }
        ],
        minorProtocol: 'Activación bajo Ley 26.061 de Protección Integral de Niñas, Niños y Adolescentes y Línea 102.'
    },
    CL: {
        country: 'Chile',
        flag: '🇨🇱',
        hotlines: [
            { name: 'Línea Prevención del Suicidio *4141 (No Estás Solo)', phone: '*4141', hours: '24/7 Gratuito' },
            { name: 'Salud Responde Minsal', phone: '600 360 7777 opción 1', hours: '24/7' },
            { name: 'Emergencias Médicas SAMU', phone: '131 / 911', hours: '24/7' }
        ],
        minorProtocol: 'Denuncia y notificación a Tribunales de Familia / Sename / Mejor Niñez ante riesgo grave o vulneración.'
    },
    MX: {
        country: 'México',
        flag: '🇲🇽',
        hotlines: [
            { name: 'Línea de la Vida (Secretaría de Salud)', phone: '800 911 2000', hours: '24/7 Gratuito' },
            { name: 'SAPTEL - Salud Mental y Crisis', phone: '55 5259 8121', hours: '24/7' },
            { name: 'Emergencias Nacionales', phone: '911', hours: '24/7' }
        ],
        minorProtocol: 'Notificación a Procuradurías de Protección de Niñas, Niños y Adolescentes (DIF / SIPINNA).'
    },
    ES: {
        country: 'España',
        flag: '🇪🇸',
        hotlines: [
            { name: 'Línea de Atención a la Conducta Suicida', phone: '024', hours: '24/7 Gratuito y confidencial' },
            { name: 'Teléfono de la Esperanza', phone: '717 003 717', hours: '24/7' },
            { name: 'Emergencias Sanitarias', phone: '112', hours: '24/7' }
        ],
        minorProtocol: 'Notificación a Servicios Sociales / Fiscalía de Menores según Ley Orgánica de Protección a la Infancia (LOPIVI).'
    },
    US: {
        country: 'Estados Unidos / Internacional',
        flag: '🇺🇸',
        hotlines: [
            { name: '988 Suicide & Crisis Lifeline', phone: '988 (Llamada o SMS en Español e Inglés)', hours: '24/7' },
            { name: 'Crisis Text Line', phone: 'Envía AYUDA al 741741', hours: '24/7' },
            { name: 'Emergencias Generales', phone: '911', hours: '24/7' }
        ],
        minorProtocol: 'Mandated reporting a Child Protective Services (CPS) en sospecha de abuso o riesgo crítico.'
    }
};

/**
 * Cálculo estructurado C-SSRS (Columbia-Suicide Severity Rating Scale)
 * No sustituye el juicio clínico, pero orienta objetivamente el nivel de intervención.
 */
function calculateCSSRSRisk(data) {
    if (!data) return { level: 'bajo', label: 'Bajo Riesgo', score: 0, immediateActionRequired: false };

    let score = 0;
    if (data.passiveWish) score += 1;
    if (data.activeIdeation) score += 2;
    if (data.specificMethod) score += 3;
    if (data.suicidalIntent) score += 4;
    if (data.specificPlan) score += 5;
    if (data.lethalMeansAccess) score += 4;
    if (data.priorAttempts) score += 3;
    if (!data.protectiveFactors || data.protectiveFactors.length === 0) score += 2;

    let level = 'bajo';
    let label = 'Bajo Riesgo (Monitorizar y soporte)';
    let immediateActionRequired = false;

    if (score >= 12 || (data.suicidalIntent && data.lethalMeansAccess) || (data.specificPlan && data.suicidalIntent)) {
        level = 'extremo';
        label = '🚨 RIESGO INMINENTE / CRÍTICO (Acompañamiento 24h y derivación hospitalaria inmediata)';
        immediateActionRequired = true;
    } else if (score >= 7 || data.specificPlan || data.suicidalIntent) {
        level = 'alto';
        label = '⚠️ RIESGO ALTO (Plan de seguridad escrito, contacto familiar y adelanto de sesión)';
        immediateActionRequired = true;
    } else if (score >= 3 || data.activeIdeation) {
        level = 'moderado';
        label = '🟡 RIESGO MODERADO (Estrategias de contención, revisión de factores estresores)';
    }

    return { level, label, score, immediateActionRequired };
}

/**
 * Despliega el Modal Completo de Protocolo de Crisis (CLI-004)
 */
function showCrisisProtocol(patient, triggerReason = 'Alerta de Riesgo') {
    if (!patient) return;

    const modalId = 'crisisModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const defaultCountry = patient.countryCode || (patient.phone && patient.phone.startsWith('+58') ? 'VE' : (patient.phone && patient.phone.startsWith('+57') ? 'CO' : (patient.phone && patient.phone.startsWith('+54') ? 'AR' : 'VE')));
    window._selectedCrisisCountry = defaultCountry;
    window._currentCrisisPatient = patient;

    renderCrisisModalContent(modalId, patient, triggerReason, defaultCountry);
    openModal(modalId);
}

function renderCrisisModalContent(modalId, patient, triggerReason, countryCode) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const countryData = CrisisEmergencyDirectory[countryCode] || CrisisEmergencyDirectory.VE;
    const isMinor = patient.category === 'child' || patient.category === 'adolescent' || (patient.age && patient.age < 18);

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('${modalId}')"></div>
        <div class="modal-content modal-large" style="border-top: 6px solid #e16259; max-width: 850px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <div>
                    <h2 style="color:#e16259; display:flex; align-items:center; gap:8px; margin:0; font-size:18px;">
                        🚨 Protocolo Clínico de Crisis, Riesgo Suicida y Contención
                    </h2>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:3px;">
                        Cumplimiento de estándares éticos, evaluación estructurada C-SSRS y registro de actuación humana (CLI-004)
                    </div>
                </div>
                <button class="btn-icon" onclick="closeModal('${modalId}')"><i class="fas fa-times"></i></button>
            </div>

            <div class="modal-form" style="padding-top:10px;">
                <!-- Alerta Contextual -->
                <div style="background:#fdf2f2; border:1px solid #f5c6cb; color:#721c24; padding:12px 16px; border-radius:8px; margin-bottom:16px; font-size:13.5px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div>
                        <strong>Motivo de activación:</strong> ${triggerReason} · Paciente: <strong>${patient.name}</strong> (${patient.age || 'Edad no reg.'} años)
                    </div>
                    <span style="background:#e16259; color:#fff; font-size:11px; font-weight:700; padding:3px 8px; border-radius:12px;">REVISIÓN PROFESIONAL REQUERIDA</span>
                </div>

                <!-- Tabs del Protocolo -->
                <div style="display:flex; gap:8px; border-bottom:1px solid var(--border-color); margin-bottom:16px;">
                    <button type="button" class="tab-btn active" id="tabBtnCSSRS" onclick="switchCrisisTab('cssrs')" style="padding:8px 14px; font-weight:600; border:none; background:none; cursor:pointer; border-bottom:2px solid #e16259; color:var(--text-primary);">
                        1. Evaluación C-SSRS
                    </button>
                    <button type="button" class="tab-btn" id="tabBtnDirectory" onclick="switchCrisisTab('directory')" style="padding:8px 14px; font-weight:600; border:none; background:none; cursor:pointer; color:var(--text-secondary);">
                        2. Directorio Local & Protocolos
                    </button>
                    <button type="button" class="tab-btn" id="tabBtnAction" onclick="switchCrisisTab('action')" style="padding:8px 14px; font-weight:600; border:none; background:none; cursor:pointer; color:var(--text-secondary);">
                        3. Registro de Actuación Humana
                    </button>
                </div>

                <!-- SECCIÓN 1: EVALUACIÓN ESTRUCTURADA C-SSRS -->
                <div id="crisisSecCSSRS">
                    <div style="background:var(--bg-secondary); padding:14px; border-radius:8px; margin-bottom:16px; font-size:12.5px; color:var(--text-secondary);">
                        <strong>Nota deontológica:</strong> La respuesta positiva a cuestionarios o cribados (p. ej. Ítem 9 PHQ-9) no equivale a un diagnóstico definitivo ni prescribe una conducta obligatoria sin valoración experta. Valore las siguientes dimensiones:
                    </div>

                    <div style="display:grid; grid-template-columns:1fr; gap:10px; margin-bottom:16px;">
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsWish" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>1. Deseo pasivo de estar muerto:</strong> Desea acostarse y no despertar, o cansancio extremo de vivir sin plan activo.</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsIdeation" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>2. Ideación activa no específica:</strong> Pensamientos de quitarse la vida sin método elaborado ni intención manifiesta.</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsMethod" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>3. Ideación suicida activa con método:</strong> Ha contemplado métodos potenciales específicos.</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsIntent" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>4. Intención activa (sin plan detallado):</strong> El paciente verbaliza propósito o determinación de ejecutar la conducta.</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsPlan" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>5. Ideación suicida activa con plan estructurado e intención:</strong> Pasos, cronograma o preparativos definidos.</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:rgba(225,98,89,0.1); border-left:3px solid #e16259; border-radius:6px;">
                            <input type="checkbox" id="cssrsMeans" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>6. Acceso inmediato a medios letales:</strong> Disponibilidad directa en su entorno (medicación masiva, armas, altura).</span>
                        </label>
                        <label class="checkbox-label" style="display:flex; align-items:center; gap:8px; font-size:13px; cursor:pointer; padding:8px; background:var(--bg-secondary); border-radius:6px;">
                            <input type="checkbox" id="cssrsAttempts" onchange="updateLiveCSSRSCalculation()">
                            <span><strong>7. Antecedentes de tentativas previas / autolesiones en los últimos 6 meses.</strong></span>
                        </label>
                    </div>

                    <div class="form-group" style="margin-bottom:16px;">
                        <label style="font-size:12.5px; font-weight:700;">Factores Protectores Identificados</label>
                        <input type="text" id="cssrsProtective" placeholder="Ej. Apoyo familiar activo, mascota, creencias espirituales, vínculo terapéutico..." style="width:100%; font-size:13px;">
                    </div>

                    <div id="cssrsResultCard" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:12px 16px; margin-bottom:16px;">
                        <div style="font-weight:700; font-size:14px;" id="cssrsLevelText">Nivel de Riesgo Evaluado: Bajo Riesgo (Monitorizar)</div>
                        <div style="font-size:12px; color:var(--text-secondary); margin-top:4px;" id="cssrsRecommendation">Mantener canal de apoyo habitual y pautas de afrontamiento.</div>
                    </div>
                </div>

                <!-- SECCIÓN 2: DIRECTORIO LOCALIZADO & PROTOCOLOS ESPECIALES -->
                <div id="crisisSecDirectory" style="display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; flex-wrap:wrap; gap:10px;">
                        <label style="font-size:13px; font-weight:700;">País de residencia actual del paciente:</label>
                        <select id="crisisCountrySelect" onchange="handleCrisisCountryChange(this.value)" style="padding:6px 12px; border-radius:6px; border:1px solid var(--border-color); font-size:13px;">
                            <option value="VE" ${countryCode === 'VE' ? 'selected' : ''}>🇻🇪 Venezuela</option>
                            <option value="CO" ${countryCode === 'CO' ? 'selected' : ''}>🇨🇴 Colombia</option>
                            <option value="AR" ${countryCode === 'AR' ? 'selected' : ''}>🇦🇷 Argentina</option>
                            <option value="CL" ${countryCode === 'CL' ? 'selected' : ''}>🇨🇱 Chile</option>
                            <option value="MX" ${countryCode === 'MX' ? 'selected' : ''}>🇲🇽 México</option>
                            <option value="ES" ${countryCode === 'ES' ? 'selected' : ''}>🇪🇸 España</option>
                            <option value="US" ${countryCode === 'US' ? 'selected' : ''}>🇺🇸 Estados Unidos / Internacional</option>
                        </select>
                    </div>

                    <!-- Contactos Personales del Paciente -->
                    <div class="form-section-title" style="font-size:13px; font-weight:700; margin-bottom:8px;">1. Contactos Personales de Emergencia Registrados</div>
                    <div style="background:var(--bg-secondary); padding:12px; border-radius:8px; margin-bottom:16px; font-size:13px;">
                        <p style="margin:4px 0;"><strong>Contacto principal:</strong> ${patient.emergency || 'No registrado en la ficha'}</p>
                        <p style="margin:4px 0;"><strong>Vínculo / Parentesco:</strong> ${patient.emergencyRelation || 'No especificado'}</p>
                        <p style="margin:4px 0;"><strong>Teléfono del Paciente:</strong> ${patient.phone || 'No registrado'}</p>
                    </div>

                    <!-- Líneas Locales 24/7 -->
                    <div class="form-section-title" style="font-size:13px; font-weight:700; margin-bottom:8px;">2. Líneas Sanitarias Gratuitas 24/7 (${countryData.country})</div>
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;" id="crisisHotlinesList">
                        ${countryData.hotlines.map(h => `
                            <div style="padding:10px; background:var(--bg-secondary); border-radius:6px; font-size:12.5px; border-left:3px solid var(--accent-primary);">
                                <strong>${h.name}</strong><br>
                                📞 <span style="font-weight:700; color:var(--text-primary);">${h.phone}</span><br>
                                <span style="font-size:11px; color:var(--text-secondary);">${h.hours}</span>
                            </div>
                        `).join('')}
                    </div>

                    <!-- Protocolos Especiales -->
                    <div class="form-section-title" style="font-size:13px; font-weight:700; margin-bottom:8px;">3. Protocolos Específicos (Menores, Violencia y Terceros)</div>
                    <div style="background:var(--bg-secondary); padding:12px; border-radius:8px; margin-bottom:16px; font-size:12.5px; line-height:1.5;">
                        <p style="margin:4px 0;"><strong>🧒 Emergencias con Menores:</strong> ${countryData.minorProtocol}</p>
                        <p style="margin:4px 0;"><strong>🛑 Violencia Basada en Género / Doméstica:</strong> Activar derivación a fiscalía o unidades especializadas con resguardo de seguridad física inmediata sin exponer a la víctima frente al agresor.</p>
                        <p style="margin:4px 0;"><strong>⚖️ Riesgo Grave para Terceros:</strong> El deber de confidencialidad cede deontológicamente (Doctrina Tarasoff / Deontología Psicológica FPV) para advertir a la persona amenazada y a las autoridades competentes.</p>
                    </div>
                </div>

                <!-- SECCIÓN 3: REGISTRO DE ACTUACIÓN HUMANA (TRAZABILIDAD) -->
                <div id="crisisSecAction" style="display:none;">
                    <form id="crisisDocumentationForm" onsubmit="handleCrisisDocumentationSubmit(event, '${patient.id}')">
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px;">
                            <div class="form-group">
                                <label style="font-size:12px; font-weight:700;">Profesional Evaluador Responsable *</label>
                                <input type="text" id="crisisAttendedBy" required value="${AppState.currentUser?.name || 'Psicólogo Clínico'}" style="width:100%; font-size:13px;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:12px; font-weight:700;">Estado de la Alerta Clínica *</label>
                                <select id="crisisAlertStatus" style="width:100%; font-size:13px; padding:8px; border-radius:6px; border:1px solid var(--border-color);">
                                    <option value="DOCUMENTADA">✅ DOCUMENTADA Y ATENDIDA</option>
                                    <option value="EN_SEGUIMIENTO">⏳ EN SEGUIMIENTO ACTIVO (24-48h)</option>
                                    <option value="DERIVADA">🏥 DERIVADA A CENTRO HOSPITALARIO</option>
                                    <option value="PENDIENTE">⚠️ PENDIENTE DE REVISIÓN</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group" style="margin-bottom:12px;">
                            <label style="font-size:12px; font-weight:700;">Medidas Clínicas Inmediatas Adoptadas *</label>
                            <textarea id="crisisActionsTaken" required rows="3" style="width:100%; font-size:13px;" placeholder="Detallar: Entrevista de contención telefónica/presencial, contacto formal con familiares, restricción de acceso a fármacos, pacto de no agresión..."></textarea>
                        </div>

                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                            <div class="form-group">
                                <label style="font-size:12px; font-weight:700;">Destino de Derivación (si aplica)</label>
                                <input type="text" id="crisisReferral" placeholder="Ej. Guardia Psiquiátrica Hospitalaria..." style="width:100%; font-size:13px;">
                            </div>
                            <div class="form-group">
                                <label style="font-size:12px; font-weight:700;">Cronograma de Seguimiento</label>
                                <input type="text" id="crisisFollowUp" placeholder="Ej. Llamada de control a las 18:00 y cita mañana" style="width:100%; font-size:13px;">
                            </div>
                        </div>

                        <div class="modal-actions" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                            <button type="button" class="btn-secondary" onclick="printCrisisPlan('${patient.id}')">
                                <i class="fas fa-print"></i> Imprimir Plan de Seguridad
                            </button>
                            <div style="display:flex; gap:8px;">
                                <button type="button" class="btn-secondary" onclick="closeModal('${modalId}')">Cerrar</button>
                                <button type="submit" class="btn-primary" style="background:#e16259;">
                                    <i class="fas fa-save"></i> Guardar Actuación Humana
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div class="modal-actions" id="crisisModalGeneralFooter" style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; border-top:1px solid var(--border-color); padding-top:16px;">
                    <button class="btn-secondary" onclick="closeModal('${modalId}')">Cerrar</button>
                    <div style="display:flex; gap:8px;">
                        <button class="btn-secondary" onclick="switchCrisisTab('directory')">
                            Ver Directorio Telefónico <i class="fas fa-arrow-right"></i>
                        </button>
                        <button class="btn-primary" style="background:#e16259;" onclick="switchCrisisTab('action')">
                            <i class="fas fa-clipboard-check"></i> Registrar Actuación Humana
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function switchCrisisTab(tab) {
    const sCSSRS = document.getElementById('crisisSecCSSRS');
    const sDir = document.getElementById('crisisSecDirectory');
    const sAct = document.getElementById('crisisSecAction');
    const bCSSRS = document.getElementById('tabBtnCSSRS');
    const bDir = document.getElementById('tabBtnDirectory');
    const bAct = document.getElementById('tabBtnAction');
    const footer = document.getElementById('crisisModalGeneralFooter');

    if (!sCSSRS || !sDir || !sAct) return;

    sCSSRS.style.display = tab === 'cssrs' ? 'block' : 'none';
    sDir.style.display = tab === 'directory' ? 'block' : 'none';
    sAct.style.display = tab === 'action' ? 'block' : 'none';

    if (footer) footer.style.display = tab === 'action' ? 'none' : 'flex';

    [bCSSRS, bDir, bAct].forEach(btn => {
        if (btn) {
            btn.style.color = 'var(--text-secondary)';
            btn.style.borderBottom = 'none';
        }
    });

    const activeBtn = tab === 'cssrs' ? bCSSRS : (tab === 'directory' ? bDir : bAct);
    if (activeBtn) {
        activeBtn.style.color = 'var(--text-primary)';
        activeBtn.style.borderBottom = '2px solid #e16259';
    }
}

function handleCrisisCountryChange(countryCode) {
    window._selectedCrisisCountry = countryCode;
    const patient = window._currentCrisisPatient;
    if (!patient) return;

    const countryData = CrisisEmergencyDirectory[countryCode] || CrisisEmergencyDirectory.VE;
    const hotlinesContainer = document.getElementById('crisisHotlinesList');
    if (hotlinesContainer) {
        hotlinesContainer.innerHTML = countryData.hotlines.map(h => `
            <div style="padding:10px; background:var(--bg-secondary); border-radius:6px; font-size:12.5px; border-left:3px solid var(--accent-primary);">
                <strong>${h.name}</strong><br>
                📞 <span style="font-weight:700; color:var(--text-primary);">${h.phone}</span><br>
                <span style="font-size:11px; color:var(--text-secondary);">${h.hours}</span>
            </div>
        `).join('');
    }
}

function updateLiveCSSRSCalculation() {
    const data = {
        passiveWish: document.getElementById('cssrsWish')?.checked || false,
        activeIdeation: document.getElementById('cssrsIdeation')?.checked || false,
        specificMethod: document.getElementById('cssrsMethod')?.checked || false,
        suicidalIntent: document.getElementById('cssrsIntent')?.checked || false,
        specificPlan: document.getElementById('cssrsPlan')?.checked || false,
        lethalMeansAccess: document.getElementById('cssrsMeans')?.checked || false,
        priorAttempts: document.getElementById('cssrsAttempts')?.checked || false,
        protectiveFactors: document.getElementById('cssrsProtective')?.value?.trim() || ''
    };

    const res = calculateCSSRSRisk(data);
    const card = document.getElementById('cssrsResultCard');
    const levelText = document.getElementById('cssrsLevelText');
    const recText = document.getElementById('cssrsRecommendation');

    if (!card || !levelText || !recText) return;

    levelText.textContent = `Nivel de Riesgo Evaluado: ${res.label}`;
    if (res.level === 'extremo') {
        card.style.background = '#fdf2f2';
        card.style.borderColor = '#e16259';
        recText.textContent = 'URGENCIA CRÍTICA: Derivación asistencial inmediata, no dejar al paciente a solas bajo ninguna circunstancia, contactar a la red de apoyo.';
    } else if (res.level === 'alto') {
        card.style.background = '#fff8e6';
        card.style.borderColor = '#f59e0b';
        recText.textContent = 'ALTO RIESGO: Formalizar plan de seguridad, restringir medios de autolesión, citar a familiares y coordinar seguimiento.';
    } else if (res.level === 'moderado') {
        card.style.background = 'var(--bg-secondary)';
        card.style.borderColor = 'var(--border-color)';
        recText.textContent = 'RIESGO MODERADO: Fomentar factores protectores, pacto de contención y adelanto de sesión.';
    } else {
        card.style.background = 'var(--bg-secondary)';
        card.style.borderColor = 'var(--border-color)';
        recText.textContent = 'BAJO RIESGO: Reforzar recursos personales y monitorizar en próximas sesiones.';
    }
}

function handleCrisisDocumentationSubmit(e, patientId) {
    e.preventDefault();
    const patient = AppState.patients.find(p => p.id === patientId) || window._currentCrisisPatient;
    if (!patient) return;

    const attendedBy = document.getElementById('crisisAttendedBy')?.value?.trim() || 'Psicólogo Clínico';
    const status = document.getElementById('crisisAlertStatus')?.value || 'DOCUMENTADA';
    const actionsTaken = document.getElementById('crisisActionsTaken')?.value?.trim() || '';
    const referral = document.getElementById('crisisReferral')?.value?.trim() || '';
    const followUp = document.getElementById('crisisFollowUp')?.value?.trim() || '';

    const cssrsData = {
        passiveWish: document.getElementById('cssrsWish')?.checked || false,
        activeIdeation: document.getElementById('cssrsIdeation')?.checked || false,
        specificMethod: document.getElementById('cssrsMethod')?.checked || false,
        suicidalIntent: document.getElementById('cssrsIntent')?.checked || false,
        specificPlan: document.getElementById('cssrsPlan')?.checked || false,
        lethalMeansAccess: document.getElementById('cssrsMeans')?.checked || false,
        priorAttempts: document.getElementById('cssrsAttempts')?.checked || false,
        protectiveFactors: document.getElementById('cssrsProtective')?.value?.trim() || ''
    };
    const cssrsResult = calculateCSSRSRisk(cssrsData);

    const record = {
        id: (typeof generateId === 'function') ? generateId() : 'crisis_' + Date.now(),
        patientId: patient.id,
        patientName: patient.name,
        date: new Date().toISOString(),
        attendedBy,
        status,
        countryCode: window._selectedCrisisCountry || 'VE',
        cssrsScore: cssrsResult.score,
        riskLevel: cssrsResult.level,
        riskLabel: cssrsResult.label,
        actionsTaken,
        referralDestination: referral,
        followUpSchedule: followUp,
        safetyPlanAgreed: true
    };

    saveCrisisAssessment(patient.id, record);

    // Ocultar banner si ya fue documentada
    if (typeof dismissCrisisBanner === 'function') {
        dismissCrisisBanner();
    }

    closeModal('crisisModal');
    if (typeof showToast === 'function') {
        showToast('✅ Actuación humana y evaluación de crisis documentadas con éxito en el expediente', 'success');
    }
}

function saveCrisisAssessment(patientId, assessmentRecord) {
    try {
        const key = `psico_crisis_assessments_${patientId}`;
        const existing = JSON.parse(localStorage.getItem(key) || '[]');
        existing.push(assessmentRecord);
        localStorage.setItem(key, JSON.stringify(existing));

        // Registrar también en el historial de notas clínicas como nota de intervención en crisis
        if (typeof AppState !== 'undefined' && Array.isArray(AppState.notes)) {
            const crisisNote = {
                id: (typeof generateId === 'function') ? generateId() : 'note_crisis_' + Date.now(),
                patientId: patientId,
                date: toDateInputValue ? toDateInputValue(new Date()) : new Date().toISOString().split('T')[0],
                title: `🚨 Intervención en Crisis — ${assessmentRecord.riskLabel}`,
                subjetivo: `Evaluación de crisis y riesgo suicida estructurada C-SSRS. Nivel ponderado: ${assessmentRecord.riskLabel}. Factores protectores: ${assessmentRecord.protectiveFactors || 'Evaluados en consulta.'}`,
                objetivo: `Evaluación clínica de riesgo suicida C-SSRS (Puntuación: ${assessmentRecord.cssrsScore}). Estado: ${assessmentRecord.status}. Destino de derivación: ${assessmentRecord.referralDestination || 'Contención ambulatoria'}.`,
                analisis: `Evaluación realizada por ${assessmentRecord.attendedBy}. Criterio clínico de intervención inmediata aplicado bajo protocolo ético.`,
                plan: `Medidas adoptadas: ${assessmentRecord.actionsTaken}. Plan de seguimiento: ${assessmentRecord.followUpSchedule || 'Revisión en 24h'}.`,
                risk: assessmentRecord.riskLevel === 'extremo' || assessmentRecord.riskLevel === 'alto' ? 'alto' : 'medio',
                confidential: true,
                createdAt: new Date().toISOString()
            };
            AppState.notes.unshift(crisisNote);
            if (typeof saveData === 'function') saveData();
        }
    } catch (e) {
        console.warn('Error saving crisis assessment:', e);
    }
}

function getCrisisAssessments(patientId) {
    try {
        const key = `psico_crisis_assessments_${patientId}`;
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch {
        return [];
    }
}

function printCrisisPlan(patientId) {
    const p = (typeof AppState !== 'undefined' && AppState.patients) 
        ? AppState.patients.find(x => x.id === patientId) 
        : window._currentCrisisPatient;
    if (!p) return;

    const countryCode = window._selectedCrisisCountry || p.countryCode || 'VE';
    const countryData = CrisisEmergencyDirectory[countryCode] || CrisisEmergencyDirectory.VE;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Plan de Seguridad y Contención en Crisis - ${p.name}</title>
            <style>
                body { font-family: 'Inter', -apple-system, sans-serif; max-width: 740px; margin: 30px auto; padding: 24px; color: #1e293b; line-height: 1.6; }
                h1 { color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 8px; font-size: 22px; margin-top: 0; }
                .box { border: 1px solid #cbd5e1; padding: 14px; border-radius: 8px; background: #f8fafc; margin-bottom: 20px; font-size: 13.5px; }
                .hotlines { background: #fef2f2; border: 1px solid #fecaca; padding: 14px; border-radius: 8px; margin-bottom: 20px; font-size: 13px; }
                ol { padding-left: 22px; font-size: 13.5px; }
                li { margin-bottom: 8px; }
                .sign { margin-top: 60px; display: flex; justify-content: space-between; }
                .line { border-top: 1px solid #000; width: 44%; text-align: center; padding-top: 6px; font-size: 12.5px; }
                @media print { body { margin: 0; padding: 15px; } }
            </style>
        </head>
        <body>
            <h1>🚨 Plan de Seguridad y Contención Personal</h1>
            <div class="box">
                <p style="margin:4px 0;"><strong>Paciente:</strong> ${p.name} · <strong>Ficha:</strong> ${p.id}</p>
                <p style="margin:4px 0;"><strong>Contacto Personal de Apoyo:</strong> ${p.emergency || 'Pendiente de registrar'} (${p.emergencyRelation || '—'})</p>
                <p style="margin:4px 0;"><strong>Fecha de Formulación:</strong> ${new Date().toLocaleDateString('es-ES', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</p>
            </div>

            <div class="hotlines">
                <strong style="color:#b91c1c;">Líneas Sanitarias de Emergencia 24/7 (${countryData.country}):</strong>
                <ul style="margin:6px 0 0 0; padding-left:20px;">
                    ${countryData.hotlines.map(h => `<li><strong>${h.name}:</strong> 📞 ${h.phone} (${h.hours})</li>`).join('')}
                </ul>
            </div>

            <h3>Pasos Concretos de Acción ante Crisis:</h3>
            <ol>
                <li><strong>Reconocer las señales de advertencia personales:</strong> Identificar pensamientos, emociones o situaciones que anticipan la escalada del malestar.</li>
                <li><strong>Estrategias de afrontamiento internas inmediatas:</strong> Realizar ejercicios de respiración lenta 4-7-8, anclaje sensorial 5-4-3-2-1 o actividad distractora segura.</li>
                <li><strong>Contactar a mi persona de confianza y apoyo:</strong> Comunicarme de inmediato con mi contacto personal indicado arriba o familiares cercanos.</li>
                <li><strong>Hacer el entorno seguro:</strong> Asegurar que un familiar o acompañante resguarde fármacos y objetos potencialmente peligrosos.</li>
                <li><strong>Llamar a los servicios de emergencia o acudir al centro asistencial:</strong> Si el malestar persiste o siento pérdida de control, comunicarme inmediatamente a las líneas de emergencia arriba listadas.</li>
            </ol>

            <div class="sign">
                <div class="line">
                    <strong>Firma del Paciente</strong><br>
                    ${p.name}
                </div>
                <div class="line">
                    <strong>Firma del Profesional Responsable</strong><br>
                    ${(typeof AppState !== 'undefined' && AppState.currentUser?.name) ? AppState.currentUser.name : 'Psicólogo Clínico'}
                </div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
        w.document.write(html);
        w.document.close();
    }
}

// Exportación para entornos Node.js y navegadores
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CrisisEmergencyDirectory,
        calculateCSSRSRisk,
        saveCrisisAssessment,
        getCrisisAssessments
    };
}
if (typeof globalThis !== 'undefined') {
    globalThis.CrisisEmergencyDirectory = CrisisEmergencyDirectory;
    globalThis.calculateCSSRSRisk = calculateCSSRSRisk;
    globalThis.showCrisisProtocol = showCrisisProtocol;
    globalThis.switchCrisisTab = switchCrisisTab;
    globalThis.handleCrisisCountryChange = handleCrisisCountryChange;
    globalThis.updateLiveCSSRSCalculation = updateLiveCSSRSCalculation;
    globalThis.handleCrisisDocumentationSubmit = handleCrisisDocumentationSubmit;
    globalThis.saveCrisisAssessment = saveCrisisAssessment;
    globalThis.getCrisisAssessments = getCrisisAssessments;
    globalThis.printCrisisPlan = printCrisisPlan;
}
if (typeof window !== 'undefined') {
    window.CrisisEmergencyDirectory = CrisisEmergencyDirectory;
    window.calculateCSSRSRisk = calculateCSSRSRisk;
    window.showCrisisProtocol = showCrisisProtocol;
    window.switchCrisisTab = switchCrisisTab;
    window.handleCrisisCountryChange = handleCrisisCountryChange;
    window.updateLiveCSSRSCalculation = updateLiveCSSRSCalculation;
    window.handleCrisisDocumentationSubmit = handleCrisisDocumentationSubmit;
    window.saveCrisisAssessment = saveCrisisAssessment;
    window.getCrisisAssessments = getCrisisAssessments;
    window.printCrisisPlan = printCrisisPlan;
}
