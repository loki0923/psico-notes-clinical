/**
 * PSICO NOTES CLINICAL - FACTURACIÓN Y CONFIGURACIÓN FISCAL (SENIAT)
 */

function getBillingStorageKey(key) {
    const uid = AppState.currentUser ? AppState.currentUser.id : 'anon';
    return `psico_billing_${key}_${uid}`;
}

function getBillingConfig() {
    try {
        const stored = localStorage.getItem(getBillingStorageKey('config'));
        if (stored) return JSON.parse(stored);
    } catch {}
    return {
        fiscalName: '',
        rif: 'V-',
        address: '',
        phone: '',
        invoicePrefix: 'FACT-',
        nextNumber: 1,
        ivaRate: 0, // Honorarios médicos exentos de IVA según ley venezolana
        applyIGTF: true // 3% IGTF para divisas
    };
}

function saveBillingConfig(config) {
    localStorage.setItem(getBillingStorageKey('config'), JSON.stringify(config));
}

function getInvoices() {
    try {
        return JSON.parse(localStorage.getItem(getBillingStorageKey('invoices')) || '[]');
    } catch { return []; }
}

function saveInvoices(invoices) {
    localStorage.setItem(getBillingStorageKey('invoices'), JSON.stringify(invoices));
}

function openBillingConfig() {
    const config = getBillingConfig();
    const body = document.getElementById('billingModalBody');
    document.getElementById('billingModalTitle').textContent = 'Configuración Fiscal SENIAT';

    body.innerHTML = `
        <form onsubmit="handleBillingConfigSubmit(event)" class="modal-form">
            <div class="form-group">
                <label>Nombre o Razón Social *</label>
                <input type="text" id="cfgFiscalName" required value="${config.fiscalName}" placeholder="Dr. / Lcdo. ...">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>RIF *</label>
                    <input type="text" id="cfgRif" required value="${config.rif}" placeholder="V-12345678-0">
                </div>
                <div class="form-group">
                    <label>Teléfono de Contacto</label>
                    <input type="text" id="cfgPhone" value="${config.phone || ''}">
                </div>
            </div>
            <div class="form-group">
                <label>Dirección Fiscal *</label>
                <textarea id="cfgAddress" required rows="2">${config.address || ''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Prefijo de Factura</label>
                    <input type="text" id="cfgPrefix" value="${config.invoicePrefix}">
                </div>
                <div class="form-group">
                    <label>Próximo N° Factura SENIAT</label>
                    <input type="number" id="cfgNextNum" value="${config.nextNumber}">
                </div>
            </div>
            <div class="form-group">
                <label class="checkbox-label">
                    <input type="checkbox" id="cfgIGTF" ${config.applyIGTF ? 'checked' : ''}> Aplicar 3% IGTF a pagos en Divisas / USD
                </label>
            </div>
            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('billingModal')">Cancelar</button>
                <button type="submit" class="btn-primary">Guardar Configuración</button>
            </div>
        </form>
    `;
    openModal('billingModal');
}

function handleBillingConfigSubmit(e) {
    e.preventDefault();
    const config = {
        fiscalName: document.getElementById('cfgFiscalName').value.trim(),
        rif: document.getElementById('cfgRif').value.trim(),
        phone: document.getElementById('cfgPhone').value.trim(),
        address: document.getElementById('cfgAddress').value.trim(),
        invoicePrefix: document.getElementById('cfgPrefix').value.trim() || 'FACT-',
        nextNumber: parseInt(document.getElementById('cfgNextNum').value, 10) || 1,
        ivaRate: 0,
        applyIGTF: document.getElementById('cfgIGTF').checked
    };
    saveBillingConfig(config);
    closeModal('billingModal');
    openInvoicesList();
    showToast('Configuración fiscal guardada', 'success');
}

