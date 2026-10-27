/**
 * PSICO NOTES CLINICAL v6.0 - MÓDULO DE PSICOEDUCACIÓN & HOJAS DE TRABAJO TCC / ACT / DBT
 * Incluye plantillas clínicas estandarizadas, asignación directa al portal y generador de IA.
 */

const PsychoEd = {
    worksheets: [
        {
            id: 'tcc_5col',
            title: '🧠 Registro de Pensamientos Automáticos (TCC)',
            subtitle: 'Identificación de distorsiones y respuestas racionales alternativas',
            category: 'TCC'
        },
        {
            id: 'act_matrix',
            title: '🎯 Matriz de Aceptación y Compromiso (ACT)',
            subtitle: 'Clarificación de valores, defusión y acciones comprometidas',
            category: 'ACT'
        },
        {
            id: 'suds_scale',
            title: '📊 Jerarquía de Ansiedad y Desensibilización (SUDS 0-100)',
            subtitle: 'Escala de Unidades Subjetivas de Malestar para exposición graduada',
            category: 'Exposición'
        },
        {
            id: 'grounding_54321',
            title: '🌿 Técnica de Anclaje Grounding 5-4-3-2-1 y Respiración',
            subtitle: 'Ejercicio de regulación emocional y conciencia del momento presente',
            category: 'Mindfulness'
        },
        {
            id: 'sleep_hygiene',
            title: '🌙 Protocolo de Higiene del Sueño y Control de Estímulos',
            subtitle: 'Pautas conductuales para la reducción del insomnio y la rumiación nocturna',
            category: 'Conductual'
        },
        {
            id: 'behavioral_activation',
            title: '⚡ Activación Conductual: Registro de Placer y Logro',
            subtitle: 'Programación de actividades graduales para romper la inercia depresiva',
            category: 'TCC'
        },
        {
            id: 'dbt_tipp',
            title: '🧊 Habilidades TIPP para Tolerancia al Malestar (DBT)',
            subtitle: 'Temperatura, Ejercicio Intenso, Respiración Pausada y Relajación Muscular',
            category: 'DBT'
        },
        {
            id: 'child_feelings_thermometer',
            title: '🎨 Termómetro Emocional y Monstruo de la Calma (Infantil)',
            subtitle: 'Identificación lúdica de emociones básicas y caja de herramientas de calma para niños',
            category: 'Infantil'
        },
        {
            id: 'teen_values_compass',
            title: '🧭 Brújula de Autonomía y Presión de Pares (Adolescentes)',
            subtitle: 'Diferenciación entre lo que esperan los demás vs mis valores e identidad propia',
            category: 'Adolescentes'
        }
    ],

    openWorksheetModal(worksheetId, patientId = '') {
        const ws = this.worksheets.find(w => w.id === worksheetId);
        if (!ws) return;

        let modal = document.getElementById('psychoedModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'psychoedModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const patientOptions = (typeof AppState !== 'undefined' && AppState.patients) 
            ? AppState.patients.map(p => `<option value="${p.id}" ${p.id === patientId ? 'selected' : ''}>${p.name}</option>`).join('')
            : '';

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('psychoedModal')"></div>
            <div class="modal-content modal-large" style="max-width: 780px;">
                <div class="modal-header">
                    <h2>${ws.title}</h2>
                    <button class="btn-icon" onclick="closeModal('psychoedModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px 0;">
                    <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">${ws.subtitle}</p>
                    
                    <div style="display:flex;gap:12px;margin-bottom:16px;">
                        <div class="form-group" style="flex:1;">
                            <label>Asignar a Paciente:</label>
                            <select id="psychoedPatientSelect" class="form-control">
                                <option value="">-- Sin paciente asignado (Plantilla en blanco) --</option>
                                ${patientOptions}
                            </select>
                        </div>
                    </div>

                    <div id="psychoedFormContainer">
                        ${this.renderWorksheetForm(worksheetId)}
                    </div>

                    <div class="modal-actions" style="margin-top:20px;display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap;">
                        <button type="button" class="btn-secondary" onclick="PsychoEd.assignToPortalTask('${worksheetId}')">
                            <i class="fas fa-mobile-alt"></i> Enviar al Portal del Paciente
                        </button>
                        <button type="button" class="btn-secondary" onclick="PsychoEd.copyToClipboard('${worksheetId}')">
                            <i class="fas fa-copy"></i> Copiar Texto
                        </button>
                        <button type="button" class="btn-secondary" onclick="PsychoEd.shareViaWhatsapp('${worksheetId}')">
                            <i class="fab fa-whatsapp"></i> Compartir WhatsApp
                        </button>
                        <button type="button" class="btn-primary" onclick="PsychoEd.printWorksheet('${worksheetId}')">
                            <i class="fas fa-print"></i> Imprimir / PDF
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (typeof openModal === 'function') {
            openModal('psychoedModal');
        } else {
            modal.classList.add('active');
        }
    },

    renderWorksheetForm(id) {
        if (id === 'tcc_5col') {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div class="form-group"><label>1. Situación (¿Qué sucedió? ¿Dónde? ¿Con quién?):</label><textarea id="ws_sit" rows="2" placeholder="Ej: Presentando reporte en la reunión de trabajo..."></textarea></div>
                    <div class="form-group"><label>2. Pensamiento Automático (¿Qué pasó por tu mente?):</label><textarea id="ws_thought" rows="2" placeholder="Ej: Me voy a equivocar y todos notarán mi nerviosismo..."></textarea></div>
                    <div class="form-group"><label>3. Emoción (¿Qué sentiste y con qué intensidad 0-100%?):</label><input type="text" id="ws_emo" placeholder="Ej: Ansiedad (85%), Vergüenza (70%)"></div>
                    <div class="form-group"><label>4. Respuesta Racional / Evidencia en Contra:</label><textarea id="ws_resp" rows="2" placeholder="Ej: He preparado el tema, si tropiezo puedo pausar y continuar..."></textarea></div>
                    <div class="form-group"><label>5. Resultado (¿Cómo te sientes ahora 0-100%?):</label><input type="text" id="ws_res" placeholder="Ej: Ansiedad (35%), Mayor autocontrol"></div>
                </div>
            `;
        }
        if (id === 'act_matrix') {
            return `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    <div class="form-group" style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                        <label><strong>1. Lejos de Valores (Alejamiento):</strong><br><small>Pensamiento o malestar que intentas evitar</small></label>
                        <textarea id="ws_act_away" rows="3" placeholder="Ansiedad, miedo al rechazo, pensamientos de incapacidad..."></textarea>
                    </div>
                    <div class="form-group" style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                        <label><strong>2. Hacia Valores (Acercamiento):</strong><br><small>¿Quién o qué es verdaderamente importante para ti?</small></label>
                        <textarea id="ws_act_towards" rows="3" placeholder="Ser honesto, cuidar a mi familia, crecimiento profesional..."></textarea>
                    </div>
                    <div class="form-group" style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                        <label><strong>3. Conductas de Evitación:</strong><br><small>¿Qué haces para escapar del dolor?</small></label>
                        <textarea id="ws_act_avoid" rows="3" placeholder="Procrastinar, aislarme, consumo compulsivo de pantallas..."></textarea>
                    </div>
                    <div class="form-group" style="background:var(--bg-secondary);padding:10px;border-radius:6px;">
                        <label><strong>4. Acciones Comprometidas:</strong><br><small>Pasos concretos guiados por valores</small></label>
                        <textarea id="ws_act_action" rows="3" placeholder="Enviar correo importante, practicar 5 min de respiración..."></textarea>
                    </div>
                </div>
            `;
        }
        if (id === 'suds_scale') {
            return `
                <div style="display:flex;flex-direction:column;gap:10px;">
                    <p style="font-size:12px;color:var(--text-tertiary);">Registra situaciones temidas ordenadas de menor a mayor malestar (SUDS 0 a 100):</p>
                    <div class="form-group"><label>Nivel Bajo (SUDS 25 - Ansiedad leve):</label><input type="text" id="ws_suds_25" placeholder="Ej: Pensar en hablar en público"></div>
                    <div class="form-group"><label>Nivel Moderado (SUDS 50 - Ansiedad notable):</label><input type="text" id="ws_suds_50" placeholder="Ej: Estar en la sala antes de la presentación"></div>
                    <div class="form-group"><label>Nivel Alto (SUDS 75 - Ansiedad intensa):</label><input type="text" id="ws_suds_75" placeholder="Ej: Mirar a la audiencia antes de hablar"></div>
                    <div class="form-group"><label>Nivel Máximo (SUDS 100 - Pánico/Malestar extremo):</label><input type="text" id="ws_suds_100" placeholder="Ej: Quedarme en blanco frente a 50 personas"></div>
                </div>
            `;
        }
        if (id === 'sleep_hygiene') {
            return `
                <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);font-size:13px;line-height:1.6;">
                    <h4>🌙 Reglas Básicas de Control de Estímulos:</h4>
                    <ul style="margin-left:20px;">
                        <li><strong>Cama = Solo Dormir:</strong> Nada de pantallas, trabajo ni comidas en el lecho.</li>
                        <li><strong>Regla de los 20 minutos:</strong> Si no concilia el sueño en 20 min, levantarse y realizar una actividad relajante con luz tenue.</li>
                        <li><strong>Horario fijo de despertar:</strong> Mantener la misma hora de levantarse los 7 días de la semana.</li>
                        <li><strong>Cero cafeína tras las 3:00 PM:</strong> Reducir estimulantes y cenas pesadas.</li>
                    </ul>
                    <div class="form-group" style="margin-top:12px;">
                        <label>Acuerdos específicos pactados para esta semana:</label>
                        <textarea id="ws_sleep_agreements" rows="3" placeholder="Ej: Apagar el móvil a las 10:30 PM, leer un libro físico..."></textarea>
                    </div>
                </div>
            `;
        }
        if (id === 'behavioral_activation') {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <p style="font-size:12px;color:var(--text-tertiary);">Programa 3 actividades para esta semana calificando Placer (P: 0-10) y Logro (L: 0-10):</p>
                    <div class="form-group"><label>Actividad 1 (Nivel bajo esfuerzo):</label><input type="text" id="ws_ba_1" placeholder="Ej: Caminar 15 minutos en el parque (P: 6, L: 7)"></div>
                    <div class="form-group"><label>Actividad 2 (Nivel medio):</label><input type="text" id="ws_ba_2" placeholder="Ej: Llamar a un amigo cercano (P: 7, L: 6)"></div>
                    <div class="form-group"><label>Actividad 3 (Nivel reto):</label><input type="text" id="ws_ba_3" placeholder="Ej: Organizar el escritorio de trabajo (P: 4, L: 9)"></div>
                </div>
            `;
        }
        if (id === 'dbt_tipp') {
            return `
                <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);font-size:13px;line-height:1.6;">
                    <h4>🧊 Protocolo TIPP para Crisis de Ansiedad o Ira:</h4>
                    <ol style="margin-left:20px;">
                        <li><strong>T - Temperatura:</strong> Agua fría en el rostro o sostener un hielo para activar el reflejo de inmersión y bajar la frecuencia cardíaca.</li>
                        <li><strong>I - Intensidad (Ejercicio breve):</strong> 2 minutos de saltos, sentadillas o flexiones para liberar adrenalina acumulada.</li>
                        <li><strong>P - Pausa en la Respiración:</strong> Inhalar en 4 segundos, exhalar en 7 segundos (respiración prolongada).</li>
                        <li><strong>P - Pares de Músculos (Relajación):</strong> Tensar y relajar conscientemente hombros, mandíbula y manos.</li>
                    </ol>
                    <div class="form-group" style="margin-top:12px;">
                        <label>Plan de aplicación personalizada:</label>
                        <textarea id="ws_tipp_plan" rows="2" placeholder="Tener un pack de gel frío en el congelador para momentos de sobrecarga..."></textarea>
                    </div>
                </div>
            `;
        }
        if (id === 'child_feelings_thermometer') {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-md);font-size:13px;line-height:1.5;">
                        <h4 style="margin-top:0;">🎨 El Semáforo / Termómetro de las Emociones:</h4>
                        <p style="margin-bottom:6px;">Ayuda al niño/a a identificar cómo se siente en su cuerpo y qué color tiene su emoción:</p>
                        <ul style="margin-left:18px;">
                            <li>🟢 <strong>Verde / Zona Calma:</strong> Tranquilo/a, contento/a, listo/a para jugar o aprender.</li>
                            <li>🟡 <strong>Amarillo / Zona Alerta:</strong> Nervioso/a, frustrado/a, con ganas de llorar o inquieto/a.</li>
                            <li>🔴 <strong>Rojo / Zona Volcán:</strong> Mucha rabia, fuera de control, necesita parar y respirar.</li>
                        </ul>
                    </div>
                    <div class="form-group">
                        <label>1. ¿En qué color se siente el/la niño/a hoy?</label>
                        <select id="ws_child_color">
                            <option value="verde">🟢 Verde (Calma y alegría)</option>
                            <option value="amarillo">🟡 Amarillo (Inquieto/a o preocupado/a)</option>
                            <option value="rojo">🔴 Rojo (Muy enojado/a o asustado/a)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>2. ¿En qué parte del cuerpo siente la emoción?</label>
                        <input type="text" id="ws_child_body" placeholder="Ej: En la guatita, en las manos apretadas, en el pecho...">
                    </div>
                    <div class="form-group">
                        <label>3. Caja de Herramientas de la Calma (¿Qué nos ayuda a volver a verde?):</label>
                        <textarea id="ws_child_tools" rows="2" placeholder="Ej: Abrazar al peluche favorito, soplar velas imaginarias (3 respiraciones lentas), dibujar su monstruo..."></textarea>
                    </div>
                </div>
            `;
        }
        if (id === 'teen_values_compass') {
            return `
                <div style="display:flex;flex-direction:column;gap:12px;">
                    <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-md);font-size:13px;line-height:1.5;">
                        <h4 style="margin-top:0;">🧭 Brújula de Autonomía vs Presión Social:</h4>
                        <p style="margin-bottom:0;">Identifica decisiones guiadas por lo que tú realmente valoras vs lo que sientes que otros esperan de ti (amigos, redes, familia).</p>
                    </div>
                    <div class="form-group">
                        <label>1. Situación o dilema actual:</label>
                        <input type="text" id="ws_teen_situation" placeholder="Ej: Salir a una fiesta donde no quiero ir, elegir carrera, comentarios en redes...">
                    </div>
                    <div class="form-group">
                        <label>2. Lo que los demás / las redes empujan a hacer (Presión externa):</label>
                        <textarea id="ws_teen_external" rows="2" placeholder="¿Qué me dicen que debería hacer para 'encajar' o complacer?"></textarea>
                    </div>
                    <div class="form-group">
                        <label>3. Lo que es verdaderamente importante para MÍ (Mi brújula interna):</label>
                        <textarea id="ws_teen_internal" rows="2" placeholder="¿Cuáles son mis valores? (Ej: Mi tranquilidad, lealtad a mí mismo/a, descanso...)"></textarea>
                    </div>
                    <div class="form-group">
                        <label>4. Acción valiente de autocuidado acordada en sesión:</label>
                        <textarea id="ws_teen_action" rows="2" placeholder="Ej: Decir 'hoy prefiero quedarme en casa', poner límites amables pero firmes..."></textarea>
                    </div>
                </div>
            `;
        }
        return `
            <div style="background:var(--bg-secondary);padding:14px;border-radius:var(--radius-md);font-size:13px;line-height:1.6;">
                <h4>🌿 Pasos del Ejercicio Grounding 5-4-3-2-1:</h4>
                <ol style="margin-left:20px;">
                    <li><strong>5 cosas que puedas VER:</strong> Mira a tu alrededor y nombra 5 objetos detallados.</li>
                    <li><strong>4 cosas que puedas TOCAR:</strong> Siente la textura de tu ropa, el suelo o una superficie.</li>
                    <li><strong>3 sonidos que puedas OÍR:</strong> Escucha con atención el entorno sonoro.</li>
                    <li><strong>2 olores que puedas OLER:</strong> Identifica aromas a tu alrededor.</li>
                    <li><strong>1 sabor que puedas SABOREAR:</strong> Siente el gusto en tu boca o toma un sorbo de agua.</li>
                </ol>
                <div class="form-group" style="margin-top:12px;">
                    <label>Notas / Observaciones del ejercicio:</label>
                    <textarea id="ws_ground_notes" rows="2" placeholder="Sensación de calma lograda (0-10)..."></textarea>
                </div>
            </div>
        `;
    },

    getWorksheetData(id) {
        const patientId = document.getElementById('psychoedPatientSelect')?.value;
        const patient = (typeof AppState !== 'undefined' && AppState.patients) ? AppState.patients.find(p => p.id === patientId) : null;
        const name = patient ? patient.name : 'Paciente';

        let bodyText = '';
        if (id === 'tcc_5col') {
            bodyText = `📋 REGISTRO DE PENSAMIENTOS AUTOMÁTICOS (TCC)
Paciente: ${name}
Fecha: ${new Date().toLocaleDateString('es-ES')}

1. SITUACIÓN:
${document.getElementById('ws_sit')?.value || '—'}

2. PENSAMIENTO AUTOMÁTICO:
${document.getElementById('ws_thought')?.value || '—'}

3. EMOCIÓN E INTENSIDAD:
${document.getElementById('ws_emo')?.value || '—'}

4. RESPUESTA RACIONAL:
${document.getElementById('ws_resp')?.value || '—'}

5. RESULTADO:
${document.getElementById('ws_res')?.value || '—'}`;
        } else if (id === 'act_matrix') {
            bodyText = `🎯 MATRIZ DE ACEPTACIÓN Y COMPROMISO (ACT)
Paciente: ${name}
Fecha: ${new Date().toLocaleDateString('es-ES')}

- LO QUE INTENTO EVITAR: ${document.getElementById('ws_act_away')?.value || '—'}
- MIS VALORES: ${document.getElementById('ws_act_towards')?.value || '—'}
- CONDUCTAS DE EVITACIÓN: ${document.getElementById('ws_act_avoid')?.value || '—'}
- ACCIONES COMPROMETIDAS: ${document.getElementById('ws_act_action')?.value || '—'}`;
        } else if (id === 'suds_scale') {
            bodyText = `📊 JERARQUÍA SUDS (0-100)
Paciente: ${name}

- SUDS 25 (Leve): ${document.getElementById('ws_suds_25')?.value || '—'}
- SUDS 50 (Moderado): ${document.getElementById('ws_suds_50')?.value || '—'}
- SUDS 75 (Intenso): ${document.getElementById('ws_suds_75')?.value || '—'}
- SUDS 100 (Máximo): ${document.getElementById('ws_suds_100')?.value || '—'}`;
        } else if (id === 'sleep_hygiene') {
            bodyText = `🌙 HIGIENE DEL SUEÑO
Paciente: ${name}
Acuerdos pactados:
${document.getElementById('ws_sleep_agreements')?.value || 'Pautas de control de estímulos y horario regular'}`;
        } else if (id === 'behavioral_activation') {
            bodyText = `⚡ ACTIVACIÓN CONDUCTUAL
Paciente: ${name}
1. ${document.getElementById('ws_ba_1')?.value || 'Actividad 1'}
2. ${document.getElementById('ws_ba_2')?.value || 'Actividad 2'}
3. ${document.getElementById('ws_ba_3')?.value || 'Actividad 3'}`;
        } else if (id === 'dbt_tipp') {
            bodyText = `🧊 PROTOCOLO TIPP (DBT)
Paciente: ${name}
Plan de aplicación:
${document.getElementById('ws_tipp_plan')?.value || 'Temperatura fría, respiración pausada y relajación'}`;
        } else {
            bodyText = `🌿 GROUNDING 5-4-3-2-1
Paciente: ${name}
Notas del ejercicio: ${document.getElementById('ws_ground_notes')?.value || 'Completado exitosamente'}`;
        }
        return { name, bodyText, patientId };
    },

    assignToPortalTask(id) {
        const { name, bodyText, patientId } = this.getWorksheetData(id);
        if (!patientId) {
            if (typeof showToast === 'function') {
                showToast('Selecciona un paciente para asignar la tarea al portal', 'warning');
            }
            return;
        }

        const ws = this.worksheets.find(w => w.id === id);
        const taskKey = `psico_portal_data_${patientId}`;
        try {
            const raw = localStorage.getItem(taskKey);
            const data = raw ? JSON.parse(raw) : { tasks: [], evaluations: [], moodLog: [] };
            if (!data.tasks) data.tasks = [];
            data.tasks.push({
                id: `task_${Date.now()}`,
                title: ws ? ws.title : 'Ficha Psicoeducativa',
                description: ws ? ws.subtitle : '',
                content: bodyText,
                status: 'pending',
                assignedDate: new Date().toISOString()
            });
            localStorage.setItem(taskKey, JSON.stringify(data));
            if (typeof showToast === 'function') {
                showToast(`Ficha asignada exitosamente al portal de ${name}`, 'success');
            }
            if (typeof closeModal === 'function') closeModal('psychoedModal');
        } catch (e) {
            console.error('Error guardando tarea en portal:', e);
            if (typeof showToast === 'function') showToast('Error al asignar tarea al portal', 'error');
        }
    },

    copyToClipboard(id) {
        const { bodyText } = this.getWorksheetData(id);
        navigator.clipboard.writeText(bodyText);
        if (typeof showToast === 'function') showToast('Hoja de trabajo copiada al portapapeles', 'success');
    },

    shareViaWhatsapp(id) {
        const { bodyText } = this.getWorksheetData(id);
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(bodyText)}`;
        window.open(url, '_blank');
    },

    printWorksheet(id) {
        const { name, bodyText } = this.getWorksheetData(id);
        const ws = this.worksheets.find(w => w.id === id) || { title: 'Ficha Clínica Psicoeducativa' };

        const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${ws.title}</title><style>body{font-family:'Inter',sans-serif;max-width:750px;margin:30px auto;padding:24px;color:#1e293b;line-height:1.6;}h1{color:#0d9488;font-size:18px;border-bottom:2px solid #0d9488;padding-bottom:6px;}.box{background:#f8fafc;border:1px solid #cbd5e1;padding:16px;border-radius:8px;white-space:pre-wrap;font-size:13px;font-family:sans-serif;}.footer{margin-top:30px;font-size:11px;color:#94a3b8;text-align:center;}@media print{body{margin:0;}}</style></head><body><h1>${ws.title}</h1><p><strong>Paciente:</strong> ${name} | <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}</p><div class="box">${bodyText}</div><div class="footer">${(typeof AppState !== 'undefined' && AppState.currentUser?.name) || 'SERENA'} · Documento Terapéutico</div><script>window.onload=()=>window.print();</script></body></html>`;
        
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        }
    }
};

if (typeof window !== 'undefined') {
    window.PsychoEd = PsychoEd;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PsychoEd;
}
