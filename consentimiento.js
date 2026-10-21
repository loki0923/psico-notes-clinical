/**
 * PSICO NOTES CLINICAL - CONSENTIMIENTO INFORMADO TERAPÉUTICO
 */

function generateInformedConsent(patientId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    if (!patient) return;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Consentimiento Informado - ${patient.name}</title>
            <style>
                body { font-family: 'Times New Roman', Times, serif; max-width: 750px; margin: 40px auto; padding: 30px; color: #111; line-height: 1.6; }
                h1, h2 { text-align: center; text-transform: uppercase; }
                h1 { font-size: 18px; margin-bottom: 5px; }
                h2 { font-size: 14px; color: #555; margin-top: 0; margin-bottom: 30px; }
                p { text-align: justify; font-size: 13px; text-indent: 20px; }
                .clause { margin-bottom: 14px; }
                .clause-title { font-weight: bold; }
                .signatures { margin-top: 70px; display: flex; justify-content: space-between; }
                .sig-box { width: 42%; text-align: center; border-top: 1px solid #000; padding-top: 8px; font-size: 12px; }
                @media print { body { margin: 0; padding: 20px; } }
            </style>
        </head>
        <body>
            <h1>Documento de Consentimiento Informado Terapéutico</h1>
            <h2>Encuadre Clínico y Secreto Profesional</h2>

            <p class="clause">
                Yo, <strong>${patient.name}</strong>, de nacionalidad mayor de edad ${patient.birthdate ? `(Nacido/a el ${patient.birthdate})` : ''}, declaro haber sido informado/a de manera clara y comprensible sobre el proceso psicoterapéutico que inicio con el/la profesional <strong>${AppState.currentUser?.name || 'Terapeuta'}</strong> (${AppState.currentUser?.email || ''}).
            </p>

            <div class="clause">
                <span class="clause-title">1. Confidencialidad y Secreto Profesional:</span>
                Toda la información compartida durante las sesiones está protegida por el Secreto Profesional, de acuerdo con el Código de Ética Profesional. La confidencialidad únicamente podrá ser levantada en los siguientes casos excepcionales:
                a) Existencia de un riesgo inminente y grave para la integridad física propia o de terceros.
                b) Requerimiento judicial formal mediante orden emitida por un tribunal competente.
            </div>

            <div class="clause">
                <span class="clause-title">2. Encuadre y Asistencia:</span>
                Las sesiones tienen una duración de 50 minutos. Las cancelaciones o reprogramaciones deberán notificarse con un mínimo de 24 horas de antelación; de lo contrario, la sesión será computada y honorada.
            </div>

            <div class="clause">
                <span class="clause-title">3. Voluntariedad y Retiro:</span>
                El/la paciente se reserva el derecho de interrumpir el tratamiento psicoterapéutico en el momento que lo considere oportuno, notificando previamente al terapeuta para realizar un cierre adecuado.
            </div>

            <p>En señal de conformidad con todos los términos expuestos, se firma el presente documento en fecha <strong>${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.</p>

            <div class="signatures">
                <div class="sig-box">
                    <strong>Firma del Paciente / Representante</strong><br>
                    C.I. / RIF: ${patient.phone || '___________________'}
                </div>
                <div class="sig-box">
                    <strong>Firma del Psicólogo/a</strong><br>
                    ${AppState.currentUser?.name || 'Terapeuta'}
                </div>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}
