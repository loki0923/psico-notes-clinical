/**
 * PSICO NOTES CLINICAL - SISTEMA DE RECORDATORIOS Y ALERTAS VISUALES DE SESIONES
 * Gestión integral de sesiones pendientes, alertas de notas faltantes, confirmaciones y mensajes
 */

// Estado local de recordatorios descartados o pospuestos
const ReminderState = {
    dismissed: [], // Array de IDs descartados
    snoozed: {},   // Map { id: timestampHastaCuando }
    customReminders: [], // Recordatorios creados manualmente
    currentFilter: 'all' // Filter para el drawer: 'all', 'no_note', 'starting_soon', 'unconfirmed', 'custom'
};

// Cargar estado de almacenamiento local
function loadReminderState() {
    try {
        const uid = AppState.currentUser ? AppState.currentUser.id : 'anon';
        const key = `psico_reminders_state_${uid}`;
        const stored = localStorage.getItem(key);
        if (stored) {
            const parsed = JSON.parse(stored);
            ReminderState.dismissed = parsed.dismissed || [];
            ReminderState.snoozed = parsed.snoozed || {};
            ReminderState.customReminders = parsed.customReminders || [];
        }
    } catch (e) {
        console.error('Error cargando estado de recordatorios:', e);
    }
}

// Guardar estado de almacenamiento local
function saveReminderState() {
    try {
        const uid = AppState.currentUser ? AppState.currentUser.id : 'anon';
        const key = `psico_reminders_state_${uid}`;
        localStorage.setItem(key, JSON.stringify({
            dismissed: ReminderState.dismissed,
            snoozed: ReminderState.snoozed,
            customReminders: ReminderState.customReminders
        }));
    } catch (e) {
        console.error('Error guardando estado de recordatorios:', e);
    }
}

