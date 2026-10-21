/**
 * PSICO NOTES CLINICAL - PROTOCOLO DE CRISIS Y RIESGO SUICIDA
 */

function showCrisisProtocol(patient) {
    if (!patient) return;

    const modalId = 'crisisModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('${modalId}')"></div>
        <div class="modal-content modal-large" style="border-top: 6px solid #e16259;">
            <div class="modal-header">
                <h2 style="color:#e16259;display:flex;align-items:center;gap:8px;">
                    🚨 Protocolo de Intervención en Crisis y Alto Riesgo
                </h2>
                <button class="btn-icon" onclick="closeModal('${modalId}')"><i class="fas fa-times"></i></button>
            </div>
            <div class="modal-form">
                <div style="background:#fdf2f2;border:1px solid #f5c6cb;color:#721c24;padding:12px 16px;border-radius:8px;margin-bottom:16px;font-size:14px;">
                    <strong>Atención Inmediata:</strong> Paciente <strong>${patient.name}</strong> ha registrado indicadores de riesgo elevado.
                </div>

                <div class="form-section-title">1. Contactos de Emergencia del Paciente</div>
                <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;margin-bottom:16px;">
                    <p><strong>Contacto principal:</strong> ${patient.emergency || 'No registrado'}</p>
                    <p><strong>Vínculo / Teléfono:</strong> ${patient.emergencyRelation || 'No registrado'}</p>
                    <p><strong>Teléfono del Paciente:</strong> ${patient.phone || 'No registrado'}</p>
                </div>

                <div class="form-section-title">2. Líneas de Atención 24/7 (Venezuela y LATAM)</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
                    <div style="padding:10px;background:var(--bg-secondary);border-radius:6px;font-size:13px;">
                        <strong>🇻🇪 LÍNEA DE AYUDA FPVP (Venezuela)</strong><br>
                        📞 0212-241-92-88 / 0800-PSICO
                    </div>
                    <div style="padding:10px;background:var(--bg-secondary);border-radius:6px;font-size:13px;">
                        <strong>🇻🇪 LÍNEA DE CRISIS UCV</strong><br>
                        📞 0212-605-28-00
                    </div>
                    <div style="padding:10px;background:var(--bg-secondary);border-radius:6px;font-size:13px;">
                        <strong>🌎 LÍNEA DE PREVENCIÓN DEL SUICIDIO</strong><br>
                        📞 911 (Emergencias Generales)
                    </div>
                    <div style="padding:10px;background:var(--bg-secondary);border-radius:6px;font-size:13px;">
                        <strong>🏥 RED HOSPITALARIA / PSIQUIÁTRICA</strong><br>
                        Derivación inmediata a guardia psiquiátrica
                    </div>
                </div>

                <div class="form-section-title">3. Plan de Seguridad Inmediato</div>
                <ul style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:20px;padding-left:20px;">
                    <li>Evaluar presencia de plan, medios y letalidad.</li>
                    <li>Restringir acceso a medios de autolesión (fármacos, objetos punzantes).</li>
                    <li>Establecer pacto de no agresión y contacto de acompañamiento 24h.</li>
                    <li>Notificar formalmente al contacto de emergencia registrado.</li>
                </ul>

                <div class="modal-actions">
                    <button class="btn-secondary" onclick="closeModal('${modalId}')">Cerrar</button>
                    <button class="btn-primary" style="background:#e16259;" onclick="printCrisisPlan('${patient.id}')">
                        <i class="fas fa-print"></i> Imprimir Plan de Seguridad
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal(modalId);
}

function printCrisisPlan(patientId) {
    const p = AppState.patients.find(x => x.id === patientId);
    if (!p) return;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Plan de Seguridad y Compromiso - ${p.name}</title>
            <style>
                body { font-family: 'Inter', sans-serif; max-width: 700px; margin: 30px auto; padding: 20px; color: #333; line-height: 1.6; }
                h1 { color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 8px; }
                .box { border: 1px solid #ddd; padding: 16px; border-radius: 8px; background: #fafafa; margin-bottom: 20px; }
                ol { padding-left: 20px; }
                .sign { margin-top: 60px; display: flex; justify-content: space-between; }
                .line { border-top: 1px solid #000; width: 45%; text-align: center; paddingTop: 6px; font-size: 13px; }
            </style>
        </head>
        <body>
            <h1>🚨 Plan de Seguridad y Contención</h1>
            <div class="box">
                <p><strong>Paciente:</strong> ${p.name}</p>
                <p><strong>Contacto de Emergencia:</strong> ${p.emergency || 'Pendiente'} (${p.emergencyRelation || '—'})</p>
                <p><strong>Fecha de elaboración:</strong> ${new Date().toLocaleDateString('es-ES')}</p>
            </div>

            <h3>Pasos del Plan de Seguridad:</h3>
            <ol>
                <li>Reconocer las señales de advertencia de crisis.</li>
                <li>Emplear estrategias de afrontamiento internas (respiración diafragmática, grounding).</li>
                <li>Contactar a familiares o amigos de apoyo.</li>
                <li>Llamar a los servicios de emergencia o acudir al centro de salud más cercano.</li>
            </ol>

            <div class="sign">
                <div class="line">Firma del Paciente</div>
                <div class="line">Firma del Profesional (${AppState.currentUser?.name || 'Terapeuta'})</div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}
