// ============================================
// PSICO NOTES CLINICAL - AI ASSISTANT MODULE
// ============================================

window.AIAssistant = {
    history: [],
    selectedPatientId: '',
    isWaiting: false
};

// Inicializar elementos de UI cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    initAIAssistantUI();
});

function initAIAssistantUI() {
    if (document.getElementById('aiFabBtn')) return; // Evitar duplicados

    // 1. Crear el Botón Flotante FAB
    const fab = document.createElement('button');
    fab.id = 'aiFabBtn';
    fab.className = 'ai-fab-btn';
    fab.onclick = toggleAIDrawer;
    fab.innerHTML = `
        <span class="ai-fab-icon">✨</span>
        <span>Copiloto IA</span>
    `;
    document.body.appendChild(fab);

    // 2. Crear Overlay y Drawer del Asistente
    const overlay = document.createElement('div');
    overlay.id = 'aiDrawerOverlay';
    overlay.className = 'ai-drawer-overlay';
    overlay.onclick = closeAIDrawer;
    document.body.appendChild(overlay);

    const drawer = document.createElement('div');
    drawer.id = 'aiDrawer';
    drawer.className = 'ai-drawer';
    drawer.innerHTML = `
        <div class="ai-drawer-header">
            <div class="ai-drawer-title-row">
                <div class="ai-avatar-header">🧠</div>
                <div>
                    <h3 class="ai-drawer-title">Copiloto Clínico IA</h3>
                    <div class="ai-drawer-model">
                        <span class="ai-status-dot"></span> Gemini 3.6 Flash · Psico Notes
                    </div>
                </div>
            </div>
            <button class="btn-icon" onclick="closeAIDrawer()"><i class="fas fa-times"></i></button>
        </div>

        <div class="ai-context-bar">
            <i class="fas fa-user-circle" style="color:var(--accent-primary);"></i>
            <span style="font-weight:600;color:var(--text-secondary);">Contexto:</span>
            <select id="aiContextSelect" class="ai-context-select" onchange="onAIContextChange(this.value)">
                <option value="">— Consulta General (Sin paciente atado) —</option>
            </select>
        </div>

        <div class="ai-presets-container" id="aiPresetsContainer">
            <span class="ai-preset-chip" onclick="sendAIPreset('evolution')">💡 Analizar caso</span>
            <span class="ai-preset-chip" onclick="sendAIPreset('soap_draft')">📝 Ayuda con SOAP</span>
            <span class="ai-preset-chip" onclick="sendAIPreset('tasks')">🎯 Tareas intersesión</span>
            <span class="ai-preset-chip" onclick="sendAIPreset('risk')">⚠️ Evaluar riesgo</span>
            <span class="ai-preset-chip" onclick="sendAIPreset('psychoed')">💬 Psicoeducación</span>
            <span class="ai-preset-chip" onclick="sendAIPreset('overview')">📊 Resumen consulta</span>
        </div>

        <div class="ai-chat-body" id="aiChatBody">
            <div class="ai-chat-msg assistant">
                <div class="ai-msg-avatar">🧠</div>
                <div class="ai-msg-content">
                    Hola, Dr(a). Soy tu <strong>Copiloto Clínico Inteligente</strong>. 
                    Puedo ayudarte a estructurar notas SOAP, revisar evolución de casos, sugerir técnicas psicoterapéuticas o preparar material psicoeducativo.
                    <br><br>
                    <em>Selecciona un paciente arriba o escribe tu consulta clínica libremente.</em>
                </div>
            </div>
        </div>

        <div class="ai-drawer-footer">
            <div class="ai-input-row">
                <textarea id="aiInputText" class="ai-textarea" rows="1" placeholder="Haz una consulta clínica o solicita un análisis..." onkeydown="handleAIInputKeyDown(event)"></textarea>
                <button class="ai-send-btn" id="aiSendBtn" onclick="submitAIPrompt()">
                    <i class="fas fa-paper-plane"></i>
                </button>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:11px;color:var(--text-tertiary);">
                <span>Apoyo al juicio profesional · Confidencial</span>
                <a href="#" onclick="clearAIChat(); return false;" style="color:var(--text-tertiary);text-decoration:underline;">Limpiar chat</a>
            </div>
        </div>
    `;
    document.body.appendChild(drawer);
}