// ============================================
// MOTOR DE EVALUACIÓN DE RECORDATORIOS
// ============================================
function evaluateSessionReminders() {
    loadReminderState();
    const reminders = [];
    const now = new Date();
    const todayStr = toDateInputValue(now);

    // 1. EVALUAR SESIONES FINALIZADAS SIN NOTA CLÍNICA
    // Busca citas de las últimas 2 semanas cuya hora pasó o fueron marcadas completadas pero no tienen nota SOAP registrada
    AppState.appointments.forEach(app => {
        if (app.status === 'cancelada') return;

        const appDate = new Date(app.date + 'T' + (app.time || '00:00') + ':00');
        const isPast = appDate <= now || app.status === 'completada';

        // Solo evaluar si la cita ya ocurrió o es de los últimos 14 días
        const daysDiff = (now - appDate) / (1000 * 60 * 60 * 24);
        if (isPast && daysDiff >= 0 && daysDiff <= 14) {
            // Verificar si existe nota para este paciente en esta fecha
            const hasNote = AppState.notes.some(n => {
                if (n.patientId !== app.patientId) return false;
                if (n.appointmentId && n.appointmentId === app.id) return true;
                const noteDate = new Date(n.date);
                return isSameDay(noteDate, appDate);
            });

            if (!hasNote) {
                const patient = AppState.patients.find(p => p.id === app.patientId);
                const reminderId = `no_note_${app.id}`;
                if (!isReminderActive(reminderId)) return;

                const hoursAgo = Math.round((now - appDate) / (1000 * 60 * 60));
                reminders.push({
                    id: reminderId,
                    appointmentId: app.id,
                    patientId: app.patientId,
                    patientName: patient ? patient.name : 'Paciente desconocido',
                    patientPhone: patient ? patient.phone : '',
                    category: 'no_note',
                    level: 'critical', // 🚨 Urgencia máxima
                    badgeText: 'Falta Nota SOAP',
                    title: `Sesión sin Nota Clínica`,
                    description: `Sesión del ${formatDate(app.date)} (${app.time}) aún no tiene evolución registrada (${hoursAgo > 0 ? `hace ${hoursAgo}h` : 'recién finalizada'}).`,
                    timeStr: `${formatDate(app.date)} · ${app.time}`,
                    priorityScore: 1,
                    actions: [
                        { label: '📝 Redactar Nota', type: 'note', primary: true },
                        { label: '⏰ Posponer', type: 'snooze' },
                        { label: '✕ Ocultar', type: 'dismiss' }
                    ]
                });
            }
        }
    });

    // 2. EVALUAR SESIONES PRÓXIMAS / EN BREVE (HOY)
    AppState.appointments.forEach(app => {
        if (app.status === 'cancelada' || app.status === 'completada') return;

        const appDate = new Date(app.date + 'T' + (app.time || '00:00') + ':00');
        const diffMs = appDate - now;
        const diffMinutes = Math.round(diffMs / (1000 * 60));

        // Alertar si la sesión inicia en los próximos 120 minutos (o si está transcurriendo en este momento)
        if (diffMinutes >= -30 && diffMinutes <= 120) {
            const patient = AppState.patients.find(p => p.id === app.patientId);
            const reminderId = `starting_${app.id}`;
            if (!isReminderActive(reminderId)) return;

            let level = 'urgent';
            let title = `Sesión en ${diffMinutes} minutos`;
            if (diffMinutes <= 15 && diffMinutes >= -10) {
                level = 'critical';
                title = `🚨 Sesión por comenzar (${diffMinutes <= 0 ? 'En curso' : `${diffMinutes} min`})`;
            }

            reminders.push({
                id: reminderId,
                appointmentId: app.id,
                patientId: app.patientId,
                patientName: patient ? patient.name : 'Paciente',
                patientPhone: patient ? patient.phone : '',
                category: 'starting_soon',
                level: level,
                badgeText: diffMinutes <= 0 ? 'En Curso' : `En ${diffMinutes}m`,
                title: title,
                description: `Cita con ${patient ? patient.name : 'paciente'} a las ${app.time} hs (${app.duration || 50} min).`,
                timeStr: `Hoy a las ${app.time}`,
                priorityScore: diffMinutes <= 15 ? 2 : 3,
                actions: [
                    { label: '👤 Ver Expediente', type: 'view_patient', primary: true },
                    { label: '💬 Recordatorio WA', type: 'whatsapp' },
                    { label: '✅ Iniciar Sesión', type: 'complete' }
                ]
            });
        }
    });

    // 3. EVALUAR SESIONES SIN CONFIRMAR (HOY Y MAÑANA)
    AppState.appointments.forEach(app => {
        if (app.status === 'cancelada' || app.status === 'completada' || app.status === 'confirmada') return;

        const appDate = new Date(app.date + 'T' + (app.time || '00:00') + ':00');
        const isToday = isSameDay(appDate, now);
        
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const isTomorrow = isSameDay(appDate, tomorrow);

        if ((isToday || isTomorrow) && appDate > now) {
            const patient = AppState.patients.find(p => p.id === app.patientId);
            const reminderId = `unconfirmed_${app.id}`;
            if (!isReminderActive(reminderId)) return;

            reminders.push({
                id: reminderId,
                appointmentId: app.id,
                patientId: app.patientId,
                patientName: patient ? patient.name : 'Paciente',
                patientPhone: patient ? patient.phone : '',
                category: 'unconfirmed',
                level: isToday ? 'urgent' : 'warning',
                badgeText: 'Sin Confirmar',
                title: `Sesión ${isToday ? 'de hoy' : 'de mañana'} sin confirmar`,
                description: `Paciente ${patient ? patient.name : ''} aún no ha confirmado su asistencia para ${isToday ? 'hoy' : 'mañana'} a las ${app.time}.`,
                timeStr: `${isToday ? 'Hoy' : 'Mañana'} · ${app.time}`,
                priorityScore: isToday ? 4 : 5,
                actions: [
                    { label: '📲 Recordatorio WhatsApp', type: 'whatsapp', primary: true },
                    { label: '✅ Marcar Confirmada', type: 'confirm' },
                    { label: '⏰ Posponer', type: 'snooze' }
                ]
            });
        }
    });

    // 4. RECORDATORIOS PERSONALIZADOS CREADOS POR EL TERAPEUTA
    ReminderState.customReminders.forEach(cust => {
        if (!isReminderActive(cust.id)) return;
        const patient = cust.patientId ? AppState.patients.find(p => p.id === cust.patientId) : null;

        reminders.push({
            id: cust.id,
            patientId: cust.patientId || null,
            patientName: patient ? patient.name : (cust.targetName || 'General'),
            patientPhone: patient ? patient.phone : '',
            category: 'custom',
            level: cust.priority || 'warning',
            badgeText: 'Personalizado',
            title: cust.title,
            description: cust.notes || 'Recordatorio programado por el terapeuta.',
            timeStr: cust.dateStr ? `${formatDate(cust.dateStr)} ${cust.timeStr || ''}` : 'Pendiente',
            priorityScore: cust.priority === 'critical' ? 2 : 6,
            actions: [
                patient ? { label: '👤 Ver Paciente', type: 'view_patient', primary: true } : null,
                { label: '✅ Listo / Eliminar', type: 'dismiss_custom', primary: !patient }
            ].filter(Boolean)
        });
    });

    // Ordenar por nivel de prioridad
    return reminders.sort((a, b) => a.priorityScore - b.priorityScore);
}

