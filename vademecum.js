/**
 * PSICO NOTES CLINICAL - VADEMÉCUM PSICOFARMACOLÓGICO CLÍNICO
 * Guía de consulta rápida de psicofármacos comunes y observaciones psicoterapéuticas.
 */

const Vademecum = {
    drugs: [
        {
            name: 'Sertralina',
            brand: 'Zoloft, Besitran, Aremis',
            category: 'ISRS (Inhibidor Selectivo de Recaptación de Serotina)',
            dose: '50 - 200 mg/día',
            indications: 'Trastorno Depresivo Mayor, TAG, Pánico, TOC, TEPT, Fobia Social.',
            sideEffects: 'Náuseas, insomnio inicial, cefalea, disfunción sexual, agitación leve.',
            therapistNotes: 'Suele tardar entre 2 y 4 semanas en mostrar efecto terapéutico pleno. Evaluar la adherencia si el paciente reporta aplanamiento afectivo.'
        },
        {
            name: 'Escitalopram',
            brand: 'Lexapro, Cipralex, Meridian',
            category: 'ISRS',
            dose: '10 - 20 mg/día',
            indications: 'Depresión Mayor, Trastorno de Ansiedad Generalizada, Pánico.',
            sideEffects: 'Somnolencia o insomnio, boca seca, sudoración, disfunción sexual.',
            therapistNotes: 'Muy utilizado por su alta selectividad y perfil de interacciones metabólicas favorable.'
        },
        {
            name: 'Fluoxetina',
            brand: 'Prozac, Luramon, Adofen',
            category: 'ISRS',
            dose: '20 - 60 mg/día',
            indications: 'Depresión, Bulimia Nerviosa, TOC.',
            sideEffects: 'Efecto estimulante inicial, disminución del apetito, insomnio, temblor.',
            therapistNotes: 'Vida media larga (metabolito activo norfluoxetina). Menor riesgo de síndrome de discontinuación abrupta.'
        },
        {
            name: 'Clonazepam',
            brand: 'Rivotril, Klonopin',
            category: 'Benzodiazepina (Ansiolítico / Anticonvulsivo)',
            dose: '0.5 - 4 mg/día (Dosis fraccionada)',
            indications: 'Crisis de angustia / Pánico, Ansiedad aguda, Agitación.',
            sideEffects: 'Somnolencia, sedación, ataxia, amnesia anterógrada, dependencia con uso prolongado.',
            therapistNotes: 'Útil en fases agudas de crisis, pero se debe coordinar con psiquiatría la pauta de deshabituación para evitar tolerancia y sesgos de evitación conductual.'
        },
        {
            name: 'Alprazolam',
            brand: 'Xanax, Tafil, Alplax',
            category: 'Benzodiazepina',
            dose: '0.25 - 3 mg/día',
            indications: 'Ansiedad generalizada aguda, Trastorno de pánico.',
            sideEffects: 'Sedación, mareo, fatiga, riesgo de rebote ansioso al decaer el pico en sangre.',
            therapistNotes: 'Inicio de acción muy rápido. Monitorizar si el paciente lo utiliza como conducta de seguridad ante cualquier atisbo de malestar.'
        },
        {
            name: 'Quetiapina',
            brand: 'Seroquel, Atarax',
            category: 'Antipsicótico Atípico',
            dose: '25 - 150 mg (Sedante/Ansiedad) | 300 - 800 mg (Bipolar/Psicosis)',
            indications: 'Esquizofrenia, Trastorno Bipolar, Coadyuvante en Depresión Resistente, Insomnio grave.',
            sideEffects: 'Sedación intensa, aumento de peso, boca seca, hipotensión ortostática.',
            therapistNotes: 'A dosis bajas (25-50 mg) se prescribe frecuentemente fuera de etiqueta como inductor del sueño o modulador de agitación.'
        },
        {
            name: 'Carbonato de Litio',
            brand: 'Plenur, Lithobid',
            category: 'Estabilizador del Ánimo / Eutimizante',
            dose: '600 - 1200 mg/día (Ajustado por litiemia 0.6 - 1.2 mEq/L)',
            indications: 'Trastorno Bipolar (Manía y Mantenimiento), Prevención de conducta suicida.',
            sideEffects: 'Temblor fino de manos, polidipsia, poliuria, aumento de peso, fotosensibilidad.',
            therapistNotes: 'Requiere controles analíticos de litiemia periódicos. Evaluar signos de toxicidad (mareos extremos, vómitos, ataxia) si el paciente se deshidrata.'
        },
        {
            name: 'Venlafaxina',
            brand: 'Dobupal, Vandral, Effexor',
            category: 'ISRN (Inhibidor de Recaptación de Serotonina y Noradrenalina)',
            dose: '75 - 225 mg/día',
            indications: 'Depresión Mayor con inhibición motora, TAG, Fobia Social.',
            sideEffects: 'Aumento de presión arterial a dosis altas, sudoración nocturna, síndrome de retirada intenso.',
            therapistNotes: 'No suspender bruscamente por mareos descritos como "chispazos eléctricos en la cabeza" (brain zaps).'
        }
    ],

    openVademecumModal() {
        let modal = document.getElementById('vademecumModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'vademecumModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('vademecumModal')"></div>
            <div class="modal-content modal-large" style="max-width: 800px;">
                <div class="modal-header">
                    <h2>💊 Vademécum Psicofarmacológico Clínico</h2>
                    <button class="btn-icon" onclick="closeModal('vademecumModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px 0;">
                    <div class="search-bar" style="margin-bottom:16px;">
                        <i class="fas fa-search"></i>
                        <input type="text" id="vademecumSearch" placeholder="Buscar por nombre de fármaco, familia o indicación..." oninput="Vademecum.filterDrugs(this.value)">
                    </div>

                    <div id="vademecumList" style="display:flex;flex-direction:column;gap:12px;max-height:480px;overflow-y:auto;padding-right:4px;">
                        ${this.renderDrugList(this.drugs)}
                    </div>
                </div>
            </div>
        `;

        openModal('vademecumModal');
    },

    filterDrugs(query) {
        const q = query.toLowerCase().trim();
        const filtered = this.drugs.filter(d => 
            d.name.toLowerCase().includes(q) || 
            d.brand.toLowerCase().includes(q) || 
            d.category.toLowerCase().includes(q) ||
            d.indications.toLowerCase().includes(q)
        );
        document.getElementById('vademecumList').innerHTML = this.renderDrugList(filtered);
    },

    renderDrugList(list) {
        if (list.length === 0) {
            return `<div class="empty-state"><div class="empty-icon">💊</div><p>No se encontraron psicofármacos coincidentes</p></div>`;
        }

        return list.map(d => `
            <div style="background:var(--bg-card);border:1px solid var(--border-primary);border-radius:var(--radius-md);padding:14px;box-shadow:var(--shadow-sm);">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">
                    <div>
                        <h3 style="margin:0;font-size:16px;color:var(--accent-primary);">${d.name} <span style="font-size:12px;color:var(--text-tertiary);font-weight:normal;">(${d.brand})</span></h3>
                        <span style="font-size:11px;background:var(--bg-secondary);padding:2px 8px;border-radius:12px;color:var(--text-secondary);font-weight:600;">${d.category}</span>
                    </div>
                    <span style="font-size:12px;font-weight:600;color:var(--text-secondary);background:var(--bg-code);padding:4px 8px;border-radius:6px;">Dosis: ${d.dose}</span>
                </div>
                <div style="font-size:12px;color:var(--text-secondary);margin-top:8px;line-height:1.5;">
                    <p style="margin:4px 0;"><strong>🎯 Indicaciones:</strong> ${d.indications}</p>
                    <p style="margin:4px 0;"><strong>⚠️ Efectos Secundarios:</strong> ${d.sideEffects}</p>
                    <p style="margin:4px 0;background:rgba(13,148,136,0.08);padding:8px;border-radius:6px;border-left:3px solid var(--accent-primary);color:var(--text-primary);">
                        <strong>🧠 Observaciones Psicoterapéuticas:</strong> ${d.therapistNotes}
                    </p>
                </div>
            </div>
        `).join('');
    }
};

window.Vademecum = Vademecum;