function toggleAIDrawer() {
    const drawer = document.getElementById('aiDrawer');
    const overlay = document.getElementById('aiDrawerOverlay');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        closeAIDrawer();
    } else {
        populateAIContextSelect();
        drawer.classList.add('open');
        overlay.classList.add('active');
        document.getElementById('aiInputText')?.focus();
    }
}

function closeAIDrawer() {
    document.getElementById('aiDrawer')?.classList.remove('open');
    document.getElementById('aiDrawerOverlay')?.classList.remove('active');
}

function populateAIContextSelect() {
    const select = document.getElementById('aiContextSelect');
    if (!select || !window.AppState || !window.AppState.patients) return;

    const currentVal = select.value || window.AIAssistant.selectedPatientId;
    select.innerHTML = '<option value="">— Consulta General (Sin paciente atado) —</option>';

    window.AppState.patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `👤 ${p.name} ${p.diagnosis ? `(${p.diagnosis})` : ''}`;
        if (String(p.id) === String(currentVal)) opt.selected = true;
        select.appendChild(opt);
    });
}

function onAIContextChange(patientId) {
    window.AIAssistant.selectedPatientId = patientId;
    if (patientId && window.AppState) {
        const p = window.AppState.patients.find(x => String(x.id) === String(patientId));
        if (p) {
            appendAIMessage('system', `📌 Contexto activo cambiado a: **${p.name}** ${p.diagnosis ? `(${p.diagnosis})` : ''}`);
        }
    }
}

function handleAIInputKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitAIPrompt();
    }
}

async function submitAIPrompt() {
    const input = document.getElementById('aiInputText');
    if (!input) return;
    const text = input.value.trim();
    if (!text || window.AIAssistant.isWaiting) return;

    input.value = '';
    appendAIMessage('user', text);
    await callAIChatAPI(text);
}

function sendAIPreset(type) {
    const patientId = window.AIAssistant.selectedPatientId || (window.AppState ? window.AppState.activePatientId : '');
    const p = patientId && window.AppState ? window.AppState.patients.find(x => String(x.id) === String(patientId)) : null;

    let prompt = '';
    if (type === 'evolution') {
        prompt = p ? `Por favor analiza la evolución reciente y focos terapéuticos de ${p.name}.` : '¿Cómo puedo hacer un análisis sistemático de la evolución de un caso en psicoterapia?';
    } else if (type === 'soap_draft') {
        prompt = p ? `Ayúdame a redactar los puntos clave para la siguiente nota SOAP de ${p.name}.` : 'Proporcióname una guía práctica para estructurar el Análisis (A) y Plan (P) en notas SOAP.';
    } else if (type === 'tasks') {
        prompt = p ? `Sugiere 3 tareas intersesión orientadas a los objetivos terapéuticos de ${p.name}.` : '¿Qué tareas intersesión basadas en TCC/ACT son más efectivas para el manejo de la ansiedad?';
    } else if (type === 'risk') {
        prompt = p ? `Evalúa los factores de riesgo y protectores registrados para ${p.name}.` : '¿Cuáles son las señales de alerta prioritarias al evaluar riesgo autolítico o descompensación?';
    } else if (type === 'psychoed') {
        prompt = p ? `Genera una explicación psicoeducativa clara para ${p.name} sobre sus síntomas.` : 'Brinda una explicación psicoeducativa sencilla y empática sobre el ciclo de la ansiedad y evitación.';
    } else if (type === 'overview') {
        prompt = 'Dame un resumen ejecutivo del estado general de mi consulta (pacientes activos, prioridades y sesiones).';
    }

    if (prompt) {
        appendAIMessage('user', prompt);
        callAIChatAPI(prompt);
    }
}

