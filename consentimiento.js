/**
 * PSICO NOTES CLINICAL - CONSENTIMIENTO INFORMADO TERAPÉUTICO Y FIRMA DIGITAL
 */

let currentConsentPatientId = null;
let signatureCanvas = null;
let signatureCtx = null;
let isDrawingSignature = false;

function openInformedConsentModal(patientId) {
    currentConsentPatientId = patientId;
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;

    let modal = document.getElementById('consentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'consentModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    const cat = (typeof getPatientCategory === 'function') ? getPatientCategory(patient) : 'adult';
    let consentIntro = '';
    let consentClauses = '';
    let modalDocTitle = '📜 Consentimiento Informado & Firma Digital';

    if (cat === 'child') {
        modalDocTitle = '🧒 Consentimiento Informado — Representación Legal en la Niñez';
        consentIntro = `Yo, <strong>${patient.guardianName || 'Representante Legal'}</strong>, en calidad de <strong>${patient.guardianRelation || 'Tutor/a Legal'}</strong> del/de la menor <strong>${patient.name}</strong>, autorizo el inicio del proceso psicoterapéutico y de acompañamiento en la infancia con <strong>${AppState.currentUser?.name || 'el/la profesional'}</strong>.`;
        consentClauses = `
            <p><strong>1. Encuadre en la Niñez:</strong> La intervención contempla sesiones de evaluación, actividades terapéuticas adaptadas y devoluciones periódicas de orientación a los tutores.</p>
            <p><strong>2. Confidencialidad y Protección del Menor:</strong> Toda la información está resguardada bajo secreto profesional, salvo riesgo físico inminente, abuso o vulneración de derechos.</p>
            <p><strong>3. Orientación y Acompañamiento Parental:</strong> Se brindarán pautas de acompañamiento psicoemocional y parental para favorecer el bienestar integral del menor.</p>
        `;
    } else if (cat === 'adolescent') {
        modalDocTitle = '🧑 Consentimiento Informado — Adolescencia y Representación Legal';
        consentIntro = `En representación de <strong>${patient.name}</strong> (adolescente) y con su asentimiento, yo <strong>${patient.guardianName || 'Tutor/a Legal'}</strong> (${patient.guardianRelation || 'Tutor'}), acordamos el encuadre psicoterapéutico con <strong>${AppState.currentUser?.name || 'el/la profesional'}</strong>.`;
        consentClauses = `
            <p><strong>1. Espacio Privado y Reserva Profesional:</strong> El espacio terapéutico brinda un marco de escucha confidencial. Se garantiza reserva frente a terceros, salvo situación de riesgo vital o vulneración grave.</p>
            <p><strong>2. Alianza Terapéutica y Asentimiento:</strong> El/la adolescente participa de manera informada y voluntaria en sus objetivos terapéuticos.</p>
            <p><strong>3. Sesiones de Orientación Familiar:</strong> Las sesiones conjuntas se consensuarán previamente respetando la autonomía y bienestar del consultante.</p>
        `;
    } else {
        consentIntro = `Yo, <strong>${patient.name}</strong>, declaro haber sido informado/a sobre el proceso psicoterapéutico que inicio con <strong>${AppState.currentUser?.name || 'el/la profesional'}</strong>.`;
        consentClauses = `
            <p><strong>1. Confidencialidad:</strong> Toda la información compartida está protegida por el Secreto Profesional, salvo riesgo inminente para la integridad o requerimiento judicial formal.</p>
            <p><strong>2. Asistencia y Cancelaciones:</strong> Las sesiones tienen una duración de 50 minutos. Cancelaciones con al menos 24h de anticipación.</p>
            <p><strong>3. Voluntariedad:</strong> El paciente puede finalizar el proceso cuando lo desee previa notificación.</p>
        `;
    }

    const sharedClauses = `
        <p><strong>4. Teleconsulta y Atención Telemática:</strong> Las sesiones virtuales se realizan mediante canales cifrados de extremo a extremo sin almacenamiento de grabaciones. El paciente/tutor autoriza el uso de la plataforma digital para la gestión del expediente clínico y la comunicación intersesión.</p>
        <p><strong>5. Asistencia de Inteligencia Artificial Clínica y Privacidad:</strong> El profesional podrá utilizar herramientas digitales de apoyo para la transcripción, redacción de notas SOAP y análisis psicométrico. Se garantiza la anonimización y desidentificación de datos sensibles antes de cualquier procesamiento asistido. La IA actúa exclusivamente como asistente administrativo y nunca toma decisiones clínicas ni emite diagnósticos independientes.</p>
    `;

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('consentModal')"></div>
        <div class="modal-content modal-large" style="max-width: 680px;">
            <div class="modal-header">
                <h2>${modalDocTitle}</h2>
                <button class="btn-icon" onclick="closeModal('consentModal')"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:16px 0;">
                <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px;">
                    Persona en Proceso: <strong>${patient.name}</strong> · ${cat === 'child' ? 'Etapa: Niñez' : cat === 'adolescent' ? 'Etapa: Adolescencia' : 'Etapa: Adultez'} | Fecha: ${new Date().toLocaleDateString('es-ES')}
                </p>

                <div style="max-height: 200px; overflow-y: auto; background: var(--bg-secondary); padding: 14px; border-radius: var(--radius-md); font-size: 12px; line-height: 1.5; margin-bottom: 16px; border: 1px solid var(--border-primary);">
                    <h4 style="margin-top:0;">Encuadre Clínico y Secreto Profesional Adaptado</h4>
                    <p>${consentIntro}</p>
                    ${consentClauses}
                    ${sharedClauses}
                </div>

                <div style="margin-bottom:14px;background:var(--bg-secondary);padding:10px 14px;border-radius:var(--radius-md);font-size:12px;border:1px solid var(--border-primary);">
                    <div style="font-weight:600;margin-bottom:6px;color:var(--text-primary);">Cláusulas de Aceptación Expresa:</div>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;">
                        <input type="checkbox" id="chkEncuadre" checked disabled>
                        <span>Acepto el encuadre terapéutico y el secreto profesional.</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:6px;">
                        <input type="checkbox" id="chkTelehealth" checked>
                        <span>Autorizo la atención por teleconsulta y el tratamiento digital del expediente.</span>
                    </label>
                    <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
                        <input type="checkbox" id="chkAiAssisted" checked>
                        <span>Autorizo el uso de herramientas de IA asistida bajo estricta anonimización clínica.</span>
                    </label>
                </div>

                <div class="form-group">
                    <label style="font-weight:600;display:flex;justify-content:space-between;align-items:center;">
                        <span>✍️ ${cat === 'child' ? 'Firma del Representante Legal / Tutor:' : cat === 'adolescent' ? 'Firma del Tutor / Asentimiento Adolescente:' : 'Firma del Paciente en pantalla:'}</span>
                        <button type="button" class="btn-secondary btn-sm" onclick="clearSignatureCanvas()">Limpiar Trazo</button>
                    </label>
                    <div style="border: 2px dashed var(--accent-primary); border-radius: var(--radius-md); background: #ffffff; overflow: hidden; margin-top: 6px;">
                        <canvas id="signaturePadCanvas" width="600" height="150" style="width: 100%; height: 150px; cursor: crosshair; display: block;"></canvas>
                    </div>
                </div>

                <div class="modal-actions" style="margin-top:20px;">
                    <button type="button" class="btn-secondary" onclick="closeModal('consentModal')">Cancelar</button>
                    <button type="button" class="btn-primary" onclick="generateSignedInformedConsent()">
                        <i class="fas fa-file-signature"></i> Guardar y Exportar Documento Oficial
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal('consentModal');
    setTimeout(() => initSignaturePad(), 100);
}

function initSignaturePad() {
    signatureCanvas = document.getElementById('signaturePadCanvas');
    if (!signatureCanvas) return;
    signatureCtx = signatureCanvas.getContext('2d');
    signatureCtx.lineWidth = 2.5;
    signatureCtx.lineCap = 'round';
    signatureCtx.strokeStyle = '#1e293b';

    const getPos = (e) => {
        const rect = signatureCanvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (signatureCanvas.width / rect.width),
            y: (clientY - rect.top) * (signatureCanvas.height / rect.height)
        };
    };

    const startDraw = (e) => {
        isDrawingSignature = true;
        const pos = getPos(e);
        signatureCtx.beginPath();
        signatureCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
        if (!isDrawingSignature) return;
        e.preventDefault();
        const pos = getPos(e);
        signatureCtx.lineTo(pos.x, pos.y);
        signatureCtx.stroke();
    };

    const stopDraw = () => { isDrawingSignature = false; };

    signatureCanvas.onmousedown = startDraw;
    signatureCanvas.onmousemove = draw;
    signatureCanvas.onmouseup = stopDraw;
    signatureCanvas.onmouseleave = stopDraw;

    signatureCanvas.ontouchstart = startDraw;
    signatureCanvas.ontouchmove = draw;
    signatureCanvas.ontouchend = stopDraw;
}

