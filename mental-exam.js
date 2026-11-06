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
        const isFem = (gender || '').toLowerCase().startsWith('fem');

        // Si ya existen datos previos guardados en el paciente, cargarlos
        if (patient.mentalExam && patient.mentalExam.fields) {
            const loaded = JSON.parse(JSON.stringify(patient.mentalExam.fields));
            // Asegurar compatibilidad si viene con la opción antigua de vestimenta
            if (!loaded.aspectoVestimenta || loaded.aspectoVestimenta.length === 0) {
                loaded.aspectoVestimenta = isFem 
                    ? ['Aseada', 'Arreglada', 'Vestimenta de acuerdo a edad y ocasión']
                    : ['Aseado', 'Arreglado', 'Vestimenta de acuerdo a edad y ocasión'];
            } else {
                // Si tenía 'Vestido de acuerdo a la ocasión', actualizar a 'Vestimenta de acuerdo a edad y ocasión'
                loaded.aspectoVestimenta = loaded.aspectoVestimenta.map(v => 
                    v === 'Vestido de acuerdo a la ocasión' ? 'Vestimenta de acuerdo a edad y ocasión' : v
                );
                if (loaded.vestimentaEdadOcasion === 'SI' && !loaded.aspectoVestimenta.some(v => /vestiment[ao]|vestid[ao]/i.test(v))) {
                    loaded.aspectoVestimenta.push('Vestimenta de acuerdo a edad y ocasión');
                }
            }

            // Asegurar compatibilidad de actitud si tenía 'De gran confianza'
            if (loaded.actitud) {
                loaded.actitud = loaded.actitud.map(a => a === 'De gran confianza' ? 'Confiada' : a);
            }

            // Asegurar compatibilidad de orientación si viene en formato previo
            if (!loaded.orientacion || loaded.orientacion.length === 0) {
                const orients = [];
                if (loaded.orientacionAutopsiquica !== 'NO') orients.push('Orientado Autopsíquicamente');
                if (loaded.orientacionAlopsiquica !== 'NO') orients.push('Orientado Alopsíquicamente');
                if (Array.isArray(loaded.orientacionDesorientacion)) {
                    loaded.orientacionDesorientacion.forEach(d => {
                        if (!orients.includes(d)) orients.push(d);
                    });
                }
                loaded.orientacion = orients.length > 0 ? orients : ['Orientado Autopsíquicamente', 'Orientado Alopsíquicamente'];
            }
            return loaded;
        }

        return {
            // 1. Presentación
            sexo: gender,
            edad: age,
            edadAparenteCronologica: 'SI',
            biotipo: 'Mesomorfo',

            // 2. Aspecto y vestimenta
            aspectoVestimenta: isFem 
                ? ['Aseada', 'Arreglada', 'Vestimenta de acuerdo a edad y ocasión']
                : ['Aseado', 'Arreglado', 'Vestimenta de acuerdo a edad y ocasión'],
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
            orientacion: ['Orientado Autopsíquicamente', 'Orientado Alopsíquicamente'],
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
        const isFem = (fields.sexo || '').toLowerCase().startsWith('fem');

        // 1. Presentación (Parte 1 del PDF)
        let generoTxt = 'Paciente';
        if (fields.sexo === 'Femenino') generoTxt = 'Paciente femenina';
        else if (fields.sexo === 'Masculino') generoTxt = 'Paciente masculino';
        else generoTxt = `Paciente (${fields.sexo})`;

        let pres = '';
        if (fields.edadAparenteCronologica === 'SI') {
            pres = `${generoTxt} de ${fields.edad || '—'} años, edad aparente a edad cronológica`;
        } else {
            pres = `${generoTxt} de ${fields.edad || '—'} años de edad, no aparente a edad cronológica`;
        }
        if (fields.biotipo) {
            pres += ` y biotipo ${fields.biotipo.toLowerCase()}`;
        }
        pres += '.';
        parts.push(pres);

        // 2. Aspecto y Vestimenta (Parte 2 y Parte 4 del PDF)
        const aspList = (fields.aspectoVestimenta || []).slice();
        const vestimentaSelected = aspList.some(v => /vestiment[ao]|vestid[ao]/i.test(v));
        const cleanAdjs = aspList.filter(v => !/vestiment[ao]|vestid[ao]/i.test(v));

        // Adaptar automáticamente adjetivos al género indicado (-o/-a, -e/-a)
        const genderAdaptedAdjs = cleanAdjs.map(adj => {
            if (isFem) {
                return adj.replace(/\bAseado\b/i, 'Aseada')
                          .replace(/\bArreglado\b/i, 'Arreglada')
                          .replace(/\bDescuidado\b/i, 'Descuidada')
                          .replace(/\bDesarreglado\b/i, 'Desarreglada');
            } else {
                return adj.replace(/\bAseada\b/i, 'Aseado')
                          .replace(/\bArreglada\b/i, 'Arreglado')
                          .replace(/\bDescuidada\b/i, 'Descuidado')
                          .replace(/\bDesarreglada\b/i, 'Desarreglado');
            }
        });

        let adjTxt = '';
        if (genderAdaptedAdjs.length === 1) {
            adjTxt = genderAdaptedAdjs[0];
        } else if (genderAdaptedAdjs.length === 2) {
            adjTxt = `${genderAdaptedAdjs[0]} y ${genderAdaptedAdjs[1].toLowerCase()}`;
        } else if (genderAdaptedAdjs.length > 2) {
            adjTxt = `${genderAdaptedAdjs.slice(0, -1).join(', ')} y ${genderAdaptedAdjs[genderAdaptedAdjs.length - 1].toLowerCase()}`;
        } else if (!vestimentaSelected && fields.vestimentaEdadOcasion !== 'SI') {
            adjTxt = 'Presentación personal adecuada al contexto';
        }

        if (adjTxt) {
            adjTxt = adjTxt.charAt(0).toUpperCase() + adjTxt.slice(1);
        }

        let aspTxt = '';
        const hasVestimenta = vestimentaSelected || fields.vestimentaEdadOcasion === 'SI';
        if (hasVestimenta) {
            if (adjTxt) {
                aspTxt = `${adjTxt}, vestimenta de acuerdo a la edad y ocasión.`;
            } else {
                aspTxt = 'Vestimenta de acuerdo a la edad y ocasión.';
            }
        } else if (fields.vestimentaEdadOcasion === 'NO') {
            if (adjTxt) {
                aspTxt = `${adjTxt}, vestimenta no acorde a la edad ni ocasión.`;
            } else {
                aspTxt = 'Vestimenta no acorde a la edad ni ocasión.';
            }
        } else {
            aspTxt = `${adjTxt}.`;
        }
        parts.push(aspTxt);

        // 3. Actitud (Parte 3 del PDF)
        const actList = (fields.actitud || []).slice();
        if (actList.length > 0) {
            let actTxt = '';
            if (actList.length === 1) actTxt = actList[0].toLowerCase();
            else if (actList.length === 2) actTxt = `${actList[0].toLowerCase()}, ${actList[1].toLowerCase()}`;
            else actTxt = `${actList.slice(0, -1).map(a => a.toLowerCase()).join(', ')} y ${actList[actList.length - 1].toLowerCase()}`;
            parts.push(`Actitud ${actTxt}.`);
        } else {
            parts.push('Actitud colaboradora ante la evaluación.');
        }

        // 4. Nivel de Conciencia
        if (fields.concienciaAlterada === 'NO') {
            parts.push('Nivel de Conciencia Conservado.');
        } else {
            const items = [
                ...(fields.concienciaCuantitativa || []),
                ...(fields.concienciaCualitativa || []),
                ...(fields.concienciaYo || []),
                ...(fields.concienciaYoPsiquico || [])
            ];
            if (items.length > 0) {
                let txt = items.join(', ');
                txt = txt.charAt(0).toUpperCase() + txt.slice(1);
                parts.push(`${txt}.`);
            } else {
                parts.push('Somnolencia.');
            }
        }

        // 5. Atención
        if (fields.atencionAlterada === 'NO') {
            parts.push('Atención Conservada.');
        } else {
            const atList = fields.atencionTipo && fields.atencionTipo.length > 0 ? fields.atencionTipo.join(', ') : '';
            if (atList) {
                let txt = atList.charAt(0).toUpperCase() + atList.slice(1);
                parts.push(`${txt}.`);
            } else {
                parts.push('Hipoprosexia.');
            }
        }

        // 6. Orientación
        const orientList = Array.isArray(fields.orientacion) ? fields.orientacion : [];
        const hasAuto = orientList.length > 0 
            ? orientList.some(o => /autops[íi]quica/i.test(o)) 
            : fields.orientacionAutopsiquica === 'SI';
        const hasAlo = orientList.length > 0 
            ? orientList.some(o => /alops[íi]quica/i.test(o)) 
            : fields.orientacionAlopsiquica === 'SI';
        const desor = orientList.filter(o => /desorientaci[óo]n/i.test(o));
        if (Array.isArray(fields.orientacionDesorientacion)) {
            fields.orientacionDesorientacion.forEach(d => {
                if (!desor.includes(d)) desor.push(d);
            });
        }

        const orientParts = [];
        if (hasAlo && hasAuto && desor.length === 0) {
            orientParts.push('Orientado Alopsíquica y Autopsíquicamente');
        } else if (hasAuto && !hasAlo && desor.length === 0) {
            orientParts.push('Orientado Autopsíquicamente y desorientado Alopsíquicamente');
        } else if (hasAlo && !hasAuto && desor.length === 0) {
            orientParts.push('Orientado Alopsíquicamente y desorientado Autopsíquicamente');
        } else if (!hasAlo && !hasAuto && desor.length === 0 && orientList.length === 0) {
            orientParts.push('Orientado Alopsíquica y Autopsíquicamente');
        } else if (desor.length > 0) {
            if (hasAuto && hasAlo) {
                orientParts.push('Orientado Alopsíquica y Autopsíquicamente');
            } else if (hasAuto && !hasAlo) {
                orientParts.push('Orientado Autopsíquicamente');
            } else if (hasAlo && !hasAuto) {
                orientParts.push('Orientado Alopsíquicamente');
            }
            orientParts.push(`con ${desor.join(', ')}`);
        } else {
            orientParts.push('Desorientado globalmente en tiempo, espacio y persona');
        }
        parts.push(orientParts.join(' ') + '.');

        // 7. Memoria
        if (fields.memoriaConservada === 'SI') {
            parts.push('Memoria Conservada.');
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
        let intelTxt = fields.inteligencia === 'Promedio' ? 'Inteligencia Normal.' : `Inteligencia ${fields.inteligencia}.`;
        if (fields.pruebasRealizadas === 'SI') {
            intelTxt += ` Pruebas psicométricas aplicadas: ${fields.pruebasCual || 'Batería psicométrica estándar'}.`;
        }
        parts.push(intelTxt);

        // 10. Pensamiento
        const pensParts = [];
        if (fields.pensamientoVelocidad && fields.pensamientoVelocidad !== 'Normal') {
            pensParts.push(fields.pensamientoVelocidad);
        }
        if (fields.pensamientoEstructura && fields.pensamientoEstructura.length > 0 && !fields.pensamientoEstructura.includes('Lógico y Coherente')) {
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
            parts.push(`${pensParts.join('. ')}.`);
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
            parts.push(`${lengParts.join('. ')}.`);
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
        parts.push(`${afectParts.join(', ')}.`);

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
            parts.push(`${sensParts.join('. ')}.`);
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
            parts.push(`${psicoParts.join(', ')}.`);
        }

        // 15. Vida Instintiva
        if (fields.vidaInstintivaAlterada === 'NO' || !fields.vidaInstintivaLista || fields.vidaInstintivaLista.length === 0) {
            parts.push('Vida Instintiva conservada (patrones de sueño, alimentación y conducta preservados).');
        } else {
            parts.push(`${fields.vidaInstintivaLista.join(', ')}.`);
        }

        // 16. Volición
        if (fields.volicion === 'Normobulia') {
            parts.push('Volición: Normobulia.');
        } else {
            parts.push(`${fields.volicion || 'Normobulia'}.`);
        }

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
                                Evaluación semiológica protocolizada. Selección interactiva con pestañas desplegables y síntesis diagnóstica en vivo.
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

                <!-- BARRA DE FILTRO POR DOMINIOS CLÍNICOS Y CONTROLES DE DESPLIEGUE -->
                <div class="me-filter-toolbar">
                    <div class="me-category-bar">
                        <button type="button" class="me-cat-pill active" onclick="MentalExamModule.filterGroup('all', this)"><i class="fas fa-layer-group"></i> Todas (18)</button>
                        <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('1', this)"><i class="fas fa-user-check"></i> I. Aspecto & Actitud (1-3)</button>
                        <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('2', this)"><i class="fas fa-brain"></i> II. Cognición (4-9)</button>
                        <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('3', this)"><i class="fas fa-comments"></i> III. Pensamiento (10-11)</button>
                        <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('4', this)"><i class="fas fa-heart-pulse"></i> IV. Afecto & Percepción (12-13)</button>
                        <button type="button" class="me-cat-pill" onclick="MentalExamModule.filterGroup('5', this)"><i class="fas fa-shield-halved"></i> V. Juicio & Volición (14-18)</button>
                    </div>
                    <div class="me-accordion-controls">
                        <button type="button" class="me-acc-btn" onclick="MentalExamModule.expandAllCards()" title="Desplegar todas las funciones">
                            <i class="fas fa-angles-down"></i> Desplegar todas
                        </button>
                        <button type="button" class="me-acc-btn" onclick="MentalExamModule.collapseAllCards()" title="Plegar todas las funciones para vista limpia">
                            <i class="fas fa-angles-up"></i> Plegar todas
                        </button>
                    </div>
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

    // Retorna las opciones de adjetivos de aspecto según género (Parte 2 del PDF)
    getAspectOptions(gender) {
        const isFem = (gender || '').toLowerCase().startsWith('fem');
        if (isFem) {
            return [
                'Aseada',
                'Arreglada',
                'Descuidada',
                'Desarreglada',
                'Extravagante',
                'Vestimenta de acuerdo a edad y ocasión'
            ];
        }
        return [
            'Aseado',
            'Arreglado',
            'Descuidado',
            'Desarreglado',
            'Extravagante',
            'Vestimenta de acuerdo a edad y ocasión'
        ];
    },

    // Opciones completas de actitud (Parte 3 del PDF)
    getActitudOptions() {
        return [
            'Amable', 'Suspicaz', 'Colaboradora', 'Interesada', 'Cansada', 'Altiva',
            'Confiada', 'Demandante', 'Distante', 'De extrañeza', 'Hostil',
            'Inhibida', 'Intrusiva', 'Pasivo agresiva', 'Pueril', 'Quejumbrosa'
        ];
    },

    // Opciones completas de orientación (Parte 6 del PDF)
    getOrientacionOptions() {
        return [
            'Orientado Autopsíquicamente',
            'Orientado Alopsíquicamente',
            'Desorientación Parcial',
            'Desorientación Temporal',
            'Desorientación Espacial'
        ];
    },

    // Render de lista desplegable personalizada compacta (ahorro de espacio)
    renderDropdown(field, label, options, selectedValues = []) {
        const count = selectedValues.length;
        const tagsHtml = count === 0
            ? `<span class="me-dd-placeholder">Seleccionar opciones...</span>`
            : selectedValues.map(v => `
                <span class="me-dd-tag">
                    ${v}
                    <button type="button" class="me-dd-tag-remove" onclick="MentalExamModule.removeDropdownItem('${field}', '${v.replace(/'/g, "\\'")}', event)">×</button>
                </span>
            `).join('');

        return `
            <div class="me-dropdown-container" id="me_dd_container_${field}" data-field="${field}">
                <div class="me-dropdown-trigger" id="me_dd_trigger_${field}" onclick="MentalExamModule.toggleDropdownMenu('${field}')" tabindex="0">
                    <div class="me-dropdown-tags-wrapper" id="me_dd_tags_${field}">
                        ${tagsHtml}
                    </div>
                    <div class="me-dropdown-icons">
                        <span class="me-dd-counter" id="me_dd_counter_${field}">${count}</span>
                        <i class="fas fa-chevron-down me-dd-arrow" id="me_dd_arrow_${field}"></i>
                    </div>
                </div>
                <div class="me-dropdown-menu" id="me_dd_menu_${field}">
                    ${options.map(opt => {
                        const checked = selectedValues.includes(opt);
                        return `
                            <label class="me-dd-item ${checked ? 'selected' : ''}">
                                <input type="checkbox" value="${opt}" ${checked ? 'checked' : ''} onchange="MentalExamModule.onDropdownToggle('${field}', '${opt.replace(/'/g, "\\'")}')">
                                <span>${opt}</span>
                            </label>
                        `;
                    }).join('')}
                </div>
            </div>
        `;
    },

    // Generador de resumen breve para cada cabecera de tarjeta (Dashboard visible al colapsar)
    getCardSummary(cardNum, s) {
        const isSi = (val) => val === 'SI' || (typeof val === 'string' && /^s[íi]/i.test(val.trim()));
        const isNo = (val) => val === 'NO' || (typeof val === 'string' && /^no/i.test(val.trim()));

        switch (cardNum) {
            case 1:
                return `${s.sexo || 'Paciente'}, ${s.edad || '—'} años · ${isSi(s.edadAparenteCronologica) ? 'Edad aparente acorde' : 'Edad no acorde'}`;
            case 2: {
                const list = s.aspectoVestimenta || [];
                if (list.length === 0) return 'Presentación adecuada';
                return list.slice(0, 2).join(', ') + (list.length > 2 ? ` (+${list.length - 2})` : '');
            }
            case 3: {
                const list = s.actitud || [];
                if (list.length === 0) return 'Colaboradora';
                return list.slice(0, 2).join(', ') + (list.length > 2 ? ` (+${list.length - 2})` : '');
            }
            case 4:
                return isSi(s.concienciaAlterada) ? '⚠️ Alterada' : '✓ Conservado';
            case 5:
                return isSi(s.atencionAlterada) ? '⚠️ Alterada' : '✓ Conservada';
            case 6: {
                const list = s.orientacion || [];
                const auto = isSi(s.orientacionAutopsiquica) || list.some(o => /autops[íi]quica/i.test(o));
                const alo = isSi(s.orientacionAlopsiquica) || list.some(o => /alops[íi]quica/i.test(o));
                const des = (s.orientacionDesorientacion && s.orientacionDesorientacion.length > 0) || list.some(o => /desorientaci[óo]n/i.test(o));
                if (des) return '⚠️ Desorientado';
                if (auto && alo) return '✓ Orientado globalmente';
                if (auto && !alo) return '⚠️ Desorientado alopsíquicamente';
                if (!auto && alo) return '⚠️ Desorientado autopsíquicamente';
                return list.length > 0 ? list.slice(0, 2).join(', ') : '✓ Orientado globalmente';
            }
            case 7:
                return isSi(s.memoriaConservada) ? '✓ Conservada' : '⚠️ Alterada';
            case 8:
                return s.juicioPractico === 'Conservado' ? '✓ Conservado' : `⚠️ ${s.juicioPractico}`;
            case 9:
                return s.inteligencia === 'Promedio' ? '✓ Normal / Promedio' : s.inteligencia;
            case 10:
                if (s.pensamientoVelocidad && s.pensamientoVelocidad !== 'Normal') return `⚠️ ${s.pensamientoVelocidad}`;
                if (isSi(s.pensamientoDelirios)) return '⚠️ Delirios';
                return '✓ Lógico y conservado';
            case 11:
                if ((s.lenguajeOrganico && s.lenguajeOrganico.length > 0) || (s.lenguajePsicogeno && s.lenguajePsicogeno.length > 0)) {
                    return `⚠️ ${[...(s.lenguajePsicogeno || []), ...(s.lenguajeOrganico || [])][0] || 'Alterado'}`;
                }
                return '✓ Articulado y fluido';
            case 12:
                if (isSi(s.hipertimiaPresenta)) {
                    return `⚠️ ${s.hipertimiaTipo || 'Hipertimia'}`;
                }
                return s.afectoBase ? `✓ ${s.afectoBase}` : '✓ Eutímico';
            case 13:
                if (s.sensopercepcionCuantitativa && s.sensopercepcionCuantitativa !== 'Conservada') return `⚠️ ${s.sensopercepcionCuantitativa}`;
                if (isSi(s.alucinacionesPresenta)) return '⚠️ Alucinaciones';
                if (isSi(s.ilusionesPresenta)) return '⚠️ Ilusiones';
                return '✓ Conservada';
            case 14:
                if ((s.psicomotricidadOrganico && s.psicomotricidadOrganico.length > 0) || (s.psicomotricidadNoOrganico && s.psicomotricidadNoOrganico.length > 0)) {
                    return `⚠️ ${[...(s.psicomotricidadNoOrganico || []), ...(s.psicomotricidadOrganico || [])][0] || 'Alterada'}`;
                }
                return '✓ Postura y motricidad estable';
            case 15:
                return isSi(s.vidaInstintivaAlterada) ? `⚠️ Alterada (${(s.vidaInstintivaLista || []).slice(0, 2).join(', ')})` : '✓ Conservada';
            case 16:
                return s.volicion === 'Normobulia' ? '✓ Normobulia' : `⚠️ ${s.volicion}`;
            case 17:
                return s.concienciaEnfermedad === 'Presente' ? '✓ Presente (Insight +)' : `⚠️ ${s.concienciaEnfermedad}`;
            case 18:
                return s.juicioRealidad === 'Conservado' ? '✓ Conservado' : `⚠️ ${s.juicioRealidad}`;
            default:
                return '';
        }
    },

    // Genera la insignia de resumen con su clase correspondiente (success, alert, neutral)
    renderSummaryBadge(cardNum, s) {
        const sum = this.getCardSummary(cardNum, s);
        let cls = 'me-card-summary';
        if (sum.startsWith('⚠️')) cls += ' alert';
        else if (sum.startsWith('✓')) cls += ' success';
        return `<span class="${cls}" id="me_summary_${cardNum}">${sum}</span>`;
    },

    // Render de cada una de las 18 secciones
    renderFormSections(s) {
        const aspectOpts = this.getAspectOptions(s.sexo);
        const actitudOpts = this.getActitudOptions();
        const orientOpts = this.getOrientacionOptions();

        return `
            <!-- 1. PRESENTACIÓN -->
            <div class="me-card collapsible" id="me_card_1" data-group="1" data-card-num="1">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(1)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">1</span>
                        <span class="me-card-title">Presentación General</span>
                        <span class="me-card-tag">General</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(1, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_1"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_1">
                    <div class="me-field-grid-2">
                        <div class="me-field-block">
                            <label class="me-field-label">Sexo:</label>
                            <div class="me-chips-group" data-field="sexo" data-type="single">
                                ${['Femenino', 'Masculino', 'No Binario', 'Otro'].map(opt => `<span class="me-chip ${s.sexo === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'sexo', '${opt}')">${opt}</span>`).join('')}
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
                                <span class="me-chip ${s.edadAparenteCronologica === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'edadAparenteCronologica', 'SI')">SÍ</span>
                                <span class="me-chip ${s.edadAparenteCronologica === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'edadAparenteCronologica', 'NO')">NO</span>
                            </div>
                        </div>
                        <div class="me-field-block">
                            <label class="me-field-label">Biotipo Morfológico:</label>
                            <div class="me-chips-group" data-field="biotipo" data-type="single">
                                ${['Leptosómico', 'Mesomorfo', 'Endomorfo'].map(opt => `<span class="me-chip ${s.biotipo === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'biotipo', '${opt}')">${opt}</span>`).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 2. ASPECTO Y VESTIMENTA (Parte 2 del PDF: Lista desplegable, eliminación SI/NO y concordancia de género) -->
            <div class="me-card collapsible" id="me_card_2" data-group="1" data-card-num="2">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(2)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">2</span>
                        <span class="me-card-title">Aspecto y Vestimenta</span>
                        <span class="me-card-tag">General</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(2, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_2"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_2">
                    <label class="me-field-label">Aspecto General y Vestimenta (Lista Desplegable):</label>
                    ${this.renderDropdown('aspectoVestimenta', 'Aspecto y Vestimenta', aspectOpts, s.aspectoVestimenta || [])}
                </div>
            </div>

            <!-- 3. ACTITUD (Parte 3: Lista desplegable) -->
            <div class="me-card collapsible" id="me_card_3" data-group="1" data-card-num="3">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(3)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">3</span>
                        <span class="me-card-title">Actitud</span>
                        <span class="me-card-tag">General</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(3, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_3"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_3">
                    <label class="me-field-label">Rasgos observados durante el encuentro (Lista Desplegable):</label>
                    ${this.renderDropdown('actitud', 'Actitud', actitudOpts, s.actitud || [])}
                </div>
            </div>

            <!-- 4. NIVEL DE CONCIENCIA -->
            <div class="me-card collapsible" id="me_card_4" data-group="2" data-card-num="4">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(4)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">4</span>
                        <span class="me-card-title">Nivel de Conciencia</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(4, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_4"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_4">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="concienciaAlterada" data-type="single">
                            <span class="me-chip ${s.concienciaAlterada === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'concienciaAlterada', 'NO')">NO (Conservado)</span>
                            <span class="me-chip ${s.concienciaAlterada === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'concienciaAlterada', 'SI')">SÍ</span>
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
            <div class="me-card collapsible" id="me_card_5" data-group="2" data-card-num="5">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(5)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">5</span>
                        <span class="me-card-title">Atención</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(5, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_5"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_5">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="atencionAlterada" data-type="single">
                            <span class="me-chip ${s.atencionAlterada === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'atencionAlterada', 'NO')">NO (Euprosexia / Conservada)</span>
                            <span class="me-chip ${s.atencionAlterada === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'atencionAlterada', 'SI')">SÍ</span>
                        </div>
                    </div>
                    <div id="me_atencion_details" class="me-alert-subpanel" style="display:${s.atencionAlterada === 'SI' ? 'block' : 'none'};">
                        <div class="me-chips-group" data-field="atencionTipo" data-type="multiple">
                            ${['Aproxesia', 'Hipoprosexia', 'Hiperprosexia'].map(opt => `<span class="me-chip ${(s.atencionTipo || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'atencionTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- 6. ORIENTACIÓN -->
            <div class="me-card collapsible" id="me_card_6" data-group="2" data-card-num="6">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(6)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">6</span>
                        <span class="me-card-title">Orientación</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(6, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_6"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_6">
                    <label class="me-field-label">Orientación (Lista Desplegable):</label>
                    ${this.renderDropdown('orientacion', 'Orientación', orientOpts, s.orientacion || [])}
                </div>
            </div>

            <!-- 7. MEMORIA -->
            <div class="me-card collapsible" id="me_card_7" data-group="2" data-card-num="7">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(7)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">7</span>
                        <span class="me-card-title">Memoria (Fijación, Evocación y Reconocimiento)</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(7, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_7"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_7">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Memoria conservada?:</label>
                        <div class="me-chips-group me-segmented" data-field="memoriaConservada" data-type="single">
                            <span class="me-chip ${s.memoriaConservada === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'memoriaConservada', 'SI')">SÍ (Conservada)</span>
                            <span class="me-chip ${s.memoriaConservada === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'memoriaConservada', 'NO')">NO (Alteraciones)</span>
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
            <div class="me-card collapsible" id="me_card_8" data-group="2" data-card-num="8">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(8)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">8</span>
                        <span class="me-card-title">Juicio Práctico</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(8, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_8"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_8">
                    <div class="me-chips-group" data-field="juicioPractico" data-type="single">
                        ${['Conservado', 'Parcial', 'Desviado'].map(opt => `<span class="me-chip ${s.juicioPractico === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'juicioPractico', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 9. INTELIGENCIA -->
            <div class="me-card collapsible" id="me_card_9" data-group="2" data-card-num="9">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(9)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">9</span>
                        <span class="me-card-title">Capacidad Intelectual Estimada</span>
                        <span class="me-card-tag">Cognición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(9, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_9"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_9">
                    <div class="me-chips-group" data-field="inteligencia" data-type="single">
                        ${['Inferior al promedio', 'Promedio', 'Superior al promedio'].map(opt => `<span class="me-chip ${s.inteligencia === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'inteligencia', '${opt}')">${opt}</span>`).join('')}
                    </div>
                    <div class="me-field-row" style="margin-top:12px;align-items:center;">
                        <label class="me-field-label" style="margin:0;">¿Se realizaron pruebas psicométricas?:</label>
                        <div class="me-chips-group me-segmented" data-field="pruebasRealizadas" data-type="single">
                            <span class="me-chip ${s.pruebasRealizadas === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'pruebasRealizadas', 'SI')">SÍ</span>
                            <span class="me-chip ${s.pruebasRealizadas === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'pruebasRealizadas', 'NO')">NO</span>
                        </div>
                        <div id="me_pruebas_box" style="display:${s.pruebasRealizadas === 'SI' ? 'inline-block' : 'none'};flex:1;min-width:180px;">
                            <input type="text" id="me_pruebas_cual" class="me-clean-input" placeholder="¿Qué pruebas? Ej: Raven, WAIS..." value="${s.pruebasCual || ''}" oninput="MentalExamModule.onFieldChange('pruebasCual', this.value)">
                        </div>
                    </div>
                </div>
            </div>

            <!-- 10. PENSAMIENTO -->
            <div class="me-card collapsible" id="me_card_10" data-group="3" data-card-num="10">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(10)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">10</span>
                        <span class="me-card-title">Pensamiento (Velocidad, Estructura y Contenido)</span>
                        <span class="me-card-tag">Pensamiento</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(10, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_10"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_10">
                    <label class="me-field-label">A. Velocidad:</label>
                    <div class="me-chips-group" data-field="pensamientoVelocidad" data-type="single">
                        ${['Normal', 'Taquipsiquia', 'Pensamiento Ideofugal', 'Fuga de Ideas', 'Bradipsiquia', 'Inhibición del Pensamiento'].map(opt => `<span class="me-chip ${s.pensamientoVelocidad === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'pensamientoVelocidad', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <label class="me-field-label" style="margin-top:12px;">B. Estructura o Curso:</label>
                    <div class="me-chips-group" data-field="pensamientoEstructura" data-type="multiple">
                        ${['Lógico y Coherente', 'Pensamiento Circunstancial', 'Pensamiento Tangencial', 'Pensamiento Escamoteador', 'Pararrespuesta o Parafasia', 'Pensamiento Concreto', 'Pensamiento Perseverativo', 'Pensamiento Restringido', 'Pensamiento Pueril', 'Neologismo', 'Onomatopoyesis', 'Bloqueos', 'Pensamiento Disgregado', 'Pensamiento Laxo', 'Jergafasia', 'Pensamiento Incoherente'].map(opt => `<span class="me-chip ${(s.pensamientoEstructura || []).includes(opt) ? 'active' : ''}" onclick="MentalExamModule.onChipToggle(this, 'pensamientoEstructura', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">C. Contenido — ¿Presenta Ideas Delirantes?:</label>
                        <div class="me-chips-group me-segmented" data-field="pensamientoDelirios" data-type="single">
                            <span class="me-chip ${s.pensamientoDelirios === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'pensamientoDelirios', 'NO')">NO</span>
                            <span class="me-chip ${s.pensamientoDelirios === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'pensamientoDelirios', 'SI')">SÍ</span>
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
            <div class="me-card collapsible" id="me_card_11" data-group="3" data-card-num="11">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(11)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">11</span>
                        <span class="me-card-title">Lenguaje (Verbal y No Verbal)</span>
                        <span class="me-card-tag">Lenguaje</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(11, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_11"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_11">
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
            <div class="me-card collapsible" id="me_card_12" data-group="4" data-card-num="12">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(12)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">12</span>
                        <span class="me-card-title">Afectividad</span>
                        <span class="me-card-tag">Afecto</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(12, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_12"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_12">
                    <label class="me-field-label">Afecto basal:</label>
                    <div class="me-chips-group" data-field="afectoBase" data-type="single">
                        ${['Modulado / Eutímico', 'Furor Maníaco', 'Beatitud', 'Éxtasis', 'Hipotimia', 'Atimia'].map(opt => `<span class="me-chip ${s.afectoBase === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'afectoBase', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">¿Presenta Hipertimia / Alteración Cuantitativa?:</label>
                        <div class="me-chips-group me-segmented" data-field="hipertimiaPresenta" data-type="single">
                            <span class="me-chip ${s.hipertimiaPresenta === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.hipertimiaPresenta === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPresenta', 'SI')">SÍ</span>
                        </div>
                    </div>

                    <div id="me_afecto_details" class="me-alert-subpanel" style="display:${s.hipertimiaPresenta === 'SI' ? 'block' : 'none'};">
                        <label class="me-field-label">Tipo de Hipertimia:</label>
                        <div class="me-chips-group" data-field="hipertimiaTipo" data-type="single">
                            ${['Hipertimia Placentera', 'Hipertimia Displacentera', 'Hipertimia Mixta Agitada', 'Hipertimia con Fuga de Ideas'].map(opt => `<span class="me-chip ${s.hipertimiaTipo === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaTipo', '${opt}')">${opt}</span>`).join('')}
                        </div>

                        <label class="me-field-label" style="margin-top:10px;">Orientada al Polo:</label>
                        <div class="me-chips-group" data-field="hipertimiaPolo" data-type="single">
                            ${['De la Tristeza', 'De la Alegría', 'De la Ira', 'Miedo', 'Pesimismo'].map(opt => `<span class="me-chip ${s.hipertimiaPolo === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'hipertimiaPolo', '${opt}')">${opt}</span>`).join('')}
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
            <div class="me-card collapsible" id="me_card_13" data-group="4" data-card-num="13">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(13)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">13</span>
                        <span class="me-card-title">Sensopercepción</span>
                        <span class="me-card-tag">Percepción</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(13, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_13"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_13">
                    <label class="me-field-label">Cuantitativo:</label>
                    <div class="me-chips-group" data-field="sensopercepcionCuantitativa" data-type="single">
                        ${['Conservada', 'Aceleración de la Percepción', 'Retardo de la Percepción', 'Abolición de la Percepción'].map(opt => `<span class="me-chip ${s.sensopercepcionCuantitativa === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'sensopercepcionCuantitativa', '${opt}')">${opt}</span>`).join('')}
                    </div>

                    <div class="me-toggle-row" style="margin-top:12px;">
                        <label class="me-field-label" style="margin:0;">¿Presenta Ilusiones?:</label>
                        <div class="me-chips-group me-segmented" data-field="ilusionesPresenta" data-type="single">
                            <span class="me-chip ${s.ilusionesPresenta === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'ilusionesPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.ilusionesPresenta === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'ilusionesPresenta', 'SI')">SÍ</span>
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
                            <span class="me-chip ${s.alucinacionesPresenta === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'alucinacionesPresenta', 'NO')">NO</span>
                            <span class="me-chip ${s.alucinacionesPresenta === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'alucinacionesPresenta', 'SI')">SÍ</span>
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
                                <span class="me-chip ${s.pseudoalucinaciones === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'pseudoalucinaciones', 'NO')">NO</span>
                                <span class="me-chip ${s.pseudoalucinaciones === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'pseudoalucinaciones', 'SI')">SÍ</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 14. PSICOMOTRICIDAD -->
            <div class="me-card collapsible" id="me_card_14" data-group="5" data-card-num="14">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(14)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">14</span>
                        <span class="me-card-title">Psicomotricidad</span>
                        <span class="me-card-tag">Conducta</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(14, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_14"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_14">
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
            <div class="me-card collapsible" id="me_card_15" data-group="5" data-card-num="15">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(15)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">15</span>
                        <span class="me-card-title">Vida Instintiva (Sueño, Apetito y Conducta)</span>
                        <span class="me-card-tag">Instinto</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(15, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_15"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_15">
                    <div class="me-toggle-row">
                        <label class="me-field-label" style="margin:0;">¿Presenta alteraciones?:</label>
                        <div class="me-chips-group me-segmented" data-field="vidaInstintivaAlterada" data-type="single">
                            <span class="me-chip ${s.vidaInstintivaAlterada === 'NO' ? 'active' : ''}" data-value="NO" onclick="MentalExamModule.onChipSelect(this, 'vidaInstintivaAlterada', 'NO')">NO (Conservada)</span>
                            <span class="me-chip ${s.vidaInstintivaAlterada === 'SI' ? 'active' : ''}" data-value="SI" onclick="MentalExamModule.onChipSelect(this, 'vidaInstintivaAlterada', 'SI')">SÍ</span>
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
            <div class="me-card collapsible" id="me_card_16" data-group="5" data-card-num="16">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(16)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">16</span>
                        <span class="me-card-title">Volición (Voluntad y Motivación)</span>
                        <span class="me-card-tag">Volición</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(16, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_16"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_16">
                    <div class="me-chips-group" data-field="volicion" data-type="single">
                        ${['Normobulia', 'Abulia', 'Hipobulia', 'Hiperbulia', 'Apatía'].map(opt => `<span class="me-chip ${s.volicion === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'volicion', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 17. CONCIENCIA DE ENFERMEDAD -->
            <div class="me-card collapsible" id="me_card_17" data-group="5" data-card-num="17">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(17)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">17</span>
                        <span class="me-card-title">Conciencia de Enfermedad (Insight)</span>
                        <span class="me-card-tag">Insight</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(17, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_17"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_17">
                    <div class="me-chips-group" data-field="concienciaEnfermedad" data-type="single">
                        ${['Presente', 'Parcial', 'Ausente'].map(opt => `<span class="me-chip ${s.concienciaEnfermedad === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'concienciaEnfermedad', '${opt}')">${opt}</span>`).join('')}
                    </div>
                </div>
            </div>

            <!-- 18. JUICIO DE REALIDAD -->
            <div class="me-card collapsible" id="me_card_18" data-group="5" data-card-num="18">
                <div class="me-card-header me-accordion-header" onclick="MentalExamModule.toggleCardCollapse(18)" role="button" tabindex="0">
                    <div class="me-header-left">
                        <span class="me-num">18</span>
                        <span class="me-card-title">Juicio de Realidad</span>
                        <span class="me-card-tag">Realidad</span>
                    </div>
                    <div class="me-header-right">
                        ${this.renderSummaryBadge(18, s)}
                        <i class="fas fa-chevron-down me-accordion-chevron" id="me_chevron_18"></i>
                    </div>
                </div>
                <div class="me-card-body" id="me_body_18">
                    <div class="me-chips-group" data-field="juicioRealidad" data-type="single">
                        ${['Conservado', 'Parcial', 'Desviado'].map(opt => `<span class="me-chip ${s.juicioRealidad === opt ? 'active' : ''}" data-value="${opt}" onclick="MentalExamModule.onChipSelect(this, 'juicioRealidad', '${opt}')">${opt}</span>`).join('')}
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
        if (value) el.setAttribute('data-value', value);

        // Si cambia el sexo, adaptar automáticamente las terminaciones de adjetivos de aspecto
        if (field === 'sexo') {
            this.updateAspectGender(value);
        }

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
        this.updateAllCardSummaries();
    },

    onChipToggle(el, field, value) {
        el.classList.toggle('active');
        this.syncStateAndRegenerate();
        this.updateAllCardSummaries();
    },

    onFieldChange(field, value) {
        this.syncStateAndRegenerate();
        this.updateAllCardSummaries();
    },

    // Gestión de Dropdowns desplegables (Aspecto y Actitud)
    toggleDropdownMenu(field) {
        const menu = document.getElementById(`me_dd_menu_${field}`);
        const trigger = document.getElementById(`me_dd_trigger_${field}`);
        if (!menu || !trigger) return;

        const isShown = menu.classList.contains('show');
        // Cerrar todos los demás
        document.querySelectorAll('.me-dropdown-menu.show').forEach(m => m.classList.remove('show'));
        document.querySelectorAll('.me-dropdown-trigger.open').forEach(t => t.classList.remove('open'));

        if (!isShown) {
            menu.classList.add('show');
            trigger.classList.add('open');
        }
    },

    onDropdownToggle(field, value) {
        const menu = document.getElementById(`me_dd_menu_${field}`);
        if (!menu) return;

        // Actualizar etiquetas en el trigger
        this.refreshDropdownTags(field);
        this.syncStateAndRegenerate();
        this.updateAllCardSummaries();
    },

    removeDropdownItem(field, value, ev) {
        if (ev) ev.stopPropagation();
        const menu = document.getElementById(`me_dd_menu_${field}`);
        if (!menu) return;

        const inputs = menu.querySelectorAll('input[type="checkbox"]');
        inputs.forEach(input => {
            if (input.value === value) {
                input.checked = false;
                const parent = input.closest('.me-dd-item');
                if (parent) parent.classList.remove('selected');
            }
        });

        this.refreshDropdownTags(field);
        this.syncStateAndRegenerate();
        this.updateAllCardSummaries();
    },

    refreshDropdownTags(field) {
        const menu = document.getElementById(`me_dd_menu_${field}`);
        const tagsContainer = document.getElementById(`me_dd_tags_${field}`);
        const counter = document.getElementById(`me_dd_counter_${field}`);
        if (!menu || !tagsContainer) return;

        const selectedValues = [];
        menu.querySelectorAll('input[type="checkbox"]').forEach(input => {
            const parent = input.closest('.me-dd-item');
            if (input.checked) {
                selectedValues.push(input.value);
                if (parent) parent.classList.add('selected');
            } else {
                if (parent) parent.classList.remove('selected');
            }
        });

        if (counter) counter.textContent = selectedValues.length;

        if (selectedValues.length === 0) {
            tagsContainer.innerHTML = `<span class="me-dd-placeholder">Seleccionar opciones...</span>`;
        } else {
            tagsContainer.innerHTML = selectedValues.map(v => `
                <span class="me-dd-tag">
                    ${v}
                    <button type="button" class="me-dd-tag-remove" onclick="MentalExamModule.removeDropdownItem('${field}', '${v.replace(/'/g, "\\'")}', event)">×</button>
                </span>
            `).join('');
        }
    },

    // Adapta automáticamente los adjetivos de aspecto según género seleccionado en Presentación (Parte 2)
    updateAspectGender(gender) {
        const isFem = (gender || '').toLowerCase().startsWith('fem');
        const menu = document.getElementById('me_dd_menu_aspectoVestimenta');
        if (!menu) return;

        // Obtener valores actualmente seleccionados y transformarlos
        const currentChecked = Array.from(menu.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
        const transformedChecked = currentChecked.map(val => {
            if (isFem) {
                return val.replace(/\bAseado\b/i, 'Aseada')
                          .replace(/\bArreglado\b/i, 'Arreglada')
                          .replace(/\bDescuidado\b/i, 'Descuidada')
                          .replace(/\bDesarreglado\b/i, 'Desarreglada');
            } else {
                return val.replace(/\bAseada\b/i, 'Aseado')
                          .replace(/\bArreglada\b/i, 'Arreglado')
                          .replace(/\bDescuidada\b/i, 'Descuidado')
                          .replace(/\bDesarreglada\b/i, 'Desarreglado');
            }
        });

        const newOptions = this.getAspectOptions(gender);
        menu.innerHTML = newOptions.map(opt => {
            const checked = transformedChecked.includes(opt);
            return `
                <label class="me-dd-item ${checked ? 'selected' : ''}">
                    <input type="checkbox" value="${opt}" ${checked ? 'checked' : ''} onchange="MentalExamModule.onDropdownToggle('aspectoVestimenta', '${opt.replace(/'/g, "\\'")}')">
                    <span>${opt}</span>
                </label>
            `;
        }).join('');

        this.refreshDropdownTags('aspectoVestimenta');
    },

    // Gestión de Acordeón Pestañas Desplegables (Reducción de Ruido Visual)
    toggleCardCollapse(cardNum) {
        const card = document.getElementById(`me_card_${cardNum}`);
        if (!card) return;
        card.classList.toggle('collapsed');
    },

    expandAllCards() {
        document.querySelectorAll('.me-card.collapsible').forEach(c => {
            c.classList.remove('collapsed');
        });
    },

    collapseAllCards() {
        document.querySelectorAll('.me-card.collapsible').forEach(c => {
            c.classList.add('collapsed');
        });
    },

    updateAllCardSummaries() {
        const s = this.collectCurrentState();
        for (let i = 1; i <= 18; i++) {
            const el = document.getElementById(`me_summary_${i}`);
            if (el) {
                const sum = this.getCardSummary(i, s);
                el.textContent = sum;
                if (sum.startsWith('⚠️')) {
                    el.className = 'me-card-summary alert';
                } else if (sum.startsWith('✓')) {
                    el.className = 'me-card-summary success';
                } else {
                    el.className = 'me-card-summary';
                }
            }
        }
    },

    // Extraer estado actual desde el DOM interactivo
    collectCurrentState() {
        const getSingle = (field) => {
            const group = document.querySelector(`.me-chips-group[data-field="${field}"]`);
            const active = group?.querySelector('.me-chip.active');
            if (!active) return '';
            if (active.hasAttribute('data-value')) return active.getAttribute('data-value');
            const txt = active.textContent.trim();
            // Normalizar valores binarios SI / NO independientemente de tildes o sufijos
            if (/^s[íi]/i.test(txt)) return 'SI';
            if (/^no/i.test(txt)) return 'NO';
            return txt;
        };

        const getMultiple = (field) => {
            // Revisar si viene de un dropdown interactivo
            const menu = document.getElementById(`me_dd_menu_${field}`);
            if (menu) {
                return Array.from(menu.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value.trim());
            }
            // Fallback a chips
            const group = document.querySelector(`.me-chips-group[data-field="${field}"]`);
            if (!group) return [];
            return Array.from(group.querySelectorAll('.me-chip.active')).map(c => c.textContent.trim());
        };

        const aspectoVals = getMultiple('aspectoVestimenta');

        return {
            sexo: getSingle('sexo'),
            edad: document.getElementById('me_edad')?.value || '',
            edadAparenteCronologica: getSingle('edadAparenteCronologica') || 'SI',
            biotipo: getSingle('biotipo') || 'Mesomorfo',
            aspectoVestimenta: aspectoVals,
            vestimentaEdadOcasion: (function() {
                if (aspectoVals.some(v => /vestiment[ao]|vestid[ao]/i.test(v))) return 'SI';
                return getSingle('vestimentaEdadOcasion') || 'SI';
            })(),
            actitud: getMultiple('actitud'),
            concienciaAlterada: getSingle('concienciaAlterada') || 'NO',
            concienciaCuantitativa: getMultiple('concienciaCuantitativa'),
            concienciaCualitativa: getMultiple('concienciaCualitativa'),
            concienciaYo: getMultiple('concienciaYo'),
            atencionAlterada: getSingle('atencionAlterada') || 'NO',
            atencionTipo: getMultiple('atencionTipo'),
            orientacion: getMultiple('orientacion'),
            orientacionAutopsiquica: (function() {
                const list = getMultiple('orientacion');
                if (list.length > 0) return list.some(o => /autops[íi]quica/i.test(o)) ? 'SI' : 'NO';
                return getSingle('orientacionAutopsiquica') || 'SI';
            })(),
            orientacionAlopsiquica: (function() {
                const list = getMultiple('orientacion');
                if (list.length > 0) return list.some(o => /alops[íi]quica/i.test(o)) ? 'SI' : 'NO';
                return getSingle('orientacionAlopsiquica') || 'SI';
            })(),
            orientacionDesorientacion: (function() {
                const list = getMultiple('orientacion');
                const des = list.filter(o => /desorientaci[óo]n/i.test(o));
                if (des.length > 0) return des;
                return getMultiple('orientacionDesorientacion');
            })(),
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
            afectoOtrasAlteraciones: getMultiple('afectoOtrasAlteraciones'),
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
                // Si se filtra una categoría específica, expandirla automáticamente para conveniencia del profesional
                if (groupId !== 'all') {
                    card.classList.remove('collapsed');
                }
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
        this.updateAllCardSummaries();
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
    },

    // =============================================================
    // MODO CHECK-LIST RÁPIDO PARA HISTORIA CLÍNICA Y NOTAS
    // =============================================================
    openChecklistModal(targetInputId = 'fh_mentalExam') {
        let modal = document.getElementById('mentalExamChecklistModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'mentalExamChecklistModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const checklistCategories = [
            {
                name: '1. Porte, Aspecto y Actitud',
                items: [
                    { id: 'me_ck_aseado', label: 'Aseado y con adecuado aliño personal', text: 'Paciente aseado/a, con adecuado cuidado personal', normal: true },
                    { id: 'me_ck_ropa_adecuada', label: 'Vestimenta acorde a edad, contexto y clima', text: 'vestimenta acorde al contexto y ocasión', normal: true },
                    { id: 'me_ck_colaborador', label: 'Actitud colaboradora, receptiva y comunicativa', text: 'actitud colaboradora y participativa ante la entrevista', normal: true },
                    { id: 'me_ck_contacto_visual', label: 'Contacto visual espontáneo y sostenido', text: 'contacto visual directo y adecuado', normal: true },
                    { id: 'me_ck_desalinado', label: 'Desaliñado / Higiene descuidada', text: 'presenta desaliño y descuido en higiene personal', normal: false },
                    { id: 'me_ck_hostil', label: 'Actitud reticente, desconfiada u hostil', text: 'actitud reticente y a la defensiva', normal: false },
                    { id: 'me_ck_inquieto', label: 'Inquietud psicomotora / Ansiedad evidente', text: 'inquietud psicomotora y desasosiego motriz', normal: false },
                    { id: 'me_ck_inhibido', label: 'Inhibición psicomotora / Retraimiento', text: 'inhibición conductual y retraimiento psicomotor', normal: false }
                ]
            },
            {
                name: '2. Conciencia y Orientación',
                items: [
                    { id: 'me_ck_lucido', label: 'Lúcido y vigil (Conciencia clara)', text: 'vigil y lúcido/a en su esfera de conciencia', normal: true },
                    { id: 'me_ck_orientado', label: 'Orientado en tiempo, espacio y persona', text: 'orientado/a en tiempo, espacio y persona (autopsíquica y alopsíquica conservada)', normal: true },
                    { id: 'me_ck_somnoliento', label: 'Somnoliento / Embotamiento de conciencia', text: 'tendencia a la somnolencia y embotamiento', normal: false },
                    { id: 'me_ck_desorientado', label: 'Desorientación temporoespacial parcial o total', text: 'desorientación en tiempo y/o espacio', normal: false }
                ]
            },
            {
                name: '3. Atención y Memoria',
                items: [
                    { id: 'me_ck_euprosexia', label: 'Euprosexia (Atención focalizada y sostenida)', text: 'euprosexia con adecuada focalización atencional', normal: true },
                    { id: 'me_ck_memoria_ok', label: 'Memoria inmediata, reciente y remota conservada', text: 'memoria inmediata, reciente y remota indemne', normal: true },
                    { id: 'me_ck_hipoprosexia', label: 'Hipoprosexia / Marcada distraibilidad', text: 'hipoprosexia con dificultad de concentración', normal: false },
                    { id: 'me_ck_amnesia', label: 'Fallas amnésicas o lagunas de fijación/evocación', text: 'fallas amnésicas en fijación y evocación reciente', normal: false }
                ]
            },
            {
                name: '4. Pensamiento y Lenguaje',
                items: [
                    { id: 'me_ck_curso_logico', label: 'Curso lógico, coherente y fluido', text: 'pensamiento de curso lógico, coherente y velocidad conservada', normal: true },
                    { id: 'me_ck_sin_delirios', label: 'Sin ideas delirantes, obsesivas ni fóbicas', text: 'sin ideación delirante, obsesiva ni fóbica', normal: true },
                    { id: 'me_ck_lenguaje_claro', label: 'Lenguaje fluido, claro y articulado', text: 'lenguaje fluido, bien articulado y comprensible, con mímica congruente', normal: true },
                    { id: 'me_ck_taquipsiquia', label: 'Taquipsiquia (Pensamiento acelerado / Verborrea)', text: 'taquipsiquia con fuga de ideas', normal: false },
                    { id: 'me_ck_bradipsiquia', label: 'Bradipsiquia (Pensamiento enlentecido)', text: 'bradipsiquia con marcado enlentecimiento asociativo', normal: false },
                    { id: 'me_ck_delirios', label: 'Presencia de ideas delirantes', text: 'presencia de ideas delirantes estructuradas', normal: false },
                    { id: 'me_ck_obsesiones', label: 'Ideas obsesivas / Rumiaciones intrusivas', text: 'rumiaciones obsesivas recurrentes', normal: false }
                ]
            },
            {
                name: '5. Afectividad y Sensopercepción',
                items: [
                    { id: 'me_ck_eutimico', label: 'Eutímico / Afecto modulado y resonante', text: 'ánimo eutímico, afectividad modulada con adecuada resonancia afectiva', normal: true },
                    { id: 'me_ck_sin_alucinaciones', label: 'Sensopercepción conservada (Sin alucinaciones)', text: 'sensopercepción conservada sin fenómenos alucinatorios ni ilusorios', normal: true },
                    { id: 'me_ck_depresivo', label: 'Hipotimia / Ánimo triste o decaído', text: 'hipotimia con ánimo marcadamente triste y apesadumbrado', normal: false },
                    { id: 'me_ck_ansioso', label: 'Ansiedad marcada / Angustia somática', text: 'afecto ansioso con tensión psicosomática', normal: false },
                    { id: 'me_ck_labil', label: 'Labilidad emocional / Llanto fácil', text: 'labilidad afectiva con llanto fácil', normal: false },
                    { id: 'me_ck_alucinaciones', label: 'Presencia de alucinaciones (auditivas/visuales)', text: 'alteración sensoperceptiva de tipo alucinatorio', normal: false }
                ]
            },
            {
                name: '6. Juicio, Introspección y Riesgo',
                items: [
                    { id: 'me_ck_juicio_conservado', label: 'Juicio de realidad conservado', text: 'juicio práctico y de realidad conservado', normal: true },
                    { id: 'me_ck_insight_positivo', label: 'Insight positivo / Conciencia de situación', text: 'insight positivo con adecuada conciencia de situación y necesidad de ayuda', normal: true },
                    { id: 'me_ck_riesgo_negativo', label: 'Riesgo autolítico descartado / Negativo', text: 'riesgo autolítico y heteroagresivo descartado en la evaluación actual', normal: true },
                    { id: 'me_ck_juicio_desviado', label: 'Juicio de realidad comprometido', text: 'juicio de realidad comprometido', normal: false },
                    { id: 'me_ck_insight_nulo', label: 'Insight nulo / Ausencia de conciencia', text: 'ausencia de introspección (insight nulo)', normal: false },
                    { id: 'me_ck_riesgo_activo', label: '⚠️ Ideación de muerte o riesgo autolítico presente', text: '⚠️ Presencia de ideación autolítica activa / Requiere contención y protocolo de seguridad', normal: false }
                ]
            }
        ];

        this._ckCategories = checklistCategories;

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('mentalExamChecklistModal')"></div>
            <div class="modal-content modal-large" style="max-width:860px;max-height:92vh;display:flex;flex-direction:column;">
                <div class="modal-header">
                    <h2>📋 Examen Mental — Formato Check-List Protocolizado</h2>
                    <button class="btn-icon" onclick="closeModal('mentalExamChecklistModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:14px;overflow-y:auto;flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:12px;background:var(--bg-secondary);padding:10px 14px;border-radius:8px;">
                        <span style="font-size:12.5px;color:var(--text-secondary);">
                            Selecciona las casillas correspondientes para generar automáticamente la síntesis semiológica.
                        </span>
                        <div style="display:flex;gap:8px;">
                            <button type="button" class="btn-sm btn-primary" onclick="MentalExamModule.checkAllNormalChecklist('${targetInputId}')">
                                <i class="fas fa-check-double"></i> ⭐ Marcar Todo Conservado / Eutímico
                            </button>
                            <button type="button" class="btn-sm btn-secondary" onclick="MentalExamModule.clearChecklist('${targetInputId}')">
                                Limpiar
                            </button>
                        </div>
                    </div>

                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(360px, 1fr));gap:14px;">
                        ${checklistCategories.map(cat => `
                            <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;border:1px solid var(--border-primary);">
                                <h4 style="margin:0 0 10px 0;font-size:13px;color:var(--accent-primary);border-bottom:1px solid var(--border-secondary);padding-bottom:4px;">${cat.name}</h4>
                                <div style="display:flex;flex-direction:column;gap:6px;">
                                    ${cat.items.map(item => `
                                        <label style="display:flex;align-items:flex-start;gap:8px;font-size:12px;cursor:pointer;line-height:1.35;">
                                            <input type="checkbox" id="${item.id}" data-normal="${item.normal}" onchange="MentalExamModule.updateChecklistLiveText('${targetInputId}')" style="margin-top:2px;">
                                            <span style="${item.normal ? 'color:var(--text-primary);' : 'color:#e16259;font-weight:600;'}">${item.label}</span>
                                        </label>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top:16px;">
                        <label style="font-size:12.5px;font-weight:700;display:block;margin-bottom:4px;">
                            📝 Previsualización de la Síntesis Semiológica:
                        </label>
                        <textarea id="me_ck_preview" rows="4" style="width:100%;font-size:12.5px;padding:8px 12px;border-radius:6px;border:1px solid var(--border-primary);background:var(--bg-card);color:var(--text-primary);" placeholder="Selecciona casillas arriba para generar el texto..."></textarea>
                    </div>
                </div>
                <div class="modal-actions" style="padding:12px 16px;border-top:1px solid var(--border-primary);display:flex;justify-content:flex-end;gap:10px;">
                    <button type="button" class="btn-secondary" onclick="closeModal('mentalExamChecklistModal')">Cancelar</button>
                    <button type="button" class="btn-primary" onclick="MentalExamModule.applyChecklistToField('${targetInputId}')">
                        <i class="fas fa-file-import"></i> Aplicar al Examen Mental
                    </button>
                </div>
            </div>
        `;

        openModal('mentalExamChecklistModal');
        this.checkAllNormalChecklist(targetInputId);
    },

    checkAllNormalChecklist(targetInputId) {
        if (!this._ckCategories) return;
        this._ckCategories.forEach(cat => {
            cat.items.forEach(item => {
                const el = document.getElementById(item.id);
                if (el) el.checked = item.normal;
            });
        });
        this.updateChecklistLiveText(targetInputId);
    },

    clearChecklist(targetInputId) {
        if (!this._ckCategories) return;
        this._ckCategories.forEach(cat => {
            cat.items.forEach(item => {
                const el = document.getElementById(item.id);
                if (el) el.checked = false;
            });
        });
        this.updateChecklistLiveText(targetInputId);
    },

    updateChecklistLiveText(targetInputId) {
        if (!this._ckCategories) return;
        const selectedTexts = [];
        this._ckCategories.forEach(cat => {
            cat.items.forEach(item => {
                const el = document.getElementById(item.id);
                if (el && el.checked) {
                    selectedTexts.push(item.text);
                }
            });
        });

        const preview = document.getElementById('me_ck_preview');
        if (preview) {
            if (selectedTexts.length === 0) {
                preview.value = '';
            } else {
                let narrative = 'Al examen mental: ' + selectedTexts.join('; ') + '.';
                // Capitalizar primera letra después de punto
                narrative = narrative.charAt(0).toUpperCase() + narrative.slice(1);
                preview.value = narrative;
            }
        }
    },

    applyChecklistToField(targetInputId) {
        const preview = document.getElementById('me_ck_preview');
        const text = preview ? preview.value.trim() : '';
        const target = document.getElementById(targetInputId);
        if (target) {
            target.value = text;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));
        }
        closeModal('mentalExamChecklistModal');
        if (typeof showToast === 'function') {
            showToast('✅ Examen Mental sintetizado e insertado con éxito', 'success');
        }
    }
};

if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.me-dropdown-container')) {
            document.querySelectorAll('.me-dropdown-menu.show').forEach(m => m.classList.remove('show'));
            document.querySelectorAll('.me-dropdown-trigger.open').forEach(t => t.classList.remove('open'));
        }
    });
}

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

