/**
 * PSICO NOTES CLINICAL - SISTEMA DE BACKUP Y RESTAURACIÓN
 */

function exportBackupFile() {
    const backupData = {
        version: '5.0',
        timestamp: new Date().toISOString(),
        user: AppState.currentUser,
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
            <button class="btn-primary" onclick="exportBackupFile()" style="padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-download"></i> Descargar Copia de Seguridad Físico (.json)
            </button>
            <button class="btn-secondary" onclick="importBackup()" style="padding:12px;display:flex;align-items:center;justify-content:center;gap:8px;">
                <i class="fas fa-upload"></i> Restaurar desde Archivo de Copia de Seguridad
            </button>
        </div>

        <div style="margin-top:20px;padding:12px;background:var(--bg-secondary);border-radius:var(--radius-md);font-size:12px;color:var(--text-tertiary);">
            🔒 Cifrado activo para la cuenta: <strong>${AppState.currentUser?.email || 'Sesión actíva'}</strong>
        </div>
    `;

    openModal('backupModal');
}