// Verifica si un recordatorio está activo (no pospuesto ni descartado)
function isReminderActive(id) {
    if (ReminderState.dismissed.includes(id)) return false;
    if (ReminderState.snoozed[id]) {
        if (Date.now() < ReminderState.snoozed[id]) {
            return false; // Sigue pospuesto
        } else {
            delete ReminderState.snoozed[id]; // Ya expiró el snooze
        }
    }
    return true;
}

// ============================================
// ACTUALIZACIÓN VISUAL Y RENDERIZADO EN LA UI
// ============================================
function updateSessionRemindersUI() {
    const reminders = evaluateSessionReminders();
    
    // 1. Actualizar Badge y Botón de la Topbar
    const badge = document.getElementById('sessionReminderBadge');
    const bellBtn = document.getElementById('sessionReminderBtn');
    
    if (badge && bellBtn) {
        const count = reminders.length;
        badge.textContent = count;
        
        if (count > 0) {
            badge.style.display = 'inline-flex';
            const hasCritical = reminders.some(r => r.level === 'critical');
            if (hasCritical) {
                badge.className = 'reminder-badge critical pulse';
                bellBtn.classList.add('has-critical-alerts');
            } else {
                badge.className = 'reminder-badge warning';
                bellBtn.classList.remove('has-critical-alerts');
            }
        } else {
            badge.style.display = 'none';
            bellBtn.classList.remove('has-critical-alerts');
        }
    }

    // 2. Renderizar Widget en el Dashboard (si estamos en dashboard)
    renderDashboardRemindersWidget(reminders);

    // 3. Renderizar Lista en el Drawer Lateral
    renderReminderDrawerList(reminders);
}