function clearSignatureCanvas() {
    if (signatureCtx && signatureCanvas) {
        signatureCtx.clearRect(0, 0, signatureCanvas.width, signatureCanvas.height);
    }
}

function generateSignedInformedConsent() {
    if (!currentConsentPatientId) return;
    const patient = AppState.patients.find(p => p.id === currentConsentPatientId);
    if (!patient) return;

    let signatureImgData = '';
    if (signatureCanvas) {
        signatureImgData = signatureCanvas.toDataURL('image/png');
    }

    const cat = (typeof getPatientCategory === 'function') ? getPatientCategory(patient) : 'adult';
    let docTitle = 'Documento de Consentimiento Informado Terapéutico';
    let docIntro = `Yo, <strong>${patient.name}</strong> ${patient.birthdate ? `(Nacido/a el ${patient.birthdate})` : ''}, declaro haber sido informado/a de manera clara y comprensible sobre el proceso psicoterapéutico que inicio con el/la profesional <strong>${AppState.currentUser?.name || 'Terapeuta'}</strong> (${AppState.currentUser?.email || ''}).`;
    let docClauses = `
        <div class="clause">
            <span class="clause-title">1. Confidencialidad y Secreto Profesional:</span><br>
            Toda la información compartida durante las sesiones está protegida por el Secreto Profesional. La confidencialidad únicamente podrá ser levantada si existe un riesgo inminente para la integridad propia o de terceros, o por requerimiento judicial.
        </div>
        <div class="clause">
            <span class="clause-title">2. Encuadre y Asistencia:</span><br>
            Las sesiones tienen una duración de 50 minutos. Las cancelaciones deben ser notificadas con al menos 24 horas de antelación.
        </div>
        <div class="clause">
            <span class="clause-title">3. Voluntariedad y Retiro:</span><br>
            El/la paciente se reserva el derecho de interrumpir el tratamiento psicoterapéutico en el momento que lo considere oportuno.
        </div>
    `;
    let sigLabel = `<strong>Firma del Paciente</strong><br>${patient.name}`;

    if (cat === 'child') {
        docTitle = 'Documento de Consentimiento Parental para Psicoterapia Infantil';
        docIntro = `Yo, <strong>${patient.guardianName || 'Representante Legal'}</strong>, en mi condición de <strong>${patient.guardianRelation || 'Tutor/a Legal'}</strong> del/de la menor <strong>${patient.name}</strong> ${patient.birthdate ? `(Edad: ${calculateAge(patient.birthdate)} años)` : ''}, autorizo la atención psicoterapéutica brindada por <strong>${AppState.currentUser?.name || 'Terapeuta'}</strong>.`;
        docClauses = `
            <div class="clause">
                <span class="clause-title">1. Encuadre Pediátrico y Coordinación Parental:</span><br>
                El proceso contempla el trabajo lúdico y terapéutico individual con el/la menor, complementado con sesiones de retroalimentación y orientación a los padres o tutores legales para apoyar los avances en el hogar.
            </div>
            <div class="clause">
                <span class="clause-title">2. Secreto Profesional y Protección de la Infancia:</span><br>
                Se protege la intimidad de las expresiones del/de la menor en sesión, informando a los tutores sobre directrices generales de manejo emocional. La reserva sólo se levantará ante riesgo inminente de daño o vulneración de derechos conforme a la legislación de protección a la niñez.
            </div>
            <div class="clause">
                <span class="clause-title">3. Orientación y Acompañamiento Parental:</span><br>
                Se brindarán pautas de acompañamiento psicoemocional a los tutores legales para apoyar el progreso adaptativo del paciente en su entorno cotidiano.
            </div>
        `;
        sigLabel = `<strong>Firma del Tutor / Representante Legal</strong><br>${patient.guardianName || 'Tutor Responsable'}<br><small>(En representación de ${patient.name})</small>`;
    } else if (cat === 'adolescent') {
        docTitle = 'Consentimiento Informado — Adolescencia y Representación Legal';
        docIntro = `Nosotros, <strong>${patient.guardianName || 'Tutor/a Legal'}</strong> (${patient.guardianRelation || 'Tutor'}) y el/la menor <strong>${patient.name}</strong> (Adolescente, ${patient.birthdate ? calculateAge(patient.birthdate) + ' años' : ''}), acordamos el inicio del proceso terapéutico con <strong>${AppState.currentUser?.name || 'Terapeuta'}</strong>.`;
        docClauses = `
            <div class="clause">
                <span class="clause-title">1. Confidencialidad y Reserva Profesional:</span><br>
                Para favorecer una alianza terapéutica constructiva, las sesiones constituyen un espacio confidencial para el/la adolescente. Los temas conversados no serán divulgados sin su consentimiento, a excepción estricta de situaciones de riesgo vital inminente para sí mismo o para terceros.
            </div>
            <div class="clause">
                <span class="clause-title">2. Asentimiento Informado del Menor:</span><br>
                El/la adolescente expresa su voluntad de participar activamente en el proceso y acordar metas terapéuticas consensuadas que promuevan su bienestar biopsicosocial.
            </div>
            <div class="clause">
                <span class="clause-title">3. Orientación Familiar Consensuada:</span><br>
                Las reuniones con los padres se orientarán a fortalecer la relación familiar y se acordarán previamente con el/la adolescente los temas a comunicar.
            </div>
        `;
        sigLabel = `<strong>Firma del Tutor & Asentimiento Adolescente</strong><br>${patient.guardianName || 'Tutor Legal'} y ${patient.name}`;
    }

    const sharedDocClauses = `
        <div class="clause">
            <span class="clause-title">4. Teleconsulta y Atención Telemática:</span><br>
            Las sesiones virtuales se efectúan mediante canales con cifrado de extremo a extremo, en un entorno privado que asegure la confidencialidad. Se prohíbe la grabación de las sesiones sin consentimiento explícito mutuo.
        </div>
        <div class="clause">
            <span class="clause-title">5. Tratamiento Digital y Asistencia Tecnológica de IA:</span><br>
            El profesional podrá utilizar herramientas digitales de apoyo para la transcripción, redacción de notas clínicas y análisis psicométrico. Se garantiza la anonimización y desidentificación previa de datos sensibles conforme a estándares de privacidad médica. La tecnología actúa exclusivamente como asistente administrativo y nunca toma decisiones clínicas ni emite diagnósticos independientes.
        </div>
    `;
    docClauses += sharedDocClauses;

    // Persistir el consentimiento informado firmado en el expediente clínico del paciente
    const nowIso = new Date().toISOString();
    patient.informedConsent = {
        signed: true,
        signedAt: nowIso,
        guardian: patient.guardianName || null,
        category: cat,
        telehealthAccepted: typeof document !== 'undefined' && document.getElementById('chkTelehealth')?.checked !== false,
        aiAssistanceAccepted: typeof document !== 'undefined' && document.getElementById('chkAiAssisted')?.checked !== false,
        signatureImg: signatureImgData
    };
    if (cat === 'child') patient.guardianConsent = 'firmado';
    if (cat === 'adolescent') patient.adolescentAssent = 'firmado';

    if (typeof saveData === 'function') saveData();
    if (typeof CloudSyncManager !== 'undefined' && typeof CloudSyncManager.schedulePush === 'function') {
        CloudSyncManager.schedulePush();
    }
    if (typeof showToast === 'function') {
        showToast(`✅ Consentimiento informado registrado para ${patient.name}`, 'success');
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Consentimiento Informado - ${patient.name}</title>
            <style>
                body { font-family: 'Inter', -apple-system, sans-serif; max-width: 750px; margin: 40px auto; padding: 30px; color: #1e293b; line-height: 1.6; }
                h1, h2 { text-align: center; }
                h1 { font-size: 20px; color: #0d9488; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
                h2 { font-size: 13px; color: #64748b; margin-top: 0; margin-bottom: 30px; font-weight: 500; }
                p { text-align: justify; font-size: 13px; margin-bottom: 12px; }
                .clause { margin-bottom: 14px; background: #f8fafc; padding: 12px; border-left: 3px solid #0d9488; border-radius: 4px; }
                .clause-title { font-weight: 600; color: #0f766e; }
                .signatures { margin-top: 50px; display: flex; justify-content: space-between; gap: 20px; }
                .sig-box { width: 45%; text-align: center; border-top: 1px solid #cbd5e1; padding-top: 8px; font-size: 12px; }
                .sig-img { max-height: 70px; margin-bottom: 4px; }
                @media print { body { margin: 0; padding: 20px; } }
            </style>
        </head>
        <body>
            <h1>${docTitle}</h1>
            <h2>Encuadre Clínico, Marco Ético y Secreto Profesional</h2>

            <p>${docIntro}</p>

            ${docClauses}

            <p style="margin-top: 24px;">En conformidad con los términos expuestos, se firma el presente documento en fecha <strong>${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>

            <div class="signatures">
                <div class="sig-box">
                    ${signatureImgData ? `<img class="sig-img" src="${signatureImgData}" alt="Firma"><br>` : ''}
                    ${sigLabel}
                </div>
                <div class="sig-box">
                    <br><br>
                    <strong>Firma del Profesional</strong><br>
                    ${AppState.currentUser?.name || 'Terapeuta'}
                </div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;

    closeModal('consentModal');
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}

// Compatibilidad con la función anterior
function generateInformedConsent(patientId) {
    openInformedConsentModal(patientId);
}
