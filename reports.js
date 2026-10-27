/**
 * PSICO NOTES CLINICAL - GENERADOR DE INFORMES CLÍNICOS OFICIALES Y DERIVACIONES
 */

const ClinicalReports = {
    openReportGeneratorModal(patientId = '') {
        let modal = document.getElementById('reportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'reportModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const patientOptions = AppState.patients.map(p => 
            `<option value="${p.id}" ${p.id === patientId ? 'selected' : ''}>${p.name} (${p.diagnosis || 'Sin Diag.'})</option>`
        ).join('');

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('reportModal')"></div>
            <div class="modal-content modal-large" style="max-width: 720px;">
                <div class="modal-header">
                    <h2>📑 Generador de Informes Clínicos Oficiales</h2>
                    <button class="btn-icon" onclick="closeModal('reportModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px 0;">
                    <form id="clinicalReportForm" onsubmit="ClinicalReports.handleGenerateReport(event)">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Paciente *</label>
                                <select id="repPatientId" required class="form-control" onchange="ClinicalReports.onPatientChange(this.value)">
                                    <option value="">-- Seleccionar Paciente --</option>
                                    ${patientOptions}
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Tipo de Informe *</label>
                                <select id="repType" required class="form-control" onchange="ClinicalReports.onTypeChange(this.value)">
                                    <option value="derivacion">📩 Derivación Psiquiátrica / Médica</option>
                                    <option value="general">🧠 Informe Psicopatológico General</option>
                                    <option value="epicrisis">📊 Epicrisis Clínica de Cierre / Alta</option>
                                    <option value="justificativo">💼 Constancia / Justificativo de Asistencia</option>
                                    <option value="asistencia">📜 Certificado de Atención Psicoterapéutica</option>
                                    <option value="cierre">🏁 Informe de Evolución y Cierre</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Título del Documento:</label>
                            <input type="text" id="repTitle" value="INFORME DE DERIVACIÓN PSIQUIÁTRICA" required>
                        </div>

                        <div class="form-group">
                            <label>Destinatario / Dirigido a:</label>
                            <input type="text" id="repRecipient" placeholder="Ej: Dr. / Dra. Especialista en Psiquiatría o A quien corresponda">
                        </div>

                        <div class="form-group">
                            <label>Resumen del Cuadro Clínico / Motivo de Informe:</label>
                            <textarea id="repSummary" rows="4" placeholder="Describa el cuadro actual, sintomatología predominante y razones de la derivación o evaluación..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>Recomendaciones / Plan Propuesto:</label>
                            <textarea id="repRecommendations" rows="3" placeholder="Sugerencias de evaluación psicofarmacológica, seguimiento conjunto..."></textarea>
                        </div>

                        <div style="border-top:1px solid var(--border-primary);padding-top:12px;margin-top:16px;">
                            <h4 style="margin:0 0 10px 0;font-size:13px;color:var(--text-secondary);">⚙️ Datos de Membrete Profesional</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Colegiado / Licencia Nº:</label>
                                    <input type="text" id="repLicence" placeholder="Ej: FPV-12345 / Col. 9876" value="${localStorage.getItem('psico_licence') || ''}">
                                </div>
                                <div class="form-group">
                                    <label>Especialidad / Centro:</label>
                                    <input type="text" id="repSpecialty" placeholder="Ej: Psicología Clínica & Salud Mental" value="${localStorage.getItem('psico_specialty') || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="modal-actions" style="margin-top:20px;">
                            <button type="button" class="btn-secondary" onclick="closeModal('reportModal')">Cancelar</button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-file-pdf"></i> Generar & Exportar PDF Oficial
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        openModal('reportModal');
        if (patientId) this.onPatientChange(patientId);
    },

    onPatientChange(patientId) {
        if (!patientId) return;
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;
        
        const summary = document.getElementById('repSummary');
        if (summary && !summary.value) {
            summary.value = `El/la paciente ${patient.name} se encuentra en atención psicoterapéutica. Presenta diagnóstico presuntivo de ${patient.diagnosis || 'evaluación clínica en curso'}, expresando como motivo principal de consulta: "${patient.reason || 'Sin especificar'}".`;
        }
    },

    onTypeChange(type) {
        const titleInput = document.getElementById('repTitle');
        const titles = {
            derivacion: 'INFORME DE DERIVACIÓN PSIQUIÁTRICA',
            general: 'INFORME PSICOLÓGICO CLÍNICO',
            epicrisis: 'EPICRISIS CLÍNICA Y RESUMEN DE EVOLUCIÓN TERAPÉUTICA',
            justificativo: 'CONSTANCIA DE ASISTENCIA Y JUSTIFICATIVO DE ATENCIÓN',
            asistencia: 'CERTIFICADO DE ASISTENCIA A PSICOTERAPIA',
            cierre: 'INFORME DE EVOLUCIÓN Y CIERRE TERAPÉUTICO'
        };
        if (titleInput && titles[type]) titleInput.value = titles[type];
    },

    handleGenerateReport(e) {
        e.preventDefault();
        const patientId = document.getElementById('repPatientId').value;
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;

        const title = document.getElementById('repTitle').value;
        const recipient = document.getElementById('repRecipient').value || 'A quien corresponda';
        const summary = document.getElementById('repSummary').value;
        const recommendations = document.getElementById('repRecommendations').value;
        const licence = document.getElementById('repLicence').value;
        const specialty = document.getElementById('repSpecialty').value;

        // Guardar preferencias de membrete
        if (licence) localStorage.setItem('psico_licence', licence);
        if (specialty) localStorage.setItem('psico_specialty', specialty);

        const therapistName = AppState.currentUser?.name || localStorage.getItem('psico_therapist_name') || 'Terapeuta Tratante';
        const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
        const therapistSig = localStorage.getItem('psico_therapist_signature') || '';
        const certCode = 'PNC-' + (patient.id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase()) + '-' + Date.now().toString(36).toUpperCase();
        const verifyUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + `portal.html?cert=${certCode}`;

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title} - ${patient.name}</title>
    <style>
        body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 760px; margin: 30px auto; padding: 40px; color: #0f172a; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
        .logo-box { font-size: 22px; font-weight: 800; color: #0d9488; display: flex; align-items: center; gap: 8px; }
        .doc-info { text-align: right; font-size: 12px; color: #475569; }
        h1 { font-size: 17px; text-align: center; color: #0f172a; text-transform: uppercase; margin: 20px 0; letter-spacing: 0.5px; }
        .meta-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12.5px; margin-bottom: 24px; }
        .section-title { font-size: 13.5px; font-weight: 700; color: #0d9488; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        p { font-size: 13px; text-align: justify; margin-bottom: 12px; }
        .footer-sig { margin-top: 50px; display: flex; justify-content: flex-end; }
        .sig-card { width: 280px; text-align: center; border-top: 1px solid #0f172a; padding-top: 8px; font-size: 12px; }
        .sig-img { max-height: 55px; max-width: 180px; display: block; margin: 0 auto 6px auto; }
        .doc-auth-footer { margin-top: 45px; border-top: 1px dashed #cbd5e1; padding-top: 12px; display: flex; justify-content: space-between; align-items: center; font-size: 10px; color: #64748b; }
        .auth-hash { font-family: monospace; font-size: 11px; color: #0d9488; font-weight: bold; }
        @media print { body { margin: 0; padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-box" style="font-family:'Montserrat',sans-serif;font-weight:700;letter-spacing:0.08em;color:#123F36;">
            <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:#7FA38F;margin-right:6px;"></span>SERENA
            <div style="font-size:9px;font-weight:500;letter-spacing:0.12em;color:#7FA38F;margin-top:2px;">TU PRÁCTICA, EN EQUILIBRIO</div>
        </div>
        <div class="doc-info">
            <strong>${therapistName}</strong><br>
            ${specialty || 'Psicología Clínica'}<br>
            ${licence ? `Lic / Col. N.º: ${licence}` : ''}
        </div>
    </div>

    <h1>${title}</h1>

    <div class="meta-grid">
        <div><strong>Paciente:</strong> ${patient.name}</div>
        <div><strong>Fecha de emisión:</strong> ${dateStr}</div>
        <div><strong>Edad:</strong> ${calculateAge(patient.birthdate) ? calculateAge(patient.birthdate) + ' años' : 'No especificada'}</div>
        <div><strong>Diagnóstico:</strong> ${patient.diagnosis || 'En evaluación'}</div>
        <div style="grid-column: span 2;"><strong>Dirigido a:</strong> ${recipient}</div>
    </div>

    <div class="section-title">1. Resumen y Situación Clínica</div>
    <p>${summary.replace(/\n/g, '<br>')}</p>

    ${recommendations ? `
    <div class="section-title">2. Indicaciones, Plan y Recomendaciones</div>
    <p>${recommendations.replace(/\n/g, '<br>')}</p>
    ` : ''}

    <p style="margin-top: 26px; font-size: 12px; color: #475569;">
        Se expide el presente documento oficial para los fines que la parte interesada estime conveniente en la fecha indicada.
    </p>

    <div class="footer-sig">
        <div class="sig-card">
            ${therapistSig ? `<img src="${therapistSig}" class="sig-img" alt="Firma Profesional">` : '<div style="height:35px;"></div>'}
            <strong>${therapistName}</strong><br>
            <span>${specialty || 'Psicología Clínica'}</span><br>
            <small>${licence || ''}</small>
        </div>
    </div>

    <div class="doc-auth-footer">
        <div>
            <strong>DOCUMENTO OFICIAL VALIDADO DIGITALMENTE</strong><br>
            Código de Verificación: <span class="auth-hash">${certCode}</span><br>
            Generado por sistema homologado de historia clínica electrónica · Secreto Profesional Resguardado
        </div>
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(verifyUrl)}" style="width:52px;height:52px;border:1px solid #cbd5e1;padding:2px;background:white;border-radius:4px;" alt="QR Autenticidad" onerror="this.style.display='none';">
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        closeModal('reportModal');
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        }
    }
};

window.ClinicalReports = ClinicalReports;
