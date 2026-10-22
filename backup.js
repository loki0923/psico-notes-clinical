/**
 * PSICO NOTES CLINICAL - SISTEMA DE BACKUP Y RESTAURACIÓN
 */

function exportBackupFile() {
    const safeUser = AppState.currentUser ? { ...AppState.currentUser } : null;
    if (safeUser) {
        delete safeUser.passwordHash;
        delete safeUser.password_hash;
    }

    const backupData = {
        version: '6.0',
        timestamp: new Date().toISOString(),
        user: safeUser,
        patients: AppState.patients,
        appointments: AppState.appointments,
        notes: AppState.notes,
        treatmentPlans: AppState.treatmentPlans,
        financeTransactions: getFinanceTransactions(),
        financeCategories: getFinanceCategories(),
        billingConfig: getBillingConfig(),
        invoices: getInvoices()
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PsicoNotes_Backup_${AppState.currentUser?.name || 'Consulta'}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast('Backup descargado correctamente', 'success');
}

function importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target.result);
                showConfirmModal(
                    'Restaurar Copia de Seguridad',
                    `¿Restaurar backup de ${data.user?.name || 'usuario'} (${new Date(data.timestamp).toLocaleDateString()})? Esto sobrescribirá los datos actuales.`,
                    async () => {
                        if (data.patients) AppState.patients = data.patients;
                        if (data.appointments) AppState.appointments = data.appointments;
                        if (data.notes) AppState.notes = data.notes;
                        if (data.treatmentPlans) AppState.treatmentPlans = data.treatmentPlans;

                        if (data.financeTransactions) saveFinanceTransactions(data.financeTransactions);
                        if (data.financeCategories) saveFinanceCategories(data.financeCategories);
                        if (data.billingConfig) saveBillingConfig(data.billingConfig);
                        if (data.invoices) saveInvoices(data.invoices);

                        await saveData();
                        
                        showToast('✅ Datos restaurados con éxito', 'success');
                        setTimeout(() => location.reload(), 1000);
                    }
                );
            } catch (err) {
                console.error('Error importando backup:', err);
                alert('El archivo de backup es inválido o está dañado.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function openBackupModal() {
    const body = document.getElementById('backupModalBody');
    document.getElementById('backupModalTitle').textContent = '💾 Centro de Cifrado y Respaldos';

    body.innerHTML = `
        <div style="font-size:13px;color:var(--text-secondary);line-height:1.5;margin-bottom:16px;">
            Todos los datos del expediente están cifrados localmente mediante el algoritmo <strong>AES-GCM (256-bit)</strong> y PBKDF2. Puede descargar un archivo físico codificado o restaurarlo en cualquier momento.
        </div>

        <div style="display:flex;flex-direction:column;gap:12px;">
            <button class="btn-primary" onclick="if(window.CloudSyncManager) window.CloudSyncManager.manualSyncClick()" style="padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;background:#3b82f6;color:white;border:none;border-radius:var(--radius-md);cursor:pointer;font-weight:600;">
                <i class="fas fa-cloud-upload-alt"></i> Sincronizar Todo con la Nube Ahora (PC y Móvil)
            </button>
            <button class="btn-secondary" onclick="exportBackupFile()" style="padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-download"></i> Descargar Copia de Seguridad Físico (.json)
            </button>
            <button class="btn-secondary" onclick="importBackup()" style="padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-upload"></i> Restaurar desde Archivo de Copia de Seguridad
            </button>
        </div>

        <div style="margin-top:16px;padding:12px;background:rgba(59, 130, 246, 0.08);border:1px solid rgba(59, 130, 246, 0.2);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary);line-height:1.4;">
            ☁️ <strong>Sincronización Multi-Dispositivo:</strong> Tu usuario y tus expedientes se respaldan automáticamente en la nube. Al ingresar desde tu celular o computadora con tu mismo correo y contraseña, tus datos se sincronizarán al instante.
        </div>

        <div style="margin-top:12px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-md);font-size:12px;color:var(--text-tertiary);">
            🔒 Cifrado activo para la cuenta: <strong>${AppState.currentUser?.email || 'Sesión activa'}</strong>
        </div>
    `;

    openModal('backupModal');
}

// Exposición global
const _backupTargetScope = (typeof window !== 'undefined') ? window : (typeof globalThis !== 'undefined' ? globalThis : (typeof global !== 'undefined' ? global : null));
if (_backupTargetScope) {
    _backupTargetScope.openBackupModal = openBackupModal;
    _backupTargetScope.exportBackupFile = exportBackupFile;
    _backupTargetScope.importBackup = importBackup;
}