// Renderiza el widget en la página principal del Dashboard
function renderDashboardRemindersWidget(reminders) {
    const container = document.getElementById('sessionRemindersWidget');
    if (!container) return;

    if (reminders.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card">
                <div class="empty-icon">✨</div>
                <div>
                    <strong>¡Al día con tus sesiones!</strong>
                    <p style="font-size:12px;color:var(--text-tertiary);margin-top:2px;">
                        No hay notas de evolución pendientes ni citas sin confirmar por el momento.
                    </p>
                </div>
            </div>
        `;
        return;
    }

    // Contadores de categorías para visualización
    const noNoteCount = reminders.filter(r => r.category === 'no_note').length;
    const startingCount = reminders.filter(r => r.category === 'starting_soon').length;
    const unconfirmedCount = reminders.filter(r => r.category === 'unconfirmed').length;

    let summaryChipsHtml = '<div class="reminder-chips-bar">';
    summaryChipsHtml += `<span class="reminder-chip active">Todos (${reminders.length})</span>`;
    if (noNoteCount > 0) summaryChipsHtml += `<span class="reminder-chip critical">📝 Sin Nota (${noNoteCount})</span>`;
    if (startingCount > 0) summaryChipsHtml += `<span class="reminder-chip urgent">⏰ En Breve (${startingCount})</span>`;
    if (unconfirmedCount > 0) summaryChipsHtml += `<span class="reminder-chip warning">📲 Sin Confirmar (${unconfirmedCount})</span>`;
    summaryChipsHtml += '</div>';

    // Renderizar las 4 primeras tarjetas prioritarias
    const visible = reminders.slice(0, 4);
    const cardsHtml = visible.map(rem => renderReminderCardHtml(rem)).join('');

    container.innerHTML = `
        ${summaryChipsHtml}
        <div class="reminder-cards-grid">
            ${cardsHtml}
        </div>
        ${reminders.length > 4 ? `
            <div style="text-align:center;margin-top:12px;">
                <button class="btn-secondary btn-sm" onclick="toggleReminderDrawer()">
                    Ver los ${reminders.length} recordatorios pendientes →
                </button>
            </div>
        ` : ''}
    `;
}

// Renderiza el HTML de una tarjeta individual de recordatorio
function renderReminderCardHtml(rem) {
    const iconMap = {
        no_note: '📝',
        starting_soon: '⏰',
        unconfirmed: '📲',
        custom: '📌'
    };

    return `
        <div class="reminder-card card-level-${rem.level}">
            <div class="reminder-card-header">
                <div class="reminder-badge-pill pill-${rem.level}">
                    <span>${iconMap[rem.category] || '🔔'}</span> ${rem.badgeText}
                </div>
                <div class="reminder-time-tag">${rem.timeStr}</div>
            </div>
            
            <div class="reminder-card-body">
                <div class="reminder-patient-name" onclick="viewPatient('${rem.patientId}')" title="Ver expediente">
                    ${rem.patientName}
                </div>
                <div class="reminder-title">${rem.title}</div>
                <div class="reminder-description">${rem.description}</div>
            </div>

            <div class="reminder-card-actions">
                ${rem.actions.map(act => `
                    <button class="reminder-act-btn ${act.primary ? 'primary' : 'secondary'}" 
                            onclick="handleReminderAction('${rem.id}', '${act.type}', '${rem.patientId || ''}', '${rem.appointmentId || ''}')">
                        ${act.label}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

// Renderiza la lista dentro del Drawer lateral
function renderReminderDrawerList(reminders) {
    const container = document.getElementById('reminderDrawerList');
    if (!container) return;

    let filtered = reminders;
    if (ReminderState.currentFilter && ReminderState.currentFilter !== 'all') {
        filtered = reminders.filter(r => r.category === ReminderState.currentFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="padding:40px 20px;">
                <div class="empty-icon">✅</div>
                <p style="font-weight:600;margin-bottom:4px;">Sin recordatorios en esta categoría</p>
                <span style="font-size:12px;color:var(--text-tertiary);">Todas tus sesiones y notas están al día.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map(rem => renderReminderCardHtml(rem)).join('');
}

// ============================================
// ACCIONES INTERACTIVAS DE RECORDATORIOS
// ============================================
function handleReminderAction(reminderId, actionType, patientId, appointmentId) {
    switch (actionType) {
        case 'note':
            // Redactar Nota SOAP para la sesión
            startNoteFromReminder(patientId, appointmentId);
            break;

        case 'whatsapp':
            // Enviar mensaje de confirmación/recordatorio vía WhatsApp
            sendWhatsAppSessionReminder(patientId, appointmentId);
            break;

        case 'confirm':
            // Marcar cita como confirmada
            confirmAppointmentFromReminder(appointmentId);
            break;

        case 'complete':
            // Marcar sesión como iniciada/completada
            completeAppointmentFromReminder(appointmentId);
            break;

        case 'view_patient':
            if (patientId) {
                closeReminderDrawer();
                viewPatient(patientId);
            }
            break;

        case 'snooze':
            // Posponer durante 4 horas
            snoozeReminder(reminderId, 4 * 60 * 60 * 1000);
            showToast('⏰ Recordatorio pospuesto 4 horas', 'info');
            break;

        case 'dismiss':
            // Descartar recordatorio
            dismissReminder(reminderId);
            showToast('Recordatorio ocultado', 'info');
            break;

        case 'dismiss_custom':
            // Eliminar recordatorio personalizado
            deleteCustomReminder(reminderId);
            showToast('✅ Recordatorio completado', 'success');
            break;
    }

    updateSessionRemindersUI();
}

// 1. Redactar Nota SOAP a partir de la alerta de sesión
function startNoteFromReminder(patientId, appointmentId) {
    closeReminderDrawer();
    openModal('noteModal');
    
    setTimeout(() => {
        const patientSelect = document.getElementById('notePatient');
        if (patientSelect && patientId) {
            patientSelect.value = patientId;
        }

        const app = AppState.appointments.find(a => a.id === appointmentId);
        if (app) {
            const dateInput = document.getElementById('noteDate');
            if (dateInput) dateInput.value = app.date;

            const titleInput = document.getElementById('noteTitle');
            if (titleInput && !titleInput.value) {
                titleInput.value = `Sesión de Evolución - ${formatDate(app.date)}`;
            }
        }
    }, 100);
}

// 2. Enviar mensaje de recordatorio vía WhatsApp al paciente
function sendWhatsAppSessionReminder(patientId, appointmentId) {
    const patient = AppState.patients.find(p => p.id === patientId);
    const app = AppState.appointments.find(a => a.id === appointmentId);

    if (!patient || !patient.phone) {
        showToast('El paciente no tiene un número telefónico registrado', 'warning');
        return;
    }

    // Limpiar teléfono
    const cleanPhone = patient.phone.replace(/[^0-9]/g, '');
    if (!cleanPhone) {
        showToast('Número de teléfono no válido', 'warning');
        return;
    }

    const therapistName = AppState.currentUser?.name || 'su terapeuta';
    const dateStr = app ? formatDate(app.date) : 'hoy';
    const timeStr = app ? app.time : '';

    const message = `Hola ${patient.name}, te escribo del consultorio de ${therapistName}. Te recordamos tu cita programada para el ${dateStr} a las ${timeStr} hs. Por favor confírmanos tu asistencia por este medio. ¡Muchas gracias!`;

    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodedMsg}`;

    window.open(waUrl, '_blank');
    showToast('💬 Abriendo WhatsApp con el mensaje de confirmación', 'success');
}

// 3. Confirmar cita directamente
function confirmAppointmentFromReminder(appointmentId) {
    const app = AppState.appointments.find(a => a.id === appointmentId);
    if (app) {
        app.status = 'confirmada';
        saveData();
        renderAppointments();
        renderCalendar();
        showToast('✅ Cita marcada como confirmada', 'success');
    }
}

// 4. Marcar cita como completada
function completeAppointmentFromReminder(appointmentId) {
    const app = AppState.appointments.find(a => a.id === appointmentId);
    if (app) {
        app.status = 'completada';
        saveData();
        renderAppointments();
        renderCalendar();
        showToast('✅ Sesión marcada como iniciada / completada', 'success');
    }
}

// 5. Posponer recordatorio
function snoozeReminder(id, durationMs) {
    ReminderState.snoozed[id] = Date.now() + durationMs;
    saveReminderState();
}

// 6. Ocultar / Descartar recordatorio
function dismissReminder(id) {
    if (!ReminderState.dismissed.includes(id)) {
        ReminderState.dismissed.push(id);
        saveReminderState();
    }
}

// 7. Eliminar recordatorio personalizado
function deleteCustomReminder(id) {
    ReminderState.customReminders = ReminderState.customReminders.filter(r => r.id !== id);
    saveReminderState();
}

// ============================================
// CREACIÓN DE RECORDATORIO PERSONALIZADO
// ============================================
function openCustomReminderModal() {
    closeReminderDrawer();
    const modalId = 'customReminderModal';
    let modal = document.getElementById(modalId);

    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        document.body.appendChild(modal);
    }

    modal.innerHTML = `
        <div class="modal-overlay" onclick="closeModal('${modalId}')"></div>
        <div class="modal-content">
            <div class="modal-header">
                <h2>📌 Nuevo Recordatorio de Sesión</h2>
                <button class="btn-icon" onclick="closeModal('${modalId}')"><i class="fas fa-times"></i></button>
            </div>
            <form id="customReminderForm" onsubmit="saveCustomReminderForm(event)">
                <div class="modal-form">
                    <div class="form-group">
                        <label>Vincular Paciente (Opcional)</label>
                        <select id="customReminderPatient">
                            <option value="">-- General / Sin paciente --</option>
                            ${AppState.patients.sort((a,b)=>a.name.localeCompare(b.name)).map(p => `
                                <option value="${p.id}">${p.name}</option>
                            `).join('')}
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Título del Recordatorio *</label>
                        <input type="text" id="customReminderTitle" required placeholder="Ej. Revisar informe neuropsicológico previo a la cita">
                    </div>

                    <div class="form-row">
                        <div class="form-group">
                            <label>Prioridad / Urgencia</label>
                            <select id="customReminderPriority">
                                <option value="warning">🟠 Normal / Importante</option>
                                <option value="critical">🚨 Alta / Urgente</option>
                                <option value="info">🔵 Informativa / Seguimiento</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Fecha del Alerta</label>
                            <input type="date" id="customReminderDate" value="${toDateInputValue(new Date())}">
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Notas Adicionales / Indicaciones</label>
                        <textarea id="customReminderNotes" rows="3" placeholder="Detalles o tareas asociadas a este recordatorio..."></textarea>
                    </div>

                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('${modalId}')">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar Recordatorio</button>
                    </div>
                </div>
            </form>
        </div>
    `;

    openModal(modalId);
}

function saveCustomReminderForm(e) {
    e.preventDefault();
    const patientId = document.getElementById('customReminderPatient').value;
    const title = document.getElementById('customReminderTitle').value.trim();
    const priority = document.getElementById('customReminderPriority').value;
    const dateStr = document.getElementById('customReminderDate').value;
    const notes = document.getElementById('customReminderNotes').value.trim();

    if (!title) return;

    const newRem = {
        id: 'cust_' + Date.now().toString(36),
        patientId: patientId || null,
        title: title,
        priority: priority,
        dateStr: dateStr,
        notes: notes,
        createdAt: new Date().toISOString()
    };

    ReminderState.customReminders.push(newRem);
    saveReminderState();
    closeModal('customReminderModal');
    showToast('📌 Recordatorio guardado con éxito', 'success');
    updateSessionRemindersUI();
}

// ============================================
// CONTROL DEL DRAWER LATERAL
// ============================================
function toggleReminderDrawer() {
    const drawer = document.getElementById('sessionReminderDrawer');
    if (!drawer) return;

    if (drawer.classList.contains('active')) {
        closeReminderDrawer();
    } else {
        openReminderDrawer();
    }
}

function openReminderDrawer() {
    const drawer = document.getElementById('sessionReminderDrawer');
    if (!drawer) return;
    drawer.classList.add('active');
    updateSessionRemindersUI();
}

function closeReminderDrawer() {
    const drawer = document.getElementById('sessionReminderDrawer');
    if (drawer) drawer.classList.remove('active');
}

function filterReminderDrawerCategory(category) {
    ReminderState.currentFilter = category;
    
    // Actualizar pills activas
    document.querySelectorAll('.drawer-filter-pill').forEach(pill => {
        if (pill.getAttribute('data-cat') === category) {
            pill.classList.add('active');
        } else {
            pill.classList.remove('active');
        }
    });

    const reminders = evaluateSessionReminders();
    renderReminderDrawerList(reminders);
}

// ============================================
// INICIALIZACIÓN Y SUSCRIPCIÓN GLOBAL
// ============================================
function initSessionReminders() {
    // Escuchar clicks en el botón del campana
    const bellBtn = document.getElementById('sessionReminderBtn');
    if (bellBtn) {
        bellBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleReminderDrawer();
        });
    }

    // Intervalo continuo cada 60 segundos para mantener vivas las alertas
    setInterval(() => {
        updateSessionRemindersUI();
    }, 60000);

    // Ejecutar evaluación inicial
    setTimeout(() => {
        updateSessionRemindersUI();
    }, 300);
}

// Auto-ejecutar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionReminders);
} else {
    initSessionReminders();
}
