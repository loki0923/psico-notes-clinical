/**
 * PSICO NOTES CLINICAL - MÓDULO PROTOCOLIZADO DE EXAMEN MENTAL (MSE)
 * Basado estrictamente en la Plantilla de 18 Funciones Mentales Psicológicas y Psiquiátricas
 */

const MentalExamModule = {
    currentPatientId: null,

    // Diccionario de opciones predeterminadas y estructura
    getInitialState(patient) {
        const cat = (typeof getPatientCategory === 'function') ? getPatientCategory(patient) : 'adult';
        const age = patient.birthdate && typeof calculateAge === 'function' ? calculateAge(patient.birthdate) : (patient.age || 25);
        const gender = (patient.gender || 'Femenino');

        // Si ya existen datos previos guardados en el paciente, cargarlos
        if (patient.mentalExam && patient.mentalExam.fields) {
            return JSON.parse(JSON.stringify(patient.mentalExam.fields));
        }

        return {
            // 1. Presentación
            sexo: gender,
            edad: age,
            edadAparenteCronologica: 'SI',
            biotipo: 'Mesomorfo',

            // 2. Aspecto y vestimenta
            aspectoVestimenta: ['Aseado', 'Arreglado', 'Vestido de acuerdo a la ocasión'],
            vestimentaEdadOcasion: 'SI',

            // 3. Actitud
            actitud: ['Colaboradora', 'Interesada'],

            // 4. Nivel de Conciencia
            concienciaAlterada: 'NO',
            concienciaCuantitativa: [],
            concienciaCualitativa: [],
            concienciaYo: [],
            concienciaYoPsiquico: [],

            // 5. Atención
            atencionAlterada: 'NO',
            atencionTipo: [],

            // 6. Orientación
            orientacionAutopsiquica: 'SI',
            orientacionAlopsiquica: 'SI',
            orientacionDesorientacion: [],

            // 7. Memoria
            memoriaConservada: 'SI',
            memoriaCualitativo: [],
            memoriaCuantitativo: [],

            // 8. Juicio Práctico
            juicioPractico: 'Conservado',

            // 9. Inteligencia
            inteligencia: 'Promedio',
            pruebasRealizadas: 'NO',
            pruebasCual: '',

            // 10. Pensamiento
            pensamientoVelocidad: 'Normal',
            pensamientoEstructura: ['Lógico y Coherente'],
            pensamientoDelirios: 'NO',
            pensamientoDeliriosLista: [],
            pensamientoOtros: [],

            // 11. Lenguaje
            lenguajeOrganico: [],
            lenguajePsicogeno: [],
            lenguajeNoVerbal: ['Adecuado / Mímica normal'],

            // 12. Afectividad
            afectoBase: 'Modulado / Eutímico',
            hipertimiaPresenta: 'NO',
            hipertimiaTipo: '',
            hipertimiaPolo: '',
            hipertimiaSentimientos: [],
            afectoOtrasAlteraciones: [],
            afectoCualitativo: [],

            // 13. Sensopercepción
            sensopercepcionCuantitativa: 'Conservada',
            ilusionesPresenta: 'NO',
            ilusionesTipo: [],
            alucinacionesPresenta: 'NO',
            alucinacionesTipo: [],
            pseudoalucinaciones: 'NO',

            // 14. Psicomotricidad
            psicomotricidadOrganico: [],
            psicomotricidadNoOrganico: [],

            // 15. Vida Instintiva
            vidaInstintivaAlterada: 'NO',
            vidaInstintivaLista: [],

            // 16. Volición
            volicion: 'Normobulia',

            // 17. Conciencia de Enfermedad
            concienciaEnfermedad: 'Presente',

            // 18. Juicio de Realidad
            juicioRealidad: 'Conservado'
        };
    },

    // Generador en tiempo real de la narrativa clínica protocolizada (según el orden del PDF pág. 8)
    generateNarrative(fields, patient) {
        const parts = [];

        // 1. Presentación
        let generoTxt = 'Paciente';
        if (fields.sexo === 'Femenino') generoTxt = 'Paciente femenina';
        else if (fields.sexo === 'Masculino') generoTxt = 'Paciente masculino';
        else generoTxt = `Paciente (${fields.sexo})`;

        let pres = `${generoTxt} de ${fields.edad || '—'} años de edad`;
        if (fields.edadAparenteCronologica === 'SI') {
            pres += ', edad aparente a edad cronológica';
        } else {
            pres += ', con edad aparente no acorde a su edad cronológica';
        }
        if (fields.biotipo) {
            pres += ` y biotipo ${fields.biotipo.toLowerCase()}`;
        }
        pres += '.';
        parts.push(pres);

        // 2. Aspecto
        let aspList = (fields.aspectoVestimenta || []).slice();
        let aspTxt = '';
        if (aspList.length > 0) {
            aspTxt = aspList.join(', ');
        } else {
            aspTxt = 'Presentación personal adecuada al contexto';
        }
        if (fields.vestimentaEdadOcasion === 'SI') {
            aspTxt += ', vestimenta de acuerdo a la edad y ocasión.';
        } else {
            aspTxt += ', vestimenta no acorde a la edad ni ocasión.';
        }
        parts.push(aspTxt);

        // 3. Actitud
        let actList = (fields.actitud || []).slice();
        if (actList.length > 0) {
            parts.push(`Actitud ${actList.join(', ').toLowerCase()}.`);
        } else {
            parts.push('Actitud colaboradora ante la evaluación.');
        }

        // 4. Nivel de Conciencia
        if (fields.concienciaAlterada === 'NO') {
            parts.push('Nivel de Conciencia Conservado (vigil y lúcido).');
        } else {
            const items = [
                ...(fields.concienciaCuantitativa || []),
                ...(fields.concienciaCualitativa || []),
                ...(fields.concienciaYo || []),
                ...(fields.concienciaYoPsiquico || [])
            ];
            parts.push(`Nivel de Conciencia alterado con presencia de ${items.join(', ') || 'somnolencia'}.`);
        }

        // 5. Atención
        if (fields.atencionAlterada === 'NO') {
            parts.push('Atención Conservada (normoprosexia).');
        } else {
            const atList = fields.atencionTipo && fields.atencionTipo.length > 0 ? fields.atencionTipo.join(', ') : 'alteraciones atencionales';
            parts.push(`Atención alterada (${atList}).`);
        }

        // 6. Orientación
        const orientParts = [];
        if (fields.orientacionAlopsiquica === 'SI' && fields.orientacionAutopsiquica === 'SI') {
            orientParts.push('Orientado Alopsíquica y Autopsíquicamente (tiempo, espacio y persona)');
        } else if (fields.orientacionAutopsiquica === 'SI') {
            orientParts.push('Orientado Autopsíquicamente y desorientado Alopsíquicamente');
        } else if (fields.orientacionAlopsiquica === 'SI') {
            orientParts.push('Orientado Alopsíquicamente y desorientado Autopsíquicamente');
        } else {
            orientParts.push('Desorientado globalmente en tiempo, espacio y persona');
        }
        if (fields.orientacionDesorientacion && fields.orientacionDesorientacion.length > 0) {
            orientParts.push(`con ${fields.orientacionDesorientacion.join(', ')}`);
        }
        parts.push(orientParts.join(' ') + '.');

        // 7. Memoria
        if (fields.memoriaConservada === 'SI') {
            parts.push('Memoria Conservada (fijación, evocación y conservación normales).');
        } else {
            const memItems = [
                ...(fields.memoriaCualitativo || []),
                ...(fields.memoriaCuantitativo || [])
            ];
            parts.push(`Memoria comprometida con presencia de ${memItems.join(', ') || 'amnesias'}.`);
        }

        // 8. Juicio Práctico
        parts.push(`Juicio Práctico ${fields.juicioPractico || 'Conservado'}.`);

        // 9. Inteligencia
        let intelTxt = `Inteligencia ${fields.inteligencia === 'Promedio' ? 'Normal / Promedio' : fields.inteligencia}.`;
        if (fields.pruebasRealizadas === 'SI') {
            intelTxt += ` Pruebas psicométricas aplicadas: ${fields.pruebasCual || 'Batería psicométrica estándar'}.`;
        }
        parts.push(intelTxt);

        // 10. Pensamiento
        const pensParts = [];
        if (fields.pensamientoVelocidad && fields.pensamientoVelocidad !== 'Normal') {
            pensParts.push(fields.pensamientoVelocidad);
        }
        if (fields.pensamientoEstructura && fields.pensamientoEstructura.length > 0) {
            pensParts.push(fields.pensamientoEstructura.join(', '));
        }
        if (fields.pensamientoDelirios === 'SI' && fields.pensamientoDeliriosLista && fields.pensamientoDeliriosLista.length > 0) {
            pensParts.push(`Ideas delirantes de tipo: ${fields.pensamientoDeliriosLista.join(', ')}`);
        }
        if (fields.pensamientoOtros && fields.pensamientoOtros.length > 0) {
            pensParts.push(fields.pensamientoOtros.join(', '));
        }
        if (pensParts.length === 0) {
            parts.push('Pensamiento de curso lógico, coherente y velocidad conservada, sin ideas delirantes ni obsesivas.');
        } else {
            parts.push(`Pensamiento: ${pensParts.join('. ')}.`);
        }

        // 11. Lenguaje
        const lengParts = [];
        if (fields.lenguajeOrganico && fields.lenguajeOrganico.length > 0) {
            lengParts.push(`Trastornos orgánicos: ${fields.lenguajeOrganico.join(', ')}`);
        }
        if (fields.lenguajePsicogeno && fields.lenguajePsicogeno.length > 0) {
            lengParts.push(fields.lenguajePsicogeno.join(', '));
        }
        if (fields.lenguajeNoVerbal && fields.lenguajeNoVerbal.length > 0 && !fields.lenguajeNoVerbal.includes('Adecuado / Mímica normal')) {
            lengParts.push(`Mímica: ${fields.lenguajeNoVerbal.join(', ')}`);
        }
        if (lengParts.length === 0) {
            parts.push('Lenguaje fluido, articulado y comprensible, con adecuada entonación y mímica congruente.');
        } else {
            parts.push(`Lenguaje: ${lengParts.join('. ')}.`);
        }

        // 12. Afectividad
        const afectParts = [];
        if (fields.hipertimiaPresenta === 'SI') {
            let hip = fields.hipertimiaTipo || 'Hipertimia';
            if (fields.hipertimiaPolo) {
                const pClean = fields.hipertimiaPolo.replace(/^de la /i, '').replace(/^del /i, '').replace(/^de /i, '');
                hip += ` Orientada al Polo de la ${pClean}`;
            }
            if (fields.hipertimiaSentimientos && fields.hipertimiaSentimientos.length > 0) {
                hip += ` con Sentimientos de ${fields.hipertimiaSentimientos.join(', ')}`;
            }
            afectParts.push(hip);
        } else if (fields.afectoBase) {
            afectParts.push(fields.afectoBase);
        }
        if (fields.afectoOtrasAlteraciones && fields.afectoOtrasAlteraciones.length > 0) {
            afectParts.push(fields.afectoOtrasAlteraciones.join(', '));
        }
        if (fields.afectoCualitativo && fields.afectoCualitativo.length > 0) {
            afectParts.push(fields.afectoCualitativo.join(', '));
        }
        parts.push(`Afectividad: ${afectParts.join(', ')}.`);

        // 13. Sensopercepción
        const sensParts = [];
        if (fields.sensopercepcionCuantitativa && fields.sensopercepcionCuantitativa !== 'Conservada') {
            sensParts.push(fields.sensopercepcionCuantitativa);
        }
        if (fields.ilusionesPresenta === 'SI' && fields.ilusionesTipo && fields.ilusionesTipo.length > 0) {
            sensParts.push(`Ilusiones: ${fields.ilusionesTipo.join(', ')}`);
        }
        if (fields.alucinacionesPresenta === 'SI' && fields.alucinacionesTipo && fields.alucinacionesTipo.length > 0) {
            sensParts.push(`Alucinaciones: ${fields.alucinacionesTipo.join(', ')}`);
        }
        if (fields.pseudoalucinaciones === 'SI') {
            sensParts.push('Pseudoalucinaciones');
        }
        if (sensParts.length === 0) {
            parts.push('Sensopercepción conservada, sin alteraciones sensoriales ni fenómenos alucinatorios.');
        } else {
            parts.push(`Sensopercepción: ${sensParts.join('. ')}.`);
        }

        // 14. Psicomotricidad
        const psicoParts = [];
        if (fields.psicomotricidadOrganico && fields.psicomotricidadOrganico.length > 0) {
            psicoParts.push(fields.psicomotricidadOrganico.join(', '));
        }
        if (fields.psicomotricidadNoOrganico && fields.psicomotricidadNoOrganico.length > 0) {
            psicoParts.push(fields.psicomotricidadNoOrganico.join(', '));
        }
        if (psicoParts.length === 0) {
            parts.push('Psicomotricidad adecuada, marcha y postura estables sin tics, temblores ni estereotipias.');
        } else {
            parts.push(`Psicomotricidad: ${psicoParts.join(', ')}.`);
        }

        // 15. Vida Instintiva
        if (fields.vidaInstintivaAlterada === 'NO' || !fields.vidaInstintivaLista || fields.vidaInstintivaLista.length === 0) {
            parts.push('Vida Instintiva conservada (patrones de sueño, alimentación y conducta preservados).');
        } else {
            parts.push(`Vida Instintiva: ${fields.vidaInstintivaLista.join(', ')}.`);
        }

        // 16. Volición
        parts.push(`Volición: ${fields.volicion || 'Normobulia'}.`);

        // 17. Conciencia de Enfermedad
        parts.push(`Conciencia de Enfermedad ${fields.concienciaEnfermedad || 'Presente'}.`);

        // 18. Juicio de Realidad
        parts.push(`Juicio de Realidad ${fields.juicioRealidad || 'Conservado'}.`);

        return parts.join(' ');
    },

    // Render de la pestaña Examen Mental en el Expediente Clínico
    renderTab(patient) {
        this.currentPatientId = patient.id;
        const state = this.getInitialState(patient);
        const narrative = patient.mentalExam?.text || this.generateNarrative(state, patient);
        const words = narrative ? narrative.trim().split(/\s+/).filter(Boolean).length : 0;
        const chars = narrative ? narrative.length : 0;

        return `
            <div class="mental-exam-wrapper">
                <!-- CABECERA DEL MÓDULO -->
                <div class="mental-exam-hero">
                    <div class="me-hero-title">
                        <div class="me-icon-badge"><i class="fas fa-brain"></i></div>
                        <div>
                            <div class="me-title-row">
                                <h3 style="margin:0;font-size:17.5px;font-weight:700;color:var(--text-primary);letter-spacing:-0.2px;">Plantilla de Examen Mental Clínico</h3>
                                <span class="me-protocol-pill"><i class="fas fa-stethoscope"></i> 18 Funciones Semiológicas</span>
                            </div>
                            <p style="margin:3px 0 0;font-size:12.5px;color:var(--text-secondary);line-height:1.4;">
                                Evaluación semiológica protocolizada. Selección interactiva con síntesis diagnóstica en vivo.
                            </p>
                        </div>
                    </div>
                    <div class="me-hero-actions">
                        <button type="button" class="btn-secondary btn-sm me-action-btn" onclick="MentalExamModule.setNormalPreset('${patient.id}')" title="Marcar examen mental conservado / normotípico">
                            <i class="fas fa-check-double" style="color:var(--accent-primary);"></i> Cargar Valores Conservados
                        </button>
                        <button type="button" class="btn-secondary btn-sm me-action-btn" onclick="MentalExamModule.copyNarrative()" title="Copiar informe al portapapeles">
                            <i class="fas fa-copy"></i> Copiar Texto
                        </button>
                        <button type="button" class="btn-secondary btn-sm me-action-btn" onclick="MentalExamModule.exportPDF('${patient.id}')" title="Imprimir / Exportar Examen Mental">
                            <i class="fas fa-file-pdf" style="color:#ef4444;"></i> Imprimir PDF
                        </button>
                        <button type="button" class="btn-primary btn-sm me-action-btn-primary" onclick="MentalExamModule.saveExam('${patient.id}')" title="Guardar cambios en el expediente">
                            <i class="fas fa-save"></i> Guardar Examen
                        </button>
                    </div>
                </div>

                <!-- BARRA DE FILTRO POR DOMINIOS CLÍNICOS -->
                <div class="me-category-bar">
                    <button type="button" class="me-cat-pill active" onclick="MentalExamModule.filterGroup('all', this)"><i class="fas fa-layer-group"></i> Todas (18)</button>
                    <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('1', this)"><i class="fas fa-user-check"></i> I. Aspecto & Actitud (1-3)</button>
                    <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('2', this)"><i class="fas fa-brain"></i> II. Cognición (4-9)</button>
                    <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('3', this)"><i class="fas fa-comments"></i> III. Pensamiento (10-11)</button>
                    <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('4', this)"><i class="fas fa-heart-pulse"></i> IV. Afecto & Percepción (12-13)</button>
                    <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('5', this)"><i class="fas fa-shield-halved"></i> V. Juicio & Volición (14-18)</button>
                </div>

                <!-- CUADRÍCULA PRINCIPAL: FORMULARIO INTERACTIVO + VISOR NARRATIVO -->
                <div class="mental-exam-grid">
                    <!-- PANEL IZQUIERDO: LAS 18 FUNCIONES MENTALES -->
                    <div class="mental-exam-form-pane">
                        <form id="mentalExamForm" onsubmit="event.preventDefault();">
                            ${this.renderFormSections(state)}
                        </form>
                    </div>

                    <!-- PANEL DERECHO: NARRATIVA INTEGRADA EN TIEMPO REAL -->
                    <div class="mental-exam-output-pane">
                        <div class="me-output-card">
                            <div class="me-output-header">
                                <div class="me-output-title">
                                    <div class="me-output-icon-box"><i class="fas fa-file-signature"></i></div>
                                    <div>
                                        <div style="font-size:13.5px;font-weight:700;color:var(--text-primary);letter-spacing:-0.2px;">Síntesis Semiológica (18 Funciones Mentales)</div>
                                        <div style="font-size:11px;color:var(--text-tertiary);">Documento clínico ordenado según semiología médica</div>
                                    </div>
                                </div>
                                <span class="me-live-indicator"><span class="me-live-dot"></span> En Vivo</span>
                            </div>
                            <div class="me-output-toolbar">
                                <div class="me-tool-group">
                                    <button type="button" class="btn-tool-pill btn-xs" onclick="MentalExamModule.formatText('bold')" title="Negrita"><b>B</b></button>
                                    <button type="button" class="btn-tool-pill btn-xs" onclick="MentalExamModule.formatText('italic')" title="Cursiva"><i>I</i></button>
                                    <button type="button" class="btn-tool-pill btn-xs" onclick="MentalExamModule.resetToGenerated()" title="Regenerar desde la plantilla"><i class="fas fa-rotate-right"></i> Regenerar</button>
                                </div>
                                <button type="button" class="btn-tool-pill btn-xs me-btn-soap" onclick="MentalExamModule.insertIntoSessionNote('${patient.id}')" title="Traspasar a reporte de atención"><i class="fas fa-file-medical"></i> Insertar en Nota</button>
                            </div>
                            <div class="me-textarea-container">
                                <textarea id="mentalExamOutputText" rows="18" class="me-output-textarea" oninput="MentalExamModule.updateWordCount(this.value)" placeholder="Aquí se genera de forma ordenada la redacción clínica del examen mental...">${narrative}</textarea>
                            </div>
                            <div class="me-output-footer">
                                <div class="me-meta-stat" id="me_word_count">
                                    <i class="fas fa-chart-simple"></i> ${words} palabras · ${chars} caracteres
                                </div>
                                <div class="me-footer-actions">
                                    <button type="button" class="me-pill-btn" onclick="MentalExamModule.copyNarrative()" title="Copiar texto"><i class="fas fa-copy"></i> Copiar</button>
                                    <button type="button" class="me-pill-btn me-pill-primary" onclick="MentalExamModule.saveExam('${patient.id}')" title="Guardar"><i class="fas fa-save"></i> Guardar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // Render de cada una de las 18 secciones
    renderFormSections(s) {
        return `
            <!-- 1. PRESENTACIÓN -->
            <div class="me-card" data-group="1">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">1</span> Presentación General</div>
                    <span class="me-card-tag">General</span>
                </div>
                <div class="me-card-body">
                    <div class="me-field-grid-2">
                        <div class="me-field-block">
                            <label class="me-field-label">Sexo:</label>
                            <div class="me-chips-group" data-field="sexo" data-type="single">
                                ${['Femenino', 'Masculino', 'No Binario', 'Otro'].map(opt => `<span class="me-chip ${s.sexo === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'sexo', '${opt}')">${opt}</span>`).join('')}
                            </div>
                        </div>
                        <div class="me-field-block">
                            <label class="me-field-label">Edad Cronológica:</label>
                            <div class="me-input-suffix-group">
                                <input type="number" id="me_edad" value="${s.edad}" min="0" max="120" class="me-inline-input" oninput="MentalExamModule.onFieldChange('edad', this.value)">
                                <span class="me-suffix">años</span>
                            </div>
                        </div>
                    </div>
                    <div class="me-field-grid-2" style="margin-top:12px;">
                        <div class="me-field-block">
                            <label class="me-field-label">¿Edad aparente a edad cronológica?:</label>
                            <div class="me-chips-group me-segmented" data-field="edadAparenteCronologica" data-type="single">
                                <span class="me-chip ${s.edadAparenteCronologica === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'edadAparenteCronologica', 'SI')">SÍ</span>
                                <span class="me-chip ${s.edadAparenteCronologica === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'edadAparenteCronologica', 'NO')">NO</span>
                            </div>
                        </div>
                        <div class="me-field-block">
                            <label class="me-field-label">Biotipo Morfológico:</label>
                            <div class="me-chips-group" data-field="biotipo" data-type="single">
                                ${['Leptosómico', 'Mesomorfo', 'Endomorfo'].map(opt => `<span class="me-chip ${s.biotipo === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'biotipo', '${opt}')">${opt}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. ASPECTO Y VESTIMENTA -->
            <div class="me-card" data-group="1">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">2</span> Aspecto y Vestimenta</div>
                    <span class="me-card-tag">General</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">Aspecto General (Selección múltiple):</label>
                    <div class="me-chips-group" data-field="aspectoVestimenta" data-type="multiple">
                        ${['Aseado', 'Arreglado', 'Descuidada', 'Desarreglada', 'Extravagante', 'Vestido de acuerdo a la ocasión'].map(opt => `<span class="me-chip ${(s.aspectoVestimenta || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'aspectoVestimenta', '${opt}')">${opt}</span>`).join('')}
                    </div>
                    <div style="margin-top:12px;">
                        <label class="me-field-label">Vestimenta de Acuerdo a la Edad y Ocasión:</label>
                        <div class="me-chips-group me-segmented" data-field="vestimentaEdadOcasion" data-type="single">
                            <span class="me-chip ${s.vestimentaEdadOcasion === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'vestimentaEdadOcasion', 'SI')">SÍ</span>
                            <span class="me-chip ${s.vestimentaEdadOcasion === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'vestimentaEdadOcasion', 'NO')">NO</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 3. ACTITUD -->
            <div class="me-card" data-group="1">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">3</span> Actitud hacia la Entrevista y el Evaluador</div>
                    <span class="me-card-tag">General</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">Rasgos observados durante el encuentro:</label>
                    <div class="me-chips-group" data-field="actitud" data-type="multiple">
                        ${['Amable', 'Suspicaz', 'Colaboradora', 'Interesada', 'Cansada', 'Altiva', 'De gran confianza', 'Demandante', 'Distante', 'De extrañeza', 'Hostil', 'Inhibida', 'Intrusiva', 'Pasivo agresiva', 'Pueril', 'Quejumbrosa'].map(opt => `<span class="me-chip ${(s.actitud || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'actitud', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 4. NIVEL DE CONCIENCIA -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">4</span> Nivel de Conciencia</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="concienciaAlterada" data-type="single">
                            <span class="me-chip ${s.concienciaAlterada === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'concienciaAlterada', 'NO')">NO (Conservado)</span>
                            <span class="me-chip ${s.concienciaAlterada === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'concienciaAlterada', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_conciencia_details" class="me-alert-subpanel" style="display:${s.concienciaAlterada === 'SI' ? 'block' : 'none'};">
                        <div class="me-subpanel-title"><i class="fas fa-triangle-exclamation"></i> Alteraciones Específicas de Conciencia:</div>
                        <label class="me-field-label">Cuantitativo:</label>
                        <div class="me-chips-group" data-field="concienciaCuantitativa" data-type="multiple">
                            ${['Hiperalerta', 'Confusión/Obnubilación', 'Embotamiento', 'Somnolencia', 'Sopor', 'Precoma', 'Coma'].map(opt => `<span class="me-chip ${(s.concienciaCuantitativa || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'concienciaCuantitativa', '${opt}')">${opt}</span>`).join('')}
                        </div>
                        <label class="me-field-label" style="margin-top:10px;">Cualitativo:</label>
                        <div class="me-chips-group" data-field="concienciaCualitativa" data-type="multiple">
                            ${['Estado Delirioso', 'Estado Crepuscular'].map(opt => `<span class="me-chip ${(s.concienciaCualitativa || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'concienciaCualitativa', '${opt}')">${opt}</span>`).join('')}
                        </div>
                        <label class="me-field-label" style="margin-top:10px;">Conciencia del Yo Corporal y Psíquico:</label>
                        <div class="me-chips-group" data-field="concienciaYo" data-type="multiple">
                            ${['Asomatognosia', 'Anosognosia', 'Despersonalización', 'Desrealización'].map(opt => `<span class="me-chip ${(s.concienciaYo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'concienciaYo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 5. ATENCIÓN -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">5</span> Atención (Prosexia)</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="atencionAlterada" data-type="single">
                            <span class="me-chip ${s.atencionAlterada === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'atencionAlterada', 'NO')">NO (Euprosexia / Conservada)</span>
                            <span class="me-chip ${s.atencionAlterada === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'atencionAlterada', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_atencion_details" class="me-alert-subpanel" style="display:${s.atencionAlterada === 'SI' ? 'block' : 'none'};">
                        <label class="me-field-label">Tipo de Alteración Atencional:</label>
                        <div class="me-chips-group" data-field="atencionTipo" data-type="multiple">
                            ${['Aproxesia', 'Hipoprosexia', 'Hiperprosexia', 'Disprosexia'].map(opt => `<span class="me-chip ${(s.atencionTipo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'atencionTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6. ORIENTACIÓN -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">6</span> Orientación (Autopsíquica y Alopsíquica)</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-field-grid-2">
                        <div class="me-field-block">
                            <label class="me-field-label">Orientado Autopsíquicamente (Persona):</label>
                            <div class="me-chips-group me-segmented" data-field="orientacionAutopsiquica" data-type="single">
                                <span class="me-chip ${s.orientacionAutopsiquica === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'orientacionAutopsiquica', 'SI')">SÍ</span>
                                <span class="me-chip ${s.orientacionAutopsiquica === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'orientacionAutopsiquica', 'NO')">NO</span>
                            </div>
                        </div>
                        <div class="me-field-block">
                            <label class="me-field-label">Orientado Alopsíquicamente (Tiempo/Espacio):</label>
                            <div class="me-chips-group me-segmented" data-field="orientacionAlopsiquica" data-type="single">
                                <span class="me-chip ${s.orientacionAlopsiquica === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'orientacionAlopsiquica', 'SI')">SÍ</span>
                                <span class="me-chip ${s.orientacionAlopsiquica === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'orientacionAlopsiquica', 'NO')">NO</span>
                            </div>
                        </div>
                    </div>
                    <div style="margin-top:12px;">
                        <label class="me-field-label">Desorientaciones específicas observadas:</label>
                        <div class="me-chips-group" data-field="orientacionDesorientacion" data-type="multiple">
                            ${['Desorientación Parcial', 'Desorientación Temporal', 'Desorientación Espacial'].map(opt => `<span class="me-chip ${(s.orientacionDesorientacion || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'orientacionDesorientacion', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 7. MEMORIA -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">7</span> Memoria (Fijación, Evocación y Reconocimiento)</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Memoria conservada?:</label>
                        <div class="me-chips-group me-segmented" data-field="memoriaConservada" data-type="single">
                            <span class="me-chip ${s.memoriaConservada === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'memoriaConservada', 'SI')">SÍ (Conservada)</span>
                            <span class="me-chip ${s.memoriaConservada === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'memoriaConservada', 'NO')">NO (Alteraciones)</span>
                        </div>
                    </div>
                    <div id="me_memoria_details" class="me-alert-subpanel" style="display:${s.memoriaConservada === 'NO' ? 'block' : 'none'};">
                        <label class="me-field-label">Cualitativo (Amnesias):</label>
                        <div class="me-chips-group" data-field="memoriaCualitativo" data-type="multiple">
                            ${['Amnesia Anterógrada o de Fijación', 'Amnesia de Conservación', 'Amnesia Retrógrada o de Evocación', 'Amnesia Disociativa', 'Amnesia Diferenciada', 'Amnesia Global', 'Hipomnesia', 'Hipermnesia', 'Dismnesia'].map(opt => `<span class="me-chip ${(s.memoriaCualitativo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'memoriaCualitativo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                        <label class="me-field-label" style="margin-top:10px;">Cuantitativo / Paramnesias:</label>
                        <div class="me-chips-group" data-field="memoriaCuantitativo" data-type="multiple">
                            ${['Paramnesia', 'Pseudología/Mitomanía', 'Fabulación', 'Cofabulación', 'Falso Reconocimiento', 'Criptomnesia', 'Déjà Vu', 'Paramnesia Reduplicativa'].map(opt => `<span class="me-chip ${(s.memoriaCuantitativo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'memoriaCuantitativo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 8. JUICIO PRÁCTICO -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">8</span> Juicio Práctico</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-chips-group" data-field="juicioPractico" data-type="single">
                        ${['Conservado', 'Parcial', 'Desviado'].map(opt => `<span class="me-chip ${s.juicioPractico === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'juicioPractico', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 9. INTELIGENCIA -->
            <div class="me-card" data-group="2">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">9</span> Capacidad Intelectual Estimada</div>
                    <span class="me-card-tag">Cognición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-chips-group" data-field="inteligencia" data-type="single">
                        ${['Inferior al promedio', 'Promedio', 'Superior al promedio'].map(opt => `<span class="me-chip ${s.inteligencia === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'inteligencia', '${opt}')">${opt}</span>`).join('')}
                    </div>
                    <div class="me-field-row" style="margin-top:12px;align-items:center;">
                        <label class="me-field-label" style="margin:0;">¿Se realizaron pruebas psicométricas?:</label>
                        <div class="me-chips-group me-segmented" data-field="pruebasRealizadas" data-type="single">
                            <span class="me-chip ${s.pruebasRealizadas === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pruebasRealizadas', 'SI')">SÍ</span>
                            <span class="me-chip ${s.pruebasRealizadas === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pruebasRealizadas', 'NO')">NO</span>
                        </div>
                        <div id="me_pruebas_box" style="display:${s.pruebasRealizadas === 'SI' ? 'inline-block' : 'none'};flex:1;min-width:180px;">
                            <input type="text" id="me_pruebas_cual" class="me-clean-input" placeholder="¿Qué pruebas? Ej: Raven, WAIS..." value="${s.pruebasCual || ''}" oninput="MentalExamModule.onFieldChange('pruebasCual', this.value)">
                        </div>
                    </div>
                </div>
            </div>

            <!-- 10. PENSAMIENTO -->
            <div class="me-card" data-group="3">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">10</span> Pensamiento (Velocidad, Estructura y Contenido)</div>
                    <span class="me-card-tag">Pensamiento</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">A. Velocidad:</label>
                    <div class="me-chips-group" data-field="pensamientoVelocidad" data-type="single">
                        ${['Normal', 'Taquipsiquia', 'Pensamiento Ideofugal', 'Fuga de Ideas', 'Bradipsiquia', 'Inhibición del Pensamiento'].map(opt => `<span class="me-chip ${s.pensamientoVelocidad === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pensamientoVelocidad', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">B. Estructura o Curso:</label>
                    <div class="me-chips-group" data-field="pensamientoEstructura" data-type="multiple">
                        ${['Lógico y Coherente', 'Pensamiento Circunstancial', 'Pensamiento Tangencial', 'Pensamiento Escamoteador', 'Pararrespuesta o Parafasia', 'Pensamiento Concreto', 'Pensamiento Perseverativo', 'Pensamiento Restringido', 'Pensamiento Pueril', 'Neologismo', 'Onomatopoyesis', 'Bloqueos', 'Pensamiento Disgregado', 'Pensamiento Laxo', 'Jergafasia', 'Pensamiento Incoherente'].map(opt => `<span class="me-chip ${(s.pensamientoEstructura || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'pensamientoEstructura', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">C. Contenido — ¿Presenta Ideas Delirantes?:</label>
                        <div class="me-chips-group me-segmented" data-field="pensamientoDelirios" data-type="single">
                            <span class="me-chip ${s.pensamientoDelirios === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pensamientoDelirios', 'NO')">NO</span>
                            <span class="me-chip ${s.pensamientoDelirios === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pensamientoDelirios', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_delirios_details" class="me-alert-subpanel" style="display:${s.pensamientoDelirios === 'SI' ? 'block' : 'none'};">
                        <div class="me-subpanel-title"><i class="fas fa-triangle-exclamation"></i> Tipos de Delirio:</div>
                        <div class="me-chips-group" data-field="pensamientoDeliriosLista" data-type="multiple">
                            ${['Delirio de Culpa', 'Delirio Hipocondríaco', 'Delirio Nihilista', 'Delirio de Ruina', 'Delirio de Filiación', 'Delirio de Grandeza o Megalomanía', 'Delirio Místico o Religioso', 'Delirio de Preñez', 'Delirio de Transformación o Metamorfosis', 'Delirio de Escisión o Fragmentación', 'Delirio de Control o de Influencia', 'Delirio de Referencia', 'Delirio de Celos', 'Delirio Erotomaníaco', 'Delirio de Persecución'].map(opt => `<span class="me-chip ${(s.pensamientoDeliriosLista || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'pensamientoDeliriosLista', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">Otros contenidos patológicos:</label>
                    <div class="me-chips-group" data-field="pensamientoOtros" data-type="multiple">
                        ${['Pensamientos Obsesivos', 'Temores Obsesivos o Fobias', 'Ideas Fijas', 'Pseudo-Obsesiones'].map(opt => `<span class="me-chip ${(s.pensamientoOtros || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'pensamientoOtros', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 11. LENGUAJE -->
            <div class="me-card" data-group="3">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">11</span> Lenguaje (Verbal y No Verbal)</div>
                    <span class="me-card-tag">Lenguaje</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">A. Trastornos Orgánicos del Lenguaje Oral:</label>
                    <div class="me-chips-group" data-field="lenguajeOrganico" data-type="multiple">
                        ${['Disartria', 'Dislalia', 'Afasia de Broca', 'Afasia de Wernicke', 'Afasia Global', 'Afasia Anómica', 'Afasia Conductiva', 'Afasia Acústico-Amnésica', 'Afasia Motora Transcortical', 'Afasia Sensitiva Transcortical', 'Afasia Transcortical Mixta'].map(opt => `<span class="me-chip ${(s.lenguajeOrganico || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'lenguajeOrganico', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">B. Trastornos Psicógenos del Lenguaje Oral:</label>
                    <div class="me-chips-group" data-field="lenguajePsicogeno" data-type="multiple">
                        ${['Disfemia', 'Disfonías', 'Taquilalia', 'Bradilalia', 'Mutismo', 'Musitaciones', 'Monólogos o Soliloquio', 'Neologismos', 'Jergafasia', 'Ecolalia'].map(opt => `<span class="me-chip ${(s.lenguajePsicogeno || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'lenguajePsicogeno', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">C. Lenguaje No Verbal / Mímico:</label>
                    <div class="me-chips-group" data-field="lenguajeNoVerbal" data-type="multiple">
                        ${['Adecuado / Mímica normal', 'Hipermimia', 'Hipomimia', 'Amimia', 'Paramimias'].map(opt => `<span class="me-chip ${(s.lenguajeNoVerbal || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'lenguajeNoVerbal', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 12. AFECTIVIDAD -->
            <div class="me-card" data-group="4">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">12</span> Afectividad</div>
                    <span class="me-card-tag">Afecto</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">Afecto basal:</label>
                    <div class="me-chips-group" data-field="afectoBase" data-type="single">
                        ${['Modulado / Eutímico', 'Furor Maníaco', 'Beatitud', 'Éxtasis', 'Hipotimia', 'Atimia'].map(opt => `<span class="me-chip ${s.afectoBase === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'afectoBase', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">¿Presenta Hipertimia / Alteración Cuantitativa?:</label>
                        <div class="me-chips-group me-segmented" data-field="hipertimiaPresenta" data-type="single">
                            <span class="me-chip ${s.hipertimiaPresenta === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.hipertimiaPresenta === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPresenta', 'SI')">SÍ</span>
                        </div>
                    </div>

                    <div id="me_afecto_details" class="me-alert-subpanel" style="display:${s.hipertimiaPresenta === 'SI' ? 'block' : 'none'};">
                        <label class="me-field-label">Tipo de Hipertimia:</label>
                        <div class="me-chips-group" data-field="hipertimiaTipo" data-type="single">
                            ${['Hipertimia Placentera', 'Hipertimia Displacentera', 'Hipertimia Mixta Agitada', 'Hipertimia con Fuga de Ideas'].map(opt => `<span class="me-chip ${s.hipertimiaTipo === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>

                        <label class="me-field-label" style="margin-top:10px;">Orientada al Polo:</label>
                        <div class="me-chips-group" data-field="hipertimiaPolo" data-type="single">
                            ${['De la Tristeza', 'De la Alegría', 'De la Ira', 'Miedo', 'Pesimismo'].map(opt => `<span class="me-chip ${s.hipertimiaPolo === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPolo', '${opt}')">${opt}</span>`).join('')}
                        </div>

                        <label class="me-field-label" style="margin-top:10px;">Con Sentimientos de:</label>
                        <div class="me-chips-group" data-field="hipertimiaSentimientos" data-type="multiple">
                            ${['Sobrevaloración', 'Minusvalía', 'Culpa', 'Ruina', 'Desamparo', 'Desesperación', 'Hostilidad', 'Suspicacia'].map(opt => `<span class="me-chip ${(s.hipertimiaSentimientos || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'hipertimiaSentimientos', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">Alteraciones Cualitativas del Afecto:</label>
                    <div class="me-chips-group" data-field="afectoCualitativo" data-type="multiple">
                        ${['Tenacidad Afectiva', 'Rigidez Afectiva', 'Labilidad Afectiva', 'Incontinencia Afectiva', 'Ambivalencia', 'Anhedonia', 'Embotamiento o Aplanamiento Afectivo', 'Paratimia', 'Neotimias', 'Alexitimia'].map(opt => `<span class="me-chip ${(s.afectoCualitativo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'afectoCualitativo', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 13. SENSOPERCEPCIÓN -->
            <div class="me-card" data-group="4">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">13</span> Sensopercepción</div>
                    <span class="me-card-tag">Percepción</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">Cuantitativo:</label>
                    <div class="me-chips-group" data-field="sensopercepcionCuantitativa" data-type="single">
                        ${['Conservada', 'Aceleración de la Percepción', 'Retardo de la Percepción', 'Abolición de la Percepción'].map(opt => `<span class="me-chip ${s.sensopercepcionCuantitativa === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'sensopercepcionCuantitativa', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">¿Presenta Ilusiones?:</label>
                        <div class="me-chips-group me-segmented" data-field="ilusionesPresenta" data-type="single">
                            <span class="me-chip ${s.ilusionesPresenta === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'ilusionesPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.ilusionesPresenta === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'ilusionesPresenta', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_ilusiones_box" class="me-alert-subpanel" style="display:${s.ilusionesPresenta === 'SI' ? 'block' : 'none'};">
                        <label class="me-field-label">Tipos de Ilusión:</label>
                        <div class="me-chips-group" data-field="ilusionesTipo" data-type="multiple">
                            ${['Ilusiones por Inatención', 'Ilusiones Catatímicas', 'Ilusiones Oníricas'].map(opt => `<span class="me-chip ${(s.ilusionesTipo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'ilusionesTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">¿Presenta Alucinaciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="alucinacionesPresenta" data-type="single">
                            <span class="me-chip ${s.alucinacionesPresenta === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'alucinacionesPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.alucinacionesPresenta === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'alucinacionesPresenta', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_alucinaciones_box" class="me-alert-subpanel" style="display:${s.alucinacionesPresenta === 'SI' ? 'block' : 'none'};">
                        <div class="me-subpanel-title"><i class="fas fa-triangle-exclamation"></i> Tipos de Alucinación:</div>
                        <div class="me-chips-group" data-field="alucinacionesTipo" data-type="multiple">
                            ${['Alucinaciones Auditivas', 'Alucinaciones Visuales', 'Alucinaciones Olfativas y Gustativas', 'Alucinaciones Táctiles (Hápticas)', 'Alucinaciones Cenestésicas', 'Alucinaciones Cinéticas', 'Alucinaciones Catatímicas', 'Alucinaciones Hipnagógicas e Hipnopómpicas', 'Alucinaciones Funcionales', 'Alucinaciones Extracampinas', 'Alucinosis'].map(opt => `<span class="me-chip ${(s.alucinacionesTipo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'alucinacionesTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                        <div class="me-toggle-row" style="margin-top:10px;">
                            <label class="me-field-label" style="margin:0;">Pseudoalucinaciones:</label>
                            <div class="me-chips-group me-segmented" data-field="pseudoalucinaciones" data-type="single">
                                <span class="me-chip ${s.pseudoalucinaciones === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pseudoalucinaciones', 'NO')">NO</span>
                                <span class="me-chip ${s.pseudoalucinaciones === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'pseudoalucinaciones', 'SI')">SÍ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 14. PSICOMOTRICIDAD -->
            <div class="me-card" data-group="5">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">14</span> Psicomotricidad</div>
                    <span class="me-card-tag">Conducta</span>
                </div>
                <div class="me-card-body">
                    <label class="me-field-label">A. Trastornos Orgánicos:</label>
                    <div class="me-chips-group" data-field="psicomotricidadOrganico" data-type="multiple">
                        ${['Facies', 'Sincinesia', 'Temblor', 'Hemibalismo', 'Espasmos', 'Corea', 'Atetosis', 'Mioclonías', 'Distonía', 'Rigidez', 'Discinesia Paroxística', 'Acatisia', 'Acinesia', 'Incoordinación Motora', 'Cataplexia y Parálisis del Sueño', 'Apraxia Ideacional', 'Dispraxia Ideacional'].map(opt => `<span class="me-chip ${(s.psicomotricidadOrganico || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'psicomotricidadOrganico', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">B. No Orgánico / Psicológico:</label>
                    <div class="me-chips-group" data-field="psicomotricidadNoOrganico" data-type="multiple">
                        ${['Catatonia', 'Catalepsia', 'Inmovilidad Apática', 'Inhibición Psicomotora', 'Negativismo', 'Hiperquinesia', 'Excitación Psicomotora o Raptus', 'Furor Catatónico', 'Manierismos', 'Estereotipias', 'Tics', 'Acto Impulsivo', 'Compulsiones'].map(opt => `<span class="me-chip ${(s.psicomotricidadNoOrganico || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'psicomotricidadNoOrganico', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 15. VIDA INSTINTIVA -->
            <div class="me-card" data-group="5">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">15</span> Vida Instintiva (Sueño, Apetito y Conducta)</div>
                    <span class="me-card-tag">Instinto</span>
                </div>
                <div class="me-card-body">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="vidaInstintivaAlterada" data-type="single">
                            <span class="me-chip ${s.vidaInstintivaAlterada === 'NO' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'vidaInstintivaAlterada', 'NO')">NO (Conservada)</span>
                            <span class="me-chip ${s.vidaInstintivaAlterada === 'SI' ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'vidaInstintivaAlterada', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_instintiva_box" class="me-alert-subpanel" style="display:${s.vidaInstintivaAlterada === 'SI' ? 'block' : 'none'};">
                        <label class="me-field-label">Manifestaciones Identificadas:</label>
                        <div class="me-chips-group" data-field="vidaInstintivaLista" data-type="multiple">
                            ${['Hiposexualidad', 'Hipersexualidad', 'Excitación Sexual Inhibida', 'Parafilias', 'Insomnio', 'Hipersomnia', 'Parasomnias', 'Somniloquia', 'Anorexia', 'Bulimia Nervosa', 'Rumiación', 'Pica'].map(opt => `<span class="me-chip ${(s.vidaInstintivaLista || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'vidaInstintivaLista', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 16. VOLICIÓN -->
            <div class="me-card" data-group="5">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">16</span> Volición (Voluntad y Motivación)</div>
                    <span class="me-card-tag">Volición</span>
                </div>
                <div class="me-card-body">
                    <div class="me-chips-group" data-field="volicion" data-type="single">
                        ${['Normobulia', 'Abulia', 'Hipobulia', 'Hiperbulia', 'Apatía'].map(opt => `<span class="me-chip ${s.volicion === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'volicion', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 17. CONCIENCIA DE ENFERMEDAD -->
            <div class="me-card" data-group="5">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">17</span> Conciencia de Enfermedad (Insight)</div>
                    <span class="me-card-tag">Insight</span>
                </div>
                <div class="me-card-body">
                    <div class="me-chips-group" data-field="concienciaEnfermedad" data-type="single">
                        ${['Presente', 'Parcial', 'Ausente'].map(opt => `<span class="me-chip ${s.concienciaEnfermedad === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'concienciaEnfermedad', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 18. JUICIO DE REALIDAD -->
            <div class="me-card" data-group="5">
                <div class="me-card-header">
                    <div class="me-card-title"><span class="me-num">18</span> Juicio de Realidad</div>
                    <span class="me-card-tag">Realidad</span>
                </div>
                <div class="me-card-body">
                    <div class="me-chips-group" data-field="juicioRealidad" data-type="single">
                        ${['Conservado', 'Parcial', 'Desviado'].map(opt => `<span class="me-chip ${s.juicioRealidad === opt ? 'active' : ''}" onclick="MentalExamModule.onChipSelect(this, 'juicioRealidad', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>
        `;
    },

    // Handlers de selección y actualización de estado
    onChipSelect(el, field, value) {
        const group = el.parentElement;
        group.querySelectorAll('.me-chip').forEach(c => c.classList.remove('active'));
        el.classList.add('active');

        // Toggle condicionales visuales
        if (field === 'concienciaAlterada') {
            const d = document.getElementById('me_conciencia_details');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'atencionAlterada') {
            const d = document.getElementById('me_atencion_details');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'memoriaConservada') {
            const d = document.getElementById('me_memoria_details');
            if (d) d.style.display = value === 'NO' ? 'block' : 'none';
        } else if (field === 'pruebasRealizadas') {
            const d = document.getElementById('me_pruebas_box');
            if (d) d.style.display = value === 'SI' ? 'inline-block' : 'none';
        } else if (field === 'pensamientoDelirios') {
            const d = document.getElementById('me_delirios_details');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'hipertimiaPresenta') {
            const d = document.getElementById('me_afecto_details');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'ilusionesPresenta') {
            const d = document.getElementById('me_ilusiones_box');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'alucinacionesPresenta') {
            const d = document.getElementById('me_alucinaciones_box');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        } else if (field === 'vidaInstintivaAlterada') {
            const d = document.getElementById('me_instintiva_box');
            if (d) d.style.display = value === 'SI' ? 'block' : 'none';
        }

        this.syncStateAndRegenerate();
    },

    onChipToggle(el, field, value) {
        el.classList.toggle('active');
        this.syncStateAndRegenerate();
    },

    onFieldChange(field, value) {
        this.syncStateAndRegenerate();
    },

    // Extraer estado actual desde el DOM interactivo
    collectCurrentState() {
        const getSingle = (field) => {
            const group = document.querySelector(`.me-chips-group[data-field="${field}"]`);
            return group?.querySelector('.me-chip.active')?.textContent.trim() || '';
        };

        const getMultiple = (field) => {
            const group = document.querySelector(`.me-chips-group[data-field="${field}"]`);
            if (!group) return [];
            return Array.from(group.querySelectorAll('.me-chip.active')).map(c => c.textContent.trim());
        };

        return {
            sexo: getSingle('sexo'),
            edad: document.getElementById('me_edad')?.value || '',
            edadAparenteCronologica: getSingle('edadAparenteCronologica') || 'SI',
            biotipo: getSingle('biotipo') || 'Mesomorfo',
            aspectoVestimenta: getMultiple('aspectoVestimenta'),
            vestimentaEdadOcasion: getSingle('vestimentaEdadOcasion') || 'SI',
            actitud: getMultiple('actitud'),
            concienciaAlterada: getSingle('concienciaAlterada') || 'NO',
            concienciaCuantitativa: getMultiple('concienciaCuantitativa'),
            concienciaCualitativa: getMultiple('concienciaCualitativa'),
            concienciaYo: getMultiple('concienciaYo'),
            atencionAlterada: getSingle('atencionAlterada') || 'NO',
            atencionTipo: getMultiple('atencionTipo'),
            orientacionAutopsiquica: getSingle('orientacionAutopsiquica') || 'SI',
            orientacionAlopsiquica: getSingle('orientacionAlopsiquica') || 'SI',
            orientacionDesorientacion: getMultiple('orientacionDesorientacion'),
            memoriaConservada: getSingle('memoriaConservada') || 'SI',
            memoriaCualitativo: getMultiple('memoriaCualitativo'),
            memoriaCuantitativo: getMultiple('memoriaCuantitativo'),
            juicioPractico: getSingle('juicioPractico') || 'Conservado',
            inteligencia: getSingle('inteligencia') || 'Promedio',
            pruebasRealizadas: getSingle('pruebasRealizadas') || 'NO',
            pruebasCual: document.getElementById('me_pruebas_cual')?.value || '',
            pensamientoVelocidad: getSingle('pensamientoVelocidad') || 'Normal',
            pensamientoEstructura: getMultiple('pensamientoEstructura'),
            pensamientoDelirios: getSingle('pensamientoDelirios') || 'NO',
            pensamientoDeliriosLista: getMultiple('pensamientoDeliriosLista'),
            pensamientoOtros: getMultiple('pensamientoOtros'),
            lenguajeOrganico: getMultiple('lenguajeOrganico'),
            lenguajePsicogeno: getMultiple('lenguajePsicogeno'),
            lenguajeNoVerbal: getMultiple('lenguajeNoVerbal'),
            afectoBase: getSingle('afectoBase') || 'Modulado / Eutímico',
            hipertimiaPresenta: getSingle('hipertimiaPresenta') || 'NO',
            hipertimiaTipo: getSingle('hipertimiaTipo') || '',
            hipertimiaPolo: getSingle('hipertimiaPolo') || '',
            hipertimiaSentimientos: getMultiple('hipertimiaSentimientos'),
            afectoCualitativo: getMultiple('afectoCualitativo'),
            sensopercepcionCuantitativa: getSingle('sensopercepcionCuantitativa') || 'Conservada',
            ilusionesPresenta: getSingle('ilusionesPresenta') || 'NO',
            ilusionesTipo: getMultiple('ilusionesTipo'),
            alucinacionesPresenta: getSingle('alucinacionesPresenta') || 'NO',
            alucinacionesTipo: getMultiple('alucinacionesTipo'),
            pseudoalucinaciones: getSingle('pseudoalucinaciones') || 'NO',
            psicomotricidadOrganico: getMultiple('psicomotricidadOrganico'),
            psicomotricidadNoOrganico: getMultiple('psicomotricidadNoOrganico'),
            vidaInstintivaAlterada: getSingle('vidaInstintivaAlterada') || 'NO',
            vidaInstintivaLista: getMultiple('vidaInstintivaLista'),
            volicion: getSingle('volicion') || 'Normobulia',
            concienciaEnfermedad: getSingle('concienciaEnfermedad') || 'Presente',
            juicioRealidad: getSingle('juicioRealidad') || 'Conservado'
        };
    },

    syncStateAndRegenerate() {
        const patient = AppState.patients?.find(p => p.id === this.currentPatientId);
        if (!patient) return;
        const currentFields = this.collectCurrentState();
        const text = this.generateNarrative(currentFields, patient);
        const out = document.getElementById('mentalExamOutputText');
        if (out) {
            out.value = text;
        }
        this.updateWordCount(text);
    },

    updateWordCount(text) {
        const el = document.getElementById('me_word_count');
        if (!el) return;
        const str = (text || '').trim();
        const words = str ? str.split(/\s+/).filter(Boolean).length : 0;
        const chars = str.length;
        el.innerHTML = `<i class="fas fa-chart-simple"></i> ${words} palabras · ${chars} caracteres`;
    },

    filterGroup(groupId, btn) {
        const pills = document.querySelectorAll('.me-cat-pill');
        pills.forEach(p => p.classList.remove('active'));
        if (btn) btn.classList.add('active');

        const cards = document.querySelectorAll('.me-card');
        cards.forEach(card => {
            if (groupId === 'all' || card.getAttribute('data-group') === String(groupId)) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
    },

    resetToGenerated() {
        this.syncStateAndRegenerate();
        if (typeof showToast === 'function') showToast('Redacción sincronizada con la plantilla', 'info');
    },

    // Establecer preset normotípico / conservado
    setNormalPreset(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;
        const initial = this.getInitialState(patient);
        const formPane = document.querySelector('.mental-exam-form-pane');
        if (formPane) {
            formPane.innerHTML = `<form id="mentalExamForm" onsubmit="event.preventDefault();">${this.renderFormSections(initial)}</form>`;
        }
        this.syncStateAndRegenerate();
        if (typeof showToast === 'function') showToast('Valores normotípicos conservados cargados', 'success');
    },

    // Guardar examen mental en el expediente del paciente
    saveExam(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;

        const fields = this.collectCurrentState();
        const text = document.getElementById('mentalExamOutputText')?.value.trim() || this.generateNarrative(fields, patient);

        patient.mentalExam = {
            updatedAt: new Date().toISOString(),
            fields: fields,
            text: text
        };

        // Guardar persistencia
        if (typeof saveData === 'function') {
            saveData();
        }

        if (typeof showToast === 'function') {
            showToast('Examen mental guardado en el expediente clínico', 'success');
        }
    },

    copyNarrative() {
        const out = document.getElementById('mentalExamOutputText');
        if (!out || !out.value) {
            if (typeof showToast === 'function') showToast('No hay texto para copiar', 'warning');
            return;
        }
        navigator.clipboard.writeText(out.value).then(() => {
            if (typeof showToast === 'function') showToast('Examen mental copiado al portapapeles', 'success');
        }).catch(() => {
            out.select();
            document.execCommand('copy');
            if (typeof showToast === 'function') showToast('Examen mental copiado', 'success');
        });
    },

    // Insertar el examen mental en la nota de atención / evolución
    insertIntoSessionNote(patientId) {
        const out = document.getElementById('mentalExamOutputText');
        const text = out?.value.trim();
        if (!text) {
            if (typeof showToast === 'function') showToast('Primero genere el texto del examen mental', 'warning');
            return;
        }

        this.saveExam(patientId);

        // Si existe el modal de reporte de atención abierto
        const noteObj = document.getElementById('noteObjetivo') || document.getElementById('ra_objetivo');
        if (noteObj) {
            noteObj.value = (noteObj.value ? noteObj.value + '\n\n' : '') + 'EXAMEN MENTAL:\n' + text;
            if (typeof showToast === 'function') showToast('Examen mental insertado en la sección objetiva de la nota', 'success');
        } else {
            // Abrir formulario de atención para el paciente
            if (typeof openReporteAtencionForPatient === 'function') {
                closeModal('patientDetailModal');
                openReporteAtencionForPatient(patientId);
                setTimeout(() => {
                    const targetInput = document.getElementById('noteObjetivo') || document.getElementById('ra_objetivo');
                    if (targetInput) {
                        targetInput.value = (targetInput.value ? targetInput.value + '\n\n' : '') + 'EXAMEN MENTAL:\n' + text;
                    }
                }, 200);
            } else {
                this.copyNarrative();
                if (typeof showToast === 'function') showToast('Copiado al portapapeles. Péguelo en la nota de sesión.', 'info');
            }
        }
    },

    formatText(type) {
        const textarea = document.getElementById('mentalExamOutputText');
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start === end) {
            if (typeof showToast === 'function') showToast('Seleccione texto primero para formatear', 'info');
            return;
        }
        const selected = textarea.value.substring(start, end);
        let replacement = selected;
        if (type === 'bold') {
            replacement = `**${selected}**`;
        } else if (type === 'italic') {
            replacement = `*${selected}*`;
        }
        textarea.setRangeText(replacement, start, end, 'select');
    },

    exportPDF(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;

        const out = document.getElementById('mentalExamOutputText');
        const text = out?.value.trim() || 'Sin examen mental registrado.';
        const therapist = AppState.currentUser || { name: 'Profesional de la Salud Mental' };

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor autorice las ventanas emergentes para imprimir el informe.');
            return;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="es">
            <head>
                <meta charset="UTF-8">
                <title>Examen Mental - ${patient.name}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.6; }
                    .header { border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-end; }
                    .header h1 { margin: 0; font-size: 20px; color: #059669; text-transform: uppercase; letter-spacing: 0.5px; }
                    .header .meta { font-size: 12px; color: #64748b; text-align: right; }
                    .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 13px; }
                    .section-title { font-size: 14px; font-weight: 700; color: #0f172a; border-left: 3px solid #059669; padding-left: 8px; margin-bottom: 12px; text-transform: uppercase; }
                    .narrative-content { font-size: 14px; text-align: justify; line-height: 1.8; background: #ffffff; padding: 16px; border: 1px solid #cbd5e1; border-radius: 6px; }
                    .signature-box { margin-top: 60px; display: flex; justify-content: flex-end; }
                    .signature-line { width: 260px; text-align: center; border-top: 1px solid #94a3b8; padding-top: 6px; font-size: 12px; color: #334155; }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1>Protocolo de Examen Mental</h1>
                        <small style="color:#64748b;">Evaluación Semiológica de Funciones Mentales</small>
                    </div>
                    <div class="meta">
                        <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}<br>
                        <strong>Colegiatura:</strong> ${therapist.registry || 'FPV En Custodia'}
                    </div>
                </div>

                <div class="patient-box">
                    <div><strong>Paciente:</strong> ${patient.name}</div>
                    <div><strong>Edad:</strong> ${patient.birthdate ? calculateAge(patient.birthdate) + ' años' : (patient.age || '—')}</div>
                    <div><strong>Sexo:</strong> ${patient.gender || '—'}</div>
                    <div><strong>Estatus:</strong> ${patient.status || 'En Evaluación'}</div>
                    <div><strong>Fecha de Ingreso:</strong> ${patient.admissionDate || (patient.createdAt ? patient.createdAt.split('T')[0] : '—')}</div>
                    <div><strong>Evaluador/a:</strong> ${therapist.name || 'Terapeuta'}</div>
                </div>

                <div class="section-title">Informe Clínico del Examen Mental</div>
                <div class="narrative-content">
                    ${text.replace(/\n\n/g, '<br><br>')}
                </div>

                <div class="signature-box">
                    <div class="signature-line">
                        <strong>${therapist.name || 'Firma Profesional'}</strong><br>
                        Psicólogo/a Tratante<br>
                        ${therapist.specialty || 'Psicología Clínica'}
                    </div>
                </div>

                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }
};

if (typeof window !== 'undefined') {
    window.MentalExamModule = MentalExamModule;
    window.renderTabExamenMental = function(patient) {
        return MentalExamModule.renderTab(patient);
    };
}

if (typeof globalThis !== 'undefined') {
    globalThis.MentalExamModule = MentalExamModule;
    globalThis.renderTabExamenMental = function(patient) {
        return MentalExamModule.renderTab(patient);
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = MentalExamModule;
}