function openInvoicesList() {
    const container = document.getElementById('billingContent');
    if (!container) return;
    const invoices = getInvoices();
    const config = getBillingConfig();

    container.innerHTML = `
        <div style="background:var(--bg-secondary);padding:16px;border-radius:var(--radius-lg);margin-bottom:20px;display:flex;justify-content:space-between;align-items:center;">
            <div>
                <div style="font-size:16px;font-weight:700;color:var(--text-primary);">${config.fiscalName || 'Consulta Psicológica'}</div>
                <div style="font-size:12px;color:var(--text-tertiary);">RIF: ${config.rif} · Dirección: ${config.address || 'No configurada'}</div>
            </div>
            <button class="btn-secondary" onclick="openBillingConfig()"><i class="fas fa-edit"></i> Editar datos fiscal</button>
        </div>

        <div class="section-block">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
                <h2 class="section-title" style="margin:0;"><i class="fas fa-file-invoice"></i> Facturas Emitidas (${invoices.length})</h2>
                ${invoices.length > 0 ? `
                    <button class="btn-secondary" onclick="clearAllInvoices()" style="color:#e16259;border-color:rgba(225,98,89,0.3);" title="Vaciar registro de facturas">
                        <i class="fas fa-trash-alt"></i> Vaciar Facturas
                    </button>
                ` : ''}
            </div>
            ${invoices.length === 0 ? `
                <div class="empty-state">
                    <div class="empty-icon">📄</div>
                    <p>No se han emitido facturas aún</p>
                    <button class="btn-primary" onclick="openInvoiceCreator()">Emitir primera factura</button>
                </div>
            ` : `
                <div style="display:flex;flex-direction:column;gap:8px;">
                    ${invoices.sort((a,b) => new Date(b.date) - new Date(a.date)).map(inv => `
                        <div style="padding:12px 16px;background:var(--bg-secondary);border-radius:var(--radius-md);display:flex;justify-content:space-between;align-items:center;gap:12px;">
                            <div style="min-width:0;flex:1;">
                                <div style="font-weight:700;font-size:14px;color:var(--text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${inv.number} — ${inv.clientName}</div>
                                <div style="font-size:12px;color:var(--text-tertiary);">RIF/CI: ${inv.clientRif} · ${formatDate(inv.date)} · ${inv.paymentMethod}</div>
                            </div>
                            <div style="display:flex;align-items:center;gap:12px;flex-shrink:0;">
                                <div style="font-size:16px;font-weight:700;color:var(--accent-primary);">$${parseFloat(inv.totalUSD).toFixed(2)}</div>
                                <button class="btn-secondary" onclick="printInvoice('${inv.id}')"><i class="fas fa-print"></i> Imprimir</button>
                                <button class="btn-icon" style="color:#e16259;" onclick="deleteInvoice('${inv.id}')" title="Eliminar Factura"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `}
        </div>
    `;
}

function deleteInvoice(id) {
    showConfirmModal(
        'Eliminar Factura',
        '¿Está seguro/a de eliminar esta factura del registro?',
        () => {
            let invoices = getInvoices();
            invoices = invoices.filter(inv => String(inv.id) !== String(id));
            saveInvoices(invoices);
            openInvoicesList();
            showToast('🗑️ Factura eliminada correctamente', 'info');
        }
    );
}

function clearAllInvoices() {
    showConfirmModal(
        'Vaciar Registro de Facturas',
        '⚠️ ¿Desea eliminar TODAS las facturas emitidas? Esta acción no se puede deshacer.',
        () => {
            saveInvoices([]);
            openInvoicesList();
            showToast('🗑️ Registro de facturas vaciado', 'info');
        }
    );
}

function openInvoiceCreator() {
    const config = getBillingConfig();
    if (!config.fiscalName || !config.rif) {
        alert('Por favor configure primero sus datos fiscales RIF y Nombre Comercial.');
        openBillingConfig();
        return;
    }

    const body = document.getElementById('billingModalBody');
    document.getElementById('billingModalTitle').textContent = 'Emitir Factura SENIAT';

    body.innerHTML = `
        <form onsubmit="handleInvoiceSubmit(event)" class="modal-form">
            <div class="form-group">
                <label>Paciente / Cliente *</label>
                <select id="invPatient" onchange="fillInvoiceClientData(this.value)" required>
                    <option value="">Seleccionar paciente o cliente particular</option>
                    ${AppState.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Nombre / Razón Social Cliente *</label>
                    <input type="text" id="invClientName" required>
                </div>
                <div class="form-group">
                    <label>RIF / C.I. Cliente *</label>
                    <input type="text" id="invClientRif" required placeholder="V-12345678">
                </div>
            </div>
            <div class="form-group">
                <label>Concepto de Facturación *</label>
                <input type="text" id="invConcept" required value="Honorarios Profesionales - Consulta Psicológica">
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Monto Base ($) *</label>
                    <input type="number" step="0.01" id="invAmount" required value="40.00" onchange="calculateInvoiceTotals()">
                </div>
                <div class="form-group">
                    <label>Forma de Pago *</label>
                    <select id="invPaymentMethod" onchange="calculateInvoiceTotals()">
                        <option value="Divisa / USD Cash">Divisa / USD (Sujeto a IGTF 3%)</option>
                        <option value="Transferencia / Pago Móvil">Pago Móvil / Bolívares (Exento IGTF)</option>
                        <option value="Zelle">Zelle / USD Electrónico</option>
                    </select>
                </div>
            </div>

            <div style="background:var(--bg-secondary);padding:12px;border-radius:var(--radius-md);margin-top:12px;" id="invoiceSummaryBox">
                <!-- Calculado dinámicamente -->
            </div>

            <div class="modal-actions">
                <button type="button" class="btn-secondary" onclick="closeModal('billingModal')">Cancelar</button>
                <button type="submit" class="btn-primary"><i class="fas fa-check"></i> Emitir e Imprimir Factura</button>
            </div>
        </form>
    `;
    openModal('billingModal');
    calculateInvoiceTotals();
}

function fillInvoiceClientData(patientId) {
    if (!patientId) return;
    const p = AppState.patients.find(x => x.id === patientId);
    if (!p) return;
    document.getElementById('invClientName').value = p.name;
    document.getElementById('invClientRif').value = p.phone || 'V-00000000';
}

function calculateInvoiceTotals() {
    const config = getBillingConfig();
    const amount = parseFloat(document.getElementById('invAmount')?.value || 0);
    const method = document.getElementById('invPaymentMethod')?.value || '';
    const applyIGTF = config.applyIGTF && method.includes('USD');
    
    const igtfAmount = applyIGTF ? amount * 0.03 : 0;
    const total = amount + igtfAmount;

    const box = document.getElementById('invoiceSummaryBox');
    if (box) {
        box.innerHTML = `
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:4px;">
                <span>Honorarios Médicos (Exento IVA):</span>
                <strong>$${amount.toFixed(2)}</strong>
            </div>
            ${applyIGTF ? `
                <div style="display:flex;justify-content:space-between;font-size:13px;color:#e67e22;margin-bottom:4px;">
                    <span>IGTF (3% Ley Divisas SENIAT):</span>
                    <strong>+$${igtfAmount.toFixed(2)}</strong>
                </div>
            ` : ''}
            <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:700;color:var(--text-primary);border-top:1px solid var(--border-secondary);padding-top:6px;margin-top:4px;">
                <span>Total a Cobrar:</span>
                <span style="color:var(--accent-primary);">$${total.toFixed(2)}</span>
            </div>
        `;
    }
}

function handleInvoiceSubmit(e) {
    e.preventDefault();
    const config = getBillingConfig();
    const amount = parseFloat(document.getElementById('invAmount').value) || 0;
    const method = document.getElementById('invPaymentMethod').value;
    const applyIGTF = config.applyIGTF && method.includes('USD');
    const igtfAmount = applyIGTF ? amount * 0.03 : 0;
    const totalUSD = amount + igtfAmount;

    const invoiceNum = `${config.invoicePrefix}${config.nextNumber.toString().padStart(6, '0')}`;

    const invoice = {
        id: generateId(),
        number: invoiceNum,
        clientName: document.getElementById('invClientName').value.trim(),
        clientRif: document.getElementById('invClientRif').value.trim(),
        concept: document.getElementById('invConcept').value.trim(),
        amountUSD: amount,
        igtfUSD: igtfAmount,
        totalUSD: totalUSD,
        paymentMethod: method,
        date: new Date().toISOString(),
        issuerName: config.fiscalName,
        issuerRif: config.rif,
        issuerAddress: config.address
    };

    const invoices = getInvoices();
    invoices.push(invoice);
    saveInvoices(invoices);

    config.nextNumber++;
    saveBillingConfig(config);

    closeModal('billingModal');
    openInvoicesList();
    printInvoice(invoice.id);
    showToast(`Factura ${invoiceNum} emitida`, 'success');
}

function printInvoice(invoiceId) {
    const invoices = getInvoices();
    const inv = invoices.find(i => i.id === invoiceId);
    if (!inv) return;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Factura SENIAT - ${inv.number}</title>
            <style>
                body { font-family: 'Courier New', Courier, monospace; max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ccc; color: #000; }
                .header { text-align: center; border-bottom: 1px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
                .title { font-size: 16px; font-weight: bold; }
                .row { display: flex; justify-content: space-between; font-size: 13px; margin: 4px 0; }
                .divider { border-top: 1px dashed #000; margin: 10px 0; }
                .footer { text-align: center; font-size: 11px; margin-top: 20px; }
                @media print { body { border: none; } }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="title">${inv.issuerName}</div>
                <div>RIF: ${inv.issuerRif}</div>
                <div>${inv.issuerAddress}</div>
                <div style="margin-top:8px;font-weight:bold;">FACTURA DE SERVICIOS</div>
                <div>N° DE CONTROL: ${inv.number}</div>
                <div>FECHA: ${new Date(inv.date).toLocaleDateString('es-ES')}</div>
            </div>

            <div class="row"><strong>CLIENTE:</strong> <span>${inv.clientName}</span></div>
            <div class="row"><strong>RIF / C.I.:</strong> <span>${inv.clientRif}</span></div>
            <div class="row"><strong>FORMA DE PAGO:</strong> <span>${inv.paymentMethod}</span></div>

            <div class="divider"></div>

            <div class="row">
                <span>1x ${inv.concept}</span>
                <span>$${inv.amountUSD.toFixed(2)}</span>
            </div>

            <div class="divider"></div>

            <div class="row"><span>SUBTOTAL EXENTO:</span> <span>$${inv.amountUSD.toFixed(2)}</span></div>
            <div class="row"><span>I.V.A. (0% Exento):</span> <span>$0.00</span></div>
            ${inv.igtfUSD > 0 ? `<div class="row"><span>I.G.T.F. (3%):</span> <span>$${inv.igtfUSD.toFixed(2)}</span></div>` : ''}
            
            <div class="divider"></div>

            <div class="row" style="font-size:16px;font-weight:bold;">
                <span>TOTAL A PAGAR:</span>
                <span>$${inv.totalUSD.toFixed(2)}</span>
            </div>

            <div class="footer">
                <p>Honorarios médicos exentos de IVA conforme al Art. 18 de la Ley de IVA.</p>
                <p>GRACIAS POR SU CONFIANZA</p>
            </div>

            <script>window.onload = () => window.print();</script>
        </body>
        </html>
    `;

    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
}
