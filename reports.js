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
                                    <option value="asistencia">📜 Certificado de Asistencia a Sesión</option>
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
                                <i class="fas fa-file-pdf"></i> Generar & Exportar PDF
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

        const therapistName = AppState.currentUser?.name || 'Terapeuta Tratante';
        const dateStr = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

        const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title} - ${patient.name}</title>
    <style>
        body { font-family: 'Inter', -apple-system, sans-serif; max-width: 750px; margin: 40px auto; padding: 36px; color: #0f172a; line-height: 1.6; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0d9488; padding-bottom: 16px; margin-bottom: 24px; }
        .logo-box { font-size: 24px; font-weight: 700; color: #0d9488; display: flex; align-items: center; gap: 8px; }
        .doc-info { text-align: right; font-size: 12px; color: #64748b; }
        h1 { font-size: 18px; text-align: center; color: #0f172a; text-transform: uppercase; margin: 24px 0; letter-spacing: 0.5px; }
        .meta-grid { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; margin-bottom: 24px; }
        .section-title { font-size: 14px; font-weight: 600; color: #0d9488; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-top: 20px; margin-bottom: 10px; }
        p { font-size: 13px; text-align: justify; margin-bottom: 12px; }
        .footer-sig { margin-top: 60px; display: flex; justify-content: flex-end; }
        .sig-card { width: 260px; text-align: center; border-top: 1px solid #0f172a; padding-top: 8px; font-size: 12px; }
        @media print { body { margin: 0; padding: 20px; } }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-box">
            <span>🧠</span> Psico Notes Clinical
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
    <div class="section-title">2. Indicaciones y Recomendaciones</div>
    <p>${recommendations.replace(/\n/g, '<br>')}</p>
    ` : ''}

    <p style="margin-top: 30px;">Se expide el presente documento formal a solicitud de las partes interesadas en la fecha indicada.</p>

    <div class="footer-sig">
        <div class="sig-card">
            <strong>${therapistName}</strong><br>
            ${specialty || 'Psicología Clínica'}<br>
            ${licence || ''}
        </div>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        closeModal('reportModal');
        const w = window.open('', '_blank');
        w.document.write(html);
        w.document.close();
    }
};

window.ClinicalReports = ClinicalReports;