async function callAIChatAPI(message) {
    window.AIAssistant.isWaiting = true;
    showAITypingIndicator();

    const patientId = window.AIAssistant.selectedPatientId;
    let patientContext = null;

    if (patientId && window.AppState) {
        const p = window.AppState.patients.find(x => String(x.id) === String(patientId));
        if (p) {
            const notes = (window.AppState.notes || []).filter(n => String(n.patientId) === String(p.id));
            patientContext = {
                id: p.id,
                name: p.name,
                age: p.birthdate ? calculateAge(p.birthdate) : 'N/D',
                diagnosis: p.diagnosis || 'Pendiente',
                reason: p.reason || 'Sin datos',
                riskFactors: p.riskFactors || 'Ninguno',
                medication: p.medication || 'Sin medicación',
                recentNotes: notes.slice(-3).map(n => ({ date: n.date, title: n.title, S: n.subjetivo, A: n.analisis }))
            };
        }
    }

    let consultationSummary = null;
    if (!patientContext && window.AppState) {
        consultationSummary = {
            totalPatients: (window.AppState.patients || []).length,
            priorityPatients: calculatePriorityPatients ? calculatePriorityPatients().length : 0,
            todaySessions: (window.AppState.appointments || []).filter(a => isSameDay(a.date, new Date())).length
        };
    }

    try {
        const res = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                patientContext,
                consultationSummary,
                history: window.AIAssistant.history.slice(-6)
            })
        });

        removeAITypingIndicator();
        const data = await res.json();

        if (data.error) {
            appendAIMessage('assistant', `⚠️ *Error:* ${data.error}`);
        } else {
            const responseText = data.text;
            window.AIAssistant.history.push({ role: 'user', content: message });
            window.AIAssistant.history.push({ role: 'model', content: responseText });
            appendAIMessage('assistant', responseText);
        }
    } catch (err) {
        removeAITypingIndicator();
        console.error('AI Error:', err);
        appendAIMessage('assistant', `⚠️ No se pudo conectar con el servicio de IA. Inténtalo nuevamente.`);
    } finally {
        window.AIAssistant.isWaiting = false;
    }
}

