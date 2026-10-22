/**
 * PSICO NOTES CLINICAL - SISTEMA INTEGRAL DE HISTORIAS CLÍNICAS Y PRE-CONSULTA
 * Formato Oficial Clínico Protocolizado para Médicos y Psicólogos Colegiados
 * Cubre: Adultos (5 pág), Niñez (7 pág), Adolescencia (7 pág), Hoja de Evolución y Pre-consulta Digital.
 */

const ClinicalHistorySystem = {
    // -------------------------------------------------------------
    // 0. INFORMACIÓN DEL PROFESIONAL TRATANTE (DINÁMICO SEGÚN REGISTRO)
    // -------------------------------------------------------------
    getTherapistInfo() {
        let name = '';
        let specialty = '';
        let registry = '';

        if (typeof AppState !== 'undefined' && AppState.currentUser) {
            name = AppState.currentUser.name || '';
            specialty = AppState.currentUser.specialty || '';
            registry = AppState.currentUser.registryNumber || '';
        }

        if (!name && typeof localStorage !== 'undefined') {
            name = localStorage.getItem('psico_therapist_name') || '';
        }
        if (!specialty && typeof localStorage !== 'undefined') {
            specialty = localStorage.getItem('psico_therapist_specialty') || '';
        }
        if (!registry && typeof localStorage !== 'undefined') {
            registry = localStorage.getItem('psico_therapist_registry') || '';
        }

        return {
            name: name || 'Dr(a). / Lic. Profesional Clínico',
            specialty: specialty || 'Psicología Clínica / Salud Mental',
            registry: registry || 'Colegiatura Médica / Psicológica N.º Reg.'
        };
    },

    // -------------------------------------------------------------
    // 1. OBTENCIÓN Y MERGE DE CAMPOS CLINICOS CON VALORES POR DEFECTO
    // -------------------------------------------------------------
    getFullHistory(patient) {
        if (!patient) return {};
        const cat = typeof getPatientCategory === 'function' ? getPatientCategory(patient) : (patient.category || 'adult');
        return {
            // Estatus del Paciente
            status: patient.status || 'Por iniciar',
            age: patient.age || (patient.birthdate && typeof calculateAge === 'function' ? calculateAge(patient.birthdate) : ''),
            schoolGrade: patient.schoolGrade || '',
            referral: Array.isArray(patient.referral) ? patient.referral : (patient.referral ? [patient.referral] : (patient.referredBy ? [patient.referredBy] : [])),

            // A. Identificación & Filiación
            ci: patient.ci || '',
            birthPlace: patient.birthPlace || '',
            religion: patient.religion || '',
            livesWith: patient.livesWith || '',
            address: patient.address || '',
            referredBy: patient.referredBy || '',
            hasAttendedBefore: patient.hasAttendedBefore || 'NO',
            previousAttendanceDate: patient.previousAttendanceDate || '',
            consultationInitiative: patient.consultationInitiative || '',
            processExpectations: patient.processExpectations || '',

            // Ficha Representante / Tutor Legal
            guardianName: patient.guardianName || '',
            guardianRelation: patient.guardianRelation || '',
            guardianAge: patient.guardianAge || '',
            guardianSchooling: patient.guardianSchooling || '',
            guardianOccupation: patient.guardianOccupation || '',
            guardianMaritalStatus: patient.guardianMaritalStatus || '',
            guardianPhone: patient.guardianPhone || '',
            guardianEmail: patient.guardianEmail || '',
            guardianConsent: patient.guardianConsent || '',

            // Consulta Psicológica & Hipótesis
            previousPsych: patient.previousPsych || patient.hasAttendedBefore || 'No',
            applicantName: patient.applicantName || '',
            initiative: patient.initiative || patient.consultationInitiative || '',
            initiativeOther: patient.initiativeOther || '',
            bioHypothesis: patient.bioHypothesis || '',
            socialHypothesis: patient.socialHypothesis || '',
            psychHypothesis: patient.psychHypothesis || '',
            vulnerabilityFactors: patient.vulnerabilityFactors || '',
            riskFactors: patient.riskFactors || '',
            protectiveFactors: patient.protectiveFactors || '',
            socialDesirability: patient.socialDesirability || 'NO',
            selfMotivation: patient.selfMotivation || 'SI',
            address: patient.address || '',

            // Encuadre
            frequency: patient.frequency || '',
            modality: patient.modality || '',
            shift: patient.shift || '',

            // Padres y Hermanos
            motherName: patient.motherName || '',
            motherAge: patient.motherAge || '',
            motherCI: patient.motherCI || '',
            motherEducation: patient.motherEducation || '',
            motherJob: patient.motherJob || '',
            motherAddress: patient.motherAddress || '',

            fatherName: patient.fatherName || '',
            fatherAge: patient.fatherAge || '',
            fatherCI: patient.fatherCI || '',
            fatherEducation: patient.fatherEducation || '',
            fatherJob: patient.fatherJob || '',
            fatherAddress: patient.fatherAddress || '',

            siblingsCount: patient.siblingsCount || '0',
            stepSiblingsCount: patient.stepSiblingsCount || '0',
            halfSiblingsCount: patient.halfSiblingsCount || '0',
            genogramNotes: patient.genogramNotes || '',

            // B. Motivo & Semiología Gestual
            observedGestures: patient.observedGestures || '',

            // C. Examen Mental & Tríada Sintomatológica
            mentalExam: patient.mentalExam || '',
            symptomsBehavioral: patient.symptomsBehavioral || '',
            symptomsEmotional: patient.symptomsEmotional || '',
            symptomsOrganic: patient.symptomsOrganic || '',

            // D. Antecedentes Médicos y Neurobiológicos
            neuroEvaluation: patient.neuroEvaluation || '',
            traumaInjuries: patient.traumaInjuries || '',
            surgeries: patient.surgeries || '',
            seizures: patient.seizures || '',
            immuneDiseases: patient.immuneDiseases || '',
            allergies: patient.allergies || '',
            medicalTreatment: patient.medicalTreatment || patient.medication || '',
            otherMedicalHistory: patient.otherMedicalHistory || '',
            familyMedicalHistory: patient.familyMedicalHistory || patient.familyHistory || '',
            patientPsychiatricHistory: patient.patientPsychiatricHistory || '',
            familyPsychiatricHistory: patient.familyPsychiatricHistory || '',
            pedagogicalHistory: patient.pedagogicalHistory || '',

            // E. Neurodesarrollo Prenatal, Parto e Hitos (Pediátrico / Adolescente)
            pregnancyDesired: patient.pregnancyDesired || 'SI',
            pregnancyPlanned: patient.pregnancyPlanned || 'SI',
            fetalDevelopment: patient.fetalDevelopment || '',
            motherEmotionalState: patient.motherEmotionalState || '',
            pregnancyMedication: patient.pregnancyMedication || '',
            pregnancyDiseases: patient.pregnancyDiseases || '',
            pregnancyNumber: patient.pregnancyNumber || '1',
            pregnancyDuration: patient.pregnancyDuration || '39 semanas',
            deliveryDuration: patient.deliveryDuration || '',
            deliveryType: patient.deliveryType || 'Natural',
            birthCry: patient.birthCry || 'SI',
            babyPosition: patient.babyPosition || 'Cefálica',
            birthWeight: patient.birthWeight || '',
            birthLength: patient.birthLength || '',
            resuscitation: patient.resuscitation || 'NO',
            incubator: patient.incubator || 'NO',
            firstFeeding: patient.firstFeeding || 'Lactancia materna',
            birthObservations: patient.birthObservations || '',

            earlyFeedingDesc: patient.earlyFeedingDesc || '',
            weaningDesc: patient.weaningDesc || '',
            headControl: patient.headControl || '',
            sittingAge: patient.sittingAge || '',
            crawlingAge: patient.crawlingAge || '',
            firstStepsAge: patient.firstStepsAge || '',
            firstWordsAge: patient.firstWordsAge || '',
            firstTeeth: patient.firstTeeth || '',
            sphincterControl: patient.sphincterControl || '',

            // F. Escolaridad & Aprendizaje
            daycareOrCaregivers: patient.daycareOrCaregivers || '',
            schoolStartAge: patient.schoolStartAge || '',
            schoolAdaptation: patient.schoolAdaptation || '',
            teacherRelation: patient.teacherRelation || '',
            schoolFriends: patient.schoolFriends || '',
            readingAge: patient.readingAge || '',
            writingAge: patient.writingAge || '',
            countingAge: patient.countingAge || '',
            elementaryDevelopment: patient.elementaryDevelopment || '',
            learningDifficulties: patient.learningDifficulties || '',
            learningStrengths: patient.learningStrengths || '',
            schoolBehavior: patient.schoolBehavior || '',
            taskAttitude: patient.taskAttitude || '',
            homeworkSupport: patient.homeworkSupport || '',

            // G. Dinámica Familiar y Social
            homeBehavior: patient.homeBehavior || '',
            outdoorsBehavior: patient.outdoorsBehavior || '',
            likes: patient.likes || '',
            dislikes: patient.dislikes || '',
            autonomy: patient.autonomy || '',
            familyDynamics: patient.familyDynamics || '',
            socialArea: patient.socialArea || '',

            // H. Específico Adolescente (Entrevista directa)
            teenChildhood: patient.teenChildhood || '',
            teenSocial: patient.teenSocial || '',
            teenSexuality: patient.teenSexuality || '',
            teenSpirituality: patient.teenSpirituality || '',
            teenFamilyDynamics: patient.teenFamilyDynamics || '',
            teenRelationships: patient.teenRelationships || '',
            teenShortGoals: patient.teenShortGoals || '',
            teenLongGoals: patient.teenLongGoals || '',

            // I. Específico Adulto
            adultSocial: patient.adultSocial || '',
            adultFamilyDynamics: patient.adultFamilyDynamics || '',
            adultSpirituality: patient.adultSpirituality || '',
            adultSexual: patient.adultSexual || '',
            adultWork: patient.adultWork || '',
            adultLegal: patient.adultLegal || '',
            adultInfancyHistory: patient.adultInfancyHistory || '',
            adultAdolescenceHistory: patient.adultAdolescenceHistory || '',

            // J. Vivienda & Censo Habitacional
            housingType: patient.housingType || 'Casa',
            housingServices: patient.housingServices || 'Sí',
            housingSharesRoom: patient.housingSharesRoom || 'No',
            housingSharesRoomDesc: patient.housingSharesRoomDesc || '',
            occupantsAdultsM: patient.occupantsAdultsM || '0',
            occupantsAdultsF: patient.occupantsAdultsF || '0',
            occupantsTeensM: patient.occupantsTeensM || '0',
            occupantsTeensF: patient.occupantsTeensF || '0',
            occupantsChildrenM: patient.occupantsChildrenM || '0',
            occupantsChildrenF: patient.occupantsChildrenF || '0',

            // K. Hábitos Psicobiológicos
            addictions: patient.addictions || '',
            socialManias: patient.socialManias || '',
            phobias: patient.phobias || '',
            nightTerrors: patient.nightTerrors || '',
            onychophagy: patient.onychophagy || '',
            sleepPattern: patient.sleepPattern || '',
            eatingPattern: patient.eatingPattern || '',
            hygienePattern: patient.hygienePattern || '',
            recreationArea: patient.recreationArea || '',
            dailyRoutine: patient.dailyRoutine || '',
            shortTermGoals: patient.shortTermGoals || '',
            longTermGoals: patient.longTermGoals || ''
        };
    },

    renderTeenHistoryIntegral(patient, h, therapist, regInfo) {
        const getStatusChipClass = (st) => {
            if (!st) return 'status-por-iniciar';
            return 'status-' + st.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
        };

        const referralChips = (h.referral && h.referral.length > 0)
            ? h.referral.map(r => `<span class="tag tag-sm" style="margin-right:4px;">${r}</span>`).join('')
            : '<span style="color:var(--text-tertiary);">No especificado</span>';

        return `
            <div class="clinical-history-toolbar">
                <div class="cht-title">
                    <span class="cht-badge">🧑 Historia Clínica Adolescente</span>
                    <small>Modelo Oficial Protocolizado · ${therapist.name} (${therapist.specialty}${regInfo})</small>
                </div>
                <div class="cht-actions">
                    <button class="btn-primary" onclick="if(typeof editPatient==='function'){editPatient('${patient.id}'); closeModal('patientDetailModal');}">
                        <i class="fas fa-edit"></i> Editar Ficha Adolescente
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patient.id}')">
                        <i class="fas fa-print"></i> PDF Oficial
                    </button>
                </div>
            </div>

            <!-- ESTATUS DEL PACIENTE AL INICIO -->
            <div style="background:var(--bg-secondary);border:1px solid var(--border-secondary);border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
                <div>
                    <span style="font-size:12px;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Estatus del Paciente</span>
                    <div style="margin-top:4px;">
                        <span class="patient-status-chip ${getStatusChipClass(h.status)}" style="font-size:13px;padding:4px 12px;">
                            <i class="fas fa-flag"></i> ${h.status}
                        </span>
                    </div>
                </div>
                <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;">
                    <span style="font-size:13px;color:var(--text-secondary);"><i class="fas fa-calendar-alt"></i> Frecuencia: <strong>${h.frequency || 'Por acordar'}</strong></span>
                    <span style="font-size:13px;color:var(--text-secondary);"><i class="fas fa-laptop-house"></i> Modalidad: <strong>${h.modality || 'No definida'}</strong></span>
                    <span style="font-size:13px;color:var(--text-secondary);"><i class="fas fa-sun"></i> Turno: <strong>${h.shift || 'No definido'}</strong></span>
                </div>
            </div>

            <div class="accordion-history-container">
                <!-- SECCIÓN 1: FICHA DEL PACIENTE -->
                <div class="hist-acc-item active" id="acc_teen_1">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_1')">
                        <div class="hist-acc-title">
                            <span class="acc-num">1</span>
                            <strong>📋 Ficha del Paciente (Adolescente)</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Nombre Completo:</strong> ${patient.name || 'Sin registrar'}</div>
                            <div><strong>Edad:</strong> ${h.age ? `${h.age} años` : (patient.birthdate && typeof calculateAge === 'function' ? `${calculateAge(patient.birthdate)} años` : 'No registrada')}</div>
                            <div><strong>Sexo:</strong> ${patient.gender || 'No registrado'}</div>
                            <div><strong>Nivel de Escolaridad:</strong> ${h.schoolGrade || 'No registrado'}</div>
                            <div><strong>Vive con:</strong> ${h.livesWith || 'No especificado'}</div>
                            <div><strong>Correo Electrónico:</strong> ${patient.email ? `<a href="mailto:${patient.email}">${patient.email}</a>` : 'Sin registrar'}</div>
                            <div style="grid-column: span 2;">
                                <strong>Referido por:</strong> ${referralChips}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 2: FICHA DEL REPRESENTANTE / TUTOR LEGAL -->
                <div class="hist-acc-item active" id="acc_teen_2">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_2')">
                        <div class="hist-acc-title">
                            <span class="acc-num">2</span>
                            <strong>🛡️ Ficha del Representante / Tutor Legal</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Nombre Completo:</strong> ${h.guardianName || 'No registrado'}</div>
                            <div><strong>Parentesco:</strong> ${h.guardianRelation || 'No registrado'}</div>
                            <div><strong>Edad:</strong> ${h.guardianAge ? `${h.guardianAge} años` : 'No registrada'}</div>
                            <div><strong>Nivel de Escolaridad:</strong> ${h.guardianSchooling || 'No registrado'}</div>
                            <div><strong>Ocupación:</strong> ${h.guardianOccupation || 'No registrada'}</div>
                            <div><strong>Estado Civil:</strong> ${h.guardianMaritalStatus || 'No registrado'}</div>
                            <div><strong>Teléfono:</strong> ${h.guardianPhone ? `<a href="tel:${h.guardianPhone}">${h.guardianPhone}</a>` : 'Sin registrar'}</div>
                            <div><strong>Correo Electrónico:</strong> ${h.guardianEmail ? `<a href="mailto:${h.guardianEmail}">${h.guardianEmail}</a>` : 'Sin registrar'}</div>
                            <div style="grid-column: span 2; padding: 10px 14px; background: rgba(45, 212, 191, 0.08); border-radius: 8px; border: 1px solid rgba(45, 212, 191, 0.25);">
                                <strong>Consentimiento Informado:</strong> 
                                ${h.guardianConsent === 'firmado' ? '<span style="color:#059669; font-weight:600;"><i class="fas fa-check-circle"></i> Firmado y en custodia clínica</span>' : '<span style="color:#d97706; font-weight:600;"><i class="fas fa-clock"></i> Pendiente de firma y ratificación</span>'}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 3: INFORMACIÓN REFERENTE A LA CONSULTA PSICOLÓGICA -->
                <div class="hist-acc-item active" id="acc_teen_3">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_3')">
                        <div class="hist-acc-title">
                            <span class="acc-num">3</span>
                            <strong>🧠 Información Referente a la Consulta Psicológica</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data" style="margin-bottom: 14px;">
                            <div><strong>¿Ha asistido antes a Consulta Psicológica?:</strong> <span class="tag ${h.previousPsych === 'Si' ? 'tag-warning' : 'tag-neutral'}">${h.previousPsych || 'No'}</span></div>
                            <div><strong>Nombre de la Persona que solicita la Consulta:</strong> ${h.applicantName || 'No especificada'}</div>
                            <div style="grid-column: span 2;">
                                <strong>¿Quién tomó la iniciativa de la Consulta Psicológica?:</strong> 
                                <span class="tag tag-primary">${h.initiative || 'No registrada'} ${h.initiative === 'Otro' && h.initiativeOther ? `(${h.initiativeOther})` : ''}</span>
                            </div>
                        </div>

                        <div class="hist-field-block">
                            <label><i class="fas fa-comment-medical"></i> Motivo de Consulta:</label>
                            <p style="white-space:pre-line;">${patient.reason || 'Sin motivo explicitado aún.'}</p>
                        </div>

                        <div class="hist-field-block">
                            <label><i class="fas fa-bullseye"></i> Objetivos del Paciente:</label>
                            <p style="white-space:pre-line;">${patient.goals || 'Sin objetivos registrados.'}</p>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;"><i class="fas fa-project-diagram"></i> Hipótesis Biopsicosociales de Comprensión Clínica</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:12px;margin-bottom:16px;">
                            <div class="teen-hypothesis-card">
                                <div class="teen-hypothesis-title"><i class="fas fa-dna" style="color:#0284c7;"></i> Hipótesis Biológica</div>
                                <p style="font-size:13px;line-height:1.45;color:var(--text-secondary);margin:0;white-space:pre-line;">${h.bioHypothesis || 'Sin hipótesis biológica registrada.'}</p>
                            </div>
                            <div class="teen-hypothesis-card">
                                <div class="teen-hypothesis-title"><i class="fas fa-users" style="color:#0d9488;"></i> Hipótesis Social y Familiar</div>
                                <p style="font-size:13px;line-height:1.45;color:var(--text-secondary);margin:0;white-space:pre-line;">${h.socialHypothesis || 'Sin hipótesis social y familiar registrada.'}</p>
                            </div>
                            <div class="teen-hypothesis-card" style="grid-column: 1 / -1;">
                                <div class="teen-hypothesis-title"><i class="fas fa-brain" style="color:#7c3aed;"></i> Hipótesis Psicológica</div>
                                <p style="font-size:13px;line-height:1.45;color:var(--text-secondary);margin:0;white-space:pre-line;">${h.psychHypothesis || 'Sin hipótesis psicológica registrada.'}</p>
                            </div>
                        </div>

                        <div class="hist-sub-heading" style="margin-top:16px;"><i class="fas fa-shield-alt"></i> Factores de Riesgo, Vulnerabilidad y Protección</div>
                        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:12px;">
                            <div style="background:rgba(239, 68, 68, 0.08);border:1px solid rgba(239, 68, 68, 0.25);border-radius:8px;padding:12px;">
                                <div style="font-weight:700;color:#dc2626;font-size:12.5px;margin-bottom:6px;"><i class="fas fa-exclamation-triangle"></i> Factores de Riesgo</div>
                                <p style="font-size:12.5px;color:var(--text-secondary);margin:0;line-height:1.4;white-space:pre-line;">${h.riskFactors || 'Sin factores de riesgo registrados.'}</p>
                            </div>
                            <div style="background:rgba(245, 158, 11, 0.08);border:1px solid rgba(245, 158, 11, 0.25);border-radius:8px;padding:12px;">
                                <div style="font-weight:700;color:#d97706;font-size:12.5px;margin-bottom:6px;"><i class="fas fa-bolt"></i> Factores de Vulnerabilidad</div>
                                <p style="font-size:12.5px;color:var(--text-secondary);margin:0;line-height:1.4;white-space:pre-line;">${h.vulnerabilityFactors || 'Sin factores de vulnerabilidad registrados.'}</p>
                            </div>
                            <div style="background:rgba(16, 185, 129, 0.08);border:1px solid rgba(16, 185, 129, 0.25);border-radius:8px;padding:12px;">
                                <div style="font-weight:700;color:#059669;font-size:12.5px;margin-bottom:6px;"><i class="fas fa-heart"></i> Factores de Protección</div>
                                <p style="font-size:12.5px;color:var(--text-secondary);margin:0;line-height:1.4;white-space:pre-line;">${h.protectiveFactors || 'Sin factores de protección registrados.'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- SECCIÓN 4: ENCUADRE Y ACUERDOS DE CONSULTA -->
                <div class="hist-acc-item active" id="acc_teen_4">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_teen_4')">
                        <div class="hist-acc-title">
                            <span class="acc-num">4</span>
                            <strong>🤝 Encuadre y Acuerdos de Consulta</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Frecuencia Acordada:</strong> ${h.frequency || 'Por acordar'}</div>
                            <div><strong>Modalidad de Atención:</strong> ${h.modality || 'No definida'}</div>
                            <div><strong>Turno Preferente:</strong> ${h.shift || 'No definido'}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    // -------------------------------------------------------------
    // 2. RENDERIZADO DEL VISOR DE HISTORIA CLÍNICA EN ACORDEONES (8 BLOQUES)
    // -------------------------------------------------------------
    renderTabHistoriaIntegral(patient) {
        const cat = typeof getPatientCategory === 'function' ? getPatientCategory(patient) : (patient.category || 'adult');
        const h = this.getFullHistory(patient);
        const isChild = cat === 'child';
        const isTeen = cat === 'adolescent';
        const isAdult = cat === 'adult';

        const therapist = this.getTherapistInfo();
        const regInfo = therapist.registry ? ` · ${therapist.registry}` : '';

        if (isTeen) {
            return this.renderTeenHistoryIntegral(patient, h, therapist, regInfo);
        }

        const stageTitle = isChild ? '🧒 Historia Clínica Infantil (7 Pág.)' : '👤 Historia Clínica Adulto (5 Pág.)';

        return `
            <div class="clinical-history-toolbar">
                <div class="cht-title">
                    <span class="cht-badge">${stageTitle}</span>
                    <small>Modelo Oficial Protocolizado · ${therapist.name} (${therapist.specialty}${regInfo})</small>
                </div>
                <div class="cht-actions">
                    <button class="btn-primary" onclick="ClinicalHistorySystem.openFullHistoryEditor('${patient.id}')">
                        <i class="fas fa-edit"></i> Editar Historia Completa
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.openGenogramModal('${patient.id}')">
                        <i class="fas fa-sitemap"></i> Genograma
                    </button>
                    <button class="btn-secondary" onclick="ClinicalHistorySystem.exportHistoriaOficialPDF('${patient.id}')">
                        <i class="fas fa-print"></i> PDF Oficial
                    </button>
                </div>
            </div>

            ${isChild ? this.renderKidActivitiesCard(patient) : ''}

            <div class="accordion-history-container">
                <!-- BLOQUE 1: IDENTIFICACIÓN & FILIACIÓN -->
                <div class="hist-acc-item active" id="acc_sec_1">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_1')">
                        <div class="hist-acc-title">
                            <span class="acc-num">1</span>
                            <strong>📋 Identificación, Vínculos Filiatorios & Convivencia</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>C.I. / Documento:</strong> ${h.ci || patient.ci || 'Sin registrar'}</div>
                            <div><strong>Lugar de Nacimiento:</strong> ${h.birthPlace || 'No registrado'}</div>
                            <div><strong>Religión:</strong> ${h.religion || 'No profesa / No especificada'}</div>
                            <div><strong>Con quién vive:</strong> ${h.livesWith || patient.livesWith || 'No especificado'}</div>
                            <div style="grid-column:span 2;"><strong>Dirección Domiciliaria:</strong> ${h.address || patient.address || 'Sin registrar'}</div>
                            <div><strong>Referido por:</strong> ${h.referredBy || 'Deseabilidad propia'}</div>
                            <div><strong>Consulta previa:</strong> ${h.hasAttendedBefore === 'SI' ? `Sí (${h.previousAttendanceDate || 'Fecha no esp.'})` : 'Primera vez'}</div>
                        </div>

                        <div class="hist-sub-heading">👨‍👩‍👧 Datos Filiatorios de los Progenitores</div>
                        <div class="hist-grid-parents">
                            <div class="parent-box">
                                <h5>Madre: ${h.motherName || 'No registrada'}</h5>
                                <div><small>Edad: ${h.motherAge || '—'} · C.I: ${h.motherCI || '—'}</small></div>
                                <div><small>Escolaridad: ${h.motherEducation || '—'}</small></div>
                                <div><small>Ocupación: ${h.motherJob || '—'}</small></div>
                                <div><small>Domicilio: ${h.motherAddress || 'Mismo del paciente'}</small></div>
                            </div>
                            <div class="parent-box">
                                <h5>Padre: ${h.fatherName || 'No registrado'}</h5>
                                <div><small>Edad: ${h.fatherAge || '—'} · C.I: ${h.fatherCI || '—'}</small></div>
                                <div><small>Escolaridad: ${h.fatherEducation || '—'}</small></div>
                                <div><small>Ocupación: ${h.fatherJob || '—'}</small></div>
                                <div><small>Domicilio: ${h.fatherAddress || 'Mismo del paciente'}</small></div>
                            </div>
                        </div>
                        <div class="siblings-row">
                            <span><strong>Nº Hermanos:</strong> ${h.siblingsCount}</span>
                            <span><strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount}</span>
                            <span><strong>Nº Medios Hermanos:</strong> ${h.halfSiblingsCount}</span>
                        </div>
                    </div>
                </div>

                <!-- BLOQUE 2: MOTIVO & GESTUALIDAD OBSERVADA -->
                <div class="hist-acc-item" id="acc_sec_2">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_2')">
                        <div class="hist-acc-title">
                            <span class="acc-num">2</span>
                            <strong>👁️ Motivo de Consulta & Semiología Gestual</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Motivo de Consulta (Explícito):</label>
                            <p>${patient.reason || 'Sin motivo explicitado aún.'}</p>
                        </div>
                        <div class="hist-field-block highlight-semiology">
                            <label>🔍 Gestualidad Observada al Explicitar el Motivo de Consulta:</label>
                            <p>${h.observedGestures || '<em>Pendiente de registro semiológico durante la entrevista de exploración.</em>'}</p>
                        </div>
                        ${h.processExpectations ? `
                        <div class="hist-field-block">
                            <label>Expectativas del Proceso Terapéutico:</label>
                            <p>${h.processExpectations}</p>
                        </div>` : ''}
                    </div>
                </div>

                <!-- BLOQUE 3: EXAMEN MENTAL & SINTOMATOLOGÍA TRIPARTITA -->
                <div class="hist-acc-item" id="acc_sec_3">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_3')">
                        <div class="hist-acc-title">
                            <span class="acc-num">3</span>
                            <strong>🧠 Examen Mental & Tríada Sintomatológica</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-field-block">
                            <label>Examen Mental (Porte, Conciencia, Afecto, Pensamiento, Sensopercepción, Juicio):</label>
                            <p>${h.mentalExam || 'En evaluación psicopatológica clínica.'}</p>
                        </div>
                        <div class="symptom-triad-grid">
                            <div class="triad-card">
                                <h6>🏃 Características Conductuales</h6>
                                <p>${h.symptomsBehavioral || 'Sin reporte conductual'}</p>
                            </div>
                            <div class="triad-card">
                                <h6>🎭 Características Emocionales</h6>
                                <p>${h.symptomsEmotional || 'Sin reporte emocional'}</p>
                            </div>
                            <div class="triad-card">
                                <h6>🫀 Características Orgánicas / Somáticas</h6>
                                <p>${h.symptomsOrganic || 'Sin reporte orgánico'}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- BLOQUE 4: ANTECEDENTES MÉDICOS Y NEUROLÓGICOS -->
                <div class="hist-acc-item" id="acc_sec_4">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_4')">
                        <div class="hist-acc-title">
                            <span class="acc-num">4</span>
                            <strong>🩺 Antecedentes Médicos, Neurológicos & Quirúrgicos</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <table class="hist-table-medical">
                            <tr><th>Indicador Clínico</th><th>Registro / Hallazgo</th></tr>
                            <tr><td>Evaluación Neurológica Previa</td><td>${h.neuroEvaluation || 'No referida / Negativa'}</td></tr>
                            <tr><td>Golpes, Caídas, Lesiones o Fracturas</td><td>${h.traumaInjuries || 'Sin antecedentes traumáticos craneoencefálicos'}</td></tr>
                            <tr><td>Operaciones / Cirugías</td><td>${h.surgeries || 'Ninguna'}</td></tr>
                            <tr><td>Convulsiones o Eventos Paroxísticos</td><td>${h.seizures || 'Negativo'}</td></tr>
                            <tr><td>Enfermedades Inmunológicas (Hepatitis, Viruela, etc.)</td><td>${h.immuneDiseases || 'Ninguna'}</td></tr>
                            <tr><td>Alergias</td><td>${h.allergies || 'No refiere'}</td></tr>
                            <tr><td>Tratamiento Médico Actual y Patologías</td><td>${h.medicalTreatment || patient.medication || 'Sin medicación'}</td></tr>
                            <tr><td>Antecedentes Médicos Familiares</td><td>${h.familyMedicalHistory || patient.familyHistory || 'No especificados'}</td></tr>
                            <tr><td>Antecedentes Psiquiátricos Personales</td><td>${h.patientPsychiatricHistory || 'Sin diagnósticos previos'}</td></tr>
                            <tr><td>Antecedentes Psiquiátricos Familiares</td><td>${h.familyPsychiatricHistory || 'No refiere'}</td></tr>
                            ${!isAdult ? `<tr><td>Evaluación Pedagógica Previa</td><td>${h.pedagogicalHistory || 'Sin tratamiento previo'}</td></tr>` : ''}
                        </table>
                    </div>
                </div>

                <!-- BLOQUE 5: NEURODESARROLLO PRENATAL, PARTO E HITOS (INFANTIL / ADOLESCENTE) -->
                ${!isAdult ? `
                <div class="hist-acc-item" id="acc_sec_5">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_5')">
                        <div class="hist-acc-title">
                            <span class="acc-num">5</span>
                            <strong>🍼 Neurodesarrollo Prenatal, Parto e Hitos 0-3 años</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Embarazo Deseado:</strong> ${h.pregnancyDesired}</div>
                            <div><strong>Embarazo Planificado:</strong> ${h.pregnancyPlanned}</div>
                            <div><strong>Nº de Embarazo:</strong> ${h.pregnancyNumber}</div>
                            <div><strong>Duración del Embarazo:</strong> ${h.pregnancyDuration}</div>
                            <div><strong>Tipo de Parto:</strong> ${h.deliveryType}</div>
                            <div><strong>Duración del Parto:</strong> ${h.deliveryDuration || 'No especificada'}</div>
                            <div><strong>Llanto al Nacer:</strong> ${h.birthCry}</div>
                            <div><strong>Posición del Bebé:</strong> ${h.babyPosition}</div>
                            <div><strong>Peso al Nacer:</strong> ${h.birthWeight || '—'}</div>
                            <div><strong>Talla / Medida:</strong> ${h.birthLength || '—'}</div>
                            <div><strong>Reanimación:</strong> ${h.resuscitation}</div>
                            <div><strong>Incubadora:</strong> ${h.incubator}</div>
                        </div>
                        <div class="hist-sub-heading">🌱 Hitos del Primer Año y Psicomotricidad</div>
                        <div class="milestones-chips">
                            <span>Sostén cefálico: <b>${h.headControl || 'Normal'}</b></span>
                            <span>Sedestación: <b>${h.sittingAge || '6m'}</b></span>
                            <span>Gateo: <b>${h.crawlingAge || '8m'}</b></span>
                            <span>Primeros pasos: <b>${h.firstStepsAge || '12m'}</b></span>
                            <span>Primeras palabras: <b>${h.firstWordsAge || '12m'}</b></span>
                            <span>Control esfínteres: <b>${h.sphincterControl || '2-3a'}</b></span>
                            <span>Destete: <b>${h.weaningDesc || 'Sin dificultad'}</b></span>
                        </div>
                    </div>
                </div>` : ''}

                <!-- BLOQUE 6: ESCOLARIDAD & DINÁMICA DE APRENDIZAJE -->
                ${!isAdult ? `
                <div class="hist-acc-item" id="acc_sec_6">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_6')">
                        <div class="hist-acc-title">
                            <span class="acc-num">6</span>
                            <strong>🏫 Escolaridad, Rendimiento & Apoyo Escolar</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Institución:</strong> ${patient.schoolName || 'Sin registrar'}</div>
                            <div><strong>Grado / Nivel:</strong> ${patient.schoolGrade || 'Sin registrar'}</div>
                            <div><strong>Inicio Escolaridad:</strong> ${h.schoolStartAge || '3 años'}</div>
                            <div><strong>Adaptación Escolar:</strong> ${h.schoolAdaptation || 'Favorable'}</div>
                            <div><strong>Relación con Maestras:</strong> ${h.teacherRelation || 'Buena'}</div>
                            <div><strong>Interacción con Pares:</strong> ${h.schoolFriends || 'Sociable'}</div>
                        </div>
                        <div class="hist-field-block" style="margin-top:10px;">
                            <label>Dificultades vs Facilidades de Aprendizaje:</label>
                            <p><strong>Mayor dificultad:</strong> ${h.learningDifficulties || 'Ninguna marcada'}<br>
                               <strong>Mayor facilidad:</strong> ${h.learningStrengths || 'Creatividad y lenguaje'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Apoyo en Tareas y Conducta:</label>
                            <p><strong>Apoyo en casa:</strong> ${h.homeworkSupport || 'Madre'}<br>
                               <strong>Conducta en aula:</strong> ${h.schoolBehavior || 'Acorde al encuadre escolar'}</p>
                        </div>
                    </div>
                </div>` : ''}

                <!-- BLOQUE 7: DIFERENCIADO ADOLESCENTE O ADULTO -->
                ${isTeen ? `
                <div class="hist-acc-item" id="acc_sec_7">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_7')">
                        <div class="hist-acc-title">
                            <span class="acc-num">7</span>
                            <strong>🧑‍🎤 Entrevista Confidencial con el Adolescente</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="teen-confidential-banner">
                            🔒 <strong>Espacio Reservado:</strong> Declaraciones directas del adolescente en el marco de la alianza terapéutica y el secreto profesional.
                        </div>
                        <div class="hist-field-block">
                            <label>Vivencia de su Infancia (Según el Adolescente):</label>
                            <p>${h.teenChildhood || 'Refiere recuerdos positivos y de juego.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Área Sexual, Afectiva e Identidad de Género:</label>
                            <p>${h.teenSexuality || 'En exploración saludable / Sin conflictos reportados.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Relaciones Interpersonales (Amistades y Pareja):</label>
                            <p>${h.teenRelationships || h.teenSocial || 'Grupo de pares estructurado.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Dinámica Familiar según su propia mirada:</label>
                            <p>${h.teenFamilyDynamics || 'Reporta buena comunicación con madre; fricción ocasional con límites.'}</p>
                        </div>
                        <div class="hist-field-block">
                            <label>Metas Personales Propias:</label>
                            <p><strong>Corto / Mediano plazo:</strong> ${h.teenShortGoals || 'Rendimiento académico y autonomía'}<br>
                               <strong>Largo plazo:</strong> ${h.teenLongGoals || 'Elección vocacional'}</p>
                        </div>
                    </div>
                </div>` : ''}

                ${isAdult ? `
                <div class="hist-acc-item" id="acc_sec_7">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_7')">
                        <div class="hist-acc-title">
                            <span class="acc-num">7</span>
                            <strong>💼 Situación Actual y Áreas de Vida Adulta</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Área Laboral:</strong> ${h.adultWork || patient.occupation || 'Activo laboralmente'}</div>
                            <div><strong>Área Sexual:</strong> ${h.adultSexual || 'Sin disfunciones reportadas'}</div>
                            <div><strong>Dinámica Familiar:</strong> ${h.adultFamilyDynamics || 'Convivencia armónica'}</div>
                            <div><strong>Área Social:</strong> ${h.adultSocial || 'Red de apoyo activa'}</div>
                            <div><strong>Área Espiritual:</strong> ${h.adultSpirituality || 'Valores personales'}</div>
                            <div><strong>Aspectos Legales:</strong> ${h.adultLegal || 'Sin antecedentes ni litigios'}</div>
                        </div>
                    </div>
                </div>` : ''}

                <!-- BLOQUE 8: VIVIENDA, HÁBITOS PSICOBIOLÓGICOS, SUEÑO & FOBIAS -->
                <div class="hist-acc-item" id="acc_sec_8">
                    <div class="hist-acc-header" onclick="ClinicalHistorySystem.toggleAccordion('acc_sec_8')">
                        <div class="hist-acc-title">
                            <span class="acc-num">8</span>
                            <strong>🏠 Vivienda, Hábitos Psicobiológicos, Sueño & Fobias</strong>
                        </div>
                        <i class="fas fa-chevron-down acc-arrow"></i>
                    </div>
                    <div class="hist-acc-body">
                        <div class="hist-grid-data">
                            <div><strong>Tipo de Vivienda:</strong> ${h.housingType}</div>
                            <div><strong>Servicios Básicos:</strong> ${h.housingServices}</div>
                            <div><strong>Comparte Habitación:</strong> ${h.housingSharesRoom} ${h.housingSharesRoomDesc ? `(${h.housingSharesRoomDesc})` : ''}</div>
                            <div><strong>Convivientes Hogar:</strong> Adultos: ${h.occupantsAdultsM}M/${h.occupantsAdultsF}F · Jóvenes: ${h.occupantsTeensM}M/${h.occupantsTeensF}F · Niños: ${h.occupantsChildrenM}M/${h.occupantsChildrenF}F</div>
                        </div>

                        <div class="hist-sub-heading">🌿 Hábitos Psicobiológicos y Patrones Conductuales</div>
                        <table class="hist-table-medical">
                            <tr><th>Indicador</th><th>Observación Clínica</th></tr>
                            <tr><td>Consumos / Adicciones (Alcohol, Nicotina, Pantallas, Drogas)</td><td>${h.addictions || 'Negativo'}</td></tr>
                            <tr><td>Manías Sociales, Tics o Rutinas Espaciales</td><td>${h.socialManias || 'No manifiesta tics ni rituales compulsivos'}</td></tr>
                            <tr><td>Fobias o Miedo Intenso</td><td>${h.phobias || 'Sin fobias específicas'}</td></tr>
                            <tr><td>Miedos Nocturnos / Pesadillas</td><td>${h.nightTerrors || 'Negativo'}</td></tr>
                            <tr><td>Onicofagia (Comerse las uñas)</td><td>${h.onychophagy || 'No presenta'}</td></tr>
                            <tr><td>Patrón de Sueño</td><td>${h.sleepPattern || 'Sueño reparador (7-8 hrs)'}</td></tr>
                            <tr><td>Alimentación</td><td>${h.eatingPattern || 'Apetito normal, 3 comidas al día'}</td></tr>
                            <tr><td>Higiene y Cuidado Personal</td><td>${h.hygienePattern || 'Adecuada presentación e higiene'}</td></tr>
                            <tr><td>Área Recreacional y Rutina Diaria</td><td>${h.dailyRoutine || h.recreationArea || 'Estructurada con tiempos de descanso'}</td></tr>
                        </table>
                    </div>
                </div>
            </div>
        `;
    },

    toggleAccordion(id) {
        const el = document.getElementById(id);
        if (el) el.classList.toggle('active');
    },

    // -------------------------------------------------------------
    // VISUALIZADOR DE ACTIVIDAD LÚDICA DEL PORTAL KIDS (PEDIÁTRICO)
    // -------------------------------------------------------------
    renderKidActivitiesCard(patient) {
        if (!patient) return '';
        let kidData = { avatar: null, stars: 0, activities: [] };
        try {
            const raw = localStorage.getItem(`psico_portal_kid_${patient.id}`);
            if (raw) kidData = JSON.parse(raw);
        } catch (e) {}

        const activities = (patient.kidActivities && patient.kidActivities.length > 0)
            ? patient.kidActivities
            : (kidData.activities || []);

        const avatar = (kidData.avatar && kidData.avatar.emoji) ? kidData.avatar : {
            emoji: '🦊',
            name: 'Zorrito Valiente',
            aura: 'aura-gold',
            accEmoji: '🦸'
        };

        const weatherAct = activities.find(a => a.activity_type === 'weather_body');
        const drawings = activities.filter(a => a.activity_type === 'drawing');
        const bubbleActs = activities.filter(a => a.activity_type === 'bubble_popped');
        const calmActs = activities.filter(a => a.activity_type === 'calm_breathing');

        return `
            <div class="kid-therapist-card" style="background: linear-gradient(135deg, #f0f7ff 0%, #fdf4ff 100%); border: 2px solid #b8c1ec; border-radius: 16px; padding: 18px 20px; margin-bottom: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 32px; background: #ffffff; border-radius: 50%; width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08); border: 2px solid #ffb703;">${avatar.emoji || '🦊'}</span>
                        <div>
                            <h4 style="margin: 0; font-size: 16px; font-weight: 800; color: #202923;">🌟 Actividad Lúdica del Paciente (Portal Kids)</h4>
                            <small style="color: #69736d;">Compañero Avatar: <strong>${avatar.name || 'Zorrito Valiente'} ${avatar.accEmoji || '🦸'}</strong> · Estrellas ganadas: <strong>⭐ ${kidData.stars || 0}</strong></small>
                        </div>
                    </div>
                    <span class="tag tag-success" style="font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 12px;">
                        <i class="fas fa-check-circle"></i> Sincronizado en Tiempo Real
                    </span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; margin-bottom: 12px;">
                    <!-- CLIMA & ZONA SOMÁTICA -->
                    <div style="background: #ffffff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">🌤️ Clima Emocional & Cuerpo</div>
                        ${weatherAct ? `
                            <div style="font-size: 14px; font-weight: 700; color: #1e293b;">${weatherAct.data?.weatherLabel || weatherAct.data?.weather || 'Registrado'}</div>
                            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Zona: <strong>${weatherAct.data?.bodyZoneLabel || weatherAct.data?.bodyZone || 'Corporal'}</strong></div>
                            <small style="color: #94a3b8; font-size: 10px;">${new Date(weatherAct.created_at || weatherAct.data?.recordedAt).toLocaleString('es-ES')}</small>
                        ` : '<div style="font-size: 12px; color: #94a3b8; font-style: italic;">Sin registro de clima reciente</div>'}
                    </div>

                    <!-- PREOCUPACIONES LIBERADAS -->
                    <div style="background: #ffffff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">🫧 Preocupaciones Soltadas</div>
                        <div style="font-size: 14px; font-weight: 700; color: #0284c7;">${bubbleActs.length} burbujas explotadas</div>
                        ${bubbleActs.length > 0 ? `
                            <div style="font-size: 12px; color: #475569; margin-top: 2px;">Última: "${bubbleActs[0].data?.worryText || 'Preocupación liberada'}"</div>
                        ` : '<div style="font-size: 12px; color: #94a3b8; font-style: italic;">Sin burbujas aún</div>'}
                    </div>

                    <!-- RESPIRACIÓN Y CALMA -->
                    <div style="background: #ffffff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 4px;">🎈 Globo de la Calma</div>
                        <div style="font-size: 14px; font-weight: 700; color: #c026d3;">${calmActs.length > 0 ? `${calmActs[0].data?.cyclesCompleted || calmActs.length} ciclos completados` : '0 ciclos'}</div>
                        <div style="font-size: 12px; color: #475569; margin-top: 2px;">Técnica diafragmática 4s/6s</div>
                    </div>
                </div>

                <!-- GALERÍA DE DIBUJOS DEL NIÑO -->
                ${drawings.length > 0 ? `
                    <div style="background: #ffffff; border-radius: 12px; padding: 12px 14px; border: 1px solid #e2e8f0;">
                        <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; margin-bottom: 8px;">🎨 Galería de Dibujos del Consultante (${drawings.length})</div>
                        <div style="display: flex; gap: 12px; overflow-x: auto; padding-bottom: 6px;">
                            ${drawings.map((d, idx) => `
                                <div style="flex-shrink: 0; text-align: center;">
                                    <img src="${d.data?.imageDataUrl || ''}" alt="Dibujo ${idx+1}" style="width: 140px; height: 95px; object-fit: cover; border-radius: 8px; border: 1.5px solid #cbd5e1; cursor: pointer;" onclick="ClinicalHistorySystem.previewKidDrawing('${d.data?.imageDataUrl || ''}')" title="Clic para ampliar dibujo">
                                    <div style="font-size: 10px; color: #64748b; margin-top: 2px;">${new Date(d.created_at || d.data?.sentAt).toLocaleDateString('es-ES')}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    previewKidDrawing(dataUrl) {
        if (!dataUrl) return;
        const w = window.open('');
        if (w) {
            w.document.write('<html><head><title>Dibujo del Paciente - Portal Kids</title><style>body{margin:0;display:flex;align-items:center;justify-content:center;background:#1e293b;height:100vh;}img{max-width:90%;max-height:90%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,0.5);background:#fff;}</style></head><body><img src="' + dataUrl + '"></body></html>');
        }
    },

    // -------------------------------------------------------------
    // 3. EDITOR MODAL COMPLETO DE LA HISTORIA CLÍNICA (TABS)
    // -------------------------------------------------------------
    openFullHistoryEditor(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;
        const cat = typeof getPatientCategory === 'function' ? getPatientCategory(patient) : (patient.category || 'adult');
        const h = this.getFullHistory(patient);

        let modal = document.getElementById('fullHistoryModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'fullHistoryModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const therapist = this.getTherapistInfo();
        const therapistTag = therapist.registry ? `${therapist.name} (${therapist.registry})` : therapist.name;

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('fullHistoryModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;">
                <div class="modal-header">
                    <div>
                        <h2 style="margin:0;">📑 Expediente Clínico Completo — ${patient.name}</h2>
                        <small style="color:var(--text-tertiary);">Formato Oficial Protocolizado · ${therapistTag} · Etapa: ${cat === 'child' ? 'Niñez' : cat === 'adolescent' ? 'Adolescencia' : 'Adultez'}</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('fullHistoryModal')"><i class="fas fa-times"></i></button>
                </div>
                
                <div class="history-editor-nav">
                    <button type="button" class="hist-nav-tab active" onclick="ClinicalHistorySystem.switchEditorTab('filiacion', this)">1. Filiación & Genograma</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('motivo', this)">2. Motivo & Semiología</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('mental', this)">3. Examen Mental</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('medico', this)">4. Médicos & Neuro</button>
                    ${cat !== 'adult' ? '<button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab(\'perinatal\', this)">5. Perinatal & Hitos</button>' : ''}
                    ${cat !== 'adult' ? '<button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab(\'escolar\', this)">6. Escolaridad</button>' : ''}
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('etapa', this)">${cat === 'adolescent' ? '7. Entrevista Menor' : '7. Áreas Vitales'}</button>
                    <button type="button" class="hist-nav-tab" onclick="ClinicalHistorySystem.switchEditorTab('habitos', this)">8. Vivienda & Hábitos</button>
                </div>

                <form id="fullHistoryForm" style="flex:1;overflow-y:auto;padding:20px;" onsubmit="ClinicalHistorySystem.handleSaveFullHistory(event, '${patientId}')">
                    <!-- TAB 1: FILIACIÓN -->
                    <div id="htab-filiacion" class="hist-tab-pane active">
                        <h4>Identificación del Paciente</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Cédula de Identidad (C.I.):</label><input type="text" id="fh_ci" value="${h.ci}"></div>
                            <div class="form-group"><label>Lugar de Nacimiento:</label><input type="text" id="fh_birthPlace" value="${h.birthPlace}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Religión / Creencias:</label><input type="text" id="fh_religion" value="${h.religion}"></div>
                            <div class="form-group"><label>Personas con las que vive:</label><input type="text" id="fh_livesWith" value="${h.livesWith}"></div>
                        </div>
                        <div class="form-group"><label>Dirección / Domicilio:</label><input type="text" id="fh_address" value="${h.address}"></div>
                        
                        <h4 style="margin-top:20px;">Datos de los Padres</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Nombre de la Madre:</label><input type="text" id="fh_motherName" value="${h.motherName}"></div>
                            <div class="form-group"><label>Edad / C.I. Madre:</label><input type="text" id="fh_motherCI" value="${h.motherCI}" placeholder="Ej: 42 años - V-14.889.332"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Escolaridad / Ocupación Madre:</label><input type="text" id="fh_motherJob" value="${h.motherJob}"></div>
                            <div class="form-group"><label>Domicilio Madre:</label><input type="text" id="fh_motherAddress" value="${h.motherAddress}"></div>
                        </div>
                        <div class="form-row" style="margin-top:10px;">
                            <div class="form-group"><label>Nombre del Padre:</label><input type="text" id="fh_fatherName" value="${h.fatherName}"></div>
                            <div class="form-group"><label>Edad / C.I. Padre:</label><input type="text" id="fh_fatherCI" value="${h.fatherCI}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Escolaridad / Ocupación Padre:</label><input type="text" id="fh_fatherJob" value="${h.fatherJob}"></div>
                            <div class="form-group"><label>Domicilio Padre:</label><input type="text" id="fh_fatherAddress" value="${h.fatherAddress}"></div>
                        </div>
                        <h4 style="margin-top:20px;">Hermanos</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Nº Hermanos:</label><input type="number" id="fh_siblingsCount" value="${h.siblingsCount}"></div>
                            <div class="form-group"><label>Nº Hermanastros:</label><input type="number" id="fh_stepSiblingsCount" value="${h.stepSiblingsCount}"></div>
                            <div class="form-group"><label>Nº Medios Hermanos:</label><input type="number" id="fh_halfSiblingsCount" value="${h.halfSiblingsCount}"></div>
                        </div>
                    </div>

                    <!-- TAB 2: MOTIVO & GESTUALIDAD -->
                    <div id="htab-motivo" class="hist-tab-pane">
                        <div class="form-group">
                            <label>Motivo de Consulta Explicitado:</label>
                            <textarea id="fh_reason" rows="3">${patient.reason || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>🔍 Gestualidad Observada al Explicitar el Motivo (Tensión, postura, llanto, evitación de mirada):</label>
                            <textarea id="fh_observedGestures" rows="4" placeholder="Describa la gestualidad y microexpresiones registradas...">${h.observedGestures}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Expectativas del Proceso Terapéutico:</label>
                            <textarea id="fh_processExpectations" rows="2">${h.processExpectations}</textarea>
                        </div>
                    </div>

                    <!-- TAB 3: EXAMEN MENTAL -->
                    <div id="htab-mental" class="hist-tab-pane">
                        <div class="form-group">
                            <label>Examen Mental Completo:</label>
                            <textarea id="fh_mentalExam" rows="4" placeholder="Porte, actitud, orientación témporo-espacial, atención, afecto, curso del pensamiento, juicio e introspección...">${h.mentalExam}</textarea>
                        </div>
                        <h4>Tríada Sintomatológica</h4>
                        <div class="form-group"><label>Características Conductuales:</label><textarea id="fh_symptomsBehavioral" rows="2">${h.symptomsBehavioral}</textarea></div>
                        <div class="form-group"><label>Características Emocionales:</label><textarea id="fh_symptomsEmotional" rows="2">${h.symptomsEmotional}</textarea></div>
                        <div class="form-group"><label>Características Orgánicas / Somáticas:</label><textarea id="fh_symptomsOrganic" rows="2">${h.symptomsOrganic}</textarea></div>
                    </div>

                    <!-- TAB 4: ANTECEDENTES MÉDICOS -->
                    <div id="htab-medico" class="hist-tab-pane">
                        <div class="form-row">
                            <div class="form-group"><label>Evaluación Neurológica Previa:</label><input type="text" id="fh_neuroEvaluation" value="${h.neuroEvaluation}"></div>
                            <div class="form-group"><label>Golpes, caídas, esguinces o fracturas:</label><input type="text" id="fh_traumaInjuries" value="${h.traumaInjuries}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Operaciones / Cirugías:</label><input type="text" id="fh_surgeries" value="${h.surgeries}"></div>
                            <div class="form-group"><label>Convulsiones:</label><input type="text" id="fh_seizures" value="${h.seizures}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Enfermedades Inmunológicas:</label><input type="text" id="fh_immuneDiseases" value="${h.immuneDiseases}"></div>
                            <div class="form-group"><label>Alergias:</label><input type="text" id="fh_allergies" value="${h.allergies}"></div>
                        </div>
                        <div class="form-group"><label>Tratamiento Médico Actual:</label><input type="text" id="fh_medicalTreatment" value="${h.medicalTreatment}"></div>
                        <div class="form-group"><label>Antecedentes Médicos Familiares:</label><textarea id="fh_familyMedicalHistory" rows="2">${h.familyMedicalHistory}</textarea></div>
                        <div class="form-group"><label>Antecedentes Psiquiátricos Familiares:</label><textarea id="fh_familyPsychiatricHistory" rows="2">${h.familyPsychiatricHistory}</textarea></div>
                    </div>

                    <!-- TAB 5: PERINATAL (Si es Niño o Adolescente) -->
                    ${cat !== 'adult' ? `
                    <div id="htab-perinatal" class="hist-tab-pane">
                        <div class="form-row">
                            <div class="form-group"><label>Embarazo Deseado:</label><select id="fh_pregnancyDesired"><option ${h.pregnancyDesired==='SI'?'selected':''}>SI</option><option ${h.pregnancyDesired==='NO'?'selected':''}>NO</option></select></div>
                            <div class="form-group"><label>Embarazo Planificado:</label><select id="fh_pregnancyPlanned"><option ${h.pregnancyPlanned==='SI'?'selected':''}>SI</option><option ${h.pregnancyPlanned==='NO'?'selected':''}>NO</option></select></div>
                            <div class="form-group"><label>Tipo de Parto:</label><select id="fh_deliveryType"><option ${h.deliveryType==='Espontáneo'?'selected':''}>Espontáneo</option><option ${h.deliveryType==='Inducido'?'selected':''}>Inducido</option><option ${h.deliveryType==='Cesárea'?'selected':''}>Cesárea</option><option ${h.deliveryType==='Natural'?'selected':''}>Natural</option></select></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Peso al nacer:</label><input type="text" id="fh_birthWeight" value="${h.birthWeight}"></div>
                            <div class="form-group"><label>Talla al nacer:</label><input type="text" id="fh_birthLength" value="${h.birthLength}"></div>
                            <div class="form-group"><label>Llanto al nacer:</label><select id="fh_birthCry"><option ${h.birthCry==='SI'?'selected':''}>SI</option><option ${h.birthCry==='NO'?'selected':''}>NO</option></select></div>
                        </div>
                        <div class="form-group"><label>Desarrollo fetal y estado emocional materno en gestación:</label><textarea id="fh_motherEmotionalState" rows="2">${h.motherEmotionalState}</textarea></div>
                        <h4>Hitos Primeros Años</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Primeros pasos (edad):</label><input type="text" id="fh_firstStepsAge" value="${h.firstStepsAge}"></div>
                            <div class="form-group"><label>Primeras palabras:</label><input type="text" id="fh_firstWordsAge" value="${h.firstWordsAge}"></div>
                            <div class="form-group"><label>Control de esfínteres:</label><input type="text" id="fh_sphincterControl" value="${h.sphincterControl}"></div>
                        </div>
                    </div>` : ''}

                    <!-- TAB 6: ESCOLARIDAD -->
                    ${cat !== 'adult' ? `
                    <div id="htab-escolar" class="hist-tab-pane">
                        <div class="form-row">
                            <div class="form-group"><label>Escuela / Grado:</label><input type="text" id="fh_schoolGrade" value="${patient.schoolGrade || ''}"></div>
                            <div class="form-group"><label>Adaptación Escolar:</label><input type="text" id="fh_schoolAdaptation" value="${h.schoolAdaptation}"></div>
                        </div>
                        <div class="form-group"><label>Dificultades en el Aprendizaje:</label><textarea id="fh_learningDifficulties" rows="2">${h.learningDifficulties}</textarea></div>
                        <div class="form-group"><label>Conducta en el Colegio:</label><textarea id="fh_schoolBehavior" rows="2">${h.schoolBehavior}</textarea></div>
                    </div>` : ''}

                    <!-- TAB 7: DIFERENCIADO ADOLESCENTE O ADULTO -->
                    <div id="htab-etapa" class="hist-tab-pane">
                        ${cat === 'adolescent' ? `
                        <h4>Entrevista Privada con el Adolescente</h4>
                        <div class="form-group"><label>Vivencia de su Infancia:</label><textarea id="fh_teenChildhood" rows="2">${h.teenChildhood}</textarea></div>
                        <div class="form-group"><label>Área Sexual e Identidad de Género:</label><textarea id="fh_teenSexuality" rows="2">${h.teenSexuality}</textarea></div>
                        <div class="form-group"><label>Amistades y Relaciones de Pareja:</label><textarea id="fh_teenRelationships" rows="2">${h.teenRelationships}</textarea></div>
                        <div class="form-group"><label>Metas Personales a Corto y Largo Plazo:</label><textarea id="fh_teenShortGoals" rows="2">${h.teenShortGoals}</textarea></div>
                        ` : `
                        <h4>Áreas de Vida Adulta</h4>
                        <div class="form-group"><label>Área Laboral y Desempeño:</label><textarea id="fh_adultWork" rows="2">${h.adultWork}</textarea></div>
                        <div class="form-group"><label>Área Sexual y Afectiva:</label><textarea id="fh_adultSexual" rows="2">${h.adultSexual}</textarea></div>
                        <div class="form-group"><label>Aspectos Legales o Judiciales:</label><textarea id="fh_adultLegal" rows="2">${h.adultLegal}</textarea></div>
                        <div class="form-group"><label>Área Espiritual:</label><textarea id="fh_adultSpirituality" rows="2">${h.adultSpirituality}</textarea></div>
                        `}
                    </div>

                    <!-- TAB 8: VIVIENDA & HÁBITOS -->
                    <div id="htab-habitos" class="hist-tab-pane">
                        <div class="form-row">
                            <div class="form-group"><label>Tipo de Vivienda:</label><input type="text" id="fh_housingType" value="${h.housingType}"></div>
                            <div class="form-group"><label>Comparte habitación:</label><input type="text" id="fh_housingSharesRoom" value="${h.housingSharesRoom}"></div>
                        </div>
                        <h4>Hábitos Psicobiológicos</h4>
                        <div class="form-row">
                            <div class="form-group"><label>Consumo / Adicciones:</label><input type="text" id="fh_addictions" value="${h.addictions}"></div>
                            <div class="form-group"><label>Fobias o Miedo Intenso:</label><input type="text" id="fh_phobias" value="${h.phobias}"></div>
                        </div>
                        <div class="form-row">
                            <div class="form-group"><label>Patrón de Sueño:</label><input type="text" id="fh_sleepPattern" value="${h.sleepPattern}"></div>
                            <div class="form-group"><label>Onicofagia (Comerse uñas):</label><input type="text" id="fh_onychophagy" value="${h.onychophagy}"></div>
                        </div>
                        <div class="form-group"><label>Rutina Diaria y Ocio:</label><textarea id="fh_dailyRoutine" rows="2">${h.dailyRoutine}</textarea></div>
                    </div>

                    <div class="modal-actions" style="margin-top:20px;">
                        <button type="button" class="btn-secondary" onclick="closeModal('fullHistoryModal')">Cerrar</button>
                        <button type="submit" class="btn-primary"><i class="fas fa-save"></i> Guardar Historia Clínica</button>
                    </div>
                </form>
            </div>
        `;

        openModal('fullHistoryModal');
    },

    switchEditorTab(tabKey, btn) {
        document.querySelectorAll('.hist-nav-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.hist-tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        const target = document.getElementById(`htab-${tabKey}`);
        if (target) target.classList.add('active');
    },

    handleSaveFullHistory(e, patientId) {
        e.preventDefault();
        const p = AppState.patients.find(x => x.id === patientId);
        if (!p) return;

        // Extraer valores del form
        const getVal = id => {
            const el = document.getElementById(id);
            return el ? el.value.trim() : '';
        };

        p.ci = getVal('fh_ci') || p.ci;
        p.birthPlace = getVal('fh_birthPlace');
        p.religion = getVal('fh_religion');
        p.livesWith = getVal('fh_livesWith');
        p.address = getVal('fh_address');
        p.motherName = getVal('fh_motherName');
        p.motherCI = getVal('fh_motherCI');
        p.motherJob = getVal('fh_motherJob');
        p.motherAddress = getVal('fh_motherAddress');
        p.fatherName = getVal('fh_fatherName');
        p.fatherCI = getVal('fh_fatherCI');
        p.fatherJob = getVal('fh_fatherJob');
        p.fatherAddress = getVal('fh_fatherAddress');
        p.siblingsCount = getVal('fh_siblingsCount');
        p.stepSiblingsCount = getVal('fh_stepSiblingsCount');
        p.halfSiblingsCount = getVal('fh_halfSiblingsCount');

        p.reason = getVal('fh_reason') || p.reason;
        p.observedGestures = getVal('fh_observedGestures');
        p.processExpectations = getVal('fh_processExpectations');

        p.mentalExam = getVal('fh_mentalExam');
        p.symptomsBehavioral = getVal('fh_symptomsBehavioral');
        p.symptomsEmotional = getVal('fh_symptomsEmotional');
        p.symptomsOrganic = getVal('fh_symptomsOrganic');

        p.neuroEvaluation = getVal('fh_neuroEvaluation');
        p.traumaInjuries = getVal('fh_traumaInjuries');
        p.surgeries = getVal('fh_surgeries');
        p.seizures = getVal('fh_seizures');
        p.immuneDiseases = getVal('fh_immuneDiseases');
        p.allergies = getVal('fh_allergies');
        p.medicalTreatment = getVal('fh_medicalTreatment');
        p.familyMedicalHistory = getVal('fh_familyMedicalHistory');
        p.familyPsychiatricHistory = getVal('fh_familyPsychiatricHistory');

        p.pregnancyDesired = getVal('fh_pregnancyDesired') || p.pregnancyDesired;
        p.pregnancyPlanned = getVal('fh_pregnancyPlanned') || p.pregnancyPlanned;
        p.deliveryType = getVal('fh_deliveryType') || p.deliveryType;
        p.birthWeight = getVal('fh_birthWeight');
        p.birthLength = getVal('fh_birthLength');
        p.birthCry = getVal('fh_birthCry') || p.birthCry;
        p.motherEmotionalState = getVal('fh_motherEmotionalState');
        p.firstStepsAge = getVal('fh_firstStepsAge');
        p.firstWordsAge = getVal('fh_firstWordsAge');
        p.sphincterControl = getVal('fh_sphincterControl');

        p.schoolGrade = getVal('fh_schoolGrade') || p.schoolGrade;
        p.schoolAdaptation = getVal('fh_schoolAdaptation');
        p.learningDifficulties = getVal('fh_learningDifficulties');
        p.schoolBehavior = getVal('fh_schoolBehavior');

        p.teenChildhood = getVal('fh_teenChildhood');
        p.teenSexuality = getVal('fh_teenSexuality');
        p.teenRelationships = getVal('fh_teenRelationships');
        p.teenShortGoals = getVal('fh_teenShortGoals');

        p.adultWork = getVal('fh_adultWork');
        p.adultSexual = getVal('fh_adultSexual');
        p.adultLegal = getVal('fh_adultLegal');
        p.adultSpirituality = getVal('fh_adultSpirituality');

        p.housingType = getVal('fh_housingType');
        p.housingSharesRoom = getVal('fh_housingSharesRoom');
        p.addictions = getVal('fh_addictions');
        p.phobias = getVal('fh_phobias');
        p.sleepPattern = getVal('fh_sleepPattern');
        p.onychophagy = getVal('fh_onychophagy');
        p.dailyRoutine = getVal('fh_dailyRoutine');

        saveData();
        closeModal('fullHistoryModal');
        showToast('Historia Clínica guardada con éxito', 'success');

        // Refrescar visor si está abierto
        const tabHistoria = document.getElementById('tab-historia');
        if (tabHistoria) {
            tabHistoria.innerHTML = ClinicalHistorySystem.renderTabHistoriaIntegral(p);
        }
    },

    // -------------------------------------------------------------
    // 4. MODAL DEL GENOGRAMA FAMILIAR INTERACTIVO
    // -------------------------------------------------------------
    openGenogramModal(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;
        const h = this.getFullHistory(patient);

        let modal = document.getElementById('genogramModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'genogramModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('genogramModal')"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>🌳 Genograma Familiar — ${patient.name}</h2>
                    <button class="btn-icon" onclick="closeModal('genogramModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px;">
                    <div class="genogram-canvas-box">
                        <svg class="genogram-svg" viewBox="0 0 600 320" xmlns="http://www.w3.org/2000/svg">
                            <!-- Conector de Padres -->
                            <line x1="180" y1="80" x2="420" y2="80" stroke="#0d9488" stroke-width="2.5" />
                            <line x1="300" y1="80" x2="300" y2="180" stroke="#0d9488" stroke-width="2.5" />

                            <!-- Padre (Cuadrado) -->
                            <rect x="140" y="40" width="80" height="80" rx="8" fill="#e2e8f0" stroke="#334155" stroke-width="2"/>
                            <text x="180" y="75" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">PADRE</text>
                            <text x="180" y="95" text-anchor="middle" font-size="10" fill="#475569">${h.fatherName || 'Padre'}</text>

                            <!-- Madre (Círculo) -->
                            <circle cx="420" cy="80" r="40" fill="#fce7f3" stroke="#db2777" stroke-width="2"/>
                            <text x="420" y="78" text-anchor="middle" font-size="12" font-weight="bold" fill="#0f172a">MADRE</text>
                            <text x="420" y="95" text-anchor="middle" font-size="10" fill="#475569">${h.motherName || 'Madre'}</text>

                            <!-- Ramas a hijos -->
                            <line x1="200" y1="180" x2="400" y2="180" stroke="#0d9488" stroke-width="2" />
                            <line x1="200" y1="180" x2="200" y2="220" stroke="#0d9488" stroke-width="2" />
                            <line x1="300" y1="180" x2="300" y2="220" stroke="#0d9488" stroke-width="2" />
                            <line x1="400" y1="180" x2="400" y2="220" stroke="#0d9488" stroke-width="2" />

                            <!-- Paciente Identificado (Centro) -->
                            <rect x="255" y="220" width="90" height="70" rx="8" fill="#ccfbf1" stroke="#0d9488" stroke-width="3"/>
                            <text x="300" y="250" text-anchor="middle" font-size="11" font-weight="bold" fill="#0d9488">★ PACIENTE</text>
                            <text x="300" y="270" text-anchor="middle" font-size="10" fill="#0f172a">${patient.name.split(' ')[0]}</text>

                            <!-- Hermano 1 / Hermanos -->
                            <rect x="160" y="225" width="80" height="60" rx="6" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
                            <text x="200" y="255" text-anchor="middle" font-size="10" fill="#334155">Hermano(s)</text>
                            <text x="200" y="272" text-anchor="middle" font-size="9" fill="#64748b">(${h.siblingsCount} reg.)</text>

                            <!-- Hermano 2 / Convivencia -->
                            <circle cx="400" cy="255" r="30" fill="#f1f5f9" stroke="#64748b" stroke-width="1.5"/>
                            <text x="400" y="258" text-anchor="middle" font-size="10" fill="#334155">Hogar</text>
                        </svg>
                    </div>
                    <div style="margin-top:14px;background:var(--bg-secondary);padding:12px;border-radius:8px;font-size:12px;">
                        <strong>Simbología Clínica Internacional:</strong> Cuadrado = Varón | Círculo = Mujer | Doble borde / Color resaltado = Paciente Índice Identificado.
                    </div>
                </div>
            </div>
        `;
        openModal('genogramModal');
    },

    // -------------------------------------------------------------
    // 5. EXPORTACIÓN PDF OFICIAL PROTOCOLIZADA CON MEMBRETE Y SELLO
    // -------------------------------------------------------------
    exportHistoriaOficialAdolescentePDF(patient, h, age, therapist) {
        const referralText = (h.referral && h.referral.length > 0) ? h.referral.join(', ') : (h.referredBy || 'No aplica');
        const displayAge = h.age ? `${h.age} años` : (age ? `${age} años` : '—');
        const therapistRegistry = therapist.registry ? ` · ${therapist.registry}` : '';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>HISTORIA CLÍNICA ADOLESCENTE - ${patient.name}</title>
    <style>
        @page { size: letter; margin: 16mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.35; font-size: 10.5pt; margin: 0; padding: 0; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px; }
        .psi-symbol { font-size: 38pt; line-height: 1; font-family: serif; }
        .therapist-badge { text-align: right; font-size: 10pt; line-height: 1.25; }
        h1.doc-title { text-align: center; font-size: 13.5pt; font-weight: bold; margin: 10px 0 14px 0; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
        .status-bar { border: 1px solid #444; background: #f9f9f9; padding: 6px 10px; margin-bottom: 12px; font-size: 9.5pt; display: flex; justify-content: space-between; }
        .section-header { font-weight: bold; text-transform: uppercase; font-size: 10pt; margin-top: 12px; margin-bottom: 5px; letter-spacing: 0.3px; background: #eee; padding: 3px 6px; border-left: 3px solid #000; }
        table.clinical-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 9.5pt; }
        table.clinical-table th, table.clinical-table td { border: 1px solid #222; padding: 4px 7px; vertical-align: top; }
        table.clinical-table th { background-color: #f2f2f2; font-weight: bold; text-align: left; }
        .box-container { border: 1px solid #222; padding: 6px 8px; margin-bottom: 8px; min-height: 38px; font-size: 9.5pt; line-height: 1.35; }
        .page-break { page-break-after: always; }
        .footer-seal { margin-top: 40px; text-align: center; font-size: 9.5pt; }
        .seal-line { width: 260px; margin: 0 auto; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <div class="official-header">
        <div class="psi-symbol">Ψ</div>
        <div class="therapist-badge">
            ${therapist.specialty}<br>
            <strong>${therapist.name}</strong><br>
            ${therapist.registry}
        </div>
    </div>

    <h1 class="doc-title">HISTORIA CLÍNICA ADOLESCENTE</h1>

    <div class="status-bar">
        <span><strong>Estatus del Paciente:</strong> ${h.status || 'Por iniciar'}</span>
        <span><strong>Frecuencia:</strong> ${h.frequency || 'Por acordar'}</span>
        <span><strong>Modalidad:</strong> ${h.modality || 'No definida'}</span>
        <span><strong>Turno:</strong> ${h.shift || 'No definido'}</span>
    </div>

    <div class="section-header">1. FICHA DEL PACIENTE (ADOLESCENTE)</div>
    <table class="clinical-table">
        <tr>
            <td colspan="2"><strong>Nombre Completo:</strong> ${patient.name}</td>
            <td><strong>Edad:</strong> ${displayAge}</td>
        </tr>
        <tr>
            <td><strong>Sexo / Género:</strong> ${patient.gender || '—'}</td>
            <td><strong>Nivel de Escolaridad:</strong> ${h.schoolGrade || '—'}</td>
            <td><strong>Vive con:</strong> ${h.livesWith || '—'}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>Referido por:</strong> ${referralText}</td>
            <td><strong>Correo Electrónico:</strong> ${patient.email || '—'}</td>
        </tr>
    </table>

    <div class="section-header">2. FICHA DEL REPRESENTANTE / TUTOR LEGAL</div>
    <table class="clinical-table">
        <tr>
            <td colspan="2"><strong>Nombre Completo del Representante:</strong> ${h.guardianName || '—'}</td>
            <td><strong>Parentesco:</strong> ${h.guardianRelation || '—'}</td>
        </tr>
        <tr>
            <td><strong>Edad:</strong> ${h.guardianAge ? h.guardianAge + ' años' : '—'}</td>
            <td><strong>Nivel de Escolaridad:</strong> ${h.guardianSchooling || '—'}</td>
            <td><strong>Ocupación:</strong> ${h.guardianOccupation || '—'}</td>
        </tr>
        <tr>
            <td><strong>Estado Civil:</strong> ${h.guardianMaritalStatus || '—'}</td>
            <td><strong>Teléfono:</strong> ${h.guardianPhone || '—'}</td>
            <td><strong>Correo Electrónico:</strong> ${h.guardianEmail || '—'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Consentimiento Informado:</strong> ${h.guardianConsent === 'firmado' ? 'SI [X]  FIRMADO Y EN CUSTODIA CLÍNICA' : 'PENDIENTE DE FIRMA'}</td>
        </tr>
    </table>

    <div class="section-header">3. INFORMACIÓN REFERENTE A LA CONSULTA PSICOLÓGICA</div>
    <table class="clinical-table">
        <tr>
            <td><strong>¿Ha asistido antes a Consulta Psicológica?:</strong> ${h.previousPsych === 'Si' ? 'SI [X]  NO [ ]' : 'SI [ ]  NO [X]'}</td>
            <td><strong>Nombre de la Persona que solicita:</strong> ${h.applicantName || '—'}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>¿Quién tomó la iniciativa de la Consulta?:</strong> ${h.initiative || '—'} ${h.initiative === 'Otro' && h.initiativeOther ? '(' + h.initiativeOther + ')' : ''}</td>
        </tr>
    </table>

    <div style="font-weight:bold; font-size:9.5pt; margin-top:6px;">Motivo de Consulta:</div>
    <div class="box-container">${patient.reason || 'Sin motivo explicitado aún.'}</div>

    <div style="font-weight:bold; font-size:9.5pt; margin-top:6px;">Objetivos del Paciente:</div>
    <div class="box-container">${patient.goals || 'Sin objetivos explicitados aún.'}</div>

    <div class="section-header">HIPÓTESIS BIOPSICOSOCIALES DE COMPRENSIÓN CLÍNICA</div>
    <table class="clinical-table">
        <tr><th style="width:30%;">Dimensión</th><th>Hipótesis Clínica</th></tr>
        <tr><td><strong>Hipótesis Biológica</strong></td><td>${h.bioHypothesis || 'Sin hallazgos biológicos reportados.'}</td></tr>
        <tr><td><strong>Hipótesis Social y Familiar</strong></td><td>${h.socialHypothesis || 'Dinámica y contexto social en evaluación.'}</td></tr>
        <tr><td><strong>Hipótesis Psicológica</strong></td><td>${h.psychHypothesis || 'Comprensión psicológica intrapsíquica y vincular.'}</td></tr>
    </table>

    <div class="section-header">FACTORES DE RIESGO, VULNERABILIDAD Y PROTECCIÓN</div>
    <table class="clinical-table">
        <tr><th style="width:30%;">Factor</th><th>Evaluación Clínica</th></tr>
        <tr><td><strong>Factores de Riesgo</strong></td><td>${h.riskFactors || 'Sin factores de riesgo reportados.'}</td></tr>
        <tr><td><strong>Factores de Vulnerabilidad</strong></td><td>${h.vulnerabilityFactors || 'Sin factores de vulnerabilidad reportados.'}</td></tr>
        <tr><td><strong>Factores de Protección</strong></td><td>${h.protectiveFactors || 'Red familiar, factores de resiliencia y recursos personales.'}</td></tr>
    </table>

    <div class="section-header">4. ENCUADRE Y ACUERDOS DE CONSULTA</div>
    <table class="clinical-table">
        <tr>
            <td><strong>Frecuencia Acordada:</strong> ${h.frequency || 'Por acordar'}</td>
            <td><strong>Modalidad:</strong> ${h.modality || 'No definida'}</td>
            <td><strong>Turno Preferente:</strong> ${h.shift || 'No definido'}</td>
        </tr>
    </table>

    <div class="footer-seal">
        <br><br>
        <div class="seal-line">
            ${therapist.name}<br>
            <span style="font-size:9pt; font-weight:normal;">${therapist.specialty}${therapistRegistry}</span>
        </div>
        <p style="font-size:8pt; color:#555; margin-top:6px;">Documento confidencial bajo secreto profesional. Ley de Ejercicio de la Psicología y Código de Deontología Médica.</p>
    </div>
</body>
</html>`;

        if (typeof window !== 'undefined' && window.open) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.focus();
                    printWindow.print();
                }, 600);
            }
        }
        return html;
    },

    exportHistoriaOficialPDF(patientId) {
        const patient = AppState.patients.find(p => p.id === patientId);
        if (!patient) return;
        const cat = typeof getPatientCategory === 'function' ? getPatientCategory(patient) : (patient.category || 'adult');
        const h = this.getFullHistory(patient);
        const age = patient.birthdate && typeof calculateAge === 'function' ? calculateAge(patient.birthdate) : (h.age || '');
        const therapist = this.getTherapistInfo();

        if (cat === 'adolescent') {
            return this.exportHistoriaOficialAdolescentePDF(patient, h, age, therapist);
        }

        const docTitle = cat === 'child' ? 'HISTORIA CLÍNICA INFANTIL' : 'HISTORIA CLÍNICA ADULTO';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${docTitle} - ${patient.name}</title>
    <style>
        @page { size: letter; margin: 18mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #111; line-height: 1.35; font-size: 11pt; margin: 0; padding: 0; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
        .psi-symbol { font-size: 42pt; line-height: 1; font-weight: normal; font-family: serif; }
        .therapist-badge { text-align: right; font-size: 10.5pt; line-height: 1.25; }
        h1.doc-title { text-align: center; font-size: 14pt; font-weight: bold; margin: 12px 0 16px 0; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1.5px solid #000; padding-bottom: 4px; }
        .meta-line { margin-bottom: 8px; font-size: 10.5pt; }
        .section-header { font-weight: bold; text-transform: uppercase; font-size: 10.5pt; margin-top: 14px; margin-bottom: 6px; letter-spacing: 0.3px; }
        table.clinical-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
        table.clinical-table th, table.clinical-table td { border: 1px solid #222; padding: 5px 8px; vertical-align: top; }
        table.clinical-table th { background-color: #f2f2f2; font-weight: bold; text-align: left; }
        .box-container { border: 1px solid #222; padding: 8px 10px; margin-bottom: 12px; min-height: 48px; font-size: 10pt; }
        .page-break { page-break-after: always; }
        .footer-seal { margin-top: 45px; text-align: center; font-size: 10pt; }
        .seal-line { width: 280px; margin: 0 auto; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <!-- PÁGINA 1 -->
    <div class="official-header">
        <div class="psi-symbol">Ψ</div>
        <div class="therapist-badge">
            ${therapist.specialty}<br>
            <strong>${therapist.name}</strong><br>
            ${therapist.registry}
        </div>
    </div>

    <h1 class="doc-title">${docTitle}</h1>

    <div class="meta-line">
        <strong>Ha asistido antes a Consulta Psicológica:</strong> ${h.hasAttendedBefore === 'SI' ? 'SI [X]  NO [ ]' : 'SI [ ]  NO [X]'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>Fecha:</strong> ${new Date().toLocaleDateString('es-ES')}
    </div>

    <div class="section-header">IDENTIFICACIÓN DEL PACIENTE:</div>
    <table class="clinical-table">
        <tr>
            <td colspan="2"><strong>Nombre Completo:</strong> ${patient.name}</td>
            <td><strong>C.I.:</strong> ${h.ci || '—'}</td>
        </tr>
        <tr>
            <td><strong>Lugar y Fecha de Nac.:</strong> ${h.birthPlace || 'No esp.'} · ${patient.birthdate || '—'}</td>
            <td><strong>Edad:</strong> ${age ? age + ' años' : '—'}</td>
            <td><strong>Sexo / Género:</strong> ${patient.gender || '—'}</td>
        </tr>
        <tr>
            <td><strong>Escolaridad / Nivel:</strong> ${patient.schoolGrade || h.motherEducation || 'Bachiller / Superior'}</td>
            <td><strong>Ocupación:</strong> ${patient.occupation || 'Estudiante'}</td>
            <td><strong>Estado Civil:</strong> ${patient.maritalStatus || 'Soltero(a)'}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>Vive con:</strong> ${h.livesWith || 'Familia de origen'}</td>
            <td><strong>Religión:</strong> ${h.religion || 'No esp.'}</td>
        </tr>
        <tr>
            <td colspan="2"><strong>Dirección / Domicilio:</strong> ${h.address || patient.address || '—'}</td>
            <td><strong>Teléfono:</strong> ${patient.phone || '—'}</td>
        </tr>
        <tr>
            <td colspan="3"><strong>Referido por:</strong> ${h.referredBy || 'Deseabilidad propia'}</td>
        </tr>
    </table>

    <div class="section-header">DATOS FILIATORIOS:</div>
    <table class="clinical-table">
        <tr>
            <td><strong>Madre:</strong> ${h.motherName || '—'}</td>
            <td><strong>Edad:</strong> ${h.motherAge || '—'}</td>
            <td><strong>C.I.:</strong> ${h.motherCI || '—'}</td>
            <td><strong>Ocupación:</strong> ${h.motherJob || '—'}</td>
        </tr>
        <tr>
            <td><strong>Padre:</strong> ${h.fatherName || '—'}</td>
            <td><strong>Edad:</strong> ${h.fatherAge || '—'}</td>
            <td><strong>C.I.:</strong> ${h.fatherCI || '—'}</td>
            <td><strong>Ocupación:</strong> ${h.fatherJob || '—'}</td>
        </tr>
        <tr>
            <td colspan="4">
                <strong>Nº Hermanos:</strong> ${h.siblingsCount} &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Hermanastros:</strong> ${h.stepSiblingsCount} &nbsp;&nbsp;&nbsp;&nbsp;
                <strong>Nº Medio Hermanos:</strong> ${h.halfSiblingsCount}
            </td>
        </tr>
    </table>

    <div class="section-header">MOTIVO DE CONSULTA:</div>
    <div class="box-container">${patient.reason || 'Sin motivo registrado.'}</div>

    <div class="section-header">GESTUALIDAD OBSERVADA AL MOMENTO DE EXPLICITAR MOTIVO DE CONSULTA:</div>
    <div class="box-container">${h.observedGestures || 'Paciente colaborador, tono de voz adecuado, congruente con el afecto.'}</div>

    <div class="page-break"></div>

    <!-- PÁGINA 2 -->
    <div class="official-header">
        <div class="psi-symbol">Ψ</div>
        <div class="therapist-badge">${therapist.specialty}<br><strong>${therapist.name}</strong> · ${therapist.registry}</div>
    </div>

    <div class="section-header">EXAMEN MENTAL:</div>
    <div class="box-container">${h.mentalExam || 'Paciente orientado en tiempo, espacio y persona. Memoria conservada, discurso coherente y fluido.'}</div>

    <div class="section-header">SINTOMATOLOGÍA PRESENTADA:</div>
    <table class="clinical-table">
        <tr><th style="width:35%;">Eje de Síntomas</th><th>Descripción Clínica</th></tr>
        <tr><td><strong>Características Conductuales</strong></td><td>${h.symptomsBehavioral || 'Sin alteraciones psicomotrices agudas.'}</td></tr>
        <tr><td><strong>Características Emocionales</strong></td><td>${h.symptomsEmotional || 'Afecto resonante, ansiedad situacional moderada.'}</td></tr>
        <tr><td><strong>Características Orgánicas</strong></td><td>${h.symptomsOrganic || 'Sin compromiso somático referido.'}</td></tr>
    </table>

    <div class="section-header">ANTECEDENTES DEL PACIENTE:</div>
    <table class="clinical-table">
        <tr><td style="width:40%;">Evaluación Neurológica previa</td><td>${h.neuroEvaluation || 'No realizada / Negativa'}</td></tr>
        <tr><td>Golpes, caídas, lesiones, esguinces o fracturas</td><td>${h.traumaInjuries || 'Sin antecedentes de traumatismo craneal'}</td></tr>
        <tr><td>Operaciones</td><td>${h.surgeries || 'Ninguna'}</td></tr>
        <tr><td>Convulsiones</td><td>${h.seizures || 'Negativo'}</td></tr>
        <tr><td>Enfermedades que afectan el Sistema Inmunológico</td><td>${h.immuneDiseases || 'Ninguna'}</td></tr>
        <tr><td>Alergias</td><td>${h.allergies || 'No refiere'}</td></tr>
        <tr><td>Tratamiento Médico Actual</td><td>${h.medicalTreatment || 'Sin medicación'}</td></tr>
        <tr><td>Antecedentes Médicos Familiares</td><td>${h.familyMedicalHistory || 'No especificados'}</td></tr>
        <tr><td>Antecedentes Psiquiátricos del Paciente</td><td>${h.patientPsychiatricHistory || 'Sin ingresos previos'}</td></tr>
        <tr><td>Antecedentes Psiquiátricos Familiares</td><td>${h.familyPsychiatricHistory || 'No refiere'}</td></tr>
    </table>

    ${!isAdult ? `
    <div class="page-break"></div>
    <!-- PÁGINA 3 (INFANTIL / ADOLESCENTE): PERINATAL Y PARTO -->
    <div class="official-header"><div class="psi-symbol">Ψ</div><div class="therapist-badge">${therapist.specialty}<br><strong>${therapist.name}</strong> · ${therapist.registry}</div></div>
    <div class="section-header">DESARROLLO PRENATAL:</div>
    <table class="clinical-table">
        <tr><td><strong>Embarazo Deseado:</strong> ${h.pregnancyDesired}</td><td><strong>Embarazo Planificado:</strong> ${h.pregnancyPlanned}</td><td><strong>Nº Embarazo:</strong> ${h.pregnancyNumber}</td></tr>
        <tr><td colspan="3"><strong>Desarrollo del feto durante embarazo:</strong> ${h.fetalDevelopment || 'Evolución normal'}</td></tr>
        <tr><td colspan="3"><strong>Estado emocional materno durante embarazo:</strong> ${h.motherEmotionalState || 'Tranquilo, sin duelo ni estrés agudo'}</td></tr>
    </table>

    <div class="section-header">DATOS DEL PARTO Y ESTADO AL NACER:</div>
    <table class="clinical-table">
        <tr><td><strong>Duración Embarazo:</strong> ${h.pregnancyDuration}</td><td><strong>Tipo de Parto:</strong> ${h.deliveryType}</td><td><strong>Llanto al nacer:</strong> ${h.birthCry}</td></tr>
        <tr><td><strong>Peso:</strong> ${h.birthWeight || '3.200 kg'}</td><td><strong>Talla:</strong> ${h.birthLength || '50 cm'}</td><td><strong>Incubadora:</strong> ${h.incubator}</td></tr>
        <tr><td colspan="3"><strong>Hitos Primeros Años:</strong> Sostén cefálico (${h.headControl || '3m'}), Sentado (${h.sittingAge || '6m'}), Gateo (${h.crawlingAge || '8m'}), Primeros pasos (${h.firstStepsAge || '12m'}), Control esfínteres (${h.sphincterControl || '2.5 años'}).</td></tr>
    </table>
    ` : ''}

    <div class="section-header" style="margin-top:20px;">HÁBITOS PSICOBIOLÓGICOS Y SUEÑO:</div>
    <table class="clinical-table">
        <tr><td><strong>Adicciones / Consumos:</strong> ${h.addictions || 'Negativo'}</td><td><strong>Manías / Tics:</strong> ${h.socialManias || 'Ninguno'}</td></tr>
        <tr><td><strong>Fobias / Miedos intensos:</strong> ${h.phobias || 'No refiere'}</td><td><strong>Miedos Nocturnos:</strong> ${h.nightTerrors || 'No presenta'}</td></tr>
        <tr><td><strong>Onicofagia:</strong> ${h.onychophagy || 'No presenta'}</td><td><strong>Sueño:</strong> ${h.sleepPattern || 'Patrón normal reparador'}</td></tr>
        <tr><td><strong>Alimentación:</strong> ${h.eatingPattern || 'Regular'}</td><td><strong>Higiene:</strong> ${h.hygienePattern || 'Adecuada'}</td></tr>
    </table>

    <div class="footer-seal">
        <br><br>
        <div class="seal-line">
            FIRMA Y SELLO<br>
            ${therapist.name} · ${therapist.registry}
        </div>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        } else {
            showToast('Permita las ventanas emergentes para ver el PDF oficial', 'warning');
        }
    },

    // -------------------------------------------------------------
    // 6. EXPORTACIÓN HOJA DE EVOLUCIÓN OFICIAL (PDF 1 PÁGINA)
    // -------------------------------------------------------------
    // REPORTE DE ATENCIÓN PSICOLÓGICA POR SESIÓN (HOJA DE EVOLUCIÓN OFICIAL)
    // -------------------------------------------------------------
    exportReporteAtencionPDF(noteId) {
        return this.exportHojaEvolucionPDF(noteId);
    },

    exportHojaEvolucionPDF(noteId) {
        const note = AppState.notes.find(n => n.id === noteId);
        if (!note) return;
        const patient = AppState.patients.find(p => p.id === note.patientId);
        const pName = patient ? patient.name : 'Paciente';
        const therapist = this.getTherapistInfo();

        const goals = note.sessionGoals || note.title || 'Revisión y avance terapéutico';
        const techniques = note.appliedTechniques || 'Reestructuración cognitiva, análisis funcional';
        const desc = note.sessionDescription || note.subjetivo || note.analisis || 'Desarrollo de la sesión terapéutica.';
        const findings = note.clinicalFindings || note.objetivo || 'Adecuada alianza y disposición al cambio.';
        const results = note.obtainedResults || 'Objetivos de la sesión alcanzados favorablemente.';
        const next = note.nextSessionsPlan || note.plan || 'Continuar con tareas intersesión.';

        const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Reporte de Atención - Sesión ${note.sessionNum || 1} - ${pName}</title>
    <style>
        @page { size: letter; margin: 18mm; }
        body { font-family: 'Times New Roman', Times, serif; color: #111; font-size: 11pt; line-height: 1.35; margin: 0; padding: 0; }
        .official-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
        .psi-symbol { font-size: 38pt; line-height: 1; font-weight: normal; }
        .therapist-badge { text-align: right; font-size: 10pt; line-height: 1.25; }
        .report-title { text-align: center; font-size: 12.5pt; font-weight: bold; letter-spacing: 1.2px; text-transform: uppercase; margin: 6px 0 10px; }
        table.sheet-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        table.sheet-table td, table.sheet-table th { border: 1.2px solid #222; padding: 7px 10px; vertical-align: top; }
        .cell-header { font-weight: bold; background: #f5f5f5; width: 100%; font-size: 10.5pt; text-transform: uppercase; }
        .footer-seal { margin-top: 50px; text-align: center; }
        .seal-line { width: 260px; margin: 0 auto; border-top: 1px solid #000; padding-top: 4px; font-weight: bold; font-size: 10pt; }
        @media print { body { padding: 0; } }
    </style>
</head>
<body>
    <div class="official-header">
        <div class="psi-symbol">Ψ</div>
        <div class="therapist-badge">
            ${therapist.specialty}<br>
            <strong>${therapist.name}</strong><br>
            ${therapist.registry}
        </div>
    </div>

    <div class="report-title">Reporte de Atención Psicológica</div>

    <table class="sheet-table">
        <tr>
            <td style="width:60%;"><strong>Datos de Identificación Del Paciente:</strong><br>${pName} (C.I: ${patient?.ci || '—'})</td>
            <td style="width:20%;"><strong>Nº Sesión:</strong><br>${note.sessionNum || '1'}</td>
            <td style="width:20%;"><strong>Fecha:</strong><br>${note.date || new Date().toLocaleDateString('es-ES')}</td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Objetivos de la Sesión</div>
                <div style="min-height:45px;padding-top:4px;">${goals}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Técnicas e Instrumentos Aplicados</div>
                <div style="min-height:45px;padding-top:4px;">${techniques}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Descripción de la Sesión</div>
                <div style="min-height:160px;padding-top:4px;">${desc.replace(/\n/g, '<br>')}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Hallazgos Clínicos</div>
                <div style="min-height:55px;padding-top:4px;">${findings.replace(/\n/g, '<br>')}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Resultados Obtenidos</div>
                <div style="min-height:50px;padding-top:4px;">${results.replace(/\n/g, '<br>')}</div>
            </td>
        </tr>
        <tr>
            <td colspan="3">
                <div class="cell-header">Próximas Sesiones</div>
                <div style="min-height:50px;padding-top:4px;">${next.replace(/\n/g, '<br>')}</div>
            </td>
        </tr>
    </table>

    <div class="footer-seal">
        <div class="seal-line">
            FIRMA Y SELLO<br>
            ${therapist.name} · ${therapist.registry}
        </div>
    </div>

    <script>window.onload = () => window.print();</script>
</body>
</html>`;

        const w = window.open('', '_blank');
        if (w) {
            w.document.write(html);
            w.document.close();
        }
    },

    // -------------------------------------------------------------
    // 7. MODAL DE PRE-CONSULTA DIGITAL & IMPORTADOR GOOGLE FORMS
    // -------------------------------------------------------------
    openPreconsultaModal() {
        let modal = document.getElementById('preconsultaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'preconsultaModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('preconsultaModal')"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>📲 Pre-consulta Clínica & Onboarding</h2>
                    <button class="btn-icon" onclick="closeModal('preconsultaModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px;">
                    <!-- OPCIÓN PRINCIPAL RECOMENDADA: LLENAR DIRECTAMENTE EN LA APP -->
                    <div style="background:var(--bg-secondary);border:1.5px solid var(--accent-primary);border-radius:10px;padding:16px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div style="flex:1;min-width:260px;">
                            <div style="font-weight:700;font-size:15px;color:var(--text-primary);">
                                <i class="fas fa-edit" style="color:var(--accent-primary);margin-right:6px;"></i> Llenar Pre-consulta Directamente en la App
                            </div>
                            <div style="font-size:13px;color:var(--text-secondary);margin-top:3px;">
                                Diligencie las preguntas de encuadre aquí mismo en Psico Notes sin salir a otra página. Guarda e integra los datos de inmediato al expediente.
                            </div>
                        </div>
                        <button class="btn-primary" onclick="closeModal('preconsultaModal'); ClinicalHistorySystem.openInAppPreconsultaForm();" style="padding:10px 18px;font-size:13px;">
                            <i class="fas fa-clipboard-list"></i> Llenar en la App Ahora
                        </button>
                    </div>

                    <div class="preconsulta-intro-box">
                        <p style="margin:0 0 8px 0;"><strong>Opción para envío remoto a distancia:</strong> Si prefiere que el paciente o tutor llene el formulario desde su propio teléfono antes de acudir a la primera sesión, utilice las siguientes opciones:</p>
                    </div>

                    <div class="preconsulta-tabs">
                        <div class="form-group">
                            <label>Seleccionar Etapa Vital para Pre-consulta:</label>
                            <select id="preconsultaStageSelect" onchange="ClinicalHistorySystem.updatePreconsultaLink(this.value)">
                                <option value="adult">👤 Persona Adulta (18 reactivos individuales)</option>
                                <option value="child_teen">🧒🧑 Niñez / Adolescencia (32 reactivos con datos de padres y nexo)</option>
                            </select>
                        </div>
                    </div>

                    <div class="preconsulta-link-card">
                        <div class="link-display" id="preconsultaLinkText">
                            https://psiconotes.app/preconsulta?etapa=adult
                        </div>
                        <button class="btn-secondary" onclick="ClinicalHistorySystem.copyPreconsultaLink()">
                            <i class="fas fa-copy"></i> Copiar Enlace
                        </button>
                    </div>

                    <div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap;">
                        <button class="btn-secondary" onclick="ClinicalHistorySystem.copyWhatsAppMessage()">
                            <i class="fab fa-whatsapp"></i> Copiar Mensaje WhatsApp con Encuadre
                        </button>
                        <button class="btn-secondary" onclick="ClinicalHistorySystem.openGoogleFormImportModal()">
                            <i class="fab fa-google"></i> Importar Respuestas de Google Form
                        </button>
                    </div>
                </div>
            </div>
        `;
        openModal('preconsultaModal');
    },

    updatePreconsultaLink(stage) {
        const link = document.getElementById('preconsultaLinkText');
        if (link) {
            link.innerText = `https://psiconotes.app/preconsulta?etapa=${stage}`;
        }
    },

    copyPreconsultaLink() {
        const text = document.getElementById('preconsultaLinkText')?.innerText || '';
        navigator.clipboard?.writeText(text);
        showToast('Enlace de pre-consulta copiado al portapapeles', 'success');
    },

    copyWhatsAppMessage() {
        const therapist = this.getTherapistInfo();
        const regBadge = therapist.registry ? ` (${therapist.registry})` : '';
        const msg = `¡Saludos! Bienvenido(a) a lo que será nuestro espacio terapéutico.\nAntes de nuestra primera sesión le invito a llenar el siguiente formulario que me permitirá obtener información de valor para su proceso de atención clínica:\nhttps://psiconotes.app/preconsulta\n\nLe recuerdo que la información compartida será de carácter estrictamente confidencial bajo secreto profesional.\nAtentamente, ${therapist.name}${regBadge}.`;
        navigator.clipboard?.writeText(msg);
        showToast('Mensaje de WhatsApp copiado con éxito', 'success');
    },

    // -------------------------------------------------------------
    // 8. IMPORTADOR DIRECTO DE GOOGLE FORM (JSON O TEXTO COPIADO)
    // -------------------------------------------------------------
    openGoogleFormImportModal() {
        let modal = document.getElementById('gfImportModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'gfImportModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('gfImportModal')"></div>
            <div class="modal-content modal-large">
                <div class="modal-header">
                    <h2>📥 Importar Respuestas de Google Form</h2>
                    <button class="btn-icon" onclick="closeModal('gfImportModal')"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:16px;">
                    <p style="font-size:13px;color:var(--text-secondary);">Pegue aquí las respuestas copiadas de Google Form (como texto tabulado, renglones o JSON). El sistema mapeará automáticamente todos los campos del expediente.</p>
                    <div class="form-group">
                        <textarea id="gfImportText" rows="10" placeholder="Ejemplo de texto pegado:
Nombre Completo: Valeria Mendoza
Fecha de Nacimiento: 2011-04-12
Sexo: Femenino
Cédula de Identidad: 31.445.667
Nombres y Apellidos de la Madre: Carolina Ramos
Motivo de Consulta: Dificultades de concentración y ansiedad escolar
¿Ha asistido antes a Consulta Psicológica?: No
..."></textarea>
                    </div>
                    <div class="modal-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal('gfImportModal')">Cancelar</button>
                        <button type="button" class="btn-primary" onclick="ClinicalHistorySystem.processGoogleFormImport()">
                            <i class="fas fa-magic"></i> Procesar y Crear Expediente
                        </button>
                    </div>
                </div>
            </div>
        `;
        openModal('gfImportModal');
    },

    processGoogleFormImport() {
        const text = document.getElementById('gfImportText')?.value || '';
        if (!text.trim()) {
            showToast('Por favor ingrese el texto de las respuestas', 'warning');
            return;
        }

        const parsed = this.parseGoogleFormResponse(text);
        if (!parsed.name) {
            showToast('No se pudo identificar el nombre del paciente en el texto pegado', 'warning');
            return;
        }

        const newPatient = {
            id: generateId(),
            name: parsed.name,
            category: parsed.category || 'adult',
            birthdate: parsed.birthdate || '',
            gender: parsed.gender || '',
            ci: parsed.ci || '',
            email: parsed.email || '',
            phone: parsed.phone || '',
            occupation: parsed.occupation || '',
            maritalStatus: parsed.maritalStatus || '',
            religion: parsed.religion || '',
            livesWith: parsed.livesWith || '',
            address: parsed.address || '',
            reason: parsed.reason || '',
            processExpectations: parsed.processExpectations || '',
            hasAttendedBefore: parsed.hasAttendedBefore || 'NO',
            consultationInitiative: parsed.consultationInitiative || '',
            motherName: parsed.motherName || '',
            motherCI: parsed.motherCI || '',
            motherEducation: parsed.motherEducation || '',
            motherJob: parsed.motherJob || '',
            fatherName: parsed.fatherName || '',
            fatherCI: parsed.fatherCI || '',
            fatherEducation: parsed.fatherEducation || '',
            fatherJob: parsed.fatherJob || '',
            schoolGrade: parsed.schoolGrade || '',
            guardianName: parsed.guardianName || parsed.motherName || parsed.fatherName || '',
            guardianRelation: parsed.guardianRelation || 'Madre',
            guardianPhone: parsed.guardianPhone || parsed.phone || '',
            createdAt: new Date().toISOString()
        };

        AppState.patients.push(newPatient);
        saveData();
        closeModal('gfImportModal');
        closeModal('preconsultaModal');
        renderPatients();
        updateCounts();
        showToast(`✅ Expediente creado con éxito para: ${newPatient.name}`, 'success');
        viewPatient(newPatient.id);
    },

    parseGoogleFormResponse(text) {
        const res = {};
        const lines = text.split('\n');

        const findVal = regexes => {
            for (const r of regexes) {
                const match = text.match(r);
                if (match && match[1]) return match[1].trim();
            }
            return '';
        };

        res.name = findVal([
            /Nombre Completo(?: del Consultante\/Paciente)?\s*[:\t]\s*([^\r\n]+)/i,
            /Nombre del Paciente\s*[:\t]\s*([^\r\n]+)/i,
            /Consultante\/Paciente\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.ci = findVal([
            /Cédula de Identidad\s*[:\t]\s*([^\r\n]+)/i,
            /C\.I\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.birthdate = findVal([
            /Fecha de Nacimiento\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.gender = findVal([
            /Sexo\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.email = findVal([
            /Correo Electrónico\s*[:\t]\s*([^\r\n]+)/i,
            /Email\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.occupation = findVal([
            /Ocupación Actual\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.maritalStatus = findVal([
            /Estado Civil\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.religion = findVal([
            /Religión\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.livesWith = findVal([
            /Personas con las que vive\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.address = findVal([
            /Dirección [Cc]orta\s*[:\t]\s*([^\r\n]+)/i,
            /Domicilio\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.motherName = findVal([
            /Nombres y Apellidos de la Madre\s*[:\t]\s*([^\r\n]+)/i,
            /Madre\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.fatherName = findVal([
            /Nombres y Apellidos del Padre\s*[:\t]\s*([^\r\n]+)/i,
            /Padre\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.schoolGrade = findVal([
            /Nivel de Escolaridad \(Grado\/Año que cursa\)\s*[:\t]\s*([^\r\n]+)/i,
            /Grado que cursa\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.reason = findVal([
            /Explique Brevemente el Motivo de su Consulta\s*[:\t]\s*([^\r\n]+)/i,
            /Motivo de Consulta\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.processExpectations = findVal([
            /¿Qué espera obtener de este proceso\?\s*[:\t]\s*([^\r\n]+)/i
        ]);

        res.consultationInitiative = findVal([
            /¿Quién tomó la iniciativa de la Consulta Psicológica\?\s*[:\t]\s*([^\r\n]+)/i,
            /¿Cómo tomó la iniciativa de asistir a la Consulta Psicológica\?\s*[:\t]\s*([^\r\n]+)/i
        ]);

        const hasAtt = findVal([/¿Ha asistido antes a Consulta Psicológica\?\s*[:\t]\s*([^\r\n]+)/i]);
        res.hasAttendedBefore = hasAtt.toLowerCase().includes('si') || hasAtt.toLowerCase().includes('sí') ? 'SI' : 'NO';

        // Inferencia de categoría por edad si está disponible
        if (res.birthdate && typeof calculateAge === 'function') {
            const a = calculateAge(res.birthdate);
            if (typeof a === 'number') {
                res.category = a < 12 ? 'child' : a < 18 ? 'adolescent' : 'adult';
            }
        }
        if (!res.category) {
            res.category = (res.motherName || res.schoolGrade) ? 'adolescent' : 'adult';
        }

        return res;
    },

    // -------------------------------------------------------------
    // 9. FORMULARIO INTEGRAL DE PRE-CONSULTA CLÍNICA EN LA PROPIA APP
    // -------------------------------------------------------------
    openInAppPreconsultaForm(patientId = null, defaultStage = null) {
        if (typeof document === 'undefined') return;

        let modal = document.getElementById('inAppPreconsultaModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'inAppPreconsultaModal';
            modal.className = 'modal';
            document.body.appendChild(modal);
        }

        const patients = (typeof AppState !== 'undefined' && AppState.patients) ? AppState.patients : [];
        let selectedPatient = patientId ? patients.find(p => p.id === patientId) : null;
        const isExisting = !!selectedPatient;

        let initialStage = defaultStage;
        if (!initialStage && selectedPatient) {
            initialStage = (typeof getPatientCategory === 'function') 
                ? getPatientCategory(selectedPatient) 
                : (selectedPatient.category || 'adult');
        }
        if (!initialStage) initialStage = 'adult';

        const therapist = this.getTherapistInfo();

        modal.innerHTML = `
            <div class="modal-overlay" onclick="closeModal('inAppPreconsultaModal')"></div>
            <div class="modal-content modal-xl" style="max-height:92vh;display:flex;flex-direction:column;max-width:960px;width:95%;">
                <div class="modal-header">
                    <div>
                        <h2 style="margin:0;"><i class="fas fa-clipboard-list" style="color:var(--accent-primary);"></i> Formulario de Pre-consulta Clínica (En la App)</h2>
                        <small style="color:var(--text-tertiary);">Atención: ${therapist.name} · ${therapist.specialty} · Registro directo sin salir de la plataforma</small>
                    </div>
                    <button class="btn-icon" onclick="closeModal('inAppPreconsultaModal')"><i class="fas fa-times"></i></button>
                </div>

                <div style="padding:16px 20px;overflow-y:auto;flex:1;">
                    <!-- BARRA DE CONFIGURACIÓN RÁPIDA: MODO Y ETAPA -->
                    <div style="background:var(--bg-secondary);padding:14px;border-radius:10px;border:1px solid var(--border-primary);margin-bottom:18px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
                        <div style="display:flex;align-items:center;gap:16px;">
                            <span style="font-weight:700;font-size:13px;color:var(--text-primary);">Destino:</span>
                            <label class="radio-label" style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="inapp_mode_radio" value="new" ${!isExisting ? 'checked' : ''} onchange="ClinicalHistorySystem.toggleInAppMode('new')">
                                <span>Nuevo Paciente</span>
                            </label>
                            <label class="radio-label" style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer;">
                                <input type="radio" name="inapp_mode_radio" value="existing" ${isExisting ? 'checked' : ''} onchange="ClinicalHistorySystem.toggleInAppMode('existing')">
                                <span>Paciente Existente</span>
                            </label>
                        </div>

                        <div style="display:flex;align-items:center;gap:8px;">
                            <span style="font-weight:700;font-size:13px;color:var(--text-primary);">Etapa Vital:</span>
                            <div style="display:flex;gap:6px;">
                                <button type="button" class="btn-tab-toggle ${initialStage === 'child' ? 'active' : ''}" id="inapp_btn_child" onclick="ClinicalHistorySystem.setInAppStage('child')" style="padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;${initialStage === 'child' ? 'background:var(--accent-primary);color:#fff;' : ''}">
                                    🧒 Niñez
                                </button>
                                <button type="button" class="btn-tab-toggle ${initialStage === 'adolescent' ? 'active' : ''}" id="inapp_btn_adolescent" onclick="ClinicalHistorySystem.setInAppStage('adolescent')" style="padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;${initialStage === 'adolescent' ? 'background:var(--accent-primary);color:#fff;' : ''}">
                                    🧑 Adolescencia
                                </button>
                                <button type="button" class="btn-tab-toggle ${initialStage === 'adult' ? 'active' : ''}" id="inapp_btn_adult" onclick="ClinicalHistorySystem.setInAppStage('adult')" style="padding:6px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;${initialStage === 'adult' ? 'background:var(--accent-primary);color:#fff;' : ''}">
                                    👤 Adulto
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- SELECTOR DE PACIENTE EXISTENTE -->
                    <div id="inapp_existingSelectGroup" style="display:${isExisting ? 'block' : 'none'};margin-bottom:18px;background:rgba(13,148,136,0.06);padding:12px 14px;border-radius:8px;border:1px solid var(--accent-primary);">
                        <label style="font-weight:600;font-size:13px;display:block;margin-bottom:6px;">Seleccionar Paciente a Actualizar *</label>
                        <select id="inapp_patientSelect" onchange="ClinicalHistorySystem.loadPatientIntoInAppForm(this.value)" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--border-primary);background:var(--bg-primary);color:var(--text-primary);">
                            <option value="">-- Elija un paciente de la lista --</option>
                            ${patients.map(p => `<option value="${p.id}" ${selectedPatient && selectedPatient.id === p.id ? 'selected' : ''}>${p.name} (C.I: ${p.ci || '—'}, ${p.birthdate || 'Sin fecha'})</option>`).join('')}
                        </select>
                    </div>

                    <form id="inAppPreconsultaFormActual" onsubmit="ClinicalHistorySystem.handleInAppPreconsultaSubmit(event)">
                        <input type="hidden" id="inapp_currentStage" value="${initialStage}">
                        <input type="hidden" id="inapp_editingPatientId" value="${selectedPatient ? selectedPatient.id : ''}">

                        <!-- SECCIÓN A: SOLICITANTE DE LA CONSULTA (NIÑEZ / ADOLESCENCIA) -->
                        <div id="inapp_section_solicitante" style="display:${initialStage === 'adult' ? 'none' : 'block'};">
                            <div class="form-section-title">1. Solicitante de la Atención / Representante</div>
                            <div class="form-row">
                                <div class="form-group" style="flex:2;">
                                    <label>Nombre y Apellido del Solicitante *</label>
                                    <input type="text" id="inapp_reqName" placeholder="Madre, Padre o Representante Legal">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Vínculo / Nexo *</label>
                                    <select id="inapp_reqRelation">
                                        <option value="Madre">Madre</option>
                                        <option value="Padre">Padre</option>
                                        <option value="Tutor Legal">Tutor Legal</option>
                                        <option value="Abuelo/a">Abuelo / Abuela</option>
                                        <option value="Tío/a">Tío / Tía</option>
                                        <option value="Otro">Otro</option>
                                    </select>
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Teléfono de Contacto</label>
                                    <input type="text" id="inapp_reqPhone" placeholder="+58 412 ...">
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN B: DATOS IDENTIFICATORIOS DEL PACIENTE -->
                        <div class="form-section-title">2. Identificación del Paciente / Consultante</div>
                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Nombre Completo del Paciente *</label>
                                <input type="text" id="inapp_patientName" required placeholder="Nombres y Apellidos">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Cédula de Identidad</label>
                                <input type="text" id="inapp_patientCI" placeholder="V- / E- o Menor">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Sexo / Género *</label>
                                <select id="inapp_patientGender">
                                    <option value="Femenino">Femenino</option>
                                    <option value="Masculino">Masculino</option>
                                    <option value="No binario / Otro">No binario / Otro</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Fecha de Nacimiento *</label>
                                <input type="date" id="inapp_patientBirthdate" required onchange="ClinicalHistorySystem.onInAppBirthdateChange(this.value)">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Edad Calculada</label>
                                <input type="text" id="inapp_patientAgeDisplay" readonly placeholder="Se calcula automáticamente" style="background:var(--bg-secondary);">
                            </div>
                            <div class="form-group" style="flex:1.5;">
                                <label>Lugar de Nacimiento</label>
                                <input type="text" id="inapp_patientBirthPlace" placeholder="Ciudad, Estado, País">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1.5;">
                                <label id="inapp_label_occupation">${initialStage === 'adult' ? 'Ocupación / Profesión' : 'Nivel de Escolaridad / Grado'}</label>
                                <input type="text" id="inapp_patientOccupation" placeholder="${initialStage === 'adult' ? 'Ej. Ingeniero, Contador, Comerciante...' : 'Ej. 5to Grado Primaria / 2do Año Bachillerato'}">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Estado Civil</label>
                                <select id="inapp_patientMarital">
                                    <option value="Soltero(a)">Soltero(a)</option>
                                    <option value="Casado(a)">Casado(a)</option>
                                    <option value="Unión libre">Unión libre / Conviviente</option>
                                    <option value="Divorciado(a)">Divorciado(a)</option>
                                    <option value="Viudo(a)">Viudo(a)</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1.5;">
                                <label>¿Con quién vive?</label>
                                <input type="text" id="inapp_patientLivesWith" placeholder="Ej. Padres y hermanos / Pareja / Vive solo">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:2;">
                                <label>Dirección Corta de Domicilio</label>
                                <input type="text" id="inapp_patientAddress" placeholder="Municipio, Sector, Residencia">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Teléfono</label>
                                <input type="text" id="inapp_patientPhone" placeholder="+58 414 ...">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Correo Electrónico</label>
                                <input type="email" id="inapp_patientEmail" placeholder="correo@ejemplo.com">
                            </div>
                        </div>

                        <!-- SECCIÓN C: FICHA DE PADRES (NIÑEZ / ADOLESCENCIA) -->
                        <div id="inapp_section_padres" style="display:${initialStage === 'adult' ? 'none' : 'block'};">
                            <div class="form-section-title">3. Datos de los Progenitores / Ficha Familiar</div>
                            <div class="form-row">
                                <div class="form-group" style="flex:2;">
                                    <label>Nombres y Apellidos de la Madre</label>
                                    <input type="text" id="inapp_motherName" placeholder="Nombre completo de la madre">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Edad</label>
                                    <input type="number" id="inapp_motherAge" placeholder="Años">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Cédula</label>
                                    <input type="text" id="inapp_motherCI" placeholder="C.I. madre">
                                </div>
                                <div class="form-group" style="flex:1.5;">
                                    <label>Ocupación / Oficio</label>
                                    <input type="text" id="inapp_motherJob" placeholder="Ocupación madre">
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="form-group" style="flex:2;">
                                    <label>Nombres y Apellidos del Padre</label>
                                    <input type="text" id="inapp_fatherName" placeholder="Nombre completo del padre">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Edad</label>
                                    <input type="number" id="inapp_fatherAge" placeholder="Años">
                                </div>
                                <div class="form-group" style="flex:1;">
                                    <label>Cédula</label>
                                    <input type="text" id="inapp_fatherCI" placeholder="C.I. padre">
                                </div>
                                <div class="form-group" style="flex:1.5;">
                                    <label>Ocupación / Oficio</label>
                                    <input type="text" id="inapp_fatherJob" placeholder="Ocupación padre">
                                </div>
                            </div>
                        </div>

                        <!-- SECCIÓN D: INFORMACIÓN DE LA CONSULTA -->
                        <div class="form-section-title">4. Motivo de Consulta y Encuadre Clínico</div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>¿Ha asistido antes a Consulta Psicológica / Psiquiátrica?</label>
                                <select id="inapp_attendedBefore">
                                    <option value="NO">NO</option>
                                    <option value="SI">SI</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:2;">
                                <label>¿Quién tomó la iniciativa de la consulta?</label>
                                <select id="inapp_initiative">
                                    <option value="Deseabilidad propia">Deseabilidad propia</option>
                                    <option value="Madre">Madre</option>
                                    <option value="Padre">Padre</option>
                                    <option value="Ambos padres">Ambos padres</option>
                                    <option value="Solicitud del Menor">Solicitud del Niño(a) o Adolescente</option>
                                    <option value="Docente / Escuela">Docente de Aula / Escuela</option>
                                    <option value="Médico Pediatra / Neurólogo">Médico Pediatra / Neurólogo</option>
                                    <option value="Pareja / Familiar">Pareja / Familiar</option>
                                </select>
                            </div>
                        </div>

                        <div class="form-group">
                            <label>Explique detalladamente el Motivo de Consulta *</label>
                            <textarea id="inapp_reason" required rows="3" placeholder="Describa el motivo principal, síntomas observados, tiempo de evolución o situaciones disparadoras..."></textarea>
                        </div>

                        <div class="form-group">
                            <label>¿Qué espera obtener de este proceso de acompañamiento psicológico?</label>
                            <textarea id="inapp_expectations" rows="2" placeholder="Expectativas, cambios esperados y metas prioritarias..."></textarea>
                        </div>

                        <!-- SECCIÓN E: ANTECEDENTES Y HÁBITOS DE SALUD INICIALES -->
                        <div class="form-section-title">5. Salud General & Hábitos Iniciales</div>
                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Condiciones médicas o medicación actual</label>
                                <input type="text" id="inapp_medicalTreatment" placeholder="Ej. Ninguna / Hipotiroidismo en tto / Antialérgico">
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Alergias conocidas</label>
                                <input type="text" id="inapp_allergies" placeholder="Ej. Penicilina, polen, ninguna...">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group" style="flex:1;">
                                <label>Patrón de Sueño</label>
                                <select id="inapp_sleepPattern">
                                    <option value="Normal reparador">Normal reparador (7-8 hrs continuas)</option>
                                    <option value="Insomnio de conciliación">Insomnio de conciliación (dificultad para dormir)</option>
                                    <option value="Despertares nocturnos frecuentes">Despertares nocturnos frecuentes</option>
                                    <option value="Pesadillas / Terrores nocturnos">Pesadillas / Terrores nocturnos</option>
                                    <option value="Hipersomnia / Cansancio diurno">Hipersomnia / Cansancio diurno</option>
                                </select>
                            </div>
                            <div class="form-group" style="flex:1;">
                                <label>Alimentación</label>
                                <select id="inapp_eatingPattern">
                                    <option value="Regular adecuada">Regular y adecuada</option>
                                    <option value="Apetito disminuido">Apetito disminuido / Pérdida de apetito</option>
                                    <option value="Apetito incrementado o ansioso">Apetito incrementado o por ansiedad</option>
                                    <option value="Selectividad alimentaria">Selectividad alimentaria (en niños)</option>
                                </select>
                            </div>
                        </div>

                        <div style="background:var(--bg-secondary);padding:12px;border-radius:8px;font-size:12px;color:var(--text-secondary);margin:16px 0;">
                            <i class="fas fa-lock" style="color:var(--accent-primary);"></i> <strong>Privacidad y Secreto Profesional:</strong> Los datos asentados en este formulario se incorporan de manera inmediata al expediente clínico cifrado bajo los estrictos códigos de confidencialidad y bioética profesional.
                        </div>

                        <div class="modal-actions" style="display:flex;justify-content:flex-end;gap:10px;margin-top:20px;">
                            <button type="button" class="btn-secondary" onclick="closeModal('inAppPreconsultaModal')">Cancelar</button>
                            <button type="submit" class="btn-primary" style="padding:10px 20px;">
                                <i class="fas fa-check-circle"></i> Guardar Pre-consulta e Integrar al Expediente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        if (selectedPatient) {
            this.populateInAppForm(selectedPatient);
        }

        openModal('inAppPreconsultaModal');
    },

    toggleInAppMode(mode) {
        const existingGroup = document.getElementById('inapp_existingSelectGroup');
        const editIdInput = document.getElementById('inapp_editingPatientId');
        if (existingGroup) {
            existingGroup.style.display = mode === 'existing' ? 'block' : 'none';
        }
        if (mode === 'new') {
            if (editIdInput) editIdInput.value = '';
        } else {
            const select = document.getElementById('inapp_patientSelect');
            if (select && select.value) {
                this.loadPatientIntoInAppForm(select.value);
            }
        }
    },

    setInAppStage(stage) {
        const stageInput = document.getElementById('inapp_currentStage');
        if (stageInput) stageInput.value = stage;

        ['child', 'adolescent', 'adult'].forEach(s => {
            const btn = document.getElementById(`inapp_btn_${s}`);
            if (btn) {
                if (s === stage) {
                    btn.classList.add('active');
                    btn.style.background = 'var(--accent-primary)';
                    btn.style.color = '#fff';
                } else {
                    btn.classList.remove('active');
                    btn.style.background = 'var(--bg-secondary)';
                    btn.style.color = 'var(--text-primary)';
                }
            }
        });

        const secSol = document.getElementById('inapp_section_solicitante');
        const secPad = document.getElementById('inapp_section_padres');
        const lblOcc = document.getElementById('inapp_label_occupation');
        const inpOcc = document.getElementById('inapp_patientOccupation');

        if (stage === 'adult') {
            if (secSol) secSol.style.display = 'none';
            if (secPad) secPad.style.display = 'none';
            if (lblOcc) lblOcc.textContent = 'Ocupación / Profesión';
            if (inpOcc) inpOcc.placeholder = 'Ej. Ingeniero, Contador, Comerciante...';
        } else {
            if (secSol) secSol.style.display = 'block';
            if (secPad) secPad.style.display = 'block';
            if (lblOcc) lblOcc.textContent = 'Nivel de Escolaridad / Grado';
            if (inpOcc) inpOcc.placeholder = stage === 'child' ? 'Ej. 3er Grado Primaria' : 'Ej. 4to Año Bachillerato';
        }
    },

    onInAppBirthdateChange(dateStr) {
        if (!dateStr) return;
        const disp = document.getElementById('inapp_patientAgeDisplay');
        let age = null;
        if (typeof calculateAge === 'function') {
            age = calculateAge(dateStr);
        } else {
            const b = new Date(dateStr);
            const t = new Date();
            age = t.getFullYear() - b.getFullYear();
        }
        if (disp && typeof age === 'number' && !isNaN(age)) {
            disp.value = `${age} años`;
            const isNew = document.querySelector('input[name="inapp_mode_radio"]:checked')?.value !== 'existing';
            if (isNew) {
                const suggestedStage = age < 12 ? 'child' : (age < 18 ? 'adolescent' : 'adult');
                this.setInAppStage(suggestedStage);
            }
        }
    },

    loadPatientIntoInAppForm(patientId) {
        if (!patientId || !AppState.patients) return;
        const p = AppState.patients.find(x => x.id === patientId);
        if (p) this.populateInAppForm(p);
    },

    populateInAppForm(patient) {
        if (!patient) return;
        const cat = (typeof getPatientCategory === 'function') ? getPatientCategory(patient) : (patient.category || 'adult');
        this.setInAppStage(cat);

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== undefined && val !== null ? val : '';
        };

        setVal('inapp_editingPatientId', patient.id);
        setVal('inapp_patientName', patient.name);
        setVal('inapp_patientCI', patient.ci);
        setVal('inapp_patientBirthdate', patient.birthdate);
        if (patient.birthdate) this.onInAppBirthdateChange(patient.birthdate);
        setVal('inapp_patientGender', patient.gender || 'Femenino');
        setVal('inapp_patientBirthPlace', patient.birthPlace);
        setVal('inapp_patientOccupation', patient.occupation || patient.schoolGrade);
        setVal('inapp_patientMarital', patient.maritalStatus || 'Soltero(a)');
        setVal('inapp_patientLivesWith', patient.livesWith);
        setVal('inapp_patientAddress', patient.address);
        setVal('inapp_patientPhone', patient.phone);
        setVal('inapp_patientEmail', patient.email);

        // Solicitante / Guardian
        setVal('inapp_reqName', patient.guardianName || patient.motherName || patient.fatherName);
        setVal('inapp_reqRelation', patient.guardianRelation || 'Madre');
        setVal('inapp_reqPhone', patient.guardianPhone || patient.phone);

        // Padres
        setVal('inapp_motherName', patient.motherName);
        setVal('inapp_motherAge', patient.motherAge);
        setVal('inapp_motherCI', patient.motherCI);
        setVal('inapp_motherJob', patient.motherJob);
        setVal('inapp_fatherName', patient.fatherName);
        setVal('inapp_fatherAge', patient.fatherAge);
        setVal('inapp_fatherCI', patient.fatherCI);
        setVal('inapp_fatherJob', patient.fatherJob);

        // Consulta
        setVal('inapp_attendedBefore', patient.hasAttendedBefore || 'NO');
        setVal('inapp_initiative', patient.consultationInitiative || 'Deseabilidad propia');
        setVal('inapp_reason', patient.reason);
        setVal('inapp_expectations', patient.processExpectations);

        // Salud
        setVal('inapp_medicalTreatment', patient.medicalTreatment);
        setVal('inapp_allergies', patient.allergies);
        setVal('inapp_sleepPattern', patient.sleepPattern || 'Normal reparador');
        setVal('inapp_eatingPattern', patient.eatingPattern || 'Regular adecuada');
    },

    handleInAppPreconsultaSubmit(e) {
        if (e) e.preventDefault();
        const getV = id => document.getElementById(id)?.value?.trim() || '';

        const name = getV('inapp_patientName');
        const birthdate = getV('inapp_patientBirthdate');
        const reason = getV('inapp_reason');

        if (!name) {
            showToast('El nombre del paciente es requerido', 'warning');
            return;
        }
        if (!birthdate) {
            showToast('La fecha de nacimiento es requerida', 'warning');
            return;
        }
        if (!reason) {
            showToast('El motivo de consulta es requerido', 'warning');
            return;
        }

        const stage = document.getElementById('inapp_currentStage')?.value || 'adult';
        const isNew = document.querySelector('input[name="inapp_mode_radio"]:checked')?.value !== 'existing';
        const existingId = getV('inapp_editingPatientId') || getV('inapp_patientSelect');

        let targetPatient = null;
        if (!isNew && existingId && typeof AppState !== 'undefined' && AppState.patients) {
            targetPatient = AppState.patients.find(p => p.id === existingId);
        }

        const payload = {
            name,
            birthdate,
            gender: getV('inapp_patientGender') || 'Femenino',
            category: stage,
            ci: getV('inapp_patientCI'),
            birthPlace: getV('inapp_patientBirthPlace'),
            occupation: getV('inapp_patientOccupation'),
            schoolGrade: stage !== 'adult' ? getV('inapp_patientOccupation') : '',
            maritalStatus: getV('inapp_patientMarital'),
            livesWith: getV('inapp_patientLivesWith'),
            address: getV('inapp_patientAddress'),
            phone: getV('inapp_patientPhone'),
            email: getV('inapp_patientEmail'),
            guardianName: getV('inapp_reqName'),
            guardianRelation: getV('inapp_reqRelation'),
            guardianPhone: getV('inapp_reqPhone'),
            motherName: getV('inapp_motherName'),
            motherAge: getV('inapp_motherAge'),
            motherCI: getV('inapp_motherCI'),
            motherJob: getV('inapp_motherJob'),
            fatherName: getV('inapp_fatherName'),
            fatherAge: getV('inapp_fatherAge'),
            fatherCI: getV('inapp_fatherCI'),
            fatherJob: getV('inapp_fatherJob'),
            hasAttendedBefore: getV('inapp_attendedBefore') || 'NO',
            consultationInitiative: getV('inapp_initiative') || 'Deseabilidad propia',
            reason,
            processExpectations: getV('inapp_expectations'),
            medicalTreatment: getV('inapp_medicalTreatment'),
            allergies: getV('inapp_allergies'),
            sleepPattern: getV('inapp_sleepPattern') || 'Normal reparador',
            eatingPattern: getV('inapp_eatingPattern') || 'Regular adecuada'
        };

        if (targetPatient) {
            Object.assign(targetPatient, payload);
            if (typeof saveData === 'function') saveData();
            if (typeof renderPatients === 'function') renderPatients();
            closeModal('inAppPreconsultaModal');
            showToast(`✅ Pre-consulta clínica actualizada en el expediente de: ${targetPatient.name}`, 'success');
            if (typeof viewPatient === 'function') viewPatient(targetPatient.id);
        } else {
            const newId = (typeof generateId === 'function') ? generateId() : ('pat_' + Date.now().toString(36));
            const newPatient = {
                id: newId,
                ...payload,
                createdAt: new Date().toISOString()
            };
            if (typeof AppState !== 'undefined') {
                AppState.patients = AppState.patients || [];
                AppState.patients.push(newPatient);
            }
            if (typeof saveData === 'function') saveData();
            if (typeof renderPatients === 'function') renderPatients();
            if (typeof updateCounts === 'function') updateCounts();
            if (typeof updatePatientSelects === 'function') updatePatientSelects();
            closeModal('inAppPreconsultaModal');
            showToast(`🎉 ¡Pre-consulta completada! Expediente creado para: ${newPatient.name}`, 'success');
            if (typeof viewPatient === 'function') viewPatient(newPatient.id);
        }
    },

    // Alias para compatibilidad
    openLivePreconsultaSimulator() {
        this.openInAppPreconsultaForm();
    },

    handleSimPreconsultaSubmit(e, stage) {
        this.handleInAppPreconsultaSubmit(e);
    }
};

// Exportar al objeto global (navegador y Node.js)
if (typeof window !== 'undefined') {
    window.ClinicalHistorySystem = ClinicalHistorySystem;
}
if (typeof globalThis !== 'undefined') {
    globalThis.ClinicalHistorySystem = ClinicalHistorySystem;
}