function appendAIMessage(role, text) {
    const chatBody = document.getElementById('aiChatBody');
    if (!chatBody) return;

    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-chat-msg ${role}`;

    const formattedText = formatMarkdownToHTML(text);

    if (role === 'system') {
        msgDiv.style.alignSelf = 'center';
        msgDiv.style.maxWidth = '100%';
        msgDiv.innerHTML = `
            <div style="background:var(--accent-light);color:var(--accent-primary);font-size:11px;font-weight:700;padding:4px 12px;border-radius:12px;text-align:center;">
                ${text}
            </div>
        `;
    } else {
        const isUser = role === 'user';
        msgDiv.innerHTML = `
            <div class="ai-msg-avatar">${isUser ? '🩺' : '🧠'}</div>
            <div class="ai-msg-content">
                ${formattedText}
                ${!isUser ? `
                    <div class="ai-msg-actions">
                        <button class="ai-msg-btn" onclick="copyAIText(this)"><i class="fas fa-copy"></i> Copiar</button>
                        ${document.getElementById('noteModal')?.classList.contains('active') ? `
                            <button class="ai-msg-btn" onclick="insertAIIntoActiveNote(this)"><i class="fas fa-edit"></i> Insertar en Nota</button>
                        ` : ''}
                    </div>
                ` : ''}
            </div>
        `;
    }

    chatBody.appendChild(msgDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function showAITypingIndicator() {
    const chatBody = document.getElementById('aiChatBody');
    if (!chatBody) return;

    const typingDiv = document.createElement('div');
    typingDiv.id = 'aiTypingIndicator';
    typingDiv.className = 'ai-chat-msg assistant';
    typingDiv.innerHTML = `
        <div class="ai-msg-avatar">🧠</div>
        <div class="ai-msg-content" style="padding:8px 12px;">
            <div class="ai-typing-indicator">
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
            </div>
        </div>
    `;
    chatBody.appendChild(typingDiv);
    chatBody.scrollTop = chatBody.scrollHeight;
}

function removeAITypingIndicator() {
    document.getElementById('aiTypingIndicator')?.remove();
}

function clearAIChat() {
    window.AIAssistant.history = [];
    const chatBody = document.getElementById('aiChatBody');
    if (chatBody) {
        chatBody.innerHTML = `
            <div class="ai-chat-msg assistant">
                <div class="ai-msg-avatar">🧠</div>
                <div class="ai-msg-content">
                    Chat reiniciado. ¿En qué puedo asistirte ahora?
                </div>
            </div>
        `;
    }
}

function copyAIText(btn) {
    const content = btn.closest('.ai-msg-content');
    if (!content) return;
    const text = content.innerText.replace('Copiar', '').replace('Insertar en Nota', '').trim();
    navigator.clipboard.writeText(text);
    showToast('📋 Texto copiado al portapapeles', 'info');
}

function insertAIIntoActiveNote(btn) {
    const content = btn.closest('.ai-msg-content');
    if (!content) return;
    const text = content.innerText.replace('Copiar', '').replace('Insertar en Nota', '').trim();
    const analisisField = document.getElementById('noteAnalisis');
    if (analisisField) {
        analisisField.value += (analisisField.value ? '\n\n[Análisis Copiloto IA]:\n' : '[Análisis Copiloto IA]:\n') + text;
        showToast('✨ Contenido insertado en el campo de Análisis de la nota', 'success');
    }
}

function formatMarkdownToHTML(text) {
    if (!text) return '';
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.06);padding:2px 4px;border-radius:4px;">$1</code>')
        .replace(/\n\n/g, '<br><br>')
        .replace(/\n/g, '<br>');
    return html;
}

// ============================================
// INTEGRACIÓN ASISTENCIA IA EN MODAL SOAP
// ============================================
async function suggestSoapWithAI() {
    const subjEl = document.getElementById('noteSubjetivo');
    const objEl = document.getElementById('noteObjetivo');
    const analEl = document.getElementById('noteAnalisis');
    const planEl = document.getElementById('notePlan');
    const patientSel = document.getElementById('notePatient');

    const draftText = (subjEl?.value || '') + '\n' + (objEl?.value || '');
    if (!draftText.trim()) {
        showToast('Escribe algo en Subjetivo u Objetivo para que la IA organice y complete la nota', 'warning');
        return;
    }

    const patientId = patientSel?.value;
    const p = patientId && window.AppState ? window.AppState.patients.find(x => String(x.id) === String(patientId)) : null;

    showToast('✨ La IA está analizando y estructurando tu nota SOAP...', 'info');

    try {
        const res = await fetch('/api/ai/suggest-soap', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                draftText,
                patientInfo: p ? { name: p.name, diagnosis: p.diagnosis } : null
            })
        });

        const data = await res.json();
        if (data.error) {
            showToast(`⚠️ Error: ${data.error}`, 'error');
            return;
        }

        if (data.subjetivo && subjEl) subjEl.value = data.subjetivo;
        if (data.objetivo && objEl) objEl.value = data.objetivo;
        if (data.analisis && analEl) analEl.value = data.analisis;
        if (data.plan && planEl) planEl.value = data.plan;

        if (Array.isArray(data.intersessionTasks) && data.intersessionTasks.length > 0) {
            data.intersessionTasks.forEach(task => {
                if (typeof window.addIntersessionTask === 'function') {
                    window.addIntersessionTask(task);
                }
            });
        }

        showToast('🧠 ¡Nota SOAP reestructurada y enriquecida con éxito!', 'success');
    } catch (err) {
        console.error('Soap AI Error:', err);
        showToast('⚠️ No se pudo completar la nota con IA', 'error');
    }
}

// ============================================
// SÍNTESIS DE CASO EN EXPEDIENTE
// ============================================
async function generateCaseSummaryWithAI(patientId) {
    if (!window.AppState) return;
    const p = window.AppState.patients.find(x => String(x.id) === String(patientId));
    if (!p) return;

    const notes = (window.AppState.notes || []).filter(n => String(n.patientId) === String(patientId));
    const scales = (window.AppState.scaleResults || []).filter(s => String(s.patientId) === String(patientId));

    showToast(`🧠 Generando síntesis clínica para ${p.name}...`, 'info');

    try {
        const res = await fetch('/api/ai/case-summary', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ patient: p, notes, scales })
        });

        const data = await res.json();
        if (data.error) {
            showToast(`⚠️ Error: ${data.error}`, 'error');
            return;
        }

        openModalWithCustomContent(`🧠 Síntesis Ejecutiva IA — ${p.name}`, `
            <div style="font-size:14px;line-height:1.6;color:var(--text-primary);">
                <div style="background:var(--accent-light);border-left:4px solid var(--accent-primary);padding:12px 16px;border-radius:6px;margin-bottom:16px;">
                    <strong>Evaluación de Inteligencia Clínica Gemini</strong> · Documento de apoyo para la supervisión del expediente de ${p.name}.
                </div>
                ${formatMarkdownToHTML(data.summary)}
            </div>
            <div class="modal-actions" style="margin-top:20px;">
                <button class="btn-secondary" onclick="closeModal('customContentModal')">Cerrar</button>
                <button class="btn-primary" onclick="copyAITextContent('${encodeURIComponent(data.summary)}')">
                    <i class="fas fa-copy"></i> Copiar Síntesis
                </button>
            </div>
        `);
    } catch (err) {
        console.error('Case Summary AI Error:', err);
        showToast('⚠️ No se pudo generar el resumen clínico', 'error');
    }
}

// Helper para abrir modal con contenido dinámico
function openModalWithCustomContent(title, htmlContent) {
    let modal = document.getElementById('customContentModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'customContentModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('customContentModal')"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2 id="customContentModalTitle">${title}</h2>
                    <button class="btn-icon" onclick="closeModal('customContentModal')"><i class="fas fa-times"></i></button>
                </div>
                <div class="modal-form" id="customContentModalBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    document.getElementById('customContentModalTitle').textContent = title;
    document.getElementById('customContentModalBody').innerHTML = htmlContent;
    openModal('customContentModal');
}

function copyAITextContent(encodedText) {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text);
    showToast('📋 Síntesis copiada al portapapeles', 'success');
}

// ============================================
// SUGERENCIAS DE HORARIO INTELIGENTE
// ============================================
async function suggestAppointmentSlots() {
    const patientSel = document.getElementById('appointmentPatient');
    const patientId = patientSel?.value;
    const p = patientId && window.AppState ? window.AppState.patients.find(x => String(x.id) === String(patientId)) : null;

    const resultsEl = document.getElementById('aiSuggestResults');
    if (!resultsEl) return;

    resultsEl.innerHTML = `<div style="font-size:12px;color:var(--accent-primary);padding:8px 0;"><i class="fas fa-spinner fa-spin"></i> Consultando agenda inteligente Gemini...</div>`;

    try {
        const res = await fetch('/api/ai/smart-schedule', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                patient: p,
                existingAppointments: window.AppState?.appointments || [],
                selectedDate: document.getElementById('appointmentDate')?.value || new Date().toISOString().split('T')[0]
            })
        });

        const data = await res.json();
        const suggestions = data.suggestions || [];

        if (suggestions.length === 0) {
            resultsEl.innerHTML = `<div style="font-size:12px;color:var(--text-tertiary);">No se encontraron sugerencias automáticas.</div>`;
            return;
        }

        resultsEl.innerHTML = `
            <div style="font-size:12px;font-weight:700;margin-bottom:6px;color:var(--text-primary);">Sugerencias Inteligentes recomendadas:</div>
            <div style="display:flex;flex-direction:column;gap:6px;">
                ${suggestions.map(s => `
                    <div style="background:var(--bg-secondary);border:1px solid var(--border-secondary);padding:8px 12px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;cursor:pointer;transition:all 0.2s;" onclick="applyAIScheduleSlot('${s.date}', '${s.time}')" title="Haz clic para seleccionar">
                        <div>
                            <strong style="color:var(--accent-primary);font-size:13px;">${s.date} a las ${s.time}</strong>
                            <div style="font-size:11px;color:var(--text-tertiary);">${s.reason}</div>
                        </div>
                        <button type="button" class="btn-primary btn-sm" style="padding:3px 8px;font-size:11px;">Usar</button>
                    </div>
                `).join('')}
            </div>
        `;
    } catch (err) {
        console.error('Schedule AI Error:', err);
        resultsEl.innerHTML = `<div style="font-size:12px;color:#e16259;">Error al generar sugerencias de horario.</div>`;
    }
}

function applyAIScheduleSlot(dateStr, timeStr) {
    const dateInput = document.getElementById('appointmentDate');
    const timeInput = document.getElementById('appointmentTime');
    if (dateInput) dateInput.value = dateStr;
    if (timeInput) timeInput.value = timeStr;
    showToast(`📅 Horario ${dateStr} ${timeStr} seleccionado`, 'success');
}

// Hacer funciones globales
window.toggleAIDrawer = toggleAIDrawer;
window.closeAIDrawer = closeAIDrawer;
window.onAIContextChange = onAIContextChange;
window.handleAIInputKeyDown = handleAIInputKeyDown;
window.submitAIPrompt = submitAIPrompt;
window.sendAIPreset = sendAIPreset;
window.copyAIText = copyAIText;
window.insertAIIntoActiveNote = insertAIIntoActiveNote;
window.clearAIChat = clearAIChat;
window.suggestSoapWithAI = suggestSoapWithAI;
window.generateCaseSummaryWithAI = generateCaseSummaryWithAI;
window.suggestAppointmentSlots = suggestAppointmentSlots;
window.applyAIScheduleSlot = applyAIScheduleSlot;
